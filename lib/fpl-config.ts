// FPL Fantasy League Configuration

export const FPL_API_BASE = 'https://fantasy.premierleague.com/api';

export const TEAMS_CONFIG: { [key: string]: number[] } = {
  '87': [2195023, 6293111, 6291846, 6400474],
  '89': [4565469, 4550400, 5005626, 6425684],
};

// Win/Loss records are only counted from this GW onwards
export const WIN_LOSS_START_GW = 32;

// Entries to exclude from the leaderboard
export const EXCLUDED_ENTRIES = [3024127];

// Bootstrap data cache duration (ms)
export const CACHE_DURATION = 60 * 1000;

// League config
export const VNTRIP_LEAGUE_ID = '1405297';
export const CURRENT_PHASE = 1;
