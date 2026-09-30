import type { Metadata } from "next";
import { MembersPage } from "@/features/members/components/members-page";

export const metadata: Metadata = { title: "Anggota" };

export default function Page() {
  return <MembersPage />;
}
