import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isValidJoinCodeSegment, normalizeJoinCodeSegment } from "@/lib/npat/join-code";
import { signSession, getSessionFromCookies, setSessionCookie } from "@/lib/session";
import { tryFinalizeOverdueRoundForGameId } from "./games";
import type {
  DbGame,
  DbParticipant,
  DbRound,
  DbSub,
  GameState,
  LastScoredRoundPayload,
} from "./types";

const HOST_STALE_MS = 45_000;

async function promoteHostIfStale(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  game: DbGame,
  participants: DbParticipant[],
): Promise<DbGame> {
  const host = participants.find((p) => p.id === game.host_participant_id);
  if (!host) {
    return game;
  }
  const now = Date.now();
  if (now - new Date(host.heartbeat_at).getTime() < HOST_STALE_MS) {
    return game;
  }
  const others = participants
    .filter((p) => p.id !== game.host_participant_id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const next = others[0];
  if (!next) {
    return game;
  }
  await supabase
    .from("npat_games")
    .update({ host_participant_id: next.id })
    .eq("id", game.id);
  await supabase
    .from("npat_participants")
    .update({ is_host: false })
    .eq("game_id", game.id);
  await supabase
    .from("npat_participants")
    .update({ is_host: true })
    .eq("id", next.id);
  const { data: g2 } = await supabase
    .from("npat_games")
    .select("*")
    .eq("id", game.id)
    .single();
  return (g2 as DbGame) ?? game;
}

/** Distinguish DB/network failures from a missing game (used by API status code). */
export const LOAD_GAME_SERVER_ERROR = "Could not load game";

export async function loadGameStateByCode(
  code: string,
): Promise<{ ok: true; state: GameState } | { ok: false; error: string }> {
  const norm = normalizeJoinCodeSegment(code);
  if (!isValidJoinCodeSegment(norm)) {
    return { ok: false, error: "Invalid room link" };
  }
  try {
  const supabase = getSupabaseAdmin();
  const { data: active_game } = await supabase
    .from("npat_games")
    .select("*")
    .eq("join_code", norm)
    .in("status", ["lobby", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let game = active_game;
  if (!game) {
    const { data: ended_game } = await supabase
      .from("npat_games")
      .select("*")
      .eq("join_code", norm)
      .eq("status", "ended")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    game = ended_game ?? null;
  }
  if (!game) {
    return { ok: false, error: "Game not found" };
  }
  // Auto-finalize when time is up: every API poll (and thus every client) advances state
  // without relying on a browser-only useEffect to call a server action.
  await tryFinalizeOverdueRoundForGameId(game.id);
  const { data: game_after } = await supabase.from("npat_games").select("*").eq("id", game.id).single();
  const { data: parts } = await supabase
    .from("npat_participants")
    .select("*")
    .eq("game_id", (game_after ?? game).id)
    .order("created_at", { ascending: true });
  const participants = (parts as DbParticipant[]) ?? [];
  let g = (game_after ?? game) as DbGame;
  g = await promoteHostIfStale(supabase, g, participants);
  const { data: refreshedParts } = await supabase
    .from("npat_participants")
    .select("*")
    .eq("game_id", g.id)
    .order("created_at", { ascending: true });
  const plist = (refreshedParts as DbParticipant[] | null) ?? participants;
  const session = await getSessionFromCookies();
  let became_host = false;
  if (session && g.host_participant_id === session.p_id) {
    const me = plist.find((x) => x.id === session.p_id);
    if (me?.is_host && session.host === "0") {
      const token = await signSession({ v: 1, p_id: session.p_id, g_id: session.g_id, host: "1" });
      await setSessionCookie(token);
      became_host = true;
    }
  }
  const { data: scoredRounds } = await supabase
    .from("npat_rounds")
    .select("id,round_index,letter")
    .eq("game_id", g.id)
    .eq("status", "scored")
    .order("round_index", { ascending: true });
  const scoredIds = (scoredRounds ?? []).map((r) => (r as { id: string }).id);
  let allScoredSubs: DbSub[] = [];
  if (scoredIds.length > 0) {
    const { data: subRows } = await supabase
      .from("npat_round_submissions")
      .select("*")
      .in("round_id", scoredIds);
    allScoredSubs = (subRows as DbSub[]) ?? [];
  }
  const totals: Record<string, { total: number; last_round: number; prior: number }> = {};
  for (const p of plist) {
    totals[p.id] = { total: 0, last_round: 0, prior: 0 };
  }
  const maxIdx =
    (scoredRounds ?? []).length > 0
      ? Math.max(...(scoredRounds as { round_index: number }[]).map((r) => r.round_index))
      : 0;
  const lastScoredId = (scoredRounds as { id: string; round_index: number }[] | null)?.find(
    (r) => r.round_index === maxIdx,
  )?.id;
  for (const row of allScoredSubs) {
    const t = row.participant_id;
    if (!totals[t]) {
      totals[t] = { total: 0, last_round: 0, prior: 0 };
    }
    const add =
      (row.points_name ?? 0) +
      (row.points_place ?? 0) +
      (row.points_animal ?? 0) +
      (row.points_thing ?? 0);
    totals[t].total += add;
    if (lastScoredId && row.round_id === lastScoredId) {
      totals[t].last_round += add;
    }
  }
  for (const t of Object.keys(totals)) {
    const x = totals[t]!;
    x.prior = x.total - x.last_round;
  }

  let last_scored_round: LastScoredRoundPayload | null = null;
  if (lastScoredId) {
    const meta = (scoredRounds as { id: string; round_index: number; letter: string }[] | null)?.find(
      (r) => r.id === lastScoredId,
    );
    if (meta) {
      const subsForLast = allScoredSubs.filter((s) => s.round_id === lastScoredId);
      last_scored_round = {
        round_index: meta.round_index,
        letter: meta.letter,
        submissions: subsForLast,
      };
    }
  }

  const round_scores_by_participant: Record<string, number[]> = {};
  for (const p of plist) {
    round_scores_by_participant[p.id] = [];
  }
  const ordered_scored = [...((scoredRounds ?? []) as { id: string; round_index: number }[])].sort(
    (a, b) => a.round_index - b.round_index,
  );
  for (const r of ordered_scored) {
    for (const p of plist) {
      const sub = allScoredSubs.find((s) => s.round_id === r.id && s.participant_id === p.id);
      const add = sub
        ? (sub.points_name ?? 0) +
          (sub.points_place ?? 0) +
          (sub.points_animal ?? 0) +
          (sub.points_thing ?? 0)
        : 0;
      const arr = round_scores_by_participant[p.id];
      if (arr) {
        arr.push(add);
      }
    }
  }

  const current_round_id = g.current_round_id;
  let current: (DbRound & { submissions: DbSub[] }) | null = null;
  if (current_round_id) {
    const { data: r } = await supabase
      .from("npat_rounds")
      .select("*")
      .eq("id", current_round_id)
      .single();
    const { data: srows } = await supabase
      .from("npat_round_submissions")
      .select("*")
      .eq("round_id", current_round_id);
    if (r) {
      current = { ...(r as DbRound), submissions: (srows as DbSub[]) ?? [] };
    }
  }
  let winners: { names: string[]; score: number } | null = null;
  if (g.status === "ended") {
    let best = 0;
    for (const v of Object.values(totals)) {
      if (v.total > best) {
        best = v.total;
      }
    }
    const top = plist.filter((p) => (totals[p.id]?.total ?? 0) === best);
    winners = { names: top.map((p) => p.display_name), score: best };
  }
  let self: GameState["self"] = null;
  if (session) {
    const mep = plist.find((x) => x.id === session.p_id) ?? null;
    if (mep) {
      self = {
        id: mep.id,
        is_host: mep.is_host,
        display_name: mep.display_name,
      };
    }
  }
  return {
    ok: true,
    state: {
      game: g,
      participants: plist,
      current_round: current,
      last_scored_round,
      round_scores_by_participant,
      totals,
      winners: g.status === "ended" ? winners : null,
      became_host: became_host,
      self,
    },
  };
  } catch (err) {
    console.error("[loadGameStateByCode]", { code, err });
    return { ok: false, error: LOAD_GAME_SERVER_ERROR };
  }
}

export async function loadMeForCode(code: string) {
  const s = await getSessionFromCookies();
  if (!s) {
    return null;
  }
  const r = await loadGameStateByCode(code);
  if (!r.ok) {
    return null;
  }
  return r.state.participants.find((p) => p.id === s.p_id) ?? null;
}
