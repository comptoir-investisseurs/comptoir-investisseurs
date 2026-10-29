#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère les visuels de la marque « Officine & Patrimoine » (site pharmaciens).

    python3 build-pharmaciens-assets.py

1. Étalonne les photographies du dépôt dans la palette « vert officine ».
2. Compose les illustrations propres à l'univers de la pharmacie (croix verte,
   comptoir d'officine, molécule, mortier…) en SVG, rendues via Chromium.
3. Fabrique le logo, les favicons, l'image de partage et la texture de fond.

Les fichiers produits sont écrits dans pharmaciens/assets/img/ et sont versionnés :
le script n'a besoin d'être relancé que si l'on change la palette ou les photos.
"""
import os, subprocess, shutil, tempfile, json

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(ROOT, "pharmaciens", "assets", "img")
FONTS = os.path.join(ROOT, "assets", "fonts")
os.makedirs(OUT, exist_ok=True)

# --- Palette « officine » ---------------------------------------------------
DEEP   = "#06322B"   # vert officine profond
DEEP_2 = "#0A4639"
DARK   = "#03211D"
ACCENT = "#0B7355"   # vert pharmacie (accent principal)
MINT   = "#A6DEC8"
MINT_2 = "#5FD6AE"
CREAM  = "#EDF5F1"

# ---------------------------------------------------------------------------
# 1. Photographies étalonnées
# ---------------------------------------------------------------------------
# (fichier source, nom de sortie, largeur, saturation, intensité du virage vert)
PHOTOS = [
    # Hero de l'accueil : pharmacienne dans son officine (photo fournie par le client).
    # Étalonnage léger pour préserver les carnations.
    ("Pharmacienne-officine.jpg", "officine-pharmacienne.jpg", 1900, 93, 6),
    ("Pharmacie-armoire.jpg",     "armoire-pharmacie.jpg",      1700, 92, 7),
    ("Pharmacie-pilulier.jpg",    "pilulier.jpg",               1700, 90, 8),
    ("Family.jpg",               "famille-champ.jpg",     1800, 88, 10),
    ("A woman and her kid.jpg",  "transmission.jpg",      1800, 88, 10),
    ("Save.jpg",                 "epargne.jpg",           1800, 86, 11),
    ("Bridge.jpg",               "pont-transmission.jpg", 1600, 88, 10),
    ("Building.jpg",             "immobilier.jpg",        1800, 88, 10),
    ("Bank USA.jpg",             "institution.jpg",       1800, 86, 11),
    ("Luxembourg bank.jpg",      "luxembourg.jpg",        1600, 86, 11),
    ("Building USA.jpg",         "gratte-ciel.jpg",       1600, 86, 11),
    ("assets/img/foret-aerien.jpg",  "foret.jpg",         1800, 92, 8),
    ("assets/img/plage-ocean.jpg",   "ocean.jpg",         1800, 92, 8),
    ("assets/img/serenite.jpg",      "serenite.jpg",      1800, 90, 9),
    ("assets/img/echiquier.jpg",     "strategie.jpg",     1600, 88, 10),
    ("assets/img/bateau-mer.jpg",    "large.jpg",         1600, 90, 9),
    ("assets/img/haussmann.jpg",     "pierre.jpg",        1600, 88, 10),
    ("assets/img/toits-paris.jpg",   "paris.jpg",         1600, 88, 10),
    ("assets/img/interieur-coupole.jpg", "architecture.jpg", 1600, 88, 10),
    ("assets/img/retraite.jpg",      "retraite.jpg",      1800, 90, 9),
    ("assets/img/paris-courtyard.jpg", "cour.jpg",        1600, 88, 10),
]

# Recadrages de la photo d'officine : une série éditoriale cohérente (les rayonnages,
# le geste, le portrait) tirée d'une même prise de vue, pour les pages qui doivent
# montrer le métier plutôt qu'une image financière.
CROPS = [
    ("Pharmacienne-officine.jpg", "officine-rayonnages.jpg", "636x509+820+330"),
    ("Pharmacienne-officine.jpg", "officine-geste.jpg",      "600x480+820+140"),
    ("Pharmacienne-officine.jpg", "officine-portrait.jpg",   "700x560+180+230"),
    # Intérieur de commerce : on garde la partie en flou, sans texte ni enseigne.
    ("Pharmacie-interieur.jpg",   "interieur-pharmacie.jpg", "1050x840+950+120"),
    ("Pharmacie-rayonnages.jpg",  "rayonnages-pharmacie.jpg", "1000x800+250+150"),
]

# Rayonnages garnis : la photo porte des marques tierces et des étiquettes de prix en
# devise étrangère. Un flou léger la ramène à une matière d'arrière-plan.
BLUR = {"rayonnages-pharmacie.jpg": "0x9"}

def crop_photos():
    for src, dst, geom in CROPS:
        s = os.path.join(ROOT, src)
        if not os.path.exists(s):
            print("  ! source absente :", src); continue
        soften = ["-blur", BLUR[dst]] if dst in BLUR else ["-unsharp", "0x0.8+0.6+0.02"]
        subprocess.run([
            "convert", s, "-auto-orient", "-crop", geom, "+repage",
            "-resize", "1200x960"] + soften + [
            "-modulate", "100,93,104",
            "-fill", ACCENT, "-colorize", "6",
            "-strip", "-interlace", "Plane", "-sampling-factor", "4:2:0",
            "-quality", "84", os.path.join(OUT, dst),
        ], check=True)
        print("  recadrage", dst)

def grade_photos():
    for src, dst, width, sat, tint in PHOTOS:
        s = os.path.join(ROOT, src)
        if not os.path.exists(s):
            print("  ! source absente :", src); continue
        d = os.path.join(OUT, dst)
        # La boîte est carrée : c'est le plus grand côté qui est plafonné,
        # pour que les photos verticales ne pèsent pas trois fois plus lourd.
        subprocess.run([
            "convert", s, "-auto-orient", "-resize", "%dx%d>" % (width, width),
            "-modulate", "100,%d,104" % sat,
            "-fill", ACCENT, "-colorize", str(tint),
            "-strip", "-interlace", "Plane", "-sampling-factor", "4:2:0",
            "-quality", "78", d,
        ], check=True)
        print("  photo", dst)

# ---------------------------------------------------------------------------
# 2. Illustrations « univers officine » (SVG rendu par Chromium)
# ---------------------------------------------------------------------------
SHOT_JS = """
const { chromium } = require('playwright');
(async () => {
  const jobs = JSON.parse(process.argv[2]);
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.scale || 1 });
    await p.goto('file://' + j.html);
    await p.screenshot({ path: j.png, omitBackground: !!j.alpha });
    await p.close();
  }
  await b.close();
})();
"""

FONT_FACE = """
@font-face{font-family:'Cormorant Garamond';font-weight:500;src:url('file://%s/CormorantGaramond-500-latin.woff2') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-weight:600;src:url('file://%s/CormorantGaramond-600-latin.woff2') format('woff2');}
@font-face{font-family:'Jost';font-weight:300;src:url('file://%s/Jost-300-latin.woff2') format('woff2');}
@font-face{font-family:'Jost';font-weight:400;src:url('file://%s/Jost-400-latin.woff2') format('woff2');}
@font-face{font-family:'Jost';font-weight:500;src:url('file://%s/Jost-500-latin.woff2') format('woff2');}
""" % (FONTS, FONTS, FONTS, FONTS, FONTS)

def doc(w, h, body, bg=DEEP):
    return ("<!doctype html><html><head><meta charset='utf-8'><style>%s "
            "html,body{margin:0;padding:0;width:%dpx;height:%dpx;background:%s;overflow:hidden}"
            "svg{display:block}</style></head><body>%s</body></html>"
            % (FONT_FACE, w, h, bg, body))

DEFS = """
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="{d2}"/><stop offset=".48" stop-color="{d}"/><stop offset="1" stop-color="{dk}"/>
  </linearGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="{m2}" stop-opacity=".5"/>
    <stop offset=".55" stop-color="{m2}" stop-opacity=".15"/>
    <stop offset="1" stop-color="{m2}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{m}" stop-opacity=".06"/>
    <stop offset=".34" stop-color="#CFF0E2" stop-opacity=".20"/>
    <stop offset="1" stop-color="{m}" stop-opacity=".04"/>
  </linearGradient>
  <linearGradient id="shelf" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{m}" stop-opacity="0"/>
    <stop offset=".18" stop-color="{m}" stop-opacity=".30"/>
    <stop offset=".82" stop-color="{m}" stop-opacity=".30"/>
    <stop offset="1" stop-color="{m}" stop-opacity="0"/>
  </linearGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="blur-s"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
