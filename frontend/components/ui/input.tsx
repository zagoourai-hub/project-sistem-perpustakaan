import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/cn"

// DESIGN.md inputs: raised surface, 1px outline border, 4px radius, 40px tall.
// Focus uses the global 2px ink outline; errors turn the border oxblood.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded border border-outline bg-surface-container-lowest px-3 text-body-md text-on-surface transition-colors outline-none placeholder:text-outline file:mr-3 file:border-0 file:bg-transparent file:text-label file:text-on-surface disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-outline aria-invalid:border-primary-container aria-invalid:bg-primary-fixed/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
