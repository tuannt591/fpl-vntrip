"use client";

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ManagerAccordionList } from './ui/manager-accordion-list';
import { Button } from './ui/button';
import {
  FantasyLeaderboardContentSkeleton,
  FantasyLeaderboardLoadingSkeleton,
} from "@/components/fantasy-leaderboard-loading";
import { LeaderboardEntry, TeamConfig, TeamStats, TeamWeeklyData } from '@/types/fantasy';
import { VNTRIP_LEAGUE_ID, CURRENT_PHASE } from '@/lib/fpl-config';
import { primaryPageContainerClassName } from "@/lib/page-layout";

type FantasyLeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentGW: number;
  teamWeeklyData?: TeamWeeklyData | null;
  error?: string;
};

type TeamFilter = "all" | "Vinno" | "Americano";

const TEAM_FILTERS: ReadonlyArray<readonly [TeamFilter, string]> = [
  ["all", "Tất cả"],
  ["Vinno", "Vinno"],
  ["Americano", "Americano"],
];

const fetchFantasyVntripData = async (
  leagueId: string,
  phase: number = 1,
  gw: number = 0,
  signal?: AbortSignal,
): Promise<FantasyLeaderboardResponse> => {
  const params = new URLSearchParams({
    leagueId,
    phase: phase.toString(),
  });

  if (gw > 0) {
    params.append('gw', gw.toString());
  }

  const response = await fetch(`/api/fantasy-vntrip?${params}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal,
  });
  const data = (await response.json().catch(() => null)) as
    | FantasyLeaderboardResponse
    | null;

  if (!response.ok || !data || !Array.isArray(data.entries)) {
    throw new Error(
      data?.error || `Không thể tải bảng xếp hạng (mã ${response.status}).`,
    );
  }

  return data;
};


// Team Config
const TEAMS: TeamConfig[] = [
  {
    name: "Vinno",
    entries: [2673641, 2799618, 2673983, 3620408],
    color: "text-red-500"
  },
  {
    name: "Americano",
    entries: [1672330, 1640295, 3781088, 4849930],
    color: "text-violet-500"
  }
];

// Calculate team stats based on current GW points
const calculateTeamStats = (entries: LeaderboardEntry[]): TeamStats[] => {
  return TEAMS.map(team => {
    const teamMembers = entries.filter(entry => team.entries.includes(entry.entry));
    const totalPoints = teamMembers.reduce((sum, member) => sum + member.gwPoint, 0);
    const averagePoints = teamMembers.length > 0 ? Math.round(totalPoints / teamMembers.length) : 0;
    const bestRank = teamMembers.length > 0 ? Math.min(...teamMembers.map(member => member.rank)) : 0;
    const totalPlayed = teamMembers.reduce((sum, member) => sum + (member.playedInfo?.played ?? 0), 0);
    const totalPlayedMax = teamMembers.reduce((sum, member) => sum + (member.playedInfo?.total ?? 0), 0);

    return {
      name: team.name,
      color: team.color,
      totalPoints,
      averagePoints,
      bestRank,
      memberCount: teamMembers.length,
      members: teamMembers.sort((a, b) => a.rank - b.rank),
      totalPlayed,
      totalPlayedMax,
    };
  }).sort((a, b) => b.averagePoints - a.averagePoints);
};

// Team color mapping
const TEAM_COLORS: Record<string, {
  text: string;
  bg: string;
  border: string;
  bar: string;
  surface: string;
}> = {
  Vinno: {
    text: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    bar: "bg-red-500",
    surface: "from-red-500/[0.12] via-transparent to-transparent",
  },
  Americano: {
    text: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    bar: "bg-violet-500",
    surface: "from-violet-500/[0.12] via-transparent to-transparent",
  },
};

// Get team key name for lookups
const getTeamShortName = (fullName: string) => fullName;

export const FantasyLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedGW, setSelectedGW] = useState<number>(0);
  const [teamWeeklyData, setTeamWeeklyData] = useState<TeamWeeklyData | null>(null);
  const [selectedTeamDialog, setSelectedTeamDialog] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [managerQuery, setManagerQuery] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const leaderboardRequestRef = useRef<AbortController | null>(null);
  const currentLeagueId = VNTRIP_LEAGUE_ID;

  const reloadData = () => {
    setReloadKey(prev => prev + 1);
    setSelectedGW(0);
  };

  useEffect(() => {
    leaderboardRequestRef.current?.abort();
    const controller = new AbortController();
    leaderboardRequestRef.current = controller;

    const loadAllData = async () => {
      setIsLoading(true);
      setError(null);
      setSelectedTeamDialog(null);

      try {
        const result = await fetchFantasyVntripData(
          currentLeagueId,
          CURRENT_PHASE,
          selectedGW,
          controller.signal,
        );
        if (controller.signal.aborted) return;

        setLeaderboardData(result.entries);
        setCurrentGW(result.currentGW);
        setTeamStats(calculateTeamStats(result.entries));
        setTeamWeeklyData(result.teamWeeklyData ?? null);
        setHasLoadedData(true);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.',
        );
      } finally {
        if (leaderboardRequestRef.current === controller) {
          leaderboardRequestRef.current = null;
          setIsLoading(false);
        }
      }
    };

    void loadAllData();

    return () => {
      if (leaderboardRequestRef.current === controller) {
        leaderboardRequestRef.current = null;
      }
      controller.abort();
    };
  }, [currentLeagueId, reloadKey, selectedGW]);

  // Get record for selected team in dialog
  const selectedTeamRecord = selectedTeamDialog && teamWeeklyData
    ? teamWeeklyData.teamRecords[selectedTeamDialog]
    : null;

  // Get weekly list for selected team
  const selectedTeamWeeks = selectedTeamDialog && teamWeeklyData
    ? [...teamWeeklyData.weeklyResults].reverse().map(week => {
      const teamResult = week.teams.find(t => t.name === selectedTeamDialog);
      return { gw: week.gw, ...teamResult };
    }).filter(w => w.result)
    : [];
  const filteredLeaderboardData = leaderboardData.filter((entry) => {
    const matchesTeam = teamFilter === "all" || entry.team === teamFilter;
    const query = managerQuery.trim().toLocaleLowerCase();
    const matchesQuery =
      !query ||
      entry.manager.toLocaleLowerCase().includes(query) ||
      entry.teamName.toLocaleLowerCase().includes(query);

    return matchesTeam && matchesQuery;
  });
  const activeTeamFilterIndex = TEAM_FILTERS.findIndex(([filter]) => filter === teamFilter);
  const highestTeamPoints = Math.max(...teamStats.map((team) => team.totalPoints), 0);
  const teamPointGap =
    teamStats.length === 2
      ? Math.abs(teamStats[0].totalPoints - teamStats[1].totalPoints)
      : 0;

  if (isLoading && !hasLoadedData) {
    return <FantasyLeaderboardLoadingSkeleton />;
  }

  if (!hasLoadedData && error) {
    return (
      <div className={`${primaryPageContainerClassName} py-4`}>
        <Card className="mx-auto max-w-xl rounded-3xl border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={reloadData}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`${primaryPageContainerClassName} py-4`}>
      <Card className='border-none shadow-none bg-transparent'>
        <CardHeader className='px-0 pt-0'>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur sm:p-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Trophy className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  FPL Vntrip
                </p>
                <h1 className="text-lg font-black tracking-tight">Bảng xếp hạng</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-background px-2.5 text-xs font-semibold shadow-sm">
                <span className="text-muted-foreground">GW</span>
                {isLoading ? (
                  <span className="inline-block h-4 w-8 animate-pulse rounded bg-muted" />
                ) : (
                  <select
                    aria-label="Chọn Gameweek"
                    value={selectedGW || currentGW}
                    onChange={(event) => setSelectedGW(Number(event.target.value))}
                    className="min-w-11 bg-transparent font-mono text-sm font-bold outline-none"
                  >
                    {Array.from({ length: currentGW }, (_, index) => currentGW - index).map((gw) => (
                      <option key={gw} value={gw}>
                        {gw}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <button
                onClick={reloadData}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                aria-label="Làm mới bảng xếp hạng"
                title="Làm mới"
                type="button"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {isLoading ? (
            <FantasyLeaderboardContentSkeleton />
          ) : (
            <>
              {error && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.05] p-3 text-sm text-destructive">
                  <span>{error}</span>
                  <Button type="button" size="sm" variant="outline" onClick={reloadData}>
                    Thử lại
                  </Button>
                </div>
              )}

              {teamStats.length > 0 && currentLeagueId === VNTRIP_LEAGUE_ID && (
                <section className="mb-5 overflow-hidden rounded-3xl border bg-card shadow-[0_16px_34px_-30px_hsl(var(--foreground)/0.45)]">
                  <div className="flex items-center justify-between border-b bg-muted/35 px-3 py-2 text-xs sm:px-4">
                    <span className="font-semibold text-muted-foreground">Matchday scoreboard</span>
                    <span className="rounded-full bg-background px-2 py-0.5 font-mono font-bold text-foreground shadow-sm">
                      GW {selectedGW || currentGW}
                    </span>
                  </div>
                  <div className="relative grid grid-cols-2 divide-x">
                    {teamStats.map((team) => {
                      const shortName = getTeamShortName(team.name);
                      const record = teamWeeklyData?.teamRecords[shortName];
                      const colors = TEAM_COLORS[shortName];
                      const pointShare = highestTeamPoints
                        ? Math.max((team.totalPoints / highestTeamPoints) * 100, 8)
                        : 0;

                      return (
                        <button
                          key={team.name}
                          type="button"
                          disabled={!record}
                          onClick={() => setSelectedTeamDialog(shortName)}
                          className={`group relative min-w-0 bg-gradient-to-br p-3 text-left transition sm:p-4 ${colors?.surface || "from-muted/60 to-transparent"} ${record ? "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset" : "cursor-default"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-black tracking-tight sm:text-base ${colors?.text || team.color}`}>
                                {team.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                                Đã chơi {team.totalPlayed}/{team.totalPlayedMax}
                              </p>
                            </div>
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${colors?.bg || "bg-muted"} ${colors?.text || "text-foreground"}`}>
                              {team.name.charAt(0)}
                            </span>
                          </div>
                          <p className="mt-4 font-mono text-3xl font-black tracking-tight sm:text-4xl text-center">
                            {team.totalPoints.toLocaleString()}
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
                            <span
                              className={`block h-full rounded-full transition-[width] duration-500 ${colors?.bar || "bg-primary"}`}
                              style={{ width: `${pointShare}%` }}
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-1 text-[10px] font-semibold sm:text-xs">
                            {record ? (
                              <span className="font-mono">
                                <span className="text-emerald-600 dark:text-emerald-400">{record.wins}W</span>
                                <span className="mx-1 text-muted-foreground">·</span>
                                <span className="text-destructive">{record.losses}L</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Chưa có đối đầu</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {teamStats.length === 2 && (
                      <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background px-1.5 font-mono text-xs font-black shadow-sm">
                        {teamPointGap ? `+${teamPointGap}` : "="}
                      </span>
                    )}
                  </div>
                </section>
              )}

              <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex flex-col gap-2 border-b bg-muted/25 p-2 sm:flex-row sm:items-center sm:justify-between sm:px-3">
                  <div
                    role="tablist"
                    aria-label="Lọc theo đội"
                    className="relative grid grid-cols-3 rounded-xl bg-muted p-1 text-xs font-semibold"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
                      style={{
                        width: "calc((100% - 0.5rem) / 3)",
                        transform: `translateX(${activeTeamFilterIndex * 100}%)`,
                      }}
                    />
                    {TEAM_FILTERS.map(([filter, label]) => (
                      <button
                        key={filter}
                        type="button"
                        role="tab"
                        aria-selected={teamFilter === filter}
                        onClick={() => setTeamFilter(filter)}
                        className={`relative z-10 h-8 rounded-lg px-3 transition-colors duration-200 motion-reduce:transition-none ${teamFilter === filter ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="relative hidden w-full max-w-xs md:block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={managerQuery}
                      onChange={(event) => setManagerQuery(event.target.value)}
                      placeholder="Tìm manager hoặc đội..."
                      className="h-8 w-full rounded-xl border bg-background pl-8 pr-3 text-xs outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                    />
                  </label>
                </div>

                <div className="relative">
                  <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b bg-background/90 shadow-sm backdrop-blur md:top-0">
                    <div className="flex items-center gap-2 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-3 sm:text-xs">
                      <div className="w-8 text-center">#</div>
                      <div className="w-16 sm:w-20">Team</div>
                      <div className="min-w-0 flex-1">Manager</div>
                      <div className="w-16 text-center sm:w-20 md:w-24">(C)</div>
                      <div className="w-10 text-center sm:w-12">GW</div>
                      <div className="w-4" />
                    </div>
                  </div>

                  {filteredLeaderboardData.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Không tìm thấy manager phù hợp.
                    </div>
                  ) : (
                    <ManagerAccordionList managers={filteredLeaderboardData} />
                  )}
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>

      {/* Team Weekly Dialog */}
      <Dialog open={!!selectedTeamDialog} onOpenChange={(open) => !open && setSelectedTeamDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={`text-center ${selectedTeamDialog ? TEAM_COLORS[selectedTeamDialog]?.text : ''}`}>
              {selectedTeamDialog} Team
            </DialogTitle>
            <DialogDescription className="text-center">
              {selectedTeamRecord && (
                <span className="font-mono text-base">
                  <span className="text-green-600 font-bold">{selectedTeamRecord.wins} Wins</span>
                  {' · '}
                  <span className="text-red-500 font-bold">{selectedTeamRecord.losses} Losses</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="py-1.5 px-2 text-left font-semibold text-xs">GW</th>
                  <th className="py-1.5 px-2 text-center font-semibold text-xs">Points</th>
                  <th className="py-1.5 px-2 text-center font-semibold text-xs">Result</th>
                </tr>
              </thead>
              <tbody>
                {selectedTeamWeeks.map(week => (
                  <tr key={week.gw} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-1.5 px-2 font-medium text-xs">GW {week.gw}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-xs">{week.points}</td>
                    <td className="py-1.5 px-2 text-center">
                      {week.result === 'win' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                          🏆 Wins
                        </span>
                      )}
                      {week.result === 'loss' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                          Losses
                        </span>
                      )}
                      {week.result === 'mid' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs">
                          Draw
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
