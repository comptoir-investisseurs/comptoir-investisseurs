#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur statique du site « Officine & Patrimoine », marque de
La Financière de Rochechouart dédiée aux pharmaciens qui cèdent leur officine.

    python3 build-pharmaciens.py

Écrit les pages dans pharmaciens/ et la feuille de style dans
pharmaciens/assets/css/styles.css (dérivée de la charte LFDR, palette
« vert officine »). Les visuels sont produits par build-pharmaciens-assets.py.
"""
import os, html, re, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(ROOT, "pharmaciens")
os.makedirs(OUT, exist_ok=True)

BRAND        = "Officine & Patrimoine"
PARENT       = "La Financière de Rochechouart"
ENDORSEMENT  = "une marque de La Financière de Rochechouart"
EMAIL        = "contact@lfd-rochechouart.com"
ADDRESS      = "58 rue de Monceau, 75008 Paris"
SITE_URL     = "https://www.officine-patrimoine.fr"
TODAY        = datetime.date.today().isoformat()

# ==========================================================================
# Feuille de style : charte LFDR transposée dans la palette « vert officine »
# ==========================================================================
HEX_MAP = {
    "001B00": "06322B",  # vert profond        -> vert officine profond
    "04240E": "0A3B32",
    "0B2E16": "0F4A3F",
    "16472A": "1A6655",
    "A9853F": "0B7355",  # or                  -> vert pharmacie (accent)
    "C9A86A": "4FA98B",
    "E6C988": "A6DEC8",
    "F6F2E9": "EDF5F1",  # crème               -> blanc menthé
    "FBF8F1": "F7FBF9",
    "E7DCC7": "D7E9E1",
    "D8CBB0": "BCD9CD",
    "1E211C": "16251F",
    "5B6058": "4E6761",
}
RGB_MAP = {
    "0,27,0":       "6,50,43",
    "0,20,0":       "4,40,34",
    "246,242,233":  "237,245,241",
    "201,168,106":  "79,169,139",
    "169,133,63":   "11,115,85",
    "251,248,241":  "247,251,249",
    "47,107,58":    "11,115,85",
}

EXTRA_CSS = """
/* =========================================================================
   Officine & Patrimoine — compléments propres à la marque
   ========================================================================= */
/* Mention d'adossement, sous le logo */
.endorse{
  display:block; font-size:.62rem; letter-spacing:.22em; text-transform:uppercase;
  font-weight:400; margin-top:5px; opacity:.72; white-space:nowrap;
}
.site-header .brand{ flex-direction:column; align-items:flex-start; gap:0; }
.site-header .endorse{ color:#fff; }
.site-header.is-solid .endorse,.site-header.is-light .endorse{ color:var(--green); }
.site-footer .brand{ flex-direction:column; align-items:flex-start; gap:0; }
/* Dans le pied de page la mention peut revenir à la ligne : sinon elle impose sa
   largeur à la première colonne de la grille et fait déborder la page sur mobile. */
.site-footer .endorse{ color:var(--cream); opacity:.7; margin-top:8px; white-space:normal; }

/* Bandeau d'annonce (fiscalité, délais) */
.flash{
  background:var(--green-700); color:var(--cream); font-size:.86rem; letter-spacing:.04em;
  text-align:center; padding:9px 16px;
}
.flash a{ color:var(--gold-light); border-bottom:1px solid rgba(166,222,200,.5); }

/* Encadré d'alerte / repère */
.note{
  border-left:3px solid var(--gold); background:var(--cream); padding:22px 26px;
  border-radius:0 4px 4px 0; margin:30px 0;
}
.note h4{ font-family:var(--sans); font-size:.74rem; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin:0 0 10px; font-weight:500; }
.note p{ margin:0; font-size:.96rem; color:var(--muted); }
.note p + p{ margin-top:10px; }
.band-cream .note{ background:var(--parchment); }

/* Chiffres-clés en ligne */
.figures{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:28px; }
.figure{ border-top:2px solid var(--gold); padding-top:18px; }
.figure b{ display:block; font-family:var(--serif); font-size:clamp(1.9rem,3.2vw,2.6rem);
  font-weight:500; color:var(--green); line-height:1.05; }
.figure span{ display:block; font-size:.88rem; color:var(--muted); margin-top:8px; }
.band-dark .figure b{ color:#fff; }
.band-dark .figure span{ color:rgba(237,245,241,.72); }

/* Parcours en étapes */
.steps{ counter-reset:step; display:grid; gap:4px; }
.step{ display:grid; grid-template-columns:auto 1fr; gap:24px; padding:26px 0;
  border-top:1px solid var(--line); align-items:start; }
.step:last-child{ border-bottom:1px solid var(--line); }
.step__n{ counter-increment:step; font-family:var(--serif); font-size:1.5rem; color:var(--gold);
  min-width:52px; }
.step__n::before{ content:"0" counter(step); }
.step h3{ font-size:1.3rem; margin:0 0 8px; }
.step p{ margin:0; color:var(--muted); font-size:.97rem; }

/* Nuage de mots-clés (longue traîne) */
.kw{ display:flex; flex-wrap:wrap; gap:10px; }
.kw span{ font-size:.82rem; color:var(--muted); border:1px solid var(--line);
  border-radius:40px; padding:7px 16px; background:#fff; }
.band-cream .kw span{ background:var(--parchment); }

/* Liste de liens internes en colonnes */
.linkgrid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px 40px; }
.linkgrid a{ display:block; padding:12px 0; border-bottom:1px solid var(--line);
  color:var(--green); font-size:.97rem; transition:color .3s var(--ease), padding .3s var(--ease); }
.linkgrid a:hover{ color:var(--gold); padding-left:6px; }

/* Croix d'officine décorative */
.cross-rule{ display:inline-flex; align-items:center; gap:14px; color:var(--gold); margin:0 0 18px; }
.cross-rule svg{ width:18px; height:18px; }
.cross-rule span{ font-size:.74rem; letter-spacing:.28em; text-transform:uppercase; font-weight:500; }

/* Hero photographique : la photo d'officine est claire à droite, là où se pose le
   panneau de texte. On remplace le voile d'origine (dégradé vers la gauche) par un
   voile qui s'assombrit vers la droite, et on densifie le panneau. */
.home .hero__bg::after{
  background:linear-gradient(90deg,rgba(4,40,34,.30) 0%,rgba(4,40,34,.42) 40%,rgba(4,40,34,.72) 100%);
}
.home .hero__panel{ background:rgba(6,50,43,.78); }

/* Texture : motif de croix répété plutôt qu'étiré plein cadre */
.page-hero::before,.cta-band::before{
  background:url('../img/img-texture.svg') repeat; background-size:180px 180px;
}
.page-hero::before{ opacity:.07; }

/* Bandeau de principes : des mots, pas des chiffres — donc un corps plus petit */
.stats--words .stat__num{ font-size:clamp(1.15rem,1.7vw,1.6rem); letter-spacing:.01em; }
.stats--words .stat__lbl{ margin-top:14px; }

/* En-tête : la marque porte deux lignes, on resserre pour garder le bouton en place */
.site-header .brand__logo{ height:38px; }
.site-header.is-solid .brand__logo{ height:34px; }
.nav{ gap:clamp(14px,1.8vw,30px); }

@media (max-width:1180px){
  .site-header .endorse{ display:none; }
}
@media (max-width:700px){
  .endorse{ font-size:.55rem; letter-spacing:.16em; }
  /* Cadrage mobile du hero : recentrer sur la pharmacienne et ses rayonnages */
  .hero__bg img{ object-position:34% center; }
  .step{ grid-template-columns:1fr; gap:10px; }
  .figures{ gap:22px; }
}
"""

def build_css():
    src = os.path.join(ROOT, "assets", "css", "styles.css")
    css = open(src, encoding="utf-8").read()
    for old, new in HEX_MAP.items():
        css = re.sub("#" + old, "#" + new, css, flags=re.I)
    for old, new in RGB_MAP.items():
        css = css.replace("rgba(" + old + ",", "rgba(" + new + ",")
    css = css.replace("La Financière de Rochechouart — Design system",
                      "Officine & Patrimoine — charte dérivée de La Financière de Rochechouart")
    css = css.replace("/* Brand palette (green 001B00 + autumn-derived tones) */",
                      "/* Palette officine (vert 06322B + verts pharmacie) */")
    css += EXTRA_CSS
    d = os.path.join(OUT, "assets", "css")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "styles.css"), "w", encoding="utf-8") as f:
        f.write(css)
    # Polices auto-hébergées, copiées dans le site plutôt que partagées avec le site
    # principal : le workflow GitHub Pages exclut `assets/fonts` et `assets/css/fonts.css`
    # (le site LFDR charge ses polices depuis Google Fonts), et ces motifs rsync
    # s'appliqueraient aussi à pharmaciens/assets/fonts. D'où les noms distincts
    # `webfonts/` et `typographie.css`, qui survivent au déploiement.
    import shutil
    src_fonts = os.path.join(ROOT, "assets", "fonts")
    dst_fonts = os.path.join(OUT, "assets", "webfonts")
    os.makedirs(dst_fonts, exist_ok=True)
    for name in sorted(os.listdir(src_fonts)):
        if name.endswith(".woff2"):
            shutil.copyfile(os.path.join(src_fonts, name), os.path.join(dst_fonts, name))
    fonts = open(os.path.join(ROOT, "assets", "css", "fonts.css"), encoding="utf-8").read()
    fonts = fonts.replace("url(../fonts/", "url(../webfonts/")
    with open(os.path.join(d, "typographie.css"), "w", encoding="utf-8") as f:
        f.write(fonts)
    print("wrote assets/css/styles.css + typographie.css + webfonts/")

# ==========================================================================
# Icônes
# ==========================================================================
ICONS = {
 "cross":   '<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z"/>',
 "mortar":  '<path d="M6 11h12a6 6 0 01-6 6 6 6 0 01-6-6z"/><path d="M11 17v3h2v-3M14 10l5-6M19 4l1.5 1.5"/>',
 "flask":   '<path d="M9 3h6M10 3v6L5 19a2 2 0 002 2h10a2 2 0 002-2l-5-10V3"/><path d="M7.5 15h9"/>',
 "pill":    '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>',
 "dna":     '<path d="M7 3c0 5 10 5 10 10S7 18 7 21"/><path d="M17 3c0 5-10 5-10 10s10 5 10 8"/><path d="M8.5 7h7M8.5 17h7"/>',
 "growth":  '<path d="M3 17l6-6 4 4 8-8M21 7v6m0-6h-6"/>',
 "shield":  '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
 "coins":   '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3"/><path d="M9 12c0 1.7 2.7 3 6 3s6-1.3 6-3V9"/>',
 "retire":  '<path d="M4 21v-6a8 8 0 0116 0v6"/><circle cx="12" cy="6" r="3"/>',
 "globe":   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15 0 18M12 3c-2.5 2.7-2.5 15 0 18"/>',
 "chart":   '<path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-7M20 16v-3"/>',
 "treasury":'<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-7h6v7"/>',
 "puzzle":  '<path d="M10 4h4v3a2 2 0 104 0V4h2v6h-3a2 2 0 100 4h3v6h-6v-3a2 2 0 10-4 0v3H4v-6h3a2 2 0 100-4H4V4h6z"/>',
 "building":'<path d="M3 21h18M6 21V4h8v17M14 9h4v12M9 8h2M9 12h2M9 16h2"/>',
 "scale":   '<path d="M12 3v18M5 7h14M5 7l-3 6a3 3 0 006 0L5 7zm14 0l-3 6a3 3 0 006 0l-3-6zM8 21h8"/>',
 "concierge":'<path d="M4 18h16M5 18a7 7 0 0114 0M12 8V6m-2 0h4"/>',
 "pin":     '<path d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
 "mail":    '<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>',
 "phone":   '<path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
 "clock":   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 "leaf":    '<path d="M5 21c0-9 5-15 14-16-1 9-6 14-14 16zM5 21c2-5 5-8 9-10"/>',
 "lock":    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
 "doc":     '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9 12h7M9 16h7"/>',
 "compass": '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>',
 "family":  '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-2a5 5 0 015-5 5 5 0 015 5v2M15 20v-1.5a4 4 0 014-4 3 3 0 012 .6"/>',
 "gift":    '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9S9.5 3 7 5s5 4 5 4zM12 9s2.5-6 5-4-5 4-5 4z"/>',
 "handshake":'<path d="M8 12l3-3 3 3 3-3 3 3-6 6-3-3-3 3-3-3z"/><path d="M3 9l3-3h4M21 9l-3-3h-4"/>',
 "key":     '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v4M15 12v3"/>',
 "sun":     '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
 "euro":    '<path d="M17 6a7 7 0 100 12M4 10h9M4 14h9"/>',
 "bank":    '<path d="M3 10l9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18"/>',
 "target":  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
}
def icon(name, cls="tile__ico"):
    return ('<svg class="%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'
            % (cls, ICONS.get(name, ICONS["cross"])))
def arrow():
    return ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')

# ==========================================================================
# Navigation
# ==========================================================================
NAV = [
    ("Accueil", "index.html", None),
    ("Votre situation", "votre-situation.html", [
        ("Vous venez de vendre votre pharmacie", "vendre-sa-pharmacie.html"),
        ("Que faire du produit de la cession ?", "que-faire-apres-cession.html"),
        ("Fiscalité de la cession", "fiscalite-cession-officine.html"),
        ("Apport-cession et holding", "apport-cession-holding.html"),
        ("Préparer et compléter votre retraite", "retraite-pharmacien.html"),
        ("Vous créer des revenus complémentaires", "revenus-complementaires.html"),
        ("Transmettre à vos enfants", "transmission-pharmacien.html"),
        ("Que faire des murs de l'officine ?", "murs-officine.html"),
        ("Vous expatrier après la cession", "expatriation-pharmacien.html"),
    ]),
    ("Nos solutions", "nos-solutions.html", [
        ("Placements financiers", "placements-financiers.html"),
        ("Trésorerie de votre holding", "tresorerie-holding.html"),
        ("Private Equity et non coté", "private-equity.html"),
        ("Placements immobiliers", "placements-immobiliers.html"),
        ("Structuration juridique et fiscale", "structuration-juridique.html"),
        ("Family Office", "family-office.html"),
    ]),
    ("Le guide", "guide-cession-officine.html", None),
    ("Contact", "contact.html", None),
]

# ==========================================================================
# En-tête, pied de page, bandeau de contact
# ==========================================================================
def render_brand(mode="header"):
    light = (mode == "footer")
    if light:
        imgs = '<img class="brand__logo" src="assets/img/logo-light.png" alt="%s">' % html.escape(BRAND)
    else:
        imgs = ('<img class="brand__logo brand__logo--dark" src="assets/img/logo.png" alt="%s">'
                '<img class="brand__logo brand__logo--light" src="assets/img/logo-light.png" alt="" aria-hidden="true">'
                % html.escape(BRAND))
    return ('<a class="brand brand--img" href="index.html" aria-label="%s · accueil">%s'
            '<span class="endorse">%s</span></a>'
            % (html.escape(BRAND), imgs, ENDORSEMENT))

def render_header():
    items = []
    for label, href, children in NAV:
        if children:
            links = "".join('<a href="%s">%s</a>' % (h, html.escape(t)) for t, h in children)
            items.append(
              '<li class="nav__item has-dropdown">'
                '<a class="nav__link" href="%s" aria-haspopup="true" aria-expanded="false">%s'
                  '<svg class="nav__caret" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 4l4 4 4-4"/></svg>'
                '</a><div class="dropdown" role="menu">%s</div></li>'
              % (href, html.escape(label), links))
        else:
            items.append('<li class="nav__item"><a class="nav__link" href="%s">%s</a></li>'
                         % (href, html.escape(label)))
    return (
      '<header class="site-header"><div class="container">' + render_brand() +
        '<nav class="nav" aria-label="Navigation principale">'
          '<ul style="display:contents;list-style:none;margin:0;padding:0">%s</ul>'
          '<div class="nav__cta"><a class="btn btn--ghost-light" href="contact.html">Rendez-vous</a></div>'
        '</nav>'
        '<button class="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false"><span></span><span></span><span></span></button>'
      '</div></header>' % "".join(items))

def cta_band(title="Parlons du produit de votre cession",
             text="Un premier échange confidentiel avec un conseiller qui connaît le métier de pharmacien titulaire, "
                  "sans engagement et sans frais."):
    return (
      '<section class="cta-band section--tight"><div class="container">'
        '<div data-reveal><p class="eyebrow eyebrow--light">Un échange confidentiel</p>'
        '<h2>%s</h2><p>%s</p></div>'
        '<div class="cta-band__actions" data-reveal data-delay="1">'
          '<a class="btn btn--light" href="contact.html">Demander un rendez-vous %s</a>'
          '<a class="btn btn--ghost-light" href="mailto:%s">%s</a>'
        '</div></div></section>'
      % (html.escape(title), html.escape(text), arrow(), EMAIL, EMAIL))

def render_footer():
    def col(title, links):
        ls = "".join('<li><a href="%s">%s</a></li>' % (h, html.escape(t)) for t, h in links)
        return '<div><h5>%s</h5><ul class="footer-links">%s</ul></div>' % (title, ls)
    situation = NAV[1][2][:5]
    solutions = NAV[2][2][:5]
    return (
      '<footer class="site-footer"><div class="container"><div class="footer-grid">'
        '<div>' + render_brand(mode="footer") +
          '<p style="max-width:36ch;font-size:.95rem;margin-top:14px">Le conseil patrimonial des pharmaciens '
          'titulaires qui cèdent leur officine : structurer, placer et transmettre le produit de la cession.</p></div>'
        + col("Votre situation", situation)
        + col("Nos solutions", solutions)
        + '<div class="footer-contact"><h5>Nous contacter</h5><p>%s</p>'
            '<p><a href="mailto:%s">%s</a></p>'
            '<p style="margin-top:16px"><a class="link-arrow" href="contact.html">Prendre rendez-vous %s</a></p></div>'
        '</div>'
        '<p class="disclaimer">%s est une marque de %s, cabinet de gestion privée et de placement de trésorerie. '
        'Les informations présentées sur ce site ont une vocation strictement informative et ne constituent ni un conseil '
        'en investissement, ni un conseil juridique ou fiscal, ni une sollicitation, ni une offre de souscription. Les '
        'montants, seuils et régimes fiscaux cités sont donnés à titre indicatif et doivent être vérifiés à la date de '
        'votre opération avec vos conseils. Les performances passées ne préjugent pas des performances futures. Tout '
        'investissement comporte des risques, notamment de perte en capital et d’illiquidité. La fiscalité dépend de la '
        'situation individuelle de chaque client et est susceptible d’évoluer.</p>'
        '<div class="footer-bottom">'
          '<span>© <span id="year">%s</span> %s — %s. Tous droits réservés.</span>'
          '<span><a href="mentions-legales.html">Mentions légales</a> &nbsp;·&nbsp; '
          '<a href="contact.html">Contact</a> &nbsp;·&nbsp; '
          '<a href="https://www.lafinancierederochechouart.com" rel="noopener">%s</a></span>'
        '</div></div></footer>'
      % (ADDRESS, EMAIL, EMAIL, arrow(), BRAND, PARENT,
         datetime.date.today().year, BRAND, ENDORSEMENT, PARENT))

# ==========================================================================
# Gabarit + référencement
# ==========================================================================
LAYOUT = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<meta name="keywords" content="__KEYWORDS__">
<meta name="author" content="Officine &amp; Patrimoine — La Financière de Rochechouart">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="__CANON__">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Officine &amp; Patrimoine">
<meta property="og:title" content="__TITLE__">
<meta property="og:description" content="__DESC__">
<meta property="og:url" content="__CANON__">
<meta property="og:image" content="__OG__">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="__TITLE__">
<meta name="twitter:description" content="__DESC__">
<meta name="twitter:image" content="__OG__">
<meta name="theme-color" content="#06322B">
<link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="assets/img/favicon-16.png">
<link rel="icon" href="assets/img/favicon.png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="assets/css/typographie.css">
<link rel="stylesheet" href="assets/css/styles.css">
__JSONLD__
</head>
<body__BODYCLASS__>
__HEADER__
<main>
__BODY__
</main>
__FOOTER__
<script src="../assets/js/main.js"></script>
</body>
</html>
"""

ORG_JSONLD = """{
  "@context": "https://schema.org",
  "@type": "FinancialService",
  "name": "Officine & Patrimoine",
  "alternateName": "Officine et Patrimoine — La Financière de Rochechouart",
  "description": "Conseil en gestion de patrimoine pour les pharmaciens titulaires qui cèdent leur officine : fiscalité de la cession, apport-cession, holding, placement et transmission du produit de la vente.",
  "parentOrganization": { "@type": "Organization", "name": "La Financière de Rochechouart" },
  "url": "%s/",
  "logo": "%s/assets/img/logo.png",
  "image": "%s/assets/img/og-officine-patrimoine.jpg",
  "email": "%s",
  "areaServed": "FR",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "58 rue de Monceau",
    "postalCode": "75008",
    "addressLocality": "Paris",
    "addressCountry": "FR"
  },
  "knowsAbout": [
    "cession d'officine", "vente de pharmacie", "plus-value professionnelle",
    "apport-cession 150-0 B ter", "holding de pharmacien", "SPFPL",
    "retraite des pharmaciens", "CAVP", "assurance-vie luxembourgeoise",
    "contrat de capitalisation", "SCPI", "private equity", "transmission de patrimoine"
  ],
  "serviceType": [
    "Conseil en investissements financiers",
    "Gestion de patrimoine",
    "Placement de trésorerie d'entreprise"
  ]
}"""

PAGES = []          # (slug, title, desc, priority) pour le plan du site

def jsonld_block(objs):
    return "".join('<script type="application/ld+json">%s</script>\n' % o for o in objs)

def breadcrumb_jsonld(crumbs):
    items = []
    pos = 1
    for label, href in crumbs:
        it = '{"@type":"ListItem","position":%d,"name":"%s"' % (pos, label.replace('"', "'"))
        if href:
            it += ',"item":"%s/%s"' % (SITE_URL, href)
        items.append(it + "}")
        pos += 1
    return ('{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[%s]}'
            % ",".join(items))

def faq_jsonld(items):
    qs = []
    for q, a in items:
        txt = re.sub(r"<[^>]+>", "", a).replace('"', "'").strip()
        qs.append('{"@type":"Question","name":"%s","acceptedAnswer":{"@type":"Answer","text":"%s"}}'
                  % (q.replace('"', "'"), txt))
    return '{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[%s]}' % ",".join(qs)

def page(slug, title, desc, body, keywords="", home=False, jsonld=None, priority="0.7",
         full_title=None):
    objs = [ORG_JSONLD % (SITE_URL, SITE_URL, SITE_URL, EMAIL)] if home else []
    objs += (jsonld or [])
    out = (LAYOUT
           .replace("__TITLE__", html.escape(full_title or ("%s · %s" % (title, BRAND))))
           .replace("__DESC__", html.escape(desc))
           .replace("__KEYWORDS__", html.escape(keywords))
           .replace("__CANON__", "%s/%s" % (SITE_URL, "" if home else slug))
           .replace("__OG__", "%s/assets/img/og-officine-patrimoine.jpg" % SITE_URL)
           .replace("__JSONLD__", jsonld_block(objs))
           .replace("__BODYCLASS__", ' class="home"' if home else "")
           .replace("__HEADER__", render_header())
           .replace("__FOOTER__", render_footer())
           .replace("__BODY__", body))
    with open(os.path.join(OUT, slug), "w", encoding="utf-8") as f:
        f.write(out)
    PAGES.append((slug, priority))
    print("wrote pharmaciens/" + slug)

# ==========================================================================
# Blocs réutilisables
# ==========================================================================
def section(inner, cls="section"):
    return '<section class="%s"><div class="container">%s</div></section>' % (cls, inner)

def page_hero(title, intro, crumbs):
    items = []
    for i, (t, h) in enumerate(crumbs):
        items.append('<a href="%s">%s</a>' % (h, html.escape(t)) if h
                     else '<span style="color:#fff;opacity:.95">%s</span>' % html.escape(t))
        if i < len(crumbs) - 1:
            items.append("<span>/</span>")
    return ('<section class="page-hero"><div class="container"><div class="page-hero__inner">'
            '<nav class="breadcrumb" aria-label="Fil d’Ariane">%s</nav>'
            '<h1 data-reveal>%s</h1>'
            '<p class="lede" data-reveal data-delay="1" style="margin-top:18px">%s</p>'
            '</div></div></section>' % ("".join(items), html.escape(title), intro))

def sec_head(eyebrow, title, lede=None, center=False):
    cls = "center" if center else ""
    st = ' style="max-width:760px;margin-inline:auto"' if center else ' style="max-width:860px"'
    h = ('<div class="%s"%s data-reveal><p class="eyebrow">%s</p><h2 class="title-lg">%s</h2><hr class="rule">'
         % (cls, st, eyebrow, title))
    if lede:
        h += '<p class="lede">%s</p>' % lede
    return h + "</div>"

def feature_row(img, alt, eyebrow, title, paragraphs, rev=False, checklist=None):
    ps = "".join("<p>%s</p>" % p for p in paragraphs)
    chk = ""
    if checklist:
        chk = ('<ul class="checklist" style="margin-top:26px">%s</ul>'
               % "".join("<li>%s</li>" % c for c in checklist))
    return ('<div class="%s">'
            '<div class="feature-row__media" data-reveal><div class="media-frame">'
            '<img src="assets/img/%s" alt="%s" loading="lazy"></div></div>'
            '<div data-reveal data-delay="1"><p class="eyebrow">%s</p><h2 class="title-md">%s</h2>'
            '<hr class="rule">%s%s</div></div>'
            % ("feature-row feature-row--rev" if rev else "feature-row",
               img, html.escape(alt), eyebrow, html.escape(title), ps, chk))

def tiles(items, dark_first=False):
    cards = []
    for i, item in enumerate(items):
        ic, title, text = item[0], item[1], item[2]
        href = item[3] if len(item) > 3 else None
        dark = " tile--dark" if (dark_first and i == 0) else ""
        inner = "%s<h3>%s</h3><p>%s</p>" % (icon(ic), html.escape(title), text)
        delay = (i % 3) + 1
        if href:
            inner += '<span class="link-arrow">En savoir plus %s</span>' % arrow()
            cards.append('<a class="tile%s" href="%s" data-reveal data-delay="%d">%s</a>'
                         % (dark, href, delay, inner))
        else:
            cards.append('<div class="tile%s" data-reveal data-delay="%d">%s</div>' % (dark, delay, inner))
    return "".join(cards)

def accordion(items):
    rows = "".join(
        '<div class="acc__item"><button class="acc__btn" aria-expanded="false"><span>%s</span>'
        '<span class="acc__sign" aria-hidden="true"></span></button>'
        '<div class="acc__panel"><div class="acc__panel-inner">%s</div></div></div>'
        % (html.escape(q), a) for q, a in items)
    return '<div class="accordion">%s</div>' % rows

def faq_section(eyebrow, title, items, cls="section band-cream"):
    return section(sec_head(eyebrow, title, center=True)
                   + '<div style="max-width:900px;margin:40px auto 0" data-reveal>%s</div>' % accordion(items),
                   cls=cls)

def note(title, paragraphs):
    return ('<div class="note" data-reveal><h4>%s</h4>%s</div>'
            % (title, "".join("<p>%s</p>" % p for p in paragraphs)))

def figures(items, light=False):
    return ('<div class="figures" data-reveal>%s</div>'
            % "".join("<div class='figure'><b>%s</b><span>%s</span></div>" % (n, l) for n, l in items))

def steps(items):
    return ('<div class="steps" data-reveal>%s</div>'
            % "".join('<div class="step"><div class="step__n"></div><div><h3>%s</h3><p>%s</p></div></div>'
                      % (html.escape(t), d) for t, d in items))

def ptable(headers, rows):
    th = "".join("<th>%s</th>" % h for h in headers)
    tr = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % c for c in r) for r in rows)
    return ('<div class="table-wrap" data-reveal><table class="ptable"><thead><tr>%s</tr></thead>'
            '<tbody>%s</tbody></table></div>' % (th, tr))

def keyword_cloud(words, eyebrow="Recherches fréquentes"):
    return ('<p class="eyebrow" data-reveal>%s</p><div class="kw" data-reveal>%s</div>'
            % (eyebrow, "".join("<span>%s</span>" % html.escape(w) for w in words)))

def linkgrid(links):
    return ('<div class="linkgrid" data-reveal>%s</div>'
            % "".join('<a href="%s">%s</a>' % (h, html.escape(t)) for t, h in links))

def related(links, eyebrow="À explorer aussi"):
    rl = "".join('<a class="link-arrow" href="%s" style="margin:0 28px 12px 0">%s %s</a>'
                 % (h, html.escape(t), arrow()) for t, h in links)
    return section('<p class="eyebrow" data-reveal>%s</p>'
                   '<div style="margin-top:18px;display:flex;flex-wrap:wrap" data-reveal>%s</div>'
                   % (eyebrow, rl), cls="section--tight")

def quote_band(text):
    return section('<div class="quote" data-reveal><p>« %s »</p><cite>%s</cite></div>'
                   % (text, BRAND), cls="section--tight band-dark")

def checklist(items, light=False):
    cls = "checklist checklist--light" if light else "checklist"
    return '<ul class="%s" data-reveal>%s</ul>' % (cls, "".join("<li>%s</li>" % i for i in items))

def two_col_checklist(items):
    n = (len(items) + 1) // 2
    return ('<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
            '<ul class="checklist">%s</ul><ul class="checklist">%s</ul></div>'
            % ("".join("<li>%s</li>" % i for i in items[:n]),
               "".join("<li>%s</li>" % i for i in items[n:])))

# ==========================================================================
# Blocs de contenu déclaratifs (utilisés par les pages de détail)
# ==========================================================================
def render_block(b):
    kind = b[0]
    if kind == "checklist":
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>%s'
                % (b[1], two_col_checklist(b[2])))
    if kind == "cards":
        g = "grid-4" if len(b[2]) == 4 else "grid-3"
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div class="grid %s" style="margin-top:24px">%s</div>' % (b[1], g, tiles(b[2])))
    if kind == "text":
        return (('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>' % b[1])
                + "".join('<p class="muted" style="max-width:76ch" data-reveal>%s</p>' % p for p in b[2]))
    if kind == "table":
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div style="margin-top:20px">%s</div>' % (b[1], ptable(b[2], b[3])))
    if kind == "note":
        return note(b[1], b[2])
    if kind == "figures":
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div style="margin-top:24px">%s</div>' % (b[1], figures(b[2])))
    if kind == "steps":
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div style="margin-top:14px">%s</div>' % (b[1], steps(b[2])))
    if kind == "tags":
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div class="tags" style="margin-top:16px" data-reveal>%s</div>'
                % (b[1], "".join('<span class="tag">%s</span>' % html.escape(t) for t in b[2])))
    return ""

def detail_page(slug, d):
    crumbs = [("Accueil", "index.html")] + ([d["parent"]] if d.get("parent") else []) + [(d["title"], None)]
    body = page_hero(d["title"], d["lede"], crumbs)
    body += section(feature_row(d["img"], d["alt"], d.get("eyebrow", "En bref"), d["subtitle"],
                                d["paras"], rev=True, checklist=d.get("atouts")))
    if d.get("blocks"):
        body += section(sec_head(d.get("blocks_eyebrow", "Dans le détail"), d["blocks_title"])
                        + "".join(render_block(b) for b in d["blocks"]), cls="section band-cream")
    if d.get("quote"):
        body += quote_band(d["quote"])
    jl = [breadcrumb_jsonld(crumbs)]
    if d.get("faq"):
        body += faq_section("Questions fréquentes", d.get("faq_title", "Vos questions"), d["faq"],
                            cls="section")
        jl.append(faq_jsonld(d["faq"]))
    if d.get("kw_cloud"):
        body += section(keyword_cloud(d["kw_cloud"]), cls="section--tight band-sand")
    if d.get("related"):
        body += related(d["related"])
    body += cta_band()
    page(slug, d["title"], d["desc"], body, keywords=d["kw"], jsonld=jl,
         priority=d.get("priority", "0.7"), full_title=d.get("full_title"))

# ==========================================================================
# VOTRE SITUATION — pages
# ==========================================================================
P_SIT = ("Votre situation", "votre-situation.html")
P_SOL = ("Nos solutions", "nos-solutions.html")

SITUATION = {

# --------------------------------------------------------------------------
"vendre-sa-pharmacie.html": dict(
  parent=P_SIT, priority="0.9",
  title="Vous venez de vendre votre pharmacie",
  full_title="Vous venez de vendre votre pharmacie : les 12 premiers mois · Officine & Patrimoine",
  lede="La vente de votre officine est signée. Les douze mois qui suivent déterminent la fiscalité que vous "
       "paierez, les revenus que vous percevrez et ce que vous transmettrez. Voici l’ordre dans lequel prendre "
       "les décisions.",
  desc="Vous venez de vendre votre pharmacie : le calendrier des 12 premiers mois, les délais fiscaux à ne pas manquer et l'ordre dans lequel décider.",
  kw="vendre sa pharmacie, vente officine que faire, j'ai vendu ma pharmacie, cession officine capital, "
     "placer argent vente pharmacie, pharmacien vient de vendre, après la vente de l'officine, "
     "conseil patrimonial pharmacien, gestion de patrimoine pharmacien titulaire",
  img="officine-geste.jpg", alt="Main d’une pharmacienne saisissant une boîte de médicament sur un rayonnage",
  eyebrow="Le moment charnière",
  subtitle="Un capital qui ne se reconstituera pas",
  paras=[
    "Une officine se vend une fois. Le produit de la cession représente, pour la plupart des titulaires, "
    "l’essentiel du patrimoine constitué en trente ans d’exercice : il doit financer la retraite, parfois "
    "celle du conjoint, soutenir les enfants et, souvent, se transmettre. Aucune erreur de structuration ne "
    "se rattrape par un surcroît d’épargne : l’activité qui produisait les revenus a été cédée.",
    "Dans les semaines qui suivent la signature, le capital arrive sur un compte courant — personnel ou de "
    "société — et commence à se déprécier silencieusement sous l’effet de l’inflation. Dans le même temps "
    "courent des délais fiscaux courts et irréversibles : option pour un régime d’exonération, remploi du "
    "produit d’apport-cession, liquidation des droits à la retraite, choix entre prélèvement forfaitaire et "
    "barème progressif.",
    "Notre rôle est de remettre ces décisions dans le bon ordre, avant que les options ne se ferment, puis de "
    "construire une allocation qui corresponde à votre horizon, à vos besoins de revenus et à votre tolérance "
    "au risque — pas à un catalogue de produits.",
  ],
  atouts=[
    "Un interlocuteur qui connaît la cession d’officine : fonds, titres de SEL, murs en SCI",
    "Une coordination avec votre expert-comptable, votre avocat et votre notaire",
    "Une allocation sur-mesure, en architecture ouverte, sans produit maison",
    "Une lecture claire de ce que vous pouvez dépenser, bloquer et transmettre",
  ],
  blocks_title="Le calendrier des douze premiers mois",
  blocks_eyebrow="Méthode",
  blocks=[
    ("steps", "Dans quel ordre décider", [
      ("Sécuriser le cash et vérifier les délais fiscaux",
       "Avant tout placement : identifier les régimes d’exonération encore ouverts, les délais de remploi "
       "et la date butoir de liquidation de vos droits à la retraite. Le capital reste disponible, placé sur "
       "des supports de trésorerie liquides le temps de l’arbitrage."),
      ("Établir le bilan patrimonial complet",
       "Patrimoine privé, murs de l’officine, holding éventuelle, crédits en cours, régime matrimonial, "
       "situation des enfants, besoin de revenus net d’impôt. C’est ce document, et non un rendement affiché, "
       "qui détermine l’allocation."),
      ("Arrêter la structure de détention",
       "Détenir en direct, via une holding à l’impôt sur les sociétés, via un contrat d’assurance-vie ou de "
       "capitalisation : le choix modifie la fiscalité des revenus, la transmission et la liquidité. Il se "
       "fait avant d’investir, pas après."),
      ("Déployer l’allocation par poches",
       "Poche de sécurité et de revenus, poche de rendement, poche longue (non coté, immobilier), poche de "
       "transmission. Chaque poche a son horizon, sa fiscalité et son enveloppe."),
      ("Organiser la transmission",
       "Donations, démembrement, clauses bénéficiaires, pacte successoral : traitées tôt, elles coûtent peu "
       "et protègent le conjoint. Traitées tard, elles coûtent la fiscalité successorale pleine."),
      ("Piloter dans la durée",
       "Point semestriel, arbitrages, adaptation aux évolutions fiscales et à vos projets. Un patrimoine de "
       "cession se gère, il ne se range pas."),
    ]),
    ("note", "Les délais à ne pas manquer", [
      "Plusieurs dispositifs applicables aux cessions d’officine sont conditionnés à des délais stricts : "
      "cessation des fonctions et liquidation des droits à la retraite dans un délai encadré autour de la "
      "cession pour les régimes de faveur « départ à la retraite » ; remploi d’une fraction du produit de "
      "cession dans un délai de deux ans en cas d’apport-cession.",
      "Ces conditions et leurs seuils évoluent avec chaque loi de finances. Elles doivent être vérifiées à la "
      "date de votre opération avec votre expert-comptable et votre avocat fiscaliste.",
    ]),
    ("cards", "Les quatre questions que l’on nous pose en premier", [
      ("euro", "Combien vais-je réellement toucher ?",
       "Le net après impôt dépend du mode de cession (fonds ou titres), des exonérations applicables et de "
       "votre date de départ à la retraite."),
      ("shield", "Puis-je perdre ce capital ?",
       "Une allocation construite par poches, avec une poche de sécurité dimensionnée sur vos dépenses, "
       "protège votre train de vie des à-coups de marché."),
      ("coins", "Quels revenus mensuels puis-je en tirer ?",
       "Les retraits programmés d’un contrat, les coupons obligataires et les revenus immobiliers permettent "
       "un complément régulier et fiscalement optimisé."),
      ("family", "Comment protéger mon conjoint et mes enfants ?",
       "Régime matrimonial, clause bénéficiaire, donations et démembrement se décident ensemble, pas "
       "séparément."),
    ]),
  ],
  quote="Un pharmacien ne vend pas une entreprise : il vend trente ans de garde, de conseil et de confiance. "
        "Le capital qui en sort mérite la même rigueur.",
  faq_title="Vos premières questions",
  faq=[
    ("Faut-il placer tout de suite le produit de la cession ?",
     "Non. Il faut d’abord sécuriser le capital sur des supports liquides — comptes à terme, fonds monétaires, "
     "fonds en euros — le temps d’établir le bilan patrimonial et de vérifier les options fiscales. Investir "
     "avant d’avoir arrêté la structure de détention conduit souvent à défaire ce qui vient d’être fait, avec "
     "des frais à chaque étape."),
    ("Dois-je créer une holding après la vente ?",
     "Si la cession est déjà intervenue en direct, la holding perd une grande partie de son intérêt : le "
     "report d’imposition de l’apport-cession suppose un apport <em>avant</em> la vente. Une société "
     "patrimoniale peut toutefois rester pertinente pour loger des actifs de rendement et préparer la "
     "transmission. C’est une question de situation, pas de principe."),
    ("Mon expert-comptable suffit-il ?",
     "Votre expert-comptable maîtrise la fiscalité de l’opération ; il n’a généralement ni la mission ni les "
     "moyens de construire l’allocation du capital sur vingt ans. Nous travaillons en complémentarité, avec "
     "lui et avec votre notaire, sans nous substituer à eux."),
    ("Combien de temps faut-il pour tout mettre en place ?",
     "Comptez quatre à huit semaines entre le premier rendez-vous et le déploiement de l’allocation : bilan "
     "patrimonial, préconisations écrites, choix des enveloppes, souscriptions. Les sujets de transmission "
     "s’organisent ensuite, dans les mois qui suivent."),
  ],
  kw_cloud=[
    "je viens de vendre ma pharmacie que faire", "placement après vente officine",
    "pharmacien titulaire cession conseil", "que faire de 1 million après vente pharmacie",
    "réinvestir le produit de la vente d'une officine", "gestion de patrimoine pharmacien retraité",
    "cession officine fiscalité 2026", "conseiller financier pharmacien",
  ],
  related=[("Que faire du produit de la cession ?", "que-faire-apres-cession.html"),
           ("Fiscalité de la cession", "fiscalite-cession-officine.html"),
           ("Préparer votre retraite", "retraite-pharmacien.html"),
           ("Le guide de la cession", "guide-cession-officine.html")],
),

# --------------------------------------------------------------------------
"que-faire-apres-cession.html": dict(
  parent=P_SIT, priority="0.9",
  title="Que faire du produit de la cession ?",
  full_title="Que faire de l'argent de la vente de sa pharmacie ? · Officine & Patrimoine",
  lede="Placer le produit de la vente d’une officine n’est pas choisir un placement : c’est répartir un capital "
       "entre des poches qui n’ont ni le même horizon, ni la même fiscalité, ni le même risque.",
  desc="Que faire de l'argent de la vente de votre pharmacie ? Allocation par poches : sécurité, revenus, croissance, non coté et transmission.",
  kw="que faire argent vente pharmacie, placer le produit de la cession officine, investir après vente "
     "pharmacie, allocation capital pharmacien, placement 1 million euros pharmacien, réinvestir cession "
     "officine, meilleur placement après cession entreprise",
  img="capitalisation.jpg", alt="Courbe de capitalisation sur fond vert officine",
  eyebrow="Méthode",
  subtitle="Quatre poches, quatre horizons",
  paras=[
    "La première erreur consiste à chercher « le bon placement ». Il n’y en a pas : il y a un capital à "
    "répartir entre des usages différents. La seconde erreur consiste à tout sécuriser — un capital intégralement "
    "placé en fonds en euros ou sur un compte à terme perd du pouvoir d’achat dès que l’inflation dépasse son "
    "rendement net.",
    "Nous raisonnons par poches. Chaque euro reçoit un horizon et une mission : payer les dépenses des "
    "prochaines années, produire un revenu régulier, faire croître le capital, ou préparer la transmission. "
    "L’allocation découle de cette répartition, et non l’inverse.",
    "La taille de chaque poche dépend de votre âge, de votre besoin de revenus net d’impôt, de vos autres "
    "sources (pension, loyers, revenus du conjoint), de vos projets et de ce que vous souhaitez transmettre. "
    "Deux pharmaciens ayant cédé au même prix n’ont presque jamais la même allocation.",
  ],
  atouts=[
    "Une allocation chiffrée, avec le revenu net annuel qu’elle permet de servir",
    "Des enveloppes choisies pour leur fiscalité, pas pour leur commission",
    "Une architecture ouverte : plusieurs assureurs, plusieurs sociétés de gestion",
    "Un suivi semestriel et des arbitrages documentés",
  ],
  blocks_title="Comment répartir le capital",
  blocks=[
    ("cards", "Les quatre poches", [
      ("lock", "Sécurité et liquidité",
       "Deux à cinq ans de dépenses, disponibles sans risque de perte : comptes à terme, fonds monétaires, "
       "fonds en euros. C’est la poche qui vous évite de vendre au mauvais moment."),
      ("coins", "Revenus réguliers",
       "Obligations datées, fonds obligataires, SCPI, produits structurés à coupon : la poche qui remplace, "
       "mois après mois, le revenu de l’officine."),
      ("growth", "Croissance",
       "Actions internationales en gestion pilotée ou sous mandat, au sein d’un contrat d’assurance-vie ou "
       "d’un compte-titres : la poche qui protège le capital de l’inflation sur dix ans et plus."),
      ("puzzle", "Non coté et actifs réels",
       "Private equity, dette privée, club deals immobiliers : une poche minoritaire, illiquide, visant une "
       "prime de rendement sur huit à dix ans."),
    ]),
    ("table", "Quelle enveloppe pour quel usage", ["Enveloppe", "Usage principal", "Points d’attention"],
     [["Assurance-vie", "Revenus programmés, croissance, transmission hors succession dans les limites légales",
       "Fiscalité allégée après 8 ans ; qualité du fonds en euros et de la gamme d’unités de compte"],
      ["Contrat de capitalisation", "Même moteur financier, mais transmissible et démembrable",
       "Entre dans la succession ; pertinent en donation de la nue-propriété aux enfants"],
      ["Compte-titres", "Liberté totale de supports, obligations en direct, titres vifs",
       "Fiscalité au fil de l’eau (prélèvement forfaitaire unique ou barème)"],
      ["PEA", "Actions européennes, capitalisation à fiscalité réduite après 5 ans",
       "Plafond de versement ; univers d’investissement restreint"],
      ["Société patrimoniale (IS)", "Capitalisation de longue durée, immobilier, transmission des titres",
       "Imposition à l’impôt sur les sociétés ; sortie des liquidités fiscalisée"],
      ["SCPI et immobilier", "Revenus récurrents, adossement à des actifs réels",
       "Liquidité réduite, frais d’entrée, fiscalité des revenus fonciers"]]),
    ("note", "Un ordre de grandeur, pas une règle", [
      "Pour un titulaire de 60 ans sans autre revenu immédiat, une répartition de départ fréquente combine une "
      "poche de sécurité couvrant trois à cinq années de dépenses, une poche de revenus majoritaire et une "
      "poche de croissance significative, le non coté restant minoritaire.",
      "Ces proportions n’ont de sens qu’après analyse de votre situation : elles sont données pour illustrer "
      "la méthode, non pour servir de recommandation.",
    ]),
    ("checklist", "Ce que nous vérifions avant d’investir", [
      "Le revenu net annuel dont vous avez besoin, charges et impôts compris",
      "La date effective de liquidation de vos droits à la retraite",
      "L’existence d’une holding et le sort des liquidités qu’elle détient",
      "Le régime matrimonial et la protection du conjoint survivant",
      "Les crédits en cours et les cautions encore vivantes",
      "Le sort des murs de l’officine et de la SCI qui les détient",
      "Les clauses bénéficiaires des contrats existants",
      "Votre tolérance réelle à une baisse temporaire de la valorisation",
    ]),
  ],
  quote="On ne place pas un capital de cession comme une épargne mensuelle : il n’y aura pas de versement "
        "suivant pour corriger une erreur de départ.",
  faq=[
    ("Faut-il tout mettre en assurance-vie ?",
     "Non. L’assurance-vie est une enveloppe remarquable pour les revenus programmés et la transmission, mais "
     "elle ne couvre pas tous les besoins : un compte-titres reste nécessaire pour certaines obligations en "
     "direct, une société patrimoniale pour capitaliser à l’impôt sur les sociétés, l’immobilier pour "
     "l’adossement à des actifs réels. La répartition entre enveloppes fait partie du conseil."),
    ("Quel rendement viser après la vente d’une officine ?",
     "La bonne question n’est pas le rendement cible mais le revenu net nécessaire et le risque acceptable "
     "pour l’obtenir. Une allocation prudente servant un revenu régulier suffisant vaut mieux qu’une "
     "allocation performante qui vous empêche de dormir et que vous arbitrerez au plus mauvais moment."),
    ("Puis-je conserver une partie en liquidités ?",
     "Oui, et c’est même souhaitable : la poche de sécurité est le socle de l’allocation. Au-delà de deux à "
     "cinq années de dépenses, en revanche, les liquidités non rémunérées constituent une perte de pouvoir "
     "d’achat certaine."),
    ("Et si je veux racheter une officine ou investir dans une autre activité ?",
     "Cela change tout : le capital doit rester mobilisable, et le remploi peut présenter un intérêt fiscal "
     "majeur si vous avez réalisé un apport-cession. Dites-le dès le premier rendez-vous."),
  ],
  kw_cloud=[
    "placement argent vente pharmacie", "où placer 800 000 euros", "investir produit cession entreprise",
    "assurance-vie ou compte-titres après cession", "revenus complémentaires capital cession",
    "allocation d'actifs pharmacien", "placer 2 millions d'euros après cession",
  ],
  related=[("Placements financiers", "placements-financiers.html"),
           ("Vous créer des revenus complémentaires", "revenus-complementaires.html"),
           ("Trésorerie de votre holding", "tresorerie-holding.html"),
           ("Placements immobiliers", "placements-immobiliers.html")],
),

# --------------------------------------------------------------------------
"fiscalite-cession-officine.html": dict(
  parent=P_SIT, priority="0.9",
  title="Fiscalité de la cession de votre officine",
  full_title="Fiscalité de la cession d'une pharmacie : plus-value, exonérations, abattements · Officine & Patrimoine",
  lede="Vendre un fonds de commerce ou vendre les titres de sa société d’exercice n’a ni la même assiette, ni le "
       "même taux, ni les mêmes exonérations. C’est la première décision, et elle se prend avant la signature.",
  desc="Fiscalité de la cession d'officine : plus-value professionnelle, cession de parts de SEL, exonérations départ à la retraite et abattements.",
  kw="fiscalité cession officine, plus-value cession pharmacie, impôt vente pharmacie, exonération 238 "
     "quindecies, 151 septies A départ retraite, abattement 500 000 euros dirigeant, cession parts SEL "
     "pharmacie, flat tax cession officine, plus-value professionnelle pharmacien",
  img="ordonnance.jpg", alt="Acte de cession stylisé sur fond vert officine",
  eyebrow="Repères fiscaux",
  subtitle="Deux chemins, deux fiscalités",
  paras=[
    "La cession d’une officine prend l’une de deux formes. Soit vous cédez le <strong>fonds de commerce</strong> "
    "— la clientèle, le droit au bail, le matériel, le stock : la plus-value est alors une plus-value "
    "professionnelle, taxée dans la catégorie des bénéfices de l’entreprise, avec ses régimes d’exonération "
    "propres. Soit vous cédez les <strong>parts ou actions de la société d’exercice</strong> (SELARL, SELAS, "
    "SNC) : la plus-value est une plus-value de cession de valeurs mobilières, relevant du prélèvement "
    "forfaitaire unique ou, sur option, du barème progressif.",
    "Les acquéreurs, eux, préfèrent très souvent le rachat du fonds, qui leur permet d’amortir et évite de "
    "reprendre le passif. Le prix affiché n’a donc de sens qu’après avoir calculé le net vendeur dans chaque "
    "hypothèse — l’écart atteint fréquemment plusieurs dizaines de milliers d’euros.",
    "S’ajoutent des régimes de faveur qui dépendent moins du montant de la cession que de <em>votre</em> "
    "situation : valeur des éléments cédés, durée d’exercice, départ effectif à la retraite dans un délai "
    "encadré, maintien ou non d’une activité.",
  ],
  atouts=[
    "Un chiffrage du net vendeur dans chaque scénario, avant signature",
    "La coordination avec votre expert-comptable et votre avocat fiscaliste",
    "L’articulation entre fiscalité de la cession et fiscalité du réinvestissement",
    "La prise en compte des prélèvements sociaux et de la contribution sur les hauts revenus",
  ],
  blocks_title="Les régimes qui s’appliquent aux officines",
  blocks=[
    ("table", "Cession du fonds de commerce : les régimes d’exonération",
     ["Dispositif", "Logique", "Conditions principales"],
     [["Exonération en fonction de la valeur cédée<br><span class='muted'>art. 238 quindecies du CGI</span>",
       "Exonération totale sous un premier seuil de valeur des éléments cédés, puis dégressive jusqu’à un "
       "second seuil",
       "Activité exercée depuis au moins cinq ans ; cession à un repreneur indépendant ; seuils fixés par la "
       "loi de finances en vigueur"],
      ["Exonération en fonction des recettes<br><span class='muted'>art. 151 septies</span>",
       "Exonération totale ou partielle pour les plus petites structures",
       "Moyenne des recettes des deux années précédentes sous les seuils légaux ; cinq ans d’activité"],
      ["Départ à la retraite<br><span class='muted'>art. 151 septies A</span>",
       "Exonération d’impôt sur le revenu de la plus-value professionnelle, les prélèvements sociaux restant "
       "dus",
       "Cessation des fonctions et liquidation des droits à la retraite dans le délai légal encadrant la "
       "cession ; cinq ans d’activité ; absence de contrôle du cessionnaire"],
      ["Immeubles d’exploitation<br><span class='muted'>art. 151 septies B</span>",
       "Abattement sur la plus-value immobilière à long terme par année de détention au-delà de la cinquième",
       "Immeuble affecté à l’exploitation ; exonération totale atteinte après la durée de détention prévue"]]),
    ("table", "Cession des titres de la société d’exercice",
     ["Point", "Régime"],
     [["Taux de droit commun",
       "Prélèvement forfaitaire unique : impôt sur le revenu au taux forfaitaire majoré des prélèvements "
       "sociaux, soit 30 % au total en l’état actuel du droit"],
      ["Option pour le barème",
       "Possible, globale pour l’ensemble des revenus du capital de l’année ; pertinente surtout si des "
       "abattements pour durée de détention s’appliquent aux titres acquis avant 2018"],
      ["Abattement fixe « dirigeant partant à la retraite »<br><span class='muted'>art. 150-0 D ter</span>",
       "Abattement d’un montant forfaitaire sur la plus-value, sous conditions strictes de cessation des "
       "fonctions, de liquidation des droits à la retraite et de durée de détention ; non cumulable avec les "
       "abattements proportionnels"],
      ["Contribution exceptionnelle sur les hauts revenus",
       "Peut s’ajouter au-delà de certains seuils de revenu fiscal de référence, l’année de la cession"],
      ["Apport-cession<br><span class='muted'>art. 150-0 B ter</span>",
       "Report d’imposition de la plus-value d’apport si les titres sont apportés à une holding contrôlée "
       "avant la cession, avec obligation de remploi d’une fraction du prix si la holding cède rapidement"]]),
    ("note", "Les montants et les seuils ne figurent pas sur cette page", [
      "C’est volontaire. Les seuils d’exonération, le montant de l’abattement « dirigeant » et les taux sont "
      "modifiés par les lois de finances successives, parfois rétroactivement sur l’année en cours. Une page "
      "web qui les affiche est périmée avant d’être lue.",
      "Nous les chiffrons dans votre dossier, à la date de votre opération, et nous les faisons valider par "
      "votre conseil fiscal avant toute signature.",
    ]),
    ("checklist", "Ce qui change le résultat, souvent plus que le prix", [
      "La forme de la cession : fonds de commerce ou titres de société",
      "La date effective de cessation des fonctions et de liquidation de la retraite",
      "La durée d’exercice et la date d’acquisition des titres",
      "Le sort des murs, détenus en direct, en SCI à l’impôt sur le revenu ou à l’impôt sur les sociétés",
      "L’existence d’un compte courant d’associé à rembourser",
      "Un apport préalable des titres à une holding, et son calendrier",
      "Une donation réalisée avant la cession, purgeant la plus-value sur les titres donnés",
      "Le lieu de votre résidence fiscale l’année de la cession",
    ]),
  ],
  quote="La fiscalité d’une cession d’officine ne se discute pas le jour de la signature : elle se prépare "
        "douze à vingt-quatre mois avant.",
  faq=[
    ("Vaut-il mieux vendre le fonds ou les titres de la SEL ?",
     "Cela dépend de votre durée d’exercice, de la valeur du fonds, de votre date de départ à la retraite et "
     "de la position de l’acquéreur, qui a un intérêt fiscal opposé au vôtre. La seule méthode fiable consiste "
     "à chiffrer le net vendeur dans les deux hypothèses avant de négocier."),
    ("L’exonération « départ à la retraite » supprime-t-elle tout impôt ?",
     "Non. Les régimes de faveur liés au départ à la retraite portent sur l’impôt sur le revenu ; les "
     "prélèvements sociaux restent en principe dus sur la plus-value. Le gain reste considérable, mais le net "
     "n’est pas le prix de vente."),
    ("Puis-je continuer à travailler après avoir cédé ?",
     "Oui, mais attention : les régimes d’exonération liés au départ à la retraite supposent une cessation "
     "effective des fonctions dans l’entreprise cédée. Des remplacements ou une activité distincte sont "
     "généralement envisageables, dans le respect des règles de cumul emploi-retraite ; faites valider le "
     "montage avant de vous engager."),
    ("Que se passe-t-il si je donne des parts à mes enfants avant la vente ?",
     "La donation purge la plus-value latente sur les titres donnés : les enfants reçoivent les titres à leur "
     "valeur au jour de la donation et ne sont imposés que sur la plus-value ultérieure. Le dispositif est "
     "efficace mais surveillé : il suppose une donation réelle, antérieure et sans réappropriation du prix "
     "par le donateur."),
  ],
  kw_cloud=[
    "impôt sur la vente d'une pharmacie", "plus-value professionnelle officine",
    "exonération plus-value départ retraite pharmacien", "cession fonds de commerce pharmacie fiscalité",
    "vendre parts SELARL pharmacie impôt", "flat tax 30% cession titres",
    "abattement dirigeant retraite cession", "contribution exceptionnelle hauts revenus cession",
  ],
  related=[("Apport-cession et holding", "apport-cession-holding.html"),
           ("Donation avant cession", "donation-avant-cession.html"),
           ("Préparer votre retraite", "retraite-pharmacien.html"),
           ("Le guide de la cession", "guide-cession-officine.html")],
),

# --------------------------------------------------------------------------
"apport-cession-holding.html": dict(
  parent=P_SIT, priority="0.8",
  title="Apport-cession et holding de pharmacien",
  full_title="Apport-cession et holding pour un pharmacien : report d'imposition et remploi · Officine & Patrimoine",
  lede="Apporter les titres de sa société d’exercice à une holding avant de vendre permet de reporter "
       "l’imposition de la plus-value — à condition de respecter un calendrier et une obligation de remploi "
       "dont dépend tout le montage.",
  desc="Apport-cession 150-0 B ter pour un pharmacien : report d'imposition, holding, obligation de remploi et actifs éligibles.",
  kw="apport cession pharmacien, holding pharmacien, 150-0 B ter, report imposition cession officine, remploi "
     "60 pourcent, SPFPL pharmacien, holding patrimoniale après cession, réinvestissement économique éligible",
  img="molecule.jpg", alt="Réseau moléculaire, image de la structuration du capital",
  eyebrow="Structuration",
  subtitle="Reporter l’impôt pour réinvestir davantage",
  paras=[
    "Le mécanisme est simple dans son principe : avant de céder, vous apportez les titres de votre société "
    "d’exercice à une holding que vous contrôlez. L’apport dégage une plus-value, mais celle-ci est placée en "
    "<strong>report d’imposition</strong>. La holding vend ensuite les titres à leur valeur d’apport, sans "
    "nouvelle plus-value significative, et dispose du produit brut de cession pour réinvestir.",
    "L’avantage est mécanique : vous réinvestissez une somme qui n’a pas été amputée de l’impôt. Sur une "
    "cession importante, la différence de capital travaillant est substantielle, et elle se cumule année "
    "après année.",
    "La contrepartie est stricte. Si la holding cède les titres dans un délai court après l’apport, elle doit "
    "remployer une fraction majoritaire du prix de cession dans des activités économiques éligibles, dans un "
    "délai limité. À défaut, le report tombe et l’impôt devient exigible, majoré des intérêts de retard. Le "
    "dispositif n’est donc pas un outil de placement libre : c’est un engagement.",
  ],
  atouts=[
    "Un chiffrage de l’écart de capital investi avec et sans apport préalable",
    "Une cartographie des actifs éligibles au remploi, et de ceux qui ne le sont pas",
    "Le calendrier précis des échéances, suivi dans la durée",
    "L’articulation avec la trésorerie de la holding et votre besoin de revenus personnels",
  ],
  blocks_title="Ce que le dispositif permet, et ce qu’il impose",
  blocks=[
    ("steps", "Le déroulé", [
      ("Constituer la holding",
       "Société à l’impôt sur les sociétés, contrôlée par vous, constituée avant l’apport. Sa forme (SAS, "
       "SARL) et sa gouvernance se choisissent en fonction de la transmission envisagée."),
      ("Apporter les titres avant toute promesse ferme",
       "L’apport doit précéder la cession et ne pas être artificiel : un apport conclu alors que la vente est "
       "déjà juridiquement engagée est requalifiable."),
      ("Céder les titres via la holding",
       "La holding vend à la valeur retenue lors de l’apport. Le produit entre dans la société, non sur votre "
       "compte personnel."),
      ("Remployer dans le délai légal",
       "Une fraction majoritaire du produit de cession doit être réinvestie dans des activités économiques "
       "éligibles si la cession intervient peu après l’apport. Le choix des supports est encadré."),
      ("Piloter la holding dans la durée",
       "Le solde non soumis à remploi est placé en trésorerie longue. Les distributions vers votre patrimoine "
       "privé sont fiscalisées : elles se planifient."),
    ]),
    ("cards", "Remploi : les grandes familles éligibles", [
      ("building", "Souscription au capital de sociétés opérationnelles",
       "Financement d’entreprises exerçant une activité commerciale, industrielle, artisanale, libérale ou "
       "agricole, directement ou via certains véhicules."),
      ("puzzle", "Fonds de capital-investissement éligibles",
       "Certains FPCI, FCPR et fonds professionnels respectant des quotas d’investissement définis par le "
       "texte, souvent utilisés pour atteindre le quota de remploi."),
      ("target", "Acquisition du contrôle d’une entreprise",
       "Rachat d’une société opérationnelle, le cas échéant dans le secteur de la santé, avec une direction "
       "effective."),
      ("doc", "Financement de moyens d’exploitation",
       "Acquisition de biens affectés à l’activité opérationnelle d’une société du groupe, dans les "
       "conditions prévues par le texte."),
    ]),
    ("note", "Ce qui n’est pas éligible", [
      "Les placements purement patrimoniaux ne remplissent pas l’obligation de remploi : contrats "
      "d’assurance-vie ou de capitalisation, comptes-titres investis en actions cotées, SCPI de rendement, "
      "immobilier locatif nu détenu passivement, trésorerie laissée sur des comptes à terme.",
      "Ces supports restent parfaitement utilisables pour la part du produit non soumise à remploi — c’est "
      "précisément le travail d’allocation que nous réalisons une fois le quota sécurisé.",
    ]),
    ("checklist", "Les écueils que nous voyons le plus souvent", [
      "Un apport réalisé trop tard, après l’engagement de vente",
      "Une holding constituée sans réflexion sur la transmission des titres",
      "Un quota de remploi calculé sur une base erronée",
      "Des souscriptions engagées hors délai, ou dans des véhicules non éligibles",
      "Une trésorerie de holding laissée non rémunérée pendant deux ans",
      "L’absence d’anticipation du besoin de revenus personnels du dirigeant",
      "Une confusion entre holding patrimoniale et société de participations financières de professions libérales",
      "Un suivi documentaire insuffisant en cas de contrôle",
    ]),
  ],
  quote="L’apport-cession n’efface pas l’impôt : il le diffère, en échange d’un engagement de réinvestissement "
        "qu’il faut être prêt à tenir.",
  faq=[
    ("Puis-je encore faire un apport-cession si j’ai déjà vendu ?",
     "Non. Le report d’imposition suppose un apport des titres <em>antérieur</em> à la cession. Une fois la "
     "vente intervenue en direct, l’impôt est dû ; une société patrimoniale peut rester utile pour la suite, "
     "mais sans effet de report."),
    ("La SPFPL est-elle la bonne structure ?",
     "La société de participations financières de professions libérales est conçue pour détenir des titres de "
     "sociétés d’exercice libéral : elle a son intérêt si vous conservez une participation dans une officine "
     "ou si vous accompagnez un repreneur. Pour un titulaire qui cède la totalité et réinvestit hors du "
     "secteur, une holding patrimoniale de droit commun est généralement plus adaptée."),
    ("Le remploi m’oblige-t-il à prendre des risques ?",
     "Les actifs éligibles sont, par construction, des actifs économiques : ils comportent un risque de perte "
     "en capital et une liquidité réduite. C’est la contrepartie du report. La sélection des véhicules, leur "
     "diversification et l’étalement des millésimes sont déterminants."),
    ("Que devient le report si je décède ?",
     "La transmission par décès des titres de la holding met en principe fin au report d’imposition sans "
     "exigibilité de l’impôt pour les héritiers, dans les conditions prévues par le texte. C’est un paramètre "
     "important de la stratégie de transmission, à examiner précisément avec votre notaire."),
  ],
  kw_cloud=[
    "apport cession officine", "holding pharmacien après vente", "report d'imposition 150-0 B ter",
    "remploi 60% cession", "FPCI éligible remploi", "SPFPL ou holding patrimoniale",
    "créer une holding avant de vendre sa pharmacie",
  ],
  related=[("Structuration juridique et fiscale", "structuration-juridique.html"),
           ("Trésorerie de votre holding", "tresorerie-holding.html"),
           ("Private Equity et non coté", "private-equity.html"),
           ("Fiscalité de la cession", "fiscalite-cession-officine.html")],
),
}

SITUATION.update({

# --------------------------------------------------------------------------
"retraite-pharmacien.html": dict(
  parent=P_SIT, priority="0.8",
  title="Préparer et compléter votre retraite",
  full_title="Retraite du pharmacien titulaire : CAVP, pension et revenus du capital · Officine & Patrimoine",
  lede="La pension d’un pharmacien titulaire couvre rarement le train de vie de fin de carrière. Le produit de "
       "la cession doit prendre le relais — avec une fiscalité et un rythme de retraits pensés pour durer "
       "trente ans.",
  desc="Retraite du pharmacien titulaire : régimes CAVP, cumul emploi-retraite et revenus tirés du produit de la cession de l'officine.",
  kw="retraite pharmacien titulaire, CAVP retraite pharmacien, pension pharmacien, taux de remplacement "
     "pharmacien, revenu complémentaire retraite pharmacien, cumul emploi retraite pharmacien, PER pharmacien, "
     "retraite après vente officine",
  img="retraite.jpg", alt="Allée bordée d’arbres, évocation du temps retrouvé",
  eyebrow="Retraite",
  subtitle="Du revenu d’exploitation au revenu de patrimoine",
  paras=[
    "Pendant trente ans, votre revenu venait de l’officine. Après la cession, il vient de trois sources : la "
    "pension servie par vos régimes obligatoires, les éventuels loyers des murs, et le capital issu de la "
    "vente. L’équilibre entre ces trois sources détermine votre niveau de vie et votre impôt.",
    "Les pharmaciens relèvent de la Caisse d’assurance vieillesse des pharmaciens, qui gère un régime de base "
    "aligné sur celui des professions libérales, un régime complémentaire comportant une part en répartition "
    "et une part en capitalisation, ainsi que des prestations complémentaires de vieillesse pour les "
    "titulaires conventionnés. Le niveau de pension dépend des cotisations versées, de la classe choisie et "
    "de la durée d’affiliation.",
    "Le taux de remplacement — rapport entre la pension et le dernier revenu d’activité — est, pour la plupart "
    "des titulaires, nettement inférieur à celui d’un salarié. L’écart se comble par le revenu du capital. "
    "Encore faut-il que ce revenu soit régulier, fiscalement efficace, et qu’il ne consomme pas le capital "
    "trop vite.",
  ],
  atouts=[
    "Un calcul du revenu net disponible, pension et capital réunis",
    "Un plan de retraits qui préserve le capital sur la durée",
    "L’arbitrage entre rente, retraits programmés et distribution de dividendes",
    "La prise en compte de la réversion et de la protection du conjoint",
  ],
  blocks_title="Construire le revenu de votre retraite",
  blocks=[
    ("cards", "Vos sources de revenus après la cession", [
      ("shield", "Les régimes obligatoires",
       "Régime de base, régime complémentaire en répartition et en capitalisation, prestations "
       "complémentaires de vieillesse : à reconstituer précisément, relevé de carrière en main."),
      ("doc", "L’épargne retraite constituée",
       "Anciens contrats Madelin, plans d’épargne retraite : la sortie en capital, en rente, ou un panachage, "
       "n’ont pas la même fiscalité et doivent être calés sur votre année de cession."),
      ("coins", "Le revenu du capital de cession",
       "Retraits programmés d’un contrat, coupons obligataires, revenus de SCPI, dividendes de holding : "
       "c’est la source principale, et la plus pilotable."),
      ("building", "Les loyers des murs",
       "Si vous conservez les murs de l’officine, le bail commercial procure un revenu indexé, mais "
       "fiscalement lourd s’il n’est pas structuré."),
    ]),
    ("steps", "La méthode", [
      ("Reconstituer la pension réelle",
       "Relevés de carrière, points acquis, classes de cotisation, effet d’une liquidation anticipée ou "
       "différée. On part d’un chiffre, pas d’une estimation."),
      ("Chiffrer le besoin net",
       "Dépenses courantes, impôts, santé, aide aux enfants, projets. Le besoin net d’impôt est le seul "
       "objectif qui compte."),
      ("Calculer l’écart à combler",
       "La différence entre le besoin net et la pension nette donne le revenu que le capital doit produire, "
       "chaque année, pendant trente ans."),
      ("Choisir les véhicules de retrait",
       "Retraits partiels programmés sur un contrat d’assurance-vie, coupons, loyers, dividendes : on "
       "privilégie les sources dont la fiscalité est la plus faible à besoin égal."),
      ("Protéger la trajectoire",
       "Une poche de sécurité couvrant plusieurs années de retraits évite d’avoir à vendre des actifs "
       "risqués dans un marché baissier."),
    ]),
    ("note", "Cumul emploi-retraite et remplacements", [
      "Beaucoup de titulaires souhaitent poursuivre une activité réduite après la cession : remplacements, "
      "missions ponctuelles, accompagnement du repreneur. C’est possible, mais le cumul obéit à des règles "
      "précises et peut interférer avec les régimes d’exonération fiscale liés au départ à la retraite.",
      "Le sujet doit être tranché avant la signature de l’acte de cession, pas après.",
    ]),
  ],
  quote="Une retraite de pharmacien ne se finance pas par une pension : elle se finance par un capital "
        "organisé.",
  faq=[
    ("À quel âge dois-je liquider mes droits ?",
     "La question est autant fiscale que personnelle : plusieurs régimes d’exonération applicables à la "
     "cession supposent une liquidation des droits à la retraite dans un délai encadré autour de la vente. "
     "La date de liquidation doit donc être arrêtée en même temps que le calendrier de cession."),
    ("Faut-il sortir son PER en capital ou en rente ?",
     "Le capital offre la souplesse et se transmet ; la rente sécurise un revenu viager mais s’éteint "
     "généralement avec le bénéficiaire, hors option de réversion. La sortie en capital étant imposée, elle "
     "s’étale souvent sur plusieurs exercices, en évitant l’année de la cession si celle-ci est déjà "
     "fortement imposée."),
    ("Quel revenu un capital de cession peut-il servir ?",
     "Cela dépend du capital, de l’allocation et de la durée visée. Nous chiffrons systématiquement le revenu "
     "net annuel soutenable, c’est-à-dire celui qui n’entame pas le capital au-delà de ce que vous avez "
     "accepté, dans plusieurs scénarios de marché."),
    ("Mon conjoint sera-t-il protégé ?",
     "La réversion des régimes obligatoires obéit à des conditions propres. Pour le capital, la protection "
     "passe par le régime matrimonial, les clauses bénéficiaires des contrats et, le cas échéant, une "
     "donation entre époux. Ces trois leviers se traitent ensemble."),
  ],
  kw_cloud=[
    "retraite pharmacien montant", "CAVP prestations complémentaires vieillesse",
    "pharmacien retraité revenus", "liquidation retraite et cession officine",
    "PER après cession entreprise", "rente ou capital retraite pharmacien",
  ],
  related=[("Vous créer des revenus complémentaires", "revenus-complementaires.html"),
           ("Assurance-vie", "assurance-vie.html"),
           ("Que faire du produit de la cession ?", "que-faire-apres-cession.html"),
           ("Transmettre à vos enfants", "transmission-pharmacien.html")],
),

# --------------------------------------------------------------------------
"revenus-complementaires.html": dict(
  parent=P_SIT, priority="0.8",
  title="Vous créer des revenus complémentaires",
  full_title="Revenus complémentaires après la vente d'une pharmacie · Officine & Patrimoine",
  lede="Remplacer le revenu de l’officine suppose de choisir, pour chaque euro de revenu, la source la moins "
       "fiscalisée et la plus régulière. C’est un travail d’ingénierie, pas une question de rendement affiché.",
  desc="Revenus complémentaires après la cession d'une officine : retraits programmés, coupons, SCPI, dividendes de holding et leur fiscalité.",
  kw="revenus complémentaires pharmacien, rente après cession officine, retraits programmés assurance-vie, "
     "revenus réguliers capital cession, complément de retraite pharmacien, vivre des revenus de son capital",
  img="serenite.jpg", alt="Banc face à la mer, image d’un revenu régulier et paisible",
  eyebrow="Revenus",
  subtitle="Le revenu net, seul objectif qui compte",
  paras=[
    "Un capital de cession peut produire un revenu de plusieurs manières, et toutes n’ont pas la même "
    "efficacité fiscale. Deux pharmaciens percevant le même revenu brut peuvent voir un écart important sur "
    "le net, selon l’enveloppe utilisée et la nature des sommes retirées.",
    "Le mécanisme le plus souvent retenu est le rachat partiel programmé sur un contrat d’assurance-vie ou de "
    "capitalisation : chaque retrait n’est imposé que sur sa quote-part de gains, et bénéficie du régime "
    "favorable des contrats de plus de huit ans, dans les limites prévues. Les premières années, la part "
    "imposable est faible — ce qui en fait un outil de revenu particulièrement efficient.",
    "D’autres sources viennent compléter : coupons d’obligations datées ou de fonds obligataires, revenus de "
    "SCPI, loyers des murs conservés, distributions d’une holding. L’art consiste à les combiner en fonction "
    "de votre tranche d’imposition et de vos autres revenus.",
  ],
  atouts=[
    "Un revenu mensuel ou trimestriel versé automatiquement sur votre compte",
    "Une fiscalité optimisée source par source, année par année",
    "Une poche de sécurité qui garantit les versements en cas de baisse des marchés",
    "La possibilité d’ajuster le montant à tout moment, sans frais de sortie",
  ],
  blocks_title="Les sources de revenus, comparées",
  blocks=[
    ("table", "Quelle source pour quel profil", ["Source", "Régularité", "Fiscalité", "Liquidité"],
     [["Rachats partiels programmés (assurance-vie)", "Mensuelle ou trimestrielle, au choix",
       "Seule la quote-part de gains est imposée ; régime allégé après 8 ans dans les limites légales",
       "Totale, sous quelques jours"],
      ["Fonds obligataires et obligations datées", "Coupons périodiques",
       "Prélèvement forfaitaire unique ou barème", "Bonne sur les fonds, variable sur le direct"],
      ["SCPI", "Distribution trimestrielle",
       "Revenus fonciers au barème et prélèvements sociaux, sauf détention via un contrat",
       "Réduite : délai de cession des parts"],
      ["Produits structurés à coupon", "Coupons conditionnels",
       "Selon l’enveloppe de détention", "Selon la formule et l’échéance"],
      ["Loyers des murs d’officine", "Mensuelle ou trimestrielle",
       "Revenus fonciers ou bénéfices de la société détentrice", "Faible : vente du bien"],
      ["Dividendes de holding", "À votre main",
       "Prélèvement forfaitaire unique ou barème, après impôt sur les sociétés", "Dépend de la trésorerie"]]),
    ("note", "Le piège du rendement affiché", [
      "Un support distribuant un rendement brut élevé peut servir un revenu net inférieur à un support moins "
      "généreux mais mieux logé fiscalement — en particulier lorsque les revenus fonciers s’ajoutent à une "
      "tranche marginale déjà élevée.",
      "Nous raisonnons systématiquement en revenu net disponible, après impôt et prélèvements sociaux, et "
      "après prise en compte de l’effet sur votre revenu fiscal de référence.",
    ]),
    ("checklist", "Ce que permet une bonne ingénierie de revenus", [
      "Lisser l’imposition sur plusieurs années plutôt que concentrer les retraits",
      "Utiliser en priorité les contrats les plus anciens, fiscalement matures",
      "Conserver les enveloppes destinées à la transmission intactes le plus longtemps possible",
      "Adapter les retraits aux années de forte ou de faible imposition",
      "Éviter de franchir inutilement un seuil de revenu fiscal de référence",
      "Préserver une réserve de liquidités pour ne jamais vendre en baisse",
      "Indexer progressivement le revenu sur l’inflation",
      "Prévoir le basculement vers le conjoint survivant",
    ]),
  ],
  quote="Le bon revenu n’est pas le plus élevé : c’est celui que vous pouvez percevoir chaque mois pendant "
        "trente ans sans entamer votre sécurité.",
  faq=[
    ("Combien puis-je retirer chaque année sans épuiser mon capital ?",
     "Le taux de retrait soutenable dépend de l’allocation, de l’horizon et de votre tolérance au risque. "
     "Nous le calculons dans plusieurs scénarios de marché, y compris défavorables, et nous l’ajustons chaque "
     "année en fonction de la valorisation réelle."),
    ("Les retraits sont-ils imposés en totalité ?",
     "Non. Sur un contrat d’assurance-vie ou de capitalisation, chaque rachat est composé d’une part de "
     "capital, non imposable, et d’une part de gains, seule imposée. Les premières années, cette part est "
     "faible, ce qui rend le revenu très efficient."),
    ("Puis-je arrêter ou modifier mes retraits ?",
     "Oui, à tout moment et sans frais sur les contrats que nous retenons. C’est un avantage décisif par "
     "rapport à une rente viagère, irréversible par nature."),
    ("Faut-il privilégier les SCPI pour le revenu ?",
     "Elles ont leur place, mais leur fiscalité au barème des revenus fonciers pèse lourd pour un contribuable "
     "fortement imposé. Les détenir au sein d’un contrat, ou en nue-propriété temporaire, change "
     "substantiellement l’équation."),
  ],
  kw_cloud=[
    "revenu mensuel capital 1 million", "rachats programmés assurance vie fiscalité",
    "vivre de ses rentes après cession", "complément de revenu pharmacien retraité",
    "revenu net après impôt placement", "SCPI ou assurance-vie pour le revenu",
  ],
  related=[("Assurance-vie", "assurance-vie.html"),
           ("SCPI et immobilier géré", "scpi.html"),
           ("Fonds obligataires et produits de taux", "fonds-obligataires.html"),
           ("Préparer votre retraite", "retraite-pharmacien.html")],
),

# --------------------------------------------------------------------------
"transmission-pharmacien.html": dict(
  parent=P_SIT, priority="0.8",
  title="Transmettre à vos enfants",
  full_title="Transmettre le produit de la vente de sa pharmacie à ses enfants · Officine & Patrimoine",
  lede="Après la cession, le patrimoine change de nature : il devient liquide, donc transmissible. C’est la "
       "fenêtre la plus favorable pour organiser la transmission — et la plus souvent manquée.",
  desc="Transmettre après la vente de son officine : donations, démembrement, assurance-vie, protection du conjoint et donation avant cession.",
  kw="transmission patrimoine pharmacien, donation enfants après cession, démembrement nue-propriété, "
     "assurance-vie transmission, succession pharmacien, donation avant cession officine, protéger son conjoint, "
     "pacte Dutreil officine",
  img="transmission.jpg", alt="Parent et enfant au bord de l’eau, image de transmission",
  eyebrow="Transmission",
  subtitle="Liquide, donc transmissible",
  paras=[
    "Tant que le patrimoine était constitué d’une officine, le transmettre supposait de transmettre "
    "l’entreprise : difficile à diviser, impossible à donner par fractions, soumis à l’aléa de l’exploitation. "
    "Une fois la cession réalisée, le patrimoine devient divisible et logeable dans des enveloppes conçues "
    "pour la transmission.",
    "Les leviers sont connus : donations en pleine propriété ou de la seule nue-propriété, dons familiaux de "
    "sommes d’argent, clauses bénéficiaires d’assurance-vie, donation-partage qui fige les valeurs et "
    "prévient les conflits. Leur efficacité dépend presque uniquement d’un paramètre : <strong>l’âge auquel "
    "on les actionne</strong>.",
    "Les abattements se reconstituent par périodes ; la décote de la nue-propriété est d’autant plus forte "
    "que le donateur est jeune ; l’assurance-vie distingue les primes versées avant et après un âge pivot. "
    "Organiser la transmission à soixante ans ne coûte pas la même chose qu’à soixante-quinze.",
  ],
  atouts=[
    "Un état des lieux civil complet : régime matrimonial, enfants, libéralités antérieures",
    "Un chiffrage de la fiscalité successorale en l’état, et après optimisation",
    "Une coordination avec votre notaire, dont nous préparons les dossiers",
    "La protection du conjoint traitée avant celle des enfants",
  ],
  blocks_title="Les leviers, dans l’ordre",
  blocks=[
    ("cards", "Quatre outils complémentaires", [
      ("gift", "La donation en pleine propriété",
       "Abattements par parent et par enfant, reconstitués à intervalle régulier : la régularité prime sur "
       "le montant."),
      ("key", "La donation de la nue-propriété",
       "Vous conservez l’usage et les revenus, vos enfants reçoivent la propriété future. Les droits ne "
       "portent que sur la valeur de la nue-propriété."),
      ("shield", "L’assurance-vie",
       "Un régime de transmission propre, distinct de la succession dans les limites prévues par la loi, et "
       "une clause bénéficiaire qui se rédige sur mesure."),
      ("family", "La donation-partage",
       "Elle répartit de son vivant, fige les valeurs au jour de l’acte et prévient les contestations entre "
       "héritiers."),
    ]),
    ("steps", "Un calendrier en quatre temps", [
      ("Protéger le conjoint d’abord",
       "Régime matrimonial, donation entre époux, clauses bénéficiaires : la sécurité du conjoint survivant "
       "précède toute transmission aux enfants."),
      ("Donner tôt, par fractions",
       "Les abattements se renouvellent périodiquement : une stratégie de donations régulières transmet "
       "beaucoup plus qu’une donation unique tardive."),
      ("Démembrer ce qui produit du revenu",
       "Donner la nue-propriété de titres de capitalisation ou de parts de société permet de transmettre la "
       "valeur sans perdre les revenus ni la gestion."),
      ("Documenter et faire vivre",
       "Clauses bénéficiaires relues, donations enregistrées, pacte adjoint pour les dons d’argent : une "
       "transmission se tient à jour."),
    ]),
    ("note", "Le cas particulier de la donation avant cession", [
      "Donner des titres de la société d’exercice <em>avant</em> la vente purge la plus-value latente sur les "
      "titres donnés : les donataires sont réputés les recevoir à leur valeur du jour de la donation.",
      "Le dispositif est puissant mais encadré : la donation doit être réelle, antérieure à l’engagement de "
      "vente, et le donateur ne doit pas récupérer le prix. Mal exécutée, l’opération est requalifiée. Elle "
      "se prépare avec le notaire et l’avocat fiscaliste, plusieurs mois à l’avance.",
    ]),
    ("checklist", "Ce que nous examinons systématiquement", [
      "Le régime matrimonial et son éventuelle adaptation",
      "Les donations déjà consenties et leur rapport civil",
      "La rédaction des clauses bénéficiaires, souvent obsolète",
      "L’âge du souscripteur au moment des versements en assurance-vie",
      "L’intérêt d’un contrat de capitalisation démembrable",
      "La situation personnelle de chaque enfant",
      "L’existence d’un enfant repreneur dans la santé",
      "Les biens immobiliers, et notamment les murs de l’officine",
    ]),
  ],
  quote="Transmettre, c’est décider de son vivant de ce que l’administration fiscale décidera à votre place "
        "si vous ne le faites pas.",
  faq=[
    ("Faut-il donner avant ou après la vente ?",
     "Avant, si l’objectif est de purger la plus-value sur les titres donnés — mais cela suppose une "
     "préparation sérieuse et un calendrier respecté. Après, la donation porte sur des liquidités ou des "
     "contrats : elle reste très efficace, notamment en nue-propriété."),
    ("L’assurance-vie échappe-t-elle totalement aux droits de succession ?",
     "Non : elle bénéficie d’un régime distinct, avec des abattements propres par bénéficiaire, et un "
     "traitement différent selon que les primes ont été versées avant ou après un âge pivot. C’est un "
     "avantage considérable, pas une exonération générale."),
    ("Mes enfants peuvent-ils gérer les sommes données ?",
     "Vous pouvez donner tout en conservant la gestion et les revenus, par le démembrement ou par un pacte "
     "adjoint assorti de clauses d’inaliénabilité temporaire ou de remploi. Donner n’oblige pas à "
     "dessaisir immédiatement."),
    ("Que faire si un enfant reprend une officine ?",
     "C’est une situation à traiter spécifiquement : aide au financement, garanties, équilibre avec les "
     "autres enfants, et éventuellement pacte Dutreil sur les titres de la société d’exercice. La "
     "donation-partage est alors l’outil central."),
  ],
  kw_cloud=[
    "donation enfants après vente entreprise", "abattement donation 100 000 euros",
    "démembrement nue-propriété donation", "clause bénéficiaire assurance vie sur mesure",
    "succession pharmacien patrimoine", "donation-partage pharmacien", "protéger son conjoint après cession",
  ],
  related=[("Donation avant cession", "donation-avant-cession.html"),
           ("Contrat de capitalisation", "contrat-capitalisation.html"),
           ("Assurance-vie", "assurance-vie.html"),
           ("Family Office", "family-office.html")],
),

# --------------------------------------------------------------------------
"murs-officine.html": dict(
  parent=P_SIT, priority="0.75",
  title="Que faire des murs de l’officine ?",
  full_title="Murs de pharmacie : vendre, louer ou démembrer après la cession · Officine & Patrimoine",
  lede="Beaucoup de titulaires cèdent le fonds et conservent les murs. Ce choix procure un revenu indexé, mais "
       "concentre le patrimoine sur un seul actif, loué à un seul locataire, dans une seule commune.",
  desc="Murs de pharmacie : conserver et louer au repreneur, vendre ou démembrer. Fiscalité des loyers et de la plus-value immobilière.",
  kw="murs de pharmacie, vendre les murs de l'officine, SCI murs pharmacie, bail commercial pharmacie, "
     "loyer murs officine fiscalité, plus-value immobilière murs pharmacie, conserver les murs après cession",
  img="facade-officine.jpg", alt="Façade d’officine stylisée, vitrine et enseigne",
  eyebrow="Immobilier d’exploitation",
  subtitle="Un actif de rendement, et un risque de concentration",
  paras=[
    "Les murs d’une officine sont un bon actif : emplacement commercial, locataire solvable exerçant une "
    "activité réglementée, bail commercial indexé. Beaucoup de titulaires les conservent après la vente du "
    "fonds, par attachement et par prudence.",
    "Le raisonnement a ses limites. Ce patrimoine représente souvent une part majeure des actifs, il dépend "
    "d’un locataire unique dont la santé économique conditionne le loyer, et sa valeur suit le sort de "
    "l’officine qu’il abrite. En cas de difficulté du repreneur, le revenu et la valeur baissent ensemble.",
    "La fiscalité pèse également : les loyers perçus par une personne physique ou une société à l’impôt sur "
    "le revenu s’ajoutent au revenu imposable et supportent les prélèvements sociaux, souvent au moment où "
    "votre tranche marginale est la plus élevée. La détention via une société à l’impôt sur les sociétés "
    "change l’équation, mais complique la sortie des liquidités.",
  ],
  atouts=[
    "Une comparaison chiffrée : conserver, vendre, apporter ou démembrer",
    "L’analyse du bail et de son impact sur la valeur de revente",
    "Le traitement de la SCI existante, à l’impôt sur le revenu ou sur les sociétés",
    "Le réinvestissement du produit de vente en actifs diversifiés",
  ],
  blocks_title="Quatre options, quatre logiques",
  blocks=[
    ("table", "Comparer les scénarios", ["Option", "Ce que vous gagnez", "Ce que vous acceptez"],
     [["Conserver et louer au repreneur",
       "Un revenu indexé, une valeur patrimoniale, un lien conservé avec l’officine",
       "Une concentration du patrimoine, une fiscalité des loyers élevée, une gestion locative"],
      ["Vendre en même temps que le fonds",
       "Une liquidité totale, une diversification immédiate, une négociation simplifiée pour le repreneur",
       "La plus-value immobilière, atténuée par les abattements pour durée de détention"],
      ["Vendre plus tard, après la cession du fonds",
       "Le temps de trouver un acquéreur au bon prix, un revenu dans l’intervalle",
       "Un acheteur potentiellement moins nombreux qu’au moment de la cession du fonds"],
      ["Démembrer ou transmettre",
       "Une transmission à coût fiscal réduit, le maintien des revenus si vous conservez l’usufruit",
       "Une opération irréversible, à préparer avec le notaire"]]),
    ("note", "La SCI n’est pas neutre", [
      "Une société civile immobilière à l’impôt sur le revenu fait remonter les loyers dans votre déclaration "
      "personnelle. À l’impôt sur les sociétés, elle permet d’amortir le bien et de capitaliser, mais la "
      "plus-value de cession est calculée sur une valeur nette comptable diminuée des amortissements, et la "
      "sortie des liquidités est fiscalisée.",
      "Le choix dépend de votre horizon : conserver longtemps et transmettre, ou vendre à moyen terme.",
    ]),
    ("checklist", "Les points à vérifier dans votre bail", [
      "La durée résiduelle et les échéances triennales",
      "L’indice de révision retenu et son historique",
      "La répartition des charges et des travaux entre bailleur et preneur",
      "Les clauses de destination, de cession et de sous-location",
      "La solidité financière du repreneur et les garanties obtenues",
      "L’état du bâti et les diagnostics réglementaires",
      "La conformité d’accessibilité et les obligations énergétiques",
      "L’existence d’un droit de préférence au profit du locataire",
    ]),
  ],
  quote="Conserver les murs est une décision patrimoniale, pas un réflexe : elle doit se comparer, chiffres en "
        "main, au réinvestissement du produit de leur vente.",
  faq=[
    ("Le repreneur peut-il m’obliger à vendre les murs ?",
     "Non, mais il peut en faire une condition de son offre, notamment si son financement est construit sur "
     "l’acquisition de l’ensemble. En pratique, la question des murs s’intègre à la négociation globale."),
    ("Vaut-il mieux vendre les murs avec le fonds ?",
     "Cela simplifie l’opération et élargit le marché d’acquéreurs, au prix d’une plus-value immobilière "
     "immédiate. La réponse dépend de la durée de détention, de la fiscalité applicable et de votre besoin de "
     "diversification."),
    ("Comment réduire la fiscalité des loyers ?",
     "Plusieurs voies existent : détention via une société à l’impôt sur les sociétés, démembrement temporaire "
     "au profit d’une société, arbitrage vers des actifs immobiliers fiscalement plus efficients. Chacune a "
     "des conséquences durables : aucune ne se décide isolément."),
    ("Et si je veux rester propriétaire pour aider le repreneur ?",
     "C’est fréquent et légitime. Il faut alors sécuriser le bail, calibrer le loyer à un niveau soutenable "
     "pour l’exploitation, et compenser la concentration patrimoniale par une diversification du reste du "
     "capital."),
  ],
  kw_cloud=[
    "vendre murs pharmacie", "loyer bail commercial officine", "SCI à l'IS murs commerciaux",
    "plus-value immobilière abattement durée détention", "murs de pharmacie investissement",
    "démembrement murs commerciaux",
  ],
  related=[("Placements immobiliers", "placements-immobiliers.html"),
           ("Immobilier de santé", "immobilier-sante.html"),
           ("SCI patrimoniale", "sci-patrimoniale.html"),
           ("SCPI et immobilier géré", "scpi.html")],
),

# --------------------------------------------------------------------------
"expatriation-pharmacien.html": dict(
  parent=P_SIT, priority="0.65",
  title="Vous expatrier après la cession",
  full_title="S'expatrier après la vente de son officine : fiscalité et patrimoine · Officine & Patrimoine",
  lede="Partir vivre à l’étranger après la cession modifie votre résidence fiscale, la taxation de vos revenus "
       "de capitaux et, parfois, la fiscalité de la cession elle-même. Le calendrier compte autant que la "
       "destination.",
  desc="S'expatrier après la vente de son officine : résidence fiscale, exit tax, conventions fiscales et contrats adaptés aux non-résidents.",
  kw="expatriation pharmacien, partir à l'étranger après cession, résidence fiscale non résident, exit tax, "
     "convention fiscale internationale, assurance-vie luxembourgeoise non résident, retraite à l'étranger "
     "pharmacien",
  img="large.jpg", alt="Bateau au large, image du départ à l’étranger",
  eyebrow="International",
  subtitle="La date du départ est une donnée fiscale",
  paras=[
    "Quitter la France change le lieu d’imposition de vos revenus et, pour partie, de votre patrimoine. Si le "
    "départ intervient la même année que la cession, l’articulation entre les deux opérations devient le "
    "premier sujet : ordre chronologique, détermination de la résidence fiscale sur l’année, application de "
    "la convention fiscale conclue avec le pays d’accueil.",
    "Le transfert du domicile fiscal hors de France peut en outre déclencher l’imposition de certaines "
    "plus-values latentes sur les participations détenues, avec un mécanisme de sursis sous conditions. Les "
    "titres déjà cédés ne sont pas concernés, mais une holding constituée lors de l’opération peut l’être.",
    "Enfin, tous les contrats ne se transportent pas. Certains contrats d’assurance-vie français acceptent "
    "mal la non-résidence ; les contrats de droit luxembourgeois, multi-devises et reconnus dans de nombreuses "
    "juridictions, sont conçus pour la mobilité internationale.",
  ],
  atouts=[
    "L’analyse de la convention fiscale applicable à votre destination",
    "Le séquencement de la cession et du départ",
    "Des enveloppes transportables, en architecture ouverte et multi-devises",
    "La coordination avec un avocat fiscaliste local",
  ],
  blocks_title="Les points à traiter avant de partir",
  blocks=[
    ("checklist", "Votre feuille de route", [
      "La date précise du transfert de domicile fiscal et sa preuve",
      "L’ordre entre la cession, la liquidation de la retraite et le départ",
      "L’existence de plus-values latentes susceptibles d’être imposées au départ",
      "Le sort des revenus de source française : loyers, dividendes, pensions",
      "La compatibilité de vos contrats actuels avec la non-résidence",
      "La couverture santé et la fiscalité des pensions dans le pays d’accueil",
      "Les règles successorales applicables à votre nouvelle résidence",
      "Les obligations déclaratives qui subsistent en France",
    ]),
    ("cards", "Nos réponses", [
      ("globe", "Contrat luxembourgeois",
       "Portabilité internationale, multi-devises, neutralité fiscale du contrat qui s’efface devant la "
       "fiscalité de votre pays de résidence."),
      ("lock", "Protection renforcée",
       "Le régime luxembourgeois de protection des souscripteurs place leurs avoirs en dehors du bilan de "
       "l’assureur, avec un rang privilégié."),
      ("doc", "Coordination fiscale",
       "Nous travaillons avec des avocats fiscalistes dans le pays d’accueil et avec votre conseil français."),
      ("family", "Transmission internationale",
       "Les règles de dévolution et les conventions en matière de succession diffèrent : la clause "
       "bénéficiaire doit être relue."),
    ]),
  ],
  faq=[
    ("Dois-je céder avant ou après mon départ ?",
     "C’est l’une des rares décisions où l’ordre chronologique change radicalement le résultat. Elle dépend "
     "de la convention fiscale applicable, de votre date de résidence effective et des régimes d’exonération "
     "que vous visez. Elle se tranche avec un fiscaliste, plusieurs mois à l’avance."),
    ("Mon assurance-vie française me suit-elle ?",
     "Juridiquement, le contrat demeure ; en pratique, certains assureurs restreignent les opérations des "
     "non-résidents et la fiscalité applicable aux rachats dépend de la convention. Un contrat luxembourgeois "
     "est généralement plus adapté à une mobilité durable."),
    ("Suis-je concerné par l’exit tax ?",
     "Le dispositif vise des participations significatives détenues au jour du transfert de domicile. Si vous "
     "avez cédé la totalité de vos titres avant de partir, il n’a en principe pas d’objet ; si vous détenez "
     "une holding, la question se pose. Une analyse préalable s’impose."),
  ],
  kw_cloud=[
    "pharmacien expatrié fiscalité", "vendre sa pharmacie puis partir à l'étranger",
    "non résident fiscal placements", "exit tax holding", "retraite au Portugal pharmacien",
    "assurance vie luxembourg expatrié",
  ],
  related=[("Assurance-vie luxembourgeoise", "assurance-vie-luxembourgeoise.html"),
           ("Fiscalité de la cession", "fiscalite-cession-officine.html"),
           ("Family Office", "family-office.html")],
),
})

