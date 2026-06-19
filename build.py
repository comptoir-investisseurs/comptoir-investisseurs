#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static site generator for « La Financière de Rochechouart ».
Run:  python3 build.py
Outputs HTML pages at the repository root, sharing assets/ (css, js, img).
A single layout guarantees a consistent header / footer / contact band.
"""
import os, html, re

ROOT = os.path.dirname(os.path.abspath(__file__))

# Centralised feature-image distribution (everything except the homepage),
# to maximise photo variety across pages. Order = order of images on the page.
PAGE_IMAGES = {
    # Vos besoins
    "epargner-investir": ["echiquier.jpg", "place-vendome.jpg"],
    "optimiser-fiscalite": ["plafond-baroque.jpg", "coupole-sculptee.jpg"],
    "ceder-transmettre": ["yacht-mer.jpg", "voiture-prestige.jpg"],
    "preparer-retraite": ["retraite.jpg", "plage-ocean.jpg"],
    "expatriation": ["bateau-mer.jpg", "foret-aerien.jpg"],
    # Nos solutions — hubs
    "placements-financiers": ["place-vendome.jpg", "coupole-lafayette.jpg"],
    "tresorerie-entreprise": ["toits-paris.jpg"],
    "private-equity": ["foret-aerien.jpg"],
    "placements-immobiliers": ["haussmann.jpg"],
    "structuration-juridique": ["interieur-coupole.jpg"],
    "family-office": ["opera-garnier.jpg"],
    # Placements financiers — sous-pages
    "assurance-vie": ["plage-ocean.jpg"],
    "contrat-capitalisation": ["detail-raffinement.jpg"],
    "contrat-luxembourgeois": ["coupole-lafayette.jpg"],
    "solutions-retraite": ["yacht-mer.jpg"],
    "comptes-titres": ["toits-paris.jpg"],
    "pea": ["place-vendome.jpg"],
    "pea-pme": ["echiquier.jpg"],
    "mandats-gestion": ["coupole-sculptee.jpg"],
    "produits-structures": ["plafond-baroque.jpg"],
    # Trésorerie — sous-pages
    "treso-audit": ["interieur-coupole.jpg"],
    "comptes-a-terme": ["paris-colonnade.jpg"],
    "capitalisation-personne-morale": ["detail-raffinement.jpg"],
    "luxembourgeois-tresorerie": ["coupole-lafayette.jpg"],
    "obligataire-taux": ["paris-courtyard.jpg"],
    "structures-tresorerie": ["plafond-baroque.jpg"],
    "mandats-tresorerie": ["echiquier.jpg"],
    "holdings-reserves": ["opera-garnier.jpg"],
    # Private Equity — sous-pages
    "fonds-private-equity": ["foret-aerien.jpg"],
    "club-deals-coinvestissement": ["voiture-prestige.jpg"],
    "dette-privee-actifs-reels": ["bateau-mer.jpg"],
    # Immobilier — sous-pages
    "scpi-immobilier-gere": ["haussmann.jpg"],
    "club-deals-immobiliers": ["paris-colonnade.jpg"],
    "immobilier-direct": ["toits-paris.jpg"],
    # Structuration — sous-pages
    "organisation-patrimoniale": ["coupole-sculptee.jpg"],
    "optimisation-fiscale-flux": ["interieur-coupole.jpg"],
    "transmission-gouvernance": ["retraite.jpg"],
    "structuration-dirigeant": ["serenite.jpg"],
    # Family Office — sous-pages
    "pilotage-patrimonial-global": ["opera-garnier.jpg"],
    "ingenierie-patrimoniale": ["paris-courtyard.jpg"],
    "allocation-architecture-ouverte": ["mansion.jpg"],
    "gouvernance-familiale": ["retraite.jpg"],
}

BRAND = "La Financière de Rochechouart"
EMAIL = "contact@lfd-rochechouart.com"
ADDRESS = "58 rue de Monceau, 75008 Paris"

# Swap these for your own assets, then re-run `python3 build.py`.
# (e.g. LOGO_MARK = "assets/img/logo.png", HERO_IMG = "assets/img/hero.jpg")
LOGO_MARK  = "assets/img/monogram.svg"  # favicon
HERO_IMG   = "assets/img/hero.jpg"       # full-width homepage background photo
# Full wordmark logo (dark version for light backgrounds + cream version for dark).
BRAND_LOGO       = "assets/img/logo.png"
BRAND_LOGO_LIGHT = "assets/img/logo-light.png"

# --------------------------------------------------------------------------
# Navigation model  (label, href, [children])
# --------------------------------------------------------------------------
NAV = [
    ("Accueil", "index.html", None),
    ("Vos besoins", "vos-besoins.html", [
        ("Épargner & Investir", "epargner-investir.html"),
        ("Optimiser votre fiscalité", "optimiser-fiscalite.html"),
        ("Céder ou transmettre votre entreprise", "ceder-transmettre.html"),
        ("Préparer votre retraite", "preparer-retraite.html"),
        ("S'expatrier à l'étranger", "expatriation.html"),
    ]),
    ("Nos solutions", "nos-solutions.html", [
        ("Placements financiers", "placements-financiers.html"),
        ("Trésorerie d'entreprise", "tresorerie-entreprise.html"),
        ("Solutions non cotées & Private Equity", "private-equity.html"),
        ("Placements immobiliers", "placements-immobiliers.html"),
        ("Structuration juridique et fiscale", "structuration-juridique.html"),
        ("Accès à notre Family Office", "family-office.html"),
    ]),
    ("Nous contacter", "contact.html", None),
]

# --------------------------------------------------------------------------
# Inline icons
# --------------------------------------------------------------------------
ICONS = {
 "growth":'<path d="M3 17l6-6 4 4 8-8M21 7v6m0-6h-6"/>',
 "shield":'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
 "coins":'<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3"/><path d="M9 12c0 1.7 2.7 3 6 3s6-1.3 6-3V9"/>',
 "retire":'<path d="M4 21v-6a8 8 0 0116 0v6"/><circle cx="12" cy="6" r="3"/>',
 "globe":'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15 0 18M12 3c-2.5 2.7-2.5 15 0 18"/>',
 "chart":'<path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-7M20 16v-3"/>',
 "treasury":'<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-7h6v7"/>',
 "puzzle":'<path d="M10 4h4v3a2 2 0 104 0V4h2v6h-3a2 2 0 100 4h3v6h-6v-3a2 2 0 10-4 0v3H4v-6h3a2 2 0 100-4H4V4h6z"/>',
 "building":'<path d="M3 21h18M6 21V4h8v17M14 9h4v12M9 8h2M9 12h2M9 16h2"/>',
 "scale":'<path d="M12 3v18M5 7h14M5 7l-3 6a3 3 0 006 0L5 7zm14 0l-3 6a3 3 0 006 0l-3-6zM8 21h8"/>',
 "concierge":'<path d="M4 18h16M5 18a7 7 0 0114 0M12 8V6m-2 0h4"/>',
 "pin":'<path d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
 "mail":'<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>',
 "phone":'<path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
 "clock":'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 "leaf":'<path d="M5 21c0-9 5-15 14-16-1 9-6 14-14 16zM5 21c2-5 5-8 9-10"/>',
 "lock":'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
 "doc":'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9 12h7M9 16h7"/>',
 "compass":'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>',
}
def icon(name, cls="tile__ico"):
    body = ICONS.get(name, "")
    return ('<svg class="%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'
            % (cls, body))

def arrow():
    return ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')

# --------------------------------------------------------------------------
# Header / footer / contact band
# --------------------------------------------------------------------------
def render_brand(cls="brand", mode="header"):
    if BRAND_LOGO:
        if mode == "footer":
            imgs = '<img class="brand__logo" src="%s" alt="%s">' % (BRAND_LOGO_LIGHT, html.escape(BRAND))
        else:
            imgs = ('<img class="brand__logo brand__logo--dark" src="%s" alt="%s">'
                    '<img class="brand__logo brand__logo--light" src="%s" alt="" aria-hidden="true">'
                    % (BRAND_LOGO, html.escape(BRAND), BRAND_LOGO_LIGHT))
        return ('<a class="%s brand--img" href="index.html" aria-label="%s — accueil">%s</a>'
                % (cls, html.escape(BRAND), imgs))
    return (
      '<a class="%s" href="index.html" aria-label="%s — accueil">'
        '<img class="brand__mark" src="%s" alt="" width="42" height="42">'
        '<span class="brand__text"><b>La Financière</b><span>de Rochechouart</span></span>'
      '</a>' % (cls, BRAND, LOGO_MARK))

def render_header():
    items = []
    for label, href, children in NAV:
        if children:
            links = "".join('<a href="%s">%s</a>' % (h, html.escape(t)) for t, h in children)
            items.append(
              '<li class="nav__item has-dropdown">'
                '<a class="nav__link" href="%s" aria-haspopup="true" aria-expanded="false">%s'
                  '<svg class="nav__caret" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 4l4 4 4-4"/></svg>'
                '</a>'
                '<div class="dropdown" role="menu">%s</div>'
              '</li>' % (href, html.escape(label), links))
        else:
            items.append('<li class="nav__item"><a class="nav__link" href="%s">%s</a></li>'
                         % (href, html.escape(label)))
    nav_items = "".join(items)
    return (
      '<header class="site-header">'
        '<div class="container">'
          + render_brand() +
          '<nav class="nav" aria-label="Navigation principale">'
            '<ul style="display:contents;list-style:none;margin:0;padding:0">%s</ul>'
            '<div class="nav__cta"><a class="btn btn--ghost-light" href="contact.html">Prendre rendez-vous</a></div>'
          '</nav>'
          '<button class="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false"><span></span><span></span><span></span></button>'
        '</div>'
      '</header>' % nav_items)

def cta_band(title="Échangeons sur votre situation",
             text="Nos conseillers vous reçoivent en toute confidentialité pour étudier vos objectifs patrimoniaux et de trésorerie."):
    return (
      '<section class="cta-band section--tight">'
        '<div class="container">'
          '<div data-reveal>'
            '<p class="eyebrow eyebrow--light">Un échange confidentiel</p>'
            '<h2>%s</h2>'
            '<p>%s</p>'
          '</div>'
          '<div class="cta-band__actions" data-reveal data-delay="1">'
            '<a class="btn btn--light" href="contact.html">Nous contacter %s</a>'
            '<a class="btn btn--ghost-light" href="mailto:%s">%s</a>'
          '</div>'
        '</div>'
      '</section>' % (html.escape(title), html.escape(text), arrow(), EMAIL, EMAIL))

def render_footer():
    def col(title, links):
        ls = "".join('<li><a href="%s">%s</a></li>' % (h, html.escape(t)) for t, h in links)
        return '<div><h5>%s</h5><ul class="footer-links">%s</ul></div>' % (title, ls)
    besoins = NAV[1][2]
    solutions = NAV[2][2]
    return (
      '<footer class="site-footer">'
        '<div class="container">'
          '<div class="footer-grid">'
            '<div>'
              + render_brand("brand", mode="footer") +
              '<p style="max-width:34ch;font-size:.95rem;margin-top:6px">Gestion privée et placement de trésorerie. '
              'Entre exigence et transparence, nous construisons des solutions patrimoniales sur-mesure.</p>'
            '</div>'
            + col("Vos besoins", besoins[:4])
            + col("Nos solutions", solutions[:4])
            + '<div class="footer-contact"><h5>Nous contacter</h5>'
                '<p>%s</p>'
                '<p><a href="mailto:%s">%s</a></p>'
                '<p style="margin-top:16px"><a class="link-arrow" href="contact.html">Prendre rendez-vous %s</a></p>'
              '</div>'
          '</div>'
          '<p class="disclaimer">Les informations présentées sur ce site ont une vocation strictement informative et ne '
          'constituent ni un conseil en investissement, ni une sollicitation, ni une offre de souscription. Les performances '
          'passées ne préjugent pas des performances futures. Tout investissement comporte des risques, notamment de perte en '
          'capital. La fiscalité dépend de la situation individuelle de chaque client et est susceptible d’évoluer.</p>'
          '<div class="footer-bottom">'
            '<span>© <span id="year">2026</span> %s — Tous droits réservés.</span>'
            '<span><a href="mentions-legales.html">Mentions légales</a> &nbsp;·&nbsp; <a href="contact.html">Contact</a></span>'
          '</div>'
        '</div>'
      '</footer>' % (ADDRESS, EMAIL, EMAIL, arrow(), BRAND))

# --------------------------------------------------------------------------
# Layout
# --------------------------------------------------------------------------
LAYOUT = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__ — La Financière de Rochechouart</title>
<meta name="description" content="__DESC__">
<link rel="icon" href="__FAVICON__">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/styles.css">
</head>
<body__BODYCLASS__>
__HEADER__
<main>
__BODY__
</main>
__FOOTER__
<script src="assets/js/main.js"></script>
</body>
</html>
"""

def page(slug, title, desc, body, home=False):
    # Centralised photo distribution: swap feature images per page for variety.
    imgs = PAGE_IMAGES.get(slug[:-5] if slug.endswith(".html") else slug)
    if imgs:
        seq = iter(imgs)
        def _swap(m):
            try:
                return m.group(1) + "assets/img/" + next(seq) + m.group(2)
            except StopIteration:
                return m.group(0)
        body = re.sub(r'(media-frame"><img src=")assets/img/[^"]+(")', _swap, body)
    out = (LAYOUT
           .replace("__TITLE__", html.escape(title))
           .replace("__DESC__", html.escape(desc))
           .replace("__FAVICON__", LOGO_MARK)
           .replace("__BODYCLASS__", ' class="home"' if home else "")
           .replace("__HEADER__", render_header())
           .replace("__FOOTER__", render_footer())
           .replace("__BODY__", body))
    with open(os.path.join(ROOT, slug), "w", encoding="utf-8") as f:
        f.write(out)
    print("wrote", slug)

# --------------------------------------------------------------------------
# Reusable content blocks
# --------------------------------------------------------------------------
def page_hero(title, intro, crumbs):
    items = []
    for i, (t, h) in enumerate(crumbs):
        if h:
            items.append('<a href="%s">%s</a>' % (h, html.escape(t)))
        else:
            items.append('<span style="color:#fff;opacity:.95">%s</span>' % html.escape(t))
        if i < len(crumbs) - 1:
            items.append('<span>/</span>')
    crumb = "".join(items)
    return (
      '<section class="page-hero">'
        '<div class="container"><div class="page-hero__inner">'
          '<nav class="breadcrumb" aria-label="Fil d’Ariane">%s</nav>'
          '<h1 data-reveal>%s</h1>'
          '<p class="lede" data-reveal data-delay="1" style="margin-top:18px">%s</p>'
        '</div></div>'
      '</section>' % (crumb, html.escape(title), intro))

def feature_row(img, alt, eyebrow, title, paragraphs, rev=False, checklist=None):
    ps = "".join("<p>%s</p>" % p for p in paragraphs)
    chk = ""
    if checklist:
        lis = "".join("<li>%s</li>" % html.escape(c) for c in checklist)
        chk = '<ul class="checklist" style="margin-top:26px">%s</ul>' % lis
    cls = "feature-row feature-row--rev" if rev else "feature-row"
    return (
      '<div class="%s">'
        '<div class="feature-row__media" data-reveal><div class="media-frame"><img src="%s" alt="%s" loading="lazy"></div></div>'
        '<div data-reveal data-delay="1">'
          '<p class="eyebrow">%s</p><h2 class="title-md">%s</h2><hr class="rule">%s%s'
        '</div>'
      '</div>' % (cls, img, html.escape(alt), eyebrow, html.escape(title), ps, chk))

def tiles(items, dark_first=False):
    cards = []
    for i, item in enumerate(items):
        ic, title, text = item[0], item[1], item[2]
        href = item[3] if len(item) > 3 else None
        dark = ' tile--dark' if (dark_first and i == 0) else ''
        inner = '%s<h3>%s</h3><p>%s</p>' % (icon(ic), html.escape(title), text)
        delay = (i % 3) + 1
        if href:
            # whole card is the link; visual cue is a <span> (never nest <a> in <a>)
            inner += '<span class="link-arrow">En savoir plus %s</span>' % arrow()
            cards.append('<a class="tile%s" href="%s" data-reveal data-delay="%d">%s</a>'
                         % (dark, href, delay, inner))
        else:
            cards.append('<div class="tile%s" data-reveal data-delay="%d">%s</div>'
                         % (dark, delay, inner))
    return "".join(cards)

def faq(items):
    rows = []
    for q, a in items:
        rows.append(
          '<div class="acc__item">'
            '<button class="acc__btn" aria-expanded="false"><span>%s</span><span class="acc__sign" aria-hidden="true"></span></button>'
            '<div class="acc__panel"><div class="acc__panel-inner">%s</div></div>'
          '</div>' % (html.escape(q), a))
    return '<div class="accordion">%s</div>' % "".join(rows)

# Reusable detail sub-page builder (used by Nos solutions sub-pages) ----------
def _lis(items): return "".join("<li>%s</li>" % x for x in items)
def render_block(b):
    kind = b[0]
    if kind == "checklist":
        _, eb, items = b
        n = (len(items) + 1) // 2
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
                '<ul class="checklist">%s</ul><ul class="checklist">%s</ul></div>'
                % (eb, _lis(items[:n]), _lis(items[n:])))
    if kind == "cards":
        _, eb, items = b
        g = "grid-4" if len(items) == 4 else "grid-3"
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div class="grid %s" style="margin-top:24px">%s</div>' % (eb, g, tiles(items)))
    if kind == "tags":
        _, eb, items = b
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                '<div class="tags" style="margin-top:16px" data-reveal>%s</div>'
                % (eb, "".join('<span class="tag">%s</span>' % t for t in items)))
    if kind == "text":
        _, eb, paras = b
        return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>' % eb) + "".join(
            '<p class="muted" style="max-width:74ch" data-reveal>%s</p>' % p for p in paras)
    return ""
def sub_page(slug, title, subtitle, lede, img, alt, paras, atouts, mid, related, seo, parent, quote=None):
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"), parent, (title,None)]
    body = page_hero(title, lede, crumbs)
    body += section(feature_row(img, alt, "En bref", subtitle, paras, rev=True, checklist=atouts))
    if mid:
        body += section("".join(render_block(b) for b in mid), cls="section band-cream")
    if quote:
        body += section('<div class="quote" data-reveal><p>« %s »</p><cite>La Financière de Rochechouart</cite></div>' % quote, cls="section--tight band-dark")
    rl = "".join('<a class="link-arrow" href="%s" style="margin:0 28px 12px 0">%s %s</a>' % (h, t, arrow()) for t, h in related)
    body += section('<p class="eyebrow" data-reveal>À explorer aussi</p>'
                    '<div style="margin-top:18px;display:flex;flex-wrap:wrap" data-reveal>%s</div>' % rl, cls="section--tight")
    body += cta_band()
    page(slug, title, seo, body)

def sec_head(eyebrow, title, lede=None, center=False):
    cls = "center" if center else ""
    st = ' style="max-width:720px;margin-inline:auto"' if center else ' style="max-width:820px"'
    h = '<div class="%s"%s data-reveal><p class="eyebrow">%s</p><h2 class="title-lg">%s</h2><hr class="rule">' % (cls, st, eyebrow, title)
    if lede: h += '<p class="lede">%s</p>' % lede
    return h + '</div>'

def blocks_section(eyebrow, title, blocks, lede=None, cls="section", center=False):
    return section(sec_head(eyebrow, title, lede, center) + "".join(render_block(b) for b in blocks), cls=cls)

def faq_block(eyebrow, title, items):
    return (sec_head(eyebrow, title, center=True)
            + '<div style="max-width:880px;margin:40px auto 0" data-reveal>' + faq(items) + '</div>')

# ==========================================================================
# PAGES
# ==========================================================================
def build_home():
    body = """
<section class="hero">
  <div class="hero__bg"><img src="__HERO_IMG__" alt="Palais classique parisien aux teintes d'automne"></div>
  <div class="guides"><span class="v v1"></span><span class="v v2"></span><span class="h h1"></span></div>
  <div class="container">
    <div class="hero__panel" data-reveal>
      <p class="eyebrow eyebrow--light">Cabinet de gestion privée</p>
      <h1>Gestion privée et placement de trésorerie</h1>
      <hr class="rule">
      <p>Entre exigence et transparence, découvrez nos solutions optimales pour valoriser, protéger et transmettre votre patrimoine — ainsi que la trésorerie de votre entreprise.</p>
      <div class="hero__actions">
        <a class="btn btn--light" href="nos-solutions.html">Découvrir nos solutions __ARROW__</a>
        <a class="btn btn--ghost-light" href="contact.html">Prendre rendez-vous</a>
      </div>
    </div>
  </div>
  <a class="scroll-cue" href="#intro" aria-label="Faire défiler"><span class="mouse"></span><span>Défiler</span></a>
</section>

<section class="section" id="intro">
  <div class="container split">
    <div data-reveal>
      <p class="eyebrow">La maison</p>
      <h2 class="title-lg">Une maison de conseil indépendante, au service d’une clientèle exigeante</h2>
      <hr class="rule">
      <p class="lede">Établie au cœur du 8<sup>e</sup> arrondissement de Paris, La Financière de Rochechouart accompagne dirigeants, familles et entreprises dans la structuration, la valorisation et la transmission de leur patrimoine.</p>
      <p>Notre approche conjugue la rigueur d’une grande institution et la disponibilité d’un cabinet à taille humaine. Architecture ouverte, sélection rigoureuse des supports et alignement total avec vos intérêts : nous concevons chaque stratégie sur-mesure, avec une seule ambition — la préservation et la croissance maîtrisée de votre capital.</p>
      <a class="link-arrow" href="vos-besoins.html">Découvrir notre accompagnement __ARROW__</a>
    </div>
    <div class="split__media" data-reveal data-delay="1"><div class="media-frame"><img src="assets/img/paris-courtyard.jpg" alt="Cour d’honneur du Palais-Royal, Paris"></div></div>
  </div>
</section>

<section class="section band-cream">
  <div class="container">
    <div class="center" style="max-width:720px;margin-inline:auto" data-reveal>
      <p class="eyebrow">Nos solutions</p>
      <h2 class="title-lg">Une expertise patrimoniale et financière complète</h2>
      <hr class="rule">
      <p class="lede">De l’assurance-vie de droit luxembourgeois aux produits structurés sur-mesure, nous déployons l’ensemble des solutions d’une gestion privée de premier rang.</p>
    </div>
    <div class="grid grid-3" style="margin-top:54px">__SOLUTION_TILES__</div>
    <div class="center" style="margin-top:48px" data-reveal><a class="btn" href="nos-solutions.html">Toutes nos solutions __ARROW__</a></div>
  </div>
</section>

<section class="section band-dark">
  <div class="container">
    <div class="stats">
      <div data-reveal><div class="stat__num stat--light" style="color:#fff">100%</div><div class="stat__lbl" style="color:rgba(246,242,233,.7)">Architecture ouverte</div></div>
      <div data-reveal data-delay="1"><div class="stat__num" style="color:#fff">+25 ans</div><div class="stat__lbl" style="color:rgba(246,242,233,.7)">D’expérience cumulée</div></div>
      <div data-reveal data-delay="2"><div class="stat__num" style="color:#fff">Sur-mesure</div><div class="stat__lbl" style="color:rgba(246,242,233,.7)">Chaque stratégie</div></div>
      <div data-reveal data-delay="3"><div class="stat__num" style="color:#fff">Confidentiel</div><div class="stat__lbl" style="color:rgba(246,242,233,.7)">À chaque étape</div></div>
    </div>
  </div>
</section>

<section class="section band-sand">
  <div class="container">
    <div class="center" style="max-width:680px;margin-inline:auto" data-reveal>
      <p class="eyebrow">Vos besoins</p>
      <h2 class="title-lg">Nous répondons à chaque étape de votre vie patrimoniale</h2>
      <hr class="rule">
    </div>
    <div class="grid grid-3" style="margin-top:50px">__NEED_TILES__</div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="quote" data-reveal>
      <p>« Notre seule rémunération est votre confiance dans la durée. Nous la cultivons par la transparence, la discrétion et la qualité du conseil. »</p>
      <cite>La Financière de Rochechouart</cite>
    </div>
  </div>
</section>
"""
    body = body.replace("__SOLUTION_TILES__", tiles([
        ("chart","Placements financiers","Allocation d’actifs, assurance-vie luxembourgeoise et comptes-titres en architecture ouverte.","placements-financiers.html"),
        ("treasury","Trésorerie d’entreprise","Optimisation et dynamisation de la trésorerie excédentaire de votre société.","tresorerie-entreprise.html"),
        ("puzzle","Non coté & Private Equity","Accès sélectif au capital-investissement et aux actifs privés.","private-equity.html"),
        ("doc","Produits structurés sur-mesure","Des solutions de rendement et de protection conçues selon vos contraintes.","produits-structures.html"),
        ("building","Placements immobiliers","SCPI, club deals et immobilier patrimonial soigneusement sélectionnés.","placements-immobiliers.html"),
        ("concierge","Family Office","Une coordination globale de vos intérêts patrimoniaux et familiaux.","family-office.html"),
    ]))
    body = body.replace("__NEED_TILES__", tiles([
        ("coins","Épargner & Investir","Faire fructifier votre capital avec une allocation maîtrisée.","epargner-investir.html"),
        ("scale","Optimiser votre fiscalité","Réduire la pression fiscale dans un cadre sécurisé.","optimiser-fiscalite.html"),
        ("growth","Céder ou transmettre","Préparer la cession ou la transmission de votre entreprise.","ceder-transmettre.html"),
        ("retire","Préparer votre retraite","Constituer des revenus complémentaires pérennes.","preparer-retraite.html"),
        ("globe","S’expatrier à l’étranger","Sécuriser votre patrimoine en mobilité internationale.","expatriation.html"),
        ("compass","Définir votre stratégie","Un bilan patrimonial complet pour y voir clair.","vos-besoins.html"),
    ]))
    body = body.replace("__HERO_IMG__", HERO_IMG).replace("__ARROW__", arrow()) + cta_band()
    page("index.html", "Accueil", "Cabinet de gestion privée et de placement de trésorerie à Paris. Assurance-vie luxembourgeoise, produits structurés sur-mesure, private equity et conseil patrimonial.", body, home=True)

def section(inner, cls="section"):
    return '<section class="%s"><div class="container">%s</div></section>' % (cls, inner)

def intro(eyebrow, title, lede, paras, img, alt, rev=False, link=None):
    ps = "".join("<p>%s</p>" % p for p in paras)
    lk = ('<a class="link-arrow" href="%s" style="margin-top:8px">%s %s</a>' % (link[1], html.escape(link[0]), arrow())) if link else ''
    media = '<div class="split__media" data-reveal data-delay="1"><div class="media-frame"><img src="%s" alt="%s" loading="lazy"></div></div>' % (img, html.escape(alt))
    txt = ('<div data-reveal><p class="eyebrow">%s</p><h2 class="title-lg">%s</h2><hr class="rule">'
           '<p class="lede">%s</p>%s%s</div>' % (eyebrow, html.escape(title), lede, ps, lk))
    inner = (media + txt) if rev else (txt + media)
    cls = "container split split--reverse" if rev else "container split"
    return '<section class="section"><div class="%s">%s</div></section>' % (cls, inner)

def need_overview_tiles():
    return tiles([
        ("coins","Épargner & Investir","Construire et faire fructifier votre capital grâce à une allocation diversifiée et maîtrisée, adaptée à votre horizon et à votre tolérance au risque.","epargner-investir.html"),
        ("scale","Optimiser votre fiscalité","Réduire durablement la pression fiscale sur vos revenus, votre patrimoine et vos plus-values, dans un cadre parfaitement sécurisé.","optimiser-fiscalite.html"),
        ("growth","Céder ou transmettre votre entreprise","Anticiper et structurer la cession ou la transmission de votre société pour en préserver la valeur et alléger le coût fiscal.","ceder-transmettre.html"),
        ("retire","Préparer votre retraite","Mettre en place des revenus complémentaires pérennes et un capital disponible le moment venu.","preparer-retraite.html"),
        ("globe","S’expatrier à l’étranger","Sécuriser et adapter votre patrimoine à votre mobilité internationale, en coordination avec vos conseils locaux.","expatriation.html"),
    ])

def solution_overview_tiles():
    return tiles([
        ("chart","Placements financiers","Allocation d’actifs sur-mesure, assurance-vie luxembourgeoise, comptes-titres et produits structurés en architecture ouverte.","placements-financiers.html"),
        ("treasury","Trésorerie d’entreprise","Dynamiser la trésorerie excédentaire de votre société avec un couple rendement / liquidité maîtrisé.","tresorerie-entreprise.html"),
        ("puzzle","Solutions non cotées & Private Equity","Accéder de façon sélective au capital-investissement, à la dette privée et aux actifs réels.","private-equity.html"),
        ("building","Placements immobiliers","SCPI, OPCI, club deals et immobilier patrimonial rigoureusement sélectionnés.","placements-immobiliers.html"),
        ("scale","Structuration juridique et fiscale","Holdings, démembrement, donations et pactes : l’ingénierie au service de votre patrimoine.","structuration-juridique.html"),
        ("concierge","Accès à notre Family Office","Une coordination globale, confidentielle et indépendante de tous vos intérêts.","family-office.html"),
    ])

# --------------------------------------------------------------------------
def build_vos_besoins():
    body = page_hero(
        "Vos besoins",
        "Chaque patrimoine raconte une histoire singulière. Nous partons de vos objectifs de vie pour bâtir une stratégie cohérente, lisible et pilotée dans la durée.",
        [("Accueil","index.html"),("Vos besoins",None)])
    body += section(
        '<div class="center" style="max-width:720px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">Notre méthode</p><h2 class="title-lg">Un accompagnement structuré, du diagnostic au pilotage</h2><hr class="rule">'
        '<p class="lede">Avant toute recommandation, nous prenons le temps de comprendre votre situation, vos contraintes et vos ambitions.</p></div>'
        '<div class="grid grid-4" style="margin-top:54px">'
        + "".join('<div class="card" data-reveal data-delay="%d"><div class="card__num">0%d</div><h3>%s</h3><p>%s</p></div>' % (i+1,i+1,t,d)
            for i,(t,d) in enumerate([
                ("Écoute","Un premier échange confidentiel pour cerner vos objectifs et votre horizon."),
                ("Diagnostic","Un bilan patrimonial complet : actifs, fiscalité, protection, transmission."),
                ("Stratégie","Des recommandations sur-mesure, chiffrées et hiérarchisées."),
                ("Pilotage","Un suivi régulier et des arbitrages au fil de votre vie et des marchés."),
            ])) + '</div>')
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Vos enjeux</p><h2 class="title-lg">À chaque besoin, une réponse dédiée</h2><hr class="rule"></div>'
                    '<div class="grid grid-3" style="margin-top:50px">%s</div>' % need_overview_tiles(), cls="section band-cream")
    body += cta_band()
    page("vos-besoins.html","Vos besoins","Épargner, optimiser sa fiscalité, transmettre son entreprise, préparer sa retraite ou s’expatrier : un accompagnement patrimonial sur-mesure.", body)

def build_nos_solutions():
    body = page_hero(
        "Nos solutions",
        "Une gamme complète, en architecture ouverte, pour valoriser votre patrimoine privé comme la trésorerie de votre entreprise — sans conflit d’intérêts.",
        [("Accueil","index.html"),("Nos solutions",None)])
    body += section('<div class="center" style="max-width:720px;margin-inline:auto" data-reveal><p class="eyebrow">Notre offre</p>'
                    '<h2 class="title-lg">Des solutions d’investissement de premier rang</h2><hr class="rule">'
                    '<p class="lede">De l’assurance-vie luxembourgeoise aux produits structurés sur-mesure et au capital-investissement, nous sélectionnons le meilleur de chaque univers.</p></div>'
                    '<div class="grid grid-3" style="margin-top:54px">%s</div>' % solution_overview_tiles())
    body += section('<div class="quote" data-reveal><p>« L’architecture ouverte n’est pas un argument : c’est notre condition d’indépendance. Nous ne vendons aucun produit maison. »</p><cite>Notre engagement</cite></div>', cls="section band-dark")
    body += cta_band()
    page("nos-solutions.html","Nos solutions","Placements financiers, trésorerie d’entreprise, private equity, immobilier, structuration juridique et Family Office.", body)

