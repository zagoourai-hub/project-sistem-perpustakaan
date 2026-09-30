"use client";

import { useState } from "react";
import { TableSkeleton } from "@/components/editorial/bits";
import { EmptyState } from "@/components/editorial/empty-state";
import { PageHeading } from "@/components/editorial/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteMasterData, useMasterData, useSaveMasterData } from "@/features/catalog/api/books.api";
import { ApiError } from "@/lib/api-client";
import type { MasterDataKind } from "@/lib/endpoints";

const KINDS: { kind: MasterDataKind; label: string }[] = [
  { kind: "authors", label: "Pengarang" },
  { kind: "publishers", label: "Penerbit" },
  { kind: "subjects", label: "Subjek" },
  { kind: "shelf-locations", label: "Rak" },
];

// FE-4.3.12: master data with inline add / rename / delete. Delete is refused by the backend while a row is in use.
export function MasterDataPage() {
  const [kind, setKind] = useState<MasterDataKind>("authors");
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useMasterData(kind, q || undefined);
  const save = useSaveMasterData(kind);
  const remove = useDeleteMasterData(kind);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; code?: string } | null>(null);
  const isShelf = kind === "shelf-locations";
  const message = (e: unknown) => (e instanceof ApiError ? e.message : "Gagal menyimpan.");

  return (
    <div className="flex flex-col gap-6">
      <PageHeading kicker="Katalog" title="Master data" />
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Jenis data">
        {KINDS.map((k) => (
          <Button
            key={k.kind}
            role="tab"
            aria-selected={k.kind === kind}
            size="sm"
            variant={k.kind === kind ? "primary" : "secondary"}
            onClick={() => {
              setKind(k.kind);
              setEditing(null);
              setQ("");
            }}
          >
            {k.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="search" aria-label="Cari" placeholder="Cari…" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            save.mutate(
              { name: name.trim(), ...(isShelf ? { code: code.trim() } : {}) },
              {
                onSuccess: () => {
                  setName("");
                  setCode("");
                },
              },
            );
          }}
        >
          {isShelf ? <Input aria-label="Kode rak" placeholder="Kode (B-04)" className="data w-28" value={code} onChange={(e) => setCode(e.target.value)} /> : null}
          <Input aria-label="Nama baru" placeholder="Nama baru" className="w-56" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" loading={save.isPending && !editing}>
            Tambah
          </Button>
        </form>
      </div>
      {save.error ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {message(save.error)}
        </p>
      ) : null}
      {remove.error ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {message(remove.error)}
        </p>
      ) : null}

      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : error ? (
        <EmptyState title="Data gagal dimuat" action={<Button onClick={() => void refetch()}>Coba lagi</Button>} />
      ) : !data?.length ? (
        <EmptyState title="Belum ada data" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {isShelf ? <TableHead>Kode</TableHead> : null}
              <TableHead>Nama</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                {editing?.id === r.id ? (
                  <>
                    {isShelf ? (
                      <TableCell>
                        <Input aria-label="Kode" className="data h-9 w-28" value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <Input aria-label="Nama" className="h-9" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          loading={save.isPending}
                          onClick={() => save.mutate({ id: r.id, name: editing.name.trim(), ...(isShelf ? { code: editing.code?.trim() } : {}) }, { onSuccess: () => setEditing(null) })}
                        >
                          Simpan
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                          Batal
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    {isShelf ? <TableCell className="data">{r.code}</TableCell> : null}
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing({ id: r.id, name: r.name, code: r.code })}>
                          Ubah
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => window.confirm(`Hapus ${r.name}?`) && remove.mutate(r.id)}>
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
