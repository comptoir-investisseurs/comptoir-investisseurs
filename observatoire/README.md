# La Française des Produits Structurés

Site public dédié au marché des produits structurés : comparateur de structures, guide,
familles, glossaire, émetteurs, établissements de place et analyses de marché.

**Parti pris éditorial : les indices décrément sont référencés, et signalés.** C'est la
position exposée sur la page Méthodologie : un décrément proche du dividende réel du panier,
et correctement rémunéré en coupon, reste un arbitrage défendable ; c'est son niveau rapporté
à cette contrepartie qui décide, pas le procédé. Chaque structure porte donc la nature de son
sous-jacent — indice public ou indice décrément — et un filtre dédié permet de n'afficher que
les indices publics.

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

## Domaine et emplacement

Le site est servi sous **`https://lesproduitsstructures.fr/observatoire/`** — un domaine qui
lui est propre, distinct de celui du site principal. Deux constantes en tête de
`build-observatoire.py` le disent, et elles pilotent les URL canoniques, le sitemap, les
données structurées et le robots.txt :

```python
BASE_URL  = "https://lesproduitsstructures.fr"
BASE_PATH = "/observatoire"
```

### Le passer à la racine du domaine

Le domaine étant dédié à ce site, le servir à la racine donnerait des adresses plus courtes et
mieux alignées sur les requêtes visées (`lesproduitsstructures.fr/produits.html` plutôt que
`.../observatoire/produits.html`). Il suffit de mettre `BASE_PATH = ""`, de régénérer et de
téléverser le contenu à la racine.

**À ne faire qu'en posant des redirections 301** depuis les anciennes adresses, sinon tout lien
déjà diffusé casse et le référencement acquis est perdu. Le `.htaccess` généré sait les porter.

### Le formulaire et PHP

