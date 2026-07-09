-- =============================================================
-- Supabase SQL — Durcissement de la table `invitations`
-- À exécuter dans : Supabase Dashboard > SQL Editor. Relançable.
--
-- OBJECTIF DE SÉCURITÉ
-- Le questionnaire public utilise la clé `anon` (publique). Sans ce script,
-- si la table `invitations` autorise anon en SELECT/UPDATE, n'importe qui
-- peut, avec la clé publique, faire :
--     GET  .../rest/v1/invitations?select=*          -> fuite de TOUS les
--          noms/emails/tokens des prospects invités
--     PATCH .../rest/v1/invitations?token=eq.<x>      -> altération
--
-- Ce script coupe tout accès direct `anon` à la table et n'expose que deux
-- fonctions SECURITY DEFINER, appelables par token exact uniquement :
--   - get_invitation(p_token)      -> ne renvoie que nom/prenom/email d'UNE ligne
--   - complete_invitation(p_token) -> marque l'invitation comme complétée
--
-- ⚠️ Adaptez les noms de colonnes (nom, prenom, email, token, completed,
--    completed_at) si votre table `invitations` diffère.
--    Prérequis : les tokens doivent être longs et imprévisibles
--    (gen_random_uuid() ou 32+ octets aléatoires).
-- =============================================================

-- 1) RLS active + suppression de toute politique permissive pour anon.
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Retirez ici toute politique existante qui accorderait un accès direct à anon.
-- (Renommez selon vos politiques réelles ; ces DROP sont sans effet si absentes.)
DROP POLICY IF EXISTS "anon read invitations"    ON invitations;
DROP POLICY IF EXISTS "anon select invitations"  ON invitations;
DROP POLICY IF EXISTS "anon update invitations"  ON invitations;
DROP POLICY IF EXISTS "public read invitations"  ON invitations;
DROP POLICY IF EXISTS "Anyone can read invitation" ON invitations;

-- Coupe l'accès table direct : plus aucune requête REST directe pour anon.
REVOKE ALL ON invitations FROM anon;

-- NB : la colonne `token` est de type uuid dans cette base -> les fonctions
-- prennent un paramètre uuid (PostgREST convertit automatiquement la chaîne
-- envoyée par le client). On retire d'éventuelles anciennes versions en text.
DROP FUNCTION IF EXISTS public.get_invitation(text);
DROP FUNCTION IF EXISTS public.complete_invitation(text);

-- 2) Lecture sécurisée : uniquement nom/prenom/email, pour un token exact,
--    et seulement si l'invitation n'est pas déjà complétée.
CREATE OR REPLACE FUNCTION public.get_invitation(p_token uuid)
RETURNS TABLE (nom text, prenom text, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nom, prenom, email
  FROM invitations
  WHERE token = p_token
    AND coalesce(completed, false) = false
  LIMIT 1;
$$;

-- 3) Complétion : marque l'invitation correspondante comme traitée.
CREATE OR REPLACE FUNCTION public.complete_invitation(p_token uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE invitations
  SET completed = true,
      completed_at = now()
  WHERE token = p_token;
$$;

-- 4) N'autorise QUE l'exécution de ces deux fonctions (rien d'autre).
REVOKE ALL ON FUNCTION public.get_invitation(uuid)      FROM public;
REVOKE ALL ON FUNCTION public.complete_invitation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invitation(uuid)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_invitation(uuid) TO anon, authenticated;