# ==========================================================================
# NOS SOLUTIONS — pages de détail
# ==========================================================================
P_FIN = ("Placements financiers", "placements-financiers.html")
P_TRE = ("Trésorerie de votre holding", "tresorerie-holding.html")
P_PE  = ("Private Equity et non coté", "private-equity.html")
P_IMM = ("Placements immobiliers", "placements-immobiliers.html")
P_STR = ("Structuration juridique et fiscale", "structuration-juridique.html")

SOLUTIONS = {

"assurance-vie.html": dict(
  parent=P_FIN,
  title="Assurance-vie",
  full_title="Assurance-vie après la vente d'une pharmacie · Officine & Patrimoine",
  lede="L’enveloppe centrale d’un capital de cession : des revenus programmés fiscalement efficients, une "
       "allocation libre et un régime de transmission qui lui est propre.",
  desc="Assurance-vie après la vente d'une pharmacie : rachats programmés, fiscalité après 8 ans, allocation libre et clause bénéficiaire.",
  kw="assurance-vie pharmacien, assurance vie après cession entreprise, rachats partiels programmés, "
     "fiscalité assurance vie 8 ans, clause bénéficiaire, fonds en euros, unités de compte architecture ouverte",
  img="ocean.jpg", alt="Vague vue du ciel, image de régularité",
  eyebrow="Placements financiers", subtitle="Trois fonctions dans un seul contrat",
  paras=[
    "L’assurance-vie remplit simultanément trois rôles qu’aucune autre enveloppe ne cumule : faire travailler "
    "le capital dans une allocation libre, servir un revenu régulier à fiscalité réduite, et transmettre dans "
    "un cadre distinct de la succession, dans les limites fixées par la loi.",
    "Son efficacité tient à deux mécanismes. D’abord, l’absence d’imposition tant qu’aucun rachat n’est "
    "effectué : les arbitrages internes au contrat ne déclenchent pas d’impôt. Ensuite, la règle du rachat "
    "partiel : chaque retrait n’est imposé que sur sa quote-part de gains, ce qui rend le revenu très peu "
    "fiscalisé les premières années.",
    "Encore faut-il un bon contrat. Nous retenons des contrats en architecture ouverte, sans frais d’entrée "
    "négociés à la hausse, donnant accès à plusieurs milliers de supports, à des mandats de gestion et, pour "
    "les capitaux importants, à des fonds internes dédiés.",
  ],
  atouts=["Aucun frais d’entrée sur les contrats que nous retenons",
          "Une architecture réellement ouverte, sans quota de fonds maison",
          "Des rachats programmés libres, modifiables et sans frais",
          "Une clause bénéficiaire rédigée sur mesure, relue régulièrement"],
  blocks_title="Comment nous l’utilisons",
  blocks=[
    ("cards", "Trois usages pour un capital de cession", [
      ("coins", "Servir un revenu", "Rachats partiels programmés, mensuels ou trimestriels, calibrés sur "
       "votre besoin net et ajustables à tout moment."),
      ("growth", "Faire croître", "Allocation diversifiée en unités de compte, pilotée sous mandat ou "
       "conseillée, selon votre profil de risque."),
      ("family", "Transmettre", "Capitaux versés aux bénéficiaires désignés dans un cadre fiscal propre, "
       "avec des abattements par bénéficiaire."),
    ]),
    ("checklist", "Ce que nous vérifions dans un contrat", [
      "L’absence de frais d’entrée et le niveau réel des frais de gestion",
      "La qualité et le rendement historique du fonds en euros",
      "L’étendue de la gamme d’unités de compte et l’accès aux parts institutionnelles",
      "La possibilité d’arbitrages libres et d’options automatiques",
      "L’accès aux SCPI, au private equity et aux produits structurés",
      "La solidité de l’assureur et son ratio de solvabilité",
      "La souplesse de la clause bénéficiaire et son démembrement éventuel",
      "La possibilité d’avances plutôt que de rachats",
    ]),
    ("note", "Après 70 ans, la logique change", [
      "Le régime de transmission de l’assurance-vie distingue les primes versées avant et après un âge pivot. "
      "Verser l’essentiel du capital avant cet âge, ou répartir entre plusieurs contrats, modifie "
      "sensiblement le coût fiscal pour vos bénéficiaires.",
      "C’est l’une des raisons pour lesquelles l’enveloppe doit être mise en place rapidement après la "
      "cession, et non quelques années plus tard.",
    ]),
  ],
  faq=[("Combien de contrats faut-il ouvrir ?",
        "Souvent plusieurs : cela permet de dédier chaque contrat à un usage (revenu, croissance, "
        "transmission à tel bénéficiaire), de répartir le risque entre assureurs et de conserver intacte "
        "l’antériorité fiscale d’un contrat dont on ne retire rien."),
       ("Le fonds en euros est-il encore pertinent ?",
        "Oui, comme poche de sécurité et de liquidité, à condition de ne pas y loger l’intégralité du "
        "capital : son rendement net sert à protéger, pas à faire croître."),
       ("Puis-je y loger des SCPI ou du private equity ?",
        "Sur les contrats que nous retenons, oui. Loger des SCPI dans un contrat change notamment le "
        "traitement fiscal des revenus par rapport à une détention en direct.")],
  related=[("Contrat de capitalisation", "contrat-capitalisation.html"),
           ("Assurance-vie luxembourgeoise", "assurance-vie-luxembourgeoise.html"),
           ("Vous créer des revenus complémentaires", "revenus-complementaires.html")],
),

"assurance-vie-luxembourgeoise.html": dict(
  parent=P_FIN,
  title="Assurance-vie luxembourgeoise",
  full_title="Assurance-vie luxembourgeoise pour un capital de cession · Officine & Patrimoine",
  lede="Pour les capitaux importants : une protection du souscripteur renforcée, une liberté de gestion "
       "étendue et une portabilité internationale que le contrat français n’offre pas.",
  desc="Assurance-vie luxembourgeoise : triangle de sécurité, super-privilège, fonds internes dédiés et portabilité internationale.",
  kw="assurance vie luxembourgeoise, contrat luxembourgeois, triangle de sécurité, super privilège, fonds "
     "interne dédié, FID FAS, crédit lombard, assurance vie gros patrimoine, placement 1 million luxembourg",
  img="luxembourg.jpg", alt="Façade d’établissement bancaire au Luxembourg",
  eyebrow="Placements financiers", subtitle="La même fiscalité, un cadre plus protecteur",
  paras=[
    "Pour un résident fiscal français, le contrat luxembourgeois est fiscalement neutre : il suit exactement "
    "le régime français de l’assurance-vie, tant pour les rachats que pour la transmission. Ce qui change, "
    "c’est le cadre juridique et les possibilités de gestion.",
    "Le droit luxembourgeois organise une séparation stricte entre les actifs des souscripteurs et le bilan "
    "de l’assureur, déposés auprès d’une banque dépositaire agréée et contrôlés par le régulateur. Les "
    "souscripteurs disposent en outre d’un rang de créancier privilégié de premier ordre en cas de "
    "défaillance de la compagnie.",
    "La gestion s’élargit : fonds internes dédiés pilotés par une société de gestion de votre choix, accès à "
    "des parts institutionnelles, détention en plusieurs devises, possibilité d’apporter des titres existants "
    "et, le cas échéant, crédit lombard adossé au contrat.",
  ],
  atouts=["Une protection du souscripteur parmi les plus fortes d’Europe",
          "Des fonds internes dédiés, gérés sur mesure au-delà de certains seuils",
          "Un contrat multi-devises, adapté à une expatriation éventuelle",
          "Une fiscalité strictement identique à celle d’un contrat français pour un résident"],
  blocks_title="Ce que le cadre luxembourgeois apporte",
  blocks=[
    ("cards", "Quatre différences concrètes", [
      ("lock", "Triangle de sécurité", "Actifs déposés auprès d’une banque dépositaire agréée, isolés du "
       "bilan de l’assureur et contrôlés par le régulateur."),
      ("shield", "Super-privilège", "Les souscripteurs priment les autres créanciers de la compagnie en cas "
       "de défaillance."),
      ("compass", "Gestion sur mesure", "Fonds internes dédiés et mandats confiés à la société de gestion de "
       "votre choix, avec un univers d’investissement très large."),
      ("globe", "Portabilité", "Contrat reconnu dans de nombreuses juridictions, multi-devises, conçu pour "
       "la mobilité internationale."),
    ]),
    ("note", "À partir de quel montant ?", [
      "Les contrats luxembourgeois s’adressent à des capitaux significatifs ; les modes de gestion les plus "
      "élaborés, comme les fonds internes dédiés, sont ouverts au-delà de seuils de fortune définis par la "
      "réglementation luxembourgeoise.",
      "En deçà, un bon contrat français en architecture ouverte reste pleinement pertinent : nous le disons "
      "clairement plutôt que d’orienter systématiquement vers l’offre la plus sophistiquée.",
    ]),
  ],
  faq=[("Est-ce une optimisation fiscale ?",
        "Non. Pour un résident fiscal français, la fiscalité est celle de l’assurance-vie française. "
        "L’intérêt est juridique, patrimonial et financier, non fiscal."),
       ("Le contrat est-il déclaré à l’administration française ?",
        "Oui, comme tout contrat souscrit auprès d’un assureur établi hors de France. La déclaration est "
        "une obligation annuelle simple, que nous rappelons systématiquement.")],
  related=[("Assurance-vie", "assurance-vie.html"),
           ("Vous expatrier après la cession", "expatriation-pharmacien.html"),
           ("Family Office", "family-office.html")],
),

"contrat-capitalisation.html": dict(
  parent=P_FIN,
  title="Contrat de capitalisation",
  full_title="Contrat de capitalisation : capitaliser et transmettre · Officine & Patrimoine",
  lede="Le jumeau de l’assurance-vie pour la gestion financière, mais transmissible du vivant et démembrable : "
       "l’outil des stratégies de donation aux enfants.",
  desc="Contrat de capitalisation : même moteur que l'assurance-vie, mais donnable et démembrable. L'outil des donations aux enfants.",
  kw="contrat de capitalisation, donation contrat de capitalisation, démembrement nue-propriété contrat, "
     "capitalisation ou assurance vie, transmission enfants capitalisation, antériorité fiscale",
  img="architecture.jpg", alt="Intérieur sous coupole, image de structure",
  eyebrow="Placements financiers", subtitle="Capitaliser aujourd’hui, donner demain",
  paras=[
    "Le contrat de capitalisation fonctionne comme une assurance-vie : même univers de supports, même "
    "fiscalité des rachats, même absence d’imposition des arbitrages internes. La différence est civile : il "
    "ne repose pas sur l’aléa du décès et entre donc dans la succession — mais il peut, à l’inverse de "
    "l’assurance-vie, être <strong>donné de son vivant</strong>.",
    "C’est ce qui en fait un instrument de transmission de premier plan. On peut en donner la nue-propriété "
    "aux enfants tout en conservant l’usufruit, c’est-à-dire les revenus et le pilotage. La valeur transmise "
    "est réduite de la valeur de l’usufruit conservé, et le contrat conserve son antériorité fiscale entre "
    "les mains du donataire.",
    "Il est également utilisable par une société : une holding issue d’un apport-cession peut y loger sa "
    "trésorerie longue, avec une imposition annuelle forfaitaire puis une régularisation à la sortie.",
  ],
  atouts=["Donation possible du vivant, en pleine propriété ou en nue-propriété",
          "Conservation de l’antériorité fiscale après la donation",
          "Souscription possible par une personne morale",
          "Même moteur financier qu’un bon contrat d’assurance-vie"],
  blocks_title="Les usages",
  blocks=[
    ("table", "Assurance-vie ou capitalisation ?", ["Critère", "Assurance-vie", "Capitalisation"],
     [["Fiscalité des rachats", "Identique", "Identique"],
      ["Transmission au décès", "Régime propre, hors succession dans les limites légales",
       "Entre dans la succession, aux droits de droit commun"],
      ["Donation du vivant", "Impossible", "Possible, y compris en nue-propriété"],
      ["Souscription par une société", "Non", "Oui"],
      ["Usage privilégié", "Revenu et transmission au décès", "Transmission organisée du vivant, trésorerie "
       "de société"]]),
    ("checklist", "Quand nous le recommandons", [
      "Vous voulez donner à vos enfants sans vous priver des revenus",
      "Vous avez déjà saturé l’intérêt fiscal de l’assurance-vie",
      "Vous détenez une holding dont la trésorerie doit travailler longtemps",
      "Vous souhaitez une donation-partage portant sur des actifs financiers",
      "Vous préparez une transmission échelonnée sur plusieurs périodes d’abattement",
      "Vous voulez conserver la gestion après avoir transmis la valeur",
    ]),
  ],
  faq=[("Le contrat de capitalisation est-il moins intéressant que l’assurance-vie ?",
        "Il est différent. Pour la transmission au décès, l’assurance-vie conserve l’avantage. Pour "
        "transmettre de son vivant, ou pour une société, le contrat de capitalisation est souvent le seul "
        "outil adapté. Les deux se combinent."),
       ("Que devient le contrat après la donation de la nue-propriété ?",
        "L’usufruitier conserve en principe la gestion et perçoit les revenus, selon les termes de l’acte de "
        "donation, qui organise précisément les pouvoirs de chacun. La rédaction de cette convention est "
        "essentielle et relève du notaire.")],
  related=[("Transmettre à vos enfants", "transmission-pharmacien.html"),
           ("Capitalisation pour personne morale", "capitalisation-personne-morale.html"),
           ("Assurance-vie", "assurance-vie.html")],
),

"compte-titres-pea.html": dict(
  parent=P_FIN,
  title="Compte-titres et PEA",
  full_title="Compte-titres et PEA après une cession d'officine · Officine & Patrimoine",
  lede="La liberté totale d’investissement pour le compte-titres, une fiscalité réduite sur les actions "
       "européennes pour le PEA : deux enveloppes complémentaires de l’assurance-vie.",
  desc="Compte-titres ordinaire et PEA pour un pharmacien après cession : obligations en direct, titres vifs, "
       "ETF, fiscalité du PFU et avantages du PEA après cinq ans.",
  kw="compte-titres pharmacien, PEA après cession, PEA-PME, obligations en direct, ETF, prélèvement "
     "forfaitaire unique, titres vifs, plafond PEA",
  img="strategie.jpg", alt="Échiquier, image de la stratégie d’investissement",
  eyebrow="Placements financiers", subtitle="Liberté d’un côté, fiscalité de l’autre",
  paras=[
    "Le compte-titres ordinaire n’a aucune limite : toutes les classes d’actifs, toutes les devises, les "
    "obligations en direct, les produits structurés, les titres vifs. Sa contrepartie est une imposition au "
    "fil de l’eau des revenus et des plus-values réalisées, au prélèvement forfaitaire unique ou, sur option "
    "globale, au barème.",
    "Le plan d’épargne en actions obéit à la logique inverse : un univers restreint aux actions européennes "
    "et à certains fonds, un plafond de versement, mais une exonération d’impôt sur le revenu sur les gains "
    "après cinq ans de détention, les prélèvements sociaux restant dus. Pour un capital de cession, son "
    "intérêt est de loger la poche actions européennes de long terme.",
    "Nous utilisons le compte-titres principalement pour les obligations détenues en direct jusqu’à "
    "l’échéance — un outil de revenu précis et prévisible — et pour les supports inaccessibles en "
    "assurance-vie.",
  ],
  atouts=["Un univers d’investissement sans restriction sur le compte-titres",
          "Des obligations en direct, portées jusqu’à leur échéance",
          "Une poche actions européennes fiscalement allégée sur le PEA",
          "La possibilité de loger des titres apportés plutôt que vendus"],
  blocks_title="Comment les articuler",
  blocks=[
    ("cards", "Trois rôles distincts", [
      ("doc", "Obligations datées", "Acquises en direct, conservées jusqu’à l’échéance : un rendement connu "
       "à l’avance, sous réserve du risque de défaut de l’émetteur."),
      ("chart", "Gestion sous mandat", "Déléguée à une société de gestion sélectionnée, avec un profil de "
       "risque défini et un reporting régulier."),
      ("growth", "PEA de long terme", "La poche actions européennes, destinée à ne pas être touchée avant "
       "plusieurs années."),
    ]),
    ("note", "Attention à l’année de la cession", [
      "L’option pour le barème progressif est globale : elle s’applique à l’ensemble de vos revenus du "
      "capital de l’année. L’année d’une cession importante, ce choix doit être simulé avec précision, car "
      "il interagit avec les abattements applicables à la plus-value de cession.",
    ]),
  ],
  faq=[("Faut-il ouvrir un PEA après 60 ans ?",
        "Souvent oui : le délai de cinq ans court à compter de l’ouverture, et le plan n’a pas vocation à "
        "être liquidé — il se transmet avec le reste du patrimoine. L’ouvrir tôt, même avec un versement "
        "modeste, prend date."),
       ("Le compte-titres est-il moins intéressant que l’assurance-vie ?",
        "Il est fiscalement moins favorable sur les revenus courants, mais il n’a aucune limite "
        "d’investissement ni frais d’enveloppe. Pour les obligations en direct et certains supports, il est "
        "irremplaçable.")],
  related=[("Fonds obligataires et produits de taux", "fonds-obligataires.html"),
           ("Assurance-vie", "assurance-vie.html"),
           ("Produits structurés", "produits-structures.html")],
),

"produits-structures.html": dict(
  parent=P_FIN,
  title="Produits structurés",
  full_title="Produits structurés sur mesure pour un capital de cession · Officine & Patrimoine",
  lede="Des solutions de rendement dont les règles sont écrites à l’avance : niveau de protection, conditions "
       "de coupon, échéance. Utiles pour une poche de revenus, à condition d’en comprendre les limites.",
  desc="Produits structurés : mécanismes de protection, coupons conditionnels, barrières et place de ces solutions dans une allocation.",
  kw="produits structurés, autocall, coupon conditionnel, capital protégé, barrière de protection, EMTN, "
     "placement structuré sur mesure, rendement défini à l'avance",
  img="mortier.jpg", alt="Mortier et pilon d’apothicaire, image de la préparation sur mesure",
  eyebrow="Placements financiers", subtitle="Un contrat dont vous connaissez les règles",
  paras=[
    "Un produit structuré est un instrument dont le rendement et le remboursement suivent une formule connue "
    "dès la souscription, liée à l’évolution d’un indice ou d’un panier d’actions. Il peut verser des coupons "
    "si une condition est remplie, se rembourser par anticipation, et offrir une protection du capital "
    "jusqu’à un certain niveau de baisse.",
    "Son intérêt, pour un capital de cession, est de produire un rendement potentiel défini à l’avance, sans "
    "exposition directe à la volatilité quotidienne des marchés. Sa limite est tout aussi claire : la "
    "protection est conditionnelle, elle disparaît au-delà d’un seuil de baisse, et le capital est alors "
    "exposé à une perte.",
    "Nous faisons concevoir ces solutions sur mesure auprès de plusieurs émetteurs mis en concurrence, et "
    "nous privilégions des formules lisibles, sur des sous-jacents larges, avec une diversification des "
    "émetteurs et des dates de constatation.",
  ],
  atouts=["Des formules conçues sur mesure, plusieurs émetteurs mis en concurrence",
          "Une documentation expliquée point par point avant souscription",
          "Une diversification des émetteurs, des sous-jacents et des millésimes",
          "Une détention possible en assurance-vie, en compte-titres ou via une société"],
  blocks_title="Comprendre avant de souscrire",
  blocks=[
    ("checklist", "Les questions que nous posons systématiquement", [
      "Quel est le sous-jacent et pourquoi celui-ci plutôt qu’un autre",
      "À quelles conditions le coupon est-il versé, et à quelles dates",
      "Jusqu’à quelle baisse le capital est-il protégé à l’échéance",
      "Que se passe-t-il au-delà de ce seuil, concrètement et en euros",
      "Qui est l’émetteur et quelle est sa qualité de crédit",
      "Quelle est la durée maximale, et le produit peut-il être rappelé plus tôt",
      "Quelle est la liquidité en cours de vie, et à quel prix",
      "Quelle part du capital total cette ligne représente-t-elle",
    ]),
    ("note", "Ce que nous ne faisons pas", [
      "Nous ne concentrons jamais une poche de revenus sur un seul produit, un seul émetteur ou une seule "
      "date de constatation. Un produit structuré est une brique d’allocation, pas une solution de "
      "remplacement du fonds en euros.",
      "Le risque de perte en capital existe : il doit être compris et accepté avant toute souscription.",
    ]),
  ],
  faq=[("Le capital est-il garanti ?",
        "Dans la grande majorité des cas, non : il est <em>protégé</em> jusqu’à un certain niveau de baisse "
        "du sous-jacent, ce qui est très différent. Les formules à capital garanti existent, avec un "
        "potentiel de rendement nettement inférieur."),
       ("Puis-je récupérer mon argent avant l’échéance ?",
        "Une valorisation est publiée régulièrement et une sortie est possible, mais au prix de marché du "
        "jour, qui peut être inférieur au capital investi.")],
  related=[("Fonds obligataires et produits de taux", "fonds-obligataires.html"),
           ("Vous créer des revenus complémentaires", "revenus-complementaires.html"),
           ("Compte-titres et PEA", "compte-titres-pea.html")],
),

"fonds-obligataires.html": dict(
  parent=P_FIN,
  title="Fonds obligataires et produits de taux",
  full_title="Obligations et fonds datés pour un capital de cession · Officine & Patrimoine",
  lede="Le cœur de la poche de revenus : des coupons réguliers, une échéance connue et une visibilité que les "
       "actions n’offrent pas.",
  desc="Fonds obligataires datés et obligations d'entreprises : rendement à l'échéance, qualité de crédit et diversification après une cession.",
  kw="fonds obligataire daté, obligations entreprises, rendement à l'échéance, investment grade, high yield, "
     "fonds à échéance, placement obligataire après cession, revenus coupons",
  img="institution.jpg", alt="Façade d’institution financière classique",
  eyebrow="Placements financiers", subtitle="Un rendement visible à l’avance",
  paras=[
    "Une obligation est un prêt : l’émetteur verse un coupon périodique et rembourse le nominal à l’échéance. "
    "Le rendement attendu est donc connu dès l’achat, sous réserve que l’émetteur honore ses engagements. "
    "C’est précisément cette visibilité qui en fait le socle d’une poche de revenus après une cession.",
    "Les fonds datés — ou fonds à échéance — appliquent cette logique à un portefeuille diversifié "
    "d’émetteurs, avec une maturité cible définie. Ils évitent la concentration sur un seul débiteur tout en "
    "conservant la lisibilité d’un rendement à l’échéance.",
    "Le risque principal n’est pas la variation de valeur en cours de vie, qui se résorbe à l’approche de "
    "l’échéance : c’est le défaut de l’émetteur. La sélection des signatures, la diversification et le "
    "dosage entre dettes de bonne qualité et dettes à haut rendement constituent l’essentiel du travail.",
  ],
  atouts=["Un rendement cible connu à la souscription",
          "Des coupons réguliers, utilisables comme revenu",
          "Une diversification sur plusieurs dizaines d’émetteurs",
          "Une détention possible en contrat, en compte-titres ou via une société"],
  blocks_title="Construire la poche de taux",
  blocks=[
    ("cards", "Trois briques", [
      ("doc", "Obligations en direct", "Pour des montants significatifs : maîtrise de l’échéance, du coupon "
       "et de l’émetteur, dans un compte-titres."),
      ("chart", "Fonds datés", "Portefeuille diversifié à maturité définie, accessible dès des montants "
       "plus modestes et en unités de compte."),
      ("lock", "Monétaire et comptes à terme", "La poche de liquidité immédiate, sans risque de "
       "valorisation, pour les dépenses des prochaines années."),
    ]),
    ("note", "Dettes de bonne qualité ou haut rendement", [
      "Les dettes d’émetteurs très bien notés offrent un rendement modéré et un risque de défaut faible ; "
      "les dettes à haut rendement rémunèrent davantage en contrepartie d’un risque de défaut réel.",
      "Le dosage entre les deux n’est pas une question de goût : il découle de la part du capital que vous "
      "pouvez vous permettre de voir diminuer.",
    ]),
  ],
  faq=[("Les obligations peuvent-elles perdre de la valeur ?",
        "En cours de vie, oui, notamment lorsque les taux montent. Si l’obligation est conservée jusqu’à "
        "l’échéance et que l’émetteur ne fait pas défaut, le nominal est remboursé : la perte intermédiaire "
        "n’est alors pas réalisée."),
       ("Faut-il préférer les fonds ou les titres en direct ?",
        "Les titres en direct donnent une maîtrise totale mais demandent un montant suffisant pour être "
        "diversifiés. En dessous, les fonds datés offrent la même logique avec une diversification "
        "immédiate.")],
  related=[("Comptes à terme", "comptes-a-terme.html"),
           ("Produits structurés", "produits-structures.html"),
           ("Vous créer des revenus complémentaires", "revenus-complementaires.html")],
),
}

