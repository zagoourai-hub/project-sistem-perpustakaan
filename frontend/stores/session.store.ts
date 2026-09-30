import { create } from "zustand";
import type { SessionUser } from "@/shared/types/models";

// Client mirror of the signed-in user for synchronous reads (nav, role checks in UI).
// Source of truth is GET /auth/me via useMe(); useMe() keeps this in sync.
interface SessionState {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clear: () => set({ user: null }),
}));

export const useSessionUser = () => useSessionStore((s) => s.user);
export const useSessionRole = () => useSessionStore((s) => s.user?.role ?? null);
