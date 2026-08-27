import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { H2HPanel } from "@/components/h2h/h2h-panel";

export const metadata: Metadata = {
  title: "H2H Arena - FPL Vntrip",
  description:
    "Tạo nhóm Head-to-Head, so điểm gameweek và theo dõi thành tích FPL Vntrip.",
};

export default function H2HPage() {
  return (
    <main className="container mx-auto max-w-2xl px-3 pb-10 pt-0 sm:px-4">
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
