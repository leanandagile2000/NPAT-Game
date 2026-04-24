import { redirect } from "next/navigation";
import { z } from "zod";
import { getFlowerSlugs, flowerSlugToDisplayName } from "@/lib/game/flowers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { pickRandomLetter, normalizeLetterInput } from "@/lib/game/letters";
import { scoreAnswers } from "@/lib/game/score-answers";
import { normalizeJoinCodeSegment } from "@/lib/npat/join-code";
import { signSession, getSessionFromCookies, setSessionCookie } from "@/lib/session";
import type { DbGame, DbRound, DbParticipant, DbSub } from "./types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

/** If a participant heartbeats within this window, another browser cannot take the same name. */
const PARTICIPANT_NAME_HELD_MS = 25_000;

async function pickAvailableFlowerSlug(supabase: SupabaseAdmin): Promise<string | null> {
  const pool = [...getFlowerSlugs()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j]!;
    pool[j] = t!;
  }
  for (const slug of pool) {
    const { data: clash } = await supabase
      .from("npat_games")
      .select("id")
      .eq("join_code", slug)
      .in("status", ["lobby", "in_progress"])
      .maybeSingle();
    if (!clash) {
      return slug;
    }
  }
  return null;
}

/**
 * Creates the next npat_round row and points the game at it. Shared by
 * startGameAction (first round right after lobby) and startNextRoundAction.
 */
