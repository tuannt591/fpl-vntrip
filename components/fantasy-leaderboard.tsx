"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "./ui/skeleton";
import { ManagerAccordionList } from './ui/manager-accordion-list';
import { LeaderboardEntry, TeamConfig, TeamStats, TeamWeeklyData } from '@/types/fantasy';

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
    return {
      entries: [],
      leagueName: "Không thể tải dữ liệu league",
      currentGW: 0,
    };
  }
};

const fetchTeamWeeklyData = async (): Promise<TeamWeeklyData | null> => {
  try {
    const response = await fetch('/api/fantasy-vntrip/team-weekly');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching team weekly data:', error);
    return null;
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

// Team color mapping
const TEAM_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  '87': { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  '89': { text: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  '3T': { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

// Extract team short name from full name (e.g. "87 Team" -> "87")
const getTeamShortName = (fullName: string) => fullName.replace(' Team', '');

export const FantasyLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedGW, setSelectedGW] = useState<number>(0);
  const [teamWeeklyData, setTeamWeeklyData] = useState<TeamWeeklyData | null>(null);
  const [selectedTeamDialog, setSelectedTeamDialog] = useState<string | null>(null);
  const currentLeagueId = VNTRIP_LEAGUE_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  const reloadData = () => {
    setReloadKey(prev => prev + 1);
    setSelectedGW(0);
  };

  useEffect(() => {
    const loadAllData = async () => {
      if (!mounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const [result, weeklyData] = await Promise.all([
          fetchFantasyVntripData(currentLeagueId, CURRENT_PHASE, selectedGW),
          fetchTeamWeeklyData(),
        ]);
        console.log('----result----', result);

        setLeaderboardData(result.entries);
        setCurrentGW(result.currentGW);
        setTeamStats(calculateTeamStats(result.entries));
        if (weeklyData) setTeamWeeklyData(weeklyData);
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

  // Lấy record cho team đang mở dialog
  const selectedTeamRecord = selectedTeamDialog && teamWeeklyData
    ? teamWeeklyData.teamRecords[selectedTeamDialog]
    : null;

  // Lấy danh sách tuần cho team đang mở dialog
  const selectedTeamWeeks = selectedTeamDialog && teamWeeklyData
    ? [...teamWeeklyData.weeklyResults].reverse().map(week => {
      const teamResult = week.teams.find(t => t.name === selectedTeamDialog);
      return { gw: week.gw, ...teamResult };
    }).filter(w => w.result)
    : [];

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
            {/* Team Stats Section */}
            {!isLoading && teamStats.length > 0 && currentLeagueId === VNTRIP_LEAGUE_ID && (
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {teamStats.map((team, index) => {
                    const shortName = getTeamShortName(team.name);
                    const record = teamWeeklyData?.teamRecords[shortName];
                    const colors = TEAM_COLORS[shortName];
                    return (
                      <Card
                        key={index}
                        className={`bg-gray-100 dark:bg-gray-800 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${record ? 'ring-1 ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600' : ''}`}
                        onClick={() => record && setSelectedTeamDialog(shortName)}
                      >
                        <CardHeader className='p-2'>
                          <CardTitle className={`text-lg text-center ${team.color}`}>{team.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-2">
                          <p className="font-mono text-2xl font-extrabold text-center">{team.totalPoints.toLocaleString()}</p>
                          <p className="text-xs text-center text-muted-foreground">
                            Played: {team.totalPlayed}/{team.totalPlayedMax}
                          </p>
                          {/* W/L inline */}
                          {record && (
                            <div className="flex justify-center gap-2 mt-1.5 text-xs font-mono">
                              <span className="text-green-600 font-bold">{record.wins}W</span>
                              <span className="text-red-500 font-bold">{record.losses}L</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
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
                  <span className="text-green-600 font-bold">{selectedTeamRecord.wins} Thắng</span>
                  {' · '}
                  <span className="text-red-500 font-bold">{selectedTeamRecord.losses} Thua</span>
                  {' · '}
                  <span className="text-muted-foreground">{teamWeeklyData?.totalGW} tuần</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="py-1.5 px-2 text-left font-semibold text-xs">GW</th>
                  <th className="py-1.5 px-2 text-center font-semibold text-xs">Điểm</th>
                  <th className="py-1.5 px-2 text-center font-semibold text-xs">Kết quả</th>
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
                          🏆 Thắng
                        </span>
                      )}
                      {week.result === 'loss' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                          Thua
                        </span>
                      )}
                      {week.result === 'mid' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs">
                          Hoà
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
