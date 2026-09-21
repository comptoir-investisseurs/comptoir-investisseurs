-- =============================================================
-- Supabase SQL : nettoyage des indicateurs chiffrés déjà enregistrés
-- À exécuter dans : Supabase Dashboard > SQL Editor. Relançable.
-- =============================================================
-- Avant cette mise à jour, le bilan patrimonial enregistrait ces champs déjà
-- mis en forme (ex. "210 000 €", "920 € / mois", "400 000 € restant dû"),
-- ce qui les rendait difficiles à trier ou exporter. Depuis, il n'envoie
-- plus que le nombre brut (ex. "210000"). Ce script convertit les valeurs
-- déjà en base au même format brut, en ne gardant que les chiffres.

UPDATE clients SET revenus = NULLIF(regexp_replace(revenus, '[^0-9]', '', 'g'), '')
  WHERE revenus IS NOT NULL AND revenus ~ '[^0-9]';

UPDATE clients SET capacite_epargne = NULLIF(regexp_replace(capacite_epargne, '[^0-9]', '', 'g'), '')
  WHERE capacite_epargne IS NOT NULL AND capacite_epargne ~ '[^0-9]';

UPDATE clients SET patrimoine_financier = NULLIF(regexp_replace(patrimoine_financier, '[^0-9]', '', 'g'), '')
  WHERE patrimoine_financier IS NOT NULL AND patrimoine_financier ~ '[^0-9]';

UPDATE clients SET patrimoine_immobilier = NULLIF(regexp_replace(patrimoine_immobilier, '[^0-9]', '', 'g'), '')
  WHERE patrimoine_immobilier IS NOT NULL AND patrimoine_immobilier ~ '[^0-9]';

UPDATE clients SET credits = NULLIF(regexp_replace(credits, '[^0-9]', '', 'g'), '')
  WHERE credits IS NOT NULL AND credits ~ '[^0-9]';
