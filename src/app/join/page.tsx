import { isServerEnvReady } from "@/lib/env";
import Link from "next/link";
import { JoinByCodeForm } from "@/components/join-by-code-form";
import { NpatBackLink } from "@/components/npat/npat-back-link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join a game | NPAT",
  description: "Enter a room code to join a Name, Place, Animal, Thing game",
};

type Props = { searchParams: Promise<{ code?: string }> };

export default async function JoinPage({ searchParams }: Props) {
  const { code } = await searchParams;
  const initial = (code ?? "").trim();

  if (!isServerEnvReady()) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-[#F5F2EA]">
        <h1 className="text-2xl font-bold">Configure the app first</h1>
        <p className="mt-3 text-[#8C8678]">
          Copy <code className="text-[#FFD600]">.env.local.example</code> to{" "}
          <code className="text-[#FFD600]">.env.local</code> and finish setup.
        </p>
        <p className="mt-4">
          <Link href="/" className="font-bold text-[#00C4A7] underline underline-offset-4">
            Home
          </Link>
        </p>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-24">
      <NpatBackLink href="/" />
      <div className="w-full max-w-[440px]">
        <h1 className="font-[family-name:var(--font-bebas)] text-[54px] tracking-[0.04em] leading-none">
          Join a Game
        </h1>
        <p className="mt-1.5 text-base font-semibold text-[#8C8678]">
          Enter the flower room name from your host&apos;s link (e.g. peony).
        </p>
        <div className="mt-9">
          <JoinByCodeForm initial_code={initial} />
        </div>
      </div>
    </div>
  );
}
