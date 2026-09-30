import type { Metadata } from "next";
import { HoldsPage } from "@/features/holds/components/holds-page";

export const metadata: Metadata = { title: "Reservasi" };

export default function Page() {
  return <HoldsPage />;
}
