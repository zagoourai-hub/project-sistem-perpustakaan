import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { ApiError } from "@/lib/api-client";
import type { ApiErrorBody } from "@/shared/types/api";
import { API_PREFIX } from "@/shared/constants";

const env = z
  .object({ BACKEND_URL: z.url().default("http://localhost:3001") })
  .parse({ BACKEND_URL: process.env.BACKEND_URL });

/**
 * Server Component / Route Handler fetch straight to the backend, forwarding the
 * user's cookies. Returns the unwrapped `data`. Throws ApiError on failure.
 * Token refresh is not attempted here — a 401 means the client will refresh.
 */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${env.BACKEND_URL}${API_PREFIX}${path}`, {
    ...init,
    headers: { accept: "application/json", cookie: cookieHeader, ...init?.headers },
    cache: "no-store",
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body as Partial<ApiErrorBody> | null;
    throw new ApiError(res.status, err?.errorCode ?? `HTTP_${res.status}`, err?.message ?? res.statusText, err?.details);
  }
  return (body as { data: T }).data;
}

/**
 * Cookie-less, cacheable fetch for public data (OPAC chrome, catalog pages).
 * Returns `fallback` when the backend is down so public pages still render.
 */
export async function publicFetch<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const res = await fetch(`${env.BACKEND_URL}${API_PREFIX}${path}`, {
      headers: { accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return fallback;
    return ((await res.json()) as { data: T }).data;
  } catch {
    return fallback;
  }
}
