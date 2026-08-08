"""Détourage + vectorisation du logotype Cronostic.

Le fichier source est un JPEG 467x467 : lettrage noir sur fond greige, avec les
artefacts de compression habituels autour des contours. On isole le lettrage
par seuillage sur la luminance, on suréchantillonne avant de tracer pour que
potrace place ses courbes sur des bords lissés plutôt que sur l'escalier de
pixels, puis on trace en SVG — net à toutes les tailles.
"""

import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path("brand/logo-source.jpg")
OUT_SVG = Path("public/logo.svg")
OUT_PNG = Path("brand/logo.png")
SCALE = 6  # suréchantillonnage avant tracé

im = Image.open(SRC).convert("RGB")
# Le JPEG porte une colonne de pixels noirs sur son bord droit : on rogne une
# fine bordure avant toute mesure, sinon elle fausse le recadrage.
BORD = 3
im = im.crop((BORD, BORD, im.width - BORD, im.height - BORD))
a = np.asarray(im).astype(np.float32)

# Luminance perceptuelle.
lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

# Le fond est la valeur dominante : on la mesure sur les bords de l'image.
bord = np.concatenate([lum[:12].ravel(), lum[-12:].ravel(), lum[:, :12].ravel(), lum[:, -12:].ravel()])
fond = float(np.median(bord))
encre = float(np.percentile(lum, 1.0))
print(f"fond={fond:.1f}  encre={encre:.1f}")

# Rampe linéaire entre encre et fond : 1 = plein, 0 = transparent.
bas, haut = encre + 0.18 * (fond - encre), fond - 0.18 * (fond - encre)
alpha = np.clip((haut - lum) / (haut - bas), 0.0, 1.0)

# Recadrage au plus juste sur le lettrage.
masque = alpha > 0.5
ys, xs = np.where(masque)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
print(f"lettrage {x1 - x0} x {y1 - y0} px  (ratio {(x1 - x0) / (y1 - y0):.3f})")

alpha_crop = alpha[y0:y1, x0:x1]

# ── PNG détouré (secours, et utile pour l'aperçu) ────────────────────────
h, w = alpha_crop.shape
png = Image.fromarray(
    np.dstack(
        [
            np.zeros((h, w), np.uint8),
            np.zeros((h, w), np.uint8),
            np.zeros((h, w), np.uint8),
            (alpha_crop * 255).astype(np.uint8),
        ]
    ),
    "RGBA",
).resize((w * 3, h * 3), Image.LANCZOS)
png.save(OUT_PNG)

# ── Vectorisation ────────────────────────────────────────────────────────
# Suréchantillonnage + léger flou : potrace suit alors des bords continus,
# ce qui évite les micro-facettes sur les déliés de la cursive.
grand = (
    Image.fromarray((alpha_crop * 255).astype(np.uint8), "L")
    .resize((w * SCALE, h * SCALE), Image.LANCZOS)
    .filter(ImageFilter.GaussianBlur(SCALE * 0.28))
)
# potrace trace les pixels NOIRS : le lettrage doit donc sortir à 0.
bitmap = grand.point(lambda v: 0 if v > 127 else 255).convert("1")
pbm = Path("/tmp/logo-source.pbm")
bitmap.save(pbm)

subprocess.run(
    [
        "potrace", str(pbm),
        "--svg",
        "--output", str(OUT_SVG),
        "--turdsize", str(SCALE * SCALE // 2),  # supprime les résidus JPEG isolés
        "--alphamax", "1.0",                    # coins francs là où le tracé en a
        "--opttolerance", "0.15",               # courbes fidèles sans surcharge
        "--flat",
    ],
    check=True,
)

svg = OUT_SVG.read_text()
print(f"SVG {OUT_SVG.stat().st_size} octets, {svg.count('M')} contours")
print(f"PNG {OUT_PNG.stat().st_size} octets, {png.size[0]}x{png.size[1]}")
print(f"RATIO={(x1 - x0) / (y1 - y0):.4f}")
