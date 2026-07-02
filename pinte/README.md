# Ma p'tite pinte 🍺

**La compétition de pintes par équipe.** Site web participatif, mobile-first,
**100 % indépendant** (aucun lien avec un autre projet du dépôt).

Chaque joueur s'inscrit, rejoint une équipe, et poste ses pintes en photo.
Chaque photo est **vérifiée automatiquement** (une pinte, dans un verre en verre,
50 cl, liquide visible). Le fil des pintes défile **en temps réel** comme une
conversation, et les statistiques (pintes bues, joueurs, meilleures équipes)
sont mises à jour en direct.

## Fonctionnalités

- 🏠 **Accueil public** : compteurs globaux (pintes bues, joueurs, équipes, litres),
  classement des équipes et top joueurs.
- 🔐 **Inscription / connexion** (Supabase Auth). L'inscription récolte **prénom,
  nom et email** — obligatoire pour participer.
- 📸 **Fil en temps réel** : les pintes postées par tous les joueurs apparaissent
  instantanément, avec le décompte, le lieu et l'équipe.
- 🙋 **Profils** : chaque joueur a ses stats (pintes, litres, classement) et la
  liste de ses pintes — accessibles en cliquant sur son avatar.
- ✅ **Vérification des photos** par IA (vision Claude) via une fonction Edge.
- 🏆 **Compétition par équipe** : rejoins une équipe existante ou crée la tienne.

## Stack

100 % statique côté client (HTML/CSS/JS, sans build) + **Supabase** :
Auth · Postgres (+ RLS) · Storage · Realtime · Edge Functions.

```
pinte/
├─ index.html                     Interface (shell)
├─ assets/
│  ├─ style.css                   Design system (punchy, participatif)
│  ├─ config.js                   ⚙️ À REMPLIR : URL + clé anon Supabase
│  └─ app.js                      Logique (auth, fil, realtime, upload, profil)
├─ supabase.sql                   Schéma + RLS + vues + storage + realtime
├─ edge-functions/verify-pinte/   Vérification photo (vision Claude)
│  └─ index.ts
└─ README.md
```

## Installation

### 1. Créer un projet Supabase
Sur [supabase.com](https://supabase.com), créez un **nouveau projet dédié**
(indépendant de tout autre projet). Récupérez dans *Project Settings > API* :
- **Project URL**
- **anon public** key

### 2. Configurer le front
Éditez `assets/config.js` et collez vos deux valeurs :

```js
window.PP_CONFIG = {
  SUPABASE_URL:      'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',
  ...
};
```

> La clé **anon** est publique par nature (elle vit dans le navigateur). La
> sécurité repose sur les règles **RLS** de `supabase.sql`. Ne mettez **jamais**
> la clé `service_role` ici.

### 3. Créer la base
Dans *Supabase Dashboard > SQL Editor*, collez et exécutez **`supabase.sql`**.
Il crée les tables (`pp_teams`, `pp_players`, `pp_pints`), les vues de stats,
les politiques RLS, le bucket de stockage `pintes` et active le temps réel.

### 4. Vérifier le Storage
Le script crée le bucket public `pintes`. Si besoin, vérifiez dans
*Storage* qu'il existe et qu'il est **public**.

### 5. (Recommandé) Vérification des photos par IA
La fonction Edge `verify-pinte` valide chaque photo avec la vision de Claude.

```bash
# Depuis la racine du dépôt, avec la CLI Supabase installée & liée au projet :
supabase functions deploy verify-pinte --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
```

> **Sans cette fonction, le jeu marche quand même** : les pintes passent en
> statut « en attente » (⏳) au lieu d'être validées automatiquement. Vous
> pouvez alors les valider à la main (passer `status` à `verified` dans la table
> `pp_pints`).

### 6. Lancer
Site statique : ouvrez `pinte/index.html`, ou servez le dossier :

```bash
python3 -m http.server 8000
# puis http://localhost:8000/pinte/
```

Déployable tel quel sur **GitHub Pages**, Netlify, Vercel, etc.

## Règle de validation d'une pinte

Une photo est acceptée si **les trois** conditions sont réunies :
1. 🍺 une pinte dans un **vrai verre en verre** (ni canette, ni bouteille, ni gobelet) ;
2. 📏 volume **50 cl** ;
3. 💧 **liquide visible** (le verre n'est pas vide).

Sinon la photo est refusée avec une courte explication, et le joueur peut en reprendre une.

## Modèle de données (résumé)

| Table | Rôle |
|---|---|
| `pp_teams` | équipes (nom, couleur) |
| `pp_players` | profils joueurs (prénom, nom, email, équipe) liés à `auth.users` |
| `pp_pints` | pintes postées (photo, lieu, volume, statut de vérification) |

Vues de stats en lecture publique : `pp_global_stats`, `pp_team_stats`, `pp_player_stats`.

## Personnalisation

- **Couleurs / ambiance** : variables CSS dans `assets/style.css` (`:root`).
- **Volume de la pinte** : `PINTE_CL` dans `assets/config.js`.
- **Équipes de départ** : bloc final de `supabase.sql`.
