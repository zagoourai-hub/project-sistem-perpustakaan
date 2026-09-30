import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";
import { endpoints } from "@/lib/endpoints";
import { publicFetch } from "@/lib/server-fetch";

export const metadata: Metadata = { title: "Masuk" };

// PRD FE-2.3.7: editorial split — typographic library name left, form right.
export default async function LoginPage({ searchParams }: PageProps<"/masuk">) {
  const { next } = await searchParams;
  const settings = await publicFetch(endpoints.admin.publicSettings, { institutionName: "Perpustakaan", openingHours: "" });

  return (
    <div className="grid min-h-screen lg:grid-cols-12">
      <section className="flex flex-col justify-between gap-10 border-b-2 border-on-surface bg-surface px-6 py-8 lg:col-span-7 lg:border-r lg:border-b-0 lg:border-outline-variant lg:px-12 lg:py-12">
        <Link href="/" className="font-display text-h2 text-on-surface uppercase hover:text-primary">
          Pustaka
        </Link>
        <div className="flex flex-col gap-4">
          <span className="kicker text-on-surface-variant">Layanan perpustakaan</span>
          <h1 className="font-display text-[56px] leading-[0.92] text-on-surface uppercase sm:text-[84px] lg:text-[104px]">
            {settings.institutionName}
          </h1>
          <div className="h-0.5 w-24 bg-on-surface" aria-hidden />
        </div>
        {settings.openingHours ? (
          <p className="data text-xs text-on-surface-variant">Buka {settings.openingHours}</p>
        ) : (
          <span aria-hidden />
        )}
      </section>

      <section className="flex items-center justify-center bg-surface-container-low px-6 py-12 lg:col-span-5">
        <div className="w-full max-w-sm">
          <span className="kicker text-on-surface-variant">Akun</span>
          <h2 className="mt-1.5 mb-8 font-display text-h1 text-on-surface uppercase">Masuk</h2>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </section>
    </div>
  );
}
