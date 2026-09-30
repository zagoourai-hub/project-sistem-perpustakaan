import type { Metadata } from "next";
import Link from "next/link";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = { title: "Ganti kata sandi", robots: { index: false } };

// PRD FE-2.3.8 / FR-A4: forced on first login for imported accounts.
export default async function ChangePasswordPage({ searchParams }: PageProps<"/ganti-password">) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-surface-container-low">
      <header className="border-b border-outline-variant bg-surface px-6 py-4">
        <Link href="/" className="font-display text-h2 text-on-surface uppercase">
          Pustaka
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <span className="kicker text-on-surface-variant">Keamanan akun</span>
          <h1 className="mt-1.5 font-display text-h1 text-on-surface uppercase">Ganti kata sandi</h1>
          <p className="mt-3 mb-8 text-body-sm text-on-surface-variant">
            Demi keamanan, buat kata sandi baru sebelum melanjutkan.
          </p>
          <ChangePasswordForm next={typeof next === "string" ? next : undefined} />
        </div>
      </main>
    </div>
  );
}
