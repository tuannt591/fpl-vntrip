"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { MobileTabNav } from "@/components/layout/mobile-tab-nav";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");
  const isPrimaryRoute =
    pathname === "/" || pathname === "/h2h" || isChatRoute;

  useEffect(() => {
    if (!isChatRoute) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isChatRoute]);

  return (
    <div
      className={cn(
        isChatRoute ? "flex h-full flex-col overflow-hidden" : "h-full",
      )}
    >
      <RoutePrefetcher />
      <Navbar showPrimaryNavigation={isPrimaryRoute} />
      <div
        className={cn(
          isChatRoute
            ? "flex min-h-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"
            : isPrimaryRoute && "pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0",
        )}
      >
        {children}
      </div>
      {isPrimaryRoute && <MobileTabNav />}
    </div>
  );
}
