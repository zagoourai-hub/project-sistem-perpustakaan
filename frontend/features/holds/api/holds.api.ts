"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiGetPage, apiPost } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { PageQuery } from "@/shared/types/api";
import type { HoldStatus } from "@/shared/types/enums";
import type { Hold } from "@/shared/types/models";

export type HoldQuery = PageQuery & { status?: HoldStatus; q?: string };

export const holdKeys = {
  all: ["holds"] as const,
  list: (query: HoldQuery) => [...holdKeys.all, "list", query] as const,
  byBook: (bookId: string) => [...holdKeys.all, "book", bookId] as const,
};

export const holdsApi = {
  /** FR-G1: members reserve a title (not a copy) only when nothing is AVAILABLE. */
  create: (bookId: string) => apiPost<Hold>(endpoints.holds.create, { bookId }),
  cancel: (holdId: string) => apiDelete(endpoints.holds.one(holdId)),
  list: (query: HoldQuery) => apiGetPage<Hold>(endpoints.holds.list, query),
  byBook: (bookId: string) => apiGet<Hold[]>(endpoints.books.holds(bookId)),
};

export const useHolds = (query: HoldQuery) =>
  useQuery({ queryKey: holdKeys.list(query), queryFn: () => holdsApi.list(query), placeholderData: keepPreviousData });

export const useBookHolds = (bookId: string) =>
  useQuery({ queryKey: holdKeys.byBook(bookId), queryFn: () => holdsApi.byBook(bookId), enabled: Boolean(bookId) });

export function useCreateHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: holdsApi.create,
    onSuccess: (_hold, bookId) => {
      void qc.invalidateQueries({ queryKey: holdKeys.all });
      void qc.invalidateQueries({ queryKey: ["books", "detail", bookId] });
      void qc.invalidateQueries({ queryKey: ["me", "holds"] });
    },
  });
}

export function useCancelHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: holdsApi.cancel,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: holdKeys.all });
      void qc.invalidateQueries({ queryKey: ["books"] });
      void qc.invalidateQueries({ queryKey: ["me", "holds"] });
    },
  });
}
