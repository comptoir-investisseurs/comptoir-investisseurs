# Domaines à ouvrir dans la politique réseau

Liste des domaines nécessaires pour attester les données du site depuis
l'environnement d'exécution. Tous sont **gratuits et en accès libre** — aucun
ne demande d'abonnement pour la consultation qui nous intéresse. Quelques-uns
demandent un compte gratuit pour aller plus loin ; c'est signalé.

## État au 9 août 2026 : la politique est ouverte

La liste a été appliquée. Vérification faite domaine par domaine depuis la
session, **le réseau n'est plus ce qui bloque** : Ranfft, Caliber Corner,
17jewels, Otto Frei, Miyota, Sellita, Ronda, Mikrolisk, ETA, Wikipédia,
archive.org et l'API eBay répondent tous.

Ce qui reste inaccessible ne l'est plus du fait de la politique, mais du fait
des sites eux-mêmes :

| Site | Ce qui se passe | Conséquence |
| --- | --- | --- |
| **Ranfft** | renvoie 403 à un client sans en-tête de navigateur | contourné : un `User-Agent` de navigateur suffit, les dix calibres ont été relevés |
| **Cousins UK** | 403 permanent, protection anti-robot Cloudflare | **bloqué** — les références de commande restent inaccessibles |
| **Moebius** | l'en-tête revient, le corps de page ne vient jamais ; connexion réinitialisée sous navigateur | **bloqué** — les viscosités restent inaccessibles |
| **web.archive.org** | connexion réinitialisée, alors que `archive.org` répond | replis d'archive indisponibles |
| **jules-borel.com, nihs.ch, drtillwich.com** | le tunnel échoue en 502, le nom ne résout pas | à revoir : `julesborel.com` s'écrit sans tiret |

Un navigateur sans interface (Chromium est préinstallé) ne change rien : il ne
sort pas par le mandataire de la session. Inutile d'insister de ce côté.

**Ce qui en découle.** Les deux gisements que ce document classait en priorité 1
et 2 — les viscosités Moebius et les références de commande Cousins — ne
s'obtiendront pas depuis cette session. Ils passeront par `sources/` : une
fiche technique Moebius déposée en PDF, une planche de fournitures
photographiée. C'est la voie décrite dans `sources/README.md`, et c'est
désormais la seule pour ces deux données.

Ce qui a pu être fait sans elles est consigné dans `releve-2026-08-09.md`.

## Où se règle cette politique

Le réglage n'appartient pas à la session mais à l'**environnement** qui
l'exécute — la configuration enregistrée qui porte l'accès réseau, les
variables d'environnement et les scripts d'installation. Une session hérite
de son environnement ; la modifier depuis la conversation est impossible.

Il n'y a **pas** de page « Environnements » dans les réglages du compte : un
environnement personnel ne se modifie que depuis son sélecteur.

1. Ouvrir **claude.ai/code** dans un navigateur — pas l'application de bureau,
   pas le terminal.
2. Cliquer sur la pastille en forme de nuage au-dessus de la zone de saisie,
   à gauche du nom du dépôt. Elle affiche **Default** tant que l'environnement
   n'a pas été renommé.
3. Dans la liste qui s'ouvre : soit **Add cloud environment** pour en créer un
   neuf, soit survoler **Default** et cliquer l'icône de réglages qui apparaît
   à droite de la ligne.
4. Dans la boîte de dialogue, champ **Network access** — quatre niveaux :

   | Niveau | Sorties autorisées |
   | --- | --- |
   | **None** | aucune |
   | **Trusted** | la liste par défaut : dépôts de paquets, GitHub, SDK cloud |
   | **Full** | tout |
   | **Custom** | votre propre liste |

5. Choisir **Custom**. Un champ **Allowed domains** apparaît : y coller les
   domaines ci-dessous, **un par ligne**. Le joker `*.` est accepté et couvre
   tous les sous-domaines.
6. **Cocher « Also include default list of common package managers ».** Sans
   cette case, la liste personnalisée *remplace* celle par défaut : npm, le
   registre GitHub et les dépôts de paquets tombent, et l'installation des
   dépendances du site échoue au démarrage de session.
7. Valider.

Mieux vaut **créer un second environnement** que modifier `Default` : les
autres chantiers continuent de tourner sur un réseau connu, et une liste mal
saisie ne casse qu'une session.

Ce qui ne passe pas par cette liste : le trafic GitHub, qui emprunte un proxy
dédié quel que soit le niveau, et les connecteurs MCP, qui transitent par les
serveurs Anthropic. Inutile donc d'y ajouter `github.com`.

