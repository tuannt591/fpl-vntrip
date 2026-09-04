"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/auth-session-provider";
import { CURRENT_PHASE, VNTRIP_LEAGUE_ID } from "@/lib/fpl-config";
import {
  loadFantasyLeaderboardData,
  loadManagerOptions,
  loadMatches,
} from "@/lib/tab-data";

const protectedRoutes = ["/h2h", "/chat"];

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
};

export function RoutePrefetcher() {
  const router = useRouter();
  const { isSessionReady, session } = useAuthSession();

  useEffect(() => {
    if (!isSessionReady || !session) return;

    const prefetchProtectedRoutes = () => {
      protectedRoutes.forEach((route) => router.prefetch(route));
      const connection = (navigator as Navigator & { connection?: NetworkInformation })
        .connection;
      if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
        return;
      }

      void loadFantasyLeaderboardData(VNTRIP_LEAGUE_ID, CURRENT_PHASE, 0).catch(() => {});
      void loadManagerOptions().catch(() => {});
      void loadMatches().catch(() => {});
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
