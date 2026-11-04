#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur statique — « L'Observatoire des Produits Structurés ».

    python3 build-observatoire.py

Produit les pages HTML dans observatoire/ et le jeu de données
observatoire/assets/data.js consommé par le comparateur.
Un gabarit unique garantit l'homogénéité en-tête / pied de page.

Les feuilles obs.css / obs.js sont écrites à la main (non régénérées ici).
"""
import os, html, json, datetime, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "observatoire")

SITE = "L’Observatoire des Produits Structurés"
SITE_SHORT = "L’Observatoire"
TAGLINE = "Référence indépendante du marché français"
EDITEUR = "La Financière de Rochechouart"
EMAIL = "contact@lfd-rochechouart.com"
ADDRESS = "58 rue de Monceau, 75008 Paris"
MAJ = "novembre 2025"           # date de dernière revue éditoriale
ANNEE_RATINGS = "octobre 2025"  # date de référence des notations citées

NAV = [
    ("index.html",        "Accueil"),
    ("produits.html",     "Le comparateur"),
    ("familles.html",     "Familles de produits"),
    ("emetteurs.html",    "Émetteurs"),
    ("etablissements.html", "Établissements"),
    ("comprendre.html",   "Comprendre"),
    ("glossaire.html",    "Glossaire"),
]

def e(s):
    return html.escape(str(s), quote=True)

# --------------------------------------------------------------------------
#  Gabarit
# --------------------------------------------------------------------------
def layout(filename, title, description, body, extra_js=""):
    nav = []
    for href, label in NAV:
        cls = ' class="is-active"' if href == filename else ""
        nav.append(f'<a href="{href}"{cls}>{e(label)}</a>')
    nav.append('<a class="nav__cta" href="../contact.html">Nous consulter</a>')
    nav_html = "\n      ".join(nav)

    full_title = title if title.startswith(SITE) else f"{title} — {SITE}"

    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<meta name="theme-color" content="#101C2B">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="{e(SITE)}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(description)}">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="../assets/img/favicon-16.png">
<link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="assets/obs.css">
</head>
<body>

<header class="hdr">
  <div class="container hdr__in">
    <a class="brand" href="index.html" aria-label="{e(SITE)} — accueil">
      <span class="brand__mark" aria-hidden="true">O</span>
      <span class="brand__txt">
        <span class="brand__name">{e(SITE_SHORT)}</span>
        <span class="brand__sub">Produits structurés</span>
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
      <h2 class="title-lg">Faire étudier un produit avant d’y souscrire</h2>
      <p style="margin:18px 0 0;max-width:560px">
        Lecture du document d’informations clés, analyse du sous-jacent et des barrières,
        comparaison avec les offres concurrentes du moment et vérification de la cohérence
        avec votre allocation : notre équipe réalise cette revue à vos côtés.
      </p>
    </div>
    <div class="cta__actions">
      <a class="btn btn--ghost-light" href="../contact.html">Prendre rendez-vous</a>
      <a class="btn btn--ghost-light" href="methodologie.html">Notre méthodologie</a>
    </div>
  </div>
</section>

<footer class="ftr">
  <div class="container">
    <div class="ftr__top">
      <div class="ftr__brand">
        <span class="brand">
          <span class="brand__mark" aria-hidden="true">O</span>
          <span class="brand__txt">
            <span class="brand__name">{e(SITE_SHORT)}</span>
            <span class="brand__sub">Produits structurés</span>
          </span>
        </span>
        <p>{e(TAGLINE)}. Un observatoire pédagogique du marché des produits
        structurés : familles, émetteurs, établissements de place et vocabulaire,
        réunis en un seul endroit.</p>
        <p class="xsmall" style="margin-top:14px">Une publication de
          <a href="../index.html">{e(EDITEUR)}</a>.</p>
      </div>
      <div>
        <h4>Le marché</h4>
        <ul>
          <li><a href="produits.html">Le comparateur</a></li>
          <li><a href="familles.html">Familles de produits</a></li>
          <li><a href="emetteurs.html">Émetteurs</a></li>
          <li><a href="etablissements.html">Établissements</a></li>
        </ul>
      </div>
      <div>
        <h4>Comprendre</h4>
        <ul>
          <li><a href="comprendre.html">Guide du produit structuré</a></li>
          <li><a href="comprendre.html#risques">Les risques</a></li>
          <li><a href="comprendre.html#fiscalite">Fiscalité &amp; enveloppes</a></li>
          <li><a href="glossaire.html">Glossaire</a></li>
        </ul>
      </div>
      <div>
        <h4>L’Observatoire</h4>
        <ul>
          <li><a href="methodologie.html">Méthodologie</a></li>
          <li><a href="mentions-legales.html">Mentions légales</a></li>
          <li><a href="../contact.html">Nous contacter</a></li>
          <li><a href="../index.html">{e(EDITEUR)}</a></li>
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
      <span>© <span data-year>2025</span> {e(EDITEUR)} — tous droits réservés.</span>
      <span>Dernière revue éditoriale : {e(MAJ)}.</span>
    </div>
  </div>
</footer>

<script src="assets/data.js"></script>
<script src="assets/obs.js"></script>{extra_js}
</body>
</html>
"""

