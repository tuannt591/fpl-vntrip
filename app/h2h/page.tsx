import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { H2HPanel } from "@/components/h2h/h2h-panel";
import { APP_SESSION_COOKIE, readAppSessionToken } from "@/lib/auth/app-session";

export const metadata: Metadata = {
  title: "H2H Arena - FPL Vntrip",
  description:
    "Tạo nhóm Head-to-Head, so điểm gameweek và theo dõi thành tích FPL Vntrip.",
};

export default async function H2HPage() {
  const session = await readAppSessionToken(
    cookies().get(APP_SESSION_COOKIE)?.value,
  );

  if (!session) redirect("/login?next=%2Fh2h");

  return (
    <main className="container mx-auto max-w-2xl px-3 py-4 pb-0 sm:px-4 sm:pb-8">
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground">FPL Vntrip</p>
        <h1 className="text-lg font-black tracking-tight">H2H Arena</h1>
      </div>

      <H2HPanel />
    </main>
  );
}