Le sous-site vit sur son propre domaine : il ne peut pas appeler le `contact.php` du site
principal, qui est sur une autre origine. `build_contact_php()` en dépose donc une copie dans
`observatoire/contact.php`, adaptée au domaine du sous-site (expéditeur `no-reply@` sur
`lesproduitsstructures.fr`, pour que le SPF du domaine couvre l'envoi). Le destinataire reste
`contact@lfd-rochechouart.com`.

**Ce fichier doit être téléversé avec le reste du sous-site**, et le domaine doit exécuter PHP.
Sur un hébergement statique il est retiré par `render-build.sh`, qui vérifie son absence : servi
en clair, il exposerait sa configuration.


## ⚠️ Fraîcheur des données financières

Deux constantes distinctes, à ne pas confondre :

- `MAJ_ISO` — date de la dernière revue éditoriale, affichée sur chaque guide ;
- `MARCHE_REF` — période de marché des niveaux de coupon des gabarits ;
- `ANNEE_RATINGS` — date de relevé des notations de crédit.

Les coupons (`novembre 2025`) et les notations (`octobre 2025`) **datent d'un an**. Ils
restent cohérents entre eux et sont explicitement datés sur le site, mais doivent être
recalés avant toute exploitation commerciale : les coupons suivent les taux et la
volatilité, les notations sont révisées sans préavis.

## Les cinq onglets

| Fichier | Onglet | Contenu |
|---|---|---|
| `index.html` | Accueil | Chiffres clés, parti pris, lecture d’une fiche en trois temps, aperçu du comparateur |
| `produits.html` | Le comparateur | Tableau filtrable et triable + zone de dépôt « faire analyser un produit » |
| `comprendre.html` | Comprendre | **3 volets** : le guide (10 chapitres), les 12 familles, le glossaire (73 définitions) |
| `acteurs.html` | Les acteurs | Bloc éditeur (LFDR) en tête, puis **2 volets** : 22 émetteurs, 39 établissements |
| `analyses.html` | Analyses | Les articles rédigés depuis l’espace de rédaction (voir plus bas) |
| `analyses/<slug>/` | *(une page par analyse)* | L’article, avec son `Article` JSON-LD et son fil d’Ariane |
| `admin.html` | *(non lié, `noindex`)* | Espace de rédaction des analyses |
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

## Où partent les formulaires

Les deux formulaires du sous-site — « Structurer sur mesure » et l'accès aux sous-jacents —
envoient vers `contact@lfd-rochechouart.com` en essayant **deux destinations dans l'ordre** :

1. **`../contact.php`** — le script d'envoi du site principal, déjà en service pour son propre
   formulaire de contact. Même origine, pas de service tiers, pas d'étape d'activation,
   garde-fou anti-abus et pot de miel inclus. C'est la voie normale sur Hostinger ;
2. **FormSubmit** — utilisé seulement si le script PHP ne répond pas, par exemple sur un
   hébergement statique où le `.php` n'est pas exécuté.

L'envoi se fait en arrière-plan : la page ne bouge pas et la réponse s'affiche sous le
formulaire. **Un échec est donc visible**, avec sa raison, au lieu d'une redirection muette.

### Si rien n'arrive

Vérifier dans cet ordre :

- `contact.php` est-il bien présent **à la racine du domaine**, à côté de `index.html` ? Le
  sous-site l'appelle en `../contact.php`. Il est livré avec le site principal, pas avec
  l'archive du sous-site ;
- le formulaire de contact du site principal fonctionne-t-il ? S'il échoue aussi, le problème
  est dans `contact.php` ou chez l'hébergeur, pas dans le sous-site ;
- si le repli FormSubmit est utilisé, **le service exige une activation** : la première
  soumission envoie un courriel de confirmation à l'adresse destinataire, et tant que son lien
  n'est pas cliqué, tout envoi est refusé. Le message affiché sous le formulaire le dit.

Le courriel est volontairement sur un autre domaine que le site (`lfd-rochechouart.com` contre
`lafinancierederochechouart.com`) : c'est le choix déjà fait par le site principal, pas une
coquille.

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

## D'où viennent les structures du comparateur

Le catalogue mélange trois origines, distinguées dans le tableau :

| Origine | Nombre | Marqueur | Fichier |
|---|---|---|---|
| Souches réellement commercialisées | 0 | « Offre réelle » (vert) | `data/produits-reels.csv`, une ligne par ISIN |
| Offres anonymisées d'un extranet partenaire | 122 | aucun | `data/produits-reels.csv`, sans ISIN |
| Structures simulées importées | 1 109 | « Simulation » (gris) | `data/structures-simulees.csv` |
| Gabarits rédigés à la main | 24 | aucun | constantes `PRODUITS` du générateur |

Une ligne n'obtient le marqueur « Offre réelle » **que si elle porte un ISIN**. C'est le seul
critère : sans code valeur, une fiche n'est pas traçable, et reste un gabarit pédagogique
quelle que soit son origine.

### Importer un jeu de structures simulées

```bash
python3 tools/importer-structures.py <export.csv>
python3 build-observatoire.py
```

L'importateur attend l'export de l'outil de simulation (séparateur point-virgule, colonnes
`ID`, `Nom du produit`, `Type de produit`, `Émetteur (simulation)`, `Sous-jacent(s)`…). Il
écrit `observatoire/data/structures-simulees.csv` au format plat du comparateur, et marque
chaque ligne du tag `Simulation`. Aucun ISIN n'est fabriqué.

**La note sur cinq n'est pas inventée** : elle est calculée par la grille publiée sur la page
Méthodologie — nature du sous-jacent 25 %, signature 20 %, protection 20 %, lisibilité 15 %,
rendement/risque 15 %. Le sixième critère, la transparence des coûts (5 %), n'est pas
calculable faute de données de frais ; les cinq autres sont renormalisés. Le critère
rendement/risque compare chaque coupon à ceux des structures de même famille, même maturité
et même barrière de capital, exactement comme l'annonce la méthodologie.

La notation de l'émetteur n'a pas à figurer dans l'export : elle est reprise de la fiche
émetteur de l'onglet « Les acteurs », source unique.

