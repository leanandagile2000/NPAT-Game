import Link from "next/link";

type Props = { href: string; label?: string };

/** Top-left glass pill back control — NPAT.html BackBtn */
export function NpatBackLink({ href, label = "Back" }: Props) {
  return (
    <Link
      href={href}
      className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[rgba(37,34,25,0.85)] px-4 py-2 text-sm font-bold text-[#8C8678] backdrop-blur-md transition-colors hover:text-[#F5F2EA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD600]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      {label}
    </Link>
  );
}
