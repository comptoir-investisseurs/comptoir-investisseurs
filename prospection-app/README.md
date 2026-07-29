# Prospection Locale — Mini-CRM de vente de sites internet aux commerces locaux

Application web (en français) permettant de **trouver, qualifier, contacter et suivre** des commerces locaux (coiffeurs, barbiers, instituts, restaurants, artisans, garages, etc.) dans le but de leur vendre un site vitrine ou un système de prise de rendez-vous.

L'outil automatise la recherche, l'analyse, la qualification, la génération d'audits, de messages et de démonstrations de sites — **sans jamais envoyer automatiquement de messages privés en masse**. Tous les envois sont validés manuellement par l'utilisateur.

> Ce projet est indépendant du site LFDR présent à la racine du dépôt. Il vit dans le sous-dossier `prospection-app/`.

---

## Sommaire

- [Fonctionnalités (MVP)](#fonctionnalités-mvp)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes](#commandes)
- [Architecture](#architecture)
- [Modèle de données](#modèle-de-données)
- [Scoring commercial](#scoring-commercial)
- [Sécurité & conformité](#sécurité--conformité)
- [Passer à PostgreSQL / Supabase](#passer-à-postgresql--supabase)
- [Déploiement](#déploiement)
- [Reste à faire (roadmap)](#reste-à-faire-roadmap)
- [Checklist de mise en production](#checklist-de-mise-en-production)

---

## Fonctionnalités (MVP)

- ✅ Authentification (e-mail / mot de passe, session JWT signée, middleware de protection)
- ✅ Espace de travail isolé (multi-workspace)
- ✅ **Recherche** de prospects via un fournisseur de démonstration (données fictives déterministes)
- ✅ **Import CSV** (colonnes tolérantes) et **ajout manuel**
- ✅ **Détection de doublons** multi-critères (identifiant externe, nom+ville, téléphone, adresse, domaine)
- ✅ **Analyse technique de site** en requêtes HTTP statiques, avec **protection anti-SSRF**
- ✅ **Score commercial /100** transparent et **paramétrable**
- ✅ **Audit commercial** (formulations prudentes, aucune donnée inventée)
- ✅ **Génération de messages** (Facebook, Instagram, e-mail court/détaillé, script d'appel) avec affichage des données utilisées
- ✅ **Copie du message** + boutons d'ouverture des canaux + « marquer comme contacté »
- ✅ **File de prospection** (parcours guidé prospect par prospect)
- ✅ **Générateur de landing page de démonstration** (9 modèles métier), URL à slug unique, `noindex`, expiration configurable, mention « non officielle »
- ✅ **Pipeline CRM** (Kanban) + vue tableau, historique de statut, notes, tâches, réponses
- ✅ **Relances** (2 modèles par défaut) et respect immédiat d'un refus (« ne pas contacter »)
- ✅ **Tableau de bord** (métriques, répartitions par statut / métier / ville)
- ✅ **Paramètres** : identité commerciale, signature, pondérations de scoring, offres, configuration IA/démo
- ✅ **Abstraction IA** : mode « sans IA » (modèles internes) ou Anthropic, sorties validées par Zod
- ✅ Données de démonstration (seed), page conformité, tests sur les parties critiques

---

## Stack technique

| Domaine        | Choix                                             |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 14 (App Router) + React 18                |
| Langage        | TypeScript (strict, `noUncheckedIndexedAccess`)   |
| Styles         | Tailwind CSS + composants UI maison (façon shadcn) |
| Base de données| Prisma ORM — SQLite par défaut (PostgreSQL-ready) |
| Auth           | bcryptjs + JWT signé (`jose`) en cookie httpOnly  |
| Validation     | Zod                                               |
| Tests          | Vitest                                            |

---

## Démarrage rapide

Prérequis : **Node.js ≥ 20**.

```bash
cd prospection-app
cp .env.example .env          # ajustez au besoin (AUTH_SECRET, etc.)
npm install
npm run db:push               # crée le schéma SQLite (prisma/dev.db)
npm run db:seed               # crée le compte démo + données fictives
npm run dev                   # http://localhost:3000
```

Ou en une commande : `npm run setup` (install + db:push + seed).

**Connexion de démonstration** (créée par le seed) :

- E-mail : `demo@prospection.local`
- Mot de passe : `demo1234`

(modifiables via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

---

## Variables d'environnement

Voir [`.env.example`](./.env.example). Principales clés :

| Variable                | Rôle                                                     |
| ----------------------- | -------------------------------------------------------- |
| `DATABASE_URL`          | Connexion Prisma (SQLite par défaut)                     |
| `AUTH_SECRET`           | Secret de signature des sessions (**obligatoire en prod**) |
| `SEED_ADMIN_EMAIL/PASSWORD` | Compte créé par le seed                              |
| `AI_PROVIDER`           | `none` (défaut) ou `anthropic`                            |
| `ANTHROPIC_API_KEY`     | Clé API si `AI_PROVIDER=anthropic`                       |
| `DEMO_BASE_URL`         | Base des URLs de démonstration                           |
| `DEMO_EXPIRATION_DAYS`  | Durée de validité des démos (défaut : 30 jours)          |

Aucun secret n'est committé : `.env` est ignoré par git.

---

## Commandes

```bash
npm run dev         # serveur de développement
npm run build       # build de production (prisma generate + next build)
npm run start       # serveur de production
npm run lint        # ESLint
npm run typecheck   # vérification TypeScript stricte
npm run test        # tests Vitest
npm run db:push     # applique le schéma (sans migration)
npm run db:migrate  # migrations Prisma
npm run db:seed     # données de démonstration
npm run db:reset    # réinitialise la base
```

---

## Architecture

```
prospection-app/
├── prisma/
│   ├── schema.prisma          # modèle de données complet
│   └── seed.ts                # données de démonstration
├── src/
│   ├── middleware.ts          # protection des routes (vérif JWT en edge)
│   ├── app/
│   │   ├── layout.tsx         # layout racine
│   │   ├── page.tsx           # redirection selon session
│   │   ├── login/             # page + action de connexion
│   │   ├── (app)/             # espace authentifié (sidebar)
│   │   │   ├── dashboard/     # tableau de bord
│   │   │   ├── search/        # recherche + import CSV
│   │   │   ├── prospects/     # liste, fiche détaillée, ajout
│   │   │   ├── pipeline/      # Kanban
│   │   │   ├── queue/         # file de prospection
│   │   │   ├── demos/         # démonstrations créées
│   │   │   ├── templates/     # modèles de messages / sites
│   │   │   ├── settings/      # paramètres
│   │   │   └── compliance/    # conformité
│   │   ├── demo/[slug]/       # rendu public des démos (noindex)
│   │   └── api/health/        # healthcheck
│   ├── components/            # UI + composants clients
│   └── lib/                   # LOGIQUE MÉTIER (séparée de l'UI)
│       ├── domain.ts          # statuts, priorités, catégories, mappings
│       ├── providers.ts       # ProspectProvider (démo, CSV, extensible)
│       ├── dedupe.ts          # détection de doublons
│       ├── site-analyzer.ts   # analyse HTTP statique + anti-SSRF
│       ├── scoring.ts         # moteur de score paramétrable
│       ├── audit.ts           # génération d'audit (règles)
│       ├── messages.ts        # génération de messages (règles)
│       ├── demo-generator.ts  # contenu + rendu HTML des démos
│       ├── ai.ts              # abstraction AIProvider (none / anthropic)
│       ├── prospect-service.ts# ingestion, analyse, statut
│       ├── settings.ts        # réglages (poids, identité)
│       ├── auth.ts            # hachage + sessions
│       ├── actions.ts         # server actions (mutations)
│       └── __tests__/         # tests Vitest
```

**Principe** : toute la logique métier vit dans `src/lib/` et est testable sans l'UI. Les pages consomment ces services via des **server actions**.

---

## Modèle de données

Modèles Prisma : `User`, `Workspace`, `Membership`, `Prospect`, `ProspectAnalysis`, `AuditReport`, `ProspectNote`, `ProspectTask`, `ProspectStatusHistory`, `ProspectContact`, `MessageTemplate`, `GeneratedMessage`, `WebsiteDemo`, `Offer`, `SearchCampaign`, `ImportJob`, `AppSetting`.

Les colonnes « riches » (horaires, services, photos, analyse, breakdown de score, contenu de démo) sont stockées en **JSON encodé** dans des champs `String`, pour rester **portables entre SQLite et PostgreSQL**.

---

## Scoring commercial

Score borné **0–100**, entièrement transparent (le détail est affiché sur la fiche). Pondérations par défaut (modifiables dans **Paramètres**) :

| Signal                                   | Points |
| ---------------------------------------- | ------ |
| Absence de site internet                 | +30    |
| Site non adapté au mobile                | +20    |
| Absence de prise de rendez-vous          | +15    |
| Réseaux actifs mais aucun site           | +15    |
| Site lent ou défaillant                  | +10    |
| Note ≥ 4/5                               | +10    |
| Plus de 30 avis                          | +10    |
| Absence d'appel à l'action               | +5     |
| Informations manquantes                  | +5     |
| Site déjà moderne                        | −30    |
| Réservation déjà bien intégrée           | −15    |
| Chaîne / franchise                       | −20    |

Priorités : `faible` (<35), `moyenne` (35–54), `élevée` (55–74), `très élevée` (≥75).

---

## Sécurité & conformité

- **Aucun envoi automatique de messages privés en masse.** Validation humaine obligatoire.
- Champ **« ne pas contacter »** ; réponse négative → statut automatique correspondant.
- **Analyse de site anti-SSRF** : résolution DNS + rejet des IP privées/loopback/link-local, protocole restreint, limite de redirections (chaque saut revérifié), délai strict (8 s), taille plafonnée (1,5 Mo). Le JavaScript des sites analysés **n'est jamais exécuté**.
- Sessions **httpOnly**, `secure` en production, JWT signé HS256.
- Isolation stricte par workspace (toutes les requêtes filtrent sur `workspaceId`).
- Validation Zod des entrées et des sorties IA.
- Provenance des données visible (source + date de collecte) et suppression possible d'un prospect.

Voir la page **Conformité** dans l'application.

---

## Passer à PostgreSQL / Supabase

1. Dans `prisma/schema.prisma`, remplacer `provider = "sqlite"` par `provider = "postgresql"`.
2. Définir `DATABASE_URL` (ex. Supabase : `postgresql://...`).
3. `npm run db:push` (ou `npm run db:migrate` pour des migrations versionnées), puis `npm run db:seed`.

Aucune modification de code applicatif n'est nécessaire (types portables).

---

## Déploiement

**Vercel** (recommandé) ou tout hébergeur Node.

1. Base PostgreSQL managée (Supabase, Neon, RDS…).
2. Variables d'environnement : `DATABASE_URL`, `AUTH_SECRET` (fort), éventuellement `AI_PROVIDER`/`ANTHROPIC_API_KEY`, `DEMO_BASE_URL`.
3. Build : `npm run build`. Démarrage : `npm run start`.
4. Appliquer le schéma : `prisma migrate deploy` (ou `db push`).

Le rendu des démonstrations est servi par la route `/demo/[slug]` avec en-tête `X-Robots-Tag: noindex, nofollow`.

---

## Reste à faire (roadmap)

Fonctionnalités prévues par l'architecture mais non incluses dans ce MVP :

- Fournisseur de recherche **via une API locale officielle** (l'interface `ProspectProvider` est prête ; brancher un connecteur conforme aux CGU).
- Analyse de site **avec navigateur isolé** (headless sandbox) en complément de l'analyse statique.
- Génération d'audit/contenu **entièrement pilotée par l'IA** (le mode Anthropic est câblé pour l'audit et le contenu de démo ; élargir la couverture et le cache persistant).
- Glisser-déposer réel dans le **Kanban** (le changement de statut se fait actuellement via un menu).
- **Relances planifiées** automatiques (rappels + file dédiée) et séquences multi-canaux.
- **Export / suppression RGPD** en un clic, journal d'audit persistant, rôles fins par membre.
- Stockage **S3** des photos importées et hébergement des démos sur un sous-domaine dédié.
- Tâches planifiées (**cron**) pour l'analyse de masse et l'expiration des démos.
- Tests end-to-end (Playwright) et tests d'intégration des server actions.

---

## Checklist de mise en production

- [ ] `AUTH_SECRET` fort et unique (`openssl rand -base64 32`), jamais committé.
- [ ] Base PostgreSQL managée + sauvegardes automatiques activées.
- [ ] `prisma migrate deploy` exécuté ; seed **désactivé** en production (ou compte démo supprimé).
- [ ] HTTPS forcé ; cookies `secure` (automatique en `NODE_ENV=production`).
- [ ] Revue des pondérations de scoring et des offres/prix par défaut.
- [ ] `DEMO_BASE_URL` pointant vers le domaine réel des démonstrations ; `noindex` vérifié.
- [ ] Politique de conservation des données définie ; procédure d'opposition/effacement testée.
- [ ] Limitation de débit (rate limiting) en amont (proxy/hébergeur) pour l'analyse de sites.
- [ ] Vérifier les CGU des sources de données avant tout branchement d'API réelle.
- [ ] `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` : tous verts.
- [ ] Surveillance/logs applicatifs configurés ; alertes sur erreurs 5xx.
```
