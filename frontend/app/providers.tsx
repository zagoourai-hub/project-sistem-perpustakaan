"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { onSessionExpired } from "@/lib/api-client";
import { getQueryClient } from "@/lib/query-client";
import { LOGIN_PATH } from "@/shared/constants";
import { useSessionStore } from "@/stores/session.store";
import type { ChildrenProps } from "@/shared/props/common";

export function Providers({ children }: ChildrenProps) {
  // No useState: TanStack's getQueryClient keeps one browser client even if React suspends.
  const queryClient = getQueryClient();

  useEffect(() => {
    onSessionExpired(() => {
      useSessionStore.getState().clear();
      queryClient.clear();
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Deliberate full page load (not router.push): drops every in-memory cache along with the dead session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a hard reload is the point here
      window.location.href = `${LOGIN_PATH}?next=${next}`;
    });
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
