import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, createContext, use, useCallback, useMemo } from "react";

import type { AdminUser } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const authMeQueryKey = ["auth", "me"] as const;
const authSetupQueryKey = ["auth", "setup"] as const;

/**
 * Authentication provider for dashboard session state.
 *
 * Hidden behavior: on mount it probes `/admin/me`; on failure it falls back to
 * `/admin/setup` to decide whether first-time setup is required.
 *
 * @param props - Provider children.
 * @returns Context provider element.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery<AdminUser | null>({
    queryKey: authMeQueryKey,
    queryFn: () => api.get<AdminUser>("/admin/me"),
    retry: false,
  });

  const setupQuery = useQuery({
    queryKey: authSetupQueryKey,
    queryFn: () => api.get<{ needsSetup: boolean }>("/admin/setup"),
    enabled: meQuery.isError,
    retry: false,
  });

  const user = meQuery.data ?? null;
  const isLoading = meQuery.isLoading || (meQuery.isError && setupQuery.isLoading);
  const needsSetup = !user && meQuery.isError ? (setupQuery.data?.needsSetup ?? false) : false;

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: authMeQueryKey }),
      queryClient.invalidateQueries({ queryKey: authSetupQueryKey }),
    ]);

    await Promise.all([
      queryClient.refetchQueries({ queryKey: authMeQueryKey, type: "active" }),
      queryClient.refetchQueries({ queryKey: authSetupQueryKey, type: "active" }),
    ]);
  }, [queryClient]);

  const login = useCallback(async (username: string, password: string) => {
    const me = await api.post<AdminUser>("/admin/login", { username, password });
    queryClient.setQueryData(authMeQueryKey, me);
    queryClient.setQueryData(authSetupQueryKey, { needsSetup: false });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await api.post("/admin/logout").catch(() => {});
    queryClient.setQueryData(authMeQueryKey, null);
    queryClient.setQueryData(authSetupQueryKey, { needsSetup: false });
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, isLoading, needsSetup, login, logout, refresh }),
    [user, isLoading, needsSetup, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Accessor hook for auth/session actions.
 *
 * @returns Auth state and mutation methods.
 * @throws Error when used outside `AuthProvider`.
 */
export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
