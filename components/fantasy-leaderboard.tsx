"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "./ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Cấu trúc dữ liệu từ API Fantasy Premier League
type APILeaderboardEntry = {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
  entry_name: string;
  has_played: boolean;
};

type APIResponse = {
  standings: {
    has_next: boolean;
    page: number;
    results: APILeaderboardEntry[];
  };
  league: {
    id: number;
    name: string;
    created: string;
    closed: boolean;
    max_entries: number | null;
    league_type: string;
    scoring: string;
    admin_entry: number | null;
    start_event: number;
    code_privacy: string;
    has_cup: boolean;
    cup_league: number | null;
    rank: number | null;
  };
  last_updated_data: string;
  current_event?: number;
};

type LeaderboardEntry = {
  rank: number;
  manager: string;
  teamName: string;
  gw: number;
  total: number;
  entry: number;
};

type TeamConfig = {
  name: string;
  entries: number[];
  color: string;
};

type TeamStats = {
  name: string;
  color: string;
  totalPoints: number;
  averagePoints: number;
  bestRank: number;
  memberCount: number;
  members: LeaderboardEntry[];
};

type Pick = {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
};

type Player = {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: number;
  team: number;
};

type PlayerData = {
  elements: Player[];
  teams: {
    id: number;
    name: string;
    short_name: string;
  }[];
  element_types: {
    id: number;
    singular_name: string;
    singular_name_short: string;
  }[];
};

