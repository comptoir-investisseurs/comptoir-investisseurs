-- =============================================================
-- Ma p'tite pinte 🍺 — Schéma Supabase
-- Compétition de pintes par équipe.
-- À exécuter dans : Supabase Dashboard > SQL Editor (relançable sans erreur).
-- =============================================================

-- ------------------------------------------------------------
-- 1) ÉQUIPES
-- ------------------------------------------------------------
create table if not exists pp_teams (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null unique,
  color      text not null default '#F5A623'   -- couleur pastille de l'équipe
);

-- ------------------------------------------------------------
-- 2) JOUEURS (profil lié au compte auth)
-- ------------------------------------------------------------
create table if not exists pp_players (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  prenom     text not null,
  nom        text not null,
  email      text not null,
  team_id    uuid references pp_teams (id) on delete set null
);

-- ------------------------------------------------------------
-- 3) PINTES (chaque bière postée)
-- ------------------------------------------------------------
create table if not exists pp_pints (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  player_id     uuid not null references pp_players (id) on delete cascade,
  team_id       uuid references pp_teams (id) on delete set null,
  photo_url     text not null,
  lieu          text,
  volume_cl     int not null default 50,
  -- statut de vérification : 'verified' | 'pending' | 'rejected'
  status        text not null default 'pending',
  verify_reason text
);

create index if not exists idx_pp_pints_created on pp_pints (created_at desc);
create index if not exists idx_pp_pints_player  on pp_pints (player_id);
create index if not exists idx_pp_pints_team    on pp_pints (team_id);
create index if not exists idx_pp_pints_status  on pp_pints (status);

-- ------------------------------------------------------------
-- 4) VUES DE STATISTIQUES (lecture publique)
--    On ne compte que les pintes vérifiées.
-- ------------------------------------------------------------

-- Classement des équipes
create or replace view pp_team_stats as
select
  t.id,
  t.name,
  t.color,
  count(p.id) filter (where p.status = 'verified')            as pintes,
  count(distinct pl.id)                                        as joueurs,
  coalesce(sum(p.volume_cl) filter (where p.status = 'verified'), 0) as volume_cl
from pp_teams t
left join pp_players pl on pl.team_id = t.id
left join pp_pints   p  on p.team_id  = t.id
group by t.id, t.name, t.color;

-- Classement des joueurs
create or replace view pp_player_stats as
select
  pl.id,
  pl.prenom,
  pl.nom,
  pl.team_id,
  t.name  as team_name,
  t.color as team_color,
  count(p.id) filter (where p.status = 'verified')            as pintes,
  coalesce(sum(p.volume_cl) filter (where p.status = 'verified'), 0) as volume_cl,
  max(p.created_at) filter (where p.status = 'verified')      as derniere_pinte
from pp_players pl
left join pp_teams t on t.id = pl.team_id
left join pp_pints p on p.player_id = pl.id
group by pl.id, pl.prenom, pl.nom, pl.team_id, t.name, t.color;

-- Compteurs globaux
create or replace view pp_global_stats as
select
  (select count(*) from pp_pints where status = 'verified')                       as total_pintes,
  (select coalesce(sum(volume_cl),0) from pp_pints where status = 'verified')     as total_volume_cl,
  (select count(*) from pp_players)                                               as total_joueurs,
  (select count(*) from pp_teams)                                                 as total_equipes;

-- ------------------------------------------------------------
-- 5) ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table pp_teams   enable row level security;
alter table pp_players enable row level security;
alter table pp_pints   enable row level security;

-- --- ÉQUIPES : lecture publique, création par un membre connecté ---
drop policy if exists "teams read"   on pp_teams;
drop policy if exists "teams insert" on pp_teams;
create policy "teams read"   on pp_teams for select to anon, authenticated using (true);
create policy "teams insert" on pp_teams for insert to authenticated with check (true);

-- --- JOUEURS : lecture publique (classement), écriture de son propre profil ---
drop policy if exists "players read"   on pp_players;
drop policy if exists "players insert" on pp_players;
drop policy if exists "players update" on pp_players;
create policy "players read"   on pp_players for select to anon, authenticated using (true);
create policy "players insert" on pp_players for insert to authenticated with check (auth.uid() = id);
create policy "players update" on pp_players for update to authenticated using (auth.uid() = id);

-- --- PINTES : lecture publique, chaque joueur ne poste que ses pintes ---
drop policy if exists "pints read"   on pp_pints;
drop policy if exists "pints insert" on pp_pints;
drop policy if exists "pints update" on pp_pints;
create policy "pints read"   on pp_pints for select to anon, authenticated using (true);
create policy "pints insert" on pp_pints for insert to authenticated with check (auth.uid() = player_id);
create policy "pints update" on pp_pints for update to authenticated using (auth.uid() = player_id);

-- ------------------------------------------------------------
-- 6) REALTIME : diffuser les nouvelles pintes en direct
-- ------------------------------------------------------------
alter publication supabase_realtime add table pp_pints;

-- ------------------------------------------------------------
-- 7) STORAGE : bucket public "pintes" pour les photos
--    (à créer aussi dans Dashboard > Storage si le bucket n'existe pas)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pintes', 'pintes', true)
on conflict (id) do nothing;

drop policy if exists "pintes public read"   on storage.objects;
drop policy if exists "pintes auth insert"   on storage.objects;
create policy "pintes public read"
  on storage.objects for select
  using (bucket_id = 'pintes');
create policy "pintes auth insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pintes');

-- ------------------------------------------------------------
-- 8) Quelques équipes de départ (optionnel)
-- ------------------------------------------------------------
insert into pp_teams (name, color) values
  ('Les Mousses',      '#F5A623'),
  ('Team Houblon',     '#7FB800'),
  ('Les Assoiffés',    '#E8503A'),
  ('Blonde Attitude',  '#FFD23F')
on conflict (name) do nothing;
