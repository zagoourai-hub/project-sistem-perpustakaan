"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { useMasterData } from "@/features/catalog/api/books.api";
import type { MasterDataKind } from "@/lib/endpoints";

type Tag = { id?: string; name: string };

/** Chip input with inline create (FE-4.3.5): pick a suggestion or type a new name, Enter / comma adds it. */
export function TagInput({
  id,
  kind,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string;
  kind: Extract<MasterDataKind, "authors" | "subjects">;
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  placeholder: string;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const { data: options } = useMasterData(kind);

  const add = () => {
    const name = draft.trim();
    setDraft("");
    if (!name || value.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, options?.find((o) => o.name.toLowerCase() === name.toLowerCase()) ?? { name }]);
  };

  return (
    <div
      className="flex min-h-10 flex-wrap items-center gap-2 rounded border border-outline bg-surface-container-lowest p-2 aria-invalid:border-primary-container"
      aria-invalid={invalid || undefined}
    >
      {value.map((t) => (
        <span key={t.name} className="data inline-flex items-center gap-1 rounded-xs bg-surface-container-high px-2 py-1 text-[12px]">
          {t.name}
          <button type="button" aria-label={`Hapus ${t.name}`} onClick={() => onChange(value.filter((x) => x !== t))}>
            <X className="size-3 stroke-[1.5]" />
          </button>
        </span>
      ))}
      <Plus className="size-3.5 stroke-[1.5] text-on-surface-variant" aria-hidden />
      <input
        id={id}
        list={listId}
        value={draft}
        placeholder={placeholder}
        className="min-w-32 flex-1 bg-transparent text-body-sm outline-none"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
      />
      <datalist id={listId}>
        {options?.map((o) => (
          <option key={o.id} value={o.name} />
        ))}
      </datalist>
    </div>
  );
}
