"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronRight, Crown, Medal } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  LeaderboardEntry,
  ManagerGameweekScore,
  ManagerGameweekStat,
  ManagerGameweekStatsData,
} from "@/types/fantasy";

type ManagerGameweekStatsProps = {
  managers: LeaderboardEntry[];
  stats: ManagerGameweekStatsData | null | undefined;
  myEntryId?: number;
  embedded?: boolean;
};

function ManagerAvatar({
  manager,
  size = "sm",
}: {
  manager: LeaderboardEntry;
  size?: "sm" | "lg";
}) {
  const dimension = size === "lg" ? 44 : 32;
  const className = size === "lg" ? "h-11 w-11" : "h-7 w-7 sm:h-8 sm:w-8";

  if (manager.managerAvatar) {
    return (
      <Image
        src={manager.managerAvatar}
        alt=""
        width={dimension}
        height={dimension}
        unoptimized
        className={`shrink-0 rounded-full object-cover ring-1 ring-border ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary ring-1 ring-primary/10 ${className} ${size === "lg" ? "text-sm" : "text-[10px]"}`}
    >
      {manager.manager.charAt(0).toLocaleUpperCase()}
    </span>
  );
}

function WeeksList({
  weeks,
  emptyLabel,
  tone,
}: {
  weeks: ManagerGameweekScore[];
  emptyLabel: string;
  tone: "first" | "last";
}) {
  if (weeks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  const isFirst = tone === "first";

  return (
    <ul className="space-y-2">
      {[...weeks]
        .sort((first, second) => second.gameweek - first.gameweek)
        .map((week) => (
          <li
            key={`${week.gameweek}-${week.points}`}
            className={cn(
              "relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border px-3 py-2.5",
              isFirst
                ? "border-amber-500/20 bg-amber-500/[0.055]"
                : "border-border bg-muted/25",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute bottom-0 left-0 top-0 w-1",
                isFirst ? "bg-amber-500" : "bg-muted-foreground/35",
              )}
            />
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-xs font-black text-muted-foreground shadow-sm">
                GW {week.gameweek}
              </span>
              {week.shared && (
                <span className="truncate rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                  Đồng điểm
                </span>
              )}
            </div>
            <span className="shrink-0 font-mono text-base font-black tracking-tight">
              {week.points.toLocaleString()} điểm
            </span>
          </li>
        ))}
    </ul>
  );
}

function RecordValue({
  label,
  score,
  weeks,
  tone,
}: {
  label: string;
  score: number | null;
  weeks: ManagerGameweekScore[];
  tone: "high" | "low";
}) {
  const weekLabel = weeks.length
    ? weeks.map((week) => `GW ${week.gameweek}`).join(" · ")
    : "—";

  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        tone === "high"
          ? "border-emerald-500/20 bg-emerald-500/[0.055]"
          : "border-border bg-muted/25",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-black tracking-tight text-foreground">
        {score === null ? "—" : `${score.toLocaleString()} điểm`}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{weekLabel}</p>
    </div>
  );
}

export function ManagerGameweekStats({
  managers,
  stats,
  myEntryId,
  embedded = false,
}: ManagerGameweekStatsProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  const statsByEntry = useMemo(
    () => new Map((stats?.managers ?? []).map((manager) => [manager.entry, manager])),
    [stats],
  );
  const rankedManagers = useMemo(() => {
    return managers
      .filter((manager) => statsByEntry.has(manager.entry))
      .sort((first, second) => {
        const firstStats = statsByEntry.get(first.entry)!;
        const secondStats = statsByEntry.get(second.entry)!;
        const firstWeeks = secondStats.firstWeeks.length - firstStats.firstWeeks.length;
        if (firstWeeks !== 0) return firstWeeks;

        const lastWeeks = firstStats.lastWeeks.length - secondStats.lastWeeks.length;
        if (lastWeeks !== 0) return lastWeeks;
        return first.teamName.localeCompare(second.teamName, "vi");
      });
  }, [managers, statsByEntry]);
  const selectedManager = managers.find((manager) => manager.entry === selectedEntryId) ?? null;
  const selectedStats = selectedManager
    ? statsByEntry.get(selectedManager.entry) ?? null
    : null;
  const highestFirstWeekCount = Math.max(
    ...rankedManagers.map((manager) => statsByEntry.get(manager.entry)!.firstWeeks.length),
    0,
  );
  const highestLastWeekCount = Math.max(
    ...rankedManagers.map((manager) => statsByEntry.get(manager.entry)!.lastWeeks.length),
    0,
  );

  if (!stats || rankedManagers.length === 0) return null;

  const rangeLabel =
    stats.toGameweek > 0
      ? `GW ${stats.fromGameweek}–${stats.toGameweek}`
      : "Chưa có Gameweek hoàn tất";

  const table = (
    <div role="table" aria-label="Thống kê Nhất tuần và Bét tuần của manager">
      <div
        role="row"
        className="grid grid-cols-[30px_minmax(0,1fr)_62px_62px_18px] items-center gap-2 border-b bg-muted/20 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:grid-cols-[42px_minmax(0,1fr)_100px_100px_24px] sm:px-4 sm:text-[10px]"
      >
        <span>Hạng</span>
        <span>Manager</span>
        <span role="columnheader" className="text-right whitespace-nowrap">
          Nhất tuần <span className="block normal-case sm:inline">(lần)</span>
        </span>
        <span role="columnheader" className="text-right whitespace-nowrap">
          Bét tuần <span className="block normal-case sm:inline">(lần)</span>
        </span>
        <span aria-hidden />
      </div>

      {rankedManagers.map((manager, index) => {
        const managerStats = statsByEntry.get(manager.entry)!;
        const isMe = myEntryId === manager.entry;
        const isFirstWeekLeader =
          managerStats.firstWeeks.length > 0 &&
          managerStats.firstWeeks.length === highestFirstWeekCount;
        const isLastWeekLeader =
          managerStats.lastWeeks.length > 0 &&
          managerStats.lastWeeks.length === highestLastWeekCount;

        return (
          <div key={manager.entry} role="row" className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => setSelectedEntryId(manager.entry)}
              className={cn(
                "group grid min-h-[60px] w-full grid-cols-[30px_minmax(0,1fr)_62px_62px_18px] items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:grid-cols-[42px_minmax(0,1fr)_100px_100px_24px] sm:px-4",
                isMe && "border-l-2 border-l-primary bg-primary/[0.07]",
                isFirstWeekLeader && !isMe && "bg-amber-500/[0.035]",
                isLastWeekLeader && !isFirstWeekLeader && !isMe && "bg-rose-500/[0.035]",
              )}
              aria-label={`Xem thống kê Gameweek của ${manager.teamName}`}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-black text-muted-foreground sm:h-7 sm:w-7 sm:text-sm",
                  isFirstWeekLeader && "bg-amber-400/20 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200",
                  isLastWeekLeader && !isFirstWeekLeader && "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300",
                )}
                title={
                  isFirstWeekLeader
                    ? "Nhiều Nhất tuần nhất"
                    : isLastWeekLeader
                      ? "Nhiều Bét tuần nhất"
                      : undefined
                }
              >
                {isFirstWeekLeader ? <Crown className="h-3.5 w-3.5" aria-label="Nhiều Nhất tuần nhất" /> : index + 1}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <ManagerAvatar manager={manager} />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-xs font-semibold sm:text-sm">{manager.teamName}</span>
                    {isMe && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary-foreground">
                        Bạn
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground sm:text-xs">
                    {manager.manager}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "justify-self-end rounded-md px-1.5 py-0.5 text-right font-mono text-sm font-black sm:text-base",
                  isFirstWeekLeader && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                )}
                title={isFirstWeekLeader ? "Nhiều Nhất tuần nhất" : undefined}
              >
                {managerStats.firstWeeks.length}
              </span>
              <span
                className={cn(
                  "justify-self-end rounded-md px-1.5 py-0.5 text-right font-mono text-sm font-black text-muted-foreground sm:text-base",
                  isLastWeekLeader && "bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300",
                )}
                title={isLastWeekLeader ? "Nhiều Bét tuần nhất" : undefined}
              >
                {managerStats.lastWeeks.length}
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground sm:h-6 sm:w-6">
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {embedded ? table : (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Medal className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black tracking-tight sm:text-base">Thống kê Gameweek</h2>
              <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                {rankedManagers.length} manager · {rangeLabel}
              </p>
            </div>
          </div>
          <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
            Chạm vào manager để xem chi tiết
          </span>
        </div>
        {table}
      </section>
      )}

      <Dialog
        open={Boolean(selectedManager && selectedStats)}
        onOpenChange={(open) => {
          if (!open) setSelectedEntryId(null);
        }}
      >
        <DialogContent
          bottomSheet
          overlayClassName="!bg-black/35 backdrop-blur-sm"
          onMobileSwipeDown={() => setSelectedEntryId(null)}
          className="max-h-[86dvh] rounded-t-3xl border-x-0 border-b-0 max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[85dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
        >
          {selectedManager && selectedStats && (
            <>
              <div className="shrink-0 border-b bg-gradient-to-br from-primary/[0.14] via-primary/[0.045] to-transparent px-4 pb-4 pt-0 sm:px-6 sm:pb-5 sm:pt-5">
                <div
                  aria-hidden="true"
                  data-bottom-sheet-drag-handle
                  className="flex h-8 w-full touch-none items-center justify-center sm:hidden"
                >
                  <span className="bottom-sheet-drag-indicator" />
                </div>
                <DialogHeader className="pr-9 text-left">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ManagerAvatar manager={selectedManager} size="lg" />
                    <div className="min-w-0">
                      <DialogTitle className="truncate">{selectedManager.teamName}</DialogTitle>
                      <DialogDescription className="truncate">
                        {selectedManager.manager} · {rangeLabel}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-2 gap-3">
                  <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
                    <div className="flex items-center justify-between gap-2 text-amber-700 dark:text-amber-300">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Nhất tuần</span>
                      <Crown className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="mt-2 font-mono text-3xl font-black tracking-tight text-foreground">
                      {selectedStats.firstWeeks.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">lần dẫn đầu GW</p>
                  </section>
                  <section className="rounded-2xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Bét tuần</p>
                    <p className="mt-2 font-mono text-3xl font-black tracking-tight text-foreground">
                      {selectedStats.lastWeeks.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">lần có điểm thấp nhất</p>
                  </section>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <RecordValue
                    label="Điểm cao nhất"
                    score={selectedStats.highestScore}
                    weeks={selectedStats.highestScoreWeeks}
                    tone="high"
                  />
                  <RecordValue
                    label="Điểm thấp nhất"
                    score={selectedStats.lowestScore}
                    weeks={selectedStats.lowestScoreWeeks}
                    tone="low"
                  />
                </div>

                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black">Các tuần nhất</h3>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      {selectedStats.firstWeeks.length} lần
                    </span>
                  </div>
                  <WeeksList
                    weeks={selectedStats.firstWeeks}
                    emptyLabel="Chưa có Gameweek nào đứng nhất."
                    tone="first"
                  />
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black">Các tuần bét</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {selectedStats.lastWeeks.length} lần
                    </span>
                  </div>
                  <WeeksList
                    weeks={selectedStats.lastWeeks}
                    emptyLabel="Chưa có Gameweek nào có điểm thấp nhất."
                    tone="last"
                  />
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
