import { Loader2 } from "lucide-react";

import { ChatBackButton } from "@/components/chat/chat-back-button";
import { cn } from "@/lib/utils";

export function AuthLoading({
  message = "Đang kiểm tra phiên đăng nhập...",
  fullHeight = false,
  showBackButton = true,
}: {
  message?: string;
  fullHeight?: boolean;
  showBackButton?: boolean;
}) {
  return (
    <section
      role="status"
      aria-label={message}
      className={cn(
        "relative mx-auto flex w-full max-w-5xl items-center justify-center bg-card px-5 text-center sm:rounded-3xl sm:border",
        fullHeight
          ? "min-h-0 flex-1"
          : "min-h-[100dvh] sm:h-[calc(100dvh-2.25rem)] sm:min-h-0",
      )}
    >
      {showBackButton && (
        <ChatBackButton className="absolute left-3 top-3 sm:left-4 sm:top-4" />
      )}
      <div className="flex flex-col items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </section>
  );
}
