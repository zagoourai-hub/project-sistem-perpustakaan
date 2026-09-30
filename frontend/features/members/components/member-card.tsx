"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { StatusBadge } from "@/components/editorial/status-badge";
import { apiGet } from "@/lib/api-client";
import { renderQr } from "@/lib/barcode/render-qr";
import { endpoints } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import type { MemberStatus, MemberType } from "@/shared/types/enums";
import type { LibrarySettings } from "@/shared/types/models";

const TYPE_LABEL: Record<MemberType, string> = { STUDENT: "Siswa", STAFF: "Guru / Staf" };

export interface MemberCardData {
  name: string;
  classOrMajor: string | null;
  type: MemberType;
  memberCode: string;
  validUntil: string;
  status: MemberStatus;
}

function useInstitutionName() {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: () => apiGet<Pick<LibrarySettings, "institutionName">>(endpoints.admin.publicSettings, undefined, { skipAuthRefresh: true }),
    staleTime: 30 * 60 * 1000,
  });
  return data?.institutionName ?? "";
}

/** Member card (08-kartu-digital). The QR carries the member code, which the desk scanner reads like a typed code. */
export function MemberCard({ member }: { member: MemberCardData }) {
  const institution = useInstitutionName();
  // Generated locally from our own member code; bwip-js output is path data only.
  const qr = useMemo(() => renderQr(member.memberCode), [member.memberCode]);

  return (
    <article className="print-area flex w-full max-w-sm flex-col gap-5 rounded border border-outline-variant bg-surface-container-lowest p-6 text-on-surface">
      <header className="flex items-baseline justify-between border-b-2 border-on-surface pb-3">
        <span className="font-display text-h2 text-primary uppercase">Pustaka</span>
        <span className="data text-[12px] text-on-surface-variant">{institution}</span>
      </header>
      <div>
        <p className="text-h3 font-semibold">{member.name}</p>
        <p className="text-body-sm text-on-surface-variant">{[member.classOrMajor, TYPE_LABEL[member.type]].filter(Boolean).join(" · ")}</p>
      </div>
      <div
        role="img"
        aria-label={`Kode QR anggota ${member.memberCode}`}
        className="mx-auto w-full max-w-56 rounded-xs bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qr }}
      />
      <p className="data text-center text-xl tracking-[0.2em]">{member.memberCode}</p>
      <footer className="flex items-center justify-between border-t border-outline-variant pt-3">
        <span className="data text-[12px] text-on-surface-variant">Berlaku s/d {formatDate(member.validUntil)}</span>
        <StatusBadge status={member.status} />
      </footer>
    </article>
  );
}
