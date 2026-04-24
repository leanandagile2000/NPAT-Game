import { readFileSync } from "node:fs";
import { join } from "node:path";

let cache: Set<string> | null = null;

export function getAnimalSet(): Set<string> {
  if (cache) {
    return cache;
  }
  const path = join(process.cwd(), "src/lib/data/animals.txt");
  const raw = readFileSync(path, "utf-8");
  cache = new Set(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean),
  );
  return cache;
}

export function isKnownAnimal(input: string): boolean {
  const t = input.trim().toLowerCase();
  if (!t) {
    return false;
  }
  return getAnimalSet().has(t);
}