SOLUTIONS.update({

"comptes-a-terme.html": dict(
  parent=P_TRE,
  title="Comptes à terme",
  full_title="Comptes à terme pour la trésorerie d'une holding de pharmacien · Officine & Patrimoine",
  lede="La solution de sécurité immédiate après l’encaissement du prix : capital garanti, rendement connu, "
       "durée choisie. Le temps de décider du reste.",
  desc="Comptes à terme pour placer le produit de la vente d'une pharmacie : capital garanti, taux connu et échéances échelonnées.",
  kw="compte à terme, placement trésorerie garantie, placer le prix de vente d'une pharmacie, taux compte à "
     "terme entreprise, trésorerie holding, dépôt à terme société",
  img="epargne.jpg", alt="Portefeuille, image de la trésorerie sécurisée",
  eyebrow="Trésorerie", subtitle="Sécuriser d’abord, décider ensuite",
  paras=[
    "Dans les jours qui suivent l’encaissement, la priorité n’est pas le rendement : c’est de ne pas laisser "
    "dormir des sommes importantes sur un compte courant non rémunéré, tout en conservant la capacité de "
    "décider sereinement.",
    "Le compte à terme répond exactement à ce besoin : le capital est garanti par l’établissement, le taux "
    "est fixé à la souscription, la durée est choisie. Une sortie anticipée reste possible, moyennant une "
    "réduction du rendement selon les conditions du contrat.",
    "Nous mettons plusieurs établissements en concurrence et nous échelonnons les échéances, de sorte "
    "qu’une fraction du capital redevienne disponible à intervalles réguliers, au rythme du déploiement de "
    "l’allocation.",
  ],
  atouts=["Capital garanti par l’établissement dépositaire",
          "Taux connu dès la souscription, fixe ou progressif",
          "Mise en concurrence de plusieurs banques, y compris pour une personne morale",
          "Échéances échelonnées pour conserver de la liquidité"],
  blocks_title="Bien l’utiliser",
  blocks=[
    ("checklist", "Nos règles", [
      "Répartir entre plusieurs établissements plutôt que concentrer",
      "Échelonner les échéances sur trois, six, douze et vingt-quatre mois",
      "Vérifier les conditions exactes de sortie anticipée",
      "Comparer le taux net après impôt, pas le taux affiché",
      "Conserver une part en disponibilité immédiate",
      "Ne pas en faire une solution de long terme : le rendement réel après inflation reste faible",
    ]),
  ],
  faq=[("Est-ce vraiment sans risque ?",
        "Le capital est garanti par l’établissement, dans la limite des mécanismes de garantie des dépôts "
        "applicables. Le risque résiduel est celui de l’établissement lui-même, d’où l’intérêt de répartir."),
       ("Combien de temps y laisser le produit de la cession ?",
        "Le temps d’établir le bilan patrimonial et de déployer l’allocation, soit généralement de un à six "
        "mois. Au-delà, le coût d’opportunité devient significatif.")],
  related=[("Trésorerie de votre holding", "tresorerie-holding.html"),
           ("Capitalisation pour personne morale", "capitalisation-personne-morale.html"),
           ("Fonds obligataires et produits de taux", "fonds-obligataires.html")],
),

"capitalisation-personne-morale.html": dict(
  parent=P_TRE,
  title="Contrat de capitalisation pour personne morale",
  full_title="Contrat de capitalisation pour une holding de pharmacien · Officine & Patrimoine",
  lede="L’enveloppe de trésorerie longue d’une société : une allocation diversifiée, une imposition annuelle "
       "forfaitaire et une régularisation à la sortie.",
  desc="Contrat de capitalisation pour une holding de pharmacien : fonctionnement, imposition forfaitaire annuelle et trésorerie longue.",
  kw="contrat de capitalisation personne morale, trésorerie holding placement, capitalisation société IS, "
     "placer la trésorerie d'une holding, imposition forfaitaire TME, trésorerie longue société",
  img="piliers.jpg", alt="Colonnes, image de la structure sociétaire",
  eyebrow="Trésorerie", subtitle="Faire travailler la trésorerie d’une société",
  paras=[
    "Une holding issue d’un apport-cession, ou une société patrimoniale constituée après la vente, détient "
    "souvent des liquidités importantes dont elle n’a pas l’usage immédiat. Laissées en compte courant, ces "
    "sommes ne produisent rien et se déprécient.",
    "Le contrat de capitalisation souscrit par la personne morale permet d’y loger une allocation "
    "diversifiée : fonds en euros lorsque l’assureur l’autorise, fonds obligataires, actions, parfois "
    "immobilier papier. La société conserve la maîtrise complète de l’allocation et des rachats.",
    "Sa fiscalité est particulière : la société est imposée chaque année sur un produit calculé "
    "forfaitairement, indépendamment de la performance réelle, puis une régularisation intervient lors du "
    "rachat en fonction du gain effectivement réalisé. Ce mécanisme lisse l’imposition et, lorsque la "
    "performance dépasse le forfait, en diffère une partie.",
  ],
  atouts=["Une allocation diversifiée au sein d’une seule enveloppe",
          "Une imposition annuelle forfaitaire, lissée dans le temps",
          "La pleine maîtrise des rachats par la société",
          "Une comptabilisation simple pour votre expert-comptable"],
  blocks_title="Où il s’inscrit",
  blocks=[
    ("cards", "La trésorerie d’une holding, par horizon", [
      ("lock", "Court terme", "Comptes à terme et fonds monétaires : les sommes dont la société peut avoir "
       "besoin dans l’année."),
      ("doc", "Moyen terme", "Fonds obligataires datés et produits structurés, en direct ou au sein du "
       "contrat de capitalisation."),
      ("growth", "Long terme", "Contrat de capitalisation diversifié, private equity, immobilier : la "
       "trésorerie que la société n’utilisera pas avant plusieurs années."),
    ]),
    ("note", "Attention à la qualification de la société", [
      "Une société dont l’actif devient majoritairement financier peut perdre certains régimes de faveur, "
      "notamment en matière de transmission. Si la holding détient encore des participations opérationnelles "
      "ou si un pacte est envisagé, l’allocation doit en tenir compte.",
      "Ce point se traite avec votre expert-comptable et votre avocat avant d’arbitrer la trésorerie.",
    ]),
  ],
  faq=[("Une société peut-elle souscrire une assurance-vie ?",
        "Non : l’assurance-vie repose sur l’aléa du décès d’une personne physique. Pour une société, c’est "
        "le contrat de capitalisation qui s’y substitue."),
       ("L’imposition forfaitaire est-elle pénalisante ?",
        "Elle l’est les années de faible performance, puisqu’elle s’applique indépendamment du résultat "
        "réel, mais la régularisation finale rétablit l’équilibre en fonction du gain effectif.")],
  related=[("Trésorerie de votre holding", "tresorerie-holding.html"),
           ("Apport-cession et holding", "apport-cession-holding.html"),
           ("Contrat de capitalisation", "contrat-capitalisation.html")],
),

"mandats-tresorerie.html": dict(
  parent=P_TRE,
  title="Mandats de gestion de trésorerie",
  full_title="Mandat de gestion pour la trésorerie d'une société · Officine & Patrimoine",
  lede="Déléguer la gestion de la trésorerie longue à une société de gestion sélectionnée, avec un cahier des "
       "charges écrit et un reporting régulier.",
  desc="Mandats de gestion de trésorerie pour une holding de pharmacien : profils de risque, reporting et sélection des gérants.",
  kw="mandat de gestion trésorerie, gestion déléguée holding, société de gestion sélection, mandat "
     "obligataire, gestion pilotée trésorerie entreprise",
  img="cour.jpg", alt="Cour classique, image de la délégation confiante",
  eyebrow="Trésorerie", subtitle="Déléguer, sans perdre le contrôle",
  paras=[
    "Au-delà d’un certain montant, la gestion de la trésorerie d’une société gagne à être confiée à une "
    "société de gestion professionnelle, dans le cadre d’un mandat écrit qui fixe l’horizon, le niveau de "
    "risque acceptable, les classes d’actifs autorisées et les contraintes de liquidité.",
    "Notre rôle est de sélectionner le gérant, de négocier les conditions, de rédiger le cahier des charges "
    "avec vous et de contrôler l’exécution : performance, respect du mandat, frais réels, cohérence avec le "
    "reste du patrimoine.",
    "Le mandat ne vous dessaisit pas : vous en fixez les règles, vous recevez un reporting périodique et "
    "vous pouvez le faire évoluer ou y mettre fin.",
  ],
  atouts=["Un cahier des charges écrit, négocié avec vous",
          "Plusieurs sociétés de gestion mises en concurrence",
          "Un reporting périodique et un point de suivi régulier",
          "Un contrôle indépendant de la performance et des frais"],
  faq=[("À partir de quel montant un mandat a-t-il du sens ?",
        "Les seuils varient selon les gérants ; en deçà, une gestion par supports collectifs atteint le même "
        "résultat à moindre coût. Nous le disons lorsque c’est le cas."),
       ("Qui décide des investissements ?",
        "Le gérant, dans les limites du mandat que vous avez fixé. Vous gardez la main sur ces limites et "
        "sur la poursuite du mandat.")],
  related=[("Trésorerie de votre holding", "tresorerie-holding.html"),
           ("Capitalisation pour personne morale", "capitalisation-personne-morale.html")],
),

"fonds-private-equity.html": dict(
  parent=P_PE,
  title="Fonds de private equity",
  full_title="Fonds de private equity pour un capital de cession · Officine & Patrimoine",
  lede="Investir au capital d’entreprises non cotées, aux côtés de gérants sélectionnés : une prime de "
       "rendement potentielle en contrepartie d’une immobilisation longue.",
  desc="Fonds de private equity après cession : millésimes, appels de fonds, sélection des gérants et éligibilité au remploi.",
  kw="private equity pharmacien, FPCI, FCPR, capital investissement, millésimes, appels de fonds, "
     "investissement non coté, remploi apport cession éligible",
  img="foret.jpg", alt="Forêt vue du ciel, image de la croissance longue",
  eyebrow="Non coté", subtitle="Du capital patient, correctement dosé",
  paras=[
    "Le private equity consiste à financer des entreprises non cotées, en croissance ou en transmission, via "
    "des fonds gérés par des équipes spécialisées. La performance potentielle vient de la création de valeur "
    "opérationnelle sur cinq à dix ans, et non des variations de marché.",
    "L’engagement est d’une autre nature que celui d’un placement coté : le capital est appelé "
    "progressivement, immobilisé plusieurs années, et la valeur du portefeuille peut d’abord baisser avant "
    "de croître — ce que les professionnels appellent la courbe en J. En contrepartie, la dispersion des "
    "résultats entre gérants est forte : la sélection fait l’essentiel du résultat.",
    "Pour un capital de cession, cette classe d’actifs a deux usages : une poche minoritaire de "
    "diversification longue, et, le cas échéant, le remploi d’un apport-cession lorsque le véhicule respecte "
    "les quotas exigés par le texte.",
  ],
  atouts=["Une sélection de gérants, pas un catalogue de fonds",
          "Un étalement sur plusieurs millésimes pour lisser le risque",
          "Des véhicules éligibles au remploi d’un apport-cession lorsque c’est l’objectif",
          "Un suivi des appels de fonds et des distributions"],
  blocks_title="Ce qu’il faut accepter",
  blocks=[
    ("checklist", "Avant de souscrire", [
      "Une immobilisation de huit à dix ans, parfois davantage",
      "Des appels de fonds échelonnés, à honorer à chaque demande",
      "Une absence de valorisation quotidienne et une liquidité très réduite",
      "Un risque de perte en capital réel, y compris total sur une ligne",
      "Une dispersion forte des performances entre gérants et millésimes",
      "Une part du patrimoine limitée à ce que vous pouvez immobiliser sans contrainte",
    ]),
    ("note", "Remploi d’un apport-cession", [
      "Certains fonds professionnels respectent les quotas d’investissement exigés pour constituer un remploi "
      "éligible après un apport-cession. Tous ne les respectent pas, et l’éligibilité doit être confirmée "
      "par la documentation du fonds et par votre conseil fiscal, et non par une mention commerciale.",
    ]),
  ],
  faq=[("Quelle part du capital y consacrer ?",
        "Une part minoritaire, définie après avoir sécurisé vos revenus et votre poche de liquidité. "
        "L’illiquidité n’est acceptable que sur un capital dont vous n’aurez pas besoin."),
       ("Quand les distributions arrivent-elles ?",
        "Généralement à partir de la quatrième ou cinquième année, puis de façon irrégulière jusqu’à la "
        "liquidation du fonds. Aucun calendrier n’est garanti.")],
  related=[("Club deals et co-investissement", "club-deals.html"),
           ("Dette privée et actifs réels", "dette-privee.html"),
           ("Apport-cession et holding", "apport-cession-holding.html")],
),

"club-deals.html": dict(
  parent=P_PE,
  title="Club deals et co-investissement",
  full_title="Club deals et co-investissement pour pharmaciens cédants · Officine & Patrimoine",
  lede="Investir directement dans une opération identifiée, aux côtés d’un nombre restreint d’investisseurs : "
       "une exposition concentrée, lisible, à réserver à une fraction limitée du patrimoine.",
  desc="Club deals et co-investissement : opérations identifiées, dossier complet et concentration du risque à doser dans une allocation.",
  kw="club deal investissement, co-investissement non coté, opération identifiée, ticket club deal, "
     "investir dans une PME après cession",
  img="gratte-ciel.jpg", alt="Tours de verre, image de l’investissement direct",
  eyebrow="Non coté", subtitle="Une opération, un dossier, une décision",
  paras=[
    "À la différence d’un fonds, le club deal porte sur une opération précise : une société, un immeuble, un "
    "projet. Vous connaissez l’actif, le prix, le plan de financement et l’horizon de sortie avant de vous "
    "engager, et vous décidez ligne par ligne.",
    "Cette lisibilité a une contrepartie : la concentration. Un club deal n’est pas diversifié par "
    "construction ; son résultat dépend d’un seul actif et d’une seule équipe. Il se dose en conséquence et "
    "se répartit sur plusieurs opérations et plusieurs années.",
    "Nous ne présentons que des opérations dont nous avons examiné la documentation, l’historique du "
    "promoteur ou du gérant, et la structuration juridique — et nous expliquons systématiquement ce qui peut "
    "mal se passer.",
  ],
  atouts=["Un dossier complet communiqué avant toute décision",
          "Un promoteur ou un gérant dont nous connaissons l’historique",
          "Une structuration juridique vérifiée",
          "Un dosage limité par rapport au patrimoine total"],
  faq=[("Quel est le ticket d’entrée habituel ?",
        "Il varie selon les opérations et reste généralement réservé à des investisseurs avertis. Nous ne "
        "proposons un club deal que si votre allocation permet d’en absorber la concentration."),
       ("Peut-on sortir avant l’échéance ?",
        "Rarement, et jamais de façon garantie. Il faut considérer les sommes comme immobilisées jusqu’à la "
        "sortie prévue, voire au-delà.")],
  related=[("Fonds de private equity", "fonds-private-equity.html"),
           ("Club deals immobiliers", "club-deals-immobiliers.html"),
           ("Dette privée et actifs réels", "dette-privee.html")],
),

"dette-privee.html": dict(
  parent=P_PE,
  title="Dette privée et actifs réels",
  full_title="Dette privée et infrastructures pour un capital de cession · Officine & Patrimoine",
  lede="Prêter plutôt que prendre du capital : des revenus contractuels, une volatilité faible et une "
       "corrélation réduite aux marchés cotés.",
  desc="Dette privée, financement d'entreprises et infrastructures : une poche de rendement contractuel pour "
       "un pharmacien ayant cédé son officine.",
  kw="dette privée, fonds de dette, financement d'entreprises non cotées, infrastructures, actifs réels, "
     "rendement contractuel, décorrélation marchés",
  img="pont-transmission.jpg", alt="Pont de pierre, image des actifs d’infrastructure",
  eyebrow="Non coté", subtitle="Le rendement du prêteur",
  paras=[
    "La dette privée consiste à financer directement des entreprises ou des projets, en dehors du système "
    "bancaire et des marchés obligataires cotés. L’investisseur perçoit des intérêts contractuels, "
    "généralement supérieurs à ceux des obligations cotées de qualité comparable, en contrepartie d’une "
    "liquidité réduite.",
    "Les actifs d’infrastructure — énergie, réseaux, équipements — relèvent de la même logique : des revenus "
    "longs, souvent indexés, adossés à des actifs physiques et à des contrats de longue durée.",
    "Pour un capital de cession, cette poche apporte du rendement avec une volatilité comptable faible. Le "
    "risque reste celui du crédit : il se gère par la diversification des emprunteurs et par la qualité des "
    "sûretés.",
  ],
  atouts=["Des revenus contractuels, souvent trimestriels",
          "Une volatilité de valorisation plus faible que les marchés cotés",
          "Une diversification par rapport aux actions et à l’immobilier",
          "Des fonds accessibles en direct ou au sein d’un contrat"],
  faq=[("Est-ce moins risqué que le private equity ?",
        "Le profil est différent : en tant que prêteur, vous êtes servi avant les actionnaires et les "
        "revenus sont contractuels, mais le risque de défaut existe et la liquidité reste réduite."),
       ("Ces fonds distribuent-ils des revenus ?",
        "Beaucoup proposent une part de distribution, trimestrielle ou annuelle, qui peut alimenter votre "
        "revenu complémentaire.")],
  related=[("Fonds de private equity", "fonds-private-equity.html"),
           ("Fonds obligataires et produits de taux", "fonds-obligataires.html"),
           ("Vous créer des revenus complémentaires", "revenus-complementaires.html")],
),
})

