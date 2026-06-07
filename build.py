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
LOGO_MARK  = "assets/img/monogram.svg"  # small mark next to the wordmark + favicon
HERO_IMG   = "assets/img/hero.svg"      # full-width homepage background photo
# Set to a file path (e.g. "assets/img/logo.png") to use the full wordmark
# logo image in the header/footer INSTEAD of the monogram + typeset name.
# A monochrome logo is auto-inverted to read on dark backgrounds.
BRAND_LOGO = None

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
def render_brand(cls="brand"):
    if BRAND_LOGO:
        return ('<a class="%s brand--img" href="index.html" aria-label="%s — accueil">'
                '<img class="brand__logo" src="%s" alt="%s"></a>'
                % (cls, BRAND, BRAND_LOGO, html.escape(BRAND)))
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
              + render_brand() +
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
            inner += '<a class="link-arrow" href="%s">En savoir plus %s</a>' % (href, arrow())
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
    <div class="split__media" data-reveal data-delay="1"><div class="media-frame"><img src="assets/img/img-colonnade.svg" alt="Architecture classique"></div></div>
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

<section class="section">
  <div class="container split split--reverse">
    <div data-reveal>
      <p class="eyebrow">L’assurance-vie au cœur du patrimoine</p>
      <h2 class="title-lg">L’assurance-vie luxembourgeoise, un cadre d’exception</h2>
      <hr class="rule">
      <p>L’assurance-vie constitue un mode de détention privilégié de vos actifs. Le contrat luxembourgeois y ajoute une protection juridique reconnue — le « triangle de sécurité » — et une grande souplesse d’investissement, du fonds en euros aux fonds dédiés (FID, FAS).</p>
      <ul class="checklist">
        <li>Protection renforcée des avoirs (super-privilège du souscripteur)</li>
        <li>Neutralité fiscale : la fiscalité de votre pays de résidence s’applique</li>
        <li>Accès à une multitude de supports et de devises</li>
      </ul>
      <a class="link-arrow" href="placements-financiers.html" style="margin-top:26px">Explorer l’assurance-vie luxembourgeoise __ARROW__</a>
    </div>
    <div class="split__media" data-reveal data-delay="1"><div class="media-frame"><img src="assets/img/img-luxembourg.svg" alt="Triangle de sécurité luxembourgeois"></div></div>
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
    body = page_hero("Épargner & Investir",
        "Mettre votre capital au travail avec méthode : une allocation diversifiée, maîtrisée et alignée sur votre horizon de placement.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Épargner & Investir",None)])
    body += intro("Construire", "Une allocation pensée pour durer",
        "Investir n’est pas spéculer. Nous bâtissons une allocation cohérente, diversifiée par classes d’actifs, zones géographiques et styles de gestion.",
        ["De l’épargne de précaution aux actifs de long terme, chaque poche répond à un objectif précis et à un horizon défini.",
         "Nous privilégions des supports lisibles et liquides, complétés — lorsque votre profil le permet — par des actifs privés sélectionnés."],
        "assets/img/img-markets.svg","Allocation d’actifs", link=("Découvrir nos placements financiers","placements-financiers.html"))
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Nos convictions</p><h2 class="title-lg">Quatre principes directeurs</h2><hr class="rule"></div>'
        '<div class="grid grid-4" style="margin-top:50px">' + "".join(
        '<div class="card" data-reveal data-delay="%d">%s<h3>%s</h3><p>%s</p></div>' % ((i%3)+1, icon(ic,"tile__ico"), t, d)
        for i,(ic,t,d) in enumerate([
            ("compass","Horizon","Le temps est votre meilleur allié : nous calibrons le risque sur votre horizon réel."),
            ("puzzle","Diversification","Répartir pour réduire le risque sans diluer la performance."),
            ("lock","Discipline","Une stratégie tenue dans la durée, à l’abri des emballements de marché."),
            ("chart","Transparence","Des frais clairs et un reporting régulier, sans rétrocession cachée."),
        ])) + '</div>', cls="section band-cream")
    body += cta_band("Construisons votre allocation","Faisons le point sur vos objectifs d’épargne et d’investissement lors d’un premier rendez-vous confidentiel.")
    page("epargner-investir.html","Épargner & Investir","Construire une allocation diversifiée et maîtrisée pour faire fructifier votre capital sur le long terme.", body)

