import type { Metadata } from "next";
import { MasterDataPage } from "@/features/catalog/components/master-data-page";

export const metadata: Metadata = { title: "Master data" };

export default function Page() {
  return <MasterDataPage />;
}
