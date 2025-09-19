"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "./ui/skeleton";
import { ManagerAccordionList } from './ui/manager-accordion-list';
import { LeaderboardEntry, TeamConfig, TeamStats } from '@/types/fantasy';

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

const ManagersSkeleton = () => (
  <>
    {Array.from({ length: 9 }).map((_, index) => (
      <div className='flex items-center gap-1 p-2' key={index}>
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-6 flex-1" />
        <Skeleton className="h-6 w-[6rem] px-1" style={{ width: 'calc(100% - 12rem)' }} />
        <Skeleton className="h-6 w-10" />
        <div className="h-6 w-4" />
      </div>
    ))}
  </>
);

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
      <Card className='border-none shadow-none bg-transparent'>
        <CardHeader className='pb-2 px-0'>
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

        <CardContent className="px-0">
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
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {teamStats.map((team, index) => (
                    <Card key={index} className='bg-gray-100 dark:bg-gray-800'>
                      <CardHeader className='p-2'>
                        <CardTitle className="text-lg text-center">{team.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 pb-2">
                        <p className="font-mono text-2xl font-extrabold text-green-700 text-center">{team.totalPoints.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm rounded-t-md">
                <div className="flex p-2 font-semibold text-sm border-b">
                  <div className="w-10">Rank</div>
                  <div className='px-1' style={{ width: 'calc(100% - 12rem)' }}>Manager</div>
                  <div className="w-[6rem] text-center">(C)</div>
                  <div className="w-10 text-center">GW {currentGW}</div>
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
                <ManagerAccordionList managers={leaderboardData} currentGW={currentGW} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
