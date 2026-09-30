import type { Metadata } from "next";
import { StaffPage } from "@/features/admin/components/staff-page";

export const metadata: Metadata = { title: "Pengguna" };

export default function Page() {
  return <StaffPage />;
}