""".format(d=DEEP, d2=DEEP_2, dk=DARK, m=MINT, m2=MINT_2)

def cross(size=1.0, fill=MINT_2, op=".9"):
    a, b = 34 * size, 120 * size
    c = 86 * size
    path = ("M%.0f %.0f h%.0f v%.0f h%.0f v%.0f h%.0f v%.0f h%.0f v%.0f h%.0f v%.0f h%.0f z"
            % (-a, -b, 2*a, c, c, 2*a, -c, c, -2*a, -c, -c, -2*a, c))
    return path

def art_hero():
    """Comptoir d'officine : rayonnages, bocaux d'apothicaire, croix lumineuse."""
    jars = []
    spec = [(300, 300, 96, 54, .30), (392, 300, 120, 60, .26), (500, 300, 104, 46, .24),
            (770, 490, 96, 64, .20), (880, 490, 130, 56, .18), (430, 680, 110, 64, .17),
            (560, 680, 86, 50, .15), (1180, 680, 120, 58, .13)]
    for x, y, h, w, o in spec:
        jars.append(
            '<g><path d="M%d %d v-%d a10 10 0 0 1 10 -10 h%d a10 10 0 0 1 10 10 v%d z" '
            'fill="url(#glass)" stroke="%s" stroke-opacity="%s" stroke-width="1.3"/>'
            '<rect x="%d" y="%d" width="%d" height="%d" fill="%s" fill-opacity=".08"/></g>'
            % (x, y, h, w - 20, h, MINT, o, x + 4, y - h + 28, w - 8, 26, MINT))
    svg = ("<svg width='1800' height='1100' viewBox='0 0 1800 1100' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS +
           "<rect width='1800' height='1100' fill='url(#bg)'/>"
           "<ellipse cx='1300' cy='470' rx='720' ry='600' fill='url(#glow)'/>"
           + "".join("<rect x='90' y='%d' width='1620' height='2.4' fill='url(#shelf)'/>" % y
                     for y in (110, 300, 490, 680, 870))
           + "".join(jars)
           + "<g transform='translate(1320,470)'>"
             "<circle r='330' fill='url(#glow)' opacity='.85'/>"
             "<g filter='url(#blur)' opacity='.5'><path d='%s' fill='%s'/></g>"
             "<path d='%s' fill='#8FEBC8' fill-opacity='.93'/>"
             "<path d='%s' fill='none' stroke='#EAFFF6' stroke-opacity='.45' stroke-width='2'/>"
             "</g>" % (cross(1.25), MINT_2, cross(1.25), cross(1.25))
           + "</svg>")
    overlay = ("<div style='position:absolute;inset:0;background:"
               "radial-gradient(118% 92% at 62% 44%,rgba(0,0,0,0) 38%,rgba(2,22,19,.78) 100%)'></div>")
    return 1800, 1100, svg + overlay

def art_croix():
    """Croix verte d'officine, cadrage serré."""
    svg = ("<svg width='1400' height='1000' viewBox='0 0 1400 1000' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS +
           "<rect width='1400' height='1000' fill='url(#bg)'/>"
           "<ellipse cx='700' cy='500' rx='620' ry='520' fill='url(#glow)'/>"
           + "".join("<circle cx='700' cy='500' r='%d' fill='none' stroke='%s' stroke-opacity='.10' stroke-width='1.4'/>"
                     % (r, MINT) for r in (250, 330, 410, 490))
           + "<g transform='translate(700,500)'>"
             "<g filter='url(#blur)' opacity='.55'><path d='%s' fill='%s'/></g>"
             "<path d='%s' fill='#8FEBC8' fill-opacity='.95'/>"
             "<path d='%s' fill='none' stroke='#EAFFF6' stroke-opacity='.55' stroke-width='2.4'/>"
             "</g>" % (cross(1.6), MINT_2, cross(1.6), cross(1.6))
           + "</svg>")
    return 1400, 1000, svg

