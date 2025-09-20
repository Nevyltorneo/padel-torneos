-- Enable Row Level Security
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text,
  role text check (role in ('owner','admin','referee','viewer')) default 'viewer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tournaments table
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  config jsonb not null,
  created_by uuid references public.users(id) not null,
  status text check (status in ('draft','registration','groups_generated','scheduled','in_progress','finished')) default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Categories table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  min_pairs int default 3,
  max_pairs int default 6,
  status text check (status in ('draft','grouping','scheduled','in_progress','finished')) default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pairs table
create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  player1 jsonb not null,
  player2 jsonb not null,
  seed int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Groups table
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade not null,
  name text not null,
  pair_ids uuid[] not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Courts table
create table public.courts (
  id text not null,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, tournament_id)
);

-- Availability Events table
create table public.availability_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  court_id text not null,
  type text check (type in ('free','blocked')) not null,
  day date not null,
  "from" time not null,
  "to" time not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (court_id, tournament_id) references public.courts(id, tournament_id) on delete cascade
);

-- Matches table
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  stage text check (stage in ('groups','quarterfinal','semifinal','final','third_place')) not null,
  group_id uuid references public.groups(id),
  pair_a_id uuid references public.pairs(id) not null,
  pair_b_id uuid references public.pairs(id) not null,
  day date,
  start_time time,
  court_id text,
  status text check (status in ('pending','scheduled','playing','finished')) default 'pending',
  score jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (court_id, tournament_id) references public.courts(id, tournament_id),
  -- Ensure no duplicate matches within a group
  unique(group_id, pair_a_id, pair_b_id)
);

-- Tournament permissions table
create table public.tournament_permissions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner','admin','referee','viewer')) not null,
  created_at timestamptz default now(),
  unique(tournament_id, user_id)
);

-- Script para eliminar usuario completamente
-- Eliminar roles del usuario
DELETE FROM public.user_roles WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Eliminar permisos de torneos del usuario
DELETE FROM public.tournament_permissions WHERE user_id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Eliminar perfil del usuario
DELETE FROM public.user_profiles WHERE id = '72740151-42d5-4fae-b778-e5c6adf19dec';

-- Finalmente eliminar de auth.users (esto debe hacerse manualmente en Supabase Dashboard)
-- o usando la API de admin con la service role key

-- Audit log for important changes
create table public.match_logs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade not null,
  user_id uuid references public.users(id),
  action text not null, -- 'score_updated', 'rescheduled', 'court_assigned', etc.
  old_value jsonb,
  new_value jsonb,
  notes text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_tournaments_slug on public.tournaments(slug);
create index idx_tournaments_created_by on public.tournaments(created_by);
create index idx_categories_tournament_id on public.categories(tournament_id);
create index idx_pairs_tournament_id on public.pairs(tournament_id);
create index idx_pairs_category_id on public.pairs(category_id);
create index idx_groups_category_id on public.groups(category_id);
create index idx_matches_tournament_id on public.matches(tournament_id);
create index idx_matches_category_id on public.matches(category_id);
create index idx_matches_status on public.matches(status);
create index idx_matches_day on public.matches(day);
create index idx_availability_events_tournament_court_day on public.availability_events(tournament_id, court_id, day);
create index idx_tournament_permissions_tournament_id on public.tournament_permissions(tournament_id);
create index idx_tournament_permissions_user_id on public.tournament_permissions(user_id);

-- Row Level Security Policies

-- Enable RLS
alter table public.users enable row level security;
alter table public.tournaments enable row level security;
alter table public.categories enable row level security;
alter table public.pairs enable row level security;
alter table public.groups enable row level security;
alter table public.courts enable row level security;
alter table public.availability_events enable row level security;
alter table public.matches enable row level security;
alter table public.tournament_permissions enable row level security;
alter table public.match_logs enable row level security;

-- Users policies
create policy "Users can read their own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own data" on public.users
  for update using (auth.uid() = id);

-- Tournament policies
create policy "Anyone can read public tournament data" on public.tournaments
  for select using (true);

create policy "Tournament creators can manage their tournaments" on public.tournaments
  for all using (auth.uid() = created_by);

create policy "Tournament admins can manage tournaments" on public.tournaments
  for all using (
    exists (
      select 1 from public.tournament_permissions tp 
      where tp.tournament_id = id 
      and tp.user_id = auth.uid() 
      and tp.role in ('owner', 'admin')
    )
  );

