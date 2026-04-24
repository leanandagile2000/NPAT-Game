"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = {
  label: string;
  color: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "color">;

/** Category-styled answer field — NPAT.html FieldInput */
export function NpatFieldInput({
  label,
  color,
  value,
  onChange,
  placeholder,
  disabled,
  id,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const border =
    focused || value.trim()
      ? `2px solid ${focused ? color : `${color}80`}`
      : "2px solid #3D3930";
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-[7px] block text-[11px] font-extrabold uppercase tracking-[0.1em]"
        style={{ color }}
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border,
          background: focused ? "#2e2b23" : "#1f1d17",
        }}
        className="w-full rounded-xl px-4 py-[13px] text-base font-[inherit] text-[#F5F2EA] outline-none transition-all duration-150 disabled:opacity-[0.55]"
        {...rest}
      />
    </div>
  );
}
