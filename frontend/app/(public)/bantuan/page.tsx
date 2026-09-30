import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading, SectionHeading } from "@/components/editorial/page-heading";
import { endpoints } from "@/lib/endpoints";
import { formatRupiah } from "@/lib/format";
import { publicFetch } from "@/lib/server-fetch";
import type { LoanPolicy } from "@/shared/types/models";

export const metadata: Metadata = { title: "Bantuan" };

const TYPE = { STUDENT: "Siswa / mahasiswa", STAFF: "Guru / staf" } as const;

// Loan rules are read from the live policy so this page never disagrees with the desk.
export default async function HelpPage() {
  const home = await publicFetch<{ loanRules: Pick<LoanPolicy, "memberType" | "maxActiveLoans" | "loanDays" | "maxRenewals" | "finePerDay">[] }>(endpoints.opac.home, { loanRules: [] }, 300);

  const steps = [
    ["Cari buku", "Ketik judul, pengarang, atau ceritakan buku yang kamu cari di halaman Katalog."],
    ["Cek ketersediaan", "Setiap buku menampilkan jumlah eksemplar yang tersedia dan letak raknya."],
    ["Pinjam di meja layanan", "Bawa buku dan kartu anggota (kartu fisik atau QR di portal) ke meja sirkulasi."],
    ["Reservasi bila habis", "Jika semua eksemplar dipinjam, masuk dengan akun anggota lalu pilih Reservasi. Kamu diberi tahu saat buku siap diambil."],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-12 md:px-6">
      <PageHeading kicker="Panduan" title="Bantuan" />

      <section className="flex flex-col gap-3">
        <SectionHeading kicker="Langkah demi langkah" title="Cara meminjam" />
        <ol className="flex max-w-2xl flex-col">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-4 border-b border-outline-variant py-4">
              <span className="data w-6 text-on-surface-variant">{i + 1}</span>
              <div>
                <p className="text-book-title">{title}</p>
                <p className="text-body-sm text-on-surface-variant">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {home.loanRules.length ? (
        <section className="flex flex-col gap-3">
          <SectionHeading kicker="Aturan berlaku" title="Batas pinjam dan denda" />
          <dl className="grid gap-6 md:grid-cols-2">
            {home.loanRules.map((r) => (
              <div key={r.memberType} className="flex flex-col gap-1 rounded border border-outline-variant bg-surface-container-lowest p-4">
                <dt className="kicker text-on-surface-variant">{TYPE[r.memberType]}</dt>
                <dd className="data text-[13px]">
                  Maks {r.maxActiveLoans} buku · {r.loanDays} hari · perpanjang {r.maxRenewals}× · denda {formatRupiah(r.finePerDay)}/hari
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="flex max-w-2xl flex-col gap-2">
        <SectionHeading kicker="Akun" title="Lupa kata sandi?" />
        <p className="text-body-md">
          Hubungi petugas di meja layanan untuk mengatur ulang kata sandi. Jam layanan ada di halaman{" "}
          <Link href="/jam-buka" className="underline">
            Jam buka
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
