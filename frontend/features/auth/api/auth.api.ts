"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useSessionStore } from "@/stores/session.store";
import type { SessionUser } from "@/shared/types/models";
import type { ChangePasswordInput, LoginInput } from "../schemas/auth.schema";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export const authApi = {
  // skipAuthRefresh: a 401 here means wrong credentials, not an expired session.
  login: (input: LoginInput) => apiPost<SessionUser>(endpoints.auth.login, input, { skipAuthRefresh: true }),
  logout: () => apiPost<void>(endpoints.auth.logout, undefined, { skipAuthRefresh: true }),
  me: () => apiGet<SessionUser>(endpoints.auth.me),
  changePassword: ({ currentPassword, newPassword }: ChangePasswordInput) =>
    apiPost<void>(endpoints.auth.changePassword, { currentPassword, newPassword }),
};

/** Current user; mirrors into the session store. */
export function useMe(options?: { enabled?: boolean }) {
  const setUser = useSessionStore((s) => s.setUser);
  const query = useQuery({ queryKey: authKeys.me, queryFn: authApi.me, staleTime: 5 * 60 * 1000, ...options });
  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);
  return query;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useSessionStore((s) => s.setUser);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clear = useSessionStore((s) => s.clear);
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}
