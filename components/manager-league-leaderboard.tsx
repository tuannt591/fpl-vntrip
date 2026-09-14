import Image from "next/image";
import { Trophy } from "lucide-react";

import type { LeaderboardEntry } from "@/types/fantasy";

type ManagerLeagueLeaderboardProps = {
  managers: LeaderboardEntry[];
  currentGameweek: number;
};

function getRankClass(rank: number) {
  if (rank === 1) return "bg-amber-400/20 text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200";
  if (rank === 2) return "bg-slate-400/15 text-slate-700 ring-1 ring-slate-400/25 dark:text-slate-200";
  if (rank === 3) return "bg-orange-500/15 text-orange-800 ring-1 ring-orange-500/25 dark:text-orange-200";
  return "bg-muted text-muted-foreground";
}

export function ManagerLeagueLeaderboard({
  managers,
  currentGameweek,
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
            className="grid grid-cols-[34px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b bg-muted/20 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-[42px_minmax(0,1fr)_76px_64px] sm:px-4 sm:text-[10px]"
          >
            <span>Hạng</span>
            <span>Manager</span>
            <span className="text-right">Total</span>
            <span className="text-right">GW</span>
          </div>

          {rankedManagers.map((manager) => (
            <div
              key={manager.entry}
              role="row"
              className="grid min-h-[61px] grid-cols-[34px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b px-3 py-2.5 last:border-b-0 sm:grid-cols-[42px_minmax(0,1fr)_76px_64px] sm:px-4"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[10px] font-black sm:h-8 sm:w-8 sm:text-xs ${getRankClass(manager.leagueRank)}`}
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
                  <p className="truncate text-xs font-semibold sm:text-sm">{manager.manager}</p>
                  <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{manager.teamName}</p>
                </div>
              </div>

              <p className="text-right font-mono text-sm font-black tracking-tight text-emerald-700 dark:text-emerald-400 sm:text-base">
                {manager.totalPoint.toLocaleString()}
              </p>
              <p className="text-right font-mono text-xs font-bold text-foreground sm:text-sm">
                {manager.eventTotal.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