type PicksData = {
  active_chip: string | null;
  automatic_subs: any[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    rank_sort: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: Pick[];
};

type LivePlayerData = {
  id: number;
  stats: {
    total_points: number;
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    own_goals: number;
    penalties_saved: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    bps: number;
  };
  explain: Array<{
    fixture: number;
    stats: Array<{
      identifier: string;
      points: number;
      value: number;
    }>;
  }>;
};

type LiveData = {
  elements: LivePlayerData[];
};

interface FantasyLeaderboardProps {
  leagueId?: string;
  pageId?: number;
  phase?: number;
}

// Constants
const VNTRIP_LEAGUE_ID = "1405297";

// Hàm để fetch dữ liệu live (điểm cầu thủ)
const fetchLiveData = async (eventId: number): Promise<LiveData | null> => {
  try {
    const params = new URLSearchParams({
      eventId: eventId.toString(),
    });

    const response = await fetch(`/api/fantasy-live?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LiveData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching live data:', error);
    return null;
  }
};

// Hàm để fetch dữ liệu player
const fetchPlayerData = async (): Promise<PlayerData | null> => {
  try {
    const response = await fetch('/api/fantasy-bootstrap', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PlayerData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching player data:', error);
    return null;
  }
};

// Hàm để fetch dữ liệu picks
const fetchPicksData = async (teamId: number, eventId: number): Promise<PicksData | null> => {
  try {
    const params = new URLSearchParams({
      teamId: teamId.toString(),
      eventId: eventId.toString(),
    });

    const response = await fetch(`/api/fantasy-picks?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PicksData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching picks data:', error);
    return null;
  }
};

// Hàm để fetch dữ liệu từ API route (giải quyết vấn đề CORS)
const fetchLeaderboardData = async (
  leagueId: string,
  pageId: number = 1,
  phase: number = 1
): Promise<{ entries: LeaderboardEntry[], leagueName: string, currentGW: number }> => {
  try {
    const params = new URLSearchParams({
      leagueId: leagueId,
      pageId: pageId.toString(),
      phase: phase.toString(),
    });

    const response = await fetch(`/api/fantasy-leaderboard?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: APIResponse = await response.json();

    // Chuyển đổi dữ liệu API sang format component
    const entries = data.standings.results.map((entry, index) => ({
      rank: entry.rank,
      manager: entry.player_name,
      teamName: entry.entry_name,
      gw: entry.event_total,
      total: entry.total,
      entry: entry.entry,
    }));

    return {
      entries,
      leagueName: data.league.name,
      currentGW: data.current_event || Math.max(...entries.map(entry => entry.gw))
    };
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    // Return empty data if API fails
    return {
      entries: [],
      leagueName: "Không thể tải dữ liệu league",
      currentGW: 0
    };
  }
};

// Cấu hình team
const TEAMS: TeamConfig[] = [
  {
    name: "87 Team",
    entries: [2195023, 6293111, 6291846],
    color: "bg-blue-500"
  },
  {
    name: "89 Team",
    entries: [4565469, 4550400, 5005626],
    color: "bg-green-500"
  },
  {
    name: "3T Team",
    entries: [6400474, 3024127, 6425684],
    color: "bg-purple-500"
  }
];

// Hàm tính toán thống kê team
const calculateTeamStats = (entries: LeaderboardEntry[]): TeamStats[] => {
  return TEAMS.map(team => {
    const teamMembers = entries.filter(entry => team.entries.includes(entry.entry));
    const totalPoints = teamMembers.reduce((sum, member) => sum + member.total, 0);
    const averagePoints = teamMembers.length > 0 ? Math.round(totalPoints / teamMembers.length) : 0;
    const bestRank = teamMembers.length > 0 ? Math.min(...teamMembers.map(member => member.rank)) : 0;

    return {
      name: team.name,
      color: team.color,
      totalPoints,
      averagePoints,
      bestRank,
      memberCount: teamMembers.length,
      members: teamMembers.sort((a, b) => a.rank - b.rank)
    };
  }).sort((a, b) => b.averagePoints - a.averagePoints);
};

// Hàm kiểm tra member thuộc team nào
const getTeamForEntry = (entryId: number): TeamConfig | null => {
  return TEAMS.find(team => team.entries.includes(entryId)) || null;
};

// Component hiển thị thông tin picks
const PicksDialog = ({
  teamId,
  eventId,
  managerName,
  teamName
}: {
  teamId: number;
  eventId: number;
  managerName: string;
  teamName: string;
}) => {
  const [picksData, setPicksData] = useState<PicksData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = async () => {
    setIsLoading(true);

    // Fetch picks, player data, and live data in parallel
    const [picks, players, live] = await Promise.all([
      fetchPicksData(teamId, eventId),
      fetchPlayerData(),
      fetchLiveData(eventId)
    ]);

    setPicksData(picks);
    setPlayerData(players);
    setLiveData(live);
    setIsLoading(false);
  };

  // Helper function to get player info
  const getPlayerInfo = (elementId: number) => {
    if (!playerData) return { name: `Cầu thủ #${elementId}`, position: '', team: '' };

    const player = playerData.elements.find(p => p.id === elementId);
    if (!player) return { name: `Cầu thủ #${elementId}`, position: '', team: '' };

    const position = playerData.element_types.find(et => et.id === player.element_type);
    const team = playerData.teams.find(t => t.id === player.team);

    return {
      name: player.web_name,
      position: position?.singular_name_short || '',
      team: team?.short_name || ''
    };
  };

  // Helper function to get player points
  const getPlayerPoints = (elementId: number) => {
    if (!liveData) return 0;
    const livePlayer = liveData.elements.find(p => p.id === elementId);
    return livePlayer?.stats?.total_points || 0;
  };

  // Helper function to organize players by position for formation display
  const organizeByFormation = (picks: Pick[]) => {
    const startingEleven = picks
      .filter(pick => pick.position <= 11)
      .sort((a, b) => a.position - b.position);

    const goalkeeper = startingEleven.filter(pick => {
      const playerInfo = getPlayerInfo(pick.element);
      return playerInfo.position === 'GKP';
    });

    const defenders = startingEleven.filter(pick => {
      const playerInfo = getPlayerInfo(pick.element);
      return playerInfo.position === 'DEF';
    });

    const midfielders = startingEleven.filter(pick => {
      const playerInfo = getPlayerInfo(pick.element);
      return playerInfo.position === 'MID';
    });

    const forwards = startingEleven.filter(pick => {
      const playerInfo = getPlayerInfo(pick.element);
      return playerInfo.position === 'FWD';
    });

    return { goalkeeper, defenders, midfielders, forwards };
  };

  // Component to display individual player card
  const PlayerCard = ({ pick, isCompact = false }: { pick: Pick; isCompact?: boolean }) => {
    const playerInfo = getPlayerInfo(pick.element);
    const playerPoints = getPlayerPoints(pick.element);
    // For bench players (position > 11), show original points without multiplier
    const displayPoints = pick.position > 11 ? playerPoints : playerPoints * pick.multiplier;

    return (
      <div className={`relative ${isCompact ? 'w-12 sm:w-16' : 'w-14 sm:w-20'} text-center`}>
        <div className={`${isCompact ? 'p-1 sm:p-2' : 'p-2 sm:p-3'} bg-green-600 text-white rounded-lg shadow-lg border-2 border-white relative`}>
          {/* Captain/Vice-Captain indicators - only for starting eleven */}
          {pick.position <= 11 && pick.is_captain && (
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
              C
            </div>
          )}
          {pick.position <= 11 && pick.is_vice_captain && (
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
              V
            </div>
          )}

          {/* Player name */}
          <div className={`font-bold ${isCompact ? 'text-xs' : 'text-xs sm:text-sm'} truncate mb-1`}>
            {playerInfo.name}
          </div>

          {/* Team */}
          <div className={`${isCompact ? 'text-xs' : 'text-xs'} opacity-90 mb-1`}>
            {playerInfo.team}
          </div>

          {/* Points */}
          <div className={`${isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-lg'} font-bold bg-white text-green-600 rounded px-1`}>
            {displayPoints}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="text-left hover:text-blue-600 hover:underline transition-colors"
          onClick={handleOpen}
        >
          <div className="font-medium">{managerName}</div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Đội hình - Gameweek {eventId}</DialogTitle>
          <DialogDescription className="text-sm">
            {managerName} ({teamName})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : picksData ? (
          <div className="space-y-4">
            {/* Event Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Thống kê Gameweek</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex flex-col items-center text-center p-1.5 bg-muted/30 rounded">
                    <span className="text-muted-foreground mb-0.5 text-xs">Điểm GW</span>
                    <span className="font-bold text-lg">{picksData.entry_history.points}</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-1.5 bg-muted/30 rounded">
                    <span className="text-muted-foreground mb-0.5 text-xs">Tiền còn lại</span>
                    <span className="font-bold text-lg">£{(picksData.entry_history.bank / 10).toFixed(1)}m</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-1.5 bg-muted/30 rounded">
                    <span className="text-muted-foreground mb-0.5 text-xs">Xếp hạng</span>
                    <span className="font-bold text-lg">{picksData.entry_history.overall_rank?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>
                {picksData.active_chip && (
                  <div className="mt-3 pt-2 border-t text-center">
                    <Badge variant="default" className="text-xs">Chip: {picksData.active_chip}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Picks List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Đội hình ra sân</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {picksData.picks.length > 0 ? (
                  <div className="relative">
                    {/* Football pitch background */}
                    <div className="bg-gradient-to-b from-green-400 to-green-500 rounded-lg p-3 sm:p-6 min-h-[400px] sm:min-h-[500px] relative overflow-hidden">
                      {/* Pitch markings */}
                      <div className="absolute inset-0 opacity-20">
                        {/* Center circle */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 border-2 border-white rounded-full"></div>
                        {/* Center line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
                        {/* Goal areas */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-6 sm:w-24 sm:h-8 border-b-2 border-l-2 border-r-2 border-white"></div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-6 sm:w-24 sm:h-8 border-t-2 border-l-2 border-r-2 border-white"></div>
                      </div>

                      {(() => {
                        const formation = organizeByFormation(picksData.picks);
                        return (
                          <div className="relative h-full flex flex-col justify-between py-2 sm:py-4">
                            {/* Forwards */}
                            <div className="flex justify-center items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
                              {formation.forwards.map((pick) => (
                                <PlayerCard key={pick.position} pick={pick} />
                              ))}
                            </div>

                            {/* Midfielders */}
                            <div className="flex justify-center items-center gap-2 sm:gap-4 mb-4 sm:mb-8 flex-wrap">
                              {formation.midfielders.map((pick) => (
                                <PlayerCard key={pick.position} pick={pick} />
                              ))}
                            </div>

                            {/* Defenders */}
                            <div className="flex justify-center items-center gap-2 sm:gap-4 mb-4 sm:mb-8 flex-wrap">
                              {formation.defenders.map((pick) => (
                                <PlayerCard key={pick.position} pick={pick} />
                              ))}
                            </div>

                            {/* Goalkeeper */}
                            <div className="flex justify-center items-center">
                              {formation.goalkeeper.map((pick) => (
                                <PlayerCard key={pick.position} pick={pick} />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Formation info */}
                    {(() => {
                      const formation = organizeByFormation(picksData.picks);
                      const formationString = `${formation.defenders.length}-${formation.midfielders.length}-${formation.forwards.length}`;
                      return (
                        <div className="mt-4 text-center">
                          <Badge variant="outline" className="text-sm">
                            Formation: {formationString}
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="text-muted-foreground">Không có dữ liệu đội hình</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bench */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Ghế dự bị</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-gray-100 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
                    {picksData.picks
                      .filter(pick => pick.position > 11)
                      .sort((a, b) => a.position - b.position)
                      .map((pick) => (
                        <PlayerCard key={pick.position} pick={pick} isCompact={true} />
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-red-500">⚠️ Không thể tải thông tin đội hình</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Component loading skeleton cho table
const TableSkeleton = () => (
  <>
    {Array.from({ length: 8 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton className="h-6 w-12" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-28" />
        </TableCell>
        <TableCell className="text-center">
          <Skeleton className="h-6 w-12 mx-auto" />
        </TableCell>
        <TableCell className="text-center">
          <Skeleton className="h-6 w-16 mx-auto" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

const getRankBadge = (rank: number) => {
  if (rank === 1) {
    return <Badge variant="default" className="bg-yellow-500 text-white flex items-center gap-1 whitespace-nowrap">🥇 {rank}</Badge>;
  } else if (rank === 2) {
    return <Badge variant="default" className="bg-gray-400 text-white flex items-center gap-1 whitespace-nowrap">🥈 {rank}</Badge>;
  } else if (rank === 3) {
    return <Badge variant="default" className="bg-amber-600 text-white flex items-center gap-1 whitespace-nowrap">🥉 {rank}</Badge>;
  } else {
    return <Badge variant="outline" className="whitespace-nowrap">{rank}</Badge>;
  }
};

export const FantasyLeaderboard = ({
  leagueId = VNTRIP_LEAGUE_ID,
  pageId = 1,
  phase = 1
}: FantasyLeaderboardProps) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [leagueName, setLeagueName] = useState<string>("");
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(pageId);
  const [currentPhase, setCurrentPhase] = useState<number>(phase);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputLeagueId, setInputLeagueId] = useState<string>(leagueId);
  const [currentLeagueId, setCurrentLeagueId] = useState<string>(leagueId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch dữ liệu khi component mount hoặc khi thông số thay đổi
  useEffect(() => {
    const loadLeaderboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchLeaderboardData(currentLeagueId, currentPage, currentPhase);
        setLeaderboardData(result.entries);
        setLeagueName(result.leagueName);
        setCurrentGW(result.currentGW);

        // Tính toán thống kê team chỉ khi là league của vntrip
        if (currentLeagueId === VNTRIP_LEAGUE_ID) {
          const stats = calculateTeamStats(result.entries);
          setTeamStats(stats);
        } else {
          setTeamStats([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
        setLeaderboardData([]);
        setLeagueName("Không thể tải dữ liệu league");
        setCurrentGW(0);
        setTeamStats([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      loadLeaderboardData();
    }
  }, [currentPage, currentPhase, currentLeagueId, mounted]);

  const handleLeagueIdSubmit = () => {
    if (inputLeagueId.trim()) {
      setCurrentLeagueId(inputLeagueId.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLeagueIdSubmit();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold mb-2">
                {leagueName || "Đang tải..."} {leagueName && <span className="text-sm text-muted-foreground font-normal">(ID: {currentLeagueId})</span>}
              </CardTitle>
              <CardDescription>
                Thống kê điểm số và xếp hạng - Gameweek hiện tại: {currentGW > 0 ? currentGW : "Đang tải..."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Input
                type="text"
                placeholder="Nhập League ID"
                value={inputLeagueId}
                onChange={(e) => setInputLeagueId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-40"
                disabled={isLoading}
              />
              <Button
                onClick={handleLeagueIdSubmit}
                disabled={isLoading || !inputLeagueId.trim()}
                size="sm"
              >
                Tải
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Team Stats Section - chỉ hiển thị cho league vntrip */}
          {!isLoading && teamStats.length > 0 && currentLeagueId === VNTRIP_LEAGUE_ID && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Thống kê theo Team Vntrip</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {teamStats.map((team, index) => (
                  <Card key={team.name} className="border-l-4" style={{ borderLeftColor: team.color.replace('bg-', '#') }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {index === 0 ? "🏆 #1" : `#${index + 1}`}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tổng điểm:</span>
                          <span className="font-mono">{team.totalPoints.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Team Members */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="space-y-1">
                          {team.members.map((member) => (
                            <div key={member.entry} className="flex justify-between items-center text-xs">
                              <span className="truncate flex-1">{member.manager}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">#{member.rank}</Badge>
                                <span className="font-mono">{member.total.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead className="text-center">GW Points</TableHead>
                  <TableHead className="text-center">Total Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-red-500">⚠️ {error}</span>
                        <span className="text-sm text-muted-foreground">Không thể tải dữ liệu từ API</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : leaderboardData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <span className="text-muted-foreground">Không có dữ liệu</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  leaderboardData.map((entry) => {
                    const team = currentLeagueId === VNTRIP_LEAGUE_ID ? getTeamForEntry(entry.entry) : null;
                    return (
                      <TableRow
                        key={entry.rank}
                        className={`${entry.rank <= 3 ? "bg-muted/50" : ""} ${team ? "border-l-4" : ""}`}
                        style={team ? { borderLeftColor: team.color.replace('bg-', '#') } : {}}
                      >
                        <TableCell className="font-medium">
                          {getRankBadge(entry.rank)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <PicksDialog
                                teamId={entry.entry}
                                eventId={currentGW}
                                managerName={entry.manager}
                                teamName={entry.teamName}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">{entry.teamName}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">
                            {entry.gw}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-bold text-lg font-mono">
                            {entry.total.toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && (
            <div className="mt-4 flex justify-end items-center text-sm text-muted-foreground">
              <div>
                Cập nhật lần cuối: {mounted ? new Date().toLocaleString('vi-VN') : 'Đang tải...'}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Lưu ý:</strong> Đã sử dụng API route để giải quyết vấn đề CORS.
                Nếu vẫn gặp lỗi, có thể do Fantasy Premier League API đang bảo trì hoặc thay đổi cấu trúc.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
