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

Les sujets demandés sont traités en détail : **assurance-vie de droit luxembourgeois**
(triangle de sécurité, FID/FAS, neutralité fiscale), **produits structurés sur-mesure**,
ainsi que les autres classes de placements. Un appel au contact figure sur chaque page.

**Adresse :** 58 rue de Monceau, 75008 Paris — **Email :** contact@lfdr.fr

## Cédance — site indépendant (pré-valorisation CGP)

**Cédance** (domaine cible `cedance.fr`) est un **site indépendant**, sans aucun
lien ni mention de La Financière de Rochechouart, dédié à la **valorisation et au
rapprochement de cabinets de CGP**. Il vit dans le dossier [`cession/`](cession/),
possède sa propre identité (logo `assets/img/cedance-mark.svg`, e-mail
`contact@cedance.fr`, mentions légales propres) et réutilise uniquement le moteur
graphique partagé (`assets/css/styles.css`, animations) — neutre et non marqué LFDR.

| Page | Rôle |
|---|---|
| `cession/index.html` | Accueil + **outil de pré-valorisation** en 5 blocs (Identité → Encours → Allocation → Clientèle → Économie). L’estimation est calculée dans le navigateur selon les **3 méthodes de marché** (multiple du CA récurrent, % des encours, multiple d’EBE retraité), affichée immédiatement et transmise par e-mail. |
| `cession/vendre.html` | 3 sous-onglets : **Pourquoi vendre · La fiscalité** (apport-cession, art. 150-0 B ter) **· Transactions récentes** (exemples anonymisés). |
| `cession/acheter.html` | 3 sous-onglets : **Acquérir un cabinet · Points d’attention & synergies · Financement**. |
| `cession/contact.html` | Formulaire de contact (mailto, via `main.js`). |
| `cession/mentions-legales.html` | Mentions légales indépendantes (champs à compléter : éditeur, hébergeur). |

Des encarts « Nous contacter » sont répartis sur toutes les pages. Le contact est
un **e-mail dédié seul** (`contact@cedance.fr`), sans adresse postale.

### Publier sur un domaine propre (Hostinger)

Le dossier [`cession/`](cession/) est **totalement autonome** : il embarque ses
propres `cession/assets/` (CSS, JS, images, logo) et ne référence aucun fichier en
dehors de lui. Pour mettre en ligne, **téléversez le contenu du dossier `cession/`
à la racine** (`public_html`) du domaine `cedance.fr` — rien d’autre n’est requis,
aucun fichier LFDR n’est embarqué. Pensez à réserver le domaine et à compléter les
mentions légales (`mentions-legales.html`) avant la mise en ligne.

### Parcours de pré-valorisation

- **Bloc 1 — Identité** : le **SIREN** (9 chiffres) est obligatoire ; il est
  contrôlé (format + clé de Luhn) **et son existence est vérifiée** via l’API
  publique « Recherche d’entreprises » (annuaire-entreprises, DINUM). Un SIREN
  invalide ou introuvable bloque le passage à l’étape suivante. En cas
  d’indisponibilité réseau de l’API, le passage reste possible (*fail-open*).
- **Blocs 2 → 4** : encours, allocation, clientèle.
- **Bloc 5 — Économie & coordonnées** : chiffres économiques, puis **e-mail
  (nominatif) et téléphone du dirigeant**. Les adresses contenant « contact »
  sont refusées (on veut l’e-mail nominatif du dirigeant). La case de
  consentement renvoie aux **conditions particulières** (modale) qui actent la
  transmission / revente des informations aux partenaires de Cédance.

À la validation, **l’estimation s’affiche à l’écran** (fourchette + 3 méthodes) —
il n’y a **pas d’envoi d’e-mail automatique**. Les multiples du calcul sont
paramétrables en haut de `computeValuation()` dans `cession/assets/js/cession.js`.

> Les fichiers `cession/*.html` sont écrits à la main (et non générés par
> `build.py`). Les multiples utilisés pour le calcul sont paramétrables en haut de
> la fonction `computeValuation()` dans `assets/js/cession.js`.

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
