"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { MemberType } from "@/shared/types/enums";
import type {
  AiIndexStatus,
  AuditLog,
  Holiday,
  LibrarySettings,
  LoanPolicy,
  StaffUser,
} from "@/shared/types/models";
import type { AuditQuery, HolidayValues, LoanPolicyValues, SettingsValues, StaffValues } from "../schemas/admin.schema";

export const adminKeys = {
  policies: ["admin", "policies"] as const,
  holidays: (year: number) => ["admin", "holidays", year] as const,
  staff: ["admin", "staff"] as const,
  settings: ["admin", "settings"] as const,
  audit: (query: AuditQuery) => ["admin", "audit", query] as const,
  aiStatus: ["admin", "ai-status"] as const,
};

export const adminApi = {
  policies: () => apiGet<LoanPolicy[]>(endpoints.admin.policies),
  updatePolicy: (memberType: MemberType, input: LoanPolicyValues) =>
    apiPut<LoanPolicy>(endpoints.admin.policy(memberType), input),
  holidays: (year: number) => apiGet<Holiday[]>(endpoints.admin.holidays, { year }),
  createHoliday: (input: HolidayValues) => apiPost<Holiday>(endpoints.admin.holidays, input),
  deleteHoliday: (id: string) => apiDelete(endpoints.admin.holiday(id)),
  staff: () => apiGet<StaffUser[]>(endpoints.admin.staff),
  /** Backend returns a temporary password for first login (FR-A4/A5). */
  createStaff: (input: StaffValues) =>
    apiPost<StaffUser & { temporaryPassword: string }>(endpoints.admin.staff, input),
  updateStaff: (id: string, input: Partial<StaffValues> & { isActive?: boolean }) => apiPatch<StaffUser>(endpoints.admin.staffOne(id), input),
  resetStaffPassword: (id: string) => apiPost<{ temporaryPassword: string }>(endpoints.admin.staffResetPassword(id)),
  settings: () => apiGet<LibrarySettings>(endpoints.admin.settings),
  uploadLogo: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiPost<LibrarySettings>(endpoints.admin.settingsLogo, body);
  },
  updateSettings: (input: SettingsValues) => apiPatch<LibrarySettings>(endpoints.admin.settings, input),
  auditLogs: (query: AuditQuery) => apiGetPage<AuditLog>(endpoints.admin.auditLogs, query),
  aiStatus: () => apiGet<AiIndexStatus>(endpoints.admin.aiStatus),
  aiReindex: () => apiPost<AiIndexStatus>(endpoints.admin.aiReindex),
};

export const usePolicies = () => useQuery({ queryKey: adminKeys.policies, queryFn: adminApi.policies });

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberType, ...input }: LoanPolicyValues & { memberType: MemberType }) =>
      adminApi.updatePolicy(memberType, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.policies }),
  });
}

export const useHolidays = (year: number) =>
  useQuery({ queryKey: adminKeys.holidays(year), queryFn: () => adminApi.holidays(year) });

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createHoliday,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "holidays"] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteHoliday,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "holidays"] }),
  });
}

export const useResetStaffPassword = () => useMutation({ mutationFn: adminApi.resetStaffPassword });

export const useStaff = () => useQuery({ queryKey: adminKeys.staff, queryFn: adminApi.staff });

export function useSaveStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: StaffValues & { id?: string; isActive?: boolean }) =>
      id ? adminApi.updateStaff(id, input) : adminApi.createStaff(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.staff }),
  });
}

export const useSettings = () => useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings });

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.uploadLogo,
    onSuccess: (settings) => qc.setQueryData(adminKeys.settings, settings),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: (settings) => qc.setQueryData(adminKeys.settings, settings),
  });
}

export const useAuditLogs = (query: AuditQuery) =>
  useQuery({ queryKey: adminKeys.audit(query), queryFn: () => adminApi.auditLogs(query), placeholderData: keepPreviousData });

/** Polls every 2 s while a reindex is running, otherwise stays idle. */
export const useAiStatus = () =>
  useQuery({
    queryKey: adminKeys.aiStatus,
    queryFn: adminApi.aiStatus,
    refetchInterval: (q) => (q.state.data?.reindexing ? 2_000 : false),
  });

export function useAiReindex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.aiReindex,
    onSuccess: (status) => qc.setQueryData(adminKeys.aiStatus, status),
  });
}
