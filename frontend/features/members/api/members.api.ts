"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiGetPage, apiPatch, apiPost } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { Loan, Member, MemberImportResult, MemberSummary, MemberWithPassword } from "@/shared/types/models";
import type { MemberFormValues, MemberQuery } from "../schemas/member.schema";

export const memberKeys = {
  all: ["members"] as const,
  list: (query: MemberQuery) => [...memberKeys.all, "list", query] as const,
  detail: (id: string) => [...memberKeys.all, "detail", id] as const,
  loans: (id: string) => [...memberKeys.all, "detail", id, "loans"] as const,
  lookup: (code: string) => [...memberKeys.all, "lookup", code] as const,
};

export const membersApi = {
  list: (query: MemberQuery) => apiGetPage<Member>(endpoints.members.list, query),
  get: (id: string) => apiGet<MemberSummary>(endpoints.members.one(id)),
  loans: (id: string) => apiGet<Loan[]>(endpoints.members.loans(id)),
  /** Scanned card / typed member code at the desk. */
  lookup: (code: string) => apiGet<MemberSummary>(endpoints.members.lookup, { code }),
  create: (input: MemberFormValues) => apiPost<MemberWithPassword>(endpoints.members.list, input),
  update: (id: string, input: Partial<MemberFormValues>) => apiPatch<Member>(endpoints.members.one(id), input),
  /** dryRun validates only; the real run creates the valid rows and returns their temporary passwords. */
  import: ({ file, dryRun }: { file: File; dryRun: boolean }) => {
    const body = new FormData();
    body.append("file", file);
    return apiPost<MemberImportResult>(`${endpoints.members.import}?dryRun=${dryRun}`, body);
  },
  resetPassword: (id: string) => apiPost<{ temporaryPassword: string }>(endpoints.members.resetPassword(id)),
};

export const useMembers = (query: MemberQuery) =>
  useQuery({ queryKey: memberKeys.list(query), queryFn: () => membersApi.list(query), placeholderData: keepPreviousData });

export const useMember = (id: string) =>
  useQuery({ queryKey: memberKeys.detail(id), queryFn: () => membersApi.get(id), enabled: Boolean(id) });

export const useMemberLoans = (id: string) =>
  useQuery({ queryKey: memberKeys.loans(id), queryFn: () => membersApi.loans(id), enabled: Boolean(id) });

export const useMemberLookup = (code: string | null) =>
  useQuery({
    queryKey: memberKeys.lookup(code ?? ""),
    queryFn: () => membersApi.lookup(code!),
    enabled: Boolean(code),
    staleTime: 0,
  });

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: membersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  });
}

export function useUpdateMember(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<MemberFormValues>) => membersApi.update(id, input),
    onSuccess: (member) => {
      qc.setQueryData(memberKeys.detail(id), member);
      return qc.invalidateQueries({ queryKey: [...memberKeys.all, "list"] });
    },
  });
}

export function useImportMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: membersApi.import,
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  });
}

export const useResetMemberPassword = () => useMutation({ mutationFn: membersApi.resetPassword });