def art_mortier():
    """Mortier et pilon d'apothicaire, trait fin."""
    svg = ("<svg width='1400' height='1000' viewBox='0 0 1400 1000' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS +
           "<rect width='1400' height='1000' fill='url(#bg)'/>"
           "<ellipse cx='700' cy='520' rx='560' ry='460' fill='url(#glow)' opacity='.8'/>"
           "<g stroke='%s' stroke-opacity='.55' fill='none' stroke-width='3' stroke-linecap='round'>"
           "  <path d='M520 560 q0 190 180 190 q180 0 180 -190 z' fill='url(#glass)'/>"
           "  <path d='M470 545 h460' stroke-width='5'/>"
           "  <path d='M640 750 h120 v40 h-120 z' fill='url(#glass)'/>"
           "  <path d='M760 520 l150 -230' stroke-width='9'/>"
           "  <circle cx='916' cy='278' r='26' fill='url(#glass)'/>"
           "  <path d='M598 612 q46 56 104 56' stroke-opacity='.30'/>"
           "</g>"
           "<g opacity='.22'>%s</g>"
           "</svg>" % (MINT,
                       "".join("<circle cx='%d' cy='%d' r='%d' fill='%s' fill-opacity='.3'/>"
                               % (x, y, r, MINT) for x, y, r in
                               [(300, 300, 5), (365, 352, 3), (1090, 640, 5), (1040, 700, 3), (250, 700, 4)])))
    return 1400, 1000, svg

