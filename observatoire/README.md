# L’Observatoire des Produits Structurés

Site public dédié au marché des produits structurés : comparateur de structures, fiches
familles, fiches émetteurs, annuaire des établissements de place et glossaire.

Statique, sans dépendance externe, sans cookie ni script tiers. Palette **blanche et or**
rehaussée d’un bleu nuit (`#101C2B`), distincte de la charte vert sombre du site principal,
avec les mêmes polices auto-hébergées (Cormorant Garamond + Jost, réutilisées depuis
`../assets/fonts/`).

## Générer le site

```bash
python3 build-observatoire.py
```

Le script est à la racine du dépôt et écrit dans `observatoire/`. Il régénère les neuf pages
HTML **et** `observatoire/assets/data.js`. Les fichiers `observatoire/assets/obs.css` et
`observatoire/assets/obs.js` sont écrits à la main et ne sont jamais réécrits par le script :
modifiez-les directement.

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : chiffres clés, lecture d’une fiche produit en trois temps, aperçu du comparateur |
| `produits.html` | Comparateur filtrable et triable, détail dépliable par structure |
| `familles.html` | Les 12 familles de produits, mécanisme, apports et coûts |
| `emetteurs.html` | 22 émetteurs : notations, profil de gamme, points de vigilance |
| `etablissements.html` | 39 établissements : structureurs, plateformes, assureurs, distributeurs |
| `comprendre.html` | Guide en 9 chapitres, avec schéma de payoff |
| `glossaire.html` | 73 définitions, recherche instantanée et navigation alphabétique |
| `methodologie.html` | Grille d’analyse en 6 critères et limites assumées |
| `mentions-legales.html` | Éditeur, nature des informations, avertissement sur les risques |

## Où se trouvent les données

Tout est centralisé dans `build-observatoire.py`, en haut du fichier :

- `FAMILLES` — les 12 familles de produits ;
- `EMETTEURS` — les émetteurs et leurs notations ;
- `CAT_ETAB` / `ETABLISSEMENTS` — l’annuaire des établissements ;
- `PRODUITS` — le catalogue du comparateur (via la fonction `P(...)`) ;
- `GLOSSAIRE` — les définitions (via la fonction `G(...)`).

Les constantes d’en-tête (`SITE`, `EDITEUR`, `EMAIL`, `MAJ`, `ANNEE_RATINGS`) pilotent les
mentions répétées sur toutes les pages. **`MAJ` et `ANNEE_RATINGS` sont à actualiser à chaque
revue éditoriale** : elles s’affichent en pied de page et dans les avertissements.

## ⚠️ Nature du catalogue de produits

Les entrées de `PRODUITS` sont des **gabarits de structures**, pas des souches réelles en
commercialisation. Elles décrivent des combinaisons famille / sous-jacent / barrières /
maturité représentatives du marché, avec des niveaux de coupon cohérents avec les conditions
de la période indiquée par `MAJ`. **Aucun code ISIN n’est publié**, et le site l’annonce
explicitement sur l’accueil, dans le comparateur et dans les mentions légales.

Pour publier des offres réellement ouvertes à la souscription, il faut :

1. remplacer les entrées de `PRODUITS` par les termsheets du moment ;
2. ajouter un champ `isin` et l’afficher dans `rowHTML` / `detailHTML` (`obs.js`) ;
3. ajouter une date de fin de commercialisation et faire basculer `statut` ;
4. retirer ou réécrire les trois encarts d’avertissement correspondants ;
5. faire valider la page par la conformité — la commercialisation de produits structurés
   auprès de clientèle non professionnelle est encadrée par la doctrine de l’AMF.

## ⚠️ Notations de crédit

Les notations portées par `EMETTEURS` (champs `sp`, `moodys`, `fitch`) sont **indicatives** et
datées par la constante `ANNEE_RATINGS`. Elles sont révisées sans préavis par les agences.
**Elles doivent être revérifiées auprès des trois agences avant toute mise en ligne
commerciale**, et à chaque revue éditoriale ensuite.

## Pré-filtrage du comparateur par l’URL

`produits.html` accepte des paramètres qui pré-positionnent les filtres :

```
produits.html?famille=Autocall+Phoenix
produits.html?emetteur=BNP+Paribas
produits.html?sous-jacent=Indice+d%C3%A9cr%C3%A9ment
produits.html?enveloppe=PER
```

Alias courts acceptés : `fam`, `emet`, `sj`, `env`, `dev`.

## Points techniques

- **En-tête de tableau collant** : `overflow-x:auto` sur `.tablewrap` crée un conteneur de
  défilement qui neutralise `position:sticky`. Au-delà de 1100 px, le tableau tient dans la
  largeur disponible : le débordement repasse à `visible` et l’en-tête colle sous le header.
  En dessous, le défilement horizontal reprend la main et l’en-tête ne colle pas.
- **Sous 760 px**, le tableau cède la place à une liste de cartes (`.plist`), alimentée par le
  même jeu de données.
- **Recherche insensible aux accents** : `norm()` dans `obs.js` applique `NFD` et retire les
  diacritiques, si bien que « decrement » trouve « décrément ».
- **Accessibilité** : lignes du tableau activables au clavier (`tabindex`, Entrée / Espace),
  compteurs en `aria-live`, navigation alphabétique en `<nav>`.

## Rattachement au site principal

Le site est autonome et n’est pour l’instant référencé par aucun lien depuis les pages de
`La Financière de Rochechouart`. Pour l’y rattacher, ajoutez une entrée vers
`observatoire/index.html` dans la navigation ou depuis `produits-structures.html`, puis
relancez `python3 build.py`.
