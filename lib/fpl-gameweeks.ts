import 'server-only';

import { FPL_API_BASE } from '@/lib/fpl-config';

export type FplGameweek = {
  id: number;
  name: string;
  deadlineTime: string;
  finished: boolean;
  isCurrent: boolean;
  isNext: boolean;
};

type BootstrapEvent = {
  id?: unknown;
  name?: unknown;
  deadline_time?: unknown;
  finished?: unknown;
  is_current?: unknown;
  is_next?: unknown;
};

type EntryHistoryEvent = {
  event?: unknown;
  points?: unknown;
  event_transfers_cost?: unknown;
};

function fplHeaders() {
  return {
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

export async function getFplGameweeks(): Promise<FplGameweek[]> {
  const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`, {
    headers: fplHeaders(),
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`FPL bootstrap request failed with status ${response.status}.`);
  }

  const body = (await response.json()) as { events?: BootstrapEvent[] };
  return (body.events ?? [])
    .map((event): FplGameweek | null => {
      const id = Number(event.id);
      if (!Number.isSafeInteger(id) || id < 1 || id > 38) return null;

      const deadlineTime =
        typeof event.deadline_time === 'string' ? event.deadline_time : '';
      if (!deadlineTime || Number.isNaN(Date.parse(deadlineTime))) return null;

      return {
        id,
        name: typeof event.name === 'string' ? event.name : `Gameweek ${id}`,
        deadlineTime,
        finished: event.finished === true,
        isCurrent: event.is_current === true,
        isNext: event.is_next === true,
      };
    })
    .filter((event): event is FplGameweek => Boolean(event))
    .sort((a, b) => a.id - b.id);
}

export function getFplGameweekContext(gameweeks: FplGameweek[]) {
  const now = Date.now();
  const current =
    gameweeks.find((event) => event.isCurrent) ??
    [...gameweeks]
      .reverse()
      .find((event) => Date.parse(event.deadlineTime) <= now) ??
    null;
  const creation =
    gameweeks.find(
      (event) => !event.finished && Date.parse(event.deadlineTime) > now,
    ) ?? null;

  return {
    currentGameweek: current?.id ?? null,
    creationGameweek: creation?.id ?? null,
    creationDeadlineTime: creation?.deadlineTime ?? null,
    canCreate: Boolean(creation),
  };
}

export async function getFplEntryHistoryPoints(
  entryId: number,
): Promise<Map<number, number>> {
  const response = await fetch(`${FPL_API_BASE}/entry/${entryId}/history/`, {
    headers: fplHeaders(),
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(
      `FPL history request for entry ${entryId} failed with status ${response.status}.`,
    );
  }

  const body = (await response.json()) as { current?: EntryHistoryEvent[] };
  const pointsByGameweek = new Map<number, number>();

  for (const event of body.current ?? []) {
    const gameweek = Number(event.event);
    const points = Number(event.points);
    const transferCost = Number(event.event_transfers_cost ?? 0);
    if (
      Number.isSafeInteger(gameweek) &&
      gameweek > 0 &&
      Number.isFinite(points) &&
      Number.isFinite(transferCost)
    ) {
      pointsByGameweek.set(gameweek, points - transferCost);
    }
  }

  return pointsByGameweek;
}