def art_molecule():
    """Réseau moléculaire : la structuration du capital."""
    import math, random
    random.seed(7)
    pts = []
    for i in range(26):
        pts.append((random.randint(120, 1280), random.randint(120, 880)))
    edges = []
    for i, (x1, y1) in enumerate(pts):
        for j, (x2, y2) in enumerate(pts):
            if j <= i: continue
            if math.hypot(x1 - x2, y1 - y2) < 290:
                edges.append((x1, y1, x2, y2))
    svg = ("<svg width='1400' height='1000' viewBox='0 0 1400 1000' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS +
           "<rect width='1400' height='1000' fill='url(#bg)'/>"
           "<ellipse cx='820' cy='420' rx='620' ry='520' fill='url(#glow)' opacity='.75'/>"
           + "".join("<line x1='%d' y1='%d' x2='%d' y2='%d' stroke='%s' stroke-opacity='.16' stroke-width='1.3'/>"
                     % (e + (MINT,)) for e in edges)
           + "".join("<circle cx='%d' cy='%d' r='%d' fill='%s' fill-opacity='.45'/>"
                     % (x, y, 5 + (i % 4) * 2, MINT) for i, (x, y) in enumerate(pts))
           + "</svg>")
    return 1400, 1000, svg

def art_ordonnance():
    """Document : l'acte de cession, les clauses, la structuration juridique."""
    lines = []
    y = 250
    for i, w in enumerate([420, 520, 360, 480, 300, 540, 440, 380, 500, 320]):
        lines.append("<rect x='470' y='%d' width='%d' height='%s' rx='3' fill='%s' fill-opacity='%s'/>"
                     % (y, w, "9" if i in (0, 5) else "6", MINT, ".30" if i in (0, 5) else ".16"))
        y += 46
    svg = ("<svg width='1400' height='1000' viewBox='0 0 1400 1000' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS +
           "<rect width='1400' height='1000' fill='url(#bg)'/>"
           "<ellipse cx='760' cy='460' rx='600' ry='520' fill='url(#glow)' opacity='.7'/>"
           "<g transform='rotate(-4 760 500)'>"
           "<rect x='420' y='160' width='660' height='700' rx='6' fill='url(#glass)' stroke='%s' stroke-opacity='.28'/>"
           "%s"
           "<g transform='translate(960,780)'><path d='%s' fill='#8FEBC8' fill-opacity='.8' transform='scale(.42)'/></g>"
           "</g></svg>" % (MINT, "".join(lines), cross(1.0)))
    return 1400, 1000, svg

