create table public.h2h_match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.h2h_matches(id) on delete cascade,
  manager_entry_id uuid not null references public.fpl_manager_entries(id) on delete restrict,
  points integer,
  rank smallint check (rank is null or rank > 0),
  result text not null default 'pending'
    check (result in ('pending', 'winner', 'joint_winner', 'loss', 'draw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint h2h_match_participants_match_manager_unique
    unique (match_id, manager_entry_id)
);

insert into public.h2h_match_participants (
  match_id,
  manager_entry_id,
  points,
  rank,
  result
)
select
  match.id,
  match.player_a_entry_id,
  match.player_a_points,
  case
    when match.status <> 'completed' then null
    when match.player_a_points >= match.player_b_points then 1
    else 2
  end,
  case
    when match.status <> 'completed' then 'pending'
    when match.player_a_points = match.player_b_points then 'draw'
    when match.player_a_points > match.player_b_points then 'winner'
    else 'loss'
  end
from public.h2h_matches as match;

insert into public.h2h_match_participants (
  match_id,
  manager_entry_id,
  points,
  rank,
  result
)
select
  match.id,
  match.player_b_entry_id,
  match.player_b_points,
  case
    when match.status <> 'completed' then null
    when match.player_b_points >= match.player_a_points then 1
    else 2
  end,
  case
    when match.status <> 'completed' then 'pending'
    when match.player_a_points = match.player_b_points then 'draw'
    when match.player_b_points > match.player_a_points then 'winner'
    else 'loss'
  end
from public.h2h_matches as match;

drop index if exists public.h2h_matches_unique_active_pair_idx;
drop index if exists public.h2h_matches_player_a_idx;
drop index if exists public.h2h_matches_player_b_idx;

alter table public.h2h_matches
  drop constraint if exists h2h_matches_different_players,
  drop constraint if exists h2h_matches_winner_is_participant,
  drop constraint if exists h2h_matches_completed_has_points,
  drop constraint if exists h2h_matches_non_completed_has_no_winner;

alter table public.h2h_matches
  add column participant_key text,
  add column participant_count smallint not null default 2
    check (participant_count >= 2);

update public.h2h_matches as match
set participant_key = participant_keys.value
from (
  select
    participant.match_id,
    string_agg(participant.manager_entry_id::text, ':' order by participant.manager_entry_id::text) as value
  from public.h2h_match_participants as participant
  group by participant.match_id
) as participant_keys
where participant_keys.match_id = match.id;

alter table public.h2h_matches
  alter column participant_key set not null,
  drop column player_a_entry_id,
  drop column player_b_entry_id,
  drop column player_a_points,
  drop column player_b_points,
  drop column winner_entry_id;

create unique index h2h_matches_unique_active_group_idx
  on public.h2h_matches (season, league_id, gameweek, participant_key)
  where status <> 'cancelled';

create index h2h_match_participants_manager_idx
  on public.h2h_match_participants (manager_entry_id, match_id);

create index h2h_match_participants_match_rank_idx
  on public.h2h_match_participants (match_id, rank);

create trigger h2h_match_participants_set_updated_at
before update on public.h2h_match_participants
for each row execute function public.set_updated_at();

alter table public.h2h_match_participants enable row level security;

revoke all on table public.h2h_match_participants from anon, authenticated;
grant all on table public.h2h_match_participants to service_role;

create or replace function public.create_h2h_group(
  p_season text,
  p_league_id text,
  p_gameweek smallint,
  p_initiated_by_profile_id uuid,
  p_manager_entry_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_match_id uuid;
  v_participant_key text;
  v_requested_count integer;
  v_unique_count integer;
  v_valid_count integer;
begin
  v_requested_count := cardinality(p_manager_entry_ids);

  if v_requested_count is null or v_requested_count < 2 then
    raise exception using errcode = '22023', message = 'A group H2H needs at least two managers.';
  end if;

  select count(distinct manager_entry_id)
  into v_unique_count
  from unnest(p_manager_entry_ids) as requested(manager_entry_id);

  if v_unique_count <> v_requested_count then
    raise exception using errcode = '22023', message = 'A manager cannot appear twice in one H2H group.';
  end if;

  select count(*)
  into v_valid_count
  from public.fpl_manager_entries as manager
  where manager.id = any(p_manager_entry_ids)
    and manager.season = p_season
    and manager.league_id = p_league_id;

  if v_valid_count <> v_requested_count then
    raise exception using errcode = '22023', message = 'Every participant must be a claimed manager in the current league and season.';
  end if;

  if not exists (
    select 1
    from public.fpl_manager_entries as manager
    where manager.id = any(p_manager_entry_ids)
      and manager.profile_id = p_initiated_by_profile_id
      and manager.season = p_season
      and manager.league_id = p_league_id
  ) then
    raise exception using errcode = '22023', message = 'The group creator must participate in the H2H match.';
  end if;

  select string_agg(manager_entry_id::text, ':' order by manager_entry_id::text)
  into v_participant_key
  from unnest(p_manager_entry_ids) as requested(manager_entry_id);

  insert into public.h2h_matches (
    season,
    league_id,
    gameweek,
    initiated_by_profile_id,
    participant_key,
    participant_count,
    status
  ) values (
    p_season,
    p_league_id,
    p_gameweek,
    p_initiated_by_profile_id,
    v_participant_key,
    v_requested_count,
    'open'
  )
  returning id into v_match_id;

  insert into public.h2h_match_participants (match_id, manager_entry_id)
  select v_match_id, manager_entry_id
  from unnest(p_manager_entry_ids) as requested(manager_entry_id);

  return v_match_id;
end;
$$;

create or replace function public.complete_h2h_group(
  p_match_id uuid,
  p_results jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expected_count integer;
  v_result_count integer;
  v_distinct_result_count integer;
  v_matched_count integer;
begin
  select match.participant_count
  into v_expected_count
  from public.h2h_matches as match
  where match.id = p_match_id
    and match.status <> 'cancelled'
  for update;

  if v_expected_count is null then
    raise exception using errcode = '22023', message = 'H2H match was not found or was cancelled.';
  end if;

  select count(*), count(distinct result.manager_entry_id)
  into v_result_count, v_distinct_result_count
  from jsonb_to_recordset(p_results) as result(
    manager_entry_id uuid,
    points integer,
    rank smallint,
    result text
  );

  if v_result_count <> v_expected_count
    or v_distinct_result_count <> v_expected_count then
    raise exception using errcode = '22023', message = 'A result is required for every H2H participant.';
  end if;

  select count(*)
  into v_matched_count
  from public.h2h_match_participants as participant
  join jsonb_to_recordset(p_results) as result(
    manager_entry_id uuid,
    points integer,
    rank smallint,
    result text
  ) on result.manager_entry_id = participant.manager_entry_id
  where participant.match_id = p_match_id
    and result.points is not null
    and result.rank > 0
    and result.result in ('winner', 'joint_winner', 'loss', 'draw');

  if v_matched_count <> v_expected_count then
    raise exception using errcode = '22023', message = 'H2H results do not match the participants.';
  end if;

  update public.h2h_match_participants as participant
  set
    points = result.points,
    rank = result.rank,
    result = result.result,
    updated_at = now()
  from jsonb_to_recordset(p_results) as result(
    manager_entry_id uuid,
    points integer,
    rank smallint,
    result text
  )
  where participant.match_id = p_match_id
    and participant.manager_entry_id = result.manager_entry_id;

  update public.h2h_matches
  set
    status = 'completed',
    locked_at = coalesce(locked_at, now()),
    completed_at = now(),
    updated_at = now()
  where id = p_match_id;
end;
$$;

revoke all on function public.create_h2h_group(text, text, smallint, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.complete_h2h_group(uuid, jsonb) from public, anon, authenticated;

grant execute on function public.create_h2h_group(text, text, smallint, uuid, uuid[]) to service_role;
grant execute on function public.complete_h2h_group(uuid, jsonb) to service_role;
