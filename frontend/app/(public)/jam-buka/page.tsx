import type { Metadata } from "next";
import { PageHeading, SectionHeading } from "@/components/editorial/page-heading";
import { endpoints } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import { clock } from "@/lib/today";
import { publicFetch } from "@/lib/server-fetch";
import type { Holiday, LibrarySettings } from "@/shared/types/models";

export const metadata: Metadata = { title: "Jam buka" };

// Opening hours and closed days come from the public settings and holiday calendar, so the admin edits them in one place.
export default async function OpeningHoursPage() {
  const { year, today } = await clock();
  const [settings, holidays] = await Promise.all([
    publicFetch<Partial<LibrarySettings>>(endpoints.admin.publicSettings, {}, 60),
    publicFetch<Holiday[]>(`${endpoints.admin.holidays}?year=${year}`, [], 300),
  ]);
  const upcoming = holidays.filter((h) => h.date.slice(0, 10) >= today);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-12 md:px-6">
      <PageHeading kicker={settings.institutionName ?? "Perpustakaan"} title="Jam buka" />
      <section className="flex flex-col gap-2">
        <p className="data text-data-lg">{settings.openingHours ?? "Belum diatur"}</p>
        {settings.address ? <p className="text-body-md text-on-surface-variant">{settings.address}</p> : null}
      </section>
      <section className="flex max-w-xl flex-col gap-3">
        <SectionHeading kicker={`Tahun ${year}`} title="Hari libur" />
        {upcoming.length ? (
          <ul>
            {upcoming.map((h) => (
              <li key={h.id} className="flex gap-4 border-b border-outline-variant py-2">
                <span className="data w-32 shrink-0 text-[13px]">{formatDate(h.date)}</span>
                <span>{h.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Tidak ada hari libur yang akan datang.</p>
        )}
      </section>
    </div>
  );
}
