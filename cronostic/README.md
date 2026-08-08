# Cronostic

> La documentation technique de l'horloger.
> Guides d'atelier et pièces détachées pour mouvements horlogers vintage.

Projet **totalement autonome** : aucun code, style ou dépendance partagée avec
le reste du dépôt. Le dossier `cronostic/` se transplante tel quel dans un dépôt
dédié (voir « Extraction » en fin de fichier).

---

## Ce que le site fait — et ne fait pas

Les guides PDF Cronostic sont produits **hors du site**, déjà mis en page et
estampillés. Le site ne les génère pas, ne les modifie pas et ne stocke aucune
représentation structurée de leur contenu. Il les **vend** et les **distribue**.

Concrètement, il n'existe ni pipeline d'extraction, ni éditeur de guides, ni
workflow éditorial, ni génération de PDF. Un guide, côté back-office, c'est une
fiche produit et un fichier à téléverser.

| Le site fait                                    | Le site ne fait pas                    |
| ----------------------------------------------- | -------------------------------------- |
| Présenter les calibres Omega vintage            | Générer ou modifier les PDF            |
| Vendre les guides à l'unité (Stripe)            | Analyser les manuels sources           |
| Proposer l'abonnement Cronostic Pro             | Rédiger du contenu de guide            |
| Servir les PDF après vérification des droits    | Gérer une validation éditoriale        |
| Identifier les fournitures d'un calibre         | Stocker le contenu structuré des PDF   |
| Chercher les pièces en vente (eBay + marchands) |                                        |
| Référencer huiles et consommables               |                                        |
| Construire une encyclopédie gratuite            |                                        |

---

## Démarrage

```bash
npm install
npm run dev
```

Le site démarre **sans aucune variable d'environnement**. Il bascule alors en
mode démonstration :

| Brique   | Absente → comportement                                                      |
| -------- | --------------------------------------------------------------------------- |
| Neon     | Catalogue servi depuis le seed en mémoire ; écritures admin volatiles        |
| Clerk    | Connexion locale par e-mail (cookie signé HMAC) sur `/connexion`             |
| Stripe   | Achat et abonnement simulés, droits accordés immédiatement et signalés       |
| R2       | PDF écrits dans `.local-storage/`, servis par la route de téléchargement     |
| eBay     | Liens de recherche profonds vers eBay, Cousins, Otto Frei, Chrono24          |

Chaque brique s'active indépendamment des autres — voir `.env.example`.

En développement local sans `ADMIN_EMAILS`, tout compte connecté a accès à
`/admin`. En production, seuls les e-mails listés dans `ADMIN_EMAILS` l'ont.

---

## Mise en production

### 1. Base de données (Neon)

```bash
# DATABASE_URL=postgresql://…@ep-xxx.neon.tech/cronostic?sslmode=require
npm run db:push     # crée le schéma
npm run db:seed     # catalogue de lancement (idempotent)
```

Le seed crée les 10 calibres, la nomenclature 30 mm, les lubrifiants,
l'outillage, et une fiche guide **en brouillon sans PDF** par calibre.

### 2. Authentification (Clerk)

Renseigner `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY`.
Le middleware Clerk s'active automatiquement ; la connexion locale se désactive
d'elle-même. Renseigner `ADMIN_EMAILS` **avant** le premier déploiement public.

### 3. Paiement (Stripe)

- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID` — prix récurrent mensuel de Cronostic Pro
  (facultatif : sans lui, le prix est créé à la volée depuis
  `NEXT_PUBLIC_PRO_PRICE_CENTS`)
- Webhook → `https://…/api/stripe/webhook`, puis `STRIPE_WEBHOOK_SECRET`

Événements à activer : `checkout.session.completed`,
`customer.subscription.created|updated|deleted`, `invoice.payment_failed`.

Le webhook fait foi. La page `/purchase/success` réconcilie aussi la session
Stripe pour que le téléchargement soit disponible immédiatement, sans attendre
l'événement.

### 4. Stockage des PDF (Cloudflare R2)

Créer un bucket **privé** (`cronostic`) et une clé d'API S3, puis renseigner
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

Les objets suivent la convention `premium/guides/omega-265.pdf`. L'URL du
bucket n'est **jamais** exposée : `/api/guides/[guideId]/download` vérifie la
session puis le droit, et ne délivre qu'ensuite une URL signée de 5 minutes.

### 5. Recherche de pièces (eBay Browse API)

Créer une application sur developer.ebay.com, puis renseigner
`EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`. Le jeton OAuth
(`client_credentials`) est mis en cache en mémoire et les résultats sont
revalidés toutes les 15 minutes. En cas d'erreur ou de quota, la page retombe
automatiquement sur les liens marchands.

---

## Mettre un guide en vente

1. `/admin/guides` → **Ajouter**
2. Choisir le calibre, saisir titre, description courte, prix, nombre de pages
3. Cocher **Inclus dans Cronostic Pro** si le guide entre dans l'abonnement
4. Enregistrer, puis **téléverser le PDF final** depuis la page du guide
5. **Publier**

