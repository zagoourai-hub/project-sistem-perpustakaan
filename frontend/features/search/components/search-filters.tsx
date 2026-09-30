"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMasterData } from "@/features/catalog/api/books.api";
import type { SearchParams } from "../schemas/search.schema";

const LANGUAGES = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "Inggris" },
  { value: "ar", label: "Arab" },
];

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

// FE-8.3.4. The backend returns no facet counts, so options are static / master data without counts.
export function SearchFilters({ params, onChange }: { params: SearchParams; onChange: (patch: Partial<SearchParams>) => void }) {
  const { data: subjects } = useMasterData("subjects");
  const [years, setYears] = useState({ from: params.yearFrom?.toString() ?? "", to: params.yearTo?.toString() ?? "" });
  const dirty = params.subject.length || params.language.length || params.available !== undefined || params.yearFrom || params.yearTo;

  return (
    <aside className="flex flex-col gap-6" aria-label="Filter hasil">
      <div className="flex items-baseline justify-between border-b border-outline-variant pb-2">
        <span className="kicker text-on-surface-variant">Filter hasil</span>
        {dirty ? (
          <button
            type="button"
            className="text-body-sm text-primary hover:underline"
            onClick={() => {
              setYears({ from: "", to: "" });
              onChange({ subject: [], language: [], available: undefined, yearFrom: undefined, yearTo: undefined });
            }}
          >
            Reset filter
          </button>
        ) : null}
      </div>

      <Group title="Ketersediaan">
        <Check label="Tersedia sekarang" checked={params.available === true} onChange={(c) => onChange({ available: c ? true : undefined })} />
      </Group>

      {subjects?.length ? (
        <Group title="Subjek">
          {subjects.map((s) => (
            <Check key={s.id} label={s.name} checked={params.subject.includes(s.name)} onChange={() => onChange({ subject: toggle(params.subject, s.name) })} />
          ))}
        </Group>
      ) : null}

      <Group title="Tahun terbit">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onChange({ yearFrom: Number(years.from) || undefined, yearTo: Number(years.to) || undefined });
          }}
        >
          <Input aria-label="Dari tahun" inputMode="numeric" placeholder="1990" className="data h-9 px-2" value={years.from} onChange={(e) => setYears({ ...years, from: e.target.value })} />
          <span aria-hidden>–</span>
          <Input aria-label="Sampai tahun" inputMode="numeric" placeholder="2026" className="data h-9 px-2" value={years.to} onChange={(e) => setYears({ ...years, to: e.target.value })} />
          <Button type="submit" size="sm" variant="secondary">
            Terapkan
          </Button>
        </form>
      </Group>

      <Group title="Bahasa">
        {LANGUAGES.map((l) => (
          <Check key={l.value} label={l.label} checked={params.language.includes(l.value)} onChange={() => onChange({ language: toggle(params.language, l.value) })} />
        ))}
      </Group>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 border-b border-outline-variant pb-5 last:border-0">
      <legend className="mb-2 text-body-sm font-semibold text-on-surface">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body-sm">
      <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
