"use client";

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "./ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type LeaderboardEntry = {
  rank: number;
  manager: string;
  teamName: string;
  gwPoint: number;
  totalPoint: number;
  entry: number;
  picksData?: PicksDataWithLive | null;
};

type PickWithLive = Pick & { liveData?: LivePlayerData | null; elementName?: string };
type PicksDataWithLive = Omit<PicksData, 'picks'> & { picks: PickWithLive[] };

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

interface FantasyLeaderboardProps {
  leagueId?: string;
  pageId?: number;
  phase?: number;
}

// Constants
const VNTRIP_LEAGUE_ID = "1405297";
const CURRENT_PHASE = 1;

const fetchFantasyVntripData = async (
  leagueId: string,
  phase: number = 1
): Promise<any> => {
  try {

    const params = new URLSearchParams({
      leagueId: leagueId,
      phase: phase.toString(),
    });

    const response = await fetch(`/api/fantasy-vntrip?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: any = await response.json();

    return data;
  } catch (error) {
    console.error('Error fetching all leaderboard data:', error);
    // Return empty data if API fails
    return {
      entries: [],
      leagueName: "Không thể tải dữ liệu league",
      currentGW: 0,
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

// Hàm tính toán thống kê team theo điểm GW hiện tại
const calculateTeamStats = (entries: LeaderboardEntry[]): TeamStats[] => {
  return TEAMS.map(team => {
    const teamMembers = entries.filter(entry => team.entries.includes(entry.entry));
    // Tính tổng điểm GW hiện tại
    const totalPoints = teamMembers.reduce((sum, member) => sum + member.gwPoint, 0);
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

// Component hiển thị thông tin picks, sử dụng trực tiếp picksData đã lưu trong entry
const PicksDialog = ({
  managerName,
  teamName,
  picksData,
  eventId
}: {
  managerName: string;
  teamName: string;
  picksData?: PicksDataWithLive | null;
  eventId: number;
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Component hiển thị thông tin chi tiết cầu thủ
  const PlayerDetailDialog = ({
    pick,
  }: {
    pick: PickWithLive;
    isCompact?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const playerName = pick.elementName || `Cầu thủ #${pick.element}`;
    const playerPoints = pick.liveData?.stats?.total_points || 0;
    const displayPoints = pick.position > 11 ? playerPoints : playerPoints * pick.multiplier;
    const playerStats = pick.liveData?.stats;
    const playerExplain = pick.liveData?.explain || [];

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="font-medium truncate cursor-pointer">{playerName}</div>
        </DialogTrigger>
        <DialogContent className="max-w-sm sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {playerName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tổng quan điểm */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Điểm số Gameweek {eventId}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-center">
                  {displayPoints} điểm
                  {pick.position <= 11 && pick.multiplier > 1 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({playerPoints} x{pick.multiplier})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thống kê chi tiết */}
            {playerStats && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Thống kê trận đấu</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span>Phút thi đấu:</span>
                      <span className="font-mono">{playerStats.minutes}&apos;</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bàn thắng:</span>
                      <span className="font-mono">{playerStats.goals_scored}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kiến tạo:</span>
                      <span className="font-mono">{playerStats.assists}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clean Sheet:</span>
                      <span className="font-mono">{playerStats.clean_sheets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thẻ vàng:</span>
                      <span className="font-mono">{playerStats.yellow_cards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thẻ đỏ:</span>
                      <span className="font-mono">{playerStats.red_cards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cứu thua:</span>
                      <span className="font-mono">{playerStats.saves}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Điểm thưởng:</span>
                      <span className="font-mono">{playerStats.bonus}</span>
                    </div>
                    {playerStats.own_goals > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Phản lưới:</span>
                        <span className="font-mono">{playerStats.own_goals}</span>
                      </div>
                    )}
                    {playerStats.penalties_missed > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Penalty hỏng:</span>
                        <span className="font-mono">{playerStats.penalties_missed}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chi tiết điểm từng trận */}
            {playerExplain.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Chi tiết điểm số</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {playerExplain.map((fixture: any, index: number) => (
                      <div key={index} className="border rounded p-2">
                        <div className="space-y-1">
                          {fixture.stats.map((stat: any, statIndex: number) => (
                            <div key={statIndex} className="flex justify-between text-xs">
                              <span className="capitalize">
                                {stat.identifier.replace(/_/g, ' ')}:
                              </span>
                              <div className="flex gap-2">
                                <span>{stat.value}</span>
                                <span className="font-bold text-green-600">+{stat.points}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!playerStats && (
              <div className="text-center py-4 text-muted-foreground">
                Không có dữ liệu chi tiết cho cầu thủ này
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="text-left hover:text-blue-600 hover:underline transition-colors"
          onClick={() => setIsDialogOpen(true)}
        >
          <div className="font-medium flex items-center gap-1">
            {managerName}
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className='bg-white dark:bg-gray-800'>
          <DialogTitle className="text-lg">Đội hình</DialogTitle>
          <DialogDescription className="text-sm">
            {managerName} ({teamName})
          </DialogDescription>
        </DialogHeader>

        {picksData ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  ⚽ Đội hình ra sân
                  {picksData?.active_chip && (
                    <Badge variant="secondary" className="text-xs">
                      Chip: {picksData.active_chip}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {picksData?.picks.length > 0 ? (
                  <>
                    <ul className="divide-y divide-gray-200">
                      {picksData.picks
                        .filter(pick => pick.position <= 11)
                        .sort((a, b) => a.position - b.position)
                        .map((pick) => {
                          // Xác định vị trí thi đấu
                          let viTri = '';
                          if (pick.position === 1) viTri = 'GK';
                          else if (pick.position >= 2 && pick.position <= 5) viTri = 'DEF';
                          else if (pick.position >= 6 && pick.position <= 9) viTri = 'MID';
                          else if (pick.position >= 10 && pick.position <= 11) viTri = 'FWD';
                          const minutes = pick.liveData?.stats?.minutes ?? '-';
                          return (
                            <li key={pick.position} className="py-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                {/* <div className="font-medium truncate">{pick.elementName || `Cầu thủ #${pick.element}`}</div> */}
                                <PlayerDetailDialog
                                  pick={pick}
                                />
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200 min-w-[36px] text-center">{viTri}</span>
                                  <span>{minutes}&apos;</span>
                                </div>
                              </div>
                              {pick.is_captain && <Badge className="bg-yellow-500">C</Badge>}
                              {pick.is_vice_captain && <Badge className="bg-blue-500">VC</Badge>}
                              <span className="font-mono text-green-700">{(pick.liveData?.stats?.total_points || 0) * pick.multiplier}</span>
                            </li>
                          );
                        })}
                    </ul>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <span className="text-muted-foreground">Không có dữ liệu đội hình</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  🪑 Ghế dự bị
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {picksData?.picks.filter(pick => pick.position > 11).length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {picksData.picks
                      .filter(pick => pick.position > 11)
                      .sort((a, b) => a.position - b.position)
                      .map((pick) => {
                        // Xác định vị trí thi đấu cho dự bị
                        let viTri = '';
                        if (pick.position === 12) viTri = 'GK';
                        else if (pick.position === 13 || pick.position === 14) viTri = 'DEF/MID';
                        else if (pick.position === 15) viTri = 'FWD';
                        const minutes = pick.liveData?.stats?.minutes ?? '-';
                        return (
                          <li key={pick.position} className="py-2 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              {/* <div className="font-medium truncate">{pick.elementName || `Cầu thủ #${pick.element}`}</div> */}
                              <PlayerDetailDialog
                                pick={pick}
                              />
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200 min-w-[36px] text-center">{viTri}</span>
                                <span>{minutes}&apos;</span>
                              </div>
                            </div>
                            <span className="font-mono text-green-700">{pick.liveData?.stats?.total_points || 0}</span>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <span className="text-muted-foreground">Không có cầu thủ dự bị</span>
                  </div>
                )}
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
const TableSkeleton = ({ isSearching = false }: { isSearching?: boolean }) => (
  <>
    {/* Show search status message if searching */}
    {isSearching && (
      <TableRow>
        <TableCell colSpan={3} className="text-center py-4">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <span className="animate-spin">⏳</span>
              <span className="font-medium">Đang tìm kiếm trong toàn bộ league...</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Đang tải dữ liệu, vui lòng đợi một chút
            </span>
          </div>
        </TableCell>
      </TableRow>
    )}
    {Array.from({ length: isSearching ? 6 : 8 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton className="h-6 w-12" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell className="text-center">
          <Skeleton className="h-6 w-12 mx-auto" />
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
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const currentLeagueId = VNTRIP_LEAGUE_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hàm reload dữ liệu
  const reloadData = () => {
    setReloadKey(prev => prev + 1);
  };

  // Load all data once when component mounts hoặc khi reloadKey thay đổi
  useEffect(() => {
    const loadAllData = async () => {
      if (!mounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchFantasyVntripData(currentLeagueId, CURRENT_PHASE);

        setLeaderboardData(result.entries);
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
        setCurrentGW(0);
        setTeamStats([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [mounted, currentLeagueId, reloadKey]);

  return (
    <div className="container mx-auto py-4 sm:py-8">
      <Card>
        <CardHeader className='pb-2 px-4 sm:px-6'>
          {/* Title Section - Always visible */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl sm:text-2xl font-bold mb-0">
                VNTrip Fantasy League
              </CardTitle>
              {/* Nút reload */}
              <button
                onClick={reloadData}
                className="ml-2 px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-60"
                disabled={isLoading}
                title="Tải lại dữ liệu"
                type="button"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                Reload
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          {/* Leaderboard Content */}
          <div>
            {/* League Info */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                <div>
                  Gameweek hiện tại: <span className="font-medium">{currentGW > 0 ? currentGW : "Đang tải..."}</span>
                </div>
              </div>
            </div>

            {/* Team Stats Section - chỉ hiển thị cho league vntrip */}
            {!isLoading && teamStats.length > 0 && currentLeagueId === VNTRIP_LEAGUE_ID && (
              <div className="mb-6">
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
                          <div className="flex justify-between items-end">
                            <span className="text-muted-foreground">Tổng điểm GW hiện tại:</span>
                            <span className="font-mono text-2xl font-extrabold text-green-700">{team.totalPoints.toLocaleString()}</span>
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
                                  <span className="font-mono">{member.gwPoint.toLocaleString()}</span>
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

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] sm:w-[80px]">Rank</TableHead>
                    <TableHead className="min-w-[120px]">Manager</TableHead>
                    <TableHead className="text-center min-w-[80px]">GW {currentGW}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <span className="text-red-500">⚠️ {error}</span>
                          <span className="text-sm text-muted-foreground">Không thể tải dữ liệu từ API</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : leaderboardData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <span className="text-muted-foreground">Không có dữ liệu</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaderboardData.map((entry: LeaderboardEntry) => {
                      return (
                        <TableRow
                          key={`${entry.entry}-${entry.rank}`}
                          className={`${entry.rank <= 3 ? "bg-muted/50" : ""}`}
                        >
                          <TableCell className="font-medium">
                            {getRankBadge(entry.rank)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <PicksDialog
                                  managerName={entry.manager}
                                  teamName={entry.teamName}
                                  picksData={entry.picksData}
                                  eventId={currentGW}
                                />
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {entry.teamName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {entry.gwPoint}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
