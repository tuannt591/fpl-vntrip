"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ManagerAccordionList } from './ui/manager-accordion-list';
import { Button } from './ui/button';
import {
  FantasyLeaderboardContentSkeleton,
  FantasyLeaderboardLoadingSkeleton,
} from "@/components/fantasy-leaderboard-loading";
import {
  LeaderboardEntry,
  PlayerMatchStatus,
  TeamConfig,
  TeamStats,
  TeamWeeklyData,
} from '@/types/fantasy';
import { VNTRIP_LEAGUE_ID, CURRENT_PHASE } from '@/lib/fpl-config';
import { primaryPageContainerClassName } from "@/lib/page-layout";
import {
  getCachedFantasyLeaderboardData,
  loadFantasyLeaderboardData,
} from "@/lib/tab-data";

type TeamFilter = "all" | "Vinno" | "Americano";

const TEAM_FILTERS: ReadonlyArray<readonly [TeamFilter, string]> = [
  ["all", "Tất cả"],
  ["Vinno", "Vinno"],
  ["Americano", "Americano"],
];

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

type RemainingPlayer = {
  element: number;
  name: string;
  copies: number;
  captainCopies: number;
  effectiveWeight: number;
  estimatedPoints: number;
  availability: number;
  fixtureCount: number;
  fixtures: string[];
};

type TeamLiveScenario = {
  name: string;
  currentPoints: number;
  remainingScoringSlots: number;
  uniqueRemainingPlayers: number;
  players: RemainingPlayer[];
};

function hasNotStartedFixture(pick: LeaderboardEntry['picks'][number]) {
  return (pick.explain ?? []).some(
    (fixture: any) => fixture.match_status === PlayerMatchStatus.NOT_STARTED,
  );
}

function getRemainingFixtureNames(pick: LeaderboardEntry['picks'][number]) {
  return Array.from(
    new Set(
      (pick.explain ?? [])
        .filter((fixture: any) => fixture.match_status === PlayerMatchStatus.NOT_STARTED)
        .map((fixture: any) => fixture.fixture_name)
        .filter((name: unknown): name is string => typeof name === 'string'),
    ),
  );
}

function getRemainingFixtureCount(pick: LeaderboardEntry['picks'][number]) {
  return (pick.explain ?? []).filter(
    (fixture: any) => fixture.match_status === PlayerMatchStatus.NOT_STARTED,
  ).length;
}

function getEstimatedPoints(pick: LeaderboardEntry['picks'][number]) {
  const fixtureCount = Math.max(getRemainingFixtureCount(pick), 1);
  const form = pick.projection?.form ?? 0;
  const pointsPerGame = pick.projection?.pointsPerGame ?? 0;
  const availability = (pick.projection?.chanceOfPlaying ?? 100) / 100;
  const historicalAverage = form > 0 && pointsPerGame > 0
    ? form * 0.7 + pointsPerGame * 0.3
    : Math.max(form, pointsPerGame, 3);

  return Math.max(0.5, Math.min(historicalAverage, 10)) * fixtureCount * availability;
}

function getAvailability(pick: LeaderboardEntry['picks'][number]) {
  return Math.max(0, Math.min(pick.projection?.chanceOfPlaying ?? 100, 100)) / 100;
}

function calculateTeamLiveScenarios(entries: LeaderboardEntry[]): TeamLiveScenario[] {
  return TEAMS.map((team) => {
    const members = entries.filter((entry) => team.entries.includes(entry.entry));
    const playerMap = new Map<number, RemainingPlayer>();
    let remainingScoringSlots = 0;

    members.forEach((member) => {
      const isBenchBoost = member.activeChip === 'bboost';

      member.picks.forEach((pick) => {
        if (!hasNotStartedFixture(pick)) return;

        const canScore =
          isBenchBoost || pick.position <= 11 || pick.isAutoSubIn === true;

        if (!canScore) return;

        remainingScoringSlots += 1;
        const existing = playerMap.get(pick.element);
        const fixtures = getRemainingFixtureNames(pick);
        const fixtureCount = getRemainingFixtureCount(pick);
        const estimatedPoints = getEstimatedPoints(pick);
        const availability = getAvailability(pick);
        const effectiveWeight = pick.multiplier || 1;

        if (existing) {
          existing.copies += 1;
          if (pick.is_captain) existing.captainCopies += 1;
          existing.effectiveWeight += effectiveWeight;
          existing.fixtures = Array.from(new Set([...existing.fixtures, ...fixtures]));
          return;
        }

        playerMap.set(pick.element, {
          element: pick.element,
          name: pick.elementName ?? 'Không rõ cầu thủ',
          copies: 1,
          captainCopies: pick.is_captain ? 1 : 0,
          effectiveWeight,
          estimatedPoints,
          availability,
          fixtureCount,
          fixtures,
        });
      });
    });

    return {
      name: team.name,
      currentPoints: members.reduce((sum, member) => sum + member.gwPoint, 0),
      remainingScoringSlots,
      uniqueRemainingPlayers: playerMap.size,
      players: Array.from(playerMap.values()).sort(
        (a, b) => b.copies - a.copies || a.name.localeCompare(b.name),
      ),
    };
  });
}

