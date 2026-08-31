"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/auth-session-provider";

const protectedRoutes = ["/h2h", "/chat"];

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function RoutePrefetcher() {
  const router = useRouter();
  const { isSessionReady, session } = useAuthSession();

  useEffect(() => {
    if (!isSessionReady || !session) return;

    const prefetchProtectedRoutes = () => {
      protectedRoutes.forEach((route) => router.prefetch(route));
    };
    const idleWindow = window as IdleCallbackWindow;

    if (idleWindow.requestIdleCallback) {
      const idleCallbackId = idleWindow.requestIdleCallback(prefetchProtectedRoutes, {
        timeout: 2_000,
      });

      return () => idleWindow.cancelIdleCallback?.(idleCallbackId);
    }

    const timeoutId = window.setTimeout(prefetchProtectedRoutes, 300);
    return () => window.clearTimeout(timeoutId);
  }, [isSessionReady, router, session]);

  return null;
}
