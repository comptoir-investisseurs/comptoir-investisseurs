# Cronostic

> La documentation technique de l'horloger.
> Guides d'atelier et pièces détachées pour mouvements horlogers vintage.

Projet **totalement autonome** : aucun code, style ou dépendance partagée avec
le reste du dépôt. Le dossier `cronostic/` se transplante tel quel dans un dépôt
dédié (voir « Extraction » en fin de fichier).

---

## Ce que le site fait — et ne fait pas

Les guides PDF Cronostic sont produits **hors du site**, déjà mis en page et
estampillés. Le site ne les génère pas, ne les modifie pas et ne stocke aucune
représentation structurée de leur contenu. Il les **vend** et les **distribue**.

Concrètement, il n'existe ni pipeline d'extraction, ni éditeur de guides, ni
workflow éditorial, ni génération de PDF. Un guide, côté back-office, c'est une
fiche produit et un fichier à téléverser. La seule chose que le site écrive
dans un PDF est le pied de page nominatif apposé à la remise — le contenu, lui,
n'est jamais touché.

| Le site fait                                    | Le site ne fait pas                    |
| ----------------------------------------------- | -------------------------------------- |
| Répertorier 746 calibres de 94 marques          | Générer ou réécrire le contenu des PDF |
| Vendre les guides à l'unité (Stripe)            | Analyser les manuels sources           |
| Proposer l'abonnement Cronostic Pro             | Rédiger du contenu de guide            |
| Servir les PDF après vérification des droits    | Gérer une validation éditoriale        |
| Marquer chaque exemplaire au nom de l'acheteur  | Conserver des données bancaires        |
| Identifier les fournitures d'un calibre         | Stocker le contenu structuré des PDF   |
| Chercher les pièces en vente (eBay + marchands) |                                        |
| Référencer huiles et consommables               |                                        |
| Construire une encyclopédie gratuite            |                                        |
| Segmenter par marque de mouvement               |                                        |

---

## Démarrage

```bash
npm install
npm run dev
```

Le site démarre **sans aucune variable d'environnement**. Il bascule alors en
mode démonstration :

| Brique   | Absente → comportement                                                      |
| -------- | --------------------------------------------------------------------------- |
| Neon     | Catalogue servi depuis le seed en mémoire ; écritures admin volatiles        |
| Clerk    | Connexion locale par e-mail (cookie signé HMAC) sur `/connexion`             |
| Stripe   | Achat et abonnement simulés, droits accordés immédiatement et signalés       |
| R2       | PDF écrits dans `.local-storage/`, servis par la route de téléchargement     |
| eBay     | Liens de recherche profonds vers eBay, Cousins, Otto Frei, Chrono24          |

Chaque brique s'active indépendamment des autres — voir `.env.example`.

En développement local sans `ADMIN_EMAILS`, tout compte connecté a accès à
`/admin`. En production, seuls les e-mails listés dans `ADMIN_EMAILS` l'ont.

---

## Mise en production

### 1. Base de données (Neon)

```bash
# DATABASE_URL=postgresql://…@ep-xxx.neon.tech/cronostic?sslmode=require
npm run db:push     # crée le schéma
npm run db:seed     # catalogue de lancement (idempotent)
```

Le seed crée les 10 calibres, la nomenclature 30 mm, les lubrifiants,
l'outillage, et une fiche guide **en brouillon sans PDF** par calibre.

### 2. Authentification (Clerk)

Renseigner `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY`.
Le middleware Clerk s'active automatiquement ; la connexion locale se désactive
d'elle-même. Renseigner `ADMIN_EMAILS` **avant** le premier déploiement public.

### 3. Paiement (Stripe)

