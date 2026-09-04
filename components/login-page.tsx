"use client";

import { useEffect, useRef, useState } from "react";

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
  const {
    clearSession,
    establishAppSession,
    isSessionReady,
    session,
  } = useAuthSession();
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
        await establishAppSession(session);
        window.location.replace(getSafeNextPath());
      } catch {
        clearSession();
      } finally {
        setIsRestoringSession(false);
      }
    };

    void restoreSession();
  }, [clearSession, establishAppSession, isSessionReady, session]);

  const handleAuthenticated = async (session: AuthSession) => {
    await establishAppSession(session);

    hasRestoredSession.current = true;
    window.location.replace(getSafeNextPath());
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
