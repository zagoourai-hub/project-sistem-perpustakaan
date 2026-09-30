"use client";

import { Skeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { useAiReindex, useAiStatus } from "@/features/admin/api/admin.api";
import { formatNumber } from "@/lib/format";
import { SettingsNav } from "./settings-nav";

// FE-11.3.1 (FR-I): embedding index status. Polls every 2 s while a reindex runs (see useAiStatus).
export function AiPage() {
  const { data, isLoading, error, refetch } = useAiStatus();
  const reindex = useAiReindex();
  const pct = data && data.total ? Math.round((data.embedded / data.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading kicker="Pengaturan" title="Pencarian AI" />
      <SettingsNav />
      {isLoading ? (
        <Skeleton className="h-32 w-full max-w-xl" />
      ) : error || !data ? (
        <EmptyState title="Status gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : (
        <div className="flex max-w-xl flex-col gap-4">
          <p className="data text-data-lg">{formatNumber(data.embedded)} <span className="text-body-md text-on-surface-variant">/ {formatNumber(data.total)} judul ter-embed</span></p>
          <div role="progressbar" aria-valuenow={data.reindexing ? (data.progress ?? 0) : pct} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan indeks" className="h-2 w-full bg-surface-container-high">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${data.reindexing ? (data.progress ?? 0) : pct}%` }} />
          </div>
          <p className="data text-[12px] text-on-surface-variant">Model: {data.model || "–"}{data.reindexing ? " · sedang mengindeks ulang…" : ""}</p>
          <Button className="self-start" loading={reindex.isPending || data.reindexing} onClick={() => window.confirm("Indeks ulang semua buku? Ini memanggil layanan embedding.") && reindex.mutate()}>
            Indeks ulang
          </Button>
          {reindex.error ? <p role="alert" className="text-body-sm text-primary-container dark:text-primary">Gagal memulai indeks ulang.</p> : null}
        </div>
      )}
    </div>
  );
}
