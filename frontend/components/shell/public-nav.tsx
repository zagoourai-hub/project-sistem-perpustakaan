"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/katalog", label: "Katalog" },
  { href: "/jam-buka", label: "Jam Buka" },
  { href: "/bantuan", label: "Bantuan" },
];

export function PublicNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-6 md:flex" aria-label="Navigasi utama">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-label transition-colors",
              active
                ? "font-semibold text-primary underline decoration-2 underline-offset-8"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
