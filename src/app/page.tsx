import type { CSSProperties, ReactNode } from "react";
import { isServerEnvReady } from "@/lib/env";
import Link from "next/link";
import { NpatPhotoCollage } from "@/components/npat/npat-photo-collage";

export const dynamic = "force-dynamic";

function HomeCard({
  href,
  label,
  accent,
  icon,
}: {
  href: string;
  label: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-3.5 rounded-[20px] border-2 border-[rgba(255,255,255,0.07)] bg-[rgba(37,34,25,0.85)] px-5 py-8 text-[#F5F2EA] shadow-none backdrop-blur-md transition-all duration-200 hover:-translate-y-[7px] hover:border-[var(--npat-accent)] hover:bg-[rgba(40,37,28,0.97)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.55),0_0_0_1px_var(--npat-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600]"
      style={
        {
          ["--npat-accent" as string]: accent,
        } as CSSProperties
      }
    >
      <span className="text-[rgba(245,242,234,0.75)] transition-colors group-hover:text-[var(--npat-accent,currentColor)]">
        {icon}
      </span>
      <span className="text-center text-[17px] font-extrabold">{label}</span>
    </Link>
  );
}

export default function Home() {
  const ready = isServerEnvReady();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-20 focus:rounded focus:bg-[#252219] focus:px-3 focus:py-2 focus:text-[#F5F2EA] focus:outline focus:outline-2 focus:outline-[#FFD600]"
      >
        Skip to content
      </a>
      <NpatPhotoCollage />
      <main
        id="main"
        className="relative z-[2] flex min-h-screen flex-col items-center justify-end px-6 pb-[72px] pt-10"
      >
        <div className="mb-[52px] animate-[npat-slide-down_0.7s_ease] text-center">
          <h1 className="font-[family-name:var(--font-bebas)] text-[clamp(34px,7.5vw,92px)] leading-none tracking-[0.07em] [text-shadow:0_4px_48px_rgba(0,0,0,0.85)]">
            <span className="text-[#FFD600]">NAME</span>
            <span className="mx-[clamp(5px,1.2vw,18px)] text-[rgba(245,242,234,0.35)]">·</span>
            <span className="text-[#FF5C39]">PLACE</span>
            <span className="mx-[clamp(5px,1.2vw,18px)] text-[rgba(245,242,234,0.35)]">·</span>
            <span className="text-[#00C4A7]">ANIMAL</span>
            <span className="mx-[clamp(5px,1.2vw,18px)] text-[rgba(245,242,234,0.35)]">·</span>
            <span className="text-[#F5F2EA]">THING</span>
          </h1>
          <p className="mt-2.5 text-[17px] font-bold tracking-wide text-[rgba(245,242,234,0.5)]">
            The classic word game — multiplayer, online, real-time
          </p>
        </div>

        {!ready ? (
          <div
            className="w-full max-w-[860px] animate-[npat-slide-up_0.7s_ease_0.18s_both] rounded-2xl border border-[rgba(255,145,0,0.35)] bg-[rgba(255,145,0,0.08)] p-6 text-[#F5F2EA]"
            role="status"
          >
            <p className="font-extrabold">Environment not ready</p>
            <p className="mt-2 text-sm font-semibold text-[#8C8678]">
              Copy <code className="text-[#FFD600]">.env.local.example</code> to{" "}
              <code className="text-[#FFD600]">.env.local</code> and set Supabase +{" "}
              <code className="text-[#FFD600]">GEONAMES_USERNAME</code> +{" "}
              <code className="text-[#FFD600]">SESSION_SECRET</code>, then run the SQL migration in
              Supabase. Restart <code className="text-[#FFD600]">npm run dev</code>.
            </p>
          </div>
        ) : (
          <div className="grid w-full max-w-[860px] grid-cols-[repeat(auto-fit,minmax(195px,1fr))] gap-3.5 animate-[npat-slide-up_0.7s_ease_0.18s_both]">
            <HomeCard
              href="/rules"
              label="How to Play"
              accent="#00C4A7"
              icon={
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              }
            />
            <HomeCard
              href="/create"
              label="Set Up New Game"
              accent="#FFD600"
              icon={
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
            />
            <HomeCard
              href="/join"
              label="Join Existing Game"
              accent="#FF5C39"
              icon={
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              }
            />
          </div>
        )}
      </main>
    </div>
  );
}
