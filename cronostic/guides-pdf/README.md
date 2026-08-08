# guides-pdf/

Les PDF Cronostic déposés ici sont rattachés automatiquement au guide du
calibre correspondant.

```
guides-pdf/omega-265.pdf   →  guide du calibre Omega 265
guides-pdf/omega-30t2.pdf  →  guide du calibre Omega 30T2
```

Le nom du fichier est le **slug du calibre**, celui qui figure dans l'URL de sa
fiche (`/calibres/omega-265` → `omega-265.pdf`). La casse et les séparateurs
sont tolérés.

## Ce dossier n'est pas public

Il est volontairement **hors de `public/`** : rien n'y est servi statiquement.
Un PDF déposé ici ne sort que par `/api/guides/[guideId]/download`, après
vérification de la session puis du droit — achat à l'unité ou abonnement
Cronostic Pro actif. Le déposer ne le rend donc pas téléchargeable sans achat.

Ne jamais placer un guide dans `public/` : il y serait accessible à tous.

## Quand préférer Cloudflare R2

Cette voie est la plus courte pour démarrer : ni base de données, ni compte
Cloudflare. Elle a deux limites en production — les fichiers pèsent sur le
dépôt et sur chaque déploiement, et le remplacement d'un guide impose un
nouveau déploiement.

Dès qu'un PDF est téléversé depuis `/admin/guides`, il prend le pas sur celui
du dépôt. Le passage à R2 se fait donc guide par guide, sans rien casser.
