# public/

## Logotype

`logo.svg` est le logotype Cronostic, vectorisé depuis l'original
(`../brand/logo-source.jpg`) par `../brand/vectorise-logo.py`.

La charte n'autorise que **deux versions** : encre `#232019` sur fond clair,
blanc en réserve sur fond sombre ou photographie homogène. Pas de logo laiton,
pas de bichromie, pas de contour, pas d'ombre, pas de déformation. Le composant
`src/components/logo.tsx` applique ces deux versions et rien d'autre.

Contraintes reprises du document :

- zone de protection égale à la hauteur du « C » de chaque côté, bords de page
  compris — elle est réservée en `padding`, jamais annulée ;
- 32 px de haut minimum à l'écran ;
- redimensionnement proportionnel uniquement.

Pour remplacer le logotype : déposer le nouveau tracé sous `logo.svg` (fond
transparent, tracé plein) et ajuster `RATIO` dans `src/components/logo.tsx` si
les proportions changent. En repartant d'un fichier matriciel :

```bash
python3 brand/vectorise-logo.py    # nécessite Pillow, numpy et potrace
```

## Règle de marque

Le nom s'écrit **toujours « Cronostic »** — capitale initiale, jamais en
capitales d'imprimerie.
