#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static site generator for « La Financière de Rochechouart ».
Run:  python3 build.py
Outputs HTML pages at the repository root, sharing assets/ (css, js, img).
A single layout guarantees a consistent header / footer / contact band.
"""
import os, html

ROOT = os.path.dirname(os.path.abspath(__file__))

BRAND = "La Financière de Rochechouart"
EMAIL = "contact@lfdr.fr"
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
        ("doc","Produits structurés sur-mesure","Des solutions de rendement et de protection conçues selon vos contraintes.","placements-financiers.html#structures"),
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
        "assets/img/img-markets.svg", "Stratégie d’investissement")

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
              ("doc","Produits structurés","Solutions calibrées selon des scénarios de marché et un niveau de risque défini.","placements-financiers.html#structures"),
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
    p2 = feature_row("assets/img/img-markets.svg", "Sécurisation du capital post-cession",
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
    body = page_hero("Préparer votre retraite",
        "Constituer, le plus tôt possible, des revenus complémentaires pérennes et un capital disponible le moment venu.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Préparer votre retraite",None)])
    body += intro("Anticiper","Des revenus complémentaires sereins",
        "La baisse de revenus au passage à la retraite se prépare. Nous construisons une stratégie combinant capitalisation, immobilier et rentes.",
        ["PER, assurance-vie, immobilier locatif ou SCPI : nous arbitrons entre disponibilité, fiscalité et niveau de revenu cible.",
         "L’objectif : un capital qui travaille pendant la phase d’épargne, puis se transforme en revenus réguliers et maîtrisés."],
        "assets/img/retraite.jpg","Préparation de la retraite", rev=True, link=("Voir nos placements financiers","placements-financiers.html"))
    body += section('<div class="grid grid-3" style="margin-top:0">' + tiles([
            ("retire","Plan d’Épargne Retraite","Déduire vos versements de votre revenu imposable tout en préparant l’avenir.","epargner-investir.html"),
            ("shield","Assurance-vie","Une enveloppe souple pour capitaliser puis générer des rachats programmés.","placements-financiers.html"),
            ("building","Immobilier de rendement","SCPI et immobilier locatif pour des revenus complémentaires tangibles.","placements-immobiliers.html"),
        ]) + '</div>')
    body += cta_band("Préparons votre retraite","Quel niveau de revenu visez-vous ? Établissons ensemble la trajectoire pour y parvenir.")
    page("preparer-retraite.html","Préparer votre retraite","Constituer des revenus complémentaires et un capital disponible grâce à une stratégie sur-mesure.", body)

def build_expatriation():
    body = page_hero("S’expatrier à l’étranger",
        "Mobilité internationale rime avec complexité patrimoniale et fiscale. Nous sécurisons et adaptons votre patrimoine à votre nouvelle résidence.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("S’expatrier à l’étranger",None)])
    body += intro("Accompagner","Votre patrimoine au-delà des frontières",
        "Changer de pays de résidence modifie en profondeur la fiscalité applicable à vos revenus, vos plus-values et votre succession.",
        ["L’assurance-vie de droit luxembourgeois s’impose souvent comme la solution de référence : portable, multidevise et neutre fiscalement.",
         "Nous coordonnons votre stratégie avec vos conseils locaux pour assurer sa conformité dans chaque juridiction concernée."],
        "assets/img/serenite.jpg","Expatriation et mobilité internationale", link=("Découvrir l’assurance-vie luxembourgeoise","placements-financiers.html"))
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Points de vigilance</p><h2 class="title-lg">Les sujets à anticiper</h2><hr class="rule"></div>'
        '<div class="grid grid-3" style="margin-top:50px">' + tiles([
            ("globe","Résidence fiscale","Déterminer et sécuriser votre lieu d’imposition selon les conventions fiscales."),
            ("shield","Portabilité des contrats","Privilégier des enveloppes reconnues et transférables d’un pays à l’autre."),
            ("scale","Exit tax & succession","Anticiper la fiscalité de sortie et les règles successorales internationales."),
        ]) + '</div>', cls="section band-cream")
    body += cta_band("Préparez votre expatriation","Un projet de mobilité internationale ? Anticipons ensemble ses conséquences patrimoniales.")
    page("expatriation.html","S’expatrier à l’étranger","Sécuriser et adapter votre patrimoine à votre mobilité internationale, en lien avec vos conseils locaux.", body)


# ---- Solutions ----
def build_placements_financiers():
    body = page_hero("Placements financiers",
        "Une allocation d’actifs sur-mesure, déployée en architecture ouverte à travers les enveloppes les plus performantes — au premier rang desquelles l’assurance-vie luxembourgeoise.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Placements financiers",None)])
    body += intro("Architecture ouverte","Le meilleur de chaque univers d’investissement",
        "Nous ne commercialisons aucun produit maison. Notre indépendance nous permet de sélectionner, sans biais, les supports les mieux adaptés à votre profil.",
        ["Fonds en euros, OPCVM, ETF, titres vifs, fonds dédiés, produits structurés ou actifs privés : chaque brique est choisie pour sa contribution à l’ensemble.",
         "L’allocation est pilotée dans la durée, avec des arbitrages réguliers et un reporting transparent."],
        "assets/img/img-markets.svg","Marchés financiers")
    # Assurance-vie luxembourgeoise — feature rows like the attachment
    body += section(
        '<div class="center" style="max-width:760px;margin-inline:auto" data-reveal>'
        '<p class="eyebrow">L’assurance-vie au cœur du patrimoine</p>'
        '<h2 class="title-lg">L’assurance-vie de droit luxembourgeois</h2><hr class="rule">'
        '<p class="lede">Un cadre d’investissement souple et complet, doublé d’une protection juridique parmi les plus solides d’Europe.</p></div>',
        cls="section band-cream") 
    body += section(
        feature_row("assets/img/img-luxembourg.svg","Triangle de sécurité","Une sécurité d’exception",
            "Une enveloppe souple et complète",
            ["Le contrat luxembourgeois bénéficie du « triangle de sécurité » : vos avoirs sont déposés auprès d’une banque dépositaire indépendante, sous le contrôle du Commissariat aux Assurances.",
             "Le souscripteur jouit du « super-privilège » : créancier de premier rang sur ses actifs en cas de défaillance de l’assureur."],
            checklist=["Super-privilège du souscripteur","Ségrégation des actifs","Multidevises et portabilité internationale"]) +
        '<div style="height:clamp(48px,7vw,96px)"></div>' +
        feature_row("assets/img/img-texture.svg","Souplesse & fiscalité","Un cadre fiscal neutre et avantageux",
            "Une fiscalité respectée, où que vous résidiez",
            ["Le Luxembourg applique la neutralité fiscale : c’est la fiscalité de votre pays de résidence qui s’applique. Le contrat est particulièrement adapté aux résidents français comme aux expatriés.",
             "L’accès aux fonds internes dédiés (FID) et aux fonds d’assurance spécialisés (FAS) autorise une gestion véritablement sur-mesure, du profil prudent au profil dynamique."],
            rev=True,
            checklist=["Neutralité fiscale luxembourgeoise","Fonds dédiés (FID) et spécialisés (FAS)","Transmission optimisée hors succession"]),
        cls="section")
    # Produits structurés sur-mesure
    body += '<section class="section band-dark" id="structures"><div class="container">'
    body += ('<div class="split"><div data-reveal><p class="eyebrow eyebrow--light">Produits structurés sur-mesure</p>'
        '<h2 class="title-lg">Des solutions de rendement et de protection, conçues pour vous</h2><hr class="rule">'
        '<p class="lede" style="color:rgba(246,242,233,.85)">Le produit structuré associe un sous-jacent (indice, action, panier) à une formule définie à l’avance : il permet de viser un rendement cible tout en intégrant un mécanisme de protection du capital.</p>'
        '<ul class="checklist checklist--light" style="margin-top:24px">'
        '<li>Barrières de protection adaptées à votre tolérance au risque</li>'
        '<li>Maturité, sous-jacent et coupon définis sur-mesure</li>'
        '<li>Émissions dédiées négociées auprès de banques de premier plan</li>'
        '</ul></div>'
        '<div class="split__media" data-reveal data-delay="1"><div class="media-frame"><img src="assets/img/img-markets.svg" alt="Produits structurés"></div></div></div>')
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
    page("placements-financiers.html","Placements financiers","Assurance-vie de droit luxembourgeois, produits structurés sur-mesure et allocation d’actifs en architecture ouverte.", body)

def build_tresorerie():
    body = page_hero("Trésorerie d’entreprise",
        "Votre société dispose d’une trésorerie excédentaire ? Nous la dynamisons avec un couple rendement / liquidité maîtrisé, sans la figer.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Trésorerie d’entreprise",None)])
    body += intro("Dynamiser","Faire travailler votre trésorerie excédentaire",
        "Laisser dormir une trésorerie importante, c’est en éroder la valeur avec l’inflation. La placer sans méthode, c’est exposer la société à un risque mal calibré.",
        ["Nous segmentons votre trésorerie par horizon — quotidienne, à court terme, stable — et associons à chaque poche une solution adaptée.",
         "Comptes à terme, fonds monétaires, produits structurés à capital protégé, contrat de capitalisation : la liquidité reste pilotée selon vos besoins d’exploitation."],
        "assets/img/img-markets.svg","Trésorerie d’entreprise", rev=True)
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Notre approche</p><h2 class="title-lg">Une trésorerie segmentée par horizon</h2><hr class="rule"></div>'
        '<div class="grid grid-3" style="margin-top:50px">' + tiles([
            ("clock","Liquidité immédiate","Sécurité et disponibilité totale pour vos besoins d’exploitation courants."),
            ("treasury","Court / moyen terme","Comptes à terme et fonds monétaires pour la trésorerie peu mobilisée."),
            ("growth","Trésorerie stable","Contrat de capitalisation et structurés pour la part durablement excédentaire."),
        ]) + '</div>', cls="section band-cream")
    body += cta_band("Optimisons la trésorerie de votre société","Un diagnostic de trésorerie révèle le potentiel de rendement dormant. Échangeons à ce sujet.")
    page("tresorerie-entreprise.html","Trésorerie d’entreprise","Dynamiser la trésorerie excédentaire de votre société avec un couple rendement / liquidité maîtrisé.", body)

def build_private_equity():
    body = page_hero("Solutions non cotées & Private Equity",
        "Accédez, de façon sélective, à la performance et à la décorrélation des actifs privés — longtemps réservés aux investisseurs institutionnels.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Solutions non cotées & Private Equity",None)])
    body += intro("Diversifier","La valeur se crée aussi hors des marchés cotés",
        "Le non coté offre un potentiel de performance et une décorrélation précieuse, en contrepartie d’une immobilisation du capital sur plusieurs années.",
        ["Capital-investissement, dette privée, infrastructures, actifs réels : nous sélectionnons des fonds de premier rang et des opérations en club deal.",
         "L’accès au non coté requiert un horizon long et une bonne compréhension du risque de liquidité : nous le calibrons strictement à votre profil."],
        "assets/img/paris-colonnade.jpg","Capital-investissement")
    body += section('<div class="grid grid-3" style="margin-top:0">' + tiles([
            ("puzzle","Private Equity","Participer au développement et à la transmission d’entreprises non cotées."),
            ("doc","Dette privée","Des revenus réguliers issus du financement direct des entreprises."),
            ("building","Actifs réels","Infrastructures et immobilier de rendement à forte visibilité."),
        ]) + '</div>')
    body += section('<div class="quote" data-reveal><p>« Le non coté n’est pas une mode : c’est une classe d’actifs structurante, à intégrer avec discernement et sur le long terme. »</p><cite>Notre approche du private equity</cite></div>', cls="section band-dark")
    body += cta_band("Accédez au private equity","Le non coté s’adresse à des investisseurs avertis. Vérifions ensemble sa pertinence dans votre allocation.")
    page("private-equity.html","Solutions non cotées & Private Equity","Accéder de façon sélective au capital-investissement, à la dette privée et aux actifs réels.", body)

def build_immobilier():
    body = page_hero("Placements immobiliers",
        "Constituez ou diversifiez un patrimoine immobilier tangible, sans les contraintes de la gestion en direct.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Placements immobiliers",None)])
    body += intro("Investir dans la pierre","L’immobilier, socle d’un patrimoine équilibré",
        "L’immobilier apporte stabilité, revenus réguliers et protection contre l’inflation. Nous en sélectionnons les véhicules les plus qualitatifs.",
        ["SCPI de rendement, OPCI, club deals, immobilier en démembrement ou nue-propriété : à chaque objectif sa structure.",
         "Nous étudions le couple rendement / fiscalité de chaque solution et son intégration dans votre allocation globale."],
        "assets/img/paris-courtyard.jpg","Immobilier patrimonial parisien", rev=True)
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Nos véhicules</p><h2 class="title-lg">Plusieurs voies vers la pierre</h2><hr class="rule"></div>'
        '<div class="grid grid-3" style="margin-top:50px">' + tiles([
            ("building","SCPI & OPCI","Des revenus immobiliers mutualisés et diversifiés, accessibles dès quelques milliers d’euros."),
            ("lock","Nue-propriété","Acquérir avec décote et préparer un revenu futur, dans un cadre fiscal optimisé."),
            ("scale","Club deals","Des opérations immobilières sélectionnées, réservées à un cercle d’investisseurs."),
        ]) + '</div>', cls="section band-cream")
    body += cta_band("Diversifiez dans l’immobilier","Quel rôle l’immobilier doit-il jouer dans votre patrimoine ? Construisons une stratégie adaptée.")
    page("placements-immobiliers.html","Placements immobiliers","SCPI, OPCI, nue-propriété et club deals : un patrimoine immobilier tangible et rigoureusement sélectionné.", body)

def build_structuration():
    body = page_hero("Structuration juridique et fiscale",
        "L’ingénierie patrimoniale au service de vos objectifs : détenir, protéger et transmettre vos actifs dans le cadre le plus efficient.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Structuration juridique et fiscale",None)])
    body += intro("Structurer","La bonne enveloppe pour le bon actif",
        "La performance d’un patrimoine tient autant à la qualité des actifs qu’à la manière dont ils sont détenus et transmis.",
        ["Holding patrimoniale, société civile, démembrement de propriété, donation-partage, pacte Dutreil : nous orchestrons les outils juridiques adaptés.",
         "Nous travaillons main dans la main avec vos notaires, avocats et experts-comptables pour sécuriser chaque opération."],
        "assets/img/mansion.jpg","Ingénierie patrimoniale")
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Nos leviers</p><h2 class="title-lg">Une boîte à outils complète</h2><hr class="rule"></div>'
        '<div class="grid grid-4" style="margin-top:50px">' + tiles([
            ("scale","Holding patrimoniale","Centraliser et optimiser la détention de vos participations."),
            ("doc","Démembrement","Dissocier usufruit et nue-propriété pour transmettre à moindre coût."),
            ("shield","Donations & pactes","Anticiper la transmission tout en conservant le pilotage."),
            ("globe","Dimension internationale","Coordonner les régimes lorsque votre patrimoine dépasse les frontières."),
        ]) + '</div>', cls="section band-cream")
    body += cta_band("Structurons votre patrimoine","Un bilan juridique et fiscal révèle souvent des optimisations majeures. Étudions votre situation.")
    page("structuration-juridique.html","Structuration juridique et fiscale","Holdings, démembrement, donations et pactes Dutreil : l’ingénierie patrimoniale au service de vos objectifs.", body)

def build_family_office():
    body = page_hero("Accès à notre Family Office",
        "Pour les patrimoines les plus complexes, une coordination globale, confidentielle et indépendante de l’ensemble de vos intérêts.",
        [("Accueil","index.html"),("Nos solutions","nos-solutions.html"),("Accès à notre Family Office",None)])
    body += intro("Orchestrer","Un chef d’orchestre pour votre patrimoine",
        "Le Family Office coordonne, en toute indépendance, l’ensemble des dimensions de votre patrimoine : financière, immobilière, juridique, fiscale et familiale.",
        ["Consolidation et reporting global, gouvernance familiale, sélection et supervision de vos partenaires, accompagnement des nouvelles générations.",
         "Une relation de long terme, fondée sur la confiance, la discrétion absolue et l’alignement total de nos intérêts avec les vôtres."],
        "assets/img/paris-courtyard.jpg","Family Office", rev=True)
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Nos missions</p><h2 class="title-lg">Une vision à 360°</h2><hr class="rule"></div>'
        '<div class="grid grid-4" style="margin-top:50px">' + tiles([
            ("chart","Consolidation","Une vision unifiée et claire de l’ensemble de vos actifs."),
            ("concierge","Coordination","La supervision de tous vos conseils et partenaires."),
            ("retire","Gouvernance familiale","Préparer et accompagner la transmission entre générations."),
            ("lock","Confidentialité","Une discrétion absolue à chaque étape de la relation."),
        ]) + '</div>', cls="section band-cream")
    body += cta_band("Découvrez notre Family Office","L’accès à notre Family Office est réservé à un cercle restreint. Rencontrons-nous pour en évaluer la pertinence.")
    page("family-office.html","Accès à notre Family Office","Une coordination globale, confidentielle et indépendante de l’ensemble de vos intérêts patrimoniaux.", body)


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
    form = (
      '<form id="contact-form" class="form" novalidate>'
        '<div class="row">'
          '<div class="field"><label for="f-name">Nom &amp; prénom</label><input id="f-name" name="name" type="text" autocomplete="name" required></div>'
          '<div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>'
        '</div>'
        '<div class="row">'
          '<div class="field"><label for="f-phone">Téléphone</label><input id="f-phone" name="phone" type="tel" autocomplete="tel"></div>'
          '<div class="field"><label for="f-subject">Objet</label>'
            '<select id="f-subject" name="subject">'
              '<option>Gestion privée &amp; placements</option>'
              '<option>Assurance-vie luxembourgeoise</option>'
              '<option>Produits structurés sur-mesure</option>'
              '<option>Trésorerie d’entreprise</option>'
              '<option>Cession / transmission d’entreprise</option>'
              '<option>Family Office</option>'
              '<option>Autre demande</option>'
            '</select></div>'
        '</div>'
        '<div class="field"><label for="f-message">Votre message</label><textarea id="f-message" name="message" required></textarea></div>'
        '<div class="form__status" role="status" aria-live="polite"></div>'
        '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">'
          '<button class="btn btn--solid" type="submit">Envoyer ma demande %s</button>'
          '<span class="form__note">Vos informations restent strictement confidentielles.</span>'
        '</div>'
      '</form>' % arrow())
    body += section(
        '<div class="contact-grid">'
          '<div data-reveal><p class="eyebrow">Prendre contact</p><h2 class="title-lg">Parlons de votre projet</h2><hr class="rule">'
          '<p class="lede">Une question, un projet patrimonial ou de trésorerie ? Écrivez-nous : nous vous répondons sous 48 heures ouvrées.</p>'
          + info + '</div>'
          '<div data-reveal data-delay="1">' + form + '</div>'
        '</div>')
    osm = ('https://www.openstreetmap.org/export/embed.html?bbox=2.3019%%2C48.8737%%2C2.3219%%2C48.8837&amp;layer=mapnik&amp;marker=%s%%2C%s' % (lat, lon))
    body += section('<div class="map" data-reveal><iframe title="Plan — 58 rue de Monceau, 75008 Paris" loading="lazy" src="%s"></iframe></div>' % osm, cls="section--tight")
    page("contact.html","Nous contacter","Contactez La Financière de Rochechouart — 58 rue de Monceau, 75008 Paris — contact@lfdr.fr.", body)

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
    build_placements_financiers(); build_tresorerie(); build_private_equity()
    build_immobilier(); build_structuration(); build_family_office()
    build_contact(); build_mentions()
    print("Done.")

if __name__ == "__main__":
    main()
