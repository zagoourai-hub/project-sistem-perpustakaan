import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The stock merger treats our custom font-size tokens (text-body-sm, text-label, ...) as text *colors*,
// so `text-body-sm` silently deleted `text-on-primary`. Registering them as font sizes keeps both.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "book-title", "body-lg", "body-md", "body-sm", "label", "data-lg"] }],
    },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
