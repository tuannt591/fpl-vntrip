import 'server-only';

import { CACHE_DURATION, FPL_API_BASE } from '@/lib/fpl-config';

export type FplBootstrapStatic = {
  elements: any[];
  teams: any[];
  events: any[];
};

let cachedBootstrapData: FplBootstrapStatic | null = null;
let cacheExpiresAt = 0;
let pendingBootstrapRequest: Promise<FplBootstrapStatic> | null = null;

function fplHeaders() {
  return {
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

async function fetchBootstrapData(): Promise<FplBootstrapStatic> {
  const response = await fetch(`${FPL_API_BASE}/bootstrap-static/`, {
    headers: fplHeaders(),
    // The FPL bootstrap response can exceed Next.js Data Cache's 2 MiB limit.
    // Cache it in this process instead of asking Next.js to persist the raw body.
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`FPL bootstrap request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as Partial<FplBootstrapStatic>;
  if (
    !Array.isArray(data.elements) ||
    !Array.isArray(data.teams) ||
    !Array.isArray(data.events)
  ) {
    throw new Error('FPL bootstrap response has an invalid shape.');
  }

  return {
    elements: data.elements,
    teams: data.teams,
    events: data.events,
  };
}

/**
 * Returns a process-local, short-lived copy of bootstrap-static.
 *
 * The in-flight request is shared so concurrent leaderboard and H2H requests
 * do not create duplicate upstream calls on a cold cache.
 */
export async function getFplBootstrapStatic(): Promise<FplBootstrapStatic> {
  const now = Date.now();
  if (cachedBootstrapData && now < cacheExpiresAt) {
    return cachedBootstrapData;
  }

  if (!pendingBootstrapRequest) {
    pendingBootstrapRequest = fetchBootstrapData()
      .then((data) => {
        cachedBootstrapData = data;
        cacheExpiresAt = Date.now() + CACHE_DURATION;
        return data;
      })
      .finally(() => {
        pendingBootstrapRequest = null;
      });
  }

  try {
    return await pendingBootstrapRequest;
  } catch (error) {
    // A short stale response is preferable to failing a request after a
    // temporary upstream issue. The next request will attempt a refresh again.
    if (cachedBootstrapData) {
      return cachedBootstrapData;
    }
    throw error;
  }
}
