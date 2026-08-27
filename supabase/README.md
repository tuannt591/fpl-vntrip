# Supabase setup

## Apply the schema

Open the Supabase project, go to **SQL Editor**, create a new query, and run the
entire contents of:

```text
supabase/migrations/202608250001_initial_h2h.sql
```

Then run the group H2H migration:

```text
supabase/migrations/202608250002_group_h2h.sql
```

The migration creates the application profiles, season-specific manager claims,
group H2H matches and participants, uniqueness constraints, indexes, update
triggers, and server-only table permissions. If the initial migration was already
applied, only run the second file.

## Server environment

Copy `.env.example` to `.env.local` and set:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
APP_SESSION_SECRET
FPL_SEASON
```

`SUPABASE_SECRET_KEY` and `APP_SESSION_SECRET` must never use the `NEXT_PUBLIC_`
prefix. Database reads and writes are performed by Next.js API routes only.

## Authentication and claiming

1. Ermis validates the email OTP and returns an access token.
2. `POST /api/auth/session` validates that token with Ermis, upserts the app
   profile, and issues an HTTP-only app session cookie.
3. `GET /api/h2h/managers` lists league managers and their claim state.
4. `POST /api/h2h/claim` permanently claims one unclaimed manager for the
   authenticated account and current FPL season.
5. `POST /api/h2h/matches` creates an automatically approved group containing
   the creator and every selected claimed manager.
6. `GET /api/h2h/matches` returns every group in the league, locks groups after
   the FPL deadline, and finalizes scores after FPL marks the gameweek finished.
7. `DELETE /api/h2h/matches/:matchId` lets only the group creator cancel an open
   match before its FPL deadline. Cancellation is soft-delete, so historical
   data remains in the database and the same group can be recreated.

An account cannot change its own manager after claiming. An administrative reset
workflow can be added separately for accidental claims.

## Group rules

- A group contains at least two managers; the creator is always included.
- A manager may join multiple different groups in one gameweek.
- The exact same set of managers cannot create a duplicate group in one
  gameweek, regardless of selection order or creator.
- A sole highest scorer wins. Multiple highest scorers are joint winners. If
  every participant has the same score, the group is recorded as a draw.
