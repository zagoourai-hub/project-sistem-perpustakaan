"use client";

import { Download, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { Button } from "@/components/ui/button";
import { useMyCard } from "@/features/me/api/me.api";
import { MemberCard } from "@/features/members/components/member-card";

// FE-8.4.6 (08-kartu-digital). "Unduh" opens the print dialog, where "Save as PDF" gives the file.
export default function CardPage() {
  const { data: card, isLoading, error, refetch } = useMyCard();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="kicker text-on-surface-variant">Kartu anggota</p>
        <h1 className="font-display text-h1 uppercase">Kartu digital</h1>
      </div>
      {isLoading ? (
        <Skeleton className="h-96 w-full max-w-sm" />
      ) : error || !card ? (
        <EmptyState title="Kartu gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : (
        <>
          <MemberCard member={card} />
          <p className="text-body-md text-on-surface-variant">Tunjukkan kode ini di meja layanan untuk meminjam buku.</p>
          <p className="data flex max-w-sm items-center gap-2 rounded bg-surface-container-high p-3 text-[12px] text-on-surface-variant">
            <Lightbulb className="size-4 shrink-0 stroke-[1.5]" aria-hidden /> Naikkan kecerahan layar agar mudah dipindai.
          </p>
          <Button variant="sunken" className="max-w-sm" onClick={() => window.print()}>
            <Download aria-hidden /> Unduh kartu (PDF)
          </Button>
        </>
      )}
    </div>
  );
}
