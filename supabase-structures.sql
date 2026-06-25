-- =============================================================
-- Supabase SQL — Suivi des produits structurés (book LFDR)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Relançable sans erreur. Persistance OPTIONNELLE :
-- l'interface fonctionne déjà avec les données embarquées (sp-data.js).
-- Ces tables ne stockent que les AJOUTS / MODIFICATIONS faits dans l'app
-- (allocations, imports TS/KID, saisies et corrections manuelles).
-- =============================================================

-- 1) Produits (caractéristiques) — clé = ISIN
CREATE TABLE IF NOT EXISTS sp_products (
  isin         text PRIMARY KEY,
  created_at   timestamptz DEFAULT now(),
  lib          text,
  emetteur     text,
  fam          text,
  dev          text DEFAULT 'EUR',
  coupon       numeric,            -- coupon annuel (0.093 = 9,3 %)
  freq         text,               -- Trimestrielle, Mensuelle, ...
  ac           numeric,            -- seuil autocall (1 = 100 %)
  bcpn         numeric,            -- barrière de coupon (0.7)
  bcap         numeric,            -- barrière de capital (0.6)
  strike       date,
  emission     date,
  next_obs     date,
  next_cpn     date,
  final_obs    date,
  maturity     date,
  trade_date   date,
  nominal_ref  numeric,
  mem          boolean DEFAULT false,      -- coupon à mémoire
  trig         boolean DEFAULT false,      -- autocall à barrière dégressive (Trigger Descending)
  deleted      boolean DEFAULT false,      -- produit retiré du book
  uls          jsonb DEFAULT '[]'::jsonb   -- [{"n":"Nom","k":strike,"b":..,"c":..,"a":..}]
);

-- Relançable : ajoute les colonnes manquantes si la table existait déjà
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS emission  date;
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS next_cpn  date;
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS final_obs date;
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS mem       boolean DEFAULT false;
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS trig      boolean DEFAULT false;
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS trig_step numeric;   -- décrément autocall (0.05 = −5 %)
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS trig_freq text;      -- fréquence du décrément
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS deleted   boolean DEFAULT false;
ALTER TABLE sp_products ADD COLUMN IF NOT EXISTS non_call  int;       -- période de non-rappel (mois)

-- 2) Positions / allocations (lignes du portefeuille)
CREATE TABLE IF NOT EXISTS sp_positions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  seed_id    bigint,              -- si override d'une ligne embarquée
  deleted    boolean DEFAULT false,
  isin       text,
  prenom     text,
  nom        text,
  pole       text,
  compte     text,
  vendeur    text,
  nominal    numeric,
  dev        text DEFAULT 'EUR',
  pxa        numeric,
  pxv        numeric,
  gc         numeric,             -- gain coupons %
  gk         numeric,             -- gain capital %
  gt         numeric,             -- gain total %
  gain       numeric,
  statut     text DEFAULT 'LIVE', -- LIVE | DONE
  trade_date date,
  client_id  uuid                 -- lien éventuel vers clients(id) du CRM
);

CREATE INDEX IF NOT EXISTS idx_sp_positions_isin   ON sp_positions (isin);
CREATE INDEX IF NOT EXISTS idx_sp_positions_seed   ON sp_positions (seed_id);
CREATE INDEX IF NOT EXISTS idx_sp_positions_client ON sp_positions (client_id);

-- 3) Row Level Security : réservé aux conseillers connectés
ALTER TABLE sp_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sp_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth manage sp_products" ON sp_products;
CREATE POLICY "Auth manage sp_products"
  ON sp_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth manage sp_positions" ON sp_positions;
CREATE POLICY "Auth manage sp_positions"
  ON sp_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);
