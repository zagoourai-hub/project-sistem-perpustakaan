import { environmentManager, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above 0 so SSR-prefetched data isn't refetched immediately on the client.
        staleTime: 60 * 1000,
        // 4xx won't fix itself on retry; network/5xx get two more tries.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** New client per server request; one singleton in the browser (TanStack Query v5 App Router pattern). */
export function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
