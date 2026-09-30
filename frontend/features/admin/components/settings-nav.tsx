"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/staf/pengaturan", label: "Profil" },
  { href: "/staf/pengaturan/kebijakan", label: "Kebijakan" },
  { href: "/staf/pengaturan/ai", label: "Pencarian AI" },
  { href: "/staf/pengguna", label: "Pengguna" },
  { href: "/staf/audit", label: "Log audit" },
];

/** Sub-navigation shared by the admin settings pages. */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Pengaturan" className="flex flex-wrap gap-4 border-b border-outline-variant">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={pathname === l.href ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2 text-label ${pathname === l.href ? "border-primary font-semibold text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
