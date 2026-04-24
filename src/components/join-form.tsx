"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinGameForm } from "@/server/npat/actions";
import { NpatButton } from "@/components/npat/npat-button";

type JoinRes = { ok: false; error: string } | null;

function Submit() {
  const s = useFormStatus();
  return (
    <NpatButton type="submit" variant="coral" size="lg" full_width disabled={s.pending}>
      {s.pending ? "Joining…" : "Join Game →"}
    </NpatButton>
  );
}

export function JoinForm({ code }: { code: string }) {
  const [st, act] = useActionState(joinGameForm, null as JoinRes);
  const norm = code.trim().toLowerCase();
  return (
    <form className="flex flex-col gap-5" action={act}>
      <input type="hidden" name="join_code" value={norm} />
      <div>
        <label
          htmlFor="room_join_name"
          className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#8C8678]"
        >
          Your Name
        </label>
        <input
          id="room_join_name"
          name="display_name"
          className="w-full rounded-xl border-[1.5px] border-[#3D3930] bg-[#1A1714] px-4 py-[13px] text-base font-bold text-[#F5F2EA] outline-none transition-colors focus:border-[#FFD600]"
          required
          maxLength={32}
          autoComplete="off"
          placeholder="e.g. Jordan"
          aria-describedby="join-hint"
        />
      </div>
      <p id="join-hint" className="text-sm font-semibold text-[#8C8678]">
        Use the same name to reclaim your seat (if it isn&apos;t active elsewhere). A new name joins as
        a new player.
      </p>
      <Submit />
      {st && st.ok === false && (
        <p className="text-sm font-bold text-[#FF5C39]" role="alert">
          {st.error}
        </p>
      )}
    </form>
  );
}
