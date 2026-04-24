import { NextResponse } from "next/server";
import { debugPlaceValidation } from "@/lib/validation/place-geonames";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Local troubleshooting for place scoring. Enable with NPAT_DEBUG_GEO=1 in .env.local.
 *
 * GET /api/dev/geonames-place?place=Paris&letter=P
 */
export async function GET(request: Request) {
  const debug_geo = process.env.NPAT_DEBUG_GEO?.trim();
  if (debug_geo !== "1") {
    return NextResponse.json(
      {
        error: "Disabled. Set NPAT_DEBUG_GEO=1 in .env.local (no quotes) and restart dev server.",
        hint: "If the page looks blank, open DevTools → Network and read the response body.",
      },
      { status: 404 },
    );
  }
  const { searchParams } = new URL(request.url);
  const place = searchParams.get("place")?.trim() ?? "";
  const letter = (searchParams.get("letter")?.trim() || "A").slice(0, 1);
  if (!place) {
    return NextResponse.json({ error: "Query param `place` is required." }, { status: 400 });
  }
  try {
    const report = await debugPlaceValidation(place, letter);
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
