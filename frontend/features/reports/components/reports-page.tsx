"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { TableSkeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useExportReport, useReport } from "@/features/reports/api/reports.api";
import { formatDate, formatNumber } from "@/lib/format";
import { REPORT_TYPES, type ReportType } from "@/shared/types/enums";
import { CirculationChart } from "./report-chart";
import { defaultPeriod, PeriodFilter } from "./period-filter";

const LABEL: Record<ReportType, string> = {
  circulation: "Sirkulasi",
  popular: "Terpopuler",
  "dead-stock": "Tak pernah dipinjam",
  "active-members": "Anggota aktif",
  "by-class": "Per kelas",
  fines: "Denda",
  "lost-damaged": "Hilang / rusak",
};

// FE-10.2.4: one tab per report, shared period filter, XLSX/CSV export (audit-logged by the backend).
export function ReportsPage() {
  const [type, setType] = useState<ReportType>("circulation");
  const [period, setPeriod] = useState(defaultPeriod);
  const { data, isLoading, error, refetch } = useReport(type, period);
  const exporter = useExportReport();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        kicker="Analitik"
        title="Laporan"
        actions={
          <>
            <Button variant="secondary" loading={exporter.isPending && exporter.variables?.format === "csv"} onClick={() => exporter.mutate({ type, period, format: "csv" })}>
              <Download aria-hidden /> CSV
            </Button>
            <Button loading={exporter.isPending && exporter.variables?.format === "xlsx"} onClick={() => exporter.mutate({ type, period, format: "xlsx" })}>
              <Download aria-hidden /> Excel
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Jenis laporan">
        {REPORT_TYPES.map((t) => (
          <Button key={t} role="tab" aria-selected={t === type} size="sm" variant={t === type ? "primary" : "secondary"} onClick={() => setType(t)}>
            {LABEL[t]}
          </Button>
        ))}
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : error || !data ? (
        <EmptyState title="Laporan gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : (
        <>
          <h2 className="text-book-title">{data.title ?? LABEL[type]}</h2>
          {type === "circulation" ? (
            <CirculationChart points={data.rows.map((r) => ({ label: String(r.day).slice(5, 10), checkouts: Number(r.checkouts), returns: Number(r.returns) }))} />
          ) : null}
          {data.rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {data.columns.map((c) => (
                    <TableHead key={c.key} className={c.type === "number" ? "text-right" : undefined}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r, i) => (
                  <TableRow key={i}>
                    {data.columns.map((c) => {
                      const v = r[c.key];
                      return (
                        <TableCell key={c.key} className={c.type ? `data ${c.type === "number" ? "text-right" : ""}` : undefined}>
                          {v == null ? "–" : c.type === "date" ? formatDate(String(v)) : c.type === "number" ? formatNumber(Number(v)) : String(v)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="Tidak ada data" description="Tidak ada data pada periode ini." />
          )}
        </>
      )}
    </div>
  );
}
