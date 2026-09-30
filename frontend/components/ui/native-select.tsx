import * as React from "react"
import { cn } from "@/lib/cn"

// Native <select> styled like Input (DESIGN.md forms). Native = free keyboard + mobile pickers.
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-10 w-full min-w-0 rounded border border-outline bg-surface-container-lowest px-3 text-body-md text-on-surface outline-none disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-outline aria-invalid:border-primary-container aria-invalid:bg-primary-fixed/30",
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect }
