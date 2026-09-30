import type { Metadata } from "next";
import { Suspense } from "react";
import { LabelSheet } from "@/features/catalog/components/label-sheet";

export const metadata: Metadata = { title: "Label barcode" };

export default function Page() {
  return (
    <Suspense>
      <LabelSheet />
    </Suspense>
  );
}