SOLUTIONS.update({

"scpi.html": dict(
  parent=P_IMM,
  title="SCPI et immobilier géré",
  full_title="SCPI après la vente d'une pharmacie : revenus et diversification · Officine & Patrimoine",
  lede="De l’immobilier sans gestion, mutualisé sur des dizaines d’immeubles et de locataires, distribuant un "
       "revenu trimestriel. Avec une fiscalité qu’il faut traiter avant d’acheter.",
  desc="SCPI après la vente d'une pharmacie : revenus trimestriels, mutualisation, fiscalité des revenus fonciers et modes de détention.",
  kw="SCPI pharmacien, SCPI après cession, revenus fonciers SCPI, SCPI en assurance vie, SCPI nue-propriété, "
     "SCPI européennes, rendement SCPI, parts de SCPI à crédit",
  img="pierre.jpg", alt="Immeubles haussmanniens, image de l’immobilier collectif",
  eyebrow="Immobilier", subtitle="L’immobilier, sans les contraintes",
  paras=[
    "Une société civile de placement immobilier collecte l’épargne de nombreux associés pour acquérir et "
    "gérer un patrimoine immobilier locatif : bureaux, commerces, santé, logistique, en France et en Europe. "
    "L’associé perçoit sa quote-part de loyers, nette de frais de gestion, sans aucune contrainte "
    "d’exploitation.",
    "Pour un pharmacien qui vient de céder, l’intérêt est double : retrouver un revenu régulier adossé à des "
    "actifs réels, et diversifier un patrimoine souvent déjà concentré sur un seul immeuble — les murs de "
    "l’officine.",
    "La fiscalité est le point d’attention majeur. Détenus en direct, les revenus de SCPI sont imposés comme "
    "des revenus fonciers, au barème de l’impôt sur le revenu et aux prélèvements sociaux : pour un "
    "contribuable fortement imposé, le rendement net fond. D’où l’importance du mode de détention.",
  ],
  atouts=["Aucune gestion locative à assumer",
          "Une mutualisation sur des dizaines d’immeubles et de locataires",
          "Une distribution trimestrielle, utilisable comme revenu",
          "Plusieurs modes de détention, à choisir selon votre fiscalité"],
  blocks_title="Quatre façons de détenir des SCPI",
  blocks=[
    ("table", "Choisir le bon mode de détention", ["Mode", "Intérêt", "Limite"],
     [["En direct", "Revenu immédiat, large choix de sociétés",
       "Revenus fonciers imposés au barème et aux prélèvements sociaux"],
      ["Au sein d’un contrat d’assurance-vie", "Fiscalité de l’enveloppe, souplesse des rachats",
       "Choix de SCPI restreint, quote-part de revenus parfois réduite par l’assureur"],
      ["En nue-propriété temporaire", "Prix décoté, aucun revenu donc aucune fiscalité pendant la période",
       "Aucun revenu avant le terme ; capital immobilisé"],
      ["Via une société à l’impôt sur les sociétés", "Amortissement, capitalisation dans la société",
       "Fiscalité à la sortie des liquidités"]]),
    ("note", "Ce que nous regardons dans une SCPI", [
      "Le taux de distribution ne dit presque rien à lui seul. Nous examinons le taux d’occupation financier, "
      "la qualité et la diversification des locataires, le niveau des réserves, la politique de "
      "revalorisation du prix de part, l’endettement du véhicule, la collecte récente et les frais réels.",
      "La liquidité est réduite : la revente des parts dépend de la demande, et peut prendre du temps.",
    ]),
  ],
  faq=[("Le capital est-il garanti ?",
        "Non. La valeur des parts suit celle du patrimoine immobilier détenu : elle peut baisser, comme l’ont "
        "montré les réévaluations récentes de certaines SCPI de bureaux."),
       ("Faut-il acheter des SCPI à crédit après une cession ?",
        "Le crédit a un intérêt fiscal — les intérêts s’imputent sur les revenus fonciers — mais s’endetter "
        "alors que l’on dispose de liquidités n’a de sens que dans une logique précise, à chiffrer."),
       ("SCPI ou murs de pharmacie ?",
        "Les deux sont de l’immobilier, mais l’un est concentré sur un locataire unique et l’autre mutualisé. "
        "C’est justement la raison pour laquelle ils se complètent mal : conserver les murs plaide pour "
        "diversifier ailleurs.")],
  related=[("Que faire des murs de l’officine ?", "murs-officine.html"),
           ("Immobilier de santé", "immobilier-sante.html"),
           ("Nue-propriété et démembrement", "nue-propriete.html")],
),

"immobilier-sante.html": dict(
  parent=P_IMM,
  title="Immobilier de santé",
  full_title="Investir dans l'immobilier de santé après une cession d'officine · Officine & Patrimoine",
  lede="Murs de pharmacies, maisons de santé, cliniques, laboratoires : un secteur que vous connaissez mieux "
       "que personne, et dont les baux sont adossés à une activité réglementée.",
  desc="Immobilier de santé : murs d'officines, maisons de santé et cliniques, en direct ou via des véhicules collectifs mutualisés.",
  kw="immobilier de santé, murs de pharmacie investissement, maison de santé pluriprofessionnelle, SCPI santé, "
     "EHPAD investissement, clinique immobilier, investir dans la santé pharmacien",
  img="officine-rayonnages.jpg", alt="Rayonnages d’une officine, boîtes de médicaments alignées",
  eyebrow="Immobilier", subtitle="Un secteur que vous maîtrisez",
  paras=[
    "Peu d’investisseurs comprennent aussi bien qu’un ancien titulaire ce qui fait la valeur d’un local de "
    "santé : l’emplacement, le flux de patientèle, la densité médicale environnante, la solidité économique "
    "de l’exploitant, la réglementation qui encadre son activité.",
    "L’immobilier de santé recouvre plusieurs réalités : les murs d’officines, les maisons de santé "
    "pluriprofessionnelles, les cabinets médicaux et dentaires, les laboratoires d’analyses, les cliniques et "
    "les établissements médico-sociaux. Les baux y sont souvent longs, les exploitants stables, et la demande "
    "soutenue par la démographie.",
    "L’accès se fait en direct, pour les actifs de taille modeste, ou via des véhicules collectifs — SCPI "
    "spécialisées, fonds immobiliers thématiques, club deals — pour mutualiser le risque locatif.",
  ],
  atouts=["Un secteur dont vous connaissez les ressorts économiques",
          "Des baux longs, adossés à des activités réglementées",
          "Une demande soutenue par la démographie et le vieillissement",
          "Un accès en direct ou via des véhicules mutualisés"],
  blocks_title="Les points d’attention",
  blocks=[
    ("checklist", "Avant d’investir dans un actif de santé", [
      "La solidité financière réelle de l’exploitant et de son modèle",
      "La durée résiduelle du bail et les conditions de renouvellement",
      "La dépendance de l’actif à un seul professionnel ou à une seule autorisation",
      "L’évolution de la démographie médicale sur la zone",
      "La conformité réglementaire et les travaux à prévoir",
      "La réversibilité du local en cas de départ de l’exploitant",
      "Le risque de concentration si vous conservez déjà les murs de votre officine",
    ]),
  ],
  faq=[("Est-ce plus sûr qu’un autre immobilier commercial ?",
        "Les baux de santé sont souvent longs et les exploitants stables, mais aucun actif immobilier n’est "
        "sans risque : la dépendance à une autorisation d’exploitation ou à un praticien unique peut au "
        "contraire concentrer le risque."),
       ("Puis-je racheter les murs d’une autre officine ?",
        "C’est possible et parfois pertinent, mais cela reproduit la concentration que la cession venait "
        "précisément de résoudre. Nous le chiffrons dans le cadre de l’allocation globale.")],
  related=[("Que faire des murs de l’officine ?", "murs-officine.html"),
           ("SCPI et immobilier géré", "scpi.html"),
           ("Club deals immobiliers", "club-deals-immobiliers.html")],
),

"nue-propriete.html": dict(
  parent=P_IMM,
  title="Nue-propriété et démembrement",
  full_title="Nue-propriété immobilière : capitaliser sans fiscalité · Officine & Patrimoine",
  lede="Acheter la propriété sans l’usage, à prix décoté, pendant une durée fixée : aucun revenu, donc aucune "
       "fiscalité, et une reconstitution automatique de la pleine propriété au terme.",
  desc="Nue-propriété immobilière : prix décoté, aucun revenu donc aucune fiscalité, et reconstitution automatique de la pleine propriété.",
  kw="nue-propriété immobilière, démembrement temporaire, usufruit locatif social, décote nue-propriété, "
     "investissement sans fiscalité, SCPI nue-propriété, réduire son IFI",
  img="paris.jpg", alt="Toits parisiens, image de la pierre détenue à long terme",
  eyebrow="Immobilier", subtitle="Capitaliser sans percevoir",
  paras=[
    "Dans un démembrement temporaire, vous achetez la nue-propriété d’un bien ou de parts de SCPI tandis "
    "qu’un tiers — bailleur institutionnel ou investisseur — en détient l’usufruit pour une durée fixée, "
    "généralement de dix à vingt ans. Vous payez un prix décoté correspondant à la seule nue-propriété.",
    "Pendant toute la période, vous ne percevez aucun revenu : vous ne supportez donc ni impôt sur le revenu, "
    "ni prélèvements sociaux sur ce placement, et la nue-propriété n’entre en principe pas dans l’assiette de "
    "l’impôt sur la fortune immobilière, l’usufruitier en étant redevable.",
    "Au terme, la pleine propriété se reconstitue automatiquement, sans frais ni imposition supplémentaire. "
    "C’est une stratégie de capitalisation pure, particulièrement adaptée aux années de forte imposition qui "
    "suivent une cession.",
  ],
  atouts=["Un prix d’acquisition décoté par rapport à la pleine propriété",
          "Aucun revenu, donc aucune imposition pendant le démembrement",
          "Aucune gestion locative ni charge d’entretien, supportées par l’usufruitier",
          "Une reconstitution automatique de la pleine propriété au terme"],
  blocks_title="Pour qui, et à quelles conditions",
  blocks=[
    ("checklist", "Le profil adapté", [
      "Vous êtes fortement imposé et n’avez pas besoin de ce revenu",
      "Vous disposez d’autres sources de revenus pour les années à venir",
      "Vous acceptez d’immobiliser le capital pour toute la durée prévue",
      "Vous visez une transmission : la nue-propriété se donne facilement",
      "Vous cherchez à réduire votre assiette d’impôt sur la fortune immobilière",
      "Vous n’avez pas besoin de liquidité sur cette fraction du patrimoine",
    ]),
    ("note", "La contrepartie est réelle", [
      "Pendant toute la durée du démembrement, le capital ne produit rien et sa revente est difficile : le "
      "marché secondaire de la nue-propriété est étroit.",
      "Cette poche ne doit donc représenter qu’une fraction du patrimoine, après avoir sécurisé revenus et "
      "liquidités.",
    ]),
  ],
  faq=[("Quelle décote peut-on attendre ?",
        "Elle dépend de la durée du démembrement et du rendement de l’actif : plus la durée est longue, plus "
        "la décote est importante. Elle est fixée contractuellement à l’acquisition."),
       ("Puis-je donner la nue-propriété à mes enfants ?",
        "Oui, et c’est fréquemment l’objectif : l’actif se transmet à une valeur réduite, et les enfants "
        "récupèrent la pleine propriété au terme.")],
  related=[("SCPI et immobilier géré", "scpi.html"),
           ("Transmettre à vos enfants", "transmission-pharmacien.html"),
           ("Contrat de capitalisation", "contrat-capitalisation.html")],
),

"club-deals-immobiliers.html": dict(
  parent=P_IMM,
  title="Club deals immobiliers",
  full_title="Club deals immobiliers pour un capital de cession · Officine & Patrimoine",
  lede="Participer à une opération immobilière identifiée, avec un petit nombre d’investisseurs, un horizon "
       "défini et un plan de sortie écrit.",
  desc="Club deals immobiliers : opérations identifiées, promoteurs sélectionnés, horizon de sortie et risques "
       "d'une participation concentrée.",
  kw="club deal immobilier, investissement immobilier collectif, opération immobilière identifiée, "
     "co-investissement immobilier, marchand de biens investisseur",
  img="immobilier.jpg", alt="Façade d’immeuble en pierre",
  eyebrow="Immobilier", subtitle="Un actif, un horizon, un plan de sortie",
  paras=[
    "Le club deal immobilier réunit quelques investisseurs autour d’une opération précise : acquisition d’un "
    "immeuble à restructurer, développement d’un actif logistique ou de santé, portage d’un ensemble à "
    "revendre par lots. Le dossier est connu avant l’engagement.",
    "L’horizon est généralement de trois à six ans, avec un plan de sortie défini dès l’origine. Le "
    "rendement attendu est supérieur à celui d’un placement mutualisé, en contrepartie d’une concentration "
    "sur un seul actif et d’une absence totale de liquidité intermédiaire.",
    "Nous privilégions des opérateurs dont nous connaissons l’historique sur plusieurs cycles, et nous "
    "examinons systématiquement le scénario défavorable : que se passe-t-il si la revente prend deux ans de "
    "plus que prévu.",
  ],
  atouts=["Un actif identifié, visitable et documenté",
          "Un opérateur dont nous connaissons le parcours",
          "Un plan de sortie écrit et un horizon annoncé",
          "Une structuration juridique vérifiée en amont"],
  faq=[("Quel est le principal risque ?",
        "L’allongement de la durée : un actif qui ne se revend pas au rythme prévu immobilise le capital "
        "plus longtemps et érode le rendement. Le risque de perte en capital existe également."),
       ("Est-ce adapté juste après une cession ?",
        "Seulement pour une fraction limitée, et après avoir sécurisé vos revenus et votre liquidité.")],
  related=[("Club deals et co-investissement", "club-deals.html"),
           ("Immobilier de santé", "immobilier-sante.html"),
           ("SCPI et immobilier géré", "scpi.html")],
),

"holding-spfpl.html": dict(
  parent=P_STR,
  title="Holding patrimoniale et SPFPL",
  full_title="Holding patrimoniale ou SPFPL pour un pharmacien · Officine & Patrimoine",
  lede="Deux structures voisines, deux usages distincts : la société de participations financières de "
       "professions libérales pour détenir des titres d’officine, la holding patrimoniale pour capitaliser "
       "après la cession.",
  desc="Holding patrimoniale et SPFPL de pharmacien : différences, usages, fiscalité des dividendes et des "
       "distributions, transmission des titres.",
  kw="SPFPL pharmacien, holding patrimoniale, société de participations financières professions libérales, "
     "holding après cession officine, régime mère-fille, distribution dividendes holding",
  img="piliers.jpg", alt="Colonnes classiques, image de la structure",
  eyebrow="Structuration", subtitle="La bonne structure dépend de ce que vous conservez",
  paras=[
    "La société de participations financières de professions libérales est conçue pour détenir des "
    "participations dans des sociétés d’exercice libéral. Pour un pharmacien, elle a du sens si vous "
    "conservez une participation dans une officine, si vous accompagnez l’installation d’un repreneur ou "
    "d’un enfant, ou si vous détenez des parts dans plusieurs structures d’exercice.",
    "Si vous avez cédé la totalité de votre officine et réinvestissez hors du secteur, c’est une holding "
    "patrimoniale de droit commun — société à l’impôt sur les sociétés — qui est généralement adaptée. Elle "
    "permet de capitaliser à la fiscalité des sociétés, de loger des actifs de rendement et de préparer la "
    "transmission par donation des titres.",
    "Dans les deux cas, le point sensible est le même : les liquidités logées dans une société n’appartiennent "
    "pas à votre patrimoine privé. Leur sortie, sous forme de dividendes ou de réduction de capital, est "
    "fiscalisée. La structure se justifie si vous capitalisez ; elle pèse si vous avez besoin du revenu.",
  ],
  atouts=["Une analyse comparée : détention en direct ou via une société",
          "Le chiffrage du coût réel de sortie des liquidités",
          "La préparation de la transmission des titres dès la constitution",
          "La coordination avec votre expert-comptable et votre avocat"],
  blocks_title="Arbitrer entre direct et société",
  blocks=[
    ("table", "Les deux voies", ["Critère", "Détention en direct", "Via une société à l’IS"],
     [["Fiscalité des revenus du capital", "Prélèvement forfaitaire unique ou barème",
       "Impôt sur les sociétés, puis imposition à la distribution"],
      ["Capitalisation", "Fiscalisée au fil des arbitrages hors enveloppes dédiées",
       "Efficace tant que les sommes restent dans la société"],
      ["Besoin de revenus personnels", "Immédiat et sans frottement",
       "Nécessite une distribution, fiscalisée"],
      ["Transmission", "Donation des actifs eux-mêmes",
       "Donation des titres, éventuellement démembrée, souvent plus souple"],
      ["Formalisme", "Aucun", "Comptabilité, assemblée, déclarations"]]),
    ("note", "Une structure n’est pas un objectif", [
      "Créer une société après la cession ne fait pas disparaître l’impôt déjà dû sur la plus-value : "
      "l’effet de levier fiscal se joue <em>avant</em> la vente, par l’apport des titres.",
      "Après coup, la société reste utile pour capitaliser et transmettre, mais elle doit être justifiée par "
      "un usage réel, et non constituée par principe.",
    ]),
  ],
  faq=[("Puis-je loger mon assurance-vie dans la holding ?",
        "Non : une société ne peut pas souscrire d’assurance-vie. Elle souscrit un contrat de capitalisation, "
        "qui en est l’équivalent pour les personnes morales."),
       ("La holding complique-t-elle la transmission ?",
        "Au contraire, elle la facilite souvent : les titres se donnent par fractions, se démembrent et "
        "permettent d’organiser la gouvernance entre plusieurs enfants.")],
  related=[("Apport-cession et holding", "apport-cession-holding.html"),
           ("Trésorerie de votre holding", "tresorerie-holding.html"),
           ("SCI patrimoniale", "sci-patrimoniale.html")],
),

"sci-patrimoniale.html": dict(
  parent=P_STR,
  title="SCI patrimoniale",
  full_title="SCI pour détenir les murs de l'officine et l'immobilier familial · Officine & Patrimoine",
  lede="L’outil classique de détention et de transmission de l’immobilier, dont le régime fiscal — impôt sur "
       "le revenu ou impôt sur les sociétés — engage pour longtemps.",
  desc="SCI patrimoniale : détention des murs d'officine, choix entre impôt sur le revenu et impôt sur les sociétés, transmission des parts.",
  kw="SCI murs de pharmacie, SCI à l'IR ou à l'IS, SCI familiale transmission, parts de SCI donation, "
     "société civile immobilière pharmacien",
  img="pierre.jpg", alt="Immeubles en pierre de taille",
  eyebrow="Structuration", subtitle="Détenir, transmettre, gouverner",
  paras=[
    "La société civile immobilière sert trois objectifs : détenir un bien à plusieurs sans indivision, "
    "transmettre progressivement par donation de parts, et organiser la gouvernance entre associés grâce aux "
    "statuts et aux pouvoirs du gérant.",
    "Son régime fiscal est la décision structurante. À l’impôt sur le revenu, les loyers remontent dans votre "
    "déclaration personnelle et s’ajoutent à vos autres revenus. À l’impôt sur les sociétés, la société "
    "amortit le bien et capitalise, mais la plus-value de cession future est calculée sur une valeur nette "
    "comptable diminuée des amortissements, et la sortie des liquidités est fiscalisée.",
    "Pour les murs d’une officine, le choix dépend de votre horizon : conserver longtemps et transmettre "
    "plaide pour une logique de capitalisation ; vendre à moyen terme plaide pour la simplicité.",
  ],
  atouts=["Une transmission par donation de parts, échelonnée dans le temps",
          "Des statuts qui organisent les pouvoirs et protègent le conjoint",
          "Une sortie de l’indivision en cas de pluralité d’héritiers",
          "Un cadre adapté à la détention de plusieurs biens"],
  blocks_title="Les points de vigilance",
  blocks=[
    ("checklist", "Ce qu’une SCI exige", [
      "Une comptabilité tenue et des assemblées effectives",
      "Des statuts rédigés pour votre situation, et non recopiés",
      "Une réflexion sur le régime fiscal, difficilement réversible",
      "Un traitement rigoureux des comptes courants d’associés",
      "Une articulation avec le régime matrimonial",
      "Une clause d’agrément cohérente avec vos objectifs de transmission",
    ]),
  ],
  faq=[("Peut-on changer de régime fiscal en cours de route ?",
        "Le passage à l’impôt sur les sociétés est possible mais produit des effets fiscaux immédiats et "
        "n’est, en pratique, pas réversible. Il se décide avec votre conseil."),
       ("La SCI permet-elle d’éviter l’impôt sur la fortune immobilière ?",
        "Non : les parts de SCI sont valorisées à hauteur de l’immobilier détenu. Seul le démembrement "
        "modifie la répartition de l’assiette entre usufruitier et nu-propriétaire.")],
  related=[("Que faire des murs de l’officine ?", "murs-officine.html"),
           ("Holding patrimoniale et SPFPL", "holding-spfpl.html"),
           ("Transmettre à vos enfants", "transmission-pharmacien.html")],
),

"donation-avant-cession.html": dict(
  parent=P_STR,
  title="Donation avant cession",
  full_title="Donation avant cession d'officine : purger la plus-value · Officine & Patrimoine",
  lede="Donner des titres avant de vendre permet de transmettre et de purger la plus-value latente sur la "
       "part donnée. Un dispositif puissant, strictement encadré, qui se prépare des mois à l’avance.",
  desc="Donation avant cession pour un pharmacien : purge de la plus-value latente, conditions de validité et risque de requalification.",
  kw="donation avant cession, purge plus-value donation, donner des parts avant de vendre, donation-cession "
     "requalification, abus de droit donation cession, transmettre avant la vente",
  img="famille-champ.jpg", alt="Famille dans un champ au soleil couchant",
  eyebrow="Structuration", subtitle="Transmettre d’abord, vendre ensuite",
  paras=[
    "Lorsque vous donnez des titres, le donataire les reçoit à leur valeur au jour de la donation. Si la "
    "vente intervient ensuite à ce même prix, la plus-value imposable entre ses mains est nulle ou très "
    "faible : la plus-value latente accumulée pendant vos années d’exercice est <strong>purgée</strong>.",
    "L’opération cumule donc deux effets : elle transmet une partie du patrimoine en utilisant les "
    "abattements disponibles, et elle supprime l’imposition de la plus-value sur la fraction donnée. Sur une "
    "cession d’officine, l’économie peut être considérable.",
    "L’administration surveille étroitement ces montages. Trois conditions sont déterminantes : la donation "
    "doit être réelle et irrévocable, elle doit être antérieure à l’engagement de vente, et le donateur ne "
    "doit pas récupérer le prix de cession. Une donation signée après une promesse ferme, ou suivie d’une "
    "réappropriation des fonds, est requalifiable.",
  ],
  atouts=["Une analyse préalable de la faisabilité et du calendrier",
          "Une coordination étroite avec votre notaire et votre avocat fiscaliste",
          "Le choix entre pleine propriété et nue-propriété des titres donnés",
          "Le réinvestissement organisé des sommes revenant aux donataires"],
  blocks_title="Les conditions à respecter",
  blocks=[
    ("checklist", "Ce qui sécurise l’opération", [
      "Une donation établie par acte notarié, antérieure à tout engagement de vente",
      "Une absence de mandat de vente irrévocable signé avant la donation",
      "Un dépossession effective : les donataires perçoivent réellement le prix",
      "Une absence de reversement ou de prêt du donataire au donateur",
      "Un pacte adjoint éventuel, encadrant le remploi sans priver de la propriété",
      "Une documentation complète et cohérente, conservée en cas de contrôle",
    ]),
    ("note", "Donner n’est pas prêter", [
      "La tentation de donner puis de récupérer l’usage des fonds est la cause principale de "
      "requalification. Si vous avez besoin du produit de la cession pour vivre, la donation doit porter sur "
      "une fraction que vous pouvez réellement abandonner.",
      "Le démembrement — donation de la nue-propriété seule — permet souvent de concilier les deux objectifs.",
    ]),
  ],
  faq=[("Combien de temps avant la vente faut-il donner ?",
        "Il n’existe pas de délai légal fixe : c’est la chronologie réelle des engagements qui compte. En "
        "pratique, une donation réalisée avant toute promesse et plusieurs mois avant la signature est "
        "nettement plus sécurisée."),
       ("Les droits de donation sont-ils dus ?",
        "Oui, après application des abattements disponibles entre le donateur et chaque donataire. Le coût "
        "des droits se compare à l’économie de plus-value et aux droits de succession évités.")],
  related=[("Transmettre à vos enfants", "transmission-pharmacien.html"),
           ("Fiscalité de la cession", "fiscalite-cession-officine.html"),
           ("Apport-cession et holding", "apport-cession-holding.html")],
),
})

# ==========================================================================
# PAGES CHAPEAU
# ==========================================================================
def hub_page(slug, title, lede, desc, kw, img, alt, eyebrow, subtitle, paras, atouts,
             tiles_eyebrow, tiles_title, tiles_lede, items, extra=None, faq=None,
             kw_cloud=None, related_links=None, parent=None, priority="0.8", full_title=None,
             quote=None):
    crumbs = [("Accueil", "index.html")] + ([parent] if parent else []) + [(title, None)]
    body = page_hero(title, lede, crumbs)
    body += section(feature_row(img, alt, eyebrow, subtitle, paras, rev=True, checklist=atouts))
    body += section(sec_head(tiles_eyebrow, tiles_title, tiles_lede, center=True)
                    + '<div class="grid grid-3" style="margin-top:54px">%s</div>' % tiles(items),
                    cls="section band-cream")
    if extra:
        body += extra
    if quote:
        body += quote_band(quote)
    jl = [breadcrumb_jsonld(crumbs)]
    if faq:
        body += faq_section("Questions fréquentes", "Vos questions", faq, cls="section")
        jl.append(faq_jsonld(faq))
    if kw_cloud:
        body += section(keyword_cloud(kw_cloud), cls="section--tight band-sand")
    if related_links:
        body += related(related_links)
    body += cta_band()
    page(slug, title, desc, body, keywords=kw, jsonld=jl, priority=priority, full_title=full_title)


def build_votre_situation():
    hub_page(
      "votre-situation.html", "Votre situation",
      "Chaque étape de la cession d’une officine pose des questions différentes. Voici celles que nous "
      "traitons le plus souvent, et la manière dont nous y répondons.",
      "Pharmacien cédant : fiscalité de la cession, placement du capital, retraite, revenus complémentaires, "
      "transmission et murs de l'officine.",
      "situation pharmacien cession, besoins pharmacien vendeur officine, conseil pharmacien retraite, "
      "patrimoine pharmacien titulaire, accompagnement cession pharmacie",
      "officine-portrait.jpg", "Pharmacienne titulaire dans son officine",
      "Votre situation", "Des questions précises, pas des généralités",
      ["Un pharmacien qui cède à 58 ans pour racheter une autre officine n’a pas les mêmes besoins qu’un "
       "titulaire de 65 ans qui liquide ses droits à la retraite, ni que celui qui part vivre à l’étranger.",
       "Nous avons organisé ce site autour des situations réelles que nous rencontrons, plutôt qu’autour "
       "d’une liste de produits. Chaque page répond à une question concrète, avec les leviers disponibles, "
       "leurs conditions et leurs limites.",
       "Si votre situation n’y figure pas, elle existe : dites-nous en deux lignes où vous en êtes, nous "
       "vous répondrons précisément."],
      ["Des réponses à votre situation, pas à un profil-type",
       "Une coordination avec vos conseils habituels",
       "Des préconisations écrites et chiffrées",
       "Aucun engagement au premier rendez-vous"],
      "Vos besoins", "Neuf situations que nous traitons au quotidien",
      "De la préparation de la cession à la transmission du capital, en passant par la retraite et les murs "
      "de l’officine.",
      [("clock", "Vous venez de vendre votre pharmacie",
        "Le calendrier des douze premiers mois et l’ordre dans lequel décider.", "vendre-sa-pharmacie.html"),
       ("compass", "Que faire du produit de la cession ?",
        "La méthode d’allocation par poches et les enveloppes adaptées.", "que-faire-apres-cession.html"),
       ("scale", "Fiscalité de la cession",
        "Fonds ou titres, exonérations, abattements : ce qui change le net vendeur.",
        "fiscalite-cession-officine.html"),
       ("puzzle", "Apport-cession et holding",
        "Reporter l’imposition pour réinvestir davantage, et les contreparties.",
        "apport-cession-holding.html"),
       ("retire", "Préparer et compléter votre retraite",
        "Pension, régimes obligatoires et revenus du capital.", "retraite-pharmacien.html"),
       ("coins", "Vous créer des revenus complémentaires",
        "Remplacer le revenu de l’officine, au meilleur coût fiscal.", "revenus-complementaires.html"),
       ("family", "Transmettre à vos enfants",
        "Donations, démembrement, assurance-vie : la fenêtre la plus favorable.",
        "transmission-pharmacien.html"),
       ("building", "Que faire des murs de l’officine ?",
        "Conserver, louer, vendre ou démembrer : quatre scénarios chiffrés.", "murs-officine.html"),
       ("globe", "Vous expatrier après la cession",
        "Résidence fiscale, calendrier et contrats transportables.", "expatriation-pharmacien.html")],
      quote="Nous ne vendons pas de produits : nous résolvons des situations. Le produit vient après, s’il est "
            "nécessaire.",
      kw_cloud=["pharmacien qui vend son officine", "conseil après cession pharmacie",
                "gestion de patrimoine pour pharmacien", "placement pharmacien retraité",
                "fiscalité vente officine", "transmettre après avoir vendu sa pharmacie"],
      related_links=[("Nos solutions", "nos-solutions.html"),
                     ("Le guide de la cession", "guide-cession-officine.html"),
                     ("Nous contacter", "contact.html")],
      priority="0.9")


