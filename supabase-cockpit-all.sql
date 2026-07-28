-- ===========================================================================
-- Cockpit client — SCHÉMA COMPLET (base + v2 + v3), à exécuter en une fois.
-- Supabase Dashboard > SQL Editor > coller > Run. Relançable sans risque.
-- Prérequis : la table `clients` existe déjà (CRM).
-- ===========================================================================

-- 1) Enveloppes / contrats (AV, AV Lux, CTO, PER, capi, PEA…)
CREATE TABLE IF NOT EXISTS enveloppes (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at         timestamptz DEFAULT now(),
  client_id          uuid REFERENCES clients(id) ON DELETE CASCADE,
  type               text,
  libelle            text,
  etablissement      text,
  numero             text,
  date_souscription  date,
  montant_investi    numeric,
  valorisation       numeric,
  valo_debut_annee   numeric,
  devise             text DEFAULT 'EUR',
  statut             text DEFAULT 'Actif'
);
CREATE INDEX IF NOT EXISTS idx_enveloppes_client ON enveloppes (client_id);

-- 2) Supports / lignes (UC, fonds €, ETF, OPCVM, SCPI, structurés, liquidités…)
CREATE TABLE IF NOT EXISTS supports (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  enveloppe_id     uuid REFERENCES enveloppes(id) ON DELETE CASCADE,
  libelle          text,
  isin             text,
  classe           text,
  montant_investi  numeric,
  valorisation     numeric,
  date_valo        date
);
CREATE INDEX IF NOT EXISTS idx_supports_env ON supports (enveloppe_id);
CREATE INDEX IF NOT EXISTS idx_supports_isin ON supports (isin);

-- 3) Documents : pièces justificatives (validité) & procédures (suivi)
CREATE TABLE IF NOT EXISTS documents (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE,
  enveloppe_id    uuid REFERENCES enveloppes(id) ON DELETE SET NULL,
  type            text,
  libelle         text,
  date_signature  date,
  date_echeance   date,
  reference       text,
  notes           text
);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents (client_id);
CREATE INDEX IF NOT EXISTS idx_documents_env ON documents (enveloppe_id);

-- v2 — pièces / procédures + passerelle produits structurés
ALTER TABLE documents ADD COLUMN IF NOT EXISTS categorie     text DEFAULT 'procedure';  -- 'piece' | 'procedure'
ALTER TABLE documents ADD COLUMN IF NOT EXISTS date_document date;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS date_validite date;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS statut        text;
ALTER TABLE supports  ADD COLUMN IF NOT EXISTS sp_position_id uuid;

-- v3 — champs détaillés extraits par type de pièce (label/valeur)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS donnees jsonb;

-- 4) Personne physique / morale sur la fiche client
ALTER TABLE clients ADD COLUMN IF NOT EXISTS personne text DEFAULT 'physique';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS raison_sociale          text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS forme_juridique         text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS siren                   text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS capital_social          text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_creation           date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS siege_social            text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dirigeant               text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS beneficiaires_effectifs text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS activite                text;

-- 5) Pôles (regroupement de personnes liées)
CREATE TABLE IF NOT EXISTS poles (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  nom        text,
  type       text DEFAULT 'Famille',
  notes      text
);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pole_id   uuid REFERENCES poles(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pole_role text;
CREATE INDEX IF NOT EXISTS idx_clients_pole ON clients (pole_id);

-- 6) Row Level Security : réservé aux conseillers connectés
ALTER TABLE enveloppes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE poles      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth manage enveloppes" ON enveloppes;
CREATE POLICY "Auth manage enveloppes" ON enveloppes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth manage supports" ON supports;
CREATE POLICY "Auth manage supports" ON supports FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth manage documents" ON documents;
CREATE POLICY "Auth manage documents" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth manage poles" ON poles;
CREATE POLICY "Auth manage poles" ON poles FOR ALL TO authenticated USING (true) WITH CHECK (true);