def hero(title, lede, crumb=None, actions="", page=True):
    cr = ""
    if crumb:
        cr = f'<p class="crumb"><a href="index.html">{e(SITE_SHORT)}</a><span>/</span>{e(crumb)}</p>'
    cls = "hero hero--page" if page else "hero"
    act = f'<div class="hero__actions">{actions}</div>' if actions else ""
    return f"""<section class="{cls}">
  <div class="hero__grid" aria-hidden="true"></div>
  <div class="container hero__in">
    {cr}
    <h1 class="title-xl">{title}</h1>
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
  slug="indice-decrement", nom="Produit sur indice décrément", profil="Sous-jacent synthétique",
  filtre=("sous-jacent", "Indice décrément"),
  resume="Le sous-jacent n’est pas un indice de marché classique mais un indice construit, auquel on retranche un dividende forfaitaire chaque année. C’est le socle de la majorité des structures distribuées en France.",
  mecanisme=[
    "Un indice décrément reproduit un panier d’actions en réinvestissant les dividendes réels, puis en déduisant un prélèvement fixe : soit un pourcentage annuel (par exemple 5 % par an), soit un montant en points d’indice (par exemple 50 points par an).",
    "L’émetteur connaît ainsi à l’avance le flux de dividendes, ce qui lui permet d’offrir des coupons et des barrières plus généreux. La contrepartie est mécanique : si les dividendes réels du panier sont inférieurs au décrément, l’indice progresse structurellement moins vite que l’indice de référence classique. Le décrément en points est particulièrement pénalisant lorsque l’indice baisse, puisque le prélèvement reste constant en valeur absolue.",
  ],
  pour="Investisseur qui comprend que le niveau de coupon affiché est financé par la mécanique de décrément et qui l’accepte en connaissance de cause.",
  plus=["Permet des coupons et des barrières nettement plus attractifs",
        "Volatilité souvent inférieure à celle d’un mono sous-jacent action",
        "Diversification sectorielle ou géographique dans un seul sous-jacent"],
  moins=["Écart de performance croissant avec l’indice classique au fil du temps",
         "Décrément exprimé en points : effet d’autant plus lourd que l’indice baisse",
         "Indices souvent jeunes : historiques réels courts, le reste étant du backtest"],
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
# IMPORTANT — Nature des données.
# Ce catalogue recense des GABARITS DE STRUCTURES représentatifs de ce qui se
# traite sur le marché français : chaque entrée décrit une combinaison
# famille / sous-jacent / barrières / maturité et un niveau de coupon
# cohérent avec les conditions de marché de la période indiquée par MAJ.
# Ce ne sont PAS des souches réelles en cours de commercialisation : aucun
# code ISIN n'est publié et les conditions définitives d'une émission ne sont
# connues qu'au moment du strike, dans le DIC et le prospectus de l'émetteur.
# Pour publier des offres réellement ouvertes, remplacer ce bloc par les
# termsheets du moment (voir README du dossier observatoire/).

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

PRODUITS = [
 P("Phoenix Mémoire 10 ans — grand indice européen décrément", "Phoenix à coupon mémoire",
   "BNP Paribas", "A+ / Aa3 / A+", "Indice européen décrément 50 pts", "Indice décrément",
   0.082, "Trimestrielle", 0.60, 0.60, 1.00, 10, 5, decrement=None, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Constatation trimestrielle. Coupon de 2,05 % par trimestre versé si l’indice clôture au-dessus de 60 % de son niveau initial, avec effet mémoire intégral. Rappel automatique au nominal majoré des coupons dès que l’indice atteint 100 % de son niveau initial, à partir du 4e trimestre. À l’échéance, capital remboursé intégralement si l’indice est au-dessus de 60 %.",
   sc_fav="Rappel dès la fin de la première année : 8,20 % de gain, capital restitué, produit clôturé.",
   sc_med="Aucun rappel, indice à 85 % à l’échéance : coupons encaissés sur toute la période, capital remboursé à 100 %.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital, sans amortisseur, coupons déjà perçus conservés.",
   attention=["La barrière de 60 % est constatée uniquement à l’échéance, ce qui autorise de longs passages sous ce seuil sans conséquence définitive.",
              "Le décrément de 50 points par an pèse d’autant plus lourd que l’indice baisse : exprimé en pourcentage, le prélèvement augmente mécaniquement.",
              "Sur 10 ans, un gain plafonné à 8,20 % par an prive l’investisseur d’un marché actions franchement haussier."],
   tags=("mémoire", "défensif", "indice maison")),

 P("Autocall Phoenix 12 ans — indice européen décrément 5 %", "Autocall Phoenix",
   "Société Générale", "A / A1 / A-", "Indice européen décrément 5 %", "Indice décrément",
   0.091, "Trimestrielle", 0.70, 0.50, 1.00, 12, 4, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Coupon trimestriel de 2,275 % versé si l’indice est au-dessus de 70 % de son niveau initial, avec mémoire. Rappel au pair dès franchissement de 100 % à partir de la cinquième constatation. Barrière de capital très profonde à 50 % constatée à la seule date d’échéance.",
   sc_fav="Rappel au bout de 18 mois : environ 13,65 % de gain cumulé puis restitution du capital.",
   sc_med="Indice à 75 % à l’échéance : la totalité des coupons a été versée, le capital est remboursé à 100 %.",
   sc_def="Indice à 40 % à l’échéance : perte de 60 % du capital.",
   attention=["Maturité de 12 ans : il faut accepter une immobilisation potentiellement très longue du capital.",
              "La barrière de coupon à 70 % est plus haute que celle des structures à 60 % : les coupons sont interrompus plus tôt en cas de baisse.",
              "Un décrément de 5 % par an représente un handicap de performance considérable sur 12 ans face à l’indice de référence."],
   tags=("barrière profonde", "mémoire", "long terme")),

 P("Athéna 8 ans — CAC 40 décrément", "Athéna",
   "Crédit Agricole CIB", "A+ / Aa3 / A+", "CAC 40 décrément 50 pts", "Indice décrément",
   0.095, "Annuelle (capitalisé)", None, 0.60, 1.00, 8, 4, non_call=12,
   enveloppes=(AV, CTO, PER),
   mecanisme="Aucun coupon détaché en cours de vie. À chaque constatation annuelle, si l’indice est au-dessus de son niveau initial, le produit est remboursé au nominal majoré de 9,50 % par année écoulée. À l’échéance, remboursement intégral majoré du gain capitalisé si l’indice est au-dessus de 60 %.",
   sc_fav="Rappel à la deuxième constatation : 19 % de gain versé en une fois.",
   sc_med="Rappel à la septième année : 66,5 % de gain cumulé, soit une performance annualisée proche de 7,6 %.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % du capital, aucun gain n’ayant jamais été versé.",
   attention=["Structure sans aucun revenu intermédiaire : si l’indice reste durablement sous 100 %, rien n’est perçu avant l’échéance.",
              "Logique tout ou rien à l’arrivée : le passage sous 60 % anéantit huit années de rendement potentiel.",
              "La capitalisation ne joue qu’en cas de rappel ou de constatation finale favorable."],
   tags=("capitalisation", "sans coupon", "indice français")),

 P("Phoenix Airbag 10 ans — indice européen décrément", "Airbag &amp; Bonus",
   "Natixis", "A / A1 / A+", "Indice européen décrément 50 pts", "Indice décrément",
   0.074, "Trimestrielle", 0.60, 0.60, 1.00, 10, 5, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Phoenix mémoire classique assorti d’un mécanisme airbag : si l’indice termine sous 60 %, la perte n’est pas calculée depuis le niveau initial mais depuis la barrière. La baisse constatée est divisée par 0,60, ce qui supprime l’effet de seuil.",
   sc_fav="Rappel à la première année : 7,40 % de gain, capital restitué.",
   sc_med="Indice à 70 % à l’échéance : coupons intégralement versés, capital remboursé à 100 %.",
   sc_def="Indice à 55 % à l’échéance : perte limitée à environ 8,3 % grâce à l’airbag, contre 45 % sur une barrière sèche.",
   attention=["Le coupon est inférieur d’environ un point à une structure identique sans airbag : c’est le prix de l’amortisseur.",
              "L’airbag atténue la perte mais ne l’élimine pas : une chute de l’indice à 30 % entraîne encore une perte de 50 %.",
              "Vérifier dans le DIC la formule exacte de l’airbag, les modalités variant d’un émetteur à l’autre."],
   tags=("airbag", "mémoire", "protection renforcée")),

 P("Phoenix 6 ans — EuroStoxx Banks", "Autocall Phoenix",
   "J.P. Morgan", "A- / A1 / AA-", "Indice sectoriel bancaire européen", "Indice sectoriel",
   0.108, "Semestrielle", 0.65, 0.55, 1.00, 6, 3, non_call=6, memoire=True, sri=6,
   enveloppes=(AV, CTO),
   mecanisme="Coupon semestriel de 5,40 % conditionné à un indice au-dessus de 65 %, avec mémoire. Rappel possible dès la première constatation semestrielle. Barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à six mois : 5,40 % de gain sur une immobilisation d’un semestre.",
   sc_med="Rappel en quatrième année : environ 43 % de gain cumulé.",
   sc_def="Indice à 40 % à l’échéance : perte de 60 % du capital.",
   attention=["Un indice sectoriel bancaire est beaucoup plus volatil qu’un indice diversifié : le coupon élevé rémunère ce risque réel.",
              "Forte sensibilité au cycle de taux et au risque systémique du secteur financier.",
              "Concentration sectorielle à mettre en regard du reste du portefeuille, souvent déjà exposé aux financières."],
   tags=("sectoriel", "coupon élevé", "volatilité")),

 P("Phoenix 8 ans — panier Worst-of 3 indices mondiaux", "Autocall Phoenix",
   "Goldman Sachs", "BBB+ / A2 / A", "Worst-of 3 indices (Europe, États-Unis, Japon)", "Panier Worst-of",
   0.118, "Trimestrielle", 0.65, 0.55, 1.00, 8, 3, non_call=12, memoire=True, sri=6,
   enveloppes=(AV, CTO),
   mecanisme="Toutes les conditions sont appréciées sur le moins performant des trois indices du panier. Coupon trimestriel de 2,95 % si ce plus mauvais indice est au-dessus de 65 %, avec mémoire. Rappel lorsque les trois indices sont simultanément au-dessus de 100 %.",
   sc_fav="Les trois indices progressent de concert : rappel au bout d’un an, 11,80 % de gain.",
   sc_med="Deux indices montent, le troisième stagne à 80 % : coupons versés mais aucun rappel avant l’échéance.",
   sc_def="Un seul indice chute à 45 % : perte de 55 % du capital, quelle que soit la performance des deux autres.",
   attention=["Le mécanisme Worst-of est le plus mal compris du marché : la diversification apparente du panier augmente en réalité le risque, puisque seul le plus mauvais compte.",
              "Plus le panier compte de composantes, plus la probabilité qu’au moins une sous-performe est élevée.",
              "Le coupon très élevé est la contrepartie directe de cette asymétrie, non le signe d’une bonne affaire."],
   tags=("worst-of", "coupon élevé", "complexe")),

 P("Reverse Convertible 3 ans — grande valeur européenne", "Reverse Convertible",
   "UniCredit", "BBB+ / Baa1 / BBB+", "Action européenne de premier rang", "Action",
   0.126, "Trimestrielle", None, 0.80, None, 3, 2, sri=7,
   enveloppes=(CTO,),
   mecanisme="Coupon trimestriel de 3,15 % versé sans aucune condition de barrière, quelle que soit l’évolution de l’action. À l’échéance, remboursement au pair si l’action est au-dessus de 80 % de son niveau initial ; en dessous, l’investisseur subit la baisse constatée depuis le niveau initial.",
   sc_fav="Action stable ou en hausse : 37,80 % de coupons sur trois ans, capital restitué.",
   sc_med="Action à 85 % à l’échéance : coupons encaissés, capital remboursé à 100 %.",
   sc_def="Action à 50 % à l’échéance : perte de 50 % du capital, partiellement compensée par les coupons perçus.",
   attention=["Protection faible : une barrière à 80 % laisse très peu de marge sur un mono sous-jacent action.",
              "Risque spécifique d’entreprise : un profit warning ou un litige peut faire chuter l’action indépendamment du marché.",
              "Aucun rappel anticipé : le capital reste exposé jusqu’à l’échéance.",
              "Notation de l’émetteur en catégorie BBB : le risque de crédit s’ajoute au risque actions."],
   tags=("coupon garanti", "mono sous-jacent", "risque élevé")),

 P("Capital garanti 6 ans — participation indice européen", "Capital protégé ou garanti",
   "Crédit Agricole CIB", "A+ / Aa3 / A+", "Indice européen large", "Indice classique",
   None, "Aucun coupon", None, None, None, 6, 4, sri=2,
   enveloppes=(AV, CTO, PER),
   frais="Frais de structuration intégrés au prix d’émission, détaillés dans le DIC",
   mecanisme="Remboursement de 100 % du nominal à l’échéance quelle que soit l’évolution de l’indice, sous réserve de la solvabilité de l’émetteur. S’y ajoute 60 % de la performance positive de l’indice, mesurée en moyenne sur les douze derniers mois, dans la limite d’un plafond de gain de 30 %.",
   sc_fav="Indice en hausse de 60 % : gain plafonné à 30 %, soit 4,5 % par an.",
   sc_med="Indice en hausse de 20 % : gain de 12 %, soit environ 1,9 % par an.",
   sc_def="Indice en baisse de 40 % : capital remboursé à 100 %, aucun gain, coût d’opportunité de six ans.",
   attention=["La garantie ne vaut qu’à l’échéance : une sortie anticipée se fait au prix de marché, qui peut être inférieur au nominal.",
              "La garantie porte sur l’engagement de l’émetteur, pas sur un dépôt : un défaut de celui-ci la rend inopérante.",
              "La moyenne des douze derniers mois réduit la performance restituée en cas de marché haussier jusqu’à l’échéance."],
   tags=("capital garanti", "trésorerie", "prudent")),

 P("Participation 5 ans — call spread indice européen", "Produit de participation",
   "BNP Paribas", "A+ / Aa3 / A+", "Indice européen large", "Indice classique",
   None, "Aucun coupon", None, 0.80, None, 5, 4, sri=4,
   enveloppes=(AV, CTO, PER),
   mecanisme="Aucun coupon. À l’échéance, l’investisseur reçoit 150 % de la performance positive de l’indice, plafonnée à 45 % de gain. Le capital est remboursé intégralement tant que l’indice n’a pas baissé de plus de 20 % ; en dessous, la perte est égale à la baisse constatée.",
   sc_fav="Indice en hausse de 30 % : gain de 45 % atteint, soit 7,7 % par an.",
   sc_med="Indice en hausse de 10 % : gain de 15 %, soit environ 2,8 % par an.",
   sc_def="Indice en baisse de 35 % : perte de 35 % du capital.",
   attention=["Le levier de 150 % ne joue que dans la fourchette de gain : au-delà du plafond, il n’apporte plus rien.",
              "Protection de 20 % seulement : plus faible que celle des structures de rendement à barrière.",
              "Les dividendes de l’indice ne sont pas reversés, ce qui constitue un manque à gagner significatif sur cinq ans."],
   tags=("participation", "levier", "croissance")),

 P("Participation Lock-in 8 ans — indice mondial", "Produit de participation",
   "Morgan Stanley", "A- / A1 / A", "Indice mondial actions", "Indice classique",
   None, "Annuelle (cliquet)", None, 0.70, None, 8, 4, sri=4,
   enveloppes=(AV, CTO),
   mecanisme="Mécanisme de cliquet : chaque fois que l’indice franchit un palier de 10 % à une date de constatation annuelle, ce niveau de gain est définitivement acquis. À l’échéance, l’investisseur reçoit le plus élevé entre le dernier palier verrouillé et la performance finale, sous réserve d’un indice au-dessus de 70 % pour le remboursement du capital.",
   sc_fav="L’indice atteint 150 % puis redescend à 90 % : le palier de 50 % reste acquis.",
   sc_med="L’indice plafonne à 118 % : palier de 10 % verrouillé, gain de 10 % sur huit ans.",
   sc_def="L’indice n’a jamais atteint 110 % et termine à 60 % : perte de 40 % du capital.",
   attention=["L’intérêt du cliquet dépend entièrement du parcours : un marché régulièrement haussier n’en tire aucun avantage particulier.",
              "Les paliers sont constatés à dates fixes : un pic atteint entre deux constatations ne compte pas.",
              "Maturité longue pour une structure sans aucun revenu intermédiaire."],
   tags=("lock-in", "cliquet", "croissance")),

 P("Phoenix 10 ans — thématique énergies &amp; infrastructures", "Phoenix à coupon mémoire",
   "Barclays", "BBB+ / Baa1 / A", "Indice thématique infrastructures décrément", "Indice thématique",
   0.098, "Trimestrielle", 0.60, 0.55, 1.00, 10, 3, non_call=12, memoire=True,
   enveloppes=(AV, CTO),
   mecanisme="Coupon trimestriel de 2,45 % conditionné à un indice thématique au-dessus de 60 %, avec mémoire. Rappel au pair dès 100 %. Barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à 18 mois : 14,70 % de gain cumulé.",
   sc_med="Indice à 80 % à l’échéance : coupons versés, capital remboursé intégralement.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital.",
   attention=["Les indices thématiques affichent des historiques très courts : la performance antérieure à leur lancement est reconstituée par calcul, non observée.",
              "Concentration sectorielle élevée, donc volatilité supérieure à celle d’un indice diversifié.",
              "Notation de l’émetteur la plus basse du panel des grandes signatures : à doser dans l’allocation."],
   tags=("thématique", "mémoire", "historique court")),

 P("Athéna Trigger dégressif 10 ans — indice européen décrément", "Athéna",
   "Société Générale", "A / A1 / A-", "Indice européen décrément 50 pts", "Indice décrément",
   0.088, "Semestrielle (capitalisé)", None, 0.60, 1.00, 10, 4,
   decrement=0.05, non_call=12,
   enveloppes=(AV, CTO, PER),
   mecanisme="Seuil de rappel dégressif : fixé à 100 % lors de la première constatation, il baisse de 5 points à chaque constatation semestrielle suivante, jusqu’à 55 % en fin de vie. Le gain capitalisé de 8,80 % par an est versé au moment du rappel.",
   sc_fav="Rappel à un an : 8,80 % de gain versé en une fois.",
   sc_med="Rappel en sixième année grâce au seuil descendu à 75 % : environ 52,8 % de gain cumulé.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % du capital, aucun gain versé.",
   attention=["Le seuil dégressif augmente nettement la probabilité de rappel : c’est l’atout principal de cette variante.",
              "En contrepartie, le rappel peut intervenir alors que l’indice est très inférieur à son niveau d’origine, ce qui met fin au produit sans possibilité de rattrapage.",
              "Aucun revenu intermédiaire pendant toute la durée de vie."],
   tags=("trigger dégressif", "capitalisation", "probabilité de rappel")),

 P("Phoenix 7 ans — indice américain décrément", "Autocall Phoenix",
   "Bank of America", "A- / A1 / AA-", "Indice américain décrément", "Indice décrément",
   0.086, "Trimestrielle", 0.65, 0.60, 1.00, 7, 4, devise="USD", non_call=12, memoire=True,
   enveloppes=(AV, CTO),
   mecanisme="Structure Phoenix mémoire libellée en dollar. Coupon trimestriel de 2,15 % si l’indice est au-dessus de 65 %, rappel au pair dès 100 %, barrière de capital à 60 % à l’échéance.",
   sc_fav="Rappel à un an : 8,60 % de gain en dollar, hors effet de change.",
   sc_med="Indice à 90 % à l’échéance : coupons versés, capital remboursé à 100 % en dollar.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % en dollar, aggravée ou atténuée par le change.",
   attention=["Produit en dollar : le risque de change s’ajoute intégralement au risque de marché et peut en inverser le résultat pour un investisseur en euro.",
              "Une version couverte en euro existe généralement, mais son coût de couverture réduit le coupon.",
              "Vérifier la devise de l’enveloppe d’accueil pour éviter une double conversion."],
   tags=("dollar", "risque de change", "mémoire")),

 P("Produit de taux callable 10 ans — taux fixe", "Produits de taux",
   "ING", "A+ / A1 / A+", "Taux fixe, option de rappel émetteur", "Taux",
   0.042, "Annuelle", None, None, None, 10, 4, sri=3,
   enveloppes=(CTO, AV),
   frais="Frais inclus dans le prix d’émission, détaillés dans le DIC",
   mecanisme="Coupon annuel fixe de 4,20 % versé sans condition. L’émetteur dispose du droit de rappeler le titre au pair à chaque date anniversaire à partir de la deuxième année. Capital remboursé à 100 % à l’échéance ou au rappel.",
   sc_fav="Les taux montent, l’émetteur ne rappelle pas : 4,20 % par an pendant dix ans.",
   sc_med="Rappel en cinquième année après une baisse des taux : 21 % de gain cumulé, puis réinvestissement à des conditions moins favorables.",
   sc_def="Rappel dès la deuxième année : 8,40 % perçus, et le capital doit être replacé sur un marché devenu moins rémunérateur.",
   attention=["L’option de rappel appartient à l’émetteur et sera exercée dans son intérêt, donc contre celui de l’investisseur.",
              "Le risque principal n’est pas la perte en capital mais le risque de réinvestissement.",
              "La valeur de marché en cours de vie est très sensible aux mouvements de taux."],
   tags=("taux", "trésorerie", "capital protégé")),

 P("Range Accrual 5 ans — Euribor 3 mois", "Produits de taux",
   "Deutsche Bank", "A / A1 / A", "Euribor 3 mois, fourchette 0 % – 4 %", "Taux",
   0.048, "Trimestrielle (prorata)", None, None, None, 5, 3, sri=3,
   enveloppes=(CTO,),
   frais="Frais inclus dans le prix d’émission, détaillés dans le DIC",
   mecanisme="Le coupon annuel de 4,80 % est acquis au prorata du nombre de jours pendant lesquels l’Euribor 3 mois reste dans la fourchette définie. Chaque journée hors fourchette ne génère aucun intérêt. Capital remboursé à 100 % à l’échéance.",
   sc_fav="Euribor dans la fourchette toute l’année : 4,80 % perçus.",
   sc_med="Euribor hors fourchette un quart du temps : environ 3,60 % perçus.",
   sc_def="Euribor durablement au-dessus de 4 % : coupon proche de zéro, capital néanmoins remboursé.",
   attention=["Le rendement dépend d’un pari sur la trajectoire des taux courts, pas sur les actions.",
              "Aucune perte en capital à l’échéance, mais un rendement potentiellement nul sur cinq ans.",
              "Structure peu adaptée si l’investisseur n’a pas de vue construite sur la politique monétaire."],
   tags=("taux", "range accrual", "capital protégé")),

 P("CLN 5 ans — signature corporate investment grade", "Credit Linked Note (CLN)",
   "Citigroup", "BBB+ / A3 / A", "Signature corporate européenne notée BBB", "Crédit",
   0.058, "Annuelle", None, None, None, 5, 3, sri=5,
   enveloppes=(CTO,),
   mecanisme="Coupon annuel fixe de 5,80 % tant qu’aucun événement de crédit n’affecte la signature de référence. Capital remboursé à 100 % à l’échéance en l’absence d’événement. En cas d’événement de crédit, remboursement limité au taux de recouvrement constaté sur la dette de la référence.",
   sc_fav="Aucun événement de crédit : 29 % de coupons sur cinq ans et capital restitué.",
   sc_med="Dégradation de la notation sans défaut : coupons versés normalement, valeur de marché en baisse en cours de vie.",
   sc_def="Défaut de la référence en troisième année : remboursement au taux de recouvrement, souvent compris entre 20 % et 40 % du nominal.",
   attention=["Deux risques de crédit se cumulent : celui de l’émetteur du titre et celui de la signature de référence.",
              "La perte en cas de défaut est brutale et sans rapport avec les marchés actions.",
              "Réservé à un investisseur capable d’analyser lui-même la solidité de la signature de référence."],
   tags=("crédit", "obligataire", "défaut")),

 P("Phoenix 10 ans — ESG indice européen décrément", "Phoenix à coupon mémoire",
   "BNP Paribas", "A+ / Aa3 / A+", "Indice européen ISR décrément", "Indice ESG",
   0.079, "Trimestrielle", 0.60, 0.60, 1.00, 10, 4, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Phoenix mémoire sur un indice appliquant des filtres extra-financiers au sein d’un univers européen large. Coupon trimestriel de 1,975 % au-dessus de 60 %, rappel dès 100 %, barrière de capital à 60 % à l’échéance.",
   sc_fav="Rappel à un an : 7,90 % de gain.",
   sc_med="Indice à 85 % à l’échéance : coupons versés et capital remboursé intégralement.",
   sc_def="Indice à 50 % à l’échéance : perte de 50 % du capital.",
   attention=["Vérifier la méthodologie d’exclusion réelle de l’indice : l’intitulé ne suffit pas à qualifier la démarche.",
              "L’univers filtré est plus concentré, ce qui peut accroître la volatilité par rapport à l’indice large.",
              "Le décrément s’applique de la même manière que sur un indice classique : la mécanique de prélèvement reste le principal déterminant du coupon."],
   tags=("ESG", "mémoire", "indice maison")),

 P("Discount 2 ans — indice européen large", "Certificat Discount",
   "Vontobel", "Non noté / A2 / Non noté", "Indice européen large", "Indice classique",
   None, "Aucun coupon", None, None, None, 2, 3, sri=5,
   enveloppes=(CTO,),
   frais="Frais inclus dans la décote d’émission",
   mecanisme="Achat du certificat avec une décote de 12 % sur le niveau de l’indice. À l’échéance, remboursement égal au plus petit des deux montants entre la valeur de l’indice et le plafond fixé au niveau initial. Gain maximal de 13,6 %.",
   sc_fav="Indice stable ou en hausse : gain maximal de 13,6 % sur deux ans.",
   sc_med="Indice en baisse de 8 % : la décote absorbe la baisse, gain résiduel d’environ 4,5 %.",
   sc_def="Indice en baisse de 35 % : perte d’environ 26 %, la décote n’absorbant que les douze premiers pour cent.",
   attention=["La décote est la seule protection : au-delà, la perte est intégrale et proportionnelle.",
              "Gain strictement plafonné : aucune participation à une hausse marquée.",
              "Émetteur noté par une seule agence : la comparaison de signature demande de la prudence."],
   tags=("décote", "court terme", "gain plafonné")),

 P("Twin Win 4 ans — indice européen large", "Twin Win",
   "UBS", "A- / A3 / A", "Indice européen large", "Indice classique",
   None, "Aucun coupon", None, 0.65, None, 4, 3, sri=5,
   enveloppes=(CTO, AV),
   mecanisme="À l’échéance, une hausse de l’indice est restituée à 100 %. Une baisse est convertie en gain de même ampleur, tant que l’indice n’est jamais descendu sous 65 % de son niveau initial en constatation quotidienne. Si ce seuil est touché, l’investisseur subit la performance négative réelle.",
   sc_fav="Indice en baisse de 20 % sans jamais toucher 65 % : gain de 20 %.",
   sc_med="Indice en hausse de 15 % : gain de 15 %.",
   sc_def="Indice descendu à 60 % en cours de vie et terminant à 70 % : perte de 30 % du capital, le mécanisme s’étant éteint.",
   attention=["La barrière est constatée en continu : un seul passage sous le seuil, même sur une seule séance, annule définitivement le double sens.",
              "Sur quatre ans, la probabilité de toucher une barrière à 65 % en continu est loin d’être négligeable.",
              "Aucun coupon : le résultat n’est connu qu’à l’échéance."],
   tags=("double sens", "barrière continue", "volatilité")),

 P("Phoenix 8 ans — panier 4 actions européennes", "Autocall Phoenix",
   "HSBC", "A- / A3 / A+", "Worst-of 4 actions européennes", "Panier Worst-of",
   0.135, "Trimestrielle", 0.60, 0.50, 1.00, 8, 2, non_call=12, memoire=True, sri=7,
   enveloppes=(CTO,),
   mecanisme="Conditions appréciées sur la moins performante de quatre actions européennes. Coupon trimestriel de 3,375 % si cette action est au-dessus de 60 %, avec mémoire. Rappel lorsque les quatre actions sont simultanément au-dessus de 100 %.",
   sc_fav="Les quatre titres progressent : rappel au bout d’un an, 13,50 % de gain.",
   sc_med="Trois titres montent, le quatrième stagne à 75 % : coupons versés mais aucun rappel.",
   sc_def="Un titre chute à 35 % : perte de 65 % du capital, indépendamment des trois autres.",
   attention=["Worst-of sur actions individuelles : c’est le profil le plus risqué du marché des produits de rendement.",
              "Chaque action ajoutée augmente la probabilité d’un accident spécifique : un seul titre suffit à faire échouer le produit.",
              "Coupon de 13,5 % : un tel niveau est le signal d’un risque élevé, non d’une opportunité.",
              "SRI de 7 sur 7 : niveau de risque maximal de l’échelle réglementaire."],
   tags=("worst-of actions", "risque maximal", "coupon très élevé")),

 P("Phoenix 6 ans — indice émergents décrément", "Autocall Phoenix",
   "Nomura", "BBB+ / Baa1 / A-", "Indice marchés émergents décrément", "Indice géographique",
   0.102, "Trimestrielle", 0.65, 0.55, 1.00, 6, 3, non_call=12, memoire=True,
   enveloppes=(AV, CTO),
   mecanisme="Phoenix mémoire sur un indice émergent. Coupon trimestriel de 2,55 % au-dessus de 65 %, rappel dès 100 %, barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à un an : 10,20 % de gain.",
   sc_med="Indice à 80 % à l’échéance : coupons versés et capital remboursé.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital.",
   attention=["Volatilité structurellement supérieure à celle des indices développés, avec des phases de baisse plus profondes.",
              "Risque politique et risque de change intégrés au sous-jacent, même pour un produit libellé en euro.",
              "Émetteur de catégorie BBB sur un sous-jacent déjà risqué : le cumul mérite d’être mesuré."],
   tags=("émergents", "mémoire", "volatilité")),

 P("Capital protégé 8 ans — participation 100 % plafonnée", "Capital protégé ou garanti",
   "BNP Paribas", "A+ / Aa3 / A+", "Indice européen large", "Indice classique",
   None, "Aucun coupon", None, None, None, 8, 4, sri=2,
   enveloppes=(AV, CTO, PER),
   frais="Frais de structuration intégrés au prix d’émission, détaillés dans le DIC",
   mecanisme="Capital remboursé à 100 % à l’échéance, sous réserve de la solvabilité de l’émetteur, majoré de 100 % de la performance positive de l’indice dans la limite de 55 % de gain.",
   sc_fav="Indice en hausse de 80 % : gain plafonné à 55 %, soit environ 5,6 % par an.",
   sc_med="Indice en hausse de 25 % : gain de 25 %, soit environ 2,8 % par an.",
   sc_def="Indice en baisse de 50 % : capital remboursé intégralement, aucun gain sur huit ans.",
   attention=["Huit ans d’immobilisation pour une protection qui ne joue qu’à l’échéance.",
              "Les dividendes de l’indice ne sont pas reversés : sur huit ans, le manque à gagner est substantiel.",
              "La comparaison pertinente est celle d’une obligation de même émetteur et de même maturité, pas celle d’un livret."],
   tags=("capital garanti", "long terme", "prudent")),

 P("Phoenix 10 ans — indice immobilier coté décrément", "Phoenix à coupon mémoire",
   "Crédit Mutuel / CIC", "A+ / Aa3 / AA-", "Indice immobilier coté européen décrément", "Indice sectoriel",
   0.093, "Trimestrielle", 0.60, 0.55, 1.00, 10, 4, non_call=12, memoire=True,
   enveloppes=(AV, CTO, PER),
   mecanisme="Phoenix mémoire sur un indice de foncières cotées européennes. Coupon trimestriel de 2,325 % au-dessus de 60 %, rappel dès 100 %, barrière de capital à 55 % à l’échéance.",
   sc_fav="Rappel à 18 mois : 13,95 % de gain cumulé.",
   sc_med="Indice à 75 % à l’échéance : coupons versés, capital remboursé intégralement.",
   sc_def="Indice à 45 % à l’échéance : perte de 55 % du capital.",
   attention=["Les foncières cotées sont très sensibles aux taux longs : une remontée des taux pèse directement sur le sous-jacent.",
              "Le secteur a connu des corrections de grande ampleur, ce qui explique le niveau de coupon proposé.",
              "Attention au doublon si le portefeuille comporte déjà de l’immobilier physique ou des SCPI."],
   tags=("immobilier", "mémoire", "sensibilité taux")),

 P("Phoenix 12 ans — indice européen décrément, barrière 40 %", "Autocall Phoenix",
   "Banco Santander", "A+ / A2 / A-", "Indice européen décrément 50 pts", "Indice décrément",
   0.072, "Trimestrielle", 0.50, 0.40, 1.00, 12, 5, non_call=12, memoire=True, sri=5,
   enveloppes=(AV, CTO, PER),
   mecanisme="Structure très défensive : coupon trimestriel de 1,80 % dès que l’indice est au-dessus de 50 %, avec mémoire. Rappel au pair dès 100 %. Barrière de capital à 40 % seulement, constatée à l’échéance.",
   sc_fav="Rappel à un an : 7,20 % de gain.",
   sc_med="Indice à 60 % à l’échéance : coupons intégralement versés, capital remboursé à 100 %.",
   sc_def="Indice à 35 % à l’échéance : perte de 65 % du capital. Une baisse de cette ampleur sur douze ans reste historiquement rare sur un indice large.",
   attention=["Profil le plus prudent de la gamme de rendement, obtenu en abaissant le coupon à 7,20 %.",
              "Maturité de douze ans : horizon de placement très long à assumer.",
              "Une barrière à 40 % réduit fortement le risque de perte sans l’annuler, notamment en raison du décrément."],
   tags=("très défensif", "barrière 40 %", "long terme")),
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
          "/* Gabarits de structures représentatifs du marché, à titre pédagogique. */\n"
          "window.OBS_PRODUITS = " + payload + ";\n")
    write("assets/data.js", js)

# ==========================================================================
#  PAGE — ACCUEIL
# ==========================================================================
def page_index():
    # Sélection mise en avant : les mieux notés, un par famille
    best, seen = [], set()
    for p in sorted(PRODUITS, key=lambda x: -x["note"]):
        if p["famille"] in seen:
            continue
        seen.add(p["famille"])
        best.append(p)
        if len(best) == 5:
            break

    rows = []
    for p in best:
        cpn = "—" if p["coupon"] is None else f'{p["coupon"]*100:.2f}'.rstrip("0").rstrip(".").replace(".", ",") + " %"
        bk = "Protégé" if p["b_capital"] is None else f'{round(p["b_capital"]*100)} %'
        rows.append(f"""        <tr>
          <td><div class="t-name">{p["nom"]}</div><div class="t-sub">{p["emetteur"]}</div></td>
          <td><a class="tag tag--gold" href="familles.html#{FAM_SLUG[p["famille"]]}">{p["famille"]}</a></td>
          <td class="num-cell"><span class="coupon">{cpn}</span></td>
          <td class="num-cell">{bk}</td>
          <td class="num-cell">{p["maturite"]} ans</td>
        </tr>""")
    rows_html = "\n".join(rows)

    fam_cards = []
    for f in FAMILLES[:6]:
        fam_cards.append(f"""      <a class="card linkcard rv" href="familles.html#{f["slug"]}">
        <p class="card__k">{f["profil"]}</p>
        <h3 class="card__t">{f["nom"]}</h3>
        <p class="small muted">{f["resume"]}</p>
        <span class="card__more">Lire la fiche</span>
      </a>""")
    fam_html = "\n".join(fam_cards)

    emet_rows = []
    for em in EMETTEURS[:8]:
        emet_rows.append(f"""        <tr>
          <td><strong>{em["nom"]}</strong><div class="t-sub">{em["pays"]} · {em["zone"]}</div></td>
          <td class="num-cell">{em["sp"]}</td>
          <td class="num-cell">{em["moodys"]}</td>
          <td class="num-cell">{em["fitch"]}</td>
        </tr>""")
    emet_html = "\n".join(emet_rows)

    body = f"""
{hero(
  "Le marché des produits structurés, mis à plat.",
  "Familles de structures, émetteurs, établissements de place et vocabulaire : "
  "l’ensemble de ce qu’il faut comprendre avant de souscrire, réuni et expliqué "
  "sans raccourci commercial.",
  actions='<a class="btn btn--gold" href="produits.html">Ouvrir le comparateur</a>'
          '<a class="btn btn--ghost-light" href="comprendre.html">Comprendre en 10 minutes</a>',
  page=False)}

