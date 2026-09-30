"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useMasterData } from "@/features/catalog/api/books.api";
import type { AddItemsInput } from "@/features/catalog/schemas/book.schema";

type Key = keyof AddItemsInput;
type Errors = Partial<Record<Key, { message?: string }>>;

export const SOURCE_LABEL = { PURCHASE: "Pembelian", DONATION: "Hibah / Sumbangan" } as const;
export const CONDITION_LABEL = { GOOD: "Baik", FAIR: "Cukup", POOR: "Buruk" } as const;

/** Physical-copy fields shared by the new-book form and the "Tambah eksemplar" dialog. `p` binds a field to its form. */
export function CopiesFields({ p, errors, idPrefix = "" }: { p: (k: Key) => UseFormRegisterReturn; errors: Errors; idPrefix?: string }) {
  const { data: shelves } = useMasterData("shelf-locations");
  const id = (k: Key) => `${idPrefix}${k}`;

  return (
    <>
      <Field label="Jumlah eksemplar" htmlFor={id("count")} error={errors.count?.message}>
        <Input id={id("count")} type="number" min={1} max={100} aria-invalid={Boolean(errors.count)} {...p("count")} />
      </Field>
      <Field label="Lokasi rak" htmlFor={id("shelfLocationId")} error={errors.shelfLocationId?.message} required>
        <NativeSelect id={id("shelfLocationId")} aria-invalid={Boolean(errors.shelfLocationId)} {...p("shelfLocationId")}>
          <option value="">-- Pilih rak --</option>
          {shelves?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Sumber pengadaan" htmlFor={id("source")}>
        <NativeSelect id={id("source")} {...p("source")}>
          {Object.entries(SOURCE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Harga per eksemplar (Rp)" htmlFor={id("price")} error={errors.price?.message}>
        <Input id={id("price")} type="number" min={0} aria-invalid={Boolean(errors.price)} {...p("price")} />
      </Field>
      <Field label="Kondisi fisik" htmlFor={id("condition")}>
        <NativeSelect id={id("condition")} {...p("condition")}>
          {Object.entries(CONDITION_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </>
  );
}

export const COPIES_DEFAULTS = { count: 1, shelfLocationId: "", source: "PURCHASE", price: 0, condition: "GOOD" } as const;
