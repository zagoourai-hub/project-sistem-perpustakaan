"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import type { CheckoutResult } from "@/shared/types/models";

// FE-6.4.8: loan slip for the member. Hidden on screen; the print CSS shows only .print-area.
export function Receipt({ result, memberName, memberCode }: { result: CheckoutResult; memberName?: string; memberCode?: string | null }) {
  return (
    <>
      <Button variant="secondary" size="sm" className="self-start" onClick={() => window.print()}>
        <Printer aria-hidden /> Cetak bukti pinjam
      </Button>
      <div className="print-area hidden print:block">
        <h1 className="font-display text-h2 uppercase">Pustaka</h1>
        <p className="data text-[12px]">Bukti peminjaman · {formatDateTime(new Date().toISOString())}</p>
        <p className="mt-2 text-body-sm">
          {memberName} <span className="data">{memberCode}</span>
        </p>
        <table className="mt-3 w-full text-body-sm">
          <thead>
            <tr className="border-b border-on-surface text-left">
              <th>Judul</th>
              <th>Barcode</th>
              <th className="text-right">Kembali</th>
            </tr>
          </thead>
          <tbody>
            {result.loans.map((l) => (
              <tr key={l.id} className="border-b border-outline-variant">
                <td>{l.item.book.title}</td>
                <td className="data">{l.item.barcode}</td>
                <td className="data text-right">{formatDate(l.dueAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-body-sm">Kembalikan tepat waktu. Keterlambatan dikenai denda.</p>
      </div>
    </>
  );
}
