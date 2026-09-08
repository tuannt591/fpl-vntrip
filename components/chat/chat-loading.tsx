import { Paperclip, Send } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { MobileChatNavigation } from "@/components/chat/chat-mobile-navigation";

const messageSkeletons = [
  { side: "left", width: "w-52 sm:w-72" },
  { side: "right", width: "w-44 sm:w-60" },
  { side: "left", width: "w-64 sm:w-80" },
] as const;

export function ChatLoading() {
  return (
    <section
      role="status"
      aria-label="Đang đồng bộ cuộc trò chuyện"
      className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden bg-card md:rounded-3xl md:border md:shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] md:dark:shadow-[0_24px_70px_-35px_rgba(0,0,0,0.8)]"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>

      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2.5 md:h-[76px] md:gap-3 md:px-5">
        <MobileChatNavigation />
        <Skeleton className="h-8 w-8 shrink-0 rounded-full md:h-10 md:w-10" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-36 rounded-full" />
          <Skeleton className="h-2.5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </header>

      <div className="flex flex-1 flex-col overflow-hidden bg-muted/15 px-4 py-6 sm:px-6">
        <div className="mx-auto mb-8 flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Đang đồng bộ tin nhắn...
        </div>

        <div className="space-y-7">
          {messageSkeletons.map((message, index) => (
            <div
              key={`${message.side}-${index}`}
              className={`flex items-end gap-2.5 ${
                message.side === "right" ? "justify-end" : "justify-start"
              }`}
            >
              {message.side === "left" && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
              <div
                className={`${message.width} space-y-2 rounded-2xl px-4 py-3 ${
                  message.side === "right"
                    ? "rounded-br-md bg-primary/15"
                    : "rounded-bl-md bg-muted"
                }`}
              >
                <Skeleton className="h-2.5 w-full rounded-full bg-foreground/10" />
                <Skeleton className="h-2.5 w-3/4 rounded-full bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="flex min-h-[76px] shrink-0 items-center gap-3 border-t bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground/40">
          <Paperclip className="h-5 w-5" />
        </div>
        <Skeleton className="h-11 flex-1 rounded-2xl" />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary/50">
          <Send className="h-4 w-4" />
        </div>
      </footer>

      <span className="sr-only">Đang tải kênh và đồng bộ tin nhắn.</span>
    </section>
  );
}