def art_courbe():
    """Capital réinvesti : courbe de capitalisation."""
    svg = ("<svg width='1400' height='1000' viewBox='0 0 1400 1000' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS +
           "<rect width='1400' height='1000' fill='url(#bg)'/>"
           "<ellipse cx='900' cy='400' rx='660' ry='560' fill='url(#glow)' opacity='.75'/>"
           + "".join("<line x1='120' y1='%d' x2='1280' y2='%d' stroke='%s' stroke-opacity='.10' stroke-width='1.2'/>"
                     % (y, y, MINT) for y in range(220, 900, 110))
           + "".join("<rect x='%d' y='%d' width='52' height='%d' fill='%s' fill-opacity='.12'/>"
                     % (220 + i * 120, 820 - h, h, MINT)
                     for i, h in enumerate([90, 140, 185, 250, 310, 400, 470, 560]))
           + "<path d='M240 760 C 480 720, 640 600, 800 470 S 1120 250, 1272 190' fill='none' "
             "stroke='#8FEBC8' stroke-opacity='.85' stroke-width='5' stroke-linecap='round'/>"
             "<circle cx='1272' cy='190' r='14' fill='#8FEBC8'/>"
             "<circle cx='1272' cy='190' r='34' fill='none' stroke='#8FEBC8' stroke-opacity='.35' stroke-width='2'/>"
           + "</svg>")
    return 1400, 1000, svg

def art_officine_facade():
    """Façade d'officine : enseigne, vitrine, store."""
    shelves = "".join(
        "<rect x='%d' y='%d' width='300' height='4' fill='%s' fill-opacity='.14'/>"
        % (400 if i % 2 else 900, 500 + i * 58, MINT) for i in range(5))
    enseigne = ("<g transform='translate(800,150)'>"
                "<g filter='url(#blur-s)' opacity='.6'><path d='%s' fill='%s' transform='scale(.62)'/></g>"
                "<path d='%s' fill='#8FEBC8' fill-opacity='.9' transform='scale(.62)'/></g>"
                % (cross(1.0), MINT_2, cross(1.0)))
    vitrine = ("<g stroke='%s' fill='none' stroke-width='2' stroke-opacity='.3'>"
               "<rect x='300' y='250' width='1000' height='640' fill='url(#glass)'/>"
               "<rect x='360' y='430' width='380' height='400'/>"
               "<rect x='860' y='430' width='380' height='400'/>"
               "<path d='M300 250 h1000' stroke-width='6' stroke-opacity='.45'/>"
               "<path d='M300 390 h1000' stroke-opacity='.22'/>"
               "<path d='M760 430 h80 v460 h-80 z' fill='url(#glass)'/>"
               "</g>" % MINT)
    svg = ("<svg width='1600' height='1000' viewBox='0 0 1600 1000' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS
           + "<rect width='1600' height='1000' fill='url(#bg)'/>"
             "<ellipse cx='800' cy='520' rx='720' ry='560' fill='url(#glow)' opacity='.6'/>"
           + vitrine + enseigne + shelves + "</svg>")
    return 1600, 1000, svg

