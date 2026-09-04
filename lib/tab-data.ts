import { loadClientData, readClientData, setClientData } from "@/lib/client-data-cache";
import type { TeamWeeklyData, LeaderboardEntry } from "@/types/fantasy";
import type {
  AppProfile,
  ClaimedManager,
  H2HGameweekContext,
  H2HGroupMatch,
  H2HManagerOption,
} from "@/types/h2h";

const FANTASY_STALE_TIME = 60_000;
const H2H_STALE_TIME = 30_000;
const MANAGERS_KEY = "h2h:managers";
const MATCHES_KEY = "h2h:matches";

export type FantasyLeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentGW: number;
  teamWeeklyData?: TeamWeeklyData | null;
  error?: string;
};

export type ManagerOptionsResponse = {
  season: string;
  leagueId: string;
  profile: AppProfile;
  myManager: ClaimedManager | null;
  managers: H2HManagerOption[];
};

export type MatchesResponse = {
  season: string;
  leagueId: string;
  myManager: ClaimedManager | null;
  gameweek: H2HGameweekContext;
  matches: H2HGroupMatch[];
};

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function fantasyKey(leagueId: string, phase: number, gw: number) {
  return `fantasy:${leagueId}:${phase}:${gw}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;
  const errorMessage =
    data && typeof data === "object" && "error" in data
      ? data.error
      : undefined;
  if (!response.ok || !data) {
    throw new ApiRequestError(
      errorMessage || `Không thể tải dữ liệu (mã ${response.status}).`,
      response.status,
    );
  }
  return data as T;
}

export function getCachedFantasyLeaderboardData(leagueId: string, phase: number, gw: number) {
  return readClientData<FantasyLeaderboardResponse>(fantasyKey(leagueId, phase, gw));
}

export function loadFantasyLeaderboardData(
  leagueId: string,
  phase: number,
  gw: number,
  force = false,
) {
  const params = new URLSearchParams({ leagueId, phase: phase.toString() });
  if (gw > 0) params.append("gw", gw.toString());
  const key = fantasyKey(leagueId, phase, gw);

  return loadClientData(
    key,
    async () => {
      const data = await fetchJson<FantasyLeaderboardResponse>(`/api/fantasy-vntrip?${params}`);
      if (!Array.isArray(data.entries)) {
        throw new ApiRequestError("Không thể tải bảng xếp hạng.", 500);
      }
      return data;
    },
    FANTASY_STALE_TIME,
    force,
  );
}

export function getCachedManagerOptions() {
  return readClientData<ManagerOptionsResponse>(MANAGERS_KEY);
}

export function setCachedManagerOptions(data: ManagerOptionsResponse) {
  setClientData(MANAGERS_KEY, data, H2H_STALE_TIME);
}

export function loadManagerOptions(force = false) {
  return loadClientData(
    MANAGERS_KEY,
    () => fetchJson<ManagerOptionsResponse>("/api/h2h/managers"),
    H2H_STALE_TIME,
    force,
  );
}

export function getCachedMatches() {
  return readClientData<MatchesResponse>(MATCHES_KEY);
}

export function loadMatches(force = false) {
  return loadClientData(
    MATCHES_KEY,
    () => fetchJson<MatchesResponse>("/api/h2h/matches"),
    H2H_STALE_TIME,
    force,
  );
}
