-- =========================================================================
--  La Française des Produits Structurés — table des articles
--  À exécuter une seule fois dans Supabase : SQL Editor → New query → Run.
--  Idempotent : réexécuter ce fichier ne détruit aucun article existant.
-- =========================================================================

create table if not exists public.lfps_articles (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  titre            text not null,
  chapo            text,
  corps            text,                       -- Markdown restreint (voir admin)
  meta_title       text,
  meta_description text,
  categorie        text,
  auteur           text,
  temps_lecture    int,                        -- minutes, calculé à l'enregistrement
  statut           text not null default 'brouillon'
                   check (statut in ('brouillon', 'publie')),
  publie_le        date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Le slug sert d'URL : on le contraint à un format sûr.
alter table public.lfps_articles drop constraint if exists lfps_articles_slug_format;
alter table public.lfps_articles
  add constraint lfps_articles_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 90);

create index if not exists lfps_articles_publies_idx
  on public.lfps_articles (publie_le desc)
  where statut = 'publie';

-- updated_at tenu à jour par la base, pas par le client.
create or replace function public.lfps_articles_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists lfps_articles_touch on public.lfps_articles;
create trigger lfps_articles_touch
  before update on public.lfps_articles
  for each row execute function public.lfps_articles_touch();

-- -------------------------------------------------------------------------
--  Droits d'accès
--  Lecture publique des seuls articles publiés ; écriture réservée aux
--  comptes authentifiés (les mêmes que ceux du CRM).
-- -------------------------------------------------------------------------
alter table public.lfps_articles enable row level security;

drop policy if exists "lecture publique des articles publies" on public.lfps_articles;
create policy "lecture publique des articles publies"
  on public.lfps_articles for select
  to anon, authenticated
  using (statut = 'publie');

drop policy if exists "lecture complete pour les redacteurs" on public.lfps_articles;
create policy "lecture complete pour les redacteurs"
  on public.lfps_articles for select
  to authenticated
  using (true);

drop policy if exists "redaction reservee aux comptes authentifies" on public.lfps_articles;
create policy "redaction reservee aux comptes authentifies"
  on public.lfps_articles for insert
  to authenticated
  with check (true);

drop policy if exists "modification reservee aux comptes authentifies" on public.lfps_articles;
create policy "modification reservee aux comptes authentifies"
  on public.lfps_articles for update
  to authenticated
  using (true) with check (true);

drop policy if exists "suppression reservee aux comptes authentifies" on public.lfps_articles;
create policy "suppression reservee aux comptes authentifies"
  on public.lfps_articles for delete
  to authenticated
  using (true);

-- =========================================================================
--  Complément : image d'illustration
--  À exécuter après le bloc ci-dessus. Idempotent, comme lui.
-- =========================================================================

alter table public.lfps_articles
  add column if not exists image_url text;

-- Dépôt des images d'articles. Lecture publique (elles s'affichent sur le
-- site), dépôt réservé aux comptes authentifiés.
insert into storage.buckets (id, name, public)
values ('articles', 'articles', true)
on conflict (id) do update set public = true;

drop policy if exists "images d articles lisibles par tous" on storage.objects;
create policy "images d articles lisibles par tous"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'articles');

drop policy if exists "depot d images reserve aux redacteurs" on storage.objects;
create policy "depot d images reserve aux redacteurs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'articles');

drop policy if exists "remplacement d images reserve aux redacteurs" on storage.objects;
create policy "remplacement d images reserve aux redacteurs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'articles') with check (bucket_id = 'articles');

drop policy if exists "suppression d images reservee aux redacteurs" on storage.objects;
create policy "suppression d images reservee aux redacteurs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'articles');