### Volume et tenue de la page

À plus d'un millier de structures, écrire tout le tableau dans la page produisait un fichier
de onze mégaoctets. Deux mesures :

- `PRERENDU_MAX` (50) limite les lignes écrites dans `produits.html`. Sans JavaScript, le
  visiteur voit ces 50 premières, triées par note, et un encart lui dit combien compte le
  catalogue complet ;
- `obs.js` affiche la même tranche de 50, extensible par le bouton « Afficher … de plus », et
  **ne compose le détail d'une fiche qu'au premier dépliage**.

Les deux valeurs doivent rester égales (`PRERENDU_MAX` et `PAR_PAGE`), sinon l'hydratation
provoque un saut visuel.

## Sous-jacents réservés

Le comparateur affiche librement la famille, l'émetteur et sa notation, le coupon, les
barrières, la maturité, la devise, le mécanisme, les scénarios et les points de vigilance.
**Le nom précis du sous-jacent est, lui, conditionné à un formulaire court** (prénom, nom,
email, téléphone facultatif, consentement), placé juste au-dessus du tableau.

### Comment c'est construit

Le catalogue publié — `observatoire/assets/data.js` et le tableau pré-rendu dans
`produits.html` — **ne contient aucun nom de sous-jacent**. Chacun y est remplacé par une
sentinelle (`⟦SJ⟧`, `⟦SJD⟧`, `⟦SJN⟧`). Les vraies valeurs vivent seules dans
`observatoire/assets/sous-jacents.js`, qui n'est téléchargé qu'une fois le formulaire rempli.

Le masquage ne se limite pas au champ « sous-jacent » : il balaie aussi l'intitulé des
structures, le mécanisme, les scénarios et les points d'attention, à partir d'un vocabulaire
explicite de noms propres de marché (`VOCABULAIRE_SJ`, en tête du module). Un produit peut en
effet nommer dans son titre un indice qui est le sous-jacent d'un *autre* produit.

`controler_fuites()` vérifie après coup qu'aucun nom ne subsiste, sous ses formes brute et
échappée (`S&amp;P 500`). **Une fuite interrompt la génération**, et `render-build.sh` refait
le contrôle sur les fichiers publiés.

### ⚠️ Ce que cette protection vaut, et ce qu'elle ne vaut pas

Elle **oblige le visiteur ordinaire à passer par le formulaire**. C'est son objet : capter un
contact.

Elle **ne protège pas la donnée**. La levée du masque se joue dans le navigateur, et
`assets/sous-jacents.js` reste une adresse publique : qui la devine ou lit le code de la page
obtient les sous-jacents sans rien remplir. Pour une protection réelle, il faudrait servir ces
valeurs depuis un serveur après authentification — ce qu'un hébergement statique ne permet pas.

### Conséquence sur le référencement

Rien n'est servi différemment aux moteurs : le pré-rendu sans JavaScript porte le même
catalogue masqué que la page vue par un visiteur. C'est délibéré — servir aux robots un texte
que l'internaute ne voit pas est du *cloaking*, et c'est sanctionné.

Les noms d'indices disparaissent donc des pages du comparateur. **Ils restent présents dans
les 14 guides**, dont `guides/produit-structure-euro-stoxx-50/`, qui portent l'essentiel du
référencement sur ces requêtes. La perte est réelle mais circonscrite.

### Lever ou rétablir le masque

| | |
|---|---|
| Désactiver complètement | remplacer `produits_masques()` par `PRODUITS` dans `build_data_js()` et les deux pré-rendus |
| Ajouter un nom à masquer | une ligne dans `VOCABULAIRE_SJ` |
| Paramètre de retour du formulaire | `?acces=1` — surtout pas `?sj=`, déjà pris par le filtre de type |

## Espace de rédaction des analyses