<section>
  <div class="container">
    <div class="stats">
      <div class="stat"><div class="stat__n">{len(FAMILLES)}</div><div class="stat__l">Familles décryptées</div></div>
      <div class="stat"><div class="stat__n">{len(EMETTEURS)}</div><div class="stat__l">Émetteurs analysés</div></div>
      <div class="stat"><div class="stat__n">{len(ETABLISSEMENTS)}</div><div class="stat__l">Établissements de place</div></div>
      <div class="stat"><div class="stat__n">{len(GLOSSAIRE)}</div><div class="stat__l">Définitions au glossaire</div></div>
    </div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="grid grid--2">
      <div class="cell">
        <p class="eyebrow">Notre parti pris</p>
        <h2 class="title-lg">Un produit structuré n’est ni un placement miracle,<br>ni un piège.</h2>
      </div>
      <div class="cell cell--ivory">
        <p class="lede">C’est un contrat. Un titre de créance émis par une banque, dont le
        remboursement est calculé selon une formule connue d’avance. Tout le sujet tient dans
        la lecture de cette formule : ce qu’elle promet, ce qu’elle plafonne, et ce qu’elle
        fait porter à l’investisseur.</p>
        <p>Un coupon de 12 % n’est pas une bonne nouvelle en soi : c’est le prix d’un risque
        que quelqu’un a accepté de prendre. Comprendre lequel, et décider si l’on veut le
        porter, voilà la seule question qui vaille. Cet observatoire existe pour y répondre.</p>
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
        <a class="card__more" href="emetteurs.html">Les émetteurs du marché</a>
      </div>
      <div class="card rv">
        <div class="num">2</div>
        <h3 class="card__t">Où sont les barrières</h3>
        <p class="small">Leur niveau compte, leur mode de constatation davantage encore. Une
        barrière à 65 % constatée tous les jours pendant huit ans n’a rien à voir avec la même
        barrière constatée un seul jour, à l’échéance.</p>
        <a class="card__more" href="glossaire.html#barriere-americaine">Européenne ou américaine</a>
      </div>
      <div class="card rv">
        <div class="num">3</div>
        <h3 class="card__t">Comment le coupon est financé</h3>
        <p class="small">Un coupon se paie toujours : par un plafond de gain, par un indice
        décrément qui prélève les dividendes, ou par un mécanisme Worst-of. Identifier la
        source, c’est comprendre le produit.</p>
        <a class="card__more" href="glossaire.html#indice-decrement">L’indice décrément</a>
      </div>
    </div>
  </div>
