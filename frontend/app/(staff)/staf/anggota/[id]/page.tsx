import type { Metadata } from "next";
import { MemberDetail } from "@/features/members/components/member-detail";

export const metadata: Metadata = { title: "Detail anggota" };

export default async function MemberPage({ params }: PageProps<"/staf/anggota/[id]">) {
  const { id } = await params;
  return <MemberDetail id={id} />;
}
