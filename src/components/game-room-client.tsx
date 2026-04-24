"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { JoinForm } from "@/components/join-form";
import { NpatButton } from "@/components/npat/npat-button";
import { NpatConfetti } from "@/components/npat/npat-confetti";
import { NpatFieldInput } from "@/components/npat/npat-field-input";
import { NpatLetterOverlay } from "@/components/npat/npat-letter-overlay";
import { NpatScoreFormula } from "@/components/npat/npat-score-formula";
import { NpatTimerRing } from "@/components/npat/npat-timer-ring";
import { isValidJoinCodeSegment, normalizeJoinCodeSegment } from "@/lib/npat/join-code";
import { npat_category_color, type NpatCategoryKey } from "@/lib/npat/tokens";
import {
  endGameAction,
  endRoundEarlyAction,
  finalizeRoundIfDueAction,
  heartbeatAction,
  saveSubmissionAction,
  startGameAction,
  startNextRoundAction,
  updateRoundDurationAction,
} from "@/server/npat/actions";
import type { DbSub, GameState } from "@/server/npat/types";

type ApiOk = { ok: true; state: GameState };
type ApiErr = { ok: false; error: string };
type ApiRes = ApiOk | ApiErr;

function seconds_left(ends_at: string | null) {
  if (!ends_at) {
    return 0;
  }
  return Math.max(0, Math.floor((new Date(ends_at).getTime() - Date.now()) / 1000));
}