</section>

<section class="section section--mist">
  <div class="container">
    <p class="eyebrow">Le comparateur</p>
    <h2 class="title-lg">Les structures de référence du marché</h2>
    <p class="lede" style="max-width:640px;margin-top:18px">Vingt-quatre gabarits représentatifs,
    filtrables par famille, émetteur, sous-jacent, barrière et maturité, avec le détail des
    mécanismes et des scénarios pour chacun.</p>
    <div class="tablewrap" style="border-top:1px solid var(--line);margin-top:30px">
      <table class="tbl" style="min-width:720px">
        <thead><tr><th>Structure</th><th>Famille</th><th>Coupon annuel</th><th>Barrière capital</th><th>Maturité</th></tr></thead>
        <tbody>
{rows_html}
        </tbody>
      </table>
    </div>
    <div style="margin-top:28px"><a class="btn" href="produits.html">Voir les {len(PRODUITS)} structures</a></div>
  </div>
</section>

<section class="section">
  <div class="container">
    <p class="eyebrow">Familles de produits</p>
    <h2 class="title-lg">Douze structures, douze profils de risque</h2>
    <hr class="rule">
    <div class="cards" style="margin-top:34px">
{fam_html}
    </div>
    <div style="margin-top:30px"><a class="btn" href="familles.html">Les douze familles</a></div>
  </div>
