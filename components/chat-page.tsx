"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/auth-session-provider";
import { ChannelGate } from "@/components/chat/channel-gate";
import { AuthLoading } from "@/components/chat/auth-loading";

const chatLayoutClassName =
  "flex min-h-0 flex-1 flex-col px-2 pt-2 sm:px-6 sm:pb-5 sm:pt-4 [&>section]:rounded-t-3xl [&>section]:border-x [&>section]:border-t sm:[&>section]:rounded-3xl sm:[&>section]:border";

export function ChatPage() {
  const router = useRouter();
  const { clearSession, isSessionReady, session } = useAuthSession();

  useEffect(() => {
    if (isSessionReady && !session) {
      router.replace("/login?next=%2Fchat");
    }
  }, [isSessionReady, router, session]);

  const handleLogout = () => {
    void fetch("/api/auth/session", { method: "DELETE" });
    clearSession();
  };

  if (!isSessionReady) {
    return (
      <main className={chatLayoutClassName}>
        <AuthLoading
          fullHeight
          message="Đang mở Chat..."
          showBackButton={false}
        />
      </main>
    );
  }

  if (!session) {
    return (
      <main className={chatLayoutClassName}>
        <AuthLoading
          fullHeight
          message="Đang chuyển đến trang đăng nhập..."
          showBackButton={false}
        />
      </main>
    );
  }

  return (
    <main className={chatLayoutClassName}>
      <ChannelGate session={session} onLogout={handleLogout} />
    </main>
  );
}
