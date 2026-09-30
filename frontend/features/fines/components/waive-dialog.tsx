"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWaiveFine } from "@/features/circulation/api/circulation.api";
import { fineWaiveSchema, type FineWaiveValues } from "@/features/circulation/schemas/circulation.schema";
import { applyServerErrors } from "@/lib/form";
import { formatRupiah } from "@/lib/format";
import type { Fine } from "@/shared/types/models";

// FR-F3: ADMIN only (the backend enforces it too), reason is mandatory and audited.
export function WaiveDialog({ fine, onClose }: { fine: Fine | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(fine)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{fine ? <WaiveForm fine={fine} onDone={onClose} /> : null}</DialogContent>
    </Dialog>
  );
}

function WaiveForm({ fine, onDone }: { fine: Fine; onDone: () => void }) {
  const waive = useWaiveFine();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FineWaiveValues>({ resolver: zodResolver(fineWaiveSchema) });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((v) => waive.mutate({ fineId: fine.id, ...v }, { onSuccess: onDone, onError: (e) => applyServerErrors(e, setError) }))}
    >
      <div className="flex flex-col gap-1">
        <DialogTitle>Hapuskan denda</DialogTitle>
        <DialogDescription>
          Sisa {formatRupiah(fine.outstanding)} atas nama {fine.member.name} akan dihapuskan dan dicatat di log audit.
        </DialogDescription>
      </div>
      <Field label="Alasan" htmlFor="reason" error={errors.reason?.message} required>
        <textarea
          id="reason"
          rows={3}
          aria-invalid={Boolean(errors.reason)}
          className="w-full rounded border border-outline bg-surface-container-lowest p-3 text-body-md text-on-surface aria-invalid:border-primary-container"
          {...register("reason")}
        />
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
        <Button type="submit" loading={waive.isPending}>
          Hapuskan
        </Button>
      </div>
    </form>
  );
}
