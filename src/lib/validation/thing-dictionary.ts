import { answerStartsWithLetter } from "@/lib/game/letters";

type Entry = {
  meanings?: Array<{ partOfSpeech?: string }>;
};

type DictResponse = Entry | Entry[];

/**
 * Free Dictionary API. Accepts a word if it has a **common** noun reading:
 * at least one meaning with `partOfSpeech` exactly `"noun"`, and we do not
 * accept the case where **every** meaning is `"proper noun"`.
 */
export async function isValidCommonNoun(
  userAnswer: string,
  roundLetter: string,
): Promise<boolean> {
  if (!answerStartsWithLetter(userAnswer, roundLetter)) {
    return false;
  }
  const w = userAnswer.trim().toLowerCase();
  const first = w.split(/\s+/)[0] ?? "";
  if (!/^[a-z-]+$/.test(first)) {
    return false;
  }
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(first)}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (res.status === 404) {
      return false;
    }
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as DictResponse;
    const entries = Array.isArray(data) ? data : [data];
    const meanings = entries.flatMap((e) => e.meanings ?? []);
    if (meanings.length === 0) {
      return false;
    }
    const pos = meanings.map((m) => m.partOfSpeech?.toLowerCase() ?? "");
    if (pos.every((p) => p === "proper noun")) {
      return false;
    }
    if (pos.some((p) => p === "noun")) {
      return true;
    }
    if (pos.some((p) => p.includes("noun") && !p.includes("proper"))) {
      return true;
    }
    return false;
  } catch (err) {
    console.error("[isValidCommonNoun] dictionary request failed", { first, err });
    return false;
  }
}
