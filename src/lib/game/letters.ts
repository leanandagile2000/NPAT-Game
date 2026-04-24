const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Picks a random capital letter that is not in `used` (A–Z only).
 * If the pool is empty, return null so the caller can reset the cycle and retry.
 */
export function pickRandomLetter(used: Set<string>): string | null {
  const available = ALPHABET.filter((l) => !used.has(l));
  if (available.length === 0) {
    return null;
  }
  return available[Math.floor(Math.random() * available.length)] ?? null;
}

export function normalizeLetterInput(s: string): string {
  return s.trim().toUpperCase();
}

/**
 * For English v1: first code unit must match the round letter (after trim).
 */
export function answerStartsWithLetter(text: string, letter: string): boolean {
  const t = text.trim();
  if (t.length === 0) {
    return false;
  }
  const c = t[0];
  if (!c) {
    return false;
  }
  return c.toUpperCase() === letter.toUpperCase();
}
