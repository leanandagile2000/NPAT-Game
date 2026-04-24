"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  large?: boolean;
  id: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

/** Standard form row — NPAT.html FormInput (optionally large game code style). */
export function NpatFormInput({
  label,
  value,
  onChange,
  placeholder,
  large,
  id,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8C8678]"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={
          large
            ? `w-full rounded-xl border-[1.5px] bg-[#1A1714] px-5 py-4 text-center font-[family-name:var(--font-bebas)] text-[32px] tracking-[0.2em] text-[#FFD600] outline-none transition-colors ${
                focused ? "border-[#FFD600]" : "border-[#3D3930]"
              }`
            : `w-full rounded-xl border-[1.5px] bg-[#1A1714] px-4 py-[13px] text-base font-bold text-[#F5F2EA] outline-none transition-colors ${
                focused ? "border-[#FFD600]" : "border-[#3D3930]"
              }`
        }
        {...rest}
      />
    </div>
  );
}
