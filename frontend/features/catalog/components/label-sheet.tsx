"use client";

import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { useBook } from "@/features/catalog/api/books.api";
import { renderBarcode } from "@/lib/barcode/render-barcode";

/** One spine label: call number over a Code 128 barcode. Generated locally from our own barcode strings. */
function Label({ barcode, callNumber }: { barcode: string; callNumber: string }) {
  const svg = useMemo(() => renderBarcode(barcode), [barcode]);
  return (
    <div className="flex break-inside-avoid flex-col items-center gap-1 border border-dashed border-outline p-2">
      <span className="data text-[11px] font-semibold">{callNumber}</span>
      <div className="w-full [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

// FE-4.3.11: A4 grid of barcode labels for one book (?book=<id>). Print CSS shows only the sheet.
export function LabelSheet() {
  const bookId = useSearchParams().get("book") ?? "";
  const { data: book, isLoading } = useBook(bookId);

  if (!bookId) return <EmptyState title="Pilih buku dulu" description="Buka halaman detail buku, lalu pilih Lembar label." />;
  if (isLoading || !book) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        kicker="Katalog"
        title="Label barcode"
        actions={
          <Button onClick={() => window.print()}>
            <Printer aria-hidden /> Cetak
          </Button>
        }
      />
      <p className="text-body-sm text-on-surface-variant print:hidden">
        {book.title} · {book.items.length} label. Gunakan kertas label A4, skala 100%.
      </p>
      <div className="print-area grid grid-cols-3 gap-2 md:grid-cols-4">
        {book.items.map((i) => (
          <Label key={i.id} barcode={i.barcode} callNumber={book.callNumber} />
        ))}
      </div>
    </div>
  );
}
