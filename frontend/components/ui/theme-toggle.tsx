"use client"

import { Moon, Sun } from "lucide-react"
import { useSyncExternalStore } from "react"

/** Inline script for <head>: applies the saved (or system) theme before first paint, so there is no flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`

// FE-3.1.8 / FE-X.7: toggles the `.dark` class that globals.css keys its dark tokens on.
const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

function ThemeToggle() {
  // The <html> class is the source of truth (set before paint by THEME_INIT_SCRIPT), so read it as an external store.
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => false)

  return (
    <button
      type="button"
      aria-label={dark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      className="p-1 text-on-surface-variant hover:text-on-surface"
      onClick={() => {
        const next = !dark
        document.documentElement.classList.toggle("dark", next)
        try {
          localStorage.setItem("theme", next ? "dark" : "light")
        } catch {}
      }}
    >
      {dark ? <Sun className="size-[22px] stroke-[1.5]" /> : <Moon className="size-[22px] stroke-[1.5]" />}
    </button>
  )
}

export { ThemeToggle }
