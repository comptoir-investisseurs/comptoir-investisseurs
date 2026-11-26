-- =============================================================
-- Supabase — Articles (« Actualités ») publiés depuis l'espace propriétaire
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Même projet que supabase-cgp-annonces.sql et supabase-cgp-admins.sql.
--
-- Principe : la table cgp_articles n'est JAMAIS lisible directement par
-- anon ou authenticated — seuls service_role et les utilisateurs listés
-- dans cgp_admins (voir supabase-cgp-admins.sql) peuvent la lire/écrire
-- en entier (y compris les brouillons). Une vue expose uniquement les
-- articles publiés, triés du plus récent au plus ancien.
-- =============================================================

create table if not exists cgp_articles (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  published_at    timestamptz,
  slug            text unique not null,
  statut          text default 'brouillon'
                    check (statut in ('brouillon','publie')),

  titre           text not null,
  chapo           text,              -- chapô / résumé affiché dans la liste
  contenu         text,              -- corps de l'article (mini-syntaxe, voir admin-articles.html)
  image_url       text,              -- visuel de couverture (URL)
  auteur          text default 'Cédence'
);

alter table cgp_articles enable row level security;

-- Seul le service_role (back-office) peut lire/écrire la table brute.
create policy "Service role manages articles"
  on cgp_articles for all to service_role using (true) with check (true);

-- Accès complet (brouillons compris) pour les utilisateurs listés dans cgp_admins.
create policy "Admins manage cgp_articles"
  on cgp_articles for all to authenticated
  using (exists (select 1 from cgp_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from cgp_admins a where a.user_id = auth.uid()));

-- ---- Vue publique (anon + authenticated) : uniquement les articles publiés ----
create or replace view cgp_articles_public
with (security_invoker = false) as
select id, slug, titre, chapo, contenu, image_url, auteur,
       coalesce(published_at, created_at) as published_at
from cgp_articles
where statut = 'publie'
order by coalesce(published_at, created_at) desc;

grant select on cgp_articles_public to anon, authenticated;

create index if not exists idx_cgp_articles_statut on cgp_articles (statut);
create index if not exists idx_cgp_articles_published on cgp_articles (published_at desc);

-- =============================================================
-- Gestion : admin-articles.html (réservé aux comptes listés dans cgp_admins,
-- voir supabase-cgp-admins.sql — même procédure d'autorisation que pour
-- les annonces).
-- =============================================================
