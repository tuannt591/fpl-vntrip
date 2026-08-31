import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { primaryPageContainerClassName } from "@/lib/page-layout";

const managerRows = [0, 1, 2, 3, 4, 5, 6] as const;

export function FantasyLeaderboardContentSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Đang tải bảng xếp hạng</span>
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/35 px-3 py-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <div className="relative grid grid-cols-2 divide-x">
          {[0, 1].map((index) => (
            <div key={index} className="space-y-3 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton className="mx-auto h-9 w-16" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
          <Skeleton className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex gap-2 border-b bg-muted/35 p-2">
          <Skeleton className="h-8 flex-1 rounded-xl sm:max-w-[17rem]" />
          <Skeleton className="hidden h-8 w-48 rounded-xl md:block" />
        </div>
        <div className="flex items-center gap-2 border-b bg-background/90 px-2 py-2 sm:px-3">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-16 sm:w-20" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-16 sm:w-20 md:w-24" />
          <Skeleton className="h-3 w-10 sm:w-12" />
          <Skeleton className="h-3 w-4" />
        </div>
        <div className="divide-y">
          {managerRows.map((index) => (
            <div key={index} className="flex items-center gap-2 px-2 py-3 sm:px-3">
              <Skeleton className="h-7 w-7 rounded-lg sm:h-8 sm:w-8" />
              <Skeleton className="h-7 w-16 sm:w-20" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-16 sm:w-20 md:w-24" />
              <Skeleton className="h-8 w-10 sm:w-12" />
              <Skeleton className="h-8 w-4" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function FantasyLeaderboardLoadingSkeleton() {
  return (
    <div className={`${primaryPageContainerClassName} py-4`}>
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card/80 p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-16 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <FantasyLeaderboardContentSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
