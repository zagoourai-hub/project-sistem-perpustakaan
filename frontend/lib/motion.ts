// FE-3.1.3: motion presets shared by CSS and JS. The values mirror `--ease-editorial` and the duration
// tokens in app/globals.css, which already disable transitions under `prefers-reduced-motion`.
// ponytail: no animation library; every transition in the app is CSS. Add `motion` only if a component needs
// layout or gesture animation, and route it through these presets and `prefersReducedMotion()`.

export const EASE_EDITORIAL = "cubic-bezier(0.2, 0, 0, 1)";

/** Milliseconds. `fast` for hover/press, `base` for overlays, `slow` for page-level changes. */
export const DURATION = { fast: 150, base: 200, slow: 320 } as const;

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Duration to actually use: 0 when the user asked for reduced motion. */
export const duration = (key: keyof typeof DURATION) => (prefersReducedMotion() ? 0 : DURATION[key]);
