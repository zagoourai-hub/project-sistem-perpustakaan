"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCreateHold } from "@/features/holds/api/holds.api";
import { authKeys } from "@/features/auth/api/auth.api";
import { useMyHolds } from "@/features/me/api/me.api";
import { ApiError, apiGet } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { LOGIN_PATH } from "@/shared/constants";
import type { SessionUser } from "@/shared/types/models";

// FR-G1: a title can be reserved only when no copy is AVAILABLE. Renders nothing while a copy is on the shelf.
// ponytail: guest detection = /auth/me without refresh; an expired access token looks like a guest until the next refresh.
export function ReserveButton({ bookId, available, size = "default" }: { bookId: string; available: number; size?: "default" | "sm" }) {
  const me = useQuery({
    queryKey: authKeys.me,
    queryFn: () => apiGet<SessionUser>(endpoints.auth.me, undefined, { skipAuthRefresh: true }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  if (available > 0 || me.isLoading) return null;
  if (!me.data) {
    return (
      <Link href={`${LOGIN_PATH}?next=${encodeURIComponent(`/buku/${bookId}`)}`} className={buttonVariants({ variant: "sunken", size })}>
        Masuk untuk reservasi
      </Link>
    );
  }
  if (me.data.role !== "MEMBER") return null; // staff reserve on behalf of members from /staf/reservasi
  return <MemberReserve bookId={bookId} size={size} />;
}

function MemberReserve({ bookId, size }: { bookId: string; size: "default" | "sm" }) {
  const { data: holds } = useMyHolds();
  const create = useCreateHold();
  const existing = holds?.find((h) => h.book.id === bookId && (h.status === "WAITING" || h.status === "READY"));

  if (existing) {
    return (
      <span className="data text-[13px] text-on-surface-variant">
        {existing.status === "READY" ? "Siap diambil di meja sirkulasi" : `Reservasi Anda · antrean ke-${existing.queuePosition}`}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="sunken" size={size} loading={create.isPending} onClick={() => create.mutate(bookId)}>
        Reservasi
      </Button>
      {create.error ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {create.error instanceof ApiError ? create.error.message : "Reservasi gagal. Coba lagi."}
        </p>
      ) : null}
    </div>
  );
}
