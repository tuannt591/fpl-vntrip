import { PlayerMatchStatus } from '@/types/fantasy';
import { FPL_API_BASE, TEAMS_CONFIG, WIN_LOSS_START_GW, EXCLUDED_ENTRIES, CACHE_DURATION } from '@/lib/fpl-config';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getEntryHistory(entryId: number): Promise<any> {
  try {
    const response = await fetch(
      `${FPL_API_BASE}/entry/${entryId}/history/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 },
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

async function getWeeklyTeamResults(currentEvent: number): Promise<any> {
  try {
    const allEntryIds = Object.values(TEAMS_CONFIG).flat();
    const histories = await Promise.all(allEntryIds.map(id => getEntryHistory(id)));

    const historyMap: Record<number, any[]> = {};
    allEntryIds.forEach((entryId, index) => {
      const history = histories[index];
      if (history?.current) {
        historyMap[entryId] = history.current;
      }
    });

    const weeklyResults: any[] = [];
    for (let gw = 2; gw <= currentEvent; gw++) {
      const teamResults = [];
      for (const [teamName, entryIds] of Object.entries(TEAMS_CONFIG)) {
        let teamTotal = 0;
        const members = [];
        for (const entryId of entryIds) {
          const gwData = historyMap[entryId]?.find((h: any) => h.event === gw);
          const points = gwData ? gwData.points : 0;
          teamTotal += points;
          members.push({ entryId, points });
        }
        teamResults.push({ name: teamName, points: teamTotal, members });
      }

      const maxPoints = Math.max(...teamResults.map(t => t.points));
      const minPoints = Math.min(...teamResults.map(t => t.points));

      const teamsWithResult = teamResults.map(team => {
        let result = 'mid';
        if (team.points === maxPoints && maxPoints !== minPoints) {
          result = 'win';
        } else if (team.points === minPoints && maxPoints !== minPoints) {
          result = 'loss';
        }
        return { ...team, result };
      });
      teamsWithResult.sort((a, b) => b.points - a.points);
      weeklyResults.push({ gw, teams: teamsWithResult });
    }

    const teamRecords: Record<string, any> = {};
    Object.keys(TEAMS_CONFIG).forEach(teamName => {
      teamRecords[teamName] = { wins: 0, losses: 0, mid: 0 };
    });

    weeklyResults.forEach(week => {
      if (week.gw < WIN_LOSS_START_GW) return;
      week.teams.forEach((team: any) => {
        if (team.result === 'win') teamRecords[team.name].wins++;
        else if (team.result === 'loss') teamRecords[team.name].losses++;
        else teamRecords[team.name].mid++;
      });
    });

    const filteredWeeklyResults = weeklyResults.filter(week => week.gw >= WIN_LOSS_START_GW);
    return { teamRecords, weeklyResults: filteredWeeklyResults, totalGW: currentEvent, winLossStartGW: WIN_LOSS_START_GW };
  } catch (err) {
    console.error('Error calculating weekly team results:', err);
    return null;
  }
}


let cachedBootstrapData: any = null;
let lastFetchTime: number = 0;

async function getBootstrapData(): Promise<any> {
  const now = Date.now();

  if (cachedBootstrapData && now - lastFetchTime < CACHE_DURATION) {
    console.log('[API] bootstrap-static -> RAM Cache Hit ✅');
    return cachedBootstrapData;
  }

  try {
    const response = await fetch(
      `${FPL_API_BASE}/bootstrap-static/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
      },
    );

    console.log(`[API] bootstrap-static -> status: ${response.status} (New Fetch)`);

    if (response.ok) {
      const data = await response.json();
      const currentEvent = data.events.find((event: any) => event.is_current);
      const finalResult = {
        currentEvent: currentEvent ? currentEvent.id : 1,
        elements: data.elements,
        teams: data.teams,
      };

      cachedBootstrapData = finalResult;
      lastFetchTime = now;

      return finalResult;
    }
  } catch (error) {
    console.error('[API] Error fetching bootstrap-static:', error);
  }
  
  return cachedBootstrapData || { currentEvent: 1, elements: [], teams: [] }; // fallback
}

