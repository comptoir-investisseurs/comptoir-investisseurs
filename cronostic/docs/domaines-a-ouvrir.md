# Domaines à ouvrir dans la politique réseau

Liste des domaines nécessaires pour attester les données du site depuis
l'environnement d'exécution. Tous sont **gratuits et en accès libre** — aucun
ne demande d'abonnement pour la consultation qui nous intéresse. Quelques-uns
demandent un compte gratuit pour aller plus loin ; c'est signalé.

À ajouter dans `claude.ai/code` → environnement → réseau. Si la politique
accepte les jokers, `*.domaine.tld` évite d'énumérer les sous-domaines.

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

## Si la liste doit être courte

Six domaines couvrent l'essentiel :

```
ranfft.org
moebius-lubricants.ch
cousinsuk.com
archive.org
*.archive.org
api.ebay.com
```