def art_colonnes():
    """Structuration : colonnes / piliers du patrimoine."""
    cols = []
    for i, h in enumerate([420, 520, 620, 520, 420]):
        x = 300 + i * 200
        cols.append("<g><rect x='%d' y='%d' width='110' height='%d' fill='url(#glass)' stroke='%s' "
                    "stroke-opacity='.26'/><rect x='%d' y='%d' width='150' height='22' fill='%s' "
                    "fill-opacity='.22'/></g>" % (x, 860 - h, h, MINT, x - 20, 838 - h, MINT))
    svg = ("<svg width='1400' height='1000' viewBox='0 0 1400 1000' xmlns='http://www.w3.org/2000/svg'>"
           + DEFS +
           "<rect width='1400' height='1000' fill='url(#bg)'/>"
           "<ellipse cx='700' cy='460' rx='640' ry='540' fill='url(#glow)' opacity='.7'/>"
           + "".join(cols)
           + "<rect x='240' y='860' width='920' height='10' fill='%s' fill-opacity='.3'/></svg>" % MINT)
    return 1400, 1000, svg

ARTWORKS = {
    "hero-officine.jpg":    art_hero,
    "croix-verte.jpg":      art_croix,
    "mortier.jpg":          art_mortier,
    "molecule.jpg":         art_molecule,
    "ordonnance.jpg":       art_ordonnance,
    "capitalisation.jpg":   art_courbe,
    "facade-officine.jpg":  art_officine_facade,
    "piliers.jpg":          art_colonnes,
}

# ---------------------------------------------------------------------------
# Marque : recoloration dans la palette du site
# ---------------------------------------------------------------------------
# Le fichier source (Marque-source.webp, à la racine) est un aplat de deux verts
# sur fond blanc. On le relit comme un mélange entre le blanc du fond et l'un des
# deux verts : on en déduit l'opacité de chaque pixel — ce qui préserve
# l'antialiasing — et on repeint avec les couleurs du site.
MARK_SRC    = "Marque-source.webp"
MARK_DARK   = (DEEP,   "#4FA98B")   # sur fond clair : vert profond + sauge
MARK_LIGHT  = (ACCENT, MINT)        # sur fond sombre : vert pharmacie + menthe
# Favicon : à 16 px il faut davantage d'écart avec le fond, d'où un couple plus clair.
MARK_ICON   = ("#4FA98B", MINT)

_SRC_DARK   = (1, 86, 57)
_SRC_BRIGHT = (62, 167, 68)

def _hexc(h):
    h = h.lstrip("#")
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]

def recolor_mark(dst, dark_hex, bright_hex, size=512):
    import numpy as np
    from PIL import Image
    src = os.path.join(ROOT, MARK_SRC)
    if not os.path.exists(src):
        print("  ! marque source absente :", MARK_SRC); return False
    im = Image.open(src).convert("RGB").resize((size, size), Image.LANCZOS)
    p = np.asarray(im, dtype=float)
    white = np.array([255.0, 255.0, 255.0])
    out_rgb = np.zeros(p.shape); alpha = np.zeros(p.shape[:2]); best = None
    for source, target in ((_SRC_DARK, _hexc(dark_hex)), (_SRC_BRIGHT, _hexc(bright_hex))):
        source = np.array(source, dtype=float)
        d = white - source
        t = np.clip(((white - p) @ d) / float(d @ d), 0.0, 1.0)
        res = np.linalg.norm(p - (white + t[..., None] * (source - white)), axis=-1)
        if best is None:
            best, alpha = res, t
            out_rgb = np.broadcast_to(np.array(target, dtype=float), p.shape).copy()
        else:
            take = res < best
            best = np.where(take, res, best)
            alpha = np.where(take, t, alpha)
            out_rgb[take] = target
    Image.fromarray(np.dstack([out_rgb, alpha * 255.0]).astype("uint8"), "RGBA").save(dst)
    return True

# ---------------------------------------------------------------------------
# 3. Logo, favicons, image de partage
# ---------------------------------------------------------------------------
def logo_html(mark_png, dark_text=True, w=1560, h=560):
    """Marque (croix à deux verts) + bloc-nom sur deux lignes."""
    ink = DEEP if dark_text else CREAM
    return ("<div style=\"width:%dpx;height:%dpx;display:flex;align-items:center;gap:40px;"
            "padding:0 20px;box-sizing:border-box\">"
            "<img src='file://%s' width='270' height='270' alt=''>"
            "<div style=\"font-family:'Cormorant Garamond',serif;color:%s;line-height:.95\">"
            "<div style='font-weight:600;font-size:150px;letter-spacing:.005em'>Officine</div>"
            "<div style='font-weight:500;font-size:126px;letter-spacing:.005em'>&amp; Patrimoine</div>"
            "</div></div>" % (w, h, mark_png, ink))

