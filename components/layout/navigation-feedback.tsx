"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type NavigationFeedbackValue = {
  isNavigating: boolean;
  pendingHref: string | null;
  startNavigation: (href: string) => void;
};

const NavigationFeedbackContext = createContext<NavigationFeedbackValue | null>(null);

export function NavigationFeedbackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearPendingNavigation = useCallback(() => {
    setPendingHref(null);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearPendingNavigation();
  }, [clearPendingNavigation, pathname]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const startNavigation = useCallback(
    (href: string) => {
      if (href === pathname) return;

      setPendingHref(href);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      // A redirect or network failure must not leave the navigation UI stuck.
      timeoutRef.current = window.setTimeout(clearPendingNavigation, 8_000);
    },
    [clearPendingNavigation, pathname],
  );

  return (
    <NavigationFeedbackContext.Provider
      value={{
        isNavigating: pendingHref !== null,
        pendingHref,
        startNavigation,
      }}
    >
      {children}
    </NavigationFeedbackContext.Provider>
  );
}

export function useNavigationFeedback() {
  const context = useContext(NavigationFeedbackContext);
  if (!context) {
    throw new Error("useNavigationFeedback must be used within NavigationFeedbackProvider");
  }

  return context;
}
