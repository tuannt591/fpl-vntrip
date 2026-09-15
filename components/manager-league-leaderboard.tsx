import Image from "next/image";
import { Trophy } from "lucide-react";

import type { LeaderboardEntry } from "@/types/fantasy";

type ManagerLeagueLeaderboardProps = {
  managers: LeaderboardEntry[];
  currentGameweek: number;
  myEntryId?: number;
};

function getRankClass(rank: number, isLast: boolean) {
  if (rank === 1) return "bg-amber-400/20 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200";
  if (isLast) return "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/25 dark:text-rose-300";
  return "bg-muted text-muted-foreground";
}

function getRowClass(rank: number, isLast: boolean) {
  if (rank === 1) return "border-l-2 border-l-amber-500 bg-amber-500/[0.07] dark:bg-amber-500/[0.1]";
  if (isLast) return "border-l-2 border-l-rose-500 bg-rose-500/[0.06] dark:bg-rose-500/[0.1]";
  return "";
}

export function ManagerLeagueLeaderboard({
  managers,
  currentGameweek,
  myEntryId,
}: ManagerLeagueLeaderboardProps) {
  const rankedManagers = [...managers].sort(
    (first, second) => first.leagueRank - second.leagueRank,
  );

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black tracking-tight sm:text-base">Bảng xếp hạng manager</h2>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              Theo tổng điểm mùa · {rankedManagers.length} manager
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-background px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground shadow-sm sm:text-xs">
          GW {currentGameweek}
        </span>
      </div>

      {rankedManagers.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu manager.
        </p>
      ) : (
        <div role="table" aria-label="Bảng xếp hạng manager theo tổng điểm">
          <div
            role="row"
            className="grid grid-cols-[34px_minmax(0,1fr)_44px_56px] items-center gap-2 border-b bg-muted/20 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-[42px_minmax(0,1fr)_64px_76px] sm:px-4 sm:text-[10px]"
          >
            <span>Hạng</span>
            <span>Manager</span>
            <span className="text-right">GW</span>
            <span className="text-right">Total</span>
          </div>

          {rankedManagers.map((manager, index) => {
            const isLast = index === rankedManagers.length - 1;
            const isMe = myEntryId === manager.entry;

            return (
              <div
                key={manager.entry}
                role="row"
                aria-label={isMe ? `${manager.teamName}, manager của bạn` : undefined}
                className={`grid min-h-[61px] grid-cols-[34px_minmax(0,1fr)_44px_56px] items-center gap-2 border-b px-3 py-2.5 last:border-b-0 sm:grid-cols-[42px_minmax(0,1fr)_64px_76px] sm:px-4 ${isMe ? "border-l-2 border-l-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]" : getRowClass(manager.leagueRank, isLast)}`}
              >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[10px] font-black sm:h-8 sm:w-8 sm:text-xs ${getRankClass(manager.leagueRank, isLast)}`}
                aria-label={`Hạng ${manager.leagueRank}`}
              >
                {manager.leagueRank}
              </span>

              <div className="flex min-w-0 items-center gap-2">
                {manager.managerAvatar ? (
                  <Image
                    src={manager.managerAvatar}
                    alt=""
                    width={32}
                    height={32}
                    className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border sm:h-8 sm:w-8"
                    unoptimized
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary ring-1 ring-primary/10 sm:h-8 sm:w-8"
                  >
                    {manager.manager.charAt(0).toLocaleUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-xs font-semibold sm:text-sm">{manager.teamName}</p>
                    {isMe && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary-foreground">
                        Bạn
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{manager.manager}</p>
                </div>
              </div>

              <p className="text-right font-mono text-xs font-bold text-foreground sm:text-sm">
                {manager.eventTotal.toLocaleString()}
              </p>
              <p className="text-right font-mono text-sm font-black tracking-tight text-emerald-700 dark:text-emerald-400 sm:text-base">
                {manager.totalPoint.toLocaleString()}
              </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
