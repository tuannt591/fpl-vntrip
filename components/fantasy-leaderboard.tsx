"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
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
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  TooltipWithIcon,
} from "@/components/ui/tooltip";

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
  news: string;
  status: string; // "a" = available, "d" = doubtful, "i" = injured, "u" = unavailable, "s" = suspended
  chance_of_playing_this_round: number | null;
  chance_of_playing_next_round: number | null;
  now_cost: number;
  selected_by_percent: string;
  transfers_in_event: number;
  transfers_out_event: number;
  form: string;
  total_points: number;
  points_per_game: string;
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

// Hàm để search thông minh - SMART SEARCH với early termination
const smartSearchLeaderboard = async (
  leagueId: string,
  searchTerm: string,
  maxEntriesHint?: number | null,
  onProgress?: (loaded: number, total: number, found: number) => void
): Promise<{ entries: LeaderboardEntry[], hasMore: boolean, totalLoaded: number, foundExactMatch: boolean }> => {
  const foundEntries: LeaderboardEntry[] = [];
  const searchLower = searchTerm.toLowerCase().trim();
  let currentPage = 1;
  let hasNext = true;
  let totalLoaded = 0;
  let foundExactMatch = false;

  // Dynamic max pages based on league size
  const baseMaxPages = 300; // Default maximum (15,000 managers)
  const maxPages = maxEntriesHint ? Math.min(Math.ceil(maxEntriesHint / 50), baseMaxPages) : baseMaxPages;

  try {
    while (hasNext && currentPage <= maxPages && !foundExactMatch) {
      const batchPromises: Promise<any>[] = [];
      const batchSize = 5; // Load 5 pages at once for better performance

      // Create batch of requests
      for (let i = 0; i < batchSize && hasNext && currentPage <= maxPages; i++) {
        batchPromises.push(fetchLeaderboardData(leagueId, currentPage + i, 1));
      }

      // Execute batch
      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        totalLoaded += result.entries.length;

        // Check each entry for matches
        for (const entry of result.entries) {
          const managerMatch = entry.manager.toLowerCase().includes(searchLower);
          const teamMatch = entry.teamName.toLowerCase().includes(searchLower);

          if (managerMatch || teamMatch) {
            foundEntries.push(entry);

            // Check for exact match để có thể dừng sớm
            const isExactManagerMatch = entry.manager.toLowerCase() === searchLower;
            const isExactTeamMatch = entry.teamName.toLowerCase() === searchLower;

            if (isExactManagerMatch || isExactTeamMatch) {
              foundExactMatch = true;
              console.log(`🎯 Found exact match: ${entry.manager} - ${entry.teamName}`);
            }
          }
        }

        hasNext = result.hasNext;
        onProgress?.(currentPage, Math.min(Math.ceil(totalLoaded / 50 * 2), maxPages), foundEntries.length);

        // Early termination conditions
        if (foundExactMatch) {
          console.log(`✅ Stopping search - found exact match after ${currentPage} pages`);
          break;
        }

        // If we found some matches and loaded a reasonable amount, consider stopping
        if (foundEntries.length >= 10 && currentPage >= 20) {
          console.log(`✅ Stopping search - found ${foundEntries.length} matches after ${currentPage} pages`);
          break;
        }

        if (!hasNext) break;
      }

      currentPage += batchSize;

      // Small delay to avoid overwhelming server
      if (hasNext && !foundExactMatch) {
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }

    // Sort results by relevance (exact matches first, then by rank)
    foundEntries.sort((a, b) => {
      const aExactManager = a.manager.toLowerCase() === searchLower;
      const bExactManager = b.manager.toLowerCase() === searchLower;
      const aExactTeam = a.teamName.toLowerCase() === searchLower;
      const bExactTeam = b.teamName.toLowerCase() === searchLower;

      // Exact matches first
      if ((aExactManager || aExactTeam) && !(bExactManager || bExactTeam)) return -1;
      if (!(aExactManager || aExactTeam) && (bExactManager || bExactTeam)) return 1;

      // Then by rank
      return a.rank - b.rank;
    });

    return {
      entries: foundEntries,
      hasMore: hasNext && currentPage <= maxPages,
      totalLoaded,
      foundExactMatch
    };
  } catch (error) {
    console.error('Error during smart search:', error);
    return {
      entries: foundEntries,
      hasMore: false,
      totalLoaded,
      foundExactMatch
    };
  }
};