`observatoire/admin.html` — **lié depuis aucune page**, `noindex, nofollow`. On y accède en
tapant l’adresse. La connexion utilise les comptes Supabase du CRM de La Financière de
Rochechouart : une session déjà ouverte dans le CRM vaut ici aussi (même jeton
`sb_access_token`).

### Mise en service, une seule fois

1. Ouvrir Supabase → **SQL Editor** → **New query** ;
2. y coller le contenu de `supabase-articles.sql` (à la racine du dépôt) et lancer **Run**.

Le fichier crée la table `lfps_articles` et ses règles d’accès : lecture publique des seules
analyses **publiées**, écriture réservée aux comptes authentifiés. Le relancer ne détruit
aucune analyse existante.

### Rédiger

Titre, adresse de la page, rubrique, chapô, corps, et deux champs de référencement. Le corps
accepte une mise en forme réduite : `## Titre`, `### Sous-titre`, `- liste`, `**gras**`,
`*italique*`, `[texte](adresse)`, `> citation`, `---`. Le bouton **Aperçu** affiche le rendu
exact de la page publiée.

**Les adresses collées telles quelles deviennent des liens** : `https://…`, `www.…` et les
adresses électroniques, ces dernières en `mailto:`. La syntaxe `[texte](adresse)` ne sert donc
qu'à poser un libellé à la place de l'adresse. Les liens externes reçoivent `target="_blank"`
et `rel="noopener"` ; les schémas actifs (`javascript:`, `data:`) et les adresses sans
protocole (`//site-tiers/…`) sont écartés.

La conversion ne s'applique qu'au texte visible, jamais à l'intérieur d'une balise : sans cette
précaution, l'adresse d'un `href` fraîchement écrit serait reconvertie en lien à l'intérieur
d'elle-même.

**Enregistrer** garde l’analyse en brouillon ; **Publier** la met en ligne.

### Les deux chemins d’une analyse publiée

| | Visible | Adresse | Indexable |
|---|---|---|---|
| Dès la publication | oui, en tête de `analyses.html` | `analyses/lire.html?slug=…` | non (`noindex`) |
| Après régénération du site | oui | `analyses/<slug>/` | oui, avec `Article` JSON-LD et entrée de sitemap |

Autrement dit : une analyse publiée est lisible **immédiatement**, sans rien régénérer ni
ré-téléverser. Elle prend son adresse définitive, celle que les moteurs indexent, au prochain
passage de :

```bash
python3 tools/articles-sync.py      # récupère les analyses publiées
python3 build-observatoire.py       # en fait des pages statiques
```

`tools/articles-sync.py` dépose les analyses dans `observatoire/data/articles.json`, que le
générateur lit. Ce fichier est versionné : si la synchronisation n’est pas rejouée, le site se
construit avec les analyses qu’il contient déjà.

### Ce qui n’est pas du ressort de cet espace

Dépublier ou supprimer une analyse la retire **de la liste immédiatement**, mais sa page
statique `analyses/<slug>/` reste en ligne jusqu’à la régénération suivante.

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

## ⚠️ Disponibilité du nom — risque à lever avant mise en ligne

Le site s’intitule « La Française des Produits Structurés » et s’abrège, dans l’en-tête et le
pied de page, en **« La Française »**.

**Or « La Française » est la dénomination d’une société de gestion française existante**
(groupe La Française, filiale de gestion d’actifs d’un grand réseau mutualiste), active sur
le même secteur — la gestion d’actifs et la distribution de produits financiers. Un nom
voisin sur un marché voisin est exactement la situation que le droit des marques sanctionne,
d’autant que l’abréviation retenue est le nom de l’autre acteur à l’identique.

Avant toute mise en ligne commerciale :

- faire une **recherche d’antériorité à l’INPI** sur les classes 35 et 36 ;
- faire valider le nom par un conseil en propriété industrielle ;
- vérifier la disponibilité des noms de domaine correspondants.

Le nom est centralisé dans les constantes `SITE`, `SITE_SHORT` et `MARK`, en tête de
`build-observatoire.py` : en changer est l’affaire d’une régénération.

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
