"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/auth-session-provider";
import { ChannelGate } from "@/components/chat/channel-gate";
import { ChatLoading } from "@/components/chat/chat-loading";
import { chatPageLayoutClassName } from "@/lib/page-layout";

export function ChatPage() {
  const router = useRouter();
  const { clearSession, isSessionReady, session } = useAuthSession();

  useEffect(() => {
    if (isSessionReady && !session) {
      router.replace("/login?next=%2Fchat");
    }
  }, [isSessionReady, router, session]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // Local session must still be cleared if the server session has expired.
    } finally {
      clearSession();
    }
  };

  if (!isSessionReady) {
    return (
      <main className={chatPageLayoutClassName}>
        <ChatLoading />
      </main>
    );
  }

  if (!session) {
    return (
      <main className={chatPageLayoutClassName}>
        <ChatLoading />
      </main>
    );
  }

  return (
    <main className={chatPageLayoutClassName}>
      <ChannelGate session={session} onLogout={handleLogout} />
    </main>
  );
}
