-- =============================================================
-- Supabase — Annonces de cabinets CGP à céder (« Espace investisseur »)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Même projet que supabase-cgp-leads.sql.
--
-- Principe : la table cgp_annonces n'est JAMAIS lisible directement
-- (ni par anon, ni par authenticated — seul service_role, donc le
-- back-office / le tableau Supabase, peut la lire et l'écrire).
-- Deux vues exposent, chacune, un sous-ensemble de colonnes :
--   - cgp_annonces_public       -> visible sans compte (page Annonces)
--   - cgp_annonces_investisseur -> visible uniquement aux comptes connectés
-- Les colonnes d'identification du cédant (nom du cabinet, SIREN,
-- coordonnées) ne figurent dans AUCUNE des deux vues : la mise en
-- relation passe toujours par le formulaire de contact / l'équipe
-- Cédence, jamais par une donnée affichée automatiquement.
-- =============================================================

create table if not exists cgp_annonces (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  reference         text unique,                         -- ex. "CG-2026-014"
  statut            text default 'publiee'
                      check (statut in ('publiee','sous_offre','retiree')),

  -- ---- Réservé au back-office (jamais exposé par l'API) ----
  nom_cabinet           text,
  contact_cedant_nom    text,
  contact_cedant_email  text,
  contact_cedant_tel    text,
  siren                 text,
  notes_internes        text,

  -- ---- Visible uniquement aux comptes connectés (Espace investisseur) ----
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

  -- ---- Visible publiquement, sans compte ----
  region             text,
  type_clientele     text,
  statuts_reglementaires text,
  aum_tranche        text,     -- ex. "100 – 150 M€"
  ca_tranche         text,     -- ex. "600 k€ – 900 k€"
  prix_tranche       text,     -- ex. "0,8 – 1,3 M€"
  nb_clients_tranche text
);

alter table cgp_annonces enable row level security;

-- Seul le service_role (back-office) peut lire/écrire la table brute.
create policy "Service role manages annonces"
  on cgp_annonces for all to service_role using (true) with check (true);

-- ---- Vue publique (anon + authenticated) ----
create or replace view cgp_annonces_public
with (security_invoker = false) as
select id, reference, created_at, statut, region, type_clientele,
       statuts_reglementaires, aum_tranche, ca_tranche, prix_tranche,
       nb_clients_tranche
from cgp_annonces
where statut = 'publiee'
order by created_at desc;

-- ---- Vue « Espace investisseur » (authenticated uniquement) ----
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

-- =============================================================
-- Rappel de configuration Supabase Auth (Espace investisseur) :
--  - Authentication > Providers : Email activé, "Confirm email" activé.
--  - Authentication > URL Configuration : ajouter https://cedence.fr/*
--    aux "Redirect URLs" pour les liens de confirmation / récupération.
--  - Les comptes créés via le formulaire d'inscription du site sont de
--    simples utilisateurs "authenticated" : ils ne voient jamais la
--    table cgp_leads ni les colonnes réservées au back-office ci-dessus.
-- =============================================================
