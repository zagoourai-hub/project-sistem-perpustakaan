import { cn } from "@/lib/cn"
import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: ReactNode
  /** Right-aligned mono note on the label row, e.g. "412 / 2000". */
  aside?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}

/** Label + control + hint/error (12-tambah-buku form rows). Error text is oxblood and announced. */
function Field({ label, htmlFor, error, hint, aside, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} data-invalid={error ? true : undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="text-primary-container" aria-hidden>*</span> : null}
        </Label>
        {aside ? <span className="data text-[11px] text-on-surface-variant">{aside}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-body-sm text-primary-container dark:text-primary">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="data text-[11px] text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export { Field }
