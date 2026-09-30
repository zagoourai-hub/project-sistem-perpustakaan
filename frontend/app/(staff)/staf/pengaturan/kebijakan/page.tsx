import type { Metadata } from "next";
import { PoliciesPage } from "@/features/admin/components/policies-page";

export const metadata: Metadata = { title: "Kebijakan" };

export default function Page() {
  return <PoliciesPage />;
}
