"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/editorial/bits";
import { buttonVariants, Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/api/auth.api";
import { meKeys, useMyCard, useUpdateMySettings } from "@/features/me/api/me.api";
import { LOGIN_PATH } from "@/shared/constants";

// FE-8.4.7 (FR-J4): email reminder toggle, password change, sign out.
export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: card } = useMyCard();
  const update = useUpdateMySettings();
  const logout = useLogout();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="kicker text-on-surface-variant">Akun</p>
        <h1 className="font-display text-h1 uppercase">Pengaturan</h1>
      </div>

      <section className="flex flex-col gap-2 border-b border-outline-variant pb-6">
        <h2 className="text-book-title">Pengingat email</h2>
        {card ? (
          <label className="flex max-w-md items-start gap-3 text-body-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={card.emailReminders}
              disabled={update.isPending}
              onChange={(e) =>
                update.mutate(
                  { emailReminders: e.target.checked },
                  { onSuccess: (m) => qc.setQueryData(meKeys.card, (old: typeof card) => ({ ...old, emailReminders: m.emailReminders })) },
                )
              }
            />
            <span>
              Kirim email 2 hari sebelum jatuh tempo dan saat reservasi siap diambil.
              {card.email ? null : <span className="mt-1 block text-on-surface-variant">Belum ada email tercatat. Minta petugas menambahkannya.</span>}
            </span>
          </label>
        ) : (
          <Skeleton className="h-6 w-64" />
        )}
        {update.error ? (
          <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
            Pengaturan gagal disimpan.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 border-b border-outline-variant pb-6">
        <h2 className="text-book-title">Kata sandi</h2>
        <Link href="/ganti-password?next=/akun/pengaturan" className={buttonVariants({ variant: "secondary", className: "self-start" })}>
          Ganti kata sandi
        </Link>
      </section>

      <Button
        variant="secondary"
        className="self-start"
        loading={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSettled: () => router.replace(LOGIN_PATH) })}
      >
        Keluar
      </Button>
    </div>
  );
}
