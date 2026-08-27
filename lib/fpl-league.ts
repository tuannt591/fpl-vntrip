import 'server-only';

import {
  CURRENT_PHASE,
  EXCLUDED_ENTRIES,
  FPL_API_BASE,
  MANAGER_AVATARS,
  VNTRIP_LEAGUE_ID,
} from '@/lib/fpl-config';

export type FplLeagueManager = {
  entryId: number;
  managerName: string;
  teamName: string;
  managerAvatar: string | null;
};

type LeagueStandingsResponse = {
  standings?: {
    has_next?: boolean;
    results?: Array<{
      entry: number;
      player_name: string;
      entry_name: string;
    }>;
  };
};

export async function getFplLeagueManagers(
  leagueId: string = VNTRIP_LEAGUE_ID,
  phase: number = CURRENT_PHASE,
): Promise<FplLeagueManager[]> {
  const managers: FplLeagueManager[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= 20) {
    const response = await fetch(
      `${FPL_API_BASE}/leagues-classic/${leagueId}/standings/?page_standings=${page}&phase=${phase}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      throw new Error(`FPL league request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as LeagueStandingsResponse;
    const results = data.standings?.results ?? [];

    results.forEach((entry) => {
      if (EXCLUDED_ENTRIES.includes(entry.entry)) return;

      managers.push({
        entryId: entry.entry,
        managerName: entry.player_name,
        teamName: entry.entry_name,
        managerAvatar: MANAGER_AVATARS[entry.entry] ?? null,
      });
    });

    hasNext = data.standings?.has_next === true;
    page += 1;
  }

  return managers;
}
