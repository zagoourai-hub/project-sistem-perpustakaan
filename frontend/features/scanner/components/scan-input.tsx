"use client";

import { cn } from "@/lib/cn";
import { Camera, ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { detectCodeType, normalizeCode } from "@/lib/scanner/detect-code-type";
import type { ScanInputProps } from "@/shared/props/components";
import { CameraSheet } from "./camera-sheet";

interface Props extends ScanInputProps {
  /** Enter on an empty field (desk shortcut for "Konfirmasi"). */
  onSubmitEmpty?: () => void;
  onEscape?: () => void;
}

/**
 * The circulation desk's main field (DESIGN.md "Scan input"): 56px, mono, always focused.
 * USB/Bluetooth scanners act as keyboards (FR-H2): if focus drifts elsewhere, the next
 * printable keystroke is routed back here so a scan is never lost.
 */
export function ScanInput({ placeholder, onScan, hasError, disabled, statusLine, onSubmitEmpty, onEscape, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    function reclaimFocus(e: KeyboardEvent) {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (cameraOpen || disabled || el?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) inputRef.current?.focus();
    }
    window.addEventListener("keydown", reclaimFocus);
    return () => window.removeEventListener("keydown", reclaimFocus);
  }, [cameraOpen, disabled]);

  function submit(raw: string) {
    const code = normalizeCode(raw);
    setValue("");
    if (code) onScan(code, detectCodeType(code));
    else onSubmitEmpty?.();
    inputRef.current?.focus();
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className={cn(
          "flex h-14 items-center gap-3 rounded border-2 bg-surface-container-lowest px-4 transition-colors duration-150",
          hasError ? "border-primary-container" : "border-on-surface",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-on-surface",
        )}
      >
        <ScanBarcode className="size-6 shrink-0 stroke-[1.5] text-on-surface" aria-hidden />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Handle Enter here instead of relying on implicit form submission,
            // which did not fire reliably in checkout mode (found in browser test).
            if (e.key === "Enter") {
              e.preventDefault();
              submit(e.currentTarget.value);
            } else if (e.key === "Escape") {
              setValue("");
              onEscape?.();
            }
          }}
          autoFocus
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label={placeholder}
          aria-invalid={hasError || undefined}
          placeholder={placeholder}
          className="data h-full min-w-0 flex-1 bg-transparent text-[18px] text-on-surface outline-none placeholder:text-on-surface-variant"
        />
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          aria-label="Pindai dengan kamera"
          className="shrink-0 rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        >
          <Camera className="size-5 stroke-[1.5]" />
        </button>
      </form>
      {statusLine}
      <CameraSheet open={cameraOpen} onOpenChange={setCameraOpen} onCode={submit} />
    </div>
  );
}
