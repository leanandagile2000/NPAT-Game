"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";

const COLORS = ["#FFD600", "#FF5C39", "#00C4A7", "#FFFFFF", "#FF9100", "#C468FF"];

/** Lightweight fixed confetti layer — NPAT.html FinalResultsScreen */
export function NpatConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 65 }, (_, i) => ({
        id: i,
        color: COLORS[i % COLORS.length] ?? "#FFD600",
        left: Math.random() * 100,
        delay: Math.random() * 4,
        dur: 3.5 + Math.random() * 3,
        size: 7 + Math.random() * 10,
        round: i % 4 < 2,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {pieces.map((c) => (
        <div
          key={c.id}
          className="fixed -top-3"
          style={
            {
              left: `${c.left}%`,
              width: c.size,
              height: c.round ? c.size : c.size * 0.45,
              background: c.color,
              borderRadius: c.round ? "50%" : 2,
              animation: `npat-confetti-fall ${c.dur}s ease-in ${c.delay}s infinite`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
