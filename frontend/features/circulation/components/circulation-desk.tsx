"use client";

import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Kbd } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { useMemberLookup } from "@/features/members/api/members.api";
import { bookKeys, booksApi } from "@/features/catalog/api/books.api";
import { ScanInput } from "@/features/scanner/components/scan-input";
import { ApiError } from "@/lib/api-client";
import { scanFeedback } from "@/lib/scanner/feedback";
import type { ScanCodeType } from "@/shared/props/components";
import { useCirculationStore } from "@/stores/circulation.store";
import { useCheckin, useCheckout } from "../api/circulation.api";
import { precheckItem } from "../lib/precheck";
import { CheckinPanel } from "./checkin-panel";
import { MemberPanel } from "./member-panel";
import { ScanQueue } from "./scan-queue";

export type DeskMode = "pinjam" | "kembali";

type Notice = { tone: "info" | "error"; text: string } | null;

/** 05/06 circulation desk. Mode lives in the URL (?mode=) so F2/F3 work from anywhere. */
export function CirculationDesk({ mode }: { mode: DeskMode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const store = useCirculationStore();
  const member = useMemberLookup(store.memberCode);
  const checkout = useCheckout();
  const checkin = useCheckin();
  const [notice, setNotice] = useState<Notice>(null);

  function fail(text: string) {
    setNotice({ tone: "error", text });
    scanFeedback("error");
  }

  async function lookupItem(barcode: string) {
    return qc.fetchQuery({ queryKey: bookKeys.itemLookup(barcode), queryFn: () => booksApi.itemLookup(barcode), staleTime: 0 });
  }

  async function onScanPinjam(code: string, type: ScanCodeType) {
    if (type === "MEMBER") {
      store.setMember(code);
      setNotice(null);
      scanFeedback("ok");
      return;
    }
    if (type === "ISBN") return fail("Itu ISBN buku. Scan barcode eksemplar (PST-…) di label punggung.");
    if (!store.memberCode) return fail("Scan kartu anggota dulu sebelum scan buku.");
    if (!member.data) return fail(member.isError ? "Data anggota tidak ditemukan. Scan ulang kartu." : "Tunggu data anggota selesai dimuat.");

    store.upsertRow({ barcode: code, state: "checking" });
    try {
      const item = await lookupItem(code);
      const queued = useCirculationStore
        .getState()
        .queue.filter((r) => r.state === "ok" && r.barcode !== code)
        .map((r) => r.barcode);
      const verdict = precheckItem(member.data, item, queued);
      if (verdict.ok) {
        store.upsertRow({ barcode: code, state: "ok", item, dueAt: verdict.dueAt });
        setNotice(null);
        scanFeedback("ok");
      } else {
        store.upsertRow({ barcode: code, state: "rejected", item, reasons: verdict.reasons });
        fail(`Ditolak: ${verdict.reasons.join(" · ")}`);
      }
    } catch (e) {
      const notFound = e instanceof ApiError && e.status === 404;
      store.upsertRow({ barcode: code, state: "rejected", reasons: [notFound ? "Barcode tidak terdaftar" : "Gagal memeriksa eksemplar"] });
      fail(notFound ? `Barcode ${code} tidak terdaftar.` : e instanceof Error ? e.message : "Gagal memeriksa eksemplar.");
    }
  }

  function onScanKembali(code: string, type: ScanCodeType) {
    if (type === "MEMBER") return fail("Pengembalian tidak perlu scan kartu anggota. Scan barcode buku.");
    if (type === "ISBN") return fail("Itu ISBN buku. Scan barcode eksemplar (PST-…) di label punggung.");
    const id = `${code}-${Date.now()}`;
    store.upsertReturn({ id, barcode: code, state: "checking" });
    checkin.mutate(
      { barcode: code },
      {
        onSuccess: (result) => {
          store.upsertReturn({ id, barcode: code, state: "done", result });
          setNotice(null);
          scanFeedback("ok");
        },
        onError: (e) => {
          store.upsertReturn({ id, barcode: code, state: "error", message: e.message });
          fail(e.message);
        },
      },
    );
  }

  function confirmCheckout() {
    const barcodes = store.queue.filter((r) => r.state === "ok").map((r) => r.barcode);
    if (!store.memberCode || !barcodes.length || checkout.isPending) return;
    checkout.mutate(
      { memberCode: store.memberCode, barcodes },
      {
        onSuccess: (result) => {
          store.finishCheckout(result);
          if (result.rejected.length) fail(`${result.rejected.length} eksemplar ditolak server.`);
          else scanFeedback("ok");
        },
        onError: (e) => fail(e.message),
      },
    );
  }

  function cancel() {
    store.reset();
    setNotice(null);
  }

  const setMode = (next: DeskMode) => router.replace(`/staf/sirkulasi?mode=${next}`, { scroll: false });

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-on-surface pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="kicker text-on-surface-variant">Meja layanan</span>
          <h1 className="font-display text-h1 text-on-surface uppercase md:text-[3rem]">Sirkulasi</h1>
        </div>
        <div role="tablist" aria-label="Mode sirkulasi" className="flex gap-1 rounded-xs border border-outline-variant bg-surface-container-high p-1">
          {(
            [
              ["pinjam", "Pinjam", "F2"],
              ["kembali", "Kembali", "F3"],
            ] as const
          ).map(([value, label, key]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "flex items-center gap-2 rounded-xs px-4 py-2 text-xs font-medium tracking-wide transition-colors",
                mode === value ? "bg-on-surface text-surface" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {label} <Kbd keys={[key]} />
            </button>
          ))}
        </div>
      </div>

      <ScanInput
        key={mode}
        className="my-6"
        placeholder={mode === "pinjam" ? "Scan kartu anggota atau barcode buku…" : "Scan barcode buku yang dikembalikan…"}
        hasError={notice?.tone === "error"}
        onScan={(code, type) => void (mode === "pinjam" ? onScanPinjam(code, type) : onScanKembali(code, type))}
        onSubmitEmpty={mode === "pinjam" ? confirmCheckout : undefined}
        onEscape={mode === "pinjam" ? cancel : undefined}
        statusLine={
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p
              role="status"
              className={cn(
                "data flex items-center gap-2 text-xs",
                notice?.tone === "error" ? "font-semibold text-primary-container dark:text-primary" : "text-on-surface-variant",
              )}
            >
              <span className={cn("inline-block size-2 rounded-full", notice?.tone === "error" ? "bg-primary-container" : "bg-secondary")} aria-hidden />
              {notice?.text ??
                (mode === "pinjam"
                  ? "Scanner siap · Enter kosong untuk konfirmasi · Esc untuk batal"
                  : "Scanner siap · Tekan Enter untuk konfirmasi · Tidak perlu scan kartu anggota")}
            </p>
            <span className="data text-[11px] text-outline">
              Mode: <span className="font-medium text-on-surface">auto-deteksi kartu / barcode</span>
            </span>
          </div>
        }
      />

      {mode === "pinjam" ? (
        <div className="grid grid-cols-1 gap-8 border-t border-outline-variant pt-6 lg:grid-cols-12 lg:gap-0">
          <div className="lg:col-span-5 lg:border-r lg:border-outline-variant lg:pr-8">
            {member.data ? (
              <MemberPanel member={member.data} />
            ) : (
              <EmptyState
                kicker="Anggota"
                title={member.isFetching ? "Memuat anggota…" : member.isError ? "Kartu tidak dikenal." : "Scan kartu anggota."}
                description="QR di kartu fisik atau kartu digital di portal anggota."
                className="border-dashed bg-transparent"
              />
            )}
          </div>
          <div className="lg:col-span-7 lg:pl-8">
            <ScanQueue
              rows={store.queue}
              loanDays={member.data?.loanDays ?? null}
              lastCheckout={store.lastCheckout}
              memberName={member.data?.name}
              memberCode={store.memberCode}
              isSubmitting={checkout.isPending}
              onRemove={store.removeRow}
              onConfirm={confirmCheckout}
              onCancel={cancel}
            />
          </div>
        </div>
      ) : (
        <div className="border-t border-outline-variant pt-6 lg:max-w-[780px]">
          <CheckinPanel rows={store.returns} />
        </div>
      )}

      <footer className="data mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-outline-variant pt-4 text-[13px] text-on-surface-variant">
        <span className="font-semibold text-on-surface">Pintasan meja:</span>
        <span className="flex items-center gap-2">
          <Kbd keys={["F2"]} /> Mode pinjam
        </span>
        <span className="flex items-center gap-2">
          <Kbd keys={["F3"]} /> Mode kembali
        </span>
        <span className="flex items-center gap-2">
          <Kbd keys={["/"]} /> Cari anggota
        </span>
      </footer>
    </div>
  );
}
