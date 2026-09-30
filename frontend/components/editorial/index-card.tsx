import { cn } from "@/lib/cn";
import { CallNumber } from "@/components/editorial/call-number";
import { StatusBadge } from "@/components/editorial/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { IndexCardProps } from "@/shared/props/components";

/** Book detail as a catalog card (11-detail-buku). Title is the page headline → Anton. */
export function IndexCard({
  callNumber,
  title,
  authors,
  year,
  availability,
  fields,
  subjects,
  synopsis,
  items,
  actions,
  className,
}: IndexCardProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-6", className)}>
      <div className="flex flex-col gap-3">
        <CallNumber value={callNumber} className="self-start text-[12px]" />
        <h1 className="font-display text-h1 text-on-surface uppercase md:text-[3.25rem] md:leading-[1.05]">{title}</h1>
        <p className="text-body-lg text-on-surface-variant">
          {authors.map((a) => a.name).join(", ")}
          {year ? <span className="data text-body-sm"> · ({year})</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            status={availability.available > 0 ? "AVAILABLE" : "ON_LOAN"}
            label={availability.available > 0 ? "Tersedia" : "Semua dipinjam"}
          />
          <span className="data text-[13px] text-on-surface-variant">
            {availability.available} dari {availability.total} eksemplar tersedia di rak
          </span>
          {actions}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-10 gap-y-4 border-t border-outline-variant pt-5 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <dt className="data text-[11px] font-semibold tracking-wider text-on-surface uppercase">{f.label}</dt>
            <dd className="text-body-md text-on-surface">{f.value}</dd>
          </div>
        ))}
      </dl>

      {subjects?.length ? (
        <div className="flex flex-col gap-2">
          <span className="data text-[11px] font-semibold tracking-wider uppercase">Subjek</span>
          <ul className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <li key={s} className="rounded-xs border border-outline-variant bg-surface-container-low px-2 py-0.5 text-body-sm whitespace-nowrap">
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {synopsis ? (
        <div className="flex flex-col gap-2 border-t border-outline-variant pt-5">
          <span className="data text-[11px] font-semibold tracking-wider uppercase">Sinopsis</span>
          <p className="max-w-prose text-body-lg text-on-surface">{synopsis}</p>
        </div>
      ) : null}

      {items?.length ? (
        <div className="rounded border border-outline-variant bg-surface-container-lowest">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode eksemplar / barcode</TableHead>
                <TableHead>Lokasi rak</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Status sirkulasi</TableHead>
                <TableHead className="text-right">Tanggal jatuh tempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <CallNumber value={item.barcode} />
                  </TableCell>
                  <TableCell className="data">Rak {item.shelfLocation.code}</TableCell>
                  <TableCell>{item.condition ? CONDITION_LABEL[item.condition] : "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="data text-right">{item.dueAt ? formatDate(item.dueAt) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
}

const CONDITION_LABEL = { GOOD: "Baik", FAIR: "Cukup", POOR: "Buruk" } as const;
