import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import type {
  AppProfile,
  ClaimedManager,
  H2HGroupMatch,
  H2HMatchParticipant,
  H2HMatchStatus,
  H2HParticipantResult,
} from '@/types/h2h';

type ProfileRow = {
  id: string;
  ermis_user_id: string;
  email: string;
  display_name: string | null;
  is_h2h_enabled: boolean;
};

type ManagerEntryRow = {
  id: string;
  profile_id: string;
  season: string;
  league_id: string;
  entry_id: number;
  manager_name: string;
  team_name: string;
  manager_avatar: string | null;
  claimed_at: string;
};

type ParticipantRow = {
  id: string;
  manager_entry_id: string;
  points: number | null;
  rank: number | null;
  result: H2HParticipantResult;
  manager: ManagerEntryRow | ManagerEntryRow[] | null;
};

type MatchRow = {
  id: string;
  season: string;
  league_id: string;
  gameweek: number;
  initiated_by_profile_id: string;
  status: H2HMatchStatus;
  participant_count: number;
  locked_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  participants: ParticipantRow[] | null;
};

const PROFILE_COLUMNS =
  'id,ermis_user_id,email,display_name,is_h2h_enabled';
const MANAGER_COLUMNS =
  'id,profile_id,season,league_id,entry_id,manager_name,team_name,manager_avatar,claimed_at';
const MATCH_COLUMNS = `
  id,
  season,
  league_id,
  gameweek,
  initiated_by_profile_id,
  status,
  participant_count,
  locked_at,
  completed_at,
  cancelled_at,
  created_at,
  participants:h2h_match_participants(
    id,
    manager_entry_id,
    points,
    rank,
    result,
    manager:fpl_manager_entries(
      ${MANAGER_COLUMNS}
    )
  )
`;

function mapProfile(row: ProfileRow): AppProfile {
  return {
    id: row.id,
    ermisUserId: row.ermis_user_id,
    email: row.email,
    displayName: row.display_name,
    isH2HEnabled: row.is_h2h_enabled,
  };
}

function mapManager(row: ManagerEntryRow): ClaimedManager {
  return {
    id: row.id,
    profileId: row.profile_id,
    season: row.season,
    leagueId: row.league_id,
    entryId: Number(row.entry_id),
    managerName: row.manager_name,
    teamName: row.team_name,
    managerAvatar: row.manager_avatar,
    claimedAt: row.claimed_at,
  };
}

function mapParticipant(row: ParticipantRow): H2HMatchParticipant {
  const manager = Array.isArray(row.manager) ? row.manager[0] : row.manager;
  if (!manager) {
    throw new Error('H2H participant is missing its manager entry.');
  }

  return {
    id: row.id,
    managerEntryId: row.manager_entry_id,
    points: row.points === null ? null : Number(row.points),
    rank: row.rank === null ? null : Number(row.rank),
    result: row.result,
    manager: mapManager(manager),
  };
}

