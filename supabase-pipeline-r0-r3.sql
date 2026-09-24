-- =============================================================
-- Supabase SQL : pipeline commercial R0 → R3 (prospects uniquement)
-- À exécuter dans : Supabase Dashboard > SQL Editor. Relançable.
-- Fait suite à supabase-bilans.sql (Nouveau/Contacté/RDV planifié → R1 : Bilan, etc.)
-- =============================================================

-- Nouveau pipeline : R0 (bilan patrimonial réalisé) → R1 (objectifs et difficultés)
-- → R2 (solutions proposées) → R3 (décision finale). Gagné bascule la fiche en
-- client (elle sort du pipeline) ; Perdu sort aussi du pipeline mais reste
-- consultable dans l'onglet Prospects. Ces deux dernières valeurs ne sont plus
-- des colonnes du tableau, seulement des marqueurs de sortie de pipeline.
UPDATE clients SET stage = 'R0' WHERE stage IN ('Nouveau', 'Contacté', 'RDV planifié');
UPDATE clients SET stage = 'R1' WHERE stage = 'R1 : Bilan';
UPDATE clients SET stage = 'R2' WHERE stage = 'R2 : Objectifs';
UPDATE clients SET stage = 'R3' WHERE stage IN ('R3 : Offre', 'Proposition', 'Prospect chaud');
UPDATE clients SET type  = 'client' WHERE stage = 'Gagné' AND type = 'prospect';

-- Les prospects qui n'ont pas encore de stage (créés avant cette colonne) démarrent au R0.
UPDATE clients SET stage = 'R0' WHERE stage IS NULL AND type = 'prospect';
