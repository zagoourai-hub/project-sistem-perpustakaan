"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Skeleton } from "@/components/editorial/bits";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSettings, useUpdateSettings, useUploadLogo } from "@/features/admin/api/admin.api";
import { settingsSchema, type SettingsValues } from "@/features/admin/schemas/admin.schema";
import { applyServerErrors } from "@/lib/form";
import { SettingsNav } from "./settings-nav";

// FE-10.3.1 (FR-A6): library profile shown on the OPAC header/footer, plus the logo (JPG/PNG/WebP, max 1 MB).
export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const logo = useUploadLogo();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof settingsSchema>, unknown, SettingsValues>({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    if (data) reset({ institutionName: data.institutionName, address: data.address ?? "", openingHours: data.openingHours ?? "", senderEmail: data.senderEmail ?? "", timezone: data.timezone });
  }, [data, reset]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading kicker="Pengaturan" title="Profil perpustakaan" />
      <SettingsNav />
      {isLoading ? (
        <Skeleton className="h-72 w-full max-w-xl" />
      ) : (
        <form className="flex max-w-xl flex-col gap-4" onSubmit={handleSubmit((v) => update.mutate(v, { onError: (e) => applyServerErrors(e, setError) }))}>
          <Field label="Nama institusi" htmlFor="institutionName" error={errors.institutionName?.message} required>
            <Input id="institutionName" aria-invalid={Boolean(errors.institutionName)} {...register("institutionName")} />
          </Field>
          <Field label="Alamat" htmlFor="address" error={errors.address?.message}>
            <Input id="address" {...register("address")} />
          </Field>
          <Field label="Jam buka" htmlFor="openingHours" error={errors.openingHours?.message}>
            <Input id="openingHours" placeholder="Senin–Jumat 07.00–15.00" {...register("openingHours")} />
          </Field>
          <Field label="Email pengirim" htmlFor="senderEmail" error={errors.senderEmail?.message} hint="Alamat pengirim untuk pengingat jatuh tempo">
            <Input id="senderEmail" type="email" {...register("senderEmail")} />
          </Field>
          {errors.root?.server ? (
            <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
              {errors.root.server.message}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={update.isPending} disabled={!isDirty}>
              Simpan
            </Button>
            {update.isSuccess && !isDirty ? <span role="status" className="data text-[12px] text-secondary">Tersimpan</span> : null}
          </div>
        </form>
      )}

      <section className="flex max-w-xl flex-col gap-2 border-t border-outline-variant pt-6">
        <h2 className="text-book-title">Logo</h2>
        {data?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage host not fixed yet (FE-0.2.2)
          <img src={data.logoUrl} alt="Logo perpustakaan" className="h-16 w-auto self-start" />
        ) : (
          <p className="text-body-sm text-on-surface-variant">Belum ada logo.</p>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Unggah logo" className="text-body-sm" onChange={(e) => e.target.files?.[0] && logo.mutate(e.target.files[0])} />
        {logo.isPending ? <span className="data text-[12px]">Mengunggah…</span> : null}
        {logo.error ? (
          <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
            Logo harus JPG/PNG/WebP, maksimal 1 MB.
          </p>
        ) : null}
      </section>
    </div>
  );
}
