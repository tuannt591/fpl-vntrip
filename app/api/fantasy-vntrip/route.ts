import { PlayerMatchStatus } from '@/types/fantasy';
import { NextRequest, NextResponse } from 'next/server';

async function getBootstrapData(): Promise<any> {
  try {
    const response = await fetch(
      'https://fantasy.premierleague.com/api/bootstrap-static/',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const currentEvent = data.events.find((event: any) => event.is_current);
      return {
        currentEvent: currentEvent ? currentEvent.id : 1,
        elements: data.elements,
        teams: data.teams,
      };
    }
  } catch (error) {
    console.error('Error fetching current gameweek:', error);
  }
  return { currentEvent: 1, elements: [] }; // fallback to gameweek 1
}

async function getElementLiveByEventId(eventId: number): Promise<any> {
  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/event/${eventId}/live/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error fetching element live data:', error);
  }
  return null;
}

async function getLeagueData(leagueId: string, phase: string): Promise<any> {
  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/?page_standings=1&phase=${phase}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const leagueData = await response.json();

    return leagueData;
  } catch (error) {
    console.error('Error fetching element live data:', error);
  }
  return null;
}

async function getFixturesByEventId(
  eventId: number,
  teams: any[]
): Promise<any> {
  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/fixtures/?event=${eventId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return calculateBonus(data, teams);
    }
  } catch (error) {
    console.error('Error fetching element live data:', error);
  }
  return null;
}

async function getPicksByEntryId(
  entryId: number,
  eventId: number
): Promise<any> {
  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/event/${eventId}/picks/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error fetching picks data:', error);
  }
  return null;
}

async function getTransferByEntryId(entryId: number): Promise<any> {
  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/transfers/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error fetching picks data:', error);
  }
  return null;
}

// Tính điểm bonus realtime cầu thủ
function calculateBonus(fixtures: any[], teams: any[]) {
  return fixtures.map(fixture => {
    const teamHome = teams.find(t => t.id === fixture.team_h);
    const teamAway = teams.find(t => t.id === fixture.team_a);

    const fixture_name = `${teamHome?.name || 'Unknown'} - ${
      teamAway?.name || 'Unknown'
    }`;

    const bpsStat = fixture.stats.find((s: any) => s.identifier === 'bps');
    if (!bpsStat) {
      return {
        fixtureId: fixture.id,
        fixture_name,
        bonus: {},
      };
    }

    // Gom tất cả BPS từ home và away
    const allBps = [...bpsStat.a, ...bpsStat.h];

    // Sort giảm dần theo value
    allBps.sort((a, b) => b.value - a.value);

    const bonusMap: Record<number, number> = {};

    let currentRank = 1;
    let i = 0;

    while (i < allBps.length && currentRank <= 3) {
      const sameScoreGroup = allBps.filter(p => p.value === allBps[i].value);
      let bonus = 0;
      if (currentRank === 1) bonus = 3;
      else if (currentRank === 2) bonus = 2;
      else if (currentRank === 3) bonus = 1;

      sameScoreGroup.forEach(p => {
        bonusMap[p.element] = (bonusMap[p.element] || 0) + bonus;
      });

      i += sameScoreGroup.length;
      currentRank += sameScoreGroup.length;
    }

    return {
      fixtureId: fixture.id,
      fixture_name,
      finished_provisional: fixture.finished_provisional,
      minutes: fixture.minutes,
      bonus: bonusMap,
    };
  });
}

// Thêm hàm xác định team theo entryId
function getTeamByEntryId(entryId: number): string | undefined {
  const teams: { [key: string]: number[] } = {
    '87': [2195023, 6293111, 6291846],
    '89': [4565469, 4550400, 5005626],
    '3T': [6400474, 3024127, 6425684],
  };
  for (const [teamName, ids] of Object.entries(teams)) {
    if (ids.includes(entryId)) return teamName;
  }
  return undefined;
}

// Xác định trạng thái thi đấu của 1 cầu thủ trong Gameweek hiện tại
function getMatchStatus(fixture: any, exp: any): string {
  const minutesStat = exp.stats?.find((s: any) => s.identifier === 'minutes');
  const minutes = minutesStat ? minutesStat.value : 0;

  const fixtureMinutes = fixture?.minutes ?? 0;
  const finished = fixture?.finished_provisional ?? false;

  let status: string = PlayerMatchStatus.UNKNOWN;

  // ✅ Logic xác định trạng thái từng trận
  if (!finished && fixtureMinutes === 0) {
    // Trận chưa bắt đầu
    status = PlayerMatchStatus.NOT_STARTED;
  } else if (!finished && fixtureMinutes < 90) {
    // Trận đang diễn ra
    status =
      minutes > 0 ? PlayerMatchStatus.PLAYING : PlayerMatchStatus.SUBSTITUTE;
  } else if (finished) {
    // Trận đã kết thúc
    status =
      minutes > 0 ? PlayerMatchStatus.PLAYED : PlayerMatchStatus.SUBSTITUTE;
  }

  return status;
}

