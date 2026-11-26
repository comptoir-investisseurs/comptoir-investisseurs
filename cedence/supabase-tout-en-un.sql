-- =============================================================
-- CÉDENCE — Tout le nécessaire en un seul script.
--
-- MODE D'EMPLOI (une seule fois) :
--   1) Ouvre ton projet Supabase (qtrjussasvwmiohhblhh).
--   2) Menu de gauche > SQL Editor > New query.
--   3) Colle TOUT ce fichier, du début à la fin.
--   4) Clique sur "Run".
--   C'est tout : annonces + articles + espace propriétaire sont créés.
-- =============================================================


-- ---------- 1) Annonces de cabinets à céder ----------

create table if not exists cgp_annonces (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  reference         text unique,
  statut            text default 'publiee'
                      check (statut in ('publiee','sous_offre','retiree')),
  nom_cabinet           text,
  contact_cedant_nom    text,
  contact_cedant_email  text,
  contact_cedant_tel    text,
  siren                 text,
  notes_internes        text,
  departement        text,
  aum_precis         numeric,
  ca_ht              numeric,
  ebe                numeric,
  part_recurrente    numeric,
  prix_souhaite      numeric,
  localisation_precise text,
  horizon_reprise    text,
  motif_cession      text,
  descriptif_detaille text,
  region             text,
  type_clientele     text,
  statuts_reglementaires text,
  aum_tranche        text,
  ca_tranche         text,
  prix_tranche       text,
  nb_clients_tranche text
);

alter table cgp_annonces enable row level security;

drop policy if exists "Service role manages annonces" on cgp_annonces;
create policy "Service role manages annonces"
  on cgp_annonces for all to service_role using (true) with check (true);

create or replace view cgp_annonces_public
with (security_invoker = false) as
select id, reference, created_at, statut, region, type_clientele,
       statuts_reglementaires, aum_tranche, ca_tranche, prix_tranche,
       nb_clients_tranche
from cgp_annonces
where statut = 'publiee'
order by created_at desc;

create or replace view cgp_annonces_investisseur
with (security_invoker = false) as
select id, reference, created_at, statut, region, departement, type_clientele,
       statuts_reglementaires, aum_tranche, aum_precis, ca_tranche, ca_ht, ebe,
       part_recurrente, prix_tranche, prix_souhaite, nb_clients_tranche,
       localisation_precise, horizon_reprise, motif_cession, descriptif_detaille
from cgp_annonces
where statut = 'publiee'
order by created_at desc;

grant select on cgp_annonces_public to anon, authenticated;
grant select on cgp_annonces_investisseur to authenticated;

create index if not exists idx_cgp_annonces_statut on cgp_annonces (statut);
create index if not exists idx_cgp_annonces_created on cgp_annonces (created_at desc);


-- ---------- 2) Espace propriétaire (droits d'administration) ----------

create table if not exists cgp_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

alter table cgp_admins enable row level security;

drop policy if exists "Users can check their own admin row" on cgp_admins;
create policy "Users can check their own admin row"
  on cgp_admins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins manage cgp_annonces" on cgp_annonces;
create policy "Admins manage cgp_annonces"
  on cgp_annonces for all to authenticated
  using (exists (select 1 from cgp_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from cgp_admins a where a.user_id = auth.uid()));


-- ---------- 3) Articles (Actualités) ----------

create table if not exists cgp_articles (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  published_at    timestamptz,
  slug            text unique not null,
  statut          text default 'brouillon'
                    check (statut in ('brouillon','publie')),
  titre           text not null,
  chapo           text,
  contenu         text,
  image_url       text,
  auteur          text default 'Cédence'
);

alter table cgp_articles enable row level security;

drop policy if exists "Service role manages articles" on cgp_articles;
create policy "Service role manages articles"
  on cgp_articles for all to service_role using (true) with check (true);

drop policy if exists "Admins manage cgp_articles" on cgp_articles;
create policy "Admins manage cgp_articles"
  on cgp_articles for all to authenticated
  using (exists (select 1 from cgp_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from cgp_admins a where a.user_id = auth.uid()));

create or replace view cgp_articles_public
with (security_invoker = false) as
select id, slug, titre, chapo, contenu, image_url, auteur,
       coalesce(published_at, created_at) as published_at
from cgp_articles
where statut = 'publie'
order by coalesce(published_at, created_at) desc;

grant select on cgp_articles_public to anon, authenticated;

create index if not exists idx_cgp_articles_statut on cgp_articles (statut);
create index if not exists idx_cgp_articles_published on cgp_articles (published_at desc);


-- =============================================================
-- C'est terminé. Dernière étape, À FAIRE APRÈS :
--
-- 1) Va sur cedence.fr/admin-annonces.html (ou espace-investisseur.html)
--    et crée-toi un compte avec ton adresse e-mail habituelle.
--
-- 2) Reviens ici, New query, colle UNIQUEMENT les 2 lignes ci-dessous
--    en remplaçant l'e-mail par le tien, puis Run :
--
--    insert into cgp_admins (user_id)
--    select id from auth.users where email = 'TON-EMAIL@ICI.com';
--
-- 3) Reconnecte-toi sur admin-annonces.html ou admin-articles.html :
--    tu as maintenant accès aux deux tableaux de bord.
-- =============================================================
