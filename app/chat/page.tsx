import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ChatPage } from "@/components/chat-page";
import { APP_SESSION_COOKIE, readAppSessionToken } from "@/lib/auth/app-session";

export const metadata: Metadata = {
  title: "Trò chuyện - FPL Vntrip",
  description: "Trò chuyện cùng cộng đồng Fantasy Premier League Vntrip.",
};

export default async function Chat() {
  const session = await readAppSessionToken(
    cookies().get(APP_SESSION_COOKIE)?.value,
  );

  if (!session) redirect("/login?next=%2Fchat");

  return <ChatPage />;
}