// Đếm số cầu thủ ra sân
function calculatePlayed(picks: any[], liveData: any, activeChip?: string) {
  let played = 0;

  const starters = picks.filter((p: any) => p.position <= 11);
  const captain = picks.find((p: any) => p.is_captain);
  const viceCaptain = picks.find((p: any) => p.is_vice_captain);

  const isTripleCaptain = activeChip === '3xc';
  const isBenchBoost = activeChip === 'bboost';

  // Nếu Bench Boost → tính cả 15 cầu thủ
  const playersToCheck = isBenchBoost ? picks : starters;

  playersToCheck.forEach(pick => {
    const playerLive = liveData.elements.find(
      (el: any) => el.id === pick.element
    );
    const minutes = playerLive?.stats?.minutes ?? 0;

    if (minutes > 0) {
      played += 1;

      // ✅ Captain multiplier (áp dụng cả trong bboost)
      if (pick.is_captain) {
        played += isTripleCaptain ? 2 : 1; // nhân đôi hoặc nhân ba
      }
    }
  });

  // ✅ Nếu captain không ra sân → VC thay
  if (captain) {
    const capLive = liveData.elements.find(
      (el: any) => el.id === captain.element
    );
    const capMinutes = capLive?.stats?.minutes ?? 0;
    if (capMinutes === 0 && viceCaptain) {
      const viceLive = liveData.elements.find(
        (el: any) => el.id === viceCaptain.element
      );
      const viceMinutes = viceLive?.stats?.minutes ?? 0;
      if (viceMinutes > 0) {
        played += isTripleCaptain ? 3 : 2; // VC nhận multiplier thay captain
      }
    }
  }

  // ✅ Tổng slot theo chip
  const total = (() => {
    if (isBenchBoost) return 16; // 15 cầu thủ + captain nhân đôi
    if (isTripleCaptain) return 13;
    return 12;
  })();

  return { played, total };
}

// Lấy danh sách chuyển nhượng của người chơi trong Gameweek hiện tại
async function getTransfersThisGW(
  entryID: number,
  eventID: number,
  elements: any[],
  picksData: any
) {
  const chipUsed = picksData.active_chip;
  const eventTransfers = picksData.entry_history?.event_transfers ?? 0;

  if (
    chipUsed === 'wildcard' ||
    chipUsed === 'freehit' ||
    eventTransfers === 0
  ) {
    return [];
  }

  const allTransfers = await getTransferByEntryId(entryID);

  const transfersThisGW = Array.isArray(allTransfers)
    ? allTransfers.filter((t: any) => t.event === eventID)
    : [];

  const transfersWithNames = transfersThisGW.map((t: any) => {
    const inPlayer = elements.find((el: any) => el.id === t.element_in);
    const outPlayer = elements.find((el: any) => el.id === t.element_out);
    return {
      element_in_name: inPlayer?.web_name,
      element_out_name: outPlayer?.web_name,
    };
  });

  return transfersWithNames;
}

// Tính tổng điểm bonus của 1 cầu thủ dựa trên explain
function calculateBonusPoints(explain: any[]): number {
  return explain.reduce((totalBonus: number, exp: any) => {
    const bonusStat = exp.stats.find((s: any) => s.identifier === 'bonus');
    return totalBonus + (bonusStat?.points ?? 0);
  }, 0);
}

// Tính tổng điểm của 1 cầu thủ dựa trên explain
function calculatePlayerPoints(explain: any[]): number {
  return explain.reduce((playerSum: number, exp: any) => {
    const fixturePoints = exp.stats.reduce(
      (statSum: number, s: any) => statSum + (s.points ?? 0),
      0
    );
    return playerSum + fixturePoints;
  }, 0);
}

/**
 * Tính tổng điểm Gameweek (bao gồm bonus, trừ điểm chuyển nhượng).
 * Nếu dùng Bench Boost thì tính cả cầu thủ dự bị.
 */
