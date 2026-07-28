-- ===========================================================================
-- Cockpit v3 — informations détaillées des pièces justificatives
-- Stocke les champs extraits (label/valeur) propres à chaque type de pièce
-- (CNI : nom, prénoms, date/lieu de naissance, nationalité… ; RIB : IBAN/BIC ;
--  KBIS : SIREN, capital, dirigeant… etc.).
-- À exécuter dans Supabase → SQL Editor.
-- ===========================================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS donnees jsonb;
