create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  ermis_user_id text not null unique,
  email text not null,
  display_name text,
  is_h2h_enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique_idx
  on public.profiles (lower(email));

create table public.fpl_manager_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  season text not null,
  league_id text not null,
  entry_id bigint not null check (entry_id > 0),
  manager_name text not null,
  team_name text not null,
  manager_avatar text,
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fpl_manager_entries_profile_per_season_unique
    unique (season, league_id, profile_id),
  constraint fpl_manager_entries_entry_per_season_unique
    unique (season, league_id, entry_id)
);

create table public.h2h_matches (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  league_id text not null,
  gameweek smallint not null check (gameweek between 1 and 38),
  player_a_entry_id uuid not null references public.fpl_manager_entries(id) on delete restrict,
  player_b_entry_id uuid not null references public.fpl_manager_entries(id) on delete restrict,
  initiated_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'open'
    check (status in ('open', 'locked', 'completed', 'cancelled')),
  player_a_points integer,
  player_b_points integer,
  winner_entry_id uuid references public.fpl_manager_entries(id) on delete restrict,
  locked_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint h2h_matches_different_players
    check (player_a_entry_id <> player_b_entry_id),
  constraint h2h_matches_winner_is_participant
    check (
      winner_entry_id is null
      or winner_entry_id = player_a_entry_id
      or winner_entry_id = player_b_entry_id
    ),
  constraint h2h_matches_completed_has_points
    check (
      status <> 'completed'
      or (player_a_points is not null and player_b_points is not null)
    ),
  constraint h2h_matches_non_completed_has_no_winner
    check (status = 'completed' or winner_entry_id is null)
);

-- A vs B and B vs A are one match, while either player can still face every
-- other manager during the same gameweek. Cancelled matches do not block a
-- pair from being created again before the deadline.
create unique index h2h_matches_unique_active_pair_idx
  on public.h2h_matches (
    season,
    league_id,
    gameweek,
    least(player_a_entry_id, player_b_entry_id),
    greatest(player_a_entry_id, player_b_entry_id)
  )
  where status <> 'cancelled';

create index h2h_matches_gameweek_status_idx
  on public.h2h_matches (season, league_id, gameweek, status);

create index h2h_matches_player_a_idx
  on public.h2h_matches (player_a_entry_id, gameweek);

create index h2h_matches_player_b_idx
  on public.h2h_matches (player_b_entry_id, gameweek);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger fpl_manager_entries_set_updated_at
before update on public.fpl_manager_entries
for each row execute function public.set_updated_at();

create trigger h2h_matches_set_updated_at
before update on public.h2h_matches
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.fpl_manager_entries enable row level security;
alter table public.h2h_matches enable row level security;

-- This app authenticates with Ermis rather than Supabase Auth. Browser clients
-- therefore receive no direct table privileges; all access goes through the
-- Next.js backend using the server-only Supabase secret key.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.fpl_manager_entries from anon, authenticated;
revoke all on table public.h2h_matches from anon, authenticated;

grant all on table public.profiles to service_role;
grant all on table public.fpl_manager_entries to service_role;
grant all on table public.h2h_matches to service_role;
