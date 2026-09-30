import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffShell } from "@/components/shell/staff-shell";

export const metadata: Metadata = { title: "Konsol Staf", robots: { index: false } };

export default function StaffLayout({ children }: LayoutProps<"/staf">) {
  return (
    <Suspense>
      <StaffShell>{children}</StaffShell>
    </Suspense>
  );
}
