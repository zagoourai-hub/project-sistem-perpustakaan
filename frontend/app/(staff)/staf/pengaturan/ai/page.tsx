import type { Metadata } from "next";
import { AiPage } from "@/features/admin/components/ai-page";

export const metadata: Metadata = { title: "Pencarian AI" };

export default function Page() {
  return <AiPage />;
}