async function createNextRoundCore(
  supabase: SupabaseAdmin,
  game: DbGame,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (game.current_round_id) {
    const { data: r } = await supabase
      .from("npat_rounds")
      .select("status")
      .eq("id", game.current_round_id)
      .single();
    if (r?.status === "active") {
      return { ok: false as const, error: "A round is still in progress" };
    }
  }
  const used: string[] = Array.isArray(game.used_letters) ? [...(game.used_letters as string[])] : [];
  const usedSet = new Set(used.map((x) => normalizeLetterInput(String(x))));
  let letter = pickRandomLetter(usedSet);
  let nextUsed: string[] = [];
  if (letter == null) {
    letter = pickRandomLetter(new Set());
    if (letter == null) {
      return { ok: false as const, error: "No letter" };
    }
    nextUsed = [letter];
  } else {
    const merged = new Set(usedSet);
    merged.add(letter);
    nextUsed = Array.from(merged);
  }
  const { data: lastRound } = await supabase
    .from("npat_rounds")
    .select("round_index")
    .eq("game_id", game.id)
    .order("round_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIndex = (lastRound?.round_index ?? 0) + 1;
  const durationMs = game.round_duration_minutes * 60_000;
  const started = new Date();
  const ends = new Date(started.getTime() + durationMs);
  const { data: round, error: rErr } = await supabase
    .from("npat_rounds")
    .insert({
      game_id: game.id,
      round_index: nextIndex,
      letter: letter.toUpperCase(),
      status: "active",
      started_at: started.toISOString(),
      ends_at: ends.toISOString(),
    })
    .select("id")
    .single();
  if (rErr || !round) {
    return { ok: false as const, error: rErr?.message ?? "Could not start round" };
  }
  await supabase
    .from("npat_games")
    .update({
      used_letters: nextUsed,
      current_round_id: round.id,
    })
    .eq("id", game.id);
  return { ok: true as const };
}

const createGameInput = z.object({
  host_display_name: z.string().trim().min(1).max(32),
  round_duration_minutes: z.coerce.number().int().min(1).max(5).default(2),
});

const joinInput = z.object({
  join_code: z.string().trim().min(2).max(40),
  display_name: z.string().trim().min(1).max(32),
});

export async function createGameForm(_prev: unknown, formData: FormData) {
  console.log("[createGameForm] started", {});
  const parsed = createGameInput.safeParse({
    host_display_name: formData.get("host_display_name"),
    round_duration_minutes: formData.get("round_duration_minutes") ?? 2,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { host_display_name, round_duration_minutes } = parsed.data;
  const supabase = getSupabaseAdmin();
  const join_code = await pickAvailableFlowerSlug(supabase);
  if (!join_code) {
    console.error("[createGameForm] no flower slug available");
    return { ok: false as const, error: "Too many active games — try again in a few minutes." };
  }
  const name = flowerSlugToDisplayName(join_code);
  const host_secret = crypto.randomUUID();
  const { data: g, error: gErr } = await supabase
    .from("npat_games")
    .insert({
      join_code,
      name,
      host_secret,
      status: "lobby",
      round_duration_minutes,
      used_letters: [] as string[],
      host_participant_id: null,
      current_round_id: null,
    })
    .select("id")
    .single();
  if (gErr || !g) {
    console.error("[createGameForm] insert game", gErr);
    return { ok: false as const, error: gErr?.message ?? "Could not create game" };
  }
  const { data: p, error: pErr } = await supabase
    .from("npat_participants")
    .insert({
      game_id: g.id,
      display_name: host_display_name,
      is_host: true,
    })
    .select("id")
    .single();
  if (pErr || !p) {
    await supabase.from("npat_games").delete().eq("id", g.id);
    console.error("[createGameForm] insert host", pErr);
    return { ok: false as const, error: pErr?.message ?? "Could not add host" };
  }
  await supabase.from("npat_games").update({ host_participant_id: p.id }).eq("id", g.id);
  const token = await signSession({ v: 1, p_id: p.id, g_id: g.id, host: "1" });
  await setSessionCookie(token);
  console.log("[createGameForm] completed", { join_code });
  redirect(`/g/${join_code}`);
}

export async function joinGameForm(_prev: unknown, formData: FormData) {
  console.log("[joinGameForm] started", {});
  const rawCode = String(formData.get("join_code") ?? "");
  const join_code = normalizeJoinCodeSegment(rawCode);
  const parsed = joinInput.safeParse({ join_code, display_name: formData.get("display_name") });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { display_name: display_name_raw } = parsed.data;
  const display_name = display_name_raw.trim();
  const supabase = getSupabaseAdmin();
  const { data: game, error: gErr } = await supabase
    .from("npat_games")
    .select("id,status,join_code")
    .eq("join_code", join_code)
    .in("status", ["lobby", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (gErr || !game) {
    return { ok: false as const, error: "No active game with this room name" };
  }
  const { data: partRows, error: prErr } = await supabase
    .from("npat_participants")
    .select("*")
    .eq("game_id", game.id);
  if (prErr) {
    return { ok: false as const, error: prErr.message };
  }
  const parts = (partRows as DbParticipant[]) ?? [];
  const dnLower = display_name.toLowerCase();
  const existingPart = parts.find((p) => p.display_name.trim().toLowerCase() === dnLower);

  const session = await getSessionFromCookies();

  if (existingPart) {
    if (session && session.p_id === existingPart.id && session.g_id === game.id) {
      const token = await signSession({
        v: 1,
        p_id: existingPart.id,
        g_id: game.id,
        host: existingPart.is_host ? "1" : "0",
      });
      await setSessionCookie(token);
      console.log("[joinGameForm] completed same session", { join_code });
      redirect(`/g/${game.join_code}`);
    }
    const held =
      Date.now() - new Date(existingPart.heartbeat_at).getTime() < PARTICIPANT_NAME_HELD_MS;
    if (held) {
      return {
        ok: false as const,
        error:
          "This name is already active in the game. Wait a moment, or pick another name.",
      };
    }
    const token = await signSession({
      v: 1,
      p_id: existingPart.id,
      g_id: game.id,
      host: existingPart.is_host ? "1" : "0",
    });
    await setSessionCookie(token);
    await supabase
      .from("npat_participants")
      .update({ heartbeat_at: new Date().toISOString() })
      .eq("id", existingPart.id);
    console.log("[joinGameForm] completed rejoin", { join_code });
    redirect(`/g/${game.join_code}`);
  }

  if (parts.length >= 8) {
    return { ok: false as const, error: "This game is full (8 players)" };
  }
  const { data: p, error: pErr } = await supabase
    .from("npat_participants")
    .insert({
      game_id: game.id,
      display_name,
      is_host: false,
    })
    .select("id")
    .single();
  if (pErr) {
    if (String(pErr.message).toLowerCase().includes("unique")) {
      return {
        ok: false as const,
        error: "That name is already taken in this game (check spelling and spacing).",
      };
    }
    return { ok: false as const, error: pErr.message };
  }
  const token = await signSession({ v: 1, p_id: p!.id, g_id: game.id, host: "0" });
  await setSessionCookie(token);
  console.log("[joinGameForm] completed new player", { join_code });
  redirect(`/g/${game.join_code}`);
}

export async function updateRoundDurationAction(minutes: number) {
  const s = await getSessionFromCookies();
  if (!s || s.host !== "1") {
    return { ok: false as const, error: "Only the host can change round length" };
  }
  const d = z.coerce.number().int().min(1).max(5).safeParse(minutes);
  if (!d.success) {
    return { ok: false as const, error: "Minutes must be 1–5" };
  }
  const supabase = getSupabaseAdmin();
  const { data: p } = await supabase
    .from("npat_participants")
    .select("is_host,game_id")
    .eq("id", s.p_id)
    .single();
  if (!p?.is_host) {
    return { ok: false as const, error: "Not host" };
  }
  const { data: g } = await supabase
    .from("npat_games")
    .select("status")
    .eq("id", s.g_id)
    .single();
  if (g?.status !== "lobby") {
    return { ok: false as const, error: "You can only change that before the game starts" };
  }
  await supabase
    .from("npat_games")
    .update({ round_duration_minutes: d.data })
    .eq("id", s.g_id);
  return { ok: true as const };
}

export async function startGameAction() {
  const s = await getSessionFromCookies();
  if (!s || s.host !== "1") {
    return { ok: false as const, error: "Only the host can start" };
  }
  const supabase = getSupabaseAdmin();
  const { data: p } = await supabase
    .from("npat_participants")
    .select("is_host,game_id")
    .eq("id", s.p_id)
    .single();
  if (!p?.is_host) {
    return { ok: false as const, error: "Not host" };
  }
  const { count } = await supabase
    .from("npat_participants")
    .select("*", { count: "exact", head: true })
    .eq("game_id", s.g_id);
  if ((count ?? 0) < 2) {
    return { ok: false as const, error: "Need at least 2 players to start" };
  }
  if ((count ?? 0) > 8) {
    return { ok: false as const, error: "Too many players" };
  }
  const { data: g } = await supabase
    .from("npat_games")
    .select("status")
    .eq("id", s.g_id)
    .single();
  if (g?.status !== "lobby") {
    return { ok: false as const, error: "Game already started" };
  }
  console.log("[startGameAction] started", { game_id: s.g_id });
  await supabase.from("npat_games").update({ status: "in_progress" }).eq("id", s.g_id);
  const { data: game_row, error: reloadErr } = await supabase
    .from("npat_games")
    .select("*")
    .eq("id", s.g_id)
    .single();
  if (reloadErr || !game_row) {
    console.error("[startGameAction] reload game after status update", reloadErr);
    await supabase.from("npat_games").update({ status: "lobby" }).eq("id", s.g_id);
    return { ok: false as const, error: "Could not start game" };
  }
  const round_result = await createNextRoundCore(supabase, game_row as DbGame);
  if (!round_result.ok) {
    console.error("[startGameAction] first round failed", round_result.error);
    await supabase.from("npat_games").update({ status: "lobby" }).eq("id", s.g_id);
    return round_result;
  }
  console.log("[startGameAction] completed", { game_id: s.g_id, first_round: true });
  return { ok: true as const };
}

export async function startNextRoundAction() {
  const s = await getSessionFromCookies();
  if (!s || s.host !== "1") {
    return { ok: false as const, error: "Only the host can start a round" };
  }
  const supabase = getSupabaseAdmin();
  const { data: p } = await supabase
    .from("npat_participants")
    .select("is_host")
    .eq("id", s.p_id)
    .single();
  if (!p?.is_host) {
    return { ok: false as const, error: "Not host" };
  }
  const { data: game, error: gErr } = await supabase
    .from("npat_games")
    .select("*")
    .eq("id", s.g_id)
    .single();
  if (gErr || !game) {
    return { ok: false as const, error: "Game not found" };
  }
  if (game.status !== "in_progress") {
    return { ok: false as const, error: "Start the game from the lobby first" };
  }
  return createNextRoundCore(supabase, game as DbGame);
}

export async function saveSubmissionAction(row: {
  name: string;
  place: string;
  animal: string;
  thing: string;
}) {
  const s = await getSessionFromCookies();
  if (!s) {
    return { ok: false as const, error: "Not joined" };
  }
  const supabase = getSupabaseAdmin();
  const { data: game } = await supabase
    .from("npat_games")
    .select("id,status,current_round_id")
    .eq("id", s.g_id)
    .single();
  if (!game?.current_round_id) {
    return { ok: false as const, error: "No active round" };
  }
  if (game.status === "ended") {
    return { ok: false as const, error: "Game ended" };
  }
  const { data: r } = await supabase
    .from("npat_rounds")
    .select("status,ends_at")
    .eq("id", game.current_round_id)
    .single();
  if (r?.status !== "active" || !r.ends_at) {
    return { ok: false as const, error: "Round not active" };
  }
  if (new Date() >= new Date(r.ends_at)) {
    return { ok: false as const, error: "Time is up" };
  }
  const parts = z
    .object({
      name: z.string().max(200),
      place: z.string().max(200),
      animal: z.string().max(200),
      thing: z.string().max(200),
    })
    .safeParse(row);
  if (!parts.success) {
    return { ok: false as const, error: "Invalid fields" };
  }
  const { error: uErr } = await supabase.from("npat_round_submissions").upsert(
    {
      round_id: game.current_round_id,
      participant_id: s.p_id,
      name_text: parts.data.name,
      place_text: parts.data.place,
      animal_text: parts.data.animal,
      thing_text: parts.data.thing,
    },
    { onConflict: "round_id,participant_id" },
  );
  if (uErr) {
    return { ok: false as const, error: uErr.message };
  }
  return { ok: true as const };
}

/**
 * Scores and closes the round. Shared by the server action and load-time auto-finalize
 * so the round always ends when time is up (no dependency on a client effect).
 */
async function performFinalizeActiveRound(
  supabase: SupabaseAdmin,
  game: DbGame,
  round: DbRound,
): Promise<void> {
  const { data: parts } = await supabase
    .from("npat_participants")
    .select("id")
    .eq("game_id", game.id);
  const { data: subs } = await supabase
    .from("npat_round_submissions")
    .select("*")
    .eq("round_id", round.id);
  const subByPid = new Map(
    ((subs as DbSub[] | null | undefined) ?? []).map((x) => [x.participant_id, x] as const),
  );
  const letter = round.letter;
  for (const part of parts ?? []) {
    let sub = subByPid.get(part.id) as DbSub | undefined;
    if (!sub) {
      const { data: ins } = await supabase
        .from("npat_round_submissions")
        .insert({
          round_id: round.id,
          participant_id: part.id,
          name_text: "",
          place_text: "",
          animal_text: "",
          thing_text: "",
        })
        .select()
        .single();
      sub = ins as DbSub;
    }
    if (!sub) {
      continue;
    }
    let scores: Awaited<ReturnType<typeof scoreAnswers>>;
    try {
      scores = await scoreAnswers(letter, {
        name: sub.name_text ?? "",
        place: sub.place_text ?? "",
        animal: sub.animal_text ?? "",
        thing: sub.thing_text ?? "",
      });
    } catch (err) {
      console.error("[performFinalizeActiveRound] scoreAnswers", { round_id: round.id, err });
      scores = { name: 0, place: 0, animal: 0, thing: 0 };
    }
    await supabase
      .from("npat_round_submissions")
      .update({
        points_name: scores.name,
        points_place: scores.place,
        points_animal: scores.animal,
        points_thing: scores.thing,
      })
      .eq("id", sub.id);
  }
  await supabase.from("npat_rounds").update({ status: "scored" }).eq("id", round.id);
  await supabase.from("npat_games").update({ current_round_id: null }).eq("id", game.id);
}

/**
 * If the current round is active and `ends_at` is in the past, score and close it.
 * Invoked on every game-state load so polling always advances the game.
 */
export async function tryFinalizeOverdueRoundForGameId(gameId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: game } = await supabase.from("npat_games").select("*").eq("id", gameId).single();
  if (!game?.current_round_id) {
    return;
  }
  const { data: round } = await supabase
    .from("npat_rounds")
    .select("*")
    .eq("id", game.current_round_id)
    .single();
  if (!round || round.status !== "active") {
    return;
  }
  if (!round.ends_at || new Date() < new Date(round.ends_at)) {
    return;
  }
  try {
    await performFinalizeActiveRound(supabase, game as DbGame, round as DbRound);
  } catch (err) {
    console.error("[tryFinalizeOverdueRoundForGameId]", { gameId, err });
  }
}

export async function finalizeRoundIfDueAction() {
  const s = await getSessionFromCookies();
  if (!s) {
    return { ok: false as const, error: "Not joined" };
  }
  const supabase = getSupabaseAdmin();
  const { data: game } = await supabase
    .from("npat_games")
    .select("*")
    .eq("id", s.g_id)
    .single();
  if (!game?.current_round_id) {
    return { ok: false as const, error: "No round" };
  }
  const { data: round } = await supabase
    .from("npat_rounds")
    .select("*")
    .eq("id", game.current_round_id)
    .single();
  if (!round || round.status !== "active") {
    return { ok: true as const, already: true };
  }
  if (!round.ends_at || new Date() < new Date(round.ends_at)) {
    return { ok: true as const, notYet: true };
  }
  try {
    await performFinalizeActiveRound(supabase, game as DbGame, round as DbRound);
  } catch (err) {
    console.error("[finalizeRoundIfDueAction]", err);
    return { ok: false as const, error: "Could not score round" };
  }
  return { ok: true as const, scored: true };
}

/**
 * Host ends the current round immediately (same scoring path as the timer).
 */
export async function endRoundEarlyAction() {
  console.log("[endRoundEarlyAction] started", {});
  const s = await getSessionFromCookies();
  if (!s || s.host !== "1") {
    return { ok: false as const, error: "Only the host can end the round early" };
  }
  const supabase = getSupabaseAdmin();
  const { data: p } = await supabase
    .from("npat_participants")
    .select("is_host")
    .eq("id", s.p_id)
    .single();
  if (!p?.is_host) {
    return { ok: false as const, error: "Not host" };
  }
  const { data: game } = await supabase.from("npat_games").select("*").eq("id", s.g_id).single();
  if (!game?.current_round_id) {
    return { ok: false as const, error: "No active round" };
  }
  const { data: round } = await supabase
    .from("npat_rounds")
    .select("*")
    .eq("id", game.current_round_id)
    .single();
  if (!round || round.status !== "active") {
    return { ok: false as const, error: "No active round" };
  }
  try {
    await performFinalizeActiveRound(supabase, game as DbGame, round as DbRound);
  } catch (err) {
    console.error("[endRoundEarlyAction] error", err);
    return { ok: false as const, error: "Could not end round" };
  }
  console.log("[endRoundEarlyAction] completed", { round_id: round.id });
  return { ok: true as const };
}

export async function endGameAction() {
  const s = await getSessionFromCookies();
  if (!s || s.host !== "1") {
    return { ok: false as const, error: "Only the host can end the game" };
  }
  const supabase = getSupabaseAdmin();
  const { data: p } = await supabase
    .from("npat_participants")
    .select("is_host")
    .eq("id", s.p_id)
    .single();
  if (!p?.is_host) {
    return { ok: false as const, error: "Not host" };
  }
  const { data: game } = await supabase.from("npat_games").select("*").eq("id", s.g_id).single();
  if (!game) {
    return { ok: false as const, error: "Not found" };
  }
  if (game.current_round_id) {
    const { data: r } = await supabase
      .from("npat_rounds")
      .select("*")
      .eq("id", game.current_round_id)
      .single();
    if (r && r.status === "active") {
      const L = (r as DbRound).letter;
      const used: string[] = Array.isArray(game.used_letters) ? game.used_letters : [];
      const next = used.filter((u) => normalizeLetterInput(String(u)) !== normalizeLetterInput(L));
      await supabase.from("npat_rounds").update({ status: "aborted" }).eq("id", r.id);
      await supabase
        .from("npat_games")
        .update({ used_letters: next, current_round_id: null })
        .eq("id", game.id);
    }
  }
  await supabase
    .from("npat_games")
    .update({ status: "ended", current_round_id: null })
    .eq("id", s.g_id);
  return { ok: true as const };
}

export async function heartbeatAction() {
  const s = await getSessionFromCookies();
  if (!s) {
    return { ok: false as const };
  }
  const supabase = getSupabaseAdmin();
  await supabase
    .from("npat_participants")
    .update({ heartbeat_at: new Date().toISOString() })
    .eq("id", s.p_id);
  return { ok: true as const };
}
