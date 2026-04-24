import { readFileSync } from "node:fs";
import { join } from "node:path";

let cache: Set<string> | null = null;

/**
 * In-memory curated set from `src/lib/data/first-names.txt` (one name per line, PRD §4.1).
 * Expand the file with SSA/ONS merges in your pipeline; scoring reads only this set.
 */
export function getFirstNameSet(): Set<string> {
  if (cache) {
    return cache;
  }
  const path = join(process.cwd(), "src/lib/data/first-names.txt");
  const raw = readFileSync(path, "utf-8");
  cache = new Set(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean),
  );
  return cache;
}

/** Normalize player input for lookup: trim + lowercase (PRD: case-insensitive match). */
export function normalizeFirstNameAnswer(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * True only if the full trimmed answer is exactly one entry in the curated first-name file.
 * Multi-word strings must appear as a single line in the file if you want them to score.
 */
export function isKnownFirstName(input: string): boolean {
  const t = normalizeFirstNameAnswer(input);
  if (!t) {
    return false;
  }
  return getFirstNameSet().has(t);
}