def favicon_html(mark_png, size=512):
    pad = int(size * 0.08)
    return ("<div style='width:%dpx;height:%dpx;background:%s;display:flex;align-items:center;"
            "justify-content:center'>"
            "<img src='file://%s' width='%d' height='%d' alt=''></div>"
            % (size, size, DEEP, mark_png, size - 2 * pad, size - 2 * pad))

def og_html(mark_png):
    art = ("<svg width='1200' height='630' viewBox='0 0 1200 630' style='position:absolute;inset:0'>"
           + DEFS
           + "<rect width='1200' height='630' fill='url(#bg)'/>"
             "<ellipse cx='960' cy='300' rx='460' ry='420' fill='url(#glow)'/>"
           + "</svg>"
           + "<img src='file://%s' style='position:absolute;left:800px;top:155px;width:320px;"
             "height:320px' alt=''>" % mark_png)
    texte = ("<div style=\"position:absolute;left:74px;top:140px;width:620px;color:%s;"
             "font-family:'Cormorant Garamond',serif\">"
             "<div style=\"font-family:'Jost',sans-serif;font-size:19px;letter-spacing:.26em;"
             "text-transform:uppercase;color:%s;margin-bottom:22px\">Officine &amp; Patrimoine</div>"
             "<div style='font-size:60px;line-height:1.08;font-weight:500'>Vous venez de céder "
             "votre pharmacie&nbsp;?</div>"
             "<div style='width:70px;height:2px;background:%s;margin:28px 0'></div>"
             "<div style=\"font-family:'Jost',sans-serif;font-size:23px;font-weight:300;opacity:.85\">"
             "Structurer, placer et transmettre le produit de votre cession.</div>"
             "</div>" % (CREAM, MINT, MINT))
    return ("<div style='position:relative;width:1200px;height:630px;overflow:hidden;background:%s'>%s%s</div>"
            % (DEEP, art, texte))

# ---------------------------------------------------------------------------
def render(jobs):
    """jobs : liste de dicts {html_content, png, w, h, scale, alpha, bg}"""
    tmp = tempfile.mkdtemp(prefix="pharma-art-")
    specs = []
    for i, j in enumerate(jobs):
        p = os.path.join(tmp, "job%02d.html" % i)
        with open(p, "w", encoding="utf-8") as f:
            f.write(j["html"])
        specs.append({"html": p, "png": j["png"], "w": j["w"], "h": j["h"],
                      "scale": j.get("scale", 1), "alpha": j.get("alpha", False)})
    js = os.path.join(tmp, "shot.js")
    with open(js, "w", encoding="utf-8") as f:
        f.write(SHOT_JS)
    subprocess.run(["node", js, json.dumps(specs)], check=True, cwd=ROOT)
    shutil.rmtree(tmp, ignore_errors=True)

