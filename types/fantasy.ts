export type Pick = {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
};

export type LivePlayerData = {
  id: number;
  stats: {
    total_points: number;
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    own_goals: number;
    penalties_saved: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    bps: number;
  };
  explain: Array<{
    fixture: number;
    stats: Array<{
      identifier: string;
      points: number;
      value: number;
    }>;
  }>;
};

export type PickWithLive = Pick & {
  liveData?: LivePlayerData | null;
  elementName?: string;
};

export type PicksData = {
  active_chip: string | null;
  automatic_subs: any[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    rank_sort: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: Pick[];
};

export type PicksDataWithLive = Omit<PicksData, 'picks'> & {
  picks: PickWithLive[];
};

export type Transfer = {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  event: number;
  time: string;
};

export type LeaderboardEntry = {
  rank: number;
  manager: string;
  teamName: string;
  gwPoint: number;
  totalPoint: number;
  entry: number;
  picksData?: PicksDataWithLive | null;
  transfers: Transfer[];
  team: string | undefined;
  played: string;
};

export type TeamConfig = {
  name: string;
  entries: number[];
  color: string;
};

export type TeamStats = {
  name: string;
  color: string;
  totalPoints: number;
  averagePoints: number;
  bestRank: number;
  memberCount: number;
  members: LeaderboardEntry[];
};
