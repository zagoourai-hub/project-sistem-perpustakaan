// Browser/client HTTP layer. Talks same-origin to /api/v1 (rewritten to the backend
// by next.config), so httpOnly auth cookies and the CSRF cookie just work.
// Relative .ts imports keep it runnable under plain Node for api-client.check.ts.
import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { API_PREFIX, AUTH_COOKIES, CSRF_HEADER } from "../shared/constants.ts";
import type { ApiErrorBody, PageMeta, Paginated } from "../shared/types/api.ts";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Don't try /auth/refresh on 401 (login, refresh itself, public calls). */
    skipAuthRefresh?: boolean;
    _retried?: boolean;
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === "object" && data !== null && "errorCode" in data && "message" in data;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    const res = error.response;
    if (res && isErrorBody(res.data)) {
      return new ApiError(res.status, res.data.errorCode, res.data.message, res.data.details);
    }
    if (res) return new ApiError(res.status, `HTTP_${res.status}`, "Terjadi kesalahan pada server.");
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError(0, "TIMEOUT", "Server tidak merespons. Coba lagi.");
    }
    return new ApiError(0, "NETWORK_ERROR", "Tidak dapat terhubung ke server.");
  }
  return new ApiError(0, "UNKNOWN", error instanceof Error ? error.message : "Kesalahan tidak dikenal.");
}

export const http = axios.create({
  baseURL: API_PREFIX,
  withCredentials: true,
  timeout: 15_000,
  // Native axios double-submit CSRF: copies the cookie into the header on same-origin requests.
  xsrfCookieName: AUTH_COOKIES.csrf,
  xsrfHeaderName: CSRF_HEADER,
});

let sessionExpiredHandler: () => void = () => {};
/** Registered by app/providers.tsx: clear client state and send the user to login. */
export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

// Single-flight: N parallel 401s trigger one /auth/refresh, then all retry.
let refreshing: Promise<void> | null = null;
function refreshSession(): Promise<void> {
  refreshing ??= http
    .post("/auth/refresh", undefined, { skipAuthRefresh: true })
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

http.interceptors.response.use(undefined, async (error: unknown) => {
  const config = error instanceof AxiosError ? error.config : undefined;
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  if (status === 401 && config && !config.skipAuthRefresh && !config._retried) {
    config._retried = true;
    try {
      await refreshSession();
    } catch {
      sessionExpiredHandler();
      throw toApiError(error);
    }
    return http(config);
  }
  throw toApiError(error);
});

// ── Typed helpers: unwrap the `{ data, meta }` envelope ──────────────────────

type Params = AxiosRequestConfig["params"];

export async function apiGet<T>(url: string, params?: Params, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<{ data: T }>(url, { ...config, params });
  return res.data.data;
}

export async function apiGetPage<T>(url: string, params?: Params): Promise<Paginated<T>> {
  const res = await http.get<{ data: T[]; meta: PageMeta }>(url, { params });
  return { items: res.data.data, meta: res.data.meta };
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post<{ data: T }>(url, body, config);
  return res.data?.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.patch<{ data: T }>(url, body);
  return res.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.put<{ data: T }>(url, body);
  return res.data.data;
}

export async function apiDelete(url: string): Promise<void> {
  await http.delete(url);
}

/** Downloads a binary response (report export, labels PDF) and saves it in the browser. */
export async function apiDownload(url: string, params?: Params, fallbackName = "unduhan"): Promise<void> {
  const res = await http.get<Blob>(url, { params, responseType: "blob" });
  const disposition = String(res.headers["content-disposition"] ?? "");
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = Object.assign(document.createElement("a"), { href, download: decodeURIComponent(name) });
  a.click();
  URL.revokeObjectURL(href);
}
