import { NextResponse } from 'next/server';

// Cấu hình team
const TEAMS: { [key: string]: number[] } = {
  '87': [2195023, 6293111, 6291846],
  '89': [4565469, 4550400, 5005626],
  '3T': [6400474, 3024127, 6425684],
};

type WeeklyTeamResult = {
  name: string;
  points: number;
  result: 'win' | 'loss' | 'mid';
  members: { entryId: number; points: number }[];
};

type WeeklyResult = {
  gw: number;
  teams: WeeklyTeamResult[];
};

type TeamRecord = {
  wins: number;
  losses: number;
  mid: number;
};

// Fetch lịch sử điểm của 1 entry
async function getEntryHistory(entryId: number): Promise<any> {
  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/history/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error(`Error fetching history for entry ${entryId}:`, error);
  }
  return null;
}

// Fetch thông tin GW hiện tại
async function getCurrentEvent(): Promise<number> {
  try {
    const response = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      const currentEvent = data.events.find((event: any) => event.is_current);
      return currentEvent ? currentEvent.id : 1;
    }
  } catch (error) {
    console.error('Error fetching current event:', error);
  }
  return 1;
}

export async function GET() {
  try {
    // 1. Fetch history cho tất cả 9 người chơi song song
    const allEntryIds = Object.values(TEAMS).flat();
    const [currentGW, ...histories] = await Promise.all([
      getCurrentEvent(),
      ...allEntryIds.map(id => getEntryHistory(id)),
    ]);

    // 2. Map entryId -> history data
    const historyMap: Record<number, any[]> = {};
    allEntryIds.forEach((entryId, index) => {
      const history = histories[index];
      if (history?.current) {
        historyMap[entryId] = history.current;
      }
    });

    // 3. Tính điểm team mỗi GW
    const weeklyResults: WeeklyResult[] = [];

    // Bắt đầu từ GW2, GW1 là tuần nháp không tính
    for (let gw = 2; gw <= currentGW; gw++) {
      const teamResults: {
        name: string;
        points: number;
        members: { entryId: number; points: number }[];
      }[] = [];

      for (const [teamName, entryIds] of Object.entries(TEAMS)) {
        let teamTotal = 0;
        const members: { entryId: number; points: number }[] = [];

        for (const entryId of entryIds) {
          const gwData = historyMap[entryId]?.find((h: any) => h.event === gw);
          // points đã bao gồm điểm GW chính thức (sau auto-sub, bonus, trừ transfer cost)
          const points = gwData ? gwData.points : 0;
          teamTotal += points;
          members.push({ entryId, points });
        }

        teamResults.push({
          name: teamName,
          points: teamTotal,
          members,
        });
      }

      // Xác định thắng/thua
      const maxPoints = Math.max(...teamResults.map(t => t.points));
      const minPoints = Math.min(...teamResults.map(t => t.points));

      const teamsWithResult: WeeklyTeamResult[] = teamResults.map(team => {
        let result: 'win' | 'loss' | 'mid';
        if (team.points === maxPoints && maxPoints !== minPoints) {
          result = 'win';
        } else if (team.points === minPoints && maxPoints !== minPoints) {
          result = 'loss';
        } else if (maxPoints === minPoints) {
          // Tất cả bằng nhau → mid (hòa)
          result = 'mid';
        } else {
          result = 'mid';
        }
        return { ...team, result };
      });

      // Sort theo điểm giảm dần
      teamsWithResult.sort((a, b) => b.points - a.points);

      weeklyResults.push({
        gw,
        teams: teamsWithResult,
      });
    }

    // 4. Tính tổng record cho mỗi team
    const teamRecords: Record<string, TeamRecord> = {};
    for (const teamName of Object.keys(TEAMS)) {
      teamRecords[teamName] = { wins: 0, losses: 0, mid: 0 };
    }

    weeklyResults.forEach(week => {
      week.teams.forEach(team => {
        if (team.result === 'win') teamRecords[team.name].wins++;
        else if (team.result === 'loss') teamRecords[team.name].losses++;
        else teamRecords[team.name].mid++;
      });
    });

    return NextResponse.json(
      {
        teamRecords,
        weeklyResults,
        totalGW: currentGW,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      },
    );
  } catch (error) {
    console.error('Error calculating team weekly results:', error);
    return NextResponse.json(
      { error: 'Failed to calculate team weekly results' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
}
