# Ma p'tite pinte 🍺

**La compétition de pintes par équipe.** Site web participatif, mobile-first,
**100 % indépendant** (aucun lien avec un autre projet du dépôt).

Chaque joueur s'inscrit, rejoint une équipe et poste ses pintes en photo.
Le fil des pintes défile **en temps réel** comme une conversation, et les
statistiques (pintes bues, joueurs, meilleures équipes) sont mises à jour en
direct sur tous les téléphones.

## Fonctionnalités

- 🏠 **Accueil public** : compteurs globaux (pintes, joueurs, équipes, litres),
  classement des équipes et top joueurs.
- 🔐 **Inscription / connexion** (Firebase Auth). L'inscription récolte **prénom,
  nom et email** — obligatoire pour participer.
- 📸 **Fil en temps réel** : les pintes postées par tous les joueurs apparaissent
  instantanément, avec le décompte, le lieu et l'équipe.
- 🙋 **Profils** : chaque joueur a ses stats (pintes, litres, classement) et la
  liste de ses pintes — en cliquant sur son avatar. On peut **changer d'équipe**
  depuis son profil (ses pintes suivent).
- 🏆 **Compétition par équipe** : rejoins une équipe existante ou crée la tienne.
- 📊 **Vue statistiques** (bouton 📊) : compétition **en direct** — classement des
  équipes, **classement interne de ton équipe**, top joueurs.
- 🗓️ **Saison mensuelle** : la compétition se renouvelle **chaque mois** avec un
  **décompte** ; les compteurs repartent à zéro le 1er du mois.
- 😂 **Réactions** : cartons 🟨 🟥 et smileys (🔥 😂 🍺 🤮) sur chaque pinte, en direct.
- 🔎 **Vérification IA des photos** (Google Gemini) : rejette galopins, demis,
  verres opaques, canettes, verres vides — seule une vraie pinte 50 cl est validée.

## Stack

100 % statique côté client (HTML/CSS/JS, sans build) + **Firebase** :
Authentication · Firestore (temps réel).

> 🆓 **Aucune facturation.** On n'utilise **pas** Firebase Storage (devenu payant
> sur le plan Spark). Les photos sont compressées puis stockées **directement dans
> Firestore** (en base64), qui reste gratuit. Rien à activer côté Storage.

```
pinte/
├─ index.html            Interface (shell)
├─ assets/
│  ├─ style.css          Design system (punchy, participatif)
│  ├─ config.js          ⚙️ firebaseConfig de votre projet
│  └─ app.js             Logique (auth, fil temps réel, photos, profils, stats)
├─ firestore.rules       Règles de sécurité Firestore
├─ cloudflare-worker/
│  └─ verify-pinte.js    Proxy IA (garde la clé Gemini secrète côté serveur)
└─ README.md
```

## Installation (Firebase — gratuit, sans facturation)