def build_fiscalite():
    body = page_hero("Optimiser votre fiscalité",
        "Réduire durablement la pression fiscale sur vos revenus, votre patrimoine et vos plus-values — toujours dans un cadre sécurisé et documenté.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Optimiser votre fiscalité",None)])
    body += intro("Maîtriser","La fiscalité comme variable de pilotage",
        "L’optimisation fiscale n’a de sens qu’au service d’une stratégie patrimoniale globale. Nous l’abordons avec prudence et rigueur juridique.",
        ["Enveloppes de capitalisation, démembrement de propriété, holding patrimoniale, déficits fonciers : chaque levier est étudié au regard de votre situation.",
         "Nous travaillons en lien étroit avec vos conseils — avocats et experts-comptables — pour garantir la solidité de chaque montage."],
        "assets/img/img-texture.svg","Optimisation fiscale", rev=True, link=("Voir la structuration juridique et fiscale","structuration-juridique.html"))
    body += section('<div data-reveal><p class="eyebrow">Leviers</p><h2 class="title-lg">Des dispositifs éprouvés</h2><hr class="rule"></div>'
        '<div class="grid grid-3" style="margin-top:40px">' + tiles([
            ("shield","Assurance-vie","Capitalisation et transmission dans un cadre fiscal privilégié, en France comme au Luxembourg.","placements-financiers.html"),
            ("building","Immobilier & déficit foncier","Réduire votre base imposable tout en constituant un patrimoine tangible.","placements-immobiliers.html"),
            ("scale","Holding & démembrement","Structurer la détention de vos actifs pour optimiser revenus et transmission.","structuration-juridique.html"),
        ]) + '</div>')
    body += cta_band("Allégeons votre fiscalité","Un audit fiscal et patrimonial révèle souvent des marges d’optimisation insoupçonnées. Parlons-en.")
    page("optimiser-fiscalite.html","Optimiser votre fiscalité","Réduire la pression fiscale sur vos revenus, votre patrimoine et vos plus-values dans un cadre sécurisé.", body)

def build_ceder():
    body = page_hero("Céder ou transmettre votre entreprise",
        "La cession ou la transmission de votre société est un moment décisif. Nous l’anticipons à vos côtés pour en préserver la valeur.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Céder ou transmettre votre entreprise",None)])
    body += intro("Anticiper","Préparer l’avant et l’après-cession",
        "La valeur d’une cession se prépare des années à l’avance. L’enjeu : transformer un actif professionnel en patrimoine privé optimisé.",
        ["Apport-cession (article 150-0 B ter), pacte Dutreil, donation avant cession : nous mobilisons les dispositifs adaptés à votre projet.",
         "Une fois l’opération réalisée, nous réinvestissons le produit de la vente dans une allocation pérenne et fiscalement efficiente."],
        "assets/img/img-colonnade.svg","Transmission d’entreprise", link=("Découvrir le réinvestissement en private equity","private-equity.html"))
    body += section('<div class="center" style="max-width:680px;margin-inline:auto" data-reveal><p class="eyebrow">Les étapes clés</p><h2 class="title-lg">De la préparation au réemploi</h2><hr class="rule"></div>'
        '<ul class="checklist" style="max-width:760px;margin:40px auto 0">' + "".join("<li>%s</li>" % c for c in [
            "Audit de votre situation et valorisation de l’entreprise",
            "Structuration en amont (holding, Dutreil, apport-cession)",
            "Coordination avec vos conseils M&amp;A, avocats et notaires",
            "Réemploi du produit de cession dans une allocation diversifiée",
            "Stratégie de transmission aux générations suivantes",
        ]) + '</ul>', cls="section band-cream")
    body += cta_band("Préparons votre cession","Plus une cession est anticipée, plus elle est optimisée. Rencontrons-nous en toute confidentialité.")
    page("ceder-transmettre.html","Céder ou transmettre votre entreprise","Anticiper et structurer la cession ou la transmission de votre société pour préserver sa valeur.", body)

def build_retraite():
    body = page_hero("Préparer votre retraite",
        "Constituer, le plus tôt possible, des revenus complémentaires pérennes et un capital disponible le moment venu.",
        [("Accueil","index.html"),("Vos besoins","vos-besoins.html"),("Préparer votre retraite",None)])
    body += intro("Anticiper","Des revenus complémentaires sereins",
        "La baisse de revenus au passage à la retraite se prépare. Nous construisons une stratégie combinant capitalisation, immobilier et rentes.",
        ["PER, assurance-vie, immobilier locatif ou SCPI : nous arbitrons entre disponibilité, fiscalité et niveau de revenu cible.",
         "L’objectif : un capital qui travaille pendant la phase d’épargne, puis se transforme en revenus réguliers et maîtrisés."],
        "assets/img/img-interior.svg","Préparation de la retraite", rev=True, link=("Voir nos placements financiers","placements-financiers.html"))
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
        "assets/img/img-luxembourg.svg","Expatriation et mobilité internationale", link=("Découvrir l’assurance-vie luxembourgeoise","placements-financiers.html"))
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
        "assets/img/img-colonnade.svg","Capital-investissement")
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
        "assets/img/img-realestate.svg","Immobilier patrimonial", rev=True)
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
        "assets/img/img-colonnade.svg","Ingénierie patrimoniale")
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
        "assets/img/img-interior.svg","Family Office", rev=True)
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
