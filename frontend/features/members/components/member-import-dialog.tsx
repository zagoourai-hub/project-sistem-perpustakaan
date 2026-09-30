"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useImportMembers } from "@/features/members/api/members.api";
import { memberImportSchema } from "@/features/members/schemas/member.schema";
import type { MemberImportResult } from "@/shared/types/models";

// FE-2.4.5. Flow: choose CSV → "Periksa" (dry run, nothing saved) → "Impor" creates the valid rows.
// Accounts come back with temporary passwords, downloaded once as CSV for handing out cards.
export function MemberImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">{open ? <ImportBody onClose={onClose} /> : null}</DialogContent>
    </Dialog>
  );
}

function ImportBody({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: MemberImportResult; dryRun: boolean } | null>(null);
  const run = useImportMembers();

  const pick = (f: File | undefined) => {
    setResult(null);
    if (!f) return setFile(null);
    const ok = memberImportSchema.safeParse({ file: f });
    setFileError(ok.success ? null : (ok.error.issues[0]?.message ?? "Berkas tidak valid"));
    setFile(ok.success ? f : null);
  };

  const submit = (dryRun: boolean) =>
    file &&
    run.mutate({ file, dryRun }, { onSuccess: (data) => setResult({ data, dryRun }) });

  return (
    <>
      <div className="flex flex-col gap-1">
        <DialogTitle>Impor anggota (CSV)</DialogTitle>
        <DialogDescription>
          Kolom: <span className="data">name, idNumber, type, classOrMajor, email, phone, validUntil</span>. Tipe boleh SISWA, MAHASISWA, GURU, atau DOSEN. Contoh:{" "}
          <span className="data">Budi Santoso,12345,SISWA,XI IPA 1,,,2027-06-30</span>
        </DialogDescription>
      </div>

      <input type="file" accept=".csv,text/csv" aria-label="Berkas CSV" onChange={(e) => pick(e.target.files?.[0])} className="text-body-sm" />
      {fileError ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {fileError}
        </p>
      ) : null}
      {run.error ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          Impor gagal. Periksa berkas lalu coba lagi.
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-body-md">
            {result.dryRun ? (
              <>
                Pemeriksaan: <strong>{result.data.valid}</strong> dari {result.data.total} baris valid, <strong>{result.data.failed.length}</strong> bermasalah. Belum ada yang disimpan.
              </>
            ) : (
              <>
                <strong>{result.data.created}</strong> anggota dibuat, {result.data.failed.length} gagal.
              </>
            )}
          </p>
          {result.data.failed.length ? (
            <ul className="data max-h-48 overflow-y-auto rounded-xs bg-surface-container-high p-3 text-[12px]">
              {result.data.failed.map((f) => (
                <li key={f.row}>
                  Baris {f.row}
                  {f.idNumber ? ` (${f.idNumber})` : ""}: {f.errors.join("; ")}
                </li>
              ))}
            </ul>
          ) : null}
          {!result.dryRun && result.data.accounts.length ? (
            <Button variant="secondary" className="self-start" onClick={() => downloadAccounts(result.data.accounts)}>
              Unduh daftar kata sandi (CSV)
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {result && !result.dryRun ? "Selesai" : "Batal"}
        </Button>
        {!result || result.dryRun ? (
          <>
            <Button type="button" variant="secondary" disabled={!file} loading={run.isPending && run.variables?.dryRun} onClick={() => submit(true)}>
              Periksa
            </Button>
            <Button type="button" disabled={!file || (result?.dryRun && result.data.valid === 0)} loading={run.isPending && !run.variables?.dryRun} onClick={() => submit(false)}>
              Impor
            </Button>
          </>
        ) : null}
      </div>
    </>
  );
}

/** Temporary passwords are shown once, so the operator saves them now. */
function downloadAccounts(accounts: { name: string; memberCode: string; idNumber: string; temporaryPassword: string }[]) {
  // Names come from an uploaded file: double the quotes (valid CSV) and defuse a leading = + - @ (spreadsheet formula injection).
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replaceAll('"', '""')}"`;
  const csv = ["memberCode,idNumber,name,temporaryPassword", ...accounts.map((a) => [a.memberCode, a.idNumber, a.name, a.temporaryPassword].map(cell).join(","))].join("\n");
  const href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href, download: "akun-anggota-baru.csv" }).click();
  URL.revokeObjectURL(href);
}