def build_nos_solutions():
    hub_page(
      "nos-solutions.html", "Nos solutions",
      "Les outils que nous mettons en œuvre, en architecture ouverte : enveloppes financières, trésorerie de "
      "société, non coté, immobilier, structuration juridique et coordination patrimoniale globale.",
      "Solutions pour un pharmacien après cession : assurance-vie, capitalisation, trésorerie de holding, "
      "private equity, SCPI et structuration juridique.",
      "solutions placement pharmacien, assurance vie pharmacien, trésorerie holding, private equity, SCPI, "
      "structuration juridique cession, family office pharmacien",
      "molecule.jpg", "Réseau moléculaire, image de l’architecture ouverte",
      "Nos solutions", "Des outils, au service d’une stratégie",
      ["Nous ne commercialisons aucun produit maison. Pour chaque besoin identifié lors du bilan patrimonial, "
       "nous sélectionnons les solutions sur l’ensemble du marché : plusieurs assureurs, plusieurs sociétés "
       "de gestion, plusieurs émetteurs mis en concurrence.",
       "Cette architecture ouverte n’est pas un argument commercial : c’est la condition pour que la "
       "recommandation suive votre intérêt. Elle implique aussi de vous dire quand une solution ne vous "
       "convient pas, ou quand vous n’avez besoin de rien.",
       "Les solutions ci-dessous se combinent. Aucune ne constitue à elle seule une stratégie patrimoniale."],
      ["Architecture ouverte, sans produit maison",
       "Des frais négociés et communiqués avant toute souscription",
       "Une sélection documentée, révisée régulièrement",
       "Un suivi dans la durée, avec points semestriels"],
      "Nos expertises", "Six familles de solutions",
      "Choisies pour leur pertinence dans le cadre précis d’un capital issu d’une cession d’officine.",
      [("chart", "Placements financiers",
        "Assurance-vie, contrat de capitalisation, compte-titres, PEA, produits structurés et obligataire.",
        "placements-financiers.html"),
       ("treasury", "Trésorerie de votre holding",
        "Comptes à terme, contrat de capitalisation personne morale et mandats de gestion.",
        "tresorerie-holding.html"),
       ("puzzle", "Private Equity et non coté",
        "Fonds de capital-investissement, club deals, dette privée et actifs réels.",
        "private-equity.html"),
       ("building", "Placements immobiliers",
        "SCPI, immobilier de santé, nue-propriété et club deals immobiliers.",
        "placements-immobiliers.html"),
       ("scale", "Structuration juridique et fiscale",
        "Holding, SPFPL, SCI patrimoniale et donation avant cession.",
        "structuration-juridique.html"),
       ("concierge", "Family Office",
        "Coordination globale de vos intérêts patrimoniaux, familiaux et professionnels.",
        "family-office.html")],
      kw_cloud=["placement après cession officine", "assurance vie architecture ouverte",
                "placer la trésorerie d'une holding", "investir en private equity après cession",
                "SCPI pour pharmacien", "créer une holding après la vente"],
      related_links=[("Votre situation", "votre-situation.html"),
                     ("Que faire du produit de la cession ?", "que-faire-apres-cession.html")],
      priority="0.9")


def build_placements_financiers():
    hub_page(
      "placements-financiers.html", "Placements financiers",
      "Les enveloppes qui portent l’essentiel d’un capital de cession : assurance-vie, contrat de "
      "capitalisation, compte-titres, PEA, et les supports qui les remplissent.",
      "Placements financiers après cession d'officine : assurance-vie, capitalisation, compte-titres, PEA, "
      "produits structurés et fonds obligataires.",
      "placements financiers pharmacien, assurance vie après cession, contrat de capitalisation, compte-titres, "
      "PEA, produits structurés, fonds obligataires datés",
      "ocean.jpg", "Vague vue du ciel", "Placements financiers", "L’enveloppe avant le support",
      ["La première décision n’est pas « quel fonds acheter » mais « dans quelle enveloppe ». L’enveloppe "
       "détermine la fiscalité des revenus, le traitement à la transmission, la liquidité et les frais.",
       "Une même allocation financière peut produire un revenu net très différent selon qu’elle est logée "
       "dans un contrat d’assurance-vie, un compte-titres ou une société. C’est là que se joue l’essentiel "
       "de la valeur ajoutée du conseil.",
       "Nous arrêtons donc d’abord la répartition entre enveloppes, puis nous construisons l’allocation à "
       "l’intérieur de chacune."],
      ["Des contrats sans frais d’entrée, en architecture ouverte",
       "L’accès à des parts institutionnelles et à des mandats de gestion",
       "Une allocation construite par poches et par horizon",
       "Un reporting consolidé de l’ensemble de vos contrats"],
      "Nos solutions", "Six briques financières",
      "À combiner selon votre besoin de revenus, votre horizon et votre fiscalité.",
      [("shield", "Assurance-vie",
        "Revenus programmés, croissance et transmission dans un cadre fiscal propre.", "assurance-vie.html"),
       ("globe", "Assurance-vie luxembourgeoise",
        "Protection renforcée, fonds dédiés et portabilité internationale.",
        "assurance-vie-luxembourgeoise.html"),
       ("doc", "Contrat de capitalisation",
        "Le même moteur financier, mais donnable et démembrable.", "contrat-capitalisation.html"),
       ("chart", "Compte-titres et PEA",
        "Liberté totale d’investissement et poche actions européennes allégée.", "compte-titres-pea.html"),
       ("puzzle", "Produits structurés",
        "Des solutions de rendement aux règles définies à l’avance.", "produits-structures.html"),
       ("coins", "Fonds obligataires et taux",
        "Le socle de la poche de revenus, avec un rendement visible.", "fonds-obligataires.html")],
      kw_cloud=["meilleure assurance vie après cession", "où placer 1 million d'euros",
                "contrat luxembourgeois gros patrimoine", "fonds daté obligataire 2030",
                "PEA plafond versement", "produit structuré coupon garanti"],
      related_links=[("Vous créer des revenus complémentaires", "revenus-complementaires.html"),
                     ("Que faire du produit de la cession ?", "que-faire-apres-cession.html"),
                     ("Trésorerie de votre holding", "tresorerie-holding.html")],
      parent=P_SOL)


def build_tresorerie_holding():
    hub_page(
      "tresorerie-holding.html", "Trésorerie de votre holding",
      "Lorsque le prix de cession est encaissé par une société, les règles changent : la trésorerie doit "
      "travailler dans la société, avec ses propres enveloppes et sa propre fiscalité.",
      "Placer la trésorerie d'une holding de pharmacien : comptes à terme, contrat de capitalisation personne "
      "morale, fonds obligataires et mandats de gestion.",
      "trésorerie holding pharmacien, placement trésorerie société, contrat capitalisation personne morale, "
      "compte à terme entreprise, placer le produit d'un apport-cession",
      "piliers.jpg", "Colonnes, image de la structure sociétaire",
      "Trésorerie d’entreprise", "L’argent est dans la société, pas sur votre compte",
      ["Après un apport-cession, le produit de la vente appartient à la holding. Vous en êtes l’actionnaire, "
       "mais pas le propriétaire direct : toute sortie vers votre patrimoine privé est un acte fiscalisé, qui "
       "se planifie.",
       "La trésorerie doit donc être placée <em>dans</em> la société, avec des enveloppes qui lui sont "
       "accessibles : comptes à terme, contrat de capitalisation personne morale, fonds obligataires, "
       "produits structurés, private equity. L’assurance-vie, elle, lui est fermée.",
       "S’y ajoute, le cas échéant, l’obligation de remploi issue du report d’imposition : une fraction du "
       "produit doit être investie dans des actifs économiques éligibles, dans un délai contraint."],
      ["Une allocation par horizon : court, moyen et long terme",
       "Le respect, documenté, de l’obligation de remploi le cas échéant",
       "Une planification des distributions vers votre patrimoine privé",
       "Une coordination avec votre expert-comptable pour la comptabilisation"],
      "Nos solutions", "Trois briques pour une trésorerie de société",
      "Du placement sécurisé à quelques mois jusqu’à la capitalisation longue.",
      [("lock", "Comptes à terme",
        "Capital garanti, taux connu, échéances échelonnées : la première étape.", "comptes-a-terme.html"),
       ("doc", "Capitalisation personne morale",
        "L’enveloppe de trésorerie longue d’une société, diversifiée.",
        "capitalisation-personne-morale.html"),
       ("compass", "Mandats de gestion",
        "Déléguer à une société de gestion sélectionnée, avec un cahier des charges écrit.",
        "mandats-tresorerie.html")],
      faq=[("Ma holding peut-elle souscrire une assurance-vie ?",
            "Non. L’assurance-vie est réservée aux personnes physiques. Une société souscrit un contrat de "
            "capitalisation, qui offre le même moteur financier avec une fiscalité propre aux personnes "
            "morales."),
           ("Comment sortir l’argent de la holding ?",
            "Par distribution de dividendes, réduction de capital ou remboursement de compte courant, chacun "
            "ayant un traitement fiscal distinct. L’arbitrage se fait année par année, en fonction de vos "
            "autres revenus."),
           ("Puis-je investir la trésorerie en immobilier ?",
            "Oui, directement ou via des véhicules collectifs. Attention toutefois à la qualification de la "
            "société, qui peut avoir des conséquences sur certains régimes de faveur.")],
      kw_cloud=["placement trésorerie holding", "que faire de l'argent dans ma holding",
                "contrat de capitalisation société", "remploi 60% apport cession",
                "dividendes holding fiscalité", "trésorerie excédentaire société"],
      related_links=[("Apport-cession et holding", "apport-cession-holding.html"),
                     ("Holding patrimoniale et SPFPL", "holding-spfpl.html"),
                     ("Private Equity et non coté", "private-equity.html")],
      parent=P_SOL)


def build_private_equity():
    hub_page(
      "private-equity.html", "Private Equity et non coté",
      "Financer l’économie réelle, en direct ou via des fonds sélectionnés : une poche minoritaire, longue, "
      "destinée à chercher une prime de rendement — et parfois à satisfaire une obligation de remploi.",
      "Private equity et non coté pour un pharmacien : fonds de capital-investissement, club deals, dette "
      "privée et remploi d'apport-cession.",
      "private equity après cession, FPCI remploi, capital investissement pharmacien, club deal, dette "
      "privée, non coté 150-0 B ter",
      "foret.jpg", "Forêt vue du ciel", "Non coté", "Une poche longue, sélectionnée",
      ["Le non coté n’est pas une alternative aux marchés financiers : c’est une classe d’actifs "
       "complémentaire, dont le moteur est la création de valeur opérationnelle sur plusieurs années.",
       "Elle suppose d’accepter une immobilisation longue, des appels de fonds échelonnés et une absence de "
       "valorisation quotidienne. En contrepartie, l’écart de performance entre les meilleurs gérants et les "
       "autres est considérable : le travail de sélection est l’essentiel du service.",
       "Pour un pharmacien ayant réalisé un apport-cession, certains véhicules permettent en outre de "
       "satisfaire l’obligation de remploi — un point qui doit être vérifié dans la documentation du fonds, "
       "et non sur une plaquette."],
      ["Une sélection de gérants, revue à chaque millésime",
       "Un étalement sur plusieurs années pour lisser le risque",
       "Des véhicules dont l’éligibilité au remploi est documentée",
       "Un suivi des appels de fonds et des distributions"],
      "Nos solutions", "Trois voies d’accès",
      "Du fonds diversifié à l’opération identifiée, en passant par la dette.",
      [("growth", "Fonds de private equity",
        "Capital-investissement diversifié, par millésimes successifs.", "fonds-private-equity.html"),
       ("target", "Club deals et co-investissement",
        "Une opération identifiée, un dossier complet, une décision ligne à ligne.", "club-deals.html"),
       ("coins", "Dette privée et actifs réels",
        "Prêter plutôt que prendre du capital : des revenus contractuels.", "dette-privee.html")],
      kw_cloud=["investir en private equity", "fonds éligible remploi apport cession",
                "FPCI pharmacien", "club deal santé", "dette privée rendement",
                "non coté risque illiquidité"],
      related_links=[("Apport-cession et holding", "apport-cession-holding.html"),
                     ("Trésorerie de votre holding", "tresorerie-holding.html")],
      parent=P_SOL)


def build_placements_immobiliers():
    hub_page(
      "placements-immobiliers.html", "Placements immobiliers",
      "De la pierre, sans la gestion : SCPI, immobilier de santé, nue-propriété et club deals, pour "
      "diversifier un patrimoine souvent concentré sur les murs de l’officine.",
      "Placements immobiliers pour un pharmacien après cession : SCPI, immobilier de santé, nue-propriété "
      "temporaire et club deals immobiliers.",
      "placement immobilier pharmacien, SCPI après cession, immobilier de santé, nue-propriété, club deal "
      "immobilier, diversifier murs officine",
      "pierre.jpg", "Immeubles en pierre de taille", "Immobilier", "Diversifier la pierre",
      ["La plupart des titulaires qui cèdent détiennent déjà de l’immobilier : les murs de l’officine, la "
       "résidence principale, parfois un bien locatif. Ajouter de l’immobilier ne pose donc pas la question "
       "du rendement, mais celle de la concentration.",
       "Nous privilégions les véhicules mutualisés, qui répartissent le risque sur de nombreux immeubles et "
       "locataires, et les montages qui améliorent l’efficacité fiscale — détention en contrat, "
       "nue-propriété temporaire, société à l’impôt sur les sociétés.",
       "L’immobilier reste une classe d’actifs peu liquide : sa part dans l’allocation se définit en "
       "fonction de ce que vous pouvez immobiliser durablement."],
      ["Une analyse de votre exposition immobilière existante",
       "Des véhicules sélectionnés sur leurs fondamentaux, pas sur leur rendement affiché",
       "Un choix du mode de détention adapté à votre fiscalité",
       "La prise en compte de l’impôt sur la fortune immobilière"],
      "Nos solutions", "Quatre façons d’investir dans la pierre",
      "Chacune répond à un objectif distinct : revenu, capitalisation, transmission ou rendement.",
      [("building", "SCPI et immobilier géré",
        "Des revenus trimestriels, mutualisés, sans gestion.", "scpi.html"),
       ("cross", "Immobilier de santé",
        "Murs d’officines, maisons de santé, cliniques : un secteur que vous connaissez.",
        "immobilier-sante.html"),
       ("key", "Nue-propriété et démembrement",
        "Capitaliser à prix décoté, sans revenu donc sans fiscalité.", "nue-propriete.html"),
       ("target", "Club deals immobiliers",
        "Une opération identifiée, un horizon défini, un plan de sortie.", "club-deals-immobiliers.html")],
      kw_cloud=["SCPI rendement 2026", "investir dans les murs de pharmacie",
                "nue-propriété SCPI décote", "immobilier de santé rendement",
                "diversifier son patrimoine immobilier", "IFI après cession"],
      related_links=[("Que faire des murs de l’officine ?", "murs-officine.html"),
                     ("SCI patrimoniale", "sci-patrimoniale.html")],
      parent=P_SOL)


def build_structuration():
    hub_page(
      "structuration-juridique.html", "Structuration juridique et fiscale",
      "La structure de détention conditionne la fiscalité de vos revenus, votre liquidité et le coût de la "
      "transmission. Elle se décide avant d’investir — et, pour certains leviers, avant de vendre.",
      "Structuration pour un pharmacien cédant : holding, SPFPL, SCI patrimoniale et donation avant "
      "cession.",
      "structuration juridique pharmacien, holding ou direct, SPFPL, SCI patrimoniale, donation avant cession, "
      "optimisation fiscale cession officine",
      "ordonnance.jpg", "Document juridique stylisé", "Structuration", "La structure précède l’investissement",
      ["Beaucoup de pharmaciens nous consultent après avoir placé leur capital, en cherchant à l’optimiser. "
       "L’ordre est inversé : c’est la structure de détention qui détermine l’efficacité d’un placement, "
       "pas l’inverse.",
       "Trois questions se posent dans cet ordre : qui détient — vous, une société, un démembrement ? dans "
       "quelle enveloppe ? et selon quel calendrier de transmission ? Les réponses engagent sur dix à vingt "
       "ans et sont coûteuses à défaire.",
       "Nous travaillons en coordination avec votre notaire, votre avocat fiscaliste et votre "
       "expert-comptable : nous préparons les dossiers, nous ne nous substituons pas à eux."],
      ["Une analyse comparée des structures, chiffrée",
       "La coordination avec vos conseils juridiques et fiscaux",
       "La préparation des dossiers de donation avec votre notaire",
       "Un suivi des échéances et des obligations déclaratives"],
      "Nos solutions", "Trois leviers de structuration",
      "À choisir en fonction de ce que vous conservez, de vos besoins de revenus et de vos objectifs de "
      "transmission.",
      [("treasury", "Holding patrimoniale et SPFPL",
        "Capitaliser dans une société, transmettre les titres, ou détenir des parts d’officine.",
        "holding-spfpl.html"),
       ("building", "SCI patrimoniale",
        "Détenir les murs et l’immobilier familial, transmettre par parts.", "sci-patrimoniale.html"),
       ("gift", "Donation avant cession",
        "Transmettre et purger la plus-value latente, dans un cadre strict.",
        "donation-avant-cession.html")],
      kw_cloud=["holding après vente officine", "SPFPL pharmacien création",
                "SCI à l'IS ou à l'IR", "donation avant cession abus de droit",
                "optimiser la fiscalité d'une cession", "structurer son patrimoine après cession"],
      related_links=[("Apport-cession et holding", "apport-cession-holding.html"),
                     ("Fiscalité de la cession", "fiscalite-cession-officine.html"),
                     ("Transmettre à vos enfants", "transmission-pharmacien.html")],
      parent=P_SOL)


def build_family_office():
    crumbs = [("Accueil", "index.html"), P_SOL, ("Family Office", None)]
    body = page_hero("Family Office",
      "Au-delà du placement : la coordination de vos intérêts patrimoniaux, familiaux et professionnels, "
      "avec un interlocuteur unique qui connaît l’ensemble de votre dossier.",
      crumbs)
    body += section(feature_row("croix-verte.jpg", "Croix verte d’officine", "Family Office",
      "Un chef d’orchestre, pas un instrument de plus",
      ["Après une cession importante, le patrimoine se disperse : plusieurs banques, plusieurs contrats, une "
       "ou deux sociétés, de l’immobilier, des engagements familiaux. Personne n’en a la vision complète — "
       "souvent pas même vous.",
       "Le family office consiste à reconstituer cette vision, à la tenir à jour et à coordonner les "
       "intervenants : expert-comptable, notaire, avocat, banquiers, gestionnaires. Vous disposez d’un "
       "interlocuteur unique qui connaît l’ensemble et qui alerte avant les échéances.",
       "Ce service s’adresse aux patrimoines dont la complexité le justifie. Nous le disons si ce n’est pas "
       "votre cas."],
      rev=True,
      checklist=["Un reporting consolidé de l’ensemble de vos actifs",
                 "La coordination de vos conseils juridiques, fiscaux et comptables",
                 "Un suivi des échéances fiscales et déclaratives",
                 "Un accompagnement de la génération suivante"]))
    body += section(sec_head("Nos missions", "Ce que nous prenons en charge", center=True)
      + '<div class="grid grid-3" style="margin-top:54px">%s</div>' % tiles([
        ("chart", "Consolidation patrimoniale",
         "Un état complet et actualisé de vos actifs, quelle que soit la banque ou l’assureur."),
        ("compass", "Allocation d’ensemble",
         "Une stratégie unique pour tous vos comptes et contrats, plutôt que des décisions isolées."),
        ("scale", "Coordination des conseils",
         "Nous préparons les dossiers, organisons les réunions et suivons les décisions."),
        ("clock", "Veille et échéances",
         "Déclarations, renouvellements, appels de fonds, dates butoirs fiscales."),
        ("family", "Gouvernance familiale",
         "Préparer la génération suivante, organiser l’information et prévenir les conflits."),
        ("lock", "Confidentialité",
         "Un dossier unique, une équipe restreinte, aucune information diffusée."),
      ]), cls="section band-cream")
    body += quote_band("La complexité ne vient pas des produits : elle vient du nombre d’interlocuteurs. "
                       "Notre métier est de la réduire.")
    body += related([("Transmettre à vos enfants", "transmission-pharmacien.html"),
                     ("Structuration juridique et fiscale", "structuration-juridique.html"),
                     ("Vous expatrier après la cession", "expatriation-pharmacien.html")])
    body += cta_band()
    page("family-office.html", "Family Office",
         "Family office pour pharmaciens cédants : consolidation patrimoniale, allocation d'ensemble, "
         "coordination des conseils et gouvernance familiale.",
         body,
         keywords="family office pharmacien, consolidation patrimoniale, coordination conseils patrimoine, "
                  "gouvernance familiale, interlocuteur unique patrimoine",
         jsonld=[breadcrumb_jsonld(crumbs)], priority="0.6",
         full_title="Family Office pour pharmaciens cédants · Officine & Patrimoine")

# ==========================================================================
# ACCUEIL
# ==========================================================================
def build_home():
    body = """
<section class="hero">
  <div class="hero__bg"><img src="assets/img/officine-pharmacienne.jpg" alt="Pharmacienne titulaire dans son officine, prenant une boîte de médicament sur un rayonnage"></div>
  <div class="guides"><span class="v v1"></span><span class="v v2"></span><span class="h h1"></span></div>
  <div class="container">
    <div class="hero__panel" data-reveal>
      <p class="eyebrow eyebrow--light">Gestion privée · Pharmaciens titulaires</p>
      <h1>Vous venez de céder votre officine</h1>
      <hr class="rule">
      <p>Fiscalité de la cession, structuration du capital, revenus complémentaires, transmission : nous
      accompagnons les pharmaciens à l’étape où tout se décide — les douze mois qui suivent la vente.</p>
      <div class="hero__actions">
        <a class="btn btn--light" href="votre-situation.html">Votre situation __ARROW__</a>
        <a class="btn btn--ghost-light" href="contact.html">Premier rendez-vous</a>
      </div>
    </div>
  </div>
  <a class="scroll-cue" href="#intro" aria-label="Faire défiler"><span class="mouse"></span><span>Défiler</span></a>
</section>
"""
    body = body.replace("__ARROW__", arrow())

    body += """
<section class="section" id="intro">
  <div class="container split">
    <div data-reveal>
      <p class="eyebrow">La marque</p>
      <h2 class="title-lg">Un cabinet de gestion privée qui connaît le métier de titulaire</h2>
      <hr class="rule">
      <p class="lede">Officine &amp; Patrimoine est la marque de La Financière de Rochechouart dédiée aux
      pharmaciens qui cèdent leur officine. Même maison, mêmes équipes, mêmes solutions en architecture
      ouverte — avec une spécialisation sur une opération et une seule.</p>
      <p>Vendre une pharmacie n’est pas vendre une entreprise comme une autre. La forme de la cession — fonds
      de commerce ou titres de société d’exercice — change la fiscalité du vendeur. Le départ à la retraite
      conditionne plusieurs régimes de faveur. Les murs, souvent détenus en société civile, suivent un
      calendrier propre. Et le produit de la vente doit financer trente ans de retraite.</p>
      <p>Nous travaillons avec votre expert-comptable, votre avocat et votre notaire, sans nous substituer à
      eux : notre métier commence là où le leur s’arrête, à la question du capital.</p>
      <a class="link-arrow" href="votre-situation.html">Découvrir notre accompagnement __ARROW__</a>
    </div>
    <div class="split__media" data-reveal data-delay="1"><div class="media-frame"><img src="assets/img/officine-rayonnages.jpg" alt="Rayonnages d’officine garnis de boîtes de médicaments"></div></div>
  </div>
</section>
""".replace("__ARROW__", arrow())

    # Situations
    body += section(
        sec_head("Votre situation", "Où en êtes-vous exactement ?",
                 "Le conseil utile dépend de l’étape : cession en préparation, vente encaissée, retraite "
                 "liquidée, transmission à organiser.", center=True)
        + '<div class="grid grid-3" style="margin-top:54px">%s</div>' % tiles([
            ("clock", "Vous venez de vendre",
             "Le calendrier des douze premiers mois et l’ordre des décisions.", "vendre-sa-pharmacie.html"),
            ("compass", "Que faire du capital ?",
             "Répartir entre sécurité, revenus, croissance et transmission.", "que-faire-apres-cession.html"),
            ("scale", "Fiscalité de la cession",
             "Fonds ou titres, exonérations, abattements : ce qui change le net.",
             "fiscalite-cession-officine.html"),
            ("puzzle", "Apport-cession et holding",
             "Reporter l’imposition pour réinvestir davantage.", "apport-cession-holding.html"),
            ("retire", "Retraite et revenus",
             "Remplacer le revenu de l’officine, durablement.", "retraite-pharmacien.html"),
            ("family", "Transmission",
             "Donations, démembrement, clauses bénéficiaires.", "transmission-pharmacien.html"),
        ]), cls="section band-cream")

    # Bande de principes
    body += section(
        '<div class="stats stats--words">'
        '<div data-reveal><div class="stat__num" style="color:#fff">Architecture ouverte</div>'
        '<div class="stat__lbl" style="color:rgba(237,245,241,.7)">Aucun produit maison</div></div>'
        '<div data-reveal data-delay="1"><div class="stat__num" style="color:#fff">Une spécialité</div>'
        '<div class="stat__lbl" style="color:rgba(237,245,241,.7)">La cession d’officine</div></div>'
        '<div data-reveal data-delay="2"><div class="stat__num" style="color:#fff">Sur-mesure</div>'
        '<div class="stat__lbl" style="color:rgba(237,245,241,.7)">Chaque allocation</div></div>'
        '<div data-reveal data-delay="3"><div class="stat__num" style="color:#fff">Confidentiel</div>'
        '<div class="stat__lbl" style="color:rgba(237,245,241,.7)">À chaque étape</div></div>'
        '</div>', cls="section band-dark")

    # Méthode
    body += section(
        sec_head("Notre méthode", "Quatre rendez-vous, une stratégie écrite")
        + '<div style="margin-top:34px">%s</div>' % steps([
            ("Le point de départ",
             "Un premier échange d’une heure, sans frais ni engagement : où vous en êtes, ce qui est déjà "
             "signé, ce qui reste ouvert. Nous vous disons franchement si nous pouvons être utiles."),
            ("Le bilan patrimonial",
             "Recensement complet : patrimoine privé, société, murs, crédits, régime matrimonial, enfants, "
             "besoin de revenus net. C’est le document de référence de tout ce qui suit."),
            ("Les préconisations",
             "Une stratégie écrite et chiffrée : structure de détention, répartition par poches, enveloppes, "
             "revenu net annuel attendu, calendrier de transmission. Avec les risques, explicités."),
            ("La mise en œuvre et le suivi",
             "Souscriptions, coordination avec vos conseils, puis points semestriels, arbitrages et "
             "adaptation aux évolutions fiscales."),
        ]), cls="section")

    # Solutions
    body += section(
        sec_head("Nos solutions", "Les outils que nous mettons en œuvre",
                 "En architecture ouverte : plusieurs assureurs, plusieurs sociétés de gestion, plusieurs "
                 "émetteurs mis en concurrence.", center=True)
        + '<div class="grid grid-3" style="margin-top:54px">%s</div>' % tiles([
            ("chart", "Placements financiers",
             "Assurance-vie, capitalisation, compte-titres, PEA, structurés, obligataire.",
             "placements-financiers.html"),
            ("treasury", "Trésorerie de holding",
             "Comptes à terme, capitalisation personne morale, mandats.", "tresorerie-holding.html"),
            ("puzzle", "Private Equity et non coté",
             "Fonds, club deals, dette privée — y compris pour un remploi.", "private-equity.html"),
            ("building", "Placements immobiliers",
             "SCPI, immobilier de santé, nue-propriété, club deals.", "placements-immobiliers.html"),
            ("scale", "Structuration juridique",
             "Holding, SPFPL, SCI, donation avant cession.", "structuration-juridique.html"),
            ("concierge", "Family Office",
             "Consolidation, coordination des conseils, gouvernance familiale.", "family-office.html"),
        ]), cls="section band-sand")

    # Repères chiffrés qualitatifs
    body += section(
        sec_head("Ce que nous regardons", "Les quatre chiffres qui déterminent votre stratégie", center=True)
        + '<div style="margin-top:46px">%s</div>' % figures([
            ("Net vendeur", "Le produit réellement disponible après impôt, et non le prix affiché"),
            ("Revenu net", "Le montant dont vous avez besoin chaque année, charges et impôts compris"),
            ("Horizon", "La durée pendant laquelle ce capital doit tenir — souvent trente ans"),
            ("Part transmise", "Ce que vous voulez transmettre, et à quel coût fiscal"),
        ]), cls="section")

    # Guide
    body += section(
        '<div class="split"><div data-reveal>'
        '<p class="eyebrow">Ressource</p><h2 class="title-lg">Le guide de la cession d’officine</h2>'
        '<hr class="rule"><p class="lede">Les étapes, les régimes fiscaux, les délais à ne pas manquer et les '
        'erreurs les plus fréquentes, rassemblés en une page de référence.</p>'
        '<p>Il ne remplace ni votre expert-comptable ni votre avocat : il vous permet d’arriver préparé aux '
        'rendez-vous qui comptent.</p>'
        '<a class="link-arrow" href="guide-cession-officine.html">Lire le guide %s</a></div>'
        '<div class="split__media" data-reveal data-delay="1"><div class="media-frame">'
        '<img src="assets/img/ordonnance.jpg" alt="Document de cession stylisé"></div></div></div>' % arrow())

    body += section('<div class="quote" data-reveal><p>« Le jour de la signature, un pharmacien cesse d’être '
                    'chef d’entreprise pour devenir investisseur. Personne ne l’a formé à ce métier-là. »</p>'
                    '<cite>%s</cite></div>' % BRAND, cls="section")

    body += section(keyword_cloud([
        "vendre sa pharmacie", "que faire après la vente de son officine",
        "placer le produit de la cession d’une pharmacie", "fiscalité cession officine",
        "plus-value cession pharmacie", "apport-cession pharmacien", "holding de pharmacien",
        "retraite du pharmacien titulaire", "revenus complémentaires après cession",
        "transmission du patrimoine d’un pharmacien", "murs de pharmacie", "SPFPL",
        "gestion de patrimoine pharmacien", "conseiller financier pharmacien",
        "investir après la vente d’une officine",
    ], eyebrow="Les sujets que nous traitons"), cls="section--tight band-cream")

    body += cta_band()

    page("index.html", "Accueil",
         "Pharmacien : que faire après la vente de votre officine ? Fiscalité de la cession, placement du "
         "capital, revenus complémentaires, retraite et transmission.",
         body,
         keywords="pharmacien vente officine, que faire après avoir vendu sa pharmacie, gestion de patrimoine "
                  "pharmacien, placement produit cession officine, fiscalité cession pharmacie, apport-cession "
                  "pharmacien, retraite pharmacien titulaire, conseiller en gestion de patrimoine pharmacien, "
                  "réinvestir après cession, holding pharmacien",
         home=True, priority="1.0",
         full_title="Pharmaciens : que faire après la vente de votre officine ? · Officine & Patrimoine")

