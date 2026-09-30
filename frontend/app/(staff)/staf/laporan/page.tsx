import type { Metadata } from "next";
import { ReportsPage } from "@/features/reports/components/reports-page";

export const metadata: Metadata = { title: "Laporan" };

export default function Page() {
  return <ReportsPage />;
}
