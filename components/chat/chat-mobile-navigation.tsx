"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, MessageCircle, Swords, Trophy } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTabNavigation } from "@/components/layout/use-tab-navigation";

const mobileNavigationItems = [
  { href: "/", label: "Bảng xếp hạng", description: "Theo dõi thứ hạng", icon: Trophy },
  { href: "/h2h", label: "H2H Arena", description: "So tài cùng đồng đội", icon: Swords },
  { href: "/chat", label: "Trò chuyện", description: "Kênh FPL Vntrip", icon: MessageCircle },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileChatNavigation() {
  const pathname = usePathname();
  const handleTabNavigation = useTabNavigation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở điều hướng"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <DialogContent className="left-0 right-0 top-auto bottom-0 w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-[1.75rem] border-x-0 border-b-0 bg-background/95 p-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] md:hidden [&>button]:right-4 [&>button]:top-4 [&>button]:rounded-full [&>button]:bg-muted [&>button]:p-1">
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
        <nav aria-label="Điều hướng chính" className="space-y-1 p-3">
          {mobileNavigationItems.map(({ href, label, description, icon: Icon }) => {
            const active = isActivePath(pathname, href);

            if (active) {
              return (
                <div
                  key={href}
                  aria-current="page"
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-primary px-3 text-primary-foreground"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-primary-foreground/80">{description}</span>
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={(event) => {
                  setOpen(false);
                  handleTabNavigation(event, href, active);
                }}
                className="flex min-h-14 items-center gap-3 rounded-2xl px-3 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