function fmt_clock(ends_at: string | null) {
  const s = seconds_left(ends_at);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const CAT_KEYS: NpatCategoryKey[] = ["name", "place", "animal", "thing"];

function sub_answer(sub: DbSub | undefined, key: NpatCategoryKey) {
  if (!sub) {
    return "";
  }
  if (key === "name") {
    return sub.name_text ?? "";
  }
  if (key === "place") {
    return sub.place_text ?? "";
  }
  if (key === "animal") {
    return sub.animal_text ?? "";
  }
  return sub.thing_text ?? "";
}

function sub_ok(sub: DbSub | undefined, key: NpatCategoryKey) {
  if (!sub) {
    return false;
  }
  if (key === "name") {
    return (sub.points_name ?? 0) > 0;
  }
  if (key === "place") {
    return (sub.points_place ?? 0) > 0;
  }
  if (key === "animal") {
    return (sub.points_animal ?? 0) > 0;
  }
  return (sub.points_thing ?? 0) > 0;
}

export function GameRoomClient() {
  const params = useParams();
  const code = normalizeJoinCodeSegment(String(params["code"] ?? ""));
  const [data, setData] = useState<ApiRes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [f_name, setFname] = useState("");
  const [f_place, setFplace] = useState("");
  const [f_animal, setFanimal] = useState("");
  const [f_thing, setFthing] = useState("");
  const [round_overlay, setRoundOverlay] = useState(true);
  const [player_submitted, setPlayerSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  const last_seeded_round_id = useRef<string | null>(null);
  const last_overlay_round_id = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(code)}`, { cache: "no-store" });
      const j = (await res.json()) as ApiRes;
      setData(j);
      if (!j.ok) {
        setError(j.error);
      } else {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }, [code]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const i = setInterval(load, 2000);
    const h = setInterval(() => {
      void heartbeatAction();
    }, 15000);
    const c = setInterval(() => setTick((t) => t + 1), 1000);
    void load();
    return () => {
      clearInterval(i);
      clearInterval(h);
      clearInterval(c);
    };
  }, [load]);

  const state = data && data.ok ? data.state : null;

  useEffect(() => {
    const self = state?.self;
    if (!self) {
      return;
    }
    const cr = state?.current_round;
    if (!cr || cr.status !== "active") {
      if (last_seeded_round_id.current !== null) {
        last_seeded_round_id.current = null;
        setFname("");
        setFplace("");
        setFanimal("");
        setFthing("");
      }
      setPlayerSubmitted(false);
      return;
    }
    if (last_seeded_round_id.current === cr.id) {
      return;
    }
    last_seeded_round_id.current = cr.id;
    const mine = cr.submissions.find((x) => x.participant_id === self.id);
    setFname(mine?.name_text ?? "");
    setFplace(mine?.place_text ?? "");
    setFanimal(mine?.animal_text ?? "");
    setFthing(mine?.thing_text ?? "");
    setPlayerSubmitted(false);
  }, [state?.self, state?.current_round?.id, state?.current_round?.status]);

  useEffect(() => {
    const cr = state?.current_round;
    if (!cr || cr.status !== "active") {
      return;
    }
    if (last_overlay_round_id.current !== cr.id) {
      last_overlay_round_id.current = cr.id;
      setRoundOverlay(true);
    }
  }, [state?.current_round?.id, state?.current_round?.status]);

  useEffect(() => {
    if (!state?.current_round || state.current_round.status !== "active" || !state.current_round.ends_at) {
      return;
    }
    if (new Date() >= new Date(state.current_round.ends_at)) {
      void (async () => {
        await finalizeRoundIfDueAction();
        await load();
      })();
    }
  }, [state?.current_round?.ends_at, state?.current_round?.status, load, tick]);

  async function on_save_fields() {
    if (!state?.self) {
      return;
    }
    await saveSubmissionAction({
      name: f_name,
      place: f_place,
      animal: f_animal,
      thing: f_thing,
    });
    await load();
  }

  async function on_submit_round() {
    await saveSubmissionAction({
      name: f_name,
      place: f_place,
      animal: f_animal,
      thing: f_thing,
    });
    setPlayerSubmitted(true);
    await load();
  }

  if (!code || !isValidJoinCodeSegment(code)) {
    return <p className="p-6 text-[#F5F2EA]">Invalid room link.</p>;
  }
  if (data && !data.ok) {
    return (
      <p className="p-6 font-semibold text-[#FF5C39]" role="alert">
        {data.error}
      </p>
    );
  }
  if (!state) {
    return (
      <div className="p-8 text-[#F5F2EA]" role="status" aria-live="polite" aria-busy="true">
        Loading game…
      </div>
    );
  }

  const copy_link = () => {
    const url = `${window.location.origin}/g/${code}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  if (!state.self) {
    if (state.game.status === "ended" && state.winners) {
      const sorted = [...state.participants].sort(
        (a, b) => (state.totals[b.id]?.total ?? 0) - (state.totals[a.id]?.total ?? 0),
      );
      return (
        <div className="relative min-h-screen overflow-hidden px-6 pb-[72px] pt-12 text-[#F5F2EA]">
          <NpatConfetti />
          <div className="relative z-[1] mx-auto max-w-[620px] text-center">
            <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.1em] text-[#8C8678]">
              Game ended
            </p>
            <h1 className="font-[family-name:var(--font-bebas)] text-[clamp(40px,9vw,72px)] tracking-[0.04em] leading-none">
              <Link
                href={`/g/${state.game.join_code}`}
                className="text-[#FFD600] underline decoration-[#FFD600]/40 underline-offset-4 hover:decoration-[#FFD600]"
              >
                {state.game.name}
              </Link>
            </h1>
            <p className="mt-4 text-base font-semibold text-[#8C8678]">
              Sign in with your player name below to see the board as a player next time, or browse
              final scores here.
            </p>
            <div className="mt-10 overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.07)] bg-[#252219] text-left">
              <div className="border-b border-[rgba(255,255,255,0.07)] px-[22px] py-3.5">
                <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#8C8678]">
                  Final scores
                </span>
              </div>
              {sorted.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-[22px] py-3 last:border-b-0"
                >
                  <span className="font-bold">{p.display_name}</span>
                  <span className="font-[family-name:var(--font-bebas)] text-3xl text-[#FFD600]">
                    {state.totals[p.id]?.total ?? 0}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <NpatButton
                variant="primary"
                size="lg"
                type="button"
                onClick={() => {
                  window.location.href = "/create";
                }}
              >
                Play Again
              </NpatButton>
              <NpatButton
                variant="ghost"
                size="lg"
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Home
              </NpatButton>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-[440px] animate-[npat-slide-up_0.5s_ease]">
          <h1 className="font-[family-name:var(--font-bebas)] text-[54px] tracking-[0.04em] leading-none">
            Join Game
          </h1>
          <p className="mt-1.5 text-base font-semibold text-[#8C8678]">
            Room{" "}
            <Link
              href={`/g/${code}`}
              className="text-[#FFD600] underline decoration-[#FFD600]/40 underline-offset-4 hover:decoration-[#FFD600]"
            >
              {state.game.name}
            </Link>{" "}
            — enter the name you want to play as.
          </p>
          <div className="mt-8">
            <JoinForm code={code} />
          </div>
          {error && (
            <p className="mt-4 font-bold text-[#FF5C39]" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  const me = state.self;

  if (state.game.status === "ended" && state.winners) {
    const sorted = [...state.participants].sort(
      (a, b) => (state.totals[b.id]?.total ?? 0) - (state.totals[a.id]?.total ?? 0),
    );
    const top = state.winners.score;
    const winner_names = state.winners.names;
    const medal_style = ["text-[#FFD600]", "text-[#F5F2EA]", "text-[#8C8678]", "text-[#8C8678]"];

    return (
      <div className="relative min-h-screen overflow-hidden px-6 pb-[72px] pt-12">
        <NpatConfetti />
        <div className="relative z-[1] mx-auto max-w-[620px]">
          <div
            className="mb-12 text-center"
            style={{ animation: "npat-winner-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          >
            <div className="mb-5 inline-flex items-center justify-center gap-2.5 rounded-full border border-[rgba(255,214,0,0.25)] bg-[rgba(255,214,0,0.1)] px-5 py-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD600" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#FFD600]">
                {winner_names.length > 1 ? "Co-Winners" : "Winner"}
              </span>
            </div>
            <p className="font-[family-name:var(--font-bebas)] text-[clamp(50px,11vw,96px)] leading-none text-[#FFD600] [text-shadow:0_0_80px_rgba(255,214,0,0.38)]">
              {winner_names.length ? winner_names.join(" & ") : "—"}
            </p>
            <p className="mt-1 font-[family-name:var(--font-bebas)] text-[38px] text-[#8C8678]">
              {top} <span className="text-[22px]">points</span>
            </p>
          </div>

          <div className="mb-9 overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.07)] bg-[#252219]">
            <div className="border-b border-[rgba(255,255,255,0.07)] px-[22px] py-3.5">
              <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#8C8678]">
                Final Scoreboard
              </span>
            </div>
            {sorted.map((p, i) => {
              const is_win = winner_names.includes(p.display_name);
              const rounds = state.round_scores_by_participant[p.id] ?? [];
              const labels = ["1st", "2nd", "3rd", "4th"];
              const medal = labels[i] ?? `${i + 1}th`;
              const medal_cls = medal_style[Math.min(i, 3)] ?? "text-[#8C8678]";
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3.5 border-b border-[rgba(255,255,255,0.07)] px-[22px] py-4 last:border-b-0 animate-[npat-slide-up_0.4s_ease_both] ${
                    is_win ? "bg-[rgba(255,214,0,0.04)]" : ""
                  }`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div
                    className={`w-9 text-center font-[family-name:var(--font-bebas)] text-[22px] ${medal_cls}`}
                  >
                    {medal}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-extrabold">
                      {p.display_name}
                      {me.id === p.id && (
                        <span className="ml-1.5 text-sm font-semibold text-[#8C8678]">(you)</span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {rounds.map((s, ri) => (
                        <span
                          key={`${p.id}-r-${ri}`}
                          className="rounded-md bg-[#3D3930] px-2 py-0.5 text-xs font-bold text-[#8C8678]"
                        >
                          R{ri + 1}: {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 font-[family-name:var(--font-bebas)] text-[44px] leading-none ${
                      is_win ? "text-[#FFD600]" : "text-[#F5F2EA]"
                    }`}
                  >
                    {state.totals[p.id]?.total ?? 0}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <NpatButton variant="primary" size="lg" type="button" onClick={() => (window.location.href = "/create")}>
              Play Again
            </NpatButton>
            <NpatButton variant="ghost" size="lg" type="button" onClick={() => (window.location.href = "/")}>
              Home
            </NpatButton>
          </div>
        </div>
      </div>
    );
  }

  const total_secs = Math.max(1, state.game.round_duration_minutes * 60);
  const ends_at = state.current_round?.ends_at ?? null;
  const left = seconds_left(ends_at);
  const progress = state.current_round?.status === "active" ? left / total_secs : 0;
  const warn = left <= 30 && left > 0;
  const clock_label = fmt_clock(ends_at);

  const show_results_between =
    state.game.status === "in_progress" &&
    !state.current_round &&
    state.last_scored_round &&
    state.last_scored_round.submissions.length > 0;

  return (
    <div className="min-h-screen text-[#F5F2EA]">
      {state.became_host && (
        <div
          className="fixed left-0 right-0 top-0 z-[200] animate-[npat-host-banner_0.4s_ease] bg-[#FF5C39] px-6 py-3 text-center text-base font-extrabold text-[#F5F2EA]"
          role="status"
        >
          The previous host disconnected — you are now the host
        </div>
      )}

      {state.current_round?.status === "active" && round_overlay && (
        <NpatLetterOverlay
          round_index={state.current_round.round_index}
          letter={state.current_round.letter}
          on_complete={() => setRoundOverlay(false)}
        />
      )}

      <div className={`mx-auto max-w-[660px] px-6 py-6 ${state.became_host ? "pt-16" : ""}`}>
        <header className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#8C8678]">Room</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-[42px] tracking-[0.04em] leading-none">
            <Link
              href={`/g/${state.game.join_code}`}
              className="text-[#FFD600] underline decoration-[#FFD600]/35 underline-offset-[6px] transition-colors hover:decoration-[#FFD600]"
            >
              {state.game.name}
            </Link>
          </h1>
          {origin ? (
            <p className="mt-1.5 text-sm font-semibold text-[#8C8678]">
              Full URL:{" "}
              <span className="break-all text-[#F5F2EA]">
                {origin}/g/{state.game.join_code}
              </span>
            </p>
          ) : null}
          {me.is_host && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copy_link}
                className="min-h-[44px] rounded-[10px] border border-[rgba(255,214,0,0.25)] bg-[rgba(255,214,0,0.1)] px-4 text-sm font-bold text-[#FFD600] transition-colors hover:bg-[rgba(255,214,0,0.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600]"
              >
                {copied ? "✓ Copied" : "Copy invite link"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("End the game for everyone? Unfinished rounds do not count.")) {
                    await endGameAction();
                    await load();
                  }
                }}
                className="min-h-[44px] rounded-[10px] border border-[rgba(255,92,57,0.25)] bg-[rgba(255,92,57,0.12)] px-4 text-sm font-bold text-[#FF5C39] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600]"
              >
                End game
              </button>
            </div>
          )}
        </header>

        {state.game.status === "lobby" && (
          <section className="animate-[npat-fade-in_0.4s_ease]" aria-labelledby="lobby-heading">
            <div className="mb-8 text-center">
              <p
                className={`mb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] ${
                  me.is_host ? "text-[#FFD600]" : "text-[#00C4A7]"
                }`}
                id="lobby-heading"
              >
                {me.is_host ? "You are the Host" : "Waiting for host to start…"}
              </p>
              <p className="font-[family-name:var(--font-bebas)] text-[46px] tracking-[0.04em] leading-none">
                {state.game.name}
              </p>
            </div>

            <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#252219] px-5 py-4">
              <div>
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8C8678]">
                  Invite link
                </p>
                <p className="font-[family-name:var(--font-bebas)] text-[clamp(32px,8vw,44px)] leading-none text-[#FFD600]">
                  <Link
                    href={`/g/${state.game.join_code}`}
                    className="underline decoration-[#FFD600]/35 underline-offset-4 hover:decoration-[#FFD600]"
                  >
                    {state.game.name}
                  </Link>
                </p>
              </div>
              <button
                type="button"
                onClick={copy_link}
                className="shrink-0 whitespace-nowrap rounded-[10px] border border-[rgba(255,214,0,0.25)] bg-[rgba(255,214,0,0.1)] px-[18px] py-2.5 text-sm font-bold text-[#FFD600] transition-colors hover:bg-[rgba(255,214,0,0.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600]"
              >
                {copied ? "✓ Copied" : "Copy Link"}
              </button>
            </div>

            <div className="mb-4 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#252219]">
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-5 py-3">
                <span className="text-sm font-extrabold uppercase tracking-wide text-[#8C8678]">Players</span>
                <span
                  className={`font-[family-name:var(--font-bebas)] text-[22px] ${
                    state.participants.length >= 2 ? "text-[#00C4A7]" : "text-[#8C8678]"
                  }`}
                >
                  {state.participants.length} / 8
                </span>
              </div>
              {state.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.07)] px-5 py-3 last:border-b-0 animate-[npat-player-join_0.35s_ease_both]"
                  style={{
                    background:
                      me.id === p.id ? "rgba(255,214,0,0.04)" : undefined,
                  }}
                >
                  <div
                    className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-base font-black ${
                      p.is_host
                        ? "bg-gradient-to-br from-[#FFD600] to-[#FF5C39] text-[#1A1714]"
                        : "bg-[#3D3930] text-[#F5F2EA]"
                    }`}
                  >
                    {p.display_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-extrabold">
                      {p.display_name}
                      {me.id === p.id && (
                        <span className="ml-1 text-sm font-semibold text-[#8C8678]">(you)</span>
                      )}
                    </p>
                    {p.is_host && (
                      <p className="text-[11px] font-extrabold tracking-[0.08em] text-[#FFD600]">HOST</p>
                    )}
                  </div>
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[#00C4A7]" aria-hidden="true" />
                </div>
              ))}
              {me.is_host && state.participants.length < 8 && (
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-dashed border-[#3D3930] text-[#3D3930]">
                    +
                  </div>
                  <span className="text-[15px] font-semibold text-[#8C8678]">Waiting for players…</span>
                </div>
              )}
            </div>

            {me.is_host ? (
              <div className="flex flex-col gap-2.5">
                {state.participants.length < 2 && (
                  <p className="text-center text-sm font-semibold text-[#8C8678]">
                    Need at least 2 players to start
                  </p>
                )}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#252219] p-4">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8C8678]" htmlFor="lobby_rd">
                    Round length
                  </label>
                  <select
                    id="lobby_rd"
                    className="min-h-[44px] w-full rounded-xl border border-[#3D3930] bg-[#1A1714] px-3 text-[#F5F2EA] focus:border-[#FFD600] focus:outline-none"
                    defaultValue={String(state.game.round_duration_minutes)}
                    onChange={async (e) => {
                      await updateRoundDurationAction(Number(e.target.value));
                      await load();
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </div>
                <NpatButton
                  variant="primary"
                  size="lg"
                  full_width
                  type="button"
                  disabled={state.participants.length < 2}
                  onClick={async () => {
                    const r = await startGameAction();
                    if (r && "error" in r && r.error) {
                      setError(r.error);
                    } else {
                      setError(null);
                    }
                    await load();
                  }}
                >
                  Start Game →
                </NpatButton>
                <NpatButton
                  variant="danger"
                  full_width
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Cancel and end the lobby?")) {
                      await endGameAction();
                      await load();
                    }
                  }}
                >
                  Cancel Game
                </NpatButton>
              </div>
            ) : (
              <div className="py-3 text-center">
                <p className="mb-3.5 text-[15px] font-semibold text-[#8C8678]">
                  Waiting for{" "}
                  <strong className="text-[#F5F2EA]">
                    {state.participants.find((x) => x.is_host)?.display_name ?? "host"}
                  </strong>{" "}
                  to start…
                </p>
                <div className="flex justify-center gap-1.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2.5 w-2.5 animate-[npat-dot-pulse_1.4s_ease_infinite] rounded-full bg-[#FFD600]"
                      style={{ animationDelay: `${i * 0.35}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {show_results_between && state.last_scored_round && (
          <section className="py-4 animate-[npat-fade-in_0.4s_ease]" aria-labelledby="round-results-title">
            <div className="mb-10 text-center">
              <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#8C8678]">
                Round {state.last_scored_round.round_index} Results
              </p>
              <h2
                id="round-results-title"
                className="font-[family-name:var(--font-bebas)] text-[clamp(40px,10vw,68px)] tracking-[0.05em] leading-none"
              >
                Letter <span className="text-[#FFD600]">{state.last_scored_round.letter}</span>
              </h2>
            </div>
            <div className="flex flex-col gap-3.5">
              {[...state.participants]
                .sort((a, b) => (state.totals[b.id]?.total ?? 0) - (state.totals[a.id]?.total ?? 0))
                .map((p, rank) => {
                  const sub = state.last_scored_round?.submissions.find((s) => s.participant_id === p.id);
                  const t = state.totals[p.id] ?? { last_round: 0, prior: 0, total: 0 };
                  return (
                    <div
                      key={p.id}
                      className={`overflow-hidden rounded-[17px] border animate-[npat-slide-up_0.4s_ease_both] ${
                        me.id === p.id
                          ? "border-[rgba(255,214,0,0.2)]"
                          : "border-[rgba(255,255,255,0.07)]"
                      } bg-[#252219]`}
                      style={{ animationDelay: `${rank * 0.07}s` }}
                    >
                      <div
                        className={`flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-5 py-3.5 ${
                          rank === 0 ? "bg-gradient-to-r from-[rgba(255,214,0,0.07)] to-transparent" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 font-[family-name:var(--font-bebas)] text-lg ${
                              rank === 0
                                ? "text-[#FFD600]"
                                : rank === 1
                                  ? "text-[#F5F2EA]"
                                  : "text-[#8C8678]"
                            }`}
                          >
                            {rank + 1}.
                          </span>
                          <span className="text-[17px] font-extrabold">
                            {p.display_name}
                            {me.id === p.id && (
                              <span className="ml-1.5 text-sm font-semibold text-[#8C8678]">(you)</span>
                            )}
                          </span>
                          {p.is_host && (
                            <span className="rounded-md bg-[rgba(255,214,0,0.12)] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-[#FFD600]">
                              HOST
                            </span>
                          )}
                        </div>
                        <NpatScoreFormula
                          round_pts={t.last_round}
                          prior={t.prior}
                          total={t.total}
                          delay_s={0.2 + rank * 0.07}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 px-5 py-3">
                        {CAT_KEYS.map((ck) => (
                          <div
                            key={ck}
                            className="flex items-center gap-2 rounded-[10px] border bg-[#1A1714] px-3 py-2"
                            style={{
                              borderColor: sub_ok(sub, ck)
                                ? `${npat_category_color[ck]}73`
                                : "#3D3930",
                            }}
                          >
                            <div
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: sub_ok(sub, ck) ? npat_category_color[ck] : "#3D3930" }}
                            />
                            <div className="min-w-0">
                              <p
                                className="text-[10px] font-extrabold uppercase tracking-[0.08em]"
                                style={{ color: npat_category_color[ck] }}
                              >
                                {ck}
                              </p>
                              <p
                                className={`truncate text-[15px] font-bold ${
                                  sub_ok(sub, ck) ? "text-[#F5F2EA]" : "text-[#8C8678]"
                                }`}
                              >
                                {sub_answer(sub, ck).trim() || "—"}
                              </p>
                            </div>
                            {sub_ok(sub, ck) && (
                              <span className="ml-auto text-xs font-bold text-[#00C4A7]">+1</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              {me.is_host && (
                <>
                  <NpatButton
                    variant="primary"
                    size="lg"
                    type="button"
                    onClick={async () => {
                      const r = await startNextRoundAction();
                      if (r && "error" in r) {
                        setError((r as { error?: string }).error ?? null);
                      } else {
                        setError(null);
                      }
                      await load();
                    }}
                  >
                    Next Round →
                  </NpatButton>
                  <NpatButton
                    variant="ghost"
                    size="lg"
                    type="button"
                    onClick={async () => {
                      if (window.confirm("End the game for everyone?")) {
                        await endGameAction();
                        await load();
                      }
                    }}
                  >
                    End Game
                  </NpatButton>
                </>
              )}
            </div>
            {!me.is_host && (
              <p className="mt-6 text-center text-sm font-semibold text-[#8C8678]">
                Waiting for host to start the next round…
              </p>
            )}
          </section>
        )}

        {state.game.status === "in_progress" && !state.current_round && !show_results_between && me.is_host && (
          <div className="py-8">
            <NpatButton
              variant="teal"
              size="lg"
              full_width
              type="button"
              onClick={async () => {
                const r = await startNextRoundAction();
                if (r && "error" in r) {
                  setError((r as { error?: string }).error ?? null);
                } else {
                  setError(null);
                }
                await load();
              }}
            >
              Start next round
            </NpatButton>
          </div>
        )}

        {state.current_round && state.current_round.status === "active" && (
          <section
            className={`pb-12 pt-2 transition-opacity duration-500 ${
              !round_overlay ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-labelledby="active-round-title"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8C8678]">
                  Round {state.current_round.round_index}
                </p>
                <p
                  id="active-round-title"
                  className="font-[family-name:var(--font-bebas)] text-[30px] tracking-[0.06em] text-[#8C8678] leading-none"
                >
                  {state.game.name}
                </p>
              </div>
              <NpatTimerRing progress={progress} warn={warn} label={clock_label} />
            </div>
            {me.is_host && !round_overlay && (
              <div className="mb-5 flex justify-center">
                <NpatButton
                  variant="ghost"
                  size="lg"
                  type="button"
                  className="border border-[rgba(255,214,0,0.25)]"
                  onClick={async () => {
                    if (!window.confirm("End this round now and score everyone’s answers?")) {
                      return;
                    }
                    const r = await endRoundEarlyAction();
                    if (r && "error" in r && (r as { error?: string }).error) {
                      setError((r as { error: string }).error);
                    } else {
                      setError(null);
                    }
                    await load();
                  }}
                >
                  End round now
                </NpatButton>
              </div>
            )}
            <div className="mb-6 text-center">
              <span
                className="font-[family-name:var(--font-bebas)] leading-none text-[clamp(72px,14vw,130px)] text-[#FFD600] [text-shadow:0_0_60px_rgba(255,214,0,0.2)]"
                aria-hidden="true"
              >
                {state.current_round.letter}
              </span>
            </div>
            <p className="mb-3 text-center text-sm font-semibold text-[#8C8678]">
              Place, animal, and thing must start with {state.current_round.letter}.{" "}
              <strong className="font-extrabold text-[#F5F2EA]">Name</strong> must start with that
              letter <strong className="font-extrabold text-[#F5F2EA]">and</strong> match the
              game&apos;s curated first-name list (exact spelling after trim; case ignored).
            </p>
            <div className="flex flex-col gap-3.5">
              <NpatFieldInput
                id="g_name"
                label="Name"
                color={npat_category_color.name}
                value={f_name}
                onChange={setFname}
                placeholder={`Listed first name, ${state.current_round.letter}…`}
                disabled={player_submitted || left <= 0}
                onBlur={on_save_fields}
              />
              <NpatFieldInput
                id="g_place"
                label="Place"
                color={npat_category_color.place}
                value={f_place}
                onChange={setFplace}
                placeholder="A country, city, or region…"
                disabled={player_submitted || left <= 0}
                onBlur={on_save_fields}
              />
              <NpatFieldInput
                id="g_animal"
                label="Animal"
                color={npat_category_color.animal}
                value={f_animal}
                onChange={setFanimal}
                placeholder={`An animal starting with ${state.current_round.letter}…`}
                disabled={player_submitted || left <= 0}
                onBlur={on_save_fields}
              />
              <NpatFieldInput
                id="g_thing"
                label="Thing"
                color={npat_category_color.thing}
                value={f_thing}
                onChange={setFthing}
                placeholder={`A common noun starting with ${state.current_round.letter}…`}
                disabled={player_submitted || left <= 0}
                onBlur={on_save_fields}
              />
            </div>
            <div className="mt-6">
              {player_submitted || left <= 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-center text-[15px] font-bold text-[#8C8678]">
                    {left <= 0 ? "Time's up — answers locked!" : "Submitted! Waiting for others…"}
                  </p>
                </div>
              ) : (
                <NpatButton
                  variant="primary"
                  size="lg"
                  full_width
                  type="button"
                  disabled={!f_name.trim() && !f_place.trim() && !f_animal.trim() && !f_thing.trim()}
                  onClick={() => void on_submit_round()}
                >
                  Submit Answers
                </NpatButton>
              )}
            </div>
          </section>
        )}

        {error && (
          <p className="mt-4 font-bold text-[#FF5C39]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
