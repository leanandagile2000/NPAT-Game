-- Room codes are flower slugs (lowercase). Uniqueness only for active games so ended games can reuse names.
-- Display names are unique per game case-insensitively.

alter table public.npat_games
  add column if not exists created_at timestamptz not null default now();

alter table public.npat_games drop constraint if exists npat_games_join_code_key;

update public.npat_games
set join_code = lower(trim(join_code))
where join_code is not null;

create unique index if not exists npat_games_join_code_active_uidx
  on public.npat_games (lower(join_code))
  where status in ('lobby', 'in_progress');

alter table public.npat_participants drop constraint if exists npat_participants_game_id_display_name_key;

create unique index if not exists npat_participants_game_display_lower_uidx
  on public.npat_participants (game_id, lower(display_name));
