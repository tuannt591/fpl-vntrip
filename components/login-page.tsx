"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/auth-session-provider";
import { AuthLoading } from "@/components/chat/auth-loading";
import { EmailLogin } from "@/components/chat/email-login";
import { type AuthSession } from "@/components/chat/types";

function getSafeNextPath() {
  const nextPath = new URLSearchParams(window.location.search).get("next");
  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/chat";
}

export function LoginPage() {
  const router = useRouter();
  const { clearSession, isSessionReady, saveSession, session } = useAuthSession();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const hasRestoredSession = useRef(false);

  useEffect(() => {
    if (!isSessionReady) return;

    if (!session || hasRestoredSession.current) {
      setIsRestoringSession(false);
      return;
    }

    hasRestoredSession.current = true;
    const restoreSession = async () => {
      try {
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

        saveSession(session);
        router.replace(getSafeNextPath());
      } catch {
        clearSession();
      } finally {
        setIsRestoringSession(false);
      }
    };

    void restoreSession();
  }, [clearSession, isSessionReady, router, saveSession, session]);

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

    hasRestoredSession.current = true;
    saveSession(session);
    router.replace(getSafeNextPath());
  };

  if (!isSessionReady || isRestoringSession) {
    return (
      <AuthLoading
        message="Đang kiểm tra phiên đăng nhập..."
        showBackButton={false}
      />
    );
  }

  return <EmailLogin onAuthenticated={handleAuthenticated} />;
}
