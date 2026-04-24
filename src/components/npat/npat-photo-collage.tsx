import type { CSSProperties } from "react";
import Image from "next/image";
import { npat_collage_photos } from "@/lib/npat/tokens";

/**
 * Home hero background — 6×3 grid, float animation, gradient overlay (HANDOFF §8).
 */
export function NpatPhotoCollage() {
  return (
    <>
      <div
        className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-1 p-1"
        aria-hidden="true"
      >
        {npat_collage_photos.map((p, i) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-[9px]"
            style={
              {
                "--npat-rot": `${p.rot}deg`,
                animation: `npat-photo-float ${3.2 + (i % 5) * 0.45}s ease-in-out ${i * 0.18}s infinite`,
              } as CSSProperties
            }
          >
            <Image
              src={`https://images.unsplash.com/photo-${p.id}?w=300&h=220&fit=crop&auto=format`}
              alt=""
              width={300}
              height={220}
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 16vw, 12vw"
            />
          </div>
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(26,23,20,0.25) 0%, rgba(26,23,20,0.55) 30%, rgba(26,23,20,0.92) 58%, #1A1714 80%)",
        }}
        aria-hidden="true"
      />
    </>
  );
}
