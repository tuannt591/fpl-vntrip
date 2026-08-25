import { Loader2 } from "lucide-react";

import { ChatBackButton } from "@/components/chat/chat-back-button";

export function AuthLoading({
  message = "Đang kiểm tra phiên đăng nhập...",
}: {
  message?: string;
}) {
  return (
    <section
      role="status"
      aria-label={message}
      className="relative mx-auto flex min-h-[100dvh] max-w-5xl items-center justify-center bg-card px-5 text-center sm:h-[calc(100dvh-2.25rem)] sm:min-h-0 sm:rounded-3xl sm:border"
    >
      <ChatBackButton className="absolute left-3 top-3 sm:left-4 sm:top-4" />
      <div className="flex flex-col items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </section>
  );
}
