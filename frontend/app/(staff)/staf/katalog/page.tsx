import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogPage } from "@/features/catalog/components/catalog-page";

export const metadata: Metadata = { title: "Katalog" };

export default function Page() {
  return (
    <Suspense>
      <CatalogPage />
    </Suspense>
  );
}
