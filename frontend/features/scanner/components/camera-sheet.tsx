"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { startCameraScanner } from "@/lib/scanner/camera-scanner";

interface CameraSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCode: (code: string) => void;
}

/** Camera viewfinder with an aiming frame. Closes on the first decoded code. */
export function CameraSheet({ open, onOpenChange, onCode }: CameraSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Latest callbacks without restarting the camera when the parent re-renders.
  const handlers = useRef({ onCode, onOpenChange });
  useEffect(() => {
    handlers.current = { onCode, onOpenChange };
  });

  useEffect(() => {
    if (!open) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    // The video element mounts with the dialog; wait a frame for the ref.
    const raf = requestAnimationFrame(async () => {
      if (!videoRef.current) return;
      try {
        stop = await startCameraScanner(videoRef.current, (code) => {
          if (cancelled) return;
          cancelled = true;
          handlers.current.onCode(code);
          handlers.current.onOpenChange(false);
        });
        if (cancelled) stop();
      } catch (e) {
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser."
            : "Kamera tidak tersedia di perangkat ini.",
        );
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stop?.();
      setError(null);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogTitle>Pindai dengan kamera</DialogTitle>
        <DialogDescription>Arahkan barcode buku atau QR kartu anggota ke dalam bingkai.</DialogDescription>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xs bg-inverse-surface">
          <video ref={videoRef} className="size-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-[18%] rounded-xs border-2 border-inverse-on-surface/90" aria-hidden />
        </div>
        {error ? (
          <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
