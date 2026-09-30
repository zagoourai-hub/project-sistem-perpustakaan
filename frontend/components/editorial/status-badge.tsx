import type { VariantProps } from "class-variance-authority";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { StatusBadgeProps, StatusBadgeValue } from "@/shared/props/components";

type Variant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// DESIGN.md status badges with their Indonesian labels.
const STATUS: Record<StatusBadgeValue, { label: string; variant: Variant }> = {
  AVAILABLE: { label: "Tersedia", variant: "success" },
  ON_LOAN: { label: "Dipinjam", variant: "muted" },
  ON_HOLD: { label: "Disimpan untuk reservasi", variant: "warning" },
  LOST: { label: "Hilang", variant: "muted" },
  DAMAGED: { label: "Rusak", variant: "muted" },
  IN_REPAIR: { label: "Diperbaiki", variant: "muted" },
  WITHDRAWN: { label: "Ditarik", variant: "muted" },
  OVERDUE: { label: "Terlambat", variant: "danger" },
  WAITING: { label: "Dalam antrean", variant: "muted" },
  READY: { label: "Siap diambil", variant: "warning" },
  FULFILLED: { label: "Selesai", variant: "outline" },
  CANCELLED: { label: "Dibatalkan", variant: "muted" },
  EXPIRED: { label: "Kedaluwarsa", variant: "muted" },
  UNPAID: { label: "Belum lunas", variant: "danger" },
  PAID: { label: "Lunas", variant: "success" },
  WAIVED: { label: "Dihapuskan", variant: "outline" },
  ACTIVE: { label: "Aktif", variant: "success" },
  SUSPENDED: { label: "Ditangguhkan", variant: "danger" },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const s = STATUS[status];
  return (
    <Badge variant={s.variant} className={className}>
      {label ?? s.label}
    </Badge>
  );
}

/** Dot + mono line used on book rows: "● 2 dari 3 tersedia · Rak B-04". */
export function AvailabilityLine({ available, total, shelf }: { available: number; total: number; shelf?: string }) {
  const tone = available > 0 ? "bg-secondary" : "bg-outline";
  return (
    <span className="data inline-flex items-center gap-1.5 text-[12px] text-on-surface-variant">
      <span className={`size-1.5 rounded-full ${tone}`} aria-hidden />
      {available > 0 ? `${available} dari ${total} tersedia` : "Semua dipinjam"}
      {shelf ? ` · Rak ${shelf}` : null}
    </span>
  );
}