function mapMatch(row: MatchRow): H2HGroupMatch {
  const participants = (row.participants ?? []).map(mapParticipant);
  participants.sort((a, b) => {
    if (a.rank !== null && b.rank !== null && a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    return a.manager.managerName.localeCompare(b.manager.managerName);
  });

  return {
    id: row.id,
    season: row.season,
    leagueId: row.league_id,
    gameweek: Number(row.gameweek),
    initiatedByProfileId: row.initiated_by_profile_id,
    status: row.status,
    participantCount: Number(row.participant_count),
    lockedAt: row.locked_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    participants,
  };
}

export async function upsertProfile(input: {
  ermisUserId: string;
  email: string;
  displayName: string | null;
}): Promise<AppProfile> {
  const supabase = getSupabaseServerClient();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        ermis_user_id: input.ermisUserId,
        email: normalizedEmail,
        display_name: input.displayName,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'ermis_user_id' },
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Unable to save app profile: ${error?.message ?? 'No data returned'}`);
  }

  return mapProfile(data as ProfileRow);
}

export async function getProfileById(profileId: string): Promise<AppProfile | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', profileId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load app profile: ${error.message}`);
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function getManagerClaim(
  profileId: string,
  season: string,
  leagueId: string,
): Promise<ClaimedManager | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('fpl_manager_entries')
    .select(MANAGER_COLUMNS)
    .eq('profile_id', profileId)
    .eq('season', season)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load manager claim: ${error.message}`);
  return data ? mapManager(data as ManagerEntryRow) : null;
}

export async function getLeagueClaims(
  season: string,
  leagueId: string,
): Promise<ClaimedManager[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('fpl_manager_entries')
    .select(MANAGER_COLUMNS)
    .eq('season', season)
    .eq('league_id', leagueId);

  if (error) throw new Error(`Unable to load manager claims: ${error.message}`);
  return ((data ?? []) as ManagerEntryRow[]).map(mapManager);
}

export async function createManagerClaim(input: {
  profileId: string;
  season: string;
  leagueId: string;
  entryId: number;
  managerName: string;
  teamName: string;
  managerAvatar: string | null;
}): Promise<ClaimedManager> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('fpl_manager_entries')
    .insert({
      profile_id: input.profileId,
      season: input.season,
      league_id: input.leagueId,
      entry_id: input.entryId,
      manager_name: input.managerName,
      team_name: input.teamName,
      manager_avatar: input.managerAvatar,
    })
    .select(MANAGER_COLUMNS)
    .single();

  if (error || !data) {
    const claimError = new Error(
      `Unable to claim manager: ${error?.message ?? 'No data returned'}`,
    ) as Error & { code?: string };
    claimError.code = error?.code;
    throw claimError;
  }

  return mapManager(data as ManagerEntryRow);
}

export async function getClaimedManagersByEntryIds(
  season: string,
  leagueId: string,
  entryIds: number[],
): Promise<ClaimedManager[]> {
  if (entryIds.length === 0) return [];

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('fpl_manager_entries')
    .select(MANAGER_COLUMNS)
    .eq('season', season)
    .eq('league_id', leagueId)
    .in('entry_id', entryIds);

  if (error) throw new Error(`Unable to load claimed managers: ${error.message}`);
  return ((data ?? []) as ManagerEntryRow[]).map(mapManager);
}

export async function getH2HMatches(
  season: string,
  leagueId: string,
): Promise<H2HGroupMatch[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('h2h_matches')
    .select(MATCH_COLUMNS)
    .eq('season', season)
    .eq('league_id', leagueId)
    .neq('status', 'cancelled')
    .order('gameweek', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Unable to load H2H matches: ${error.message}`);
  return ((data ?? []) as unknown as MatchRow[]).map(mapMatch);
}

export async function getH2HMatchById(
  matchId: string,
): Promise<H2HGroupMatch | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('h2h_matches')
    .select(MATCH_COLUMNS)
    .eq('id', matchId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load H2H match: ${error.message}`);
  return data ? mapMatch(data as unknown as MatchRow) : null;
}

export async function createH2HGroup(input: {
  season: string;
  leagueId: string;
  gameweek: number;
  initiatedByProfileId: string;
  managerEntryIds: string[];
}): Promise<H2HGroupMatch> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_h2h_group', {
    p_season: input.season,
    p_league_id: input.leagueId,
    p_gameweek: input.gameweek,
    p_initiated_by_profile_id: input.initiatedByProfileId,
    p_manager_entry_ids: input.managerEntryIds,
  });

  if (error || typeof data !== 'string') {
    const createError = new Error(
      `Unable to create H2H group: ${error?.message ?? 'No match ID returned'}`,
    ) as Error & { code?: string };
    createError.code = error?.code;
    throw createError;
  }

  const match = await getH2HMatchById(data);
  if (!match) throw new Error('Created H2H group could not be loaded.');
  return match;
}

export async function lockH2HMatches(matchIds: string[]): Promise<void> {
  if (matchIds.length === 0) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('h2h_matches')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .in('id', matchIds)
    .eq('status', 'open');

  if (error) throw new Error(`Unable to lock H2H matches: ${error.message}`);
}

export async function cancelH2HMatch(
  matchId: string,
  initiatedByProfileId: string,
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('h2h_matches')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      updated_at: now,
    })
    .eq('id', matchId)
    .eq('initiated_by_profile_id', initiatedByProfileId)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Unable to cancel H2H match: ${error.message}`);
  return Boolean(data);
}

export async function completeH2HGroup(
  matchId: string,
  results: Array<{
    managerEntryId: string;
    points: number;
    rank: number;
    result: Exclude<H2HParticipantResult, 'pending'>;
  }>,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc('complete_h2h_group', {
    p_match_id: matchId,
    p_results: results.map((result) => ({
      manager_entry_id: result.managerEntryId,
      points: result.points,
      rank: result.rank,
      result: result.result,
    })),
  });

  if (error) throw new Error(`Unable to complete H2H group: ${error.message}`);
}
