"use client";

import { cn } from "@/lib/cn";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookOpen,
  Bookmark,
  Calendar,
  Database,
  IdCard,
  LayoutGrid,
  Menu,
  LogOut,
  Search,
  Settings,
  User,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Kbd } from "@/components/editorial/bits";
import { KeyboardShortcuts } from "@/components/staff/keyboard-shortcuts";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useLogout, useMe } from "@/features/auth/api/auth.api";
import { LOGIN_PATH } from "@/shared/constants";
import type { ChildrenProps } from "@/shared/props/common";

const NAV: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/staf", label: "Dasbor", icon: LayoutGrid },
  { href: "/staf/sirkulasi", label: "Sirkulasi", icon: ArrowLeftRight },
  { href: "/staf/katalog", label: "Katalog", icon: BookOpen },
  { href: "/staf/master-data", label: "Master data", icon: Database },
  { href: "/staf/anggota", label: "Anggota", icon: IdCard },
  { href: "/staf/reservasi", label: "Reservasi", icon: Bookmark },
  { href: "/staf/denda", label: "Denda", icon: Banknote },
  { href: "/staf/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/staf/pengguna", label: "Pengguna", icon: UserCog, adminOnly: true },
  { href: "/staf/pengaturan", label: "Pengaturan", icon: Settings, adminOnly: true },
];

const ROLE_LABEL = { ADMIN: "Admin", LIBRARIAN: "Pustakawan", MEMBER: "Anggota" } as const;

const today = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

function isActive(pathname: string, href: string) {
  return href === "/staf" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Staff console chrome (04/05/06/12): 232px sunken sidebar + 64px top bar, keyboard-first. */
export function StaffShell({ children }: ChildrenProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: user } = useMe();
  const logout = useLogout();
  // Below lg the sidebar becomes a drawer opened from the header, so phones and tablets can still navigate.
  const [menu, setMenu] = useState(false);

  // PRD §9.5: "/" focuses search, F2 = checkout, F3 = checkin.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        setMenu(false);
      } else if (e.key === "F2" || e.key === "F3") {
        e.preventDefault();
        router.push(`/staf/sirkulasi?mode=${e.key === "F2" ? "pinjam" : "kembali"}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex min-h-screen bg-surface-container">
      {menu ? <div className="fixed inset-0 z-30 bg-on-surface/40 lg:hidden" aria-hidden onClick={() => setMenu(false)} /> : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[232px] flex-col justify-between border-r border-outline-variant bg-surface-container-high lg:flex",
          menu ? "flex" : "hidden",
        )}
      >
        <div className="flex flex-col">
          <div className="flex h-16 items-baseline justify-between gap-2 border-b border-outline-variant px-5 pt-5">
            <Link href="/staf" className="font-display text-[26px] leading-none text-on-surface uppercase">
              Pustaka
            </Link>
            <span className="data text-[11px] font-medium tracking-wider text-on-surface-variant uppercase">Konsol staf</span>
          </div>
          <nav className="flex flex-col py-2" aria-label="Navigasi konsol">
            {NAV.filter((n) => !n.adminOnly || user?.role === "ADMIN").map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenu(false)}
                  className={cn(
                    "group flex h-10 items-center gap-3 border-l-2 px-5 text-body-sm transition-colors hover:bg-surface-container-highest/60 hover:text-on-surface",
                    active
                      ? "border-primary-container font-semibold text-on-surface"
                      : "border-transparent text-on-surface-variant",
                  )}
                >
                  <Icon
                    className={cn("size-[19px] stroke-[1.5]", active ? "text-primary-container" : "text-outline group-hover:text-on-surface")}
                    aria-hidden
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant p-4">
          <div className="mr-2 flex min-w-0 flex-col">
            <span className="truncate text-body-sm font-semibold text-on-surface">{user?.name ?? "—"}</span>
            <span className="data truncate text-[11px] text-on-surface-variant">{user ? ROLE_LABEL[user.role] : ""}</span>
          </div>
          <button
            type="button"
            title="Keluar"
            aria-label="Keluar"
            className="rounded p-1 text-on-surface-variant transition-colors hover:text-primary-container"
            onClick={() => logout.mutate(undefined, { onSettled: () => router.replace(LOGIN_PATH) })}
          >
            <LogOut className="size-5 stroke-[1.5]" />
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container px-4 md:gap-6 md:px-8">
          <button type="button" aria-label="Buka menu" aria-expanded={menu} className="-ml-1 p-1 text-on-surface lg:hidden" onClick={() => setMenu(true)}>
            <Menu className="size-6 stroke-[1.5]" />
          </button>
          <form
            role="search"
            className="relative w-full min-w-0 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchRef.current?.value.trim();
              if (q) router.push(`/staf/katalog?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 stroke-[1.5] text-outline" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              aria-label="Cari judul, barcode, atau anggota"
              placeholder="Cari judul, barcode, atau anggota…"
              className="data h-9 w-full rounded-xs border border-outline-variant bg-surface-container-lowest pr-10 pl-9 text-xs text-on-surface placeholder:text-outline focus:border-on-surface"
            />
            <Kbd keys={["/"]} className="absolute top-1/2 right-3 -translate-y-1/2 text-on-surface-variant" />
          </form>
          <div className="flex shrink-0 items-center gap-3 md:gap-6">
            <div className="data hidden items-center gap-2 border-r border-outline-variant pr-6 text-xs whitespace-nowrap text-on-surface md:flex">
              <Calendar className="size-[18px] stroke-[1.5] text-outline" aria-hidden />
              {today.format(new Date())}
            </div>
            <KeyboardShortcuts />
            <ThemeToggle />
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-container text-on-primary" aria-hidden>
              <User className="size-[18px] stroke-[1.5]" />
            </span>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 pt-8 pb-12 md:px-8">{children}</main>
      </div>
    </div>
  );
}
