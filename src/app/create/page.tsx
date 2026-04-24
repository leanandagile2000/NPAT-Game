import { CreateGameForm } from "@/components/create-game-form";
import { isServerEnvReady } from "@/lib/env";
import Link from "next/link";
import { NpatBackLink } from "@/components/npat/npat-back-link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create a game | NPAT",
  description: "Set up a Name, Place, Animal, Thing game room",
};

export default function CreatePage() {
  if (!isServerEnvReady()) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-[#F5F2EA]">
        <h1 className="text-2xl font-bold">Configure the app first</h1>
        <p className="mt-3 text-[#8C8678]">
          Copy <code className="text-[#FFD600]">.env.local.example</code> to{" "}
          <code className="text-[#FFD600]">.env.local</code> and set Supabase URL, anon key, service
          role key, GeoNames username, and a long random <code className="text-[#FFD600]">SESSION_SECRET</code>.
        </p>
        <p className="mt-3 text-[#8C8678]">
          Then run the SQL in <code className="text-[#FFD600]">supabase/migrations/20260423120000_npat_games.sql</code>{" "}
          in the Supabase SQL editor.
        </p>
        <p className="mt-6">
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
      <div className="w-full max-w-[480px]">
        <a
          href="#main-form"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded focus:bg-[#252219] focus:px-3 focus:py-2 focus:text-[#F5F2EA]"
        >
          Skip to form
        </a>
        <h1
          id="main-heading"
          className="font-[family-name:var(--font-bebas)] text-[54px] tracking-[0.04em] leading-none"
        >
          Set Up a Game
        </h1>
        <p className="mt-1.5 text-base font-semibold text-[#8C8678]">
          You&apos;ll be the host. We&apos;ll give you a flower room link to share (only your name is
          required here).
        </p>
        <div id="main-form" className="mt-9" aria-labelledby="main-heading">
          <CreateGameForm />
        </div>
      </div>
    </div>
  );
}
