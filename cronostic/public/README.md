# public/

## Logotype

Le logotype Cronostic se dépose ici sous le nom **`logo.svg`** (ou `logo.png`,
1000 px de large minimum), puis on passe `USE_LOGO_FILE` à `true` dans
`src/components/logo.tsx`.

Le fichier doit être **détouré** : fond transparent, tracé plein (noir ou
blanc, peu importe). Il est affiché en `mask-image` recoloré par
`currentColor` — un seul fichier suffit donc pour toutes les couleurs du site
(ivoire dans l'en-tête, laiton sur les couvertures de guides, noir sur fond
clair). Un fichier avec un fond opaque produirait un rectangle plein.

Si le logotype est nettement plus large ou plus étroit que 4,6 : 1, ajuster
`aspectRatio` et `width` dans le même fichier.

En attendant, le logotype est composé typographiquement en Yellowtail.

## Règle de marque

Le nom s'écrit **toujours « Cronostic »** — capitale initiale, jamais en
capitales d'imprimerie. Les intertitres qui contiennent la marque utilisent la
classe `.surtitre-marque` (sans transformation de casse) et non `.surtitre`.
