"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface Credentials {
  name: string;
  /** Member code or, for staff, the login email. */
  login: string;
  temporaryPassword: string;
}

// The backend returns a temporary password exactly once (create / reset). Show it, never store it.
export function CredentialsDialog({ credentials, onClose }: { credentials: Credentials | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open={Boolean(credentials)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {credentials ? (
          <>
            <div className="flex flex-col gap-1">
              <DialogTitle>Kata sandi sementara</DialogTitle>
              <DialogDescription>
                Berikan ke {credentials.name}. Kata sandi ini hanya tampil sekali dan wajib diganti saat masuk pertama.
              </DialogDescription>
            </div>
            <dl className="data flex flex-col gap-2 rounded-xs bg-surface-container-high p-4 text-[14px]">
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">Akun masuk</dt>
                <dd>{credentials.login}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">Kata sandi</dt>
                <dd className="font-semibold select-all">{credentials.temporaryPassword}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(credentials.temporaryPassword).then(() => setCopied(true));
                }}
              >
                <Copy aria-hidden /> {copied ? "Tersalin" : "Salin"}
              </Button>
              <Button
                onClick={() => {
                  setCopied(false);
                  onClose();
                }}
              >
                Selesai
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
