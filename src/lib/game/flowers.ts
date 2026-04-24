import { readFileSync } from "node:fs";
import { join } from "node:path";

let cache: string[] | null = null;

/** Slugs from `flowers.txt` (lowercase, hyphenated), one per line. */
export function getFlowerSlugs(): string[] {
  if (cache) {
    return cache;
  }
  const path = join(process.cwd(), "src/lib/data/flowers.txt");
  const raw = readFileSync(path, "utf-8");
  cache = raw
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(line));
  return cache;
}

export { flowerSlugToDisplayName, normalizeJoinCodeSegment, isValidJoinCodeSegment } from "@/lib/npat/join-code";
