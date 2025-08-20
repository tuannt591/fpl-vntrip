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

type Fixture = {
  id: number;
  code: number;
  team_h: number;
  team_h_score: number | null;
  team_a: number;
  team_a_score: number | null;
  event: number;
  finished: boolean;
  minutes: number;
  kickoff_time: string;
  started: boolean;
  team_h_difficulty: number;
  team_a_difficulty: number;
  stats?: Array<{
    identifier: string;
    a: Array<{ value: number; element: number }>;
    h: Array<{ value: number; element: number }>;
  }>;
};

type PremierLeagueStanding = {
  position: number;
  team: {
    id: number;
    name: string;
    short_name: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
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

// Hàm để fetch dữ liệu player (bootstrap-static)
// API này chứa dữ liệu tĩnh: thông tin cầu thủ, đội bóng, vị trí
// Chỉ cần fetch 1 lần và cache lại cho toàn bộ session
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

// Hàm để fetch dữ liệu fixtures
const fetchFixtures = async (): Promise<Fixture[] | null> => {
  try {
    const response = await fetch('/api/fantasy-fixtures', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return null;
  }
};

// Hàm để fetch dữ liệu bảng xếp hạng Premier League
const fetchPremierLeagueStandings = async (): Promise<PremierLeagueStanding[] | null> => {
  try {
    const response = await fetch('/api/fantasy-standings', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching standings:', error);
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
): Promise<{ entries: LeaderboardEntry[], leagueName: string, currentGW: number, hasNext: boolean, currentPage: number }> => {
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
      currentPage: data.standings.page
    };
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    // Return empty data if API fails
    return {
      entries: [],
      leagueName: "Không thể tải dữ liệu league",
      currentGW: 0,
      hasNext: false,
      currentPage: 1
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

// Global cache để chia sẻ dữ liệu giữa các component
const globalDataCache = {
  player: null as PlayerData | null,
  playerLoaded: false,
  playerLoading: false, // Track loading state
};

// Component hiển thị lịch thi đấu
const FixturesTab = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [availableGameweeks, setAvailableGameweeks] = useState<number[]>([]);

  useEffect(() => {
    loadFixtures();
  }, []);

  useEffect(() => {
    // Filter fixtures by selected gameweek
    if (selectedGameweek && fixtures.length > 0) {
      const filtered = fixtures.filter(fixture => fixture.event === selectedGameweek);
      setFilteredFixtures(filtered);
    } else {
      // Show current and next gameweek fixtures by default
      const currentGW = Math.max(...fixtures.map(f => f.event).filter(gw =>
        fixtures.some(f => f.event === gw && f.finished)
      ), 0);
      const nextGW = currentGW + 1;
      const defaultFixtures = fixtures.filter(f => f.event === currentGW || f.event === nextGW);
      setFilteredFixtures(defaultFixtures);
    }
  }, [selectedGameweek, fixtures]);

  const loadFixtures = async () => {
    setIsLoading(true);
    try {
      const [fixturesData, playersData] = await Promise.all([
        fetchFixtures(),
        globalDataCache.playerLoaded ? Promise.resolve(globalDataCache.player) : fetchPlayerData()
      ]);

      if (fixturesData) {
        setFixtures(fixturesData);
        // Get unique gameweeks for filter
        const gameweeks = Array.from(new Set(fixturesData.map(f => f.event))).sort((a, b) => a - b);
        setAvailableGameweeks(gameweeks);
      }
      if (playersData) setPlayerData(playersData);
    } catch (error) {
      console.error('Error loading fixtures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamName = (teamId: number) => {
    if (!playerData) return `Team ${teamId}`;
    const team = playerData.teams.find(t => t.id === teamId);
    return team?.short_name || `Team ${teamId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFixtureStatus = (fixture: Fixture) => {
    if (fixture.finished) return 'FT';
    if (fixture.started) return `${fixture.minutes}'`;
    return 'Scheduled';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gameweek Filter - Scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          <Button
            variant={selectedGameweek === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedGameweek(null)}
            className="whitespace-nowrap"
          >
            Gần đây
          </Button>
          {availableGameweeks.slice(0, 10).map((gw) => (
            <Button
              key={gw}
              variant={selectedGameweek === gw ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGameweek(gw)}
              className="whitespace-nowrap"
            >
              GW {gw}
            </Button>
          ))}
        </div>
      </div>

      {/* Fixtures List */}
      <div className="grid gap-4">
        {filteredFixtures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Không có trận đấu nào
          </div>
        ) : (
          filteredFixtures.map((fixture) => (
            <Card key={fixture.id}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  {/* Match Info */}
                  <div className="flex items-center justify-center space-x-2 sm:space-x-4">
                    <div className="text-center min-w-[60px] sm:min-w-[80px]">
                      <div className="font-semibold text-sm sm:text-base">{getTeamName(fixture.team_h)}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">Home</div>
                    </div>

                    <div className="text-center px-2 sm:px-4">
                      {fixture.started ? (
                        <div>
                          <div className="text-lg font-bold">
                            {fixture.team_h_score ?? 0} - {fixture.team_a_score ?? 0}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {getFixtureStatus(fixture)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-lg font-bold">vs</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {formatDate(fixture.kickoff_time)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-center min-w-[60px] sm:min-w-[80px]">
                      <div className="font-semibold text-sm sm:text-base">{getTeamName(fixture.team_a)}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">Away</div>
                    </div>
                  </div>

                  {/* Match Status */}
                  <div className="flex items-center justify-center sm:justify-end flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      GW {fixture.event}
                    </Badge>
                    {fixture.finished && (
                      <Badge variant="secondary" className="text-xs">
                        Finished
                      </Badge>
                    )}
                    {fixture.started && !fixture.finished && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Live
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Difficulty: {fixture.team_h_difficulty} - {fixture.team_a_difficulty}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedGameweek && (
        <div className="text-center text-sm text-muted-foreground">
          Hiển thị {filteredFixtures.length} trận đấu trong Gameweek {selectedGameweek}
        </div>
      )}
    </div>
  );
};

// Component hiển thị bảng xếp hạng
const StandingsTab = () => {
  const [standings, setStandings] = useState<PremierLeagueStanding[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStandings();
  }, []);

  const loadStandings = async () => {
    setIsLoading(true);
    try {
      const standingsData = await fetchPremierLeagueStandings();
      if (standingsData) {
        // Sort by position for better display
        const sortedStandings = standingsData.sort((a, b) => a.position - b.position);
        setStandings(sortedStandings);
      }
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionBadge = (position: number) => {
    if (position <= 4) {
      return <Badge className="bg-green-600 text-white">{position}</Badge>;
    } else if (position <= 6) {
      return <Badge className="bg-blue-600 text-white">{position}</Badge>;
    } else if (position >= 18) {
      return <Badge className="bg-red-600 text-white">{position}</Badge>;
    } else {
      return <Badge variant="outline">{position}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 20 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white text-xs">1-4</Badge>
          <span>Champions League</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600 text-white text-xs">5-6</Badge>
          <span>Europa League</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-600 text-white text-xs">18-20</Badge>
          <span>Relegation</span>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] sm:w-[60px]">Pos</TableHead>
              <TableHead className="min-w-[100px]">Team</TableHead>
              <TableHead className="text-center w-[40px] sm:w-[60px]">P</TableHead>
              <TableHead className="text-center w-[40px] sm:w-[60px] hidden sm:table-cell">W</TableHead>
              <TableHead className="text-center w-[40px] sm:w-[60px] hidden sm:table-cell">D</TableHead>
              <TableHead className="text-center w-[40px] sm:w-[60px] hidden sm:table-cell">L</TableHead>
              <TableHead className="text-center w-[50px] sm:w-[80px] hidden md:table-cell">GF</TableHead>
              <TableHead className="text-center w-[50px] sm:w-[80px] hidden md:table-cell">GA</TableHead>
              <TableHead className="text-center w-[50px] sm:w-[80px]">GD</TableHead>
              <TableHead className="text-center w-[50px] sm:w-[60px]">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team) => (
              <TableRow key={team.team.id}>
                <TableCell className="font-medium text-center">
                  {getPositionBadge(team.position)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium text-sm sm:text-base">{team.team.short_name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">
                      W{team.won} D{team.draw} L{team.lost}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm">{team.playedGames}</TableCell>
                <TableCell className="text-center text-sm hidden sm:table-cell">{team.won}</TableCell>
                <TableCell className="text-center text-sm hidden sm:table-cell">{team.draw}</TableCell>
                <TableCell className="text-center text-sm hidden sm:table-cell">{team.lost}</TableCell>
                <TableCell className="text-center text-sm hidden md:table-cell">{team.goalsFor || '-'}</TableCell>
                <TableCell className="text-center text-sm hidden md:table-cell">{team.goalsAgainst || '-'}</TableCell>
                <TableCell className="text-center text-sm">
                  <span className={`${team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-600' : ''}`}>
                    {team.goalDifference > 0 ? '+' : ''}{team.goalDifference || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-center font-bold text-sm">{team.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        * Bảng xếp hạng được tạo từ dữ liệu Fantasy Premier League
        <br />
        * Một số thống kê có thể không khả dụng
      </div>
    </div>
  );
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Cache để lưu trữ dữ liệu đã fetch - chỉ dùng global cache cho bootstrap data
  const dataCache = globalDataCache;

  const handleOpen = async () => {
    setIsDialogOpen(true);
    setIsLoading(true);

    try {
      // Prepare promises array - không cache picks và live data
      const promises: Promise<any>[] = [];

      // 1. Luôn fetch picks data mới
      promises.push(fetchPicksData(teamId, eventId));

      // 2. Check player data cache (đã pre-loaded từ đầu)
      if (!dataCache.playerLoaded && !dataCache.playerLoading) {
        // Nếu chưa load và không đang load thì bắt đầu load
        dataCache.playerLoading = true;
        promises.push(
          fetchPlayerData().then(data => {
            if (data) {
              dataCache.player = data;
              dataCache.playerLoaded = true;
            }
            dataCache.playerLoading = false;
            return data;
          })
        );
      } else if (dataCache.playerLoading) {
        // Nếu đang load thì chờ
        promises.push(
          new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (dataCache.playerLoaded || !dataCache.playerLoading) {
                clearInterval(checkInterval);
                resolve(dataCache.player);
              }
            }, 100);
          })
        );
      } else {
        // Đã có data rồi
        promises.push(Promise.resolve(dataCache.player));
      }

      // 3. Luôn fetch live data mới
      promises.push(fetchLiveData(eventId));

      // Execute all promises
      const [picks, players, live] = await Promise.all(promises);

      setPicksData(picks);
      setPlayerData(players);
      setLiveData(live);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }; const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Clear data khi đóng dialog vì không cache nữa
      setPicksData(null);
      setLiveData(null);
      // Không clear playerData vì vẫn cache bootstrap data
    }
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

  // Component hiển thị thông tin chi tiết cầu thủ
  const PlayerDetailDialog = ({
    pick,
    playerInfo,
    playerPoints,
    isCompact = false
  }: {
    pick: Pick;
    playerInfo: { name: string; position: string; team: string };
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
          <div className={`${isCompact ? 'p-1 sm:p-2' : 'p-2 sm:p-3'} bg-green-600 text-white rounded-lg shadow-lg border-2 border-white relative cursor-pointer hover:bg-green-700 transition-colors`}>
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
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {playerInfo.name}
              {pick.is_captain && <Badge className="bg-yellow-500">Đội trưởng</Badge>}
              {pick.is_vice_captain && <Badge className="bg-blue-500">Phó đội trưởng</Badge>}
            </DialogTitle>
            <DialogDescription>
              {playerInfo.position} - {playerInfo.team} | Gameweek {eventId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
      <div className={`relative ${isCompact ? 'w-12 sm:w-16' : 'w-14 sm:w-20'} text-center`}>
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
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputLeagueId, setInputLeagueId] = useState<string>(leagueId);
  const [currentLeagueId, setCurrentLeagueId] = useState<string>(leagueId);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'fixtures' | 'standings'>('leaderboard');

  // Pre-load bootstrap data khi component mount
  useEffect(() => {
    const preloadBootstrapData = async () => {
      if (!globalDataCache.playerLoaded && !globalDataCache.playerLoading) {
        globalDataCache.playerLoading = true;
        console.log('🚀 Pre-loading bootstrap data...');
        try {
          const playerData = await fetchPlayerData();
          if (playerData) {
            globalDataCache.player = playerData;
            globalDataCache.playerLoaded = true;
            console.log('✅ Bootstrap data loaded successfully');
          }
        } catch (error) {
          console.error('❌ Failed to pre-load bootstrap data:', error);
        } finally {
          globalDataCache.playerLoading = false;
        }
      }
    };

    preloadBootstrapData();
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
      setCurrentPage(1); // Reset to first page when changing league
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLeagueIdSubmit();
    }
  };

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

  return (
    <div className="container mx-auto py-4 sm:py-8">
      <Card>
        <CardHeader className="pb-4">
          {/* Title Section - Always visible */}
          <div className="space-y-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold mb-2">
                Fantasy Premier League Dashboard
              </CardTitle>
              <CardDescription>
                Thống kê điểm số, lịch thi đấu và bảng xếp hạng Premier League
              </CardDescription>
            </div>

            {/* League ID Input Section - Only visible on leaderboard tab */}
            {activeTab === 'leaderboard' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="Nhập League ID"
                  value={inputLeagueId}
                  onChange={(e) => setInputLeagueId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 sm:w-40 sm:flex-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleLeagueIdSubmit}
                  disabled={isLoading || !inputLeagueId.trim()}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Tải
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Tab Navigation - Scrollable on mobile */}
        <div className="px-4 sm:px-6 pb-0">
          <div className="flex border-b overflow-x-auto scrollbar-hide">
            <div className="flex space-x-1 min-w-max">
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'leaderboard'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                🏆 Bảng xếp hạng League
              </button>
              <button
                onClick={() => setActiveTab('fixtures')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'fixtures'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                📅 Lịch thi đấu
              </button>
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'standings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                📊 Bảng xếp hạng Premier League
              </button>
            </div>
          </div>
        </div>

        <CardContent className="pt-6 px-4 sm:px-6">{/* Content will continue here */}
          {/* Tab Content */}
          {activeTab === 'leaderboard' && (
            <div>
              {/* League Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  {leagueName || "Đang tải..."} {leagueName && <span className="text-sm text-muted-foreground font-normal">(ID: {currentLeagueId})</span>}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gameweek hiện tại: {currentGW > 0 ? currentGW : "Đang tải..."}
                </p>
              </div>

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

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] sm:w-[80px]">Rank</TableHead>
                      <TableHead className="min-w-[120px]">Manager</TableHead>
                      <TableHead className="min-w-[120px] hidden sm:table-cell">Team Name</TableHead>
                      <TableHead className="text-center min-w-[80px]">GW</TableHead>
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
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <div className="min-w-0">
                                  <PicksDialog
                                    teamId={entry.entry}
                                    eventId={currentGW}
                                    managerName={entry.manager}
                                    teamName={entry.teamName}
                                  />
                                  <div className="text-xs text-muted-foreground sm:hidden truncate">
                                    {entry.teamName}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="text-sm text-muted-foreground">{entry.teamName}</div>
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
              {!isLoading && leaderboardData.length > 0 && (
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
          )}

          {activeTab === 'fixtures' && <FixturesTab />}
          {activeTab === 'standings' && <StandingsTab />}

          {!isLoading && (
            <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  Bootstrap data: {globalDataCache.playerLoaded ? '✅ Loaded' : globalDataCache.playerLoading ? '🔄 Loading...' : '⏳ Pending'}
                </span>
              </div>
              <div>
                Cập nhật lần cuối: {mounted ? new Date().toLocaleString('vi-VN') : 'Đang tải...'}
              </div>
            </div>
          )}

          {error && activeTab === 'leaderboard' && (
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
