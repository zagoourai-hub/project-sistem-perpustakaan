"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiDownload, apiGet } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { ExportFormat, ReportType } from "@/shared/types/enums";
import type { DashboardKpis, ReportTable } from "@/shared/types/models";

// FR-K4 period filter: daily / monthly / custom range.
export const periodSchema = z
  .object({
    from: z.iso.date("Tanggal awal tidak valid"),
    to: z.iso.date("Tanggal akhir tidak valid"),
  })
  .refine((p) => p.from <= p.to, { path: ["to"], message: "Tanggal akhir sebelum tanggal awal" });
export type Period = z.infer<typeof periodSchema>;

export const reportKeys = {
  dashboard: ["reports", "dashboard"] as const,
  report: (type: ReportType, period: Period) => ["reports", type, period] as const,
};

export const reportsApi = {
  dashboard: () => apiGet<DashboardKpis>(endpoints.reports.dashboard),
  report: (type: ReportType, period: Period) => apiGet<ReportTable>(endpoints.reports.one(type), period),
  export: (type: ReportType, period: Period, format: ExportFormat) =>
    apiDownload(endpoints.reports.export(type), { ...period, format }, `laporan-${type}.${format}`),
};

export const useDashboard = () =>
  useQuery({ queryKey: reportKeys.dashboard, queryFn: reportsApi.dashboard, refetchInterval: 60_000 });

export const useReport = (type: ReportType, period: Period) =>
  useQuery({ queryKey: reportKeys.report(type, period), queryFn: () => reportsApi.report(type, period) });

/** Export is audit-logged by the backend (PRD FE-10.1). */
export const useExportReport = () =>
  useMutation({
    mutationFn: ({ type, period, format }: { type: ReportType; period: Period; format: ExportFormat }) =>
      reportsApi.export(type, period, format),
  });
