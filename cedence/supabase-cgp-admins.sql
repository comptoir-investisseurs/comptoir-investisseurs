-- =============================================================
-- Supabase — Accès « propriétaire » aux annonces (admin-annonces.html)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Même projet que supabase-cgp-leads.sql et supabase-cgp-annonces.sql.
--
-- Principe : cgp_annonces reste illisible/inscriptible pour tout le monde
-- (y compris les comptes « Espace membre »), SAUF pour les utilisateurs
-- listés dans cgp_admins, qui obtiennent un accès complet (lecture de
-- toutes les colonnes, création, modification, suppression).
-- =============================================================

create table if not exists cgp_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

alter table cgp_admins enable row level security;

-- Chacun ne peut voir QUE sa propre ligne (sert à vérifier côté client
-- « suis-je administrateur ? » sans ambiguïté avec « pas encore de ligne »).
create policy "Users can check their own admin row"
  on cgp_admins for select to authenticated
  using (user_id = auth.uid());

-- Accès complet à cgp_annonces pour les utilisateurs listés dans cgp_admins.
create policy "Admins manage cgp_annonces"
  on cgp_annonces for all to authenticated
  using (exists (select 1 from cgp_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from cgp_admins a where a.user_id = auth.uid()));

-- =============================================================
-- Pour vous désigner comme administrateur (une seule fois) :
--
-- 1) Créez votre propre compte sur le site, par le formulaire de
--    connexion/inscription de admin-annonces.html (ou celui de
--    espace-investisseur.html — c'est le même système de comptes),
--    avec l'adresse e-mail que vous souhaitez utiliser pour gérer
--    les annonces.
--
-- 2) Exécutez la requête ci-dessous dans le SQL Editor, en remplaçant
--    l'adresse e-mail par la vôtre :
--
--    insert into cgp_admins (user_id)
--    select id from auth.users where email = 'votre-email@exemple.com'
--    on conflict do nothing;
--
-- 3) Reconnectez-vous sur admin-annonces.html : vous avez maintenant
--    accès au tableau de bord des annonces.
-- =============================================================
