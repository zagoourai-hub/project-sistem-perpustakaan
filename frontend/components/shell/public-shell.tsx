import Link from "next/link";
import { User } from "lucide-react";
import { PublicNav } from "@/components/shell/public-nav";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { clock } from "@/lib/today";
import { LOGIN_PATH } from "@/shared/constants";
import type { ChildrenProps } from "@/shared/props/common";

interface PublicShellProps extends ChildrenProps {
  institutionName: string;
  address?: string;
}

/** OPAC chrome (09/10/11): thin masthead header, 1200px column, footer opened by a 2px ink rule. */
export async function PublicShell({ institutionName, address, children }: PublicShellProps) {
  const { year } = await clock();
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-outline-variant/60 bg-surface/95">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="font-display text-h2 text-on-surface uppercase transition-colors hover:text-primary">
              Pustaka
            </Link>
            <span className="hidden h-4 w-px bg-outline-variant sm:block" aria-hidden />
            <span className="hidden truncate text-body-sm font-medium text-on-surface-variant sm:block">{institutionName}</span>
          </div>
          <div className="flex items-center gap-6">
            <PublicNav />
            <div className="flex items-center gap-4 border-l border-outline-variant/40 pl-4">
              <ThemeToggle />
              <Link href={LOGIN_PATH} className={buttonVariants({ variant: "sunken" })}>
                Masuk
              </Link>
              <span className="hidden size-8 items-center justify-center rounded-full bg-primary text-on-primary sm:flex" aria-hidden>
                <User className="size-[18px] stroke-[1.5]" />
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-24 border-t-2 border-on-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between md:px-6">
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-h3 text-on-surface uppercase">Pustaka</span>
            <span className="text-body-sm text-on-surface-variant">{institutionName}</span>
            {address ? <span className="data text-xs text-on-surface-variant">{address}</span> : null}
          </div>
          <nav className="flex gap-6 text-label" aria-label="Tautan kaki">
            <Link href="/katalog" className="font-semibold text-primary hover:underline">
              Katalog
            </Link>
            <Link href={LOGIN_PATH} className="text-on-surface-variant hover:text-on-surface">
              Masuk anggota
            </Link>
          </nav>
        </div>
        <div className="mx-auto max-w-[1200px] border-t border-outline-variant px-4 py-5 md:px-6">
          <p className="data text-xs text-on-surface-variant">
            © {year} {institutionName}
          </p>
        </div>
      </footer>
    </div>
  );
}
