"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiGet, apiGetPage, apiPost } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { CheckinResult, CheckoutResult, Fine, FinePayment, Loan } from "@/shared/types/models";
import type {
  CheckinValues,
  CheckoutValues,
  FinePaymentValues,
  FineQuery,
  FineWaiveValues,
  MarkLostValues,
} from "../schemas/circulation.schema";

export const fineKeys = {
  all: ["fines"] as const,
  list: (query: FineQuery) => [...fineKeys.all, "list", query] as const,
  detail: (id: string) => [...fineKeys.all, "detail", id] as const,
};

export const circulationApi = {
  checkout: (input: CheckoutValues) => apiPost<CheckoutResult>(endpoints.circulation.checkout, input),
  checkin: (input: CheckinValues) => apiPost<CheckinResult>(endpoints.circulation.checkin, input),
  renew: (loanId: string) => apiPost<Loan>(endpoints.circulation.renew(loanId)),
  remind: (loanId: string) => apiPost<{ queued: boolean }>(endpoints.circulation.remind(loanId)),
  markLost: (loanId: string, input: MarkLostValues) => apiPost<Fine>(endpoints.circulation.markLost(loanId), input),
  fine: (id: string) => apiGet<Fine>(endpoints.fines.one(id)),
  fines: (query: FineQuery) => apiGetPage<Fine>(endpoints.fines.list, query),
  payFine: (fineId: string, input: FinePaymentValues) => apiPost<FinePayment>(endpoints.fines.payments(fineId), input),
  waiveFine: (fineId: string, input: FineWaiveValues) => apiPost<Fine>(endpoints.fines.waive(fineId), input),
};

/** A circulation event changes loans, item status, fines, holds and today's KPIs at once. */
function invalidateCirculation(qc: QueryClient) {
  for (const key of [["members"], ["books"], ["items"], ["fines"], ["holds"], ["me"], ["reports", "dashboard"]]) {
    void qc.invalidateQueries({ queryKey: key });
  }
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: circulationApi.checkout, onSuccess: () => invalidateCirculation(qc) });
}

export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: circulationApi.checkin, onSuccess: () => invalidateCirculation(qc) });
}

/** Used by staff (member panel) and members (portal DueSlip, FR-E3). */
export function useRenewLoan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: circulationApi.renew, onSuccess: () => invalidateCirculation(qc) });
}

export const useRemindLoan = () => useMutation({ mutationFn: circulationApi.remind });

export function useMarkLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, ...input }: MarkLostValues & { loanId: string }) => circulationApi.markLost(loanId, input),
    onSuccess: () => invalidateCirculation(qc),
  });
}

export const useFines = (query: FineQuery) =>
  useQuery({ queryKey: fineKeys.list(query), queryFn: () => circulationApi.fines(query), placeholderData: keepPreviousData });

export const useFine = (id: string | null) =>
  useQuery({ queryKey: fineKeys.detail(id ?? ""), queryFn: () => circulationApi.fine(id!), enabled: Boolean(id) });

export function usePayFine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fineId, ...input }: FinePaymentValues & { fineId: string }) => circulationApi.payFine(fineId, input),
    onSuccess: () => invalidateCirculation(qc),
  });
}

export function useWaiveFine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fineId, ...input }: FineWaiveValues & { fineId: string }) => circulationApi.waiveFine(fineId, input),
    onSuccess: () => invalidateCirculation(qc),
  });
}
