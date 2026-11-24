-- =============================================================
-- Supabase — Table des leads « Cédence CGP »
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- =============================================================

create table if not exists cgp_leads (
  id                uuid default gen_random_uuid() primary key,
  created_at        timestamptz default now(),

  -- coordonnées
  siren             text,
  email             text,
  telephone         text,
  departement       text,
  horizon           text,

  -- repères chiffrés
  aum               text,
  ca_ht             numeric,
  ebe               numeric,
  estimation_basse  numeric,
  estimation_haute  numeric,

  -- l'intégralité des questions / réponses
  payload           jsonb
);

alter table cgp_leads enable row level security;

-- Le site (clé anon) peut insérer un lead ; personne ne peut lire sans être connecté.
create policy "Anon can insert CGP leads"
  on cgp_leads for insert to anon, authenticated with check (true);

create policy "Only authenticated can read CGP leads"
  on cgp_leads for select to authenticated using (true);

create index if not exists idx_cgp_leads_created on cgp_leads (created_at desc);
create index if not exists idx_cgp_leads_email on cgp_leads (email);
