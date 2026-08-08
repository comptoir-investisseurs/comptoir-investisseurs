# public/

## Logotype

`logo.svg` est le logotype Cronostic, vectorisé depuis l'original
(`../brand/logo-source.jpg`) par `../brand/vectorise-logo.py`.

Il est affiché en `mask-image` rempli par `currentColor` : **un seul fichier
sert tous les contextes** — ivoire dans l'en-tête, laiton sur les couvertures
de guides, noir sur fond clair. Il n'y a donc pas de variante de couleur à
maintenir.

Pour remplacer le logotype :

1. déposer le nouveau tracé sous `logo.svg` (fond transparent, tracé plein) ;
2. si les proportions changent, ajuster `RATIO` dans
   `src/components/logo.tsx` (largeur ÷ hauteur du lettrage détouré).

Si l'on repart d'un fichier matriciel, `brand/vectorise-logo.py` refait tout le
travail : détourage du fond, recadrage au plus juste, mesure du ratio et tracé.

```bash
python3 brand/vectorise-logo.py    # nécessite Pillow, numpy et potrace
```

## Règle de marque

Le nom s'écrit **toujours « Cronostic »** — capitale initiale, jamais en
capitales d'imprimerie. Les intertitres qui contiennent la marque utilisent la
classe `.surtitre-marque` (sans transformation de casse) et non `.surtitre`.
