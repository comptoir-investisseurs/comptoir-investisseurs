# Le Comptoir des Structurés

Site public dédié au marché des produits structurés : comparateur de structures, guide,
familles, glossaire, émetteurs et établissements de place.

**Parti pris éditorial : aucun indice décrément.** Toutes les structures référencées reposent
sur des indices publics (CAC 40, EURO STOXX 50, S&P 500, MSCI World…) ou sur des actions
cotées. Le coupon y est financé par les dividendes non réinvestis de l’indice, mécanisme
vérifiable par le souscripteur. Les indices décrément restent documentés — fiche famille
« Indice décrément » et entrée de glossaire — mais uniquement pour savoir les reconnaître et
les écarter.

Statique, sans dépendance externe, sans cookie ni script tiers. Palette **blanche et or**
rehaussée d’un bleu nuit (`#101C2B`), distincte de la charte vert sombre du site principal,
avec les mêmes polices auto-hébergées (Cormorant Garamond + Jost, réutilisées depuis
`../assets/fonts/`).

## Générer le site

```bash
python3 build-observatoire.py
```

Le script est à la racine du dépôt et écrit dans `observatoire/`. Il régénère les six pages
HTML **et** `observatoire/assets/data.js`. Les fichiers `observatoire/assets/obs.css` et
`observatoire/assets/obs.js` sont écrits à la main et ne sont jamais réécrits par le script :
modifiez-les directement.

Le script supprime aussi les pages d’une ancienne arborescence (`familles.html`,
`glossaire.html`, `emetteurs.html`, `etablissements.html`), désormais fusionnées en onglets —
voir la liste `OBSOLETES`.

## ⚠️ Domaine canonique — à vérifier avant mise en ligne

`BASE_URL` et `BASE_PATH`, en tête de `build-observatoire.py`, pilotent les balises
`canonical`, l'Open Graph, le sitemap et les données structurées. La valeur actuelle
(`https://www.lafinancierederochechouart.com` + `/observatoire`) est **déduite de
`contact.php`**, pas confirmée. Si le domaine réel diffère, ou si le site répond sans
`www`, corrigez ces deux lignes et relancez le script. Un canonical erroné nuit davantage
que son absence.

## ⚠️ Fraîcheur des données financières

Deux constantes distinctes, à ne pas confondre :

- `MAJ_ISO` — date de la dernière revue éditoriale, affichée sur chaque guide ;
- `MARCHE_REF` — période de marché des niveaux de coupon des gabarits ;
- `ANNEE_RATINGS` — date de relevé des notations de crédit.

Les coupons (`novembre 2025`) et les notations (`octobre 2025`) **datent d'un an**. Ils
restent cohérents entre eux et sont explicitement datés sur le site, mais doivent être
recalés avant toute exploitation commerciale : les coupons suivent les taux et la
volatilité, les notations sont révisées sans préavis.

## Les quatre onglets

| Fichier | Onglet | Contenu |
|---|---|---|
| `index.html` | Accueil | Chiffres clés, parti pris, lecture d’une fiche en trois temps, aperçu du comparateur |
| `produits.html` | Le comparateur | Tableau filtrable et triable + zone de dépôt « faire analyser un produit » |
| `comprendre.html` | Comprendre | **3 volets** : le guide (10 chapitres), les 12 familles, le glossaire (73 définitions) |
| `acteurs.html` | Les acteurs | Bloc éditeur (LFDR) en tête, puis **2 volets** : 22 émetteurs, 39 établissements |
| `methodologie.html` | *(pied de page)* | Grille d’analyse en 6 critères et limites assumées |
| `mentions-legales.html` | *(pied de page)* | Éditeur, nature des informations, avertissement sur les risques |

Les volets sont des onglets ARIA (`role="tablist"` / `role="tabpanel"`) pilotés par
`obs.js`. **Les ancres profondes ouvrent le bon volet** : `comprendre.html#worst-of` ouvre le
glossaire sur le terme, `comprendre.html#indice-decrement` ouvre les familles sur la fiche,
`acteurs.html#etablissements` ouvre le second volet. Un lien interne pointant vers un volet
masqué le révèle avant de défiler.

