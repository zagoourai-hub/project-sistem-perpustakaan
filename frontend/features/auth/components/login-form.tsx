"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { safeNextPath } from "@/lib/auth/route-access";
import { applyServerErrors } from "@/lib/form";
import { CHANGE_PASSWORD_PATH } from "@/shared/constants";
import { useLogin } from "../api/auth.api";
import { loginSchema, type LoginInput } from "../schemas/auth.schema";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: (user) => {
        const target = safeNextPath(next, user.role);
        // FR-A4: imported accounts must change their password first.
        router.replace(user.mustChangePassword ? `${CHANGE_PASSWORD_PATH}?next=${encodeURIComponent(target)}` : target);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          setError("root.server", { message: "Email/nomor induk atau kata sandi salah." });
        } else if (error instanceof ApiError && error.status === 429) {
          // FR-A6: 5 attempts / 15 minutes per account + IP.
          setError("root.server", { message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
        } else {
          applyServerErrors(error, setError);
        }
      },
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {errors.root?.server ? (
        <p role="alert" className="rounded-xs border border-outline-variant border-l-2 border-l-primary-container bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface">
          {errors.root.server.message}
        </p>
      ) : null}

      <Field label="Email atau nomor induk" htmlFor="identifier" error={errors.identifier?.message}>
        <Input
          id="identifier"
          autoComplete="username"
          autoFocus
          aria-invalid={Boolean(errors.identifier)}
          {...register("identifier")}
        />
      </Field>

      <Field label="Kata sandi" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Button type="submit" size="lg" loading={login.isPending} className="mt-2 w-full">
        Masuk
      </Button>
      <p className="text-body-sm text-on-surface-variant">
        Lupa kata sandi? Hubungi petugas perpustakaan untuk mengatur ulang.
      </p>
    </form>
  );
}
