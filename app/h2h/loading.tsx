import { H2HLoadingSkeleton } from "@/components/h2h/h2h-loading-skeleton";
import { primaryPageContainerClassName } from "@/lib/page-layout";

export default function H2HLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Đang mở H2H Arena"
      className={`${primaryPageContainerClassName} py-4 pb-0 sm:pb-8`}
    >
      <div className="mb-4 space-y-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-6 w-32 rounded bg-muted" />
      </div>
      <H2HLoadingSkeleton />
    </main>
  );
}
