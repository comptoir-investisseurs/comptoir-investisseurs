-- =============================================================
-- Supabase SQL — Table clients + RLS
-- Exécutez ce script dans : Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Table principale
CREATE TABLE IF NOT EXISTS clients (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),

  -- Étape 1 : Identité
  civilite      text,
  nom           text NOT NULL,
  prenom        text NOT NULL,
  date_naissance date,
  lieu_naissance text,
  nationalite   text,
  pays_residence text,
  adresse       text,
  code_postal   text,
  ville         text,
  email         text NOT NULL,
  telephone     text,

  -- Étape 2 : Famille
  situation_matrimoniale text,
  regime_matrimonial     text,
  nb_enfants             int DEFAULT 0,
  ages_enfants           text,
  personnes_a_charge     text,
  testament_donation     text,

  -- Étape 3 : Profession
  csp               text,
  profession        text,
  employeur         text,
  revenus           text,
  capacite_epargne  text,

  -- Étape 4 : Patrimoine
  patrimoine_financier  text,
  patrimoine_immobilier text,
  placements_existants  text[],
  credits               text,
  montant_investir      text,
  origine_fonds         text,

  -- Étape 5 : Objectifs
  objectifs           text[],
  horizon             text,
  besoin_liquidite    text,
  projets_specifiques text,

  -- Étape 6 : Expérience
  niveau_connaissance   text,
  experience_produits   text[],
  experience_duree      text,
  frequence_operations  text,
  pertes_passees        text,

  -- Étape 7 : Risque
  reaction_baisse         text,
  perte_max               text,
  couple_rendement_risque text,
  part_illiquide          text,
  esg                     text,
  preference_geo          text[],

  -- Étape 8 : Validation
  commentaires            text,
  comment_connu           text,
  consentement_rgpd       boolean DEFAULT false,
  consentement_commercial boolean DEFAULT false
);

-- 2. Activer Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 3. Politique INSERT : tout le monde peut soumettre (anon + authenticated)
CREATE POLICY "Clients can submit questionnaire"
  ON clients FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Politique SELECT : seuls les utilisateurs connectés (admin CRM)
CREATE POLICY "Only authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- 5. Politique UPDATE : seuls les utilisateurs connectés
CREATE POLICY "Only authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

-- 6. Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients (nom, prenom);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients (created_at DESC);
