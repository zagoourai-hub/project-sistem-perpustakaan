"use client";

import { Button } from "@/components/ui/button";

// Last-resort boundary for an unexpected render error. Data errors are handled per page (EmptyState + "Coba lagi").
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6">
      <p className="kicker text-on-surface-variant">Terjadi kesalahan</p>
      <h1 className="font-display text-h1 text-on-surface uppercase">Halaman gagal ditampilkan</h1>
      <p className="text-body-md text-on-surface-variant">Coba muat ulang. Jika berulang, hubungi petugas perpustakaan.</p>
      <Button className="self-start" onClick={reset}>
        Coba lagi
      </Button>
    </main>
  );
}
