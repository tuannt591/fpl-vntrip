"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/components/auth/auth-session-provider";
import { useNavigationFeedback } from "@/components/layout/navigation-feedback";

const protectedTabHrefs = new Set(["/h2h", "/chat"]);

function isPrimaryNavigationClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function useTabNavigation() {
  const router = useRouter();
  const { isSessionReady, session } = useAuthSession();
  const { startNavigation } = useNavigationFeedback();

  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string, active: boolean) => {
      if (active || !isPrimaryNavigationClick(event)) return;

      if (isSessionReady && !session && protectedTabHrefs.has(href)) {
        event.preventDefault();
        const loginHref = `/login?next=${encodeURIComponent(href)}`;
        startNavigation(loginHref);
        router.push(loginHref);
        return;
      }

      startNavigation(href);
    },
    [isSessionReady, router, session, startNavigation],
  );
}
