# Permis Boussole — l'annuaire des auto-écoles de France

Site **statique, autonome et sans dépendance** (HTML / CSS / JS) qui répertorie les
auto-écoles de France, classées par **département** et **ville**, et triées par
**taux de réussite décroissant** au permis B.

> Projet indépendant, sans aucun lien avec le reste du dépôt.

## Fonctionnalités

| Onglet | Contenu |
|---|---|
| **Recommandation** (accueil) | Saisissez une ville → l'auto-école recommandée selon le **Score Boussole** (taux de réussite **pondéré par le nombre de présentés** à l'examen pratique du permis B), avec le classement des autres écoles de la ville. |
| **Carte & Annuaire** | Carte de France interactive (choroplèthe par taux moyen). Un clic sur un département **zoome dessus** et affiche toutes ses communes équipées (marqueurs). Annuaire filtrable (département / ville / recherche) et **triable** par taux, présentés ou score. |
| **Conseils** | Conseils pratiques : choisir son auto-école, réussir le Code, progresser à la conduite, aborder le jour J dans de bonnes conditions, et le parcours pas à pas. |
| **Nous contacter** | Formulaire de contact (ouverture de la messagerie) et coordonnées. |

## Le Score Boussole

Une auto-école à 100 % de réussite sur 4 candidats n'est pas fiable. Le score combine
le taux de réussite **et** le volume de candidats via une **moyenne bayésienne pondérée** :

```
score = (présentés × taux + K × moyenne_du_département) / (présentés + K)     (K = 35)
```

Les petits volumes sont ramenés vers la moyenne du département ; les gros volumes
confirment leur taux. C'est ce score qui sert à recommander et à départager.

## Lancer en local

```bash
cd auto-ecoles
python3 -m http.server 8000   # puis http://localhost:8000
```

## Données

Ce qui est **réel** :

- **Communes** — *toutes* les communes de France métropolitaine (36 584), avec nom,
  département, **coordonnées GPS** et population. Source :
  [ggouv/Villes-de-France](https://github.com/ggouv/Villes-de-France) (`data/villes_data.sql`).
- **Départements / carte** — contours réels des 96 départements (Corse 2A/2B incluse).
  Source : [france-geojson](https://github.com/gregoiredavid/france-geojson)
  (`data/departements.geojson`).

Ce qui est **estimé** (en attendant le fichier officiel) :

- **Taux de réussite & nombre de présentés** par auto-école. Le jeu officiel de la
  Sécurité routière (DSR / Ministère de l'Intérieur) —
  [« Liste des auto-écoles et taux de réussite au permis de conduire »](https://www.data.gouv.fr/datasets/liste-des-auto-ecoles-et-taux-de-reussite-au-permis-de-conduire)
  — n'est pas redistribué ici. À défaut, `build_data.py` génère un annuaire
  *représentatif* (≈ 7 500 auto-écoles) **ancré sur les vraies communes** (noms,
  coordonnées, population réels). Un bandeau le signale clairement dans le site.

### Brancher les vraies auto-écoles (fichier officiel)

Déposez le CSV officiel dans `data/auto-ecoles_officiel.csv` avec les colonnes :

```
nom,ville,dep,adresse,presentes,taux,lat,lon
```

puis régénérez. `build_data.py` l'utilise alors **tel quel** (100 % de vraies données)
au lieu de l'annuaire estimé — rien d'autre ne change.

### Régénérer les données

```bash
cd auto-ecoles
python3 build_data.py     # régénère departements.js, communes.js et data.js
```

## Structure

```
auto-ecoles/
├── index.html                 Page unique, 4 onglets
├── build_data.py              Générateur des données (carte + communes + annuaire)
├── data/
│   ├── villes_data.sql        Toutes les communes réelles (source)
│   ├── departements.geojson   Contours des départements (source)
│   └── auto-ecoles_officiel.csv  (optionnel) fichier officiel à déposer
├── assets/css/style.css       Design system (bleu nuit + champagne/or)
└── assets/js/
    ├── departements.js        Contours + liste des départements
    ├── communes.js            Toutes les communes (compact : ville,dep,lat,lon,pop)
    ├── data.js                Annuaire des auto-écoles (compact)
    └── app.js                 Logique : recommandation, carte+zoom, annuaire, tri
```

## Déploiement

100 % statique : déployable tel quel (GitHub Pages, Netlify, Vercel…). Pour GitHub Pages,
le site est servi depuis `/auto-ecoles/`.
