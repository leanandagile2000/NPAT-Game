import type { ButtonHTMLAttributes, ReactNode } from "react";

const size_class = {
  sm: "text-sm px-5 py-2.5 min-h-[44px]",
  md: "text-base px-[26px] py-[13px] min-h-[44px]",
  lg: "text-lg px-[38px] py-4 min-h-[48px]",
  xl: "text-[22px] px-[52px] py-5 min-h-[52px]",
} as const;

const variant_class = {
  primary:
    "bg-[#FFD600] text-[#1A1714] hover:bg-[#FFE033] shadow-none hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
  coral: "bg-[#FF5C39] text-[#F5F2EA] hover:bg-[#FF6E50] shadow-none hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
  teal: "bg-[#00C4A7] text-[#1A1714] hover:bg-[#00D4B5] shadow-none hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
  ghost:
    "bg-transparent text-[#F5F2EA] border-[1.5px] border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.06)]",
  danger:
    "bg-[rgba(255,92,57,0.12)] text-[#FF5C39] border border-[rgba(255,92,57,0.25)] hover:bg-[rgba(255,92,57,0.2)]",
  dark:
    "bg-[#252219] text-[#F5F2EA] border border-[rgba(255,255,255,0.07)] hover:bg-[#2d2922] shadow-none hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
} as const;

export type NpatButtonVariant = keyof typeof variant_class;
export type NpatButtonSize = keyof typeof size_class;

type Props = {
  children: ReactNode;
  variant?: NpatButtonVariant;
  size?: NpatButtonSize;
  full_width?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Primary action control — matches NPAT.html Btn styles (hover lift + shadow).
 */
export function NpatButton({
  children,
  variant = "primary",
  size = "md",
  full_width,
  className = "",
  disabled,
  type = "button",
  ...rest
}: Props) {
  const w = full_width ? "w-full" : "";
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[13px] font-extrabold transition-all duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600] disabled:cursor-not-allowed disabled:opacity-[0.38] disabled:hover:translate-y-0 disabled:hover:shadow-none ${variant_class[variant]} ${size_class[size]} ${w} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
