import { ChatLoading as ChatLoadingSkeleton } from "@/components/chat/chat-loading";
import { chatPageLayoutClassName } from "@/lib/page-layout";

export default function ChatLoading() {
  return (
    <main className={chatPageLayoutClassName}>
      <ChatLoadingSkeleton />
    </main>
  );
}
