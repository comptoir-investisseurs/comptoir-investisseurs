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
  liste de ses pintes — en cliquant sur son avatar.
- 🏆 **Compétition par équipe** : rejoins une équipe existante ou crée la tienne.
- 🤝 **Règles de la pinte** : une pinte dans un verre en verre, 50 cl, liquide
  visible (validation à l'honneur ; les orgas peuvent invalider une photo).

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

### 6. Lancer
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
| `pints` | `{ playerId, prenom, nom, teamId, teamName, teamColor, photoUrl, lieu, volumeCl, status, createdAt }` |

Les infos d'équipe/joueur sont **dénormalisées** dans chaque pinte : aucune
jointure, tout est temps réel via `onSnapshot`. Les statistiques et classements
sont calculés côté client à partir de ces collections.

Le champ `photoUrl` contient l'image en **base64** (data URL). Elle est compressée
côté navigateur pour rester sous ~700 Ko (limite Firestore : 1 Mo par document).

## Validation des photos

La règle : 🍺 une pinte dans un **vrai verre en verre**, 📏 **50 cl**, 💧 **liquide
visible**. La validation est **à l'honneur** entre joueurs. Une pinte compte dès
qu'elle est postée (`status: verified`). Pour invalider une photo hors règles,
passez son champ `status` à `rejected` dans la console Firestore (elle disparaît
alors du fil et des compteurs).

> 💡 *Envie d'une vérification 100 % automatique par IA ?* Elle nécessite une clé
> secrète côté serveur (donc une Cloud Function Firebase, plan **Blaze**). Ce
> n'est pas activé ici pour rester sans facturation.

## Personnalisation

- **Couleurs / ambiance** : variables CSS dans `assets/style.css` (`:root`).
- **Volume de la pinte** : `PINTE_CL` dans `assets/config.js`.
