-- NPAT (Name, Place, Animal, Thing) — initial schema. Run in Supabase SQL editor or via `supabase db push`.
-- Service role (Next.js server only) bypasses RLS; anon has no direct table access.

create table if not exists public.npat_games (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  name text not null,
  status text not null
    check (status in ('lobby', 'in_progress', 'ended')) default 'lobby',
  round_duration_minutes int not null
    check (round_duration_minutes between 1 and 5) default 2,
  host_secret text not null,
  used_letters jsonb not null default '[]'::jsonb,
  host_participant_id uuid,
  current_round_id uuid
);

create table if not exists public.npat_participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.npat_games (id) on delete cascade,
  display_name text not null,
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  unique (game_id, display_name)
);

alter table public.npat_games
  drop constraint if exists npat_games_host_fk;
alter table public.npat_games
  add constraint npat_games_host_fk
  foreign key (host_participant_id) references public.npat_participants (id) on delete set null;

create table if not exists public.npat_rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.npat_games (id) on delete cascade,
  round_index int not null,
  letter char(1) not null check (letter >= 'A' and letter <= 'Z'),
  status text not null
    check (status in ('active', 'scored', 'aborted')) default 'active',
  started_at timestamptz,
  ends_at timestamptz,
  unique (game_id, round_index)
);

alter table public.npat_games
  drop constraint if exists npat_games_current_round_fk;
alter table public.npat_games
  add constraint npat_games_current_round_fk
  foreign key (current_round_id) references public.npat_rounds (id) on delete set null;

create table if not exists public.npat_round_submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.npat_rounds (id) on delete cascade,
  participant_id uuid not null references public.npat_participants (id) on delete cascade,
  name_text text default '',
  place_text text default '',
  animal_text text default '',
  thing_text text default '',
  points_name int not null default 0,
  points_place int not null default 0,
  points_animal int not null default 0,
  points_thing int not null default 0,
  unique (round_id, participant_id)
);

create index if not exists npat_participants_game_id_idx
  on public.npat_participants (game_id);
create index if not exists npat_rounds_game_id_idx
  on public.npat_rounds (game_id);
create index if not exists npat_submissions_round_id_idx
  on public.npat_round_submissions (round_id);

alter table public.npat_games enable row level security;
alter table public.npat_participants enable row level security;
alter table public.npat_rounds enable row level security;
alter table public.npat_round_submissions enable row level security;
