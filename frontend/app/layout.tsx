import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { anton, plexMono, workSans } from "./fonts";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/components/ui/theme-toggle";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Pustaka", template: "%s · Pustaka" },
  description: "Katalog dan layanan perpustakaan.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#16140f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${anton.variable} ${workSans.variable} ${plexMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* Cache Components: routes read params/searchParams/cookies, so the tree streams behind one boundary. */}
        <Suspense>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
