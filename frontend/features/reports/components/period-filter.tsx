"use client";

import { Input } from "@/components/ui/input";
import type { Period } from "@/features/reports/api/reports.api";

const iso = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(d);

/** Default period: from the 1st of this month to today (Asia/Jakarta). */
export const defaultPeriod = (): Period => {
  const now = new Date();
  return { from: `${iso(now).slice(0, 8)}01`, to: iso(now) };
};

// FE-10.2.2 / FR-K4: from–to date range. Presets cover the daily and monthly cases.
export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  // Computed when clicked, not during render, so they always use the current date.
  const presets: { label: string; period: () => Period }[] = [
    { label: "Hari ini", period: () => ({ from: iso(new Date()), to: iso(new Date()) }) },
    { label: "Bulan ini", period: defaultPeriod },
    { label: "30 hari", period: () => ({ from: iso(new Date(Date.now() - 29 * 86_400_000)), to: iso(new Date()) }) },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="date" aria-label="Dari tanggal" className="w-40" value={value.from} max={value.to} onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })} />
      <span aria-hidden>–</span>
      <Input type="date" aria-label="Sampai tanggal" className="w-40" value={value.to} min={value.from} onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })} />
      {presets.map((p) => (
        <button key={p.label} type="button" className="data rounded-xs border border-outline-variant px-2 py-1 text-[12px] hover:bg-surface-container-high" onClick={() => onChange(p.period())}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
