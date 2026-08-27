// FPL Fantasy League Configuration

export const FPL_API_BASE = 'https://fantasy.premierleague.com/api';

export const TEAMS_CONFIG: { [key: string]: number[] } = {
  'Vinno': [2673641, 2799618, 2673983, 3620408],
  'Americano': [1672330, 1640295, 3781088, 4849930]
};

// Manager avatar mapping (entryId -> image filename in /public)
export const MANAGER_AVATARS: Record<number, string> = {
  2673641: '/tho.jpg',
  2799618: '/chuchinh.jpg',
  2673983: '/tanzon.jpg',
  3620408: '/tuanmet.jpg',
  1672330: '/namtran.jpg',
  1640295: '/hieubeo.jpg',
  3781088: '/tuanmua.jpg',
  4849930: '/tunglinh.jpg',
};

// Win/Loss records are only counted from this GW onwards
export const WIN_LOSS_START_GW = 1;

// Entries to exclude from the leaderboard
export const EXCLUDED_ENTRIES: number[] = [];

// Bootstrap data cache duration (ms)
export const CACHE_DURATION = 60 * 1000;

// League config
export const VNTRIP_LEAGUE_ID = '529755';
export const CURRENT_PHASE = 1;

// FPL entry IDs are season-specific, so every claim and H2H record must carry
// the season it belongs to. Override this at deploy time for a new season.
export const FPL_SEASON = process.env.FPL_SEASON || '2026-27';
