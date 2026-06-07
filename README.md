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

## Remplacer le logo et la photo d'accueil

Le logo et le hero sont des **illustrations SVG** intégrées (aucune dépendance externe,
le réseau de l'environnement de build étant restreint). Pour utiliser vos propres fichiers :

1. Déposez vos images dans `assets/img/` (ex. `logo.png`, `hero.jpg`).
2. En haut de `build.py`, ajustez :
   ```python
   LOGO_MARK = "assets/img/logo.png"   # marque à côté du nom + favicon
   HERO_IMG  = "assets/img/hero.jpg"   # photo plein écran de la page d'accueil
   ```
3. Relancez `python3 build.py`.

La mise en page du hero (recadrage `object-fit: cover`, panneau, voile) est prévue pour
une photo paysage haute résolution comme celle du Palais-Royal.

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
