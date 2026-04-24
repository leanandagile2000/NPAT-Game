"use client";

import { useEffect, useRef, useState } from "react";

export type NpatRoundPhase = "reveal" | "countdown" | "playing";

type Props = {
  round_index: number;
  letter: string;
  on_complete: () => void;
};

/**
 * Fullscreen letter reveal → 3-2-1 → playing — timings from HANDOFF / NPAT.html.
 */
export function NpatLetterOverlay({ round_index, letter, on_complete }: Props) {
  const [phase, setPhase] = useState<"reveal" | "countdown">("reveal");
  const [count, setCount] = useState(3);
  const on_done_ref = useRef(on_complete);
  on_done_ref.current = on_complete;

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("countdown");
      setCount(3);
    }, 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "countdown") {
      return;
    }
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        on_done_ref.current();
        return;
      }
      setCount(n);
    }, 950);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1A1714]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="npat-letter-overlay-title"
      aria-describedby="npat-letter-overlay-desc"
    >
      <span id="npat-letter-overlay-desc" className="sr-only">
        Round {round_index} starting with letter {letter}
      </span>
      {phase === "reveal" && (
        <>
          <p
            id="npat-letter-overlay-title"
            className="mb-3 animate-[npat-fade-in_0.4s_ease] text-sm font-extrabold uppercase tracking-[0.12em] text-[#8C8678]"
          >
            Round {round_index} · The letter is…
          </p>
          <div
            className="font-[family-name:var(--font-bebas)] leading-none text-[clamp(160px,28vw,300px)] text-[#FFD600]"
            style={{
              animation: "npat-letter-blast 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)",
              textShadow: "0 0 100px rgba(255,214,0,0.44), 0 0 200px rgba(255,214,0,0.19)",
            }}
            aria-hidden="true"
          >
            {letter}
          </div>
          <div className="mt-6 flex animate-[npat-fade-in_0.4s_ease_0.5s_both] gap-4">
            {(["Name", "Place", "Animal", "Thing"] as const).map((l, i) => (
              <span
                key={l}
                className="font-[family-name:var(--font-bebas)] text-[22px] tracking-[0.06em] opacity-80"
                style={{
                  color: ["#FFD600", "#FF5C39", "#00C4A7", "#F5F2EA"][i],
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </>
      )}
      {phase === "countdown" && (
        <div
          key={count}
          className="font-[family-name:var(--font-bebas)] leading-none text-[clamp(180px,35vw,340px)] text-[#F5F2EA]"
          style={{
            animation: "npat-count-pop 0.95s ease",
            textShadow: "0 0 80px rgba(255,255,255,0.2)",
          }}
          aria-live="assertive"
        >
          {count}
        </div>
      )}
    </div>
  );
}
