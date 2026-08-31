import { Skeleton } from "@/components/ui/skeleton";

const skeletonCards = [0, 1] as const;

export function H2HMatchesSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">Đang tải các trận H2H</span>
      {skeletonCards.map((index) => (
        <section key={index} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-7" />
            </div>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-7" />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function H2HLoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="w-full space-y-5"
    >
      <span className="sr-only">Đang tải H2H Arena</span>
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-muted/55 py-2.5">
          {([0, 1, 2] as const).map((index) => (
            <div key={index} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-5 w-7" />
              <Skeleton className="h-2.5 w-9" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <H2HMatchesSkeleton />
      </section>
    </div>
  );
}
