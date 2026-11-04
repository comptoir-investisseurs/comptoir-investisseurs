#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur statique — « Le Comptoir des Structurés ».

    python3 build-observatoire.py

Produit les pages HTML dans observatoire/ et le jeu de données
observatoire/assets/data.js consommé par le comparateur.
Un gabarit unique garantit l'homogénéité en-tête / pied de page / SEO.

Les feuilles obs.css / obs.js sont écrites à la main (non régénérées ici).
"""
import os, html, json, datetime, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "observatoire")

SITE = "Le Comptoir des Structurés"
SITE_SHORT = "Le Comptoir"
MARK = "C"
TAGLINE = "Comprendre, comparer et analyser les produits structurés"
EDITEUR = "La Financière de Rochechouart"
EMAIL = "contact@lfd-rochechouart.com"
ADDRESS = "58 rue de Monceau, 75008 Paris"
VILLE, CP, PAYS = "Paris", "75008", "FR"

# --------------------------------------------------------------------------
#  ⚠️  À VÉRIFIER AVANT MISE EN LIGNE — domaine canonique
#  Déduit de contact.php (le site est sur le domaine couvert par le SPF
#  Hostinger, l'email sur un domaine court distinct). Si le domaine réel ou
#  la préférence www/sans-www diffèrent, corrigez CES DEUX LIGNES et
#  relancez le script : canonical, Open Graph, sitemap et JSON-LD suivent.
# --------------------------------------------------------------------------
BASE_URL = "https://www.lafinancierederochechouart.com"
BASE_PATH = "/observatoire"          # "" si le Comptoir passe à la racine

# --------------------------------------------------------------------------
#  Dates — deux notions distinctes, à ne pas confondre
# --------------------------------------------------------------------------
# Date de la dernière revue éditoriale (contenu rédactionnel).
MAJ_ISO = "2026-11-04"
# Période de marché sur laquelle reposent les niveaux de coupon des gabarits.
# ⚠️ Ces niveaux datent et doivent être recalés à chaque revue : les coupons
# suivent les taux et la volatilité. Ne jamais les présenter comme actuels.
MARCHE_REF = "novembre 2025"
# Date de relevé des notations de crédit citées.
ANNEE_RATINGS = "octobre 2025"

_MOIS = ("janvier février mars avril mai juin juillet août septembre "
         "octobre novembre décembre").split()

def date_fr(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day} {_MOIS[d.month - 1]} {d.year}"

MAJ = date_fr(MAJ_ISO)
ANNEE = MAJ_ISO[:4]

NAV = [
    ("index.html",      "Accueil"),
    ("produits.html",   "Le comparateur"),
    ("comprendre.html", "Comprendre"),
    ("guides/",         "Guides"),
    ("acteurs.html",    "Les acteurs"),
]

def e(s):
    return html.escape(str(s), quote=True)

def url_abs(path):
    """URL absolue d'une page, à partir de son chemin dans observatoire/.
    Les pages en index.html deviennent des URL de répertoire, barre finale
    comprise : c'est la forme que doivent reprendre canonical et sitemap."""
    return f"{BASE_URL}{BASE_PATH}/{path.replace('index.html', '')}"

def prefix_for(path):
    """Chemin relatif vers la racine d'observatoire/ depuis une page donnée."""
    depth = path.count("/")
    return "../" * depth

# --------------------------------------------------------------------------
#  Données structurées JSON-LD
#  Uniquement des informations réelles et visibles sur la page.
# --------------------------------------------------------------------------
def ld_organization():
    return {
        "@type": "Organization",
        "@id": f"{BASE_URL}/#organization",
        "name": EDITEUR,
        "url": BASE_URL,
        "email": EMAIL,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": ADDRESS.split(",")[0].strip(),
            "postalCode": CP, "addressLocality": VILLE, "addressCountry": PAYS,
        },
    }

def ld_website():
    return {
        "@type": "WebSite",
        "@id": f"{BASE_URL}{BASE_PATH}/#website",
        "name": SITE,
        "url": url_abs(""),
        "inLanguage": "fr-FR",
        "publisher": {"@id": f"{BASE_URL}/#organization"},
    }

def ld_breadcrumb(trail):
    """trail = [(libellé, chemin relatif à observatoire/), ...]"""
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": nom, "item": url_abs(path)}
            for i, (nom, path) in enumerate(trail, 1)
        ],
    }

def ld_article(path, titre, description, maj_iso):
    return {
        "@type": "Article",
        "headline": titre,
        "description": description,
        "inLanguage": "fr-FR",
        "mainEntityOfPage": {"@type": "WebPage", "@id": url_abs(path)},
        "datePublished": maj_iso,
        "dateModified": maj_iso,
        # Pas d'auteur nommé : le contenu est publié par le cabinet, sans
        # signature individuelle. On ne crédite donc qu'une Organization.
        "author": {"@id": f"{BASE_URL}/#organization"},
        "publisher": {"@id": f"{BASE_URL}/#organization"},
        "isAccessibleForFree": True,
    }

def ld_faq(qr):
    return {
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": html.unescape(r)}}
            for q, r in qr
        ],
    }

def jsonld_block(graph):
    payload = {"@context": "https://schema.org", "@graph": graph}
    return ('<script type="application/ld+json">'
            + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            + "</script>")

