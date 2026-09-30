import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogResults } from "@/features/search/components/catalog-results";

export const metadata: Metadata = { title: "Katalog" };

export default function CatalogPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
      <Suspense>
        <CatalogResults />
      </Suspense>
    </div>
  );
}
