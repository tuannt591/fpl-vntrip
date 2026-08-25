"use client";

import { useEffect, useState } from "react";

import { ChannelGate } from "@/components/chat/channel-gate";
import { AuthLoading } from "@/components/chat/auth-loading";
import { EmailLogin } from "@/components/chat/email-login";
import {
  AUTH_STORAGE_KEY,
  type AuthSession,
} from "@/components/chat/types";

export function ChatPage() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    try {
      const previousSession = window.sessionStorage.getItem(AUTH_STORAGE_KEY);

      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);

      const storedSession =
        window.localStorage.getItem(AUTH_STORAGE_KEY) || previousSession;

      if (storedSession) {
        const parsedSession = JSON.parse(storedSession) as Partial<AuthSession>;

        if (
          typeof parsedSession.token === "string" &&
          typeof parsedSession.email === "string"
        ) {
          const session = parsedSession as AuthSession;
          setAuthSession(session);
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        } else {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  const handleAuthenticated = (session: AuthSession) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setAuthSession(session);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
  };

  if (isRestoringSession) {
    return (
      <main className="min-h-[100dvh] w-full sm:px-6 sm:pb-5 sm:pt-4">
        <AuthLoading />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full sm:px-6 sm:pb-5 sm:pt-4">
      {authSession ? (
        <ChannelGate session={authSession} onLogout={handleLogout} />
      ) : (
        <EmailLogin onAuthenticated={handleAuthenticated} />
      )}
    </main>
  );
}
