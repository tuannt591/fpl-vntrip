import { AuthLoading } from "@/components/chat/auth-loading";

const chatLayoutClassName =
  "flex min-h-0 flex-1 flex-col px-2 pt-2 sm:px-6 sm:pb-5 sm:pt-4 [&>section]:rounded-t-3xl [&>section]:border-x [&>section]:border-t sm:[&>section]:rounded-3xl sm:[&>section]:border";

export default function ChatLoading() {
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
