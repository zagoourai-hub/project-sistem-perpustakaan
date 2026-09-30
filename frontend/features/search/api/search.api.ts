"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { apiGet } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { SearchResponse } from "@/shared/types/models";
import { parseSearchParams, toSearchQueryString, type SearchParams } from "../schemas/search.schema";

export const searchKeys = {
  all: ["search"] as const,
  query: (params: SearchParams) => [...searchKeys.all, params] as const,
};

export const searchApi = {
  // Public + hybrid (FR-I2). skipAuthRefresh: guests have no session to refresh.
  search: (params: SearchParams) =>
    apiGet<SearchResponse>(endpoints.search.query, params, {
      skipAuthRefresh: true,
      paramsSerializer: { indexes: null }, // subject=a&subject=b
    }),
};

export const useSearch = (params: SearchParams) =>
  useQuery({
    queryKey: searchKeys.query(params),
    queryFn: () => searchApi.search(params),
    placeholderData: keepPreviousData,
  });

/** Filters as URL state: read from searchParams, write with router.replace. */
export function useSearchState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useMemo(() => parseSearchParams(new URLSearchParams(searchParams)), [searchParams]);

  const setParams = useCallback(
    (patch: Partial<SearchParams>) => {
      // Any filter change resets to page 1 unless the patch sets the page itself.
      const next = { ...params, page: 1, ...patch };
      const qs = toSearchQueryString(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { params, setParams };
}