def build_artworks():
    tmp = tempfile.mkdtemp(prefix="pharma-png-")
    jobs = []
    for name, fn in ARTWORKS.items():
        w, h, svg = fn()
        png = os.path.join(tmp, name.replace(".jpg", ".png"))
        jobs.append({"html": doc(w, h, "<div style='position:relative;width:%dpx;height:%dpx'>%s</div>" % (w, h, svg)),
                     "png": png, "w": w, "h": h})
    # Marque recolorée : version foncée (fonds clairs) et claire (fonds sombres)
    mark_dark  = os.path.join(tmp, "marque.png")
    mark_light = os.path.join(tmp, "marque-light.png")
    mark_icon  = os.path.join(tmp, "marque-icon.png")
    recolor_mark(mark_dark,  *MARK_DARK)
    recolor_mark(mark_light, *MARK_LIGHT)
    recolor_mark(mark_icon,  *MARK_ICON)
    for src, dst in ((mark_dark, "marque.png"), (mark_light, "marque-light.png")):
        shutil.copyfile(src, os.path.join(OUT, dst))

    # logos (fond transparent)
    jobs.append({"html": doc(1560, 560, logo_html(mark_dark, True), bg="transparent"),
                 "png": os.path.join(tmp, "logo.png"), "w": 1560, "h": 560, "alpha": True})
    jobs.append({"html": doc(1560, 560, logo_html(mark_light, False), bg="transparent"),
                 "png": os.path.join(tmp, "logo-light.png"), "w": 1560, "h": 560, "alpha": True})
    jobs.append({"html": doc(512, 512, favicon_html(mark_icon, 512)),
                 "png": os.path.join(tmp, "icon.png"), "w": 512, "h": 512})
    jobs.append({"html": doc(1200, 630, og_html(mark_light)), "png": os.path.join(tmp, "og.png"),
                 "w": 1200, "h": 630})
    render(jobs)

    for name in ARTWORKS:
        src = os.path.join(tmp, name.replace(".jpg", ".png"))
        # Le hero est retourné : la croix se place à gauche, le panneau de texte
        # du site occupant la moitié droite de l'écran.
        flip = ["-flop"] if name == "hero-officine.jpg" else []
        subprocess.run(["convert", src] + flip + ["-strip", "-interlace", "Plane",
                        "-quality", "86", os.path.join(OUT, name)], check=True)
        print("  artwork", name)
    for n in ("logo.png", "logo-light.png"):
        subprocess.run(["convert", os.path.join(tmp, n), "-trim", "+repage",
                        "-resize", "x551", os.path.join(OUT, n)], check=True)
        print("  logo", n)
    icon = os.path.join(tmp, "icon.png")
    for size, dst in ((32, "favicon-32.png"), (16, "favicon-16.png"),
                      (180, "apple-touch-icon.png"), (64, "favicon.png")):
        subprocess.run(["convert", icon, "-resize", "%dx%d" % (size, size),
                        os.path.join(OUT, dst)], check=True)
    print("  favicons")

    # La marque sert aussi de favicon au site principal (La Financière de
    # Rochechouart), à la demande du client. Mêmes images, aux tailles que ce
    # site utilise déjà. Les pages y pointent avec un paramètre de version
    # (?v=) qu'il faut incrémenter pour forcer le rafraîchissement des caches.
    main_img = os.path.join(ROOT, "assets", "img")
    if os.path.isdir(main_img):
        for size, dst in ((32, "favicon-32.png"), (16, "favicon-16.png"),
                          (180, "apple-touch-icon.png"), (512, "favicon.png")):
            subprocess.run(["convert", icon, "-resize", "%dx%d" % (size, size),
                            os.path.join(main_img, dst)], check=True)
        print("  favicons du site principal")
    subprocess.run(["convert", os.path.join(tmp, "og.png"), "-strip", "-quality", "88",
                    os.path.join(OUT, "og-officine-patrimoine.jpg")], check=True)
    print("  og image")
    shutil.rmtree(tmp, ignore_errors=True)

# ---------------------------------------------------------------------------
# 4. Texture de fond (motif croix)
# ---------------------------------------------------------------------------
TEXTURE = """<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 240 240">
  <defs>
    <pattern id="p" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M52 34 h16 v18 h18 v16 h-18 v18 h-16 v-18 h-18 v-16 h18 z" fill="#FFFFFF" fill-opacity=".30"/>
      <circle cx="10" cy="104" r="2.4" fill="#FFFFFF" fill-opacity=".22"/>
      <circle cx="104" cy="12" r="2.4" fill="#FFFFFF" fill-opacity=".22"/>
    </pattern>
  </defs>
  <rect width="240" height="240" fill="url(#p)"/>
</svg>
"""


def build_svgs():
    with open(os.path.join(OUT, "img-texture.svg"), "w", encoding="utf-8") as f:
        f.write(TEXTURE)
    print("  texture")

def main():
    print("Photographies…");  grade_photos(); crop_photos()
    print("Illustrations…");  build_artworks()
    print("SVG…");            build_svgs()
    print("Terminé.")

if __name__ == "__main__":
    main()
