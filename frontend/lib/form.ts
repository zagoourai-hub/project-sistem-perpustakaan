import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api-client";

/**
 * Pushes backend Zod-pipe errors (`details: { field: [msg] }`) onto RHF fields.
 * Anything that isn't a field error lands on `root.server` for a form-level message.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  if (!(error instanceof ApiError)) {
    setError("root.server", { message: "Terjadi kesalahan. Coba lagi." });
    return;
  }
  const entries = Object.entries(error.details ?? {});
  for (const [field, messages] of entries) {
    setError(field as Path<T>, { type: "server", message: messages[0] });
  }
  if (entries.length === 0) setError("root.server", { message: error.message });
}