type ComebackAnalysis = {
  winChances: Record<string, number>;
  drawChance: number;
};

function samplePoisson(lambda: number) {
  const limit = Math.exp(-Math.max(0, Math.min(lambda, 8)));
  let count = 0;
  let product = 1;

  do {
    count += 1;
    product *= Math.random();
  } while (product > limit && count < 20);

  return count - 1;
}

function samplePlayerPoints(player: RemainingPlayer) {
  if (Math.random() > player.availability) return 0;

  const expectedPerFixture = player.estimatedPoints /
    Math.max(player.fixtureCount * player.availability, 1);
  let total = 0;

  for (let fixture = 0; fixture < player.fixtureCount; fixture += 1) {
    // A small appearance base plus a high-variance attacking return component.
    const appearancePoints = Math.random() < 0.78 ? 2 : 1;
    const returnEvents = samplePoisson(Math.max(0, (expectedPerFixture - 2.2) / 4));
    const bonus = returnEvents > 0 && Math.random() < 0.42 ? Math.ceil(Math.random() * 2) : 0;
    total += appearancePoints + returnEvents * 4 + bonus;
  }

  return Math.min(total, 25 * player.fixtureCount);
}

function runComebackSimulation(teams: TeamLiveScenario[], trials = 10_000): ComebackAnalysis | null {
  if (teams.length !== 2) return null;

  const players = new Map<number, RemainingPlayer>();
  teams.forEach((team) => {
    team.players.forEach((player) => {
      if (!players.has(player.element)) players.set(player.element, player);
    });
  });

  const wins = teams.map(() => 0);
  let draws = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const sampledPoints = new Map<number, number>();
    players.forEach((player) => {
      sampledPoints.set(player.element, samplePlayerPoints(player));
    });

    const finalScores = teams.map((team) =>
      team.currentPoints + team.players.reduce(
        (sum, player) => sum + (sampledPoints.get(player.element) ?? 0) * player.effectiveWeight,
        0,
      ),
    );

    if (finalScores[0] === finalScores[1]) draws += 1;
    else if (finalScores[0] > finalScores[1]) wins[0] += 1;
    else wins[1] += 1;
  }

  const winChances: Record<string, number> = {};
  teams.forEach((team, index) => {
    winChances[team.name] = wins[index] / trials;
  });

  return {
    winChances,
    drawChance: draws / trials,
  };
}

