/**
 * GeoNames place validation (Node runtime). Uses secure.geonames.org; optional
 * GEONAMES_RESOLVED_IP pins TCP to a known-good address while TLS SNI stays correct.
 */
import https from "node:https";
import { getServerEnv } from "@/lib/env";
import { answerStartsWithLetter } from "@/lib/game/letters";

type GeonameRow = {
  name?: string;
  toponymName?: string;
  countryName?: string;
  adminName1?: string;
  adminCode1?: string;
};

type SearchResponse = {
  geonames?: GeonameRow[];
  totalResultsCount?: number;
  status?: { message: string; value: number };
};

/** Lowercase, trim, collapse spaces, strip combining marks (e.g. São → sao). */
function normalizeForPlaceMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function variantsFromRow(row: GeonameRow): string[] {
  const rawName = (row.name ?? row.toponymName ?? "").trim();
  if (!rawName) {
    return [];
  }
  const base = normalizeForPlaceMatch(rawName);
  const first = normalizeForPlaceMatch(rawName.split(",")[0]?.trim() ?? rawName);
  const country = normalizeForPlaceMatch(row.countryName ?? "");
  const admin = normalizeForPlaceMatch(row.adminName1 ?? "");
  const adminCode = normalizeForPlaceMatch(row.adminCode1 ?? "");
  const out = new Set<string>([base, first]);
  if (country) {
    out.add(`${first}, ${country}`);
    if (base !== first) {
      out.add(`${base}, ${country}`);
    }
  }
  if (admin) {
    out.add(`${first}, ${admin}`);
    if (country) {
      out.add(`${first}, ${admin}, ${country}`);
    }
  }
  if (adminCode) {
    out.add(`${first}, ${adminCode}`);
  }
  return [...out].filter(Boolean);
}

function rowMatchesNeedle(row: GeonameRow, needleNorm: string): boolean {
  return variantsFromRow(row).some((v) => v === needleNorm);
}

type GeonamesFetchResult =
  | { ok: true; http_status: number; data: SearchResponse }
  | { ok: false; http_status: number; message: string };

/** TLS and HTTP Host must match this (GeoNames HTTPS certificate). */
const GEONAMES_TLS_HOST = "secure.geonames.org";

/** Avoid hung requests when GeoNames or TLS is slow; keeps /api/dev responses bounded. */
const GEONAMES_SEARCH_TIMEOUT_MS = 15_000;

const GEONAMES_RETRY_ATTEMPTS = 3;
const GEONAMES_RETRY_BASE_DELAY_MS = 350;

function formatFetchError(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const cause = err.cause;
  if (cause instanceof Error) {
    return `${err.message} — ${cause.message}`;
  }
  return err.message;
}

function buildGeonamesSearchUrl(q: string, username: string): URL {
  const url = new URL(`https://${GEONAMES_TLS_HOST}/searchJSON`);
  url.searchParams.set("q", q);
  url.searchParams.set("maxRows", "15");
  url.searchParams.set("lang", "en");
  url.searchParams.set("username", username);
  return url;
}

function parseGeonamesJsonBody(
  body: string,
  http_status: number,
): GeonamesFetchResult {
  try {
    const data = JSON.parse(body) as SearchResponse;
    if (data.status) {
      return {
        ok: false,
        http_status,
        message: `${data.status.message} (code ${data.status.value})`,
      };
    }
    return { ok: true, http_status, data };
  } catch {
    return { ok: false, http_status, message: "Invalid JSON from GeoNames" };
  }
}

/** Transient errors worth retrying (wrong DNS hop, edge timeout, etc.). */
function shouldRetryGeonamesResult(r: GeonamesFetchResult): boolean {
  if (r.ok) {
    return false;
  }
  return (
    r.http_status === 0 ||
    r.http_status === 502 ||
    r.http_status === 503 ||
    r.http_status === 504
  );
}

async function geonamesFetch(url: URL): Promise<GeonamesFetchResult> {
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(GEONAMES_SEARCH_TIMEOUT_MS),
    });
    const http_status = res.status;
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, http_status, message: `HTTP ${http_status}` };
    }
    return parseGeonamesJsonBody(text, http_status);
  } catch (err) {
    return { ok: false, http_status: 0, message: formatFetchError(err) };
  }
}

/**
 * HTTPS to a fixed IP with SNI + Host set to GEONAMES_TLS_HOST so the certificate validates
 * when public DNS returns a mix of good and bad addresses.
 */
function geonamesHttpsGet(url: URL, resolved_ip: string): Promise<GeonamesFetchResult> {
  const path_and_query = `${url.pathname}${url.search}`;
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: resolved_ip,
        port: 443,
        path: path_and_query,
        method: "GET",
        servername: GEONAMES_TLS_HOST,
        headers: {
          Host: GEONAMES_TLS_HOST,
          Accept: "application/json",
        },
        timeout: GEONAMES_SEARCH_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const http_status = res.statusCode ?? 0;
          const text = Buffer.concat(chunks).toString("utf8");
          if (http_status < 200 || http_status >= 300) {
            resolve({ ok: false, http_status, message: `HTTP ${http_status}` });
            return;
          }
          resolve(parseGeonamesJsonBody(text, http_status));
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({
        ok: false,
        http_status: 0,
        message: "GeoNames request timeout",
      });
    });
    req.on("error", (err) => {
      resolve({ ok: false, http_status: 0, message: formatFetchError(err) });
    });
    req.end();
  });
}

