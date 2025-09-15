"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
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


const fetchLeaderboardData = async (
  leagueId: string,
  pageId: number = 1,
  phase: number = 1
): Promise<{ entries: LeaderboardEntry[], leagueName: string, currentGW: number, hasNext: boolean, currentPage: number, maxEntries: number | null, lastUpdatedData: string }> => {
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
      currentGW: data.current_event || Math.max(...entries.map(entry => entry.gw)),
      hasNext: data.standings.has_next,
      currentPage: data.standings.page,
      maxEntries: data.league.max_entries,
      lastUpdatedData: data.last_updated_data
    };
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    // Return empty data if API fails
    return {
      entries: [],
      leagueName: "Không thể tải dữ liệu league",
      currentGW: 0,
      hasNext: false,
      currentPage: 1,
      maxEntries: null,
      lastUpdatedData: ""
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
    const totalPoints = teamMembers.reduce((sum, member) => sum + member.gw, 0);
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

  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpen = async () => {
    setIsDialogOpen(true);
    setIsLoading(true);

    try {
      // Fetch picks and live data only
      const [picks, live] = await Promise.all([
        fetchPicksData(teamId, eventId),
        fetchLiveData(eventId)
      ]);

      setPicksData(picks);
      setLiveData(live);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }; const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Clear data when closing dialog
      setPicksData(null);
      setLiveData(null);
    }
  };

  // Helper function to get player info - simplified without detailed data
  const getPlayerInfo = (elementId: number) => {
    return {
      name: `Cầu thủ #${elementId}`,
      position: '',
      team: '',
      news: '',
      status: 'a',
      chanceThisRound: null,
      chanceNextRound: null
    };
  };

  // Helper function to get injury status indicator (circular badge with exclamation mark)
  const getInjuryStatusIndicator = (status: string, chanceThisRound: number | null, chanceNextRound: number | null, news: string) => {
    let bgColor = '';
    let shouldShow = false;

    if (status === 'i') {
      bgColor = 'from-red-500 to-red-600'; // Injured - red
      shouldShow = true;
    } else if (status === 'd') {
      bgColor = 'from-yellow-500 to-yellow-600'; // Doubtful - yellow
      shouldShow = true;
    } else if (status === 's') {
      bgColor = 'from-red-500 to-red-600'; // Suspended - red
      shouldShow = true;
    } else if (status === 'u') {
      bgColor = 'from-gray-500 to-gray-600'; // Unavailable - gray
      shouldShow = true;
    } else if (chanceThisRound !== null && chanceThisRound < 100) {
      if (chanceThisRound <= 25) {
        bgColor = 'from-red-500 to-red-600'; // Low chance - red
        shouldShow = true;
      } else if (chanceThisRound <= 75) {
        bgColor = 'from-yellow-500 to-yellow-600'; // Medium chance - yellow
        shouldShow = true;
      }
      // Don't show green (high chance) anymore
    }

    if (shouldShow && bgColor) {
      return (
        <div className={`w-4 h-4 bg-gradient-to-r ${bgColor} rounded-full flex items-center justify-center text-[10px] font-bold border-[1px] border-white text-white`}>
          !
        </div>
      );
    }

    return null;
  };  // Helper function to get player points
  const getPlayerPoints = (elementId: number) => {
    if (!liveData) return 0;
    const livePlayer = liveData.elements.find(p => p.id === elementId);
    return livePlayer?.stats?.total_points || 0;
  };

  // Helper function to organize players by position - simplified to basic formation
  const organizeByFormation = (picks: Pick[]) => {
    const startingEleven = picks
      .filter(pick => pick.position <= 11)
      .sort((a, b) => a.position - b.position);

    // Simple formation based on positions 1-11
    const goalkeeper = startingEleven.slice(0, 1); // Position 1
    const defenders = startingEleven.slice(1, 5); // Positions 2-5
    const midfielders = startingEleven.slice(5, 9); // Positions 6-9  
    const forwards = startingEleven.slice(9, 11); // Positions 10-11

    return { goalkeeper, defenders, midfielders, forwards };
  };

  // Component hiển thị thông tin chi tiết cầu thủ
  const PlayerDetailDialog = ({
    pick,
    playerInfo,
    playerPoints,
    isCompact = false
  }: {
    pick: Pick;
    playerInfo: { name: string; position: string; team: string; news: string; status: string; chanceThisRound: number | null; chanceNextRound: number | null };
    playerPoints: number;
    isCompact?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const displayPoints = pick.position > 11 ? playerPoints : playerPoints * pick.multiplier;

    // Get detailed player data from live data
    const getPlayerDetailStats = () => {
      if (!liveData) return null;
      const livePlayer = liveData.elements.find(p => p.id === pick.element);
      return livePlayer?.stats || null;
    };

    const getPlayerExplain = () => {
      if (!liveData) return [];
      const livePlayer = liveData.elements.find(p => p.id === pick.element);
      return livePlayer?.explain || [];
    };

    const playerStats = getPlayerDetailStats();
    const playerExplain = getPlayerExplain();

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className={`bg-gradient-to-b from-green-600 to-green-700 text-white rounded-lg shadow-lg border-[1px] border-white relative cursor-pointer hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105`}>
            {/* Captain/Vice-Captain indicators - top right, like injury bottom left */}
            {pick.position <= 11 && pick.is_captain && (
              <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-[10px] font-medium border-[1px] border-white z-10">
                C
              </div>
            )}
            {pick.position <= 11 && pick.is_vice_captain && (
              <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-[10px] font-medium border-[1px] border-white z-10">
                V
              </div>
            )}

            {/* Injury status indicator - only show red/yellow warnings */}
            {getInjuryStatusIndicator(playerInfo.status, playerInfo.chanceThisRound, playerInfo.chanceNextRound, playerInfo.news) && (
              <div className="absolute -bottom-1.5 -left-1.5 sm:-bottom-2 sm:-left-2">
                {getInjuryStatusIndicator(playerInfo.status, playerInfo.chanceThisRound, playerInfo.chanceNextRound, playerInfo.news)}
              </div>
            )}

            {/* Player name */}
            <div className={`font-medium w-full p-1 ${isCompact ? 'text-xs leading-tight' : 'text-xs sm:text-sm'} truncate`}>
              {playerInfo.name}
            </div>

            {/* Position & Team - Hide in compact mode */}
            {!isCompact && (
              <div className="text-xs opacity-90 mb-1 leading-tight">
                {playerInfo.position}
              </div>
            )}

            {/* Points */}
            <div className={`${isCompact ? 'text-xs font-medium' : 'text-sm sm:text-base font-medium'} bg-white text-green-700 text-center rounded-bl-lg rounded-br-lg`}>
              {displayPoints}
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-sm sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {playerInfo.name}
              {pick.is_captain && <Badge className="bg-yellow-500">Đội trưởng</Badge>}
              {pick.is_vice_captain && <Badge className="bg-blue-500">Đội phó</Badge>}
              {getInjuryStatusIndicator(playerInfo.status, playerInfo.chanceThisRound, playerInfo.chanceNextRound, playerInfo.news)}
            </DialogTitle>
            <DialogDescription>
              {playerInfo.position} - {playerInfo.team} | Gameweek {eventId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Injury/News Information */}
            {(playerInfo.news || playerInfo.status !== 'a' || playerInfo.chanceThisRound !== null) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🏥 Thông tin sức khỏe
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {playerInfo.news && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="font-medium text-yellow-800 mb-1">Tin tức:</div>
                        <div className="text-yellow-700">{playerInfo.news}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2">
                      {playerInfo.status !== 'a' && (
                        <div className="flex justify-between items-center">
                          <span>Trạng thái:</span>
                          <div>
                            {playerInfo.status === 'i' && <Badge variant="destructive" className="text-xs">🚑 Injured</Badge>}
                            {playerInfo.status === 'd' && <Badge variant="default" className="text-xs bg-yellow-500">⚠️ Doubtful</Badge>}
                            {playerInfo.status === 's' && <Badge variant="destructive" className="text-xs">⛔ Suspended</Badge>}
                            {playerInfo.status === 'u' && <Badge variant="secondary" className="text-xs">❌ Unavailable</Badge>}
                          </div>
                        </div>
                      )}

                      {playerInfo.chanceThisRound !== null && (
                        <div className="flex justify-between">
                          <span>Khả năng ra sân gameweek này:</span>
                          <span className={`font-bold ${playerInfo.chanceThisRound <= 25 ? 'text-red-600' :
                            playerInfo.chanceThisRound <= 75 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {playerInfo.chanceThisRound}%
                          </span>
                        </div>
                      )}

                      {playerInfo.chanceNextRound !== null && (
                        <div className="flex justify-between">
                          <span>Khả năng ra sân gameweek sau:</span>
                          <span className={`font-bold ${playerInfo.chanceNextRound <= 25 ? 'text-red-600' :
                            playerInfo.chanceNextRound <= 75 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {playerInfo.chanceNextRound}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Tổng quan điểm */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Điểm số Gameweek</CardTitle>
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
                    {playerExplain.map((fixture, index) => (
                      <div key={index} className="border rounded p-2">
                        <div className="font-medium text-sm mb-1">Trận đấu #{fixture.fixture}</div>
                        <div className="space-y-1">
                          {fixture.stats.map((stat, statIndex) => (
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

  // Component to display individual player card
  const PlayerCard = ({ pick, isCompact = false }: { pick: Pick; isCompact?: boolean }) => {
    const playerInfo = getPlayerInfo(pick.element);
    const playerPoints = getPlayerPoints(pick.element);

    return (
      <div className="relative w-full text-center">
        <PlayerDetailDialog
          pick={pick}
          playerInfo={playerInfo}
          playerPoints={playerPoints}
          isCompact={isCompact}
        />
      </div>
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <button
          className="text-left hover:text-blue-600 hover:underline transition-colors disabled:opacity-50"
          onClick={handleOpen}
          disabled={isLoading}
        >
          <div className="font-medium flex items-center gap-1">
            {managerName}
            {isLoading && <span className="text-xs text-blue-600">...</span>}
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
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

            {/* Formation Pitch Display */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  ⚽ Đội hình ra sân
                  {picksData?.active_chip && (
                    <Badge variant="secondary" className="text-xs">
                      Chip: {picksData.active_chip}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 p-2 sm:p-6">
                {picksData?.picks.length > 0 ? (
                  <div className="relative w-full max-w-5xl mx-auto">
                    {/* Pitch Background */}
                    <div className="relative w-full" style={{ aspectRatio: '1417/788' }}>
                      <Image
                        src="/pitch-graphic-t77-OTdp.svg"
                        alt="Football Pitch"
                        width={1417}
                        height={788}
                        className="w-full h-[400px] object-cover"
                        priority
                      />

                      {/* Player positions overlay */}
                      <div className="absolute inset-0">
                        {(() => {
                          const formation = organizeByFormation(picksData.picks);

                          return (
                            <>
                              {/* Goalkeeper */}
                              <div className="absolute" style={{
                                bottom: '3%',
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}>
                                {formation.goalkeeper.map((pick) => (
                                  <div key={pick.element} className="relative w-[5rem]">
                                    <PlayerCard pick={pick} isCompact={true} />
                                  </div>
                                ))}
                              </div>

                              {/* Defenders */}
                              <div className="absolute flex justify-center items-center gap-2 sm:gap-4" style={{
                                bottom: '25%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '100%'
                              }}>
                                {formation.defenders.map((pick, index) => (
                                  <div key={pick.element} className="flex justify-center relative w-[20%]">
                                    <PlayerCard pick={pick} isCompact={true} />
                                  </div>
                                ))}
                              </div>

                              {/* Midfielders */}
                              <div className="absolute flex justify-center items-center gap-2 sm:gap-4" style={{
                                bottom: '50%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '100%'
                              }}>
                                {formation.midfielders.map((pick, index) => (
                                  <div key={pick.element} className="flex justify-center relative w-[20%]">
                                    <PlayerCard pick={pick} isCompact={true} />
                                  </div>
                                ))}
                              </div>

                              {/* Forwards */}
                              <div className="absolute flex justify-center items-center gap-2 sm:gap-4" style={{
                                bottom: '73%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '100%'
                              }}>
                                {formation.forwards.map((pick, index) => (
                                  <div key={pick.element} className="flex justify-center relative w-[20%]">
                                    <PlayerCard pick={pick} isCompact={true} />
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Formation Info */}
                    {(() => {
                      const formation = organizeByFormation(picksData.picks);
                      const formationString = `${formation.defenders.length}-${formation.midfielders.length}-${formation.forwards.length}`;

                      return (
                        <div className="mt-4 text-center space-y-3">
                          <div className="flex justify-center items-center gap-4 flex-wrap">
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              ⚽ Sơ đồ: {formationString}
                            </Badge>
                          </div>
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
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  🪑 Ghế dự bị
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {picksData?.picks.filter(pick => pick.position > 11).length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-gray-50 border-[1px] border-dashed border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {picksData.picks
                          .filter(pick => pick.position > 11)
                          .sort((a, b) => a.position - b.position)
                          .map((pick) => (
                            <div key={pick.position} className="relative w-[23%]">
                              <PlayerCard pick={pick} isCompact={true} />
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
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
        <TableCell colSpan={5} className="text-center py-4">
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
  const [maxEntries, setMaxEntries] = useState<number | null>(null);
  const [lastUpdatedData, setLastUpdatedData] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(pageId);
  const [currentPhase, setCurrentPhase] = useState<number>(phase);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentLeagueId = VNTRIP_LEAGUE_ID;

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
        setHasNextPage(result.hasNext);
        setMaxEntries(result.maxEntries);
        setLastUpdatedData(result.lastUpdatedData);

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
        setMaxEntries(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      loadLeaderboardData();

    }
  }, [currentPage, currentPhase, currentLeagueId, mounted]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageInput = (pageNumber: number) => {
    if (pageNumber >= 1) {
      setCurrentPage(pageNumber);
    }
  };

  // Since we only show VNTrip league, just use leaderboardData directly
  const filteredLeaderboardData = leaderboardData;

  return (
    <div className="container mx-auto py-4 sm:py-8">
      <Card>
        <CardHeader className="pb-4 mb-4">
          {/* Title Section - Always visible */}
          <div className="space-y-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold mb-2">
                VNTrip Fantasy League Dashboard
              </CardTitle>
              <CardDescription>
                Bảng xếp hạng Fantasy Premier League của VNTrip
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 px-4 sm:px-6">
          {/* Leaderboard Content */}
          <div>
            {/* League Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                {leagueName || "Đang tải..."} {leagueName && <span className="text-sm text-muted-foreground font-normal">(ID: {currentLeagueId})</span>}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                <div>
                  Gameweek hiện tại: <span className="font-medium">{currentGW > 0 ? currentGW : "Đang tải..."}</span>
                </div>
                {maxEntries && (
                  <div className="flex items-center gap-1">
                    👥 Giới hạn league: <span className="font-medium text-blue-600">{maxEntries.toLocaleString()}</span> manager
                  </div>
                )}
              </div>
            </div>

            {/* Team Stats Section - chỉ hiển thị cho league vntrip */}
            {!isLoading && teamStats.length > 0 && currentLeagueId === VNTRIP_LEAGUE_ID && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Thống kê điểm GW hiện tại theo Team Vntrip</h3>
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
                                  <span className="font-mono">{member.gw.toLocaleString()}</span>
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
                    <TableHead className="text-center min-w-[80px]">Total</TableHead>
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
                  ) : filteredLeaderboardData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <span className="text-muted-foreground">
                          Không có dữ liệu
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeaderboardData.map((entry: LeaderboardEntry) => {
                      const team = currentLeagueId === VNTRIP_LEAGUE_ID ? getTeamForEntry(entry.entry) : null;
                      return (
                        <TableRow
                          key={`${entry.entry}-${entry.rank}`}
                          className={`${entry.rank <= 3 ? "bg-muted/50" : ""} ${team ? "border-l-4" : ""}`}
                          style={team ? { borderLeftColor: team.color.replace('bg-', '#') } : {}}
                        >
                          <TableCell className="font-medium">
                            {getRankBadge(entry.rank)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col min-w-0">
                              <PicksDialog
                                teamId={entry.entry}
                                eventId={currentGW}
                                managerName={entry.manager}
                                teamName={entry.teamName}
                              />
                              <div className="text-xs text-muted-foreground truncate">
                                {entry.teamName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {entry.gw}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold text-sm sm:text-lg font-mono">
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

            {/* Pagination Controls */}
            {!isLoading && filteredLeaderboardData.length > 0 && (
              <div className="mt-4 space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage <= 1 || isLoading}
                    className="text-xs sm:text-sm"
                  >
                    ← Trước
                  </Button>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="hidden sm:inline">Trang</span>
                    <Input
                      type="number"
                      min="1"
                      value={currentPage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          handlePageInput(value);
                        }
                      }}
                      className="w-12 sm:w-16 text-center text-sm"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasNextPage || isLoading}
                    className="text-xs sm:text-sm"
                  >
                    Sau →
                  </Button>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
                  {hasNextPage ? "Có thêm trang" : "Đã hết dữ liệu"}
                </div>
              </div>
            )}
          </div>

          {!isLoading && (
            <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
              <div>
                Cập nhật lần cuối: {lastUpdatedData ? new Date(lastUpdatedData).toLocaleString('vi-VN') : (mounted ? 'Chưa có dữ liệu' : 'Đang tải...')}
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