# ---- Besoins ----
def build_epargner():
    def lis(items): return "".join("<li>%s</li>" % x for x in items)
    body = page_hero("Épargner & Investir",
        "Investir ne consiste pas seulement à placer un capital, mais à construire une stratégie cohérente au service de vos objectifs de vie et de votre vision de long terme.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Épargner & Investir",None)])

    # — Philosophie
    body += intro("Notre approche", "Investir, c’est d’abord une stratégie",
        "Développer votre patrimoine, générer des revenus, préparer votre retraite, diversifier, optimiser votre fiscalité ou structurer un capital après une phase de création de richesse : chaque investissement doit répondre à une logique précise.",
        ["Dans un environnement de plus en plus complexe, investir efficacement exige une approche structurée, indépendante et personnalisée. L’enjeu n’est pas seulement la performance, mais l’organisation intelligente de votre capital — selon votre horizon, votre profil de risque, vos besoins de liquidité et vos priorités.",
         "Nous intervenons sur l’ensemble des leviers pertinents : placements financiers, immobilier, private equity, trésorerie, structuration patrimoniale et diversification internationale."],
        "assets/img/paris-courtyard.jpg", "Stratégie d’investissement")

    # — Objectif (citation)
    body += section('<div class="quote" data-reveal><p>« Transformer votre capacité d’investissement en stratégie de création, de protection et de valorisation durable de votre patrimoine. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")

    # — Étape 01 : Stratégie
    p1 = ('<div data-reveal style="max-width:780px"><p class="eyebrow">Étape 01 — Stratégie</p>'
          '<h2 class="title-lg">Définir votre stratégie d’investissement</h2><hr class="rule">'
          '<p class="lede">La réussite d’un investissement repose moins sur un produit que sur la stratégie qui le structure. Tout commence par une vision claire de vos objectifs, formalisée par un audit patrimonial approfondi.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>L’audit patrimonial éclaire</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Vos objectifs de rendement","Votre horizon d’investissement","Votre tolérance au risque","Vos besoins de disponibilité","Votre fiscalité actuelle et future"]) + '</ul>'
          '<ul class="checklist">' + lis(["Votre niveau de diversification","Vos risques de concentration","La cohérence patrimoine privé / professionnel","Vos projets personnels et familiaux","Votre sensibilité aux cycles de marché"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:64px" data-reveal>Cinq fonctions patrimoniales</p>'
          '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("lock","Capital de sécurité","Protection, liquidité et stabilité."),
              ("coins","Capital de rendement","Génération de revenus potentiels."),
              ("growth","Capital de croissance","Valorisation sur le long terme."),
              ("puzzle","Capital de diversification","Immobilier, non coté, international, actifs réels."),
              ("concierge","Capital de transmission","Structuration familiale et successorale."),
          ]) + '</div>')
    body += section(p1)

    # — Étape 02 : Sélection (fond crème, avec photo)
    p2 = feature_row("assets/img/paris-colonnade.jpg", "Sélection des opportunités",
        "Étape 02 — Sélection", "Sélectionner les meilleures opportunités",
        ["L’enjeu n’est pas de multiplier les placements, mais d’identifier les opportunités les plus cohérentes et les mieux structurées selon votre profil.",
         "Notre architecture est ouverte : nous ne sommes liés à aucune banque, aucun broker, aucune société de gestion ou promoteur. Nous sélectionnons librement les meilleures solutions du marché, selon vos seuls intérêts."],
        rev=True)
    p2 += ('<p class="eyebrow" style="margin-top:72px" data-reveal>Les grandes familles d’investissement</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("chart","Placements financiers","Assurance-vie, comptes-titres, PEA, obligations, ETF, gestion sous mandat.","placements-financiers.html"),
              ("doc","Produits structurés","Solutions calibrées selon des scénarios de marché et un niveau de risque défini.","produits-structures.html"),
              ("building","Immobilier","SCPI, club deals, immobilier direct et opérations patrimoniales.","placements-immobiliers.html"),
              ("puzzle","Non coté & Private Equity","Fonds, co-investissements, dette privée et actifs réels.","private-equity.html"),
              ("treasury","Trésorerie & taux","Comptes à terme, allocation obligataire et solutions de capitalisation.","tresorerie-entreprise.html"),
              ("globe","Solutions internationales","Contrats luxembourgeois, holdings et structuration dédiée.","structuration-juridique.html"),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:64px" data-reveal>Une grille d’analyse institutionnelle</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Qualité intrinsèque de l’actif","Rendement potentiel ajusté du risque","Structure juridique","Fiscalité","Liquidité"]) + '</ul>'
          '<ul class="checklist">' + lis(["Gouvernance","Risque de contrepartie","Frais réels","Horizon d’investissement","Corrélation avec le patrimoine"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:56px" data-reveal>Plusieurs moteurs de performance</p>'
          '<div class="tags" style="margin-top:16px" data-reveal>' + "".join('<span class="tag">%s</span>' % t for t in ["Croissance","Rendement","Protection","Décorrélation","Liquidité","Transmission"]) + '</div>')
    body += section(p2, cls="section band-cream")

    # — Étape 03 : Pilotage
    p3 = ('<div data-reveal style="max-width:780px"><p class="eyebrow">Étape 03 — Pilotage</p>'
          '<h2 class="title-lg">Piloter et faire évoluer dans le temps</h2><hr class="rule">'
          '<p class="lede">Investir ne s’arrête pas à l’allocation initiale. Le principal risque n’est pas un mauvais choix de départ, mais l’absence de suivi : un patrimoine non piloté devient déséquilibré, surconcentré ou fiscalement inefficace.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Une gouvernance patrimoniale active</p>'
          '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("chart","Suivi de performance","Vision consolidée de vos actifs financiers, immobiliers, non cotés et structures."),
              ("compass","Arbitrages stratégiques","Réallocation selon les cycles, l’évolution des marchés et les changements de vie."),
              ("scale","Optimisation fiscale continue","Adaptation des flux, des enveloppes et des stratégies de capitalisation."),
              ("shield","Gestion du risque","Surveillance des concentrations sectorielles, géographiques et de contrepartie."),
              ("puzzle","Structuration évolutive","Mise à jour des holdings, SCI, gouvernance et stratégies successorales."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:64px" data-reveal>À chaque étape de vie, des ajustements</p>'
          '<div class="grid grid-2" style="margin-top:24px">' + "".join(
              '<div class="card" data-reveal data-delay="%d"><h3>%s</h3><p>%s</p></div>' % ((i % 2) + 1, t, d)
              for i, (t, d) in enumerate([
                  ("Entrepreneur en croissance","Capitalisation, diversification progressive et protection du capital."),
                  ("Dirigeant post-cession","Restructurer une liquidité importante dans une logique de sécurisation et d’allocation globale."),
                  ("Famille patrimoniale","Gouvernance, transmission et organisation intergénérationnelle."),
                  ("Investisseur en phase de retraite","Renforcer les revenus, la stabilité et la protection."),
              ])) + '</div>')
    body += section(p3)

    # — Citation de clôture
    body += section('<div class="quote" data-reveal><p>« Investir avec succès, c’est autant savoir construire que savoir piloter dans le temps. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")

    body += cta_band("Construisons votre stratégie d’investissement","Faisons le point sur vos objectifs, votre horizon et votre profil de risque lors d’un premier rendez-vous confidentiel.")
    page("epargner-investir.html","Épargner & Investir","Définir, sélectionner et piloter une stratégie d’investissement patrimoniale : audit, architecture ouverte et gouvernance dans la durée.", body)

def build_fiscalite():
    def lis(items): return "".join("<li>%s</li>" % x for x in items)
    def tagrow(items, light=False):
        cls = "tags tags--light" if light else "tags"
        return '<div class="%s" style="margin-top:16px" data-reveal>%s</div>' % (cls, "".join('<span class="tag">%s</span>' % t for t in items))
    body = page_hero("Optimiser votre fiscalité",
        "Optimiser sa fiscalité ne consiste pas à réduire l’impôt à court terme, mais à structurer intelligemment son patrimoine, ses revenus et ses flux pour améliorer durablement leur efficacité économique.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Optimiser votre fiscalité",None)])

    # — Philosophie
    body += intro("Notre approche", "La fiscalité, un levier plutôt qu’une contrainte",
        "La performance d’une stratégie patrimoniale ne se mesure pas en rendement brut, mais en création de valeur nette après fiscalité.",
        ["La fiscalité influence directement la rentabilité réelle de vos placements, la croissance de votre patrimoine, la structuration de vos revenus, vos décisions d’investissement et votre transmission.",
         "Dans un environnement réglementaire complexe et évolutif, nous construisons une stratégie cohérente, durable et conforme — qu’il s’agisse d’un particulier, d’un dirigeant, d’un investisseur immobilier, d’une profession libérale ou d’une famille entrepreneuriale."],
        "assets/img/mansion.jpg", "Optimisation fiscale du patrimoine", rev=True)

    # — Objectif (citation)
    body += section('<div class="quote" data-reveal><p>« Transformer la fiscalité d’une contrainte subie en un levier stratégique au service de la protection, de la croissance et de la transmission de votre patrimoine. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")

    # — Étape 01 : Flux
    p1 = ('<div data-reveal style="max-width:780px"><p class="eyebrow">Étape 01 — Flux</p>'
          '<h2 class="title-lg">Structurer vos revenus, investissements et flux</h2><hr class="rule">'
          '<p class="lede">Tout commence par une organisation intelligente de vos flux. Chaque euro perçu, investi, distribué, cédé ou transmis peut être traité différemment selon sa nature, sa temporalité et sa structure de détention.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Cartographier votre écosystème économique</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Revenus professionnels & rémunération","Dividendes","Revenus fonciers","Produits financiers & plus-values"]) + '</ul>'
          '<ul class="checklist">' + lis(["Trésorerie d’entreprise","Flux entre structures","Arbitrages patrimoniaux","Risques de surimposition"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:56px" data-reveal>Mieux organiser, plutôt que « payer moins »</p>')
    p1 += tagrow(["Le moment de perception","La forme des revenus","Le véhicule de réception","Fiscalité immédiate ou différée","Consommation ou capitalisation"])
    p1 += ('<p class="eyebrow" style="margin-top:56px" data-reveal>Les principaux leviers d’action</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("scale","Arbitrage rémunération / dividendes","Trouver l’équilibre le plus efficient entre les deux pour le dirigeant."),
              ("treasury","Capitalisation via holding","Conserver et réinvestir la valeur au sein de structures dédiées."),
              ("growth","Réinvestir plutôt que distribuer","Privilégier la création de valeur de long terme au flux immédiat."),
              ("building","Revenus immobiliers","Optimiser la détention et la fiscalité de vos actifs immobiliers."),
              ("chart","Gestion des plus-values","Piloter la temporalité des cessions et des arbitrages."),
              ("puzzle","Flux privé / professionnel","Organiser la circulation du capital entre vos patrimoines."),
          ]) + '</div>'
          '<p class="muted" style="margin-top:32px;max-width:70ch" data-reveal>Nous articulons ainsi fiscalité personnelle, sociétale, immobilière et financière dans une même architecture, où chaque décision s’inscrit dans une logique globale de performance nette.</p>')
    body += section(p1)

    # — Étape 02 : Structures (fond crème, avec photo)
    p2 = feature_row("assets/img/paris-colonnade.jpg", "Enveloppes et structures patrimoniales",
        "Étape 02 — Structures", "Choisir les meilleures enveloppes et structures",
        ["L’efficience fiscale dépend autant des revenus que du cadre dans lequel ils sont détenus : à rendement identique, deux investissements peuvent produire des résultats très différents selon leur mode de détention.",
         "Nous raisonnons en architectes patrimoniaux — sélectionner et combiner sur mesure les véhicules les plus adaptés à vos objectifs et à votre horizon, sans dépendance à une enveloppe unique."],
        rev=True)
    p2 += ('<p class="eyebrow" style="margin-top:72px" data-reveal>Les principales enveloppes et structures</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("shield","Assurance-vie","Capitalisation, diversification et transmission, dans une logique long terme.","placements-financiers.html"),
              ("chart","PEA / PEA-PME","Cadre dédié à certaines stratégies actions à vocation patrimoniale."),
              ("coins","Contrat de capitalisation","Détention patrimoniale, sociétaire ou successorale."),
              ("globe","Contrat luxembourgeois","Sécurité renforcée, architecture ouverte et ingénierie avancée.","placements-financiers.html"),
              ("building","SCI","Structuration immobilière, gouvernance familiale et transmission.","structuration-juridique.html"),
              ("treasury","Holding patrimoniale","Centralisation des participations, capitalisation et remontée de flux.","structuration-juridique.html"),
              ("puzzle","Société civile patrimoniale","Détention, organisation et pilotage multi-actifs."),
              ("scale","Démembrement de propriété","Optimisation et transmission via usufruit / nue-propriété.","structuration-juridique.html"),
              ("compass","Détention directe ou indirecte","Arbitrage entre simplicité, fiscalité, financement et gouvernance."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:64px" data-reveal>Chaque structure a ses conséquences</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Fiscalité des revenus","Fiscalité des plus-values","Fiscalité successorale","Liquidité","Coûts de fonctionnement"]) + '</ul>'
          '<ul class="checklist">' + lis(["Souplesse de gestion","Niveau de protection","Gouvernance","Capacité de restructuration","Évolutivité dans le temps"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:56px" data-reveal>Cas d’usage</p>')
    p2 += tagrow(["Immobilier via SCI","Capitalisation via assurance-vie","Réserves via holding","Transmission via démembrement","International via Luxembourg"])
    body += section(p2, cls="section band-cream")

    # — Étape 03 : Long terme
    p3 = ('<div data-reveal style="max-width:780px"><p class="eyebrow">Étape 03 — Long terme</p>'
          '<h2 class="title-lg">Anticiper transmission, cession et gouvernance</h2><hr class="rule">'
          '<p class="lede">Les décisions les plus structurantes concernent les grandes étapes de vie. Un patrimoine performant peut perdre une part de sa valeur faute d’anticipation lors de sa transmission, de sa cession ou de sa réorganisation.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Les moments clés à anticiper</p>')
    p3 += tagrow(["Cession d’entreprise","Transmission familiale","Donation","Liquidité exceptionnelle","Réorganisation","Retraite","Internationalisation","Évolution familiale"])
    p3 += ('<div class="grid grid-2" style="margin-top:44px">'
           '<div class="card" data-reveal><div class="card__num">Dirigeants</div><h3>Préparer la cession</h3>'
           '<p>L’entreprise représente souvent la majeure partie du patrimoine : sa cession se prépare en amont — structuration de détention, organisation des flux, réallocation du capital, protection post-liquidité et gouvernance. Sans anticipation, la fiscalité de cession devient subie plutôt que pilotée.</p></div>'
           '<div class="card" data-reveal data-delay="1"><div class="card__num">Familles</div><h3>Organiser la transmission</h3>'
           '<p>Transmettre sans fragiliser : donation simple ou graduelle, donation-partage, démembrement, holdings ou SCI, clauses statutaires, protection du conjoint et préparation des héritiers — en articulant fiscalité, droit civil et gouvernance.</p></div>'
           '</div>'
           '<p class="eyebrow" style="margin-top:60px" data-reveal>Une gouvernance qui traverse les générations</p>'
           '<p class="muted" style="margin-top:12px;max-width:70ch" data-reveal>Sans gouvernance, le patrimoine s’expose à la dilution, aux conflits successoraux, à la perte de contrôle et à la fragmentation. Nous bâtissons une architecture capable de traverser les cycles économiques et les évolutions réglementaires.</p>')
    p3 += tagrow(["Création","Développement","Sécurisation","Liquidité","Transmission"])
    p3 += ('<p class="eyebrow" style="margin-top:56px" data-reveal>Une coordination d’experts</p>'
           '<p class="muted" style="margin-top:12px;max-width:70ch" data-reveal>Notre indépendance nous permet de coordonner l’ensemble des expertises nécessaires.</p>')
    p3 += tagrow(["Fiscalistes","Notaires","Avocats","Experts-comptables","Ingénierie patrimoniale","Allocation d’actifs"])
    p3 += '<p style="margin-top:28px" data-reveal><a class="link-arrow" href="structuration-juridique.html">Découvrir la structuration juridique et fiscale %s</a></p>' % arrow()
    body += section(p3)

    # — Citation de clôture
    body += section('<div class="quote" data-reveal><p>« Faire de la fiscalité long terme un outil de pilotage stratégique, plutôt qu’une contrainte tardivement subie. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")

    body += cta_band("Optimisons votre fiscalité","Un audit fiscal et patrimonial révèle souvent des marges d’optimisation insoupçonnées. Étudions votre situation en toute confidentialité.")
    page("optimiser-fiscalite.html","Optimiser votre fiscalité","Structurer vos revenus et vos flux, choisir les bonnes enveloppes et structures, et anticiper transmission et cession : une stratégie fiscale globale et durable.", body)

def build_ceder():
    def lis(items): return "".join("<li>%s</li>" % x for x in items)
    def tagrow(items, light=False):
        cls = "tags tags--light" if light else "tags"
        return '<div class="%s" style="margin-top:16px" data-reveal>%s</div>' % (cls, "".join('<span class="tag">%s</span>' % t for t in items))
    body = page_hero("Céder ou transmettre votre entreprise",
        "La cession ou la transmission d’une entreprise constitue l’un des moments les plus stratégiques dans la vie d’un dirigeant — bien plus qu’une simple transaction.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Céder ou transmettre votre entreprise",None)])

    # — Philosophie
    body += intro("Notre approche", "Bien plus qu’une simple transaction",
        "Céder ou transmettre son entreprise implique d’anticiper simultanément des enjeux financiers, fiscaux, juridiques, patrimoniaux, familiaux et humains.",
        ["La qualité de la préparation détermine directement la valorisation, la fiscalité, la protection du dirigeant, l’organisation du capital futur et la pérennité du projet.",
         "Notre rôle : construire une stratégie globale — préparation en amont, structuration, optimisation, sécurisation post-opération et organisation patrimoniale de long terme."],
        "assets/img/paris-colonnade.jpg", "Cession et transmission d’entreprise")

    # — Objectif (citation)
    body += section('<div class="quote" data-reveal><p>« Transformer une opération de cession ou de transmission en stratégie de valorisation, de protection et de continuité patrimoniale. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")

    # — Étape 01 : Préparer
    p1 = ('<div data-reveal style="max-width:800px"><p class="eyebrow">Étape 01 — Préparer</p>'
          '<h2 class="title-lg">Préparer, structurer et optimiser l’opération</h2><hr class="rule">'
          '<p class="lede">La réussite dépend avant tout de la préparation en amont. L’objectif n’est pas de céder une société, mais de maximiser la valeur nette créée, d’optimiser la structuration juridique et fiscale et de protéger le dirigeant et sa famille.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Un audit stratégique approfondi</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Structure de détention actuelle","Valorisation et attractivité de l’entreprise","Situation patrimoniale du dirigeant","Fiscalité potentielle de l’opération","Objectifs de liquidité"]) + '</ul>'
          '<ul class="checklist">' + lis(["Enjeux familiaux","Horizon de sortie","Gouvernance","Continuité souhaitée","Risque de concentration patrimoniale"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>Nos axes d’intervention</p>'
          '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("chart","Préparation de la valorisation","Lisibilité capitalistique, organisation financière, séparation d’actifs et préparation de la négociation."),
              ("scale","Structuration juridique préalable","Holdings, réorganisation capitalistique, gouvernance, pactes et sécurisation des actifs.","structuration-juridique.html"),
              ("doc","Ingénierie fiscale avancée","Structurer l’opération pour améliorer son efficience, avec les outils adaptés à votre situation."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>Les dispositifs analysés</p>'
          '<div class="grid grid-2" style="margin-top:24px">' + tiles([
              ("treasury","Apport-cession (150-0 B ter)","Apport préalable des titres à une holding avant cession, pour organiser la réallocation et le réinvestissement du capital.","private-equity.html"),
              ("shield","Pacte Dutreil","Outil central de la transmission familiale : continuité entrepreneuriale et gouvernance, sous conditions adaptées.","structuration-juridique.html"),
              ("coins","Donation avant cession","Anticipation patrimoniale et familiale, selon les situations."),
              ("compass","Réorganisation pré-liquidité","Sécurisation du patrimoine privé et préparation de la diversification."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>Les scénarios étudiés</p>')
    p1 += tagrow(["Vente industrielle","Transmission familiale","LBO / MBO / MBI","OBO patrimonial","Cession progressive","Réorganisation de groupe"])
    p1 += '<p class="muted" style="margin-top:32px;max-width:72ch" data-reveal>Nous coordonnons l’ensemble des expertises nécessaires : ingénierie patrimoniale, fiscalité, avocats, notaires, M&amp;A, gouvernance et stratégie d’allocation future.</p>'
    body += section(p1)

    # — Étape 02 : Après-cession (fond crème, avec visuel marchés)
    p2 = feature_row("assets/img/serenite.jpg", "Sécurisation du capital post-cession",
        "Étape 02 — Après-cession", "Sécuriser le capital post-opération",
        ["La réussite ne se mesure pas qu’à l’opération, mais à la façon dont le capital est ensuite structuré, sécurisé et piloté. La cession fait passer d’un patrimoine concentré et illiquide à une liquidité importante à réorganiser.",
         "L’enjeu : transformer une liquidité exceptionnelle en patrimoine structuré de long terme."],
        rev=True)
    p2 += ('<p class="eyebrow" style="margin-top:72px" data-reveal>Segmenter le capital</p>'
           '<div class="grid grid-4" style="margin-top:24px">' + tiles([
              ("lock","Capital de sécurité","Protection, stabilité, disponibilité et niveau de vie préservé."),
              ("puzzle","Capital de diversification","Réduction du risque de concentration par allocation multi-actifs."),
              ("growth","Capital de croissance","Réinvestissements stratégiques : private equity, immobilier, finance."),
              ("concierge","Capital patrimonial","Transmission, structuration familiale et protection intergénérationnelle."),
          ]) + '</div>'
           '<p class="eyebrow" style="margin-top:60px" data-reveal>Nos axes de travail</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("shield","Sécurisation patrimoniale","Protection du patrimoine privé, séparation des risques, holdings, SCI et véhicules dédiés."),
              ("chart","Réallocation financière","Une allocation cohérente entre sécurité, rendement, diversification, liquidité et fiscalité."),
              ("scale","Optimisation post-liquidité","Structuration des flux, capitalisation, réinvestissement et stratégie long terme."),
              ("coins","Organisation du revenu futur","Transformer un patrimoine entrepreneurial en revenus complémentaires ou capitalisation."),
              ("treasury","Holding patrimoniale","Centraliser, réinvestir, gérer la trésorerie et préparer la succession."),
              ("compass","Gouvernance familiale","Préparation de la transmission et continuité patrimoniale."),
          ]) + '</div>'
           '<p class="eyebrow" style="margin-top:60px" data-reveal>Les classes d’actifs mobilisables</p>')
    p2 += tagrow(["Trésorerie sécurisée","Contrats de capitalisation","Contrats luxembourgeois","Immobilier","Private equity","Produits structurés","Allocation obligataire"])
    p2 += ('<p class="eyebrow" style="margin-top:60px" data-reveal>Des enjeux souvent sous-estimés</p>'
           '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
           '<ul class="checklist">' + lis(["Risque psychologique post-cession","Sur-exposition à de nouveaux projets","Inflation et pouvoir d’achat","Fiscalité future"]) + '</ul>'
           '<ul class="checklist">' + lis(["Protection familiale","Liquidité réelle","Temporalité des réinvestissements","Discipline d’une direction financière"]) + '</ul></div>'
           '<p class="muted" style="margin-top:32px;max-width:72ch" data-reveal>Il ne s’agit pas seulement de conserver le capital, mais de le repositionner intelligemment selon une nouvelle logique de cycle patrimonial.</p>')
    p2 += tagrow(["Sécuriser","Diversifier","Structurer","Générer","Transmettre"])
    body += section(p2, cls="section band-cream")

    # — Étape 03 : Continuité
    p3 = ('<div data-reveal style="max-width:800px"><p class="eyebrow">Étape 03 — Continuité</p>'
          '<h2 class="title-lg">Assurer la continuité familiale, entrepreneuriale et patrimoniale</h2><hr class="rule">'
          '<p class="lede">Céder ou transmettre, ce n’est pas seulement transférer un capital : c’est préserver une continuité — pour que la valeur créée soit transmise, mais aussi protégée, organisée et durablement maîtrisée.</p></div>'
          '<div class="grid grid-3" style="margin-top:44px">' + tiles([
              ("concierge","Continuité familiale","Maintenir l’entreprise ou le patrimoine structurés au sein de la famille."),
              ("building","Continuité entrepreneuriale","Assurer la pérennité d’un projet, d’une gouvernance et d’une vision."),
              ("shield","Continuité patrimoniale","Protéger, organiser et maîtriser durablement la valeur créée."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>Analyser l’environnement global</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Structure familiale","Présence de repreneurs (ou non)","Volonté de conservation ou de cession","Protection du conjoint","Équilibre entre héritiers"]) + '</ul>'
          '<ul class="checklist">' + lis(["Gouvernance future","Besoins de liquidité familiale","Vision entrepreneuriale","Pérennité des structures","Préparation des héritiers"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>Les outils de transmission familiale</p>'
          '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("shield","Pacte Dutreil","Organiser la continuité capitalistique et familiale de l’entreprise.","structuration-juridique.html"),
              ("coins","Donation-partage","Répartition anticipée et organisée du patrimoine."),
              ("scale","Démembrement de propriété","Transmettre progressivement tout en conservant contrôle et revenus.","structuration-juridique.html"),
              ("treasury","Holdings familiales","Centraliser le contrôle et structurer le pouvoir entre générations."),
              ("doc","Clauses statutaires & pactes","Organiser les droits, la gouvernance et la stabilité future."),
              ("concierge","Family Office","Coordination globale lorsque la transmission n’est pas familiale.","family-office.html"),
          ]) + '</div>'
          '<div class="card" style="margin-top:40px" data-reveal><div class="card__num">Un équilibre subtil</div>'
          '<h3>Équité patrimoniale n’est pas équité familiale</h3>'
          '<p>Tous les héritiers n’ont pas la même implication entrepreneuriale, les mêmes compétences ni les mêmes attentes. Une transmission réussie intègre cette réalité avec finesse, en distinguant la valeur transmise et le rôle de chacun.</p></div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>La gouvernance, clé de la pérennité</p>')
    p3 += tagrow(["Gouvernance de holdings","Conseil de famille","Préparation des générations","Formation des héritiers","Organisation du pouvoir","Protection des actifs stratégiques","Préservation de l’unité"])
    p3 += '<p class="muted" style="margin-top:32px;max-width:72ch" data-reveal>Lorsque la transmission familiale n’est pas privilégiée, la continuité prend d’autres formes : reprise par le management, repreneur externe, Family Office ou organisation d’un capital familial post-cession.</p>'
    body += section(p3)

    # — Citation de clôture
    body += section('<div class="quote" data-reveal><p>« Faire en sorte que la réussite entrepreneuriale ne s’arrête pas à la transaction, mais se prolonge en héritage organisé, protégé et pérennisé à travers les générations. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")

    body += cta_band("Préparons votre cession ou transmission","Plus une opération est anticipée, plus elle est optimisée. Rencontrons-nous en toute confidentialité pour en poser les fondations.")
    page("ceder-transmettre.html","Céder ou transmettre votre entreprise","Préparer et structurer l’opération, sécuriser le capital post-cession et assurer la continuité familiale, entrepreneuriale et patrimoniale.", body)

def build_retraite():
    def lis(items): return "".join("<li>%s</li>" % x for x in items)
    def tagrow(items, light=False):
        cls = "tags tags--light" if light else "tags"
        return '<div class="%s" style="margin-top:16px" data-reveal>%s</div>' % (cls, "".join('<span class="tag">%s</span>' % t for t in items))
    body = page_hero("Préparer votre retraite",
        "Préparer sa retraite, ce n’est pas seulement anticiper la fin de son activité, mais organiser une nouvelle phase de vie où revenus, patrimoine, fiscalité et liberté financière se pensent avec précision.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Préparer votre retraite",None)])

    # — Philosophie
    body += intro("Notre approche", "La retraite, un véritable projet patrimonial",
        "L’enjeu n’est plus de « cesser de travailler », mais de préserver votre niveau de vie, sécuriser vos revenus futurs, valoriser votre capital et organiser sereinement votre transmission.",
        ["Évolution des régimes obligatoires, incertitudes économiques, allongement de l’espérance de vie : chaque situation appelle une stratégie spécifique — dirigeant, profession libérale, salarié, investisseur, entrepreneur ou famille patrimoniale.",
         "Notre rôle : construire une stratégie retraite globale, intégrant anticipation financière, optimisation fiscale, diversification patrimoniale, organisation des revenus futurs et sécurisation de long terme."],
        "assets/img/retraite.jpg", "Préparation de la retraite", rev=True)

    # — Objectif (citation)
    body += section('<div class="quote" data-reveal><p>« Transformer la préparation de votre retraite en stratégie de liberté financière durable, structurée autour de vos projets de vie. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")

    # — Étape 01 : Construire la stratégie
    p1 = ('<div data-reveal style="max-width:800px"><p class="eyebrow">Étape 01 — Stratégie</p>'
          '<h2 class="title-lg">Construire votre stratégie et anticiper vos besoins</h2><hr class="rule">'
          '<p class="lede">La retraite ne doit pas être subie comme une baisse de revenus, mais préparée comme une transition patrimoniale structurée — où la logique d’accumulation cède progressivement la place à la sécurisation, aux revenus et à la transmission.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Un audit complet de votre situation</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Droits retraite obligatoires et complémentaires","Revenus actuels et futurs","Patrimoine financier, immobilier, professionnel","Niveau de vie cible","Charges prévisibles"]) + '</ul>'
          '<ul class="checklist">' + lis(["Projets personnels (voyages, résidence, transmission)","Horizon de départ","Fiscalité future","Situation familiale","Écart revenus prévisibles / niveau de vie souhaité"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:56px" data-reveal>Les questions qui guident la feuille de route</p>')
    p1 += tagrow(["Quel revenu sécuriser ?","Quel capital constituer ?","Sécurité ou rendement ?","Immobilier, finance ou entreprise ?","Quelle fiscalité future ?","Quelle transmission ?"])
    p1 += ('<p class="eyebrow" style="margin-top:56px" data-reveal>Les piliers de votre stratégie retraite</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("shield","Revenus garantis ou prévisibles","Régimes obligatoires, complémentaires et pensions existantes."),
              ("coins","Revenus patrimoniaux complémentaires","Immobilier, assurance-vie, placements financiers, dividendes."),
              ("lock","Capital de sécurité","Réserves de précaution, liquidité et protection du niveau de vie."),
              ("growth","Capital de croissance / préservation","Maintien de la valorisation patrimoniale sur le long terme."),
              ("concierge","Transmission","Préservation du patrimoine familial et organisation successorale."),
              ("compass","Temporalité du départ","Départ progressif, cessation complète ou revenus partiels."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:56px" data-reveal>Des paramètres souvent sous-estimés</p>')
    p1 += tagrow(["Inflation long terme","Besoins de santé","Dépendance potentielle","Fiscalité des sorties","Liquidité","Protection du conjoint"])
    body += section(p1)

    # — Étape 02 : Constituer les revenus (fond crème, photo)
    p2 = feature_row("assets/img/mansion.jpg", "Architecture des revenus futurs",
        "Étape 02 — Revenus", "Constituer, diversifier et optimiser vos revenus",
        ["Une stratégie performante ne repose pas sur une seule source de revenus, mais sur un écosystème patrimonial capable de générer, sécuriser et optimiser des ressources complémentaires.",
         "Dans la majorité des cas, les régimes obligatoires ne suffisent pas : il s’agit de transformer votre capacité actuelle de création de richesse en revenus futurs durables, diversifiés et fiscalement cohérents."],
        rev=True)
    p2 += ('<p class="eyebrow" style="margin-top:72px" data-reveal>Les grandes sources de revenus retraite</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("retire","Plan d’Épargne Retraite (PER)","Préparer la retraite dans un cadre fiscal dédié, en capitalisation long terme.","epargner-investir.html"),
              ("shield","Assurance-vie & capitalisation","Souplesse, diversification, capitalisation et transmission.","placements-financiers.html"),
              ("building","Immobilier patrimonial","SCPI, immobilier locatif et club deals pour des revenus tangibles.","placements-immobiliers.html"),
              ("chart","Portefeuilles financiers","Dividendes, obligations, allocation de rendement ou capitalisation.","placements-financiers.html"),
              ("treasury","Trésorerie & produits de taux","Sécurisation progressive et revenus adaptés à chaque phase de vie.","tresorerie-entreprise.html"),
              ("puzzle","Patrimoine entrepreneurial","Pour les dirigeants : revenus structurés post-cession ou via holding.","ceder-transmettre.html"),
          ]) + '</div>'
           '<p class="eyebrow" style="margin-top:60px" data-reveal>Une logique de « strates de revenus »</p>')
    p2 += tagrow(["Base sécurisée","Compléments patrimoniaux","Réserves stratégiques","Flexibilité long terme"])
    p2 += ('<p class="eyebrow" style="margin-top:56px" data-reveal>Les arbitrages fondamentaux</p>'
           '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
           '<ul class="checklist">' + lis(["Revenus immédiats ou capitalisation","Sécurité ou rendement"]) + '</ul>'
           '<ul class="checklist">' + lis(["Liquidité ou performance","Fiscalité actuelle ou future"]) + '</ul></div>'
           '<p class="muted" style="margin-top:32px;max-width:72ch" data-reveal>La stratégie s’adapte à mesure que la retraite approche : accumulation, consolidation, sécurisation, puis distribution.</p>')
    body += section(p2, cls="section band-cream")

    # — Étape 03 : Sécuriser
    p3 = ('<div data-reveal style="max-width:800px"><p class="eyebrow">Étape 03 — Sécuriser</p>'
          '<h2 class="title-lg">Sécuriser votre patrimoine, votre fiscalité et votre transmission</h2><hr class="rule">'
          '<p class="lede">À l’approche de la retraite, la logique patrimoniale évolue : il ne s’agit plus seulement de développer, mais de sécuriser, préserver et transmettre. C’est le passage d’une stratégie d’accumulation à une stratégie de consolidation.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Une réévaluation complète</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Patrimoine constitué","Sources de revenus retraite","Besoins de liquidité","Fiscalité future","Protection du conjoint"]) + '</ul>'
          '<ul class="checklist">' + lis(["Transmission familiale","Risques de marché","Exposition entrepreneuriale résiduelle","Organisation successorale","Concentration excessive"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>Nos piliers de sécurisation</p>'
          '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("shield","Protection du capital","Réduction progressive des expositions, diversification et sécurisation des réserves."),
              ("scale","Structuration fiscale post-activité","Organisation des flux, optimisation des sorties et choix des enveloppes.","optimiser-fiscalite.html"),
              ("treasury","Gouvernance patrimoniale","SCI, holdings, sociétés civiles et organisation du contrôle.","structuration-juridique.html"),
              ("concierge","Protection familiale","Conjoint, héritiers, dépendance et équilibre de la transmission."),
              ("doc","Préparation successorale","Donation, démembrement, assurance-vie et gouvernance intergénérationnelle."),
              ("compass","Continuité dans le temps","Une cohérence patrimoniale maintenue face aux aléas et aux cycles."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>La fiscalité, préserver l’efficacité nette dans le temps</p>')
    p3 += tagrow(["Fiscalité des revenus retraite","Rachats et sorties","Fiscalité immobilière","Plus-values","Transmission","Patrimoine privé / sociétaire"])
    p3 += ('<p class="eyebrow" style="margin-top:56px" data-reveal>Une logique de cycle patrimonial</p>')
    p3 += tagrow(["Préserver","Structurer","Protéger","Optimiser","Transmettre"])
    body += section(p3)

    # — Citation de clôture
    body += section('<div class="quote" data-reveal><p>« Faire de votre patrimoine retraite un instrument de revenus, mais aussi de protection, de liberté et de continuité familiale. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")

    body += cta_band("Préparons votre retraite","Quel niveau de vie visez-vous ? Établissons ensemble une trajectoire chiffrée et pilotable pour l’atteindre sereinement.")
    page("preparer-retraite.html","Préparer votre retraite","Construire votre stratégie retraite, constituer et diversifier vos revenus futurs, sécuriser votre patrimoine, votre fiscalité et votre transmission.", body)

def build_expatriation():
    def lis(items): return "".join("<li>%s</li>" % x for x in items)
    def tagrow(items, light=False):
        cls = "tags tags--light" if light else "tags"
        return '<div class="%s" style="margin-top:16px" data-reveal>%s</div>' % (cls, "".join('<span class="tag">%s</span>' % t for t in items))
    body = page_hero("S’expatrier à l’étranger",
        "S’expatrier, ce n’est pas seulement changer de lieu de résidence : c’est une décision de vie qui impacte votre fiscalité, votre patrimoine, vos investissements, votre entreprise, votre retraite et votre transmission.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("S’expatrier à l’étranger",None)])

    # — Philosophie
    body += intro("Notre approche", "Faire de votre mobilité une opportunité stratégique",
        "Mal préparée, une expatriation entraîne double imposition, erreurs déclaratives, désorganisation patrimoniale ou perte d’optimisation. Bien anticipée, elle devient une opportunité.",
        ["Réorganiser son patrimoine, adapter sa fiscalité, internationaliser ses investissements et préserver durablement ses intérêts personnels, familiaux et économiques : tels sont les bénéfices d’une mobilité maîtrisée.",
         "Notre rôle : une stratégie globale couvrant l’avant, le pendant et l’après — préparation juridique et fiscale, structuration patrimoniale, coordination internationale et protection de long terme."],
        "assets/img/serenite.jpg", "Expatriation et mobilité internationale", rev=True)

    # — Objectif (citation)
    body += section('<div class="quote" data-reveal><p>« Transformer votre expatriation en projet de mobilité patrimoniale maîtrisé, sécurisé et optimisé. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")

    # — Étape 01 : Préparer le départ
    p1 = ('<div data-reveal style="max-width:800px"><p class="eyebrow">Étape 01 — Départ</p>'
          '<h2 class="title-lg">Préparer votre départ : fiscalité, résidence et structuration</h2><hr class="rule">'
          '<p class="lede">Une expatriation réussie se prépare bien avant le départ. Le changement de résidence fiscale implique une reconfiguration potentiellement majeure de votre situation personnelle, professionnelle et patrimoniale.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Un audit global de votre situation</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Résidence fiscale actuelle","Situation familiale","Patrimoine financier et immobilier","Sociétés, holdings ou activité","Revenus et flux internationaux"]) + '</ul>'
          '<ul class="checklist">' + lis(["Enjeux successoraux","Objectifs de mobilité","Pays de destination","Horizon de résidence","Obligations déclaratives"]) + '</ul></div>'
          '<p class="eyebrow" style="margin-top:56px" data-reveal>Sécuriser le changement de résidence fiscale</p>'
          '<p class="muted" style="margin-top:12px;max-width:74ch" data-reveal>La résidence fiscale ne dépend pas d’une adresse, mais de critères complexes — foyer, centre des intérêts économiques, durée de présence, activité, conventions bilatérales.</p>')
    p1 += tagrow(["Sortie du cadre fiscal initial","Cohérence avec la juridiction d’accueil","Documentation de résidence","Organisation des flux","Conformité déclarative"])
    p1 += ('<p class="eyebrow" style="margin-top:56px" data-reveal>Pour dirigeants, entrepreneurs et actionnaires</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("scale","Exit tax potentielle","Anticiper la fiscalité de sortie sur vos participations.","optimiser-fiscalite.html"),
              ("treasury","Structuration de participations","Réorganisation de holdings et gouvernance internationale.","structuration-juridique.html"),
              ("growth","Préparation de cession","Coordonner expatriation et opération de cession à venir.","ceder-transmettre.html"),
              ("puzzle","Réallocation patrimoniale","Arbitrages et réallocation d’actifs avant le départ."),
              ("building","Structuration immobilière","Adapter la détention de vos biens à votre mobilité."),
              ("shield","Protection familiale","Sécuriser le conjoint et les proches dès la préparation."),
          ]) + '</div>'
          '<p class="eyebrow" style="margin-top:56px" data-reveal>Des aspects souvent sous-estimés</p>')
    p1 += tagrow(["Protection sociale","Assurance santé","Régime de retraite","Scolarité familiale","Gouvernance d’actifs à distance","Risques réglementaires"])
    body += section(p1)

    # — Étape 02 : Organiser à l'international (fond crème, photo Luxembourg)
    p2 = feature_row("assets/img/img-luxembourg.svg", "Architecture patrimoniale internationale",
        "Étape 02 — International", "Organiser votre patrimoine et vos investissements",
        ["Une expatriation implique une réorganisation profonde du patrimoine pour l’adapter à votre juridiction d’accueil, à vos obligations réglementaires et à vos objectifs de long terme.",
         "L’enjeu : transformer un patrimoine structuré selon le pays d’origine en une architecture internationale cohérente — efficace fiscalement, conforme, protégée et flexible. Le contrat luxembourgeois y joue souvent un rôle de référence."],
        rev=True)
    p2 += ('<p class="eyebrow" style="margin-top:72px" data-reveal>Cartographier puis arbitrer vos actifs</p>'
           '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
           '<ul class="checklist">' + lis(["Immobilier domestique et international","Portefeuilles financiers","Assurance-vie et capitalisation","Sociétés, holdings ou participations"]) + '</ul>'
           '<ul class="checklist">' + lis(["Trésorerie et revenus internationaux","Structures familiales","Obligations déclaratives multi-juridictions","Devises et liquidité"]) + '</ul></div>'
           '<p class="eyebrow" style="margin-top:56px" data-reveal>Nos piliers de structuration</p>'
           '<div class="grid grid-3" style="margin-top:24px">' + tiles([
              ("globe","Investissements financiers","Enveloppes et contrats internationaux, architecture ouverte et fiscalité transfrontalière.","placements-financiers.html"),
              ("building","Immobilier international","Conservation, arbitrage, détention directe ou sociétaire et fiscalité locale.","placements-immobiliers.html"),
              ("treasury","Holdings & structures sociétaires","Gouvernance, centralisation et coordination des flux.","structuration-juridique.html"),
              ("coins","Trésorerie internationale","Organisation des liquidités, devises, sécurité et allocation.","tresorerie-entreprise.html"),
              ("compass","Diversification géographique","Répartition entre juridictions, zones monétaires et classes d’actifs."),
              ("concierge","Family Office international","Coordination globale pour familles et entrepreneurs multi-pays.","family-office.html"),
          ]) + '</div>'
           '<p class="eyebrow" style="margin-top:56px" data-reveal>Anticiper les mobilités futures</p>')
    p2 += tagrow(["Retour éventuel","Multi-résidence","Cession future","Transmission internationale","Gouvernance transfrontalière"])
    body += section(p2, cls="section band-cream")

    # — Étape 03 : Sécuriser la mobilité long terme
    p3 = ('<div data-reveal style="max-width:800px"><p class="eyebrow">Étape 03 — Long terme</p>'
          '<h2 class="title-lg">Sécuriser votre mobilité : retraite, transmission et gouvernance</h2><hr class="rule">'
          '<p class="lede">Une fois le départ organisé et le patrimoine adapté, l’enjeu devient la continuité : protéger durablement votre situation et maintenir une cohérence patrimoniale dans un environnement transfrontalier.</p></div>'
          '<p class="eyebrow" style="margin-top:48px" data-reveal>Projeter votre situation dans le temps</p>'
          '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
          '<ul class="checklist">' + lis(["Durée probable d’expatriation","Retour éventuel ou installation durable","Évolution familiale et scolarité","Retraite future","Revenus de long terme"]) + '</ul>'
          '<ul class="checklist">' + lis(["Patrimoine transfrontalier","Transmission internationale","Gouvernance multi-juridictionnelle","Protection des proches","Liquidité internationale"]) + '</ul></div>'
          '<div class="grid grid-2" style="margin-top:44px">'
          '<div class="card" data-reveal><div class="card__num">Retraite internationale</div><h3>Coordonner vos droits par-delà les frontières</h3>'
          '<p>Cotisations, régimes obligatoires, coordination entre pays, fiscalité future des pensions et couverture santé : nous combinons maintien des droits existants, capitalisation internationale et diversification géographique des revenus.</p></div>'
          '<div class="card" data-reveal data-delay="1"><div class="card__num">Transmission internationale</div><h3>Éviter la désorganisation successorale</h3>'
          '<p>Les règles civiles et fiscales diffèrent selon les juridictions : nous structurons la succession transfrontalière, coordonnons les droits nationaux, protégeons le conjoint et les héritiers et choisissons les véhicules adaptés.</p></div>'
          '</div>'
          '<p class="eyebrow" style="margin-top:60px" data-reveal>Une gouvernance internationale</p>'
          '<p class="muted" style="margin-top:12px;max-width:74ch" data-reveal>Pour les familles multi-résidentes, entrepreneurs internationaux, holdings et family offices transfrontaliers : une architecture qui assure coordination juridique, cohérence fiscale, pilotage global et continuité intergénérationnelle.</p>')
    p3 += tagrow(["Changement futur de juridiction","Retour au pays d’origine","Double nationalité patrimoniale","Réorganisation post-cession","Gouvernance à distance"])
    body += section(p3)

    # — Citation de clôture
    body += section('<div class="quote" data-reveal><p>« Faire de votre expatriation une plateforme patrimoniale internationale, capable d’accompagner votre vie personnelle, familiale et économique à travers le temps. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")

    body += cta_band("Préparez votre expatriation","Un projet de mobilité internationale ? Anticipons ensemble ses conséquences fiscales, patrimoniales et successorales, en coordination avec vos conseils locaux.")
    page("expatriation.html","S’expatrier à l’étranger","Préparer votre départ (résidence, fiscalité), organiser votre patrimoine à l’international et sécuriser votre mobilité long terme : retraite, transmission et gouvernance.", body)


# ---- Solutions ----
FIN_SOLUTIONS = [
    ("shield","Contrats d’assurance-vie","Développer, organiser et transmettre votre capital, dans un cadre fiscal attractif.","assurance-vie.html"),
    ("coins","Contrats de capitalisation","Structurer et transmettre un capital — y compris du vivant ou via une société.","contrat-capitalisation.html"),
    ("globe","Contrats luxembourgeois","Une plateforme patrimoniale internationale, sécurité et souplesse maximales.","contrat-luxembourgeois.html"),
    ("retire","Solutions retraite","Construire des revenus complémentaires futurs (PER et au-delà).","solutions-retraite.html"),
    ("chart","Comptes-titres","Accéder à l’ensemble des marchés financiers, sans frontière.","comptes-titres.html"),
    ("growth","PEA","Investir en actions européennes dans un cadre fiscal avantageux.","pea.html"),
    ("puzzle","PEA-PME / ETI","Financer les PME et ETI à fort potentiel, fiscalité du PEA.","pea-pme.html"),
    ("compass","Mandats de gestion","Déléguer la gestion à des professionnels, selon vos objectifs.","mandats-gestion.html"),
    ("doc","Produits structurés","Une ingénierie sur-mesure rendement / protection, en architecture ouverte.","produits-structures.html"),
]

def build_placements_financiers():
    body = page_hero("Placements financiers",
        "Une gamme complète de solutions conçues pour structurer, valoriser et transmettre votre patrimoine selon vos objectifs personnels, familiaux ou professionnels.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Placements financiers",None)])
    body += intro("Architecture ouverte","Le meilleur de chaque univers d’investissement",
        "Nous ne commercialisons aucun produit maison. Notre indépendance nous permet de sélectionner, sans biais, les supports et enveloppes les mieux adaptés à votre profil.",
        ["Préparer la retraite, optimiser votre fiscalité, dynamiser votre épargne ou sécuriser votre capital : à chaque objectif, une combinaison de solutions sur-mesure.",
         "Chaque brique est choisie pour sa contribution à l’ensemble, puis pilotée dans la durée avec des arbitrages réguliers et un reporting transparent."],
        "assets/img/paris-courtyard.jpg","Marchés financiers")
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">Nos solutions financières</p><h2 class="title-lg">Neuf enveloppes, une stratégie cohérente</h2><hr class="rule">'
        '<p class="lede">Découvrez chaque solution en détail — nous les articulons ensuite au sein d’une allocation globale.</p></div>'
        '<div class="grid grid-3" style="margin-top:54px">' + tiles(FIN_SOLUTIONS) + '</div>', cls="section band-cream")
    # Flagship dark callout
    body += '<section class="section band-dark"><div class="container">'
    body += ('<div class="split"><div data-reveal><p class="eyebrow eyebrow--light">À la une</p>'
        '<h2 class="title-lg">Assurance-vie luxembourgeoise & produits structurés sur-mesure</h2><hr class="rule">'
        '<p class="lede" style="color:rgba(246,242,233,.85)">Nos deux expertises phares : la sécurité d’exception du contrat luxembourgeois et l’ingénierie des produits structurés, sélectionnés en architecture ouverte auprès des plus grandes salles de marché.</p>'
        '<div class="hero__actions" style="margin-top:26px">'
        '<a class="btn btn--light" href="contrat-luxembourgeois.html">Le contrat luxembourgeois %s</a>'
        '<a class="btn btn--ghost-light" href="produits-structures.html">Les produits structurés</a>'
        '</div></div>'
        '<div class="split__media" data-reveal data-delay="1"><div class="media-frame"><img src="assets/img/img-luxembourg.svg" alt="Triangle de sécurité luxembourgeois"></div></div></div>' % arrow())
    body += '</div></section>'
    # FAQ
    body += section('<div class="center" style="max-width:640px;margin-inline:auto" data-reveal><p class="eyebrow">Questions fréquentes</p><h2 class="title-lg">Vos placements financiers</h2><hr class="rule"></div>'
        '<div style="max-width:860px;margin:40px auto 0" data-reveal>' + faq([
            ("Pourquoi privilégier un contrat luxembourgeois plutôt que français ?",
             "<p>Pour la protection juridique (triangle de sécurité, super-privilège), l’accès à des supports et devises plus larges, et la portabilité en cas d’expatriation. Le contrat français conserve toutefois des atouts, notamment pour des montants plus modestes : nous vous orientons selon votre situation.</p>"),
            ("À partir de quel montant accéder à ces solutions ?",
             "<p>Les contrats luxembourgeois et les fonds dédiés s’adressent généralement à des patrimoines à partir de plusieurs centaines de milliers d’euros. Nous proposons également des solutions adaptées à des montants plus accessibles.</p>"),
            ("Un produit structuré garantit-il mon capital ?",
             "<p>Pas systématiquement. Certains offrent une garantie totale, d’autres une protection conditionnelle (barrière). Le niveau de protection se définit avec vous, en contrepartie du rendement visé. Tout investissement comporte un risque de perte en capital.</p>"),
        ]) + '</div>')
    body += cta_band("Construisons votre allocation financière","Assurance-vie luxembourgeoise, produits structurés ou actifs privés : étudions la combinaison la plus pertinente pour vous.")
    page("placements-financiers.html","Placements financiers","Assurance-vie, capitalisation, contrats luxembourgeois, retraite, comptes-titres, PEA, PEA-PME, mandats de gestion et produits structurés — en architecture ouverte.", body)

def build_fin_pages():
    """Detailed sub-pages for each financial solution."""
    def lis(items): return "".join("<li>%s</li>" % x for x in items)
    def half(items):
        n = (len(items) + 1) // 2
        return items[:n], items[n:]
    def block(b):
        kind = b[0]
        if kind == "checklist":
            _, eb, items = b; a, c = half(items)
            return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                    '<div class="grid grid-2" style="margin-top:18px;gap:8px 48px" data-reveal>'
                    '<ul class="checklist">%s</ul><ul class="checklist">%s</ul></div>' % (eb, lis(a), lis(c)))
        if kind == "cards":
            _, eb, items = b
            g = "grid-4" if len(items) == 4 else "grid-3"
            return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                    '<div class="grid %s" style="margin-top:24px">%s</div>' % (eb, g, tiles(items)))
        if kind == "tags":
            _, eb, items = b
            return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>'
                    '<div class="tags" style="margin-top:16px" data-reveal>%s</div>'
                    % (eb, "".join('<span class="tag">%s</span>' % t for t in items)))
        if kind == "text":
            _, eb, paras = b
            return ('<p class="eyebrow" style="margin-top:48px" data-reveal>%s</p>' % eb) + "".join(
                '<p class="muted" style="max-width:74ch" data-reveal>%s</p>' % p for p in paras)
        return ""
    def fin_page(slug, title, subtitle, lede, img, alt, paras, atouts, mid, related, seo, quote=None):
        crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
                  ("Placements financiers","placements-financiers.html"),(title,None)]
        body = page_hero(title, lede, crumbs)
        body += section(feature_row(img, alt, "En bref", subtitle, paras, rev=True, checklist=atouts))
        if mid:
            body += section("".join(block(b) for b in mid), cls="section band-cream")
        if quote:
            body += section('<div class="quote" data-reveal><p>« %s »</p><cite>La Financière de Rochechouart</cite></div>' % quote, cls="section--tight band-dark")
        rl = "".join('<a class="link-arrow" href="%s" style="margin:0 28px 12px 0">%s %s</a>' % (h, t, arrow()) for t, h in related)
        body += section('<p class="eyebrow" data-reveal>À explorer aussi</p>'
                        '<div style="margin-top:18px;display:flex;flex-wrap:wrap" data-reveal>%s</div>' % rl, cls="section--tight")
        body += cta_band()
        page(slug, title, seo, body)

    # 1 — Assurance-vie
    fin_page("assurance-vie.html","Contrats d’assurance-vie","Un couteau suisse patrimonial",
        "L’un des outils les plus complets pour développer, organiser et transmettre votre capital, dans un cadre fiscal attractif et avec une grande souplesse d’utilisation.",
        "assets/img/mansion.jpg","Assurance-vie",
        ["Investissez sur différents supports — du fonds en euros sécurisé aux unités de compte plus dynamiques — pour adapter la stratégie à votre profil de risque, votre horizon et vos objectifs.",
         "Constituer une épargne, préparer la retraite, financer un projet, générer des revenus ou anticiper la transmission : un même contrat, plusieurs objectifs de vie."],
        ["Allocation personnalisée : prudence, équilibre ou performance","Évolutive dans le temps selon les marchés et vos besoins","Disponibilité : rachats partiels ou totaux possibles"],
        [("cards","Quatre usages clés",[
            ("coins","Épargne progressive","Constituer un capital à votre rythme."),
            ("chart","Revenus complémentaires","Programmer des rachats réguliers."),
            ("retire","Préparer la retraite","Anticiper une baisse de revenus future."),
            ("concierge","Transmettre","Organiser la transmission de votre capital."),
         ]),
         ("checklist","La clause bénéficiaire, clé de la transmission",
            ["Désignation libre des bénéficiaires","Cadre de transmission souvent avantageux","Capital disponible pendant toute la vie du contrat","Rédaction et ajustements sur-mesure"]),
         ("checklist","Notre accompagnement",
            ["Analyse de votre situation et de vos objectifs","Sélection des contrats et supports adaptés","Rédaction ou ajustement de la clause bénéficiaire","Suivi et arbitrages au fil du temps"]),
        ],
        [("Le contrat luxembourgeois","contrat-luxembourgeois.html"),("Solutions retraite","solutions-retraite.html"),("Optimiser votre fiscalité","optimiser-fiscalite.html")],
        "Le contrat d’assurance-vie : épargne, revenus, retraite et transmission dans un cadre fiscal attractif et une grande souplesse.")

    # 2 — Capitalisation
    fin_page("contrat-capitalisation.html","Contrats de capitalisation","Un outil de structuration avancée",
        "Structurer, valoriser et transmettre un capital sur le long terme — un complément à l’assurance-vie, aux spécificités juridiques puissantes.",
        "assets/img/mansion.jpg","Contrat de capitalisation",
        ["Comme l’assurance-vie, il donne accès à une large gamme de supports : fonds en euros, unités de compte, OPCVM, ETF, obligations, actions ou supports diversifiés.",
         "Mais il s’en distingue par sa portabilité patrimoniale, qui en fait un outil de gestion avancée et de transmission anticipée."],
        ["Transmission ou donation du vivant (démembrement possible)","Détention par une société patrimoniale ou une holding","Ne se dénoue pas au décès : continuité patrimoniale"],
        [("cards","Particulièrement adapté à",[
            ("concierge","Transmission anticipée","Donation en pleine propriété ou en démembrement."),
            ("treasury","Gestion sociétaire","Trésorerie excédentaire d’une société ou holding."),
            ("lock","Conservation de capital","Un cadre juridique souple et durable."),
            ("scale","Stratégies civiles & fiscales","S’intègre dans des montages sur-mesure."),
         ]),
         ("text","Une fiscalité proche de l’assurance-vie",
            ["La fiscalité des rachats porte principalement sur les gains réalisés, avec des possibilités d’optimisation selon la durée de détention et la situation du titulaire.",
             "En cas de succession, le contrat intègre l’actif successoral et peut être conservé par les héritiers — une continuité utile à certaines stratégies de réorganisation."]),
        ],
        [("Contrats d’assurance-vie","assurance-vie.html"),("Structuration juridique","structuration-juridique.html"),("Trésorerie d’entreprise","tresorerie-entreprise.html")],
        "Le contrat de capitalisation : transmission du vivant, détention sociétaire et continuité patrimoniale, en complément de l’assurance-vie.")

    # 3 — Luxembourgeois
    fin_page("contrat-luxembourgeois.html","Contrats luxembourgeois","Une plateforme patrimoniale internationale",
        "Une solution haut de gamme : cadre juridique renforcé, grande souplesse financière et diversification internationale avancée.",
        "assets/img/img-luxembourg.svg","Contrat luxembourgeois",
        ["Pour les particuliers fortunés, les expatriés, les dirigeants et les familles souhaitant structurer durablement leur capital.",
         "Sa force : la sécurité exceptionnelle du cadre réglementaire luxembourgeois, parmi les plus protecteurs d’Europe."],
        ["Triangle de sécurité : actifs ségrégués, contrôle du Commissariat aux Assurances","Super-privilège : le souscripteur, créancier prioritaire","Liberté d’investissement supérieure aux contrats traditionnels"],
        [("cards","Une ingénierie financière sophistiquée",[
            ("chart","Fonds internes dédiés (FID)","Une gestion personnalisée et confidentielle."),
            ("puzzle","Fonds d’assurance spécialisés (FAS)","Sur-mesure selon le montant investi."),
            ("compass","Gestion sous mandat internationale","En lien avec banques privées et family offices."),
            ("treasury","Univers d’actifs étendu","Devises multiples, private equity, obligations, structurés."),
         ]),
         ("checklist","Mobilité internationale & transmission",
            ["Portabilité patrimoniale pour les expatriés","Adaptation aux environnements fiscaux selon la résidence","Clause bénéficiaire structurée et gestion transfrontalière","Approche civile, fiscale et familiale sur-mesure"]),
         ("text","Notre accompagnement",
            ["Nous sélectionnons les solutions luxembourgeoises adaptées à votre niveau patrimonial, votre résidence fiscale et vos exigences de sécurité — architecture du contrat, partenaires, supports et intégration dans votre stratégie globale."]),
        ],
        [("Produits structurés","produits-structures.html"),("S’expatrier à l’étranger","expatriation.html"),("Accès à notre Family Office","family-office.html")],
        "Le contrat d’assurance-vie luxembourgeois : triangle de sécurité, super-privilège, FID/FAS et portabilité internationale.",
        quote="Bien plus qu’un contrat d’assurance-vie : une véritable plateforme patrimoniale internationale.")

    # 4 — Solutions retraite
    fin_page("solutions-retraite.html","Solutions retraite","Des revenus complémentaires futurs",
        "Construire progressivement des revenus complémentaires adaptés à votre futur niveau de vie, au-delà de la seule pension obligatoire.",
        "assets/img/retraite.jpg","Solutions retraite",
        ["L’objectif : transformer votre capacité d’épargne actuelle en ressources futures, pour maintenir votre confort de vie et votre indépendance financière.",
         "Chaque stratégie est pensée selon votre situation professionnelle, votre fiscalité, votre horizon de départ et votre patrimoine existant."],
        ["PER : cadre fiscal attractif, déduction possible des versements","Gestion pilotée ou libre, sortie en capital ou en rente","Adapté aux salariés, indépendants, professions libérales et dirigeants"],
        [("cards","Diversifier les sources de revenus futurs",[
            ("shield","Assurance-vie & capitalisation","Souplesse et capitalisation de long terme."),
            ("building","Immobilier & revenus fonciers","Des revenus tangibles et réguliers."),
            ("treasury","Sociétés patrimoniales","Articuler rémunération, fiscalité et patrimoine."),
            ("chart","Portefeuilles de rendement","Dividendes, coupons et allocation dédiée."),
         ]),
         ("text","Notre accompagnement",
            ["Estimation de vos revenus à la retraite, évaluation des besoins, identification des écarts potentiels, sélection des solutions et mise en place d’une stratégie évolutive — intégrant les dimensions fiscales, successorales et patrimoniales."]),
        ],
        [("Préparer votre retraite","preparer-retraite.html"),("Contrats d’assurance-vie","assurance-vie.html"),("Placements immobiliers","placements-immobiliers.html")],
        "Solutions retraite : PER et stratégies complémentaires pour constituer des revenus futurs dans un cadre fiscal optimisé.")

    # 5 — Comptes-titres
    fin_page("comptes-titres.html","Comptes-titres","La liberté patrimoniale",
        "Accéder à l’ensemble des marchés financiers, sans contrainte géographique ni sectorielle, pour piloter un portefeuille totalement personnalisé.",
        "assets/img/paris-colonnade.jpg","Compte-titres",
        ["Le compte-titres ordinaire (CTO) offre une grande souplesse et un accès très large : actions françaises et internationales, obligations, ETF, OPCVM, produits structurés, titres non cotés.",
         "Idéal pour accéder aux marchés hors Europe, investir sur des thématiques précises ou bénéficier d’une flexibilité totale dans vos arbitrages."],
        ["Accès élargi à toutes les classes d’actifs","Gestion active : achats, ventes et arbitrages en continu","Complément naturel de l’assurance-vie, du PEA ou de la capitalisation"],
        [("tags","Accéder à tous les marchés et thématiques",
            ["Actions FR & internationales","Obligations","ETF & trackers","OPCVM","Produits structurés","Technologie","Santé","Énergie","Intelligence artificielle","Infrastructures"]),
         ("text","Notre accompagnement",
            ["Nous construisons un portefeuille cohérent : allocation stratégique, sélection des supports, suivi régulier et ajustements selon l’évolution des marchés et de vos objectifs.",
             "Sa fiscalité, sans avantage propre à d’autres enveloppes, reste compatible avec des stratégies d’optimisation selon votre situation et la durée de détention."]),
        ],
        [("PEA","pea.html"),("Produits structurés","produits-structures.html"),("Mandats de gestion","mandats-gestion.html")],
        "Le compte-titres (CTO) : accès illimité aux marchés mondiaux et gestion active d’un portefeuille sur-mesure.")

    # 6 — PEA
    fin_page("pea.html","PEA — Plan d’Épargne en Actions","Performance et fiscalité",
        "Investir sur les marchés actions européens dans un cadre fiscal particulièrement attractif, pensé pour le long terme.",
        "assets/img/paris-courtyard.jpg","PEA",
        ["Construire progressivement un portefeuille orienté croissance : entreprises européennes cotées, fonds éligibles, ETF, OPCVM ou stratégies sectorielles.",
         "Une enveloppe idéale pour capitaliser dans la durée tout en maîtrisant votre cadre fiscal."],
        ["Fiscalité avantageuse après une certaine durée de détention","Souplesse : titres en direct, gestion pilotée, ETF, secteurs","Un moteur de performance, complément des enveloppes défensives"],
        [("tags","Une discipline patrimoniale",
            ["Horizon long","Exposition aux entreprises","Constitution progressive","Réinvestissement des gains"]),
         ("text","Notre accompagnement",
            ["Nous définissons une stratégie adaptée à votre profil de risque et à votre horizon, sélectionnons les supports pertinents et ajustons le portefeuille au fil des évolutions de marché."]),
        ],
        [("PEA-PME / ETI","pea-pme.html"),("Comptes-titres","comptes-titres.html"),("Épargner & Investir","epargner-investir.html")],
        "Le PEA : investir en actions européennes sur le long terme avec une fiscalité avantageuse.")

    # 7 — PEA-PME
    fin_page("pea-pme.html","PEA-PME / ETI","Financer la croissance",
        "Orienter votre épargne vers les PME et ETI européennes à fort potentiel, dans le cadre fiscal avantageux du PEA.",
        "assets/img/paris-colonnade.jpg","PEA-PME / ETI",
        ["Diversifier au-delà des grandes capitalisations en accédant à des entreprises plus agiles, innovantes et exposées à de fortes opportunités de développement.",
         "Une poche de diversification offensive, à fort potentiel mais plus volatile, qui exige une sélection rigoureuse et un horizon long."],
        ["Exposition à un segment de marché dynamique","Actions de PME/ETI cotées ou fonds spécialisés (FCPI, FIP)","Fiscalité attractive à long terme (sous conditions)"],
        [("cards","Plusieurs approches",[
            ("chart","Investissement direct","Sélection d’actions de PME et ETI cotées."),
            ("puzzle","Gestion collective","Fonds spécialisés et véhicules éligibles."),
            ("compass","Allocation spécialisée","Une poche calibrée selon votre profil."),
         ]),
         ("text","Au-delà du rendement",
            ["Investir via un PEA-PME, c’est aussi participer au financement de l’économie réelle européenne : innovation, entrepreneuriat et entreprises créatrices de valeur."]),
        ],
        [("PEA","pea.html"),("Private Equity","private-equity.html"),("Épargner & Investir","epargner-investir.html")],
        "Le PEA-PME / ETI : financer les PME et ETI à fort potentiel avec la fiscalité avantageuse du PEA.")

    # 8 — Mandats de gestion
    fin_page("mandats-gestion.html","Mandats de gestion","La gestion déléguée",
        "Déléguer la gestion de votre capital à des professionnels expérimentés, tout en conservant une stratégie alignée sur vos objectifs.",
        "assets/img/paris-courtyard.jpg","Mandat de gestion",
        ["Bénéficier d’une gestion structurée et réactive, sans suivre quotidiennement les marchés ni arbitrer vous-même vos investissements.",
         "Tout part d’un cadre précis : objectifs, horizon, sensibilité au risque, besoins de liquidité et contraintes fiscales."],
        ["Réactivité : arbitrages et réallocations en continu","Accès à des expertises et classes d’actifs spécialisées","Applicable sur assurance-vie, luxembourgeois, comptes-titres, capitalisation"],
        [("cards","Plusieurs profils de gestion",[
            ("lock","Prudente","Priorité à la préservation du capital."),
            ("scale","Équilibrée","Un compromis entre sécurité et performance."),
            ("growth","Dynamique","Orientation croissance, exposition actions plus forte."),
            ("compass","Sur-mesure","Allocation personnalisée et classes d’actifs avancées."),
         ]),
         ("text","Notre accompagnement",
            ["Nous sélectionnons avec rigueur les sociétés de gestion et banques privées selon leur philosophie, leur historique et leur maîtrise du risque, puis assurons un suivi régulier de la cohérence avec vos objectifs."]),
        ],
        [("Comptes-titres","comptes-titres.html"),("Contrats luxembourgeois","contrat-luxembourgeois.html"),("Produits structurés","produits-structures.html")],
        "Les mandats de gestion : déléguer le pilotage de vos actifs à des professionnels, selon un cadre aligné sur vos objectifs.")

    # 9 — Produits structurés
    fin_page("produits-structures.html","Produits structurés","Une ingénierie sur-mesure",
        "Des instruments de haute ingénierie financière, conçus pour un objectif patrimonial précis et un scénario de marché identifié.",
        "assets/img/paris-courtyard.jpg","Produits structurés",
        ["Ils combinent plusieurs briques — obligations, dérivés, options, mécanismes de protection — pour aller au-delà d’un investissement traditionnel et viser la performance dans différents contextes de marché.",
         "Selon leur construction : génération de revenus conditionnels, protection partielle ou totale du capital à échéance, ou optimisation du couple rendement / risque."],
        ["Architecture totalement ouverte et indépendante","Aucune salle de marché ni plateforme imposée","Mise en concurrence des émetteurs sur chaque opération"],
        [("tags","Les salles de marché que nous mettons en concurrence",
            ["Société Générale","BNP Paribas","Natixis","Morgan Stanley","Goldman Sachs","Citi","UBS","Barclays","Vontobel","BBVA"]),
         ("checklist","Nous comparons les émetteurs sur",
            ["Niveau de coupon / rendement","Distance à la barrière de protection","Qualité de crédit de l’émetteur","Conditions de remboursement anticipé (autocall)","Univers sous-jacent (indices, actions, paniers)","Liquidité secondaire et valorisation","Profondeur des mécanismes de protection","Documentation EMTN / Prospectus"]),
         ("cards","Les formats les plus utilisés",[
            ("chart","Autocall / Phoenix","Coupons conditionnels et remboursement anticipé."),
            ("doc","Athena","Mécanisme de mémoire de coupons."),
            ("scale","Reverse Convertible","Rendement et exposition maîtrisée au sous-jacent."),
            ("shield","Capital protégé","Participation à la hausse avec sécurisation à échéance."),
            ("puzzle","Indices décrémentés","Optimisation technique du pricing."),
            ("compass","Sur-mesure","Structures dédiées selon votre cahier des charges."),
         ]),
         ("tags","Une analyse institutionnelle",
            ["Corrélation des sous-jacents","Volatilité implicite & skew","Gap risk","Risque de call prématuré","Exposition dividendes","Fiscalité de l’enveloppe","Sensibilité aux taux"]),
        ],
        [("Contrats luxembourgeois","contrat-luxembourgeois.html"),("Comptes-titres","comptes-titres.html"),("Trésorerie d’entreprise","tresorerie-entreprise.html")],
        "Produits structurés sur-mesure : architecture ouverte, mise en concurrence des salles de marché et ingénierie rendement / protection.",
        quote="Nous intervenons comme architectes de solutions, et non comme distributeurs standardisés.")

TRESO_SOLUTIONS = [
    ("compass","Audit & structuration","Analyser, segmenter et bâtir votre politique de trésorerie.","treso-audit.html"),
    ("clock","Comptes à terme & court terme","Sécuriser et rémunérer vos excédents, avec visibilité.","comptes-a-terme.html"),
    ("coins","Capitalisation personnes morales","Capitaliser via une holding ou société, sur le moyen/long terme.","capitalisation-personne-morale.html"),
    ("globe","Contrats luxembourgeois dédiés","Gestion institutionnelle et sécurité renforcée des réserves.","luxembourgeois-tresorerie.html"),
    ("chart","Allocation obligataire & taux","Une réserve de rendement structurée et pilotée.","obligataire-taux.html"),
    ("doc","Produits structurés de trésorerie","Rendement calibré, en architecture ouverte.","structures-tresorerie.html"),
    ("scale","Mandats de gestion","Une direction financière externalisée pour vos liquidités.","mandats-tresorerie.html"),
    ("treasury","Holdings & réserves stratégiques","Structurer et gouverner les capitaux du groupe.","holdings-reserves.html"),
]

def build_tresorerie():
    body = page_hero("Trésorerie d’entreprise",
        "La trésorerie ne se limite plus à conserver des liquidités : elle devient un véritable levier de performance, de sécurisation et d’optimisation financière.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Trésorerie d’entreprise",None)])
    body += intro("Dynamiser","Faire travailler votre trésorerie excédentaire",
        "Excédents, réserves stratégiques, holdings patrimoniales ou besoins de diversification : chaque situation appelle une approche structurée, en toute indépendance.",
        ["Nous accompagnons entreprises, dirigeants et holdings avec une sélection rigoureuse des meilleures solutions : placements court terme, capitalisation, contrats luxembourgeois, produits de taux, produits structurés et mandats de gestion.",
         "Chaque poche de trésorerie est segmentée par horizon, puis associée à la solution la plus adaptée — sécurité, rendement et disponibilité maîtrisés."],
        "assets/img/paris-courtyard.jpg","Trésorerie d’entreprise", rev=True)
    body += section('<div class="quote" data-reveal><p>« Transformer votre trésorerie en un outil stratégique au service de la solidité financière et du développement de votre entreprise. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">Nos solutions de trésorerie</p><h2 class="title-lg">De l’audit à la structuration patrimoniale</h2><hr class="rule">'
        '<p class="lede">Huit expertises complémentaires, articulées au sein d’une politique de trésorerie cohérente.</p></div>'
        '<div class="grid grid-3" style="margin-top:54px">' + tiles(TRESO_SOLUTIONS) + '</div>', cls="section band-cream")
    body += cta_band("Optimisons la trésorerie de votre société","Un diagnostic de trésorerie révèle souvent un potentiel de rendement dormant. Échangeons à ce sujet en toute confidentialité.")
    page("tresorerie-entreprise.html","Trésorerie d’entreprise","Audit, comptes à terme, capitalisation, contrats luxembourgeois, obligataire, produits structurés, mandats de gestion et structuration de holdings.", body)

def build_tresorerie_pages():
    parent = ("Trésorerie d’entreprise","tresorerie-entreprise.html")

    sub_page("treso-audit.html","Audit & structuration de trésorerie","De la trésorerie comptable à la trésorerie pilotée",
        "La première étape : analyser votre situation financière, votre organisation capitalistique et vos objectifs, avant toute mise en place de solutions.",
        "assets/img/mansion.jpg","Audit de trésorerie",
        ["Nous transformons une vision purement comptable de la trésorerie en une approche stratégique, structurée et pilotée.",
         "Cet audit est le socle de toute stratégie performante : passer d’une trésorerie passive à une trésorerie optimisée et intégrée à la stratégie financière de l’entreprise."],
        ["Cartographie des flux et du BFR","Segmentation en poches stratégiques","Une politique de trésorerie sur-mesure"],
        [("checklist","Les dimensions analysées",
            ["Structure des flux (saisonnalité, cycles, BFR)","Répartition des liquidités","Horizon de placement réel","Contraintes juridiques et fiscales (IS, holding, SCI)","Sensibilité au risque","Risque de contrepartie bancaire","Concentration des dépôts","Rendement réel après fiscalité"]),
         ("cards","Segmenter la trésorerie en poches",[
            ("clock","Trésorerie opérationnelle","Sécurité maximale et disponibilité immédiate."),
            ("lock","Réserve de sécurité","Stabilité, rendement prudent et flexibilité."),
            ("growth","Trésorerie excédentaire","Optimisation du rendement sur un horizon identifié."),
            ("treasury","Réserves stratégiques","Capitalisation long terme, croissance, transmission."),
         ]),
         ("checklist","Votre politique de trésorerie définit",
            ["Les niveaux de liquidité à conserver","Les horizons de placement par poche","Les seuils de sécurité et de diversification","Les supports financiers adaptés","Les scénarios de stress ou besoins exceptionnels","Les arbitrages sécurité / rendement / disponibilité"]),
        ],
        [("Comptes à terme","comptes-a-terme.html"),("Holdings & réserves stratégiques","holdings-reserves.html"),("Mandats de gestion","mandats-tresorerie.html")],
        "Audit et structuration de trésorerie : cartographie des flux, segmentation en poches et politique de trésorerie sur-mesure.", parent)

    sub_page("comptes-a-terme.html","Comptes à terme & placements court terme","Le premier niveau d’optimisation",
        "Sécuriser les capitaux disponibles tout en améliorant leur rendement par rapport à une trésorerie dormante laissée sur des comptes courants.",
        "assets/img/paris-colonnade.jpg","Comptes à terme",
        ["Les comptes à terme (CAT) placent des fonds sur une durée définie, à un taux fixé dès l’origine : une lisibilité parfaite sur le rendement, les échéances et la disponibilité future.",
         "Idéal pour valoriser des excédents temporaires sans compromettre la sécurité du capital ni la visibilité d’exploitation."],
        ["Taux garanti et visibilité totale","Disponibilité calibrée sur vos besoins","Mise en concurrence multi-établissements"],
        [("cards","Plusieurs approches",[
            ("clock","CAT classiques","Sécurité et taux garantis sur une période définie."),
            ("chart","CAT échelonnés","Plusieurs maturités pour lisser disponibilité et rendement."),
            ("treasury","Dépôts à préavis / monétaire","Souplesse renforcée et disponibilité partielle."),
            ("puzzle","Fonds monétaires institutionnels","Diversification et rendement prudent."),
         ]),
         ("text","La stratégie de « laddering »",
            ["Répartir les capitaux sur plusieurs horizons (trésorerie en échelle) permet d’éviter l’immobilisation excessive tout en maximisant le rendement moyen : une poche mobilisable, une réserve court terme et une poche optimisée sur des échéances plus longues."]),
         ("checklist","Nos critères de sélection",
            ["Rémunération brute et nette","Solidité de l’établissement dépositaire","Conditions de sortie anticipée","Risque de concentration bancaire","Disponibilité réelle des capitaux","Fiscalité applicable à la structure"]),
        ],
        [("Audit & structuration","treso-audit.html"),("Allocation obligataire & taux","obligataire-taux.html"),("Capitalisation personnes morales","capitalisation-personne-morale.html")],
        "Comptes à terme et placements court terme : sécurité, visibilité et rendement optimisé avec une stratégie de laddering.", parent)

    sub_page("capitalisation-personne-morale.html","Contrats de capitalisation (personnes morales)","Un outil d’ingénierie de bilan",
        "Valoriser une trésorerie excédentaire dans une logique de moyen ou long terme, au-delà des solutions purement bancaires de court terme.",
        "assets/img/mansion.jpg","Contrat de capitalisation pour personne morale",
        ["Adapté aux entreprises, holdings patrimoniales et sociétés civiles — notamment soumises à l’IS —, il inscrit la trésorerie dans une stratégie de capitalisation structurée.",
         "Accès à une architecture étendue : fonds en euros (selon disponibilité), supports obligataires, fonds diversifiés, unités de compte, ETF, produits structurés ou gestion sous mandat."],
        ["Détention par une société ou une holding","Allocation sur-mesure selon horizon et risque","Un outil de gestion de réserves piloté"],
        [("checklist","Construire l’allocation selon",
            ["L’horizon réel de disponibilité","L’objectif de rendement","La tolérance au risque","Les besoins futurs de distribution ou d’investissement","La sensibilité à la volatilité","Les contraintes comptables et fiscales"]),
         ("text","Notre accompagnement",
            ["Analyse de l’éligibilité de la structure, sélection de l’assureur ou de la plateforme, construction de l’allocation, arbitrage entre rendement, liquidité et stabilité bilancielle, et intégration patrimoniale dans la stratégie du dirigeant ou de la holding."]),
         ("checklist","Des critères déterminants",
            ["Traitement fiscal et comptable","Volatilité potentielle du bilan","Qualité des supports disponibles","Risque de contrepartie","Liquidité du contrat","Cohérence distribution / transmission"]),
        ],
        [("Contrats de capitalisation (particuliers)","contrat-capitalisation.html"),("Holdings & réserves stratégiques","holdings-reserves.html"),("Contrats luxembourgeois dédiés","luxembourgeois-tresorerie.html")],
        "Contrat de capitalisation pour personnes morales : un outil d’ingénierie de bilan pour valoriser la trésorerie d’une holding ou société.", parent)

    sub_page("luxembourgeois-tresorerie.html","Contrats luxembourgeois dédiés","La gestion institutionnelle de vos capitaux",
        "Une plateforme d’architecture financière internationale pour holdings et sociétés disposant de réserves importantes.",
        "assets/img/img-luxembourg.svg","Contrat luxembourgeois de trésorerie",
        ["Au-delà du rendement : protection bilancielle, diversification des contreparties et sécurisation juridique grâce au Triangle de Sécurité luxembourgeois.",
         "Pour les structures ayant dépassé les logiques bancaires traditionnelles et recherchant une solution plus sophistiquée qu’un compte à terme ou un contrat domestique."],
        ["Triangle de sécurité et contrôle du Commissariat aux Assurances","Architecture financière étendue (FID, FAS, structurés…)","Gestion institutionnelle de capitaux importants"],
        [("cards","Une ingénierie étendue",[
            ("chart","Fonds internes dédiés (FID)","Gestion personnalisée des réserves."),
            ("puzzle","Fonds d’assurance spécialisés (FAS)","Sur-mesure selon le montant investi."),
            ("compass","Gestion sous mandat internationale","Banques privées et gérants spécialisés."),
            ("globe","Multidevises & private assets","Diversification internationale avancée."),
         ]),
         ("checklist","Notre intervention",
            ["Analyse de la structure juridique et fiscale","Sélection de la compagnie luxembourgeoise","Choix de la banque dépositaire","Structuration du véhicule financier","Définition des mandats ou allocations dédiés","Intégration dans la stratégie globale"]),
        ],
        [("Contrats luxembourgeois (particuliers)","contrat-luxembourgeois.html"),("Produits structurés de trésorerie","structures-tresorerie.html"),("Accès à notre Family Office","family-office.html")],
        "Contrat luxembourgeois dédié à la trésorerie : sécurité institutionnelle, FID/FAS et gestion de capitaux importants.", parent,
        quote="Transformer une trésorerie significative en réserve stratégique sécurisée, diversifiée et intégrée à une vision de long terme.")

    sub_page("obligataire-taux.html","Allocation obligataire & produits de taux","Une réserve de rendement stratégique",
        "Rechercher un rendement supérieur au monétaire tout en conservant visibilité, hiérarchisation du risque et gestion des échéances.",
        "assets/img/paris-courtyard.jpg","Allocation obligataire",
        ["Transformer une trésorerie excédentaire en portefeuille de rendement structuré, cohérent avec vos besoins de liquidité, votre tolérance au risque et vos contraintes bilancielles.",
         "La performance obligataire ne dépend pas du seul coupon : elle exige une analyse rigoureuse du crédit, de la duration et de la courbe des taux."],
        ["Univers large : souverain, IG, fonds datés, monétaire amélioré","Segmentation par horizon (court / moyen / long)","Architecture ouverte : direct, fonds ou solutions institutionnelles"],
        [("tags","Un univers de taux complet",
            ["Obligations souveraines","Investment grade","Fonds obligataires datés","Taux fixe ou variable","Monétaire amélioré","Crédit court terme","Subordonnées / hybrides","ETF obligataires","Multi-devises"]),
         ("checklist","Les facteurs analysés",
            ["Duration / sensibilité aux taux","Risque de crédit (notation, spread)","Courbe des taux","Liquidité secondaire","Rendement actuariel réel","Risque de réinvestissement","Risque de change","Fiscalité et traitement comptable"]),
         ("text","Le « ladder » obligataire",
            ["Répartir les maturités permet de lisser le risque de taux, de sécuriser des échéances progressives et d’optimiser le rendement moyen — un outil aussi tactique selon l’évolution des politiques monétaires."]),
        ],
        [("Comptes à terme","comptes-a-terme.html"),("Produits structurés de trésorerie","structures-tresorerie.html"),("Mandats de gestion","mandats-tresorerie.html")],
        "Allocation obligataire et produits de taux : une réserve de rendement structurée et pilotée pour la trésorerie d’entreprise.", parent)

    sub_page("structures-tresorerie.html","Produits structurés de trésorerie","Le rendement calibré sur-mesure",
        "Optimiser le rendement de capitaux disponibles avec un niveau de risque défini en amont, sans basculer dans une gestion actions classique.",
        "assets/img/mansion.jpg","Produits structurés de trésorerie",
        ["Combiner obligations, options et mécanismes de protection pour créer un profil rendement / risque ciblé selon un scénario de marché.",
         "Architecture totalement ouverte : aucune salle de marché imposée, une mise en concurrence institutionnelle des émetteurs."],
        ["Rendement conditionnel ou capital partiellement protégé","Sélection libre des meilleures salles de marché","Une lecture institutionnelle des risques"],
        [("tags","Les salles que nous mettons en concurrence",
            ["Société Générale","BNP Paribas","Natixis","Morgan Stanley","Goldman Sachs","Citi","UBS","Barclays","Vontobel","BBVA"]),
         ("cards","Formats adaptés à la trésorerie",[
            ("chart","Phoenix / Autocall défensifs","Coupons conditionnels et rappel anticipé."),
            ("shield","Capital partiellement protégé","Rendement avec sécurisation à échéance."),
            ("doc","Indices larges ou décrémentés","Optimisation technique du pricing."),
            ("compass","Portage sur sous-jacents robustes","Solutions multi-barrières sur-mesure."),
         ]),
         ("checklist","Les risques que nous analysons",
            ["Risque de marché","Risque de crédit émetteur","Risque de liquidité","Gap risk","Risque de rappel anticipé","Corrélation des sous-jacents","Volatilité implicite","Sensibilité aux taux"]),
        ],
        [("Produits structurés (placements)","produits-structures.html"),("Allocation obligataire & taux","obligataire-taux.html"),("Contrats luxembourgeois dédiés","luxembourgeois-tresorerie.html")],
        "Produits structurés de trésorerie : rendement calibré, architecture ouverte et mise en concurrence institutionnelle des salles de marché.", parent,
        quote="Transformer une trésorerie importante en une poche de rendement pilotée, indépendante et stratégiquement calibrée.")

    sub_page("mandats-tresorerie.html","Mandats de gestion de trésorerie","Une direction financière externalisée",
        "Déléguer le pilotage de vos liquidités à des professionnels spécialisés, dans une stratégie formalisée et alignée sur vos contraintes.",
        "assets/img/paris-courtyard.jpg","Mandat de gestion de trésorerie",
        ["Transformer la trésorerie en une poche financière activement gérée, avec une logique comparable à celle d’une gestion institutionnelle.",
         "Tout part d’un cahier des charges rigoureux, puis d’une allocation dynamique pilotée selon des objectifs précis."],
        ["Réactivité : duration, courbe, sécurisation tactique","Architecture ouverte : gérants sélectionnés librement","Reporting et gouvernance dédiés"],
        [("checklist","Le cahier des charges",
            ["Niveau de liquidité minimale à préserver","Horizon de placement par segment","Objectif de rendement cible","Tolérance à la volatilité","Contraintes bilancielles et comptables","Sensibilité au risque de crédit","Gouvernance et reporting souhaités"]),
         ("cards","Plusieurs profils de gestion",[
            ("lock","Prudent","Sécurité, liquidité et préservation du capital."),
            ("scale","Rendement","Optimisation modérée via taux, crédit ou produits calibrés."),
            ("puzzle","Diversifié","Multi-supports : obligataire, structuré, international."),
            ("compass","Sur-mesure","Politique dédiée aux réserves stratégiques importantes."),
         ]),
         ("tags","Déployable via",
            ["Comptes-titres personnes morales","Contrats de capitalisation","Contrats luxembourgeois","Fonds dédiés","Solutions multi-dépositaires"]),
        ],
        [("Mandats de gestion (placements)","mandats-gestion.html"),("Comptes à terme","comptes-a-terme.html"),("Allocation obligataire & taux","obligataire-taux.html")],
        "Mandats de gestion de trésorerie : une direction financière externalisée, réactive et indépendante pour vos liquidités.", parent)

    sub_page("holdings-reserves.html","Structuration de holdings & réserves stratégiques","La holding, centre de gouvernance financière",
        "Organiser globalement — juridiquement, financièrement et patrimonialement — les capitaux de l’entreprise ou du groupe : protection, rendement, transmission.",
        "assets/img/mansion.jpg","Structuration de holdings et réserves",
        ["Au-delà du placement d’excédents : centraliser les réserves, organiser les flux, piloter les investissements et préparer les grandes étapes de développement ou de transmission.",
         "Une approche de chef d’entreprise patrimonial, où la trésorerie devient un actif structuré et orienté vers des objectifs supérieurs : croissance, stabilité, protection et transmission."],
        ["Centralisation et sécurisation des réserves","Optimisation de la remontée de dividendes","Préparation de croissance externe et de transmission"],
        [("cards","Segmenter les capitaux par fonction",[
            ("clock","Réserves d’exploitation","Sécurité et disponibilité immédiate."),
            ("growth","Réserves de développement","Acquisitions, investissements, croissance."),
            ("treasury","Réserves patrimoniales","Capitalisation et diversification."),
            ("concierge","Réserves de transmission","Organisation familiale ou successorale."),
         ]),
         ("checklist","Les dimensions intégrées",
            ["Organisation juridique et capitalistique","Fiscalité IS / intégration / remontée de flux","Répartition liquidité / capitalisation / diversification","Choix des enveloppes financières","Sécurisation des réserves stratégiques","Gouvernance de long terme"]),
         ("tags","Les briques mobilisées",
            ["Capitalisation personnes morales","Contrats luxembourgeois","Allocation obligataire","Produits structurés","Holdings animatrices ou passives","Sociétés civiles patrimoniales"]),
        ],
        [("Structuration juridique et fiscale","structuration-juridique.html"),("Capitalisation personnes morales","capitalisation-personne-morale.html"),("Céder ou transmettre","ceder-transmettre.html")],
        "Structuration patrimoniale de holdings et réserves stratégiques : centraliser, sécuriser et organiser les capitaux du groupe.", parent,
        quote="Transformer une entreprise ou une holding en véritable outil de capitalisation stratégique.")

PE_SOLUTIONS = [
    ("puzzle","Fonds de Private Equity","Accéder, via des équipes spécialisées, aux entreprises non cotées à fort potentiel.","fonds-private-equity.html"),
    ("compass","Club deals & co-investissements","Des opérations ciblées à forte conviction, aux côtés de professionnels.","club-deals-coinvestissement.html"),
    ("building","Dette privée, infra & actifs réels","Rendement, visibilité et exposition directe à l’économie réelle.","dette-privee-actifs-reels.html"),
]

def build_private_equity():
    body = page_hero("Solutions non cotées & Private Equity",
        "Accéder à une dimension patrimoniale complémentaire des marchés cotés, en finançant directement ou indirectement des entreprises non cotées, des projets de croissance et des opérations de transmission.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Solutions non cotées & Private Equity",None)])
    body += intro("Notre approche","La valeur se crée aussi hors des marchés cotés",
        "Longtemps réservé aux institutionnels et aux grandes fortunes, le non coté est devenu un levier majeur de diversification : performance de long terme, décorrélation partielle et exposition à l’économie réelle.",
        ["Capital-développement, capital-transmission, dette privée, club deals, co-investissements ou fonds spécialisés : une large palette, chacune répondant à des objectifs distincts.",
         "Notre sélection est indépendante et rigoureuse : qualité des équipes de gestion, structure des opérations, gouvernance, maîtrise du risque et cohérence avec votre stratégie patrimoniale."],
        "assets/img/paris-colonnade.jpg","Capital-investissement", rev=True)
    body += section('<div class="quote" data-reveal><p>« Intégrer le non coté comme une véritable classe d’actifs stratégique, au service d’une gestion de patrimoine sophistiquée, diversifiée et orientée vers le long terme. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">Nos solutions non cotées</p><h2 class="title-lg">Trois grandes familles d’investissement privé</h2><hr class="rule">'
        '<p class="lede">Des fonds diversifiés aux opérations directes les plus sélectives, jusqu’aux actifs réels.</p></div>'
        '<div class="grid grid-3" style="margin-top:54px">' + tiles(PE_SOLUTIONS) + '</div>', cls="section band-cream")
    body += cta_band("Accédez au private equity","Le non coté s’adresse à des investisseurs avertis. Vérifions ensemble sa pertinence et son dosage dans votre allocation.")
    page("private-equity.html","Solutions non cotées & Private Equity","Fonds de private equity, club deals et co-investissements, dette privée, infrastructures et actifs réels — en architecture ouverte.", body)

def build_private_equity_pages():
    parent = ("Solutions non cotées & Private Equity","private-equity.html")

    sub_page("fonds-private-equity.html","Fonds de Private Equity & Capital-Investissement","Le socle du non coté",
        "Accéder, via des équipes de gestion spécialisées, à des entreprises non cotées sélectionnées pour leur potentiel de croissance et de création de valeur.",
        "assets/img/mansion.jpg","Fonds de private equity",
        ["Il ne s’agit pas seulement d’investir dans des sociétés privées, mais de participer à des stratégies professionnelles de développement d’entreprise, avec un pilotage actif des participations.",
         "Bien sélectionnés, ces fonds sont des briques de diversification sophistiquée : exposition à la croissance privée, création de valeur entrepreneuriale et décorrélation partielle des marchés cotés."],
        ["Diversification sur plusieurs participations","Gestion institutionnelle et accès privilégié","Exposition à l’économie réelle"],
        [("cards","Les segments du private equity",[
            ("growth","Venture Capital","Entreprises innovantes en lancement ou hypercroissance."),
            ("chart","Growth Capital","Accélérer la croissance d’entreprises déjà établies."),
            ("scale","Buyout / LBO","Acquisition ou transmission d’entreprises matures."),
            ("compass","Fonds secondaires","Portefeuilles constitués : durée et diversification optimisées."),
         ]),
         ("checklist","Comment nous sélectionnons les maisons de gestion",
            ["Historique de performance (track record)","Qualité de l’équipe de gestion","Discipline d’investissement","Gouvernance et alignement d’intérêts","Structure de frais","Stratégie sectorielle et géographique","Qualité du sourcing","Maîtrise du risque et des cycles"]),
         ("tags","Des spécificités techniques à intégrer",
            ["Horizon long (7 à 10 ans +)","Illiquidité relative","Appels de capitaux progressifs","Distribution différée","Valorisation non quotidienne"]),
        ],
        [("Club deals & co-investissements","club-deals-coinvestissement.html"),("Dette privée & actifs réels","dette-privee-actifs-reels.html"),("Épargner & Investir","epargner-investir.html")],
        "Fonds de private equity et capital-investissement : venture, growth, buyout/LBO et secondaires, sélectionnés en architecture ouverte.", parent)

    sub_page("club-deals-coinvestissement.html","Club Deals, Co-investissements & Opportunités directes","La dimension la plus sélective",
        "Accéder à des opportunités ciblées, souvent aux côtés d’investisseurs professionnels, de family offices ou d’équipes de management, avec une participation plus directe à la création de valeur.",
        "assets/img/paris-colonnade.jpg","Club deals et co-investissements",
        ["Plutôt qu’un fonds diversifié, on sélectionne des dossiers précis — entreprise, acquisition, transmission, infrastructure — selon des critères rigoureux et un cahier des charges patrimonial défini.",
         "L’objectif : des opérations à forte conviction, avec une meilleure visibilité sur l’actif, la stratégie de développement et les leviers de création de valeur."],
        ["Sélection ciblée à forte conviction","Visibilité renforcée sur l’actif sous-jacent","Réduction potentielle de certaines couches de frais"],
        [("cards","Les formes d’investissement direct",[
            ("compass","Club Deals","Participation collective autour d’un même actif, pilotée par un sponsor."),
            ("puzzle","Co-investissements","Aux côtés d’un fonds, sur une opération identifiée."),
            ("building","Participation directe","Entrée directe au capital d’une entreprise privée."),
            ("scale","Transactions opportunistes","Carve-out, consolidation, situations spéciales."),
         ]),
         ("checklist","Notre analyse institutionnelle de chaque opération",
            ["Qualité du sponsor ou opérateur","Gouvernance et structure juridique","Pactes d’actionnaires","Alignement d’intérêts","Dette éventuelle et effet de levier","Business model et risques sectoriels","Valorisation d’entrée","Mécanismes de liquidité"]),
         ("tags","La stratégie de sortie, élément central",
            ["Revente industrielle","LBO secondaire","IPO potentielle","Refinancement","Liquidation stratégique"]),
        ],
        [("Fonds de Private Equity","fonds-private-equity.html"),("Dette privée & actifs réels","dette-privee-actifs-reels.html"),("Céder ou transmettre","ceder-transmettre.html")],
        "Club deals, co-investissements et opérations directes : la dimension la plus sélective et sophistiquée du private equity.", parent,
        quote="Nous ne distribuons pas des opérations standardisées : nous sélectionnons les meilleures opportunités selon leur qualité intrinsèque et leur pertinence patrimoniale.")

    sub_page("dette-privee-actifs-reels.html","Dette privée, infrastructures & actifs réels","Rendement et économie réelle",
        "Une composante essentielle du non coté pour les investisseurs recherchant diversification, rendement potentiel et exposition à l’économie productive.",
        "assets/img/paris-courtyard.jpg","Dette privée et actifs réels",
        ["Là où le capital-investissement repose sur la valorisation du capital, ces stratégies sont davantage orientées vers le rendement, la visibilité contractuelle ou la stabilité relative.",
         "Financement d’entreprises, projets d’infrastructure, immobilier spécialisé, énergie ou logistique : un accès à des flux économiques réels, dans une logique de long terme."],
        ["Revenus potentiellement réguliers","Priorité contractuelle sur le capital (dette)","Décorrélation partielle des marchés cotés"],
        [("cards","Trois grandes familles",[
            ("treasury","Dette privée","Senior, unitranche, mezzanine, asset-backed, situations spéciales."),
            ("building","Infrastructures","Énergie, transport, data centers, utilities, infrastructures sociales."),
            ("globe","Actifs réels","Immobilier spécialisé, logistique, santé, foncier, renouvelables."),
         ]),
         ("checklist","Notre méthodologie de sélection",
            ["Qualité du gérant ou sponsor","Solidité juridique de la structure","Profil rendement / risque","Liquidité et sensibilité macroéconomique","Levier financier","Diversification sectorielle","Gouvernance et structure de frais","Robustesse des flux économiques"]),
         ("tags","Pourquoi intégrer cette classe d’actifs",
            ["Diversification avancée","Décorrélation partielle","Économie réelle","Rendement ou stabilité","Structuration long terme","Complémentarité au PE"]),
        ],
        [("Fonds de Private Equity","fonds-private-equity.html"),("Club deals & co-investissements","club-deals-coinvestissement.html"),("Placements immobiliers","placements-immobiliers.html")],
        "Dette privée, infrastructures et actifs réels : rendement, visibilité contractuelle et exposition à l’économie réelle, en complément du private equity.", parent)

IMMO_SOLUTIONS = [
    ("building","SCPI & immobilier géré","Un patrimoine immobilier diversifié, en gestion totalement déléguée.","scpi-immobilier-gere.html"),
    ("compass","Club deals & opérations privées","Des opérations ciblées, aux côtés d’opérateurs spécialisés.","club-deals-immobiliers.html"),
    ("doc","Immobilier en direct clés en main","Détenir des actifs sur-mesure, de A à Z, sans la complexité.","immobilier-direct.html"),
]

def build_immobilier():
    body = page_hero("Solutions de placements immobiliers",
        "L’immobilier demeure l’un des piliers majeurs de la construction patrimoniale : valorisation du capital, revenus potentiels, diversification et structuration de long terme.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Placements immobiliers",None)])
    body += intro("Notre approche","Une classe d’actifs stratégique",
        "L’univers immobilier va bien au-delà de l’acquisition classique : SCPI, club deals, opérations privées, immobilier professionnel ou investissement en direct clés en main.",
        ["Notre approche est en architecture ouverte et totalement indépendante : nous sélectionnons les meilleures solutions selon la qualité des actifs, le rendement potentiel, l’emplacement, la structure juridique et la solidité des opérateurs.",
         "Recherche de rendement, patrimoine tangible, préparation de la retraite, diversification ou transmission : à chaque objectif, sa solution immobilière."],
        "assets/img/mansion.jpg","Patrimoine immobilier", rev=True)
    body += section('<div class="quote" data-reveal><p>« Intégrer l’immobilier comme une véritable classe d’actifs stratégique, capable d’allier performance, résilience, diversification et structuration patrimoniale sur-mesure. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">Nos solutions immobilières</p><h2 class="title-lg">Trois voies vers la pierre</h2><hr class="rule">'
        '<p class="lede">Du collectif piloté aux opérations les plus ciblées, jusqu’à la détention en direct.</p></div>'
        '<div class="grid grid-3" style="margin-top:54px">' + tiles(IMMO_SOLUTIONS) + '</div>', cls="section band-cream")
    body += cta_band("Diversifiez dans l’immobilier","Quel rôle l’immobilier doit-il jouer dans votre patrimoine ? Construisons une stratégie adaptée à vos objectifs.")
    page("placements-immobiliers.html","Placements immobiliers","SCPI et immobilier géré, club deals immobiliers et opérations privées, investissement en direct clés en main — en architecture ouverte.", body)

def build_immobilier_pages():
    parent = ("Placements immobiliers","placements-immobiliers.html")

    sub_page("scpi-immobilier-gere.html","SCPI & immobilier géré","L’immobilier piloté, sans contrainte de gestion",
        "L’un des moyens les plus accessibles et structurés d’intégrer l’immobilier, sans supporter les contraintes de gestion, d’acquisition ou d’administration locative.",
        "assets/img/paris-courtyard.jpg","SCPI et immobilier géré",
        ["Investir indirectement dans un portefeuille diversifié — bureaux, commerces, logistique, santé, résidentiel spécialisé, hôtellerie ou actifs paneuropéens — avec mutualisation des risques et gestion professionnelle.",
         "Transformer l’immobilier en actif patrimonial piloté : revenus complémentaires potentiels, diversification, préparation de la retraite ou structuration de long terme."],
        ["Gestion totalement déléguée","Mutualisation des risques et diversification","Accès à l’immobilier professionnel"],
        [("cards","Plusieurs types de SCPI",[
            ("coins","SCPI de rendement","Orientées vers la distribution potentielle de revenus."),
            ("growth","SCPI de valorisation","Tournées vers la revalorisation du capital."),
            ("globe","SCPI européennes","Diversification géographique renforcée."),
            ("building","SCPI thématiques","Santé, logistique, éducation et secteurs spécialisés."),
         ]),
         ("cards","L’immobilier géré",[
            ("concierge","Résidences services","Une exploitation déléguée et des baux structurés."),
            ("puzzle","Logements étudiants","Une demande structurelle et résiliente."),
            ("shield","Senior living & santé","Des actifs portés par la démographie."),
            ("building","Logistique & spécialisés","Des secteurs au cœur de l’économie réelle."),
         ]),
         ("checklist","Notre grille d’analyse",
            ["Qualité du patrimoine et localisation","Taux d’occupation financier","Diversification locative","Stratégie de la société de gestion","Niveau d’endettement","Liquidité et frais","Résilience sectorielle","Cohérence avec vos objectifs"]),
         ("tags","Plusieurs modes de détention",
            ["Acquisition en direct","Assurance-vie","Contrat luxembourgeois","Démembrement","Société patrimoniale","Financement à crédit"]),
         ("text","Points de vigilance",
            ["Comme tout investissement immobilier : évolution des marchés, sensibilité aux taux, fiscalité, liquidité du marché secondaire et robustesse des locataires restent des paramètres essentiels."]),
        ],
        [("Immobilier en direct clés en main","immobilier-direct.html"),("Club deals immobiliers","club-deals-immobiliers.html"),("Préparer votre retraite","preparer-retraite.html")],
        "SCPI et immobilier géré : un patrimoine immobilier diversifié et piloté, en gestion déléguée et architecture ouverte.", parent)

    sub_page("club-deals-immobiliers.html","Club Deals immobiliers & opérations privées","L’immobilier sélectif et sur-mesure",
        "Accéder à des opportunités spécifiques, rigoureusement sélectionnées, aux côtés d’opérateurs spécialisés — dans une logique de création de valeur directe.",
        "assets/img/paris-colonnade.jpg","Club deals immobiliers",
        ["Plutôt que des solutions mutualisées, on investit dans des actifs ou opérations identifiés : acquisition patrimoniale, restructuration, promotion, marchand de biens, hôtellerie, logistique, résidentiel premium ou stratégies opportunistes.",
         "Des projets à thèse d’investissement précise, avec une meilleure visibilité sur l’actif, sa stratégie de valorisation, son horizon de sortie et ses leviers de création de valeur."],
        ["Sélection ciblée à forte conviction","Exposition directe à des actifs identifiés","Structuration patrimoniale personnalisée"],
        [("cards","Les formes de club deals",[
            ("building","Acquisition groupée","Un actif unique réuni autour de plusieurs investisseurs."),
            ("compass","Opération de transformation","Restructuration et repositionnement d’un actif."),
            ("doc","Financement de promotion","Participation à un projet de développement."),
            ("puzzle","Co-investissement","Sur une stratégie de rendement ou de revalorisation."),
         ]),
         ("checklist","Notre analyse de chaque opération",
            ["Qualité de l’emplacement","Solidité de l’opérateur","Structure juridique","Business plan et financement","Structure de dette et levier","Coûts de travaux","Stratégie de sortie","Alignement d’intérêts"]),
         ("tags","Des points déterminants",
            ["Niveau de levier","Calendrier d’exécution","Risques administratifs / urbanistiques","Scénario de valorisation","Profondeur du marché secondaire","Résistance aux cycles"]),
         ("text","Pour quels investisseurs ?",
            ["Pour ceux qui recherchent une allocation immobilière plus active et sélective, en acceptant un niveau d’analyse supérieur — avec une discipline de diversification face au risque de concentration sur un seul actif."]),
        ],
        [("SCPI & immobilier géré","scpi-immobilier-gere.html"),("Immobilier en direct clés en main","immobilier-direct.html"),("Club deals & co-investissements (PE)","club-deals-coinvestissement.html")],
        "Club deals immobiliers et opérations privées : des opérations ciblées et sophistiquées, sélectionnées avec exigence.", parent,
        quote="Nous ne distribuons pas d’opérations standardisées : nous sélectionnons les meilleures opportunités selon leur qualité intrinsèque et leur cohérence patrimoniale.")

    sub_page("immobilier-direct.html","Investissements immobiliers en direct, clés en main","Votre patrimoine immobilier, de A à Z",
        "Détenir directement des actifs sélectionnés sur-mesure, avec un accompagnement global — du sourcing à la gestion — sans la complexité technique et administrative.",
        "assets/img/hero.jpg","Immobilier en direct clés en main",
        ["Contrairement aux véhicules collectifs, le direct permet une personnalisation totale : type de bien, localisation, rendement, fiscalité, horizon de détention, transmission ou financement.",
         "L’objectif n’est pas « d’acheter un bien », mais de structurer une stratégie immobilière cohérente, alignée sur votre situation et votre vision de long terme."],
        ["Maîtrise patrimoniale complète","Effet de levier via le crédit","Personnalisation et contrôle stratégique"],
        [("tags","Des stratégies variées",
            ["Résidentiel patrimonial","Locatif traditionnel","Location meublée","Immeubles de rapport","Coliving","Déficit foncier","Nue-propriété","Marchand de biens patrimonial"]),
         ("checklist","Nous intervenons sur toute la chaîne",
            ["Définition de la stratégie immobilière","Sourcing d’opportunités ciblées","Audit économique et patrimonial","Structuration juridique et fiscale","Optimisation du financement","Coordination acquisition / notaire / banque","Travaux et valorisation","Mise en location et gestion déléguée"]),
         ("checklist","Chaque projet analysé selon",
            ["Emplacement et tension locative","Qualité intrinsèque du bien","Prix d’acquisition","Potentiel de valorisation","Rendement net","Fiscalité et coût global","Financement et travaux","Profondeur du marché et risque local"]),
         ("text","L’intérêt d’une approche clés en main",
            ["Transformer un investissement potentiellement complexe en stratégie structurée, pilotée et optimisée — en évitant la sélection émotionnelle, le mauvais pricing, la sous-estimation des coûts ou une fiscalité mal calibrée."]),
        ],
        [("SCPI & immobilier géré","scpi-immobilier-gere.html"),("Club deals immobiliers","club-deals-immobiliers.html"),("Optimiser votre fiscalité","optimiser-fiscalite.html")],
        "Investissement immobilier en direct clés en main : sourcing, structuration, financement, valorisation et gestion d’actifs sur-mesure.", parent,
        quote="Professionnaliser l’investissement immobilier privé : de l’opportunité émotionnelle à la stratégie pilotée.")

# Notre sélection de SCPI / partenaires (nom, gestionnaire, année, perf 2025 %)
SCPI_SELECTION = [
    ("Corum Eurion","Corum",2020,8.29),("Transitions Europe","Arkéa REIM",2022,7.60),
    ("Corum Origin","Corum",2012,7.22),("Iroko Zen","Iroko",2020,7.14),
    ("Remake Live","Remake Asset Management",2022,7.05),("Osmo Énergie","Mata Capital IM",2024,7.00),
    ("Epsicap Nano","Epsicap REIM",2021,6.91),("Corum XL","Corum",2017,6.48),
    ("Cœur de Régions","Sogenial Immobilier",2018,5.80),("Épargne Pierre","Atland Voisin",2013,5.72),
    ("Vendôme Régions","Norma Capital",2015,5.72),("Néo","Novaxia Investissement",2018,5.50),
    ("Altixia Cadence XII","Altixia REIM",2019,5.15),("Immorente","Sofidy",1988,5.00),
    ("Cristal Rente","Inter Gestion",2011,5.00),("Accimmo Pierre","BNP Paribas REIM",1989,4.77),
    ("Perial O2","Perial AM",2009,4.65),("Kyaneos Pierre","Kyaneos AM",2018,4.35),
    ("Pierval Santé","Euryale AM",2014,4.06),("Primovie","Praemia REIM France",2012,4.04),
    ("GMA Essentialis","Greenman Arth",2022,4.00),("Crédit Mutuel Pierre 1","La Française REM",1973,-1.28),
]

def build_scpi_page():
    def lis(items): return "".join("<li>%s</li>" % x for x in items)
    def head(eyebrow, title, lede=None, center=True):
        c = ' center' if center else ''
        st = ' style="max-width:720px;margin-inline:auto"' if center else ' style="max-width:800px"'
        h = ('<div class="%s"%s data-reveal><p class="eyebrow">%s</p><h2 class="title-lg">%s</h2><hr class="rule">'
             % (c.strip(), st, eyebrow, title))
        if lede: h += '<p class="lede">%s</p>' % lede
        return h + '</div>'
    def cards(items, g="grid-3"):
        return '<div class="grid %s" style="margin-top:40px">%s</div>' % (g, tiles(items))
    def stat(num, lbl):
        return ('<div data-reveal><div class="stat__num" style="color:#fff">%s</div>'
                '<div class="stat__lbl" style="color:rgba(246,242,233,.7)">%s</div></div>' % (num, lbl))
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements immobiliers","placements-immobiliers.html"),("SCPI & immobilier géré",None)]
    body = page_hero("SCPI & immobilier géré",
        "Rendement moyen de 4,72 % en 2024, diversification immobilière sans gestion locative, plusieurs modes d’acquisition aux profils fiscaux distincts : la SCPI reste un pilier des stratégies patrimoniales.",
        crumbs)

    # En bref
    body += section(feature_row("assets/img/paris-courtyard.jpg","SCPI et immobilier géré","En bref",
        "L’immobilier piloté, sans contrainte de gestion",
        ["Investir en SCPI, c’est accéder à un véhicule de gestion collective agréé par l’AMF, qui détient de l’immobilier professionnel sans que vous en assuriez la gestion.",
         "Le choix du mode d’acquisition — comptant, crédit, démembrement ou assurance-vie — pèse autant sur la rentabilité nette que le choix de la SCPI elle-même."],
        rev=True, checklist=["Ticket d’entrée de quelques centaines d’euros","Gestion totalement déléguée","Diversification sur des centaines de baux"]))

    # L'essentiel à retenir
    body += section(head("Synthèse","L’essentiel à retenir", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + lis([
            "Le mode d’acquisition pèse autant que le choix de la SCPI : de 2,4 % net au comptant à un TRI &gt; 4 % en nue-propriété",
            "La TMI oriente l’enveloppe : au-delà de 30 %, démembrement, assurance-vie et SCPI européennes deviennent des leviers majeurs",
            "Le TRI sur 10-15 ans est plus fiable que le taux de distribution annuel",
        ]) + '</ul>'
        '<ul class="checklist">' + lis([
            "Loi de finances 2026 : exonération d’IR sur les plus-values ramenée à 17 ans",
            "La liquidité limitée impose un horizon de 8 à 10 ans minimum",
            "Une allocation calibrée sur la part du patrimoine non nécessaire à court terme",
        ]) + '</ul></div>', cls="section band-cream")

    # Fonctionnement
    body += section(head("Fonctionnement","Le cycle d’investissement", center=False) +
        cards([
            ("doc","1 · Souscription","Auprès de la société de gestion, d’un conseiller, d’une plateforme ou d’une banque."),
            ("building","2 · Déploiement","Acquisition d’immobilier tertiaire : bureaux, commerces, logistique, santé."),
            ("coins","3 · Distribution","Loyers redistribués, généralement chaque trimestre, nets de frais."),
            ("chart","4 · Reporting","Reporting trimestriel et rapport annuel audité."),
        ], "grid-4") +
        '<div class="grid grid-2" style="margin-top:48px;gap:30px 48px" data-reveal>'
        '<div><p class="eyebrow">Deux catégories de frais</p><ul class="checklist" style="margin-top:14px">'
        + lis(["Frais de souscription : 0 à 12 % du montant investi","Frais de gestion : 8 à 12 % des loyers bruts"]) +
        '</ul><p class="muted" style="margin-top:14px">Les SCPI « sans frais d’entrée » appliquent des frais de gestion majorés : comparez la performance nette à 8-10 ans.</p></div>'
        '<div><p class="eyebrow">Capital, liquidité, jouissance</p><ul class="checklist" style="margin-top:14px">'
        + lis(["Capital variable : souscription / retrait à la valeur de part","Capital fixe : marché secondaire par confrontation des ordres","Délai de jouissance de 3 à 6 mois avant les premiers revenus"]) +
        '</ul></div></div>')

    # Types de SCPI
    body += section(head("Typologies","Les types de SCPI",
        "Chaque famille répond à un objectif et à un profil d’investisseur distincts.") +
        cards([
            ("coins","SCPI de rendement","Immobilier tertiaire diversifié, revenus réguliers (TD 4-6 %)."),
            ("scale","SCPI fiscales","Déficit foncier, Denormandie, Malraux : réduction d’impôt (TMI élevée)."),
            ("growth","SCPI de plus-value","Rénovation et repositionnement d’actifs, horizon 10 ans +."),
            ("globe","SCPI européennes","Diversification hors France et fiscalité allégée."),
            ("leaf","SCPI ISR & thématiques","Critères ESG, santé, logistique : performance responsable."),
            ("building","SCPI diversifiées","Plusieurs secteurs et zones pour lisser les cycles."),
        ]), cls="section band-cream")

    # Pourquoi
    body += section(head("Intérêt patrimonial","Pourquoi intégrer des SCPI ?", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + lis(["Exposition à l’immobilier professionnel sans gestion locative","Risque mutualisé sur des centaines de locataires","Accessibilité dès quelques centaines d’euros"]) + '</ul>'
        '<ul class="checklist">' + lis(["Versement programmé pour lisser le point d’entrée","Effet de levier du crédit (intérêts déductibles au réel)","Corrélation modérée aux marchés actions"]) + '</ul></div>')
    body += ('<section class="section--tight band-dark"><div class="container"><div class="stats">'
        + stat("4,72 %","Distribution moyenne 2024") + stat("≈ 4,5 %","Performance annuelle sur 10 ans")
        + stat("1,5 %","Livret A (fév. 2026)") + stat("≈ 2,5 %","Fonds euros (2024)")
        + '</div></div></section>')
    body += section(head("Cas d’usage","Des stratégies concrètes", center=False) +
        cards([
            ("coins","Complément de revenu","100 000 € au comptant ≈ 4 500 € bruts / an, versés trimestriellement."),
            ("retire","Constitution de patrimoine","Nue-propriété sur 15 ans : zéro fiscalité en phase d’accumulation."),
            ("concierge","Transmission","Donation de la nue-propriété aux enfants, usufruit (revenus) conservé."),
            ("treasury","Trésorerie d’entreprise","Usufruit temporaire via SCI à l’IS (15 %), avec amortissement."),
        ], "grid-4"))

    # Modes d'acquisition + fiscalité comparée
    body += section(head("Modes de détention","Acquisition & fiscalité comparée",
        "Comptant, crédit, démembrement ou assurance-vie : un même véhicule, des rentabilités nettes très différentes.") +
        cards([
            ("doc","Au comptant","Simple, mais le moins optimisé : revenus fonciers au barème IR + 17,2 % PS."),
            ("growth","À crédit","Effet de levier et intérêts déductibles au régime réel."),
            ("scale","Nue-propriété temporaire","Décote de 15 à 40 %, aucune fiscalité pendant le démembrement, hors IFI."),
            ("shield","Assurance-vie","Revenus capitalisés, fiscalité au rachat et cadre successoral favorable."),
        ], "grid-4") +
        '<div class="table-wrap" style="margin-top:48px" data-reveal><table class="ptable">'
        '<thead><tr><th>Mode de détention</th><th>Imposition des revenus</th><th>Prélèvements sociaux</th><th>IFI</th><th>Avantage clé</th></tr></thead>'
        '<tbody>'
        '<tr><td>Comptant</td><td>Barème IR (11-45 %)</td><td>17,2 %</td><td>Oui</td><td>Simplicité</td></tr>'
        '<tr><td>Crédit</td><td>Barème IR (intérêts déductibles)</td><td>17,2 %</td><td>Oui (dette déductible)</td><td>Effet de levier + déduction</td></tr>'
        '<tr><td>Nue-propriété temporaire</td><td>Aucune (pas de revenus)</td><td>Aucun</td><td>Non</td><td>Zéro fiscalité + décote</td></tr>'
        '<tr><td>Assurance-vie</td><td>PFU 30 % / 24,7 % (après 8 ans)</td><td>17,2 % (au rachat)</td><td>Oui</td><td>Capitalisation + succession</td></tr>'
        '<tr><td>SCPI européenne</td><td>Crédit d’impôt / taux effectif</td><td>17,2 % (part FR)</td><td>Oui</td><td>Fiscalité allégée</td></tr>'
        '</tbody></table></div>'
        '<p class="muted" style="margin-top:16px;max-width:80ch" data-reveal>Plus-values de cession : régime des particuliers (19 % IR + 17,2 % PS), exonération d’IR à 17 ans depuis la loi de finances 2026, exonération de PS à 30 ans.</p>')

    # Risques
    body += section(head("Vigilance","Risques & points de vigilance", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + lis(["Capital non garanti (corrections de 10-20 % sur certains bureaux en 2023-2024)","Liquidité limitée : files d’attente possibles en décollecte","Parts soumises à l’IFI pour leur valeur immobilière"]) + '</ul>'
        '<ul class="checklist">' + lis(["Frais d’entrée élevés, amortis sur la durée","Revenus non garantis (vacance, renégociation de baux)","Le report à nouveau (RAN) amortit, mais ne garantit pas"]) + '</ul></div>', cls="section band-cream")

    # Sélectionner
    body += section(head("Méthode","Comment sélectionner une SCPI ?", center=False) +
        cards([
            ("chart","Taux de distribution (TD)","Le rendement courant d’une année — à ne pas lire seul."),
            ("growth","TRI 5-10-15 ans","Intègre revenus et évolution du prix : l’indicateur clé."),
            ("building","Taux d’occupation (TOF)","Qualité locative ; les mieux gérées affichent 95-100 %."),
            ("shield","Report à nouveau (RAN)","Réserve, en jours de distribution, pour amortir les baisses."),
            ("scale","Valeur de reconstitution","Décote = potentiel ; surcote = vigilance."),
            ("lock","Capitalisation & ancienneté","&gt; 1 Md€ et 15 ans d’historique : profil plus résilient."),
        ]))

    # Nos partenaires / sélection
    funds = sorted(SCPI_SELECTION, key=lambda x: x[3], reverse=True)
    managers = []
    for _, m, _, _ in funds:
        if m not in managers: managers.append(m)
    cards_html = ""
    for name, mgr, year, perf in funds:
        neg = " neg" if perf < 0 else ""
        pv = ("%.2f" % perf).rstrip("0").rstrip(".").replace(".", ",")
        cards_html += ('<div class="fund-card" data-reveal><span class="since">Depuis %d</span>'
                       '<div class="perf%s">%s %%<small> · 2025</small></div>'
                       '<h4>%s</h4><div class="mgr">%s</div></div>'
                       % (year, neg, pv, html.escape(name), html.escape(mgr)))
    mgr_tags = '<div class="tags" style="justify-content:center;margin-top:8px" data-reveal>' + "".join('<span class="tag">%s</span>' % html.escape(m) for m in managers) + '</div>'
    body += section(
        head("Notre sélection 2026","Nos principales SCPI partenaires",
             "En architecture ouverte, nous passons au crible performance, résilience et gouvernance pour ne retenir que les véhicules les plus pertinents.")
        + mgr_tags
        + '<div class="grid grid-4" style="margin-top:40px">' + cards_html + '</div>'
        + '<p class="muted center" style="margin:28px auto 0;max-width:80ch" data-reveal>Performances 2025 (taux de distribution) communiquées par les sociétés de gestion. Les performances passées ne préjugent pas des performances futures ; tout investissement comporte un risque de perte en capital et de liquidité.</p>')

    # FAQ
    body += section(head("Questions fréquentes","Vos questions sur les SCPI") +
        '<div style="max-width:880px;margin:40px auto 0" data-reveal>' + faq([
            ("Quel montant minimum pour investir en SCPI ?",
             "<p>Le minimum correspond au prix d’une part — parfois quelques centaines d’euros. Pour une diversification pertinente sur 2 à 3 SCPI complémentaires, un budget de 5 000 à 10 000 € permet une allocation équilibrée.</p>"),
            ("Quel rendement attendre en 2026 ?",
             "<p>Le taux de distribution moyen s’est établi à 4,72 % en 2024 ; les SCPI les plus performantes dépassent 6-7 %, avec un profil de risque plus marqué. Le TRI sur 10 ans reste l’indicateur le plus robuste.</p>"),
            ("Les revenus de SCPI sont-ils imposables ?",
             "<p>Oui, selon le mode de détention. En direct : revenus fonciers (barème IR + 17,2 % PS). En assurance-vie : capitalisation sans imposition immédiate, fiscalité au rachat. En nue-propriété temporaire : aucun revenu, donc aucune imposition pendant le démembrement.</p>"),
            ("Peut-on revendre facilement ses parts ?",
             "<p>La revente est possible mais soumise à des délais variables (compensation des retraits en capital variable, marché secondaire en capital fixe). L’horizon recommandé est de 8 à 10 ans : la SCPI n’est pas adaptée à un besoin de liquidité court terme.</p>"),
            ("SCPI française ou européenne ?",
             "<p>Cela dépend surtout de votre TMI. Au-delà de 30 %, les SCPI européennes offrent un avantage fiscal via les conventions bilatérales (imposition effective parfois &lt; 20 % contre 47,2 % en foncier français), en plus d’une diversification géographique.</p>"),
            ("Investir à crédit est-il pertinent en 2026 ?",
             "<p>Oui, tant que le différentiel entre le TD (4,5 à 6 %) et le coût du crédit (3,5 à 4 %) reste positif. Les intérêts sont déductibles des revenus fonciers ; un horizon de 15 ans minimum est recommandé.</p>"),
        ]) + '</div>')

    body += cta_band("Construisons votre allocation SCPI","Sélection de véhicules, mode de détention et optimisation fiscale : définissons ensemble la stratégie la plus adaptée à votre situation.")
    page("scpi-immobilier-gere.html","SCPI & immobilier géré",
         "SCPI et immobilier géré : fonctionnement, types, fiscalité comparée selon le mode de détention, critères de sélection et notre sélection de SCPI partenaires 2026.", body)

# Salles de marché mises en concurrence (émetteurs de produits structurés)
DESKS = ["Société Générale","BNP Paribas","Natixis","Morgan Stanley","Goldman Sachs",
         "Citi","UBS","Barclays","Vontobel","BBVA","J.P. Morgan","Crédit Agricole CIB"]

# Les éléments qui définissent un produit structuré
PS_ELEMENTS = [
    ("compass","Le sous-jacent","Indice, action ou panier dont la performance détermine le résultat du produit."),
    ("clock","La durée / l’échéance","La maturité maximale, au terme de laquelle les conditions finales sont constatées."),
    ("coins","Le rendement","Sous forme de coupon périodique ou de gain à l’échéance, le plus souvent conditionnel."),
    ("chart","La fréquence de constatation","Le rythme d’observation du sous-jacent (trimestriel, annuel…) qui déclenche coupons et rappels."),
    ("scale","Le strike","Le niveau de référence du sous-jacent fixé à l’origine, base de toutes les comparaisons."),
    ("shield","Le niveau de protection","La barrière, partielle ou totale, qui encadre le risque de perte en capital."),
]

def build_produits_structures_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements financiers","placements-financiers.html"),("Produits structurés",None)]
    body = page_hero("Produits structurés",
        "Des instruments d’ingénierie financière qui combinent une composante obligataire et un produit dérivé pour viser un rendement défini, avec un niveau de risque calibré à l’avance selon un scénario de marché.",
        crumbs)

    body += section(feature_row("assets/img/paris-courtyard.jpg","Produits structurés sur-mesure","En bref",
        "Concilier rendement et protection, sur-mesure",
        ["Un produit structuré associe généralement un actif de base (souvent obligataire) qui apporte une assise, et un dérivé (une option) qui génère le rendement selon des scénarios définis dès l’origine.",
         "Recherche de rendement dans des marchés peu directionnels, protection partielle ou totale du capital, exposition encadrée à un actif risqué : chaque produit répond à un objectif précis."],
        rev=True, checklist=["Scénarios de gain et de protection définis à l’avance","Architecture ouverte : émetteurs mis en concurrence","Logeable dans la plupart des enveloppes patrimoniales"]))

    body += blocks_section("Anatomie","Les éléments qui définissent un produit structuré",
        [("cards","Six paramètres clés", PS_ELEMENTS)],
        lede="Cinq à six paramètres, interdépendants, se choisissent selon vos objectifs et votre tolérance au risque.", center=True, cls="section band-cream")

    body += blocks_section("Sous-jacents","Sur quoi peut-on indexer un produit structuré ?",
        [("tags","Les univers éligibles",
            ["Indices (CAC 40, Euro Stoxx 50, S&P 500…)","Indices ESG","Actions de grandes capitalisations","Paniers d’actions","Taux d’intérêt (EURIBOR, CMS, OAT)","Matières premières","Devises","ETF & OPCVM éligibles"]),
         ("text","Le choix du sous-jacent",
            ["Sa nature et sa volatilité conditionnent à la fois le rendement potentiel et le risque : un indice large et diversifié sera plus défensif qu’une action unique ou un panier concentré."])])

    body += blocks_section("Formats","Les grandes familles de produits structurés",
        [("cards","Du plus prudent au plus offensif",[
            ("lock","Capital garanti","Remboursement intégral du capital à l’échéance (hors défaut de l’émetteur), en contrepartie d’un gain plus encadré."),
            ("shield","Capital protégé","Participation à la hausse et pertes limitées tant qu’une barrière de protection n’est pas franchie."),
            ("compass","Fonds à promesse","Objectif de performance conditionnel à la trajectoire du sous-jacent, sans garantie en capital."),
            ("chart","Autocall","Remboursement anticipé automatique si le sous-jacent repasse au-dessus d’un seuil à une date d’observation."),
            ("coins","Phoenix","Coupons conditionnels versés tant qu’une barrière n’est pas franchie, avec effet mémoire possible."),
            ("doc","Athéna","Gains versés au remboursement (anticipé ou à l’échéance), sans coupon intermédiaire."),
         ])], cls="section band-cream")

    body += blocks_section("Intérêt & limites","Avantages et points de vigilance",
        [("cards","Pourquoi les investisseurs les utilisent",[
            ("scale","Adaptabilité","Configurables selon vos objectifs et vos anticipations de marché."),
            ("puzzle","Diversification","Accès à des sous-jacents et stratégies variés au sein d’une seule solution."),
            ("shield","Protection","Des mécanismes de protection partielle ou totale du capital."),
            ("growth","Rendement potentiel","Une alternative aux placements les plus défensifs, dans un cadre maîtrisé."),
         ]),
         ("checklist","Les principaux risques à comprendre",
            ["Risque de marché (évolution du sous-jacent)","Risque de crédit de l’émetteur","Risque de liquidité (revente avant l’échéance)","Complexité des mécanismes","Sensibilité aux taux d’intérêt","Non-versement de coupons conditionnels","Corrélation entre sous-jacents d’un panier"]),
         ("text","Les frais",
            ["Trois postes principaux : frais de structuration (intégrés au montage par l’émetteur), commission de souscription et, en cas de sortie anticipée, frais et décote sur le marché secondaire. Notre rôle est d’en assurer la transparence et de les négocier."])])

    body += blocks_section("Enveloppes","Dans quelle enveloppe loger un produit structuré ?",
        [("cards","Une grande flexibilité fiscale",[
            ("chart","Compte-titres (CTO)","Souplesse maximale et accès le plus large.","comptes-titres.html"),
            ("shield","Assurance-vie","Cadre fiscal et successoral privilégié après 8 ans.","assurance-vie.html"),
            ("coins","Contrat de capitalisation","Détention patrimoniale ou sociétaire, antériorité conservée.","contrat-capitalisation.html"),
            ("globe","Contrat luxembourgeois","Sécurité renforcée et univers de supports étendu.","contrat-luxembourgeois.html"),
            ("retire","PER","Déduction des versements et préparation de la retraite.","solutions-retraite.html"),
            ("building","Compte personne morale","Pour la trésorerie d’entreprise et les holdings.","structures-tresorerie.html"),
         ])], cls="section band-cream")

    # Notre approche indépendante (mise en concurrence des salles)
    body += blocks_section("Notre approche","Architecture ouverte et mise en concurrence des salles",
        [("tags","Les salles de marché que nous mettons en concurrence", DESKS),
         ("checklist","Les critères que nous comparons sur chaque structuration",
            ["Niveau de coupon / rendement proposé","Distance à la barrière de protection","Qualité de crédit de l’émetteur","Conditions de remboursement anticipé (autocall)","Univers sous-jacent et corrélation","Liquidité secondaire et transparence de valorisation","Volatilité implicite utilisée dans le pricing","Documentation (term sheet, EMTN, prospectus)"]),
         ("text","La term sheet, document clé",
            ["Cette fiche technique résume sous-jacent, barrières, coupons, scénarios (haussier, neutre, baissier) et risques. Nous l’analysons avec vous, ligne par ligne, avant toute décision."])])

    body += section(faq_block("Questions fréquentes","Vos questions sur les produits structurés", [
        ("Qu’est-ce qu’un produit structuré ?",
         "<p>Un instrument financier émis par une banque, qui combine une composante obligataire et un produit dérivé pour relier le rendement à la performance d’un sous-jacent, selon une formule définie à l’avance.</p>"),
        ("De quoi se compose-t-il ?",
         "<p>Le plus souvent d’un actif de base (obligation) qui apporte une assise, et d’un dérivé (option) qui génère le rendement selon des scénarios prédéfinis.</p>"),
        ("Quels sont les grands types ?",
         "<p>Schématiquement : capital garanti, capital protégé et fonds à promesse, auxquels s’ajoutent les formats autocall, Phoenix et Athéna selon le mode de versement des gains et de rappel.</p>"),
        ("Quels sont les principaux risques ?",
         "<p>Risque de marché, risque de crédit de l’émetteur, risque de liquidité avant l’échéance et complexité. La protection du capital peut disparaître si une barrière est franchie.</p>"),
        ("Dans quelle enveloppe l’loger ?",
         "<p>Compte-titres, assurance-vie, contrat de capitalisation, PEA (selon éligibilité), PER ou compte de personne morale : le choix de l’enveloppe optimise la fiscalité selon votre situation.</p>"),
        ("Pourquoi passer par un conseil indépendant ?",
         "<p>Pour mettre les émetteurs en concurrence en architecture ouverte, analyser la term sheet sans biais commercial et intégrer le produit dans une allocation globale cohérente.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« Nous intervenons comme architectes de solutions, et non comme distributeurs : chaque produit est sélectionné ou structuré selon votre cahier des charges patrimonial. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Les produits structurés comportent un risque de perte en capital et un risque de crédit de l’émetteur. Les performances passées ne préjugent pas des performances futures. Toute souscription suppose la lecture de la documentation réglementaire (term sheet, prospectus / EMTN, DIC).</p>', cls="section--tight")
    body += cta_band("Étudions une solution sur-mesure","Définissons ensemble le sous-jacent, l’horizon, le niveau de protection et l’enveloppe les plus adaptés — puis mettons les meilleures salles de marché en concurrence.")
    page("produits-structures.html","Produits structurés",
         "Produits structurés sur-mesure : définition, paramètres clés, sous-jacents, formats (autocall, Phoenix, Athéna), risques, enveloppes et mise en concurrence des salles de marché.", body)

def build_structures_tresorerie_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Trésorerie d’entreprise","tresorerie-entreprise.html"),("Produits structurés de trésorerie",None)]
    body = page_hero("Produits structurés de trésorerie",
        "Optimiser le rendement de capitaux disponibles avec un niveau de risque défini en amont — sans basculer dans une gestion actions classique.",
        crumbs)

    body += section(feature_row("assets/img/mansion.jpg","Produits structurés de trésorerie","En bref",
        "Le rendement calibré, à l’échelle de l’entreprise",
        ["Pour les entreprises, holdings et structures patrimoniales disposant de réserves significatives, le produit structuré combine obligation, options et mécanismes de protection pour viser un profil rendement / risque précis.",
         "L’objectif : dépasser les solutions de placement court terme traditionnelles, dans un cadre maîtrisé, lisible et compatible avec votre gouvernance financière."],
        rev=True, checklist=["Rendement conditionnel ou capital partiellement protégé","Horizon, sous-jacent et barrières définis sur-mesure","Architecture ouverte : aucune salle imposée"]))

    body += blocks_section("Anatomie","Les paramètres d’un produit structuré",
        [("cards","Six leviers à calibrer", PS_ELEMENTS)],
        lede="Les mêmes briques que pour un particulier, mais lues à l’aune d’une politique de trésorerie d’entreprise.", center=True, cls="section band-cream")

    body += blocks_section("Objectifs","Ce qu’une trésorerie peut viser",
        [("cards","Des usages propres à l’entreprise",[
            ("coins","Rendement conditionnel","Des coupons réguliers sous conditions de marché."),
            ("shield","Protection du capital","Une protection partielle ou conditionnelle à l’échéance."),
            ("puzzle","Diversification bilancielle","Décorréler une partie des réserves des placements classiques."),
            ("clock","Portage défini","Un horizon calibré sur la trésorerie peu mobilisée."),
         ]),
         ("tags","Les formats les plus adaptés à la trésorerie",
            ["Phoenix / Autocall défensifs","Capital partiellement protégé","Indices larges ou décrémentés","Portage sur sous-jacents robustes","Solutions multi-barrières sur-mesure"])])

    body += blocks_section("Vigilance","Une lecture institutionnelle des risques",
        [("checklist","Les risques que nous analysons",
            ["Risque de marché","Risque de crédit de l’émetteur","Risque de liquidité","Gap risk","Risque de rappel anticipé","Corrélation des sous-jacents","Exposition à la volatilité implicite","Sensibilité aux taux"]),
         ("text","Rendement et risque indissociables",
            ["La recherche de rendement ne doit jamais être dissociée de la compréhension technique des risques : nous analysons chaque proposition avec une exigence comparable à celle d’une direction financière sophistiquée."])], cls="section band-cream")

    body += blocks_section("Détention","Dans quelle enveloppe pour une personne morale ?",
        [("cards","Les cadres de détention",[
            ("treasury","Compte-titres personne morale","Souplesse et accès direct aux marchés.","comptes-titres.html"),
            ("coins","Contrat de capitalisation","Capitalisation et fiscalité adaptée à l’IS.","capitalisation-personne-morale.html"),
            ("globe","Contrat luxembourgeois dédié","Sécurité institutionnelle et univers étendu.","luxembourgeois-tresorerie.html"),
         ])])

    body += blocks_section("Notre approche","Architecture ouverte et mise en concurrence des salles",
        [("tags","Les salles de marché que nous mettons en concurrence", DESKS),
         ("checklist","Les critères comparés sur chaque structuration",
            ["Coupon proposé et conditions de rappel (autocall)","Niveau des barrières de protection","Qualité de crédit de l’émetteur","Maturité et univers sous-jacent","Liquidité secondaire","Volatilité implicite utilisée dans le pricing","Documentation EMTN / cadre juridique","Fiscalité de l’enveloppe de détention"]),
         ("text","Architectes, pas distributeurs",
            ["Nous ne travaillons avec aucun broker imposé ni plateforme captive : chaque structure est sélectionnée selon votre politique de trésorerie — excédents de moyen terme, réserves stratégiques, recherche de rendement prudent ou diversification."])])

    body += section(faq_block("Questions fréquentes","Vos questions", [
        ("Pourquoi des produits structurés pour la trésorerie ?",
         "<p>Pour viser un rendement supérieur aux placements monétaires sur la part durablement excédentaire, avec un niveau de risque défini à l’avance et une protection calibrée — sans gestion actions classique.</p>"),
        ("Quelle protection du capital ?",
         "<p>Selon la structure : protection totale (capital garanti) ou conditionnelle via une barrière. Le niveau de protection se définit en contrepartie du rendement visé ; un risque de perte en capital subsiste.</p>"),
        ("Quelles enveloppes pour une société ?",
         "<p>Compte-titres personne morale, contrat de capitalisation ou contrat luxembourgeois dédié — selon votre fiscalité (IS), vos objectifs de capitalisation et votre gouvernance.</p>"),
        ("Comment garantissez-vous le meilleur produit ?",
         "<p>Par la mise en concurrence institutionnelle des salles de marché et l’analyse de chaque term sheet, sans dépendance commerciale à une contrepartie unique.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« Transformer une trésorerie importante en une poche de rendement pilotée, indépendante et stratégiquement calibrée. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Les produits structurés comportent un risque de perte en capital et un risque de crédit de l’émetteur. Les performances passées ne préjugent pas des performances futures. Toute souscription suppose la lecture de la documentation réglementaire.</p>', cls="section--tight")
    body += cta_band("Optimisons votre trésorerie","Étudions le format, l’émetteur et l’enveloppe les plus pertinents pour vos réserves, en toute indépendance.")
    page("structures-tresorerie.html","Produits structurés de trésorerie",
         "Produits structurés de trésorerie : paramètres, objectifs, risques, enveloppes pour personnes morales et mise en concurrence des salles de marché.", body)

# Compagnies d'assurance luxembourgeoises partenaires (architecture ouverte)
LUX_INSURERS = ["Lombard International","Wealins","Bâloise Vie Luxembourg","Generali Luxembourg",
                "Allianz Luxembourg","Swiss Life Luxembourg","Cardif Lux Vie","AXA Wealth Europe",
                "Vitis Life","La Mondiale Europartner"]

def build_luxembourgeois_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements financiers","placements-financiers.html"),("Contrats luxembourgeois",None)]
    body = page_hero("Contrats d’assurance-vie luxembourgeois",
        "Haut de gamme et neutre fiscalement, l’assurance-vie luxembourgeoise renforce la valorisation et la protection du patrimoine des épargnants exigeants.",
        crumbs)

    body += section(feature_row("assets/img/img-luxembourg.svg","Triangle de sécurité luxembourgeois","En bref",
        "Une plateforme patrimoniale internationale",
        ["Pour un résident français, le contrat luxembourgeois conjugue les avantages fiscaux et successoraux de l’assurance-vie française avec une sécurité des avoirs et une liberté d’investissement nettement supérieures.",
         "Enveloppe favorite de la gestion de fortune, il s’adresse aux patrimoines disposant du ticket d’entrée requis (généralement 125 000 à 250 000 €)."],
        rev=True, checklist=["Triangle de sécurité & super-privilège","Neutralité fiscale (fiscalité du pays de résidence)","Univers d’investissement quasi illimité"]))

    body += section(sec_head("Synthèse","L’essentiel à retenir", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Sécurité exceptionnelle : triangle de sécurité et super-privilège du souscripteur",
            "Neutralité fiscale : aucune imposition au Luxembourg, la fiscalité du pays de résidence s’applique",
            "Souscription multi-devises (EUR, USD, GBP, CHF, JPY…)",
        ]) + '</ul>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Univers très vaste : FAS, FID, FIC, OPCVM, obligations, actions, private equity, structurés",
            "Absence de rétrocessions : un conseil impartial",
            "Accès au crédit Lombard par nantissement du contrat",
        ]) + '</ul></div>', cls="section band-cream")

    # Sécurité
    body += blocks_section("Sécurité","Une protection parmi les plus solides d’Europe",
        [("cards","Les piliers de protection",[
            ("shield","Triangle de sécurité","Séparation stricte des actifs entre assureur, souscripteur et banque dépositaire."),
            ("lock","Super-privilège","Le souscripteur, créancier de premier rang en cas de défaillance de l’assureur."),
            ("compass","Hors loi Sapin 2","Pas de blocage administratif des retraits, même en période de crise."),
            ("scale","Contrôle indépendant","Supervision par le Commissariat aux Assurances et la banque dépositaire."),
         ]),
         ("text","Le triangle de sécurité, concrètement",
            ["Trois acteurs encadrent le contrat — la compagnie d’assurance, la banque dépositaire et le Commissariat aux Assurances (avec l’État luxembourgeois comme garant). Les actifs des souscripteurs sont ségrégués, contrôlés régulièrement et transmis automatiquement en cas de défaillance de l’assureur."])])

    # Neutralité fiscale
    body += blocks_section("Fiscalité","La neutralité fiscale",
        [("text","La fiscalité de votre pays de résidence",
            ["Le Luxembourg n’applique aucune fiscalité propre : c’est la loi du pays de résidence du souscripteur qui s’applique. Tant qu’aucun rachat n’est effectué, les gains se capitalisent sans imposition.",
             "Pour un résident français, le contrat conserve les avantages de l’assurance-vie française : abattements et fiscalité réduite sur les plus-values après 8 ans, et cadre successoral privilégié."]),
         ("checklist","Au rachat & à la succession (résident français)",
            ["Rachat : fiscalité fonction de l’ancienneté, des versements et des montants","Après 8 ans : abattement annuel et imposition réduite des gains","Succession : jusqu’à 152 500 € par bénéficiaire (primes avant 70 ans)","Au-delà de 70 ans : abattement global de 30 500 €, gains exonérés"])],
        cls="section band-cream")

    # Univers d'investissement
    body += blocks_section("Investissement","Un univers quasi illimité",
        [("cards","Les véhicules dédiés",[
            ("chart","FID — Fonds Interne Dédié","Gestion sous mandat individualisée, supports sophistiqués et internationaux."),
            ("puzzle","FAS — Fonds d’Assurance Spécialisé","Le souscripteur averti compose son portefeuille, coté ou non coté."),
            ("treasury","FIC — Fonds Interne Collectif","Gestion mutualisée, plus accessible en montant."),
         ]),
         ("tags","Les supports accessibles",
            ["Fonds en euros (limité)","Actions","Obligations","OPCVM & ETF","Private equity","Produits structurés sur-mesure","Immobilier (OPCI / OPPCI)","Fonds alternatifs","Multi-devises"])])

    # Comparatif LU vs FR
    body += section(sec_head("Comparatif","Luxembourg ou France ?",
        "Deux enveloppes complémentaires ; le contrat luxembourgeois s’adresse aux patrimoines plus importants.", center=True) +
        '<div class="table-wrap" style="margin-top:40px" data-reveal><table class="ptable">'
        '<thead><tr><th>Critère</th><th>Assurance-vie luxembourgeoise</th><th>Assurance-vie française</th></tr></thead><tbody>'
        + "".join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in [
            ("Ticket d’entrée","À partir de 125 000 €","Dès 100 €"),
            ("Triangle de sécurité","Oui","Non"),
            ("Multi-devises","Oui (EUR, USD, GBP, CHF, JPY)","Non"),
            ("Loi Sapin 2 (blocage)","Non applicable","Applicable"),
            ("Créancier de premier rang","Oui (super-privilège)","Non"),
            ("Plafond de garantie","Illimité","70 000 €"),
            ("Univers d’investissement","Très étendu (FAS / FID / FIC)","Plus limité"),
            ("Produits structurés sur-mesure","Oui","Rare"),
            ("Rétrocessions au conseiller","Interdites","Autorisées"),
            ("Fonds en euros","Limité","Disponible"),
        ]) + '</tbody></table></div>')

    # Atouts complémentaires
    body += blocks_section("Atouts","Des leviers réservés au contrat luxembourgeois",
        [("cards","Quatre atouts différenciants",[
            ("globe","Multi-devises","Libeller le contrat et investir en EUR, USD, GBP, CHF, JPY."),
            ("coins","Crédit Lombard","Nantir le contrat pour obtenir des liquidités sans désinvestir."),
            ("scale","Sans rétrocessions","Un conseil impartial, libéré des commissions de distribution."),
            ("doc","Transférabilité","Transfert d’un contrat existant sans perte d’antériorité fiscale."),
         ])], cls="section band-cream")

    # Inconvénients
    body += blocks_section("Vigilance","Les points à considérer",
        [("checklist","Avant de souscrire",
            ["Ticket d’entrée élevé (125 000 à 250 000 €)","Pas d’accès aux SCPI (mais OPCI / OPPCI possibles)","Souscription encadrée : justificatifs sur l’origine des fonds","Restrictions selon la nationalité (hors EEE) — résidents français éligibles","Fonds en euros moins rémunérateur qu’en France"])])

    # Frais
    body += blocks_section("Frais","Une tarification transparente",
        [("checklist","Les principaux postes",
            ["Frais d’entrée : 0 à 3 % du montant investi","Frais de gestion annuels : environ 1 à 2 %","Frais propres aux supports d’investissement","Transparence : documentation détaillée des frais et commissions","Aucune rétrocession au conseiller"])], cls="section band-cream")

    # Partenaires
    body += section(sec_head("Architecture ouverte","Nos compagnies partenaires",
        "Sans dépendance à un assureur unique, nous sélectionnons la compagnie la plus adaptée selon votre patrimoine, votre résidence fiscale, le niveau de solvabilité et vos objectifs.", center=True)
        + '<div class="tags" style="justify-content:center;margin-top:8px" data-reveal>' + "".join('<span class="tag">%s</span>' % html.escape(m) for m in LUX_INSURERS) + '</div>')

    body += section(faq_block("Questions fréquentes","Vos questions sur le contrat luxembourgeois", [
        ("Quels sont les avantages de l’assurance-vie luxembourgeoise ?",
         "<p>La neutralité fiscale, la sécurité des fonds (triangle de sécurité, super-privilège), un univers d’investissement très large, l’absence de rétrocessions et la gestion multi-devises.</p>"),
        ("Comment fonctionne sa fiscalité ?",
         "<p>Elle dépend du pays de résidence fiscale. Pour un résident français, la fiscalité est identique à celle d’un contrat français : abattements sur les plus-values après 8 ans et avantages successoraux.</p>"),
        ("Qui peut souscrire ?",
         "<p>Tout résident de l’Union européenne, ainsi que les résidents de certains pays hors UE selon la politique de l’assureur. Les résidents français sont éligibles, sous réserve du ticket d’entrée.</p>"),
        ("Quels sont les inconvénients ?",
         "<p>Un ticket d’entrée élevé, l’absence de SCPI (compensée par les OPCI/OPPCI), une souscription plus encadrée et des restrictions pour certaines nationalités hors EEE.</p>"),
        ("Pourquoi le préférer au contrat français ?",
         "<p>Pour le triangle de sécurité, un univers d’investissement bien plus large, une protection renforcée en cas de crise (hors loi Sapin 2) et une liberté de retrait totale.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« Bien plus qu’un contrat d’assurance-vie : une véritable plateforme patrimoniale internationale, pensée pour protéger, diversifier et transmettre. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Information non contractuelle. La fiscalité dépend de la situation individuelle et du pays de résidence ; elle est susceptible d’évoluer. Les supports en unités de compte comportent un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.</p>', cls="section--tight")
    body += cta_band("Ouvrons votre contrat luxembourgeois","Sélection de la compagnie, architecture du contrat et allocation sur-mesure : étudions ensemble la solution la plus adaptée à votre situation.")
    page("contrat-luxembourgeois.html","Contrats d’assurance-vie luxembourgeois",
         "Assurance-vie luxembourgeoise : triangle de sécurité, super-privilège, neutralité fiscale, FAS/FID/FIC, multi-devises, crédit Lombard et comparatif Luxembourg / France.", body)

def build_comptes_titres_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements financiers","placements-financiers.html"),("Comptes-titres",None)]
    body = page_hero("Compte-titres (CTO)",
        "L’enveloppe la plus souple et la plus accessible pour investir : un univers de gestion sans contrainte, sur tous les marchés et toutes les classes d’actifs.",
        crumbs)

    body += section(feature_row("assets/img/paris-colonnade.jpg","Compte-titres ordinaire","En bref",
        "La liberté patrimoniale, sans contrainte",
        ["Le compte-titres ordinaire (CTO) permet de détenir actions, obligations, OPCVM, ETF, produits structurés ou titres non cotés — en France comme à l’international.",
         "Sa fiscalité n’offre pas d’avantage spécifique : il se conçoit en complément d’enveloppes comme l’assurance-vie, le PEA ou le contrat de capitalisation."],
        rev=True, checklist=["Aucun plafond de versement","Accès à tous les marchés et classes d’actifs","Accessible aux particuliers comme aux personnes morales"]))

    body += section(sec_head("Synthèse","L’essentiel à retenir", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Souplesse totale : achat / vente à tout moment, sans durée minimale",
            "Univers le plus large, y compris marchés étrangers et titres non cotés",
            "Aucun plafond, plusieurs comptes possibles, transfert simple",
        ]) + '</ul>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Fiscalité au PFU par défaut, ou option pour le barème de l’IR",
            "Imposition au moment de la cession / des revenus, pas au retrait",
            "Ouvert aux personnes morales (sociétés, holdings, SCI)",
        ]) + '</ul></div>', cls="section band-cream")

    body += blocks_section("Caractéristiques","Une enveloppe universelle",
        [("cards","Pourquoi le CTO",[
            ("puzzle","Flexibilité totale","Tous les titres, cotés ou non, sans contrainte de gestion."),
            ("globe","Sans frontières","Accès aux marchés français et internationaux."),
            ("coins","Aucun plafond","Versements et nombre de comptes illimités."),
            ("compass","Transfert simple","D’un établissement à l’autre, sans clôture forcée."),
         ]),
         ("text","Liquidité et retraits",
            ["Les retraits s’effectuent par virement de la poche espèces vers votre compte bancaire, sans conséquence fiscale en soi : l’imposition ne se déclenche qu’à la vente de titres ou à l’encaissement de revenus."])])

    body += blocks_section("Fiscalité","La fiscalité du compte-titres",
        [("cards","Les règles pour un particulier",[
            ("scale","PFU par défaut","Flat tax de 31,4 % (12,8 % d’IR + 18,6 % de prélèvements sociaux)."),
            ("doc","Option barème IR","Avantageuse à TMI basse ; abattement de 40 % sur les dividendes."),
            ("chart","Moins-values reportables","Imputables sur les plus-values pendant 10 ans."),
            ("globe","Titres étrangers","Retenue à la source, neutralisée par un crédit d’impôt (conventions)."),
         ]),
         ("text","Abattement pour durée de détention",
            ["Réservé aux titres acquis avant 2018 et à l’option pour le barème de l’IR, cet abattement progressif réduit la base imposable des plus-values selon la durée de détention. Depuis le PFU, il ne s’applique plus aux titres acquis après 2018."])],
        cls="section band-cream")

    body += section(sec_head("Comparatif","Compte-titres ou PEA ?",
        "Deux enveloppes complémentaires : souplesse maximale d’un côté, avantage fiscal de long terme de l’autre.", center=True) +
        '<div class="table-wrap" style="margin-top:40px" data-reveal><table class="ptable">'
        '<thead><tr><th>Critère</th><th>Compte-titres (CTO)</th><th>PEA</th></tr></thead><tbody>'
        + "".join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in [
            ("Univers d’investissement","Mondial, toutes classes d’actifs","Actions UE et fonds éligibles"),
            ("Plafond de versement","Aucun","150 000 €"),
            ("Fiscalité des gains","PFU 31,4 % ou barème IR","Exonération d’IR après 5 ans (PS 17,2 %)"),
            ("Liquidité","Totale, sans incidence","Retrait avant 5 ans : clôture"),
            ("Personnes morales","Oui","Non"),
            ("Idéal pour","Diversification mondiale, non coté","Capitalisation actions UE de long terme"),
        ]) + '</tbody></table></div>'
        '<p class="muted center" style="margin:16px auto 0;max-width:80ch" data-reveal>Le CTO et le PEA sont souvent complémentaires : le PEA capitalise les actions européennes dans un cadre fiscal privilégié, le CTO ouvre le reste du monde et des classes d’actifs.</p>')

    body += blocks_section("Atouts & limites","Avantages et points de vigilance",
        [("checklist","Les atouts",
            ["Univers d’investissement universel (coté et non coté)","Aucun plafond, souplesse de gestion totale","Retraits libres, sans incidence fiscale directe","Accessible aux personnes morales"]),
         ("checklist","Les points de vigilance",
            ["Aucun avantage fiscal propre (à la différence du PEA ou de l’assurance-vie)","Capital non garanti : risque de perte selon les choix d’investissement","Fiscalité des dividendes et plus-values dès leur réalisation"])])

    body += blocks_section("Personnes morales","Le compte-titres des sociétés & holdings",
        [("cards","Qui peut en ouvrir un",[
            ("treasury","Sociétés","SA, SAS, SARL, EURL : placer la trésorerie plutôt que la laisser dormir."),
            ("building","Holdings & SCI","Détenir et faire travailler des réserves financières."),
            ("doc","Associations & fondations","Selon leur régime et leur activité."),
         ]),
         ("text","La fiscalité à l’IS",
            ["Les gains (dividendes, intérêts, plus-values) sont imposés à l’impôt sur les sociétés — 15 % jusqu’à 42 500 € de bénéfices (sous conditions), 25 % au-delà. Pas d’abattement pour durée de détention, mais des provisions pour dépréciation possibles en cas de baisse de valeur."])],
        cls="section band-cream")

    body += section(faq_block("Questions fréquentes","Vos questions sur le compte-titres", [
        ("Le compte-titres a-t-il un plafond ?",
         "<p>Non. Contrairement au PEA (plafonné à 150 000 €), le compte-titres n’a aucun plafond de versement et vous pouvez en détenir plusieurs.</p>"),
        ("Comment sont imposés les gains ?",
         "<p>Par défaut au PFU (flat tax), avec une option possible pour le barème de l’IR — parfois plus favorable à TMI basse, grâce notamment à l’abattement de 40 % sur les dividendes. L’imposition n’intervient qu’à la cession des titres ou à l’encaissement des revenus.</p>"),
        ("Une société peut-elle ouvrir un compte-titres ?",
         "<p>Oui. Sociétés, holdings, SCI, associations : le compte-titres permet de placer la trésorerie. Les gains sont alors soumis à l’impôt sur les sociétés.</p>"),
        ("CTO ou PEA ?",
         "<p>Le PEA est plus avantageux fiscalement sur les actions européennes de long terme ; le CTO offre une diversification mondiale et l’accès au non coté. Les deux sont souvent complémentaires.</p>"),
        ("Le transfert d’un compte-titres est-il possible ?",
         "<p>Oui, d’un établissement à un autre, sans clôture ni perte d’antériorité — nous vous accompagnons dans la procédure.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« L’enveloppe la plus souple pour bâtir, diversifier et piloter un portefeuille sur-mesure — en complément des enveloppes fiscalement privilégiées. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Information non contractuelle. La fiscalité dépend de votre situation et est susceptible d’évoluer. Tout investissement comporte un risque de perte en capital ; les performances passées ne préjugent pas des performances futures.</p>', cls="section--tight")
    body += cta_band("Construisons votre portefeuille","Allocation, sélection des supports et articulation avec vos autres enveloppes : définissons une stratégie cohérente et fiscalement optimisée.")
    page("comptes-titres.html","Compte-titres (CTO)",
         "Compte-titres ordinaire : fonctionnement, fiscalité (PFU ou barème IR), comparatif avec le PEA, détention par les personnes morales et accompagnement.", body)

def build_pea_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements financiers","placements-financiers.html"),("PEA",None)]
    body = page_hero("PEA — Plan d’Épargne en Actions",
        "L’une des stratégies les plus efficaces pour investir en actions européennes avec une fiscalité allégée — l’exonération d’impôt sur le revenu après 5 ans reste l’avantage décisif de l’enveloppe.",
        crumbs)

    body += section(feature_row("assets/img/paris-courtyard.jpg","Plan d’Épargne en Actions","En bref",
        "Le pilier actions, fiscalement optimisé",
        ["Le PEA loge un portefeuille d’actions européennes et de fonds éligibles : tant que les fonds restent dans l’enveloppe, plus-values et dividendes ne sont pas imposés.",
         "Depuis janvier 2026, la hausse de la CSG porte les prélèvements sociaux à 18,6 %, mais l’exonération d’IR après 5 ans préserve l’avantage du PEA sur le compte-titres."],
        rev=True, checklist=["Exonération d’IR sur les gains après 5 ans","Arbitrages internes non imposés","Plafond de 150 000 € (225 000 € avec le PEA-PME)"]))

    body += section(sec_head("Synthèse","L’essentiel à retenir", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Prendre date sans attendre : le compteur de 5 ans démarre au premier versement",
            "La hausse des PS (18,6 %) ne remet pas en cause l’avantage face au CTO (31,4 %)",
            "Cumul PEA + PEA-PME : jusqu’à 225 000 € par personne, 450 000 € en couple",
        ]) + '</ul>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Un ETF Monde domicilié en Europe maximise la diversification tout en restant éligible",
            "Articuler les enveloppes : PEA (actions), assurance-vie (diversification, transmission), PER (déduction)",
            "Un bilan patrimonial calibre la répartition entre ces enveloppes",
        ]) + '</ul></div>', cls="section band-cream")

    body += blocks_section("Fonctionnement","Comment fonctionne un PEA ?",
        [("cards","Principe & conditions",[
            ("treasury","Deux poches","Un compte espèces et un portefeuille titres au sein d’une même enveloppe."),
            ("shield","Réservé aux résidents","Personne physique majeure, résidente fiscale française, un seul PEA classique."),
            ("scale","Bancaire ou assurance","Titres vifs + ETF (bancaire) ou contrat de capitalisation en UC (assurance)."),
            ("compass","Loi PACTE","Retraits partiels après 5 ans sans clôture, et création du PEA Jeunes."),
         ]),
         ("cards","Trois variantes",[
            ("chart","PEA classique","Plafond de versement de 150 000 €."),
            ("puzzle","PEA-PME","PME-ETI européennes, plafond cumulé de 225 000 €."),
            ("retire","PEA Jeunes","18-25 ans rattachés au foyer, plafond de 20 000 €."),
         ])])

    body += blocks_section("Éligibilité","Titres & supports éligibles",
        [("checklist","Ce que le PEA accepte",
            ["Actions de sociétés de l’UE / EEE","OPCVM et ETF investis à 75 % minimum en actions européennes","Certains ETF Monde domiciliés en Europe (Luxembourg, Irlande)","Obligations convertibles de PME-ETI (PEA-PME uniquement)"]),
         ("text","Ce qui est exclu",
            ["Obligations classiques, titres démembrés, parts de SCI et actions de sociétés foncières (SIIC/REIT) pour les titres acquis depuis 2011."])],
        cls="section band-cream")

    body += blocks_section("Rendement","Combien rapporte un PEA ?",
        [("text","Rendement réel vs indices",
            ["Le rendement moyen déclaré par les épargnants ressort autour de 4,6 % par an (baromètre AMF), nettement sous les indices : un PEA diversifié via des ETF Monde affiche historiquement 7 à 9 % par an sur 15-20 ans.",
             "L’écart s’explique par la sous-performance de la gestion active, les frais cumulés et les biais comportementaux (market timing)."]),
         ("cards","Quatre leviers de performance",[
            ("puzzle","Allocation","Un cœur d’ETF Monde surperforme statistiquement le stock picking sur 15 ans +."),
            ("coins","Frais","0,5 % de frais annuels en trop, c’est plus de 10 % de capital en moins sur 20 ans."),
            ("clock","Horizon","Les intérêts composés ne déploient leur effet qu’au-delà de 10 ans."),
            ("growth","Régularité","Le versement programmé (DCA) lisse l’impact de la volatilité."),
         ])])

    body += blocks_section("Fiscalité 2026","La fiscalité du PEA",
        [("cards","La ligne de partage des 5 ans",[
            ("scale","Avant 5 ans","Tout retrait clôture le plan ; gains au PFU de 31,4 % (option barème IR)."),
            ("shield","Après 5 ans","Exonération d’IR ; seuls les prélèvements sociaux de 18,6 % s’appliquent."),
            ("compass","Arbitrages internes","Achats, ventes et réallocations ne déclenchent aucune imposition."),
            ("coins","Retraits partiels","Après 5 ans, ils ne ferment plus le plan (loi PACTE)."),
         ]),
         ("text","Impact de la hausse de CSG (LFSS 2026)",
            ["Les prélèvements sociaux passent de 17,2 % à 18,6 % sur les revenus mobiliers, PEA inclus. L’assurance-vie en est exclue (PS maintenus à 17,2 %). Malgré cela, le PEA conserve sa supériorité après 5 ans grâce à l’exonération d’IR — un avantage que ni le CTO ni l’assurance-vie n’offrent sur les plus-values mobilières."])],
        cls="section band-cream")

    body += section(sec_head("Comparatif","PEA, assurance-vie, CTO & PER", "Chaque enveloppe répond à un objectif patrimonial distinct.", center=True) +
        '<div class="table-wrap" style="margin-top:40px" data-reveal><table class="ptable">'
        '<thead><tr><th>Enveloppe</th><th>Fiscalité optimale</th><th>Condition</th><th>Objectif principal</th></tr></thead><tbody>'
        + "".join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in [
            ("PEA","18,6 % (PS seuls)","Détention &gt; 5 ans","Actions européennes"),
            ("Assurance-vie","24,7 % (7,5 % IR + 17,2 % PS)","&gt; 8 ans, versements &lt; 150 000 €","Diversification, transmission"),
            ("Compte-titres","31,4 % (PFU)","Aucune","Univers illimité"),
            ("PER","Barème / PFU à la sortie","Blocage jusqu’à la retraite","Déduction fiscale à l’entrée"),
        ]) + '</tbody></table></div>')

    body += blocks_section("Plafonds","Les plafonds de versement",
        [("cards","Des plafonds sur les versements, pas sur la valeur",[
            ("chart","PEA classique","150 000 € de versements (la valorisation peut dépasser ce montant)."),
            ("puzzle","PEA-PME","225 000 €, en cumul avec le PEA classique."),
            ("retire","PEA Jeunes","20 000 €, transformé en PEA classique à la sortie du foyer."),
         ]),
         ("text","Le levier du couple",
            ["Chaque conjoint peut détenir un PEA et un PEA-PME : la capacité totale de versement atteint 450 000 € (2 × 225 000 €), un socle actions fiscalement optimisé pour un patrimoine important."])])

    body += section(sec_head("Comparatif","PEA classique ou PEA-PME ?",
        "Une logique cœur-satellite : le PEA pour le cœur du portefeuille, le PEA-PME pour une poche croissance.", center=True) +
        '<div class="table-wrap" style="margin-top:40px" data-reveal><table class="ptable">'
        '<thead><tr><th>Critère</th><th>PEA classique</th><th>PEA-PME</th></tr></thead><tbody>'
        + "".join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in [
            ("Plafond de versement","150 000 €","225 000 € (cumul)"),
            ("Titres éligibles","Actions UE/EEE, ETF, OPCVM","Actions PME-ETI, obligations convertibles"),
            ("Liquidité","Élevée","Modérée à faible"),
            ("Volatilité","Modérée","Élevée"),
            ("Fiscalité après 5 ans","PS 18,6 % (exonération IR)","PS 18,6 % (exonération IR)"),
        ]) + '</tbody></table></div>')

    body += blocks_section("Ouvrir un PEA","Les étapes, et l’intérêt de prendre date",
        [("cards","Quatre étapes",[
            ("compass","1 · Choisir","Le type (bancaire ou assurance) et l’établissement teneur de compte."),
            ("doc","2 · Constituer le dossier","Pièce d’identité, justificatif de domicile, attestation de non-détention."),
            ("coins","3 · Premier versement","Souvent dès 10 à 100 € : il déclenche le compteur fiscal de 5 ans."),
            ("chart","4 · Sélectionner les supports","ETF Monde ou Europe, actions en direct ou fonds éligibles."),
         ]),
         ("text","Pourquoi ouvrir le plus tôt possible",
            ["Le délai de 5 ans court dès le premier versement, indépendamment des suivants. Ouvrir un PEA avec quelques euros aujourd’hui, c’est sécuriser l’exonération sur tous les gains futurs — y compris ceux des sommes investies dans plusieurs années."])])

    body += section(faq_block("Questions fréquentes","Vos questions sur le PEA", [
        ("Quand démarre le délai des 5 ans ?",
         "<p>Au premier versement, quel que soit le montant. D’où l’intérêt de « prendre date » tôt, même avec une petite somme, pour sécuriser l’exonération d’IR sur les gains futurs.</p>"),
        ("La hausse de CSG 2026 remet-elle en cause le PEA ?",
         "<p>Non. Les prélèvements sociaux passent à 18,6 %, mais l’exonération d’impôt sur le revenu après 5 ans reste un avantage décisif que le compte-titres n’offre pas.</p>"),
        ("Peut-on cumuler PEA et PEA-PME ?",
         "<p>Oui, dans la limite globale de 225 000 € de versements par personne (450 000 € pour un couple). Le PEA-PME ouvre l’accès aux PME-ETI et à leurs obligations convertibles.</p>"),
        ("Quels supports privilégier ?",
         "<p>Pour un cœur de portefeuille diversifié, les ETF Monde ou Europe domiciliés en Europe restent éligibles et peu coûteux. Nous calibrons l’allocation selon votre profil et votre horizon.</p>"),
        ("Que se passe-t-il en cas de retrait avant 5 ans ?",
         "<p>Le plan est clôturé et les gains imposés au PFU (sauf cas particuliers : création d’entreprise, licenciement, invalidité…). Après 5 ans, les retraits partiels sont libres et ne ferment plus le plan.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« Le PEA couvre le pilier actions d’un patrimoine ; bien articulé avec l’assurance-vie et le PER, il optimise rendement et fiscalité sur le long terme. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Information non contractuelle. La fiscalité dépend de votre situation et est susceptible d’évoluer. Tout investissement en actions comporte un risque de perte en capital ; les performances passées ne préjugent pas des performances futures.</p>', cls="section--tight")
    body += cta_band("Structurons votre pilier actions","Choix de l’enveloppe, allocation en ETF et articulation avec vos autres placements : construisons une stratégie cohérente et fiscalement optimisée.")
    page("pea.html","PEA — Plan d’Épargne en Actions",
         "PEA en 2026 : fonctionnement, rendement, fiscalité (CSG 18,6 %, exonération d’IR après 5 ans), plafonds, comparatif PEA / PEA-PME / assurance-vie / CTO / PER et ouverture.", body)

def build_per_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements financiers","placements-financiers.html"),("Solutions retraite",None)]
    body = page_hero("Solutions retraite — le PER",
        "Entre 30 % et 50 % des revenus disparaissent au passage à la retraite. Le Plan d’Épargne Retraite (PER) permet de se constituer un capital tout en réduisant son impôt sur le revenu.",
        crumbs)

    body += section(feature_row("assets/img/retraite.jpg","Plan d’Épargne Retraite","En bref",
        "Préparer la retraite, en réduisant son impôt",
        ["Créé par la loi PACTE, le PER unifie les anciens dispositifs (PERP, Madelin, PERCO, article 83) : chaque versement est déductible du revenu imposable, générant une économie d’impôt immédiate.",
         "L’épargne fructifie jusqu’à la retraite, puis se récupère en capital, en rente viagère ou en combinant les deux."],
        rev=True, checklist=["Déduction des versements du revenu imposable","Cible idéale : TMI ≥ 30 % et horizon > 10 ans","Sortie libre en capital ou en rente"]))

    body += section(sec_head("Synthèse","L’essentiel sur le PER", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Plafonds de déduction 2026 : jusqu’à 37 680 € (salariés), 88 911 € (TNS)",
            "Économie d’impôt proportionnelle à votre tranche marginale (TMI)",
            "Bloqué jusqu’à la retraite, sauf 7 cas de déblocage anticipé",
        ]) + '</ul>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Sortie au choix : capital, rente viagère ou panachage",
            "Plafonds non utilisés reportables sur 3 ans, mutualisables entre conjoints",
            "Complémentaire de l’assurance-vie — pas un concurrent",
        ]) + '</ul></div>', cls="section band-cream")

    body += blocks_section("Mécanisme","L’avantage fiscal à l’entrée",
        [("text","Une économie d’impôt proportionnelle à la TMI",
            ["Chaque euro versé (dans la limite des plafonds) se déduit du revenu imposable. À TMI 30 %, 1 000 € versés génèrent 300 € d’économie d’impôt ; à 41 %, 410 €.",
             "Contrepartie : à la sortie, le capital déduit est imposé au barème de l’IR. L’avantage tient au différentiel de TMI, généralement plus faible à la retraite qu’en activité."]),
         ("cards","Déduire ou non ses versements ?",[
            ("scale","TMI actuelle > future","Déduire : l’économie immédiate l’emporte."),
            ("compass","TMI actuelle < future","Ne pas déduire : capital exonéré d’IR à la sortie."),
            ("coins","Plafonds reportables","Les plafonds non utilisés se cumulent sur 3 ans."),
            ("concierge","Mutualisation","Optimisation des plafonds à l’échelle du foyer fiscal."),
         ])])

    body += blocks_section("Architecture","Les 3 compartiments du PER",
        [("cards","Une origine de fonds par compartiment",[
            ("coins","C1 · Versements volontaires","Épargne personnelle — sortie en capital ou en rente."),
            ("treasury","C2 · Épargne salariale","Intéressement, participation, abondement — capital ou rente."),
            ("retire","C3 · Versements obligatoires","Cotisations employeur — sortie en rente uniquement."),
         ]),
         ("text","Trois types de PER",
            ["PER individuel (PERIN) : accessible à tous, sans condition de statut. PER collectif (PERECO) : proposé par l’employeur, alimenté par l’épargne salariale. PER obligatoire (PERO) : pour certaines catégories de salariés, à adhésion obligatoire."])],
        cls="section band-cream")

    body += section(sec_head("Comparatif","PER ou assurance-vie ?", "Deux logiques complémentaires, à articuler selon vos objectifs.", center=True) +
        '<div class="table-wrap" style="margin-top:40px" data-reveal><table class="ptable">'
        '<thead><tr><th>Critère</th><th>PER</th><th>Assurance-vie</th></tr></thead><tbody>'
        + "".join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in [
            ("Avantage fiscal à l’entrée","Déduction du revenu imposable","Aucun"),
            ("Disponibilité","Bloqué jusqu’à la retraite (sauf cas)","Libre, surtout après 8 ans"),
            ("Fiscalité à la sortie","IR (capital) + PS sur les gains","PFU réduit après 8 ans (abattement)"),
            ("Transmission","Abattement 152 500 € (décès avant 70 ans)","Abattement 152 500 € (primes avant 70 ans)"),
            ("Objectif principal","Défiscalisation immédiate, retraite","Épargne disponible, transmission"),
        ]) + '</tbody></table></div>'
        '<p class="muted center" style="margin:16px auto 0;max-width:80ch" data-reveal>Pour un patrimoine important, les deux enveloppes se cumulent : le PER optimise la fiscalité courante, l’assurance-vie la disponibilité et la transmission.</p>')

    body += blocks_section("Déblocage","À la retraite & par anticipation",
        [("cards","La sortie à la retraite",[
            ("coins","100 % en capital","Versement unique ou fractionné, pour lisser l’impact fiscal."),
            ("retire","100 % en rente","Des revenus réguliers à vie, avec réversion possible."),
            ("scale","Capital + rente","Financer un projet tout en sécurisant des revenus."),
         ]),
         ("checklist","Les 7 cas de déblocage anticipé",
            ["Achat de la résidence principale (seul cas imposable)","Décès du conjoint ou partenaire de PACS","Invalidité (titulaire, conjoint ou enfant)","Surendettement","Fin de droits au chômage","Liquidation judiciaire (TNS)","Expiration des droits (mandataire social)"])],
        )

    body += blocks_section("Transmission","Le PER au décès",
        [("text","Une fiscalité selon l’âge au décès",
            ["Décès avant 70 ans : abattement de 152 500 € par bénéficiaire, puis 20 % à 31,25 %. Après 70 ans : abattement global de 30 500 €, puis droits de succession.",
             "Le conjoint ou partenaire de PACS est totalement exonéré. La clause bénéficiaire mérite, comme en assurance-vie, une rédaction soignée et actualisée."]),
         ("checklist","Les erreurs à éviter",
            ["Ouvrir un PER avec une TMI faible (11 % ou non imposable)","Négliger son plafond de déduction disponible","Ignorer les frais (entrée, gestion, arbitrage)","Choisir la gestion libre sans maîtriser les marchés","Omettre de désigner un bénéficiaire","Sous-estimer la fiscalité de sortie"])],
        cls="section band-cream")

    body += section(faq_block("Questions fréquentes","Vos questions sur le PER", [
        ("Quels sont les avantages fiscaux du PER ?",
         "<p>La déduction des versements du revenu imposable : à TMI 30 %, 5 000 € versés économisent 1 500 € d’impôt. Les plafonds 2026 atteignent 37 680 € (salariés) et 88 911 € (TNS).</p>"),
        ("Peut-on récupérer son argent avant la retraite ?",
         "<p>Oui, dans 7 cas : achat de la résidence principale (seul cas imposable) et six accidents de la vie (décès du conjoint, invalidité, surendettement, fin de droits chômage, liquidation judiciaire TNS, expiration des droits mandataire social).</p>"),
        ("PER ou assurance-vie ?",
         "<p>Le PER offre une déduction à l’entrée mais bloque l’épargne ; l’assurance-vie n’offre pas d’avantage à l’entrée mais reste disponible. Les deux se complètent selon vos objectifs.</p>"),
        ("Le PER est-il intéressant après 60 ans ?",
         "<p>Oui dans certains cas : TMI élevée avec versement puis sortie rapide en capital, ou objectif de transmission (abattement de 152 500 € par bénéficiaire en cas de décès avant 70 ans).</p>"),
        ("Faut-il déduire ses versements ?",
         "<p>Si votre TMI actuelle est supérieure à celle anticipée à la retraite : oui. Si elle est plus faible aujourd’hui : il peut être préférable de ne pas déduire pour exonérer le capital à la sortie.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« Le PER ne remplace pas l’assurance-vie : il la complète, en transformant votre impôt en capacité d’épargne pour la retraite. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Information non contractuelle. La fiscalité dépend de votre situation et est susceptible d’évoluer. Les supports en unités de compte comportent un risque de perte en capital ; les performances passées ne préjugent pas des performances futures.</p>', cls="section--tight")
    body += cta_band("Préparons votre retraite","Calibrons ensemble vos versements, l’arbitrage déduction / non-déduction et la répartition entre PER, assurance-vie et autres enveloppes.")
    page("solutions-retraite.html","Solutions retraite — le PER",
         "PER en 2026 : avantage fiscal à l’entrée, plafonds, 3 compartiments, comparatif PER / assurance-vie, déblocage, transmission et erreurs à éviter.", body)

def build_capitalisation_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements financiers","placements-financiers.html"),("Contrat de capitalisation",None)]
    body = page_hero("Contrat de capitalisation",
        "Pour les personnes physiques comme morales, le contrat de capitalisation prépare la transmission tout en offrant une capacité de rendement attractive.",
        crumbs)

    body += section(feature_row("assets/img/mansion.jpg","Contrat de capitalisation","En bref",
        "Le cousin de l’assurance-vie, taillé pour la transmission",
        ["Multisupport (fonds en euros, unités de compte, actions, obligations, SCPI…), il offre une fiscalité des rachats identique à celle de l’assurance-vie pour les personnes physiques.",
         "Sa spécificité : il ne se dénoue pas au décès et peut être transmis du vivant — un atout majeur de structuration patrimoniale, y compris pour les sociétés et holdings."],
        rev=True, checklist=["Transmissible par donation (pleine propriété ou démembrement)","Accessible aux personnes morales (sociétés, holdings)","Antériorité fiscale conservée par les héritiers"]))

    body += blocks_section("Fonctionnement","Comment ça marche ?",
        [("cards","Une enveloppe souple",[
            ("shield","Fonds en euros","Capital garanti et rendement annuel fixé par l’assureur."),
            ("chart","Unités de compte","Actions, obligations, OPCVM, SCPI pour dynamiser la performance."),
            ("compass","Modes de gestion","Libre, profilée ou sous mandat, selon votre profil."),
            ("coins","Épargne disponible","Rachats partiels ou totaux possibles à tout moment."),
         ]),
         ("text","Souscription",
            ["Ouvert aux personnes physiques (sans limite d’âge) comme aux personnes morales. Versement initial puis versements complémentaires libres, sans plafond. Un délai de renonciation de 30 jours s’applique après l’acceptation."])])

    body += blocks_section("Fiscalité","La fiscalité du contrat de capitalisation",
        [("text","Au rachat : comme l’assurance-vie",
            ["La fiscalité des gains au rachat est identique à celle de l’assurance-vie et dépend de l’ancienneté du contrat et de la date des versements. Après 8 ans, un abattement annuel s’applique (4 600 € pour une personne seule, 9 200 € pour un couple).",
             "Les prélèvements sociaux de 17,2 % s’appliquent aux gains. L’option pour le barème de l’IR reste possible si elle est plus favorable."]),
         ("checklist","Au décès & à la donation",
            ["Au décès : le contrat intègre l’actif successoral (pas d’abattement de 152 500 €)","Mais l’antériorité fiscale est conservée par les héritiers","Donation du vivant possible (droits calculés sur la valeur nominale)","Donation en démembrement : transmettre la nue-propriété, conserver les revenus"]),
         ("text","Pour les personnes morales",
            ["Un rendement forfaitaire annuel (indexé sur le TME) est intégré au résultat afin de lisser l’imposition sur la durée de vie du contrat, avec régularisation au rachat."])],
        cls="section band-cream")

    body += blocks_section("Transmission","Un outil de transmission puissant",
        [("text","La donation en démembrement",
            ["Le donateur conserve l’usufruit (et les revenus) tandis que la nue-propriété est transmise aux héritiers, valorisée selon l’âge de l’usufruitier. Au décès, la pleine propriété se reconstitue sans droits supplémentaires, l’antériorité fiscale étant conservée.",
             "Combiné aux abattements de droit commun (100 000 € par enfant et par parent, renouvelables tous les 15 ans), c’est un levier efficace de transmission — y compris après 70 ans."]),
         ("checklist","Pourquoi le démembrement",
            ["Acquisition de la nue-propriété avec décote liée à l’âge","Abattements de donation optimisés","Reconstitution de la pleine propriété sans fiscalité au décès","Conservation des revenus par l’usufruitier"])])

    body += blocks_section("Atouts & limites","Avantages et points de vigilance",
        [("checklist","Les atouts",
            ["Épargne disponible et diversifiée (fonds €, UC, SCPI…)","Fiscalité des rachats avantageuse après 8 ans","Transmission par donation, du vivant","Accessible aux personnes morales (trésorerie, holdings)"]),
         ("checklist","Les points de vigilance",
            ["Pas de clause bénéficiaire ni d’abattement de 152 500 €","Au décès : droits de succession de droit commun","Frais d’entrée et de gestion à comparer","Risque de perte en capital sur les unités de compte"])],
        cls="section band-cream")

    body += section(faq_block("Questions fréquentes","Vos questions sur le contrat de capitalisation", [
        ("Quelle différence avec l’assurance-vie ?",
         "<p>Même fiscalité des rachats, mais le contrat de capitalisation ne se dénoue pas au décès : il peut être transmis du vivant (donation, démembrement) et détenu par une personne morale. En revanche, il ne bénéficie pas de l’abattement successoral de 152 500 €.</p>"),
        ("Une société peut-elle en souscrire un ?",
         "<p>Oui. C’est l’un de ses atouts : sociétés patrimoniales et holdings peuvent y loger leur trésorerie. Un rendement forfaitaire (indexé sur le TME) est alors intégré au résultat pour lisser l’imposition.</p>"),
        ("Comment optimise-t-il la transmission ?",
         "<p>Par donation du vivant, idéalement en démembrement : on transmet la nue-propriété (valorisée selon l’âge) en conservant l’usufruit. Au décès, la pleine propriété se reconstitue sans droits supplémentaires.</p>"),
        ("Quelle fiscalité au rachat ?",
         "<p>Identique à l’assurance-vie : selon l’ancienneté et la date des versements, avec abattement annuel après 8 ans (4 600 € / 9 200 €) et prélèvements sociaux de 17,2 %.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« Là où l’assurance-vie excelle dans la transmission au décès, le contrat de capitalisation organise la transmission du vivant — et s’ouvre aux personnes morales. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Information non contractuelle. La fiscalité dépend de votre situation et est susceptible d’évoluer. Les supports en unités de compte comportent un risque de perte en capital ; les performances passées ne préjugent pas des performances futures.</p>', cls="section--tight")
    body += cta_band("Structurons votre transmission","Détention, donation ou démembrement, personne physique ou morale : étudions le rôle du contrat de capitalisation dans votre stratégie.")
    page("contrat-capitalisation.html","Contrat de capitalisation",
         "Contrat de capitalisation : fonctionnement, fiscalité des rachats (comme l’assurance-vie), transmission par donation et démembrement, détention par les personnes morales.", body)

def build_assurance_vie_page():
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),
              ("Placements financiers","placements-financiers.html"),("Contrats d’assurance-vie",None)]
    body = page_hero("Contrats d’assurance-vie",
        "Pilier central du patrimoine en France, l’assurance-vie réunit capitalisation, transmission et liquidité dans une seule enveloppe — un avantage renforcé en 2026.",
        crumbs)

    body += section(feature_row("assets/img/serenite.jpg","Assurance-vie","En bref",
        "Trois fonctions patrimoniales en une enveloppe",
        ["Capitalisation sans frottement fiscal, transmission avantageuse et liquidité permanente : l’assurance-vie cumule des atouts qu’aucune autre enveloppe ne réunit.",
         "En 2026, ses prélèvements sociaux restent à 17,2 % (contre 18,6 % sur le CTO et le PER), consolidant son avantage structurel."],
        rev=True, checklist=["Capitalisation sans imposition tant qu’il n’y a pas de rachat","Abattement de 152 500 € par bénéficiaire (avant 70 ans)","Liquidité totale et aucun plafond de versement"]))

    body += section(sec_head("Synthèse","L’essentiel à retenir", center=False) +
        '<div class="grid grid-2" style="margin-top:24px;gap:8px 48px" data-reveal>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Trois fonctions : capitalisation, transmission et disponibilité",
            "PS maintenus à 17,2 % en 2026 (vs 18,6 % CTO / PER)",
            "Antériorité fiscale de 8 ans : ouvrir tôt, même avec un petit versement",
        ]) + '</ul>'
        '<ul class="checklist">' + "".join("<li>%s</li>" % x for x in [
            "Supports variés : fonds euros, UC, ETF, SCPI, private equity, structurés",
            "Transmission hors succession (152 500 € par bénéficiaire avant 70 ans)",
            "Un pilier d’allocation, à articuler avec PER, PEA et immobilier",
        ]) + '</ul></div>', cls="section band-cream")

    body += blocks_section("Fonctionnement","Une enveloppe capitalisante multisupport",
        [("text","Le principe",
            ["L’assurance-vie n’est pas une assurance décès : c’est un produit d’épargne. Les gains restent dans l’enveloppe sans imposition tant qu’aucun rachat n’est effectué — la croissance se fait en capitalisation, sans l’érosion fiscale annuelle d’un compte-titres.",
             "Aucun plafond de versement ; la détention de plusieurs contrats est autorisée et même recommandée."]),
         ("cards","Disponibilité & souplesse",[
            ("coins","Versements libres","Initial, complémentaires ou programmés, sans plafond."),
            ("compass","Rachats à tout moment","Partiels ou total ; seule la fiscalité varie avec l’ancienneté."),
            ("scale","Avance sur contrat","Des liquidités sans désinvestir ni déclencher l’impôt."),
            ("shield","Garantie FGAP","70 000 € par assureur : d’où l’intérêt de la multi-détention."),
         ]),
         ("text","Transfert (loi PACTE)",
            ["Depuis la loi PACTE, un contrat peut être transféré vers un contrat plus compétitif du même assureur en conservant l’antériorité fiscale ; changer d’assureur impose en revanche un rachat."])])

    body += blocks_section("Fiscalité 2026","La fiscalité des rachats",
        [("text","Seuls les gains sont imposés",
            ["La fiscalité dépend de la date des versements et de l’ancienneté du contrat. Après 8 ans, le taux d’IR tombe à 7,5 % (primes ≤ 150 000 €) et un abattement annuel s’applique (4 600 € / 9 200 €)."])]
        )
    body += section('<div class="table-wrap" data-reveal style="margin-top:-8px"><table class="ptable">'
        '<thead><tr><th>Ancienneté</th><th>Impôt sur le revenu</th><th>Prélèvements sociaux</th><th>Total</th><th>Abattement annuel</th></tr></thead><tbody>'
        + "".join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in [
            ("Moins de 8 ans","12,8 %","17,2 %","30 %","Aucun"),
            ("8 ans + (primes ≤ 150 000 €)","7,5 %","17,2 %","24,7 %","4 600 € / 9 200 €"),
            ("8 ans + (primes > 150 000 €)","12,8 %","17,2 %","30 %","4 600 € / 9 200 €"),
        ]) + '</tbody></table></div>'
        '<p class="muted" style="margin-top:16px;max-width:80ch" data-reveal>Avantage 2026 : les PS de l’assurance-vie restent à 17,2 % alors qu’ils passent à 18,6 % sur le CTO et le PER — un différentiel structurel pour les patrimoines importants. La sortie en rente viagère et l’IFI (pour les UC immobilières) obéissent à des règles spécifiques.</p>',
        cls="section")

    body += blocks_section("Supports","L’univers d’investissement",
        [("cards","Du plus sûr au plus dynamique",[
            ("shield","Fonds en euros","Capital garanti et effet cliquet ; rendement modéré."),
            ("chart","Unités de compte","OPCVM, actions, obligations : performance contre risque."),
            ("globe","ETF & trackers","Réplication d’indices à frais réduits (0,1-0,3 %)."),
            ("building","SCPI / OPCI","Exposition immobilière et revenus locatifs (IFI)."),
            ("puzzle","Private equity (FCPR)","Non coté, horizon long, potentiel élevé."),
            ("doc","Produits structurés","Couple rendement / protection calibré sur-mesure."),
         ]),
         ("text","Modes de gestion & frais",
            ["Gestion libre, pilotée ou sous mandat selon votre profil. Les frais (entrée, gestion du contrat, arbitrage, frais des supports) sont le principal levier de rendement net : viser 0 % d’entrée, ~0,5 % de gestion UC et des ETF à 0,2 % constitue le socle d’un contrat efficient."])],
        cls="section band-cream")

    body += blocks_section("Transmission","Transmettre grâce à l’assurance-vie",
        [("cards","Un régime dérogatoire",[
            ("concierge","Avant 70 ans","152 500 € par bénéficiaire, puis 20 % jusqu’à 852 500 €, 31,25 % au-delà."),
            ("coins","Après 70 ans","Abattement global de 30 500 € ; les gains restent exonérés."),
            ("scale","Clause bénéficiaire","Désignation libre ; rédaction sur-mesure pour les cas complexes."),
            ("compass","Démembrement","Usufruit au conjoint, nue-propriété aux enfants : optimisation avancée."),
         ]),
         ("text","Multi-contrats par objectif",
            ["Affecter chaque contrat à un objectif (capitalisation dynamique, transmission sécurisée, revenus complémentaires) et diversifier les assureurs au-delà du seuil FGAP de 70 000 €. Attention aux primes manifestement exagérées (art. L132-13)."])])

    body += blocks_section("Arbitrage","Française ou luxembourgeoise ?",
        [("text","Deux modèles complémentaires",
            ["L’assurance-vie française reste pertinente pour la majorité (accessible dès 100 €, large choix, garantie FGAP). Au-delà de ~250 000 € d’encours, la version luxembourgeoise mérite une analyse : triangle de sécurité, super-privilège, univers élargi (fonds dédiés, private equity, multi-devises) et portabilité internationale."])])
    body += section('<p data-reveal><a class="link-arrow" href="contrat-luxembourgeois.html">Découvrir le contrat luxembourgeois %s</a></p>' % arrow(), cls="section--tight")

    body += section(sec_head("Comparatif","Assurance-vie, PER, PEA & CTO en 2026", "Chaque enveloppe répond à un objectif ; depuis 2026, la hausse des PS crée un différentiel inédit.", center=True) +
        '<div class="table-wrap" style="margin-top:40px" data-reveal><table class="ptable">'
        '<thead><tr><th>Critère</th><th>Assurance-vie</th><th>PER</th><th>PEA</th><th>CTO</th></tr></thead><tbody>'
        + "".join('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in [
            ("Plafond de versement","Aucun","Déduction plafonnée","150 000 €","Aucun"),
            ("Prélèvements sociaux","17,2 %","18,6 %","17,2 %","18,6 %"),
            ("IR sur les gains","7,5 % après 8 ans","Barème à la sortie","0 % après 5 ans","12,8 % (PFU)"),
            ("Avantage à l’entrée","Non","Oui (déduction)","Non","Non"),
            ("Liquidité","Totale","Bloqué (sauf cas)","Totale après 5 ans","Totale"),
            ("Transmission","152 500 € / bénéf.","Succession (sauf assurantiel)","Succession","Succession"),
        ]) + '</tbody></table></div>')

    body += section(faq_block("Questions fréquentes","Vos questions sur l’assurance-vie", [
        ("Quel est le plafond de l’assurance-vie ?",
         "<p>Aucun plafond légal de versement. Les montants cités (150 000 €, 152 500 €) sont des seuils fiscaux : le premier conditionne le taux réduit après 8 ans, le second l’abattement par bénéficiaire au décès.</p>"),
        ("L’argent est-il bloqué ?",
         "<p>Non : rachats partiels ou total à tout moment. La fiscalité est simplement plus douce après 8 ans. L’avance sur contrat permet d’obtenir des liquidités sans déclencher d’impôt.</p>"),
        ("Quelle fiscalité après 8 ans ?",
         "<p>7,5 % d’IR (primes ≤ 150 000 €) + 17,2 % de PS, soit 24,7 %, avec un abattement annuel de 4 600 € (seul) ou 9 200 € (couple) sur les gains retirés.</p>"),
        ("Peut-on avoir plusieurs contrats ?",
         "<p>Oui, sans limite — c’est recommandé pour diversifier les assureurs (garantie FGAP de 70 000 €), segmenter les objectifs et adapter chaque clause bénéficiaire.</p>"),
        ("Assurance-vie ou PER ?",
         "<p>L’assurance-vie offre liquidité et PS à 17,2 % ; le PER, une déduction à l’entrée mais un blocage jusqu’à la retraite. Les deux se combinent selon votre TMI et vos objectifs.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« La seule enveloppe à combiner capitalisation sans frottement, transmission hors succession et prélèvements sociaux à 17,2 % en 2026. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Information non contractuelle. La fiscalité dépend de votre situation et est susceptible d’évoluer. Les supports en unités de compte comportent un risque de perte en capital ; les performances passées ne préjugent pas des performances futures.</p>', cls="section--tight")
    body += cta_band("Optimisons votre assurance-vie","Choix du contrat, allocation des supports, clause bénéficiaire et articulation avec vos autres enveloppes : construisons une stratégie cohérente.")
    page("assurance-vie.html","Contrats d’assurance-vie",
         "Assurance-vie en 2026 : fonctionnement, fiscalité des rachats, supports (fonds euros, UC, ETF, SCPI, PE, structurés), transmission et comparatif des enveloppes.", body)

def build_pe_detail_page():
    parent = ("Solutions non cotées & Private Equity","private-equity.html")
    crumbs = [("Accueil","index.html"),("Nos solutions","nos-solutions.html"), parent,
              ("Fonds de Private Equity",None)]
    body = page_hero("Fonds de Private Equity & Capital-Investissement",
        "Investir dans le private equity, c’est miser sur l’économie réelle, loin de la volatilité des marchés cotés — un potentiel de performance élevé en contrepartie d’un horizon long et d’une liquidité réduite.",
        crumbs)

    body += section(feature_row("assets/img/mansion.jpg","Fonds de private equity","En bref",
        "Le socle du non coté",
        ["Le private equity finance des entreprises non cotées via des fonds spécialisés : après 3 à 10 ans de détention et de création de valeur, les participations sont cédées avec une plus-value potentielle.",
         "À la différence des marchés cotés, la gestion est active : les équipes interviennent directement sur la stratégie et les opérations des sociétés."],
        rev=True, checklist=["Exposition à l’économie réelle, peu corrélée aux marchés cotés","Potentiel de performance historiquement à deux chiffres","Horizon long (7-10 ans) et liquidité réduite"]))

    body += blocks_section("Fonctionnement","Comment fonctionne un fonds de private equity ?",
        [("cards","Le cycle d’investissement",[
            ("treasury","1 · Levée de fonds","Les capitaux sont réunis auprès des investisseurs (LPs)."),
            ("compass","2 · Sélection & due diligence","Analyse des finances, de la gouvernance et du potentiel."),
            ("growth","3 · Détention & création de valeur","Amélioration opérationnelle, build-up, croissance."),
            ("chart","4 · Sortie","Cession industrielle, LBO secondaire ou introduction en bourse."),
         ]),
         ("text","LPs & GPs",
            ["Les Limited Partners (LPs) apportent les capitaux (institutionnels, family offices, particuliers) ; les General Partners (GPs) gèrent le fonds. La rémunération des GPs combine des frais de gestion (~1,5-2 %) et un carried interest (souvent 20 % au-delà d’un seuil de performance), alignant leurs intérêts sur ceux des investisseurs."])])

    body += blocks_section("Stratégies","Les grandes stratégies d’investissement",
        [("cards","Du capital-risque au retournement",[
            ("growth","Venture Capital","Start-ups innovantes à fort potentiel (risque élevé)."),
            ("chart","Growth Equity","Accélérer des entreprises établies (risque modéré)."),
            ("scale","LBO / Buy-out","Rachat avec effet de levier (risque modéré à élevé)."),
            ("compass","Capital-retournement","Redresser des entreprises en difficulté (risque très élevé)."),
            ("puzzle","Fonds secondaires","Racheter des parts de fonds existants (meilleure visibilité)."),
            ("building","Infrastructure / Immobilier","Actifs tangibles à cash-flows réguliers."),
         ])], cls="section band-cream")

    body += section(sec_head("Performance","Comment mesurer la performance ?", "Des indicateurs adaptés à un actif long terme et illiquide.", center=True) +
        '<div class="grid grid-3" style="margin-top:40px">' + tiles([
            ("chart","TRI","La rentabilité annualisée, intégrant le calendrier des flux."),
            ("growth","TVPI","La valeur totale créée par euro investi (distribué + valorisation)."),
            ("compass","Effet « vintage »","L’année de lancement du fonds influence fortement le résultat."),
        ]) + '</div>'
        '<p class="muted center" style="margin:24px auto 0;max-width:80ch" data-reveal>Sur longue période, les indices de capital-investissement ont historiquement surperformé les grands indices actions, nets de frais. Ces données sont indicatives, varient selon les millésimes, stratégies et régions, et ne préjugent pas des performances futures.</p>')

    body += blocks_section("Accès","Avantages, limites et voies d’accès",
        [("checklist","Les atouts",
            ["Diversification peu corrélée aux marchés cotés","Exposition à l’économie réelle et à la croissance privée","Gestion active et création de valeur"]),
         ("checklist","Les contraintes",
            ["Illiquidité : capitaux immobilisés 7 à 10 ans","Risque de perte en capital","Frais (gestion + carried interest)","Appels de fonds échelonnés à anticiper"]),
         ("cards","Les voies d’accès",[
            ("puzzle","FCPR","Accessibles dès quelques milliers d’euros, exonération des plus-values après 5 ans (conditions)."),
            ("doc","FPCI","Pour investisseurs avertis, tickets plus élevés (souvent ≥ 100 000 €)."),
            ("scale","FCPI / FIP","Réduction d’impôt à l’entrée, sur des PME éligibles."),
            ("shield","UC en assurance-vie / PER","Intégrer le non coté dans un cadre fiscal avantageux."),
         ]),
         ("text","Allocation recommandée",
            ["Le private equity se conçoit comme une poche de diversification : une allocation de l’ordre de 5 à 20 % du patrimoine selon le profil, un horizon d’au moins 7 à 10 ans et une diversification par millésime, secteur et géographie."])],
        cls="section band-cream")

    body += blocks_section("Tendances","Le marché en 2026",
        [("tags","Dynamiques de marché",
            ["Spécialisation sectorielle (tech, santé, énergie)","Intégration des critères ESG","Démocratisation (loi PACTE, loi Industrie Verte, ELTIF)","Essor du marché secondaire","Dette privée & infrastructures"]),
         ("text","La démocratisation, avec discernement",
            ["L’accès s’ouvre aux particuliers via l’assurance-vie et des véhicules réglementés. Cette ouverture impose de la prudence : l’illiquidité et le risque de perte en capital exigent une sélection rigoureuse et un accompagnement."])])

    body += blocks_section("Méthode","Investir étape par étape",
        [("checklist","Notre démarche",
            ["Comprendre précisément le véhicule et sa stratégie","Vérifier l’adéquation à votre profil et votre horizon","Choisir la bonne enveloppe (FCPR, FPCI, assurance-vie, PER)","Diversifier (millésimes, secteurs, géographies)","Sélectionner les meilleures maisons de gestion (track record, frais, alignement)","Suivre l’investissement dans la durée"])])

    body += section(faq_block("Questions fréquentes","Vos questions sur le private equity", [
        ("Qu’est-ce que le private equity ?",
         "<p>L’investissement dans des entreprises non cotées : on apporte des capitaux pour financer leur développement, puis on cède les participations après 3 à 10 ans avec une plus-value potentielle.</p>"),
        ("Comment y investir ?",
         "<p>Via des fonds réglementés (FCPR, FCPI, FIP, FPCI) supervisés par l’AMF, ou en unités de compte au sein d’une assurance-vie ou d’un PER. Nous sélectionnons les fonds adaptés à votre profil.</p>"),
        ("Qu’est-ce qu’un fonds de fonds ?",
         "<p>Un fonds qui investit dans plusieurs fonds de private equity, offrant une diversification immédiate par gestionnaire, stratégie, secteur et géographie.</p>"),
        ("Quelle part de mon patrimoine y consacrer ?",
         "<p>En général une poche de diversification (souvent 5 à 20 % selon le profil), avec un horizon long et la capacité à supporter l’illiquidité.</p>"),
    ]))

    body += section('<div class="quote" data-reveal><p>« Une classe d’actifs structurante, à intégrer avec discernement et sur le long terme : la patience est l’une des clés de la réussite en private equity. »</p><cite>La Financière de Rochechouart</cite></div>', cls="section--tight band-dark")
    body += section('<p class="muted center" style="max-width:80ch;margin-inline:auto" data-reveal>Le private equity comporte un risque de perte en capital et un risque de liquidité (capitaux immobilisés plusieurs années). Les performances passées ne préjugent pas des performances futures.</p>', cls="section--tight")
    body += cta_band("Accédez au private equity","Sélection des fonds, calibrage de l’allocation et choix de l’enveloppe : construisons votre exposition au non coté, en architecture ouverte.")
    page("fonds-private-equity.html","Fonds de Private Equity & Capital-Investissement",
         "Private equity : fonctionnement (LPs/GPs, cycle), stratégies (venture, growth, LBO, retournement, secondaires), performance (TRI/TVPI), accès (FCPR/FPCI) et tendances 2026.", body)

STRUCT_SOLUTIONS = [
    ("scale","Organisation & structures de détention","SCI, holding, société civile, démembrement : détenir intelligemment.","organisation-patrimoniale.html"),
    ("doc","Optimisation fiscale & flux","Structurer revenus, arbitrages et capitalisation pour le rendement net.","optimisation-fiscale-flux.html"),
    ("concierge","Transmission & gouvernance","Protéger la famille et organiser la continuité du patrimoine.","transmission-gouvernance.html"),
    ("treasury","Structuration du dirigeant & cession","Articuler patrimoine professionnel et privé, préparer la liquidité.","structuration-dirigeant.html"),
]

def build_structuration():
    body = page_hero("Structuration juridique et fiscale",
        "Au-delà du choix des placements, la manière dont les actifs sont détenus, organisés, financés et transmis détermine l’efficacité patrimoniale, la protection familiale et la pérennité du patrimoine.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Structuration juridique et fiscale",None)])
    body += intro("Notre approche","Une architecture patrimoniale cohérente",
        "Une stratégie performante ne repose pas seulement sur le rendement : elle exige une architecture intégrant droit civil, fiscalité, gouvernance, protection et transmission.",
        ["Chef d’entreprise, investisseur, famille patrimoniale, profession libérale ou détenteur d’actifs : une structuration adaptée transforme un patrimoine « détenu » en patrimoine « piloté ».",
         "Notre approche est globale, indépendante et sur-mesure — en lien étroit avec vos notaires, avocats et experts-comptables, dans le strict respect du cadre réglementaire."],
        "assets/img/paris-colonnade.jpg","Ingénierie patrimoniale", rev=True)
    body += section('<div class="quote" data-reveal><p>« Transformer un patrimoine “détenu” en patrimoine “piloté” : créer une cohérence durable entre performance, sécurité, flexibilité et transmission. »</p><cite>Notre objectif</cite></div>', cls="section--tight band-dark")
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">Nos expertises</p><h2 class="title-lg">Quatre piliers d’ingénierie patrimoniale</h2><hr class="rule">'
        '<p class="lede">De la détention des actifs à la structuration du dirigeant, une vision d’ensemble.</p></div>'
        '<div class="grid grid-4" style="margin-top:54px">' + tiles(STRUCT_SOLUTIONS) + '</div>', cls="section band-cream")
    body += cta_band("Structurons votre patrimoine","Un bilan juridique et fiscal révèle souvent des optimisations majeures. Étudions votre situation en toute confidentialité.")
    page("structuration-juridique.html","Structuration juridique et fiscale","Organisation et structures de détention, optimisation fiscale et des flux, transmission et gouvernance, structuration du dirigeant et de la cession.", body)

def build_structuration_pages():
    parent = ("Structuration juridique et fiscale","structuration-juridique.html")

    sub_page("organisation-patrimoniale.html","Organisation patrimoniale & structures de détention","Comment détenir intelligemment ses actifs",
        "Avant de sélectionner des investissements, déterminer comment les actifs seront détenus et articulés — pour optimiser leur efficacité juridique, fiscale et successorale.",
        "assets/img/mansion.jpg","Organisation patrimoniale",
        ["La question centrale n’est pas seulement « dans quoi investir », mais « comment détenir intelligemment ses actifs » : le mode de détention influence la fiscalité, la gouvernance, la protection, la transmission et le financement.",
         "Dès que le patrimoine se développe, se diversifie ou intègre des enjeux familiaux ou entrepreneuriaux, une structuration plus élaborée devient souvent nécessaire."],
        ["Une architecture cohérente entre vos sphères patrimoniales","Des outils juridiques adaptés à votre profil","Du patrimoine « détenu » au patrimoine « piloté »"],
        [("cards","Les principales structures",[
            ("building","SCI","Détenir, organiser et transmettre des actifs immobiliers."),
            ("treasury","Holding patrimoniale","Centraliser participations, dividendes et réserves."),
            ("puzzle","Société civile patrimoniale","Centraliser des actifs variés dans une logique de gouvernance."),
            ("scale","Démembrement de propriété","Séparer usufruit et nue-propriété pour transmettre."),
         ]),
         ("checklist","Les implications de chaque structure",
            ["Fiscalité (IR, IS, plus-values, revenus)","Gouvernance","Protection du dirigeant et des associés","Transmission","Liquidité","Financement","Coûts administratifs","Souplesse de réorganisation"]),
         ("tags","Des dimensions déterminantes",
            ["Protection du conjoint et des héritiers","Patrimoine privé vs risque professionnel","Préparation de cession","Centralisation des réserves","Gouvernance familiale","Maîtrise du contrôle"]),
        ],
        [("Optimisation fiscale & flux","optimisation-fiscale-flux.html"),("Transmission & gouvernance","transmission-gouvernance.html"),("Structuration du dirigeant","structuration-dirigeant.html")],
        "Organisation patrimoniale et structures de détention : SCI, holding, société civile, démembrement et structuration multi-entités.", parent)

    sub_page("optimisation-fiscale-flux.html","Optimisation fiscale & stratégie des flux","Maximiser la valeur nette, pas seulement réduire l’impôt",
        "Construire une stratégie globale qui améliore durablement l’efficience économique du patrimoine, dans le respect du cadre légal et réglementaire.",
        "assets/img/paris-courtyard.jpg","Optimisation fiscale et flux",
        ["L’enjeu n’est pas seulement de « réduire l’impôt », mais de structurer intelligemment les flux, les revenus, les arbitrages et les véhicules de détention pour optimiser le rendement net et la conservation de valeur.",
         "La création de valeur patrimoniale dépend souvent davantage de la capacité à structurer les flux que du rendement brut lui-même."],
        ["Distinguer consommation, revenu et capitalisation","Cohérence rendement brut / rendement net","Conformité et robustesse juridique"],
        [("checklist","Nos axes de travail",
            ["Structuration des revenus (rémunération / dividendes)","Fiscalité des placements et enveloppes adaptées","Gestion et temporalité des plus-values","Flux entre sociétés et patrimoine privé","Optimisation immobilière (revenus, financement)","Allocation : rendement brut vs net après fiscalité"]),
         ("cards","Des leviers selon vos objectifs",[
            ("treasury","Capitaliser plutôt que distribuer","Privilégier la création de valeur de long terme."),
            ("scale","Arbitrer rémunération / dividendes","Trouver l’équilibre le plus efficient."),
            ("puzzle","Structurer via holding ou société civile","Organiser la détention et les flux."),
            ("compass","Segmenter privé et professionnel","Clarifier et sécuriser chaque sphère."),
         ]),
         ("tags","Une vision transversale",
            ["Court terme vs long terme","Revenus vs capital","Personnel vs sociétal","France et international","Liquidité / optimisation / gouvernance"]),
        ],
        [("Optimiser votre fiscalité","optimiser-fiscalite.html"),("Organisation patrimoniale","organisation-patrimoniale.html"),("Holdings & réserves stratégiques","holdings-reserves.html")],
        "Optimisation fiscale et stratégie des flux : structurer revenus, plus-values et capitalisation pour maximiser la valeur nette dans la durée.", parent)

    sub_page("transmission-gouvernance.html","Transmission, protection familiale & gouvernance","D’une succession subie à une transmission organisée",
        "Organiser, protéger et pérenniser le patrimoine familial dans le temps, en anticipant les enjeux civils, fiscaux, humains et entrepreneuriaux.",
        "assets/img/retraite.jpg","Transmission et gouvernance familiale",
        ["Sans structuration, un patrimoine s’expose à des risques majeurs : conflits familiaux, dilution, fiscalité subie, déséquilibres successoraux ou fragilisation du conjoint survivant.",
         "L’objectif est double : préserver les intérêts de la famille et assurer la continuité du patrimoine dans des conditions maîtrisées et alignées sur vos volontés."],
        ["Protéger le conjoint et les héritiers","Préserver la cohérence patrimoniale","Anticiper plutôt que subir"],
        [("checklist","Une analyse globale de votre situation",
            ["Composition du patrimoine","Structure familiale","Régime matrimonial","Héritiers multiples","Patrimoine professionnel","Volontés de répartition","Protection du conjoint","Gouvernance future"]),
         ("cards","Les principaux leviers",[
            ("coins","Donation simple ou graduelle","Transmettre par anticipation, lisser certains effets."),
            ("scale","Donation-partage","Répartir et limiter les risques de contestation."),
            ("doc","Démembrement de propriété","Transmettre en conservant revenus et contrôle."),
            ("concierge","Clauses & pactes familiaux","Encadrer pouvoirs, cessions et continuité."),
            ("shield","Assurance-vie & clause bénéficiaire","Une transmission financière souple et ciblée."),
            ("compass","Régime matrimonial","Protéger le conjoint et sécuriser le cadre civil."),
         ]),
         ("tags","La gouvernance patrimoniale",
            ["Organiser le contrôle","Protéger la vision familiale","Continuité de gestion","Éviter la dilution stratégique","Stabilité intergénérationnelle"]),
        ],
        [("Céder ou transmettre","ceder-transmettre.html"),("Organisation patrimoniale","organisation-patrimoniale.html"),("Accès à notre Family Office","family-office.html")],
        "Transmission, protection familiale et gouvernance patrimoniale : donations, démembrement, pactes familiaux et assurance-vie.", parent,
        quote="Transformer le patrimoine en héritage organisé plutôt qu’en succession subie.")

    sub_page("structuration-dirigeant.html","Structuration du dirigeant, cession & ingénierie long terme","Articuler patrimoine professionnel et privé",
        "Le patrimoine du dirigeant, souvent concentré autour de l’entreprise, exige une véritable ingénierie stratégique — pas une simple logique d’investissement.",
        "assets/img/serenite.jpg","Structuration patrimoniale du dirigeant",
        ["Titres, dividendes, trésorerie, immobilier d’exploitation, garanties personnelles : cette concentration crée autant d’opportunités considérables que de vulnérabilités majeures.",
         "Organiser la création de valeur entrepreneuriale pour la sécuriser, l’optimiser et, le moment venu, la transformer efficacement en patrimoine durable."],
        ["Protéger le patrimoine privé du risque professionnel","La holding, passerelle entre activité et patrimoine","Transformer la liquidité en plateforme patrimoniale"],
        [("checklist","Les enjeux que nous adressons",
            ["Protection du patrimoine privé","Optimisation de la rémunération et des flux","Structuration de holdings","Organisation de la capitalisation","Préparation de cession ou transmission","Réduction du risque de concentration","Sécurisation post-liquidité"]),
         ("cards","La préparation de cession",[
            ("compass","Audit patrimonial pré-cession","Cartographier la situation et les objectifs."),
            ("scale","Structuration juridique adaptée","Holdings, apport-cession, gouvernance."),
            ("treasury","Optimisation des flux de cession","Préparer les véhicules de réinvestissement."),
            ("puzzle","Diversification post-cession","Réallouer et sécuriser le capital après liquidité."),
         ]),
         ("tags","Des problématiques avancées",
            ["Management packages","OBO / LBO patrimonial","Family office structuré","Contrats luxembourgeois","Private equity","Gouvernance intergénérationnelle"]),
         ("text","Le cycle patrimonial du dirigeant",
            ["Création, croissance, sécurisation, liquidité, transmission : convertir la réussite entrepreneuriale en patrimoine organisé, résilient et transmissible."]),
        ],
        [("Céder ou transmettre","ceder-transmettre.html"),("Holdings & réserves stratégiques","holdings-reserves.html"),("Accès à notre Family Office","family-office.html")],
        "Structuration du dirigeant, cession et ingénierie patrimoniale long terme : holding, préparation de cession et sécurisation post-liquidité.", parent,
        quote="Transformer un événement de liquidité en plateforme patrimoniale durable.")


FO_SOLUTIONS = [
    ("compass","Pilotage patrimonial global","La tour de contrôle de l’ensemble de votre patrimoine.","pilotage-patrimonial-global.html"),
    ("scale","Ingénierie patrimoniale avancée","Structurer le patrimoine dans toutes ses dimensions.","ingenierie-patrimoniale.html"),
    ("chart","Allocation & architecture ouverte","Sélectionner librement les meilleures solutions du marché.","allocation-architecture-ouverte.html"),
    ("concierge","Gouvernance familiale & transmission","Préserver l’unité et organiser la continuité générationnelle.","gouvernance-familiale.html"),
]

def build_family_office():
    body = page_hero("Accès à notre Family Office",
        "Pour les dirigeants, familles patrimoniales, entrepreneurs et investisseurs recherchant bien plus qu’un conseil financier : une vision stratégique globale, indépendante et durable de leur patrimoine.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Accès à notre Family Office",None)])
    body += intro("Notre approche","L’architecte central de votre patrimoine",
        "Là où les enjeux deviennent complexes — juridique, financier, immobilier, private equity, fiscalité, transmission, gouvernance —, la véritable valeur réside dans la coordination, la cohérence et le pilotage global.",
        ["Nous ne nous limitons pas à la sélection de produits : nous construisons une gouvernance patrimoniale complète, pensée pour protéger, développer, structurer et transmettre votre patrimoine dans la durée.",
         "Totalement indépendants, nous travaillons en architecture ouverte, sans solutions captives, afin de sélectionner librement les meilleures expertises et partenaires selon vos objectifs exclusifs."],
        "assets/img/paris-courtyard.jpg","Family Office", rev=True)
    body += section('<div class="quote" data-reveal><p>« Agir comme l’architecte central de votre patrimoine — protéger, développer, structurer et transmettre dans la durée. »</p><cite>Notre rôle</cite></div>', cls="section--tight band-dark")
    body += section('<div class="center" style="max-width:700px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">Notre approche</p><h2 class="title-lg">Quatre piliers, une gouvernance complète</h2><hr class="rule">'
        '<div class="tags" style="justify-content:center;margin-top:8px">'
        '<span class="tag">Vision stratégique</span><span class="tag">Ingénierie patrimoniale</span>'
        '<span class="tag">Sélection indépendante</span><span class="tag">Accompagnement long terme</span></div></div>'
        '<div class="grid grid-4" style="margin-top:48px">' + tiles(FO_SOLUTIONS) + '</div>', cls="section band-cream")
    body += cta_band("Découvrez notre Family Office","L’accès à notre Family Office est réservé à un cercle restreint. Rencontrons-nous pour en évaluer la pertinence, en toute confidentialité.")
    page("family-office.html","Accès à notre Family Office","Pilotage patrimonial global, ingénierie avancée, allocation en architecture ouverte et gouvernance familiale — l’architecte central de votre patrimoine.", body)

def build_family_office_pages():
    parent = ("Accès à notre Family Office","family-office.html")

    sub_page("pilotage-patrimonial-global.html","Pilotage patrimonial global & stratégie sur-mesure","La tour de contrôle de votre patrimoine",
        "Orchestrer l’ensemble de votre patrimoine comme un écosystème cohérent, structuré et piloté selon une vision de long terme.",
        "assets/img/mansion.jpg","Pilotage patrimonial global",
        ["Entreprises, holdings, immobilier, portefeuilles, trésorerie, private equity, enjeux successoraux, structures internationales : sans coordination, ces composantes évoluent de façon fragmentée — inefficiences, sur-risques, incohérences fiscales.",
         "Nous devenons votre tour de contrôle patrimoniale : agréger, structurer, analyser et piloter l’ensemble de vos enjeux dans une logique consolidée."],
        ["Une vision consolidée de tout votre patrimoine","Du fragmenté à une gouvernance structurée","Chef d’orchestre de tous vos conseils"],
        [("checklist","Une cartographie patrimoniale exhaustive",
            ["Patrimoine privé","Patrimoine professionnel","Structures de détention","Immobilier","Actifs financiers et liquidités","Engagements","Gouvernance familiale","Fiscalité et enjeux successoraux"]),
         ("cards","Une stratégie sur-mesure, multi-dimensions",[
            ("shield","Protection & croissance","Sécuriser le capital tout en le faisant fructifier."),
            ("puzzle","Diversification","Réduire les risques de concentration."),
            ("scale","Structuration & fiscalité","Organiser la détention et les flux."),
            ("concierge","Liquidité & transmission","Anticiper les grandes étapes de vie."),
         ]),
         ("tags","Concrètement, nous coordonnons",
            ["Patrimoine entrepreneurial & privé","Trésorerie & capitalisation","Immobilier, finance & non coté","Cession & transmission","Holdings & réserves","Allocations selon les cycles de vie"]),
         ("text","Chef d’orchestre de vos experts",
            ["Experts-comptables, notaires, avocats, fiscalistes, banques privées, sociétés de gestion, assureurs : la performance patrimoniale ne dépend pas seulement de la qualité individuelle des experts, mais de la cohérence stratégique de leurs interventions — que nous coordonnons."]),
        ],
        [("Ingénierie patrimoniale avancée","ingenierie-patrimoniale.html"),("Allocation & architecture ouverte","allocation-architecture-ouverte.html"),("Gouvernance familiale","gouvernance-familiale.html")],
        "Pilotage patrimonial global : une tour de contrôle qui agrège, structure et pilote l’ensemble de vos actifs et enjeux.", parent)

    sub_page("ingenierie-patrimoniale.html","Ingénierie patrimoniale, fiscale & juridique avancée","Le cœur technique du Family Office",
        "Structurer le patrimoine dans toutes ses dimensions — juridiques, fiscales, civiles, entrepreneuriales et successorales.",
        "assets/img/paris-colonnade.jpg","Ingénierie patrimoniale avancée",
        ["La question n’est plus de choisir des investissements, mais d’organiser comment le patrimoine est détenu, piloté, protégé, transmis et optimisé dans le temps.",
         "Sans ingénierie globale, même un patrimoine important souffre d’inefficience : fiscalité mal calibrée, structures inadaptées, dilution ou gouvernance fragile."],
        ["Chaque outil, une brique d’une stratégie globale","Coordination notaires, fiscalistes, avocats, experts-comptables","Une cohérence parfaite entre chaque décision"],
        [("cards","Plusieurs niveaux d’expertise",[
            ("scale","Structuration juridique","Organiser la détention des actifs."),
            ("doc","Organisation fiscale globale","Une efficience des flux dans la durée."),
            ("shield","Protection civile & familiale","Sécuriser les proches et le cadre civil."),
            ("treasury","Liquidité exceptionnelle","Gérer les grands événements patrimoniaux."),
         ]),
         ("tags","Les structures analysées ou créées",
            ["SCI","Holdings patrimoniales","Sociétés civiles","Démembrement","Pactes d’associés","Clauses statutaires","Enveloppes de capitalisation","Structures internationales"]),
         ("checklist","L’ingénierie fiscale, au-delà de l’impôt immédiat",
            ["Arbitrage revenu / capitalisation","Dividendes / rémunération","Fiscalité immobilière","Structuration des plus-values","Préparation de cession","Réinvestissement","Enveloppes adaptées","Sphères privée / professionnelle"]),
         ("tags","Les enjeux civils & familiaux",
            ["Régimes matrimoniaux","Protection du conjoint","Équilibre entre héritiers","Gouvernance familiale","Contrôle capitalistique","Unité patrimoniale"]),
        ],
        [("Organisation patrimoniale","organisation-patrimoniale.html"),("Structuration du dirigeant","structuration-dirigeant.html"),("Transmission & gouvernance","transmission-gouvernance.html")],
        "Ingénierie patrimoniale, fiscale et juridique avancée : transformer un ensemble d’actifs en une architecture cohérente et durable.", parent)

    sub_page("allocation-architecture-ouverte.html","Allocation, sélection d’investissements & architecture ouverte","Un comité d’investissement à vos côtés",
        "Concevoir une architecture d’investissement sur-mesure, totalement indépendante, intégrant l’ensemble des classes d’actifs pertinentes.",
        "assets/img/hero.jpg","Allocation et architecture ouverte",
        ["Une gestion sophistiquée ne repose pas sur une accumulation d’opportunités, mais sur une construction méthodique d’allocations cohérentes, adaptées à votre horizon, votre profil de risque et votre stratégie.",
         "Architecture ouverte : aucun établissement captif, aucune banque ou société de gestion imposée — nous sélectionnons librement les meilleures solutions du marché, dans votre seul intérêt."],
        ["Un sélectionneur institutionnel indépendant","Mise en concurrence des meilleures expertises","Une allocation pilotée dans le temps"],
        [("cards","Toutes les classes d’actifs",[
            ("chart","Gestion financière","Actions, obligations, ETF, fonds spécialisés."),
            ("shield","Assurance-vie & luxembourgeois","Capitalisation et sécurité renforcée."),
            ("doc","Produits structurés multi-salles","Rendement / protection en architecture ouverte."),
            ("puzzle","Private equity & non coté","Capital-investissement et dette privée."),
            ("building","Immobilier","SCPI, club deals et direct."),
            ("treasury","Actifs réels & international","Diversification et solutions sur-mesure."),
         ]),
         ("checklist","Notre méthodologie d’analyse",
            ["Allocation stratégique long terme","Allocation tactique selon les cycles","Sélection des meilleurs partenaires","Analyse des frais et structures","Risque de contrepartie","Corrélation entre actifs","Efficience fiscale","Robustesse juridique"]),
         ("tags","Une allocation articulée autour de",
            ["Protection","Performance","Diversification","Décorrélation","Liquidité","Transmission","Fiscalité","Gouvernance"]),
        ],
        [("Produits structurés","produits-structures.html"),("Fonds de Private Equity","fonds-private-equity.html"),("Placements financiers","placements-financiers.html")],
        "Allocation et architecture ouverte : un comité d’investissement indépendant qui sélectionne et pilote les meilleures solutions du marché.", parent,
        quote="Agir comme un sélectionneur institutionnel, avec l’exigence d’un comité d’investissement patrimonial.")

    sub_page("gouvernance-familiale.html","Gouvernance familiale, transmission & accompagnement intergénérationnel","Faire traverser les générations à votre patrimoine",
        "Au-delà de la performance, organiser une gouvernance capable de préserver l’unité familiale, la stabilité stratégique et la continuité générationnelle.",
        "assets/img/retraite.jpg","Gouvernance familiale et intergénérationnelle",
        ["Sans gouvernance claire, les patrimoines importants deviennent vulnérables : dilution, conflits successoraux, déséquilibres entre héritiers, perte de contrôle ou fragmentation stratégique.",
         "Notre rôle : transformer le patrimoine familial en un projet structuré, capable de traverser les générations."],
        ["Protéger l’unité familiale","Organiser le contrôle et les responsabilités","Préparer les générations futures"],
        [("checklist","Analyser les équilibres familiaux",
            ["Composition familiale","Structure des actifs","Patrimoine entrepreneurial","Répartition du contrôle","Héritiers impliqués ou non","Protection du conjoint","Préparation de succession","Continuité ou liquidité"]),
         ("cards","Les leviers de gouvernance",[
            ("concierge","Pactes & chartes familiales","Encadrer la vision et les règles communes."),
            ("treasury","Gouvernance de holdings","Organiser le pouvoir et les flux."),
            ("scale","Démembrement & donation-partage","Transmettre en préservant l’équilibre."),
            ("compass","Transmission progressive","Préparer la relève dans la durée."),
         ]),
         ("tags","Transmettre bien plus que des actifs",
            ["Une vision patrimoniale","Une gouvernance","Des responsabilités","Une culture de gestion","Une continuité stratégique"]),
         ("text","L’accompagnement intergénérationnel",
            ["Sensibilisation financière, préparation des repreneurs, organisation des pouvoirs, coordination familiale et préservation de l’unité — une dimension particulièrement critique dans les familles entrepreneuriales."]),
        ],
        [("Transmission & gouvernance","transmission-gouvernance.html"),("Céder ou transmettre","ceder-transmettre.html"),("Pilotage patrimonial global","pilotage-patrimonial-global.html")],
        "Gouvernance familiale, transmission et accompagnement intergénérationnel : faire du patrimoine un projet qui traverse les générations.", parent,
        quote="Garant de la continuité patrimoniale : que la richesse créée aujourd’hui demeure structurée, protégée et utile demain.")


def build_contact():
    lat, lon = "48.8787", "2.3119"
    body = page_hero("Nous contacter",
        "Nous vous recevons sur rendez-vous, en toute confidentialité, dans nos bureaux du 8<sup>e</sup> arrondissement de Paris.",
        [("Accueil","index.html"),("Nous contacter",None)])
    info = (
      '<ul class="info-list">'
        '<li><span class="ico">%s</span><div><h4>Adresse</h4><p>%s</p></div></li>'
        '<li><span class="ico">%s</span><div><h4>Email</h4><a href="mailto:%s">%s</a></div></li>'
        '<li><span class="ico">%s</span><div><h4>Rendez-vous</h4><p>Du lundi au vendredi, sur rendez-vous</p></div></li>'
      '</ul>'
      '<p style="margin-top:28px"><a class="link-arrow" href="https://www.openstreetmap.org/?mlat=%s&mlon=%s#map=18/%s/%s" target="_blank" rel="noopener">Voir le plan d’accès %s</a></p>'
      % (icon("pin","tile__ico"), ADDRESS,
         icon("mail","tile__ico"), EMAIL, EMAIL,
         icon("clock","tile__ico"),
         lat, lon, lat, lon, arrow()))
    form = ("""<form id="contact-form" class="form" action="https://formsubmit.co/%s" method="POST" novalidate>
<div class="row">
<div class="field"><label for="f-name">Nom &amp; prénom</label><input id="f-name" name="name" type="text" autocomplete="name" required></div>
<div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
</div>
<div class="row">
<div class="field"><label for="f-phone">Téléphone</label><input id="f-phone" name="phone" type="tel" autocomplete="tel"></div>
<div class="field"><label for="f-subject">Objet</label>
<select id="f-subject" name="subject">
<option>Gestion privée &amp; placements</option>
<option>Assurance-vie luxembourgeoise</option>
<option>Produits structurés sur-mesure</option>
<option>Trésorerie d’entreprise</option>
<option>Cession / transmission d’entreprise</option>
<option>Family Office</option>
<option>Autre demande</option>
</select></div>
</div>
<div class="field"><label for="f-message">Votre message</label><textarea id="f-message" name="message" required></textarea></div>
<div class="form__status" role="status" aria-live="polite"></div>
<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
<button class="btn btn--solid" type="submit">Envoyer ma demande %s</button>
<span class="form__note">Vos informations restent strictement confidentielles.</span>
</div>
</form>""" % (EMAIL, arrow()))
    body += section(
        '<div class="contact-grid">'
          '<div data-reveal><p class="eyebrow">Prendre contact</p><h2 class="title-lg">Parlons de votre projet</h2><hr class="rule">'
          '<p class="lede">Une question, un projet patrimonial ou de trésorerie ? Écrivez-nous : nous vous répondons sous 48 heures ouvrées.</p>'
          + info + '</div>'
          '<div data-reveal data-delay="1">' + form + '</div>'
        '</div>')
    osm = ('https://www.openstreetmap.org/export/embed.html?bbox=2.3019%%2C48.8737%%2C2.3219%%2C48.8837&amp;layer=mapnik&amp;marker=%s%%2C%s' % (lat, lon))
    body += section('<div class="map" data-reveal><iframe title="Plan — 58 rue de Monceau, 75008 Paris" loading="lazy" src="%s"></iframe></div>' % osm, cls="section--tight")
    page("contact.html","Nous contacter","Contactez La Financière de Rochechouart — 58 rue de Monceau, 75008 Paris — contact@lfd-rochechouart.com.", body)

def build_mentions():
    body = page_hero("Mentions légales",
        "Informations légales relatives au site de La Financière de Rochechouart.",
        [("Accueil","index.html"),("Mentions légales",None)])
    blocks = [
        ("Éditeur du site","La Financière de Rochechouart — Cabinet de gestion privée et de placement de trésorerie.<br>Adresse : %s.<br>Email : <a href=\"mailto:%s\">%s</a>." % (ADDRESS, EMAIL, EMAIL)),
        ("Hébergement","Le présent site est hébergé par l’hébergeur retenu par l’éditeur. Les coordonnées complètes peuvent être obtenues sur simple demande à l’adresse de contact."),
        ("Propriété intellectuelle","L’ensemble des contenus (textes, identité visuelle, illustrations, mise en page) est protégé par le droit de la propriété intellectuelle. Toute reproduction, totale ou partielle, est soumise à autorisation préalable."),
        ("Données personnelles","Conformément au RGPD, vous disposez d’un droit d’accès, de rectification et de suppression des données vous concernant. Les informations transmises via le formulaire de contact sont utilisées aux seules fins de traiter votre demande et ne sont jamais cédées à des tiers. Pour exercer vos droits, écrivez-nous à <a href=\"mailto:%s\">%s</a>." % (EMAIL, EMAIL)),
        ("Avertissement","Les informations diffusées sur ce site ont une vocation strictement informative et ne constituent ni un conseil en investissement, ni une offre, ni une sollicitation. Tout investissement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. La fiscalité dépend de la situation de chacun et est susceptible d’évoluer."),
    ]
    inner = ('<div style="max-width:820px" data-reveal>' + "".join(
        '<h2 class="title-md" style="margin-top:%s">%s</h2><hr class="rule"><p class="muted">%s</p>'
        % ("0" if i==0 else "48px", t, c) for i,(t,c) in enumerate(blocks)) + '</div>')
    body += section(inner)
    body += cta_band()
    page("mentions-legales.html","Mentions légales","Mentions légales du site La Financière de Rochechouart.", body)

# --------------------------------------------------------------------------
def main():
    build_home()
    build_vos_besoins(); build_nos_solutions()
    build_epargner(); build_fiscalite(); build_ceder(); build_retraite(); build_expatriation()
    build_placements_financiers(); build_fin_pages(); build_tresorerie(); build_tresorerie_pages()
    build_produits_structures_page(); build_structures_tresorerie_page(); build_luxembourgeois_page(); build_comptes_titres_page(); build_pea_page(); build_per_page(); build_capitalisation_page(); build_assurance_vie_page()
    build_private_equity(); build_private_equity_pages(); build_pe_detail_page()
    build_immobilier(); build_immobilier_pages(); build_scpi_page()
    build_structuration(); build_structuration_pages(); build_family_office(); build_family_office_pages()
    build_contact(); build_mentions()
    print("Done.")

if __name__ == "__main__":
    main()