# ==========================================================================
# GUIDE (page de référence, longue traîne)
# ==========================================================================
GUIDE_FAQ = [
  ("Combien vaut une pharmacie ?",
   "La valorisation d’une officine s’apprécie classiquement en pourcentage du chiffre d’affaires et en "
   "multiple de l’excédent brut d’exploitation retraité, corrigés de la localisation, de la structure de "
   "marge, de la dépendance à quelques prescripteurs, du bail et de l’état du point de vente. Seule une "
   "évaluation réalisée par un professionnel de la transaction officinale fait foi."),
  ("Vaut-il mieux céder le fonds ou les titres de la société ?",
   "Les deux voies n’ont ni la même fiscalité pour le vendeur, ni le même intérêt pour l’acquéreur, qui "
   "préfère souvent racheter le fonds afin de l’amortir. Le choix se chiffre avant la négociation, pas "
   "après."),
  ("Quand faut-il liquider ses droits à la retraite ?",
   "Plusieurs régimes d’exonération applicables aux cessions supposent une cessation des fonctions et une "
   "liquidation des droits dans un délai encadré autour de la vente. La date de liquidation est donc une "
   "donnée du montage fiscal, à arrêter en même temps que le calendrier de cession."),
  ("Peut-on continuer à travailler après avoir vendu ?",
   "Oui, dans le respect des règles de cumul emploi-retraite et à condition de ne pas remettre en cause la "
   "cessation effective des fonctions exigée par les régimes de faveur. Remplacements et missions ponctuelles "
   "sont fréquents ; le montage doit être validé avant la signature."),
  ("Faut-il créer une holding avant de vendre ?",
   "C’est la seule façon de bénéficier du report d’imposition de l’apport-cession, qui permet de réinvestir "
   "le produit brut plutôt que le produit net d’impôt. En contrepartie, une obligation de remploi s’impose "
   "si la holding cède peu après l’apport."),
  ("Que faire des murs de l’officine ?",
   "Quatre options : les conserver et les louer au repreneur, les vendre avec le fonds, les vendre plus "
   "tard, ou les transmettre en démembrement. Chacune a une fiscalité et un profil de risque distincts ; la "
   "conservation concentre le patrimoine sur un locataire unique."),
  ("Combien de temps faut-il pour vendre une pharmacie ?",
   "De la décision à la signature, les délais usuels se comptent en mois : évaluation, recherche "
   "d’acquéreur, négociation, financement du repreneur, autorisations et formalités. La préparation "
   "patrimoniale et fiscale doit commencer bien avant, idéalement un à deux ans en amont."),
  ("Où placer l’argent de la vente en attendant de décider ?",
   "Sur des supports liquides et sans risque de valorisation : comptes à terme échelonnés, fonds "
   "monétaires, fonds en euros. L’objectif est de ne pas laisser dormir les sommes sans pour autant "
   "s’engager avant d’avoir arrêté la stratégie."),
  ("Quel revenu peut-on tirer du produit d’une cession ?",
   "Cela dépend du montant, de l’allocation retenue et de la durée visée. Le bon raisonnement consiste à "
   "partir du revenu net dont vous avez besoin, puis à vérifier qu’il est soutenable dans des scénarios de "
   "marché défavorables — et non à partir d’un rendement espéré."),
  ("Faut-il donner à ses enfants avant ou après la cession ?",
   "Avant, la donation purge la plus-value latente sur les titres donnés, sous des conditions strictes de "
   "chronologie et de dessaisissement réel. Après, elle porte sur des liquidités ou des contrats et reste "
   "très efficace, notamment en nue-propriété."),
]

GLOSSAIRE = [
  ("Apport-cession", "Apport des titres d’une société à une holding contrôlée préalablement à leur vente, "
   "permettant un report d’imposition de la plus-value d’apport, assorti d’une obligation de remploi si la "
   "cession intervient rapidement."),
  ("Plus-value professionnelle", "Plus-value réalisée lors de la cession d’éléments d’actif affectés à "
   "l’exercice de l’activité, notamment un fonds de commerce d’officine ; elle relève de régimes "
   "d’exonération spécifiques."),
  ("SEL", "Société d’exercice libéral (SELARL, SELAS…), forme sociale permettant l’exercice d’une profession "
   "réglementée, dont les titres peuvent être cédés comme ceux de toute société."),
  ("SPFPL", "Société de participations financières de professions libérales, destinée à détenir des "
   "participations dans des sociétés d’exercice libéral."),
  ("CAVP", "Caisse d’assurance vieillesse des pharmaciens, qui gère les régimes de retraite obligatoires de "
   "la profession, dont une part en capitalisation."),
  ("Remploi", "Réinvestissement d’une fraction du produit de cession dans des activités économiques "
   "éligibles, exigé dans certains montages d’apport-cession pour maintenir le report d’imposition."),
  ("Démembrement", "Séparation entre l’usufruit — l’usage et les revenus — et la nue-propriété — la "
   "propriété future ; outil central de la transmission à coût fiscal réduit."),
  ("Prélèvement forfaitaire unique", "Imposition forfaitaire des revenus et plus-values de capitaux "
   "mobiliers, cumulant impôt sur le revenu et prélèvements sociaux, sauf option pour le barème progressif."),
  ("Fonds daté", "Fonds obligataire dont le portefeuille est construit pour être conservé jusqu’à une "
   "échéance définie, offrant une visibilité sur le rendement attendu."),
  ("Architecture ouverte", "Mode de conseil consistant à sélectionner les solutions sur l’ensemble du "
   "marché, sans distribuer de produits maison."),
]

def build_guide():
    crumbs = [("Accueil", "index.html"), ("Le guide de la cession d’officine", None)]
    body = page_hero("Le guide de la cession d’officine",
      "Les étapes, les régimes fiscaux, les délais à ne pas manquer et les erreurs les plus fréquentes. Une "
      "page de référence pour arriver préparé aux rendez-vous qui comptent.", crumbs)

    body += section(
      '<div style="max-width:860px" data-reveal>'
      '<p class="eyebrow">Avant-propos</p>'
      '<h2 class="title-lg">Ce que ce guide est, et ce qu’il n’est pas</h2><hr class="rule">'
      '<p class="lede">Ce guide rassemble les repères que nous donnons à chaque pharmacien que nous '
      'rencontrons. Il décrit des mécanismes et un calendrier ; il ne remplace ni l’évaluation de votre '
      'officine par un professionnel de la transaction, ni le chiffrage fiscal de votre expert-comptable, ni '
      'les actes de votre notaire ou de votre avocat.</p>'
      '<p>Les seuils, taux et conditions des régimes fiscaux évoluent à chaque loi de finances. Nous les '
      'décrivons donc par leur logique plutôt que par des montants qui seraient périmés en quelques mois : '
      'les chiffres applicables à votre opération sont établis dans votre dossier, à sa date.</p>'
      '</div>')

    body += section(
      sec_head("Étape 1", "Préparer la cession, un à deux ans avant")
      + '<div style="margin-top:30px">%s</div>' % steps([
          ("Faire évaluer l’officine",
           "Par un professionnel de la transaction officinale : valorisation du fonds, examen du bail, de la "
           "structure de marge, de la dépendance aux prescripteurs et de l’état du point de vente."),
          ("Choisir la forme de la cession",
           "Cession du fonds de commerce ou cession des titres de la société d’exercice : la fiscalité du "
           "vendeur et l’intérêt de l’acquéreur diffèrent sensiblement. Le net vendeur se chiffre dans les "
           "deux hypothèses."),
          ("Arrêter le calendrier de retraite",
           "Plusieurs régimes de faveur supposent une cessation des fonctions et une liquidation des droits "
           "dans un délai encadré autour de la cession."),
          ("Décider d’un éventuel apport préalable",
           "L’apport des titres à une holding doit précéder tout engagement de vente pour produire ses "
           "effets."),
          ("Envisager une donation avant cession",
           "Elle purge la plus-value latente sur la fraction donnée, sous des conditions strictes de "
           "chronologie et de dessaisissement."),
          ("Traiter le sort des murs",
           "Vendus avec le fonds, conservés et loués, ou transmis : la décision influe sur le prix global et "
           "sur la négociation."),
        ]))

    body += section(
      sec_head("Étape 2", "Comprendre la fiscalité applicable")
      + '<p class="muted" style="max-width:76ch;margin-top:20px" data-reveal>La fiscalité d’une cession '
        'd’officine se lit en trois questions : quelle est la nature de la plus-value, quels régimes '
        'd’exonération sont ouverts, et quel est l’impact de votre départ à la retraite.</p>'
      + ptable(["Question", "Cession du fonds", "Cession des titres"],
          [["Nature de la plus-value", "Plus-value professionnelle",
            "Plus-value de cession de valeurs mobilières"],
           ["Imposition de droit commun",
            "Régimes du court terme et du long terme applicables aux entreprises",
            "Prélèvement forfaitaire unique, ou barème progressif sur option globale"],
           ["Régimes d’exonération propres",
            "Exonération selon la valeur cédée, selon les recettes, ou au titre du départ à la retraite",
            "Abattement fixe dirigeant partant à la retraite, sous conditions"],
           ["Prélèvements sociaux",
            "Dus en principe, même en cas d’exonération d’impôt sur le revenu",
            "Dus, inclus dans le prélèvement forfaitaire unique"],
           ["Report d’imposition possible", "Non", "Oui, par apport préalable à une holding contrôlée"],
           ["Intérêt de l’acquéreur", "Fort : amortissement du fonds, pas de reprise du passif",
            "Moindre, sauf accompagnement du prix"]])
      + note("Pourquoi aucun montant ne figure ici", [
          "Les seuils d’exonération, le montant de l’abattement « dirigeant » et les taux applicables sont "
          "modifiés régulièrement par les lois de finances. Les reproduire sur une page web reviendrait à "
          "diffuser une information périmée.",
          "Nous les chiffrons dans votre dossier, à la date de l’opération, et les faisons valider par votre "
          "conseil fiscal.",
        ]), cls="section band-cream")

    body += section(
      sec_head("Étape 3", "Placer le capital, dans le bon ordre")
      + '<div style="margin-top:30px">%s</div>' % steps([
          ("Sécuriser",
           "Comptes à terme échelonnés et supports monétaires le temps de décider : quelques semaines à "
           "quelques mois."),
          ("Établir le bilan patrimonial",
           "Patrimoine complet, besoin de revenus net, situation familiale, horizon. C’est le document qui "
           "fonde toutes les décisions suivantes."),
          ("Choisir les structures et les enveloppes",
           "Direct ou société, assurance-vie, capitalisation, compte-titres, PEA : la fiscalité des revenus "
           "et de la transmission se joue ici."),
          ("Déployer par poches",
           "Sécurité, revenus, croissance, non coté : chaque poche a son horizon et ses supports."),
          ("Organiser la transmission",
           "Donations, démembrement, clauses bénéficiaires : d’autant plus efficaces qu’elles sont "
           "précoces."),
        ]))

    body += section(
      sec_head("Les erreurs", "Les dix erreurs que nous voyons le plus souvent", center=True)
      + '<div style="max-width:900px;margin:36px auto 0">%s</div>' % two_col_checklist([
          "Laisser le produit de la cession sur un compte courant pendant des mois",
          "Décider de la forme de la cession sans chiffrer le net vendeur",
          "Signer une promesse avant d’avoir étudié l’apport-cession",
          "Donner aux enfants après la vente alors qu’une donation préalable était possible",
          "Fixer la date de liquidation de la retraite sans tenir compte des régimes de faveur",
          "Tout sécuriser et perdre du pouvoir d’achat pendant vingt ans",
          "Concentrer le patrimoine sur les murs de l’officine et un seul locataire",
          "Souscrire des produits avant d’avoir arrêté la structure de détention",
          "Ignorer la rédaction des clauses bénéficiaires des contrats existants",
          "Croire qu’une holding créée après la vente efface l’impôt déjà dû",
        ]), cls="section band-sand")

    body += section(
      sec_head("Glossaire", "Les mots que vous allez entendre", center=True)
      + '<div style="max-width:900px;margin:40px auto 0" data-reveal>%s</div>'
        % accordion([(t, "<p>%s</p>" % d) for t, d in GLOSSAIRE]))

    body += faq_section("Questions fréquentes", "Les questions des pharmaciens cédants", GUIDE_FAQ,
                        cls="section band-cream")

    body += section(
      '<p class="eyebrow" data-reveal>Aller plus loin</p>'
      '<h2 class="title-md" data-reveal style="margin-bottom:26px">Toutes nos pages</h2>'
      + linkgrid([
          ("Vous venez de vendre votre pharmacie", "vendre-sa-pharmacie.html"),
          ("Que faire du produit de la cession ?", "que-faire-apres-cession.html"),
          ("Fiscalité de la cession", "fiscalite-cession-officine.html"),
          ("Apport-cession et holding", "apport-cession-holding.html"),
          ("Préparer et compléter votre retraite", "retraite-pharmacien.html"),
          ("Vous créer des revenus complémentaires", "revenus-complementaires.html"),
          ("Transmettre à vos enfants", "transmission-pharmacien.html"),
          ("Que faire des murs de l’officine ?", "murs-officine.html"),
          ("Vous expatrier après la cession", "expatriation-pharmacien.html"),
          ("Assurance-vie", "assurance-vie.html"),
          ("Assurance-vie luxembourgeoise", "assurance-vie-luxembourgeoise.html"),
          ("Contrat de capitalisation", "contrat-capitalisation.html"),
          ("Compte-titres et PEA", "compte-titres-pea.html"),
          ("Produits structurés", "produits-structures.html"),
          ("Fonds obligataires et produits de taux", "fonds-obligataires.html"),
          ("Comptes à terme", "comptes-a-terme.html"),
          ("Capitalisation pour personne morale", "capitalisation-personne-morale.html"),
          ("Mandats de gestion de trésorerie", "mandats-tresorerie.html"),
          ("Fonds de private equity", "fonds-private-equity.html"),
          ("Club deals et co-investissement", "club-deals.html"),
          ("Dette privée et actifs réels", "dette-privee.html"),
          ("SCPI et immobilier géré", "scpi.html"),
          ("Immobilier de santé", "immobilier-sante.html"),
          ("Nue-propriété et démembrement", "nue-propriete.html"),
          ("Club deals immobiliers", "club-deals-immobiliers.html"),
          ("Holding patrimoniale et SPFPL", "holding-spfpl.html"),
          ("SCI patrimoniale", "sci-patrimoniale.html"),
          ("Donation avant cession", "donation-avant-cession.html"),
          ("Family Office", "family-office.html"),
        ]), cls="section--tight")

    body += section(keyword_cloud([
        "guide cession officine", "vendre sa pharmacie étapes", "valorisation officine EBE",
        "cession fonds de commerce pharmacie", "cession parts SELARL pharmacie",
        "calendrier vente pharmacie", "erreurs à éviter vente officine",
        "préparer sa retraite de pharmacien", "fiscalité pharmacien cédant",
        "glossaire cession entreprise", "conseil indépendant pharmacien",
    ]), cls="section--tight band-sand")

    body += cta_band()

    page("guide-cession-officine.html", "Le guide de la cession d’officine",
         "Guide de la cession d'officine : étapes, valorisation, fiscalité, apport-cession, placement du "
         "capital, transmission et erreurs fréquentes.",
         body,
         keywords="guide cession officine, vendre sa pharmacie, étapes vente pharmacie, fiscalité cession "
                  "officine, valorisation pharmacie, apport-cession, retraite pharmacien, erreurs vente "
                  "officine, glossaire cession",
         jsonld=[breadcrumb_jsonld(crumbs), faq_jsonld(GUIDE_FAQ)], priority="0.9",
         full_title="Guide de la cession d'officine : étapes, fiscalité, placement · Officine & Patrimoine")


# ==========================================================================
# CONTACT / MENTIONS LÉGALES
# ==========================================================================
def build_contact():
    crumbs = [("Accueil", "index.html"), ("Nous contacter", None)]
    body = page_hero("Nous contacter",
      "Un premier échange d’une heure, confidentiel, sans frais et sans engagement. Nous vous dirons "
      "franchement si nous pouvons vous être utiles.", crumbs)
    lat, lon = "48.8787", "2.3119"
    info = ('<ul class="info-list">'
      '<li><span class="ico">%s</span><div><h4>Adresse</h4><p>%s</p></div></li>'
      '<li><span class="ico">%s</span><div><h4>Email</h4><a href="mailto:%s">%s</a></div></li>'
      '<li><span class="ico">%s</span><div><h4>Rendez-vous</h4><p>Du lundi au vendredi, sur rendez-vous, '
      'à Paris ou en visioconférence</p></div></li>'
      '</ul>' % (icon("pin", "tile__ico"), ADDRESS,
                 icon("mail", "tile__ico"), EMAIL, EMAIL,
                 icon("clock", "tile__ico")))
    form = ('<form id="contact-form" class="form" novalidate>'
      '<div class="row">'
        '<div class="field"><label for="f-name">Nom &amp; prénom</label>'
        '<input id="f-name" name="name" type="text" autocomplete="name" required></div>'
        '<div class="field"><label for="f-email">Email</label>'
        '<input id="f-email" name="email" type="email" autocomplete="email" required></div>'
      '</div>'
      '<div class="row">'
        '<div class="field"><label for="f-phone">Téléphone</label>'
        '<input id="f-phone" name="phone" type="tel" autocomplete="tel"></div>'
        '<div class="field"><label for="f-subject">Où en êtes-vous ?</label>'
        '<select id="f-subject" name="subject">'
          '<option>Je prépare la cession de mon officine</option>'
          '<option>Ma cession est signée, le prix est encaissé</option>'
          '<option>J’ai réalisé un apport-cession et je dois remployer</option>'
          '<option>Je cherche à me créer des revenus complémentaires</option>'
          '<option>Je souhaite organiser la transmission à mes enfants</option>'
          '<option>Je m’interroge sur les murs de mon officine</option>'
          '<option>Je prépare un départ à l’étranger</option>'
          '<option>Autre demande</option>'
        '</select></div>'
      '</div>'
      '<div class="field"><label for="f-message">Votre message</label>'
      '<textarea id="f-message" name="message" required></textarea></div>'
      '<div class="form__status" role="status" aria-live="polite"></div>'
      '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">'
        '<button class="btn btn--solid" type="submit">Envoyer ma demande %s</button>'
        '<span class="form__note">Vos informations restent strictement confidentielles.</span>'
      '</div></form>' % arrow())
    body += section('<div class="contact-grid">'
      '<div data-reveal><p class="eyebrow">Prendre contact</p>'
      '<h2 class="title-lg">Parlons de votre cession</h2><hr class="rule">'
      '<p class="lede">Dites-nous en quelques lignes où vous en êtes : cession en préparation, prix encaissé, '
      'apport-cession réalisé, retraite à liquider. Nous vous répondons sous 48 heures ouvrées.</p>'
      + info + '</div><div data-reveal data-delay="1">' + form + '</div></div>')
    osm = ('https://www.openstreetmap.org/export/embed.html?bbox=2.3019%%2C48.8737%%2C2.3219%%2C48.8837'
           '&amp;layer=mapnik&amp;marker=%s%%2C%s' % (lat, lon))
    body += section('<div class="map" data-reveal><iframe title="Plan, %s" loading="lazy" src="%s"></iframe>'
                    '</div>' % (ADDRESS, osm), cls="section--tight")
    page("contact.html", "Nous contacter",
         "Contactez Officine & Patrimoine, marque de La Financière de Rochechouart : conseil patrimonial pour "
         "pharmaciens cédants. 58 rue de Monceau, 75008 Paris.",
         body,
         keywords="contact conseiller patrimonial pharmacien, rendez-vous gestion de patrimoine pharmacien, "
                  "cabinet gestion privée Paris pharmacien",
         jsonld=[breadcrumb_jsonld(crumbs)], priority="0.7",
         full_title="Nous contacter · Officine & Patrimoine")


def build_mentions():
    crumbs = [("Accueil", "index.html"), ("Mentions légales", None)]
    body = page_hero("Mentions légales",
      "Informations légales relatives au site Officine &amp; Patrimoine, marque de La Financière de "
      "Rochechouart.", crumbs)
    blocks = [
      ("Éditeur du site",
       "Le présent site est édité sous la marque <strong>Officine &amp; Patrimoine</strong>, marque de "
       "<strong>La Financière de Rochechouart</strong>, cabinet de gestion privée et de placement de "
       "trésorerie.<br>Adresse : %s.<br>Email : <a href=\"mailto:%s\">%s</a>." % (ADDRESS, EMAIL, EMAIL)),
      ("Marque et adossement",
       "Officine &amp; Patrimoine ne constitue pas une personne morale distincte : il s’agit d’une marque "
       "commerciale de La Financière de Rochechouart, dédiée à l’accompagnement des pharmaciens titulaires "
       "cédant leur officine. Les prestations, les conseillers et les solutions proposées sont ceux de La "
       "Financière de Rochechouart."),
      ("Hébergement",
       "Le présent site est hébergé par l’hébergeur retenu par l’éditeur. Les coordonnées complètes peuvent "
       "être obtenues sur simple demande à l’adresse de contact."),
      ("Propriété intellectuelle",
       "L’ensemble des contenus (textes, identité visuelle, illustrations, mise en page) est protégé par le "
       "droit de la propriété intellectuelle. Toute reproduction, totale ou partielle, est soumise à "
       "autorisation préalable."),
      ("Données personnelles",
       "Conformément au Règlement général sur la protection des données, vous disposez d’un droit d’accès, de "
       "rectification, d’effacement, de limitation et d’opposition sur les données vous concernant. Les "
       "informations transmises via le formulaire de contact sont utilisées aux seules fins de traiter votre "
       "demande et ne sont jamais cédées à des tiers. Pour exercer vos droits, écrivez-nous à "
       "<a href=\"mailto:%s\">%s</a>." % (EMAIL, EMAIL)),
      ("Cookies",
       "Ce site ne dépose aucun cookie publicitaire ni traceur de mesure d’audience tiers. Seuls des "
       "éléments strictement nécessaires à l’affichage des pages sont utilisés. La carte affichée sur la page "
       "de contact est fournie par un service tiers, susceptible de déposer ses propres cookies lors de son "
       "chargement."),
      ("Avertissement sur les informations diffusées",
       "Les informations diffusées sur ce site ont une vocation strictement informative et pédagogique. Elles "
       "ne constituent ni un conseil en investissement, ni un conseil juridique ou fiscal, ni une offre, ni "
       "une sollicitation. Les régimes fiscaux, seuils et taux évoqués sont décrits dans leur principe et "
       "sont susceptibles d’évoluer à chaque loi de finances : ils doivent être vérifiés à la date de votre "
       "opération auprès de vos conseils. Tout investissement comporte un risque de perte en capital et, pour "
       "certaines classes d’actifs, un risque d’illiquidité. Les performances passées ne préjugent pas des "
       "performances futures. La fiscalité dépend de la situation individuelle de chacun."),
      ("Réclamations",
       "Toute réclamation peut être adressée par écrit à l’adresse de l’éditeur. Une réponse vous sera "
       "apportée dans les délais réglementaires."),
    ]
    inner = ('<div style="max-width:860px" data-reveal>' + "".join(
        '<h2 class="title-md" style="margin-top:%s">%s</h2><hr class="rule"><p class="muted">%s</p>'
        % ("0" if i == 0 else "48px", t, c) for i, (t, c) in enumerate(blocks)) + "</div>")
    body += section(inner)
    body += cta_band()
    page("mentions-legales.html", "Mentions légales",
         "Mentions légales du site Officine & Patrimoine, marque de La Financière de Rochechouart.",
         body, keywords="mentions légales, officine et patrimoine, la financière de rochechouart",
         jsonld=[breadcrumb_jsonld(crumbs)], priority="0.3",
         full_title="Mentions légales · Officine & Patrimoine")


# ==========================================================================
# Plan du site / robots
# ==========================================================================
def build_sitemap():
    urls = []
    for slug, prio in PAGES:
        loc = SITE_URL + "/" + ("" if slug == "index.html" else slug)
        urls.append("  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>monthly</changefreq>"
                    "<priority>%s</priority></url>" % (loc, TODAY, prio))
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n'
           % "\n".join(urls))
    with open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)
    with open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE_URL)
    print("wrote pharmaciens/sitemap.xml + robots.txt")


# ==========================================================================
def main():
    build_css()
    build_home()
    build_votre_situation()
    for slug, d in SITUATION.items():
        detail_page(slug, d)
    build_nos_solutions()
    build_placements_financiers()
    build_tresorerie_holding()
    build_private_equity()
    build_placements_immobiliers()
    build_structuration()
    build_family_office()
    for slug, d in SOLUTIONS.items():
        detail_page(slug, d)
    build_guide()
    build_contact()
    build_mentions()
    build_sitemap()
    print("Terminé : %d pages." % len(PAGES))


if __name__ == "__main__":
    main()