## Où se trouvent les données

Tout est centralisé dans `build-observatoire.py`, en haut du fichier :

- `FAMILLES` — les 12 familles ; celle portant `exclu=True` (indice décrément) s’affiche en
  rouge, sans lien vers le comparateur puisqu’aucune structure n’en relève ;
- `EMETTEURS` — les émetteurs et leurs notations ;
- `CAT_ETAB` / `ETABLISSEMENTS` — l’annuaire des établissements ;
- `PRODUITS` — le catalogue du comparateur (via la fonction `P(...)`) ;
- `GLOSSAIRE` — les définitions (via la fonction `G(...)`).

Les constantes d’en-tête (`SITE`, `SITE_SHORT`, `MARK`, `EDITEUR`, `EMAIL`, `MAJ`,
`ANNEE_RATINGS`) pilotent les mentions répétées sur toutes les pages. **`MAJ` et
`ANNEE_RATINGS` sont à actualiser à chaque revue éditoriale.**

## Formulaire « Structurer sur mesure »

Section `#structurer`, présente sur l'accueil et le comparateur, et cible du bouton
d'en-tête. Neuf champs seulement : identité, coordonnées, montant, horizon, objectif,
enveloppe et précisions libres. Pot de miel `_honey` hors écran contre les robots.

L'envoi passe par **FormSubmit** (`https://formsubmit.co/<email>`), service tiers qui
relaie le message sans code serveur — ce qui convient à un hébergement statique.

### ⚠️ Activation obligatoire, sinon erreur

FormSubmit refuse les envois tant que l'adresse destinataire n'a pas été confirmée.
**C'est la cause de l'erreur observée.** Procédure, une seule fois :

1. Mettez le site en ligne (le `_next` doit pointer vers une URL réelle).
2. Envoyez une première fois le formulaire depuis le site publié.
3. FormSubmit envoie un email de confirmation à `contact@lfd-rochechouart.com`.
   Cliquez le lien qu'il contient.
4. Les envois suivants arrivent normalement.

Tant que l'étape 3 n'est pas faite, le visiteur tombe sur une page d'erreur FormSubmit.

### Après activation : masquer l'adresse

L'email du cabinet figure en clair dans le `action` du formulaire, donc exposé aux
robots collecteurs. Une fois l'activation faite, FormSubmit fournit un **endpoint
haché** (`https://formsubmit.co/<chaîne>`). Remplacez la constante `FORMSUBMIT` en tête
de `build-observatoire.py` par cette URL et relancez le script.

### Ancienne zone de dépôt de fichiers

Section `#analyse`, présente sur l’accueil et sur le comparateur, et cible du bouton
d’en-tête. Glisser-déposer ou sélection de fichiers, PDF / PNG / JPEG, 10 Mo et 3 fichiers au
maximum, avec motif de rejet explicite pour chaque fichier écarté.

**Les fichiers ne sont jamais téléversés.** Le site est statique et `contact.php` n’accepte
que du JSON (32 Ko). Le formulaire procède donc en deux temps :

1. une requête `POST` JSON vers `../contact.php` (schéma `prenom`, `nom`, `email`,
   `telephone`, `objet`, `message`), qui notifie le cabinet et inclut le nom et la taille des
   documents ;
2. l’ouverture d’un brouillon d’email pré-rempli, auquel l’utilisateur joint lui-même les
   pièces — un lien `mailto:` ne pouvant pas attacher de fichier.

Le texte sous le formulaire l’explique à l’utilisateur, et les mentions légales en traitent
dans une rubrique dédiée. Si `contact.php` est absent (hébergement GitHub Pages, par
exemple), la requête échoue silencieusement et le brouillon s’ouvre quand même : la demande
n’est jamais perdue. Un pot de miel (`#dz-company`) bloque les robots.

