"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Member } from "@/shared/types/models";
import { MemberCard } from "./member-card";

// FE-2.4.6: printable card for staff (issued at enrolment). Print CSS shows only the card.
export function MemberCardPrint({ member, open, onClose }: { member: Member; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Kartu anggota</DialogTitle>
        {open ? <MemberCard member={member} /> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden /> Cetak
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