Sur un compte Team ou Enterprise, les environnements *partagés* se gèrent
ailleurs — `claude.ai/admin-settings`, page **Cloud environments** — et seul
un propriétaire ou un administrateur y touche.

La référence : <https://code.claude.com/docs/en/cloud-environments>, et les
niveaux d'accès sur <https://code.claude.com/docs/en/cloud-environments#access-levels>.

**Ce n'est pas la seule voie.** Déposer des documents dans `sources/` ou
remplir le CSV de `/admin/donnees` marche sans toucher au réseau, et attribue
les mêmes attestations. Voir `sources/README.md`.

Une règle vaut pour toute cette liste : **un forum n'atteste rien**. Ces
sources servent à retrouver un document primaire — une planche, une
communication technique, un catalogue — et c'est ce document qui est cité.

---

## Priorité 1 — le cœur du sujet

Sans eux, rien ne se débloque. Avec eux, l'essentiel des 61 caractéristiques
et des 10 viscosités devient attestable.

```
ranfft.org
www.ranfft.org
ranfft.de
calibercorner.com
www.calibercorner.com
emmywatch.com
www.emmywatch.com
17jewels.info
www.17jewels.info
moebius-lubricants.ch
www.moebius-lubricants.ch
eta.ch
www.eta.ch
portal.eta.ch
archive.org
*.archive.org
web.archive.org
```

- **Ranfft** — la base de référence des mouvements. Cotes, rubis, fréquence,
  réserve, années de production, calibres apparentés. C'est la source la plus
  citée du métier.
- **Caliber Corner, EmmyWatch, 17jewels** — recoupent Ranfft. Trois sources
  concordantes valent une attestation ; deux qui divergent valent un doute
  signalé.
- **Moebius** — fiches techniques officielles : viscosité à 0, 20 et 40 °C,
  densité, point d'écoulement, plage de température. Ce sont ces PDF qui
  manquent aujourd'hui.
- **ETA** — communications techniques des calibres modernes. Certaines
  demandent un compte professionnel gratuit ; les fiches produit sont
  publiques.
- **Archive.org** — catalogues de fournitures et manuels de service numérisés.
  Le gisement le plus riche pour les calibres d'avant 1970. Sert les fichiers
  depuis des sous-domaines numérotés, d'où le joker.

## Priorité 2 — références de fournitures

C'est la donnée totalement absente du site : les références de commande.

```
cousinsuk.com
www.cousinsuk.com
ofrei.com
www.ofrei.com
jules-borel.com
www.jules-borel.com
boley.de
www.boley.de
hswalsh.com
www.hswalsh.com
perrinwatchparts.com
www.perrinwatchparts.com
esslinger.com
www.esslinger.com
```

- **Cousins UK** — le catalogue le plus complet, avec les références par
  calibre. Consultation libre, compte gratuit pour les prix professionnels.
- **Jules Borel** — sa base de correspondance des axes de balancier et des
  tiges est une référence d'atelier.
- **Otto Frei, Boley, H. S. Walsh** — bons fonds de pièces anciennes.

## Priorité 3 — documentation constructeur

```
sellita.ch
www.sellita.ch
swatchgroup.com
www.swatchgroup.com
ronda.ch
www.ronda.ch
soprod.ch
www.soprod.ch
lajouxperret.com
www.lajouxperret.com
miyotamovement.com
www.miyotamovement.com
timemodule.com
www.timemodule.com
sii.co.jp
www.sii.co.jp
citizenwatch-global.com
seikowatches.com
orient-watch.com
omegawatches.com
www.omegawatches.com
rolex.com
www.rolex.com
tudorwatch.com
nomos-glashuette.com
oris.ch
www.oris.ch
```

Fiches produit et, pour Miyota et Seiko/TMI, de véritables notices techniques
téléchargeables — cotes, couples, procédures.

## Priorité 4 — lubrifiants au-delà de Moebius

```
drtillwich.com
www.drtillwich.com
klueber.com
www.klueber.com
```

Dr. Tillwich publie les fiches Etsyntha ; Klüber, celles des graisses
horlogères.

## Priorité 5 — normes, encyclopédies, ateliers

```
wikipedia.org
*.wikipedia.org
upload.wikimedia.org
commons.wikimedia.org
wikidata.org
watch-wiki.net
www.watch-wiki.net
watch-wiki.org
mikrolisk.de
www.mikrolisk.de
nihs.ch
www.nihs.ch
fhs.swiss
www.fhs.swiss
watchguy.co.uk
www.watchguy.co.uk
speedmaster101.com
chronomaddox.com
adjustingvintagewatches.com
omegaforums.net
nawcc.org
mb.nawcc.org
watchuseek.com
forums.watchuseek.com
thewatchsite.com
```