</section>

<section class="section section--ivory">
  <div class="container">
    <div class="grid grid--2">
      <div class="cell">
        <p class="eyebrow">Émetteurs</p>
        <h2 class="title-md">La signature avant la formule</h2>
        <p class="small" style="margin-top:16px">Vingt-deux émetteurs actifs sur le marché
        français et européen, avec leur notation de crédit, leur profil de gamme et les points
        de vigilance propres à chacun.</p>
        <a class="card__more" href="emetteurs.html">Voir les fiches émetteurs</a>
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
    titre indicatif, telles que relevées en {ANNEE_RATINGS}. Elles évoluent : à revérifier auprès des agences.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="grid grid--3">
      <a class="cell linkcard" href="glossaire.html">
        <p class="card__k">Glossaire</p>
        <h3 class="card__t">{len(GLOSSAIRE)} définitions, sans jargon</h3>
        <p class="small muted">Autocall, décrément, Worst-of, airbag, bail-in, SRI, pull-to-par :
        tout le vocabulaire, expliqué avec les exemples chiffrés qui le rendent concret.</p>
        <span class="card__more">Ouvrir le glossaire</span>
      </a>
      <a class="cell linkcard" href="etablissements.html">
        <p class="card__k">Établissements</p>
        <h3 class="card__t">Qui fait quoi dans la chaîne</h3>
        <p class="small muted">Structureurs, plateformes, assureurs, distributeurs et régulateur :
        comprendre le rôle de chaque intervenant, et à quel niveau se joue la qualité du conseil.</p>
        <span class="card__more">Voir l’annuaire</span>
      </a>
      <a class="cell linkcard" href="methodologie.html">
        <p class="card__k">Méthodologie</p>
        <h3 class="card__t">Comment nous jugeons un produit</h3>
        <p class="small muted">Les six critères de notre grille d’analyse, ce que nous écartons
        systématiquement, et les limites que nous assumons dans cet exercice.</p>
        <span class="card__more">Lire la méthodologie</span>
      </a>
    </div>
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="notice">
      <span class="notice__i" aria-hidden="true">!</span>
      <div>
        <p><strong>Nature des informations publiées.</strong> Cet observatoire est un outil
        pédagogique. Les structures présentées dans le comparateur sont des gabarits de
        référence destinés à illustrer les mécanismes du marché : ce ne sont pas des souches
        réelles en cours de commercialisation, et aucun code ISIN n’est publié.</p>
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
        f"{SITE} — {TAGLINE}",
        "Comparateur de produits structurés, fiches émetteurs, annuaire des établissements de "
        "place et glossaire de 73 définitions. Un observatoire pédagogique et indépendant du "
        "marché français des produits structurés.",
        body))

