"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Skeleton } from "@/components/editorial/bits";
import { PageHeading, SectionHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCreateHoliday, useDeleteHoliday, useHolidays, usePolicies, useUpdatePolicy } from "@/features/admin/api/admin.api";
import { holidaySchema, loanPolicySchema, type HolidayValues } from "@/features/admin/schemas/admin.schema";
import { applyServerErrors } from "@/lib/form";
import { formatDate } from "@/lib/format";
import type { LoanPolicy } from "@/shared/types/models";
import { SettingsNav } from "./settings-nav";

const TYPE_LABEL = { STUDENT: "Siswa / Mahasiswa", STAFF: "Guru / Staf" } as const;
const FIELDS = [
  ["maxActiveLoans", "Maks pinjaman aktif", "buku"],
  ["loanDays", "Lama pinjam", "hari"],
  ["maxRenewals", "Maks perpanjangan", "kali"],
  ["finePerDay", "Denda per hari", "Rp"],
  ["maxFinePerLoan", "Denda maks per pinjaman", "Rp"],
  ["blockingFineThreshold", "Blokir pinjam bila denda ≥", "Rp"],
  ["holdPickupDays", "Batas ambil reservasi", "hari"],
  ["maxActiveHolds", "Maks reservasi aktif", "judul"],
] as const;

// FE-6.4.12 (FR-D1, FR-D3): loan policy per member type + holiday calendar. Editing is ADMIN-only on the backend.
export function PoliciesPage() {
  const { data: policies, isLoading } = usePolicies();
  return (
    <div className="flex flex-col gap-8">
      <PageHeading kicker="Pengaturan" title="Kebijakan" />
      <SettingsNav />
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-8 lg:grid-cols-2">
          {policies?.map((p) => <PolicyForm key={p.memberType} policy={p} />)}
        </div>
      )}
      <Holidays />
    </div>
  );
}

function PolicyForm({ policy }: { policy: LoanPolicy }) {
  const update = useUpdatePolicy();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof loanPolicySchema>, unknown, z.output<typeof loanPolicySchema>>({ resolver: zodResolver(loanPolicySchema), defaultValues: policy });
  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit((v) => update.mutate({ memberType: policy.memberType, ...v }, { onSuccess: () => reset(v), onError: (e) => applyServerErrors(e, setError) }))}>
      <SectionHeading kicker="Tipe anggota" title={TYPE_LABEL[policy.memberType]} />
      {FIELDS.map(([name, label, unit]) => (
        <Field key={name} label={label} htmlFor={`${policy.memberType}-${name}`} error={errors[name]?.message} aside={unit}>
          <Input id={`${policy.memberType}-${name}`} type="number" min={0} className="data" aria-invalid={Boolean(errors[name])} {...register(name)} />
        </Field>
      ))}
      {errors.root?.server ? <p role="alert" className="text-body-sm text-primary-container dark:text-primary">{errors.root.server.message}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={update.isPending} disabled={!isDirty}>Simpan</Button>
        {update.isSuccess && !isDirty ? <span role="status" className="data text-[12px] text-secondary">Tersimpan</span> : null}
      </div>
    </form>
  );
}

function Holidays() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: holidays } = useHolidays(year);
  const create = useCreateHoliday();
  const remove = useDeleteHoliday();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<HolidayValues>({ resolver: zodResolver(holidaySchema) });

  return (
    <section className="flex max-w-xl flex-col gap-3">
      <SectionHeading
        kicker="Kalender"
        title="Hari libur"
        actions={<Input type="number" aria-label="Tahun" className="data h-9 w-24" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />}
      />
      <p className="text-body-sm text-on-surface-variant">Jatuh tempo yang bertepatan dengan hari libur digeser ke hari buka berikutnya dan tidak dihitung sebagai denda.</p>
      <ul>
        {holidays?.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 border-b border-outline-variant py-2">
            <span><span className="data mr-3 text-[13px]">{formatDate(h.date)}</span>{h.name}</span>
            <Button size="sm" variant="secondary" onClick={() => window.confirm(`Hapus ${h.name}?`) && remove.mutate(h.id)}>Hapus</Button>
          </li>
        ))}
        {holidays && !holidays.length ? <li className="py-2 text-body-sm text-on-surface-variant">Belum ada hari libur tahun {year}.</li> : null}
      </ul>
      <form className="flex flex-wrap items-start gap-2" onSubmit={handleSubmit((v) => create.mutate(v, { onSuccess: () => reset(), onError: (e) => applyServerErrors(e, setError) }))}>
        <Field label="Tanggal" htmlFor="holiday-date" error={errors.date?.message}>
          <Input id="holiday-date" type="date" {...register("date")} />
        </Field>
        <Field label="Nama" htmlFor="holiday-name" error={errors.name?.message} className="min-w-48 flex-1">
          <Input id="holiday-name" {...register("name")} />
        </Field>
        <Button type="submit" className="mt-6" loading={create.isPending}>Tambah</Button>
      </form>
    </section>
  );
}
