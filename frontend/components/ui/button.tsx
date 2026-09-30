import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { LoaderCircle } from "lucide-react"

// DESIGN.md buttons: primary oxblood, secondary raised with hairline, ghost, 40px tall.
// "sunken" = quiet filled action seen in the mockups ("Reservasi", "Unduh kartu").
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded border border-transparent text-label whitespace-nowrap transition-colors duration-150 ease-editorial select-none disabled:pointer-events-none data-[disabled]:pointer-events-none aria-invalid:border-primary-container [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary font-semibold text-on-primary hover:bg-primary-container disabled:bg-surface-container-high disabled:text-outline",
        secondary:
          "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low disabled:text-outline",
        sunken:
          "border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:text-outline",
        ghost: "text-on-surface hover:bg-surface-container disabled:text-outline",
        link: "h-auto! px-0! text-on-surface underline-offset-4 hover:text-primary hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-body-sm",
        lg: "h-12 px-5",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner and disables the button (03-komponen "Memuat" state). */
    loading?: boolean
  }

function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
