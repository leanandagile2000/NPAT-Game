"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinGameForm } from "@/server/npat/actions";
import { NpatButton } from "@/components/npat/npat-button";
import { NpatFormInput } from "@/components/npat/npat-form-input";
import { normalizeJoinCodeSegment } from "@/lib/npat/join-code";
import { useState } from "react";

type JoinRes = { ok: false; error: string } | null;

function Submit({ disabled }: { disabled: boolean }) {
  const s = useFormStatus();
  return (
    <NpatButton type="submit" variant="coral" size="lg" full_width disabled={disabled || s.pending}>
      {s.pending ? "Joining…" : "Join Game →"}
    </NpatButton>
  );
}

type Props = { initial_code: string };

/**
 * Join flow from /join — flower room slug + display name.
 */
export function JoinByCodeForm({ initial_code }: Props) {
  const [st, act] = useActionState(joinGameForm, null as JoinRes);
  const [code, setCode] = useState(normalizeJoinCodeSegment(initial_code).slice(0, 40));
  const [name, setName] = useState("");
  const norm = normalizeJoinCodeSegment(code);
  const can_submit = norm.length >= 2 && name.trim().length > 0;

  return (
    <form className="flex w-full max-w-[440px] flex-col gap-5 animate-[npat-slide-up_0.5s_ease]" action={act}>
      <input type="hidden" name="join_code" value={norm} />
      <NpatFormInput
        id="join_code_visible"
        label="Room (flower name)"
        value={code}
        placeholder="e.g. peony"
        large
        onChange={(v) => setCode(normalizeJoinCodeSegment(v).slice(0, 40))}
        autoComplete="off"
        aria-describedby="join-code-hint"
      />
      <p id="join-code-hint" className="sr-only">
        Enter the room name from the host’s link. Lowercase letters and hyphens only.
      </p>
      <NpatFormInput
        id="join_display_name"
        label="Your Name"
        value={name}
        placeholder="e.g. Jordan"
        name="display_name"
        onChange={setName}
        autoComplete="off"
        required
        maxLength={32}
        aria-describedby="join-name-hint"
      />
      <p id="join-name-hint" className="text-sm font-semibold text-[#8C8678]">
        Same name rejoins your seat if nobody else is active with that name. A new name adds you as a
        new player (next round if the game is already going).
      </p>
      <Submit disabled={!can_submit} />
      {st && st.ok === false && (
        <p className="text-sm font-bold text-[#FF5C39]" role="alert">
          {st.error}
        </p>
      )}
    </form>
  );
}
