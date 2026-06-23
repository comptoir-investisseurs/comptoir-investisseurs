-- =============================================================
-- Supabase SQL — Évolution CRM (Pipeline, Prospects, Activités)
-- Exécutez ce script dans : Supabase Dashboard > SQL Editor
-- Relançable sans erreur.
-- =============================================================

-- 1. Nouvelles colonnes sur la table clients (clients ET prospects y vivent)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS type text DEFAULT 'client';        -- 'client' | 'prospect'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stage text DEFAULT 'Nouveau';        -- étape pipeline
ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_action text;                    -- prochaine action
ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_action_date date;               -- échéance
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes_internes text;                 -- notes du conseiller

-- 2. Autoriser le conseiller à créer/supprimer des fiches (ajout de prospects)
DROP POLICY IF EXISTS "Auth can insert clients" ON clients;
CREATE POLICY "Auth can insert clients"
  ON clients FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Auth can delete clients" ON clients;
CREATE POLICY "Auth can delete clients"
  ON clients FOR DELETE TO authenticated USING (true);

-- 3. Table des activités (appels, RDV, emails, tâches, notes)
CREATE TABLE IF NOT EXISTS activities (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),
  client_id     uuid REFERENCES clients(id) ON DELETE CASCADE,
  type          text DEFAULT 'note',        -- appel | email | rdv | tache | note
  titre         text,
  notes         text,
  date_activite timestamptz DEFAULT now(),
  done          boolean DEFAULT false
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth can manage activities" ON activities;
CREATE POLICY "Auth can manage activities"
  ON activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activities_client ON activities (client_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities (date_activite DESC);

-- 4. Les réponses au questionnaire sont des clients par défaut (déjà via DEFAULT 'client')
