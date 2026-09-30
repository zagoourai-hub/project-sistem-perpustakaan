"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePayFine } from "@/features/circulation/api/circulation.api";
import { finePaymentSchema } from "@/features/circulation/schemas/circulation.schema";
import { applyServerErrors } from "@/lib/form";
import { formatRupiah } from "@/lib/format";
import type { Fine } from "@/shared/types/models";

// FR-F2: partial payments allowed, up to the outstanding balance.
export function PaymentDialog({ fine, onClose }: { fine: Fine | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(fine)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{fine ? <PaymentForm fine={fine} onDone={onClose} /> : null}</DialogContent>
    </Dialog>
  );
}

function PaymentForm({ fine, onDone }: { fine: Fine; onDone: () => void }) {
  const schema = finePaymentSchema(fine.outstanding);
  const pay = usePayFine();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: fine.outstanding },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((v) => pay.mutate({ fineId: fine.id, ...v }, { onSuccess: onDone, onError: (e) => applyServerErrors(e, setError) }))}
    >
      <div className="flex flex-col gap-1">
        <DialogTitle>Terima pembayaran</DialogTitle>
        <DialogDescription>
          {fine.member.name} · {fine.book.title}
        </DialogDescription>
      </div>
      <p className="data text-[13px] text-on-surface-variant">
        Tagihan {formatRupiah(fine.amount)} · dibayar {formatRupiah(fine.paidAmount)} · sisa{" "}
        <span className="font-semibold text-on-surface">{formatRupiah(fine.outstanding)}</span>
      </p>
      <Field label="Nominal diterima (Rp)" htmlFor="amount" error={errors.amount?.message} required>
        <Input id="amount" type="number" inputMode="numeric" autoFocus aria-invalid={Boolean(errors.amount)} {...register("amount")} />
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
        <Button type="submit" loading={pay.isPending}>
          Catat pembayaran
        </Button>
      </div>
    </form>
  );
}