async function fetchGeonamesSearch(q: string): Promise<GeonamesFetchResult> {
  const env = getServerEnv();
  const url = buildGeonamesSearchUrl(q, env.GEONAMES_USERNAME);
  const pinned = env.GEONAMES_RESOLVED_IP;

  for (let attempt = 1; attempt <= GEONAMES_RETRY_ATTEMPTS; attempt++) {
    const result = pinned
      ? await geonamesHttpsGet(url, pinned)
      : await geonamesFetch(url);
    if (result.ok) {
      return result;
    }
    if (!shouldRetryGeonamesResult(result) || attempt === GEONAMES_RETRY_ATTEMPTS) {
      return result;
    }
    console.warn("[fetchGeonamesSearch] retrying transient GeoNames failure", {
      attempt,
      http_status: result.http_status,
      pinned: Boolean(pinned),
    });
    await new Promise((r) => setTimeout(r, GEONAMES_RETRY_BASE_DELAY_MS * attempt));
  }
  return { ok: false, http_status: 0, message: "GeoNames: exhausted retries" };
}

export type PlaceValidationDebug = {
  letter_ok: boolean;
  needle_raw: string;
  needle_normalized: string;
  valid: boolean;
  http_status: number;
  geonames_error?: string;
  row_count: number;
  rows_preview: Array<{
    name?: string;
    countryName?: string;
    adminName1?: string;
    adminCode1?: string;
    variants: string[];
    matched: boolean;
  }>;
  env_error?: string;
};

/**
 * Same rules as isValidPlace, but returns structured diagnostics for local troubleshooting.
 * Does not log secrets.
 */
export async function debugPlaceValidation(
  userAnswer: string,
  roundLetter: string,
): Promise<PlaceValidationDebug> {
  const letter_ok = answerStartsWithLetter(userAnswer, roundLetter);
  const q = userAnswer.trim();
  const needleNorm = normalizeForPlaceMatch(q);
  const empty: PlaceValidationDebug = {
    letter_ok,
    needle_raw: userAnswer,
    needle_normalized: needleNorm,
    valid: false,
    http_status: 0,
    row_count: 0,
    rows_preview: [],
  };
  if (!letter_ok) {
    return { ...empty, geonames_error: "Answer does not start with the round letter (after trim)." };
  }
  if (!q) {
    return { ...empty, geonames_error: "Empty place after trim." };
  }
  try {
    const fetched = await fetchGeonamesSearch(q);
    if (!fetched.ok) {
      return {
        ...empty,
        http_status: fetched.http_status,
        geonames_error: fetched.message,
      };
    }
    const rows = fetched.data.geonames ?? [];
    const rows_preview = rows.map((row) => ({
      name: row.name,
      countryName: row.countryName,
      adminName1: row.adminName1,
      adminCode1: row.adminCode1,
      variants: variantsFromRow(row),
      matched: rowMatchesNeedle(row, needleNorm),
    }));
    const valid = rows_preview.some((r) => r.matched);
    return {
      letter_ok,
      needle_raw: userAnswer,
      needle_normalized: needleNorm,
      valid,
      http_status: fetched.http_status,
      row_count: rows.length,
      rows_preview,
    };
  } catch (err) {
    return {
      ...empty,
      env_error: formatFetchError(err),
    };
  }
}

/**
 * GeoNames searchJSON: accept if any returned place variant matches the player answer
 * (case- and accent-insensitive), after the round letter check.
 */
export async function isValidPlace(
  userAnswer: string,
  roundLetter: string,
): Promise<boolean> {
  if (!answerStartsWithLetter(userAnswer, roundLetter)) {
    return false;
  }
  const q = userAnswer.trim();
  if (!q) {
    return false;
  }
  const needleNorm = normalizeForPlaceMatch(q);
  try {
    const fetched = await fetchGeonamesSearch(q);
    if (!fetched.ok) {
      console.error("[isValidPlace] GeoNames request failed", { q, message: fetched.message });
      return false;
    }
    const rows = fetched.data.geonames;
    if (!rows || rows.length === 0) {
      return false;
    }
    for (const row of rows) {
      if (rowMatchesNeedle(row, needleNorm)) {
        return true;
      }
    }
    console.warn("[isValidPlace] no matching row", {
      q,
      needleNorm,
      sample: rows.slice(0, 3).map((r) => ({
        name: r.name,
        country: r.countryName,
        admin: r.adminName1,
      })),
    });
    return false;
  } catch (err) {
    console.error("[isValidPlace] request failed", { q, err });
    return false;
  }
}