export const FantasyLeaderboard = () => {
  const currentLeagueId = VNTRIP_LEAGUE_ID;
  const initialData = getCachedFantasyLeaderboardData(
    currentLeagueId,
    CURRENT_PHASE,
    0,
  )?.data;
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    () => initialData?.entries ?? [],
  );
  const [teamStats, setTeamStats] = useState<TeamStats[]>(
    () => (initialData ? calculateTeamStats(initialData.entries) : []),
  );
  const [currentGW, setCurrentGW] = useState<number>(() => initialData?.currentGW ?? 0);
  const [isLoading, setIsLoading] = useState(() => !initialData);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedGW, setSelectedGW] = useState<number>(0);
  const [teamWeeklyData, setTeamWeeklyData] = useState<TeamWeeklyData | null>(
    () => initialData?.teamWeeklyData ?? null,
  );
  const [selectedTeamDialog, setSelectedTeamDialog] = useState<string | null>(null);
  const [isScenarioOpen, setIsScenarioOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [managerQuery, setManagerQuery] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(() => Boolean(initialData));
  const forceReloadRef = useRef(false);

  const reloadData = () => {
    forceReloadRef.current = true;
    setReloadKey(prev => prev + 1);
    setSelectedGW(0);
  };

  useEffect(() => {
    let cancelled = false;
    const forceReload = forceReloadRef.current;
    forceReloadRef.current = false;
    const cached = getCachedFantasyLeaderboardData(
      currentLeagueId,
      CURRENT_PHASE,
      selectedGW,
    );

    const applyResult = (result: Awaited<ReturnType<typeof loadFantasyLeaderboardData>>) => {
      setLeaderboardData(result.entries);
      setCurrentGW(result.currentGW);
      setTeamStats(calculateTeamStats(result.entries));
      setTeamWeeklyData(result.teamWeeklyData ?? null);
      setHasLoadedData(true);
    };

    const loadAllData = async () => {
      if (cached) applyResult(cached.data);
      setIsLoading(!cached || forceReload);
      setError(null);
      setSelectedTeamDialog(null);

      try {
        const result = await loadFantasyLeaderboardData(
          currentLeagueId,
          CURRENT_PHASE,
          selectedGW,
          forceReload,
        );
        if (cancelled) return;
        applyResult(result);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.',
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadAllData();

    return () => {
      cancelled = true;
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
  const selectedGameweek = selectedGW || currentGW;
  const teamLiveScenarios = useMemo(
    () => calculateTeamLiveScenarios(leaderboardData),
    [leaderboardData],
  );
  const hasRemainingFixture = teamLiveScenarios.some(
    (team) => team.remainingScoringSlots > 0,
  );
  const canShowScenario =
    selectedGameweek === currentGW && hasRemainingFixture && teamLiveScenarios.length === 2;
  const comebackAnalysis = useMemo(
    () => (hasRemainingFixture ? runComebackSimulation(teamLiveScenarios) : null),
    [hasRemainingFixture, teamLiveScenarios],
  );

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
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/35 px-3 py-2 text-xs sm:px-4">
                    <span className="font-semibold text-muted-foreground">Matchday scoreboard</span>
                    <div className="flex items-center gap-1.5">
                      {canShowScenario && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setIsScenarioOpen(true)}
                          className="h-7 rounded-lg px-2 text-[10px] font-bold sm:px-2.5 sm:text-xs"
                        >
                          Phân tích
                        </Button>
                      )}
                      <span className="rounded-full bg-background px-2 py-0.5 font-mono font-bold text-foreground shadow-sm">
                        GW {selectedGameweek}
                      </span>
                    </div>
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

      <Dialog open={isScenarioOpen} onOpenChange={setIsScenarioOpen}>
        <DialogContent className="bottom-0 left-0 right-0 top-auto max-h-[85dvh] max-w-none translate-x-0 translate-y-0 gap-3 overflow-y-auto rounded-t-3xl border-x-0 border-b-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] sm:left-1/2 sm:top-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-muted sm:hidden" />
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>Cầu thủ còn lại & xác suất</DialogTitle>
            <DialogDescription>
              GW {selectedGameweek} · Dựa trên các cầu thủ còn fixture chưa bắt đầu.
            </DialogDescription>
          </DialogHeader>

          {comebackAnalysis && (
            <section className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black">Xác suất thắng GW</h3>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {teamLiveScenarios.map((team) => (
                  <div key={team.name} className="rounded-xl border bg-background p-3 text-center">
                    <p className={`truncate text-xs font-black ${TEAM_COLORS[team.name]?.text ?? "text-foreground"}`}>
                      {team.name}
                    </p>
                    <p className="mt-1 font-mono text-3xl font-black">
                      {Math.round((comebackAnalysis.winChances[team.name] ?? 0) * 100)}%
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">thắng</p>
                  </div>
                ))}
              </div>
              {comebackAnalysis.drawChance > 0 && (
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  Xác suất hòa: {Math.round(comebackAnalysis.drawChance * 100)}%
                </p>
              )}
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {teamLiveScenarios.map((team) => (
              <section key={team.name} className="rounded-2xl border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={`text-sm font-black ${TEAM_COLORS[team.name]?.text ?? "text-foreground"}`}>
                      {team.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {team.remainingScoringSlots} lượt chưa đá
                    </p>
                  </div>
                </div>

                {team.players.length > 0 ? (
                  <ul className="mt-3 divide-y rounded-xl border bg-muted/20 px-3">
                    {team.players.map((player) => (
                      <li key={player.element} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">
                            {player.name} <span className="font-mono text-muted-foreground">×{player.copies}</span>
                            {player.captainCopies > 0 && (
                              <span className="ml-1 text-amber-600 dark:text-amber-400">
                                C{player.captainCopies > 1 ? ` ×${player.captainCopies}` : ""}
                              </span>
                            )}
                          </p>
                          {player.fixtures.length > 0 && (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {player.fixtures.join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          chưa đá
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
                    Không còn suất tính điểm chưa đá.
                  </p>
                )}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
