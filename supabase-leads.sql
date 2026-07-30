-- =============================================================
-- Supabase SQL — Table leads (diagnostic patrimonial / Instagram)
-- Exécutez ce script dans : Supabase Dashboard > SQL Editor
--
-- Cette table stocke les prospects issus du mini-diagnostic
-- « Votre patrimoine est-il bien optimisé ? » (page diagnostic.html),
-- distinct du questionnaire KYC complet (table clients).
-- =============================================================

-- 1. Table des prospects
CREATE TABLE IF NOT EXISTS leads (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),

  -- Coordonnées (collectées en fin de parcours)
  prenom        text,
  email         text NOT NULL,
  telephone     text NOT NULL,

  -- Réponses du diagnostic
  objectif              text,      -- objectif patrimonial principal
  patrimoine_financier  text,      -- tranche de patrimoine
  placements            text[],    -- enveloppes/placements détenus
  optimisation_ressenti text,      -- sentiment d'optimisation actuel
  accompagnement        text,      -- accompagné ou non par un conseiller
  profil                text,      -- profil socio-professionnel

  -- Résultat calculé + traçabilité
  score                 int,       -- niveau d'optimisation estimé (0–100)
  source                text DEFAULT 'instagram',
  consentement          boolean DEFAULT false
);

-- 2. Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 3. INSERT public (le visiteur soumet son diagnostic — anon + authenticated)
CREATE POLICY "Leads can submit diagnostic"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. SELECT réservé aux utilisateurs connectés (admin / CRM)
CREATE POLICY "Only authenticated users can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- 5. UPDATE réservé aux utilisateurs connectés
CREATE POLICY "Only authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true);

-- 6. Index de recherche
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
