"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useMarkLost } from "@/features/circulation/api/circulation.api";
import { markLostSchema } from "@/features/circulation/schemas/circulation.schema";
import { applyServerErrors } from "@/lib/form";
import type { Loan } from "@/shared/types/models";

// FR-E4: a borrowed copy is lost or damaged. Creates a replacement fine (default: the copy's price) and closes the loan.
export function MarkLostDialog({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(loan)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{loan ? <MarkLostForm loan={loan} onDone={onClose} /> : null}</DialogContent>
    </Dialog>
  );
}

function MarkLostForm({ loan, onDone }: { loan: Loan; onDone: () => void }) {
  const mark = useMarkLost();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<typeof markLostSchema>, unknown, z.output<typeof markLostSchema>>({
    resolver: zodResolver(markLostSchema),
    defaultValues: { type: "LOST", amount: loan.item.price ?? 0, note: "" },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((v) => mark.mutate({ loanId: loan.id, ...v }, { onSuccess: onDone, onError: (e) => applyServerErrors(e, setError) }))}
    >
      <div className="flex flex-col gap-1">
        <DialogTitle>Tandai hilang / rusak</DialogTitle>
        <DialogDescription>
          {loan.item.book.title} · <span className="data">{loan.item.barcode}</span>. Pinjaman ditutup dan denda penggantian dibuat.
        </DialogDescription>
      </div>
      <Field label="Kondisi" htmlFor="lost-type">
        <NativeSelect id="lost-type" {...register("type")}>
          <option value="LOST">Hilang</option>
          <option value="DAMAGED">Rusak</option>
        </NativeSelect>
      </Field>
      <Field label="Denda penggantian (Rp)" htmlFor="lost-amount" error={errors.amount?.message} hint="Default: harga eksemplar. Bisa diubah.">
        <Input id="lost-amount" type="number" min={0} className="data" aria-invalid={Boolean(errors.amount)} {...register("amount")} />
      </Field>
      <Field label="Catatan" htmlFor="lost-note" error={errors.note?.message}>
        <Input id="lost-note" {...register("note")} />
      </Field>
      {errors.root?.server ? (
        <p role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {errors.root.server.message}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={mark.isPending}>
          Tandai
        </Button>
      </div>
    </form>
  );
}