function calculateGWPoints(
  picksWithBonus: any[],
  transferCost: number,
  activeChip?: string
): number {
  const isBenchBoost = activeChip === 'bboost';

  // Nếu không dùng bench boost → chỉ lấy 11 cầu thủ chính
  const validPicks = isBenchBoost
    ? picksWithBonus
    : picksWithBonus.filter((pick: any) => pick.position <= 11);

  // Tính tổng điểm cầu thủ
  let gwPoint = validPicks.reduce((sum: number, pick: any) => {
    const explain = pick?.explain ?? [];

    const playerPoints = calculatePlayerPoints(explain);

    return sum + playerPoints * pick.multiplier;
  }, 0);

  // Trừ điểm trừ do chuyển nhượng
  gwPoint -= transferCost;

  return gwPoint;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId') || '314';
  // const pageId = searchParams.get('pageId') || '1';
  const phase = searchParams.get('phase') || '1';
  const gw = searchParams.get('gw') || '0';

  try {
    const { currentEvent, elements, teams } = await getBootstrapData();
    const eventID = gw && parseInt(gw) > 0 ? parseInt(gw) : currentEvent;

    const liveData = await getElementLiveByEventId(eventID);
    const fixtureData = await getFixturesByEventId(eventID, teams);
    const leagueData = await getLeagueData(leagueId, phase);

    let entriesWithPicks = await Promise.all(
      leagueData.standings.results.map(async (entry: any) => {
        const entryId = entry.entry;
        const picksData = await getPicksByEntryId(entryId, eventID);
        const activeChip = picksData.active_chip;
        const transferCost = picksData.entry_history?.event_transfers_cost ?? 0;

        // Lấy danh sách chuyển nhượng của người chơi
        const transfers = await getTransfersThisGW(
          entryId,
          eventID,
          elements,
          picksData
        );

        // 1. Tạo picksWithLive (chỉ lấy liveData, player info, chưa merge bonus)
        const picksWithLive = picksData.picks.map((pick: any) => {
          let live = null;
          let elementName: string | undefined = undefined;
          let avatar: string | undefined = undefined;
          let clubName: string | undefined = undefined;

          if (liveData) {
            live =
              liveData.elements.find((el: any) => el.id === pick.element) ||
              null;
          }
          if (elements) {
            const player = elements.find((el: any) => el.id === pick.element);
            elementName = player ? player.web_name : undefined;
            avatar = player ? `${player.code}.png` : undefined;
            const team = teams.find((t: any) => t.id === player.team);
            clubName = team ? team.name : undefined;
          }

          return {
            ...pick,
            elementName,
            avatar,
            clubName,
            explain: live.explain,
            stats: live.stats,
          };
        });

        // 2. Merge bonus vào explain (sau khi fixtureData có sẵn)
        const picksWithBonus = picksWithLive.map((pick: any) => {
          if (Array.isArray(pick.explain)) {
            // 1️⃣ Cập nhật explain với bonus
            pick.explain = pick.explain.map((exp: any) => {
              const fixture = fixtureData.find(
                (b: any) => String(b.fixtureId) === String(exp.fixture)
              );

              const match_status = getMatchStatus(fixture, exp);

              const bonusPoints = fixture?.bonus[pick.element];

              if (bonusPoints) {
                const hasBonus = exp.stats.some(
                  (s: any) => s.identifier === 'bonus'
                );

                if (!hasBonus) {
                  return {
                    match_status,
                    ...fixture,
                    ...exp,
                    stats: [
                      ...exp.stats,
                      {
                        identifier: 'bonus',
                        points: bonusPoints,
                        value: bonusPoints,
                        points_modification: 0,
                      },
                    ],
                  };
                }
              }

              return { ...exp, ...fixture, match_status };
            });

            // 2️⃣ Sau khi merge bonus -> tính lại tổng điểm cầu thủ
            const explain = pick.explain ?? [];
            const playerPoints = calculatePlayerPoints(explain);
            const bonusPoints = calculateBonusPoints(explain);

            // 3️⃣ Cập nhật live.stats
            pick.stats = {
              ...(pick.stats || {}),
              bonus: bonusPoints,
              total_points: playerPoints,
            };
          }

          return pick;
        });

        const picksDataWithLive = {
          ...picksData,
          picks: picksWithBonus,
        };

        const gwPoint = calculateGWPoints(
          picksWithBonus,
          transferCost,
          activeChip
        );

        const team = getTeamByEntryId(entryId);
        const playedInfo = calculatePlayed(
          picksDataWithLive.picks,
          liveData,
          activeChip
        );

        return {
          rank: entry.rank,
          manager: entry.player_name,
          teamName: entry.entry_name,
          totalPoint: entry.total,
          entry: entryId,
          // picksData: picksDataWithLive,
          gwPoint,
          team,
          playedInfo,
          transfers,
          activeChip,
          entryHistory: {
            transferCost: picksData.entry_history.event_transfers_cost,
            bank: picksData.entry_history.bank,
            value: picksData.entry_history.value,
          },
          picks: picksDataWithLive.picks,
        };
      })
    );

    entriesWithPicks = entriesWithPicks
      .sort((a, b) => b.gwPoint - a.gwPoint)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // Add current gameweek to the response
    const enhancedData = {
      entries: entriesWithPicks,
      leagueName: leagueData?.league.name || 'Unknown League',
      currentGW: currentEvent,
    };

    return NextResponse.json(enhancedData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
