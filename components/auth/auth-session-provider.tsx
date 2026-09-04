"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AUTH_STORAGE_KEY,
  type AuthSession,
  type AuthSessionManager,
  type AuthSessionProfile,
} from "@/components/chat/types";
import { clearClientData } from "@/lib/client-data-cache";

type AuthSessionContextValue = {
  session: AuthSession | null;
  isSessionReady: boolean;
  saveSession: (session: AuthSession) => void;
  clearSession: () => void;
  establishAppSession: (session: AuthSession) => Promise<AuthSession>;
};

type AppSessionResponse = {
  profile?: AuthSessionProfile;
  manager?: AuthSessionManager | null;
  error?: string;
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
  const inFlightSessionRequestsRef = useRef(new Map<string, Promise<AuthSession>>());
  const establishedSessionsRef = useRef(new Map<string, AuthSession>());

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
    inFlightSessionRequestsRef.current.clear();
    establishedSessionsRef.current.clear();
    clearClientData();
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  }, []);

  const establishAppSession = useCallback(
    (nextSession: AuthSession) => {
      const establishedSession = establishedSessionsRef.current.get(nextSession.token);
      if (establishedSession) {
        return Promise.resolve(establishedSession);
      }

      const inFlightRequest = inFlightSessionRequestsRef.current.get(nextSession.token);
      if (inFlightRequest) return inFlightRequest;

      const request = (async () => {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: nextSession.token,
            userId: nextSession.userId,
            email: nextSession.email,
          }),
        });
        const data = (await response.json().catch(() => null)) as AppSessionResponse | null;

        if (!response.ok) {
          throw new Error(data?.error || "Không thể tạo phiên đăng nhập.");
        }

        const cachedSession = data?.profile
          ? {
              ...nextSession,
              profile: data.profile,
              manager: data.manager ?? null,
            }
          : nextSession;

        establishedSessionsRef.current.set(nextSession.token, cachedSession);
        saveSession(cachedSession);
        return cachedSession;
      })();

      inFlightSessionRequestsRef.current.set(nextSession.token, request);
      const releaseRequest = () => {
        if (inFlightSessionRequestsRef.current.get(nextSession.token) === request) {
          inFlightSessionRequestsRef.current.delete(nextSession.token);
        }
      };
      void request.then(releaseRequest, releaseRequest);

      return request;
    },
    [saveSession],
  );

  const value = useMemo(
    () => ({
      session,
      isSessionReady,
      saveSession,
      clearSession,
      establishAppSession,
    }),
    [clearSession, establishAppSession, isSessionReady, saveSession, session],
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
