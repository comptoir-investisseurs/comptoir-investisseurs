# Méridian — Structured Products (site autonome)

Mini-site **indépendant**, sans aucun lien avec le site LFDR du dépôt racine.
Marque **neutre placeholder** : « Méridian — Structured Products ».

## Pages
- `index.html` — Accueil : produits traités (factices), single stock Phoenix & Athéna
- `partenaires.html` — Émetteurs (défilants, ratings S&P/Moody's/Fitch senior unsecured, Vontobel mis en avant) + établissements référents avec bouton « Contacter »
- `palmares.html` — Palmarès 2026 (produits factices, rendements élevés, FR/Europe/US single stock)
- `guide.html` — Guide : définition, formats, salles de marché, scénarios Phoenix
- `creer.html` — Constructeur de produit (paramètres type one-pager Marex) + pricing indicatif + e-mail obligatoire
- `contact.html` — Contact

## Tout est statique
Aucun backend. Les formulaires ouvrent l'e-mail (`mailto:`) pré-rempli.
Le pricer (`assets/js/app.js`) calcule un **coupon indicatif illustratif** côté client — aucune cotation réelle.

## Personnalisation rapide
- **Nom de marque** : remplacer « Méridian » (cherchez `brand__name` / `Méridian` dans les `.html`).
- **E-mail de contact** : `contact@lfd-rochechouart.com` (seul e-mail fourni au brief). Rechercher/remplacer dans les `.html` et `assets/js/app.js`.
- **Émetteurs / ratings** : `partenaires.html` (indicatifs, senior unsecured, à confirmer à l'émission).

Tous les produits, rendements et ratings sont **factices / indicatifs**, à titre illustratif.
