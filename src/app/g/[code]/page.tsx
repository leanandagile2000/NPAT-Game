import { GameRoomClient } from "@/components/game-room-client";
import { isServerEnvReady } from "@/lib/env";
import { flowerSlugToDisplayName, isValidJoinCodeSegment, normalizeJoinCodeSegment } from "@/lib/npat/join-code";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const norm = normalizeJoinCodeSegment(code);
  const title =
    isValidJoinCodeSegment(norm) ? `${flowerSlugToDisplayName(norm)} | NPAT` : `Game | NPAT`;
  return { title };
}

export default async function GamePage() {
  if (!isServerEnvReady()) {
    return (
      <main className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-semibold">Not configured</h1>
        <p className="text-zinc-600 mt-2">Add <code>.env.local</code> to run the game.</p>
        <p className="mt-2">
          <Link href="/" className="text-blue-600 underline">
            Home
          </Link>
        </p>
      </main>
    );
  }
  return (
    <main>
      <Suspense
        fallback={
          <p className="p-6" role="status">
            Loading game…
          </p>
        }
      >
        <GameRoomClient />
      </Suspense>
    </main>
  );
}