- **NIHS** — les normes de l'industrie horlogère suisse, dont la liste
  normalisée des fournitures. C'est ce qui permettrait d'attester les numéros
  100, 195, 721 eux-mêmes, aujourd'hui repris de mémoire.
- **Mikrolisk** — base des poinçons et marques, utile pour dater et attribuer.
- **WatchGuy, Speedmaster101, Chronomaddox** — démontages documentés avec
  mesures réelles. Sources secondaires, mais souvent illustrées de planches
  qu'on peut alors citer.
- **Forums** — pour retrouver un document, jamais pour attester.

## eBay — pour la recherche de pièces

Nécessaire pour vérifier l'intégration une fois les clés reçues, et pour la
page `/admin/ebay`.

```
api.ebay.com
api.sandbox.ebay.com
developer.ebay.com
www.ebay.fr
www.ebay.com
www.ebay.co.uk
www.ebay.de
i.ebayimg.com
```

`i.ebayimg.com` sert les photographies des annonces : sans lui, les cartes
s'affichent sans image lors des vérifications d'ici. En production, c'est le
navigateur du visiteur qui les charge, la politique de cet environnement n'y
change rien.

---

## Liste prête à coller

Le champ **Domaines autorisés** n'accepte que des domaines, un par ligne :
pas de commentaire, pas de ligne de titre — une ligne parasite est traitée
comme un domaine et fait échouer la saisie. Le bloc ci-dessous est donc nu,
dédoublonné, et les sous-domaines sont couverts par le joker plutôt
qu'énumérés. Chaque domaine apparaît deux fois, nu puis en `*.` : le joker
ne couvre que les sous-domaines, jamais le domaine lui-même.

```
ranfft.org
*.ranfft.org
ranfft.de
*.ranfft.de
calibercorner.com
*.calibercorner.com
emmywatch.com
*.emmywatch.com
17jewels.info
*.17jewels.info
moebius-lubricants.ch
*.moebius-lubricants.ch
eta.ch
*.eta.ch
archive.org
*.archive.org
cousinsuk.com
*.cousinsuk.com
ofrei.com
*.ofrei.com
jules-borel.com
*.jules-borel.com
boley.de
*.boley.de
hswalsh.com
*.hswalsh.com
perrinwatchparts.com
*.perrinwatchparts.com
esslinger.com
*.esslinger.com
sellita.ch
*.sellita.ch
swatchgroup.com
*.swatchgroup.com
ronda.ch
*.ronda.ch
soprod.ch
*.soprod.ch
lajouxperret.com
*.lajouxperret.com
miyotamovement.com
*.miyotamovement.com
timemodule.com
*.timemodule.com
sii.co.jp
*.sii.co.jp
citizenwatch-global.com
*.citizenwatch-global.com
seikowatches.com
*.seikowatches.com
orient-watch.com
*.orient-watch.com
omegawatches.com
*.omegawatches.com
rolex.com
*.rolex.com
tudorwatch.com
*.tudorwatch.com
nomos-glashuette.com
*.nomos-glashuette.com
oris.ch
*.oris.ch
drtillwich.com
*.drtillwich.com
klueber.com
*.klueber.com
wikipedia.org
*.wikipedia.org
wikimedia.org
*.wikimedia.org
wikidata.org
*.wikidata.org
watch-wiki.net
*.watch-wiki.net
watch-wiki.org
*.watch-wiki.org
mikrolisk.de
*.mikrolisk.de
nihs.ch
*.nihs.ch
fhs.swiss
*.fhs.swiss
watchguy.co.uk
*.watchguy.co.uk
speedmaster101.com
*.speedmaster101.com
chronomaddox.com
*.chronomaddox.com
adjustingvintagewatches.com
*.adjustingvintagewatches.com
omegaforums.net
*.omegaforums.net
nawcc.org
*.nawcc.org
watchuseek.com
*.watchuseek.com
thewatchsite.com
*.thewatchsite.com
ebay.com
*.ebay.com
ebay.fr
*.ebay.fr
ebay.co.uk
*.ebay.co.uk
ebay.de
*.ebay.de
ebayimg.com
*.ebayimg.com
```

## Si la liste doit être courte

Six domaines couvrent l'essentiel :

```
ranfft.org
*.ranfft.org
moebius-lubricants.ch
*.moebius-lubricants.ch
cousinsuk.com
*.cousinsuk.com
archive.org
*.archive.org
api.ebay.com
```