Un guide sans PDF ne peut pas être publié : la tentative est bloquée et
signalée.

---

## Droits d'accès

| Situation                                | Affichage                    | Téléchargement |
| ---------------------------------------- | ---------------------------- | -------------- |
| Visiteur non connecté                    | Prix + « Acheter »           | non            |
| Connecté, guide non acheté, pas Pro      | Prix + « Acheter »           | non            |
| Guide déjà acheté                        | « Vous possédez ce guide »   | oui, définitif |
| Pro actif + guide inclus                 | « Inclus avec Cronostic Pro »| oui            |

Un achat à l'unité survit à la résiliation de l'abonnement. Un guide déjà
possédé ne se voit jamais reproposer à l'achat. Un clic sur « Acheter » ou
« S'abonner » sans compte renvoie vers `/connexion`, puis revient
automatiquement sur le checkout correspondant.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                    accueil
│   ├── calibres/[slug]/            fiche calibre (cœur du site)
│   ├── guides/                     vitrine des guides
│   ├── pieces/                     recherche de pièces
│   ├── huiles/                     huiles, graisses, outillage
│   ├── pro/                        abonnement
│   ├── account/                    compte, mes guides
│   ├── purchase/                   récapitulatif et confirmation
│   ├── admin/                      back-office
│   └── api/
│       ├── guides/[guideId]/download   URL signée après vérification
│       ├── guides/[guideId]/preview    extrait public
│       ├── admin/guides/[guideId]/file téléversement du PDF
│       └── stripe/webhook
├── db/          schéma Drizzle + seed
├── data/        catalogue de lancement (seed & mode démo)
├── lib/         auth, droits, repo, r2, stripe, ebay
└── components/
```

`src/lib/repo.ts` est le seul point qui parle à la base. Chaque fonction a deux
branches : Neon quand `DATABASE_URL` est présente, seed en mémoire sinon. Le
reste du code ignore complètement cette bascule.

### Tables

`users`, `caliber_families`, `calibers`, `caliber_specs`, `caliber_relations`,
`guides`, `purchases`, `subscriptions`, `parts`, `part_calibers`,
`part_compatibilities`, `lubricants`, `caliber_lubrication_points`, `tools`,
`caliber_tools`, `marketplace_listings`, `favorites`.

Contrainte notable : `purchases` porte un index unique `(user_id, guide_id)` —
un même guide ne peut pas être acheté deux fois par le même compte.

---

## Données techniques : statut

Les caractéristiques des 10 calibres sont un **point de départ à valider**.
Toute valeur non recoupée porte `is_verified = false`, s'affiche avec la
mention « à valider » sur la fiche, et la fiche entière affiche un bandeau tant
que `data_status` vaut `draft`.

À relire à l'établi avant de basculer une fiche en `verified` :

- hauteur, nombre de rubis, réserve de marche, type d'antichoc ;
- affichage de la seconde (petite seconde / seconde au centre) pour les séries
  26x et 28x ;
- années de production ;
- numéros de nomenclature des fournitures, à recouper avec les planches Omega.

Sont en revanche fiables : famille 30 mm, remontage manuel, diamètre 30 mm,
fréquence 18 000 alt/h, échappement à ancre suisse.

---

## Extraction vers un dépôt dédié

Le dossier est autonome. Pour lui donner son propre dépôt en conservant
l'historique :

```bash
git subtree split --prefix=cronostic -b cronostic-only
cd /tmp && git clone --single-branch --branch cronostic-only <dépôt> cronostic
cd cronostic && git remote set-url origin <nouveau-dépôt> && git push -u origin main
```

Ou simplement copier le dossier dans un dépôt neuf : rien n'y référence le
projet hôte.

---

## Identité

Le nom s'écrit **toujours « Cronostic »** — capitale initiale, jamais en
capitales d'imprimerie. Aucun libellé ne doit lui appliquer `uppercase` : les
intertitres qui portent la marque utilisent `.surtitre-marque`, les autres
`.surtitre`.

Le logotype se dépose dans `public/` — voir `public/README.md`. Tant qu'il
n'est pas là, il est composé en Yellowtail.

**Typographie** (chargée par `next/font`, auto-hébergée, aucun appel externe
au runtime) :

| Rôle | Police | Pourquoi |
| --- | --- | --- |
| Titres | Fraunces | Serif à contraste bas, formes chaudes, tient sur fond sombre |
| Texte, interface | IBM Plex Sans | Dessinée pour la documentation technique |
| Références, numéros | IBM Plex Mono | Nomenclature lisible, assortie au texte |
| Logotype | Yellowtail | Script d'enseigne, provisoire |

**Palette** : noir de platine `#0a0a0b`, greige `#cbc7bb` (repris du
logotype), ivoire `#f2efe6`, laiton `#c39b48`.

---

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Neon PostgreSQL · Drizzle ORM ·
Clerk · Stripe · Cloudflare R2 · Vercel.

Pas de Supabase.
