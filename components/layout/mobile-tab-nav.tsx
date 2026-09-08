"use client";

import Link from "next/link";
import { MessageCircle, Swords, Trophy } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

import { useNavigationFeedback } from "@/components/layout/navigation-feedback";
import { useTabNavigation } from "@/components/layout/use-tab-navigation";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/", label: "BXH", icon: Trophy },
  { href: "/h2h", label: "H2H", icon: Swords },
  { href: "/chat", label: "Chat", icon: MessageCircle },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabNav() {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRoutes = useRef(new Set<string>());
  const { pendingHref } = useNavigationFeedback();
  const handleTabNavigation = useTabNavigation();
  const selectedHref = pendingHref ?? pathname;
  const selectedIndex = navigationItems.findIndex(({ href }) =>
    isActivePath(selectedHref, href),
  );

  const prefetchRoute = useCallback(
    (href: string) => {
      if (href === pathname || prefetchedRoutes.current.has(href)) return;

      prefetchedRoutes.current.add(href);
      router.prefetch(href);
    },
    [pathname, router],
  );

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.65rem)] pt-1.5 md:hidden"
    >
      <div className="mx-auto max-w-[17.5rem] rounded-[1.7rem] border border-border/50 bg-background/50 p-1 shadow-[0_10px_28px_hsl(var(--foreground)/0.14)] backdrop-blur-2xl dark:border-border/70">
        <div className="relative grid h-10 grid-cols-3">
          {selectedIndex >= 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-[1.35rem] bg-primary shadow-[0_4px_12px_hsl(var(--primary)/0.28)] transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(${selectedIndex * 100}%)` }}
            />
          )}
          {navigationItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            const pending = pendingHref === href;
            const selected = active || pending;

            return (
              <Link
                key={href}
                href={href}
                scroll={false}
                aria-busy={pending || undefined}
                aria-current={active ? "page" : undefined}
                onClick={(event) => handleTabNavigation(event, href, active)}
                onFocus={() => prefetchRoute(href)}
                onPointerEnter={() => prefetchRoute(href)}
                onTouchStart={() => prefetchRoute(href)}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1 rounded-[1.35rem] px-1.5 text-[11px] font-semibold transition-[color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  selected
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none",
                    selected && "scale-110",
                  )}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
