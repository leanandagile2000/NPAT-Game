"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createGameForm } from "@/server/npat/actions";
import { NpatButton } from "@/components/npat/npat-button";
import { NpatFormInput } from "@/components/npat/npat-form-input";

type CreateRes = { ok: false; error: string } | null;

function Submit({ disabled }: { disabled: boolean }) {
  const s = useFormStatus();
  return (
    <NpatButton type="submit" variant="primary" size="lg" full_width disabled={disabled || s.pending}>
      {s.pending ? "Creating…" : "Create Game →"}
    </NpatButton>
  );
}

export function CreateGameForm() {
  const [st, act] = useActionState(createGameForm, null as CreateRes);
  const [host, setHost] = useState("");
  const [dur, setDur] = useState(2);
  const can_create = host.trim().length > 0;

  return (
    <form className="flex w-full max-w-[480px] flex-col gap-5 animate-[npat-slide-up_0.5s_ease]" action={act}>
      <input type="hidden" name="host_display_name" value={host} />
      <input type="hidden" name="round_duration_minutes" value={String(dur)} />
      <NpatFormInput
        id="create_host_name"
        label="Your Name (Host)"
        value={host}
        onChange={setHost}
        placeholder="e.g. Alex"
        maxLength={32}
        autoComplete="name"
        required
      />
      <p className="text-sm font-semibold text-[#8C8678]">
        The app will assign a unique flower name as the room link (e.g. <span className="text-[#F5F2EA]">/g/peony</span>).
        Share that link so others can join.
      </p>
      <div>
        <label
          htmlFor="create_round_dur"
          className="mb-2.5 block text-xs font-bold uppercase tracking-[0.08em] text-[#8C8678]"
        >
          Round Duration
        </label>
        <div className="rounded-[13px] border-[1.5px] border-[#3D3930] bg-[#1A1714] px-5 py-[18px]">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#8C8678]">Time per round</span>
            <span className="font-[family-name:var(--font-bebas)] text-[40px] leading-none text-[#FFD600]">
              {dur}
              <span className="text-lg text-[#8C8678]"> min</span>
            </span>
          </div>
          <input
            id="create_round_dur"
            type="range"
            min={1}
            max={5}
            step={1}
            value={dur}
            onChange={(e) => setDur(Number(e.target.value))}
            className="h-[5px] w-full cursor-pointer accent-[#FFD600]"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={dur}
            aria-label="Round duration in minutes"
          />
          <div className="mt-1.5 flex justify-between text-xs font-bold text-[#3D3930]">
            {[1, 2, 3, 4, 5].map((v) => (
              <span key={v} className={v === dur ? "text-[#FFD600]" : undefined}>
                {v}m
              </span>
            ))}
          </div>
        </div>
      </div>
      <Submit disabled={!can_create} />
      {st && st.ok === false && (
        <p className="text-sm font-bold text-[#FF5C39]" role="alert">
          {st.error}
        </p>
      )}
    </form>
  );
}
