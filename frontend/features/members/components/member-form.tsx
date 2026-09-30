"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useCreateMember, useUpdateMember } from "@/features/members/api/members.api";
import { memberSchema, type MemberFormInput, type MemberFormValues } from "@/features/members/schemas/member.schema";
import { applyServerErrors } from "@/lib/form";
import { MEMBER_STATUSES } from "@/shared/types/enums";
import type { Member, MemberWithPassword } from "@/shared/types/models";

export const TYPE_LABEL = { STUDENT: "Siswa / Mahasiswa", STAFF: "Guru / Staf" } as const;
export const STATUS_LABEL = { ACTIVE: "Aktif", SUSPENDED: "Ditangguhkan", EXPIRED: "Kedaluwarsa" } as const;

/** FE-2.4.3. `member` set = edit, otherwise create. Create hands back the one-time temporary password. */
export function MemberFormDialog({
  open,
  member,
  onClose,
  onCreated,
}: {
  open: boolean;
  member?: Member;
  onClose: () => void;
  onCreated?: (m: MemberWithPassword) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">{open ? <MemberForm member={member} onDone={onClose} onCreated={onCreated} /> : null}</DialogContent>
    </Dialog>
  );
}

function MemberForm({ member, onDone, onCreated }: { member?: Member; onDone: () => void; onCreated?: (m: MemberWithPassword) => void }) {
  const create = useCreateMember();
  const update = useUpdateMember(member?.id ?? "");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MemberFormInput, unknown, MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: member
      ? {
          name: member.name,
          email: member.email ?? "",
          idNumber: member.idNumber,
          type: member.type,
          classOrMajor: member.classOrMajor ?? "",
          phone: member.phone ?? "",
          validUntil: member.validUntil.slice(0, 10),
          status: member.status,
        }
      : { name: "", email: "", idNumber: "", classOrMajor: "", phone: "", validUntil: "", status: "ACTIVE", type: "STUDENT" },
  });

  const onError = (e: unknown) => applyServerErrors(e, setError);
  const submit = handleSubmit((v) => {
    if (member) update.mutate(v, { onSuccess: onDone, onError });
    else create.mutate(v, { onSuccess: (m) => { onDone(); onCreated?.(m); }, onError });
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <DialogTitle>{member ? "Ubah anggota" : "Tambah anggota"}</DialogTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="name" autoFocus aria-invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field label="Nomor induk (NIS/NIM/NIP)" htmlFor="idNumber" error={errors.idNumber?.message} required>
          <Input id="idNumber" className="data" aria-invalid={Boolean(errors.idNumber)} {...register("idNumber")} />
        </Field>
        <Field label="Tipe" htmlFor="type" error={errors.type?.message} required>
          <NativeSelect id="type" {...register("type")}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Kelas / prodi" htmlFor="classOrMajor" error={errors.classOrMajor?.message}>
          <Input id="classOrMajor" placeholder="XI IPA 1" {...register("classOrMajor")} />
        </Field>
        <Field label="Berlaku sampai" htmlFor="validUntil" error={errors.validUntil?.message} required>
          <Input id="validUntil" type="date" aria-invalid={Boolean(errors.validUntil)} {...register("validUntil")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message} hint="Untuk pengingat jatuh tempo">
          <Input id="email" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </Field>
        <Field label="Nomor HP" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" inputMode="tel" placeholder="08123456789" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
        </Field>
        {member ? (
          <Field label="Status" htmlFor="status">
            <NativeSelect id="status" {...register("status")}>
              {MEMBER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>
      {errors.root?.server ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {errors.root.server.message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={create.isPending || update.isPending}>
          {member ? "Simpan" : "Tambah anggota"}
        </Button>
      </div>
    </form>
  );
}