**Pour téléverser réellement les fichiers**, il faut un point d’entrée serveur acceptant le
`multipart/form-data` : remplacer le `fetch` JSON de `obs.js` par un envoi de `FormData`, et
ajouter côté serveur la validation du type réel, une limite de taille, un stockage hors
racine web et une purge. À faire valider par la conformité, un DIC pouvant contenir des
données personnelles.

## Logos des émetteurs

Chaque fiche émetteur comporte un emplacement logo. **Aucun logo n'est livré** : ce sont
des marques déposées dont la reproduction relève d'une décision de l'éditeur. En
l'absence de fichier, une plaque typographique affiche le nom dans le serif du site, ce
qui conserve la mise en page.

Pour les intégrer, déposez un fichier par émetteur dans `observatoire/assets/logos/`,
nommé d'après son identifiant (`bnp-paribas.svg`, `societe-generale.svg`…), puis
relancez le script : il détecte les fichiers et remplace les plaques. La liste exacte des
identifiants attendus s'affiche à chaque génération. Voir
`observatoire/assets/logos/LISEZ-MOI.txt` pour les recommandations et la question des
droits.

## Intégrer de vraies fiches produits

`observatoire/data/produits-reels.csv` est lu à chaque génération. Vide (en-tête seul)
par défaut : le comparateur n'affiche alors que les gabarits pédagogiques.

Chaque ligne ajoutée devient une fiche complète — ISIN, documents réglementaires, dates
de commercialisation, nominal minimum — placée **en tête du comparateur** et marquée
« Offre réelle ». Le volume n'est pas limité. Les colonnes obligatoires sont `nom`,
`famille`, `emetteur` et `maturite` ; une ligne incomplète est ignorée avec un
avertissement. Format détaillé dans `observatoire/data/LISEZ-MOI.txt`.

