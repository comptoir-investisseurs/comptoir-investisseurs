# Maquettes « clones » par corps de métier

Dix déclinaisons de la maison-mère (*La Financière de Rochechouart*), chacune
spécialisée sur un corps de métier, avec une **identité visuelle propre**
(palette, typographies, mise en page, motif de hero) tout en restant **prime**.

## Visualiser

Ouvrez `clones/index.html` dans un navigateur : c'est la **galerie** qui
présente les 10 maquettes et renvoie vers chacune. Chaque page est **autonome**
(CSS inline, polices Google Fonts avec repli système) — aucun build requis.

Ou servez le dossier :

```bash
python3 -m http.server 8000   # puis http://localhost:8000/clones/
```

## Les 10 maquettes

| Slug | Marque | Cible | Direction visuelle |
|---|---|---|---|
| `galien` | Galien & Associés | Médecins, chirurgiens, libéraux de santé | Bleu nuit clinique + bronze · Fraunces/Inter · hero scindé · motif ECG |
| `maison-florence` | Maison Florence | Infirmiers, sages-femmes, kinés | Bordeaux + or rosé · Playfair/Mulish · hero gauche · motif lampe |
| `pretoire` | Prétoire Patrimoine | Avocats, notaires, juristes | Anthracite + or · Cormorant/Jost · hero centré sombre · balance |
| `maison-sainte-foy` | Maison Sainte-Foy | Familles catholiques / ISR convictionnel | Bordeaux liturgique + or, ivoire · EB Garamond/Mulish · croix |
| `maison-sillon` | Maison Sillon | Agriculteurs, viticulteurs | Vert olive + terre cuite · Source Serif/Karla · épis de blé |
| `cap-meridien` | Cap Méridien | Pilotes, navigants aériens | Bleu ciel + platine · Spectral/Sora · hero droite · compas |
| `bastion` | Bastion Patrimoine | Officiers, militaires, gendarmes | Marine + sable · Libre Baskerville/Barlow · bouclier |
| `le-preau` | Le Préau | Enseignants, fonction publique | Bleu pétrole + ocre · Lora/Nunito · hero scindé · livre |
| `olympe` | Olympe Patrimoine | Sportifs de haut niveau | Noir + rouge profond · Saira Condensed/Inter · laurier |
| `la-guilde` | La Guilde | Artisans, commerçants, indépendants | Acajou + laiton · Domine/Mulish · hero droite · enclume |

## Régénérer

Tout est piloté par un seul générateur. Pour modifier une marque (nom, palette,
copie, solutions), éditez la liste `THEMES` dans `build_clones.py` puis :

```bash
python3 clones/build_clones.py
```

> Maquettes de démonstration : adresses, e-mails et chiffres sont illustratifs.
