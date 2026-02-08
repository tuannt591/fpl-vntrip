export type Pick = {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  stats: any;
  explain: any[];
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
  isAutoSubIn?: boolean;
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
  transfers: Transfer[];
  team: string | undefined;
  playedInfo: any;
  picks: PickWithLive[];
  entryHistory: any;
  activeChip: string;
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
  totalPlayed: number;
  totalPlayedMax: number;
};

export enum PlayerMatchStatus {
  NOT_STARTED = 'not_started', // Trận chưa bắt đầu
  PLAYING = 'playing', // Đang thi đấu
  PLAYED = 'played', // Đã thi đấu
  SUBSTITUTE = 'substitute', // Dự bị (không ra sân)
  // SUB_ON = 'sub_on', // Vào sân từ ghế dự bị
  // SUB_OFF = 'sub_off', // Bị thay ra khỏi sân
  UNKNOWN = 'unknown', // Không xác định
}
