"use client";

import { useEffect, useState } from "react";

import { ChannelGate } from "@/components/chat/channel-gate";
import { AuthLoading } from "@/components/chat/auth-loading";
import { EmailLogin } from "@/components/chat/email-login";
import {
  AUTH_STORAGE_KEY,
  type AuthSession,
} from "@/components/chat/types";

function getSafeNextPath() {
  const nextPath = new URLSearchParams(window.location.search).get("next");
  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : null;
}

function redirectToNextPath() {
  const nextPath = getSafeNextPath();
  if (!nextPath) return false;
  window.location.replace(nextPath);
  return true;
}

export function ChatPage() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
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

            const response = await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: session.token,
                userId: session.userId,
                email: session.email,
              }),
            });

            if (response.status === 401) {
              const data = (await response.json().catch(() => null)) as
                | { error?: string }
                | null;
              throw new Error(
                data?.error || "Phiên Chat đã hết hạn. Vui lòng đăng nhập lại.",
              );
            }

            if (response.ok && redirectToNextPath()) return;
          } else {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthSession(null);
      } finally {
        setIsRestoringSession(false);
      }
    };

    void restoreSession();
  }, []);

  const handleAuthenticated = async (session: AuthSession) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: session.token,
        userId: session.userId,
        email: session.email,
      }),
    });

    if (response.status === 401) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(data?.error || "Không thể tạo phiên đăng nhập H2H.");
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setAuthSession(session);

    if (response.ok) redirectToNextPath();
  };

  const handleLogout = () => {
    void fetch("/api/auth/session", { method: "DELETE" });
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