// Hàm để fetch toàn bộ dữ liệu league (cho search) - PROGRESSIVE LOADING (fallback)
const fetchAllLeaderboardData = async (
  leagueId: string,
  maxEntriesHint?: number | null,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ entries: LeaderboardEntry[], hasMore: boolean, totalLoaded: number }> => {
  const allEntries: LeaderboardEntry[] = [];
  let currentPage = 1;
  let hasNext = true;
  let totalEstimate = 50; // Start with a basic estimate

  // Dynamic max pages based on league size
  const baseMaxPages = 300; // Default maximum (15,000 managers)
  const maxPages = maxEntriesHint ? Math.min(Math.ceil(maxEntriesHint / 50), baseMaxPages) : baseMaxPages;

  try {
    // Fetch first page to get estimate
    const firstResult = await fetchLeaderboardData(leagueId, 1, 1);
    allEntries.push(...firstResult.entries);

    // Better estimate based on first page
    totalEstimate = Math.min(Math.ceil(allEntries.length * 10), maxPages); // Conservative estimate

    onProgress?.(1, totalEstimate);

    hasNext = firstResult.hasNext;
    currentPage = 2;

    // Progressive loading với batches
    while (hasNext && currentPage <= maxPages) { // Increased limit for large leagues (up to 15,000 managers)
      const batchPromises: Promise<any>[] = [];
      const batchSize = 3; // Load 3 pages at once for better performance

      // Create batch of requests
      for (let i = 0; i < batchSize && hasNext && currentPage <= maxPages; i++) {
        batchPromises.push(fetchLeaderboardData(leagueId, currentPage + i, 1));
      }

      // Execute batch
      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        allEntries.push(...result.entries);
        hasNext = result.hasNext;
        onProgress?.(currentPage, totalEstimate);

        if (!hasNext) break;
      }

      currentPage += batchSize;

      // Small delay to avoid overwhelming server
      if (hasNext) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Check if we hit the limit
    const hitLimit = hasNext && currentPage > maxPages;

    return {
      entries: allEntries,
      hasMore: hitLimit,
      totalLoaded: allEntries.length
    };
  } catch (error) {
    console.error('Error fetching all leaderboard data:', error);
    return {
      entries: allEntries,
      hasMore: false,
      totalLoaded: allEntries.length
    }; // Return what we have
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

// Global cache để chia sẻ dữ liệu giữa các component
const globalDataCache = {
  player: null as PlayerData | null,
  playerLoaded: false,
  playerLoading: false, // Track loading state
};

// Component hiển thị thông tin theo dõi giá cầu thủ
const PricesTab = () => {
  const [playersData, setPlayersData] = useState<PlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price' | 'selected_by' | 'transfers_in' | 'transfers_out' | 'form'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchPlayer, setSearchPlayer] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([4.0, 15.0]);

  // Load players data
  useEffect(() => {
    const loadPlayersData = async () => {
      setIsLoading(true);
      try {
        // Try to get from global cache first
        if (globalDataCache.playerLoaded && globalDataCache.player) {
          setPlayersData(globalDataCache.player);
        } else {
          const data = await fetchPlayerData();
          if (data) {
            setPlayersData(data);
            globalDataCache.player = data;
            globalDataCache.playerLoaded = true;
          }
        }
      } catch (error) {
        console.error('Error loading players data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayersData();
  }, []);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    if (!playersData) return [];

    let filtered = playersData.elements.filter(player => {
      // Position filter
      if (selectedPosition !== 'all') {
        const position = playersData.element_types.find(et => et.id === player.element_type);
        if (position?.singular_name_short !== selectedPosition) return false;
      }

      // Team filter
      if (selectedTeam !== 'all') {
        const team = playersData.teams.find(t => t.id === player.team);
        if (team?.short_name !== selectedTeam) return false;
      }

      // Search filter
      if (searchPlayer.trim()) {
        const searchLower = searchPlayer.toLowerCase();
        if (!player.web_name.toLowerCase().includes(searchLower) &&
          !player.first_name.toLowerCase().includes(searchLower) &&
          !player.second_name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Price range filter
      const price = player.now_cost / 10;
      if (price < priceRange[0] || price > priceRange[1]) return false;

      return true;
    });

    // Sort players
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortBy) {
        case 'price':
          aValue = a.now_cost;
          bValue = b.now_cost;
          break;
        case 'selected_by':
          aValue = parseFloat(a.selected_by_percent);
          bValue = parseFloat(b.selected_by_percent);
          break;
        case 'transfers_in':
          aValue = a.transfers_in_event;
          bValue = b.transfers_in_event;
          break;
        case 'transfers_out':
          aValue = a.transfers_out_event;
          bValue = b.transfers_out_event;
          break;
        case 'form':
          aValue = parseFloat(a.form || '0');
          bValue = parseFloat(b.form || '0');
          break;
        default:
          aValue = a.now_cost;
          bValue = b.now_cost;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [playersData, selectedPosition, selectedTeam, searchPlayer, priceRange, sortBy, sortOrder]);

  // Get position name
  const getPositionName = (elementType: number) => {
    if (!playersData) return '';
    const position = playersData.element_types.find(et => et.id === elementType);
    return position?.singular_name_short || '';
  };

  // Get team name
  const getTeamName = (teamId: number) => {
    if (!playersData) return '';
    const team = playersData.teams.find(t => t.id === teamId);
    return team?.short_name || '';
  };

  // Format price
  const formatPrice = (cost: number) => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  // Get transfer net change
  const getTransferNet = (player: any) => {
    return player.transfers_in_event - player.transfers_out_event;
  };

  // Get price change indicator
  const getPriceChangeIndicator = (player: any) => {
    // FPL API doesn't provide direct price change data
    // We can infer potential changes from transfer activity
    const transferNet = getTransferNet(player);
    const selectedBy = parseFloat(player.selected_by_percent);

    if (transferNet > 50000 && selectedBy > 10) {
      return { trend: 'rising', color: 'text-green-600', icon: '📈' };
    } else if (transferNet < -50000 && selectedBy > 5) {
      return { trend: 'falling', color: 'text-red-600', icon: '📉' };
    }
    return { trend: 'stable', color: 'text-gray-600', icon: '➡️' };
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'a': return 'text-green-600';
      case 'd': return 'text-yellow-600';
      case 'i': return 'text-red-600';
      case 's': return 'text-red-600';
      case 'u': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 20 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!playersData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Không thể tải dữ liệu cầu thủ
      </div>
    );
  }

  // Calculate statistics
  const totalPlayers = playersData.elements.length;
  const risingPlayers = playersData.elements.filter(p => getTransferNet(p) > 50000).length;
  const fallingPlayers = playersData.elements.filter(p => getTransferNet(p) < -50000).length;
  const mostTransferredIn = playersData.elements.reduce((max, player) =>
    player.transfers_in_event > max.transfers_in_event ? player : max
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalPlayers}</div>
            <div className="text-sm text-muted-foreground">Tổng cầu thủ</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{risingPlayers}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              📈 Xu hướng tăng
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{fallingPlayers}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              📉 Xu hướng giảm
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-purple-600 truncate">
              {mostTransferredIn.web_name}
            </div>
            <div className="text-sm text-muted-foreground">Hot nhất</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search-player">Tìm cầu thủ</Label>
              <Input
                id="search-player"
                placeholder="Nhập tên cầu thủ..."
                value={searchPlayer}
                onChange={(e) => setSearchPlayer(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Position filter */}
            <div className="w-full sm:w-40">
              <Label>Vị trí</Label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="GKP">Thủ môn</SelectItem>
                  <SelectItem value="DEF">Hậu vệ</SelectItem>
                  <SelectItem value="MID">Tiền vệ</SelectItem>
                  <SelectItem value="FWD">Tiền đạo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team filter */}
            <div className="w-full sm:w-40">
              <Label>Đội bóng</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">Tất cả</SelectItem>
                  {playersData.teams.map(team => (
                    <SelectItem key={team.id} value={team.short_name}>
                      {team.short_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sort and Price Range */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-40">
              <Label>Sắp xếp theo</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Giá</SelectItem>
                  <SelectItem value="selected_by">% Sở hữu</SelectItem>
                  <SelectItem value="transfers_in">Mua vào</SelectItem>
                  <SelectItem value="transfers_out">Bán ra</SelectItem>
                  <SelectItem value="form">Phong độ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-32">
              <Label>Thứ tự</Label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Giảm dần</SelectItem>
                  <SelectItem value="asc">Tăng dần</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label>Khoảng giá: £{priceRange[0]}m - £{priceRange[1]}m</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  min="4.0"
                  max="15.0"
                  step="0.1"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseFloat(e.target.value), priceRange[1]])}
                  className="w-20"
                />
                <span className="self-center">-</span>
                <Input
                  type="number"
                  min="4.0"
                  max="15.0"
                  step="0.1"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseFloat(e.target.value)])}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Danh sách cầu thủ ({filteredPlayers.length})</span>
            <div className="text-sm text-muted-foreground">
              Cập nhật: {new Date().toLocaleDateString('vi-VN')}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative border rounded-lg">
            <div className="overflow-x-auto w-full">
              <Table className="relative min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[200px]">Cầu thủ</TableHead>
                    <TableHead className="text-center min-w-[80px]">
                      <TooltipWithIcon label="Vị trí">
                        Vị trí của cầu thủ (GKP/DEF/MID/FWD)
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[80px]">
                      <TooltipWithIcon label="Đội">
                        Đội bóng hiện tại
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[80px]">
                      <TooltipWithIcon label="Giá">
                        Giá hiện tại của cầu thủ (£x.xm)
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <TooltipWithIcon label="% Sở hữu">
                        Tỷ lệ % người chơi FPL sở hữu cầu thủ này
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <TooltipWithIcon label="Xu hướng">
                        Xu hướng thay đổi giá dựa trên hoạt động chuyển nhượng
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <TooltipWithIcon label="Mua vào">
                        Số lượng người chơi mua cầu thủ trong gameweek hiện tại
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <TooltipWithIcon label="Bán ra">
                        Số lượng người chơi bán cầu thủ trong gameweek hiện tại
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <TooltipWithIcon label="Phong độ">
                        Điểm trung bình trong 5 gameweek gần nhất
                      </TooltipWithIcon>
                    </TableHead>
                    <TableHead className="text-center min-w-[120px]">
                      <TooltipWithIcon label="Trạng thái">
                        Tình trạng sức khỏe và đình chỉ của cầu thủ
                      </TooltipWithIcon>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy cầu thủ nào phù hợp
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPlayers.slice(0, 100).map((player, index) => {
                      const priceChange = getPriceChangeIndicator(player);
                      const transferNet = getTransferNet(player);

                      return (
                        <TableRow key={player.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="min-w-[200px]">
                            <div className="flex flex-col">
                              <div className="font-medium">{player.web_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {player.first_name} {player.second_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {getPositionName(player.element_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {getTeamName(player.team)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">
                            {formatPrice(player.now_cost)}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {player.selected_by_percent}%
                          </TableCell>
                          <TableCell className="text-center">
                            <div className={`flex items-center justify-center gap-1 ${priceChange.color}`}>
                              <span>{priceChange.icon}</span>
                              <span className="text-xs font-medium">{priceChange.trend}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-green-600">
                            +{player.transfers_in_event.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-mono text-red-600">
                            -{player.transfers_out_event.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            <div className="flex items-center justify-center">
                              <span className="font-medium">{player.form}</span>
                              <span className="text-xs text-muted-foreground ml-1">/5GW</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {player.status === 'a' ? (
                              <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                <span className="text-xs text-green-600 font-medium">Sẵn sàng</span>
                              </div>
                            ) : player.status === 'd' ? (
                              <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                                <span className="text-xs text-yellow-600 font-medium">Chưa chắc</span>
                              </div>
                            ) : player.status === 'i' ? (
                              <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                                <span className="text-xs text-red-600 font-medium">Chấn thương</span>
                              </div>
                            ) : player.status === 's' ? (
                              <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                                <span className="text-xs text-red-600 font-medium">Bị treo</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                                <span className="text-xs text-gray-600 font-medium">Không rõ</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {filteredPlayers.length > 100 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Hiển thị 100 cầu thủ đầu tiên. Sử dụng bộ lọc để thu hẹp kết quả.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Component hiển thị lịch thi đấu
const FixturesTab = () => {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [availableGameweeks, setAvailableGameweeks] = useState<number[]>([]);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const loadFixtures = useCallback(async () => {
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
        setLastRefreshTime(new Date());
      }
      if (playersData) setPlayerData(playersData);
    } catch (error) {
      console.error('Error loading fixtures:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start live updates for ongoing matches
  const startLiveUpdates = useCallback(() => {
    console.log('🔴 Starting live updates...');
    setNextRefreshIn(60); // Start countdown

    intervalRef.current = setInterval(() => {
      loadFixtures();
      setNextRefreshIn(60); // Reset countdown
    }, 60000); // Update every 60 seconds
  }, [loadFixtures]);

  // Stop live updates
  const stopLiveUpdates = useCallback(() => {
    console.log('⏹️ Stopping live updates...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextRefreshIn(0);
  }, []);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  // Live updates effect
  useEffect(() => {
    if (liveUpdatesEnabled) {
      startLiveUpdates();
    } else {
      stopLiveUpdates();
    }

    return () => stopLiveUpdates();
  }, [liveUpdatesEnabled, startLiveUpdates, stopLiveUpdates]);

  // Countdown effect
  useEffect(() => {
    if (liveUpdatesEnabled && nextRefreshIn > 0) {
      countdownRef.current = setInterval(() => {
        setNextRefreshIn(prev => {
          if (prev <= 1) {
            return 60; // Reset to 60 seconds
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [liveUpdatesEnabled, nextRefreshIn]);

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

  // Check if there are live matches
  const hasLiveMatches = useMemo(() => {
    return filteredFixtures.some(fixture => fixture.started && !fixture.finished);
  }, [filteredFixtures]);

  // Toggle live updates
  const toggleLiveUpdates = useCallback(() => {
    setLiveUpdatesEnabled(!liveUpdatesEnabled);
  }, [liveUpdatesEnabled]);

  // Manual refresh
  const handleManualRefresh = useCallback(async () => {
    await loadFixtures();
    if (liveUpdatesEnabled) {
      setNextRefreshIn(60); // Reset countdown
    }
  }, [loadFixtures, liveUpdatesEnabled]);

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

    const kickoffTime = new Date(fixture.kickoff_time);
    const now = new Date();

    if (kickoffTime > now) {
      return 'Scheduled';
    }

    return 'Scheduled';
  };

  // Get live status badge style
  const getStatusBadgeStyle = (fixture: Fixture) => {
    if (fixture.finished) {
      return "bg-gray-500 text-white";
    }
    if (fixture.started && !fixture.finished) {
      return "bg-red-500 text-white animate-pulse"; // Live match - pulsing red
    }
    return "bg-blue-500 text-white"; // Scheduled
  };

  // Format match score display
  const getScoreDisplay = (fixture: Fixture) => {
    if (fixture.team_h_score !== null && fixture.team_a_score !== null) {
      return `${fixture.team_h_score} - ${fixture.team_a_score}`;
    }
    return "vs";
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
      {/* Live Updates Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Button
              variant={liveUpdatesEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleLiveUpdates}
              className={liveUpdatesEnabled ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {liveUpdatesEnabled ? (
                <>
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></span>
                  🔴 Live ON
                </>
              ) : (
                <>⏸️ Live OFF</>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-1">⏳</span>
                  Đang tải...
                </>
              ) : (
                <>🔄 Refresh</>
              )}
            </Button>
          </div>

          {hasLiveMatches && (
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm">Có trận đang diễn ra</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center text-sm text-muted-foreground">
          {liveUpdatesEnabled && nextRefreshIn > 0 && (
            <div className="flex items-center gap-1">
              <span>Next update in:</span>
              <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {nextRefreshIn}s
              </span>
            </div>
          )}

          {lastRefreshTime && (
            <div className="text-xs">
              Last updated: {lastRefreshTime.toLocaleTimeString('vi-VN')}
            </div>
          )}
        </div>
      </div>

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
          filteredFixtures.map((fixture) => {
            // Helper: lấy tên cầu thủ từ id
            const getPlayerName = (id: number) => {
              if (!playerData) return `#${id}`;
              const p = playerData.elements.find(e => e.id === id);
              return p ? p.web_name : `#${id}`;
            };

            // Helper: render danh sách sự kiện theo đội
            const renderEventList = (identifier: string, label: string, color: string) => {
              if (!fixture.stats) return null;
              const stat = fixture.stats.find(s => s.identifier === identifier);
              if (!stat) return null;
              return (
                <>
                  {stat.h.length > 0 && (
                    <div className="text-xs" style={{ color }}>
                      <b>{label} (Home):</b> {stat.h.map(ev => getPlayerName(ev.element)).join(', ')}
                    </div>
                  )}
                  {stat.a.length > 0 && (
                    <div className="text-xs" style={{ color }}>
                      <b>{label} (Away):</b> {stat.a.map(ev => getPlayerName(ev.element)).join(', ')}
                    </div>
                  )}
                </>
              );
            };

            return (
              <Card
                key={fixture.id}
                className={`${fixture.started && !fixture.finished ? 'border-green-500 shadow-lg' : ''}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    {/* Match Info */}
                    <div className="flex items-center justify-center space-x-2 sm:space-x-4">
                      <div className="text-center min-w-[60px] sm:min-w-[80px]">
                        <div className="font-semibold text-sm sm:text-base">{getTeamName(fixture.team_h)}</div>
                        <div className="text-xs text-muted-foreground hidden sm:block">Home</div>
                      </div>

                      <div className="text-center px-2 sm:px-4">
                        <div>
                          <div className="text-lg font-bold">
                            {getScoreDisplay(fixture)}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {fixture.started && !fixture.finished ? (
                              <span className="flex items-center justify-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                {getFixtureStatus(fixture)}
                              </span>
                            ) : fixture.started ? (
                              getFixtureStatus(fixture)
                            ) : (
                              formatDate(fixture.kickoff_time)
                            )}
                          </div>
                        </div>
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

                      <Badge
                        className={`text-xs ${getStatusBadgeStyle(fixture)}`}
                      >
                        {fixture.finished ? (
                          'FT'
                        ) : fixture.started ? (
                          <>
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1"></span>
                            LIVE
                          </>
                        ) : (
                          'Scheduled'
                        )}
                      </Badge>

                    </div>
                  </div>

                  {/* Chi tiết sự kiện trận đấu (ngắn gọn) */}
                  {fixture.stats && fixture.started && (
                    <div className="mt-2 px-2 py-1 bg-muted/40 rounded border text-xs">
                      <div className="grid grid-cols-2 gap-x-4">
                        {/* Home side */}
                        <div>
                          <div className="font-semibold text-green-700 mb-0.5">{getTeamName(fixture.team_h)}</div>
                          {/* Ghi bàn */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'goals_scored');
                            if (!stat || stat.h.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-green-700 mb-0.5">
                                <b>⚽</b> {stat.h.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                          {/* Kiến tạo */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'assists');
                            if (!stat || stat.h.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-blue-700 mb-0.5">
                                <b>🅰️</b> {stat.h.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                          {/* Thẻ vàng */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'yellow_cards');
                            if (!stat || stat.h.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-yellow-700 mb-0.5">
                                <b>🟨</b> {stat.h.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                          {/* Thẻ đỏ */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'red_cards');
                            if (!stat || stat.h.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-red-700 mb-0.5">
                                <b>🟥</b> {stat.h.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                        </div>
                        {/* Away side */}
                        <div>
                          <div className="font-semibold text-green-700 mb-0.5">{getTeamName(fixture.team_a)}</div>
                          {/* Ghi bàn */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'goals_scored');
                            if (!stat || stat.a.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-green-700 mb-0.5">
                                <b>⚽</b> {stat.a.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                          {/* Kiến tạo */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'assists');
                            if (!stat || stat.a.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-blue-700 mb-0.5">
                                <b>🅰️</b> {stat.a.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                          {/* Thẻ vàng */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'yellow_cards');
                            if (!stat || stat.a.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-yellow-700 mb-0.5">
                                <b>🟨</b> {stat.a.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                          {/* Thẻ đỏ */}
                          {(() => {
                            const stat = fixture.stats.find(s => s.identifier === 'red_cards');
                            if (!stat || stat.a.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-red-700 mb-0.5">
                                <b>🟥</b> {stat.a.map(ev => getPlayerName(ev.element)).join(', ')}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
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
    if (!playerData) return { name: `Cầu thủ #${elementId}`, position: '', team: '', news: '', status: 'a', chanceThisRound: null, chanceNextRound: null };

    const player = playerData.elements.find(p => p.id === elementId);
    if (!player) return { name: `Cầu thủ #${elementId}`, position: '', team: '', news: '', status: 'a', chanceThisRound: null, chanceNextRound: null };

    const position = playerData.element_types.find(et => et.id === player.element_type);
    const team = playerData.teams.find(t => t.id === player.team);

    return {
      name: player.web_name,
      position: position?.singular_name_short || '',
      team: team?.short_name || '',
      news: player.news,
      status: player.status,
      chanceThisRound: player.chance_of_playing_this_round,
      chanceNextRound: player.chance_of_playing_next_round
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
            {/* Captain/Vice-Captain indicators - only for starting eleven */}
            {pick.position <= 11 && pick.is_captain && (
              <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-[10px] font-medium border-[1px] border-white">
                C
              </div>
            )}
            {pick.position <= 11 && pick.is_vice_captain && (
              <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-[10px] font-medium border-[1px] border-white">
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
  const [inputLeagueId, setInputLeagueId] = useState<string>(leagueId);
  const [currentLeagueId, setCurrentLeagueId] = useState<string>(leagueId);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'fixtures' | 'prices'>('leaderboard');
  const [searchManager, setSearchManager] = useState<string>('');
  const [allLeaderboardData, setAllLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ loaded: number, total: number, found?: number } | null>(null);
  const [smartSearchEnabled, setSmartSearchEnabled] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchResults, setSearchResults] = useState<LeaderboardEntry[]>([]);
  const [foundExactMatch, setFoundExactMatch] = useState(false);

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

  // Auto-enable smart search khi có allLeaderboardData và đang có search term
  useEffect(() => {
    if (searchManager.trim() && allLeaderboardData.length > 0 && !smartSearchEnabled && !isSearching) {
      setSmartSearchEnabled(true);
    }
  }, [searchManager, allLeaderboardData, smartSearchEnabled, isSearching]);

  // Auto-reset smart search khi searchManager trống
  useEffect(() => {
    if (!searchManager.trim()) {
      setSmartSearchEnabled(false);
      setIsSearching(false);
      setSearchProgress(null);
      setSearchHasMore(false);
      setSearchResults([]);
      setFoundExactMatch(false);
    }
  }, [searchManager]);

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
      // Clear search data khi đổi league
      if (currentLeagueId !== leagueId) {
        setAllLeaderboardData([]);
        setSearchManager('');
      }
    }
  }, [currentPage, currentPhase, currentLeagueId, mounted, leagueId]);

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

  // Filter leaderboard data based on search - SMART FILTERING
  const filteredLeaderboardData = useMemo(() => {
    if (!searchManager.trim()) {
      return leaderboardData; // Normal pagination mode khi không có search
    }

    if (smartSearchEnabled && searchResults.length > 0) {
      // Smart search mode - use search results
      return searchResults;
    } else {
      // Fallback - search in current page only
      return leaderboardData.filter(entry =>
        entry.manager.toLowerCase().includes(searchManager.toLowerCase()) ||
        entry.teamName.toLowerCase().includes(searchManager.toLowerCase())
      );
    }
  }, [searchManager, smartSearchEnabled, searchResults, leaderboardData]);  // Hàm xử lý search thông minh
  const handleSearch = async (searchTerm: string) => {
    // Nếu không có search term, reset về normal mode
    if (!searchTerm.trim()) {
      setSmartSearchEnabled(false);
      setSearchProgress(null);
      setSearchResults([]);
      setFoundExactMatch(false);
      return;
    }

    setIsSearching(true);
    setSmartSearchEnabled(false); // Tạm thời tắt để hiển thị loading

    try {
      // Sử dụng smart search với early termination
      const result = await smartSearchLeaderboard(
        currentLeagueId,
        searchTerm,
        maxEntries,
        (loaded, total, found) => setSearchProgress({ loaded, total: Math.max(total, loaded), found })
      );

      setSearchResults(result.entries);
      setSearchHasMore(result.hasMore);
      setFoundExactMatch(result.foundExactMatch);
      setSmartSearchEnabled(true); // Bật sau khi có data

      console.log(`🔍 Search completed: ${result.entries.length} results, exact match: ${result.foundExactMatch}`);
    } catch (error) {
      console.error('Error during smart search:', error);
      setSmartSearchEnabled(false);
      setSearchResults([]);
      setFoundExactMatch(false);
    } finally {
      setIsSearching(false);
      setSearchProgress(null);
    }
  };

  const handleClearSearch = () => {
    setSearchManager('');
    setSmartSearchEnabled(false);
    setSearchProgress(null);
    setIsSearching(false);
    setSearchHasMore(false);
    setSearchResults([]);
    setFoundExactMatch(false);
    // Keep allLeaderboardData for potential future use
  };

  return (
    <div className="container mx-auto py-4 sm:py-8">
      <Card>
        <CardHeader className="pb-4 mb-4">
          {/* Title Section - Always visible */}
          <div className="space-y-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold mb-2">
                Fantasy Premier League Dashboard
              </CardTitle>
              <CardDescription>
                Thống kê điểm số và lịch thi đấu Fantasy Premier League
              </CardDescription>
            </div>

            {/* League ID Input Section - Only visible on leaderboard tab */}
            {activeTab === 'leaderboard' && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nhập League ID"
                  value={inputLeagueId}
                  onChange={(e) => setInputLeagueId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 sm:w-[20rem] sm:flex-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleLeagueIdSubmit}
                  disabled={isLoading || !inputLeagueId.trim()}
                  size="sm"
                  className="w-[100px]"
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
                onClick={() => setActiveTab('prices')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'prices'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                💰 Theo dõi giá
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                  <div>
                    Gameweek hiện tại: <span className="font-medium">{currentGW > 0 ? currentGW : "Đang tải..."}</span>
                  </div>
                  {maxEntries && (
                    <div className="flex items-center gap-1">
                      👥 Giới hạn league: <span className="font-medium text-blue-600">{maxEntries.toLocaleString()}</span> manager
                    </div>
                  )}
                  {smartSearchEnabled && filteredLeaderboardData.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      🔍 Kết quả tìm thấy: <span className="font-medium text-green-600">{searchResults.length.toLocaleString()}</span>
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

              {/* Search Manager Section */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <label className="text-sm font-medium whitespace-nowrap">
                    Tìm kiếm Manager/Team:
                  </label>
                  <div className="flex flex-1 gap-2">
                    <Input
                      type="text"
                      placeholder="Nhập tên manager hoặc tên team..."
                      value={searchManager}
                      onChange={(e) => setSearchManager(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch(searchManager);
                        }
                      }}
                      className="flex-1 sm:max-w-xs"
                      disabled={isLoading || isSearching}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSearch(searchManager)}
                      disabled={isLoading || isSearching || !searchManager.trim()}
                      className="whitespace-nowrap"
                    >
                      {isSearching ? (
                        <>
                          <span className="animate-spin mr-1">⏳</span>
                          Đang tìm...
                        </>
                      ) : (
                        <>
                          🔍 Tìm kiếm
                        </>
                      )}
                    </Button>
                  </div>
                  {searchManager && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSearch}
                      className="w-full sm:w-auto"
                      disabled={isSearching}
                    >
                      Xóa
                    </Button>
                  )}
                  {isSearching && (
                    <div className="text-xs text-blue-600 whitespace-nowrap flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="animate-spin">⏳</span>
                        Đang tải toàn bộ league...
                      </span>
                      {searchProgress && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                          {searchProgress.loaded}/{searchProgress.total} trang
                          {searchProgress.found !== undefined && (
                            <span className="ml-1 text-green-600">
                              • {searchProgress.found} kết quả
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Search Tips */}
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  💡 <span>Có thể tìm kiếm theo tên manager (ví dụ: &quot;John&quot;) hoặc tên team (ví dụ: &quot;Arsenal FC&quot;)</span>
                </div>

                {searchManager && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/30 p-2 rounded">
                    {isSearching ? (
                      <span className="text-blue-600 flex items-center gap-1">
                        <span className="animate-spin">⏳</span>
                        Đang tìm kiếm thông minh...
                      </span>
                    ) : smartSearchEnabled && searchResults.length > 0 ? (
                      <span className="text-green-600">
                        {foundExactMatch ? (
                          <>
                            🎯 <strong>Tìm thấy kết quả chính xác!</strong> Hiển thị {filteredLeaderboardData.length} kết quả
                          </>
                        ) : (
                          <>
                            🔍 Search thông minh: <strong>{filteredLeaderboardData.length}</strong> kết quả tìm thấy
                            <br />
                            <span className="text-xs mt-1 block">💡 Có thể tìm theo tên manager hoặc tên team</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-orange-600">
                        📄 Tìm kiếm trang hiện tại: <strong>{filteredLeaderboardData.length}</strong> / {leaderboardData.length} kết quả
                        <span className="block text-xs mt-1">
                          💡 Nhấn nút &quot;🔍 Tìm kiếm&quot; để search thông minh
                        </span>
                      </span>
                    )}
                  </p>
                )}
              </div>

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
                    {(isLoading || isSearching) ? (
                      <TableSkeleton isSearching={isSearching} />
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
                            Không tìm thấy manager hoặc team nào với từ khóa &quot;{searchManager}&quot;
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

              {/* Pagination Controls - chỉ hiển thị khi không search toàn bộ */}
              {!isLoading && !smartSearchEnabled && filteredLeaderboardData.length > 0 && (
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

              {/* Search Results Info - hiển thị khi đang search */}
              {smartSearchEnabled && filteredLeaderboardData.length > 0 && (
                <div className="mt-4 text-center">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {foundExactMatch ? (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="text-green-800 font-medium">
                          🎯 Tìm thấy kết quả chính xác! Hiển thị {filteredLeaderboardData.length} kết quả phù hợp
                        </div>
                      </div>
                    ) : (
                      <>
                        🔍 Hiển thị {filteredLeaderboardData.length} kết quả từ search thông minh
                        {searchHasMore && (
                          <span className="block text-xs text-amber-600 mt-1 bg-amber-50 inline-block px-2 py-1 rounded">
                            ⚠️ Có thể còn nhiều kết quả khác - search đã dừng để tối ưu hiệu suất
                          </span>
                        )}
                      </>
                    )}
                    {maxEntries && (
                      <span className="block text-xs text-blue-600 mt-1">
                        👥 League có giới hạn {maxEntries.toLocaleString()} manager
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fixtures' && <FixturesTab />}
          {activeTab === 'prices' && <PricesTab />}

          {!isLoading && (
            <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  Bootstrap data: {globalDataCache.playerLoaded ? '✅ Loaded' : globalDataCache.playerLoading ? '🔄 Loading...' : '⏳ Pending'}
                </span>
              </div>
              <div>
                Cập nhật lần cuối: {lastUpdatedData ? new Date(lastUpdatedData).toLocaleString('vi-VN') : (mounted ? 'Chưa có dữ liệu' : 'Đang tải...')}
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
