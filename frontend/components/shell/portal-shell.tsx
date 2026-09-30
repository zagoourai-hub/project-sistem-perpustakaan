"use client";

import { cn } from "@/lib/cn";
import { BookMarked, Bookmark, House, IdCard, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { usePathname } from "next/navigation";
import { useMe } from "@/features/auth/api/auth.api";
import type { ChildrenProps } from "@/shared/props/common";

// Profile bottom nav: Beranda, Pinjaman, Reservasi, Kartu (mockups show "Katalog" — profile wins).
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/akun", label: "Beranda", icon: House },
  { href: "/akun/riwayat", label: "Pinjaman", icon: BookMarked },
  { href: "/akun/reservasi", label: "Reservasi", icon: Bookmark },
  { href: "/akun/kartu", label: "Kartu", icon: IdCard },
];

/** Member portal chrome (07/08): mobile-first, 16px gutter, 4-tab bottom nav. */
export function PortalShell({ children }: ChildrenProps) {
  const pathname = usePathname();
  useMe();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-surface">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-outline-variant/50 bg-surface px-4">
        <Link href="/akun" className="font-display text-[26px] leading-none text-primary uppercase">
          Pustaka
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell />
          <Link href="/akun/pengaturan" aria-label="Pengaturan akun" className="flex size-9 items-center justify-center rounded bg-primary text-on-primary">
            <User className="size-[18px] stroke-[1.5]" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-28">{children}</main>

      <nav
        aria-label="Navigasi portal"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto grid h-[72px] max-w-[480px] grid-cols-4 border-t border-outline-variant/60 bg-surface-container-low pb-[env(safe-area-inset-bottom)]"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/akun" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-wider uppercase",
                active ? "text-primary" : "text-on-surface-variant",
              )}
            >
              <Icon className="size-5 stroke-[1.5]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
