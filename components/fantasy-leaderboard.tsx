"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "./ui/skeleton";
import { ManagerAccordionList } from './ui/manager-accordion-list';
import { LeaderboardEntry, TeamConfig, TeamStats } from '@/types/fantasy';

// Constants
const VNTRIP_LEAGUE_ID = "1405297";
const CURRENT_PHASE = 1;

const fetchFantasyVntripData = async (
  leagueId: string,
  phase: number = 1,
  gw: number = 0
): Promise<any> => {
  try {

    const params = new URLSearchParams({
      leagueId: leagueId,
      phase: phase.toString(),
    });

    if (gw > 0) {
      params.append('gw', gw.toString());
    }

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
    color: "text-red-500"
  },
  {
    name: "89 Team",
    entries: [4565469, 4550400, 5005626],
    color: "text-violet-500"
  },
  {
    name: "3T Team",
    entries: [6400474, 3024127, 6425684],
    color: "text-amber-500"
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

    // Tính tổng số cầu thủ đã ra sân của team
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

const ManagersSkeleton = () => (
  <>
    {Array.from({ length: 9 }).map((_, index) => (
      <div className='flex items-center gap-2 p-2' key={index}>
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-6 flex-1" />
        <Skeleton className="h-6 w-[6rem] px-1" style={{ width: 'calc(100% - 14.5rem)' }} />
        <Skeleton className="h-6 w-10" />
        <div className="h-6 w-4" />
      </div>
    ))}
  </>
);

export const FantasyLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedGW, setSelectedGW] = useState<number>(0);
  const currentLeagueId = VNTRIP_LEAGUE_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hàm reload dữ liệu
  const reloadData = () => {
    setReloadKey(prev => prev + 1);
    setSelectedGW(0);
  };

  // Load all data once when component mounts hoặc khi reloadKey thay đổi
  useEffect(() => {
    const loadAllData = async () => {
      if (!mounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchFantasyVntripData(currentLeagueId, CURRENT_PHASE, selectedGW);
        console.log('----result----', result);

        setLeaderboardData(result.entries);
        setCurrentGW(result.currentGW);
        setTeamStats(calculateTeamStats(result.entries));
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
  }, [mounted, currentLeagueId, reloadKey, selectedGW]);

  return (
    <div className="container mx-auto py-4 px-2">
      <Card className='border-none shadow-none bg-transparent'>
        <CardHeader className='px-0 pt-0'>
          <div className="flex items-center justify-between gap-2">
            <div>
              Gameweek:&nbsp;
              {isLoading ? (
                <span>Đang tải...</span>
              ) : (
                <select
                  value={selectedGW}
                  onChange={e => {
                    setSelectedGW(Number(e.target.value))
                  }}
                  className="border rounded px-1 py-0.5"
                >
                  {Array.from({ length: currentGW }, (_, i) => currentGW - i).map(gw => (
                    <option key={gw} value={gw}>
                      GW {gw}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
        </CardHeader>

        <CardContent className="px-0">
          <div>
            {/* Team Stats Section - chỉ hiển thị cho league vntrip */}
            {!isLoading && teamStats.length > 0 && currentLeagueId === VNTRIP_LEAGUE_ID && (
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {teamStats.map((team, index) => (
                    <Card key={index} className='bg-gray-100 dark:bg-gray-800'>
                      <CardHeader className='p-2'>
                        <CardTitle className={`text-lg text-center ${team.color}`}>{team.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 pb-2">
                        <p className="font-mono text-2xl font-extrabold text-center">{team.totalPoints.toLocaleString()}</p>
                        <p className="text-xs text-center text-muted-foreground">
                          Played: {team.totalPlayed}/{team.totalPlayedMax}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm rounded-t-md">
                <div className="flex gap-1 sm:gap-2 p-2 font-semibold text-xs sm:text-sm border-b">
                  <div className="w-6 sm:w-10 text-center">Rank</div>
                  <div className="w-8 sm:w-10 text-center">Team</div>
                  <div className='flex-1 min-w-0 px-1 sm:px-2'>Manager</div>
                  <div className="w-14 sm:w-[5rem] md:w-[6rem] text-center">(C)</div>
                  <div className="w-10 sm:w-12 text-center">GW</div>
                  <div className="w-4">&nbsp;</div>
                </div>
              </div>

              {isLoading ? (
                <ManagersSkeleton />
              ) : error ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <span className="text-red-500">⚠️ {error}</span>
                  <span className="text-sm text-muted-foreground">Không thể tải dữ liệu từ API</span>
                </div>
              ) : leaderboardData.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">Không có dữ liệu</div>
              ) : (
                <ManagerAccordionList managers={leaderboardData} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
