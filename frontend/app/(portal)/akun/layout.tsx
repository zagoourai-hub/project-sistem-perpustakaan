import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalShell } from "@/components/shell/portal-shell";

export const metadata: Metadata = { title: "Akun", robots: { index: false } };

export default function PortalLayout({ children }: LayoutProps<"/akun">) {
  return (
    <Suspense>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}