# --------------------------------------------------------------------------
#  Gabarit
# --------------------------------------------------------------------------
def layout(filename, title, description, body, graph=None, crumb_trail=None,
           extra_head="", extra_js=""):
    pfx = prefix_for(filename)
    nav = []
    for href, label in NAV:
        actif = (href == filename
                 or (href.endswith("/") and filename.startswith(href)))
        cls = ' class="is-active" aria-current="page"' if actif else ""
        nav.append(f'<a href="{pfx}{href}"{cls}>{e(label)}</a>')
    nav.append(f'<a class="nav__cta" href="{pfx}produits.html#analyse">Faire analyser un produit</a>')
    nav_html = "\n      ".join(nav)

    graph = list(graph or [])
    graph.insert(0, ld_website())
    graph.insert(0, ld_organization())
    if crumb_trail:
        graph.append(ld_breadcrumb(crumb_trail))

    canonical = url_abs(filename)

    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="theme-color" content="#101C2B">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{e(SITE)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{e(canonical)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(description)}">
<link rel="icon" type="image/png" sizes="32x32" href="{pfx}../assets/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="{pfx}../assets/img/favicon-16.png">
<link rel="apple-touch-icon" href="{pfx}../assets/img/apple-touch-icon.png">
<link rel="preload" href="{pfx}assets/fonts/CormorantGaramond-500-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{pfx}assets/fonts/Jost-300-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{pfx}assets/obs.css">
{jsonld_block(graph)}{extra_head}
</head>
<body>

<a class="skip" href="#contenu">Aller au contenu principal</a>

<header class="hdr">
  <div class="container hdr__in">
    <a class="brand" href="{pfx}index.html" aria-label="{e(SITE)} — accueil">
      <span class="brand__mark" aria-hidden="true">{MARK}</span>
      <span class="brand__txt">
        <span class="brand__name">{e(SITE_SHORT)}</span>
        <span class="brand__sub">des structurés</span>
      </span>
    </a>
    <button class="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <nav class="nav" aria-label="Navigation principale">
      {nav_html}
    </nav>
  </div>
</header>

<main id="contenu">
{body}
</main>

<section class="cta">
  <div class="container cta__in">
    <div>
      <p class="eyebrow eyebrow--light">Accompagnement</p>
      <h2 class="title-lg">Un doute sur un produit qu’on vous propose&nbsp;?</h2>
      <p style="margin:18px 0 0;max-width:560px">
        Déposez son document d’informations clés : nous en reprenons le sous-jacent, les
        barrières et le mode de constatation, nous le comparons aux offres du moment à
        risque équivalent, et nous vous disons ce que nous en pensons.
      </p>
    </div>
    <div class="cta__actions">
      <a class="btn btn--ghost-light" href="{pfx}produits.html#analyse">Faire analyser un produit</a>
      <a class="btn btn--ghost-light" href="{pfx}../contact.html">Nous contacter</a>
    </div>
  </div>
</section>

<footer class="ftr">
  <div class="container">
    <div class="ftr__top">
      <div class="ftr__brand">
        <span class="brand">
          <span class="brand__mark" aria-hidden="true">{MARK}</span>
          <span class="brand__txt">
            <span class="brand__name">{e(SITE_SHORT)}</span>
            <span class="brand__sub">des structurés</span>
          </span>
        </span>
        <p>Un répertoire pédagogique du marché des produits structurés : mécanismes,
        familles, émetteurs, établissements de place et vocabulaire. Les structures
        présentées reposent sur des indices de marché publics.</p>
        <p class="xsmall" style="margin-top:14px">Une publication de
          <a href="{pfx}../index.html">{e(EDITEUR)}</a>, {e(ADDRESS)}.</p>
      </div>
      <div>
        <h2 class="ftr__h">Le marché</h2>
        <ul>
          <li><a href="{pfx}produits.html">Comparateur de produits structurés</a></li>
          <li><a href="{pfx}produits.html#analyse">Faire analyser un produit</a></li>
          <li><a href="{pfx}acteurs.html">Émetteurs et établissements</a></li>
          <li><a href="{pfx}methodologie.html">Méthodologie de comparaison</a></li>
        </ul>
      </div>
      <div>
        <h2 class="ftr__h">Guides</h2>
        <ul>
          <li><a href="{pfx}guides/">Tous les guides</a></li>
          <li><a href="{pfx}guides/produit-structure/">Qu’est-ce qu’un produit structuré</a></li>
          <li><a href="{pfx}guides/autocall/">Autocall</a></li>
          <li><a href="{pfx}guides/risques-produits-structures/">Risques</a></li>
          <li><a href="{pfx}guides/fiscalite-produits-structures/">Fiscalité</a></li>
        </ul>
      </div>
      <div>
        <h2 class="ftr__h">{e(SITE_SHORT)}</h2>
        <ul>
          <li><a href="{pfx}comprendre.html">Guide complet</a></li>
          <li><a href="{pfx}comprendre.html#glossaire">Glossaire</a></li>
          <li><a href="{pfx}mentions-legales.html">Mentions légales</a></li>
          <li><a href="{pfx}../contact.html">Nous contacter</a></li>
        </ul>
      </div>
    </div>
    <div class="ftr__risk">
      <strong style="color:rgba(255,255,255,.72)">Avertissement sur les risques.</strong>
      Les produits structurés sont des instruments financiers complexes présentant un
      risque de perte en capital en cours de vie et, pour la plupart d’entre eux, à
      l’échéance. Ils exposent au risque de défaut de l’émetteur et de son garant : en cas
      de défaillance, l’investisseur peut perdre tout ou partie de son investissement,
      indépendamment du comportement du sous-jacent. Le rendement affiché est conditionnel
      et n’est en aucun cas garanti ; les performances passées et les simulations ne
      préjugent pas des performances futures. La liquidité en cours de vie dépend du
      marché secondaire assuré par l’émetteur et peut faire ressortir une valeur
      sensiblement inférieure au nominal. Les informations publiées ici sont de nature
      pédagogique et générale : elles ne constituent ni un conseil en investissement, ni
      une recommandation personnalisée, ni une offre de souscription. Seuls le prospectus
      et le document d’informations clés (DIC) de l’émetteur font foi.
    </div>
    <div class="ftr__bot">
      <span>© {ANNEE} {e(EDITEUR)} — tous droits réservés.</span>
      <span>Dernière revue éditoriale : {e(MAJ)}. Hypothèses de marché : {e(MARCHE_REF)}.</span>
    </div>
  </div>
</footer>

<script src="{pfx}assets/data.js"></script>
<script src="{pfx}assets/obs.js"></script>{extra_js}
</body>
</html>
"""

def fil(trail, pfx):
    """Fil d'Ariane visible, aligné sur le BreadcrumbList JSON-LD."""
    parts = []
    for i, (nom, path) in enumerate(trail):
        if i == len(trail) - 1:
            parts.append(f'<span aria-current="page">{nom}</span>')
        else:
            parts.append(f'<a href="{pfx}{path}">{nom}</a>')
    return ('<nav class="crumb" aria-label="Fil d’Ariane">'
            + '<span aria-hidden="true">/</span>'.join(parts) + "</nav>")

def hero(title, lede, crumb_html="", actions="", page=True, h1=True):
    cls = "hero hero--page" if page else "hero"
    act = f'<div class="hero__actions">{actions}</div>' if actions else ""
    tag = "h1" if h1 else "p"
    return f"""<section class="{cls}">
  <div class="hero__grid" aria-hidden="true"></div>
  <div class="container hero__in">
    {crumb_html}
    <{tag} class="title-xl">{title}</{tag}>
    <p class="hero__lede" style="margin-top:22px">{lede}</p>
    {act}
  </div>
</section>"""

def write(filename, content):
    path = os.path.join(OUT, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  · {os.path.relpath(path, ROOT)}  ({len(content)//1024} Ko)")

# ==========================================================================
#  DONNÉES — FAMILLES DE PRODUITS
# ==========================================================================
FAMILLES = [
 dict(
  slug="autocall-phoenix", nom="Autocall Phoenix", profil="Rendement conditionnel",
  resume="La structure la plus distribuée en France : un coupon versé à chaque constatation si le sous-jacent reste au-dessus d’une barrière, et un remboursement anticipé possible dès que le niveau initial est retrouvé.",
  mecanisme=[
    "À chaque date de constatation (souvent trimestrielle ou annuelle), on compare le niveau du sous-jacent à deux seuils. Si le sous-jacent est au-dessus de la <strong>barrière de coupon</strong>, le coupon de la période est versé. S’il est au-dessus du <strong>seuil de rappel</strong> (généralement 100 % du niveau initial), le produit est remboursé par anticipation au nominal, coupon inclus, et s’arrête là.",
    "Si aucun rappel n’a eu lieu jusqu’à l’échéance, le capital est remboursé intégralement tant que le sous-jacent est au-dessus de la <strong>barrière de capital</strong> (par exemple 60 % du niveau initial). En dessous, l’investisseur subit la baisse réelle du sous-jacent, sans amortisseur.",
  ],
  pour="Investisseur qui anticipe un marché stable, légèrement haussier ou modérément baissier, et qui accepte de plafonner son gain au coupon en échange d’une protection partielle à l’échéance.",
  plus=["Coupon connu à l’avance et détaché même en marché baissier modéré",
        "Rappel anticipé qui raccourcit la durée réelle de détention",
        "Barrière de capital souvent profonde (50 à 70 %)"],
  moins=["Gain plafonné : la hausse du sous-jacent au-delà du coupon ne profite pas à l’investisseur",
         "Risque de perte franche dès que la barrière de capital est enfoncée à l’échéance",
         "Durée réelle incertaine, entre quelques mois et la maturité maximale"],
 ),
 dict(
  slug="phoenix-memoire", nom="Phoenix à coupon mémoire", profil="Rendement conditionnel",
  resume="Un Phoenix classique auquel on ajoute un effet mémoire : les coupons non versés ne sont pas perdus, ils sont mis en réserve et rattrapés dès qu’une constatation redevient favorable.",
  mecanisme=[
    "Le fonctionnement est celui de l’Autocall Phoenix. La différence tient à l’<strong>effet mémoire</strong> : chaque coupon manqué est conservé et s’additionne au premier coupon payé par la suite.",
    "Un produit à 8 % annuel qui manque deux constatations puis en réussit une troisième verse 24 % en une fois. La mémoire transforme un trou de performance temporaire en simple report, à condition que le sous-jacent repasse un jour au-dessus de la barrière de coupon.",
  ],
  pour="Investisseur qui redoute moins une baisse durable qu’un passage sous la barrière au mauvais moment, et qui privilégie le rendement total sur la régularité des versements.",
  plus=["Aucun coupon définitivement perdu tant que le produit vit",
        "Lisse l’effet des constatations défavorables isolées",
        "Rendement total souvent supérieur à un Phoenix sans mémoire sur un parcours agité"],
  moins=["Coupon facial légèrement inférieur à un produit sans mémoire, à barrières identiques",
         "Si le sous-jacent ne repasse jamais la barrière de coupon, la mémoire ne sert à rien",
         "Trésorerie irrégulière : versements groupés plutôt que réguliers"],
 ),
 dict(
  slug="athena", nom="Athéna", profil="Rendement capitalisé",
  resume="Pas de coupon détaché en cours de vie : le rendement est capitalisé et versé en une fois, au moment du remboursement anticipé ou à l’échéance.",
  mecanisme=[
    "À chaque constatation, le produit est remboursé par anticipation si le sous-jacent est au-dessus du seuil de rappel. Le versement comprend alors le nominal plus un gain égal au taux annuel multiplié par le nombre d’années écoulées.",
    "Tant que le rappel n’intervient pas, rien n’est versé. À l’échéance, soit le sous-jacent est au-dessus de la barrière finale et le capital est remboursé avec l’intégralité du gain capitalisé, soit il est en dessous de la barrière de capital et l’investisseur encaisse la baisse.",
  ],
  pour="Investisseur qui n’a pas besoin de revenus intermédiaires et préfère un gain intégralement différé, souvent mieux rémunéré qu’un coupon détaché à barrières comparables.",
  plus=["Taux de capitalisation généralement supérieur au coupon d’un Phoenix équivalent",
        "Un seul flux à l’arrivée : simple à suivre et à fiscaliser dans un compte-titres",
        "Capitalisation mécanique qui travaille tant que le produit vit"],
  moins=["Aucun revenu intermédiaire : zéro perçu si le produit ne rappelle jamais et termine sous la barrière",
         "Logique tout ou rien, moins lisible pour un investisseur cherchant du rendement courant",
         "Sensible à la date : un rappel tardif allonge l’immobilisation du capital"],
 ),
 dict(
  slug="reverse-convertible", nom="Reverse Convertible", profil="Rendement élevé, protection limitée",
  resume="Un coupon fixe et inconditionnel, versé quoi qu’il arrive, en échange d’une exposition directe à la baisse du sous-jacent à l’échéance, avec une protection faible ou nulle.",
  mecanisme=[
    "Le coupon est versé à chaque période sans condition de barrière : c’est la seule famille où le rendement est acquis indépendamment du parcours du sous-jacent.",
    "En contrepartie, le remboursement du capital est intégralement conditionné au niveau final. Au-dessus du strike (ou d’une barrière peu profonde, souvent 80 à 90 %), le nominal est remboursé ; en dessous, l’investisseur reçoit l’équivalent de la performance négative du sous-jacent, parfois sous forme de livraison des titres.",
  ],
  pour="Investisseur averti qui recherche un rendement élevé immédiat et accepte d’être assimilé à un acheteur du sous-jacent en cas de baisse.",
  plus=["Coupon certain, non conditionnel",
        "Rendement facial parmi les plus élevés du marché",
        "Structure simple à trois paramètres : coupon, strike, échéance"],
  moins=["Protection du capital faible ou inexistante : le profil de perte ressemble à une détention directe",
         "Aucun rappel anticipé pour sécuriser le gain",
         "Sur un mono sous-jacent action, le risque spécifique de l’émetteur du titre s’ajoute au reste"],
 ),
 dict(
  slug="capital-protege", nom="Capital protégé ou garanti", profil="Protection prioritaire",
  resume="Le nominal est remboursé à l’échéance quel que soit le parcours du sous-jacent — sous la seule réserve de la solvabilité de l’émetteur. Le rendement, lui, reste conditionnel ou partiel.",
  mecanisme=[
    "L’émetteur place l’essentiel du nominal sur une composante obligataire qui ramène 100 % du capital à l’échéance, et consacre le reliquat à l’achat d’options qui portent la performance.",
    "Le niveau des taux conditionne directement l’attrait de cette famille : plus les taux sont élevés, moins la composante obligataire coûte cher et plus le budget d’options est important. La protection ne vaut qu’à l’échéance — en cours de vie, la valeur de marché peut descendre sous le nominal — et elle ne couvre jamais le risque de défaut de l’émetteur.",
  ],
  pour="Trésorerie d’entreprise, investisseur prudent ou allocation cœur de portefeuille, pour qui la préservation du nominal primait sur le rendement.",
  plus=["Capital remboursé à l’échéance, hors défaut de l’émetteur",
        "Profil compatible avec des contraintes prudentielles ou statutaires",
        "Lisibilité forte pour un comité d’investissement"],
  moins=["Participation à la hausse réduite, souvent plafonnée",
         "Protection valable uniquement à l’échéance, pas en cours de vie",
         "Immobilise le capital sur une durée longue, avec un coût d’opportunité réel"],
 ),
 dict(
  slug="participation", nom="Produit de participation", profil="Croissance indexée",
  resume="Pas de coupon : la performance du sous-jacent est restituée, en totalité ou avec un effet de levier, dans une fourchette délimitée par un plancher et un plafond.",
  mecanisme=[
    "L’indexation s’exprime par un <strong>taux de participation</strong> : 100 % pour une restitution à l’identique, 150 % pour un levier, 70 % pour une participation partielle compensée par une protection plus solide.",
    "La fourchette de gain est très souvent bornée par un <strong>cap</strong> (plafond), ce qui finance la protection à la baisse. Les variantes <em>call spread</em>, <em>asiatique</em> (moyenne des constatations) ou <em>lock-in</em> (cliquet qui sécurise les paliers atteints) modulent ce profil.",
  ],
  pour="Investisseur qui a une vue haussière à moyen terme et souhaite rester exposé à la progression du marché tout en bornant sa perte.",
  plus=["Participation réelle à la hausse du sous-jacent, parfois avec levier",
        "Profil proche d’un investissement en actions, avec un amortisseur contractuel",
        "Variante lock-in capable de verrouiller les gains intermédiaires"],
  moins=["Aucun revenu intermédiaire : la performance n’est connue qu’à l’échéance",
         "Plafond qui prive l’investisseur des marchés très haussiers",
         "Les dividendes du sous-jacent ne sont généralement pas reversés"],
 ),
 dict(
  slug="airbag-bonus", nom="Airbag &amp; Bonus", profil="Amortisseur de baisse",
  resume="Deux réponses au défaut majeur des barrières classiques : l’effet de seuil. L’Airbag amortit la perte au-delà de la barrière, le Bonus verse une prime fixe tant qu’un seuil n’a jamais été touché.",
  mecanisme=[
    "<strong>Airbag</strong> : lorsque la barrière de capital est franchie, la perte n’est pas calculée depuis le niveau initial mais depuis la barrière elle-même. Avec une barrière à 60 %, un sous-jacent qui termine à 55 % fait perdre environ 8 % au lieu de 45 %. L’effet falaise est lissé.",
    "<strong>Bonus</strong> : le produit verse une prime prédéfinie à l’échéance tant qu’un seuil bas n’a jamais été touché en continu. Si ce seuil est touché une seule fois, le produit se transforme en exposition directe au sous-jacent et la prime est perdue.",
  ],
  pour="Investisseur qui a compris le danger du franchissement de barrière et accepte un coupon un peu plus faible pour le neutraliser.",
  plus=["Suppression ou atténuation de l’effet de seuil, principal piège des barrières",
        "Perte progressive et non brutale sur la variante Airbag",
        "Profil de risque plus lisible à présenter"],
  moins=["Coupon ou prime inférieurs à ceux d’une structure sèche équivalente",
         "La variante Bonus avec constatation continue est fragile : un seul point de passage suffit",
         "Documentation plus technique, donc plus difficile à comparer"],
 ),
 dict(
  slug="indice-decrement", nom="Indice décrément", profil="Ce que nous ne retenons pas",
  exclu=True,
  resume="Le sous-jacent n’est pas un indice de marché mais un indice construit par l’émetteur, auquel on retranche un dividende forfaitaire chaque année. C’est le socle de la majorité des structures distribuées en France — et la raison pour laquelle nous n’en référençons aucune.",
  mecanisme=[
    "Un indice décrément reproduit un panier d’actions en réinvestissant les dividendes réels, puis en déduisant un prélèvement fixe : soit un pourcentage annuel (par exemple 5 % par an), soit un montant en points d’indice (par exemple 50 points par an).",
    "L’émetteur connaît ainsi à l’avance le flux de dividendes, ce qui lui permet d’afficher des coupons et des barrières plus généreux. La contrepartie est mécanique : si les dividendes réels du panier sont inférieurs au décrément, l’indice progresse structurellement moins vite que l’indice de référence classique. Le décrément en points est particulièrement pénalisant lorsque l’indice baisse, puisque le prélèvement reste constant en valeur absolue au moment même où l’investisseur a besoin que l’indice se maintienne au-dessus de ses barrières.",
    "<strong>Notre position.</strong> Un décrément n’est pas défavorable en soi : correctement calibré — c’est-à-dire proche du rendement du dividende réel du panier — et suffisamment rémunéré en coupon, c’est un arbitrage défendable. Nous avons néanmoins retenu, pour ce comparateur, de ne référencer que des indices publics : leur méthodologie est consultable et leur cotation vérifiable chaque jour, ce qui permet au souscripteur de suivre son placement sans dépendre de son distributeur. Ce choix a un coût, de l’ordre d’un à deux points de coupon à barrières identiques, que nous assumons.",
  ],
  pour="Un investisseur capable de rapporter le prélèvement au rendement du dividende réel du panier, et d’en vérifier la contrepartie en coupon. Cette fiche sert à reconnaître un décrément dans une documentation et à en mesurer le coût.",
  plus=["Permet d’afficher des coupons et des barrières plus attractifs",
        "Volatilité souvent inférieure à celle d’un mono sous-jacent action",
        "Diversification sectorielle ou géographique dans un seul sous-jacent"],
  moins=["Écart de performance croissant avec l’indice de référence au fil du temps",
         "Décrément exprimé en points : effet d’autant plus lourd que l’indice baisse",
         "Indices souvent jeunes : historiques réels courts, le reste étant du backtest",
         "Cotation et méthodologie difficilement vérifiables par l’investisseur"],
 ),
 dict(
  slug="twin-win", nom="Twin Win", profil="Double sens",
  resume="Un produit qui gagne dans les deux sens : la hausse est restituée, et la baisse est convertie en performance positive tant qu’un seuil bas n’est pas franchi.",
  mecanisme=[
    "À l’échéance, une hausse du sous-jacent est restituée selon un taux de participation. Une baisse est transformée en gain équivalent à sa valeur absolue, tant que la barrière basse n’a pas été atteinte.",
    "Si la barrière est franchie, le mécanisme s’éteint : l’investisseur retrouve une exposition directe à la baisse réelle du sous-jacent.",
  ],
  pour="Investisseur qui anticipe un mouvement marqué sans savoir dans quel sens, par exemple avant un événement de marché identifié.",
  plus=["Gagne en marché haussier comme en marché baissier contenu",
        "Réponse pertinente à une vue de forte volatilité sans direction",
        "Profil original, peu corrélé aux structures classiques du portefeuille"],
  moins=["Structure coûteuse : participation souvent inférieure à 100 %",
         "Barrière généralement proche, donc vite atteinte",
         "Rare sur le marché français et peu liquide en secondaire"],
 ),
 dict(
  slug="cln", nom="Credit Linked Note (CLN)", profil="Risque de crédit",
  resume="Le rendement ne dépend pas d’un indice actions mais de la survenance d’un événement de crédit sur un émetteur de référence ou un panier d’émetteurs.",
  mecanisme=[
    "Tant qu’aucun événement de crédit (défaut, restructuration, faillite) n’affecte la référence, le coupon est versé et le capital remboursé à l’échéance.",
    "Si un événement de crédit survient, le remboursement est amputé du taux de recouvrement constaté. L’investisseur porte donc deux risques de crédit distincts : celui de l’émetteur du titre et celui de la référence sous-jacente.",
  ],
  pour="Investisseur obligataire qui cherche un surcroît de rendement sur une signature qu’il connaît et dont il accepte le risque de défaut.",
  plus=["Rendement décorrélé des marchés actions",
        "Exposition à une signature précise, choisie et analysable",
        "Insensible aux mouvements de marché tant qu’il n’y a pas d’événement de crédit"],
  moins=["Deux risques de crédit cumulés : émetteur et référence",
         "Perte potentiellement très lourde et brutale en cas de défaut",
         "Analyse crédit exigeante, hors de portée d’un investisseur non spécialiste"],
 ),
 dict(
  slug="produits-taux", nom="Produits de taux", profil="Taux &amp; obligataire",
  resume="Le sous-jacent n’est plus une action ou un indice mais une courbe de taux : Euribor, CMS, inflation. Structures privilégiées pour les placements de trésorerie.",
  mecanisme=[
    "Les variantes les plus courantes sont le <em>callable</em> (taux fixe élevé, l’émetteur pouvant rappeler le titre aux dates prévues), le <em>range accrual</em> (coupon versé chaque jour où le taux de référence reste dans une fourchette) et les formules indexées sur l’inflation ou la pente de la courbe.",
    "Ces produits ne comportent généralement aucune exposition actions : le capital est le plus souvent protégé à l’échéance, et le risque résiduel est le risque de taux en cours de vie et le risque de crédit de l’émetteur.",
  ],
  pour="Trésorier d’entreprise, holding ou investisseur institutionnel qui veut améliorer la rémunération d’une poche obligataire sans exposition actions.",
  plus=["Pas de risque actions, capital généralement protégé à l’échéance",
        "Rémunération supérieure à un compte à terme de même maturité",
        "Compatible avec un cadre de placement de trésorerie encadré"],
  moins=["Option de rappel détenue par l’émetteur, donc exercée contre l’investisseur",
         "Valeur de marché très sensible aux mouvements de taux en cours de vie",
         "Durées souvent longues, avec un risque de réinvestissement défavorable"],
 ),
 dict(
  slug="discount", nom="Certificat Discount", profil="Décote à l’entrée",
  resume="Pas de coupon : l’avantage est pris à l’achat, sous forme d’une décote sur le niveau du sous-jacent. Le gain est plafonné à un niveau fixé dès l’origine.",
  mecanisme=[
    "L’investisseur achète le certificat en dessous du cours du sous-jacent. À l’échéance, il reçoit le plus petit des deux montants entre le niveau du sous-jacent et le plafond.",
    "La décote constitue l’amortisseur : le produit reste gagnant tant que le sous-jacent ne baisse pas plus que la décote accordée au départ.",
  ],
  pour="Investisseur qui veut s’exposer à un sous-jacent avec une marge de sécurité et qui accepte un gain borné.",
  plus=["Entrée à prix réduit, qui constitue une protection immédiate",
        "Structure simple, lisible en deux paramètres",
        "Gain atteint même en cas de légère baisse du sous-jacent"],
  moins=["Gain plafonné, souvent modeste",
         "Pas de coupon : rien n’est perçu avant l’échéance",
         "Perte proportionnelle au-delà de la décote, sans barrière protectrice"],
 ),
]

# ==========================================================================
#  DONNÉES — ÉMETTEURS
# ==========================================================================
# Notations de crédit long terme (dette senior), à titre indicatif et à la
# date indiquée par ANNEE_RATINGS. Elles évoluent : à revérifier auprès des
# agences avant toute utilisation commerciale.
EMETTEURS = [
 dict(nom="BNP Paribas", pays="France", groupe="BNP Paribas", zone="Zone euro",
      sp="A+", moodys="Aa3", fitch="A+", format="EMTN · BMTN · certificats",
      profil="Premier émetteur français par les volumes placés auprès des réseaux de distribution. Gamme très large, du capital garanti aux autocalls sur indices décrément maison.",
      forces=["Signature parmi les plus solides du marché européen", "Profondeur de gamme et capacité à structurer sur mesure dès des montants modestes", "Marché secondaire régulier et documentation en français"],
      vigilance="Les indices décrément propriétaires doivent être analysés pour eux-mêmes : la mécanique de prélèvement explique une large part du coupon affiché."),
 dict(nom="Société Générale", pays="France", groupe="Société Générale", zone="Zone euro",
      sp="A", moodys="A1", fitch="A-", format="EMTN · certificats · warrants",
      profil="Acteur historique des produits structurés en Europe, présent à la fois sur la distribution grand public et sur le sur-mesure institutionnel.",
      forces=["Expertise de structuration reconnue de longue date", "Gamme d’indices et de sous-jacents très étendue", "Forte présence dans les contrats d’assurance-vie français"],
      vigilance="Notation senior un cran en dessous des meilleures signatures françaises : à intégrer dans la comparaison des coupons à barrières égales."),
 dict(nom="Crédit Agricole CIB", pays="France", groupe="Crédit Agricole", zone="Zone euro",
      sp="A+", moodys="Aa3", fitch="A+", format="EMTN · BMTN",
      profil="Banque de financement et d’investissement du groupe Crédit Agricole, très active sur les structures de taux et les placements de trésorerie.",
      forces=["Qualité de crédit élevée, adossée à un groupe mutualiste", "Savoir-faire marqué sur les produits de taux et le capital garanti", "Bonne acceptation par les comités d’investissement prudents"],
      vigilance="Gamme actions moins fournie que celle des deux premiers émetteurs français."),
 dict(nom="Natixis", pays="France", groupe="BPCE", zone="Zone euro",
      sp="A", moodys="A1", fitch="A+", format="EMTN · BMTN",
      profil="Pôle de banque de grande clientèle du groupe BPCE, distribuant largement au travers des Banques Populaires et Caisses d’Épargne.",
      forces=["Capacité de structuration importante sur indices et paniers", "Distribution adossée à un réseau bancaire de premier plan", "Gamme adaptée aux enveloppes assurantielles françaises"],
      vigilance="Vérifier l’entité émettrice précise mentionnée sur le DIC, le groupe utilisant plusieurs véhicules."),
 dict(nom="Crédit Mutuel / CIC", pays="France", groupe="Crédit Mutuel Alliance Fédérale", zone="Zone euro",
      sp="A+", moodys="Aa3", fitch="AA-", format="EMTN · BMTN",
      profil="Émetteur mutualiste présentant l’une des meilleures notations de la place française, actif principalement auprès de ses propres réseaux.",
      forces=["Notation Fitch parmi les plus élevées des émetteurs français", "Structures sobres et lisibles", "Modèle mutualiste peu exposé aux activités de marché"],
      vigilance="Offre moins facilement accessible en architecture ouverte hors des réseaux du groupe."),
 dict(nom="Goldman Sachs", pays="États-Unis", groupe="The Goldman Sachs Group", zone="Hors zone euro",
      sp="BBB+", moodys="A2", fitch="A", format="EMTN · notes",
      profil="Référence mondiale de l’ingénierie financière, très présente sur le sur-mesure et les sous-jacents complexes.",
      forces=["Capacité d’innovation sur les formules et les paniers", "Pricing souvent agressif sur les structures exotiques", "Profondeur de marché secondaire"],
      vigilance="Notation senior inférieure à celle des grandes banques européennes : exiger une prime de coupon correspondante."),
 dict(nom="J.P. Morgan", pays="États-Unis", groupe="JPMorgan Chase &amp; Co.", zone="Hors zone euro",
      sp="A-", moodys="A1", fitch="AA-", format="EMTN · notes",
      profil="Première banque américaine par la capitalisation, émetteur de référence sur les notes structurées et les indices propriétaires.",
      forces=["Bilan parmi les plus solides du secteur mondial", "Large gamme d’indices et de stratégies quantitatives", "Documentation standardisée et lisible"],
      vigilance="Produits souvent libellés en dollar : le risque de change doit être traité séparément du risque de marché."),
 dict(nom="Morgan Stanley", pays="États-Unis", groupe="Morgan Stanley", zone="Hors zone euro",
      sp="A-", moodys="A1", fitch="A", format="EMTN · notes",
      profil="Banque d’investissement américaine active sur les structures actions et les solutions destinées à la gestion de fortune.",
      forces=["Expertise forte sur les sous-jacents actions américains", "Offre adaptée aux portefeuilles internationaux", "Bonne liquidité secondaire sur les souches importantes"],
      vigilance="Accès souvent conditionné à des montants d’entrée plus élevés sur le sur-mesure."),
 dict(nom="Citigroup", pays="États-Unis", groupe="Citigroup", zone="Hors zone euro",
      sp="BBB+", moodys="A3", fitch="A", format="EMTN · notes",
      profil="Émetteur international présent sur les structures actions, taux et crédit, avec une forte dimension émergente.",
      forces=["Couverture géographique très large, y compris marchés émergents", "Gamme crédit et CLN développée", "Pricing compétitif sur les formats standards"],
      vigilance="Signature la moins bien notée du groupe des grandes banques américaines : la prime de coupon doit le refléter."),
 dict(nom="Bank of America", pays="États-Unis", groupe="Bank of America Corp.", zone="Hors zone euro",
      sp="A-", moodys="A1", fitch="AA-", format="EMTN · notes",
      profil="Banque universelle américaine, émetteur régulier de notes structurées sur indices et paniers d’actions.",
      forces=["Qualité de crédit solide pour une signature américaine", "Volumes importants assurant une bonne liquidité", "Formules classiques et bien documentées"],
      vigilance="Offre moins personnalisable que celle des spécialistes européens sur petits montants."),
 dict(nom="Barclays", pays="Royaume-Uni", groupe="Barclays PLC", zone="Hors zone euro",
      sp="BBB+", moodys="Baa1", fitch="A", format="EMTN · certificats",
      profil="Émetteur britannique historique du marché des produits structurés européens, actif sur les indices propriétaires.",
      forces=["Longue expérience de la distribution européenne", "Gamme d’indices maison étoffée", "Souplesse sur les formats et les devises"],
      vigilance="Notation la plus basse du panel des grandes signatures : à réserver à une fraction mesurée de l’allocation."),
 dict(nom="HSBC", pays="Royaume-Uni", groupe="HSBC Holdings", zone="Hors zone euro",
      sp="A-", moodys="A3", fitch="A+", format="EMTN · notes",
      profil="Groupe bancaire international à forte implantation asiatique, émetteur de structures sur sous-jacents mondiaux.",
      forces=["Accès naturel aux sous-jacents asiatiques", "Bilan diversifié géographiquement", "Gamme multidevises"],
      vigilance="Exposition asiatique à prendre en compte dans l’appréciation du risque de contrepartie."),
 dict(nom="UBS", pays="Suisse", groupe="UBS Group AG", zone="Hors zone euro",
      sp="A-", moodys="A3", fitch="A", format="EMTN · certificats",
      profil="Premier groupe bancaire suisse, acteur majeur des produits structurés destinés à la gestion de fortune après l’intégration de Credit Suisse.",
      forces=["Ingénierie reconnue et gamme très large", "Forte culture du sur-mesure pour la clientèle privée", "Plateforme de structuration industrialisée"],
      vigilance="Intégration d’un ensemble bancaire considérable : suivre l’évolution de la notation et des perspectives des agences."),
 dict(nom="Deutsche Bank", pays="Allemagne", groupe="Deutsche Bank AG", zone="Zone euro",
      sp="A", moodys="A1", fitch="A", format="EMTN · certificats",
      profil="Principale banque allemande, active sur les structures de taux, de crédit et les certificats cotés.",
      forces=["Signature redressée par rapport à la décennie précédente", "Expertise de premier rang sur les taux et le crédit", "Marché des certificats cotés très développé en Allemagne"],
      vigilance="Historique de volatilité de la notation : privilégier des maturités mesurées."),
 dict(nom="UniCredit", pays="Italie", groupe="UniCredit S.p.A.", zone="Zone euro",
      sp="BBB+", moodys="Baa1", fitch="BBB+", format="EMTN · certificati",
      profil="Groupe bancaire italien très actif sur les certificats et les structures à coupon élevé distribuées en Europe du Sud.",
      forces=["Coupons souvent supérieurs à ceux des émetteurs français", "Gamme de certificats cotés abondante", "Positions fortes en Europe centrale"],
      vigilance="Notation de catégorie BBB : le supplément de coupon rémunère un risque de crédit réellement plus élevé."),
 dict(nom="Intesa Sanpaolo", pays="Italie", groupe="Intesa Sanpaolo", zone="Zone euro",
      sp="BBB", moodys="Baa1", fitch="BBB", format="EMTN · certificati",
      profil="Premier groupe bancaire italien par la taille du bilan domestique, émetteur régulier de certificats structurés.",
      forces=["Rendements faciaux élevés", "Base de dépôts domestique solide", "Formats standardisés faciles à comparer"],
      vigilance="Notation parmi les plus basses du panel : usage ponctuel et diversifié uniquement."),
 dict(nom="Banco Santander", pays="Espagne", groupe="Banco Santander", zone="Zone euro",
      sp="A+", moodys="A2", fitch="A-", format="EMTN · notes",
      profil="Groupe bancaire espagnol de dimension mondiale, actif sur les structures actions et les sous-jacents ibériques et latino-américains.",
      forces=["Notation Standard &amp; Poor’s élevée", "Diversification géographique importante", "Accès à des sous-jacents peu couverts par les émetteurs français"],
      vigilance="Écart notable entre les notations des trois agences : lire les trois plutôt qu’une seule."),
 dict(nom="BBVA", pays="Espagne", groupe="BBVA", zone="Zone euro",
      sp="A", moodys="Baa1", fitch="A-", format="EMTN · notes",
      profil="Second groupe bancaire espagnol, émetteur de structures sur indices européens et émergents.",
      forces=["Bonne rentabilité opérationnelle", "Offre compétitive sur les maturités courtes", "Présence émergente différenciante"],
      vigilance="Exposition émergente significative, à apprécier en complément de la notation."),
 dict(nom="ING", pays="Pays-Bas", groupe="ING Groep", zone="Zone euro",
      sp="A+", moodys="A1", fitch="A+", format="EMTN · notes",
      profil="Groupe néerlandais à la signature solide, présent sur les structures de taux et les formats simples en euro.",
      forces=["Qualité de crédit élevée et stable", "Structures sobres, peu exotiques", "Positionnement naturel sur la trésorerie d’entreprise"],
      vigilance="Gamme actions restreinte, peu de sur-mesure sur petits montants."),
 dict(nom="Leonteq", pays="Suisse", groupe="Leonteq AG", zone="Hors zone euro",
      sp="Non noté", moodys="Non noté", fitch="Non noté", format="Notes · COSI · émissions tierces",
      profil="Spécialiste suisse de la structuration, souvent présent comme structureur pour le compte d’émetteurs tiers plutôt qu’en son nom propre.",
      forces=["Réactivité et personnalisation poussée, y compris sur petits nominaux", "Plateforme technologique de pricing performante", "Possibilité d’émissions collatéralisées réduisant le risque de contrepartie"],
      vigilance="Absence de notation publique : identifier impérativement l’émetteur juridique et le garant réels du titre sur le DIC."),
 dict(nom="Vontobel", pays="Suisse", groupe="Vontobel Holding AG", zone="Hors zone euro",
      sp="Non noté", moodys="A2", fitch="Non noté", format="Certificats · notes",
      profil="Banque privée suisse dotée d’une activité de certificats structurés développée, surtout sur les marchés germanophones.",
      forces=["Notation Moody’s de bon niveau", "Gamme de certificats cotés très lisible", "Spécialisation sur les thématiques et les paniers d’actions"],
      vigilance="Notée par une seule agence : la comparaison avec les émetteurs triplement notés demande de la prudence."),
 dict(nom="Nomura", pays="Japon", groupe="Nomura Holdings", zone="Hors zone euro",
      sp="BBB+", moodys="Baa1", fitch="A-", format="EMTN · notes",
      profil="Première maison de titres japonaise, émetteur de structures sur sous-jacents asiatiques et sur indices propriétaires.",
      forces=["Accès privilégié aux marchés japonais et asiatiques", "Expertise quantitative solide", "Sous-jacents peu redondants avec l’offre européenne"],
      vigilance="Signature de catégorie BBB et documentation parfois moins familière aux investisseurs français."),
]

# ==========================================================================
#  DONNÉES — ÉTABLISSEMENTS QUI TRAITENT LES PRODUITS STRUCTURÉS
# ==========================================================================
# Chaque établissement est décrit par son rôle dans la chaîne de valeur.
# Les descriptions sont volontairement génériques et qualitatives : les
# conditions commerciales, montants d'entrée et référencements évoluent
# constamment et doivent être vérifiés auprès de chaque établissement.
CAT_ETAB = [
 ("structureur", "Structureurs &amp; sociétés de solutions",
  "Ils conçoivent la formule, organisent la mise en concurrence des émetteurs et portent la documentation commerciale. Ils ne sont pas eux-mêmes débiteurs du titre : le risque de crédit reste celui de l’émetteur retenu."),
 ("plateforme", "Plateformes de structuration &amp; de suivi",
  "Outils qui industrialisent la demande de prix auprès de plusieurs émetteurs, la comparaison des formules et le suivi des constatations. Leur apport est technologique, non financier."),
 ("assureur", "Assureurs &amp; enveloppes",
  "Les produits structurés sont très majoritairement souscrits en unités de compte au sein de contrats d’assurance-vie ou de capitalisation. L’assureur référence le titre, en assure la valorisation et porte le cadre juridique de l’enveloppe."),
 ("distributeur", "Banques privées, family offices &amp; conseils",
  "Ils sélectionnent, expliquent et suivent les produits pour le compte de l’investisseur final. C’est à ce niveau que se joue la qualité du conseil : analyse du sous-jacent, pertinence du calibrage, suivi des constatations."),
]

ETABLISSEMENTS = [
 # --- Structureurs ---
 dict(cat="structureur", nom="Kepler Cheuvreux Solutions", pays="France",
      role="Structureur indépendant",
      txt="Pôle de solutions d’investissement d’un courtier européen de référence. Intervient sur la conception de formules et la mise en concurrence multi-émetteurs pour le compte de distributeurs et d’institutionnels."),
 dict(cat="structureur", nom="Privalto", pays="France", role="Structureur adossé à un émetteur",
      txt="Marque dédiée aux produits structurés de BNP Paribas à destination des réseaux de distribution et des conseils en gestion de patrimoine. Gamme large allant du capital garanti aux autocalls sur indices décrément."),
 dict(cat="structureur", nom="Adequity", pays="France", role="Structureur adossé à un émetteur",
      txt="Marque de produits structurés de Société Générale orientée vers les conseillers en gestion de patrimoine et les réseaux partenaires, avec une gamme régulièrement renouvelée."),
 dict(cat="structureur", nom="Irbis Finance", pays="France", role="Structureur indépendant",
      txt="Société de structuration indépendante travaillant en architecture ouverte : elle met en concurrence plusieurs émetteurs sur une formule définie avec le distributeur ou l’investisseur."),
 dict(cat="structureur", nom="Equitim", pays="France", role="Structureur indépendant",
      txt="Spécialiste français des produits structurés sur mesure, intervenant notamment auprès des conseils en gestion de patrimoine et des multi-family offices."),
 dict(cat="structureur", nom="Zenith Global Advisors", pays="France", role="Structureur indépendant",
      txt="Acteur indépendant positionné sur la conception de produits de rendement et de participation pour la clientèle privée et les institutionnels."),
 dict(cat="structureur", nom="DS Investment Solutions", pays="France", role="Structureur indépendant",
      txt="Société de solutions d’investissement adossée à un groupe de courtage, active sur la structuration sur mesure et le suivi en vie du produit."),
 dict(cat="structureur", nom="Marex Solutions", pays="Royaume-Uni", role="Structureur international",
      txt="Division de solutions d’un groupe de services financiers britannique, reconnue pour sa capacité à structurer sur des nominaux réduits et sur des sous-jacents variés."),
 dict(cat="structureur", nom="Leonteq", pays="Suisse", role="Structureur &amp; émetteur",
      txt="Spécialiste suisse intervenant à la fois comme structureur pour des émetteurs tiers et comme émetteur en nom propre, avec une plateforme de pricing en temps réel."),
 dict(cat="structureur", nom="Vontobel Structured Solutions", pays="Suisse", role="Structureur &amp; émetteur",
      txt="Activité de certificats et de produits structurés d’une banque privée suisse, très développée sur les marchés germanophones et les thématiques d’investissement."),
 dict(cat="structureur", nom="Oddo BHF", pays="France / Allemagne", role="Banque &amp; structureur",
      txt="Groupe financier franco-allemand disposant d’une activité de produits structurés adossée à ses métiers de marché et de gestion privée."),
 dict(cat="structureur", nom="Hedios", pays="France", role="Concepteur &amp; distributeur",
      txt="Maison spécialisée dans la conception et la distribution en direct de gammes de produits de rendement à barrières, avec un historique public de ses millésimes."),

 # --- Plateformes ---
 dict(cat="plateforme", nom="Feefty", pays="France", role="Plateforme de structuration",
      txt="Plateforme française permettant à un conseil de construire une formule, d’interroger simultanément plusieurs émetteurs et de suivre la vie du produit. Démocratise l’accès au sur-mesure sur des montants réduits."),
 dict(cat="plateforme", nom="Vestr", pays="Suisse", role="Plateforme de gestion",
      txt="Outil de création et de suivi de certificats et de produits structurés, utilisé par des gérants et des banques privées pour industrialiser leurs mandats."),
 dict(cat="plateforme", nom="Luma Financial Technologies", pays="États-Unis / Suisse", role="Plateforme multi-émetteurs",
      txt="Place de marché indépendante de produits structurés : comparaison d’offres, demande de prix auprès de plusieurs émetteurs, suivi de portefeuille et formation."),
 dict(cat="plateforme", nom="Halo Investing", pays="États-Unis", role="Plateforme multi-émetteurs",
      txt="Plateforme technologique ouvrant l’accès aux produits structurés aux conseillers indépendants, avec mise en concurrence automatisée des émetteurs."),
 dict(cat="plateforme", nom="SIX Structured Products", pays="Suisse", role="Marché réglementé",
      txt="Segment de la Bourse suisse dédié aux produits structurés cotés : transparence des cours, liquidité organisée et données de référence sur un très large univers."),
 dict(cat="plateforme", nom="EUSIPA", pays="Europe", role="Association professionnelle",
      txt="Fédération européenne des produits d’investissement structurés. Publie la nomenclature de référence des familles de produits et des statistiques de marché trimestrielles."),

 # --- Assureurs ---
 dict(cat="assureur", nom="Generali Patrimoine", pays="France", role="Assureur",
      txt="Référence historique de l’assurance-vie en architecture ouverte en France. Contrats largement utilisés pour loger des produits structurés en unités de compte."),
 dict(cat="assureur", nom="Spirica", pays="France", role="Assureur",
      txt="Filiale d’assurance-vie d’un grand groupe bancaire français, réputée pour la largeur de son référencement en unités de compte, dont les titres structurés."),
 dict(cat="assureur", nom="Cardif", pays="France", role="Assureur",
      txt="Pôle assurance d’un grand groupe bancaire français, présent sur les contrats d’assurance-vie et de capitalisation accueillant des supports structurés."),
 dict(cat="assureur", nom="Swiss Life", pays="France / Suisse", role="Assureur",
      txt="Assureur présent sur les contrats haut de gamme français et luxembourgeois, avec une architecture ouverte étendue."),
 dict(cat="assureur", nom="Axa Thema", pays="France", role="Assureur",
      txt="Plateforme d’assurance-vie en architecture ouverte dédiée aux conseils en gestion de patrimoine et aux banques privées."),
 dict(cat="assureur", nom="Suravenir", pays="France", role="Assureur",
      txt="Assureur d’un groupe mutualiste breton, très présent sur les contrats distribués par les courtiers et les plateformes en ligne."),
 dict(cat="assureur", nom="Oradéa Vie", pays="France", role="Assureur",
      txt="Compagnie d’assurance-vie dédiée aux partenariats de distribution, utilisée pour référencer des supports structurés sur mesure."),
 dict(cat="assureur", nom="Intencial Patrimoine", pays="France", role="Assureur",
      txt="Marque patrimoniale d’un groupe de protection sociale, positionnée sur les contrats d’assurance-vie en architecture ouverte."),
 dict(cat="assureur", nom="Nortia", pays="France", role="Plateforme de distribution",
      txt="Plateforme de services aux conseils en gestion de patrimoine donnant accès à plusieurs contrats d’assurance-vie et à une offre structurée régulièrement renouvelée."),
 dict(cat="assureur", nom="UAF Life Patrimoine", pays="France", role="Plateforme de distribution",
      txt="Plateforme patrimoniale adossée à un grand groupe bancaire, proposant des contrats en architecture ouverte et une gamme structurée dédiée."),
 dict(cat="assureur", nom="Lombard International", pays="Luxembourg", role="Assureur luxembourgeois",
      txt="Assureur luxembourgeois spécialisé dans les contrats de clientèle fortunée, acceptant les titres structurés en gestion dédiée et le triangle de sécurité luxembourgeois."),
 dict(cat="assureur", nom="Wealins", pays="Luxembourg", role="Assureur luxembourgeois",
      txt="Compagnie luxembourgeoise orientée vers la clientèle internationale, avec des contrats permettant une grande liberté d’actifs éligibles."),
 dict(cat="assureur", nom="Bâloise Vie Luxembourg", pays="Luxembourg", role="Assureur luxembourgeois",
      txt="Assureur luxembourgeois proposant des contrats dédiés compatibles avec le logement de produits structurés sur mesure."),
 dict(cat="assureur", nom="OneLife", pays="Luxembourg", role="Assureur luxembourgeois",
      txt="Compagnie luxembourgeoise du secteur de l’assurance-vie en libre prestation de services, utilisée pour les patrimoines internationaux."),
 dict(cat="assureur", nom="Vitis Life", pays="Luxembourg", role="Assureur luxembourgeois",
      txt="Assureur luxembourgeois intervenant sur les contrats haut de gamme et les mandats dédiés comprenant des titres structurés."),

 # --- Distributeurs ---
 dict(cat="distributeur", nom="Banques privées françaises", pays="France", role="Distributeur",
      txt="Les banques privées des grands groupes disposent de desks dédiés qui proposent régulièrement des souches à leurs clients, souvent adossées à l’émetteur du groupe. Avantage : simplicité. Point de vigilance : l’architecture n’est pas toujours ouverte."),
 dict(cat="distributeur", nom="Conseils en gestion de patrimoine (CGP)", pays="France", role="Distributeur indépendant",
      txt="Statut réglementé (CIF, immatriculation ORIAS) qui permet d’accéder à plusieurs structureurs et plusieurs assureurs. C’est la voie la plus courante pour obtenir une véritable mise en concurrence des émetteurs."),
 dict(cat="distributeur", nom="Multi-family offices", pays="France", role="Conseil patrimonial global",
      txt="Interviennent sur des montants permettant la structuration sur mesure et dédiée. Leur valeur ajoutée porte sur le calibrage des barrières et l’intégration du produit dans une allocation d’ensemble."),
 dict(cat="distributeur", nom="Sociétés de gestion de portefeuille", pays="France", role="Gestion sous mandat",
      txt="Intègrent des produits structurés dans des mandats ou des fonds dédiés, avec une discipline de sélection et un suivi des constatations formalisés."),
 dict(cat="distributeur", nom="Courtiers en ligne", pays="France", role="Distributeur direct",
      txt="Donnent accès à des gammes standardisées à frais réduits, le plus souvent sans accompagnement sur l’analyse de la formule. Adapté à l’investisseur autonome et déjà formé."),
 dict(cat="distributeur", nom="Autorité des marchés financiers (AMF)", pays="France", role="Régulateur",
      txt="Supervise la commercialisation des produits structurés en France. Sa position-recommandation sur la commercialisation des instruments financiers complexes encadre notamment le degré de complexité acceptable pour la clientèle non professionnelle."),
]

# ==========================================================================
#  DONNÉES — CATALOGUE DE STRUCTURES
# ==========================================================================
# PARTI PRIS ÉDITORIAL — aucun indice décrément.
# Toutes les structures retenues reposent sur des indices de marché publics
# (CAC 40, EURO STOXX 50, S&P 500…) ou sur des actions, à l'exclusion des
# indices propriétaires à prélèvement forfaitaire. Le coupon est financé par
# les dividendes non réinvestis de l'indice de référence, mécanisme vérifiable
# par l'investisseur, et non par un décrément contractuel.
#
# NATURE DES DONNÉES — ce sont des GABARITS DE STRUCTURES représentatifs de ce
# qui se traite sur le marché français : chaque entrée décrit une combinaison
# famille / sous-jacent / barrières / maturité et un niveau de coupon cohérent
# avec les conditions de marché de la période indiquée par MAJ. Ce ne sont PAS
# des souches en cours de commercialisation : aucun code ISIN n'est publié et
# les conditions définitives ne sont arrêtées qu'à la date de strike.

def P(nom, famille, emetteur, rating, sj, sj_type, coupon, freq, bc, bk, ac,
      maturite, note, mecanisme, sc_fav, sc_med, sc_def, attention,
      devise="EUR", decrement=None, non_call=0, memoire=False, sri=6,
      frais="Jusqu’à 1,00 % par an de frais de distribution inclus dans la formule",
      enveloppes=("Assurance-vie", "Compte-titres"), format="EMTN senior non garanti",
      sj_detail=None, tags=()):
    return dict(nom=nom, famille=famille, emetteur=emetteur, emetteur_rating=rating,
                sous_jacent=sj, sous_jacent_detail=sj_detail or sj, sj_type=sj_type,
                devise=devise, coupon=coupon, frequence=freq, b_coupon=bc,
                b_capital=bk, b_autocall=ac, decrement=decrement, non_call=non_call,
                maturite=maturite, memoire=memoire, sri=sri, frais=frais,
                enveloppes=list(enveloppes), statut="Gabarit de référence", note=note,
                mecanisme=mecanisme, sc_fav=sc_fav, sc_med=sc_med, sc_def=sc_def,
                attention=list(attention), tags=list(tags), format=format)

AV, CTO, PER, PEA = "Assurance-vie", "Compte-titres", "PER", "PEA"
IDX, SEC, WOF, ACT = "Indice actions", "Indice sectoriel", "Panier Worst-of", "Action"
TAUX, CRED, GEO, THE, ESG = "Taux", "Crédit", "Indice géographique", "Indice thématique", "Indice ESG"

PRODUITS = [
 P("Phoenix Mémoire 10 ans — EURO STOXX 50", "Phoenix à coupon mémoire",
   "BNP Paribas", "A+ / Aa3 / A+", "EURO STOXX 50", IDX,
   0.100, "Trimestrielle", 0.60, 0.60, 1.00, 10, 5, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Constatation trimestrielle sur l’EURO STOXX 50, indice public dividendes non réinvestis. Coupon de 2,50 % par trimestre versé si l’indice clôture au-dessus de 60 % de son niveau initial, avec effet mémoire intégral. Rappel automatique au nominal majoré des coupons dès que l’indice atteint 100 % de son niveau initial, à partir du 4e trimestre. À l’échéance, capital remboursé intégralement si l’indice est au-dessus de 60 %.",
   sc_fav="Rappel dès la fin de la première année : 10,00 % de gain, capital restitué, produit clôturé.",
   sc_med="Aucun rappel, indice à 85 % à l’échéance : coupons encaissés sur toute la période, capital remboursé à 100 %.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital, sans amortisseur, coupons déjà perçus conservés.",
   attention=["La barrière de 60 % est constatée uniquement à l’échéance, ce qui autorise de longs passages sous ce seuil sans conséquence définitive.",
              "Le coupon est financé par les dividendes de l’indice, que l’investisseur ne perçoit pas : sur dix ans, c’est un renoncement substantiel.",
              "Sur 10 ans, un gain plafonné à 10 % par an prive l’investisseur d’un marché actions franchement haussier."],
   tags=("mémoire", "défensif", "indice public", "sans décrément")),

 P("Autocall Phoenix 12 ans — EURO STOXX 50", "Autocall Phoenix",
   "Société Générale", "A / A1 / A-", "EURO STOXX 50", IDX,
   0.112, "Trimestrielle", 0.70, 0.50, 1.00, 12, 4, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Coupon trimestriel de 2,80 % versé si l’indice est au-dessus de 70 % de son niveau initial, avec mémoire. Rappel au pair dès franchissement de 100 % à partir de la cinquième constatation. Barrière de capital très profonde à 50 %, constatée à la seule date d’échéance.",
   sc_fav="Rappel au bout de 18 mois : environ 16,80 % de gain cumulé puis restitution du capital.",
   sc_med="Indice à 75 % à l’échéance : la totalité des coupons a été versée, le capital est remboursé à 100 %.",
   sc_def="Indice à 40 % à l’échéance : perte de 60 % du capital.",
   attention=["Maturité de 12 ans : il faut accepter une immobilisation potentiellement très longue du capital.",
              "La barrière de coupon à 70 % est plus haute que celle des structures à 60 % : les coupons sont interrompus plus tôt en cas de baisse.",
              "Le coupon élevé traduit la profondeur de la barrière de capital et la longueur de la maturité, non une générosité particulière."],
   tags=("barrière profonde", "mémoire", "long terme", "sans décrément")),

 P("Athéna 8 ans — CAC 40", "Athéna",
   "Crédit Agricole CIB", "A+ / Aa3 / A+", "CAC 40", IDX,
   0.118, "Annuelle (capitalisé)", None, 0.60, 1.00, 8, 4, non_call=12,
   enveloppes=(AV, CTO, PER),
   mecanisme="Aucun coupon détaché en cours de vie. À chaque constatation annuelle, si le CAC 40 est au-dessus de son niveau initial, le produit est remboursé au nominal majoré de 11,80 % par année écoulée. À l’échéance, remboursement intégral majoré du gain capitalisé si l’indice est au-dessus de 60 %.",
   sc_fav="Rappel à la deuxième constatation : 23,60 % de gain versé en une fois.",
   sc_med="Rappel à la septième année : 82,6 % de gain cumulé, soit une performance annualisée proche de 9,0 %.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % du capital, aucun gain n’ayant jamais été versé.",
   attention=["Structure sans aucun revenu intermédiaire : si l’indice reste durablement sous 100 %, rien n’est perçu avant l’échéance.",
              "Logique tout ou rien à l’arrivée : le passage sous 60 % anéantit huit années de rendement potentiel.",
              "Le CAC 40 publié est un indice dividendes non réinvestis : c’est ce flux abandonné qui finance le taux de capitalisation."],
   tags=("capitalisation", "sans coupon", "indice français", "sans décrément")),

 P("Phoenix Airbag 10 ans — EURO STOXX 50", "Airbag &amp; Bonus",
   "Natixis", "A / A1 / A+", "EURO STOXX 50", IDX,
   0.092, "Trimestrielle", 0.60, 0.60, 1.00, 10, 5, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Phoenix mémoire classique assorti d’un mécanisme airbag : si l’indice termine sous 60 %, la perte n’est pas calculée depuis le niveau initial mais depuis la barrière. La baisse constatée est divisée par 0,60, ce qui supprime l’effet de seuil.",
   sc_fav="Rappel à la première année : 9,20 % de gain, capital restitué.",
   sc_med="Indice à 70 % à l’échéance : coupons intégralement versés, capital remboursé à 100 %.",
   sc_def="Indice à 55 % à l’échéance : perte limitée à environ 8,3 % grâce à l’airbag, contre 45 % sur une barrière sèche.",
   attention=["Le coupon est inférieur d’environ deux points à une structure identique sans airbag : c’est le prix de l’amortisseur.",
              "L’airbag atténue la perte mais ne l’élimine pas : une chute de l’indice à 30 % entraîne encore une perte de 50 %.",
              "Vérifier dans le DIC la formule exacte de l’airbag, les modalités variant d’un émetteur à l’autre."],
   tags=("airbag", "mémoire", "protection renforcée", "sans décrément")),

 P("Phoenix 6 ans — EURO STOXX Banks", "Autocall Phoenix",
   "J.P. Morgan", "A- / A1 / AA-", "EURO STOXX Banks", SEC,
   0.132, "Semestrielle", 0.65, 0.55, 1.00, 6, 3, non_call=6, memoire=True, sri=6,
   enveloppes=(AV, CTO),
   mecanisme="Coupon semestriel de 6,60 % conditionné à un indice au-dessus de 65 %, avec mémoire. Rappel possible dès la première constatation semestrielle. Barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à six mois : 6,60 % de gain sur une immobilisation d’un semestre.",
   sc_med="Rappel en quatrième année : environ 52,8 % de gain cumulé.",
   sc_def="Indice à 40 % à l’échéance : perte de 60 % du capital.",
   attention=["Un indice sectoriel bancaire est beaucoup plus volatil qu’un indice diversifié : le coupon élevé rémunère ce risque réel.",
              "Forte sensibilité au cycle de taux et au risque systémique du secteur financier.",
              "Concentration sectorielle à mettre en regard du reste du portefeuille, souvent déjà exposé aux financières."],
   tags=("sectoriel", "coupon élevé", "volatilité", "sans décrément")),

 P("Phoenix 8 ans — Worst-of EURO STOXX 50 / S&amp;P 500 / Nikkei 225", "Autocall Phoenix",
   "Goldman Sachs", "BBB+ / A2 / A", "Worst-of 3 indices mondiaux", WOF,
   0.142, "Trimestrielle", 0.65, 0.55, 1.00, 8, 3, non_call=12, memoire=True, sri=6,
   enveloppes=(AV, CTO),
   sj_detail="EURO STOXX 50, S&amp;P 500 et Nikkei 225 — conditions appréciées sur le moins performant",
   mecanisme="Toutes les conditions sont appréciées sur le moins performant des trois indices du panier. Coupon trimestriel de 3,55 % si ce plus mauvais indice est au-dessus de 65 %, avec mémoire. Rappel lorsque les trois indices sont simultanément au-dessus de 100 %.",
   sc_fav="Les trois indices progressent de concert : rappel au bout d’un an, 14,20 % de gain.",
   sc_med="Deux indices montent, le troisième stagne à 80 % : coupons versés mais aucun rappel avant l’échéance.",
   sc_def="Un seul indice chute à 45 % : perte de 55 % du capital, quelle que soit la performance des deux autres.",
   attention=["Le mécanisme Worst-of est le plus mal compris du marché : la diversification apparente du panier augmente en réalité le risque, puisque seul le plus mauvais compte.",
              "Un panier multidevises ajoute un décalage de change entre les trois composantes, même pour un produit libellé en euro.",
              "Le coupon très élevé est la contrepartie directe de cette asymétrie, non le signe d’une bonne affaire."],
   tags=("worst-of", "coupon élevé", "complexe", "sans décrément")),

 P("Reverse Convertible 3 ans — action du CAC 40", "Reverse Convertible",
   "UniCredit", "BBB+ / Baa1 / BBB+", "Action française de premier rang", ACT,
   0.148, "Trimestrielle", None, 0.80, None, 3, 2, sri=7,
   enveloppes=(CTO,),
   sj_detail="Action de grande capitalisation cotée au CAC 40, choisie au moment de la structuration",
   mecanisme="Coupon trimestriel de 3,70 % versé sans aucune condition de barrière, quelle que soit l’évolution de l’action. À l’échéance, remboursement au pair si l’action est au-dessus de 80 % de son niveau initial ; en dessous, l’investisseur subit la baisse constatée depuis le niveau initial.",
   sc_fav="Action stable ou en hausse : 44,40 % de coupons sur trois ans, capital restitué.",
   sc_med="Action à 85 % à l’échéance : coupons encaissés, capital remboursé à 100 %.",
   sc_def="Action à 50 % à l’échéance : perte de 50 % du capital, partiellement compensée par les coupons perçus.",
   attention=["Protection faible : une barrière à 80 % laisse très peu de marge sur un mono sous-jacent action.",
              "Risque spécifique d’entreprise : un profit warning ou un litige peut faire chuter l’action indépendamment du marché.",
              "Aucun rappel anticipé : le capital reste exposé jusqu’à l’échéance.",
              "Notation de l’émetteur en catégorie BBB : le risque de crédit s’ajoute au risque actions."],
   tags=("coupon garanti", "mono sous-jacent", "risque élevé", "sans décrément")),

 P("Capital garanti 6 ans — participation EURO STOXX 50", "Capital protégé ou garanti",
   "Crédit Agricole CIB", "A+ / Aa3 / A+", "EURO STOXX 50", IDX,
   None, "Aucun coupon", None, None, None, 6, 4, sri=2,
   enveloppes=(AV, CTO, PER),
   frais="Frais de structuration intégrés au prix d’émission, détaillés dans le DIC",
   mecanisme="Remboursement de 100 % du nominal à l’échéance quelle que soit l’évolution de l’indice, sous réserve de la solvabilité de l’émetteur. S’y ajoute 70 % de la performance positive de l’EURO STOXX 50, mesurée en moyenne sur les douze derniers mois, dans la limite d’un plafond de gain de 40 %.",
   sc_fav="Indice en hausse de 60 % : gain plafonné à 40 %, soit 5,8 % par an.",
   sc_med="Indice en hausse de 20 % : gain de 14 %, soit environ 2,2 % par an.",
   sc_def="Indice en baisse de 40 % : capital remboursé à 100 %, aucun gain, coût d’opportunité de six ans.",
   attention=["La garantie ne vaut qu’à l’échéance : une sortie anticipée se fait au prix de marché, qui peut être inférieur au nominal.",
              "La garantie porte sur l’engagement de l’émetteur, pas sur un dépôt : un défaut de celui-ci la rend inopérante.",
              "La moyenne des douze derniers mois réduit la performance restituée en cas de marché haussier jusqu’à l’échéance."],
   tags=("capital garanti", "trésorerie", "prudent", "sans décrément")),

 P("Participation 5 ans — call spread EURO STOXX 50", "Produit de participation",
   "BNP Paribas", "A+ / Aa3 / A+", "EURO STOXX 50", IDX,
   None, "Aucun coupon", None, 0.80, None, 5, 4, sri=4,
   enveloppes=(AV, CTO, PER),
   mecanisme="Aucun coupon. À l’échéance, l’investisseur reçoit 170 % de la performance positive de l’indice, plafonnée à 55 % de gain. Le capital est remboursé intégralement tant que l’indice n’a pas baissé de plus de 20 % ; en dessous, la perte est égale à la baisse constatée.",
   sc_fav="Indice en hausse de 35 % : gain de 55 % atteint, soit 9,2 % par an.",
   sc_med="Indice en hausse de 10 % : gain de 17 %, soit environ 3,2 % par an.",
   sc_def="Indice en baisse de 35 % : perte de 35 % du capital.",
   attention=["Le levier de 170 % ne joue que dans la fourchette de gain : au-delà du plafond, il n’apporte plus rien.",
              "Protection de 20 % seulement : plus faible que celle des structures de rendement à barrière.",
              "Les dividendes de l’indice ne sont pas reversés, ce qui constitue un manque à gagner significatif sur cinq ans."],
   tags=("participation", "levier", "croissance", "sans décrément")),

 P("Participation Lock-in 8 ans — MSCI World", "Produit de participation",
   "Morgan Stanley", "A- / A1 / A", "MSCI World", IDX,
   None, "Annuelle (cliquet)", None, 0.70, None, 8, 4, sri=4,
   enveloppes=(AV, CTO),
   mecanisme="Mécanisme de cliquet : chaque fois que l’indice franchit un palier de 10 % à une date de constatation annuelle, ce niveau de gain est définitivement acquis. À l’échéance, l’investisseur reçoit le plus élevé entre le dernier palier verrouillé et la performance finale, sous réserve d’un indice au-dessus de 70 % pour le remboursement du capital.",
   sc_fav="L’indice atteint 150 % puis redescend à 90 % : le palier de 50 % reste acquis.",
   sc_med="L’indice plafonne à 118 % : palier de 10 % verrouillé, gain de 10 % sur huit ans.",
   sc_def="L’indice n’a jamais atteint 110 % et termine à 60 % : perte de 40 % du capital.",
   attention=["L’intérêt du cliquet dépend entièrement du parcours : un marché régulièrement haussier n’en tire aucun avantage particulier.",
              "Les paliers sont constatés à dates fixes : un pic atteint entre deux constatations ne compte pas.",
              "Maturité longue pour une structure sans aucun revenu intermédiaire."],
   tags=("lock-in", "cliquet", "croissance", "sans décrément")),

 P("Phoenix 10 ans — STOXX Europe 600 Oil &amp; Gas", "Phoenix à coupon mémoire",
   "Barclays", "BBB+ / Baa1 / A", "STOXX Europe 600 Oil &amp; Gas", SEC,
   0.118, "Trimestrielle", 0.60, 0.55, 1.00, 10, 3, non_call=12, memoire=True,
   enveloppes=(AV, CTO),
   mecanisme="Coupon trimestriel de 2,95 % conditionné à un indice sectoriel au-dessus de 60 %, avec mémoire. Rappel au pair dès 100 %. Barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à 18 mois : 17,70 % de gain cumulé.",
   sc_med="Indice à 80 % à l’échéance : coupons versés, capital remboursé intégralement.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital.",
   attention=["Secteur cyclique dont les cours dépendent largement du prix des matières premières : volatilité élevée.",
              "Le rendement du dividende du secteur est structurellement fort, ce qui explique en grande partie le niveau de coupon offert.",
              "Notation de l’émetteur la plus basse du panel des grandes signatures : à doser dans l’allocation."],
   tags=("sectoriel", "mémoire", "cyclique", "sans décrément")),

 P("Athéna Trigger dégressif 10 ans — CAC 40", "Athéna",
   "Société Générale", "A / A1 / A-", "CAC 40", IDX,
   0.105, "Semestrielle (capitalisé)", None, 0.60, 1.00, 10, 4,
   decrement=0.05, non_call=12,
   enveloppes=(AV, CTO, PER),
   mecanisme="Seuil de rappel dégressif : fixé à 100 % lors de la première constatation, il baisse de 5 points à chaque constatation semestrielle suivante, jusqu’à 55 % en fin de vie. Le gain capitalisé de 10,50 % par an est versé au moment du rappel.",
   sc_fav="Rappel à un an : 10,50 % de gain versé en une fois.",
   sc_med="Rappel en sixième année grâce au seuil descendu à 75 % : environ 63 % de gain cumulé.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % du capital, aucun gain versé.",
   attention=["Le seuil dégressif porte sur le rappel, pas sur le sous-jacent : à ne pas confondre avec un indice décrément, absent de ce catalogue.",
              "Le seuil dégressif augmente nettement la probabilité de rappel, mais celui-ci peut intervenir alors que l’indice reste très inférieur à son niveau d’origine.",
              "Aucun revenu intermédiaire pendant toute la durée de vie."],
   tags=("trigger dégressif", "capitalisation", "probabilité de rappel", "sans décrément")),

 P("Phoenix 7 ans — S&amp;P 500", "Autocall Phoenix",
   "Bank of America", "A- / A1 / AA-", "S&amp;P 500", IDX,
   0.098, "Trimestrielle", 0.65, 0.60, 1.00, 7, 4, devise="USD", non_call=12, memoire=True,
   enveloppes=(AV, CTO),
   mecanisme="Structure Phoenix mémoire libellée en dollar sur le S&amp;P 500. Coupon trimestriel de 2,45 % si l’indice est au-dessus de 65 %, rappel au pair dès 100 %, barrière de capital à 60 % à l’échéance.",
   sc_fav="Rappel à un an : 9,80 % de gain en dollar, hors effet de change.",
   sc_med="Indice à 90 % à l’échéance : coupons versés, capital remboursé à 100 % en dollar.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % en dollar, aggravée ou atténuée par le change.",
   attention=["Produit en dollar : le risque de change s’ajoute intégralement au risque de marché et peut en inverser le résultat pour un investisseur en euro.",
              "Une version couverte en euro existe généralement, mais son coût de couverture réduit le coupon.",
              "Le rendement du dividende du S&amp;P 500 étant faible, le coupon offert y est structurellement inférieur à celui d’un équivalent européen."],
   tags=("dollar", "risque de change", "mémoire", "sans décrément")),

 P("Produit de taux callable 10 ans — taux fixe", "Produits de taux",
   "ING", "A+ / A1 / A+", "Taux fixe, option de rappel émetteur", TAUX,
   0.050, "Annuelle", None, None, None, 10, 4, sri=3,
   enveloppes=(CTO, AV),
   frais="Frais inclus dans le prix d’émission, détaillés dans le DIC",
   mecanisme="Coupon annuel fixe de 5,00 % versé sans condition. L’émetteur dispose du droit de rappeler le titre au pair à chaque date anniversaire à partir de la deuxième année. Capital remboursé à 100 % à l’échéance ou au rappel.",
   sc_fav="Les taux montent, l’émetteur ne rappelle pas : 5,00 % par an pendant dix ans.",
   sc_med="Rappel en cinquième année après une baisse des taux : 25 % de gain cumulé, puis réinvestissement à des conditions moins favorables.",
   sc_def="Rappel dès la deuxième année : 10 % perçus, et le capital doit être replacé sur un marché devenu moins rémunérateur.",
   attention=["L’option de rappel appartient à l’émetteur et sera exercée dans son intérêt, donc contre celui de l’investisseur.",
              "Le risque principal n’est pas la perte en capital mais le risque de réinvestissement.",
              "La valeur de marché en cours de vie est très sensible aux mouvements de taux."],
   tags=("taux", "trésorerie", "capital protégé", "sans décrément")),

 P("Range Accrual 5 ans — Euribor 3 mois", "Produits de taux",
   "Deutsche Bank", "A / A1 / A", "Euribor 3 mois, fourchette 0 % – 4 %", TAUX,
   0.056, "Trimestrielle (prorata)", None, None, None, 5, 3, sri=3,
   enveloppes=(CTO,),
   frais="Frais inclus dans le prix d’émission, détaillés dans le DIC",
   mecanisme="Le coupon annuel de 5,60 % est acquis au prorata du nombre de jours pendant lesquels l’Euribor 3 mois reste dans la fourchette définie. Chaque journée hors fourchette ne génère aucun intérêt. Capital remboursé à 100 % à l’échéance.",
   sc_fav="Euribor dans la fourchette toute l’année : 5,60 % perçus.",
   sc_med="Euribor hors fourchette un quart du temps : environ 4,20 % perçus.",
   sc_def="Euribor durablement au-dessus de 4 % : coupon proche de zéro, capital néanmoins remboursé.",
   attention=["Le rendement dépend d’un pari sur la trajectoire des taux courts, pas sur les actions.",
              "Aucune perte en capital à l’échéance, mais un rendement potentiellement nul sur cinq ans.",
              "Structure peu adaptée si l’investisseur n’a pas de vue construite sur la politique monétaire."],
   tags=("taux", "range accrual", "capital protégé", "sans décrément")),

 P("CLN 5 ans — signature corporate investment grade", "Credit Linked Note (CLN)",
   "Citigroup", "BBB+ / A3 / A", "Signature corporate européenne notée BBB", CRED,
   0.068, "Annuelle", None, None, None, 5, 3, sri=5,
   enveloppes=(CTO,),
   mecanisme="Coupon annuel fixe de 6,80 % tant qu’aucun événement de crédit n’affecte la signature de référence. Capital remboursé à 100 % à l’échéance en l’absence d’événement. En cas d’événement de crédit, remboursement limité au taux de recouvrement constaté sur la dette de la référence.",
   sc_fav="Aucun événement de crédit : 34 % de coupons sur cinq ans et capital restitué.",
   sc_med="Dégradation de la notation sans défaut : coupons versés normalement, valeur de marché en baisse en cours de vie.",
   sc_def="Défaut de la référence en troisième année : remboursement au taux de recouvrement, souvent compris entre 20 % et 40 % du nominal.",
   attention=["Deux risques de crédit se cumulent : celui de l’émetteur du titre et celui de la signature de référence.",
              "La perte en cas de défaut est brutale et sans rapport avec les marchés actions.",
              "Réservé à un investisseur capable d’analyser lui-même la solidité de la signature de référence."],
   tags=("crédit", "obligataire", "défaut", "sans décrément")),

 P("Phoenix 10 ans — MSCI EMU ESG Leaders", "Phoenix à coupon mémoire",
   "BNP Paribas", "A+ / Aa3 / A+", "MSCI EMU ESG Leaders", ESG,
   0.095, "Trimestrielle", 0.60, 0.60, 1.00, 10, 4, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Phoenix mémoire sur un indice ESG public appliquant des filtres extra-financiers à un univers de la zone euro. Coupon trimestriel de 2,375 % au-dessus de 60 %, rappel dès 100 %, barrière de capital à 60 % à l’échéance.",
   sc_fav="Rappel à un an : 9,50 % de gain.",
   sc_med="Indice à 85 % à l’échéance : coupons versés et capital remboursé intégralement.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % du capital.",
   attention=["Vérifier la méthodologie d’exclusion réelle de l’indice : l’intitulé ne suffit pas à qualifier la démarche.",
              "L’univers filtré est plus concentré que l’indice large, ce qui peut accroître la volatilité.",
              "Indice public, publié par un fournisseur indépendant : la méthodologie est consultable, contrairement à un indice propriétaire d’émetteur."],
   tags=("ESG", "mémoire", "indice public", "sans décrément")),

 P("Discount 2 ans — EURO STOXX 50", "Certificat Discount",
   "Vontobel", "Non noté / A2 / Non noté", "EURO STOXX 50", IDX,
   None, "Aucun coupon", None, None, None, 2, 3, sri=5,
   enveloppes=(CTO,),
   frais="Frais inclus dans la décote d’émission",
   mecanisme="Achat du certificat avec une décote de 14 % sur le niveau de l’indice. À l’échéance, remboursement égal au plus petit des deux montants entre la valeur de l’indice et le plafond fixé au niveau initial. Gain maximal de 16,3 %.",
   sc_fav="Indice stable ou en hausse : gain maximal de 16,3 % sur deux ans.",
   sc_med="Indice en baisse de 8 % : la décote absorbe la baisse, gain résiduel d’environ 7,0 %.",
   sc_def="Indice en baisse de 35 % : perte d’environ 24 %, la décote n’absorbant que les quatorze premiers pour cent.",
   attention=["La décote est la seule protection : au-delà, la perte est intégrale et proportionnelle.",
              "Gain strictement plafonné : aucune participation à une hausse marquée.",
              "Émetteur noté par une seule agence : la comparaison de signature demande de la prudence."],
   tags=("décote", "court terme", "gain plafonné", "sans décrément")),

 P("Twin Win 4 ans — EURO STOXX 50", "Twin Win",
   "UBS", "A- / A3 / A", "EURO STOXX 50", IDX,
   None, "Aucun coupon", None, 0.65, None, 4, 3, sri=5,
   enveloppes=(CTO, AV),
   mecanisme="À l’échéance, une hausse de l’indice est restituée à 110 %. Une baisse est convertie en gain de même ampleur, tant que l’indice n’est jamais descendu sous 65 % de son niveau initial en constatation quotidienne. Si ce seuil est touché, l’investisseur subit la performance négative réelle.",
   sc_fav="Indice en baisse de 20 % sans jamais toucher 65 % : gain de 20 %.",
   sc_med="Indice en hausse de 15 % : gain de 16,5 %.",
   sc_def="Indice descendu à 60 % en cours de vie et terminant à 70 % : perte de 30 % du capital, le mécanisme s’étant éteint.",
   attention=["La barrière est constatée en continu : un seul passage sous le seuil, même sur une seule séance, annule définitivement le double sens.",
              "Sur quatre ans, la probabilité de toucher une barrière à 65 % en continu est loin d’être négligeable.",
              "Aucun coupon : le résultat n’est connu qu’à l’échéance."],
   tags=("double sens", "barrière continue", "volatilité", "sans décrément")),

 P("Phoenix 8 ans — Worst-of 4 actions européennes", "Autocall Phoenix",
   "HSBC", "A- / A3 / A+", "Worst-of 4 actions européennes", WOF,
   0.162, "Trimestrielle", 0.60, 0.50, 1.00, 8, 2, non_call=12, memoire=True, sri=7,
   enveloppes=(CTO,),
   sj_detail="Quatre grandes capitalisations européennes de secteurs distincts, arrêtées à la structuration",
   mecanisme="Conditions appréciées sur la moins performante de quatre actions européennes. Coupon trimestriel de 4,05 % si cette action est au-dessus de 60 %, avec mémoire. Rappel lorsque les quatre actions sont simultanément au-dessus de 100 %.",
   sc_fav="Les quatre titres progressent : rappel au bout d’un an, 16,20 % de gain.",
   sc_med="Trois titres montent, le quatrième stagne à 75 % : coupons versés mais aucun rappel.",
   sc_def="Un titre chute à 35 % : perte de 65 % du capital, indépendamment des trois autres.",
   attention=["Worst-of sur actions individuelles : c’est le profil le plus risqué du marché des produits de rendement.",
              "Chaque action ajoutée augmente la probabilité d’un accident spécifique : un seul titre suffit à faire échouer le produit.",
              "Coupon de 16,2 % : un tel niveau est le signal d’un risque élevé, non d’une opportunité.",
              "SRI de 7 sur 7 : niveau de risque maximal de l’échelle réglementaire."],
   tags=("worst-of actions", "risque maximal", "coupon très élevé", "sans décrément")),

 P("Phoenix 6 ans — MSCI Emerging Markets", "Autocall Phoenix",
   "Nomura", "BBB+ / Baa1 / A-", "MSCI Emerging Markets", GEO,
   0.122, "Trimestrielle", 0.65, 0.55, 1.00, 6, 3, non_call=12, memoire=True,
   enveloppes=(AV, CTO),
   mecanisme="Phoenix mémoire sur l’indice MSCI Emerging Markets. Coupon trimestriel de 3,05 % au-dessus de 65 %, rappel dès 100 %, barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à un an : 12,20 % de gain.",
   sc_med="Indice à 80 % à l’échéance : coupons versés et capital remboursé.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital.",
   attention=["Volatilité structurellement supérieure à celle des indices développés, avec des phases de baisse plus profondes.",
              "Risque politique et risque de change intégrés au sous-jacent, même pour un produit libellé en euro.",
              "Émetteur de catégorie BBB sur un sous-jacent déjà risqué : le cumul mérite d’être mesuré."],
   tags=("émergents", "mémoire", "volatilité", "sans décrément")),

 P("Capital protégé 8 ans — participation 100 % plafonnée", "Capital protégé ou garanti",
   "BNP Paribas", "A+ / Aa3 / A+", "EURO STOXX 50", IDX,
   None, "Aucun coupon", None, None, None, 8, 4, sri=2,
   enveloppes=(AV, CTO, PER),
   frais="Frais de structuration intégrés au prix d’émission, détaillés dans le DIC",
   mecanisme="Capital remboursé à 100 % à l’échéance, sous réserve de la solvabilité de l’émetteur, majoré de 100 % de la performance positive de l’EURO STOXX 50 dans la limite de 65 % de gain.",
   sc_fav="Indice en hausse de 80 % : gain plafonné à 65 %, soit environ 6,4 % par an.",
   sc_med="Indice en hausse de 25 % : gain de 25 %, soit environ 2,8 % par an.",
   sc_def="Indice en baisse de 50 % : capital remboursé intégralement, aucun gain sur huit ans.",
   attention=["Huit ans d’immobilisation pour une protection qui ne joue qu’à l’échéance.",
              "Les dividendes de l’indice ne sont pas reversés : sur huit ans, le manque à gagner est substantiel.",
              "La comparaison pertinente est celle d’une obligation de même émetteur et de même maturité, pas celle d’un livret."],
   tags=("capital garanti", "long terme", "prudent", "sans décrément")),

 P("Phoenix 10 ans — FTSE EPRA Nareit Europe", "Phoenix à coupon mémoire",
   "Crédit Mutuel / CIC", "A+ / Aa3 / AA-", "FTSE EPRA Nareit Developed Europe", SEC,
   0.115, "Trimestrielle", 0.60, 0.55, 1.00, 10, 4, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Phoenix mémoire sur un indice public de foncières cotées européennes. Coupon trimestriel de 2,875 % au-dessus de 60 %, rappel dès 100 %, barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à 18 mois : 17,25 % de gain cumulé.",
   sc_med="Indice à 75 % à l’échéance : coupons versés, capital remboursé intégralement.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital.",
   attention=["Les foncières cotées sont très sensibles aux taux longs : une remontée des taux pèse directement sur le sous-jacent.",
              "Le secteur a connu des corrections de grande ampleur, ce qui explique le niveau de coupon proposé.",
              "Attention au doublon si le portefeuille comporte déjà de l’immobilier physique ou des SCPI."],
   tags=("immobilier", "mémoire", "sensibilité taux", "sans décrément")),

 P("Phoenix 12 ans — CAC 40, barrière 40 %", "Autocall Phoenix",
   "Banco Santander", "A+ / A2 / A-", "CAC 40", IDX,
   0.085, "Trimestrielle", 0.50, 0.40, 1.00, 12, 5, non_call=12, memoire=True, sri=5,
   enveloppes=(AV, CTO, PER),
   mecanisme="Structure très défensive : coupon trimestriel de 2,125 % dès que le CAC 40 est au-dessus de 50 %, avec mémoire. Rappel au pair dès 100 %. Barrière de capital à 40 % seulement, constatée à l’échéance.",
   sc_fav="Rappel à un an : 8,50 % de gain.",
   sc_med="Indice à 60 % à l’échéance : coupons intégralement versés, capital remboursé à 100 %.",
   sc_def="Indice à 35 % à l’échéance : perte de 65 % du capital. Une baisse de cette ampleur sur douze ans reste historiquement rare sur un indice large.",
   attention=["Profil le plus prudent de la gamme de rendement, obtenu en abaissant le coupon à 8,50 %.",
              "Maturité de douze ans : horizon de placement très long à assumer.",
              "Une barrière à 40 % sur un indice public réduit fortement le risque de perte, sans l’annuler."],
   tags=("très défensif", "barrière 40 %", "long terme", "sans décrément")),
]

# Indexation croisée famille -> slug (pour les liens)
FAM_SLUG = {f["nom"]: f["slug"] for f in FAMILLES}

# ==========================================================================
#  DONNÉES — GLOSSAIRE
# ==========================================================================
CAT_GLOSSAIRE = ["Mécanismes", "Barrières &amp; protection", "Sous-jacents",
                 "Vie du produit", "Cadre &amp; risques",
                 "Enveloppes &amp; fiscalité", "Frais &amp; valorisation"]

def G(t, cat, d, ex=None, alias=""):
    return dict(t=t, cat=cat, d=d if isinstance(d, list) else [d], ex=ex, alias=alias)

MEC, BAR, SJ = "Mécanismes", "Barrières &amp; protection", "Sous-jacents"
VIE, RIS, FIS, FRA = "Vie du produit", "Cadre &amp; risques", "Enveloppes &amp; fiscalité", "Frais &amp; valorisation"

GLOSSAIRE = [
 # ---------------- Mécanismes ----------------
 G("Autocall", MEC,
   ["Mécanisme de remboursement anticipé automatique. À chaque date de constatation, si le sous-jacent est au-dessus d’un seuil prédéfini — le plus souvent 100 % de son niveau initial —, le produit s’arrête immédiatement : l’émetteur rembourse le nominal majoré du gain prévu et l’investisseur récupère ses fonds.",
    "Le mot « automatique » est essentiel : ni l’investisseur ni l’émetteur ne décident. Le rappel se déclenche mécaniquement dès que la condition est remplie. La conséquence pratique est que la durée réelle d’un produit autocall est inconnue à la souscription : elle peut aller d’un trimestre à la maturité maximale."],
   ex="Un autocall à 100 % constaté trimestriellement sur un indice à 102 % de son niveau initial au bout de six mois est remboursé à cette date, avec six mois de coupons. L’investisseur doit alors réinvestir.",
   alias="rappel anticipé remboursement automatique callable"),
 G("Athéna", MEC,
   ["Famille de produits structurés dans laquelle le rendement n’est jamais détaché en cours de vie mais capitalisé, puis versé en une seule fois au moment du remboursement anticipé ou à l’échéance.",
    "Le gain est proportionnel au temps écoulé : un Athéna à 9 % rappelé au bout de trois ans verse 27 % en une fois. Si le produit n’est jamais rappelé et termine sous sa barrière de capital, l’investisseur n’aura rien perçu du tout pendant toute la durée de vie."],
   alias="capitalisé capitalisation gain différé"),
 G("Phoenix", MEC,
   ["Famille de produits structurés qui verse un coupon à chaque date de constatation dès lors que le sous-jacent se situe au-dessus d’une barrière de coupon, généralement fixée entre 50 % et 70 % du niveau initial.",
    "Le Phoenix se distingue de l’Athéna par le détachement effectif des coupons en cours de vie, et du Reverse Convertible par le caractère conditionnel de ces coupons. C’est la structure la plus distribuée en France, le plus souvent assortie d’un mécanisme d’autocall et d’un effet mémoire."],
   alias="coupon conditionnel"),
 G("Effet mémoire", MEC,
   ["Clause selon laquelle un coupon non versé n’est pas perdu mais mis en réserve. Il est rattrapé et payé en totalité dès qu’une constatation ultérieure redevient favorable.",
    "La mémoire ne change rien au rendement maximal du produit : elle modifie la probabilité de l’atteindre. Elle protège contre les parcours agités, pas contre une baisse durable : si le sous-jacent ne repasse jamais au-dessus de la barrière de coupon, les coupons mémorisés ne sont jamais versés."],
   ex="Produit à 8 % annuel : constatations 1 et 2 manquées, constatation 3 réussie. Le versement de la troisième année est de 24 %, soit les trois coupons cumulés.",
   alias="mémoire coupon rattrapé memory"),
 G("Coupon conditionnel", MEC,
   ["Coupon dont le versement dépend de la réalisation d’une condition de marché à la date de constatation, typiquement un sous-jacent au-dessus d’une barrière.",
    "Toute la communication commerciale des produits structurés repose sur ce taux, souvent présenté comme un « rendement ». Il s’agit d’un rendement potentiel maximal, en aucun cas d’un rendement attendu ni garanti."],
   alias="coupon potentiel rendement conditionnel"),
 G("Coupon fixe inconditionnel", MEC,
   ["Coupon versé à chaque période sans aucune condition de marché. On le rencontre dans les Reverse Convertibles et dans la plupart des produits de taux.",
    "La certitude du coupon se paie ailleurs : la protection du capital est alors faible ou nulle, et le produit se comporte à l’échéance comme une détention directe du sous-jacent."],
   alias="coupon garanti inconditionnel"),
 G("Seuil de rappel", MEC,
   ["Niveau que le sous-jacent doit atteindre à une date de constatation pour déclencher le remboursement anticipé. Il est le plus souvent fixé à 100 % du niveau initial.",
    "Un seuil de rappel bas accélère la sortie du produit, ce qui est généralement favorable à l’investisseur lorsque le coupon a été encaissé. Un seuil haut allonge la durée de vie probable."],
   alias="trigger niveau de rappel strike de rappel"),
 G("Trigger dégressif", MEC,
   ["Variante dans laquelle le seuil de rappel diminue à chaque constatation, par exemple de cinq points par semestre, au lieu de rester fixe à 100 %.",
    "Le mécanisme augmente sensiblement la probabilité de remboursement anticipé au fil du temps. La contrepartie est qu’un rappel peut intervenir alors que le sous-jacent reste très inférieur à son niveau d’origine : le produit se termine sans que l’investisseur ait pu bénéficier d’un éventuel rebond."],
   ex="Seuil à 100 % la première année, puis 95 %, 90 %, 85 %… Au bout de six ans, un simple retour à 70 % suffit à déclencher le rappel.",
   alias="step down trigger descending seuil dégressif"),
 G("Période de non-rappel", MEC,
   ["Durée initiale pendant laquelle aucun remboursement anticipé ne peut se produire, même si la condition de rappel est remplie. Elle est fréquemment de douze mois.",
    "Cette clause garantit à l’investisseur une durée minimale d’exposition et donc un minimum de coupons encaissables. Elle évite le cas désagréable d’un produit rappelé après un seul trimestre, qui laisse l’investisseur devant un problème de réinvestissement immédiat."],
   alias="non call period lock-out verrouillage initial"),
 G("Cliquet (lock-in)", MEC,
   ["Mécanisme qui verrouille définitivement un niveau de gain dès qu’il a été atteint à une date de constatation, indépendamment de l’évolution ultérieure du sous-jacent.",
    "Le cliquet protège les gains intermédiaires contre un retournement de fin de vie. Son utilité dépend entièrement du parcours : sur un marché régulièrement haussier jusqu’à l’échéance, il n’apporte rien."],
   alias="lock-in palier verrouillage cliquet"),
 G("Participation", MEC,
   ["Pourcentage de la performance du sous-jacent effectivement restitué à l’investisseur. Une participation de 150 % amplifie la hausse, une participation de 70 % en restitue une partie seulement.",
    "Une participation élevée est presque toujours compensée par un plafond de gain plus bas ou une protection plus faible : les deux paramètres se financent mutuellement."],
   alias="taux de participation levier indexation"),
 G("Cap (plafond)", MEC,
   ["Limite maximale de gain du produit. Au-delà de ce niveau, la hausse supplémentaire du sous-jacent ne profite plus à l’investisseur.",
    "Le plafond est le principal financeur de la protection à la baisse : c’est en renonçant aux scénarios très haussiers que l’investisseur achète son amortisseur."],
   alias="plafond cap gain maximal"),
 G("Floor (plancher)", MEC,
   ["Niveau minimal de remboursement garanti par la formule, par exemple 90 % du nominal quel que soit le parcours du sous-jacent.",
    "Un plancher borne la perte maximale, hors défaut de l’émetteur. Il se distingue d’une barrière, qui fonctionne par tout ou rien."],
   alias="plancher floor perte maximale"),
 G("Airbag", MEC,
   ["Mécanisme qui recalcule la perte depuis la barrière de capital et non depuis le niveau initial, de façon à supprimer l’effet de seuil.",
    "Sans airbag, une barrière à 60 % franchie de peu provoque une perte immédiate de plus de 40 %. Avec airbag, la perte est proportionnelle au dépassement de la barrière : elle démarre à zéro juste sous le seuil et progresse graduellement."],
   ex="Barrière à 60 %, sous-jacent final à 54 %. Sans airbag : perte de 46 %. Avec airbag : 54 % ÷ 60 % = 90 %, soit une perte de 10 %.",
   alias="airbag amortisseur effet de seuil"),
 G("Twin Win", MEC,
   ["Structure qui transforme la baisse du sous-jacent en gain, tant qu’un seuil bas n’a pas été franchi, tout en restituant également la hausse.",
    "L’investisseur gagne donc dans les deux directions, à condition que l’amplitude de la baisse reste contenue. Le franchissement de la barrière éteint le mécanisme et rétablit une exposition classique à la perte."],
   alias="double sens twin win"),
 G("Reverse Convertible", MEC,
   ["Structure versant un coupon fixe inconditionnel, avec un remboursement du capital conditionné au niveau final du sous-jacent et une protection faible ou nulle.",
    "Dans certaines variantes, le remboursement se fait en titres plutôt qu’en espèces : l’investisseur devient alors effectivement actionnaire au prix d’exercice, ce qui matérialise la perte latente."],
   alias="reverse convertible livraison de titres"),

 # ---------------- Barrières & protection ----------------
 G("Barrière de coupon", BAR,
   ["Niveau du sous-jacent au-dessus duquel le coupon de la période est versé. Elle se situe généralement entre 50 % et 70 % du niveau initial.",
    "Plus la barrière est basse, plus le coupon est probable, et plus son taux affiché est faible. C’est le premier arbitrage à examiner dans une fiche produit : un coupon élevé associé à une barrière haute est souvent moins intéressant qu’un coupon modeste associé à une barrière profonde."],
   alias="barriere coupon seuil de coupon"),
 G("Barrière de capital", BAR,
   ["Niveau du sous-jacent en dessous duquel le capital n’est plus intégralement remboursé à l’échéance. C’est le paramètre le plus important d’un produit de rendement.",
    "Au-dessus de la barrière, l’investisseur récupère 100 % du nominal, même si le sous-jacent a baissé de 39 %. En dessous, et sauf mécanisme airbag, il subit la totalité de la baisse depuis le niveau initial — ce qui crée une discontinuité brutale."],
   ex="Barrière à 60 %. Sous-jacent final à 61 % : remboursement de 100 %. Sous-jacent final à 59 % : remboursement de 59 %, soit 41 % de perte pour deux points d’écart.",
   alias="barriere capital PDI protection du capital"),
 G("Barrière européenne", BAR,
   ["Barrière constatée à une seule date, celle de l’échéance. C’est le format très largement dominant sur le marché français.",
    "Elle est nettement plus favorable à l’investisseur qu’une barrière américaine : le sous-jacent peut passer sous le seuil pendant des années sans aucune conséquence, pourvu qu’il soit remonté au-dessus le jour de la constatation finale."],
   alias="barriere europeenne constatation finale"),
 G("Barrière américaine", BAR,
   ["Barrière constatée en continu, sur chaque séance de la durée de vie du produit. Un seul franchissement, même intrajournalier, suffit à la désactiver définitivement.",
    "À niveau identique, une barrière américaine est bien plus risquée qu’une européenne. Sa présence dans une fiche produit doit faire exiger un coupon sensiblement plus élevé."],
   ex="Barrière américaine à 65 % sur huit ans : il suffit d’une seule séance de panique à 64 % pour perdre la protection, même si le sous-jacent termine à 110 %.",
   alias="barriere americaine constatation continue barrière continue"),
 G("Effet de seuil", BAR,
   ["Discontinuité du remboursement de part et d’autre d’une barrière : quelques dixièmes de point d’écart sur le sous-jacent peuvent faire passer le remboursement de 100 % du nominal à 60 %.",
    "C’est le défaut structurel des barrières sèches, et la raison d’être des mécanismes airbag. Il explique aussi pourquoi la valeur de marché d’un produit devient très instable lorsque le sous-jacent évolue près de sa barrière."],
   alias="effet falaise discontinuité cliff"),
 G("Protection du capital", BAR,
   ["Engagement de rembourser tout ou partie du nominal à l’échéance. On distingue la protection conditionnelle, qui dépend d’une barrière, de la protection inconditionnelle, qui ne dépend que de la solvabilité de l’émetteur.",
    "Dans tous les cas, la protection ne joue qu’à l’échéance et ne couvre jamais le risque de défaut de l’émetteur. L’expression « capital garanti » ne doit jamais être comprise comme « sans risque »."],
   alias="capital garanti capital protégé protection"),
 G("Worst-of", BAR,
   ["Mécanisme dans lequel toutes les conditions du produit sont appréciées sur la composante la moins performante d’un panier.",
    "C’est le mécanisme le plus mal compris du marché. Un panier de quatre actions n’apporte aucune diversification : il additionne les risques. La probabilité qu’au moins une des quatre composantes connaisse un accident est bien supérieure à celle d’un accident sur une seule. Le coupon généreux d’un Worst-of est donc la rémunération d’un risque accru, non d’une opportunité."],
   ex="Panier de quatre actions dont trois progressent de 30 % et une chute de 45 % sous la barrière : le produit perd 45 %. Les trois hausses ne comptent pas.",
   alias="worst of panier le moins performant"),
 G("Best-of", BAR,
   ["Mécanisme inverse du Worst-of : les conditions sont appréciées sur la composante la plus performante du panier.",
    "Nettement plus favorable à l’investisseur, et donc nettement plus coûteux à structurer : les coupons proposés sont très inférieurs à ceux d’un Worst-of équivalent. Ces produits restent rares sur le marché français."],
   alias="best of meilleur du panier"),
 G("Barrière désactivante", BAR,
   ["Seuil dont le franchissement supprime définitivement un avantage du produit : prime de bonus, mécanisme Twin Win, ou protection.",
    "La vigilance porte sur le mode de constatation : une barrière désactivante constatée en continu sur plusieurs années est très souvent atteinte."],
   alias="knock-out désactivante barrière désactivante"),
 G("Barrière activante", BAR,
   ["Seuil dont le franchissement déclenche l’entrée en vigueur d’un mécanisme, par exemple une participation à la hausse ou un coupon majoré.",
    "Moins fréquente que la barrière désactivante, elle s’analyse de la même manière : date et mode de constatation avant tout."],
   alias="knock-in activante"),

 # ---------------- Sous-jacents ----------------
 G("Sous-jacent", SJ,
   ["Actif de référence dont l’évolution détermine le comportement du produit : indice, action, panier, taux, inflation ou signature de crédit.",
    "Le sous-jacent ne fait l’objet d’aucune détention par l’investisseur. Celui-ci ne possède ni les actions ni l’indice : il détient un titre de créance émis par une banque, dont le remboursement est calculé par référence à cet actif. Il ne perçoit donc pas les dividendes et ne dispose d’aucun droit de vote."],
   alias="sous jacent underlying actif de reference"),
 G("Indice décrément", SJ,
   ["Indice construit spécifiquement pour la structuration, qui réinvestit les dividendes du panier puis en retranche un prélèvement forfaitaire : soit un pourcentage annuel, soit un nombre fixe de points d’indice.",
    "Le mécanisme permet à l’émetteur de connaître à l’avance le flux de dividendes et donc d’offrir des coupons et des barrières plus généreux. La contrepartie est structurelle : si les dividendes réels du panier sont inférieurs au décrément, l’indice progresse mécaniquement moins vite que l’indice de référence classique. C’est la clé de lecture de la grande majorité des produits distribués en France."],
   ex="Un décrément de 50 points sur un indice valant 1 000 représente 5 % par an. Si l’indice tombe à 500, les mêmes 50 points représentent 10 % par an : l’effet s’aggrave avec la baisse.",
   alias="decrement indice synthetique indice maison points fixes"),
 G("Décrément en points ou en pourcentage", SJ,
   ["Deux modes de prélèvement très différents dans leurs conséquences. Le décrément en pourcentage est proportionnel au niveau de l’indice. Le décrément en points est un montant fixe en valeur absolue.",
    "Le décrément en points est plus favorable quand l’indice monte, puisque le prélèvement relatif diminue. Il est beaucoup plus pénalisant quand l’indice baisse, car le prélèvement relatif augmente au moment même où l’investisseur a besoin que l’indice se maintienne au-dessus de ses barrières."],
   alias="points fixes pourcentage decrement"),
 G("Indice de référence classique", SJ,
   ["Indice de marché standard, calculé hors dividendes réinvestis, tel qu’il est cité par la presse financière.",
    "Toute comparaison entre la performance d’un produit structuré et celle d’un indice classique doit être maniée avec précaution : le sous-jacent du produit est le plus souvent un indice décrément, dont la trajectoire diverge de l’indice classique année après année."],
   alias="price index indice nu"),
 G("Dividendes synthétiques", SJ,
   ["Hypothèse de dividendes futurs retenue par l’émetteur pour construire le produit. Elle est figée à l’émission.",
    "Les dividendes constituent la matière première du rendement d’un produit structuré : c’est en renonçant à les percevoir que l’investisseur finance ses coupons et ses barrières. Un investisseur en produits structurés achète donc, en substance, un flux de dividendes déjà transformé."],
   alias="dividendes anticipés rendement du dividende"),
 G("Mono sous-jacent", SJ,
   ["Produit dont la formule repose sur un seul actif de référence, le plus souvent un indice large ou une action.",
    "Sur un indice large, c’est le format le plus lisible et le plus prudent. Sur une action unique, le risque spécifique d’entreprise devient prépondérant et peut surpasser largement le risque de marché."],
   alias="mono sous jacent single underlying"),
 G("Panier", SJ,
   ["Ensemble d’actifs servant de référence, dont la performance est agrégée selon une règle précise : moyenne, Worst-of, Best-of, ou pondérations fixes.",
    "La règle d’agrégation est plus importante que la composition du panier : un panier de quatre actions en Worst-of est beaucoup plus risqué qu’un indice de quatre cents valeurs."],
   alias="basket panier d'actions"),
 G("Indice thématique", SJ,
   ["Indice construit autour d’un thème d’investissement : transition énergétique, santé, intelligence artificielle, sécurité.",
    "Ces indices sont souvent récents : la performance présentée avant leur date de lancement est une reconstitution calculée a posteriori, non une performance observée. Leur concentration sectorielle accroît la volatilité par rapport à un indice large."],
   alias="thematique megatendance"),
 G("Volatilité", SJ,
   ["Amplitude des variations du sous-jacent. C’est la variable qui détermine le niveau de coupon qu’un émetteur peut offrir.",
    "Une volatilité élevée permet des coupons élevés : l’émetteur vend des options plus chères. Un coupon exceptionnellement généreux ne signale donc pas une bonne affaire mais un sous-jacent plus risqué, ou un mécanisme défavorable comme un Worst-of."],
   alias="volatilite vol implicite"),

 # ---------------- Vie du produit ----------------
 G("Date de strike", VIE,
   ["Date à laquelle le niveau initial du sous-jacent est constaté. Toutes les barrières et tous les seuils du produit sont exprimés en pourcentage de ce niveau.",
    "Le strike est déterminant et pourtant rarement discuté : souscrire juste avant un strike fixé sur un point haut de marché place d’emblée toutes les barrières plus près du danger. Certains produits retiennent une moyenne de plusieurs observations pour lisser cet effet."],
   alias="strike niveau initial date de constatation initiale"),
 G("Date de constatation", VIE,
   ["Date à laquelle le niveau du sous-jacent est relevé pour déterminer le versement d’un coupon ou le déclenchement d’un rappel.",
    "Seules ces dates comptent. Entre deux constatations, l’évolution du sous-jacent n’a aucune conséquence contractuelle — sauf en présence d’une barrière à constatation continue."],
   alias="constatation observation date d'observation"),
 G("Date d’échéance", VIE,
   ["Date de maturité maximale du produit. Si aucun rappel anticipé n’est intervenu, c’est à cette date que le sort du capital est déterminé.",
    "La durée affichée d’un produit autocall est une durée maximale, pas une durée attendue. Il faut néanmoins être en mesure de porter le produit jusqu’à cette date."],
   alias="maturite echeance maturité maximale"),
 G("Durée de vie effective", VIE,
   ["Durée réellement écoulée entre l’émission et le remboursement, anticipé ou à l’échéance.",
    "Sur les structures autocall, la durée effective moyenne observée sur le marché est très inférieure à la maturité contractuelle. Ce décalage doit être anticipé : il crée un risque de réinvestissement récurrent."],
   alias="duree effective duree reelle"),
 G("Marché secondaire", VIE,
   ["Mécanisme permettant de revendre le produit avant son échéance. Sur les produits structurés, il est assuré par l’émetteur lui-même, qui affiche un prix de rachat indicatif.",
    "Il ne s’agit pas d’un marché au sens boursier : l’émetteur n’est en général pas contractuellement tenu d’assurer la liquidité, et le prix proposé intègre une fourchette achat-vente. Une sortie anticipée peut faire ressortir une valeur nettement inférieure au nominal, même lorsque le sous-jacent est au-dessus de toutes ses barrières."],
   alias="secondaire liquidite revente sortie anticipée"),
 G("Valeur de marché (mark-to-market)", VIE,
   ["Valorisation du produit en cours de vie, calculée par l’émetteur à partir de modèles d’options.",
    "Elle dépend du niveau du sous-jacent mais aussi de la volatilité, des taux, du temps restant et du risque de crédit de l’émetteur. C’est pourquoi un produit peut valoir 92 % du nominal alors que son sous-jacent est inchangé : la valeur de marché n’est pas une règle de trois."],
   alias="mark to market valorisation valeur liquidative"),
 G("Effet de pull-to-par", VIE,
   ["Tendance de la valeur de marché d’un produit à se rapprocher de sa valeur de remboursement à mesure que l’échéance approche.",
    "Il explique qu’un produit décoté en milieu de vie puisse revenir vers 100 % dans ses derniers mois, dès lors que les conditions de remboursement au pair sont réunies."],
   alias="pull to par convergence"),
 G("Risque de réinvestissement", VIE,
   ["Risque de devoir replacer un capital remboursé par anticipation dans des conditions de marché moins favorables qu’à l’origine.",
    "C’est le risque le plus sous-estimé des structures autocall. Un produit rappelé rapidement a bien rempli son office, mais l’investisseur se retrouve à devoir reconstituer une position dans un marché où les coupons offerts sont souvent plus faibles — précisément parce que le marché a monté."],
   alias="reinvestissement replacement"),

 # ---------------- Cadre & risques ----------------
 G("EMTN", RIS,
   ["Euro Medium Term Note : format juridique dominant des produits structurés en Europe. Il s’agit d’un titre de créance émis par une banque dans le cadre d’un programme d’émission déposé auprès d’un régulateur.",
    "La nature juridique est déterminante : l’investisseur est créancier de la banque, et non propriétaire du sous-jacent. La formule de remboursement est une modalité de calcul de la dette, rien de plus."],
   alias="emtn titre de creance medium term note"),
 G("BMTN", RIS,
   ["Bon à moyen terme négociable : équivalent de droit français de l’EMTN, émis sur le marché domestique.",
    "Le format est différent, la logique identique : titre de créance, risque de crédit de l’émetteur, remboursement calculé par formule."],
   alias="bmtn bon a moyen terme"),
 G("Risque de crédit émetteur", RIS,
   ["Risque de défaillance de la banque émettrice du titre. En cas de défaut, l’investisseur perd tout ou partie de son capital, indépendamment du comportement du sous-jacent.",
    "C’est le risque le plus souvent négligé, car il ne se matérialise presque jamais — jusqu’à ce qu’il se matérialise. Un produit « à capital garanti » émis par une banque défaillante ne garantit plus rien. La diversification des émetteurs est donc aussi importante que celle des sous-jacents."],
   ex="En 2008, les porteurs de notes émises par Lehman Brothers ont subi des pertes très lourdes sur des produits dont certains étaient présentés comme à capital garanti.",
   alias="risque emetteur contrepartie defaut credit"),
 G("Garant", RIS,
   ["Entité qui garantit les engagements de l’émetteur, souvent la maison mère d’un véhicule d’émission dédié.",
    "Lorsque l’émetteur est une structure de financement ad hoc, c’est la qualité de crédit du garant qu’il faut analyser. Cette information figure en première page du document d’informations clés."],
   alias="garant garantie maison mere"),
 G("Notation de crédit", RIS,
   ["Appréciation de la solidité financière d’un émetteur par une agence spécialisée : Standard &amp; Poor’s, Moody’s ou Fitch.",
    "Les trois agences utilisent des échelles distinctes et aboutissent régulièrement à des conclusions différentes sur un même émetteur. Lire les trois notations plutôt qu’une seule, et retenir que la frontière déterminante se situe entre la catégorie investissement et la catégorie spéculative."],
   alias="rating notation agence standard poor moodys fitch"),
 G("Bail-in", RIS,
   ["Mécanisme européen de résolution bancaire permettant d’imputer les pertes d’une banque en difficulté sur ses créanciers, par dépréciation ou conversion de leurs créances.",
    "Les produits structurés étant des titres de créance, ils entrent dans le périmètre du bail-in. Ils ne bénéficient d’aucune garantie des dépôts : le fonds de garantie qui couvre les comptes bancaires ne s’applique pas aux EMTN."],
   alias="bail in resolution bancaire renflouement interne"),
 G("Senior preferred et senior non preferred", RIS,
   ["Deux rangs de séniorité dans la dette bancaire. La dette senior non preferred absorbe les pertes avant la dette senior preferred en cas de résolution.",
    "La plupart des produits structurés destinés aux particuliers sont émis en senior preferred. Une émission en senior non preferred offre un coupon supérieur pour un risque de subordination plus élevé : la mention figure dans la documentation et mérite vérification."],
   alias="seniorite subordination senior preferred non preferred"),
 G("SRI", RIS,
   ["Indicateur synthétique de risque imposé par la réglementation européenne, gradué de 1 à 7, présenté en tête de chaque document d’informations clés.",
    "Il agrège un risque de marché et un risque de crédit selon une méthode standardisée. Utile pour comparer deux produits entre eux, il reste insuffisant pour en saisir le profil réel : deux produits de SRI identique peuvent avoir des structures de perte très différentes."],
   alias="sri indicateur de risque priips srri"),
 G("Document d’informations clés (DIC)", RIS,
   ["Document réglementaire standardisé de trois pages, remis obligatoirement avant toute souscription. Il présente la nature du produit, l’indicateur de risque, quatre scénarios de performance, les coûts et la durée de détention recommandée.",
    "C’est la seule pièce véritablement comparable d’un produit à l’autre, et la seule qui fait foi avec le prospectus. La brochure commerciale, elle, n’a aucune valeur contractuelle. Les scénarios qui y figurent sont calculés selon une méthode réglementaire : ils n’engagent pas l’émetteur."],
   alias="dic kid priips document d'information cle"),
 G("Prospectus", RIS,
   ["Document juridique complet du programme d’émission, approuvé par un régulateur, auquel s’ajoutent les conditions définitives propres à chaque souche.",
    "Souvent long de plusieurs centaines de pages, il fait seul foi en cas de litige sur l’interprétation de la formule. Les conditions définitives — le termsheet final — précisent les niveaux exacts constatés au strike."],
   alias="prospectus conditions definitives termsheet final base prospectus"),
 G("Termsheet", RIS,
   ["Fiche technique récapitulant les caractéristiques d’un produit : sous-jacent, barrières, coupon, dates, format d’émission.",
    "Avant l’émission, elle est indicative : les niveaux définitifs ne sont arrêtés qu’à la date de strike. C’est le document de travail de la comparaison entre offres concurrentes."],
   alias="term sheet fiche technique"),
 G("Position-recommandation AMF", RIS,
   ["Doctrine de l’Autorité des marchés financiers encadrant la commercialisation des instruments financiers complexes auprès de la clientèle non professionnelle.",
    "Elle fixe notamment des critères de complexité au-delà desquels un produit est considéré comme difficilement commercialisable auprès du grand public : nombre de mécanismes cumulés, lisibilité de la formule, caractère défavorable d’un mécanisme. Un produit cumulant Worst-of sur actions, barrière américaine et devise étrangère entre clairement dans cette zone de vigilance."],
   alias="amf regulateur doctrine commercialisation 2010-05"),
 G("Risque de change", RIS,
   ["Risque lié à la libellé du produit dans une devise différente de celle de l’investisseur, ou à un sous-jacent exprimé en devise étrangère.",
    "Il peut effacer entièrement un gain de formule ou aggraver une perte. Une version couverte dite <em>quanto</em> existe souvent : son coût de couverture réduit le coupon affiché, ce qui est le prix de la tranquillité."],
   alias="change devise quanto couverture forex"),

 # ---------------- Enveloppes & fiscalité ----------------
 G("Unité de compte", FIS,
   ["Support d’investissement d’un contrat d’assurance-vie ou de capitalisation, dont la valeur suit celle de l’actif sous-jacent sans garantie en capital de l’assureur.",
    "C’est sous cette forme que la très grande majorité des produits structurés sont souscrits en France. L’assureur référence le titre, en assure la valorisation périodique et porte la relation contractuelle."],
   alias="uc unite de compte support"),
 G("Assurance-vie", FIS,
   ["Enveloppe de capitalisation offrant une fiscalité avantageuse après huit ans de détention et un cadre favorable à la transmission.",
    "Le logement d’un produit structuré en assurance-vie présente un avantage majeur : les coupons perçus ne sont pas fiscalisés tant qu’ils restent dans le contrat, ce qui permet un réinvestissement à plein. Il faut en revanche ajouter les frais de gestion annuels du contrat au coût du produit lui-même."],
   alias="assurance vie contrat av"),
 G("Compte-titres ordinaire", FIS,
   ["Enveloppe sans contrainte de plafond ni de durée, dans laquelle les produits structurés sont détenus en direct.",
    "Les revenus et plus-values sont imposés à mesure de leur perception, au prélèvement forfaitaire unique ou sur option au barème. L’avantage est la liberté totale de choix de l’émetteur et de la souche ; l’inconvénient, une fiscalité immédiate qui pèse sur le rendement net d’un produit à coupons réguliers."],
   alias="cto compte titres ordinaire"),
 G("Contrat de capitalisation", FIS,
   ["Enveloppe de même nature financière que l’assurance-vie, accessible aux personnes morales et plus adaptée à certaines stratégies de transmission.",
    "Il constitue la voie usuelle pour loger des produits structurés au sein d’une holding ou d’une trésorerie d’entreprise excédentaire."],
   alias="capitalisation personne morale holding"),
 G("PER", FIS,
   ["Plan d’épargne retraite, enveloppe de long terme avec déductibilité des versements à l’entrée et sortie en capital ou en rente.",
    "L’horizon long du PER s’accorde avec les maturités élevées des produits structurés. Le blocage des fonds jusqu’à la retraite, hors cas de déblocage anticipé, doit être pleinement intégré avant de souscrire."],
   alias="per plan epargne retraite"),
 G("PEA", FIS,
   ["Plan d’épargne en actions. Son éligibilité aux produits structurés est très restreinte : seuls certains titres respectant des contraintes strictes de composition peuvent y figurer.",
    "En pratique, la grande majorité des produits structurés n’est pas éligible au PEA. Toute affirmation contraire doit être vérifiée dans la documentation de l’émetteur."],
   alias="pea plan epargne actions eligibilite"),
 G("Prélèvement forfaitaire unique", FIS,
   ["Imposition forfaitaire des revenus et plus-values de placement, au taux global de 30 % intégrant l’impôt sur le revenu et les prélèvements sociaux.",
    "Applicable aux produits détenus en compte-titres. L’option pour le barème progressif reste possible et peut être plus favorable aux contribuables faiblement imposés."],
   alias="pfu flat tax 30% prelevement forfaitaire"),
 G("Triangle de sécurité luxembourgeois", FIS,
   ["Dispositif de droit luxembourgeois plaçant les actifs des contrats d’assurance-vie hors du bilan de l’assureur, sous la surveillance du régulateur local.",
    "Il confère au souscripteur un rang de créancier privilégié de premier rang sur les actifs du contrat. Il protège du défaut de l’assureur, mais jamais du défaut de l’émetteur du produit structuré logé dans le contrat : les deux risques sont distincts."],
   alias="luxembourg triangle de securite creancier privilegie"),

 # ---------------- Frais & valorisation ----------------
 G("Frais de structuration", FRA,
   ["Marge prélevée par l’émetteur et le structureur, intégrée au prix d’émission du produit et non facturée séparément.",
    "Concrètement, un produit émis à 100 % du nominal a une valeur financière réelle inférieure à 100 % dès le premier jour. Cet écart explique une part importante de la décote constatée en cas de sortie anticipée précoce. Le DIC en donne la mesure dans sa rubrique sur les coûts."],
   alias="frais de structuration marge emetteur upfront"),
 G("Commission de distribution", FRA,
   ["Rémunération du distributeur, prélevée à l’entrée ou étalée sur la durée de vie du produit, et incluse dans la formule.",
    "Son niveau est désormais obligatoirement communiqué. Un produit chargé de frais de distribution élevés verse nécessairement un coupon plus faible, toutes choses égales : il n’existe pas de frais indolores."],
   alias="commission distribution retrocession rémunération distributeur"),
 G("Coût total de détention", FRA,
   ["Somme de tous les frais supportés par l’investisseur : structuration, distribution, frais de gestion de l’enveloppe d’accueil, éventuels droits d’entrée.",
    "C’est la seule mesure pertinente. Un produit structuré en assurance-vie supporte à la fois les frais intégrés à la formule et les frais de gestion annuels du contrat sur les unités de compte."],
   alias="cout total frais totaux ter"),
 G("Scénarios de performance", FRA,
   ["Quatre scénarios — tendu, défavorable, intermédiaire et favorable — calculés selon une méthode réglementaire uniforme et présentés dans le document d’informations clés.",
    "Leur intérêt est de permettre une comparaison standardisée entre produits. Leur limite est qu’ils reposent sur des hypothèses normées et non sur une prévision : ils ne constituent ni un engagement de l’émetteur ni une probabilité."],
   alias="scenarios performance priips tendu defavorable favorable"),
 G("Backtest", FRA,
   ["Simulation du comportement passé d’un produit ou d’un indice, calculée a posteriori sur des données historiques.",
    "Un backtest est construit en connaissant le passé : il est toujours flatteur. Pour un indice créé récemment, l’essentiel de l’historique présenté est reconstitué et n’a jamais été investi par personne. À lire comme une illustration de mécanisme, jamais comme une performance."],
   alias="backtest simulation historique reconstitue"),
 G("Taux de rendement interne", FRA,
   ["Taux annualisé qui résume la performance d’un produit en tenant compte du montant et de la date de chaque flux.",
    "C’est le seul indicateur permettant de comparer des structures de durées et de calendriers différents. Un coupon de 9 % perçu pendant deux ans avant rappel ne se compare pas directement à un coupon de 7 % perçu pendant huit ans."],
   alias="tri taux de rendement interne irr annualise"),
 G("Fourchette achat-vente", FRA,
   ["Écart entre le prix auquel l’émetteur rachète le produit et celui auquel il le vendrait, en cours de vie.",
    "Il constitue le coût réel d’une sortie anticipée. Sur les souches de taille réduite ou les structures complexes, cette fourchette peut représenter plusieurs points de nominal."],
   alias="spread bid ask fourchette achat vente"),
 G("Delta, vega, thêta", FRA,
   ["Sensibilités de la valeur du produit à ses principaux paramètres : le delta mesure la sensibilité au niveau du sous-jacent, le vega à la volatilité, le thêta à l’écoulement du temps.",
    "Ces notions expliquent le comportement parfois contre-intuitif d’une valorisation en cours de vie. Un produit dont le sous-jacent est stable peut se déprécier sous l’effet d’une hausse de la volatilité ou s’apprécier par le simple écoulement du temps."],
   alias="grecques delta vega theta gamma sensibilites"),
 G("Soft call et hard call", FRA,
   ["Deux natures d’option de remboursement anticipé. Le hard call appartient à l’émetteur, qui l’exerce quand cela lui est favorable. Le soft call se déclenche automatiquement sur condition de marché, comme dans un autocall.",
    "La distinction est essentielle : dans le premier cas, l’option joue contre l’investisseur ; dans le second, elle est neutre et contractuelle."],
   alias="soft call hard call option de rappel"),
]

# ==========================================================================
#  DATA.JS — jeu de données consommé par le comparateur
# ==========================================================================
def unesc(o):
    """Les libellés sont stockés avec des entités HTML (pour le rendu serveur) ;
    le JS les ré-échappe lui-même, on les repasse donc en texte brut."""
    if isinstance(o, str):
        return html.unescape(o)
    if isinstance(o, list):
        return [unesc(x) for x in o]
    if isinstance(o, dict):
        return {k: unesc(v) for k, v in o.items()}
    return o

def build_data_js():
    payload = json.dumps(unesc(PRODUITS), ensure_ascii=False, indent=0, separators=(",", ":"))
    js = ("/* Généré par build-observatoire.py — ne pas modifier à la main. */\n"
          "/* Gabarits de structures sur sous-jacents de marché, à titre pédagogique. */\n"
          "window.OBS_EMAIL = " + json.dumps(EMAIL) + ";\n"
          "window.OBS_PRODUITS = " + payload + ";\n")
    write("assets/data.js", js)

def slugify(s):
    s = html.unescape(s).lower()
    repl = {"à": "a", "â": "a", "ä": "a", "é": "e", "è": "e", "ê": "e", "ë": "e",
            "î": "i", "ï": "i", "ô": "o", "ö": "o", "ù": "u", "û": "u", "ü": "u",
            "ç": "c", "’": " ", "'": " ", "(": " ", ")": " ", "&": " ", ",": " ",
            ".": " ", "—": " ", "-": " ", "/": " "}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = "".join(c for c in s if c.isalnum() or c == " ")
    return "-".join(s.split())

def pct(v):
    if v is None:
        return "—"
    return f"{v*100:.2f}".rstrip("0").rstrip(".").replace(".", ",") + " %"

# ==========================================================================
#  FRAGMENT — schéma de profil de remboursement
# ==========================================================================
PAYOFF_SVG = """<svg viewBox="0 0 680 330" role="img" aria-label="Profil de remboursement à l’échéance d’un produit à barrière de capital 60 pour cent">
  <defs>
    <linearGradient id="zoneKo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#99402F" stop-opacity=".10"/><stop offset="100%" stop-color="#99402F" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="zoneOk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2F6B4E" stop-opacity=".10"/><stop offset="100%" stop-color="#2F6B4E" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Repère : y=260 -> 0 %, y=87,5 -> 100 % (1 % = 1,725 px) ; x=60 -> 0 %, x=620 -> 140 % (1 % = 4 px) -->
  <rect x="60" y="60" width="240" height="200" fill="url(#zoneKo)"/>
  <rect x="300" y="60" width="320" height="200" fill="url(#zoneOk)"/>
  <g stroke="#E4E1DA" stroke-width="1">
    <line x1="60" y1="87.5" x2="620" y2="87.5"/>
    <line x1="60" y1="130.6" x2="620" y2="130.6"/>
    <line x1="60" y1="173.8" x2="620" y2="173.8"/>
    <line x1="60" y1="216.9" x2="620" y2="216.9"/>
  </g>
  <line x1="60" y1="260" x2="620" y2="260" stroke="#14171B" stroke-width="1.2"/>
  <line x1="60" y1="60" x2="60" y2="260" stroke="#14171B" stroke-width="1.2"/>
  <line x1="300" y1="60" x2="300" y2="260" stroke="#A9853F" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text x="140" y="76" font-family="Jost, sans-serif" font-size="12" fill="#A9853F">Barrière de capital — 60 %</text>
  <path d="M 60 260 L 300 156.5" fill="none" stroke="#99402F" stroke-width="2.6"/>
  <path d="M 300 87.5 L 620 87.5" fill="none" stroke="#2F6B4E" stroke-width="2.6"/>
  <circle cx="300" cy="156.5" r="4" fill="#fff" stroke="#99402F" stroke-width="2.2"/>
  <circle cx="300" cy="87.5" r="4" fill="#2F6B4E"/>
  <line x1="300" y1="156.5" x2="300" y2="87.5" stroke="#14171B" stroke-width="1.1"/>
  <path d="M 296 92 L 300 87.5 L 304 92" fill="none" stroke="#14171B" stroke-width="1.1"/>
  <path d="M 296 152 L 300 156.5 L 304 152" fill="none" stroke="#14171B" stroke-width="1.1"/>
  <text x="312" y="126" font-family="Jost, sans-serif" font-size="12" fill="#14171B">Effet de seuil : 40 points de nominal</text>
  <text x="330" y="78" font-family="Jost, sans-serif" font-size="11.5" fill="#2F6B4E">Remboursement plafonné à 100 %</text>
  <g font-family="Jost, sans-serif" font-size="11.5" fill="#6B7078" text-anchor="end">
    <text x="52" y="91.5">100 %</text><text x="52" y="134.6">75 %</text>
    <text x="52" y="177.8">50 %</text><text x="52" y="220.9">25 %</text><text x="52" y="264">0 %</text>
  </g>
  <g font-family="Jost, sans-serif" font-size="11.5" fill="#6B7078" text-anchor="middle">
    <text x="60" y="279">0 %</text><text x="300" y="279">60 %</text>
    <text x="460" y="279">100 %</text><text x="620" y="279">140 %</text>
  </g>
  <text x="340" y="303" font-family="Jost, sans-serif" font-size="12" fill="#14171B" text-anchor="middle">Niveau du sous-jacent à l’échéance</text>
  <text x="16" y="160" font-family="Jost, sans-serif" font-size="12" fill="#14171B" text-anchor="middle" transform="rotate(-90 16 160)">Capital remboursé</text>
</svg>"""

# ==========================================================================
#  FRAGMENT — zone de dépôt « faire analyser un produit »
# ==========================================================================
def bloc_analyse():
    return """
<section class="section section--navy" id="analyse" style="scroll-margin-top:90px">
  <div class="container container--mid">
    <p class="eyebrow eyebrow--light">Avis sur votre produit</p>
    <h2 class="title-lg">Déposez la documentation,<br>nous vous disons ce que nous en pensons</h2>
    <p style="max-width:660px;margin-top:18px">
      Vous avez reçu une proposition et vous voulez un second regard&nbsp;? Déposez le document
      d’informations clés (DIC) ou la brochure. Nous en reprenons le sous-jacent, les barrières
      et leur mode de constatation, nous vérifions la signature de l’émetteur, nous comparons
      aux offres du moment à risque équivalent — et nous vous répondons sous deux jours ouvrés.
    </p>

    <form class="dz-form" id="dz-form" novalidate>
      <div class="dz" id="dz" tabindex="0" role="button"
           aria-label="Déposer un document : glissez un fichier ici ou appuyez sur Entrée pour parcourir vos fichiers">
        <input type="file" id="dz-input" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple hidden>
        <svg class="dz__i" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 32V12m0 0l-8 8m8-8l8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 30v4a4 4 0 004 4h24a4 4 0 004-4v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p class="dz__t">Glissez le DIC ou la brochure ici</p>
        <p class="dz__s">ou <span class="dz__link">parcourez vos fichiers</span> — PDF, PNG ou JPEG, 10 Mo maximum, 3 fichiers au plus</p>
      </div>
      <ul class="dz-files" id="dz-files" aria-live="polite"></ul>

      <div class="dz-grid">
        <div class="field"><label for="dz-prenom">Prénom *</label>
          <input type="text" id="dz-prenom" name="prenom" autocomplete="given-name" required></div>
        <div class="field"><label for="dz-nom">Nom *</label>
          <input type="text" id="dz-nom" name="nom" autocomplete="family-name" required></div>
        <div class="field"><label for="dz-email">Email *</label>
          <input type="email" id="dz-email" name="email" autocomplete="email" required></div>
        <div class="field"><label for="dz-tel">Téléphone</label>
          <input type="text" id="dz-tel" name="telephone" autocomplete="tel"></div>
      </div>
      <div class="field" style="margin-top:14px">
        <label for="dz-msg">Votre question</label>
        <textarea id="dz-msg" name="message" rows="3"
          placeholder="Montant envisagé, enveloppe (assurance-vie, compte-titres…), ce qui vous fait hésiter."></textarea>
      </div>
      <div class="dz-hp" aria-hidden="true">
        <label for="dz-company">Société</label>
        <input type="text" id="dz-company" name="company" tabindex="-1" autocomplete="off">
      </div>

      <div class="dz-foot">
        <button class="btn btn--gold" type="submit" id="dz-send">Demander une analyse</button>
        <p class="dz-status" id="dz-status" role="status" aria-live="polite"></p>
      </div>

      <p class="dz-note">
        <strong>Vos fichiers ne quittent pas votre ordinateur à cette étape.</strong> Ce
        formulaire nous transmet votre demande et la liste des documents ; un brouillon
        d’email s’ouvre ensuite pour que vous y joigniez les fichiers — un lien de messagerie
        ne pouvant pas attacher de pièce automatiquement. Si votre messagerie ne s’ouvre pas,
        écrivez-nous directement à
        <a href="mailto:""" + EMAIL + """">""" + EMAIL + """</a>.
      </p>
      <p class="dz-note xsmall">
        Cette analyse est une lecture documentaire à visée pédagogique. Elle ne constitue pas
        un conseil en investissement personnalisé, lequel suppose un examen préalable de votre
        situation, de vos objectifs et de vos connaissances.
      </p>
    </form>
  </div>
</section>"""

# ==========================================================================
#  PAGE — ACCUEIL
# ==========================================================================
def page_index():
    best, seen = [], set()
    for p in sorted(PRODUITS, key=lambda x: -x["note"]):
        if p["famille"] in seen:
            continue
        seen.add(p["famille"])
        best.append(p)
        if len(best) == 5:
            break

    rows = "\n".join(f"""        <tr>
          <td><div class="t-name">{p["nom"]}</div><div class="t-sub">{p["emetteur"]}</div></td>
          <td><a class="tag tag--gold" href="comprendre.html#{FAM_SLUG[p["famille"]]}">{p["famille"]}</a></td>
          <td class="num-cell"><span class="coupon">{pct(p["coupon"])}</span></td>
          <td class="num-cell">{"Protégé" if p["b_capital"] is None else f'{round(p["b_capital"]*100)} %'}</td>
          <td class="num-cell">{p["maturite"]} ans</td>
        </tr>""" for p in best)

    fam_html = "\n".join(f"""      <a class="card linkcard rv" href="comprendre.html#{f["slug"]}">
        <p class="card__k">{f["profil"]}</p>
        <h3 class="card__t">{f["nom"]}</h3>
        <p class="small muted">{f["resume"]}</p>
        <span class="card__more">Lire la fiche</span>
      </a>""" for f in FAMILLES if not f.get("exclu"))

    emet_html = "\n".join(f"""        <tr>
          <td><strong>{em["nom"]}</strong><div class="t-sub">{em["pays"]}</div></td>
          <td class="num-cell">{em["sp"]}</td>
          <td class="num-cell">{em["moodys"]}</td>
          <td class="num-cell">{em["fitch"]}</td>
        </tr>""" for em in EMETTEURS[:8])

    cp = [p["coupon"] for p in PRODUITS if p["coupon"]]
    cmax = f'{max(cp)*100:.1f}'.replace(".", ",")

    body = f"""
{hero(
  "Produits structurés : comprendre,<br>comparer, investir avec discernement",
  "Un répertoire du marché français adossé à des sous-jacents publics — CAC 40, "
  "EURO STOXX 50, S&amp;P 500 — dont la cotation se vérifie chaque jour. Mécanismes, "
  "structures, émetteurs et vocabulaire, expliqués sans raccourci commercial.",
  actions='<a class="btn btn--gold" href="produits.html">Ouvrir le comparateur</a>'
          '<a class="btn btn--ghost-light" href="produits.html#analyse">Faire analyser mon produit</a>',
  page=False)}

<section>
  <div class="container">
    <div class="stats">
      <div class="stat"><div class="stat__n">{len(PRODUITS)}</div><div class="stat__l">Structures référencées</div></div>
      <div class="stat"><div class="stat__n">{cmax}&nbsp;<em>%</em></div><div class="stat__l">Coupon le plus élevé</div></div>
      <div class="stat"><div class="stat__n">{len(GUIDES)}</div><div class="stat__l">Guides pédagogiques</div></div>
      <div class="stat"><div class="stat__n">{len(GLOSSAIRE)}</div><div class="stat__l">Définitions au glossaire</div></div>
    </div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="grid grid--2">
      <div class="cell">
        <p class="eyebrow">Notre parti pris</p>
        <h2 class="title-lg">Un sous-jacent que vous pouvez<br>suivre dans le journal.</h2>
      </div>
      <div class="cell cell--ivory">
        <p class="lede">La majorité des produits distribués en France repose sur un
        <a class="card__more" href="guides/indice-decrement/" style="border:0;padding:0">indice
        décrément</a> : un indice construit pour la structuration, dont on retranche un
        dividende forfaitaire chaque année. Le procédé est documenté et permet d’afficher des
        coupons plus élevés ; il rend en revanche le sous-jacent moins facile à suivre pour
        celui qui l’achète.</p>
        <p>Pour ce comparateur, nous avons retenu des indices publics et des actions cotées.
        Le coupon y est financé par les dividendes que vous ne percevez pas — un mécanisme
        vérifiable, qui atteint malgré tout {cmax} % par an sur les profils les plus exposés.
        Ce choix coûte un à deux points de coupon à barrières identiques : c’est un arbitrage
        de lisibilité, pas un jugement de performance.</p>
        <p style="margin-bottom:0"><a class="card__more" href="guides/produit-structure-sans-decrement/">Comparer les deux approches</a></p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <p class="eyebrow">Les trois paramètres qui décident de tout</p>
    <h2 class="title-lg" style="max-width:660px">Lire une fiche produit en trois lectures</h2>
    <hr class="rule">
    <div class="cards" style="margin-top:34px">
      <div class="card rv">
        <div class="num">1</div>
        <h3 class="card__t">Qui est le débiteur</h3>
        <p class="small">Le sous-jacent ne vous appartient pas. Vous prêtez à une banque. Si
        elle fait défaut, la formule ne vous protège de rien. Première question : quelle est
        la notation de l’émetteur, et qui est son garant ?</p>
        <a class="card__more" href="acteurs.html#emetteurs">Les émetteurs du marché</a>
      </div>
      <div class="card rv">
        <div class="num">2</div>
        <h3 class="card__t">Où sont les barrières</h3>
        <p class="small">Leur niveau compte, leur mode de constatation davantage encore. Une
        barrière à 65 % constatée tous les jours pendant huit ans n’a rien à voir avec la même
        barrière constatée un seul jour, à l’échéance.</p>
        <a class="card__more" href="comprendre.html#barriere-americaine">Européenne ou américaine</a>
      </div>
      <div class="card rv">
        <div class="num">3</div>
        <h3 class="card__t">Comment le coupon est financé</h3>
        <p class="small">Un coupon se paie toujours : par un plafond de gain, par les
        dividendes auxquels vous renoncez, par un décrément contractuel ou par un mécanisme
        Worst-of. Identifier la source, c’est comprendre le produit.</p>
        <a class="card__more" href="comprendre.html#fabrication">D’où vient le coupon</a>
      </div>
    </div>
  </div>
</section>

<section class="section section--mist">
  <div class="container">
    <p class="eyebrow">Le comparateur</p>
    <h2 class="title-lg">Les structures de référence du marché</h2>
    <p class="lede" style="max-width:640px;margin-top:18px">{len(PRODUITS)} gabarits sur
    sous-jacents publics, filtrables par famille, émetteur, sous-jacent, barrière et maturité,
    avec le détail des mécanismes et des scénarios pour chacun.</p>
    <div class="tablewrap" style="border-top:1px solid var(--line);margin-top:30px">
      <table class="tbl" style="min-width:720px">
        <thead><tr><th>Structure</th><th>Famille</th><th>Coupon annuel</th><th>Barrière capital</th><th>Maturité</th></tr></thead>
        <tbody>
{rows}
        </tbody>
      </table>
    </div>
    <div style="margin-top:28px"><a class="btn" href="produits.html">Voir les {len(PRODUITS)} structures</a></div>
  </div>
</section>

<section class="section">
  <div class="container">
    <p class="eyebrow">Familles de produits</p>
    <h2 class="title-lg">Onze structures, onze profils de risque</h2>
    <hr class="rule">
    <div class="cards" style="margin-top:34px">
{fam_html}
    </div>
    <div style="margin-top:30px"><a class="btn" href="comprendre.html#familles">Toutes les familles</a></div>
  </div>
</section>

<section class="section section--mist">
  <div class="container">
    <p class="eyebrow">Les guides</p>
    <h2 class="title-lg">Un mécanisme, un guide</h2>
    <p class="lede" style="max-width:640px;margin-top:18px">Quatorze guides qui vont au bout
    d’un sujet, avec des exemples chiffrés : ce qu’est un produit structuré, comment
    fonctionne un autocall, où se situent les barrières, comment l’enveloppe change le
    rendement net.</p>
    <div class="cards" style="margin-top:30px">
      <a class="card linkcard rv" href="guides/produit-structure/">
        <p class="card__k">Fondamentaux</p>
        <h3 class="card__t">Qu’est-ce qu’un produit structuré</h3>
        <p class="small muted">Définition juridique, composition, d’où vient le coupon,
        familles et risques.</p>
        <span class="card__more">Lire le guide</span>
      </a>
      <a class="card linkcard rv" href="guides/autocall/">
        <p class="card__k">Mécanisme</p>
        <h3 class="card__t">Autocall et remboursement anticipé</h3>
        <p class="small muted">Seuil de rappel, période de non-rappel, trigger dégressif,
        risque de réinvestissement.</p>
        <span class="card__more">Lire le guide</span>
      </a>
      <a class="card linkcard rv" href="guides/risques-produits-structures/">
        <p class="card__k">Essentiel</p>
        <h3 class="card__t">Les risques des produits structurés</h3>
        <p class="small muted">Les six risques réellement portés, et leurs conséquences
        chiffrées.</p>
        <span class="card__more">Lire le guide</span>
      </a>
    </div>
    <div style="margin-top:30px"><a class="btn" href="guides/">Les {len(GUIDES)} guides</a></div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="grid grid--2">
      <div class="cell">
        <p class="eyebrow">Les acteurs</p>
        <h2 class="title-md">La signature avant la formule</h2>
        <p class="small" style="margin-top:16px">{len(EMETTEURS)} émetteurs et
        {len(ETABLISSEMENTS)} établissements de place : notations de crédit, profil de gamme,
        rôle de chacun dans la chaîne — et à quel niveau se joue la qualité du conseil.</p>
        <a class="card__more" href="acteurs.html">Voir les acteurs du marché</a>
      </div>
      <div class="cell" style="padding:0">
        <div class="tablewrap" style="border:0">
          <table class="tbl" style="min-width:420px">
            <thead><tr><th>Émetteur</th><th>S&amp;P</th><th>Moody’s</th><th>Fitch</th></tr></thead>
            <tbody>
{emet_html}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <p class="xsmall muted" style="margin-top:14px">Notations de dette senior long terme, à
    titre indicatif, telles que relevées en {ANNEE_RATINGS}. Elles évoluent : à revérifier
    auprès des agences.</p>
  </div>
</section>
{bloc_analyse()}

<section class="section section--tight">
  <div class="container">
    <div class="notice">
      <span class="notice__i" aria-hidden="true">!</span>
      <div>
        <p><strong>Nature des informations publiées.</strong> Ce site est un outil pédagogique.
        Les structures présentées dans le comparateur sont des gabarits de référence destinés à
        illustrer les mécanismes du marché : ce ne sont pas des souches réelles en cours de
        commercialisation, et aucun code ISIN n’est publié.</p>
        <p>Les conditions définitives d’une émission ne sont connues qu’à sa date de strike et
        figurent dans le document d’informations clés et le prospectus de l’émetteur, seuls
        documents faisant foi. Aucun élément de ce site ne constitue un conseil en
        investissement ni une recommandation personnalisée.</p>
      </div>
    </div>
  </div>
</section>
"""
    write("index.html", layout("index.html",
        "Produits Structurés : Comparateur et Analyse | Le Comptoir",
        "Comparez les mécanismes des produits structurés, analysez les coupons, barrières "
        "et risques. Guides Autocall, Phoenix et analyse de vos documents.",
        body, crumb_trail=[("Accueil", "index.html")]))

# ==========================================================================
#  PAGE — COMPARATEUR
# ==========================================================================
def page_produits():
    th = [("", "", False), ("Structure", "nom", True), ("Émetteur", "emetteur", True),
          ("Coupon annuel", "coupon", True), ("Barr. coupon", "b_coupon", True),
          ("Barr. capital", "b_capital", True), ("Maturité", "maturite", True),
          ("Devise", "devise", True), ("Note", "note", True)]
    head_html = "\n            ".join(
        '<th aria-hidden="true"></th>' if not label else
        (f'<th class="sortable" data-k="{key}" scope="col" title="Trier par {label.lower()}">{label}<span class="arrow">⇅</span></th>'
         if sortable else f'<th scope="col">{label}</th>')
        for label, key, sortable in th)

    body = f"""
{hero("Comparateur de produits structurés :<br>coupons, barrières et risques",
  f"{len(PRODUITS)} gabarits de structures sur sous-jacents publics — aucun indice "
  "décrément. Filtrables et triables selon les paramètres qui déterminent réellement le "
  "profil de risque. Cliquez sur une ligne pour en déplier le mécanisme, les scénarios et "
  "les points de vigilance.",
  crumb_html=fil([("Accueil", "index.html"), ("Comparateur", "produits.html")], ""),
  actions='<a class="btn btn--ghost-light" href="#analyse">Faire analyser mon produit</a>')}

<section class="section section--tight">
  <div class="container">
    <div class="notice" style="margin-bottom:30px">
      <span class="notice__i" aria-hidden="true">!</span>
      <div>
        <p><strong>Gabarits de référence, non des souches en commercialisation.</strong>
        Chaque ligne décrit une combinaison famille / sous-jacent / barrières / maturité telle
        qu’elle se traite couramment sur le marché, avec un niveau de coupon cohérent avec les
        conditions observées en {MAJ}. Aucun code ISIN n’est publié : les conditions
        définitives d’une émission ne sont arrêtées qu’à sa date de strike.</p>
        <p>Les niveaux de coupon évoluent en permanence avec les taux et la volatilité. Pour
        connaître les offres réellement ouvertes à un instant donné,
        <a class="card__more" href="../contact.html" style="border:0;padding:0">consultez-nous</a>
        — ou <a class="card__more" href="#analyse" style="border:0;padding:0">déposez la
        documentation d’un produit</a> qu’on vous a proposé.</p>
      </div>
    </div>

    <form class="filters" role="search" aria-label="Filtrer les structures" onsubmit="return false">
      <div class="filters__row">
        <div class="field" style="grid-column:span 2">
          <label for="f-q">Recherche libre</label>
          <input type="search" id="f-q" placeholder="Phoenix, worst-of, CAC 40, dollar…" autocomplete="off">
        </div>
        <div class="field"><label for="f-fam">Famille</label><select id="f-fam"></select></div>
        <div class="field"><label for="f-emet">Émetteur</label><select id="f-emet"></select></div>
        <div class="field"><label for="f-sj">Type de sous-jacent</label><select id="f-sj"></select></div>
      </div>
      <div class="filters__row" style="margin-top:14px">
        <div class="field"><label for="f-cpn">Coupon minimum</label>
          <select id="f-cpn">
            <option value="">Indifférent</option>
            <option value="0.08">8 % et plus</option>
            <option value="0.10">10 % et plus</option>
            <option value="0.12">12 % et plus</option>
            <option value="0.14">14 % et plus</option>
          </select></div>
        <div class="field"><label for="f-cap">Barrière de capital</label>
          <select id="f-cap">
            <option value="">Indifférent</option>
            <option value="0.70">70 % ou plus profonde</option>
            <option value="0.60">60 % ou plus profonde</option>
            <option value="0.50">50 % ou plus profonde</option>
            <option value="0.40">40 % ou plus profonde</option>
          </select></div>
        <div class="field"><label for="f-mat">Maturité maximale</label>
          <select id="f-mat">
            <option value="">Indifférent</option>
            <option value="3">3 ans ou moins</option>
            <option value="6">6 ans ou moins</option>
            <option value="8">8 ans ou moins</option>
            <option value="10">10 ans ou moins</option>
          </select></div>
        <div class="field"><label for="f-env">Enveloppe</label><select id="f-env"></select></div>
        <div class="field"><label for="f-dev">Devise</label><select id="f-dev"></select></div>
      </div>
      <div class="filters__foot">
        <span class="filters__count" id="f-count" aria-live="polite"></span>
        <button class="btn-link" type="button" id="f-reset">Réinitialiser les filtres</button>
        <span class="xsmall muted" style="margin-left:auto">Cliquez sur l’en-tête d’une colonne pour trier.</span>
      </div>
    </form>

    <div class="tablewrap">
      <table class="tbl">
        <thead>
          <tr>
            {head_html}
          </tr>
        </thead>
        <tbody id="tbl-body">
{rows_prerendered()}
        </tbody>
      </table>
    </div>
    <div class="plist" id="plist">
{cards_prerendered()}
    </div>
    <div class="noresult" id="no-result" style="display:none">
      Aucune structure ne correspond à ces critères.<br>
      <button class="btn-link" type="button" onclick="document.getElementById('f-reset').click()" style="margin-top:12px">Réinitialiser les filtres</button>
    </div>

    <h2 class="title-md" style="margin-top:64px">Lire ce tableau correctement</h2>
    <hr class="rule">
    <div class="grid grid--3" style="margin-top:26px">
      <div class="cell">
        <h3 class="card__t" style="font-size:1.1rem">Le coupon n’est pas un rendement</h3>
        <p class="small muted">C’est un maximum conditionnel. Le rendement d’un produit
        structuré réellement perçu dépend du nombre de constatations réussies et de la date de
        rappel. Deux produits à 11 % n’ont pas la même espérance de gain si leurs barrières
        diffèrent.</p>
        <a class="card__more" href="guides/phoenix/">Le coupon conditionnel</a>
      </div>
      <div class="cell">
        <h3 class="card__t" style="font-size:1.1rem">La maturité est un plafond</h3>
        <p class="small muted">Sur une structure autocall, la durée réelle est presque toujours
        plus courte que la maturité affichée, puisque le remboursement anticipé peut survenir
        à chaque constatation. Il faut néanmoins pouvoir porter le produit jusqu’au bout.</p>
        <a class="card__more" href="guides/autocall/">Le remboursement anticipé</a>
      </div>
      <div class="cell">
        <h3 class="card__t" style="font-size:1.1rem">Deux barrières, deux rôles</h3>
        <p class="small muted">La barrière de coupon commande le revenu ; la barrière de
        protection commande le remboursement du capital. C’est la seconde qui détermine le
        risque de perte, et c’est par elle qu’il faut commencer la lecture.</p>
        <a class="card__more" href="guides/barriere-de-protection/">Les barrières</a>
      </div>
    </div>

    <h2 class="title-md" style="margin-top:56px">Les mécanismes présents dans ce tableau</h2>
    <hr class="rule">
    <p class="lede" style="max-width:720px">Chaque colonne renvoie à un mécanisme précis.
    Voici où en trouver l’explication complète, avec des exemples chiffrés.</p>
    <div class="cards" style="margin-top:24px">
      <a class="card linkcard" href="guides/autocall/">
        <p class="card__k">Mécanisme</p>
        <h3 class="card__t" style="font-size:1.14rem">Autocall</h3>
        <p class="small muted" style="margin:0">Le remboursement anticipé automatique : seuil
        de rappel, période de non-rappel, trigger dégressif et risque de réinvestissement.</p>
      </a>
      <a class="card linkcard" href="guides/phoenix/">
        <p class="card__k">Famille</p>
        <h3 class="card__t" style="font-size:1.14rem">Phoenix</h3>
        <p class="small muted" style="margin:0">Le coupon conditionnel versé à chaque
        constatation, et la distinction entre barrière de coupon et barrière de capital.</p>
      </a>
      <a class="card linkcard" href="guides/athena/">
        <p class="card__k">Famille</p>
        <h3 class="card__t" style="font-size:1.14rem">Athéna</h3>
        <p class="small muted" style="margin:0">Le gain capitalisé, versé en une fois au
        rappel ou à l’échéance, et sa comparaison avec le Phoenix.</p>
      </a>
      <a class="card linkcard" href="guides/coupon-memoire/">
        <p class="card__k">Clause</p>
        <h3 class="card__t" style="font-size:1.14rem">Coupon mémoire</h3>
        <p class="small muted" style="margin:0">Les coupons manqués mis en réserve et
        rattrapés — ce que la clause apporte, et ce qu’elle ne protège pas.</p>
      </a>
      <a class="card linkcard" href="guides/risques-produits-structures/">
        <p class="card__k">Essentiel</p>
        <h3 class="card__t" style="font-size:1.14rem">Les risques</h3>
        <p class="small muted" style="margin:0">Perte en capital, défaut de l’émetteur,
        rendement nul, liquidité, réinvestissement, change.</p>
      </a>
      <a class="card linkcard" href="guides/">
        <p class="card__k">Index</p>
        <h3 class="card__t" style="font-size:1.14rem">Tous les guides</h3>
        <p class="small muted" style="margin:0">Quatorze guides, des fondamentaux aux
        sous-jacents en passant par la fiscalité et les enveloppes.</p>
      </a>
    </div>
  </div>
</section>
{bloc_analyse()}
"""
    write("produits.html", layout("produits.html",
        "Comparateur Produits Structurés : Coupons, Barrières et Risques",
        f"Comparez {len(PRODUITS)} structures de référence : coupon, barrière de coupon, "
        "barrière de capital, maturité, émetteur et scénarios. Autocall, Phoenix, Athéna, "
        "capital garanti.",
        body, crumb_trail=[("Accueil", "index.html"), ("Comparateur", "produits.html")]))

# ==========================================================================
#  PAGE — COMPRENDRE (guide + familles + glossaire, en onglets)
# ==========================================================================
def onglets(items, actif=0):
    """items = [(id, libellé), ...] — barre d'onglets commune."""
    btns = "\n      ".join(
        f'<button class="tabs__b{" is-active" if i == actif else ""}" type="button" '
        f'role="tab" id="tab-{tid}" aria-controls="{tid}" '
        f'aria-selected="{"true" if i == actif else "false"}" data-tab="{tid}">{lbl}</button>'
        for i, (tid, lbl) in enumerate(items))
    return f'<div class="tabs" role="tablist" aria-label="Sections">\n      {btns}\n    </div>'

def volet_guide():
    fam_rows = "\n".join(
        f'<tr><td><a class="inline" href="#{f["slug"]}" data-goto="familles">{f["nom"]}</a></td>'
        f'<td>{f["profil"]}</td><td>{f["resume"][:120]}…</td></tr>'
        for f in FAMILLES)
    return f"""
    <div class="prose">
      <div class="toc">
        <p class="toc__t">Au sommaire</p>
        <ol>
          <li><a href="#definition">Ce qu’est un produit structuré — et ce qu’il n’est pas</a></li>
          <li><a href="#fabrication">D’où vient le coupon</a></li>
          <li><a href="#decrement-ou-pas">Indice public ou indice décrément</a></li>
          <li><a href="#tableau-familles">Les familles, en un tableau</a></li>
          <li><a href="#barrieres">Les barrières, le cœur du sujet</a></li>
          <li><a href="#risques">Les six risques réellement portés</a></li>
          <li><a href="#fiscalite">Enveloppes et fiscalité</a></li>
          <li><a href="#sortie">Sortir avant l’échéance</a></li>
          <li><a href="#questions">Les dix questions à poser</a></li>
          <li><a href="#erreurs">Les erreurs les plus fréquentes</a></li>
        </ol>
      </div>

      <h2 id="definition">1. Ce qu’est un produit structuré — et ce qu’il n’est pas</h2>
      <p>Un produit structuré est un <strong>titre de créance émis par une banque</strong>,
      dont le remboursement et la rémunération sont calculés selon une formule fixée à
      l’avance et référencée à un actif financier : un indice, une action, un panier, un taux.</p>
      <p>Cette définition juridique a trois conséquences immédiates, qui échappent souvent à
      l’investisseur.</p>
      <ul>
        <li><strong>Vous ne détenez pas le sous-jacent.</strong> Ni les actions, ni l’indice.
        Vous ne percevez donc aucun dividende et ne disposez d’aucun droit de vote.</li>
        <li><strong>Vous êtes créancier d’une banque.</strong> Si elle fait défaut, la formule
        ne vous protège de rien, quelle que soit la performance du sous-jacent.</li>
        <li><strong>Ce n’est pas un fonds.</strong> Il n’y a ni gérant, ni arbitrage, ni
        décision discrétionnaire en cours de vie. La formule s’applique mécaniquement.</li>
      </ul>
      <blockquote><p>Un produit structuré ne gère rien. Il exécute un contrat. Toute la
      question est de savoir si ce contrat vous est favorable.</p></blockquote>

      <h2 id="fabrication">2. D’où vient le coupon</h2>
      <p>Un coupon de 11 % par an dans un monde où le taux sans risque est à 2 % ne tombe pas
      du ciel. Il est financé, et il est utile de savoir par quoi. Schématiquement, l’émetteur
      décompose votre nominal en deux poches.</p>
      <p>La première est une <strong>composante obligataire</strong> : en plaçant une partie
      de votre argent à son propre taux de financement, l’émetteur sait reconstituer une
      fraction du capital à l’échéance. La seconde est un <strong>budget d’options</strong> :
      avec le reliquat, il achète et vend des options sur le sous-jacent. C’est cette seconde
      poche qui fabrique le profil de gain.</p>
      <p>Trois leviers permettent d’augmenter le coupon — et chacun a un coût pour vous :</p>
      <ul>
        <li><strong>Vendre de la volatilité.</strong> Plus le sous-jacent est agité, plus les
        options vendues rapportent. Un coupon élevé signale donc un sous-jacent risqué, pas une
        bonne affaire.</li>
        <li><strong>Renoncer aux dividendes.</strong> Les grands indices sont publiés
        dividendes non réinvestis : le CAC 40 que vous lisez dans la presse ne les intègre pas.
        Ces dividendes abandonnés financent l’essentiel de votre coupon.</li>
        <li><strong>Plafonner le gain.</strong> En abandonnant les scénarios très haussiers,
        vous achetez votre protection à la baisse.</li>
      </ul>
      <p>À ces trois leviers s’ajoutent les mécanismes défavorables : un
      <a class="inline" href="#worst-of" data-goto="glossaire">Worst-of</a> sur plusieurs
      actions, une <a class="inline" href="#barriere-americaine" data-goto="glossaire">barrière
      américaine</a>, un indice décrément, une devise étrangère non couverte. Lorsqu’un coupon
      dépasse nettement ceux du marché, l’un de ces mécanismes est presque toujours présent.
      Le trouver, c’est comprendre le produit.</p>

      <h2 id="decrement-ou-pas">3. Indice public ou indice décrément</h2>
      <p>C’est aujourd’hui la ligne de partage la plus importante du marché français, et la
      moins expliquée.</p>
      <p>Un <strong>indice public</strong> — CAC 40, EURO STOXX 50, S&amp;P 500 — est calculé
      par un fournisseur indépendant, coté en continu, consultable par n’importe qui. Un
      <strong>indice décrément</strong> est construit pour la structuration : il réinvestit les
      dividendes réels du panier, puis en retranche un prélèvement forfaitaire, soit un
      pourcentage annuel, soit un nombre fixe de points.</p>
      <table>
        <thead><tr><th></th><th>Indice public</th><th>Indice décrément</th></tr></thead>
        <tbody>
          <tr><td><strong>Cotation</strong></td><td>Suivie quotidiennement, presse et sites financiers</td><td>Publiée par l’émetteur, peu accessible</td></tr>
          <tr><td><strong>Historique</strong></td><td>Réel, souvent plusieurs décennies</td><td>Souvent reconstitué par calcul avant la création</td></tr>
          <tr><td><strong>Dividendes</strong></td><td>Non réinvestis : ils financent le coupon</td><td>Réinvestis puis prélevés au forfait</td></tr>
          <tr><td><strong>Coupon affiché</strong></td><td>Élevé</td><td>Plus élevé encore</td></tr>
          <tr><td><strong>Écart à la référence</strong></td><td>Aucun, c’est la référence</td><td>Se creuse chaque année</td></tr>
        </tbody>
      </table>
      <p>Le décrément n’est pas un piège en soi : c’est un mode de financement du coupon,
      parfaitement documenté. Mais il transfère au souscripteur un sous-jacent qu’il ne peut
      plus suivre, et dont le prélèvement pèse d’autant plus lourd que le marché baisse —
      quand il s’agit d’un décrément en points, le prélèvement reste constant en valeur
      absolue alors que l’indice, lui, a reculé.</p>
      <p><strong>Nos structures sont toutes sur indice public.</strong> Le coupon y est un peu
      plus faible à barrières identiques, et nous assumons cet écart :
      <a class="inline" href="#indice-decrement" data-goto="familles">la fiche détaillée</a>
      explique le calcul.</p>

      <h2 id="tableau-familles">4. Les familles, en un tableau</h2>
      <table>
        <thead><tr><th>Famille</th><th>Profil</th><th>En une ligne</th></tr></thead>
        <tbody>
{fam_rows}
        </tbody>
      </table>
      <p>Chaque famille fait l’objet d’une fiche détaillée, avec son mécanisme, ses avantages
      et ses coûts : <a class="inline" href="#familles" data-goto="familles">voir les fiches</a>.</p>

      <h2 id="barrieres">5. Les barrières, le cœur du sujet</h2>
      <p>Un produit de rendement comporte généralement deux barrières, qu’il ne faut pas
      confondre. La <strong>barrière de coupon</strong> commande le revenu : au-dessus, le
      coupon tombe ; en dessous, il est suspendu (ou mémorisé). La <strong>barrière de
      capital</strong> commande le remboursement : c’est elle, et elle seule, qui détermine
      votre risque de perte.</p>
      <p>Le graphique ci-dessous montre le profil de remboursement à l’échéance d’un Phoenix à
      barrière 60 %. Il résume à lui seul la nature du pari.</p>
      <figure class="payoff">
        {PAYOFF_SVG}
        <figcaption>Profil de remboursement à l’échéance. Au-dessus de la barrière, le capital
        est remboursé intégralement — mais jamais davantage. En dessous, la perte est immédiate
        et proportionnelle : deux points d’écart font basculer le remboursement de 100 % à 59 %.</figcaption>
      </figure>
      <p>Deux points méritent toute l’attention.</p>
      <h3>Le mode de constatation</h3>
      <p>Une barrière dite <strong>européenne</strong> n’est constatée qu’une seule fois, le
      jour de l’échéance. Le sous-jacent peut passer sous le seuil pendant des années sans
      aucune conséquence, pourvu qu’il soit remonté ce jour-là. Une barrière
      <strong>américaine</strong>, elle, est constatée à chaque séance : un seul franchissement,
      même intrajournalier, suffit à détruire définitivement la protection. À niveau identique,
      les deux n’ont rien à voir. La quasi-totalité des produits distribués en France retient
      heureusement le format européen — mais il faut le vérifier.</p>
      <h3>L’effet de seuil</h3>
      <p>Juste au-dessus de la barrière, vous récupérez tout. Juste en dessous, vous perdez
      quarante points. Cette discontinuité est le défaut structurel des barrières sèches. Elle
      explique aussi pourquoi la valeur de marché d’un produit devient très instable lorsque le
      sous-jacent rôde autour de son seuil. Les mécanismes
      <a class="inline" href="#airbag" data-goto="glossaire">airbag</a> ont précisément été
      conçus pour la supprimer, au prix d’un coupon plus faible.</p>

      <h2 id="risques">6. Les six risques réellement portés</h2>
      <p>La documentation commerciale insiste sur le risque de marché. Il n’est ni le seul, ni
      toujours le plus important.</p>
      <ol>
        <li><strong>Risque de perte en capital.</strong> Si la barrière est enfoncée à
        l’échéance, la perte est réelle et peut être lourde. Elle est proportionnelle à la
        baisse du sous-jacent depuis le niveau initial, sauf mécanisme airbag.</li>
        <li><strong>Risque de crédit de l’émetteur.</strong> Le plus négligé. En cas de
        défaillance de la banque, vous êtes un créancier parmi d’autres, soumis au mécanisme
        européen de renflouement interne. Aucune garantie des dépôts ne s’applique.</li>
        <li><strong>Risque de rendement nul.</strong> Vous pouvez porter un produit huit ans et
        n’encaisser aucun coupon, tout en récupérant votre capital. Le capital est préservé,
        mais huit années de rendement sont perdues : c’est un coût d’opportunité réel.</li>
        <li><strong>Risque de liquidité.</strong> Il n’existe pas de marché organisé. La sortie
        anticipée dépend du prix de rachat affiché par l’émetteur, qui n’y est le plus souvent
        pas contractuellement tenu.</li>
        <li><strong>Risque de réinvestissement.</strong> Un produit rappelé rapidement vous
        rend votre capital au moment précis où le marché a monté — donc où les nouveaux coupons
        offerts sont plus faibles.</li>
        <li><strong>Risque de change.</strong> Sur un produit libellé en devise étrangère, il
        peut à lui seul effacer le gain de la formule.</li>
      </ol>
      <div class="notice" style="margin:28px 0">
        <span class="notice__i" aria-hidden="true">!</span>
        <div><p>Un produit structuré n’est pas un placement sans risque déguisé. C’est un
        échange explicite : vous renoncez à une partie du potentiel de hausse et vous acceptez
        un risque de perte au-delà d’un certain seuil, en contrepartie d’un rendement
        conditionnel supérieur à celui d’un placement sans risque. Si cet échange vous convient,
        le produit a du sens. Sinon, aucun niveau de coupon ne le justifiera.</p></div>
      </div>

      <h2 id="fiscalite">7. Enveloppes et fiscalité</h2>
      <p>Le même produit n’a pas le même rendement net selon l’enveloppe qui l’accueille. C’est
      un paramètre de décision, pas un détail administratif.</p>
      <table>
        <thead><tr><th>Enveloppe</th><th>Traitement des coupons</th><th>À retenir</th></tr></thead>
        <tbody>
          <tr><td><strong>Assurance-vie</strong></td>
              <td>Capitalisation en franchise d’impôt dans le contrat</td>
              <td>Le cadre le plus utilisé. Les coupons se réinvestissent à plein. Ajouter les frais de gestion annuels du contrat au coût du produit.</td></tr>
          <tr><td><strong>Contrat de capitalisation</strong></td>
              <td>Identique à l’assurance-vie</td>
              <td>La voie usuelle pour une holding ou une trésorerie d’entreprise excédentaire.</td></tr>
          <tr><td><strong>Compte-titres</strong></td>
              <td>Imposition à la perception, au prélèvement forfaitaire unique ou au barème</td>
              <td>Liberté totale de choix de l’émetteur et de la souche, mais fiscalité immédiate sur chaque coupon.</td></tr>
          <tr><td><strong>PER</strong></td>
              <td>Capitalisation dans le plan</td>
              <td>L’horizon long s’accorde aux maturités élevées. Fonds bloqués jusqu’à la retraite, hors cas de déblocage.</td></tr>
          <tr><td><strong>PEA</strong></td>
              <td>Exonération après cinq ans</td>
              <td>Éligibilité très restreinte : la grande majorité des produits structurés n’y est pas admise. À vérifier systématiquement.</td></tr>
        </tbody>
      </table>
      <p class="small muted">Ces éléments décrivent le cadre général applicable aux résidents
      fiscaux français. Ils ne constituent pas un conseil fiscal : la situation personnelle du
      souscripteur commande, et la réglementation évolue.</p>

      <h2 id="sortie">8. Sortir avant l’échéance</h2>
      <p>C’est possible, mais rarement au prix que l’on imagine. La valorisation en cours de vie
      ne se déduit pas du niveau du sous-jacent par une règle de trois : elle dépend aussi de la
      volatilité, des taux, du temps restant et de la qualité de crédit de l’émetteur.</p>
      <p>Un produit dont le sous-jacent est inchangé peut parfaitement valoir 93 % du nominal,
      pour deux raisons principales : les frais de structuration ont été prélevés dès
      l’émission, et le temps n’a pas encore fait son œuvre. À l’inverse, en fin de vie, la
      valeur converge mécaniquement vers le montant de remboursement attendu — c’est
      l’<a class="inline" href="#effet-de-pull-to-par" data-goto="glossaire">effet de pull-to-par</a>.</p>
      <p>En pratique : un produit structuré doit être souscrit avec l’intention de le porter
      jusqu’à son terme. La sortie anticipée est une porte de secours, jamais une stratégie.</p>

      <h2 id="questions">9. Les dix questions à poser</h2>
      <ol>
        <li>Quel est l’émetteur exact du titre, et quel est son garant ?</li>
        <li>Quelles sont ses trois notations, à quelle date, et avec quelles perspectives ?</li>
        <li>Le sous-jacent est-il un indice public ou un indice décrément ? Si décrément, en points ou en pourcentage, et de combien ?</li>
        <li>La barrière de capital est-elle constatée à l’échéance seulement, ou en continu ?</li>
        <li>Y a-t-il un mécanisme Worst-of ? Sur combien de composantes ?</li>
        <li>Les coupons sont-ils à mémoire ? Existe-t-il une période de non-rappel ?</li>
        <li>Quel est le coût total : frais intégrés à la formule, plus frais de l’enveloppe ?</li>
        <li>Quel est le SRI, et que disent les quatre scénarios du document d’informations clés ?</li>
        <li>Quelle est la devise, et le risque de change est-il couvert ?</li>
        <li>Quelle part ce produit représente-t-il dans mon patrimoine financier total ?</li>
      </ol>
      <p>Si l’on ne retient qu’une règle : <strong>exiger le document d’informations clés avant
      la brochure commerciale</strong>. Le premier est réglementaire, standardisé et comparable.
      La seconde n’a aucune valeur contractuelle.</p>

      <h2 id="erreurs">10. Les erreurs les plus fréquentes</h2>
      <ul>
        <li><strong>Comparer le coupon de deux produits sans comparer leurs sous-jacents.</strong>
        Un produit à 10 % sur indice public et un produit à 12 % sur décrément ne sont pas
        comparables : le second a déjà prélevé la différence.</li>
        <li><strong>Comparer le coupon sans comparer les barrières.</strong> Un produit à 8,5 %
        barrière 40 % est souvent préférable à un produit à 11 % barrière 70 %.</li>
        <li><strong>Prendre la maturité affichée pour la durée réelle.</strong> Sur un autocall,
        elle est presque toujours plus courte — sans qu’on puisse en être certain.</li>
        <li><strong>Croire qu’un panier diversifie.</strong> En Worst-of, il concentre le risque
        au lieu de le disperser.</li>
        <li><strong>Confondre « capital garanti » et « sans risque ».</strong> La garantie est
        celle d’une banque, elle ne vaut qu’à l’échéance.</li>
        <li><strong>Comparer un backtest à une performance.</strong> L’historique d’un indice
        récent est reconstitué a posteriori : personne ne l’a jamais investi.</li>
        <li><strong>Concentrer sur un seul émetteur.</strong> Diversifier les signatures compte
        autant que diversifier les sous-jacents.</li>
      </ul>
      <p style="margin-top:34px">
        <a class="btn" href="produits.html">Voir le comparateur</a>
        <a class="btn" href="produits.html#analyse" style="margin-left:10px">Faire analyser un produit</a>
      </p>
    </div>"""

def volet_familles():
    cards = []
    for f in FAMILLES:
        mec = "\n          ".join(f"<p>{m}</p>" for m in f["mecanisme"])
        plus = "\n            ".join(f"<li>{x}</li>" for x in f["plus"])
        moins = "\n            ".join(f"<li>{x}</li>" for x in f["moins"])
        if f.get("exclu"):
            cta = ('<span class="tag" style="border-color:var(--neg);color:var(--neg)">'
                   'Aucune structure de ce type au comparateur</span>')
        else:
            q = urllib.parse.urlencode({"famille": html.unescape(f["nom"])})
            cta = f'<a class="btn btn--sm" href="produits.html?{q}">Voir les structures de cette famille</a>'
        cards.append(f"""
      <article class="fam{' fam--exclu' if f.get("exclu") else ''}" id="{f["slug"]}">
        <div class="fam__l">
          <p class="eyebrow">{f["profil"]}</p>
          <h3 class="title-md">{f["nom"]}</h3>
          <hr class="rule">
          <p class="lede">{f["resume"]}</p>
          <p class="small muted"><strong>Pour qui ?</strong> {f["pour"]}</p>
          <p style="margin:22px 0 0">{cta}</p>
        </div>
        <div class="fam__r">
          <h4 class="card__t" style="font-size:1.06rem">Mécanisme</h4>
          {mec}
          <div class="fam__pm">
            <div>
              <p class="card__k" style="color:var(--pos)">Ce que la structure apporte</p>
              <ul class="small">
            {plus}
              </ul>
            </div>
            <div>
              <p class="card__k" style="color:var(--neg)">Ce qu’elle coûte</p>
              <ul class="small">
            {moins}
              </ul>
            </div>
          </div>
        </div>
      </article>""")
    liens = "".join(f'<a href="#{f["slug"]}">{f["nom"]}</a>' for f in FAMILLES)
    return f"""
    <div class="notice notice--grey" style="margin-bottom:26px">
      <span class="notice__i" aria-hidden="true">i</span>
      <div><p>Onze familles décrites, et une douzième —
      <a class="card__more" href="#indice-decrement" style="border:0;padding:0">l’indice
      décrément</a> — que nous présentons pour la reconnaître et l’écarter. Les niveaux
      chiffrés cités sont des ordres de grandeur représentatifs des conditions de {MAJ}.</p></div>
    </div>
    <nav class="chips" aria-label="Accès direct aux familles">{liens}</nav>
{"".join(cards)}"""

def volet_glossaire():
    entries = sorted(GLOSSAIRE, key=lambda g: slugify(g["t"]))
    groups = {}
    for g in entries:
        groups.setdefault(slugify(g["t"])[0].upper(), []).append(g)

    alpha = "".join(f'<a href="#lettre-{ch}">{ch}</a>' if ch in groups
                    else f'<span aria-hidden="true">{ch}</span>'
                    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")

    blocks = []
    for letter in sorted(groups):
        items = []
        for g in groups[letter]:
            gid = slugify(g["t"])
            defs = "\n          ".join(f'<p class="gl__d">{d}</p>' for d in g["d"])
            ex = f'<div class="gl__ex"><b>Exemple</b>{g["ex"]}</div>' if g["ex"] else ""
            search = html.unescape(f'{g["t"]} {g["alias"]} {g["cat"]} ' + " ".join(g["d"]))
            items.append(f"""        <div class="gl" id="{gid}" data-cat="{g["cat"]}" data-s="{e(search)}">
          <h3 class="gl__t">{g["t"]} <span class="gl__cat">{g["cat"]}</span></h3>
          {defs}
          {ex}
        </div>""")
        blocks.append(f"""      <div class="gl-group" id="lettre-{letter}">
        <div class="gl-group__l">{letter}</div>
{"".join(items)}
      </div>""")

    return f"""
    <form class="filters" role="search" aria-label="Rechercher dans le glossaire" onsubmit="return false">
      <div class="filters__row">
        <div class="field" style="grid-column:span 2">
          <label for="gl-q">Rechercher un terme</label>
          <input type="search" id="gl-q" placeholder="décrément, worst-of, bail-in, SRI, airbag…" autocomplete="off">
        </div>
        <div class="field"><label for="gl-cat">Catégorie</label>
          <select id="gl-cat">
            <option value="">Toutes catégories</option>
            {"".join(f'<option value="{c}">{html.unescape(c)}</option>' for c in CAT_GLOSSAIRE)}
          </select></div>
      </div>
      <div class="filters__foot">
        <span class="filters__count" id="gl-count" aria-live="polite"></span>
        <button class="btn-link" type="button" id="gl-reset">Réinitialiser</button>
      </div>
    </form>
    <nav class="alpha" aria-label="Navigation alphabétique" style="margin-top:28px">{alpha}</nav>
{"".join(blocks)}
    <p class="small muted" style="margin-top:34px">Un terme manque ?
      <a class="card__more" href="../contact.html" style="border:0;padding:0">Signalez-le</a>,
      le glossaire est enrichi au fil des évolutions du marché.</p>"""

def page_comprendre():
    body = f"""
{hero("Comprendre les produits structurés :<br>guide complet",
  "Le guide, les familles de produits et le glossaire, réunis en un seul endroit. "
  "De quoi lire une fiche produit sans rien laisser dans l’ombre.",
  crumb_html=fil([("Accueil", "index.html"), ("Comprendre", "comprendre.html")], ""))}

<section class="section section--tight">
  <div class="container container--mid">
    {onglets([("guide", "Le guide"), ("familles", "Les familles"), ("glossaire", f"Glossaire · {len(GLOSSAIRE)}")])}
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container container--mid">
    <div class="tabs__p is-active" id="guide" role="tabpanel" aria-labelledby="tab-guide">
{volet_guide()}
    </div>
    <div class="tabs__p" id="familles" role="tabpanel" aria-labelledby="tab-familles" hidden>
{volet_familles()}
    </div>
    <div class="tabs__p" id="glossaire" role="tabpanel" aria-labelledby="tab-glossaire" hidden>
{volet_glossaire()}
    </div>
  </div>
</section>
"""
    write("comprendre.html", layout("comprendre.html",
        "Comprendre les Produits Structurés : Guide Complet",
        "Guide complet, fiches des 12 familles et glossaire de "
        f"{len(GLOSSAIRE)} définitions : autocall, worst-of, airbag, barrières, effet "
        "mémoire, SRI, EMTN.",
        body,
        graph=[ld_article("comprendre.html", "Comprendre les produits structurés : guide complet",
                          "Guide pédagogique complet sur les produits structurés.", MAJ_ISO)],
        crumb_trail=[("Accueil", "index.html"), ("Comprendre", "comprendre.html")]))

# ==========================================================================
#  PAGE — LES ACTEURS (LFDR en tête + émetteurs + établissements)
# ==========================================================================
def bloc_lfdr():
    return f"""
<section class="section section--tight" style="padding-bottom:0">
  <div class="container">
    <article class="lead-actor">
      <div class="lead-actor__badge">Éditeur du Comptoir</div>
      <div class="lead-actor__l">
        <p class="eyebrow">Conseil en gestion privée — architecture ouverte</p>
        <h2 class="title-lg">{EDITEUR}</h2>
        <hr class="rule">
        <p class="lede">Nous ne sommes ni émetteur, ni structureur : nous n’avons donc aucune
        souche à placer. Notre rôle est de définir avec vous la formule qui correspond à votre
        horizon et à votre tolérance au risque, puis de mettre les émetteurs en concurrence
        sur cette formule — et de suivre les constatations une fois le produit souscrit.</p>
        <p style="margin-bottom:0">C’est ce positionnement qui nous permet d’écarter les
        indices décrément : nous n’avons pas de gamme à défendre.</p>
      </div>
      <div class="lead-actor__r">
        <h3 class="card__t" style="font-size:1.08rem">Ce que nous faisons sur un produit structuré</h3>
        <ol class="lead-actor__steps">
          <li><strong>Cadrage.</strong> Horizon, montant, enveloppe d’accueil, part acceptable
          dans l’allocation d’ensemble.</li>
          <li><strong>Calibrage.</strong> Choix du sous-jacent, profondeur des barrières, mode
          de constatation, période de non-rappel.</li>
          <li><strong>Mise en concurrence.</strong> Demande de prix auprès de plusieurs
          émetteurs sur la formule retenue, à signature comparable.</li>
          <li><strong>Lecture du DIC.</strong> Vérification de l’entité émettrice, du garant,
          du SRI et des coûts réellement supportés.</li>
          <li><strong>Suivi.</strong> Constatations, coupons, rappels, et décision de
          réinvestissement le moment venu.</li>
        </ol>
        <p style="margin:22px 0 0">
          <a class="btn btn--sm" href="produits.html#analyse">Faire analyser un produit</a>
          <a class="btn btn--sm" href="../contact.html" style="margin-left:8px">Nous contacter</a>
        </p>
      </div>
    </article>
    <p class="xsmall muted" style="margin-top:14px">{ADDRESS} — {EMAIL}. Les statuts
    réglementaires et immatriculations figurent dans les
    <a class="card__more" href="../mentions-legales.html" style="border:0;padding:0">mentions
    légales de l’éditeur</a>.</p>
  </div>
</section>"""

def volet_emetteurs():
    cards = []
    for em in EMETTEURS:
        forces = "\n            ".join(f"<li>{x}</li>" for x in em["forces"])
        search = f'{em["nom"]} {em["pays"]} {em["groupe"]} {em["zone"]} {em["sp"]} {em["moodys"]} {em["fitch"]}'
        cards.append(f"""      <article class="issuer" data-dir data-cat="{em["zone"]}" data-s="{e(html.unescape(search))}">
        <div class="issuer__h">
          <div>
            <h3 class="issuer__n">{em["nom"]}</h3>
            <p class="issuer__c">{em["pays"]} · {em["groupe"]}</p>
          </div>
          <div class="ratings" title="Notations de dette senior long terme, indicatives">
            <div><div class="ag">S&amp;P</div><div class="vl">{em["sp"]}</div></div>
            <div><div class="ag">Moody’s</div><div class="vl">{em["moodys"]}</div></div>
            <div><div class="ag">Fitch</div><div class="vl">{em["fitch"]}</div></div>
          </div>
        </div>
        <p class="small" style="margin:0">{em["profil"]}</p>
        <div>
          <p class="card__k" style="margin-bottom:8px">Points d’appui</p>
          <ul class="small" style="padding-left:18px;margin:0">
            {forces}
          </ul>
        </div>
        <p class="small" style="margin:0;padding:13px 16px;background:var(--ivory);border-left:2px solid var(--gold)">
          <strong>Vigilance.</strong> {em["vigilance"]}</p>
        <p class="xsmall muted" style="margin:0">Format usuel : {em["format"]}</p>
      </article>""")

    return f"""
    <div class="grid grid--2" style="margin-bottom:28px">
      <div class="cell">
        <p class="eyebrow">Le risque que personne ne regarde</p>
        <h3 class="title-md">Le risque de crédit émetteur</h3>
        <hr class="rule">
        <p>Un produit « à capital garanti » émis par une banque défaillante ne garantit plus
        rien. Les produits structurés sont des titres de créance : ils ne bénéficient d’aucune
        garantie des dépôts et entrent dans le périmètre du mécanisme européen de
        renflouement interne.</p>
        <p style="margin-bottom:0">La conséquence pratique est simple : la diversification des
        émetteurs importe autant que celle des sous-jacents. Trois produits sur trois émetteurs
        différents ne portent pas le même risque que trois produits sur un seul.</p>
      </div>
      <div class="cell cell--ivory">
        <h3 class="card__t" style="font-size:1.08rem">Lire une notation</h3>
        <table style="width:100%;border-collapse:collapse;font-size:.86rem">
          <tr><td style="padding:7px 0;border-bottom:1px solid var(--line)"><strong>AAA à AA−</strong></td>
              <td style="padding:7px 0;border-bottom:1px solid var(--line);color:var(--muted)">Qualité très élevée</td></tr>
          <tr><td style="padding:7px 0;border-bottom:1px solid var(--line)"><strong>A+ à A−</strong></td>
              <td style="padding:7px 0;border-bottom:1px solid var(--line);color:var(--muted)">Qualité élevée — la plupart des grands émetteurs</td></tr>
          <tr><td style="padding:7px 0;border-bottom:1px solid var(--line)"><strong>BBB+ à BBB−</strong></td>
              <td style="padding:7px 0;border-bottom:1px solid var(--line);color:var(--muted)">Dernière catégorie dite « investissement »</td></tr>
          <tr><td style="padding:7px 0"><strong>BB+ et en dessous</strong></td>
              <td style="padding:7px 0;color:var(--muted)">Catégorie spéculative — exceptionnel sur ce marché</td></tr>
        </table>
        <p class="small muted" style="margin-top:16px;margin-bottom:0">Les trois agences
        utilisent des échelles distinctes et divergent régulièrement sur un même émetteur.
        Lire les trois plutôt qu’une seule, et vérifier qui est le garant effectif du titre :
        l’information figure en première page du document d’informations clés.</p>
      </div>
    </div>

    <form class="filters" role="search" aria-label="Filtrer les émetteurs" onsubmit="return false">
      <div class="filters__row">
        <div class="field" style="grid-column:span 2">
          <label for="dir-q">Rechercher un émetteur</label>
          <input type="search" id="dir-q" placeholder="BNP, Goldman, notation A+, Suisse…" autocomplete="off">
        </div>
        <div class="field"><label for="dir-cat">Zone</label>
          <select id="dir-cat">
            <option value="">Toutes zones</option>
            <option value="Zone euro">Zone euro</option>
            <option value="Hors zone euro">Hors zone euro</option>
          </select></div>
      </div>
      <div class="filters__foot">
        <span class="filters__count" id="dir-count" data-noun="émetteur" aria-live="polite"></span>
        <button class="btn-link" type="button" id="dir-reset">Réinitialiser</button>
      </div>
    </form>

    <div class="cards" data-dir-section style="margin-top:22px;grid-template-columns:repeat(auto-fit,minmax(380px,1fr))">
{"".join(cards)}
    </div>

    <div class="notice" style="margin-top:32px">
      <span class="notice__i" aria-hidden="true">!</span>
      <div>
        <p><strong>Notations indicatives.</strong> Les notations citées portent sur la dette
        senior long terme des entités mentionnées et sont reproduites à titre indicatif, telles
        que relevées en {ANNEE_RATINGS}. Elles sont régulièrement révisées par les agences, y
        compris à la baisse et sans préavis.</p>
        <p>La notation du groupe ne se confond pas nécessairement avec celle de l’entité qui
        émet effectivement le titre. Avant toute souscription, vérifiez dans le document
        d’informations clés l’identité exacte de l’émetteur, celle du garant et leur notation
        à cette date.</p>
      </div>
    </div>"""

def volet_etablissements():
    blocks = []
    for slug, titre, intro in CAT_ETAB:
        items = [x for x in ETABLISSEMENTS if x["cat"] == slug]
        cards = "".join(f"""        <article class="card" data-dir2 data-cat2="{slug}" data-s="{e(html.unescape(f'{x["nom"]} {x["pays"]} {x["role"]} {x["txt"]}'))}">
          <p class="card__k">{x["role"]}</p>
          <h4 class="card__t" style="font-size:1.16rem">{x["nom"]}</h4>
          <p class="xsmall muted" style="margin-bottom:10px">{x["pays"]}</p>
          <p class="small" style="margin:0">{x["txt"]}</p>
        </article>""" for x in items)
        blocks.append(f"""
    <div data-dir2-section id="{slug}" style="scroll-margin-top:110px;margin-top:40px">
      <p class="eyebrow">{len(items)} établissements</p>
      <h3 class="title-md">{titre}</h3>
      <hr class="rule">
      <p class="lede" style="max-width:720px">{intro}</p>
      <div class="cards" style="margin-top:26px">
{cards}
      </div>
    </div>""")

    return f"""
    <h3 class="title-md">La chaîne de valeur, dans l’ordre</h3>
    <hr class="rule">
    <div class="grid grid--4" style="margin-top:24px">
      <div class="cell" style="padding:24px"><div class="num">1</div>
        <h4 class="card__t" style="font-size:1.02rem">Le structureur</h4>
        <p class="xsmall muted" style="margin:0">Conçoit la formule et met les émetteurs en concurrence. Ne porte aucun risque de crédit.</p></div>
      <div class="cell" style="padding:24px"><div class="num">2</div>
        <h4 class="card__t" style="font-size:1.02rem">L’émetteur</h4>
        <p class="xsmall muted" style="margin:0">Émet le titre de créance et s’engage à payer. C’est lui, et lui seul, qui porte le risque de crédit.</p></div>
      <div class="cell" style="padding:24px"><div class="num">3</div>
        <h4 class="card__t" style="font-size:1.02rem">L’assureur</h4>
        <p class="xsmall muted" style="margin:0">Référence le titre en unité de compte, le valorise et porte le cadre juridique de l’enveloppe.</p></div>
      <div class="cell" style="padding:24px"><div class="num">4</div>
        <h4 class="card__t" style="font-size:1.02rem">Le distributeur</h4>
        <p class="xsmall muted" style="margin:0">Sélectionne, explique, souscrit et suit les constatations pour le compte de l’investisseur.</p></div>
    </div>
    <div class="notice notice--grey" style="margin-top:26px">
      <span class="notice__i" aria-hidden="true">i</span>
      <div><p>Un point mérite d’être retenu : <strong>seul l’émetteur porte le risque de
      crédit</strong>. Ni le structureur, ni la plateforme, ni l’assureur ne se substituent à
      lui en cas de défaut. La notoriété de celui qui vous présente le produit ne dit rien de
      la solidité de celui qui s’engage à vous rembourser.</p></div>
    </div>

    <form class="filters" role="search" aria-label="Filtrer les établissements" style="margin-top:30px" onsubmit="return false">
      <div class="filters__row">
        <div class="field" style="grid-column:span 2">
          <label for="dir2-q">Rechercher un établissement</label>
          <input type="search" id="dir2-q" placeholder="Feefty, assureur luxembourgeois, plateforme…" autocomplete="off">
        </div>
        <div class="field"><label for="dir2-cat">Catégorie</label>
          <select id="dir2-cat">
            <option value="">Toutes catégories</option>
            {"".join(f'<option value="{s}">{html.unescape(t)}</option>' for s, t, _ in CAT_ETAB)}
          </select></div>
      </div>
      <div class="filters__foot">
        <span class="filters__count" id="dir2-count" data-noun="établissement" aria-live="polite"></span>
        <button class="btn-link" type="button" id="dir2-reset">Réinitialiser</button>
      </div>
    </form>
{"".join(blocks)}

    <div class="notice" style="margin-top:34px">
      <span class="notice__i" aria-hidden="true">!</span>
      <div>
        <p><strong>Annuaire informatif.</strong> Cet annuaire décrit le rôle de chaque
        catégorie d’intervenant sur le marché français et européen. Les établissements y sont
        cités à titre documentaire : leur mention ne constitue ni une recommandation, ni une
        appréciation de leurs prestations, ni l’indication d’un partenariat.</p>
        <p>Les référencements, conditions commerciales, montants d’accès et gammes évoluent
        constamment : ils doivent être vérifiés directement auprès de chaque établissement.</p>
      </div>
    </div>"""

def page_acteurs():
    body = f"""
{hero("Émetteurs de produits structurés<br>et établissements de place",
  "Entre vous et l’émetteur s’interposent plusieurs métiers, qui n’ont ni le même rôle ni la "
  "même responsabilité. Savoir qui structure, qui émet, qui référence et qui conseille permet "
  "de comprendre où se forme le prix — et où se joue la qualité du conseil.",
  crumb_html=fil([("Accueil", "index.html"), ("Les acteurs", "acteurs.html")], ""))}
{bloc_lfdr()}

<section class="section section--tight">
  <div class="container">
    {onglets([("emetteurs", f"Émetteurs · {len(EMETTEURS)}"), ("etablissements", f"Établissements · {len(ETABLISSEMENTS)}")])}
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="tabs__p is-active" id="emetteurs" role="tabpanel" aria-labelledby="tab-emetteurs">
{volet_emetteurs()}
    </div>
    <div class="tabs__p" id="etablissements" role="tabpanel" aria-labelledby="tab-etablissements" hidden>
{volet_etablissements()}
    </div>
  </div>
</section>
"""
    write("acteurs.html", layout("acteurs.html",
        "Émetteurs de Produits Structurés : Notations et Établissements",
        f"Les {len(EMETTEURS)} émetteurs de produits structurés et leurs notations S&P, "
        f"Moody's et Fitch, et {len(ETABLISSEMENTS)} établissements de place.",
        body, crumb_trail=[("Accueil", "index.html"), ("Les acteurs", "acteurs.html")]))

# ==========================================================================
#  PAGE — MÉTHODOLOGIE
# ==========================================================================
def page_methodologie():
    crit = [
        ("Nature du sous-jacent", 25,
         "Nous retenons des indices publics, calculés par un fournisseur indépendant et cotés quotidiennement, ou des actions cotées. Les structures sur indice décrément sont hors du périmètre de ce comparateur — par choix de lisibilité, et non parce qu’elles seraient par nature moins performantes : un décrément proche du rendement du dividende réel et correctement rémunéré reste un arbitrage défendable."),
        ("Qualité de la signature", 20,
         "Notation des trois agences sur la dette senior de l’entité émettrice réelle, perspective associée, et identité du garant. Une notation inférieure à la catégorie investissement disqualifie le produit."),
        ("Profondeur de la protection", 20,
         "Niveau de la barrière de capital, mode de constatation, et présence éventuelle d’un mécanisme airbag. Une barrière européenne profonde vaut mieux qu’un coupon élevé."),
        ("Lisibilité du mécanisme", 15,
         "Nombre de mécanismes cumulés dans une même formule. Chaque couche supplémentaire — Worst-of, barrière continue, devise non couverte — dégrade la note, même lorsqu’elle améliore le coupon affiché."),
        ("Rapport rendement / risque", 15,
         "Coupon rapporté non pas au marché en général, mais à ce que l’on peut obtenir au même moment, chez d’autres émetteurs, à barrières et maturité comparables."),
        ("Transparence des coûts", 5,
         "Clarté de l’information sur les frais de structuration et de distribution, et cohérence entre la brochure commerciale et le document d’informations clés."),
    ]
    rows = "\n".join(f'<tr><td><strong>{n}</strong></td><td class="num-cell">{p} %</td><td>{d}</td></tr>'
                     for n, p, d in crit)
    cp = [p["coupon"] for p in PRODUITS if p["coupon"]]
    cmax = f'{max(cp)*100:.1f}'.replace(".", ",")

    body = f"""
{hero("Méthodologie de comparaison<br>des produits structurés",
  "Comment nous apprécions un produit structuré, ce que nous écartons par principe, et les "
  "limites que nous assumons dans cet exercice.",
  crumb_html=fil([("Accueil", "index.html"), ("Méthodologie", "methodologie.html")], ""))}

<section class="section">
  <div class="container container--narrow">
    <div class="prose">
      <h2>La règle première : un sous-jacent que vous pouvez suivre</h2>
      <p>La majorité des produits distribués en France repose sur un indice décrément, c’est-à-dire
      un indice construit pour la structuration dont on retranche un dividende forfaitaire chaque
      année. Le procédé est documenté et parfaitement légal. Il a deux conséquences : le
      souscripteur suit plus difficilement son sous-jacent, et l’écart avec l’indice de référence
      se creuse si le prélèvement excède le dividende réel du panier.</p>
      <p><strong>Nous n’en référençons aucun dans ce comparateur.</strong> Toutes les structures
      reposent sur des indices publics ou sur des actions cotées. Le coupon y est financé par les
      dividendes non réinvestis de l’indice — un mécanisme que n’importe qui peut vérifier. Cela
      coûte environ un à deux points de coupon à barrières identiques, et permet malgré tout
      d’atteindre {cmax} % par an sur les profils les plus exposés.</p>

      <h2>La règle seconde : la signature et la protection avant le coupon</h2>
      <p>La plupart des classements de produits structurés ordonnent les offres par niveau de
      coupon. C’est l’inverse de ce qu’il faut faire. Le coupon est la variable la plus visible
      et la moins informative : il se déduit mécaniquement des autres paramètres. Un coupon
      élevé ne traduit pas la générosité d’un émetteur mais le prix d’un risque, ou la présence
      d’un mécanisme défavorable.</p>

      <h2>Les six critères</h2>
      <table>
        <thead><tr><th>Critère</th><th>Poids</th><th>Ce que nous examinons</th></tr></thead>
        <tbody>
{rows}
        </tbody>
      </table>
      <p>La note sur cinq affichée dans le comparateur est la synthèse de cette grille. Elle
      exprime la <strong>qualité de construction</strong> d’une structure, pas une prévision de
      performance : aucune méthodologie ne peut anticiper le comportement futur d’un
      sous-jacent.</p>

      <h2>Ce que nous écartons par principe</h2>
      <ul>
        <li><strong>Les indices décrément</strong>, hors périmètre de ce comparateur. Ce n’est
        pas un verdict sur leur performance : c’est un choix de lisibilité, dont nous mesurons
        le coût à un ou deux points de coupon. Nous les analysons volontiers sur demande.</li>
        <li><strong>Les émetteurs en catégorie spéculative.</strong> Aucun supplément de coupon
        ne compense une signature fragile sur un horizon de huit à douze ans.</li>
        <li><strong>Les barrières de capital constatées en continu.</strong> Sur une maturité
        longue, la probabilité de franchissement rend la protection largement illusoire.</li>
        <li><strong>Les Worst-of sur plus de quatre composantes.</strong> Le cumul de risques
        spécifiques y devient impossible à apprécier sérieusement.</li>
        <li><strong>Les devises étrangères non couvertes</strong> lorsque le produit est présenté
        comme un produit de rendement : le change peut à lui seul effacer la formule.</li>
        <li><strong>Les formules à plus de trois mécanismes cumulés.</strong> Au-delà, le
        produit n’est plus compréhensible par son souscripteur — ce qui est en soi disqualifiant.</li>
      </ul>

      <h2>Nos limites, assumées</h2>
      <p>L’honnêteté commande d’énoncer ce que cette méthodologie ne fait pas.</p>
      <ul>
        <li>Elle n’apprécie pas la <strong>pertinence d’un produit pour une personne donnée</strong>.
        Le meilleur produit du marché peut être le mauvais choix pour un patrimoine mal
        diversifié ou un horizon mal défini.</li>
        <li>Elle ne <strong>prédit rien</strong>. Elle juge une construction à un instant donné,
        sur la base des paramètres connus.</li>
        <li>Elle repose sur des <strong>données publiques</strong> : notations, documents
        d’informations clés, méthodologies d’indices. Elle n’a pas accès au prix de revient
        réel d’une structure.</li>
        <li>Les structures présentées dans le comparateur sont des <strong>gabarits de
        référence</strong> et non des souches en commercialisation : elles illustrent des
        combinaisons de paramètres, à un niveau de coupon cohérent avec les conditions de
        marché de {MAJ}.</li>
      </ul>

      <h2>L’analyse d’un produit que vous nous soumettez</h2>
      <p>Lorsque vous déposez un document d’informations clés, nous appliquons la même grille,
      dans l’ordre : nature du sous-jacent, identité et notation de l’émetteur réel, niveau et
      mode de constatation des barrières, mécanismes cumulés, coûts, puis comparaison avec ce
      qui se traite au même moment à risque équivalent. Nous vous indiquons ce qui nous paraît
      solide et ce qui nous paraît cher — sans préjuger de votre situation personnelle, que
      nous ne connaissons pas à ce stade.</p>

      <h2>Fréquence de revue</h2>
      <p>Les niveaux de coupon évoluent avec les taux et la volatilité ; les notations évoluent
      avec les décisions des agences ; les gammes évoluent avec les émetteurs. Le contenu de ce
      site fait l’objet d’une revue éditoriale périodique, dont la date figure en pied de chaque
      page. Entre deux revues, les ordres de grandeur restent indicatifs.</p>

      <h2>Indépendance</h2>
      <p>{SITE} est édité par {EDITEUR}, cabinet de gestion privée exerçant en architecture
      ouverte. Nous ne sommes ni émetteur ni structureur : nous n’avons aucune souche à placer.
      Les émetteurs et établissements cités le sont à titre documentaire — leur mention ne
      résulte d’aucun accord commercial et ne constitue pas une recommandation. Lorsque nous
      accompagnons un client, nous mettons les émetteurs en concurrence sur une formule définie
      avec lui, et nous lui communiquons les frais applicables.</p>

      <p style="margin-top:34px">
        <a class="btn" href="produits.html#analyse">Faire analyser un produit</a>
        <a class="btn" href="produits.html" style="margin-left:10px">Voir le comparateur</a>
      </p>
    </div>
  </div>
</section>
"""
    write("methodologie.html", layout("methodologie.html",
        "Méthodologie de Comparaison des Produits Structurés",
        "Les six critères de notre grille d'analyse des produits structurés, leur "
        "pondération, ce que nous écartons et les limites assumées de l'exercice.",
        body,
        graph=[ld_article("methodologie.html", "Méthodologie de comparaison des produits structurés",
                          "Grille d'analyse en six critères.", MAJ_ISO)],
        crumb_trail=[("Accueil", "index.html"), ("Méthodologie", "methodologie.html")]))

# ==========================================================================
#  PAGE — MENTIONS LÉGALES
# ==========================================================================
def page_mentions():
    body = f"""
{hero("Mentions légales", "Éditeur, nature des informations publiées et avertissement sur les risques.",
  crumb_html=fil([("Accueil", "index.html"), ("Mentions légales", "mentions-legales.html")], ""))}

<section class="section">
  <div class="container container--narrow">
    <div class="prose">
      <h2>Éditeur</h2>
      <p>{SITE} est une publication éditée par <strong>{EDITEUR}</strong>,
      {ADDRESS}. Contact : <a class="inline" href="mailto:{EMAIL}">{EMAIL}</a>.</p>
      <p>Les mentions légales complètes de l’éditeur, incluant sa forme juridique, ses
      immatriculations et ses statuts réglementaires, figurent sur
      <a class="inline" href="../mentions-legales.html">la page dédiée du site de l’éditeur</a>.</p>

      <h2>Nature des informations publiées</h2>
      <p>Ce site a une finalité exclusivement pédagogique et documentaire. Les contenus publiés
      — fiches de familles de produits, fiches émetteurs, annuaire d’établissements, glossaire
      et comparateur — constituent une information générale sur le fonctionnement du marché des
      produits structurés.</p>
      <p>Ils <strong>ne constituent pas</strong> :</p>
      <ul>
        <li>un conseil en investissement ni une recommandation personnalisée au sens de la
        réglementation applicable ;</li>
        <li>une offre, une sollicitation ou une incitation à souscrire un instrument
        financier ;</li>
        <li>un conseil juridique, fiscal ou comptable ;</li>
        <li>une analyse financière indépendante au sens réglementaire.</li>
      </ul>
      <p>Les structures figurant dans le comparateur sont des <strong>gabarits de référence</strong>
      destinés à illustrer les mécanismes du marché. Il ne s’agit pas de souches réelles en cours
      de commercialisation : aucun code ISIN n’est publié, et les conditions définitives d’une
      émission ne sont arrêtées qu’à sa date de strike. Seuls le prospectus et le document
      d’informations clés de l’émetteur font foi.</p>

      <h2>Service d’analyse de document</h2>
      <p>Le formulaire « Faire analyser un produit » permet de nous adresser une demande
      d’examen documentaire. Les fichiers que vous sélectionnez <strong>ne sont pas téléversés
      par ce site</strong> : ils restent sur votre appareil, et seul le contenu que vous
      saisissez — identité, coordonnées, question et nom des documents — nous est transmis, afin
      d’ouvrir ensuite un brouillon d’email auquel vous joignez vous-même les pièces.</p>
      <p>L’analyse rendue est une lecture documentaire à visée pédagogique. Elle ne constitue pas
      un conseil en investissement personnalisé, lequel suppose un examen préalable de votre
      situation patrimoniale, de vos objectifs, de votre horizon, de vos connaissances et de
      votre expérience. Elle n’engage pas l’éditeur sur le résultat futur du produit examiné.</p>

      <h2>Notations de crédit</h2>
      <p>Les notations citées portent sur la dette senior long terme des entités mentionnées.
      Elles sont reproduites à titre indicatif, telles que relevées en {ANNEE_RATINGS}, et sont
      susceptibles d’être révisées par les agences à tout moment et sans préavis. La notation
      d’un groupe ne se confond pas nécessairement avec celle de l’entité émettrice du titre.
      Ces notations sont la propriété de leurs auteurs respectifs.</p>

      <h2>Indices cités</h2>
      <p>Les indices mentionnés (CAC 40, EURO STOXX 50, S&amp;P 500, MSCI World, Nikkei 225,
      FTSE EPRA Nareit, et autres) sont des marques déposées de leurs fournisseurs respectifs.
      Ils sont cités à titre documentaire pour décrire des mécanismes de produits. Ni les
      fournisseurs d’indices ni leurs ayants droit ne sont associés à cette publication, ne la
      cautionnent et n’en garantissent le contenu.</p>

      <h2>Marques et dénominations citées</h2>
      <p>Les dénominations sociales, marques et noms d’établissements cités appartiennent à leurs
      titulaires respectifs. Ils sont mentionnés à des fins exclusivement documentaires et
      informatives. Leur citation n’implique ni partenariat, ni affiliation, ni approbation, ni
      recommandation, et ne saurait suggérer un lien commercial avec l’éditeur.</p>

      <h2>Avertissement sur les risques</h2>
      <p>Les produits structurés sont des instruments financiers complexes. Avant toute
      souscription, l’investisseur doit en particulier retenir les éléments suivants.</p>
      <ul>
        <li><strong>Risque de perte en capital.</strong> La plupart de ces produits ne comportent
        aucune garantie de remboursement du capital. En cas de franchissement de la barrière de
        protection à la date de constatation finale, la perte est proportionnelle à la baisse du
        sous-jacent et peut être totale.</li>
        <li><strong>Risque de crédit.</strong> L’investisseur est créancier de l’émetteur et, le
        cas échéant, de son garant. En cas de défaillance ou de mise en résolution, il peut perdre
        tout ou partie de son investissement, indépendamment de l’évolution du sous-jacent. Ces
        titres ne bénéficient d’aucune garantie des dépôts.</li>
        <li><strong>Rendement conditionnel.</strong> Les coupons annoncés sont des maximums
        conditionnés à la réalisation de conditions de marché. Ils ne sont ni garantis ni
        acquis.</li>
        <li><strong>Risque de liquidité.</strong> Il n’existe pas de marché secondaire organisé.
        La revente avant l’échéance dépend du prix de rachat proposé par l’émetteur et peut faire
        ressortir une valeur sensiblement inférieure au nominal.</li>
        <li><strong>Performances passées et simulations.</strong> Les performances passées, les
        simulations et les reconstitutions historiques ne préjugent en rien des performances
        futures.</li>
        <li><strong>Horizon de placement.</strong> Ces produits doivent être souscrits avec
        l’intention de les porter jusqu’à leur échéance.</li>
      </ul>
      <p>Les produits structurés ne conviennent pas à tous les investisseurs. Leur souscription
      doit résulter d’un examen de la situation patrimoniale, des objectifs, de l’horizon de
      placement, des connaissances et de l’expérience de l’investisseur, ainsi que de sa capacité
      à supporter une perte. Il est recommandé de ne consacrer à ces instruments qu’une fraction
      mesurée d’un patrimoine financier diversifié.</p>

      <h2>Responsabilité</h2>
      <p>L’éditeur apporte un soin raisonnable à l’exactitude des informations publiées mais ne
      peut en garantir ni l’exhaustivité ni l’actualité permanente, s’agissant d’un marché dont
      les paramètres évoluent quotidiennement. Sa responsabilité ne saurait être engagée à raison
      d’une décision d’investissement prise sur le fondement des informations de ce site.</p>

      <h2>Données personnelles</h2>
      <p>Ce site ne dépose aucun cookie de mesure d’audience ni de suivi publicitaire, et
      n’intègre aucun script tiers. Les polices de caractères sont auto-hébergées. Aucune donnée
      de navigation n’est collectée par l’éditeur. Les demandes adressées par les formulaires
      sont traitées selon les modalités décrites dans
      <a class="inline" href="../mentions-legales.html">les mentions légales de l’éditeur</a>.</p>

      <h2>Propriété intellectuelle</h2>
      <p>L’ensemble des contenus rédactionnels de ce site — notamment les fiches de familles, les
      fiches émetteurs et le glossaire — est protégé par le droit d’auteur. Toute reproduction ou
      représentation, intégrale ou partielle, est soumise à autorisation préalable de l’éditeur.</p>

      <p class="small muted" style="margin-top:34px">Dernière revue éditoriale : {MAJ}.</p>
    </div>
  </div>
</section>
"""
    write("mentions-legales.html", layout("mentions-legales.html",
        "Mentions Légales | Le Comptoir des Structurés",
        "Éditeur, nature des informations publiées, service d'analyse de document, notations "
        "de crédit et avertissement sur les risques des produits structurés.",
        body, crumb_trail=[("Accueil", "index.html"),
                           ("Mentions légales", "mentions-legales.html")]))

# ==========================================================================
#  MAIN
# ==========================================================================
OBSOLETES = ["familles.html", "glossaire.html", "emetteurs.html", "etablissements.html"]

def main():
    os.makedirs(os.path.join(OUT, "assets"), exist_ok=True)
    print(f"\n{SITE} — génération")
    for f in OBSOLETES:
        path = os.path.join(OUT, f)
        if os.path.exists(path):
            os.remove(path)
            print(f"  − {f} (fusionné dans un autre onglet)")
    build_data_js()
    page_index()
    page_produits()
    page_comprendre()
    page_acteurs()
    page_methodologie()
    page_mentions()
    page_404()
    page_guides_index()
    for g in GUIDES:
        page_guide(g)
    n_urls = build_sitemap()
    build_robots()
    build_htaccess()
    cp = [p["coupon"] for p in PRODUITS if p["coupon"]]
    print(f"\n  {len(FAMILLES)} familles · {len(EMETTEURS)} émetteurs · "
          f"{len(ETABLISSEMENTS)} établissements · {len(PRODUITS)} structures · "
          f"{len(GLOSSAIRE)} définitions")
    print(f"  Coupons : {min(cp)*100:.1f} % à {max(cp)*100:.1f} % (conditions {MARCHE_REF}).")
    print(f"  {len(GUIDES)} guides · sitemap de {n_urls} URL · revue éditoriale {MAJ}")
    print(f"  Domaine canonique : {BASE_URL}{BASE_PATH}/  ← à vérifier")
    print("  Terminé.\n")


# ==========================================================================
#  GUIDES SEO — pages autonomes, reliées au guide pilier comprendre.html
# ==========================================================================
# Chaque guide doit justifier son existence par un contenu propre : un
# mécanisme, ses chiffres, ses limites. Les sujets trop minces restent
# traités dans un guide plus large plutôt que de donner une page creuse.

def GU(slug, title, h1, desc, lede, bref, sections, related,
       faq=None, maj=None):
    return dict(slug=slug, title=title, h1=h1, desc=desc, lede=lede,
                bref=bref, sections=sections, related=related,
                faq=faq or [], maj=maj or MAJ_ISO)

GUIDES = [

 GU("produit-structure",
   "Produit Structuré : Définition, Fonctionnement et Risques",
   "Produit structuré : définition, fonctionnement et risques",
   "Qu’est-ce qu’un produit structuré ? Définition juridique, composition, "
   "d’où vient le coupon, familles, risques et fiscalité. Guide complet avec "
   "exemples chiffrés.",
   "Un produit structuré est un titre de créance émis par une banque, dont le "
   "remboursement suit une formule fixée à l’avance et indexée sur un actif de "
   "référence. Tout le reste découle de cette définition.",
   ["Vous n’achetez pas le sous-jacent : vous prêtez à une banque.",
    "Le coupon est conditionnel, jamais garanti, et financé par ce à quoi vous renoncez.",
    "Le risque de crédit de l’émetteur s’ajoute au risque de marché.",
    "La durée réelle d’un autocall est inconnue à la souscription."],
   [
    ("definition", "Définition : un titre de créance, pas un fonds", """
<p>Un <strong>produit structuré</strong> est un titre de créance émis par un établissement
financier, le plus souvent au format <a class="inline" href="../emtn/">EMTN</a>, dont la
rémunération et le remboursement sont calculés selon une formule contractuelle connue dès
l’émission et référencée à un actif financier : un indice, une action, un panier, un taux.</p>
<p>Cette qualification juridique n’est pas un détail. Elle emporte trois conséquences que
beaucoup de souscripteurs découvrent trop tard.</p>
<ul>
  <li><strong>Vous ne détenez pas le sous-jacent.</strong> Ni les actions, ni l’indice. Vous
  ne percevez aucun dividende et n’avez aucun droit de vote.</li>
  <li><strong>Vous êtes créancier d’une banque.</strong> Si elle fait défaut, la formule ne
  vous protège de rien, quelle que soit la performance du sous-jacent.</li>
  <li><strong>Ce n’est pas un fonds.</strong> Aucun gérant, aucun arbitrage, aucune décision
  discrétionnaire en cours de vie : la formule s’applique mécaniquement.</li>
</ul>
<p>On parle indifféremment de <em>produit structuré</em>, de <em>placement structuré</em> ou
de <em>fonds à formule</em> — cette dernière appellation, héritée des OPCVM garantis, prête à
confusion puisque la très grande majorité des produits distribués aujourd’hui sont des
titres de créance et non des fonds.</p>"""),

    ("composition", "De quoi un produit structuré est-il fait", """
<p>Pour fabriquer la formule, l’émetteur décompose schématiquement votre nominal en deux
poches.</p>
<p>La première est une <strong>composante obligataire</strong> : en plaçant une partie de
votre argent à son propre taux de financement, l’émetteur sait reconstituer une fraction
déterminée du capital à l’échéance. La seconde est un <strong>budget d’options</strong> :
avec le reliquat, il achète et vend des options sur le sous-jacent. C’est cette seconde poche
qui dessine le profil de gain.</p>
<p>Un exemple parlant : plus les taux sont élevés, moins la composante obligataire coûte
cher, et plus le budget d’options est important. C’est pourquoi les produits à capital
garanti, presque introuvables dans les années de taux nuls, sont redevenus proposables.</p>"""),

    ("coupon", "D’où vient le coupon", """
<p>Un coupon de 10 % par an, quand le taux sans risque est à 2 %, n’est pas un cadeau. Il est
financé, et par trois leviers principaux — chacun ayant un coût pour vous.</p>
<ul>
  <li><strong>La vente de volatilité.</strong> Plus le sous-jacent est agité, plus les options
  vendues rapportent. Un coupon élevé signale donc un sous-jacent risqué.</li>
  <li><strong>L’abandon des dividendes.</strong> Les grands indices sont publiés dividendes
  non réinvestis : le CAC 40 que vous lisez dans la presse ne les intègre pas. Ces dividendes
  abandonnés financent l’essentiel de votre coupon.</li>
  <li><strong>Le plafonnement du gain.</strong> En renonçant aux scénarios très haussiers,
  vous achetez votre protection à la baisse.</li>
</ul>
<p>S’y ajoutent des mécanismes qui gonflent le coupon en dégradant le profil : un
<a class="inline" href="../../comprendre.html#worst-of">Worst-of</a> sur plusieurs actions,
une barrière constatée en continu, un <a class="inline" href="../indice-decrement/">indice
décrément</a>, une devise étrangère non couverte. Quand un coupon dépasse nettement ceux du
marché, l’un de ces mécanismes est presque toujours présent.</p>"""),

    ("familles", "Les grandes familles", """
<p>Quelques structures couvrent l’essentiel de ce qui se distribue en France.</p>
<table>
  <thead><tr><th>Famille</th><th>Rémunération</th><th>Profil</th></tr></thead>
  <tbody>
    <tr><td><a class="inline" href="../autocall/">Autocall</a></td><td>Coupon + rappel anticipé</td><td>Marché stable ou peu baissier</td></tr>
    <tr><td><a class="inline" href="../phoenix/">Phoenix</a></td><td>Coupon conditionnel détaché</td><td>Revenu régulier conditionnel</td></tr>
    <tr><td><a class="inline" href="../athena/">Athéna</a></td><td>Gain capitalisé, versé au rappel</td><td>Pas de besoin de revenu</td></tr>
    <tr><td>Reverse Convertible</td><td>Coupon fixe inconditionnel</td><td>Rendement élevé, protection faible</td></tr>
    <tr><td><a class="inline" href="../produit-structure-capital-garanti/">Capital garanti</a></td><td>Participation plafonnée</td><td>Préservation du nominal</td></tr>
    <tr><td>Participation</td><td>Indexation à la hausse</td><td>Vue haussière</td></tr>
  </tbody>
</table>
<p>Le détail de chacune, avec ses avantages et ses coûts, figure dans les
<a class="inline" href="../../comprendre.html#familles">fiches familles</a>.</p>"""),

    ("risques", "Les risques", """
<p>La documentation commerciale insiste sur le risque de marché. Il n’est ni le seul, ni
toujours le plus important. Les six risques réellement portés sont détaillés dans le
<a class="inline" href="../risques-produits-structures/">guide des risques</a> : perte en
capital, crédit de l’émetteur, rendement nul, liquidité, réinvestissement, change.</p>
<p>Le plus négligé est le deuxième. Un produit « à capital garanti » émis par une banque
défaillante ne garantit plus rien : ces titres ne bénéficient d’aucune garantie des dépôts et
entrent dans le périmètre du mécanisme européen de renflouement interne.</p>"""),

    ("comment-choisir", "Comment lire une proposition", """
<p>Trois questions suffisent à cadrer l’essentiel.</p>
<ol>
  <li><strong>Qui est le débiteur ?</strong> Nom exact de l’entité émettrice, identité du
  garant, et les trois notations — elles divergent souvent.</li>
  <li><strong>Où sont les barrières, et comment sont-elles constatées ?</strong> Une
  <a class="inline" href="../barriere-de-protection/">barrière</a> à 65 % relevée chaque jour
  pendant huit ans n’a rien à voir avec la même barrière relevée un seul jour.</li>
  <li><strong>Comment le coupon est-il financé ?</strong> Plafond, dividendes abandonnés,
  décrément, Worst-of : identifier la source, c’est comprendre le produit.</li>
</ol>
<p>Et une règle : <strong>exiger le document d’informations clés avant la brochure
commerciale</strong>. Le premier est réglementaire, standardisé et comparable ; la seconde
n’a aucune valeur contractuelle.</p>"""),
   ],
   ["autocall", "risques-produits-structures", "emtn", "produit-structure-assurance-vie"],
   faq=[
     ("Un produit structuré est-il risqué&nbsp;?",
      "Oui. La plupart ne comportent aucune garantie de remboursement du capital : si la barrière de protection est franchie à la constatation finale, la perte est proportionnelle à la baisse du sous-jacent et peut être totale. S’y ajoute le risque de défaut de l’émetteur, qui n’est couvert par aucune garantie des dépôts."),
     ("Quel rendement attendre d’un produit structuré&nbsp;?",
      "Aucun rendement n’est garanti. Les coupons affichés sont des maximums conditionnés à des niveaux de marché. Le rendement réellement perçu dépend du nombre de constatations réussies et de la date de remboursement anticipé, qui ne sont connus qu’a posteriori."),
     ("Peut-on revendre un produit structuré avant l’échéance&nbsp;?",
      "C’est généralement possible, mais au prix de rachat affiché par l’émetteur, qui n’y est le plus souvent pas contractuellement tenu. Ce prix peut être sensiblement inférieur au nominal, y compris quand le sous-jacent est au-dessus de toutes ses barrières. Ces produits doivent être souscrits avec l’intention de les porter jusqu’au terme."),
   ]),

 GU("autocall",
   "Autocall : Fonctionnement du Remboursement Anticipé",
   "Autocall : le mécanisme de remboursement anticipé",
   "Comment fonctionne un autocall : seuil de rappel, dates de constatation, "
   "période de non-rappel, trigger dégressif. Exemples chiffrés et risque de "
   "réinvestissement.",
   "L’autocall n’est pas une famille de produits mais un mécanisme : le remboursement "
   "anticipé automatique. Il s’ajoute à une structure Phoenix ou Athéna et en change "
   "profondément la durée de vie.",
   ["Le rappel est automatique : ni vous ni l’émetteur ne le décidez.",
    "La durée réelle est inconnue à la souscription.",
    "Un rappel rapide est favorable, mais crée un risque de réinvestissement.",
    "Le seuil de rappel peut être fixe ou dégressif."],
   [
    ("mecanisme", "Le mécanisme, pas à pas", """
<p>À chaque <strong>date de constatation</strong> — le plus souvent trimestrielle, semestrielle
ou annuelle — on compare le niveau du sous-jacent à un <strong>seuil de rappel</strong>,
généralement fixé à 100 % de son niveau initial.</p>
<p>Si le sous-jacent est au-dessus de ce seuil, le produit est remboursé immédiatement : vous
recevez le nominal, majoré du gain prévu, et le produit s’arrête. S’il est en dessous, rien ne
se passe : on attend la constatation suivante.</p>
<p>Le mot <em>automatique</em> est essentiel. Ce n’est pas une option que l’émetteur exerce à
sa convenance — contrairement à un <em>callable</em>, où l’option lui appartient et joue donc
contre vous. Le rappel autocall se déclenche mécaniquement dès que la condition est remplie.</p>"""),

    ("exemple", "Un exemple chiffré", """
<p>Prenons un produit à constatation trimestrielle, seuil de rappel à 100 %, coupon de 2,50 %
par trimestre, maturité maximale dix ans, avec une période de non-rappel de douze mois.</p>
<table>
  <thead><tr><th>Trimestre</th><th>Niveau de l’indice</th><th>Événement</th><th>Flux</th></tr></thead>
  <tbody>
    <tr><td>T1 à T4</td><td>92 % à 104 %</td><td>Non-rappel : aucun rappel possible</td><td>Coupons si barrière franchie</td></tr>
    <tr><td>T5</td><td>97 %</td><td>Sous le seuil</td><td>Coupon seul</td></tr>
    <tr><td>T6</td><td>101 %</td><td><strong>Rappel déclenché</strong></td><td>Nominal + coupon</td></tr>
  </tbody>
</table>
<p>Le produit a vécu dix-huit mois au lieu de dix ans. L’investisseur a encaissé six coupons,
soit 15 % bruts, et récupère son capital. Du point de vue du rendement annualisé, c’est un bon
résultat — mais il faut à présent replacer ces fonds.</p>"""),

    ("non-rappel", "La période de non-rappel", """
<p>Beaucoup de structures prévoient une durée initiale pendant laquelle aucun rappel ne peut
intervenir, même si la condition est remplie — fréquemment douze mois.</p>
<p>Cette clause protège l’investisseur : elle garantit une durée minimale d’exposition, donc
un minimum de coupons encaissables. Sans elle, un produit souscrit sur un point bas de marché
peut être rappelé dès le premier trimestre, laissant l’investisseur avec un gain d’un
trimestre et un problème de réinvestissement immédiat.</p>
<p>C’est un paramètre à regarder systématiquement, et rarement mis en avant dans les
brochures.</p>"""),

    ("trigger", "Seuil fixe ou trigger dégressif", """
<p>Le seuil de rappel n’est pas toujours constant. Dans une variante dite <em>trigger
dégressif</em> (ou <em>step-down</em>), il diminue à chaque constatation : 100 % la première
année, puis 95 %, 90 %, 85 %…</p>
<p>L’effet est net : la probabilité de remboursement anticipé augmente fortement avec le
temps. Au bout de six ans, un simple retour à 70 % peut suffire à déclencher le rappel.</p>
<p>La contrepartie mérite d’être comprise. Le rappel peut alors intervenir <strong>alors que
le sous-jacent reste très inférieur à son niveau d’origine</strong>. Le produit se termine au
pair, avec son gain, mais l’investisseur ne profitera pas du rebond éventuel — et il doit
replacer son capital dans un marché déprimé.</p>"""),

    ("reinvestissement", "Le risque de réinvestissement", """
<p>C’est le risque le plus sous-estimé des structures autocall, parce qu’il ne ressemble pas à
une perte.</p>
<p>Un produit rappelé rapidement a bien rempli son office. Mais il vous rend votre capital au
moment précis où le marché a monté — donc où les coupons offerts sur les nouvelles émissions
sont plus faibles, puisque la volatilité a baissé et que les sous-jacents sont plus chers.</p>
<p>Un investisseur qui enchaîne les autocalls rappelés au bout d’un an ne capte pas le coupon
facial année après année : il capte une suite de rendements courts, entrecoupés de périodes
de trésorerie non rémunérée et de réinvestissements à des conditions dégradées. Le taux de
rendement interne réel est souvent nettement inférieur au coupon affiché.</p>"""),
   ],
   ["phoenix", "athena", "coupon-memoire", "produit-structure"],
   faq=[
     ("Qu’est-ce qu’un autocall&nbsp;?",
      "C’est un mécanisme de remboursement anticipé automatique : à chaque date de constatation, si le sous-jacent dépasse un seuil prédéfini — souvent 100 % de son niveau initial —, le produit est remboursé au nominal majoré du gain prévu, et s’arrête."),
     ("Quelle est la durée réelle d’un autocall&nbsp;?",
      "Elle est inconnue à la souscription. La maturité affichée est une durée maximale, pas une durée attendue : le produit peut s’arrêter à la première constatation éligible comme aller jusqu’à son terme. Il faut donc pouvoir le porter jusqu’au bout."),
     ("Le remboursement anticipé est-il une bonne nouvelle&nbsp;?",
      "En général oui, puisqu’il valide le gain prévu. Mais il faut replacer les fonds, souvent dans des conditions moins favorables : c’est le risque de réinvestissement, qui réduit le rendement effectif d’une succession d’autocalls par rapport au coupon facial."),
   ]),

 GU("phoenix",
   "Produit Structuré Phoenix : Coupon Conditionnel et Barrières",
   "Phoenix : le coupon conditionnel expliqué",
   "Le Phoenix verse un coupon à chaque constatation si le sous-jacent reste au-dessus "
   "d’une barrière. Fonctionnement et exemples chiffrés.",
   "Le Phoenix est la structure la plus distribuée en France. Son principe : un coupon "
   "versé à chaque constatation dès lors que le sous-jacent se tient au-dessus d’une "
   "barrière, le plus souvent assorti d’un rappel anticipé.",
   ["Deux barrières distinctes : l’une commande le coupon, l’autre le capital.",
    "Le coupon est conditionnel : il peut ne jamais être versé.",
    "L’effet mémoire rattrape les coupons manqués, sans rien garantir.",
    "La barrière de capital détermine seule le risque de perte."],
   [
    ("fonctionnement", "Comment fonctionne un Phoenix", """
<p>À chaque date de constatation, le niveau du sous-jacent est comparé à la <strong>barrière
de coupon</strong>, généralement située entre 50 % et 70 % du niveau initial.</p>
<ul>
  <li>Au-dessus : le coupon de la période est versé.</li>
  <li>En dessous : le coupon est suspendu — et, s’il y a
  <a class="inline" href="../coupon-memoire/">effet mémoire</a>, mis en réserve.</li>
</ul>
<p>Le plus souvent, un mécanisme <a class="inline" href="../autocall/">autocall</a> s’y
ajoute : si le sous-jacent repasse au-dessus du seuil de rappel, le produit est remboursé par
anticipation.</p>
<p>À l’échéance, si aucun rappel n’est intervenu, le capital est remboursé intégralement tant
que le sous-jacent est au-dessus de la <strong>barrière de capital</strong>. En dessous,
l’investisseur subit la baisse réelle, sans amortisseur.</p>"""),

    ("deux-barrieres", "Ne pas confondre les deux barrières", """
<p>C’est la confusion la plus fréquente, et la plus coûteuse.</p>
<table>
  <thead><tr><th></th><th>Barrière de coupon</th><th>Barrière de capital</th></tr></thead>
  <tbody>
    <tr><td><strong>Commande</strong></td><td>Le versement du revenu</td><td>Le remboursement du nominal</td></tr>
    <tr><td><strong>Niveau usuel</strong></td><td>50 % à 70 %</td><td>40 % à 60 %</td></tr>
    <tr><td><strong>Constatée</strong></td><td>À chaque période</td><td>À l’échéance seulement, le plus souvent</td></tr>
    <tr><td><strong>Si franchie</strong></td><td>Coupon suspendu, rattrapable</td><td>Perte définitive, proportionnelle</td></tr>
  </tbody>
</table>
<p>Un produit peut parfaitement manquer plusieurs coupons et rembourser malgré tout 100 % du
capital. L’inverse n’existe pas : la barrière de capital, détaillée dans le
<a class="inline" href="../barriere-de-protection/">guide des barrières</a>, est la seule qui
détermine le risque de perte.</p>"""),

    ("exemple", "Exemple chiffré sur dix ans", """
<p>Phoenix mémoire sur un indice large : coupon trimestriel de 2,50 %, barrière de coupon à
60 %, barrière de capital à 60 % constatée à l’échéance, rappel à 100 %.</p>
<table>
  <thead><tr><th>Scénario à l’échéance</th><th>Indice</th><th>Résultat</th></tr></thead>
  <tbody>
    <tr><td>Rappel en année 1</td><td>102 %</td><td>+10 % de coupons, capital restitué</td></tr>
    <tr><td>Pas de rappel, indice tenu</td><td>85 %</td><td>Coupons versés sur dix ans, capital à 100 %</td></tr>
    <tr><td>Barrière franchie</td><td>45 %</td><td>Capital remboursé à 45 % : −55 %</td></tr>
  </tbody>
</table>
<p>Le troisième scénario illustre l’<strong>effet de seuil</strong> : à 61 %, le capital est
intégralement remboursé ; à 59 %, il ne l’est qu’à 59 %. Deux points d’écart, quarante points
de différence. Les mécanismes <em>airbag</em> existent pour lisser cette discontinuité, au
prix d’un coupon plus faible.</p>"""),

    ("phoenix-vs", "Phoenix, Athéna ou Reverse Convertible", """
<p>Les trois se ressemblent de loin et se distinguent sur un point précis : la nature du
revenu.</p>
<ul>
  <li><strong>Phoenix</strong> — coupon conditionnel, détaché en cours de vie. Pour qui veut
  un revenu régulier, en acceptant qu’il puisse s’interrompre.</li>
  <li><strong><a class="inline" href="../athena/">Athéna</a></strong> — aucun coupon détaché ;
  le gain est capitalisé et versé en une fois au rappel. Taux généralement supérieur à
  barrières comparables.</li>
  <li><strong>Reverse Convertible</strong> — coupon fixe et inconditionnel, mais protection du
  capital faible ou nulle. Le rendement est certain, le capital beaucoup moins.</li>
</ul>"""),
   ],
   ["autocall", "coupon-memoire", "barriere-de-protection", "athena"],
   faq=[
     ("Qu’est-ce qu’un produit structuré Phoenix&nbsp;?",
      "C’est une structure qui verse un coupon à chaque date de constatation dès lors que le sous-jacent se situe au-dessus d’une barrière de coupon, généralement comprise entre 50 % et 70 % du niveau initial. Elle est le plus souvent assortie d’un mécanisme de remboursement anticipé."),
     ("Quelle différence entre barrière de coupon et barrière de capital&nbsp;?",
      "La barrière de coupon commande le versement du revenu et se constate à chaque période ; un coupon manqué peut être rattrapé s’il y a effet mémoire. La barrière de capital commande le remboursement du nominal, se constate le plus souvent à la seule date d’échéance, et son franchissement entraîne une perte définitive et proportionnelle."),
   ]),

 GU("athena",
   "Produit Structuré Athéna : Gain Capitalisé et Rappel",
   "Athéna : le gain capitalisé versé au rappel",
   "La structure Athéna ne détache aucun coupon : le gain est capitalisé et versé en "
   "une fois au rappel ou à l’échéance. Fonctionnement et exemples chiffrés.",
   "Athéna désigne une structure autocall sans coupon détaché : le rendement est "
   "capitalisé et versé en une seule fois, au moment du rappel ou à l’échéance.",
   ["Aucun revenu intermédiaire : tout est différé.",
    "Le taux capitalisé dépasse généralement le coupon d’un Phoenix comparable.",
    "Logique de tout ou rien : sans rappel et sous la barrière, rien n’est perçu.",
    "Un seul flux : fiscalité plus simple en compte-titres."],
   [
    ("fonctionnement", "Le principe", """
<p>À chaque constatation, si le sous-jacent est au-dessus du seuil de rappel, le produit est
remboursé au nominal majoré d’un gain égal au <strong>taux annuel multiplié par le nombre
d’années écoulées</strong>. Tant que le rappel n’intervient pas, rien n’est versé.</p>
<p>À l’échéance, deux issues : soit le sous-jacent est au-dessus de la barrière de capital et
l’investisseur reçoit le nominal plus l’intégralité du gain capitalisé, soit il est en dessous
et l’investisseur encaisse la baisse, sans avoir rien perçu entretemps.</p>"""),

    ("exemple", "Exemple chiffré", """
<p>Athéna à 11,80 % par an sur le CAC 40, constatation annuelle, barrière de capital à 60 %,
maturité huit ans.</p>
<table>
  <thead><tr><th>Issue</th><th>Niveau</th><th>Versement</th><th>Rendement annualisé</th></tr></thead>
  <tbody>
    <tr><td>Rappel en année 2</td><td>≥ 100 %</td><td>Nominal + 23,60 %</td><td>≈ 11,2 %</td></tr>
    <tr><td>Rappel en année 7</td><td>≥ 100 %</td><td>Nominal + 82,60 %</td><td>≈ 9,0 %</td></tr>
    <tr><td>Échéance, indice tenu</td><td>75 %</td><td>Nominal + 94,40 %</td><td>≈ 8,6 %</td></tr>
    <tr><td>Échéance, barrière franchie</td><td>50 %</td><td>50 % du nominal</td><td>−8,3 %</td></tr>
  </tbody>
</table>
<p>La dernière ligne résume le défaut de la famille : huit années sans le moindre flux, puis
une perte de la moitié du capital. Le gain capitalisé ne vaut que s’il est effectivement
déclenché.</p>"""),

    ("athena-phoenix", "Athéna ou Phoenix", """
<p>À barrières et maturité identiques, l’Athéna affiche généralement un taux supérieur au
coupon d’un <a class="inline" href="../phoenix/">Phoenix</a>. La raison est simple :
l’émetteur conserve la trésorerie pendant toute la durée de vie au lieu de la verser
périodiquement, ce qui lui coûte moins cher.</p>
<p>Le choix se joue donc sur un besoin concret :</p>
<ul>
  <li>Besoin de revenus réguliers, tolérance à leur interruption → Phoenix.</li>
  <li>Pas de besoin de revenu, horizon long, recherche du rendement total → Athéna.</li>
  <li>Détention en compte-titres → l’Athéna évite une imposition annuelle sur chaque coupon,
  puisqu’il n’y a qu’un flux terminal. Voir le
  <a class="inline" href="../fiscalite-produits-structures/">guide fiscalité</a>.</li>
</ul>"""),
   ],
   ["phoenix", "autocall", "fiscalite-produits-structures", "produit-structure"],
   faq=[
     ("Quelle différence entre Athéna et Phoenix&nbsp;?",
      "Le Phoenix détache des coupons conditionnels en cours de vie. L’Athéna ne verse rien avant le remboursement : le gain est capitalisé et versé en une fois au rappel ou à l’échéance. À barrières comparables, le taux de l’Athéna est généralement supérieur."),
     ("Que perçoit-on si un Athéna n’est jamais rappelé&nbsp;?",
      "Si le sous-jacent termine au-dessus de la barrière de capital, l’investisseur reçoit le nominal majoré de tout le gain capitalisé. S’il termine en dessous, il subit la baisse du sous-jacent et n’aura rien perçu pendant toute la durée de vie."),
   ]),

 GU("emtn",
   "EMTN : Définition et Risque de Crédit de l’Émetteur",
   "EMTN : le format juridique des produits structurés",
   "EMTN, BMTN, titre de créance : ce que vous signez vraiment. Risque de défaut, "
   "bail-in, séniorité, garant et notation.",
   "EMTN — <em>Euro Medium Term Note</em> — est le format juridique sous lequel sont "
   "émis la plupart des produits structurés en Europe. Comprendre ce format, c’est "
   "comprendre à qui vous prêtez.",
   ["Un EMTN est un titre de créance : vous êtes créancier de la banque.",
    "Aucune garantie des dépôts ne s’applique.",
    "Ces titres entrent dans le périmètre du bail-in européen.",
    "La notation du groupe n’est pas celle de l’entité émettrice."],
   [
    ("definition", "Ce qu’est un EMTN", """
<p>Un EMTN est un titre de créance émis par une banque dans le cadre d’un programme
d’émission déposé auprès d’un régulateur. Le programme — le <em>prospectus de base</em> —
décrit le cadre général ; chaque émission y ajoute ses <em>conditions définitives</em>, qui
fixent le sous-jacent, les barrières, les dates et le nominal.</p>
<p>L’équivalent de droit français s’appelle BMTN (bon à moyen terme négociable). Le format
diffère, la logique est identique : titre de créance, risque de crédit de l’émetteur,
remboursement calculé par formule.</p>
<p>Il faut en retenir une chose : <strong>la formule n’est qu’une modalité de calcul de la
dette</strong>. Elle ne crée aucun droit sur le sous-jacent, ni aucun actif cantonné à votre
profit.</p>"""),

    ("risque-credit", "Le risque de crédit, concrètement", """
<p>Si l’émetteur fait défaut, vous êtes un créancier parmi d’autres. La performance du
sous-jacent devient sans objet : un produit « à capital garanti » émis par une banque
défaillante ne garantit plus rien.</p>
<p>Le précédent de référence reste la faillite de Lehman Brothers en 2008 : les porteurs de
notes émises par le groupe ont subi des pertes très lourdes, y compris sur des produits
commercialisés comme protégés.</p>
<p>Deux conséquences pratiques :</p>
<ul>
  <li><strong>Diversifier les signatures</strong> autant que les sous-jacents. Trois produits
  chez trois émetteurs ne portent pas le même risque que trois produits chez un seul.</li>
  <li><strong>Vérifier le garant.</strong> Quand l’émetteur est un véhicule de financement
  dédié, c’est la qualité de crédit du garant qu’il faut analyser. L’information figure en
  première page du document d’informations clés.</li>
</ul>"""),

    ("bail-in", "Bail-in et séniorité", """
<p>Le mécanisme européen de résolution bancaire permet d’imputer les pertes d’une banque en
difficulté sur ses créanciers, par dépréciation ou conversion de leurs créances. Les produits
structurés étant des titres de créance, ils entrent dans ce périmètre. Ils ne bénéficient
d’<strong>aucune garantie des dépôts</strong> : le fonds qui couvre les comptes bancaires ne
s’applique pas aux EMTN.</p>
<p>Au sein de la dette bancaire, deux rangs coexistent. La dette <em>senior preferred</em> est
remboursée avant la <em>senior non preferred</em>, qui absorbe les pertes en premier. La
plupart des produits destinés aux particuliers sont émis en senior preferred ; une émission en
senior non preferred offre un coupon supérieur pour un risque de subordination plus élevé. La
mention figure dans la documentation et mérite vérification.</p>"""),

    ("notation", "Lire la notation de l’émetteur", """
<p>Trois agences notent la dette senior long terme, avec des échelles distinctes et des
conclusions qui divergent régulièrement sur un même émetteur. Lire les trois plutôt qu’une.</p>
<table>
  <thead><tr><th>Catégorie</th><th>Échelle S&amp;P / Fitch</th><th>Lecture</th></tr></thead>
  <tbody>
    <tr><td>Qualité très élevée</td><td>AAA à AA−</td><td>Rare sur ce marché</td></tr>
    <tr><td>Qualité élevée</td><td>A+ à A−</td><td>La plupart des grands émetteurs</td></tr>
    <tr><td>Dernière catégorie « investissement »</td><td>BBB+ à BBB−</td><td>Exiger une prime de coupon correspondante</td></tr>
    <tr><td>Catégorie spéculative</td><td>BB+ et en dessous</td><td>Exceptionnel ; à écarter sur un horizon long</td></tr>
  </tbody>
</table>
<p>Les notations évoluent sans préavis. Celles que nous publions sur la
<a class="inline" href="../../acteurs.html#emetteurs">page des émetteurs</a> sont indicatives
et datées ; elles doivent être revérifiées auprès des agences avant toute décision.</p>"""),
   ],
   ["risques-produits-structures", "produit-structure", "produit-structure-capital-garanti"],
   faq=[
     ("Qu’est-ce qu’un EMTN&nbsp;?",
      "Un Euro Medium Term Note est un titre de créance émis par une banque dans le cadre d’un programme d’émission déposé auprès d’un régulateur. C’est le format juridique de la plupart des produits structurés européens : l’investisseur est créancier de la banque, et non propriétaire du sous-jacent."),
     ("Un EMTN est-il garanti par la garantie des dépôts&nbsp;?",
      "Non. Les EMTN sont des titres de créance, pas des dépôts : ils ne bénéficient d’aucune garantie des dépôts et entrent dans le périmètre du mécanisme européen de renflouement interne, qui permet d’imputer les pertes d’une banque en difficulté sur ses créanciers."),
   ]),

 GU("produit-structure-capital-garanti",
   "Produit Structuré à Capital Garanti : Ce Qu’il Garantit Vraiment",
   "Produit structuré à capital garanti : ce qu’il garantit vraiment",
   "Capital garanti ou protégé : la garantie ne vaut qu’à l’échéance et ne couvre pas "
   "le défaut de l’émetteur. Fonctionnement et exemples.",
   "« Capital garanti » est l’expression la plus trompeuse du marché. La garantie est "
   "réelle, mais elle est bornée par deux conditions que la brochure met rarement en "
   "avant.",
   ["La garantie ne joue qu’à l’échéance, pas en cours de vie.",
    "Elle ne couvre jamais le défaut de l’émetteur.",
    "La participation à la hausse est réduite et presque toujours plafonnée.",
    "Le vrai risque est le coût d’opportunité, pas la perte."],
   [
    ("fonctionnement", "Comment la garantie est construite", """
<p>L’émetteur place l’essentiel du nominal sur une composante obligataire calibrée pour
ramener 100 % du capital à l’échéance, et consacre le reliquat à l’achat d’options qui portent
la performance.</p>
<p>Le niveau des taux conditionne donc directement l’attrait de la famille : plus les taux
sont élevés, moins la composante obligataire coûte cher, et plus le budget d’options est
important. C’est pourquoi ces produits, quasi introuvables pendant les années de taux nuls,
sont redevenus proposables.</p>"""),

    ("deux-limites", "Les deux limites de la garantie", """
<p><strong>Première limite : elle ne vaut qu’à l’échéance.</strong> En cours de vie, la valeur
de marché peut descendre sous le nominal — notamment parce que les frais de structuration ont
été prélevés dès l’émission et que les taux ont bougé. Une sortie anticipée se fait à ce prix,
pas au pair.</p>
<p><strong>Seconde limite : elle ne couvre pas le risque de crédit.</strong> La garantie est
un engagement de la banque émettrice, pas un dépôt cantonné. En cas de défaut, elle devient
inopérante. Voir le <a class="inline" href="../emtn/">guide EMTN</a>.</p>
<p>D’où une formulation plus juste : le capital est <em>contractuellement protégé à l’échéance
sous réserve de la solvabilité de l’émetteur</em>. C’est d’ailleurs la rédaction qu’emploient
les documents réglementaires.</p>"""),

    ("exemple", "Exemple chiffré", """
<p>Capital protégé six ans sur un indice européen large, participation de 70 % à la hausse,
plafond de gain à 40 %, moyenne des douze derniers mois.</p>
<table>
  <thead><tr><th>Indice à l’échéance</th><th>Gain</th><th>Rendement annualisé</th></tr></thead>
  <tbody>
    <tr><td>+60 %</td><td>+40 % (plafond atteint)</td><td>≈ 5,8 %</td></tr>
    <tr><td>+20 %</td><td>+14 %</td><td>≈ 2,2 %</td></tr>
    <tr><td>0 %</td><td>0 %</td><td>0 %</td></tr>
    <tr><td>−40 %</td><td>0 %, capital remboursé</td><td>0 %</td></tr>
  </tbody>
</table>
<p>La bonne comparaison n’est pas avec un livret, mais avec <strong>une obligation du même
émetteur et de même maturité</strong>. Si cette obligation rapporte un taux fixe supérieur au
rendement médian attendu du produit structuré, la protection se paie cher.</p>"""),

    ("cout-opportunite", "Le vrai risque : ne rien gagner", """
<p>Sur cette famille, le risque principal n’est pas de perdre, c’est de ne rien gagner pendant
six ou huit ans tout en immobilisant son capital.</p>
<p>Deux éléments pèsent souvent plus que le plafond lui-même : <strong>la moyenne de fin de
période</strong>, qui ampute la performance restituée en cas de marché haussier jusqu’au
terme, et <strong>l’abandon des dividendes</strong>, qui représente plusieurs points par an
sur un indice européen. Ils figurent tous deux dans la documentation, rarement dans l’argumentaire.</p>
<p>Cette famille garde du sens pour une trésorerie d’entreprise, une holding ou un cadre de
placement statutairement contraint, où la préservation du nominal prime sur le rendement.</p>"""),
   ],
   ["risques-produits-structures", "emtn", "produit-structure", "produit-structure-assurance-vie"],
   faq=[
     ("Un produit structuré à capital garanti est-il sans risque&nbsp;?",
      "Non. La garantie ne joue qu’à l’échéance — une sortie anticipée se fait au prix de marché, qui peut être inférieur au nominal — et elle ne couvre pas le défaut de l’émetteur, puisqu’il s’agit d’un engagement de la banque et non d’un dépôt garanti."),
     ("Quel rendement attendre d’un produit à capital garanti&nbsp;?",
      "La participation à la hausse est réduite et presque toujours plafonnée, et les dividendes du sous-jacent ne sont pas reversés. Le scénario le plus fréquent se situe nettement en deçà du plafond affiché ; il faut aussi envisager un rendement nul, le capital étant alors simplement restitué."),
   ]),
]

GUIDES += [

 GU("produit-structure-assurance-vie",
   "Produit Structuré en Assurance-Vie : Fonctionnement et Fiscalité",
   "Produit structuré en assurance-vie : ce qui change",
   "Loger un produit structuré en unité de compte : fiscalité, frais cumulés, "
   "arbitrages, et comparaison avec le compte-titres.",
   "La très grande majorité des produits structurés souscrits en France le sont en unité "
   "de compte, dans un contrat d’assurance-vie. L’enveloppe change le rendement net bien "
   "plus qu’on ne le croit.",
   ["Les coupons capitalisent sans imposition tant qu’ils restent dans le contrat.",
    "Les frais de gestion du contrat s’ajoutent à ceux intégrés à la formule.",
    "L’assureur doit avoir référencé le titre : tous ne le font pas.",
    "L’antériorité fiscale du contrat profite au produit."],
   [
    ("mecanique", "Comment le produit entre dans le contrat", """
<p>Le titre est référencé par l’assureur comme <strong>unité de compte</strong>. Vous ne le
détenez pas en direct : c’est l’assureur qui le porte, et votre contrat vous en attribue la
contre-valeur. L’assureur en assure la valorisation périodique, à partir du prix communiqué
par l’émetteur.</p>
<p>Deux conséquences pratiques. D’une part, <strong>l’offre dépend du référencement</strong> :
un produit distribué en direct n’est pas forcément accessible dans votre contrat. D’autre
part, les arbitrages entrants et sortants suivent les règles du contrat, avec leurs délais et
leurs éventuels frais.</p>
<p>Le risque de crédit, lui, ne change pas : il reste celui de l’émetteur du titre. L’assureur
n’est pas garant du produit. Pour un contrat luxembourgeois, le triangle de sécurité protège
du défaut de l’assureur, jamais de celui de l’émetteur — deux risques distincts.</p>"""),

    ("fiscalite", "L’avantage fiscal, et sa contrepartie", """
<p>C’est le motif principal du choix de l’enveloppe. Les coupons perçus ne sont pas fiscalisés
tant qu’ils restent dans le contrat : ils se réinvestissent à plein. Sur un produit à coupons
trimestriels détenu dix ans, l’écart avec un compte-titres est substantiel.</p>
<p>S’y ajoutent l’antériorité fiscale du contrat — l’abattement annuel après huit ans — et le
cadre de transmission propre à l’assurance-vie.</p>
<p>La contrepartie est le <strong>cumul des frais</strong>. Les frais de gestion annuels du
contrat sur les unités de compte s’ajoutent à ceux déjà intégrés dans la formule du produit.
Sur une maturité longue, ils absorbent une part réelle du coupon.</p>
<table>
  <thead><tr><th></th><th>Assurance-vie</th><th>Compte-titres</th></tr></thead>
  <tbody>
    <tr><td><strong>Coupons</strong></td><td>Capitalisent sans imposition dans le contrat</td><td>Imposés à la perception</td></tr>
    <tr><td><strong>Frais</strong></td><td>Formule + gestion annuelle du contrat</td><td>Formule seule</td></tr>
    <tr><td><strong>Choix de l’émetteur</strong></td><td>Limité au référencement de l’assureur</td><td>Libre</td></tr>
    <tr><td><strong>Transmission</strong></td><td>Cadre propre à l’assurance-vie</td><td>Droit commun</td></tr>
  </tbody>
</table>
<p>Le détail du traitement fiscal figure dans le
<a class="inline" href="../fiscalite-produits-structures/">guide fiscalité</a>.</p>"""),

    ("choisir", "Quand l’assurance-vie s’impose, quand elle ne s’impose pas", """
<p>Elle s’impose quand le produit verse des coupons réguliers sur une longue durée, quand le
contrat a déjà plus de huit ans, et quand l’objectif de transmission compte.</p>
<p>Elle s’impose moins pour une structure <a class="inline" href="../athena/">Athéna</a>, qui
ne génère qu’un flux terminal : l’avantage de capitalisation ne joue presque pas, alors que
les frais de gestion courent pendant toute la durée. Elle ne convient pas non plus si vous
tenez à un émetteur précis que votre assureur ne référence pas.</p>
<p>Pour une personne morale — holding, trésorerie d’entreprise — l’équivalent est le contrat
de capitalisation, de même nature financière.</p>"""),
   ],
   ["fiscalite-produits-structures", "athena", "produit-structure", "produit-structure-capital-garanti"],
   faq=[
     ("Peut-on loger un produit structuré en assurance-vie&nbsp;?",
      "Oui, en unité de compte, à condition que l’assureur ait référencé le titre. C’est la voie la plus courante en France. L’assureur porte le titre et en assure la valorisation ; le risque de crédit reste celui de l’émetteur."),
     ("Le produit structuré en assurance-vie est-il garanti par l’assureur&nbsp;?",
      "Non. Une unité de compte ne bénéficie d’aucune garantie en capital de l’assureur. Le remboursement dépend de la formule du produit et de la solvabilité de son émetteur."),
   ]),

 GU("indice-decrement",
   "Indice Décrément : Fonctionnement et Impact sur le Rendement",
   "Indice décrément : comment il finance votre coupon",
   "Qu’est-ce qu’un indice décrément ? Prélèvement en points ou en pourcentage, effet "
   "sur la performance et critères d’évaluation chiffrés.",
   "Un indice décrément est un indice construit pour la structuration : il réinvestit "
   "les dividendes du panier, puis en retranche un prélèvement forfaitaire. C’est le "
   "sous-jacent de la majorité des produits distribués en France.",
   ["Le décrément remplace un flux de dividendes variable par un prélèvement fixe.",
    "Il permet d’afficher des coupons et des barrières plus élevés.",
    "Il n’est ni bon ni mauvais en soi : tout dépend de son niveau.",
    "Exprimé en points, son poids relatif augmente quand l’indice baisse."],
   [
    ("principe", "Le principe", """
<p>Un indice décrément part d’un panier d’actions, réinvestit les dividendes réellement
détachés, puis retranche un prélèvement forfaitaire. Ce prélèvement prend deux formes :</p>
<ul>
  <li><strong>un pourcentage annuel</strong> — par exemple 5 % par an, proportionnel au niveau
  de l’indice ;</li>
  <li><strong>un nombre fixe de points d’indice</strong> — par exemple 50 points par an, en
  valeur absolue.</li>
</ul>
<p>L’intérêt pour l’émetteur est de <strong>connaître à l’avance le flux de dividendes</strong>.
Les dividendes futurs sont la principale inconnue dans le prix d’un produit structuré : les
figer supprime cette incertitude, donc le coût de couverture associé. L’économie est
restituée sous forme de coupon plus élevé ou de barrière plus profonde.</p>"""),

    ("calcul", "Le calcul, en chiffres", """
<p>Soit un panier dont le rendement du dividende s’établit à 3,2 % par an, et un décrément de
5 % par an. L’indice décrément progresse chaque année d’environ 1,8 point de moins que le
même panier dividendes réinvestis.</p>
<p>Comparé à l’indice <em>price</em> classique — celui que publie la presse, dividendes non
réinvestis — l’écart est la différence entre le dividende réel et le décrément : ici
−1,8 point par an. Sur dix ans, cela représente un écart cumulé proche de 17 %.</p>
<p>Le cas du <strong>décrément en points</strong> mérite attention. Un prélèvement de
50 points sur un indice à 1 000 représente 5 % par an. Si l’indice tombe à 500, les mêmes
50 points représentent 10 % par an.</p>
<table>
  <thead><tr><th>Niveau de l’indice</th><th>Décrément 50 points</th><th>Décrément 5 %</th></tr></thead>
  <tbody>
    <tr><td>1 200</td><td>4,2 % par an</td><td>5,0 % par an</td></tr>
    <tr><td>1 000</td><td>5,0 % par an</td><td>5,0 % par an</td></tr>
    <tr><td>700</td><td>7,1 % par an</td><td>5,0 % par an</td></tr>
    <tr><td>500</td><td>10,0 % par an</td><td>5,0 % par an</td></tr>
  </tbody>
</table>
<p>Le prélèvement s’alourdit donc en termes relatifs au moment précis où l’investisseur a
besoin que l’indice se maintienne au-dessus de ses barrières. À l’inverse, il s’allège quand
l’indice monte, ce qui favorise les scénarios de rappel rapide.</p>"""),

    ("evaluer", "Comment l’évaluer, sans parti pris", """
<p>Un indice décrément n’est pas un piège : c’est un mode de financement du coupon,
documenté dans le prospectus et la méthodologie de l’indice. La question n’est pas de savoir
s’il faut l’éviter par principe, mais s’il est <strong>correctement rémunéré</strong>.</p>
<p>Trois vérifications suffisent à se faire une opinion.</p>
<ol>
  <li><strong>Comparer le décrément au rendement du dividende historique du panier.</strong>
  Un décrément inférieur ou proche du dividende réel est économiquement neutre. Nettement
  supérieur, il ampute structurellement la performance.</li>
  <li><strong>Regarder la forme.</strong> En points, le prélèvement est plus favorable en
  marché haussier et plus pénalisant en marché baissier qu’un pourcentage équivalent.</li>
  <li><strong>Mesurer le surcroît de coupon obtenu.</strong> Comparez l’offre à une structure
  équivalente sur indice public, même émetteur, mêmes barrières. Si le décrément rapporte un
  ou deux points de coupon, c’est un arbitrage défendable ; s’il n’en rapporte presque rien,
  il ne bénéficie qu’à l’émetteur.</li>
</ol>
<p>Deux limites restent à intégrer : l’historique présenté est le plus souvent reconstitué
par calcul avant la création de l’indice — ce n’est pas une performance observée — et la
cotation quotidienne est moins accessible que celle d’un indice public.</p>"""),

    ("notre-choix", "Pourquoi notre comparateur n’en retient aucun", """
<p>Par choix éditorial de lisibilité, et non parce que ces produits seraient nécessairement
moins performants. Un investisseur qui peut vérifier son sous-jacent dans la presse chaque
matin suit son placement ; un investisseur qui ne le peut pas dépend de son distributeur.</p>
<p>Ce choix a un coût, que nous assumons : à barrières identiques, une structure sur indice
public offre généralement <strong>un à deux points de coupon de moins</strong>. Si ce coût
vous paraît excessif, un produit sur indice décrément correctement calibré peut parfaitement
vous convenir — et nous pouvons l’analyser avec vous.</p>
<p>Voir aussi le guide
<a class="inline" href="../produit-structure-sans-decrement/">produit structuré sans
décrément</a>, qui détaille comment identifier et comparer ces structures.</p>"""),
   ],
   ["produit-structure-sans-decrement", "produit-structure-euro-stoxx-50", "produit-structure"],
   faq=[
     ("Qu’est-ce qu’un indice décrément&nbsp;?",
      "C’est un indice construit pour la structuration : il réinvestit les dividendes d’un panier d’actions puis en retranche un prélèvement forfaitaire, exprimé soit en pourcentage annuel, soit en nombre fixe de points d’indice. Ce prélèvement finance un coupon plus élevé."),
     ("Un indice décrément est-il désavantageux&nbsp;?",
      "Pas en soi. Tout dépend du niveau du décrément rapporté au rendement du dividende réel du panier, et du surcroît de coupon obtenu en échange. Un décrément proche du dividende réel est économiquement neutre ; très supérieur, il ampute la performance sans contrepartie suffisante."),
     ("Quelle différence entre décrément en points et en pourcentage&nbsp;?",
      "Un décrément en pourcentage est proportionnel au niveau de l’indice. Un décrément en points est un montant fixe : son poids relatif augmente quand l’indice baisse et diminue quand il monte."),
   ]),

 GU("produit-structure-sans-decrement",
   "Produit Structuré sans Décrément : Identifier et Comparer",
   "Produit structuré sans décrément : comment l’identifier",
   "Reconnaître un produit structuré sur indice public plutôt que sur indice décrément, "
   "et comparer les deux offres à risque équivalent.",
   "Un produit « sans décrément » repose sur un indice de marché public — CAC 40, "
   "EURO STOXX 50, S&amp;P 500 — dont la cotation est vérifiable chaque jour. Voici "
   "comment le reconnaître et ce que ce choix implique.",
   ["Le nom de l’indice suffit souvent à trancher.",
    "Le coupon est généralement inférieur d’un à deux points, à barrières égales.",
    "Le sous-jacent reste suivable sans passer par le distributeur.",
    "L’historique est réel, pas reconstitué."],
   [
    ("identifier", "Trois vérifications pour trancher", """
<p>Le document d’informations clés et les conditions définitives donnent la réponse en
quelques lignes.</p>
<ol>
  <li><strong>Le nom du sous-jacent.</strong> Un indice public porte un nom court et connu :
  CAC 40, EURO STOXX 50, S&amp;P 500, MSCI World. Un indice décrément porte presque toujours
  une mention explicite : <em>Decrement</em>, <em>DEC</em>, un nombre de points
  (« 50 Points Decrement ») ou un pourcentage (« 5 % Decrement »).</li>
  <li><strong>Le fournisseur de l’indice.</strong> Un indice public est calculé par un
  fournisseur indépendant — Euronext, STOXX, S&amp;P, MSCI — et sa méthodologie est
  consultable librement. Un indice propriétaire est calculé par l’émetteur ou pour son compte.</li>
  <li><strong>L’historique.</strong> Si la documentation mentionne une performance
  « simulée », « reconstituée » ou « back-testée » avant une date de lancement récente, le
  sous-jacent n’est pas un indice public ancien.</li>
</ol>
<p>Un détail utile : la plupart des indices décrément <em>partent</em> d’un indice public
connu. Lire le nom complet suffit généralement à savoir d’où l’on part et ce qu’on retranche.</p>"""),

    ("cout", "Ce que coûte le choix du sous-jacent public", """
<p>Il faut le dire clairement : à barrières, maturité et émetteur identiques, une structure
sur indice public offre <strong>un coupon plus faible</strong> qu’une structure sur indice
décrément. L’écart constaté se situe généralement entre un et deux points par an, selon le
niveau du décrément.</p>
<p>La raison est mécanique : le décrément fige le flux de dividendes et supprime une
incertitude de couverture, économie que l’émetteur restitue en coupon. En renonçant au
décrément, vous renoncez à cette économie.</p>
<p>Ce que vous obtenez en échange n’est pas un rendement, c’est une capacité de contrôle :
suivre votre sous-jacent chaque jour, comparer sa trajectoire à une référence connue,
et disposer d’un historique réellement observé plutôt que reconstitué.</p>"""),

    ("comparer", "Comparer les deux offres honnêtement", """
<p>La bonne méthode n’est pas de rejeter l’un ou l’autre, mais de les ramener à une base
comparable.</p>
<table>
  <thead><tr><th>Critère</th><th>Indice public</th><th>Indice décrément</th></tr></thead>
  <tbody>
    <tr><td>Coupon affiché</td><td>Plus bas</td><td>Plus élevé</td></tr>
    <tr><td>Suivi quotidien</td><td>Presse, sites financiers</td><td>Publié par l’émetteur</td></tr>
    <tr><td>Historique</td><td>Réel, souvent long</td><td>Souvent reconstitué</td></tr>
    <tr><td>Écart à la référence</td><td>Aucun</td><td>Se creuse avec le temps</td></tr>
    <tr><td>Méthodologie</td><td>Publique</td><td>Documentée, moins accessible</td></tr>
  </tbody>
</table>
<p>Question décisive : <strong>le surcroît de coupon compense-t-il le prélèvement</strong> ?
Si un décrément de 5 % par an sur un panier dont les dividendes réels valent 3,2 % ne rapporte
que 0,5 point de coupon supplémentaire, l’arbitrage est défavorable. S’il en rapporte deux,
il se discute sérieusement.</p>
<p>Le <a class="inline" href="../../produits.html">comparateur</a> ne référence que des
structures sur indices publics ; la
<a class="inline" href="../../methodologie.html">méthodologie</a> explique ce choix et ses
limites.</p>"""),
   ],
   ["indice-decrement", "produit-structure-euro-stoxx-50", "produit-structure"],
   faq=[
     ("Comment savoir si un produit structuré utilise un indice décrément&nbsp;?",
      "Le nom du sous-jacent l’indique presque toujours : les indices décrément portent une mention explicite — Decrement, un nombre de points ou un pourcentage. À défaut, la méthodologie de l’indice figure dans les conditions définitives et dans le document d’informations clés."),
     ("Un produit sans décrément rapporte-t-il moins&nbsp;?",
      "À barrières, maturité et émetteur identiques, oui : généralement un à deux points de coupon de moins par an. En contrepartie, le sous-jacent est suivable quotidiennement et son historique est réellement observé."),
   ]),

 GU("risques-produits-structures",
   "Risques des Produits Structurés : les Six Risques Réels",
   "Les risques des produits structurés",
   "Perte en capital, défaut de l’émetteur, rendement nul, liquidité, réinvestissement, "
   "change : les six risques réels, chiffrés.",
   "La documentation commerciale insiste sur le risque de marché. Il n’est ni le seul, "
   "ni toujours le plus important. Voici les six risques réellement portés par le "
   "souscripteur.",
   ["La perte en capital est proportionnelle et peut être totale.",
    "Le risque de crédit de l’émetteur n’est couvert par aucune garantie des dépôts.",
    "On peut porter un produit huit ans et ne rien percevoir.",
    "La sortie anticipée se fait au prix de l’émetteur, pas au pair."],
   [
    ("capital", "1. Le risque de perte en capital", """
<p>Si la <a class="inline" href="../barriere-de-protection/">barrière de protection</a> est
franchie à la constatation finale, la perte est proportionnelle à la baisse du sous-jacent
depuis le niveau initial — et non à la distance au seuil.</p>
<p>Sur une barrière à 60 %, un sous-jacent qui termine à 59 % fait perdre 41 %, pas 1 %. C’est
l’<strong>effet de seuil</strong>, discontinuité brutale que seuls les mécanismes
<em>airbag</em> atténuent, au prix d’un coupon plus faible.</p>"""),

    ("credit", "2. Le risque de crédit de l’émetteur", """
<p>Le plus négligé, parce qu’il ne se matérialise presque jamais — jusqu’à ce qu’il se
matérialise. Un produit <a class="inline" href="../produit-structure-capital-garanti/">à
capital garanti</a> émis par une banque défaillante ne garantit plus rien.</p>
<p>Ces titres sont des créances : ils ne bénéficient d’<strong>aucune garantie des
dépôts</strong> et entrent dans le périmètre du mécanisme européen de renflouement interne.
Voir le <a class="inline" href="../emtn/">guide EMTN</a>.</p>
<p>Conséquence opérationnelle : diversifier les signatures autant que les sous-jacents.</p>"""),

    ("rendement-nul", "3. Le risque de rendement nul", """
<p>Celui-ci ne figure jamais dans les brochures, parce qu’il ne produit pas de perte
comptable. Vous pouvez porter un produit huit ans, récupérer 100 % de votre capital, et
n’avoir encaissé aucun coupon.</p>
<p>Le capital est préservé ; huit années de rendement sont perdues. Sur un capital de
100 000 € et un placement sans risque à 2,5 %, le coût d’opportunité approche 22 000 €. C’est
une perte réelle, simplement invisible au bilan.</p>"""),

    ("liquidite", "4. Le risque de liquidité", """
<p>Il n’existe pas de marché organisé pour ces titres. La sortie anticipée dépend du prix de
rachat affiché par l’émetteur, qui n’y est le plus souvent <strong>pas contractuellement
tenu</strong>.</p>
<p>Ce prix intègre une fourchette achat-vente et dépend de la volatilité, des taux, du temps
restant et de la qualité de crédit de l’émetteur. Un produit dont le sous-jacent est inchangé
peut valoir 93 % du nominal, notamment parce que les frais de structuration ont été prélevés
dès l’émission. Ces produits se souscrivent avec l’intention de les porter au terme.</p>"""),

    ("reinvestissement", "5. Le risque de réinvestissement", """
<p>Un <a class="inline" href="../autocall/">autocall</a> rappelé rapidement vous rend votre
capital au moment où le marché a monté — donc où les nouveaux coupons sont plus faibles.</p>
<p>Une succession d’autocalls rappelés au bout d’un an ne délivre pas le coupon facial année
après année : elle délivre une suite de rendements courts, entrecoupés de trésorerie non
rémunérée et de réinvestissements dégradés.</p>"""),

    ("change", "6. Le risque de change", """
<p>Sur un produit libellé en devise étrangère, le change peut à lui seul effacer le gain de
la formule, ou aggraver une perte. Un produit en dollar qui délivre 10 % pendant qu’un euro
s’apprécie de 12 % laisse l’investisseur européen en perte.</p>
<p>Une version couverte — dite <em>quanto</em> — existe souvent : son coût de couverture
réduit le coupon affiché. C’est le prix de la tranquillité, et il doit être comparé.</p>"""),

    ("proportion", "Quelle part dans un patrimoine", """
<p>Ces produits ne conviennent pas à tous les investisseurs. Leur souscription suppose un
examen de la situation patrimoniale, des objectifs, de l’horizon, des connaissances et de la
capacité à supporter une perte.</p>
<p>Une règle de prudence largement partagée consiste à n’y consacrer qu’une fraction mesurée
d’un patrimoine financier diversifié, répartie entre plusieurs émetteurs, plusieurs
sous-jacents et plusieurs millésimes — un seul millésime concentre le risque sur un unique
point d’entrée de marché.</p>"""),
   ],
   ["barriere-de-protection", "emtn", "produit-structure", "produit-structure-capital-garanti"],
   faq=[
     ("Peut-on perdre tout son capital sur un produit structuré&nbsp;?",
      "Oui, dans deux cas : si le sous-jacent s’effondre très au-delà de la barrière de protection à la constatation finale, la perte suit cette baisse et peut être quasi totale ; et en cas de défaut de l’émetteur, indépendamment du comportement du sous-jacent."),
     ("Quel est le risque le plus sous-estimé&nbsp;?",
      "Le risque de crédit de l’émetteur, parce qu’il ne se manifeste presque jamais, et le risque de rendement nul, qui ne produit aucune perte comptable mais immobilise le capital plusieurs années sans contrepartie."),
   ]),

 GU("fiscalite-produits-structures",
   "Fiscalité des Produits Structurés : Enveloppes et Imposition",
   "Fiscalité des produits structurés",
   "Comment sont imposés les produits structurés selon l’enveloppe : compte-titres, "
   "assurance-vie, capitalisation, PER, PEA.",
   "Le même produit n’a pas le même rendement net selon l’enveloppe qui l’accueille. "
   "C’est un paramètre de décision, pas un détail administratif.",
   ["En compte-titres, chaque coupon est imposé à sa perception.",
    "En assurance-vie, les coupons capitalisent sans imposition dans le contrat.",
    "L’éligibilité au PEA est très restreinte.",
    "Les frais de l’enveloppe s’ajoutent à ceux de la formule."],
   [
    ("cto", "Compte-titres ordinaire", """
<p>Le titre est détenu en direct. Les revenus et plus-values sont imposés à mesure de leur
perception, au prélèvement forfaitaire unique — qui réunit impôt sur le revenu et
prélèvements sociaux au taux global de 30 % — ou, sur option globale, au barème progressif.</p>
<p>L’avantage est la liberté totale de choix de l’émetteur et de la souche. L’inconvénient est
une fiscalité immédiate qui pèse sur le rendement net d’un produit à coupons réguliers,
puisque chaque coupon est amputé avant tout réinvestissement.</p>
<p>Pour un <a class="inline" href="../athena/">Athéna</a>, qui ne génère qu’un flux terminal,
cet inconvénient disparaît largement : il n’y a qu’une imposition, à la sortie.</p>"""),

    ("av", "Assurance-vie et contrat de capitalisation", """
<p>Le produit est logé en unité de compte. Tant que les sommes restent dans le contrat, les
coupons ne sont pas fiscalisés : ils se réinvestissent intégralement. L’imposition n’intervient
qu’au rachat, sur la seule fraction de gain comprise dans le retrait, avec l’antériorité
fiscale du contrat et l’abattement annuel après huit ans.</p>
<p>Le contrat de capitalisation obéit à la même logique financière et s’adresse notamment aux
personnes morales — holding, trésorerie d’entreprise excédentaire.</p>
<p>Contrepartie : les frais de gestion annuels du contrat sur les unités de compte s’ajoutent
aux frais intégrés à la formule. Voir le
<a class="inline" href="../produit-structure-assurance-vie/">guide assurance-vie</a>.</p>"""),

    ("per", "PER", """
<p>Le plan d’épargne retraite permet, selon l’option retenue, de déduire les versements du
revenu imposable à l’entrée, l’imposition se faisant à la sortie. Les sommes capitalisent dans
le plan sans imposition annuelle.</p>
<p>L’horizon long du PER s’accorde avec les maturités élevées des produits structurés. Le
blocage des fonds jusqu’à la retraite, hors cas de déblocage anticipé prévus par la loi, doit
être pleinement intégré avant de souscrire une structure à dix ou douze ans.</p>"""),

    ("pea", "PEA : une éligibilité très restreinte", """
<p>Le PEA offre une exonération d’impôt sur le revenu après cinq ans, les prélèvements sociaux
restant dus. Mais son éligibilité aux produits structurés est étroitement encadrée : les
titres doivent respecter des conditions strictes de composition et d’émetteur.</p>
<p>En pratique, <strong>la grande majorité des produits structurés n’est pas éligible au
PEA</strong>. Toute affirmation contraire doit être vérifiée dans la documentation de
l’émetteur, qui mentionne explicitement l’éligibilité lorsqu’elle existe.</p>"""),

    ("synthese", "Synthèse", """
<table>
  <thead><tr><th>Enveloppe</th><th>Imposition des coupons</th><th>Adapté à</th></tr></thead>
  <tbody>
    <tr><td>Compte-titres</td><td>À la perception</td><td>Flux terminal unique, liberté d’émetteur</td></tr>
    <tr><td>Assurance-vie</td><td>Différée au rachat</td><td>Coupons réguliers, horizon long, transmission</td></tr>
    <tr><td>Capitalisation</td><td>Différée</td><td>Personnes morales, holdings</td></tr>
    <tr><td>PER</td><td>Différée à la sortie</td><td>Horizon retraite assumé</td></tr>
    <tr><td>PEA</td><td>Exonération après 5 ans</td><td>Rare : éligibilité à vérifier</td></tr>
  </tbody>
</table>
<p class="small muted">Ces éléments décrivent le cadre général applicable aux résidents
fiscaux français à la date de mise à jour de cette page. Ils ne constituent pas un conseil
fiscal : la situation personnelle du souscripteur commande, et la réglementation évolue.
Vérifiez le traitement applicable avec votre conseil.</p>"""),
   ],
   ["produit-structure-assurance-vie", "athena", "produit-structure"],
   faq=[
     ("Comment sont imposés les produits structurés&nbsp;?",
      "Cela dépend de l’enveloppe. En compte-titres, les coupons et plus-values sont imposés à leur perception, au prélèvement forfaitaire unique de 30 % ou sur option au barème. En assurance-vie, en contrat de capitalisation et en PER, les sommes capitalisent sans imposition tant qu’elles restent dans l’enveloppe."),
     ("Un produit structuré est-il éligible au PEA&nbsp;?",
      "Rarement. L’éligibilité suppose des conditions strictes de composition et d’émetteur que la grande majorité des produits structurés ne remplit pas. L’éligibilité, lorsqu’elle existe, est mentionnée explicitement dans la documentation de l’émetteur."),
   ]),

 GU("barriere-de-protection",
   "Barrière de Protection : Européenne, Américaine et Airbag",
   "La barrière de protection d’un produit structuré",
   "Barrière de capital et de coupon, constatation européenne ou américaine, effet de "
   "seuil et mécanisme airbag, expliqués avec des chiffres.",
   "La barrière est le paramètre qui détermine seul votre risque de perte. Son niveau "
   "compte ; son mode de constatation davantage encore.",
   ["Deux barrières distinctes : coupon et capital, à ne jamais confondre.",
    "Une barrière européenne ne se constate qu’à l’échéance.",
    "Une barrière américaine se constate chaque séance : bien plus risquée.",
    "L’effet de seuil rend la perte brutale ; l’airbag la lisse."],
   [
    ("deux", "Deux barrières, deux rôles", """
<p>La <strong>barrière de coupon</strong> commande le revenu. Au-dessus, le coupon de la
période est versé ; en dessous, il est suspendu, et mis en réserve s’il y a
<a class="inline" href="../coupon-memoire/">effet mémoire</a>. Elle se situe généralement
entre 50 % et 70 %.</p>
<p>La <strong>barrière de capital</strong>, ou barrière de protection, commande le
remboursement du nominal. Elle se situe souvent entre 40 % et 60 % et, sur le marché
français, se constate le plus souvent à la seule date d’échéance. C’est elle, et elle seule,
qui détermine le risque de perte.</p>"""),

    ("europeenne-americaine", "Européenne ou américaine : la question décisive", """
<p>Deux barrières au même niveau peuvent présenter des risques radicalement différents selon
leur mode de constatation.</p>
<table>
  <thead><tr><th></th><th>Barrière européenne</th><th>Barrière américaine</th></tr></thead>
  <tbody>
    <tr><td><strong>Constatation</strong></td><td>Une seule fois, à l’échéance</td><td>En continu, chaque séance</td></tr>
    <tr><td><strong>Passage sous le seuil</strong></td><td>Sans conséquence s’il est remonté</td><td>Protection détruite définitivement</td></tr>
    <tr><td><strong>Risque relatif</strong></td><td>Nettement plus faible</td><td>Nettement plus élevé</td></tr>
    <tr><td><strong>Fréquence en France</strong></td><td>Très majoritaire</td><td>Minoritaire</td></tr>
  </tbody>
</table>
<p>Illustration : une barrière américaine à 65 % sur huit ans peut être détruite par une seule
séance de panique, même si le sous-jacent termine à 110 %. La même barrière en version
européenne n’aurait eu aucun effet.</p>
<p>La quasi-totalité des produits distribués en France retient le format européen — mais la
vérification prend dix secondes dans le document d’informations clés, et elle change
l’appréciation du risque.</p>"""),

    ("effet-seuil", "L’effet de seuil, et comment on le corrige", """
<p>Juste au-dessus de la barrière, vous récupérez tout. Juste en dessous, vous perdez
l’intégralité de la baisse. Cette discontinuité est le défaut structurel des barrières
sèches.</p>
<table>
  <thead><tr><th>Sous-jacent final</th><th>Barrière sèche 60 %</th><th>Avec airbag 60 %</th></tr></thead>
  <tbody>
    <tr><td>61 %</td><td>100 % remboursé</td><td>100 % remboursé</td></tr>
    <tr><td>59 %</td><td>59 % — perte de 41 %</td><td>98 % — perte de 2 %</td></tr>
    <tr><td>45 %</td><td>45 % — perte de 55 %</td><td>75 % — perte de 25 %</td></tr>
    <tr><td>30 %</td><td>30 % — perte de 70 %</td><td>50 % — perte de 50 %</td></tr>
  </tbody>
</table>
<p>Le mécanisme <strong>airbag</strong> recalcule la perte depuis la barrière et non depuis le
niveau initial : la baisse constatée est divisée par le niveau de barrière. La perte devient
progressive au lieu d’être brutale. Elle ne disparaît pas pour autant, comme le montre la
dernière ligne.</p>
<p>Le coupon d’une structure avec airbag est inférieur d’environ deux points à celui d’une
structure sèche équivalente : c’est le prix de l’amortisseur.</p>"""),

    ("choisir", "Quel niveau de barrière viser", """
<p>Il n’existe pas de bon niveau dans l’absolu : il existe un bon rapport entre la profondeur
de la barrière et le coupon obtenu.</p>
<p>Un principe aide à trancher : <strong>à coupon comparable, préférer systématiquement la
barrière la plus profonde</strong>. Et à barrière comparable, examiner d’abord le mode de
constatation, ensuite seulement le coupon.</p>
<p>Un produit à 8,5 % avec barrière européenne à 40 % est souvent préférable à un produit à
11 % avec barrière à 70 % — même si le second se vend mieux. Le
<a class="inline" href="../../produits.html">comparateur</a> permet de filtrer précisément sur
ce critère.</p>"""),
   ],
   ["phoenix", "risques-produits-structures", "coupon-memoire", "produit-structure"],
   faq=[
     ("Qu’est-ce que la barrière de protection d’un produit structuré&nbsp;?",
      "C’est le niveau du sous-jacent en dessous duquel le capital n’est plus intégralement remboursé à l’échéance. Au-dessus, l’investisseur récupère 100 % du nominal même si le sous-jacent a baissé ; en dessous, il subit la baisse constatée depuis le niveau initial."),
     ("Quelle différence entre barrière européenne et américaine&nbsp;?",
      "Une barrière européenne n’est constatée qu’une fois, à l’échéance : le sous-jacent peut passer sous le seuil en cours de vie sans conséquence. Une barrière américaine est constatée à chaque séance : un seul franchissement, même intrajournalier, détruit définitivement la protection."),
   ]),

 GU("coupon-memoire",
   "Coupon Mémoire : Fonctionnement et Intérêt Réel",
   "Le coupon à effet mémoire",
   "L’effet mémoire conserve les coupons non versés et les rattrape à la première "
   "constatation favorable. Fonctionnement, exemple chiffré, et ce qu’il ne protège "
   "pas.",
   "L’effet mémoire est une clause simple : un coupon manqué n’est pas perdu, il est mis "
   "en réserve et rattrapé dès qu’une constatation redevient favorable.",
   ["La mémoire ne change pas le rendement maximal, elle change sa probabilité.",
    "Elle protège des parcours agités, pas d’une baisse durable.",
    "Elle se paie par un coupon facial légèrement inférieur.",
    "Les versements deviennent irréguliers, parfois groupés."],
   [
    ("mecanisme", "Le mécanisme", """
<p>Dans une structure <a class="inline" href="../phoenix/">Phoenix</a> sans mémoire, un coupon
non versé est définitivement perdu. Avec mémoire, il est conservé et s’ajoute au premier
coupon effectivement payé par la suite.</p>
<p>Exemple sur un produit à 10 % annuel, constatation annuelle, barrière de coupon à 60 % :</p>
<table>
  <thead><tr><th>Année</th><th>Indice</th><th>Sans mémoire</th><th>Avec mémoire</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>72 %</td><td>+10 %</td><td>+10 %</td></tr>
    <tr><td>2</td><td>54 %</td><td>0 %</td><td>0 % (1 coupon en réserve)</td></tr>
    <tr><td>3</td><td>51 %</td><td>0 %</td><td>0 % (2 coupons en réserve)</td></tr>
    <tr><td>4</td><td>66 %</td><td>+10 %</td><td><strong>+30 %</strong></td></tr>
    <tr><td colspan="2"><strong>Total sur 4 ans</strong></td><td>20 %</td><td><strong>40 %</strong></td></tr>
  </tbody>
</table>
<p>Sur ce parcours, la mémoire double le rendement encaissé. Elle transforme un trou de
performance temporaire en simple report.</p>"""),

    ("limites", "Ce que la mémoire ne fait pas", """
<p>Trois précisions évitent les malentendus.</p>
<ul>
  <li><strong>Elle ne garantit rien.</strong> Si le sous-jacent ne repasse jamais au-dessus de
  la barrière de coupon, les coupons mémorisés ne sont jamais versés. Sur une baisse durable,
  la mémoire ne sert à rien.</li>
  <li><strong>Elle ne protège pas le capital.</strong> La mémoire porte sur le revenu, pas sur
  le remboursement : la <a class="inline" href="../barriere-de-protection/">barrière de
  capital</a> fonctionne indépendamment.</li>
  <li><strong>Elle ne relève pas le plafond.</strong> Le rendement maximal du produit reste le
  coupon multiplié par la durée. La mémoire augmente la probabilité d’atteindre ce maximum,
  elle ne le dépasse jamais.</li>
</ul>
<p>Son coût est visible dans le coupon facial : à barrières identiques, une structure avec
mémoire affiche généralement un taux un peu inférieur à une structure sans.</p>"""),

    ("quand", "Quand elle vaut son prix", """
<p>La mémoire est d’autant plus utile que le sous-jacent est volatil et que la barrière de
coupon est haute : ce sont les configurations où les constatations manquées isolées sont
fréquentes.</p>
<p>Elle apporte peu sur une structure très défensive, dont la barrière de coupon est si basse
que les manquements sont rares — payer pour une clause qui ne se déclenchera pas n’a pas de
sens.</p>
<p>Enfin, elle rend la trésorerie irrégulière : versements groupés plutôt que réguliers. Pour
un investisseur qui compte sur un revenu périodique, c’est un point à peser.</p>"""),
   ],
   ["phoenix", "barriere-de-protection", "autocall"],
   faq=[
     ("Qu’est-ce qu’un coupon à effet mémoire&nbsp;?",
      "C’est une clause selon laquelle un coupon non versé n’est pas perdu mais mis en réserve, puis payé en totalité dès qu’une constatation ultérieure redevient favorable."),
     ("L’effet mémoire garantit-il le versement des coupons&nbsp;?",
      "Non. Si le sous-jacent ne repasse jamais au-dessus de la barrière de coupon avant l’échéance, les coupons mémorisés ne sont jamais versés. La mémoire augmente la probabilité d’atteindre le rendement maximal, elle ne garantit rien."),
   ]),

 GU("produit-structure-euro-stoxx-50",
   "Produit Structuré sur Euro Stoxx 50 : Pourquoi cet Indice",
   "Produit structuré sur EURO STOXX 50",
   "Pourquoi l’EURO STOXX 50 est le sous-jacent le plus utilisé des produits "
   "structurés : dividendes, liquidité des options, vigilances.",
   "L’EURO STOXX 50 est le sous-jacent le plus répandu des produits structurés "
   "distribués en Europe continentale. Ce n’est pas un hasard : trois propriétés le "
   "rendent particulièrement économique à structurer.",
   ["Un indice public, coté en continu, à l’historique réel et long.",
    "Un rendement du dividende élevé, qui finance le coupon.",
    "Un marché d’options profond, donc des prix compétitifs.",
    "Une concentration sectorielle réelle, à ne pas ignorer."],
   [
    ("pourquoi", "Pourquoi cet indice domine", """
<p>Trois raisons, dans l’ordre d’importance.</p>
<p><strong>Le rendement du dividende.</strong> L’indice regroupe cinquante grandes
capitalisations de la zone euro, dans des secteurs traditionnellement distributeurs. Comme
l’indice publié est calculé dividendes non réinvestis, ces dividendes restent acquis à
l’émetteur et financent l’essentiel du coupon. C’est la raison principale.</p>
<p><strong>La profondeur du marché d’options.</strong> Les options sur EURO STOXX 50 sont
parmi les plus liquides au monde. L’émetteur se couvre à bas coût, et restitue cette économie
dans les conditions proposées.</p>
<p><strong>La lisibilité.</strong> Indice public calculé par un fournisseur indépendant,
coté en continu, à l’historique réellement observé sur plusieurs décennies. Le souscripteur
peut suivre son sous-jacent chaque jour — ce qui n’est pas le cas d’un
<a class="inline" href="../indice-decrement/">indice décrément</a>.</p>"""),

    ("vigilance", "Ce qu’il faut tout de même vérifier", """
<p>La popularité de l’indice ne dispense pas de l’examiner.</p>
<ul>
  <li><strong>Concentration.</strong> Cinquante valeurs seulement, avec un poids marqué des
  financières, du luxe et de l’industrie. Ce n’est pas un indice mondial diversifié.</li>
  <li><strong>Zone euro exclusivement.</strong> Pas d’exposition américaine ni britannique :
  l’indice sous-performe nettement les indices mondiaux sur certaines périodes longues.</li>
  <li><strong>Version utilisée.</strong> Vérifiez que le produit porte bien sur l’indice
  public standard, et non sur une déclinaison décrément qui en dériverait. Le nom complet,
  dans les conditions définitives, l’indique.</li>
  <li><strong>Effet de millésime.</strong> Souscrire sur un point haut place toutes les
  barrières plus près du danger. Étaler les points d’entrée réduit ce risque.</li>
</ul>"""),

    ("structures", "Les structures qu’on y trouve", """
<p>L’indice se prête à l’ensemble des familles : <a class="inline" href="../phoenix/">Phoenix</a>
à coupon conditionnel, <a class="inline" href="../athena/">Athéna</a> capitalisé, produits de
participation, <a class="inline" href="../produit-structure-capital-garanti/">capital
protégé</a>. Les barrières de capital couramment proposées se situent entre 40 % et 60 %.</p>
<p>Le <a class="inline" href="../../produits.html?sous-jacent=Indice+actions">comparateur</a>
recense plusieurs gabarits sur EURO STOXX 50, avec pour chacun le détail du mécanisme, les
scénarios à l’échéance et les points de vigilance.</p>
<p class="small muted">Ces gabarits illustrent des combinaisons de paramètres représentatives
du marché à la période indiquée. Ce ne sont pas des offres commercialisées : les conditions
réelles d’une émission ne sont arrêtées qu’à sa date de strike.</p>"""),
   ],
   ["phoenix", "indice-decrement", "produit-structure-sans-decrement", "produit-structure"],
   faq=[
     ("Pourquoi tant de produits structurés sont-ils indexés sur l’EURO STOXX 50&nbsp;?",
      "Parce que son rendement du dividende est élevé — et que ces dividendes, non réinvestis dans l’indice publié, financent le coupon —, parce que le marché d’options y est très liquide, ce qui réduit le coût de couverture, et parce qu’il s’agit d’un indice public à l’historique long et vérifiable."),
     ("L’EURO STOXX 50 est-il un indice diversifié&nbsp;?",
      "Modérément. Il regroupe cinquante grandes capitalisations de la seule zone euro, avec un poids marqué de certains secteurs. Il ne remplace pas une exposition mondiale et peut sous-performer durablement les indices internationaux."),
   ]),
]

GUIDE_BY_SLUG = {g["slug"]: g for g in GUIDES}

def page_guide(g):
    path = f'guides/{g["slug"]}/index.html'
    pfx = prefix_for(path)
    trail = [("Accueil", "index.html"), ("Guides", "guides/index.html"), (g["h1"], path)]

    bref = "".join(f"<li>{x}</li>" for x in g["bref"])
    toc = "".join(f'<li><a href="#{sid}">{titre}</a></li>' for sid, titre, _ in g["sections"])
    corps = "".join(
        f'<h2 id="{sid}">{titre}</h2>\n{corps_html}'
        for sid, titre, corps_html in g["sections"])

    faq_html = ""
    if g["faq"]:
        items = "".join(
            f'<div class="faq__i"><h3 class="faq__q">{q}</h3>'
            f'<p class="faq__r">{r}</p></div>' for q, r in g["faq"])
        faq_html = f"""
      <h2 id="faq">Questions fréquentes</h2>
      <div class="faq">{items}</div>"""

    rel = "".join(f"""        <a class="card linkcard" href="{pfx}guides/{s}/">
          <p class="card__k">Guide</p>
          <h3 class="card__t" style="font-size:1.14rem">{GUIDE_BY_SLUG[s]["h1"]}</h3>
          <p class="small muted" style="margin:0">{GUIDE_BY_SLUG[s]["desc"][:110]}…</p>
        </a>""" for s in g["related"] if s in GUIDE_BY_SLUG)

    graph = [ld_article(path, g["h1"], g["desc"], g["maj"])]
    if g["faq"]:
        graph.append(ld_faq(g["faq"]))

    body = f"""
{hero(g["h1"], g["lede"], crumb_html=fil(trail, pfx))}

<section class="section">
  <div class="container container--narrow">

    <aside class="bref" aria-label="À retenir">
      <p class="bref__t">À retenir</p>
      <ul>{bref}</ul>
    </aside>

    <nav class="toc" aria-label="Sommaire du guide">
      <p class="toc__t">Sommaire</p>
      <ol>{toc}{'<li><a href="#faq">Questions fréquentes</a></li>' if g["faq"] else ''}</ol>
    </nav>

    <article class="prose">
{corps}
{faq_html}
    </article>

    <p class="maj">Mis à jour le <time datetime="{g["maj"]}">{date_fr(g["maj"])}</time>.
    Les ordres de grandeur chiffrés reposent sur les conditions de marché de
    {MARCHE_REF} et évoluent avec les taux et la volatilité.
    <a href="{pfx}methodologie.html">Notre méthodologie</a>.</p>

    <div class="guide-cta">
      <div>
        <h2 class="title-md" style="font-size:1.5rem">Passer de la théorie au concret</h2>
        <p class="small" style="margin:10px 0 0">Comparez les structures de référence du
        marché, ou faites analyser un produit qu’on vous a proposé.</p>
      </div>
      <div class="cta__actions">
        <a class="btn btn--sm" href="{pfx}produits.html">Ouvrir le comparateur</a>
        <a class="btn btn--sm btn--gold" href="{pfx}produits.html#analyse">Faire analyser un produit</a>
      </div>
    </div>

    <h2 class="title-md" style="margin-top:56px">À lire également</h2>
    <hr class="rule">
    <div class="cards" style="margin-top:24px">
{rel}
    </div>
  </div>
</section>
"""
    write(path, layout(path, g["title"], g["desc"], body,
                       graph=graph, crumb_trail=trail))

def page_guides_index():
    path = "guides/index.html"
    pfx = prefix_for(path)
    trail = [("Accueil", "index.html"), ("Guides", path)]

    # Regroupement éditorial : on n'invente pas de catégories, on suit la
    # progression naturelle de lecture.
    groupes = [
        ("Les fondamentaux", "Ce qu’il faut avoir compris avant toute souscription.",
         ["produit-structure", "emtn", "risques-produits-structures", "fiscalite-produits-structures"]),
        ("Les mécanismes", "Les briques qui composent une formule, une par une.",
         ["autocall", "phoenix", "athena", "barriere-de-protection", "coupon-memoire"]),
        ("Les sous-jacents", "Sur quoi repose réellement votre produit.",
         ["indice-decrement", "produit-structure-sans-decrement", "produit-structure-euro-stoxx-50"]),
        ("Selon votre situation", "Le même mécanisme ne se juge pas de la même façon selon le cadre.",
         ["produit-structure-capital-garanti", "produit-structure-assurance-vie"]),
    ]
    blocs = []
    for titre, intro, slugs in groupes:
        cartes = "".join(f"""        <a class="card linkcard" href="{pfx}guides/{s}/">
          <h3 class="card__t" style="font-size:1.2rem">{GUIDE_BY_SLUG[s]["h1"]}</h3>
          <p class="small muted">{GUIDE_BY_SLUG[s]["desc"]}</p>
          <span class="card__more">Lire le guide</span>
        </a>""" for s in slugs)
        blocs.append(f"""
    <div style="margin-top:46px">
      <h2 class="title-md">{titre}</h2>
      <p class="lede" style="max-width:640px;margin-top:10px">{intro}</p>
      <div class="cards" style="margin-top:24px">
{cartes}
      </div>
    </div>""")

    body = f"""
{hero("Guides sur les produits structurés",
  "Quatorze guides pour comprendre un mécanisme précis, de la définition d’un produit "
  "structuré à la fiscalité de l’enveloppe qui l’accueille. Chacun va au bout d’un sujet, "
  "avec des exemples chiffrés.",
  crumb_html=fil(trail, pfx))}

<section class="section">
  <div class="container">
    <div class="notice notice--grey">
      <span class="notice__i" aria-hidden="true">i</span>
      <div><p>Pour une lecture d’ensemble en une seule page, le
      <a class="card__more" href="{pfx}comprendre.html" style="border:0;padding:0">guide
      complet</a> réunit la pédagogie, les fiches familles et le glossaire. Les guides
      ci-dessous approfondissent chacun un point précis.</p></div>
    </div>
{"".join(blocs)}
  </div>
</section>
"""
    write(path, layout(path, "Guides Produits Structurés : Mécanismes et Fiscalité",
        "Quatorze guides sur les produits structurés : autocall, Phoenix, Athéna, EMTN, "
        "barrières, coupon mémoire, fiscalité et risques.",
        body, crumb_trail=trail))

# ==========================================================================
#  PRÉ-RENDU DU COMPARATEUR
# ==========================================================================
# Le tableau était rempli par obs.js : sans exécution JavaScript, un robot
# d'indexation ne voyait qu'un <tbody> vide. On rend donc les lignes et leur
# détail côté serveur, dans EXACTEMENT le même balisage que rowHTML() /
# detailHTML() d'obs.js, et trié comme l'état initial du script (note
# décroissante). Au chargement, render() réécrit un contenu identique :
# le contenu est indexable sans JS, et interactif avec.

def _pct(v):
    if v is None:
        return "—"
    return f"{v*100:.2f}".rstrip("0").rstrip(".").replace(".", ",") + " %"

def _pct0(v):
    return "—" if v is None else f"{round(v*100)} %"

def _stars(n):
    return "".join("★" if i <= n else "<i>★</i>" for i in range(1, 6))

def detail_html(p):
    ul = p.get("sous_jacent_detail") or p["sous_jacent"]
    if p["b_autocall"] is None:
        rappel = "—"
    else:
        rappel = _pct0(p["b_autocall"])
        if p.get("decrement"):
            d = f'{p["decrement"]*100:.1f}'.rstrip("0").rstrip(".").replace(".", ",")
            rappel += f" puis −{d} pt / constatation"
        else:
            rappel += " (constant)"
    attention = "".join(f'<li style="margin-bottom:6px">{e(html.unescape(a))}</li>'
                        for a in p["attention"])
    return (
      '<div class="detail">'
        '<div>'
          '<h4>Mécanisme</h4>'
          f'<p class="small">{e(html.unescape(p["mecanisme"]))}</p>'
          '<h4 style="margin-top:22px">Caractéristiques</h4>'
          '<dl class="dl">'
            f'<dt>Émetteur</dt><dd>{e(html.unescape(p["emetteur"]))}</dd>'
            f'<dt>Garant / format</dt><dd>{e(html.unescape(p["format"]))}</dd>'
            f'<dt>Sous-jacent</dt><dd>{e(html.unescape(ul))}</dd>'
            f'<dt>Devise</dt><dd>{e(p["devise"])}</dd>'
            f'<dt>Maturité maximale</dt><dd>{p["maturite"]} ans</dd>'
            f'<dt>Fréquence de constatation</dt><dd>{e(html.unescape(p["frequence"]))}</dd>'
            f'<dt>Période de non-rappel</dt><dd>{(str(p["non_call"]) + " mois") if p["non_call"] else "Aucune"}</dd>'
            f'<dt>Seuil de rappel</dt><dd>{rappel}</dd>'
            f'<dt>Barrière de coupon</dt><dd>{_pct0(p["b_coupon"])}</dd>'
            f'<dt>Barrière de capital</dt><dd>{"Capital protégé" if p["b_capital"] is None else _pct0(p["b_capital"]) + " — constatée à l’échéance"}</dd>'
            f'<dt>Effet mémoire</dt><dd>{"Oui" if p["memoire"] else "Non"}</dd>'
            f'<dt>Enveloppes</dt><dd>{e(" · ".join(p["enveloppes"]))}</dd>'
            f'<dt>Indicateur de risque</dt><dd>SRI {p["sri"]} / 7</dd>'
            f'<dt>Frais de distribution</dt><dd>{e(html.unescape(p["frais"]))}</dd>'
          '</dl>'
        '</div>'
        '<div>'
          '<h4>Scénarios à l’échéance</h4>'
          '<div class="scen">'
            f'<div class="scen__row"><b>Favorable</b><span>{e(html.unescape(p["sc_fav"]))}</span></div>'
            f'<div class="scen__row"><b>Médian</b><span>{e(html.unescape(p["sc_med"]))}</span></div>'
            f'<div class="scen__row"><b>Défavorable</b><span>{e(html.unescape(p["sc_def"]))}</span></div>'
          '</div>'
          '<h4 style="margin-top:22px">Points d’attention</h4>'
          f'<ul class="small" style="padding-left:18px;margin:0">{attention}</ul>'
          '<p class="xsmall muted" style="margin-top:18px;margin-bottom:0">Le détail '
          'contractuel figure dans le prospectus et le document d’informations clés (DIC) '
          'de l’émetteur, seuls documents faisant foi.</p>'
        '</div>'
      '</div>')

def rows_prerendered():
    """Lignes du comparateur, triées comme l'état initial d'obs.js."""
    ordre = sorted(range(len(PRODUITS)), key=lambda i: -PRODUITS[i]["note"])
    out = []
    for i in ordre:
        p = PRODUITS[i]
        bk = ('<span class="tag tag--pos">Protégé</span>' if p["b_capital"] is None
              else _pct0(p["b_capital"]))
        out.append(
          f'<tr class="row-main" data-i="{i}" tabindex="0" role="button" aria-expanded="false">'
            '<td class="num-cell"><span class="rowtoggle">›</span></td>'
            f'<td><div class="t-name">{e(html.unescape(p["nom"]))}</div>'
            f'<div class="t-sub">{e(html.unescape(p["famille"]))} · {e(html.unescape(p["sous_jacent"]))}</div></td>'
            f'<td>{e(html.unescape(p["emetteur"]))}<div class="t-sub">{e(p["emetteur_rating"])}</div></td>'
            f'<td class="num-cell"><span class="coupon">{_pct(p["coupon"])}</span>'
            f'<div class="t-sub">{e(html.unescape(p["frequence"]))}</div></td>'
            f'<td class="num-cell">{_pct0(p["b_coupon"])}</td>'
            f'<td class="num-cell">{bk}</td>'
            f'<td class="num-cell">{p["maturite"]} ans</td>'
            f'<td class="num-cell">{e(p["devise"])}</td>'
            f'<td><span class="stars" title="{p["note"]} / 5">{_stars(p["note"])}</span></td>'
          '</tr>'
          f'<tr class="row-detail is-hidden" data-d="{i}" hidden><td colspan="9">'
          f'{detail_html(p)}</td></tr>')
    return "\n".join(out)

def cards_prerendered():
    """Équivalent mobile, pour que le contenu reste lisible sans JS."""
    ordre = sorted(range(len(PRODUITS)), key=lambda i: -PRODUITS[i]["note"])
    out = []
    for i in ordre:
        p = PRODUITS[i]
        out.append(
          '<article class="pcard">'
            '<div class="pcard__top">'
              f'<div><div class="t-name">{e(html.unescape(p["nom"]))}</div>'
              f'<div class="t-sub">{e(html.unescape(p["emetteur"]))} · {e(html.unescape(p["famille"]))}</div></div>'
              f'<div style="text-align:right"><div class="pcard__c">{_pct(p["coupon"])}</div>'
              f'<div class="t-sub">{e(html.unescape(p["frequence"]))}</div></div>'
            '</div>'
            '<div class="pcard__g">'
              f'<div><span>Sous-jacent</span><br>{e(html.unescape(p["sous_jacent"]))}</div>'
              f'<div><span>Maturité</span><br>{p["maturite"]} ans</div>'
              f'<div><span>Barrière coupon</span><br>{_pct0(p["b_coupon"])}</div>'
              f'<div><span>Barrière capital</span><br>'
              f'{"Protégé" if p["b_capital"] is None else _pct0(p["b_capital"])}</div>'
            '</div>'
            f'<div style="margin-top:14px"><span class="stars">{_stars(p["note"])}</span></div>'
            '<details style="margin-top:12px"><summary class="btn-link" style="cursor:pointer">'
            f'Voir le détail</summary>{detail_html(p)}</details>'
          '</article>')
    return "\n".join(out)

# ==========================================================================
#  SEO TECHNIQUE — sitemap, robots, redirections, page 404
# ==========================================================================
PAGES_INDEXABLES = [
    # (chemin, priorité, fréquence)
    ("index.html",            "1.0", "monthly"),
    ("produits.html",         "0.9", "weekly"),
    ("guides/index.html",     "0.8", "monthly"),
    ("comprendre.html",       "0.8", "monthly"),
    ("acteurs.html",          "0.7", "monthly"),
    ("methodologie.html",     "0.5", "yearly"),
    ("mentions-legales.html", "0.2", "yearly"),
]

def build_sitemap():
    urls = []
    for path, prio, freq in PAGES_INDEXABLES:
        urls.append((url_abs(path), MAJ_ISO, freq, prio))
    for g in GUIDES:
        urls.append((url_abs(f'guides/{g["slug"]}/index.html'), g["maj"], "monthly", "0.7"))
    body = "\n".join(
        f"  <url>\n    <loc>{e(u)}</loc>\n    <lastmod>{d}</lastmod>\n"
        f"    <changefreq>{f}</changefreq>\n    <priority>{p}</priority>\n  </url>"
        for u, d, f, p in urls)
    write("sitemap.xml",
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + body + "\n</urlset>\n")
    return len(urls)

def build_robots():
    """robots.txt du sous-dossier, utile si le Comptoir devient autonome.
    ⚠️ Sur un hébergement partagé avec le site principal, seul le robots.txt
    placé À LA RACINE du domaine fait foi : voir le README pour la ligne
    Sitemap à y ajouter."""
    write("robots.txt",
          "# Le Comptoir des Structurés\n"
          "User-agent: *\n"
          "Allow: /\n\n"
          f"Sitemap: {url_abs('')}sitemap.xml\n")

def build_htaccess():
    """Apache (Hostinger) : redirections 301 des anciennes URL, compression,
    cache des ressources statiques et page 404."""
    anciennes = [
        ("familles.html",       "comprendre.html#familles"),
        ("glossaire.html",      "comprendre.html#glossaire"),
        ("emetteurs.html",      "acteurs.html#emetteurs"),
        ("etablissements.html", "acteurs.html#etablissements"),
    ]
    red = "\n".join(
        f"  Redirect 301 {BASE_PATH}/{a} {url_abs(b.split('#')[0])}"
        + ("#" + b.split("#")[1] if "#" in b else "")
        for a, b in anciennes)
    write(".htaccess", f"""# =========================================================================
#  Le Comptoir des Structurés — configuration Apache (Hostinger)
#  Ce fichier ne concerne que le dossier {BASE_PATH}/ et n'affecte pas
#  le reste du site.
# =========================================================================

# --- Page d'erreur ------------------------------------------------------
ErrorDocument 404 {BASE_PATH}/404.html

# --- Redirections 301 : pages fusionnées en onglets ---------------------
<IfModule mod_alias.c>
{red}
</IfModule>

# --- Compression --------------------------------------------------------
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml
  AddOutputFilterByType DEFLATE application/javascript application/json
  AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>

# --- Cache navigateur ---------------------------------------------------
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html                 "access plus 1 hour"
  ExpiresByType text/css                  "access plus 7 days"
  ExpiresByType application/javascript    "access plus 7 days"
  ExpiresByType font/woff2                "access plus 1 year"
  ExpiresByType image/svg+xml             "access plus 30 days"
  ExpiresByType image/png                 "access plus 30 days"
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "\\.woff2$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# --- Types MIME ---------------------------------------------------------
<IfModule mod_mime.c>
  AddType font/woff2 .woff2
  AddType application/xml .xml
</IfModule>
""")

def page_404():
    pfx = ""
    body = f"""
{hero("Page introuvable",
  "Cette adresse ne correspond à aucune page du Comptoir des Structurés. "
  "Le contenu a peut-être été réorganisé.",
  crumb_html=fil([("Accueil", "index.html"), ("Page introuvable", "404.html")], pfx))}

<section class="section">
  <div class="container container--mid">
    <h2 class="title-md">Où aller maintenant</h2>
    <hr class="rule">
    <div class="cards" style="margin-top:26px">
      <a class="card linkcard" href="{pfx}produits.html">
        <p class="card__k">Comparateur</p>
        <h3 class="card__t">Comparer les structures</h3>
        <p class="small muted">Coupons, barrières, maturités et émetteurs, avec le détail de
        chaque mécanisme.</p>
      </a>
      <a class="card linkcard" href="{pfx}guides/">
        <p class="card__k">Guides</p>
        <h3 class="card__t">Les {len(GUIDES)} guides</h3>
        <p class="small muted">Autocall, Phoenix, barrières, fiscalité, risques : un guide
        par mécanisme.</p>
      </a>
      <a class="card linkcard" href="{pfx}comprendre.html">
        <p class="card__k">Guide complet</p>
        <h3 class="card__t">Comprendre en une page</h3>
        <p class="small muted">La pédagogie, les familles de produits et le glossaire,
        réunis.</p>
      </a>
    </div>
  </div>
</section>
"""
    html_404 = layout("404.html", "Page introuvable | Le Comptoir des Structurés",
                      "Cette page n’existe pas ou a été déplacée. Accédez au comparateur, "
                      "aux guides ou au glossaire des produits structurés.", body)
    # Une page d'erreur ne doit pas être indexée.
    html_404 = html_404.replace(
        '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">',
        '<meta name="robots" content="noindex, follow">')
    write("404.html", html_404)

if __name__ == "__main__":
    main()
