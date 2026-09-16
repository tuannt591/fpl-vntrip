"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  LeaderboardEntry,
  ManagerGameweekStatsData,
  ManagerWeeklyHistory,
} from "@/types/fantasy";

type ManagerWeeklyDetailProps = {
  managers: LeaderboardEntry[];
  stats: ManagerGameweekStatsData | null | undefined;
  selectedEntryId: number | null;
  onClose: () => void;
};

function ManagerAvatar({ manager }: { manager: LeaderboardEntry }) {
  if (manager.managerAvatar) {
    return (
      <Image
        src={manager.managerAvatar}
        alt=""
        width={44}
        height={44}
        unoptimized
        className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary ring-1 ring-primary/10"
    >
      {manager.manager.charAt(0).toLocaleUpperCase()}
    </span>
  );
}

function ManagerWeeklyChart({ weeks }: { weeks: ManagerWeeklyHistory[] }) {
  const visibleWeeks = weeks.slice(-8);
  if (visibleWeeks.length === 0) return null;

  const values = visibleWeeks.map((week) => week.points);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const chartCeiling = Math.ceil((highest + 4) / 10) * 10;
  const chartFloor = Math.min(0, Math.floor((lowest - 4) / 10) * 10);
  const chartRange = Math.max(chartCeiling - chartFloor, 10);
  const chartWidth = 340;
  const chartHeight = 164;
  const plot = { left: 34, right: 14, top: 22, bottom: 34 };
  const plotWidth = chartWidth - plot.left - plot.right;
  const plotHeight = chartHeight - plot.top - plot.bottom;
  const toY = (points: number) =>
    plot.top + ((chartCeiling - points) / chartRange) * plotHeight;
  const points = visibleWeeks.map((week, index) => ({
    ...week,
    x: visibleWeeks.length === 1
      ? plot.left + plotWidth / 2
      : plot.left + (index / (visibleWeeks.length - 1)) * plotWidth,
    y: toY(week.points),
  }));
  const linePath = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${points[0].x} ${toY(chartFloor)} L ${linePath.replaceAll(",", " ")} L ${points[points.length - 1].x} ${toY(chartFloor)} Z`;
  const ticks = [chartCeiling, Math.round((chartCeiling + chartFloor) / 2), chartFloor];

  return (
    <section aria-label="Biểu đồ điểm theo Gameweek">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black">Diễn biến điểm</h3>
          <p className="text-[10px] text-muted-foreground">{visibleWeeks.length} Gameweek gần nhất</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {lowest}–{highest} điểm
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-b from-primary/[0.08] via-transparent to-muted/[0.15] px-1 py-1">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto w-full" role="img" aria-label="Điểm manager theo Gameweek">
          <defs>
            <linearGradient id="manager-weekly-detail-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => {
            const y = toY(tick);
            return (
              <g key={tick}>
                <line x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} className="stroke-border/70" strokeWidth="1" />
                <text x={plot.left - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px] font-medium">{tick}</text>
              </g>
            );
          })}
          <path d={areaPath} fill="url(#manager-weekly-detail-area)" />
          <polyline points={linePath} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={point.gameweek}>
              <title>{`GW ${point.gameweek}: ${point.points} điểm`}</title>
              <circle cx={point.x} cy={point.y} r="5" className="fill-background stroke-primary" strokeWidth="2.5" />
              {(visibleWeeks.length <= 6 || index === 0 || index === points.length - 1) && (
                <text x={point.x} y={Math.max(point.y - 10, 14)} textAnchor="middle" className="fill-foreground text-[10px] font-black">{point.points}</text>
              )}
              <text x={point.x} y={chartHeight - 12} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">GW {point.gameweek}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function ManagerWeeklyHistoryTable({
  weeks,
  page,
  totalPages,
  onPageChange,
}: {
  weeks: ManagerWeeklyHistory[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const firstGameweek = weeks[0]?.gameweek;
  const lastGameweek = weeks[weeks.length - 1]?.gameweek;
  const rangeLabel = firstGameweek && lastGameweek
    ? firstGameweek === lastGameweek ? `GW ${firstGameweek}` : `GW ${firstGameweek}–${lastGameweek}`
    : "—";

  return (
    <section aria-label="Lịch sử điểm từng Gameweek">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black">Lịch sử Gameweek</h3>
          <p className="text-[10px] text-muted-foreground">Điểm đã trừ hit chuyển nhượng</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-0.5" aria-label="Chọn cụm Gameweek">
          <button type="button" aria-label="Xem các Gameweek cũ hơn" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-35">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span aria-live="polite" className="min-w-[60px] text-center font-mono text-[10px] font-black text-foreground">{rangeLabel}</span>
          <button type="button" aria-label="Xem các Gameweek mới hơn" disabled={page === 0} onClick={() => onPageChange(page - 1)} className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-35">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border">
        <div className="grid grid-cols-[42px_minmax(0,1fr)_44px] items-center gap-2 border-b bg-muted/35 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span>GW</span><span>Điểm</span><span className="text-right">Hạng</span>
        </div>
        {[...weeks].reverse().map((week) => (
          <div key={week.gameweek} className="grid min-h-10 grid-cols-[42px_minmax(0,1fr)_44px] items-center gap-2 border-b px-3 py-2 last:border-b-0">
            <span className="font-mono text-xs font-black">{week.gameweek}</span>
            <span className="min-w-0 font-mono text-sm font-black text-foreground">
              {week.points.toLocaleString()}
              {week.transferCost > 0 && <span className="ml-1.5 rounded bg-destructive/10 px-1 py-0.5 font-sans text-[9px] font-bold text-destructive">−{week.transferCost}</span>}
            </span>
            <span className="justify-self-end rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-black text-muted-foreground">#{week.leagueRank}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ManagerWeeklyDetail({ managers, stats, selectedEntryId, onClose }: ManagerWeeklyDetailProps) {
  const [page, setPage] = useState(0);
  const manager = managers.find((item) => item.entry === selectedEntryId) ?? null;
  const managerStats = manager ? stats?.managers.find((item) => item.entry === manager.entry) ?? null : null;
  const weeklyHistory = managerStats?.weeklyHistory ?? [];
  const totalPages = Math.max(Math.ceil(weeklyHistory.length / 8), 1);
  const visiblePage = Math.min(page, totalPages - 1);
  const start = Math.max(0, weeklyHistory.length - (visiblePage + 1) * 8);
  const pageWeeks = weeklyHistory.slice(start, weeklyHistory.length - visiblePage * 8);

  useEffect(() => setPage(0), [selectedEntryId]);

  if (!manager || !managerStats) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        bottomSheet
        overlayClassName="!bg-black/35 backdrop-blur-sm"
        onMobileSwipeDown={onClose}
        className="max-h-[86dvh] rounded-t-3xl border-x-0 border-b-0 max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[85dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <div className="shrink-0 border-b bg-gradient-to-br from-primary/[0.14] via-primary/[0.045] to-transparent px-4 pb-4 pt-0 sm:px-6 sm:pb-5 sm:pt-5">
          <div aria-hidden data-bottom-sheet-drag-handle className="flex h-8 w-full touch-none items-center justify-center sm:hidden"><span className="bottom-sheet-drag-indicator" /></div>
          <DialogHeader className="pr-9 text-left">
            <div className="flex min-w-0 items-center gap-2.5">
              <ManagerAvatar manager={manager} />
              <div className="min-w-0"><DialogTitle className="truncate">{manager.teamName}</DialogTitle><DialogDescription className="truncate">{manager.manager}</DialogDescription></div>
            </div>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-5">
          <ManagerWeeklyChart weeks={pageWeeks} />
          <ManagerWeeklyHistoryTable weeks={pageWeeks} page={visiblePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
