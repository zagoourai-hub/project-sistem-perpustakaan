import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

// Pill badges (the only rounded-full element in DESIGN.md). Tone, not decoration:
// success = moss, warning = ochre, danger = filled oxblood (overdue), muted = on loan.
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3 [&>svg]:stroke-[1.5]",
  {
    variants: {
      variant: {
        success: "border-transparent bg-secondary-container text-on-secondary-container",
        warning: "border-on-tertiary-container bg-tertiary-fixed text-tertiary-container",
        danger: "border-transparent bg-primary-container font-semibold text-on-primary",
        muted: "border-outline bg-transparent text-on-surface-variant",
        outline: "border-outline-variant bg-surface-container-lowest text-on-surface",
      },
    },
    defaultVariants: { variant: "outline" },
  }
)

function Badge({
  className,
  variant = "outline",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
