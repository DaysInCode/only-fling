"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MeResponse } from "@/lib/contracts";
import { apiGet, clearStoredToken, getStoredToken, setStoredToken } from "@/lib/api";

type SessionContextValue = {
  token: string;
  user: MeResponse["user"] | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const currentToken = getStoredToken();
    setToken(currentToken);

    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    const result = await apiGet<MeResponse>("/me", currentToken);
    if (result.data) {
      setUser(result.data.user);
      setLoading(false);
      return;
    }

    clearStoredToken();
    setToken("");
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [refresh]);

  const signIn = useCallback(async (nextToken: string) => {
    setStoredToken(nextToken);
    setToken(nextToken);
    setLoading(true);
    await refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    clearStoredToken();
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      signIn,
      signOut,
      refresh,
    }),
    [loading, refresh, signIn, signOut, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
