-- =============================================================
-- Supabase SQL — Cockpit v2 : personne morale, pôles, pièces & procédures
-- À exécuter dans : Supabase Dashboard > SQL Editor. Relançable.
-- Complète supabase-cockpit.sql (enveloppes / supports / documents).
-- =============================================================

-- 1) Personne physique / morale sur la fiche client
ALTER TABLE clients ADD COLUMN IF NOT EXISTS personne text DEFAULT 'physique';   -- 'physique' | 'morale'
-- Champs personne morale
ALTER TABLE clients ADD COLUMN IF NOT EXISTS raison_sociale          text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS forme_juridique         text;        -- SAS, SARL, SCI, SA, Holding, SASU, SC…
ALTER TABLE clients ADD COLUMN IF NOT EXISTS siren                   text;        -- SIREN / SIRET
ALTER TABLE clients ADD COLUMN IF NOT EXISTS capital_social          text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_creation           date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS siege_social            text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dirigeant               text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS beneficiaires_effectifs text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS activite                text;        -- activité / code NAF

-- 2) Pôles (regroupement de personnes physiques et/ou morales liées)
CREATE TABLE IF NOT EXISTS poles (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  nom        text,
  type       text DEFAULT 'Famille',   -- Famille | Groupe | Family office | Autre
  notes      text
);
ALTER TABLE poles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage poles" ON poles;
CREATE POLICY "Auth manage poles" ON poles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rattachement des clients à un pôle + rôle (dirigeant, holding, conjoint, SCI, enfant…)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pole_id   uuid REFERENCES poles(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pole_role text;
CREATE INDEX IF NOT EXISTS idx_clients_pole ON clients (pole_id);

-- 3) Documents : distinction pièces (validité) / procédures (suivi) + dates
ALTER TABLE documents ADD COLUMN IF NOT EXISTS categorie     text DEFAULT 'procedure';  -- 'piece' | 'procedure'
ALTER TABLE documents ADD COLUMN IF NOT EXISTS date_document date;                        -- date d'émission (pièce)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS date_validite date;                        -- pièce : valide jusqu'à (auto par règle, ajustable)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS statut        text;                        -- procédure : 'a_faire' | 'en_cours' | 'fait'

-- 4) Passerelle produits structurés : lien support (cockpit) <-> allocation (sp_positions)
--    Un support « Produit structuré » créé dans le cockpit peut refléter une ligne
--    sp_positions du module Produits structurés (et réciproquement), sans double compte.
ALTER TABLE supports ADD COLUMN IF NOT EXISTS sp_position_id uuid;   -- id de la ligne sp_positions liée
