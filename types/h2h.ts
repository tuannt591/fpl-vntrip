export type H2HMatchStatus = 'open' | 'locked' | 'completed' | 'cancelled';

export type H2HParticipantResult =
  | 'pending'
  | 'winner'
  | 'joint_winner'
  | 'loss'
  | 'draw';

export type AppProfile = {
  id: string;
  ermisUserId: string;
  email: string;
  displayName: string | null;
  isH2HEnabled: boolean;
};

export type ClaimedManager = {
  id: string;
  profileId: string;
  season: string;
  leagueId: string;
  entryId: number;
  managerName: string;
  teamName: string;
  managerAvatar: string | null;
  claimedAt: string;
};

export type H2HManagerOption = {
  entryId: number;
  managerName: string;
  teamName: string;
  managerAvatar: string | null;
  claimed: boolean;
  claimedByMe: boolean;
};

export type H2HMatchParticipant = {
  id: string;
  managerEntryId: string;
  points: number | null;
  rank: number | null;
  result: H2HParticipantResult;
  manager: ClaimedManager;
};

export type H2HGroupMatch = {
  id: string;
  season: string;
  leagueId: string;
  gameweek: number;
  initiatedByProfileId: string;
  status: H2HMatchStatus;
  participantCount: number;
  lockedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  participants: H2HMatchParticipant[];
};

export type H2HGameweekContext = {
  currentGameweek: number | null;
  creationGameweek: number | null;
  creationDeadlineTime: string | null;
  canCreate: boolean;
};

export type AppSession = {
  version: 1;
  profileId: string;
  ermisUserId: string;
  email: string;
  expiresAt: number;
};