# ==========================================================================
#  PAGE — COMPARATEUR
# ==========================================================================
def page_produits():
    th = [
        ("", "", False),
        ("Structure", "nom", True),
        ("Émetteur", "emetteur", True),
        ("Coupon annuel", "coupon", True),
        ("Barr. coupon", "b_coupon", True),
        ("Barr. capital", "b_capital", True),
        ("Maturité", "maturite", True),
        ("Devise", "devise", True),
        ("Note", "note", True),
    ]
    head = []
    for label, key, sortable in th:
        if not label:
            head.append('<th aria-hidden="true"></th>')
        elif sortable:
            head.append(f'<th class="sortable" data-k="{key}" scope="col" title="Trier par {label.lower()}">{label}<span class="arrow">⇅</span></th>')
        else:
            head.append(f'<th scope="col">{label}</th>')
    head_html = "\n            ".join(head)

    body = f"""
{hero("Le comparateur", 
  "Vingt-quatre gabarits de structures représentatifs du marché français, filtrables et "
  "triables selon les paramètres qui déterminent réellement le profil de risque. "
  "Cliquez sur une ligne pour en déplier le mécanisme, les scénarios et les points de vigilance.",
  crumb="Le comparateur")}

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
        <p>Les niveaux de coupon évoluent en permanence avec les taux et la volatilité.
        Pour connaître les offres réellement ouvertes à un instant donné,
        <a class="card__more" href="../contact.html" style="border:0;padding:0">consultez-nous</a>.</p>
      </div>
    </div>

    <form class="filters" role="search" aria-label="Filtrer les structures" onsubmit="return false">
      <div class="filters__row">
        <div class="field" style="grid-column:span 2">
          <label for="f-q">Recherche libre</label>
          <input type="search" id="f-q" placeholder="Phoenix, worst-of, décrément, dollar…" autocomplete="off">
        </div>
        <div class="field"><label for="f-fam">Famille</label><select id="f-fam"></select></div>
        <div class="field"><label for="f-emet">Émetteur</label><select id="f-emet"></select></div>
        <div class="field"><label for="f-sj">Type de sous-jacent</label><select id="f-sj"></select></div>
      </div>
      <div class="filters__row" style="margin-top:14px">
        <div class="field"><label for="f-cpn">Coupon minimum</label>
          <select id="f-cpn">
            <option value="">Indifférent</option>
            <option value="0.06">6 % et plus</option>
            <option value="0.08">8 % et plus</option>
            <option value="0.10">10 % et plus</option>
            <option value="0.12">12 % et plus</option>
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
        <tbody id="tbl-body"></tbody>
      </table>
    </div>
    <div class="plist" id="plist"></div>
    <div class="noresult" id="no-result" style="display:none">
      Aucune structure ne correspond à ces critères.<br>
      <button class="btn-link" type="button" onclick="document.getElementById('f-reset').click()" style="margin-top:12px">Réinitialiser les filtres</button>
    </div>

    <h2 class="title-md" style="margin-top:64px">Lire ce tableau correctement</h2>
    <hr class="rule">
    <div class="grid grid--3" style="margin-top:26px">
      <div class="cell">
        <h3 class="card__t" style="font-size:1.1rem">Le coupon n’est pas un rendement</h3>
        <p class="small muted">C’est un maximum conditionnel. Le rendement réellement perçu
        dépend du nombre de constatations réussies et de la date de rappel. Deux produits à
        9 % n’ont pas la même espérance de gain si leurs barrières diffèrent.</p>
      </div>
      <div class="cell">
        <h3 class="card__t" style="font-size:1.1rem">La maturité est un plafond</h3>
        <p class="small muted">Sur une structure autocall, la durée réelle est presque toujours
        plus courte que la maturité affichée. Il faut néanmoins pouvoir porter le produit
        jusqu’au bout, car aucun rappel n’est certain.</p>
      </div>
      <div class="cell">
        <h3 class="card__t" style="font-size:1.1rem">Deux barrières, deux rôles</h3>
        <p class="small muted">La barrière de coupon commande le revenu, la barrière de capital
        commande le remboursement. C’est la seconde qui détermine le risque de perte, et c’est
        par elle qu’il faut commencer la lecture.</p>
      </div>
    </div>
  </div>
</section>
"""
    write("produits.html", layout("produits.html", "Comparateur de produits structurés",
        "Comparez 24 gabarits de structures du marché français : coupon, barrière de coupon, "
        "barrière de capital, maturité, émetteur et scénarios détaillés.",
        body))

# ==========================================================================
#  PAGE — FAMILLES
# ==========================================================================
def page_familles():
    sections = []
    toc = []
    for i, f in enumerate(FAMILLES, 1):
        toc.append(f'<li><a href="#{f["slug"]}">{f["nom"]}</a></li>')
        mec = "\n        ".join(f"<p>{m}</p>" for m in f["mecanisme"])
        plus = "\n          ".join(f"<li>{x}</li>" for x in f["plus"])
        moins = "\n          ".join(f"<li>{x}</li>" for x in f["moins"])
        bg = ' section--ivory' if i % 2 == 0 else ''
        sections.append(f"""
<section class="section{bg}" id="{f["slug"]}" style="scroll-margin-top:100px">
  <div class="container">
    <div class="grid grid--2">
      <div class="cell">
        <p class="eyebrow">{f["profil"]}</p>
        <h2 class="title-md">{f["nom"]}</h2>
        <hr class="rule">
        <p class="lede">{f["resume"]}</p>
        <p class="small muted" style="margin-bottom:0"><strong>Pour qui ?</strong> {f["pour"]}</p>
        <p style="margin-top:22px;margin-bottom:0">
          <a class="btn btn--sm" href="produits.html?{urllib.parse.urlencode(dict([f.get("filtre") or ("famille", html.unescape(f["nom"]))]))}">{"Voir les structures concernées" if f.get("filtre") else "Voir les structures de cette famille"}</a>
        </p>
      </div>
      <div class="cell cell--ivory">
        <h3 class="card__t" style="font-size:1.08rem">Mécanisme</h3>
        {mec}
        <div class="grid grid--2" style="margin-top:24px;border:0;gap:1px">
          <div class="cell" style="padding:20px">
            <p class="card__k" style="color:var(--pos)">Ce que la structure apporte</p>
            <ul class="small" style="padding-left:18px;margin:0">
          {plus}
            </ul>
          </div>
          <div class="cell" style="padding:20px">
            <p class="card__k" style="color:var(--neg)">Ce qu’elle coûte</p>
            <ul class="small" style="padding-left:18px;margin:0">
          {moins}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>""")

    body = f"""
{hero("Les familles de produits",
  "Douze structures couvrent la quasi-totalité de ce qui se distribue en France. Chacune "
  "répond à un arbitrage précis entre rendement, protection et horizon. Les connaître, "
  "c’est pouvoir écarter d’emblée celles qui ne correspondent pas à son objectif.",
  crumb="Familles de produits")}

<section class="section section--tight">
  <div class="container container--mid">
    <div class="toc">
      <p class="toc__t">Les douze familles</p>
      <ol style="columns:2;column-gap:40px">
        {"".join(toc)}
      </ol>
    </div>
    <div class="notice notice--grey">
      <span class="notice__i" aria-hidden="true">i</span>
      <div><p>Les niveaux chiffrés cités dans les exemples sont des ordres de grandeur
      représentatifs des conditions de marché de {MAJ}. Ils évoluent avec les taux et la
      volatilité et ne constituent pas une offre.</p></div>
    </div>
  </div>
</section>
{"".join(sections)}
"""
    write("familles.html", layout("familles.html", "Familles de produits structurés",
        "Autocall Phoenix, Athéna, Reverse Convertible, capital garanti, participation, "
        "airbag, indice décrément, CLN : les douze familles de produits structurés expliquées "
        "une par une, avec leurs avantages et leurs coûts.",
        body))

# ==========================================================================
#  PAGE — ÉMETTEURS
# ==========================================================================
def page_emetteurs():
    cards = []
    for em in EMETTEURS:
        forces = "\n          ".join(f"<li>{x}</li>" for x in em["forces"])
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

    body = f"""
{hero("Les émetteurs",
  "Souscrire un produit structuré, c’est prêter de l’argent à une banque. La formule "
  "détermine la rémunération ; la signature de l’émetteur détermine si elle sera honorée. "
  "Vingt-deux émetteurs actifs sur le marché français et européen, avec leur notation, "
  "leur profil de gamme et leurs points de vigilance.",
  crumb="Émetteurs")}

<section class="section section--tight">
  <div class="container">
    <div class="grid grid--2" style="margin-bottom:30px">
      <div class="cell">
        <p class="eyebrow">Le risque que personne ne regarde</p>
        <h2 class="title-md">Le risque de crédit émetteur</h2>
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

    <div class="notice" style="margin-top:36px">
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
    </div>
  </div>
</section>
"""
    write("emetteurs.html", layout("emetteurs.html", "Les émetteurs de produits structurés",
        "Fiches des 22 principaux émetteurs de produits structurés en Europe : notations "
        "Standard & Poor's, Moody's et Fitch, profil de gamme, points d'appui et vigilances.",
        body))

