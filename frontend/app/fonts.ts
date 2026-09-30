import { Anton, IBM_Plex_Mono, Work_Sans } from "next/font/google";

// DESIGN.md typography: Anton = headlines only (≥20px), Work Sans = UI + book titles,
// IBM Plex Mono = data. Exposed as CSS variables consumed by globals.css @theme.
export const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });

export const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", display: "swap" });

export const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});
