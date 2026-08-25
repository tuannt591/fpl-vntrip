import type { Metadata } from "next";

import { ChatPage } from "@/components/chat-page";

export const metadata: Metadata = {
  title: "Trò chuyện - FPL Vntrip",
  description: "Trò chuyện cùng cộng đồng Fantasy Premier League Vntrip.",
};

export default function Chat() {
  return <ChatPage />;
}
