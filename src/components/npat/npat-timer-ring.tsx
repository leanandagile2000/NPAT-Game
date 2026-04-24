"use client";

const R = 50;
const CIRC = 2 * Math.PI * R;

type Props = {
  progress: number;
  warn: boolean;
  label: string;
};

/** Circular countdown — HANDOFF §4 (stroke dash + warn color ≤30s). */
export function NpatTimerRing({ progress, warn, label }: Props) {
  const p = Math.min(1, Math.max(0, progress));
  const stroke = warn ? "#FF5C39" : "#00C4A7";
  return (
    <div className="relative h-[116px] w-[116px] shrink-0" aria-hidden="true">
      <svg width="116" height="116" viewBox="0 0 116 116" className="block">
        <circle cx="58" cy="58" r={R} fill="none" stroke="#3D3930" strokeWidth="6" />
        <circle
          cx="58"
          cy="58"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - p)}
          strokeLinecap="round"
          transform="rotate(-90 58 58)"
          className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
        />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center font-[family-name:var(--font-bebas)] tracking-wide ${
          warn ? "animate-[npat-timer-warn_0.7s_ease_infinite] text-2xl text-[#FF5C39]" : "text-[21px] text-[#F5F2EA]"
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        {label}
      </div>
    </div>
  );
}
