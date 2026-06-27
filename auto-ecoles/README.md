# Permis Boussole — l'annuaire des auto-écoles de France

Site **statique, autonome et sans dépendance** (HTML / CSS / JS) qui répertorie les
auto-écoles de France, classées par **département** et **ville**, et triées par
**taux de réussite décroissant** au permis B.

> Projet indépendant, sans aucun lien avec le reste du dépôt.

## Fonctionnalités

| Onglet | Contenu |
|---|---|
| **Recommandation** (accueil) | Saisissez une ville → l'auto-école recommandée selon le **Score Boussole** (taux de réussite **pondéré par le nombre de présentés** à l'examen pratique du permis B), avec le classement des autres écoles de la ville. |
| **Carte & Annuaire** | Carte de France interactive (choroplèthe par taux moyen, clic sur un département) + annuaire filtrable (département / ville / recherche) et **triable** par taux, présentés ou score. |
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

- **Annuaire** : données *représentatives* (565 auto-écoles, 132 communes, 96 départements)
  générées de façon déterministe par `build_data.py`, **calquées sur la structure** du jeu
  de données ouvert officiel de la Sécurité routière (DSR / Ministère de l'Intérieur) —
  [« Liste des auto-écoles et taux de réussite au permis de conduire »](https://www.data.gouv.fr/datasets/liste-des-auto-ecoles-et-taux-de-reussite-au-permis-de-conduire)
  sur data.gouv.fr. Champs : commune, département, dénomination, adresse, nombre de
  présentés au permis B, taux de réussite.
- **Fond de carte** : [france-geojson](https://github.com/gregoiredavid/france-geojson)
  (version simplifiée des départements), embarqué.

### Régénérer les données

```bash
cd auto-ecoles
python3 build_data.py     # régénère assets/js/data.js et departements.js
```

Pour brancher les **vraies** données officielles, il suffit de remplacer le contenu de
`window.AUTO_ECOLES` dans `assets/js/data.js` par les enregistrements du CSV data.gouv.fr
(mêmes champs), sans rien changer au reste du site.

## Structure

```
auto-ecoles/
├── index.html                 Page unique, 4 onglets
├── build_data.py              Générateur des données (carte + annuaire)
├── assets/css/style.css       Design system (bleu nuit + champagne/or)
└── assets/js/
    ├── departements.js        GeoJSON des départements (carte)
    ├── data.js                Annuaire des auto-écoles + départements
    └── app.js                 Logique : recommandation, carte, annuaire, tri
```

## Déploiement

100 % statique : déployable tel quel (GitHub Pages, Netlify, Vercel…). Pour GitHub Pages,
le site est servi depuis `/auto-ecoles/`.
