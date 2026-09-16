"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from "next/image";
import { ChevronDown, ChevronRight, RefreshCw, Search, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ManagerAccordionList } from './ui/manager-accordion-list';
import { ManagerLeagueLeaderboard } from './manager-league-leaderboard';
import { useAuthSession } from "@/components/auth/auth-session-provider";
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
  ManagerGameweekStatsData,
  WeeklyTeamResult,
} from '@/types/fantasy';
import { VNTRIP_LEAGUE_ID, CURRENT_PHASE } from '@/lib/fpl-config';
import { primaryPageContainerClassName } from "@/lib/page-layout";
import {
  getCachedFantasyLeaderboardData,
  loadFantasyLeaderboardData,
} from "@/lib/tab-data";

type TeamFilter = "all" | "Vinno" | "Americano";
type HomeTab = "teams" | "managers";

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

type TeamHistoryWeek = WeeklyTeamResult & {
  gw: number;
  opponent: WeeklyTeamResult | null;
};

function getTeamResultPresentation(result: WeeklyTeamResult['result']) {
  if (result === 'win') {
    return {
      label: 'Thắng',
      shortLabel: 'W',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      markerClass: 'bg-emerald-500',
    };
  }
  if (result === 'loss') {
    return {
      label: 'Thua',
      shortLabel: 'L',
      badgeClass: 'bg-destructive/10 text-destructive',
      markerClass: 'bg-destructive',
    };
  }
  return {
    label: 'Hòa',
    shortLabel: 'D',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    markerClass: 'bg-amber-500',
  };
}

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
  const { session } = useAuthSession();
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
  const [managerGameweekStats, setManagerGameweekStats] = useState<ManagerGameweekStatsData | null>(
    () => initialData?.managerGameweekStats ?? null,
  );
  const [selectedTeamDialog, setSelectedTeamDialog] = useState<string | null>(null);
  const [expandedTeamWeek, setExpandedTeamWeek] = useState<number | null>(null);
  const [isScenarioOpen, setIsScenarioOpen] = useState(false);
  const [selectedScenarioTeam, setSelectedScenarioTeam] = useState<string | null>(null);
  const [showAllScenarioPlayers, setShowAllScenarioPlayers] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("teams");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [managerQuery, setManagerQuery] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(() => Boolean(initialData));
  const forceReloadRef = useRef(false);

  const reloadData = () => {
    forceReloadRef.current = true;
    setReloadKey(prev => prev + 1);
    setSelectedGW(0);
  };

  const selectHomeTab = (tab: HomeTab) => {
    setActiveTab(tab);
    if (tab === "managers") {
      setSelectedGW(0);
      setSelectedTeamDialog(null);
      setIsScenarioOpen(false);
    }
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
      setManagerGameweekStats(result.managerGameweekStats ?? null);
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

  const selectedTeamWeeks = useMemo<TeamHistoryWeek[]>(() => {
    if (!selectedTeamDialog || !teamWeeklyData) return [];

    return [...teamWeeklyData.weeklyResults]
      .reverse()
      .flatMap((week) => {
        const team = week.teams.find((item) => item.name === selectedTeamDialog);
        if (!team) return [];

        return [{
          ...team,
          gw: week.gw,
          opponent: week.teams.find((item) => item.name !== selectedTeamDialog) ?? null,
        }];
      });
  }, [selectedTeamDialog, teamWeeklyData]);
  const selectedTeamSummary = useMemo(() => {
    const totalPoints = selectedTeamWeeks.reduce((sum, week) => sum + week.points, 0);

    return {
      totalPoints,
      averagePoints: selectedTeamWeeks.length
        ? Math.round(totalPoints / selectedTeamWeeks.length)
        : 0,
      form: selectedTeamWeeks.slice(0, 5),
    };
  }, [selectedTeamWeeks]);
  const managersByEntryId = useMemo(
    () => new Map(leaderboardData.map((entry) => [entry.entry, entry])),
    [leaderboardData],
  );
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
  const activeScenarioTeam =
    teamLiveScenarios.find((team) => team.name === selectedScenarioTeam) ??
    teamLiveScenarios[0] ??
    null;
  const activeScenarioTeamIndex = Math.max(
    0,
    teamLiveScenarios.findIndex((team) => team.name === activeScenarioTeam?.name),
  );
  const visibleScenarioPlayers = activeScenarioTeam
    ? (showAllScenarioPlayers
      ? activeScenarioTeam.players
      : activeScenarioTeam.players.slice(0, 4))
    : [];
  const closeScenario = () => {
    setIsScenarioOpen(false);
    setSelectedScenarioTeam(null);
    setShowAllScenarioPlayers(false);
  };

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
              {activeTab === "teams" ? (
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
              ) : (
                <span className="inline-flex h-9 items-center rounded-xl border bg-background px-2.5 font-mono text-sm font-bold shadow-sm">
                  GW {currentGW || "—"}
                </span>
              )}
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
          <div
            role="tablist"
            aria-label="Chế độ bảng xếp hạng"
            className="relative mb-4 grid grid-cols-2 rounded-xl border border-primary/20 bg-primary/[0.08] p-1 text-sm font-semibold"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg bg-primary shadow-sm shadow-primary/20 transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{
                width: "calc((100% - 0.5rem) / 2)",
                transform: `translateX(${activeTab === "managers" ? 100 : 0}%)`,
              }}
            />
            {([
              ["teams", "Teams"],
              ["managers", "Managers"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => selectHomeTab(tab)}
                className={`relative z-10 h-9 rounded-lg transition-colors duration-200 motion-reduce:transition-none ${activeTab === tab
                  ? "text-primary-foreground"
                  : "text-primary/65 hover:text-primary"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
          {isLoading && !hasLoadedData ? (
            <FantasyLeaderboardContentSkeleton activeTab={activeTab} />
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

              {activeTab === "teams" && teamStats.length > 0 && currentLeagueId === VNTRIP_LEAGUE_ID && (
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
                          className="h-7 rounded-lg border-sky-600 bg-sky-600 px-2 text-[10px] font-bold text-white shadow-sm hover:border-sky-700 hover:bg-sky-700 hover:text-white dark:border-sky-500 dark:bg-sky-500 dark:hover:border-sky-400 dark:hover:bg-sky-400 sm:px-2.5 sm:text-xs"
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
                        <div
                          key={team.name}
                          className={`relative min-w-0 bg-gradient-to-br p-3 text-left sm:p-4 ${colors?.surface || "from-muted/60 to-transparent"}`}
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
                          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold sm:text-xs">
                            {record ? (
                              <>
                                <span className="font-mono">
                                  <span className="text-emerald-600 dark:text-emerald-400">{record.wins}W</span>
                                  <span className="mx-1 text-muted-foreground">·</span>
                                  <span className="text-amber-600 dark:text-amber-400">{record.mid}H</span>
                                  <span className="mx-1 text-muted-foreground">·</span>
                                  <span className="text-destructive">{record.losses}L</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedTeamWeek(null);
                                    setSelectedTeamDialog(shortName);
                                  }}
                                  aria-label={`Xem lịch sử đối đầu của ${team.name}`}
                                  title="Xem lịch sử đối đầu"
                                  className="-mr-1 inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md px-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:text-xs"
                                >
                                  Lịch sử
                                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Chưa có đối đầu</span>
                            )}
                          </div>
                        </div>
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

              {activeTab === "teams" ? (
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
              ) : (
                <ManagerLeagueLeaderboard
                  managers={leaderboardData}
                  currentGameweek={currentGW}
                  myEntryId={session?.manager?.entryId}
                  managerGameweekStats={managerGameweekStats}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isScenarioOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsScenarioOpen(true);
            return;
          }
          closeScenario();
        }}
      >
        <DialogContent
          bottomSheet
          overlayClassName="!bg-black/35 backdrop-blur-sm"
          onMobileSwipeDown={closeScenario}
          className="max-h-[78dvh] rounded-t-3xl border-x-0 border-b-0 max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[85dvh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
        >
          <div className="shrink-0 border-b bg-background/95 px-4 pb-3 pt-0 backdrop-blur sm:px-6 sm:pb-4 sm:pt-5">
            <div
              aria-hidden="true"
              data-bottom-sheet-drag-handle
              className="flex h-8 w-full touch-none items-center justify-center sm:hidden"
            >
              <span className="bottom-sheet-drag-indicator" />
            </div>
            <DialogHeader className="pr-9 text-left">
              <DialogTitle>Cầu thủ còn lại & xác suất</DialogTitle>
              <DialogDescription>
                GW {selectedGameweek} · Chỉ tính các cầu thủ còn fixture chưa bắt đầu.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">
            {comebackAnalysis && (
              <section className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black">Xác suất thắng GW</h3>
                  <span className="rounded-full bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                    Ước tính
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  {teamLiveScenarios.slice(0, 2).flatMap((team, index) => {
                    const teamSummary = (
                      <div key={team.name} className={index === 1 ? "min-w-0 text-right" : "min-w-0"}>
                        <p className={`truncate text-xs font-black ${TEAM_COLORS[team.name]?.text ?? "text-foreground"}`}>
                          {team.name}
                        </p>
                        <p className="mt-0.5 font-mono text-2xl font-black tracking-tight">
                          {Math.round((comebackAnalysis.winChances[team.name] ?? 0) * 100)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">thắng</p>
                      </div>
                    );

                    return index === 1
                      ? [
                        <span key="draw-chance" className="rounded-full border bg-background px-2 py-1 text-center text-[10px] font-bold text-muted-foreground">
                          {Math.round(comebackAnalysis.drawChance * 100)}% hòa
                        </span>,
                        teamSummary,
                      ]
                      : [teamSummary];
                  })}
                </div>
              </section>
            )}

            {teamLiveScenarios.length > 0 && (
              <div
                role="tablist"
                aria-label="Chọn đội để xem cầu thủ còn lại"
                className="relative grid grid-cols-2 rounded-xl bg-muted p-1"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%_-_0.5rem)_/_2)] rounded-lg bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{ transform: `translateX(${activeScenarioTeamIndex * 100}%)` }}
                />
                {teamLiveScenarios.map((team) => {
                  const isActive = activeScenarioTeam?.name === team.name;

                  return (
                    <button
                      key={team.name}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setSelectedScenarioTeam(team.name);
                        setShowAllScenarioPlayers(false);
                      }}
                      className={`relative z-10 min-w-0 rounded-lg px-3 py-2 text-xs font-black transition-colors duration-200 motion-reduce:transition-none ${isActive ? "" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <span className={`truncate ${isActive ? TEAM_COLORS[team.name]?.text ?? "text-foreground" : ""}`}>
                        {team.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeScenarioTeam && (
              <section className="rounded-2xl border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={`truncate text-sm font-black ${TEAM_COLORS[activeScenarioTeam.name]?.text ?? "text-foreground"}`}>
                      {activeScenarioTeam.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Cầu thủ còn fixture
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                    {activeScenarioTeam.remainingScoringSlots} lượt chưa đá
                  </span>
                </div>

                {activeScenarioTeam.players.length > 0 ? (
                  <>
                    <ul className="mt-3 divide-y rounded-xl border bg-muted/20 px-3">
                      {visibleScenarioPlayers.map((player) => (
                        <li key={player.element} className="flex items-center justify-between gap-3 py-2.5">
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
                    {activeScenarioTeam.players.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowAllScenarioPlayers((showAll) => !showAll)}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        {showAllScenarioPlayers
                          ? "Thu gọn danh sách"
                          : `Xem thêm ${activeScenarioTeam.players.length - 4} cầu thủ`}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="mt-3 rounded-xl bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">
                    Không còn suất tính điểm chưa đá.
                  </p>
                )}
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Weekly Dialog */}
      <Dialog
        open={!!selectedTeamDialog}
        onOpenChange={(open) => {
          if (!open) {
            setExpandedTeamWeek(null);
            setSelectedTeamDialog(null);
          }
        }}
      >
        <DialogContent
          bottomSheet
          overlayClassName="!bg-black/40 backdrop-blur-sm"
          onMobileSwipeDown={() => {
            setExpandedTeamWeek(null)
            setSelectedTeamDialog(null)
          }}
          className="flex max-h-[88dvh] max-w-none flex-col gap-0 overflow-hidden rounded-t-[1.75rem] border-x-0 border-b-0 p-0 shadow-2xl max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] [&>button]:right-4 [&>button]:top-4 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-background/85 [&>button]:p-1 [&>button]:shadow-sm sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border"
        >
          <div className="shrink-0 border-b bg-background/95 px-4 pb-3 pt-0 backdrop-blur sm:px-6 sm:pt-5">
            <div
              aria-hidden="true"
              data-bottom-sheet-drag-handle
              className="flex h-8 w-full touch-none items-center justify-center sm:hidden"
            >
              <span className="bottom-sheet-drag-indicator" />
            </div>
            <DialogHeader className="pr-10 text-left">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${selectedTeamDialog ? TEAM_COLORS[selectedTeamDialog]?.bg : 'bg-muted'} ${selectedTeamDialog ? TEAM_COLORS[selectedTeamDialog]?.text : 'text-foreground'}`}
                >
                  {selectedTeamDialog?.charAt(0)}
                </span>
                <div className="min-w-0">
                  <DialogTitle className={`truncate text-lg font-black tracking-tight ${selectedTeamDialog ? TEAM_COLORS[selectedTeamDialog]?.text : ''}`}>
                    {selectedTeamDialog}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs">
                    Thành tích đối đầu theo từng Gameweek
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
            <section
              className={`mt-4 overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ${selectedTeamDialog ? TEAM_COLORS[selectedTeamDialog]?.surface : 'from-muted/70 to-transparent'} ${selectedTeamDialog ? TEAM_COLORS[selectedTeamDialog]?.border : 'border-border'}`}
              aria-label="Tóm tắt thành tích"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Thành tích đối đầu
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedTeamWeeks.length > 0
                      ? `GW ${teamWeeklyData?.winLossStartGW ?? 1} – GW ${selectedTeamWeeks[0].gw}`
                      : 'Chưa có Gameweek hoàn tất'}
                  </p>
                </div>
                <span className="rounded-full border bg-background/80 px-2.5 py-1 font-mono text-[10px] font-bold text-muted-foreground shadow-sm">
                  {selectedTeamWeeks.length} GW
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-3 divide-x overflow-hidden rounded-xl border bg-background/75 shadow-sm">
                <div className="px-2 py-2.5 text-center">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Thắng</dt>
                  <dd className="mt-0.5 font-mono text-2xl font-black text-emerald-700 dark:text-emerald-300">{selectedTeamRecord?.wins ?? 0}</dd>
                </div>
                <div className="px-2 py-2.5 text-center">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Hòa</dt>
                  <dd className="mt-0.5 font-mono text-2xl font-black text-amber-700 dark:text-amber-300">{selectedTeamRecord?.mid ?? 0}</dd>
                </div>
                <div className="px-2 py-2.5 text-center">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-destructive">Thua</dt>
                  <dd className="mt-0.5 font-mono text-2xl font-black text-destructive">{selectedTeamRecord?.losses ?? 0}</dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Phong độ 5 GW gần nhất</p>
                  <div className="mt-1.5 flex items-center gap-1.5" aria-label="Phong độ 5 Gameweek gần nhất">
                    {selectedTeamSummary.form.length > 0 ? (
                      selectedTeamSummary.form.map((week) => {
                        const result = getTeamResultPresentation(week.result);
                        return (
                          <span
                            key={week.gw}
                            title={`GW ${week.gw}: ${result.label}`}
                            className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black ${result.badgeClass}`}
                          >
                            {result.shortLabel}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground">Chưa có dữ liệu</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-base font-black text-foreground">{selectedTeamSummary.averagePoints}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">điểm TB/GW</p>
                </div>
              </div>
            </section>

            <section className="mt-5" aria-labelledby="team-history-heading">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 id="team-history-heading" className="text-sm font-black">Lịch sử đối đầu</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Mới nhất hiển thị trước · chạm để xem điểm từng manager</p>
                </div>
              </div>

              {selectedTeamWeeks.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center">
                  <p className="text-sm font-semibold">Chưa có kết quả đối đầu</p>
                  <p className="mt-1 text-xs text-muted-foreground">Kết quả sẽ xuất hiện sau khi dữ liệu Gameweek được tổng hợp.</p>
                </div>
              ) : (
                <ol className="space-y-2.5">
                  {selectedTeamWeeks.map((week) => {
                    const result = getTeamResultPresentation(week.result);
                    const opponent = week.opponent;
                    const pointDifference = opponent ? week.points - opponent.points : null;
                    const isExpanded = expandedTeamWeek === week.gw;
                    const matchupTeams = opponent
                      ? [
                        { name: selectedTeamDialog ?? week.name, points: week.points, members: week.members },
                        { name: opponent.name, points: opponent.points, members: opponent.members },
                      ]
                      : [{ name: selectedTeamDialog ?? week.name, points: week.points, members: week.members }];

                    return (
                      <li key={week.gw}>
                        <article className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                          <button
                            type="button"
                            onClick={() => setExpandedTeamWeek(isExpanded ? null : week.gw)}
                            aria-expanded={isExpanded}
                            aria-controls={`team-week-details-${week.gw}`}
                            className="relative block w-full p-3.5 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                          >
                            <span className={`absolute bottom-0 left-0 top-0 w-1 ${result.markerClass}`} aria-hidden />
                            <div className="flex items-center justify-between gap-3 pl-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-muted-foreground">GW {week.gw}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${result.badgeClass}`}>{result.label}</span>
                              </div>
                              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden />
                            </div>

                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 pl-1.5">
                              <div className="min-w-0">
                                <p className={`truncate text-[11px] font-bold ${selectedTeamDialog ? TEAM_COLORS[selectedTeamDialog]?.text : 'text-foreground'}`}>{selectedTeamDialog}</p>
                                <p className="mt-0.5 font-mono text-2xl font-black tracking-tight">{week.points.toLocaleString()}</p>
                              </div>
                              <span className="rounded-full border bg-muted/50 px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground">VS</span>
                              <div className="min-w-0 text-right">
                                <p className={`truncate text-[11px] font-bold ${opponent ? TEAM_COLORS[opponent.name]?.text : 'text-muted-foreground'}`}>{opponent?.name ?? '—'}</p>
                                <p className="mt-0.5 font-mono text-2xl font-black tracking-tight text-muted-foreground">{opponent?.points.toLocaleString() ?? '—'}</p>
                              </div>
                            </div>

                            <p className="mt-2 pl-1.5 text-[11px] font-semibold text-muted-foreground">
                              {pointDifference === null
                                ? 'Chưa có dữ liệu đội đối thủ'
                                : pointDifference === 0
                                  ? 'Hai đội bằng điểm'
                                  : pointDifference > 0
                                    ? `Hơn ${pointDifference.toLocaleString()} điểm`
                                    : `Kém ${Math.abs(pointDifference).toLocaleString()} điểm`}
                            </p>
                          </button>

                          {isExpanded && (
                            <div id={`team-week-details-${week.gw}`} className="border-t bg-muted/20 p-3.5">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Điểm từng manager</p>
                              <div className={`grid gap-2 ${matchupTeams.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                                {matchupTeams.map((team) => {
                                  const teamColors = TEAM_COLORS[team.name];

                                  return (
                                    <section key={team.name} className="overflow-hidden rounded-xl border bg-background">
                                      <header className="flex items-center justify-between gap-2 border-b bg-muted/30 px-2.5 py-2">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                          <span className={`h-2 w-2 shrink-0 rounded-full ${teamColors?.bar ?? 'bg-primary'}`} aria-hidden />
                                          <p className={`truncate text-xs font-black ${teamColors?.text ?? 'text-foreground'}`}>{team.name}</p>
                                        </div>
                                        <span className="shrink-0 rounded-md bg-background px-1.5 py-0.5 font-mono text-[10px] font-black text-foreground shadow-sm">
                                          {team.points}
                                        </span>
                                      </header>
                                      <ul className="divide-y">
                                        {team.members.map((member) => {
                                          const manager = managersByEntryId.get(member.entryId);
                                          const managerName = manager?.manager ?? `Manager #${member.entryId}`;

                                          return (
                                            <li key={member.entryId} className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1.5">
                                              {manager?.managerAvatar ? (
                                                <Image
                                                  src={manager.managerAvatar}
                                                  alt={managerName}
                                                  width={24}
                                                  height={24}
                                                  unoptimized
                                                  className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                                                />
                                              ) : (
                                                <span
                                                  aria-hidden="true"
                                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-black text-muted-foreground ring-1 ring-border"
                                                >
                                                  {managerName.charAt(0).toLocaleUpperCase()}
                                                </span>
                                              )}
                                              <span className="min-w-0">
                                                <span className="block truncate text-[11px] font-semibold leading-tight text-foreground">
                                                  {manager?.teamName ?? `Đội #${member.entryId}`}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[9px] leading-none text-muted-foreground">
                                                  {managerName}
                                                </span>
                                              </span>
                                              <span className="min-w-7 rounded-md bg-muted px-1.5 py-0.5 text-center font-mono text-[10px] font-black text-foreground">
                                                {member.points}
                                              </span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </section>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </article>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