async function getElementLiveByEventId(eventId: number): Promise<any> {
  try {
    const response = await fetch(
      `${FPL_API_BASE}/event/${eventId}/live/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 30 },
      },
    );

    console.log(`[API] event/${eventId}/live -> status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error(`[API] Error fetching event/${eventId}/live:`, error);
  }
  return null;
}

async function getLeagueData(leagueId: string, phase: string): Promise<any> {
  try {
    const response = await fetch(
      `${FPL_API_BASE}/leagues-classic/${leagueId}/standings/?page_standings=1&phase=${phase}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 },
      },
    );

    console.log(`[API] leagues-classic/${leagueId} -> status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const leagueData = await response.json();

    return leagueData;
  } catch (error) {
    console.error(`[API] Error fetching league ${leagueId}:`, error);
  }
  return null;
}

async function getFixturesByEventId(
  eventId: number,
  teams: any[],
): Promise<any> {
  try {
    const response = await fetch(
      `${FPL_API_BASE}/fixtures/?event=${eventId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 30 },
      },
    );

    console.log(`[API] fixtures/?event=${eventId} -> status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      return calculateBonus(data, teams);
    }
  } catch (error) {
    console.error(`[API] Error fetching fixtures for event ${eventId}:`, error);
  }
  return null;
}

async function getPicksByEntryId(
  entryId: number,
  eventId: number,
): Promise<any> {
  try {
    const response = await fetch(
      `${FPL_API_BASE}/entry/${entryId}/event/${eventId}/picks/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 30 },
      },
    );

    console.log(`[API] entry/${entryId}/picks -> status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error(`[API] Error fetching picks for entry ${entryId}:`, error);
  }
  return null;
}

async function getTransferByEntryId(entryId: number): Promise<any> {
  try {
    const response = await fetch(
      `${FPL_API_BASE}/entry/${entryId}/transfers/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 30 },
      },
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

// Calculate real-time bonus points for players
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

    // Group all BPS from home and away
    const allBps = [...bpsStat.a, ...bpsStat.h];

    // Sort descending by value
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

// Helper to determine team by entryId
function getTeamByEntryId(entryId: number): string | undefined {
  for (const [teamName, ids] of Object.entries(TEAMS_CONFIG)) {
    if (ids.includes(entryId)) return teamName;
  }
  return undefined;
}

// Check if all matches for a player are finished
function checkAllMatchesFinished(pick: any): boolean {
  const explain = pick?.explain ?? [];
  if (explain.length === 0) return false;
  return explain.every((exp: any) => exp.finished_provisional === true);
}

// Calculate effective multiplier based on captain/vice-captain status
function calculateEffectiveMultiplier(
  pick: any,
  captain: any,
  viceCaptain: any,
  captainDidNotPlay: boolean,
  isTripleCaptain: boolean,
): number {
  // If captain played or match is not finished -> keep original multiplier
  if (!captainDidNotPlay) {
    return pick.multiplier;
  }

  // Captain did not play (matches finished) -> captain multiplier = 0
  if (pick.is_captain) {
    return 0;
  }

  // Vice-captain gets multiplier instead of captain
  if (pick.is_vice_captain) {
    const viceMinutes = pick?.stats?.minutes ?? 0;
    if (viceMinutes > 0) {
      return isTripleCaptain ? 3 : 2;
    }
  }

  // Keep original multiplier for other players
  return pick.multiplier;
}

// Determine match status for a player in current Gameweek
function getMatchStatus(fixture: any, exp: any): string {
  const minutesStat = exp.stats?.find((s: any) => s.identifier === 'minutes');
  const minutes = minutesStat ? minutesStat.value : 0;

  const fixtureMinutes = fixture?.minutes ?? 0;
  const finished = fixture?.finished_provisional ?? false;

  let status: string = PlayerMatchStatus.UNKNOWN;

  // ✅ Match status logic
  if (!finished && fixtureMinutes === 0) {
    // Match not started
    status = PlayerMatchStatus.NOT_STARTED;
  } else if (!finished && fixtureMinutes < 90) {
    // Match in progress
    status =
      minutes > 0 ? PlayerMatchStatus.PLAYING : PlayerMatchStatus.SUBSTITUTE;
  } else if (finished) {
    // Match finished
    status =
      minutes > 0 ? PlayerMatchStatus.PLAYED : PlayerMatchStatus.SUBSTITUTE;
  }

  return status;
}

/**
 * Apply auto-sub logic
 * FPL Rules:
 * - GK only replaces GK (position 12)
 * - Outfield replaces outfield in order (position 13, 14, 15)
 * - Only replace when starter has 0 mins AND all matches finished
 * - Sub must have > 0 mins to be counted
 *
 * @param requireFinished - If true, only auto-sub when matches finish (for calculating points).
 *                          If false, show potential auto-sub (for UI display).
 */
function applyAutoSub(
  picks: any[],
  liveData: any,
  requireFinished: boolean = false,
): any[] {
  // Create copy to avoid mutating original array
  const result = picks.map(p => ({ ...p, isAutoSubIn: false }));

  const starters = result.filter(p => p.position <= 11);
  const bench = result
    .filter(p => p.position > 11)
    .sort((a, b) => a.position - b.position);

  const getMinutes = (pick: any) => {
    const live = liveData.elements.find((el: any) => el.id === pick.element);
    return live?.stats?.minutes ?? 0;
  };

  const isGK = (pick: any) => pick.element_type === 1; // element_type 1 = GK

  // Find starters who did not play (0 mins AND all matches finished)
  // Only auto-sub when certain player will not play
  // Do not auto-sub if match is not started or ongoing
  const startersNotPlayed = starters.filter(pick => {
    const minutes = getMinutes(pick);
    const allFinished = checkAllMatchesFinished(pick);
    return minutes === 0 && allFinished;
  });

  // Process auto-sub for each non-playing starter
  let usedBenchPositions: number[] = [];

  startersNotPlayed.forEach(starter => {
    const starterIsGK = isGK(starter);

    // Find eligible substitute
    const eligibleSubs = bench.filter(sub => {
      // Skip if already used
      if (usedBenchPositions.includes(sub.position)) return false;

      const subMinutes = getMinutes(sub);
      const subAllFinished = checkAllMatchesFinished(sub);

      // Sub must have played (> 0 mins)
      if (subMinutes === 0) return false;

      // GK only replaces GK
      if (starterIsGK) {
        return isGK(sub);
      }

      // Outfield replaces outfield (not GK)
      return !isGK(sub);
    });

    if (eligibleSubs.length > 0) {
      // Get first available sub by bench order
      const sub = eligibleSubs[0];
      usedBenchPositions.push(sub.position);

      // Mark sub as subbed in
      const subIndex = result.findIndex(p => p.element === sub.element);
      if (subIndex !== -1) {
        result[subIndex].isAutoSubIn = true;
      }
    }
  });

  return result;
}

// Count players who played (including auto-subs)
function calculatePlayed(picks: any[], liveData: any, activeChip?: string) {
  let played = 0;

  const captain = picks.find((p: any) => p.is_captain);
  const viceCaptain = picks.find((p: any) => p.is_vice_captain);

  const isTripleCaptain = activeChip === '3xc';
  const isBenchBoost = activeChip === 'bboost';

  // Apply auto-sub to determine scoring players
  const picksWithAutoSub = applyAutoSub(picks, liveData);

  // Determine players who count towards points
  const playersToCheck = isBenchBoost
    ? picksWithAutoSub // Bench Boost: all 15 players
    : picksWithAutoSub.filter((p: any) => p.position <= 11 || p.isAutoSubIn); // Starters + auto-subs

  playersToCheck.forEach(pick => {
    const playerLive = liveData.elements.find(
      (el: any) => el.id === pick.element,
    );
    const minutes = playerLive?.stats?.minutes ?? 0;

    if (minutes > 0) {
      played += 1;

      // ✅ Captain multiplier (applies even in bboost)
      if (pick.is_captain) {
        played += isTripleCaptain ? 2 : 1; // double or triple
      }
    }
  });

  // ✅ If captain did not play AND all captain matches finished -> VC replaces
  if (captain) {
    const capLive = liveData.elements.find(
      (el: any) => el.id === captain.element,
    );
    const capMinutes = capLive?.stats?.minutes ?? 0;
    const captainPick = picks.find((p: any) => p.element === captain.element);
    const allCaptainMatchesFinished = checkAllMatchesFinished(captainPick);

    // Only when captain has 0 mins AND all captain matches finished
    if (capMinutes === 0 && allCaptainMatchesFinished && viceCaptain) {
      const viceLive = liveData.elements.find(
        (el: any) => el.id === viceCaptain.element,
      );
      const viceMinutes = viceLive?.stats?.minutes ?? 0;
      if (viceMinutes > 0) {
        played += isTripleCaptain ? 3 : 2; // VC receives captain multiplier
      }
    }
  }

  // ✅ Total slots based on chips
  const total = (() => {
    if (isBenchBoost) return 16; // 15 players + doubled captain
    if (isTripleCaptain) return 13;
    return 12;
  })();

  return { played, total };
}

// Get player transfers in current Gameweek
async function getTransfersThisGW(
  entryID: number,
  eventID: number,
  elements: any[],
  picksData: any,
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

// Calculate total bonus points for a player based on explain object
function calculateBonusPoints(explain: any[]): number {
  return explain.reduce((totalBonus: number, exp: any) => {
    const bonusStat = exp.stats.find((s: any) => s.identifier === 'bonus');
    return totalBonus + (bonusStat?.points ?? 0);
  }, 0);
}

// Calculate total points for a player based on explain object
function calculatePlayerPoints(explain: any[]): number {
  return explain.reduce((playerSum: number, exp: any) => {
    const fixturePoints = exp.stats.reduce(
      (statSum: number, s: any) => statSum + (s.points ?? 0),
      0,
    );
    return playerSum + fixturePoints;
  }, 0);
}

/**
 * Calculate total Gameweek points (including bonus, minus transfer hits).
 * If Bench Boost is active, include subs.
 * If not, include auto-subs.
 */
function calculateGWPoints(
  picksWithBonus: any[],
  transferCost: number,
  liveData: any,
  activeChip?: string,
): number {
  const isBenchBoost = activeChip === 'bboost';
  const isTripleCaptain = activeChip === '3xc';

  // Find captain and vice-captain
  const captain = picksWithBonus.find((p: any) => p.is_captain);
  const viceCaptain = picksWithBonus.find((p: any) => p.is_vice_captain);

  // Check if captain played (only when all matches finished)
  const captainMinutes = captain?.stats?.minutes ?? 0;
  const allCaptainMatchesFinished = checkAllMatchesFinished(captain);
  const captainDidNotPlay = captainMinutes === 0 && allCaptainMatchesFinished;

  // Apply auto-sub (requireFinished = true to only score when matches finished)
  const picksWithAutoSub = applyAutoSub(picksWithBonus, liveData, true);

  // Determine players who count towards points
  const validPicks = isBenchBoost
    ? picksWithAutoSub
    : picksWithAutoSub.filter(
        (pick: any) => pick.position <= 11 || pick.isAutoSubIn,
      );

  // Calculate total player points
  let gwPoint = validPicks.reduce((sum: number, pick: any) => {
    const explain = pick?.explain ?? [];
    const playerPoints = calculatePlayerPoints(explain);

    // Auto-sub players get 1x multiplier
    if (pick.isAutoSubIn) {
      return sum + playerPoints * 1;
    }

    // Calculate effective multiplier for starters
    const realMultiplier = calculateEffectiveMultiplier(
      pick,
      captain,
      viceCaptain,
      captainDidNotPlay,
      isTripleCaptain,
    );

    return sum + playerPoints * realMultiplier;
  }, 0);

  // Subtract transfer cost hits
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

    console.log(`[API] Request: leagueId=${leagueId}, phase=${phase}, gw=${eventID}`);

    const [liveData, fixtureData, leagueData, teamWeeklyData] = await Promise.all([
      getElementLiveByEventId(eventID),
      getFixturesByEventId(eventID, teams),
      getLeagueData(leagueId, phase),
      getWeeklyTeamResults(currentEvent),
    ]);

    // Null checks — FPL API có thể block IP Vercel hoặc rate-limit
    if (!liveData) {
      console.error('[API] liveData is null — FPL event/live API failed');
      return NextResponse.json(
        { error: 'FPL API unavailable: could not fetch live data. Possibly rate-limited.' },
        { status: 502 },
      );
    }
    if (!fixtureData) {
      console.error('[API] fixtureData is null — FPL fixtures API failed');
      return NextResponse.json(
        { error: 'FPL API unavailable: could not fetch fixture data. Possibly rate-limited.' },
        { status: 502 },
      );
    }
    if (!leagueData?.standings?.results) {
      console.error('[API] leagueData is null or missing standings — FPL league API failed');
      return NextResponse.json(
        { error: 'FPL API unavailable: could not fetch league data. Possibly rate-limited.' },
        { status: 502 },
      );
    }


    let entriesWithPicks = await Promise.all(
      leagueData.standings.results
        .filter((entry: any) => !EXCLUDED_ENTRIES.includes(entry.entry))
        .map(async (entry: any) => {
        const entryId = entry.entry;
        const picksData = await getPicksByEntryId(entryId, eventID);
        if (!picksData) {
          console.warn(`[API] picksData is null for entry ${entryId} — skipping`);
          return null;
        }
        const activeChip = picksData.active_chip;
        const transferCost = picksData.entry_history?.event_transfers_cost ?? 0;

        // Get transfer list for player
        const transfers = await getTransfersThisGW(
          entryId,
          eventID,
          elements,
          picksData,
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

        // 2. Merge bonus into explain array (after fixtureData is ready)
        const picksWithBonus = picksWithLive.map((pick: any) => {
          if (Array.isArray(pick.explain)) {
            // 1️⃣ Update explain array with bonus
            pick.explain = pick.explain.map((exp: any) => {
              const fixture = fixtureData.find(
                (b: any) => String(b.fixtureId) === String(exp.fixture),
              );

              const match_status = getMatchStatus(fixture, exp);
              const isFinished = fixture?.finished_provisional === true;

              // Check if bonus already exists in exp.stats
              const existingBonusStat = exp.stats.find(
                (s: any) => s.identifier === 'bonus',
              );

              // If match finished -> use bonus from API (if any)
              // If match in progress -> calculate realtime bonus from BPS
              let bonusToAdd: number | null = null;

              if (isFinished) {
                // Match finished: dùng bonus từ live.stats (API chính thức)
                // Do NOT add to exp.stats because API already returns it
                // Official bonus will be calculated from live.stats.bonus
              } else {
                // Match in progress: dùng realtime bonus từ BPS
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

            // 2️⃣ After merging bonus -> recalculate player total points
            const explain = pick.explain ?? [];
            const playerPointsFromExplain = calculatePlayerPoints(explain);
            const bonusPointsFromExplain = calculateBonusPoints(explain);

            // Check if any match has finished
            const hasFinishedMatch = explain.some(
              (exp: any) => exp.finished_provisional === true,
            );

            // If a match finished -> prioritize bonus from API (pick.stats.bonus)
            // If all matches in progress -> use realtime bonus from explain
            const apiBonusPoints = pick.stats?.bonus ?? 0;
            const finalBonusPoints = hasFinishedMatch
              ? Math.max(apiBonusPoints, bonusPointsFromExplain) // Take the larger value to ensure no missing bonus
              : bonusPointsFromExplain;

            // Total points = explain points + bonus (if not in explain)
            const totalPoints = playerPointsFromExplain;

            // 3️⃣ Update live.stats
            pick.stats = {
              ...(pick.stats || {}),
              bonus: finalBonusPoints,
              total_points: totalPoints,
            };
          }

          return pick;
        });

        // Apply auto-sub logic to mark subbed-in players
        // (Apply only when NOT using Bench Boost)
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
          activeChip,
        );

        const team = getTeamByEntryId(entryId);
        const playedInfo = calculatePlayed(
          picksDataWithLive.picks,
          liveData,
          activeChip,
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
      }),
    );

    // Filter out null entries (failed picks fetches)
    entriesWithPicks = entriesWithPicks
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.gwPoint - a.gwPoint)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // Add current gameweek to the response
    const enhancedData = {
      entries: entriesWithPicks,
      leagueName: leagueData?.league.name || 'Unknown League',
      currentGW: currentEvent,
      teamWeeklyData,
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
      },
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
