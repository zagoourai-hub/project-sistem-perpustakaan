import type { Metadata } from "next";
import { AuditPage } from "@/features/admin/components/audit-page";

export const metadata: Metadata = { title: "Log audit" };

export default function Page() {
  return <AuditPage />;
}