### 1. Créer un projet Firebase
Sur [console.firebase.google.com](https://console.firebase.google.com), créez un
**nouveau projet dédié**.

### 2. Ajouter une app Web
Dans le projet → icône **`</>`** (Web) → enregistrez l'app. Copiez l'objet
`firebaseConfig` proposé.

### 3. Configurer le front
Collez ces valeurs dans **`assets/config.js`** :

```js
window.PP_CONFIG = {
  firebase: {
    apiKey:        'AIza...',
    authDomain:    'xxxx.firebaseapp.com',
    projectId:     'xxxx',
    storageBucket: 'xxxx.appspot.com',
    messagingSenderId: '...',
    appId:         '1:...:web:...',
  },
  PINTE_CL: 50,
};
```

> Ces clés Firebase sont **publiques** par nature (elles vivent dans le
> navigateur). La sécurité repose sur les **Security Rules** ci-dessous.

### 4. Activer les services (2 seulement, tous gratuits)
Dans la console Firebase :
- **Authentication** → *Sign-in method* → activez **E-mail/Mot de passe**.
- **Firestore Database** → *Créer une base* (mode production, région au choix).

> ❌ Pas besoin d'activer **Storage** : les photos vivent dans Firestore.

### 5. Coller les règles de sécurité
- **Firestore** → onglet *Règles* → collez le contenu de **`firestore.rules`**.
  (Elles autorisent la lecture publique, l'écriture de son propre profil/ses pintes,
  et les **réactions** de tout joueur connecté sur n'importe quelle pinte.)

### 6. (Recommandé) Vérification IA des photos — gratuit & sécurisé
La vérif passe par un **Cloudflare Worker** qui garde la clé Gemini **secrète côté
serveur** (jamais exposée dans le navigateur). Fichier : `cloudflare-worker/verify-pinte.js`.

1. **Clé Gemini** : génère-en une sur **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** (gratuit, format `AIza…`).
2. **Cloudflare** (gratuit) : [dash.cloudflare.com](https://dash.cloudflare.com) → *Workers & Pages* → *Create* → *Create Worker* → nomme-le `verify-pinte` → *Deploy*.
3. **Code** : ouvre le Worker → *Edit code* → colle tout `cloudflare-worker/verify-pinte.js` → *Deploy*.
4. **Secret** : Worker → *Settings* → *Variables and Secrets* → *Add* →
   type **Secret**, nom `GEMINI_API_KEY`, valeur = ta clé `AIza…` → *Deploy*.
5. **URL** : copie l'adresse du Worker (`https://verify-pinte.<sous-domaine>.workers.dev`)
   et colle-la dans `assets/config.js` → `VERIFY_URL`.

> Sans `VERIFY_URL`, l'appli fonctionne : les pintes passent en « ⏳ en attente »
> (validables à la main en passant `status` à `verified` dans Firestore).
> La clé `AIza…` ne doit **jamais** être mise dans `config.js` — uniquement dans le Worker.

### 7. Lancer
Site statique : ouvrez `pinte/index.html`, ou servez le dossier :

```bash
python3 -m http.server 8000
# puis http://localhost:8000/pinte/
```

Déployable tel quel sur **GitHub Pages**, Netlify, Vercel, etc.
> Sur GitHub Pages, pensez à ajouter le domaine du site dans
> *Firebase Console > Authentication > Settings > Domaines autorisés*.

## Modèle de données (Firestore)

| Collection | Contenu |
|---|---|
| `teams` | `{ name, color, createdAt }` |
| `players` | doc id = `uid` → `{ prenom, nom, email, teamId, teamName, teamColor }` |
| `pints` | `{ playerId, prenom, nom, teamId, teamName, teamColor, photoUrl, lieu, volumeCl, status, verifyReason, reactions, createdAt }` |

Les infos d'équipe/joueur sont **dénormalisées** dans chaque pinte : aucune
jointure, tout est temps réel via `onSnapshot`. Les statistiques et classements
sont calculés côté client à partir de ces collections.

Le champ `photoUrl` contient l'image en **base64** (data URL). Elle est compressée
côté navigateur pour rester sous ~700 Ko (limite Firestore : 1 Mo par document).

## Validation des photos (IA Gemini)

La règle : 🍺 une pinte dans un **vrai verre en verre**, 📏 **~50 cl**, 💧 **liquide
visible**. Au moment de poster, la photo part vers le **Cloudflare Worker** qui
interroge l'IA de vision **Gemini** ; elle **refuse** galopins/demis, chopes
opaques, canettes, bouteilles, gobelets plastique et verres vides. Une photo
validée est postée en `status: verified` ; une photo refusée n'est pas postée
(le joueur en reprend une). Sans `VERIFY_URL`, les pintes passent en
`status: pending` (validables à la main dans Firestore).

## Compétition mensuelle

Les classements et compteurs ne comptent que les pintes du **mois en cours**
(`createdAt`). Un **décompte** affiche le temps restant avant le 1er du mois
suivant, où tout repart à zéro. Les pintes des mois passés restent visibles dans
les profils mais ne comptent plus dans la compétition en cours.

## Personnalisation

- **Couleurs / ambiance** : variables CSS dans `assets/style.css` (`:root`).
- **Volume de la pinte** : `PINTE_CL` dans `assets/config.js`.
- **Réactions disponibles** : constante `REACTIONS` dans `assets/app.js`.
- **Modèle IA** : variable `GEMINI_MODEL` du Worker Cloudflare (défaut `gemini-2.0-flash`).
