import Link from "next/link";
import { Home } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChatBackButton({
  className,
}: {
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Quay lại trang chủ"
      title="Quay lại trang chủ"
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Home className="h-[18px] w-[18px]" />
    </Link>
  );
}
