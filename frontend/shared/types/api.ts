// Wire contract with the NestJS backend (PRD Phase 1.3):
// success → response interceptor envelope `{ data, meta? }`
// failure → http-exception filter body `{ statusCode, errorCode, message, details? }`

export type ApiEnvelope<T, M = undefined> = M extends undefined
  ? { data: T }
  : { data: T; meta: M };

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  /** Field-level validation issues from the Zod pipe, keyed by field path. */
  details?: Record<string, string[]>;
}

/** ISO-8601 string as serialized by the backend. */
export type IsoDate = string;
