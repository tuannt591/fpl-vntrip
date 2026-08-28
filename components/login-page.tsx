"use client";

import { useEffect, useState } from "react";

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
    : "/chat";
}

export function LoginPage() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const redirectAfterLogin = () => {
    window.location.replace(getSafeNextPath());
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const previousSession = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        const storedSession =
          window.localStorage.getItem(AUTH_STORAGE_KEY) || previousSession;

        if (!storedSession) return;

        const parsedSession = JSON.parse(storedSession) as Partial<AuthSession>;
        if (
          typeof parsedSession.token !== "string" ||
          typeof parsedSession.email !== "string"
        ) {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          return;
        }

        const session = parsedSession as AuthSession;
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: session.token,
            userId: session.userId,
            email: session.email,
          }),
        });

        if (!response.ok) throw new Error("Phiên đăng nhập đã hết hạn.");

        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        redirectAfterLogin();
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
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
      throw new Error(data?.error || "Không thể tạo phiên đăng nhập.");
    }
    if (!response.ok) throw new Error("Không thể tạo phiên đăng nhập.");

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    redirectAfterLogin();
  };

  if (isRestoringSession) {
    return <AuthLoading message="Đang kiểm tra phiên đăng nhập..." />;
  }

  return <EmailLogin onAuthenticated={handleAuthenticated} />;
}
