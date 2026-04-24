type Props = {
  round_pts: number;
  prior: number;
  total: number;
  delay_s?: number;
};

/** "round + prior = total" — HANDOFF §7 */
export function NpatScoreFormula({ round_pts, prior, total, delay_s = 0 }: Props) {
  return (
    <div
      className="flex items-center gap-1 font-[family-name:var(--font-bebas)]"
      style={{
        animation: delay_s ? `npat-score-reveal 0.4s ease ${delay_s}s both` : undefined,
      }}
    >
      <span className="text-[26px] text-[#FFD600]">{round_pts}</span>
      <span className="text-sm font-bold text-[#8C8678]">+</span>
      <span className="text-[22px] text-[#8C8678]">{prior}</span>
      <span className="text-sm font-bold text-[#8C8678]">=</span>
      <span className="text-[32px] text-[#F5F2EA]">{total}</span>
    </div>
  );
}
