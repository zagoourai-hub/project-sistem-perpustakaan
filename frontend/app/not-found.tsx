import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Global 404. Kept standalone (no shell) because it renders outside every route group's layout.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6">
      <p className="kicker text-on-surface-variant">Galat 404</p>
      <h1 className="font-display text-display text-on-surface uppercase">Halaman tidak ditemukan</h1>
      <p className="text-body-md text-on-surface-variant">Alamatnya mungkin salah ketik, atau halamannya sudah dipindahkan.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/" className={buttonVariants()}>
          Ke beranda
        </Link>
        <Link href="/katalog" className={buttonVariants({ variant: "secondary" })}>
          Cari buku
        </Link>
        <Link href="/masuk" className={buttonVariants({ variant: "secondary" })}>
          Masuk
        </Link>
      </div>
    </main>
  );
}