# ==========================================================================
#  PAGE — ÉTABLISSEMENTS
# ==========================================================================
def page_etablissements():
    blocks = []
    for slug, titre, intro in CAT_ETAB:
        items = [x for x in ETABLISSEMENTS if x["cat"] == slug]
        cards = []
        for x in items:
            search = f'{x["nom"]} {x["pays"]} {x["role"]} {x["txt"]}'
            cards.append(f"""        <article class="card" data-dir data-cat="{slug}" data-s="{e(html.unescape(search))}">
          <p class="card__k">{x["role"]}</p>
          <h3 class="card__t" style="font-size:1.18rem">{x["nom"]}</h3>
          <p class="xsmall muted" style="margin-bottom:10px">{x["pays"]}</p>
          <p class="small" style="margin:0">{x["txt"]}</p>
        </article>""")
        blocks.append(f"""
<section class="section section--tight" data-dir-section id="{slug}" style="scroll-margin-top:100px">
  <div class="container">
    <p class="eyebrow">{len(items)} établissements</p>
    <h2 class="title-md">{titre}</h2>
    <hr class="rule">
    <p class="lede" style="max-width:720px">{intro}</p>
    <div class="cards" style="margin-top:30px">
{"".join(cards)}
    </div>
  </div>
</section>""")

    body = f"""
{hero("Les établissements",
  "Entre l’investisseur et l’émetteur s’interposent plusieurs métiers, qui n’ont ni le même "
  "rôle ni la même responsabilité. Savoir qui structure, qui émet, qui référence et qui "
  "conseille permet de comprendre où se forme le prix — et où se joue la qualité du conseil.",
  crumb="Établissements")}

<section class="section section--tight">
  <div class="container container--mid">
    <h2 class="title-md">La chaîne de valeur, dans l’ordre</h2>
    <hr class="rule">
    <div class="grid grid--4" style="margin-top:26px">
      <div class="cell" style="padding:24px"><div class="num">1</div>
        <h3 class="card__t" style="font-size:1.02rem">Le structureur</h3>
        <p class="xsmall muted" style="margin:0">Conçoit la formule et met les émetteurs en concurrence. Ne porte aucun risque de crédit.</p></div>
      <div class="cell" style="padding:24px"><div class="num">2</div>
        <h3 class="card__t" style="font-size:1.02rem">L’émetteur</h3>
        <p class="xsmall muted" style="margin:0">Émet le titre de créance et s’engage à payer. C’est lui, et lui seul, qui porte le risque de crédit.</p></div>
      <div class="cell" style="padding:24px"><div class="num">3</div>
        <h3 class="card__t" style="font-size:1.02rem">L’assureur</h3>
        <p class="xsmall muted" style="margin:0">Référence le titre en unité de compte, le valorise et porte le cadre juridique de l’enveloppe.</p></div>
      <div class="cell" style="padding:24px"><div class="num">4</div>
        <h3 class="card__t" style="font-size:1.02rem">Le distributeur</h3>
        <p class="xsmall muted" style="margin:0">Sélectionne, explique, souscrit et suit les constatations pour le compte de l’investisseur.</p></div>
    </div>
    <div class="notice notice--grey" style="margin-top:30px">
      <span class="notice__i" aria-hidden="true">i</span>
      <div><p>Un point mérite d’être retenu : <strong>seul l’émetteur porte le risque de
      crédit</strong>. Ni le structureur, ni la plateforme, ni l’assureur ne se substituent à
      lui en cas de défaut. La notoriété de celui qui vous présente le produit ne dit rien de
      la solidité de celui qui s’engage à vous rembourser.</p></div>
    </div>

    <form class="filters" role="search" aria-label="Filtrer les établissements" style="margin-top:34px" onsubmit="return false">
      <div class="filters__row">
        <div class="field" style="grid-column:span 2">
          <label for="dir-q">Rechercher un établissement</label>
          <input type="search" id="dir-q" placeholder="Feefty, assureur luxembourgeois, plateforme…" autocomplete="off">
        </div>
        <div class="field"><label for="dir-cat">Catégorie</label>
          <select id="dir-cat">
            <option value="">Toutes catégories</option>
            {"".join(f'<option value="{s}">{html.unescape(t)}</option>' for s, t, _ in CAT_ETAB)}
          </select></div>
      </div>
      <div class="filters__foot">
        <span class="filters__count" id="dir-count" aria-live="polite"></span>
        <button class="btn-link" type="button" id="dir-reset">Réinitialiser</button>
      </div>
    </form>
  </div>
</section>
{"".join(blocks)}

<section class="section section--tight">
  <div class="container">
    <div class="notice">
      <span class="notice__i" aria-hidden="true">!</span>
      <div>
        <p><strong>Annuaire informatif.</strong> Cet annuaire décrit le rôle de chaque
        catégorie d’intervenant sur le marché français et européen. Les établissements y sont
        cités à titre documentaire : leur mention ne constitue ni une recommandation, ni une
        appréciation de leurs prestations, ni l’indication d’un partenariat.</p>
        <p>Les référencements, conditions commerciales, montants d’accès et gammes évoluent
        constamment : ils doivent être vérifiés directement auprès de chaque établissement.</p>
      </div>
    </div>
  </div>
</section>
"""
    write("etablissements.html", layout("etablissements.html", "Les établissements du marché",
        "Structureurs, plateformes de structuration, assureurs, banques privées et "
        "distributeurs : l'annuaire des établissements qui traitent les produits structurés "
        "en France, et le rôle de chacun dans la chaîne de valeur.",
        body))

# ==========================================================================
#  PAGE — COMPRENDRE
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
  <!-- barrière de capital à 60 % -->
  <line x1="300" y1="60" x2="300" y2="260" stroke="#A9853F" stroke-width="1.4" stroke-dasharray="5 4"/>
  <text x="140" y="76" font-family="Jost, sans-serif" font-size="12" fill="#A9853F">Barrière de capital — 60 %</text>
  <!-- en dessous de la barrière : remboursement = niveau du sous-jacent -->
  <path d="M 60 260 L 300 156.5" fill="none" stroke="#99402F" stroke-width="2.6"/>
  <!-- au-dessus : remboursement plafonné à 100 % du nominal -->
  <path d="M 300 87.5 L 620 87.5" fill="none" stroke="#2F6B4E" stroke-width="2.6"/>
  <circle cx="300" cy="156.5" r="4" fill="#fff" stroke="#99402F" stroke-width="2.2"/>
  <circle cx="300" cy="87.5" r="4" fill="#2F6B4E"/>
  <!-- saut de barrière : 40 points de nominal -->
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

def page_comprendre():
    fam_rows = "\n".join(
        f'<tr><td><a class="inline" href="familles.html#{f["slug"]}">{f["nom"]}</a></td>'
        f'<td>{f["profil"]}</td><td>{f["resume"].split(" : ")[0] if " : " in f["resume"] else f["resume"][:110]}…</td></tr>'
        for f in FAMILLES)

    body = f"""
{hero("Comprendre un produit structuré",
  "Dix minutes de lecture pour saisir l’essentiel : d’où vient le coupon, à quoi servent "
  "les barrières, quels risques sont réellement portés, et quelles questions poser avant "
  "de signer.",
  crumb="Comprendre")}

<section class="section">
  <div class="container container--narrow">
    <div class="toc">
      <p class="toc__t">Au sommaire</p>
      <ol>
        <li><a href="#definition">Ce qu’est un produit structuré — et ce qu’il n’est pas</a></li>
        <li><a href="#fabrication">D’où vient le coupon</a></li>
        <li><a href="#familles">Les familles, en un tableau</a></li>
        <li><a href="#barrieres">Les barrières, le cœur du sujet</a></li>
        <li><a href="#risques">Les six risques réellement portés</a></li>
        <li><a href="#fiscalite">Enveloppes et fiscalité</a></li>
        <li><a href="#sortie">Sortir avant l’échéance</a></li>
        <li><a href="#questions">Les dix questions à poser</a></li>
        <li><a href="#erreurs">Les erreurs les plus fréquentes</a></li>
      </ol>
    </div>

    <div class="prose">
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
      <p>Un coupon de 9 % par an dans un monde où le taux sans risque est à 2 % ne tombe pas
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
        <li><strong>Renoncer aux dividendes.</strong> C’est le rôle des
        <a class="inline" href="glossaire.html#indice-decrement">indices décrément</a>, qui
        prélèvent un dividende forfaitaire chaque année. Vous financez votre coupon avec les
        dividendes auxquels vous renoncez.</li>
        <li><strong>Plafonner le gain.</strong> En abandonnant les scénarios très haussiers,
        vous achetez votre protection à la baisse.</li>
      </ul>
      <p>À ces trois leviers s’ajoutent les mécanismes défavorables : un
      <a class="inline" href="glossaire.html#worst-of">Worst-of</a> sur plusieurs actions, une
      <a class="inline" href="glossaire.html#barriere-americaine">barrière américaine</a>, une
      devise étrangère non couverte. Lorsqu’un coupon dépasse nettement ceux du marché, l’un de
      ces mécanismes est presque toujours présent. Le trouver, c’est comprendre le produit.</p>

      <h2 id="familles">3. Les familles, en un tableau</h2>
      <table>
        <thead><tr><th>Famille</th><th>Profil</th><th>En une ligne</th></tr></thead>
        <tbody>
{fam_rows}
        </tbody>
      </table>
      <p>Chaque famille fait l’objet d’une fiche détaillée, avec son mécanisme, ses avantages
      et ses coûts : <a class="inline" href="familles.html">voir les douze familles</a>.</p>

      <h2 id="barrieres">4. Les barrières, le cœur du sujet</h2>
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
      <a class="inline" href="glossaire.html#airbag">airbag</a> ont précisément été conçus pour
      la supprimer, au prix d’un coupon plus faible.</p>

      <h2 id="risques">5. Les six risques réellement portés</h2>
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

      <h2 id="fiscalite">6. Enveloppes et fiscalité</h2>
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

      <h2 id="sortie">7. Sortir avant l’échéance</h2>
      <p>C’est possible, mais rarement au prix que l’on imagine. La valorisation en cours de vie
      ne se déduit pas du niveau du sous-jacent par une règle de trois : elle dépend aussi de la
      volatilité, des taux, du temps restant et de la qualité de crédit de l’émetteur.</p>
      <p>Un produit dont le sous-jacent est inchangé peut parfaitement valoir 93 % du nominal,
      pour deux raisons principales : les frais de structuration ont été prélevés dès
      l’émission, et le temps n’a pas encore fait son œuvre. À l’inverse, en fin de vie, la
      valeur converge mécaniquement vers le montant de remboursement attendu — c’est
      l’<a class="inline" href="glossaire.html#effet-de-pull-to-par">effet de pull-to-par</a>.</p>
      <p>En pratique : un produit structuré doit être souscrit avec l’intention de le porter
      jusqu’à son terme. La sortie anticipée est une porte de secours, jamais une stratégie.</p>

      <h2 id="questions">8. Les dix questions à poser</h2>
      <ol>
        <li>Quel est l’émetteur exact du titre, et quel est son garant ?</li>
        <li>Quelles sont ses trois notations, à quelle date, et avec quelles perspectives ?</li>
        <li>Le sous-jacent est-il un indice classique ou un indice décrément ? Si décrément, en points ou en pourcentage, et de combien ?</li>
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

      <h2 id="erreurs">9. Les erreurs les plus fréquentes</h2>
      <ul>
        <li><strong>Comparer le coupon de deux produits sans comparer leurs barrières.</strong>
        Un produit à 7 % barrière 50 % est souvent préférable à un produit à 9 % barrière 70 %.</li>
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
        <li><strong>Souscrire sans pouvoir porter jusqu’au terme.</strong> La sortie anticipée
        se fait au prix du marché, pas au nominal.</li>
      </ul>
      <p style="margin-top:34px"><a class="btn" href="glossaire.html">Approfondir avec le glossaire</a></p>
    </div>
  </div>
</section>
"""
    write("comprendre.html", layout("comprendre.html", "Comprendre un produit structuré",
        "Guide complet : d'où vient le coupon, à quoi servent les barrières, les six risques "
        "réellement portés, la fiscalité selon l'enveloppe et les dix questions à poser avant "
        "de souscrire.",
        body))

