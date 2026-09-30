"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiGetPage, apiPatch, apiPost } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { PageQuery } from "@/shared/types/api";
import type { BookSummary, Fine, Hold, Loan, Member, Notification } from "@/shared/types/models";

// Member portal (/akun). Backend scopes every call to the signed-in member.
export const meKeys = {
  all: ["me"] as const,
  card: ["me", "card"] as const,
  loans: ["me", "loans"] as const,
  holds: ["me", "holds"] as const,
  fines: ["me", "fines"] as const,
  history: (query: PageQuery) => ["me", "history", query] as const,
  recommendations: ["me", "recommendations"] as const,
  notifications: ["me", "notifications"] as const,
};

export const meApi = {
  card: () => apiGet<Member & { qrPayload: string }>(endpoints.me.card),
  loans: () => apiGet<Loan[]>(endpoints.me.loans),
  holds: () => apiGet<Hold[]>(endpoints.me.holds),
  fines: () => apiGet<Fine[]>(endpoints.me.fines),
  history: (query: PageQuery) => apiGetPage<Loan>(endpoints.me.history, query),
  recommendations: () => apiGet<BookSummary[]>(endpoints.me.recommendations),
  notifications: () => apiGet<Notification[]>(endpoints.me.notifications),
  markNotificationRead: (id: string) => apiPost<void>(endpoints.notifications.markRead(id)),
  updateSettings: (input: Pick<Member, "emailReminders">) => apiPatch<Member>(endpoints.me.settings, input),
};

export const useMyCard = () => useQuery({ queryKey: meKeys.card, queryFn: meApi.card });
export const useMyLoans = () => useQuery({ queryKey: meKeys.loans, queryFn: meApi.loans });
export const useMyHolds = () => useQuery({ queryKey: meKeys.holds, queryFn: meApi.holds });
export const useMyFines = () => useQuery({ queryKey: meKeys.fines, queryFn: meApi.fines });
export const useMyHistory = (query: PageQuery) =>
  useQuery({ queryKey: meKeys.history(query), queryFn: () => meApi.history(query), placeholderData: keepPreviousData });
export const useRecommendations = () =>
  useQuery({ queryKey: meKeys.recommendations, queryFn: meApi.recommendations, staleTime: 30 * 60 * 1000 });

/** Bell icon: polls every 60 s (PRD FE-9.2). */
export const useNotifications = () =>
  useQuery({ queryKey: meKeys.notifications, queryFn: meApi.notifications, refetchInterval: 60_000 });

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: meApi.markNotificationRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: meKeys.notifications });
      const previous = qc.getQueryData<Notification[]>(meKeys.notifications);
      qc.setQueryData<Notification[]>(meKeys.notifications, (list) =>
        list?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => qc.setQueryData(meKeys.notifications, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: meKeys.notifications }),
  });
}

export const useUpdateMySettings = () => useMutation({ mutationFn: meApi.updateSettings });
