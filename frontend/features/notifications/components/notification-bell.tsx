"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMarkNotificationRead, useNotifications } from "@/features/me/api/me.api";
import { formatDateTime } from "@/lib/format";

// FE-9.2.1: bell with unread badge and a dropdown feed. Polls every 60 s (useNotifications).
export function NotificationBell() {
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications?.filter((n) => !n.readAt) ?? [];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Notifikasi, ${unread.length} belum dibaca`} aria-expanded={open} className="relative p-1 text-on-surface" onClick={() => setOpen(!open)}>
        <Bell className="size-[22px] stroke-[1.5]" />
        {unread.length > 0 ? (
          <span className="data absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-xs bg-primary text-[10px] font-semibold text-on-primary">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="Notifikasi" className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded border border-outline-variant bg-surface-container-lowest shadow-overlay">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-2">
            <span className="kicker text-on-surface-variant">Notifikasi</span>
            {unread.length ? (
              <button type="button" className="text-body-sm text-primary hover:underline" onClick={() => unread.forEach((n) => markRead.mutate(n.id))}>
                Tandai semua dibaca
              </button>
            ) : null}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications?.length ? (
              notifications.map((n) => (
                <li key={n.id} className={`border-b border-outline-variant px-4 py-3 last:border-0 ${n.readAt ? "" : "border-l-2 border-l-primary"}`}>
                  <button type="button" className="w-full text-left" onClick={() => !n.readAt && markRead.mutate(n.id)}>
                    <p className={`text-body-sm ${n.readAt ? "" : "font-semibold"}`}>{n.title}</p>
                    <p className="text-body-sm text-on-surface-variant">{n.body}</p>
                    <p className="data mt-1 text-[11px] text-on-surface-variant">{formatDateTime(n.createdAt)}</p>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-6 text-center text-body-sm text-on-surface-variant">Belum ada notifikasi.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
