-- =============================================================
-- Supabase SQL — Cockpit client : portefeuille complet + conformité
-- À exécuter dans : Supabase Dashboard > SQL Editor. Relançable.
-- Alimente le 3e module (cockpit.html) : enveloppes, supports et
-- documents de conformité, par client (table clients existante).
-- =============================================================

-- 1) Enveloppes / contrats (AV, AV Lux, CTO, PER, capi, PEA…)
CREATE TABLE IF NOT EXISTS enveloppes (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at         timestamptz DEFAULT now(),
  client_id          uuid REFERENCES clients(id) ON DELETE CASCADE,
  type               text,                 -- Assurance-vie, AV luxembourgeoise, CTO, PER, Capitalisation, PEA…
  libelle            text,
  etablissement      text,                 -- assureur / teneur de compte
  numero             text,
  date_souscription  date,
  montant_investi    numeric,
  valorisation       numeric,              -- valorisation actuelle (sinon somme des supports)
  valo_debut_annee   numeric,              -- valorisation au 01/01 (pour la performance YTD)
  devise             text DEFAULT 'EUR',
  statut             text DEFAULT 'Actif'  -- Actif | Clôturé
);
CREATE INDEX IF NOT EXISTS idx_enveloppes_client ON enveloppes (client_id);

-- 2) Supports / lignes (UC, fonds €, ETF, OPCVM, SCPI, structurés, liquidités…)
CREATE TABLE IF NOT EXISTS supports (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  enveloppe_id     uuid REFERENCES enveloppes(id) ON DELETE CASCADE,
  libelle          text,
  isin             text,                   -- nullable (fonds €, liquidités…)
  classe           text,                   -- Fonds euro, Actions, ETF, OPCVM, Obligations, Produit structuré, Immobilier, Private Equity, Liquidités, Autre
  montant_investi  numeric,
  valorisation     numeric,
  date_valo        date
);
CREATE INDEX IF NOT EXISTS idx_supports_env ON supports (enveloppe_id);
CREATE INDEX IF NOT EXISTS idx_supports_isin ON supports (isin);

-- 3) Documents de conformité (convention de conseil, souscriptions, rapports
--    de mission/arbitrage, DER, profil MIF, KYC, LCB-FT, RGPD…) avec dates.
CREATE TABLE IF NOT EXISTS documents (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE,
  enveloppe_id    uuid REFERENCES enveloppes(id) ON DELETE SET NULL,  -- rattachement éventuel à un contrat
  type            text,                    -- Convention de conseil, Bulletin de souscription, Rapport de mission (arbitrage), DER, Questionnaire / Profil de risque (MIF), KYC / Pièce d'identité, Origine des fonds (LCB-FT), Consentement RGPD, Avenant, Autre
  libelle         text,
  date_signature  date,                    -- nullable -> « à signer »
  date_echeance   date,                    -- nullable -> renouvellement (convention annuelle…)
  reference       text,
  notes           text
);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents (client_id);
CREATE INDEX IF NOT EXISTS idx_documents_env ON documents (enveloppe_id);

-- 4) Row Level Security : réservé aux conseillers connectés
ALTER TABLE enveloppes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth manage enveloppes" ON enveloppes;
CREATE POLICY "Auth manage enveloppes" ON enveloppes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth manage supports" ON supports;
CREATE POLICY "Auth manage supports" ON supports FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth manage documents" ON documents;
CREATE POLICY "Auth manage documents" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
