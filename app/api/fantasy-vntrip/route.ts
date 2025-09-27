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

async function getFixturesByEventId(eventId: number): Promise<any> {
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
      return calculateBonus(data);
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

function calculateBonus(fixtures: any[]) {
  return fixtures.map(fixture => {
    const bpsStat = fixture.stats.find((s: any) => s.identifier === 'bps');
    if (!bpsStat) {
      return { fixtureId: fixture.id, bonus: {} };
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
//

// Đếm số cầu thủ ra sân
function calculatePlayed(picks: any[], liveData: any, activeChip?: string) {
  let played = 0;

  const starters = picks.filter((p: any) => p.position <= 11);
  const captain = picks.find((p: any) => p.is_captain);
  const viceCaptain = picks.find((p: any) => p.is_vice_captain);

  const isTripleCaptain = activeChip === '3xc'; // chip triple captain

  starters.forEach(pick => {
    const playerLive = liveData.elements.find(
      (el: any) => el.id === pick.element
    );
    const minutes = playerLive?.stats?.minutes ?? 0;

    if (minutes > 0) {
      played += 1;
      if (pick.is_captain) {
        // Captain tính thêm slot nhân đôi / nhân ba
        played += isTripleCaptain ? 2 : 1;
      }
    }
  });

  // Nếu captain không ra sân -> VC sẽ thay
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
        played += isTripleCaptain ? 3 : 2; // VC sẽ nhận multiplier thay captain
      }
    }
  }

  const totalSlots = 11 + (isTripleCaptain ? 2 : 1);
  return `${played}/${totalSlots}`;
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
    const fixtureData = await getFixturesByEventId(eventID);

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

    let entriesWithPicks = await Promise.all(
      leagueData.standings.results.map(async (entry: any) => {
        const picksData = await getPicksByEntryId(entry.entry, eventID);

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
            liveData: live,
            elementName,
            avatar,
            clubName,
          };
        });

        // 2. Merge bonus vào explain (sau khi fixtureData có sẵn)
        const picksWithBonus = picksWithLive.map((pick: any) => {
          const live = pick.liveData;
          if (live && Array.isArray(live.explain)) {
            live.explain = live.explain.map((exp: any) => {
              const fixtureBonus = fixtureData.find(
                (b: any) => b.fixtureId === exp.fixture
              );

              if (fixtureBonus) {
                const bonusPoints = fixtureBonus.bonus[live.id];

                if (bonusPoints) {
                  const hasBonus = exp.stats.some(
                    (s: any) => s.identifier === 'bonus'
                  );

                  if (!hasBonus) {
                    return {
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
              }

              return exp; // không có bonus thì giữ nguyên
            });
          }

          return pick;
        });

        const picksDataWithLive = {
          ...picksData,
          picks: picksWithBonus,
        };

        // Kiểm tra chip và số transfer
        const chipUsed = picksData.active_chip;
        const eventTransfers = picksData.entry_history?.event_transfers ?? 0;

        let transfersThisGW: any[] = [];
        let transfersWithNames: any[] = [];

        if (
          chipUsed !== 'wildcard' &&
          chipUsed !== 'freehit' &&
          eventTransfers > 0
        ) {
          const allTransfers = await getTransferByEntryId(entry.entry);
          transfersThisGW = Array.isArray(allTransfers)
            ? allTransfers.filter((t: any) => t.event === eventID)
            : [];

          transfersWithNames = transfersThisGW.map((t: any) => {
            const inPlayer = elements.find((el: any) => el.id === t.element_in);
            const outPlayer = elements.find(
              (el: any) => el.id === t.element_out
            );
            return {
              element_in_name: inPlayer ? inPlayer.web_name : undefined,
              element_out_name: outPlayer ? outPlayer.web_name : undefined,
            };
          });
        }

        // 👉 Auto Sub Logic
        function applyAutoSub(picks: any[], activeChip?: string) {
          function getPosition(elementId: number) {
            const player = elements.find((el: any) => el.id === elementId);
            // element_type: 1=GK, 2=DEF, 3=MID, 4=FWD
            return player?.element_type;
          }

          function isGoalkeeper(elementId: number) {
            return getPosition(elementId) === 1;
          }

          function isValidFormation(
            startingXI: any[],
            outPlayer: any,
            inPlayer: any
          ) {
            let counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

            startingXI.forEach(p => {
              if (p.element !== outPlayer.element) {
                const pos = getPosition(p.element);
                if (pos === 1) counts.GK++;
                if (pos === 2) counts.DEF++;
                if (pos === 3) counts.MID++;
                if (pos === 4) counts.FWD++;
              }
            });

            // Thêm inPlayer
            const inPos = getPosition(inPlayer.element);
            if (inPos === 1) counts.GK++;
            if (inPos === 2) counts.DEF++;
            if (inPos === 3) counts.MID++;
            if (inPos === 4) counts.FWD++;

            return (
              counts.GK === 1 &&
              counts.DEF >= 3 &&
              counts.MID >= 2 &&
              counts.FWD >= 1 &&
              counts.GK + counts.DEF + counts.MID + counts.FWD === 11
            );
          }

          function replacePlayer(
            startingXI: any[],
            outPlayer: any,
            inPlayer: any
          ) {
            const index = startingXI.findIndex(
              p => p.element === outPlayer.element
            );
            if (index !== -1) {
              console.log(
                `[AutoSub][${entry.entry_name}]`,
                `OUT: ${outPlayer.elementName} (${outPlayer.element})`,
                `=> IN: ${inPlayer.elementName} (${inPlayer.element})`
              );

              // Gán multiplier
              outPlayer.multiplier = 0; // cầu thủ chính không đá
              if (inPlayer.is_captain) {
                // Captain bench lên thay
                inPlayer.multiplier = activeChip === '3xc' ? 3 : 2;
              } else {
                inPlayer.multiplier = 1; // bench bình thường
              }

              startingXI[index] = inPlayer;
            }
          }

          let startingXI = picks.filter(p => p.position <= 11);
          let bench = picks
            .filter(p => p.position > 11)
            .sort((a, b) => a.position - b.position);

          // Trường hợp Captain không ra sân => Vice giữ multiplier
          const captain = picks.find(p => p.is_captain);
          const vice = picks.find(p => p.is_vice_captain);
          if (captain && (captain.liveData?.stats?.minutes ?? 0) === 0) {
            if (vice && (vice.liveData?.stats?.minutes ?? 0) > 0) {
              vice.multiplier = captain.multiplier; // copy multiplier (2 hoặc 3)
              captain.multiplier = 0;
            }
          }

          // Auto-sub bình thường
          for (let player of [...startingXI]) {
            const minutes = player.liveData?.stats?.minutes ?? 0;

            if (minutes === 0) {
              if (isGoalkeeper(player.element)) {
                const subGK = bench.find(b => isGoalkeeper(b.element));
                const subGKMinutes = subGK?.liveData?.stats?.minutes ?? 0;
                if (subGK && subGKMinutes > 0) {
                  replacePlayer(startingXI, player, subGK);
                }
              } else {
                for (let sub of bench) {
                  const subMinutes = sub.liveData?.stats?.minutes ?? 0;
                  if (
                    subMinutes > 0 &&
                    isValidFormation(startingXI, player, sub)
                  ) {
                    replacePlayer(startingXI, player, sub);
                    break;
                  }
                }
              }
            }
          }

          return startingXI;

          // Clone picks để không sửa trực tiếp
          // let updatedPicks = [...picks.map(p => ({ ...p }))];

          // const starters = updatedPicks.filter(p => p.position <= 11);
          // const bench = updatedPicks.filter(p => p.position > 11);

          // // Captain info
          // const captain = updatedPicks.find((p: any) => p.is_captain);
          // const viceCaptain = updatedPicks.find((p: any) => p.is_vice_captain);
          // const isTripleCaptain = activeChip === '3xc';

          // // Đặt multiplier mặc định: đá chính = 1, captain = 2/3, bench = 0
          // starters.forEach(p => {
          //   p.multiplier = 1;
          //   if (p.is_captain) p.multiplier = isTripleCaptain ? 3 : 2;
          // });
          // bench.forEach(p => (p.multiplier = 0));

          // // Kiểm tra từng cầu thủ đá chính
          // for (const starter of starters) {
          //   const minutes = starter.liveData?.stats?.minutes ?? 0;

          //   if (minutes === 0) {
          //     // Starter không ra sân -> cần sub
          //     starter.multiplier = 0;

          //     if (starter.element_type === 1) {
          //       // GK (element_type = 1)
          //       const gkSub = bench.find(p => p.element_type === 1);
          //       if (gkSub) gkSub.multiplier = 1;
          //     } else {
          //       // Outfield (DEF/MID/FWD), theo thứ tự bench
          //       const sub = bench.find(
          //         p =>
          //           p.element_type !== 1 &&
          //           p.liveData?.stats?.minutes > 0 &&
          //           p.multiplier === 0
          //       );
          //       if (sub) sub.multiplier = 1;
          //     }
          //   }
          // }

          // // Nếu captain không ra sân thì VC thay multiplier
          // if (
          //   captain &&
          //   captain.liveData?.stats?.minutes === 0 &&
          //   viceCaptain
          // ) {
          //   const vcMinutes = viceCaptain.liveData?.stats?.minutes;
          //   if (vcMinutes > 0) {
          //     viceCaptain.multiplier = isTripleCaptain ? 3 : 2;
          //   }
          // }

          // return updatedPicks;
        }

        // Áp dụng autosub
        const picksWithAutoSubs = applyAutoSub(
          picksWithBonus,
          picksData.active_chip
        );

        // 👉 Tính điểm GW thực tế từ 11 cầu thủ sau autosub
        // let gwPoint = picksWithLive
        //   .filter((pick: any) => pick.position <= 11) // chỉ lấy 11 cầu thủ chính
        //   .reduce((sum: number, pick: any) => {
        //     const playerPoints = pick.liveData?.stats?.total_points ?? 0;
        //     return sum + playerPoints * pick.multiplier;
        //   }, 0);

        let gwPoint = picksWithBonus
          .filter((pick: any) => pick.position <= 11) // chỉ lấy 11 cầu thủ chính
          .reduce((sum: number, pick: any) => {
            const explain = pick.liveData?.explain ?? [];

            // Tính tổng điểm từ explain
            const playerPoints = explain.reduce(
              (playerSum: number, exp: any) => {
                const fixturePoints = exp.stats.reduce(
                  (statSum: number, s: any) => statSum + (s.points ?? 0),
                  0
                );
                return playerSum + fixturePoints;
              },
              0
            );

            return sum + playerPoints * pick.multiplier;
          }, 0);

        // Trừ điểm trừ chuyển nhượng
        let transferCost = picksData.entry_history?.event_transfers_cost ?? 0;
        gwPoint = gwPoint - transferCost;

        const team = getTeamByEntryId(entry.entry);
        const played = calculatePlayed(
          picksDataWithLive.picks,
          liveData,
          picksData.active_chip
        );

        return {
          rank: entry.rank,
          manager: entry.player_name,
          teamName: entry.entry_name,
          totalPoint: entry.total,
          entry: entry.entry,
          picksData: picksDataWithLive,
          gwPoint,
          team,
          played,
          ...(transfersWithNames.length > 0 && {
            transfers: transfersWithNames,
          }),
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
      fixtureData,
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