# ==========================================================================
#  PAGE — GLOSSAIRE
# ==========================================================================
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

def page_glossaire():
    entries = sorted(GLOSSAIRE, key=lambda g: slugify(g["t"]))
    groups = {}
    for g in entries:
        letter = slugify(g["t"])[0].upper()
        groups.setdefault(letter, []).append(g)

    alpha = []
    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        if ch in groups:
            alpha.append(f'<a href="#lettre-{ch}">{ch}</a>')
        else:
            alpha.append(f'<span aria-hidden="true">{ch}</span>')

    blocks = []
    for letter in sorted(groups):
        items = []
        for g in groups[letter]:
            gid = slugify(g["t"])
            defs = "\n          ".join(f'<p class="gl__d">{d}</p>' for d in g["d"])
            ex = (f'<div class="gl__ex"><b>Exemple</b>{g["ex"]}</div>' if g["ex"] else "")
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

    body = f"""
{hero("Glossaire",
  f"{len(GLOSSAIRE)} définitions pour lire une fiche produit sans rien laisser dans l’ombre. "
  "Chaque terme est expliqué dans ses conséquences pratiques, et non dans sa seule "
  "définition théorique.",
  crumb="Glossaire")}

<section class="section section--tight">
  <div class="container container--mid">
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
  </div>
</section>

<section class="section section--tight" style="padding-top:0">
  <div class="container container--mid">
    <nav class="alpha" aria-label="Navigation alphabétique">
      {"".join(alpha)}
    </nav>
{"".join(blocks)}
    <p class="small muted" style="margin-top:34px">Un terme manque ?
      <a class="card__more" href="../contact.html" style="border:0;padding:0">Signalez-le</a>,
      le glossaire est enrichi au fil des évolutions du marché.</p>
  </div>
</section>
"""
    write("glossaire.html", layout("glossaire.html", "Glossaire des produits structurés",
        f"{len(GLOSSAIRE)} définitions : autocall, indice décrément, worst-of, airbag, "
        "barrière européenne et américaine, effet mémoire, bail-in, SRI, EMTN, pull-to-par. "
        "Le vocabulaire des produits structurés expliqué avec des exemples chiffrés.",
        body))

# ==========================================================================
#  PAGE — MÉTHODOLOGIE
# ==========================================================================
def page_methodologie():
    crit = [
        ("Qualité de la signature", 25,
         "Notation des trois agences sur la dette senior de l’entité émettrice réelle, perspective associée, et identité du garant. Une notation inférieure à la catégorie investissement disqualifie le produit, quel que soit son coupon."),
        ("Profondeur de la protection", 25,
         "Niveau de la barrière de capital, mode de constatation, et présence éventuelle d’un mécanisme airbag. Une barrière européenne profonde vaut mieux qu’un coupon élevé : c’est le critère que nous pondérons le plus fortement avec la signature."),
        ("Lisibilité du mécanisme", 20,
         "Nombre de mécanismes cumulés dans une même formule. Chaque couche supplémentaire — Worst-of, barrière continue, devise non couverte, décrément agressif — dégrade la note, même lorsqu’elle améliore le coupon affiché."),
        ("Cohérence du sous-jacent", 15,
         "Ancienneté réelle de l’indice, largeur de l’univers, concentration sectorielle, et ampleur du décrément rapporté au rendement du dividende historique du panier."),
        ("Rapport rendement / risque", 10,
         "Coupon rapporté non pas au marché en général, mais à ce que l’on peut obtenir au même moment, chez d’autres émetteurs, à barrières et maturité comparables."),
        ("Transparence des coûts", 5,
         "Clarté de l’information sur les frais de structuration et de distribution, et cohérence entre la brochure commerciale et le document d’informations clés."),
    ]
    rows = "\n".join(
        f'<tr><td><strong>{n}</strong></td><td class="num-cell">{p} %</td><td>{d}</td></tr>'
        for n, p, d in crit)

    body = f"""
{hero("Méthodologie",
  "Comment nous apprécions un produit structuré, ce que nous écartons par principe, et les "
  "limites que nous assumons dans cet exercice.",
  crumb="Méthodologie")}

<section class="section">
  <div class="container container--narrow">
    <div class="prose">
      <h2>Le principe : la signature et la protection d’abord</h2>
      <p>La plupart des classements de produits structurés ordonnent les offres par niveau de
      coupon. C’est l’inverse de ce qu’il faut faire. Le coupon est la variable la plus visible
      et la moins informative : il se déduit mécaniquement des autres paramètres. Un coupon
      élevé ne traduit pas la générosité d’un émetteur mais le prix d’un risque, ou la présence
      d’un mécanisme défavorable.</p>
      <p>Notre grille accorde donc la moitié du poids total à deux critères seulement : la
      qualité de la signature qui s’engage, et la profondeur de la protection accordée. Le
      rendement n’intervient qu’ensuite, et relativement à ce que le marché offre au même
      moment à risque comparable.</p>

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
        <li><strong>Les émetteurs en catégorie spéculative.</strong> Aucun supplément de coupon
        ne compense une signature fragile sur un horizon de huit à douze ans.</li>
        <li><strong>Les barrières de capital constatées en continu.</strong> Sur une maturité
        longue, la probabilité de franchissement rend la protection largement illusoire.</li>
        <li><strong>Les Worst-of sur plus de trois actions individuelles.</strong> Le cumul de
        risques spécifiques y devient impossible à apprécier sérieusement.</li>
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

      <h2>Fréquence de revue</h2>
      <p>Les niveaux de coupon évoluent avec les taux et la volatilité ; les notations évoluent
      avec les décisions des agences ; les gammes évoluent avec les émetteurs. Le contenu de cet
      observatoire fait l’objet d’une revue éditoriale périodique, dont la date figure en pied
      de chaque page. Entre deux revues, les ordres de grandeur restent indicatifs.</p>

      <h2>Indépendance</h2>
      <p>Cet observatoire est édité par {EDITEUR}, cabinet de gestion privée exerçant en
      architecture ouverte. Les émetteurs et établissements cités le sont à titre documentaire :
      leur mention ne résulte d’aucun accord commercial et ne constitue pas une recommandation.
      Lorsque nous accompagnons un client sur un produit structuré, nous mettons les émetteurs
      en concurrence sur une formule définie avec lui, et nous lui communiquons les frais
      applicables.</p>

      <p style="margin-top:34px">
        <a class="btn" href="../contact.html">Nous consulter</a>
        <a class="btn" href="produits.html" style="margin-left:10px">Voir le comparateur</a>
      </p>
    </div>
  </div>
</section>
"""
    write("methodologie.html", layout("methodologie.html", "Méthodologie d’analyse",
        "Les six critères de notre grille d'analyse des produits structurés, pondérés en "
        "faveur de la signature de l'émetteur et de la profondeur de la protection, et les "
        "limites assumées de l'exercice.",
        body))

# ==========================================================================
#  PAGE — MENTIONS LÉGALES
# ==========================================================================
def page_mentions():
    body = f"""
{hero("Mentions légales", "Éditeur, nature des informations publiées et avertissement sur les risques.",
  crumb="Mentions légales")}

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

      <h2>Notations de crédit</h2>
      <p>Les notations citées portent sur la dette senior long terme des entités mentionnées.
      Elles sont reproduites à titre indicatif, telles que relevées en {ANNEE_RATINGS}, et sont
      susceptibles d’être révisées par les agences à tout moment et sans préavis. La notation
      d’un groupe ne se confond pas nécessairement avec celle de l’entité émettrice du titre.
      Ces notations sont la propriété de leurs auteurs respectifs.</p>

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
      de navigation n’est collectée par l’éditeur. Les demandes de contact sont traitées selon les
      modalités décrites dans
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
    write("mentions-legales.html", layout("mentions-legales.html", "Mentions légales",
        "Éditeur, nature des informations publiées, notations de crédit, avertissement sur les "
        "risques des produits structurés et propriété intellectuelle.",
        body))

# ==========================================================================
#  MAIN
# ==========================================================================
def main():
    os.makedirs(os.path.join(OUT, "assets"), exist_ok=True)
    print(f"\n{SITE} — génération")
    build_data_js()
    page_index()
    page_produits()
    page_familles()
    page_emetteurs()
    page_etablissements()
    page_comprendre()
    page_glossaire()
    page_methodologie()
    page_mentions()
    print(f"\n  {len(FAMILLES)} familles · {len(EMETTEURS)} émetteurs · "
          f"{len(ETABLISSEMENTS)} établissements · {len(PRODUITS)} structures · "
          f"{len(GLOSSAIRE)} définitions")
    print("  Terminé.\n")

if __name__ == "__main__":
    main()
