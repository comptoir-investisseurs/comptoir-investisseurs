-- =============================================================
-- Supabase SQL : bilans patrimoniaux + pipeline commercial R1 → R3
-- À exécuter dans : Supabase Dashboard > SQL Editor. Relançable.
-- Alimenté par bilan-patrimonial.html (bouton « Enregistrer au CRM »)
-- et lu par admin.html (onglet « Bilans » de la fiche contact).
-- =============================================================

-- 1) Table des bilans (un prospect peut avoir plusieurs bilans dans le temps)
CREATE TABLE IF NOT EXISTS bilans (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  client_id      uuid REFERENCES clients(id) ON DELETE CASCADE,
  conseiller     text,
  date_entretien date,
  client_label   text,                      -- « Madame & Monsieur X »
  etape          text DEFAULT 'R1',         -- rendez-vous d'origine du bilan
  data           jsonb NOT NULL,            -- toutes les réponses (état complet de l'outil)
  resume         jsonb,                     -- chiffres clés (revenu imposable, TMI, actif net, endettement…)
  points         jsonb,                     -- points d'attention pour l'équipe commerciale
  fiche          text                       -- fiche sales en texte brut
);
CREATE INDEX IF NOT EXISTS idx_bilans_client ON bilans (client_id);
CREATE INDEX IF NOT EXISTS idx_bilans_created ON bilans (created_at DESC);

ALTER TABLE bilans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage bilans" ON bilans;
CREATE POLICY "Auth manage bilans" ON bilans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2) Pipeline commercial : Nouveau → R1 : Bilan → R2 : Objectifs → R3 : Offre → Prospect chaud → Gagné | Perdu
--    (Gagné bascule automatiquement la fiche en client, voir admin.js)
UPDATE clients SET stage = 'R1 : Bilan'   WHERE stage IN ('Contacté', 'RDV planifié');
UPDATE clients SET stage = 'R3 : Offre'   WHERE stage = 'Proposition';
UPDATE clients SET type  = 'client'       WHERE stage = 'Gagné' AND type = 'prospect';
