import type { NextConfig } from "next";

// Read at build time (rewrites are compiled into the routes manifest):
// set BACKEND_URL before `next build` in Docker/CI.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";

// Hosts that may serve covers/logo through next/image. Local dev uses the backend origin; production adds the
// MinIO/S3 public host via MEDIA_URL (e.g. https://media.example.sch.id). BookCover keeps a plain <img>
// because the backend already stores pre-sized webp variants, so this is only needed if next/image is adopted.
const mediaOrigins = [backendUrl, process.env.MEDIA_URL].filter((u): u is string => Boolean(u));
const remotePatterns = mediaOrigins.map((u) => {
  const { protocol, hostname, port } = new URL(u);
  return { protocol: protocol.replace(":", "") as "http" | "https", hostname, port };
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  images: { remotePatterns },
  // Minimal self-contained server for the Docker image (docker/frontend/Dockerfile).
  output: "standalone",
  // Same-origin API: the browser calls /api/v1/*, Next forwards to NestJS.
  // Keeps httpOnly auth cookies first-party and CSRF double-submit simple.
  // /uploads = covers & logo from the backend's local storage driver, so in production
  // the backend's PUBLIC_API_URL can simply be this site's own origin.
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
      { source: "/uploads/:path*", destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
