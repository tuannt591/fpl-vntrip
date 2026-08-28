import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
    <main className="container mx-auto min-h-[100dvh] max-w-2xl px-3 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-0 sm:px-4">
      <div className="mb-4 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Về bảng xếp hạng"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-medium text-muted-foreground">FPL Vntrip</p>
            <h1 className="text-lg font-black tracking-tight">H2H</h1>
          </div>
      </div>

      <H2HPanel />
    </main>
  );
}
