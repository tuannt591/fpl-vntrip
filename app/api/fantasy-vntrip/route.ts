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

// Kiểm tra xem tất cả trận của 1 cầu thủ đã kết thúc chưa
function checkAllMatchesFinished(pick: any): boolean {
  const explain = pick?.explain ?? [];
  if (explain.length === 0) return false;
  return explain.every((exp: any) => exp.finished_provisional === true);
}

// Tính multiplier thực tế dựa trên captain/vice-captain status
function calculateEffectiveMultiplier(
  pick: any,
  captain: any,
  viceCaptain: any,
  captainDidNotPlay: boolean,
  isTripleCaptain: boolean
): number {
  // Nếu captain đã đá hoặc chưa kết thúc trận → giữ nguyên multiplier từ API
  if (!captainDidNotPlay) {
    return pick.multiplier;
  }

  // Captain không đá (trận đã kết thúc) → captain multiplier = 0
  if (pick.is_captain) {
    return 0;
  }

  // Vice-captain nhận multiplier thay captain
  if (pick.is_vice_captain) {
    const viceMinutes = pick?.stats?.minutes ?? 0;
    if (viceMinutes > 0) {
      return isTripleCaptain ? 3 : 2;
    }
  }

  // Các cầu thủ khác giữ nguyên
  return pick.multiplier;
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

/**
 * Áp dụng logic auto-sub (thay người tự động)
 * Quy tắc FPL:
 * - GK chỉ thay cho GK (position 12)
 * - Outfield thay cho outfield theo thứ tự (position 13, 14, 15)
 * - Chỉ thay khi cầu thủ chính có 0 phút VÀ tất cả trận đã kết thúc
 * - Cầu thủ dự bị phải có > 0 phút mới được tính vào
 * 
 * @param requireFinished - Nếu true, chỉ auto-sub khi trận kết thúc (cho tính điểm). 
 *                          Nếu false, hiển thị potential auto-sub (cho UI display).
 */
function applyAutoSub(picks: any[], liveData: any, requireFinished: boolean = false): any[] {
  // Tạo copy để không mutate original
  const result = picks.map(p => ({ ...p, isAutoSubIn: false }));

  const starters = result.filter(p => p.position <= 11);
  const bench = result.filter(p => p.position > 11).sort((a, b) => a.position - b.position);

  const getMinutes = (pick: any) => {
    const live = liveData.elements.find((el: any) => el.id === pick.element);
    return live?.stats?.minutes ?? 0;
  };

  const isGK = (pick: any) => pick.element_type === 1; // element_type 1 = GK

  // Tìm các cầu thủ chính không ra sân (0 phút)
  // Nếu requireFinished = true, phải đợi trận kết thúc (cho tính điểm)
  // Nếu requireFinished = false, hiển thị potential auto-sub (cho UI)
  const startersNotPlayed = starters.filter(pick => {
    const minutes = getMinutes(pick);
    if (requireFinished) {
      const allFinished = checkAllMatchesFinished(pick);
      return minutes === 0 && allFinished;
    }
    return minutes === 0;
  });

  // Xử lý auto-sub cho từng cầu thủ không ra sân
  let usedBenchPositions: number[] = [];

  startersNotPlayed.forEach(starter => {
    const starterIsGK = isGK(starter);

    // Tìm cầu thủ dự bị phù hợp
    const eligibleSubs = bench.filter(sub => {
      // Đã dùng rồi thì skip
      if (usedBenchPositions.includes(sub.position)) return false;

      const subMinutes = getMinutes(sub);
      const subAllFinished = checkAllMatchesFinished(sub);

      // Sub phải đã đá (> 0 phút)
      if (subMinutes === 0) return false;

      // GK chỉ thay cho GK
      if (starterIsGK) {
        return isGK(sub);
      }

      // Outfield thay cho outfield (không phải GK)
      return !isGK(sub);
    });

    if (eligibleSubs.length > 0) {
      // Lấy sub đầu tiên theo thứ tự ghế dự bị
      const sub = eligibleSubs[0];
      usedBenchPositions.push(sub.position);

      // Đánh dấu sub được vào sân
      const subIndex = result.findIndex(p => p.element === sub.element);
      if (subIndex !== -1) {
        result[subIndex].isAutoSubIn = true;
      }
    }
  });

  return result;
}

// Đếm số cầu thủ ra sân (bao gồm auto-sub)
function calculatePlayed(picks: any[], liveData: any, activeChip?: string) {
  let played = 0;

  const captain = picks.find((p: any) => p.is_captain);
  const viceCaptain = picks.find((p: any) => p.is_vice_captain);

  const isTripleCaptain = activeChip === '3xc';
  const isBenchBoost = activeChip === 'bboost';

  // Áp dụng auto-sub để xác định cầu thủ được tính điểm
  const picksWithAutoSub = applyAutoSub(picks, liveData);

  // Xác định các cầu thủ được tính điểm
  const playersToCheck = isBenchBoost
    ? picksWithAutoSub // Bench Boost: tất cả 15 cầu thủ
    : picksWithAutoSub.filter((p: any) => p.position <= 11 || p.isAutoSubIn); // Starters + auto-sub

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

  // ✅ Nếu captain không ra sân VÀ tất cả trận của captain đã kết thúc → VC thay
  if (captain) {
    const capLive = liveData.elements.find(
      (el: any) => el.id === captain.element
    );
    const capMinutes = capLive?.stats?.minutes ?? 0;
    const captainPick = picks.find((p: any) => p.element === captain.element);
    const allCaptainMatchesFinished = checkAllMatchesFinished(captainPick);

    // Chỉ khi captain có 0 phút VÀ tất cả trận của captain đã kết thúc
    if (capMinutes === 0 && allCaptainMatchesFinished && viceCaptain) {
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
 * Nếu không dùng Bench Boost, tính cả auto-sub.
 */
function calculateGWPoints(
  picksWithBonus: any[],
  transferCost: number,
  liveData: any,
  activeChip?: string
): number {
  const isBenchBoost = activeChip === 'bboost';
  const isTripleCaptain = activeChip === '3xc';

  // Tìm captain và vice-captain
  const captain = picksWithBonus.find((p: any) => p.is_captain);
  const viceCaptain = picksWithBonus.find((p: any) => p.is_vice_captain);

  // Kiểm tra captain có đá không (chỉ khi tất cả trận đã kết thúc)
  const captainMinutes = captain?.stats?.minutes ?? 0;
  const allCaptainMatchesFinished = checkAllMatchesFinished(captain);
  const captainDidNotPlay = captainMinutes === 0 && allCaptainMatchesFinished;

  // Áp dụng auto-sub (requireFinished = true để chỉ tính điểm khi trận kết thúc)
  const picksWithAutoSub = applyAutoSub(picksWithBonus, liveData, true);

  // Xác định các cầu thủ được tính điểm
  const validPicks = isBenchBoost
    ? picksWithAutoSub
    : picksWithAutoSub.filter((pick: any) => pick.position <= 11 || pick.isAutoSubIn);

  // Tính tổng điểm cầu thủ
  let gwPoint = validPicks.reduce((sum: number, pick: any) => {
    const explain = pick?.explain ?? [];
    const playerPoints = calculatePlayerPoints(explain);

    // Cầu thủ auto-sub có multiplier = 1
    if (pick.isAutoSubIn) {
      return sum + playerPoints * 1;
    }

    // Tính multiplier thực tế cho các cầu thủ chính
    const realMultiplier = calculateEffectiveMultiplier(
      pick,
      captain,
      viceCaptain,
      captainDidNotPlay,
      isTripleCaptain
    );

    return sum + playerPoints * realMultiplier;
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

        const picksWithLive = picksData.picks.map((pick: any) => {
          let live = null;
          let elementName: string | undefined = undefined;
          let avatar: string | undefined = undefined;
          let clubName: string | undefined = undefined;
          let elementType: number | undefined = undefined;

          if (liveData) {
            live =
              liveData.elements.find((el: any) => el.id === pick.element) ||
              null;
          }
          if (elements) {
            const player = elements.find((el: any) => el.id === pick.element);
            elementName = player ? player.web_name : undefined;
            avatar = player ? `${player.code}.png` : undefined;
            elementType = player ? player.element_type : undefined;
            const team = teams.find((t: any) => t.id === player.team);
            clubName = team ? team.name : undefined;
          }

          return {
            ...pick,
            elementName,
            avatar,
            clubName,
            element_type: elementType,
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
              const isFinished = fixture?.finished_provisional === true;

              // Kiểm tra bonus đã có trong exp.stats chưa
              const existingBonusStat = exp.stats.find(
                (s: any) => s.identifier === 'bonus'
              );

              // Nếu trận đã kết thúc → dùng bonus từ API (nếu có)
              // Nếu trận đang diễn ra → tính realtime bonus từ BPS
              let bonusToAdd: number | null = null;

              if (isFinished) {
                // Trận đã kết thúc: dùng bonus từ live.stats (API chính thức)
                // KHÔNG thêm gì vào exp.stats vì API đã trả về đúng
                // Bonus chính thức sẽ được tính từ live.stats.bonus
              } else {
                // Trận đang diễn ra: dùng realtime bonus từ BPS
                const realtimeBonus = fixture?.bonus[pick.element];
                if (realtimeBonus && !existingBonusStat) {
                  bonusToAdd = realtimeBonus;
                }
              }

              if (bonusToAdd !== null) {
                return {
                  match_status,
                  ...fixture,
                  ...exp,
                  stats: [
                    ...exp.stats,
                    {
                      identifier: 'bonus',
                      points: bonusToAdd,
                      value: bonusToAdd,
                      points_modification: 0,
                    },
                  ],
                };
              }

              return { ...exp, ...fixture, match_status };
            });

            // 2️⃣ Sau khi merge bonus -> tính lại tổng điểm cầu thủ
            const explain = pick.explain ?? [];
            const playerPointsFromExplain = calculatePlayerPoints(explain);
            const bonusPointsFromExplain = calculateBonusPoints(explain);

            // Kiểm tra xem có trận nào đã kết thúc không
            const hasFinishedMatch = explain.some(
              (exp: any) => exp.finished_provisional === true
            );

            // Nếu có trận đã kết thúc → ưu tiên bonus từ API (pick.stats.bonus)
            // Nếu tất cả trận đang diễn ra → dùng bonus realtime từ explain
            const apiBonusPoints = pick.stats?.bonus ?? 0;
            const finalBonusPoints = hasFinishedMatch
              ? Math.max(apiBonusPoints, bonusPointsFromExplain) // Lấy giá trị lớn hơn để đảm bảo không mất bonus
              : bonusPointsFromExplain;

            // Total points = explain points + bonus (nếu chưa có trong explain)
            const totalPoints = playerPointsFromExplain;

            // 3️⃣ Cập nhật live.stats
            pick.stats = {
              ...(pick.stats || {}),
              bonus: finalBonusPoints,
              total_points: totalPoints,
            };
          }

          return pick;
        });

        // Áp dụng auto-sub logic để đánh dấu cầu thủ vào thay
        // (Chỉ áp dụng khi KHÔNG dùng Bench Boost)
        const isBenchBoost = activeChip === 'bboost';
        const finalPicks = isBenchBoost
          ? picksWithBonus.map((p: any) => ({ ...p, isAutoSubIn: false }))
          : applyAutoSub(picksWithBonus, liveData);

        const picksDataWithLive = {
          ...picksData,
          picks: finalPicks,
        };

        const gwPoint = calculateGWPoints(
          picksWithBonus,
          transferCost,
          liveData,
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
