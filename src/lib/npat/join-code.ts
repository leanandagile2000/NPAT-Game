/**
 * Room link slug rules (shared by server and client). Stored join_code is always lowercase.
 */
export function normalizeJoinCodeSegment(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function isValidJoinCodeSegment(norm: string): boolean {
  if (norm.length < 2 || norm.length > 40) {
    return false;
  }
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(norm);
}

/** "evening-primrose" → "Evening primrose" */
export function flowerSlugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
