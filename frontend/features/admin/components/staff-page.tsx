"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { TableSkeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useResetStaffPassword, useSaveStaff, useStaff } from "@/features/admin/api/admin.api";
import { staffSchema, type StaffValues } from "@/features/admin/schemas/admin.schema";
import { useMe } from "@/features/auth/api/auth.api";
import { CredentialsDialog, type Credentials } from "@/features/members/components/credentials-dialog";
import { formatDateTime } from "@/lib/format";
import { applyServerErrors } from "@/lib/form";
import type { StaffUser } from "@/shared/types/models";

const ROLE_LABEL = { ADMIN: "Admin", LIBRARIAN: "Pustakawan" } as const;

// FE-2.4.7 (FR-A4/A5): ADMIN only. The backend enforces it too and refuses to demote or deactivate the last admin.
export function StaffPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === "ADMIN";
  const { data: staff, isLoading, error, refetch } = useStaff();
  const save = useSaveStaff();
  const reset = useResetStaffPassword();
  const [form, setForm] = useState<{ staff?: StaffUser } | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  if (me && !isAdmin) return <EmptyState title="Khusus admin" description="Kelola staf hanya bisa dilakukan oleh admin." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        kicker="Pengaturan"
        title="Pengguna"
        actions={
          <Button onClick={() => setForm({})}>
            <Plus aria-hidden /> Tambah Staf
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : error ? (
        <EmptyState title="Daftar staf gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Terakhir masuk</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">
                  {s.name}
                  {s.id === me?.id ? <span className="data ml-2 text-[11px] font-normal text-on-surface-variant">(Anda)</span> : null}
                </TableCell>
                <TableCell className="data">{s.email}</TableCell>
                <TableCell>{ROLE_LABEL[s.role]}</TableCell>
                <TableCell>
                  <Badge variant={s.isActive ? "success" : "muted"}>{s.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell className="data">{s.lastLoginAt ? formatDateTime(s.lastLoginAt) : "Belum pernah"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setForm({ staff: s })}>
                      Ubah
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={reset.isPending}
                      onClick={() =>
                        window.confirm(`Reset kata sandi ${s.name}? Sesi dan kata sandi lamanya tidak berlaku lagi.`) &&
                        reset.mutate(s.id, { onSuccess: (r) => setCredentials({ name: s.name, login: s.email, temporaryPassword: r.temporaryPassword }) })
                      }
                    >
                      Reset sandi
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form ? (
            <StaffForm
              staff={form.staff}
              isSelf={form.staff?.id === me?.id}
              pending={save.isPending}
              onCancel={() => setForm(null)}
              onSubmit={(values, isActive, setError) =>
                save.mutate(
                  { id: form.staff?.id, ...values, ...(form.staff ? { isActive } : {}) },
                  {
                    onSuccess: (result) => {
                      setForm(null);
                      const temporaryPassword = (result as { temporaryPassword?: string }).temporaryPassword;
                      if (temporaryPassword) setCredentials({ name: result.name, login: result.email, temporaryPassword });
                    },
                    onError: (e) => applyServerErrors(e, setError),
                  },
                )
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

function StaffForm({
  staff,
  isSelf,
  pending,
  onCancel,
  onSubmit,
}: {
  staff?: StaffUser;
  isSelf: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: StaffValues, isActive: boolean, setError: UseFormSetError<StaffValues>) => void;
}) {
  const [isActive, setActive] = useState(staff?.isActive ?? true);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: staff?.name ?? "", email: staff?.email ?? "", role: staff?.role ?? "LIBRARIAN" },
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit((v) => onSubmit(v, isActive, setError))}>
      <DialogTitle>{staff ? "Ubah staf" : "Tambah staf"}</DialogTitle>
      <Field label="Nama lengkap" htmlFor="staff-name" error={errors.name?.message} required>
        <Input id="staff-name" autoFocus aria-invalid={Boolean(errors.name)} {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="staff-email" error={errors.email?.message} required hint="Dipakai untuk masuk">
        <Input id="staff-email" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
      </Field>
      <Field label="Peran" htmlFor="staff-role" error={errors.role?.message} required>
        <NativeSelect id="staff-role" disabled={isSelf} {...register("role")}>
          {Object.entries(ROLE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {staff ? (
        <label className="flex items-center gap-2 text-body-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={isActive} disabled={isSelf} onChange={(e) => setActive(e.target.checked)} />
          Akun aktif
        </label>
      ) : (
        <p className="text-body-sm text-on-surface-variant">Kata sandi sementara dibuat otomatis dan ditampilkan sekali setelah disimpan.</p>
      )}
      {errors.root?.server ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {errors.root.server.message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" loading={pending}>
          {staff ? "Simpan" : "Tambah staf"}
        </Button>
      </div>
    </form>
  );
}