L'ordre d'affichage par défaut (offres réelles d'abord, puis note décroissante) est
défini par `tri_initial()` côté générateur **et reproduit à l'identique dans `obs.js`** :
toute divergence provoquerait un saut visuel à l'hydratation.

## ⚠️ Nature du catalogue de produits

Les entrées de `PRODUITS` sont des **gabarits de structures**, pas des souches réelles en
commercialisation. Elles décrivent des combinaisons famille / sous-jacent / barrières /
maturité représentatives du marché, avec des niveaux de coupon cohérents avec les conditions
de la période indiquée par `MAJ` (5,0 % à 16,2 %). **Aucun code ISIN n’est publié**, et le
site l’annonce explicitement sur l’accueil, dans le comparateur et dans les mentions légales.

Pour publier des offres réellement ouvertes à la souscription :

1. remplacer les entrées de `PRODUITS` par les termsheets du moment ;
2. ajouter un champ `isin` et l’afficher dans `rowHTML` / `detailHTML` (`obs.js`) ;
3. ajouter une date de fin de commercialisation et faire basculer `statut` ;
4. retirer ou réécrire les encarts d’avertissement correspondants ;
5. faire valider la page par la conformité — la commercialisation de produits structurés
   auprès de clientèle non professionnelle est encadrée par la doctrine de l’AMF.

## ⚠️ Notations de crédit

Les notations portées par `EMETTEURS` (champs `sp`, `moodys`, `fitch`) sont **indicatives** et
datées par la constante `ANNEE_RATINGS`. Elles sont révisées sans préavis par les agences.
**Elles doivent être revérifiées auprès des trois agences avant toute mise en ligne
commerciale**, et à chaque revue éditoriale ensuite.

## ⚠️ Disponibilité du nom

« Le Comptoir des Structurés » a été retenu après une recherche web qui n’a fait apparaître
aucun site ni service portant ce nom. Cette vérification ne vaut pas recherche d’antériorité :
**avant tout usage commercial, faire une recherche de marque à l’INPI et vérifier la
disponibilité des noms de domaine.**

## Pré-filtrage du comparateur par l’URL

`produits.html` accepte des paramètres qui pré-positionnent les filtres :

```
produits.html?famille=Autocall+Phoenix
produits.html?emetteur=BNP+Paribas
produits.html?sous-jacent=Indice+actions
produits.html?enveloppe=PER
```

Alias courts acceptés : `fam`, `emet`, `sj`, `env`, `dev`.

## SEO

- **Titres et métadonnées** : uniques sur les 22 pages, titles de 45 à 64 caractères,
  descriptions de 112 à 163. Un seul `<h1>` par page.
- **Guides** : 14 pages autonomes sous `guides/<slug>/index.html`, plus un index. Chacune
  a son `À retenir`, son sommaire, ses exemples chiffrés, sa date de mise à jour, ses
  liens vers le comparateur et le service d'analyse, et ses guides connexes.
- **Comparateur pré-rendu** : les 24 lignes et leurs détails sont désormais écrits dans le
  HTML par `rows_prerendered()` / `cards_prerendered()`, en balisage identique à celui que
  produit `obs.js`. Sans JavaScript, un robot lit 6 800 mots au lieu d'un `<tbody>` vide ;
  avec JavaScript, `render()` réécrit un contenu identique, sans décalage visuel.
- **Données structurées** : `Organization` et `WebSite` sur toutes les pages,
  `BreadcrumbList` sur les pages profondes, `Article` sur les guides, la méthodologie et
  le guide pilier, `FAQPage` là où une FAQ existe. Aucun `author` nommé, aucune note ni
  avis : seules des informations réellement visibles sur la page.
- **Fichiers générés** : `sitemap.xml` (21 URL), `robots.txt`, `.htaccess` (redirections
  301 des anciennes URL, compression, cache, `ErrorDocument`), `404.html` en `noindex`.
- **Performance** : polices préchargées, scripts en fin de `body`, cache long sur les
  woff2. `produits.html` pèse 163 Ko non compressé du fait du pré-rendu — environ 25 Ko
  une fois gzippé par Apache (`mod_deflate` activé dans le `.htaccess`).

### À faire manuellement

1. **robots.txt racine** : ajouter `Sitemap: https://VOTRE-DOMAINE/observatoire/sitemap.xml`
   dans `public_html/robots.txt`. Le `robots.txt` d'un sous-dossier n'est pas lu.
2. **Google Search Console** : soumettre le sitemap, demander l'indexation de
   `/observatoire/` et `/observatoire/guides/`.
3. Vérifier que `.htaccess` a bien été extrait (les gestionnaires de fichiers masquent les
   fichiers commençant par un point).

## Points techniques

- **En-tête de tableau collant** : `overflow-x:auto` sur `.tablewrap` crée un conteneur de
  défilement qui neutralise `position:sticky`. Au-delà de 1100 px, le tableau tient dans la
  largeur disponible : le débordement repasse à `visible` et l’en-tête colle sous le header.
- **Sous 760 px**, le tableau cède la place à une liste de cartes (`.plist`), alimentée par le
  même jeu de données.
- **Recherche insensible aux accents** : `norm()` dans `obs.js` applique `NFD` et retire les
  diacritiques, si bien que « decrement » trouve « décrément ».
- **Deux annuaires sur une même page** : les émetteurs utilisent les attributs `data-dir` /
  `data-cat`, les établissements `data-dir2` / `data-cat2`, pour que les deux filtres
  coexistent sans collision d’identifiants.
- **Accessibilité** : onglets au motif ARIA avec navigation par flèches, lignes du tableau
  activables au clavier, zone de dépôt focusable et déclenchable à Entrée ou Espace,
  compteurs en `aria-live`, champs en erreur marqués `aria-invalid`.

## Rattachement au site principal

Le site est autonome et n’est pour l’instant référencé par aucun lien depuis les pages de
`La Financière de Rochechouart`. Pour l’y rattacher, ajoutez une entrée vers
`observatoire/index.html` dans la navigation ou depuis `produits-structures.html`, puis
relancez `python3 build.py`.
