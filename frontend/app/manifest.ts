import type { MetadataRoute } from "next";

// FR-I6: installable portal (manifest + icons), no offline mode.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pustaka",
    short_name: "Pustaka",
    description: "Katalog dan akun perpustakaan.",
    start_url: "/akun",
    display: "standalone",
    background_color: "#fff8f1",
    theme_color: "#5b0d0d",
    lang: "id",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
