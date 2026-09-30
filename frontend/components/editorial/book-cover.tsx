"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { BookCoverProps } from "@/shared/props/components";

// Typographic placeholder tones for books without a cover: quiet warm surfaces,
// picked deterministically from the title so a book always gets the same one.
const TONES = [
  "bg-surface-container-highest",
  "bg-surface-container-high",
  "bg-[#e4dcd0] dark:bg-[#2c2820]",
  "bg-[#ded6ca] dark:bg-[#302b22]",
  "bg-[#e9e0d2] dark:bg-[#29251e]",
] as const;

function toneFor(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/** 2:3 cover, 2px radius, hairline border. Never a generic book icon (DESIGN.md). */
export function BookCover({ title, author, coverUrl, width = 120, priority, className }: BookCoverProps) {
  // A cover URL that 404s (file missing in storage) falls back to the typographic placeholder instead of a broken image.
  const [failed, setFailed] = useState(false);
  const box = "relative aspect-[2/3] shrink-0 overflow-hidden rounded-xs border border-outline-variant";
  if (coverUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- MinIO host not known yet; switch to next/image once remotePatterns is set (FE-0.2.2).
      <img
        src={coverUrl}
        alt={`Sampul ${title}`}
        width={width}
        height={Math.round(width * 1.5)}
        loading={priority ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        className={cn(box, "object-cover", className)}
        style={{ width }}
      />
    );
  }
  const compact = width < 90;
  return (
    <div
      role="img"
      aria-label={`Sampul ${title}`}
      className={cn(box, "flex flex-col justify-between p-2.5", toneFor(title), className)}
      style={{ width }}
    >
      <div className="flex flex-col gap-1">
        {/* Anton only at ≥20px (DESIGN.md); thumbnails fall back to Work Sans semibold. */}
        <span
          className={cn(
            "leading-tight text-on-surface",
            compact ? "text-[10px] font-semibold" : "font-display text-[20px] uppercase",
          )}
        >
          {title}
        </span>
        {author && !compact ? <span className="text-xs text-on-surface-variant">{author}</span> : null}
      </div>
      {!compact ? <span className="h-px w-full bg-outline-variant" aria-hidden /> : null}
    </div>
  );
}
