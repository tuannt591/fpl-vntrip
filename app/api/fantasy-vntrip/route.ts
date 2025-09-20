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

        const picksDataWithLive = {
          ...picksData,
          picks: picksWithLive,
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

        // Tính điểm GW thực tế
        let gwPoint = picksData.entry_history?.points ?? entry.gw;
        let transferCost = picksData.entry_history?.event_transfers_cost ?? 0;
        gwPoint = gwPoint - transferCost;
        const team = getTeamByEntryId(entry.entry);

        return {
          rank: entry.rank,
          manager: entry.player_name,
          teamName: entry.entry_name,
          totalPoint: entry.total,
          entry: entry.entry,
          picksData: picksDataWithLive,
          gwPoint: gwPoint,
          team,
          // Chỉ thêm thông tin transfers nếu có
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