Marche à suivre complète, dans l'ordre. Tout se fait depuis le tableau de bord
Stripe ; commencer en **mode test** (l'interrupteur en haut à droite), refaire
la même chose en mode réel une fois le parcours validé.

**a. Clé secrète.** Développeurs → Clés d'API → copier la clé secrète dans
`STRIPE_SECRET_KEY`. La clé publiable n'est pas utilisée : le paiement passe
par Checkout, hébergé par Stripe.

**b. Quatre prix récurrents.** Catalogue → Ajouter un produit. Créer
*Cronostic Atelier* avec deux tarifs récurrents (19,90 € par mois, 199 € par
an), puis *Cronostic Intégrale* avec deux tarifs (29,90 € par mois, 299 € par
an). Copier les quatre identifiants (`price_…`) :

```
STRIPE_ATELIER_MENSUEL_PRICE_ID=price_…
STRIPE_ATELIER_ANNUEL_PRICE_ID=price_…
STRIPE_INTEGRAL_MENSUEL_PRICE_ID=price_…
STRIPE_INTEGRAL_ANNUEL_PRICE_ID=price_…
```

Sans ces identifiants, l'abonnement fonctionne quand même : le prix est créé à
la volée depuis la grille en centimes. Les renseigner reste préférable — les
rapports Stripe deviennent lisibles par formule.

Les guides à l'unité n'ont **pas** de produit Stripe : le prix est saisi par
guide dans `/admin/guides` et la ligne de commande est construite au moment du
paiement. C'est ce qui permet de changer un prix sans toucher à Stripe.

**c. Webhook.** Développeurs → Webhooks → Ajouter un point de terminaison,
URL `https://<votre-domaine>/api/stripe/webhook`. Événements à cocher :

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

Copier le secret de signature (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`. Sans
lui, les événements sont rejetés : c'est voulu, un webhook non signé ne doit
jamais accorder de droit.

**d. Portail client.** Paramètres → Facturation → Portail client : activer
l'annulation d'abonnement et le changement de formule, renseigner les liens
vers `/conditions` et `/confidentialite`. C'est ce portail qui s'ouvre derrière
le bouton « Gérer ».

**e. Facturation.** Paramètres → Facturation → activer l'émission automatique
des factures. Le site demande déjà `invoice_creation` sur les paiements à
l'unité ; l'abonnement facture de lui-même. Renseigner l'adresse et le numéro
de TVA du vendeur dans Paramètres → Détails de l'entreprise : ils figurent sur
chaque facture.

**f. TVA.** Un guide PDF est un service électronique : la TVA est due dans le
pays de l'acheteur dès le premier euro pour les clients particuliers de l'UE.
Deux options — activer Stripe Tax (Paramètres → Taxes), ou relever du guichet
unique OSS et déclarer soi-même. Le choix appartient au vendeur et à son
comptable ; le site affiche les prix **TTC** dans les deux cas.

**g. Vérification.** En mode test, carte `4242 4242 4242 4242`, date future,
CVC quelconque. Vérifier : l'achat apparaît dans `/account`, le guide se
télécharge, le courriel de confirmation part (ou apparaît dans les journaux si
SMTP n'est pas configuré), et l'événement est reçu sans erreur dans la page
Webhooks.

En local, `stripe listen --forward-to localhost:3000/api/stripe/webhook`
fournit un secret de test temporaire.

Le webhook fait foi. La page `/purchase/success` réconcilie aussi la session
Stripe pour que le téléchargement soit disponible immédiatement, sans attendre
l'événement.

### 4. Stockage des PDF (Cloudflare R2)

Créer un bucket **privé** (`cronostic`) et une clé d'API S3, puis renseigner
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

Les objets suivent la convention `premium/guides/omega-265.pdf`. L'URL du
bucket n'est **jamais** exposée : `/api/guides/[guideId]/download` vérifie la
session puis le droit, et ne délivre qu'ensuite une URL signée de 5 minutes.

### 5. Recherche de pièces (eBay Browse API)

Créer une application sur developer.ebay.com, puis renseigner
`EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`. Le jeton OAuth
(`client_credentials`) est mis en cache en mémoire et les résultats sont
revalidés toutes les 15 minutes. En cas d'erreur ou de quota, la page retombe
automatiquement sur les liens marchands.

La recherche est restreinte aux **catégories de fournitures** (`173699`,
`175776`, surchargeables par `EBAY_CATEGORY_IDS`) et les intitulés de montres
complètes sont écartés : sans cela, « Omega 265 » remonte surtout des montres
entières. La page affiche une **estimation de prix** — moyenne des annonces
retenues, hors décile haut et bas au-delà de cinq offres, avec la fourchette et
l'effectif — et un accès direct à l'annonce la moins chère.

---

## Tarification

| Formule | Prix | Ce qu'elle ouvre |
| --- | --- | --- |
| Découverte | gratuit | Encyclopédie, nomenclatures, recherche de pièces, huiles |
| Guide à l'unité | 14,90 € | Un guide, définitivement |
| Atelier | 19,90 € / mois — 199 € / an | 5 guides ouverts par période |
| Intégrale | 29,90 € / mois — 299 € / an | Tous les guides, sans quota |

Trois seuils, pensés pour qu'aucune formule n'en rende une autre absurde. Un
guide isolé coûte 14,90 € : moins qu'un mois d'Atelier, l'achat unitaire garde
donc son sens pour une révision ponctuelle. Dès deux calibres dans le mois,
Atelier passe devant. Au-delà de cinq, ou pour un besoin permanent, Intégrale
prend le relais — et devient moins chère qu'Atelier dès le septième guide de la
période.

Le quota se compte **au déblocage, pas au téléchargement répété** : un guide
ouvert reste ouvert tant que l'abonnement court, et le crédit se consomme une
seule fois, au premier téléchargement — jamais à l'affichage de la fiche. Les
crédits non utilisés ne se reportent pas d'une période sur l'autre.

Les prix sont modifiables sans redéploiement : celui d'un guide se saisit dans
`/admin/guides`, ceux des abonnements viennent des variables
`NEXT_PUBLIC_ATELIER_*_CENTS`, `NEXT_PUBLIC_INTEGRAL_*_CENTS` et
`NEXT_PUBLIC_QUOTA_ATELIER`.

---

## Rattacher les PDF

Deux voies, qui coexistent.

**Dépôt** — poser le PDF dans `guides-pdf/` suffit : le rattachement se fait
sur la référence du calibre trouvée dans le nom du fichier, quel que soit le
reste. `omega-265.pdf` comme `Cronostic_Omega_265_manuel_de_service.pdf`
tombent tous deux sur le calibre 265. Si deux fichiers revendiquent la même
référence, aucun n'est retenu : on ne devine pas. Ce dossier est hors de
`public/` et n'est jamais servi statiquement ; le PDF ne sort que par la route
de téléchargement, après contrôle des droits. Voir `guides-pdf/README.md`.

**Cloudflare R2** — le téléversement depuis `/admin/guides` prend le pas sur le
fichier du dépôt, guide par guide. À privilégier en production : les fichiers ne
pèsent plus ni sur le dépôt ni sur chaque déploiement, et le remplacement d'un
guide n'impose plus de redéployer.

---

## Panier

Le panier vit dans un cookie et ne contient que des identifiants de guides — un
fichier n'a ni quantité, ni stock, ni frais de port. Il survit à la connexion :
on le remplit avant d'avoir un compte, on se connecte au moment de payer. Les
guides déjà acquis en sont retirés à la lecture, et une session Stripe
multi-articles enregistre un achat par ligne.

---

## Mettre un guide en vente

1. `/admin/guides` → **Ajouter**
2. Choisir le calibre, saisir titre, description courte, prix, nombre de pages
3. Cocher **Inclus dans Cronostic Pro** si le guide entre dans l'abonnement
4. Enregistrer, puis **téléverser le PDF final** depuis la page du guide
5. **Publier**

Un guide sans PDF ne peut pas être publié : la tentative est bloquée et
signalée.

---

## Droits d'accès

Trois sources de droit, indépendantes, évaluées dans cet ordre :

| Situation                              | Affichage                        | Téléchargement |
| -------------------------------------- | -------------------------------- | -------------- |
| Visiteur non connecté                  | Prix + « Acheter »               | non            |
| Connecté, aucun droit                  | Prix + « Acheter »               | non            |
| Guide acheté à l'unité                 | « Vous possédez ce guide »       | oui, définitif |
| Atelier, guide déjà ouvert             | « Ouvert avec votre abonnement » | oui            |
| Atelier, crédits restants              | « Ouvrir — n crédits restants »  | oui, consomme  |
| Atelier, quota épuisé                  | Quota atteint + Intégrale        | non            |
| Intégrale active                       | « Inclus dans votre abonnement » | oui            |

Un achat à l'unité survit à la résiliation de l'abonnement. Un guide ouvert au
titre du quota cesse de l'être à la fin de la période payée — c'est écrit dans
les conditions de vente et affiché sur la fiche. Un guide déjà possédé ne se
voit jamais reproposer à l'achat. Un clic sur « Acheter » ou « S'abonner » sans
compte renvoie vers `/connexion`, puis revient automatiquement sur le checkout
correspondant.

Le contrôle est en un seul endroit : `src/lib/entitlements.ts`. La route de
téléchargement ne connaît que `guideAccessFor()` et `ouvrirAvecQuota()`.

---

## Marquage des fichiers remis

Chaque PDF est personnalisé **au moment du téléchargement** : pied de page
nominatif sur chaque planche — nom, adresse, référence du calibre, mention de
diffusion interdite — et une diagonale très pâle portant la même identité. Les
métadonnées du fichier reprennent la mention.

C'est un marquage dissuasif, pas une protection. Il n'empêche pas la copie : il
rend la rediffusion attribuable, ce qui suffit dans la quasi-totalité des cas
sans abîmer la lisibilité, contrairement à un chiffrement ou à un gros
filigrane en travers des schémas. Le fichier ne communique avec aucun serveur
une fois téléchargé.

Conséquence d'architecture : la route sert elle-même le flux au lieu de
rediriger vers une URL signée R2 — une redirection livrerait le fichier
d'origine, non marqué. En cas d'échec du marquage, l'original est renvoyé : un
guide non marqué vaut mieux qu'un téléchargement en erreur.

L'aperçu public suit le même principe inverse : `/api/guides/[id]/preview`
extrait à la volée les trois premières pages du PDF complet et y appose
« Extrait — 3 pages sur N ». Rien à produire ni à téléverser séparément, et le
document complet ne sort jamais par cette route.

---

## Courriel

Confirmation d'achat (liste des guides, liens de téléchargement, montant) et
bienvenue à l'abonnement. Expéditeur et adresse de contact :
`CONTACT_EMAIL`.

Sans configuration SMTP, les messages sont **écrits dans les journaux du
serveur** au lieu d'être envoyés : le parcours reste déroulable, et rien
n'échoue silencieusement. Un envoi qui échoue ne fait jamais échouer un achat —
le droit est déjà acquis en base et l'acheteur retrouve ses guides dans son
compte.

Pour Gmail : `smtp.gmail.com`, port 465, utilisateur l'adresse complète, et un
**mot de passe d'application** — jamais le mot de passe du compte.

---

## Données personnelles

- `/confidentialite` — quelles données, pourquoi, combien de temps, chez qui
- `/account/donnees` — export de portabilité et suppression de compte, en libre
  accès pour la personne concernée
- `/api/account/export` — l'export lui-même, en JSON lisible
- Suppression : cascade sur achats, abonnements et déblocages, plus le compte
  Clerk. Confirmation par saisie de l'adresse, l'action étant irréversible.

Les pièces comptables restent chez Stripe, où la conservation légale de dix ans
s'applique : les effacer ici n'y changerait rien.

---

## Mesure d'audience

Interne, sans cookie, sans traceur tiers, sans consentement à demander.

Deux chiffres : consultations par page et par jour, et visites distinctes
estimées à partir d'une empreinte `sha256(sel + jour + adresse + navigateur)`
tronquée. Le sel change chaque jour, donc la même personne n'est pas
reconnaissable d'un jour sur l'autre ; l'empreinte n'est pas réversible vers
l'adresse IP, qui n'est jamais écrite. Les empreintes de plus de trente jours
sont purgées à l'ouverture du tableau de bord.

Renseigner `ANALYTICS_SALT` (`openssl rand -hex 32`) : sans lui, un sel
aléatoire est tiré au démarrage et les visites se recomptent après chaque
redéploiement. Les pages d'administration, les appels d'API et les robots ne
sont pas comptés. Résultats dans `/admin/audience`.

---

## Encyclopédie des marques

94 marques, 746 calibres. La segmentation suit la **marque de mouvement**, pas
celle du cadran — c'est la seule qui aide à l'établi.

```
/marques                     index, groupé par nature de marque
/marques/valjoux             les 15 Valjoux, groupés par type
/calibres/valjoux-7733       la fiche du calibre
```

Trois familles, classées par nature et non par géographie :

| Famille | Ce qu'on y trouve | Pourquoi c'est le bon découpage |
| --- | --- | --- |
| Fabriques d'ébauches | ETA, Valjoux, Lémania, Landeron, Sellita, Miyota… | Un guide sur un 7733 sert des dizaines de marques de montres |
| Manufactures | Omega, Rolex, JLC, Zenith, Seiko, Poljot… | Calibres propres, fournitures spécifiques |
| Maisons | Heuer, Cartier, Breitling, Tudor, Panerai… | Logent des mouvements d'autrui — le champ `base` renvoie vers l'ébauche réelle |

Le cas Cartier illustre l'intérêt du découpage : la maison n'a pratiquement
pas fabriqué de mouvement avant 2010. Une Tank vintage se documente du côté de
Jaeger-LeCoultre ou de Piaget, pas de Cartier. Chaque fiche concernée porte
l'ébauche d'origine, et la page de marque le dit en toutes lettres.

### Deux niveaux de fiche

- **Fiches détaillées** (`src/data/catalog.ts`) — présentation, historique,
  architecture, nomenclature, points de lubrification, outillage. Ce sont
  celles qui portent un guide. Elles l'emportent toujours sur l'encyclopédie.
- **Fiches d'amorce** (`src/data/marques/*.ts`) — référence, période, type,
  repères dimensionnels. Rien de relevé sur planche constructeur, donc tout
  s'affiche avec le repère ◆ et la page l'annonce en préambule.

Une valeur incertaine est **omise**, jamais devinée : une case vide se
complète, une case fausse se propage. C'est la règle qui gouverne tout le
fichier de données.

### Où éditer

L'encyclopédie est un jeu de données **versionné dans le dépôt**, pas une table
que l'on modifie depuis le back-office. C'est délibéré : ces fiches se
corrigent par lots, se relisent en diff, et se déploient avec le reste. Le
back-office gère les guides et les calibres documentés — ce qui se vend et ce
qui change souvent.

```
src/data/encyclopedie.ts       types, libellés, assemblage
src/data/marques/ebauches.ts   24 fabriques d'ébauches
src/data/marques/maisons.ts    55 maisons et manufactures
src/data/marques/hors-suisse.ts 15 marques japonaises, russes, chinoises, américaines
```

Ajouter un mouvement : une ligne dans le tableau `mouvements` de la marque. Le
slug (`marque-reference`), la fiche, l'entrée d'encyclopédie, le plan du site
et l'index de recherche en découlent automatiquement.

---

## Recherche

Un seul champ, sur l'accueil, `/calibres` et `/marques`, qui interroge tout :
calibres, guides, marques, fournitures, huiles, outillage et pages du site.
Près de neuf cents entrées.

Deux index, pour ne pas faire payer la recherche à qui ne s'en sert pas :

- **le réduit** part avec la page — calibres documentés, guides, marques, pages.
  Quelques kilo-octets, disponibles à la première frappe ;
- **le complet** arrive par `/api/recherche` dès que le champ prend le curseur
  ou le survol, donc avant que la frappe soit terminée.

Le filtrage reste local dans les deux cas : aucune requête réseau ne s'intercale
entre une touche et son résultat. La bascule a fait passer l'accueil de 262 à
69 ko (40 à 12 ko compressés).

Le classement suit la qualité de la correspondance : référence exacte, puis
début de référence, puis occurrence dans le libellé, puis dans la description.
Les accents et la ponctuation sont neutralisés, les préfixes inutiles
(« omega », « calibre », « cal. ») ignorés, et tous les mots de la requête
doivent être présents — « huile balancier » ne remonte pas toutes les huiles.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                    accueil
│   ├── calibres/[slug]/            fiche calibre (cœur du site)
│   ├── marques/                    encyclopédie par marque de mouvement
│   ├── guides/                     vitrine des guides
│   ├── pieces/                     recherche de pièces
│   ├── huiles/                     huiles, graisses, outillage
│   ├── pro/                        abonnement
│   ├── account/                    compte, mes guides, mes données
│   ├── panier/                     panier
│   ├── purchase/                   récapitulatif et confirmation
│   ├── conditions/                 conditions de vente
│   ├── confidentialite/            politique de confidentialité
│   ├── mentions-legales/
│   ├── admin/                      back-office, dont /admin/audience
│   └── api/
│       ├── guides/[guideId]/download   PDF marqué, après vérification
│       ├── guides/[guideId]/preview    extrait de trois pages
│       ├── admin/guides/[guideId]/file téléversement du PDF
│       ├── account/export              portabilité RGPD
│       ├── recherche                   index de recherche complet
│       ├── mesure                      compteur d'audience
│       └── stripe/webhook
├── db/          schéma Drizzle + seed
├── data/        catalogue de lancement (seed & mode démo)
│   └── marques/ encyclopédie : 94 marques, 746 calibres
├── lib/         auth, droits, repo, r2, stripe, ebay, pdf, mail,
│                search, analytics
└── components/
```

`src/lib/repo.ts` est le seul point qui parle à la base. Chaque fonction a deux
branches : Neon quand `DATABASE_URL` est présente, seed en mémoire sinon. Le
reste du code ignore complètement cette bascule.

### Tables

`users`, `caliber_families`, `calibers`, `caliber_specs`, `caliber_relations`,
`guides`, `purchases`, `subscriptions`, `guide_unlocks`, `parts`,
`part_calibers`, `part_compatibilities`, `lubricants`,
`caliber_lubrication_points`, `tools`, `caliber_tools`,
`marketplace_listings`, `favorites`, `page_views`, `visit_fingerprints`.

Contraintes notables :

- `purchases` porte un index unique `(user_id, guide_id)` — un même guide ne
  peut pas être acheté deux fois par le même compte.
- `guide_unlocks` porte le même index unique : un guide ouvert au titre du
  quota ne consomme jamais deux crédits, quel que soit le nombre de
  téléchargements.
- `page_views` a pour clé `(day, path)` : le compteur est agrégé dès
  l'écriture, il n'existe aucune ligne par visite.

---

## Données techniques : statut

Les caractéristiques des 10 calibres sont un **point de départ à valider**.
Toute valeur non recoupée porte `is_verified = false`, s'affiche avec la
mention « à valider » sur la fiche, et la fiche entière affiche un bandeau tant
que `data_status` vaut `draft`.

À relire à l'établi avant de basculer une fiche en `verified` :

- hauteur, nombre de rubis, réserve de marche, type d'antichoc ;
- affichage de la seconde (petite seconde / seconde au centre) pour les séries
  26x et 28x ;
- années de production ;
- numéros de nomenclature des fournitures, à recouper avec les planches Omega.

Sont en revanche fiables : famille 30 mm, remontage manuel, diamètre 30 mm,
fréquence 18 000 alt/h, échappement à ancre suisse.

---

## Extraction vers un dépôt dédié

Le dossier est autonome. Pour lui donner son propre dépôt en conservant
l'historique :

```bash
git subtree split --prefix=cronostic -b cronostic-only
cd /tmp && git clone --single-branch --branch cronostic-only <dépôt> cronostic
cd cronostic && git remote set-url origin <nouveau-dépôt> && git push -u origin main
```

Ou simplement copier le dossier dans un dépôt neuf : rien n'y référence le
projet hôte.

---

## Identité

Le site applique la **charte graphique Cronostic v1.0**. Trois principes la
gouvernent : la lisibilité prime sur l'effet, l'ornement est fonctionnel, la
sobriété matérielle. Concrètement — pas de dégradé, pas d'ombre portée, pas de
reflet, un seul niveau d'encadrement, et le laiton signale sans jamais remplir.

Le nom s'écrit **toujours « Cronostic »** — capitale initiale, jamais en
capitales d'imprimerie. Les intertitres qui portent la marque utilisent
`.surtitre-marque`, les autres `.surtitre`.

### Couleurs

| Rôle | Valeur | Emploi |
| --- | --- | --- |
| Encre | `#232019` | Texte, titres, traits. Remplace le noir pur |
| Laiton | `#A8762C` | Identité : filets, en-têtes de tableau, pastilles, surtitres |
| Laiton clair | `#C9A35F` | Surbrillance de pièce — illustration uniquement |
| Papier | `#FBF9F4` | Fond d'encart et de planche, jamais de page pleine |
| Gris trait / fond / clair | `#CFC9BD` `#E8E4DB` `#F4F1EA` | Filets, aplats en retrait, lignes alternées |
| Alerte / Méthode / Technique | `#94301F` `#4A6B3A` `#2F5D8A` | Codes fonctionnels, un sens chacun |

### Typographie

| Rôle | Famille |
| --- | --- |
| Titrage | EB Garamond |
| Texte, interface | Jost |
| Technique | DejaVu Sans Mono |

La charte impose Caladea et Carlito pour les **manuels**, où la compatibilité
métrique avec Cambria et Calibri garantit une mise en page stable en
circulation bureautique. Un site web ne circule pas en bureautique : le site
retient donc un couple choisi pour la tenue à l'écran, en gardant la même
intention — sobriété, contraste franc, peu de graisses. EB Garamond donne le
grain d'un ouvrage ; Jost, grotesque géométrique de lignée Futura, est
contemporaine des mouvements documentés. La police technique reste celle de la
charte.

EB Garamond et Jost sont chargées par `next/font` et auto-hébergées ; DejaVu
Sans Mono est embarquée dans `src/fonts/`. Aucun appel externe au runtime.

Six tailles seulement, exposées en tokens : `surtitre`, `legende`, `courant`,
`etape`, `section`, `couverture`. Le silence typographique fait partie de
l'identité — pas de septième taille.

### Composants normalisés

`.tableau` (en-tête laiton plein, lignes alternées sur papier, aucun filet
vertical), `.encart` / `.encart-alerte` / `.encart-methode`, `.pastille` et
`.pastille-cerclee`, `.filet` (2 px laiton), `.cadre` et `.cadre-papier`.

### Photographies

`public/photos/` est lu au rendu : déposer un fichier suffit à le faire
apparaître, en retirer un suffit à le faire disparaître, et le site retombe
proprement sur une mise en page sans image. `hero.*` ouvre la page d'accueil en
fuite à droite ; `marge-*.*` illustre les pages éditoriales en marge,
rogné par le bord. Le nom du fichier porte la légende. Voir
`public/photos/README.md`.

La charte proscrit la photographie décorative sans fonction technique : chaque
image est donc légendée, et les illustrations de marge s'effacent sous 1280 px.

### Statut des données

La charte rédactionnelle impose de signaler toute valeur non relevée sur une
source constructeur. Les caractéristiques dont `is_verified` est faux portent
donc le repère **◆** et la fiche affiche un encart d'alerte les récapitulant.

### Logotype

`public/logo.svg`, vectorisé depuis l'original par `brand/vectorise-logo.py`.
Deux versions autorisées et pas une de plus : encre sur fond clair, blanc en
réserve sur fond sombre. Zone de protection égale à la hauteur du « C » de
chaque côté, 32 px de haut minimum à l'écran — c'est pourquoi les vignettes de
couverture composent le nom en Carlito plutôt que d'afficher le tracé sous sa
taille plancher. L'icône de favori est un fragment du lettrage lui-même, jamais
un dessin de substitution.

---

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Neon PostgreSQL · Drizzle ORM ·
Clerk · Stripe · Cloudflare R2 · Vercel.

Pas de Supabase.