-- Categories policies
create policy "Anyone can read category data" on public.categories
  for select using (true);

create policy "Tournament owners/admins can manage categories" on public.categories
  for all using (
    exists (
      select 1 from public.tournaments t
      left join public.tournament_permissions tp on tp.tournament_id = t.id
      where t.id = tournament_id 
      and (
        t.created_by = auth.uid() 
        or (tp.user_id = auth.uid() and tp.role in ('owner', 'admin'))
      )
    )
  );

-- Similar policies for other tables...
-- (For brevity, adding basic select policies and admin management)

create policy "Anyone can read pairs" on public.pairs for select using (true);
create policy "Tournament admins can manage pairs" on public.pairs for all using (
  exists (
    select 1 from public.tournaments t
    left join public.tournament_permissions tp on tp.tournament_id = t.id
    where t.id = tournament_id 
    and (t.created_by = auth.uid() or (tp.user_id = auth.uid() and tp.role in ('owner', 'admin')))
  )
);

create policy "Anyone can read groups" on public.groups for select using (true);
create policy "Tournament admins can manage groups" on public.groups for all using (
  exists (
    select 1 from public.categories c
    join public.tournaments t on t.id = c.tournament_id
    left join public.tournament_permissions tp on tp.tournament_id = t.id
    where c.id = category_id 
    and (t.created_by = auth.uid() or (tp.user_id = auth.uid() and tp.role in ('owner', 'admin')))
  )
);

create policy "Anyone can read courts" on public.courts for select using (true);
create policy "Tournament admins can manage courts" on public.courts for all using (
  exists (
    select 1 from public.tournaments t
    left join public.tournament_permissions tp on tp.tournament_id = t.id
    where t.id = tournament_id 
    and (t.created_by = auth.uid() or (tp.user_id = auth.uid() and tp.role in ('owner', 'admin')))
  )
);

create policy "Anyone can read availability events" on public.availability_events for select using (true);
create policy "Tournament admins can manage availability events" on public.availability_events for all using (
  exists (
    select 1 from public.tournaments t
    left join public.tournament_permissions tp on tp.tournament_id = t.id
    where t.id = tournament_id 
    and (t.created_by = auth.uid() or (tp.user_id = auth.uid() and tp.role in ('owner', 'admin')))
  )
);

create policy "Anyone can read matches" on public.matches for select using (true);
create policy "Tournament staff can manage matches" on public.matches for all using (
  exists (
    select 1 from public.tournaments t
    left join public.tournament_permissions tp on tp.tournament_id = t.id
    where t.id = tournament_id 
    and (
      t.created_by = auth.uid() 
      or (tp.user_id = auth.uid() and tp.role in ('owner', 'admin', 'referee'))
    )
  )
);

create policy "Tournament staff can read permissions" on public.tournament_permissions 
  for select using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    ) or user_id = auth.uid()
  );

create policy "Tournament owners can manage permissions" on public.tournament_permissions 
  for all using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );

create policy "Anyone can read match logs" on public.match_logs for select using (true);
create policy "Tournament staff can create match logs" on public.match_logs for insert using (
  exists (
    select 1 from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    left join public.tournament_permissions tp on tp.tournament_id = t.id
    where m.id = match_id 
    and (
      t.created_by = auth.uid() 
      or (tp.user_id = auth.uid() and tp.role in ('owner', 'admin', 'referee'))
    )
  )
);

-- Functions for updating timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_users_updated_at before update on public.users
  for each row execute function public.update_updated_at_column();

create trigger update_tournaments_updated_at before update on public.tournaments
  for each row execute function public.update_updated_at_column();

create trigger update_categories_updated_at before update on public.categories
  for each row execute function public.update_updated_at_column();

create trigger update_pairs_updated_at before update on public.pairs
  for each row execute function public.update_updated_at_column();

create trigger update_groups_updated_at before update on public.groups
  for each row execute function public.update_updated_at_column();

create trigger update_courts_updated_at before update on public.courts
  for each row execute function public.update_updated_at_column();

create trigger update_availability_events_updated_at before update on public.availability_events
  for each row execute function public.update_updated_at_column();

create trigger update_matches_updated_at before update on public.matches
  for each row execute function public.update_updated_at_column();
