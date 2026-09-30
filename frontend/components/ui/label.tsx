"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-label font-semibold text-on-surface select-none peer-disabled:cursor-not-allowed peer-disabled:text-outline",
        className
      )}
      {...props}
    />
  )
}

export { Label }
