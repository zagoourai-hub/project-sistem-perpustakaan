"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/editorial/bits";
import { CallNumber } from "@/components/editorial/call-number";
import { StatusBadge } from "@/components/editorial/status-badge";
import { useMemberLoans } from "@/features/members/api/members.api";
import { daysUntil, formatDate, formatRupiah } from "@/lib/format";
import type { MemberSummary } from "@/shared/types/models";
import { memberBlockers } from "../lib/precheck";

const TYPE_LABEL = { STUDENT: "Siswa", STAFF: "Guru/Staf" } as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Left column of 05-sirkulasi-pinjam: who is borrowing and whether they can. */
export function MemberPanel({ member }: { member: MemberSummary }) {
  const { data: loans, isLoading } = useMemberLoans(member.id);
  const blockers = memberBlockers(member);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-4 border-b border-outline-variant pb-5">
        <div className="flex size-16 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface-container-high text-xl font-bold text-on-surface">
          {initials(member.name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="truncate text-xl leading-tight font-bold text-on-surface">{member.name}</h2>
            <StatusBadge status={member.status} />
          </div>
          <span className="mt-0.5 text-xs text-on-surface-variant">
            {member.classOrMajor} · {TYPE_LABEL[member.type]}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CallNumber value={member.memberCode} className="bg-surface-container-high text-xs" />
            <span className="data text-[11px] text-on-surface-variant">Berlaku s/d {formatDate(member.validUntil)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-outline-variant">
        <div className="flex flex-col border-r border-outline-variant py-4 pr-3">
          <span className="data text-[26px] leading-none font-medium text-on-surface">
            {member.activeLoans}
            <span className="text-[18px] text-outline">/{member.maxActiveLoans}</span>
          </span>
          <span className="mt-1.5 text-[11px] tracking-wider text-on-surface-variant uppercase">Pinjaman aktif</span>
        </div>
        <div className="flex flex-col border-r border-outline-variant px-3 py-4">
          <span className="data text-[26px] leading-none font-medium text-on-surface">{member.readyHolds}</span>
          <span className="mt-1.5 text-[11px] tracking-wider text-on-surface-variant uppercase">Reservasi siap</span>
        </div>
        <div className="flex flex-col py-4 pl-3">
          <span className={`data text-[26px] leading-none font-medium ${member.unpaidFines ? "text-primary-container dark:text-primary" : "text-on-surface"}`}>
            {formatRupiah(member.unpaidFines)}
          </span>
          <span className="mt-1.5 text-[11px] tracking-wider text-on-surface-variant uppercase">Denda</span>
        </div>
      </div>

      {blockers.length ? (
        <div role="alert" className="mt-4 rounded-xs border-l-[3px] border-primary-container bg-primary-fixed/40 p-3 text-[13px] text-on-surface">
          Tidak bisa meminjam: {blockers.join(" · ")}.
        </div>
      ) : member.unpaidFines > 0 ? (
        <div className="mt-4 rounded-xs border-l-[3px] border-on-tertiary-container bg-surface-container-lowest p-3 text-[13px] text-on-surface">
          Denda <span className="data font-semibold text-primary-container dark:text-primary">{formatRupiah(member.unpaidFines)}</span> belum
          lunas — masih di bawah batas blokir {formatRupiah(member.blockingFineThreshold)}.
        </div>
      ) : null}

      <div className="mt-6 flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <span className="data text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">
            Sedang dipinjam {loans ? `(${loans.length})` : ""}
          </span>
          <span className="data text-[11px] text-outline">Maks {member.maxActiveLoans} buku</span>
        </div>
        {isLoading ? (
          <Skeleton className="mt-3 h-24" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {loans?.map((loan) => {
              const late = -daysUntil(loan.dueAt);
              return (
                <li key={loan.id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm leading-snug font-semibold text-on-surface">{loan.item.book.title}</span>
                    <CallNumber value={loan.item.book.callNumber} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-on-surface-variant">{loan.item.book.authors.map((a) => a.name).join(", ")}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`data text-[11px] ${late > 0 ? "text-primary-container dark:text-primary" : "text-on-surface"}`}>
                        Jatuh tempo {formatDate(loan.dueAt)}
                      </span>
                      {late > 0 ? <StatusBadge status="OVERDUE" label={`Terlambat ${late} hari`} className="h-5 px-1.5 text-[10px]" /> : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href={`/staf/anggota/${member.id}`}
          className="mt-auto flex h-10 items-center justify-center gap-2 rounded border border-outline-variant text-xs font-semibold tracking-wide text-on-surface hover:bg-surface-container-high"
        >
          Lihat profil lengkap <ArrowRight className="size-3.5 stroke-[1.5]" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
