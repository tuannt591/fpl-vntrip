"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AUTH_STORAGE_KEY, type AuthSession } from "@/components/chat/types";

type AuthSessionContextValue = {
  session: AuthSession | null;
  isSessionReady: boolean;
  saveSession: (session: AuthSession) => void;
  clearSession: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  try {
    const temporarySession = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);

    const storedSession =
      window.localStorage.getItem(AUTH_STORAGE_KEY) || temporarySession;
    if (!storedSession) return null;

    const parsedSession = JSON.parse(storedSession) as Partial<AuthSession>;
    if (
      typeof parsedSession.token !== "string" ||
      typeof parsedSession.email !== "string"
    ) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsedSession as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
    setIsSessionReady(true);
  }, []);

  const saveSession = useCallback((nextSession: AuthSession) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isSessionReady, saveSession, clearSession }),
    [clearSession, isSessionReady, saveSession, session],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return context;
}
