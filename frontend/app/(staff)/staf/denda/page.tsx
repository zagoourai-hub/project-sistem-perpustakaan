import type { Metadata } from "next";
import { Suspense } from "react";
import { FinesPage } from "@/features/fines/components/fines-page";

export const metadata: Metadata = { title: "Denda" };

export default function Page() {
  return (
    <Suspense>
      <FinesPage />
    </Suspense>
  );
}
