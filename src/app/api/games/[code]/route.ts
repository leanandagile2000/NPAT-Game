import { NextResponse } from "next/server";
import { isServerEnvReady } from "@/lib/env";
import { LOAD_GAME_SERVER_ERROR, loadGameStateByCode } from "@/server/npat/state";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  if (!isServerEnvReady()) {
    return NextResponse.json(
      { ok: false, error: "Server environment is not configured. Copy .env.local.example to .env.local." },
      { status: 503 },
    );
  }
  const { code } = await params;
  const result = await loadGameStateByCode(code);
  if (!result.ok) {
    const status = result.error === LOAD_GAME_SERVER_ERROR ? 503 : 404;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
