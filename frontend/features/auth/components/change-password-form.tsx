"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { safeNextPath } from "@/lib/auth/route-access";
import { applyServerErrors } from "@/lib/form";
import { useChangePassword, useMe } from "../api/auth.api";
import { changePasswordSchema, type ChangePasswordInput } from "../schemas/auth.schema";

const FIELDS = [
  { name: "currentPassword", label: "Kata sandi lama", autoComplete: "current-password" },
  { name: "newPassword", label: "Kata sandi baru", autoComplete: "new-password", hint: "Minimal 8 karakter, berisi huruf dan angka." },
  { name: "confirmPassword", label: "Ulangi kata sandi baru", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm({ next }: { next?: string }) {
  const router = useRouter();
  const { data: user } = useMe();
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) =>
    change.mutate(values, {
      onSuccess: () => router.replace(user ? safeNextPath(next, user.role) : "/"),
      onError: (error) => applyServerErrors(error, setError),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {errors.root?.server ? (
        <p role="alert" className="rounded-xs border border-outline-variant border-l-2 border-l-primary-container bg-surface-container-lowest px-4 py-3 text-body-sm">
          {errors.root.server.message}
        </p>
      ) : null}
      {FIELDS.map((f) => (
        <Field key={f.name} label={f.label} htmlFor={f.name} error={errors[f.name]?.message} hint={"hint" in f ? f.hint : undefined}>
          <Input id={f.name} type="password" autoComplete={f.autoComplete} aria-invalid={Boolean(errors[f.name])} {...register(f.name)} />
        </Field>
      ))}
      <Button type="submit" size="lg" loading={change.isPending} className="mt-2 w-full">
        Simpan kata sandi
      </Button>
    </form>
  );
}
