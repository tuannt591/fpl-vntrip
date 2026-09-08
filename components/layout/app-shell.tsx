"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { MobileTabNav } from "@/components/layout/mobile-tab-nav";
import {
  NavigationFeedbackProvider,
  useNavigationFeedback,
} from "@/components/layout/navigation-feedback";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationFeedbackProvider>
      <AppShellContent>{children}</AppShellContent>
    </NavigationFeedbackProvider>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isNavigating } = useNavigationFeedback();
  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");
  const isLoginRoute = pathname === "/login";
  const isPrimaryRoute =
    pathname === "/" || pathname === "/h2h" || isChatRoute;
  const showMobileTabNav = isPrimaryRoute || isLoginRoute;

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
        isChatRoute
          ? "flex h-full flex-col overflow-hidden md:h-full"
          : "h-full",
      )}
    >
      <RoutePrefetcher />
      {isChatRoute ? (
        <div className="hidden md:block">
          <Navbar showPrimaryNavigation={isPrimaryRoute} />
        </div>
      ) : (
        <Navbar showPrimaryNavigation={isPrimaryRoute} />
      )}
      <div
        className={cn(
          isChatRoute
            ? "flex min-h-0 flex-1 flex-col"
            : showMobileTabNav && "pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0",
          "transition-opacity duration-150 motion-reduce:transition-none",
          isNavigating && "opacity-70",
        )}
      >
        {children}
      </div>
      {showMobileTabNav && !isChatRoute && <MobileTabNav />}
    </div>
  );
}
