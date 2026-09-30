import { PublicShell } from "@/components/shell/public-shell";
import { endpoints } from "@/lib/endpoints";
import { publicFetch } from "@/lib/server-fetch";
import type { LibrarySettings } from "@/shared/types/models";

const FALLBACK = { institutionName: "Perpustakaan", address: "", openingHours: "" } satisfies Partial<LibrarySettings>;

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const settings = await publicFetch(endpoints.admin.publicSettings, FALLBACK);
  return (
    <PublicShell institutionName={settings.institutionName} address={settings.address || undefined}>
      {children}
    </PublicShell>
  );
}
