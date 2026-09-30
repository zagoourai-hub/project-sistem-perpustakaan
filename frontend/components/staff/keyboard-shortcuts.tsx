"use client";

import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Kbd } from "@/components/editorial/bits";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["/"], label: "Fokus ke kotak pencarian" },
  { keys: ["F2"], label: "Buka meja peminjaman" },
  { keys: ["F3"], label: "Buka meja pengembalian" },
  { keys: ["Ctrl", "S"], label: "Simpan (form Tambah Buku)" },
  { keys: ["Esc"], label: "Batal / tutup dialog" },
  { keys: ["?"], label: "Tampilkan bantuan ini" },
];

// FE-3.3.3: "?" opens the shortcut list (ignored while typing in a field). The button is the pointer-friendly way in.
export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "?" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button type="button" aria-label="Pintasan keyboard" className="p-1 text-on-surface-variant hover:text-on-surface" onClick={() => setOpen(true)}>
        <Keyboard className="size-[22px] stroke-[1.5]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Pintasan meja</DialogTitle>
          <DialogDescription>Pintasan berlaku di seluruh konsol staf.</DialogDescription>
          <ul className="flex flex-col">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-4 border-b border-outline-variant py-2 last:border-0">
                <span className="text-body-sm">{s.label}</span>
                <Kbd keys={s.keys} />
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
