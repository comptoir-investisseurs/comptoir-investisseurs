# La Financière de Rochechouart — Site vitrine

Site institutionnel d'un cabinet de **gestion privée et de placement de trésorerie**.
Statique (HTML/CSS/JS, sans dépendance), confidentiel et haut de gamme, dans une palette
**vert `#001B00`** rehaussée de tons or/automne. Atmosphère sobre et rassurante, avec des
animations modernes (révélations au défilement, transitions de page, effets de boutons).

## Aperçu

- **Accueil** — `index.html` : hero plein écran (palais classique parisien aux teintes
  d'automne), panneau vitré sur fond vert, lignes guides dorées, et présentation sobre.
- **Vos besoins** — `vos-besoins.html` + 5 sous-pages :
  Épargner & Investir · Optimiser votre fiscalité · Céder ou transmettre votre entreprise ·
  Préparer votre retraite · S'expatrier à l'étranger.
- **Nos solutions** — `nos-solutions.html` + 6 sous-pages :
  Placements financiers · Trésorerie d'entreprise · Solutions non cotées & Private Equity ·
  Placements immobiliers · Structuration juridique et fiscale · Accès à notre Family Office.
- **Nous contacter** — `contact.html` : formulaire fonctionnel (mailto), coordonnées et plan.
- `mentions-legales.html`.
- **Bilan patrimonial (outil conseiller)** — `bilan-patrimonial.html` : entretien de découverte
  guidé (une question par écran, scripts conseiller, listes de biens / crédits / placements),
  calculs automatiques (impôt & TMI, mensualités et capital restant dû, endettement brut et
  différentiel, rentabilités, capacité d'épargne, capital retraite) et **synthèse type
  présentation** imprimable en PDF (charte LFDR) avec graphiques, verbatims et fiche
  « points d'attention » pour l'équipe commerciale (constats chiffrés, sans préconisation de
  produit). Données conservées dans le navigateur, export / import `.json`, bouton « Copier
  la fiche sales ». Fichiers : `assets/js/bilan.js` (questions, calculs, rendu) et
  `assets/css/bilan.css`. Le barème de l'impôt et les hypothèses sont dans l'objet `PARAMS`
  en tête de `bilan.js` (à actualiser chaque année).
  **Lien CRM** : le bouton « Enregistrer au CRM » crée ou met à jour la fiche prospect dans
  Supabase (table `clients`, étape « R1 : Bilan ») et archive le bilan complet dans la table
  `bilans` (script `supabase-bilans.sql` à exécuter une fois). Depuis le CRM (`admin.html`),
  la fiche contact a un onglet « Bilans » pour rouvrir un bilan (`?bilan=<id>`) ou en démarrer
  un nouveau pré-rempli (`?client=<id>`). Pipeline : Nouveau → R1 : Bilan → R2 : Objectifs →
  R3 : Offre → Prospect chaud → Gagné (la fiche bascule en client) ou Perdu.
  **Outil réservé au réseau interne** : `bilan-patrimonial.html` et ses fichiers propres
  (`assets/js/bilan.js`, `assets/js/drive.js`, `assets/js/drive-config.js`,
  `assets/css/bilan.css`, `assets/css/fonts.css`, `assets/fonts/`, `assets/vendor/`,
  `supabase-bilans.sql`) sont explicitement exclus du déploiement GitHub Pages
  (`.github/workflows/pages.yml`) : ils ne sont jamais publiés sur le site public, même si
  cette branche est fusionnée. Ouvrez le fichier en local (double-clic, ou
  `python3 -m http.server` puis `http://localhost:8000/bilan-patrimonial.html`) ou servez-le
  uniquement sur votre réseau interne.
  **Enregistrement dans Google Drive** : le bouton « Enregistrer dans le Drive » (en haut de
  l'entretien et sur la synthèse) crée un dossier `<Nom> <Prénom>` dans un dossier Drive que
  vous choisissez, avec deux sous-dossiers : « Pièces justificatives » (vide, à remplir plus
  tard par le client) et « Bilan patrimonial », qui reçoit un extrait Excel de toutes les
  informations saisies et un PDF de la synthèse générée. Un dossier client déjà existant est
  réutilisé (pas de doublon) si vous ré-enregistrez le même nom. Configuration à faire une
  seule fois, dans `assets/js/drive-config.js` :
  1. Dans [Google Cloud Console](https://console.cloud.google.com/), créez un projet (ou
     réutilisez celui de votre Workspace), puis **APIs & Services → Bibliothèque** : activez
     « Google Drive API ».
  2. **APIs & Services → Écran de consentement OAuth** : type d'utilisateur **Interne** (si
     vous avez un Google Workspace) — évite toute procédure de vérification Google, l'outil
     n'étant utilisé que par vos conseillers.
  3. **APIs & Services → Identifiants → Créer des identifiants → ID client OAuth**, type
     « Application Web ». Dans « Origines JavaScript autorisées », ajoutez l'URL exacte
     depuis laquelle vous ouvrirez l'outil (ex. `http://localhost:8000` si vous le lancez
     avec `python3 -m http.server`, ou l'adresse de votre serveur interne — pas de `file://`,
     Google OAuth exige une origine http(s)). Copiez l'ID client obtenu
     (`....apps.googleusercontent.com`) dans `GOOGLE_CLIENT_ID`.
  4. Dans Google Drive, créez (ou choisissez) le dossier racine qui contiendra tous les
     dossiers clients, ouvrez-le et copiez l'identifiant présent dans l'URL
     (`drive.google.com/drive/folders/<CET_IDENTIFIANT>`) dans `DRIVE_PARENT_FOLDER_ID`.
  5. Au premier clic sur « Enregistrer dans le Drive », une fenêtre Google demande
     l'autorisation d'accéder à votre Drive (droits complets, nécessaires pour écrire dans un
     dossier existant que l'outil n'a pas créé lui-même) ; elle n'apparaît qu'une fois par
     session de navigateur.
  Sans cette configuration, le bouton affiche un message et n'envoie rien.

Les sujets demandés sont traités en détail : **assurance-vie de droit luxembourgeois**
(triangle de sécurité, FID/FAS, neutralité fiscale), **produits structurés sur-mesure**,
ainsi que les autres classes de placements. Un appel au contact figure sur chaque page.

**Adresse :** 58 rue de Monceau, 75008 Paris — **Email :** contact@lfdr.fr

## Lancer en local

Ouvrez simplement `index.html` dans un navigateur, ou servez le dossier :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Modifier le contenu

Les pages HTML sont **générées** par `build.py` à partir d'un gabarit unique
(en-tête, navigation, pied de page et bandeau de contact partagés). Pour modifier un
texte, la navigation ou ajouter une page, éditez `build.py` puis régénérez :

```bash
python3 build.py
```

> Vous pouvez aussi éditer directement les fichiers `.html` ; pensez alors à reporter
> les changements communs (menu, pied de page) sur chaque page.

## Images

Le site mêle des **photographies** (identité réelle de la maison) et quelques
**graphiques SVG** conceptuels (qui sont des schémas, pas de fausses photos).

Photographies (`assets/img/`) :

| Fichier | Utilisation |
|---|---|
| `logo.png` / `logo-light.png` | Logo — version foncée (en-tête clair) / version crème (sur photo & pied de page), générée automatiquement |
| `hero.jpg` | Photo plein écran de la page d'accueil (Palais-Royal) |
| `paris-courtyard.jpg` | Accueil, immobilier, Family Office |
| `paris-colonnade.jpg` | Cession / transmission, Private Equity |
| `mansion.jpg` | Optimisation fiscale, structuration |
| `retraite.jpg` | Préparer votre retraite |
| `serenite.jpg` | S'expatrier à l'étranger |

Graphiques conservés : `img-markets.svg` (marchés), `img-luxembourg.svg`
(triangle de sécurité), `img-texture.svg` (texture de fond), `monogram.svg` (favicon).

Pour remplacer une image, déposez le fichier dans `assets/img/` (même nom) puis
relancez `python3 build.py`. Le logo et le hero sont aussi paramétrables via les
constantes `BRAND_LOGO`, `BRAND_LOGO_LIGHT` et `HERO_IMG` en haut de `build.py`.
Pensez à optimiser les photos pour le web (largeur ~1100–1920 px, JPEG qualité ~80).

## Personnaliser le design

Tout est centralisé dans `assets/css/styles.css` via des variables CSS (`:root`) :
couleurs (`--green`, `--gold`, `--cream`…), typographies, rythme. Les polices
(Cormorant Garamond + Jost) sont chargées depuis Google Fonts, avec repli système.

## Déploiement

Site 100 % statique : déployable tel quel sur GitHub Pages, Netlify, Vercel, ou tout
hébergeur classique. Pour GitHub Pages, servez la racine du dépôt.

## Structure

```
index.html, vos-besoins.html, …      Pages générées
assets/css/styles.css                Design system
assets/js/main.js                    Interactions (menu, reveals, transitions, formulaire)
assets/img/*.svg                     Logo, hero et visuels (remplaçables)
build.py                             Générateur du site
```
