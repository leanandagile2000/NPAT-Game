import Link from "next/link";
import { NpatBackLink } from "@/components/npat/npat-back-link";

export const metadata = {
  title: "How to Play | NPAT",
  description: "Rules for Name, Place, Animal, Thing",
};

const steps = [
  {
    n: "01",
    color: "#FFD600",
    title: "How the game works",
    body: "The game is simple. You play over several rounds. At the start of each round everyone gets a new letter. Your job is to think of words that begin with that letter and fit each category: Name, Place, Animal, and Thing. Letters cycle A–Z without repeating until all 26 have been used, then a new cycle begins. Each answer must still pass the game’s validation for its category (curated name list, GeoNames, animal list, dictionary).",
  },
  {
    n: "02",
    color: "#FF5C39",
    title: "Timed rounds",
    body: "Each round is on the clock. The host chooses how long you have—between 1 and 5 minutes—before the game starts.",
  },
  {
    n: "03",
    color: "#00C4A7",
    title: "Create a game and invite players",
    body: 'From the home page, open Set Up New Game. After you create the room, you get a shareable game link—send it to your friends so they can join. Once people are in the lobby, the host starts the game when everyone is ready.',
  },
  {
    n: "04",
    color: "#F5F2EA",
    title: "Scoring",
    body: "Scoring is simple: +1 point for each correct answer, +0 points for no answer or an answer that doesn’t pass validation. Between rounds you’ll see this round’s points plus your running total. The host can end the game anytime; only finished rounds count toward the final score.",
  },
];

const cats = [
  {
    label: "Name",
    color: "#FFD600",
    eg: "Alice, Bob, Carlos…",
    note: "Any first name from the curated list (case-insensitive)",
  },
  {
    label: "Place",
    color: "#FF5C39",
    eg: "Australia, Berlin, Cairo…",
    note: "Countries, cities, regions — verified via GeoNames API",
  },
  {
    label: "Animal",
    color: "#00C4A7",
    eg: "Aardvark, Bear, Crane…",
    note: "Any animal from the bundled animal dataset",
  },
  {
    label: "Thing",
    color: "#F5F2EA",
    eg: "Apple, Bottle, Chair…",
    note: "Common English nouns only — no brand names or proper nouns",
  },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen px-6 pb-[72px] pt-20 animate-[npat-fade-in_0.35s_ease]">
      <NpatBackLink href="/" />
      <div className="mx-auto max-w-[820px]">
        <h1 className="font-[family-name:var(--font-bebas)] text-[56px] tracking-[0.05em] leading-none">
          How to Play
        </h1>
        <p className="mt-1.5 text-[17px] font-semibold text-[#8C8678]">
          The game is simple—rounds, one letter, four categories, validation, and a ticking clock.
        </p>

        <div className="mt-12 flex flex-col gap-3.5">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="flex gap-5 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#252219] px-6 py-5 animate-[npat-slide-up_0.4s_ease_both]"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <span
                className="min-w-[56px] font-[family-name:var(--font-bebas)] text-[52px] leading-none"
                style={{ color: s.color }}
              >
                {s.n}
              </span>
              <div className="pt-1">
                <p className="text-lg font-extrabold">{s.title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#8C8678]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-14 font-[family-name:var(--font-bebas)] text-[38px] tracking-[0.05em]">
          The Four Categories
        </h2>
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(178px,1fr))] gap-3">
          {cats.map((c) => (
            <div
              key={c.label}
              className="rounded-[14px] border bg-[#252219] px-5 py-[18px]"
              style={{ borderColor: `${c.color}4d` }}
            >
              <p
                className="mb-1 font-[family-name:var(--font-bebas)] text-[30px] tracking-[0.05em]"
                style={{ color: c.color }}
              >
                {c.label}
              </p>
              <p className="mb-2 text-[13px] italic text-[#8C8678]">{c.eg}</p>
              <p className="text-[13.5px] leading-snug text-[#F5F2EA]/80">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-3">
          <Link
            href="/create"
            className="inline-flex min-h-[48px] items-center justify-center rounded-[13px] bg-[#FFD600] px-[38px] py-4 text-lg font-extrabold text-[#1A1714] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#FFE033] hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600]"
          >
            Set Up a Game
          </Link>
          <Link
            href="/join"
            className="inline-flex min-h-[48px] items-center justify-center rounded-[13px] border-[1.5px] border-[rgba(255,255,255,0.07)] bg-transparent px-[38px] py-4 text-lg font-extrabold text-[#F5F2EA] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600]"
          >
            Join a Game
          </Link>
        </div>
      </div>
    </div>
  );
}
