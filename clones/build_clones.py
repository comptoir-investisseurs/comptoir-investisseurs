# -*- coding: utf-8 -*-
"""
Génère 10 maquettes de pages d'accueil "clones" spécialisées par corps de métier.
Chaque page est autonome (CSS inline + Google Fonts), visualisable directement
dans un navigateur sur ordinateur. Toutes restent "prime" mais avec une identité
visuelle propre (palette, typographies, mise en page, motif de hero).

Lancer :  python3 clones/build_clones.py
Sortie :  clones/<slug>.html  +  clones/index.html (galerie)
"""
import os, html

OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Bibliothèque d'icônes (tracés stroke, viewBox 0 0 24 24)
# ---------------------------------------------------------------------------
IC = {
    "pulse":   '<path d="M2 12h4l2-6 4 14 3-9 2 5 1-2h4"/>',
    "lamp":    '<path d="M9 3h6l-1 6a4 4 0 11-4 0L9 3z"/><path d="M8 20h8M10 20v-3M14 20v-3"/>',
    "scale":   '<path d="M12 3v18M5 7h14M5 7l-3 6a3 3 0 006 0L5 7zm14 0l-3 6a3 3 0 006 0l-3-6zM8 21h8"/>',
    "cross":   '<path d="M10 3h4v5h5v4h-5v9h-4v-9H5V8h5z"/>',
    "wheat":   '<path d="M12 21V8M12 8c0-3 2-5 4-6 0 3-2 5-4 6zm0 0c0-3-2-5-4-6 0 3 2 5 4 6zM12 13c0-2 2-3 4-4 0 2-2 3-4 4zm0 0c0-2-2-3-4-4 0 2 2 3 4 4z"/>',
    "compass": '<circle cx="12" cy="12" r="9"/><path d="M16 8l-2 6-6 2 2-6 6-2z"/>',
    "shield":  '<path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3z"/>',
    "book":    '<path d="M3 5a4 4 0 014-1h4v16H7a4 4 0 00-4 1zM21 5a4 4 0 00-4-1h-4v16h4a4 4 0 014 1z"/>',
    "laurel":  '<path d="M12 21V7M12 21c-4 0-7-3-7-8 4 0 7 3 7 8zm0 0c4 0 7-3 7-8-4 0-7 3-7 8zM12 11c-3 0-5-2-5-5 3 0 5 2 5 5zm0 0c3 0 5-2 5-5-3 0-5 2-5 5z"/>',
    "anvil":   '<path d="M3 8h11a5 5 0 01-3 4h6l-2 4H8l-2-4h2a4 4 0 01-4-4zM10 16v3M14 16v3M7 21h10"/>',
    "chart":   '<path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-7M20 16v-3"/>',
    "vault":   '<path d="M3 5h18v14H3z"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M8 12h1M15 12h1"/>',
    "shield2": '<path d="M12 3l7 3v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    "growth":  '<path d="M3 17l6-6 4 4 8-8M21 7v6m0-6h-6"/>',
    "globe":   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15 0 18M12 3c-2.5 2.7-2.5 15 0 18"/>',
    "hands":   '<path d="M4 18h16M5 18a7 7 0 0114 0M12 8V6m-2 0h4"/>',
    "key":     '<circle cx="8" cy="8" r="4"/><path d="M11 11l9 9M16 16l2-2M18 18l2-2"/>',
    "doc":     '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9 12h7M9 16h7"/>',
    "coins":   '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3"/><path d="M9 12c0 1.7 2.7 3 6 3s6-1.3 6-3V9"/>',
    "tree":    '<path d="M12 21v-6M12 15c-3 0-5-2-5-5a5 5 0 0110 0c0 3-2 5-5 5z"/>',
    "medal":   '<circle cx="12" cy="15" r="5"/><path d="M9 10L6 3M15 10l3-7M12 13l1 2 2 .3-1.5 1.4.4 2L12 18l-1.9 1 .4-2L9 15.3l2-.3z"/>',
    "plane":   '<path d="M21 12l-8 1-3 7-2-1 1-6-6 1-1-2 7-3 1-6 2 1 1 6 8 1z"/>',
    "retire":  '<path d="M4 21v-6a8 8 0 0116 0v6"/><circle cx="12" cy="6" r="3"/>',
    "lock":    '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    "column":  '<path d="M4 8h16M5 8v9M9.5 8v9M14.5 8v9M19 8v9M3 21h18M3 21v-2h18v2M5 8L12 4l7 4"/>',
    "handshake":'<path d="M3 12l4-4 4 2 3-2 4 3-4 5-3-3-3 2-2-1z"/>',
}

def _hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgba_pct(h, pct):
    """Equivalent to CSS color-mix(in srgb, h pct%, transparent)."""
    r, g, b = _hx(h)
    return f"rgba({r},{g},{b},{pct/100:.3f})"

def mix_solid(h1, pct, h2):
    """Equivalent to CSS color-mix(in srgb, h1 pct%, h2) for two opaque colors."""
    r1, g1, b1 = _hx(h1); r2, g2, b2 = _hx(h2)
    t = pct / 100
    r = round(r1*t + r2*(1-t)); g = round(g1*t + g2*(1-t)); b = round(b1*t + b2*(1-t))
    return f"rgb({r},{g},{b})"

def icon(name, cls="ico", extra=""):
    return (f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" '
            f'aria-hidden="true" {extra}>{IC[name]}</svg>')

ARROW = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
         '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')

# ---------------------------------------------------------------------------
# Définition des 10 marques
# ---------------------------------------------------------------------------
THEMES = [
 {
  "slug":"galien", "brand":"Galien", "brand2":"& Associés", "mono":"G",
  "metier":"Gestion privée des professions de santé",
  "fonts":("Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600","Inter:wght@300;400;500"),
  "serif":"'Fraunces', Georgia, serif", "sans":"'Inter', system-ui, sans-serif",
  "c":{"base":"#0B1F3A","base2":"#0E2748","accent":"#B5824B","accent2":"#D6A878",
       "cream":"#F5F1EA","sand":"#ECE4D6","ink":"#1A2230","muted":"#5C6678","paper":"#FBFAF7"},
  "hero":"split", "emblem":"pulse",
  "h1":"Votre temps soigne. Votre patrimoine, c’est notre affaire.",
  "sub":"Conseil patrimonial dédié aux médecins, chirurgiens et professions libérales de santé : fiscalité BNC, holding de cession, prévoyance et préparation de la retraite.",
  "intro":("La maison","Une gestion pensée par et pour les soignants",
    "Vous consacrez votre vie aux autres ; nous consacrons la nôtre à votre patrimoine.",
    "Honoraires irréguliers, fiscalité BNC, exercice en SEL ou cession de clinique : chaque situation médicale appelle une réponse sur-mesure. Nous traduisons la complexité de votre carrière en une stratégie patrimoniale claire, lisible et fiscalement optimale."),
  "sol":[("vault","Optimisation BNC & SEL","Structurer vos revenus libéraux et votre société d’exercice pour alléger la pression fiscale."),
         ("growth","Épargne & placements","Assurance-vie, comptes-titres et allocation sur-mesure adaptés à vos pics de revenus."),
         ("handshake","Cession de patientèle","Préparer, valoriser et transmettre votre cabinet ou votre clinique."),
         ("shield2","Prévoyance & perte d’activité","Protéger vos revenus et vos proches en cas d’arrêt ou d’invalidité."),
         ("retire","Retraite CARMF","Compenser la baisse de revenus à la cessation d’activité."),
         ("key","Immobilier des murs","Acquisition et détention optimisée de vos locaux professionnels.")],
  "stats":[("BNC","Fiscalité maîtrisée"),("SEL","Structuration dédiée"),("CARMF","Retraite anticipée"),("100%","Indépendant")],
  "quote":"« On ne confie pas sa santé à un généraliste pour tout. Votre patrimoine mérite la même spécialisation. »",
 },
 {
  "slug":"maison-florence", "brand":"Maison Florence", "brand2":"", "mono":"F",
  "metier":"Patrimoine des soignants & professions paramédicales",
  "fonts":("Playfair+Display:wght@400;500;600","Mulish:wght@300;400;500"),
  "serif":"'Playfair Display', Georgia, serif", "sans":"'Mulish', system-ui, sans-serif",
  "c":{"base":"#3A1230","base2":"#4A1942","accent":"#C58A6E","accent2":"#E2B49C",
       "cream":"#F7F0EE","sand":"#EFE2DD","ink":"#2A1722","muted":"#6E5860","paper":"#FCF8F6"},
  "hero":"left", "emblem":"lamp",
  "h1":"Prendre soin de ceux qui prennent soin.",
  "sub":"Infirmiers, sages-femmes, kinésithérapeutes, aides-soignants : un accompagnement patrimonial à votre rythme, pour transformer vos heures de garde en sérénité durable.",
  "intro":("La maison","La rigueur du soin, appliquée à votre épargne",
    "Une approche douce, pédagogique et profondément humaine.",
    "Statut libéral ou salarié, heures supplémentaires, retraite CARPIMKO : nous mettons la même attention à votre patrimoine que vous mettez à vos patients. Pas de jargon, pas de pression — des décisions claires, expliquées et alignées sur vos valeurs."),
  "sol":[("coins","Épargne régulière","Faire fructifier vos revenus, même modestes, avec constance et sécurité."),
         ("retire","Retraite CARPIMKO","Anticiper la baisse de pension propre aux professions de santé."),
         ("shield2","Prévoyance","Sécuriser vos revenus en cas d’arrêt, d’accident ou de maternité."),
         ("key","Premier achat immobilier","Devenir propriétaire dans de bonnes conditions de financement."),
         ("doc","Statut libéral","Choisir et optimiser votre cadre d’exercice et votre fiscalité."),
         ("tree","Transmission","Protéger vos proches et organiser sereinement l’avenir.")],
  "stats":[("CARPIMKO","Retraite dédiée"),("Sur-mesure","À votre rythme"),("0 €","Premier rendez-vous"),("Humain","Avant tout")],
  "quote":"« La lampe que vous portez auprès des malades, nous la portons sur votre avenir. »",
 },
 {
  "slug":"pretoire", "brand":"Prétoire", "brand2":"Patrimoine", "mono":"P",
  "metier":"Gestion de fortune des professions du droit",
  "fonts":("Cormorant+Garamond:wght@400;500;600","Jost:wght@300;400;500"),
  "serif":"'Cormorant Garamond', Georgia, serif", "sans":"'Jost', system-ui, sans-serif",
  "c":{"base":"#14161C","base2":"#1C1F28","accent":"#C9A227","accent2":"#E2C766",
       "cream":"#F3F1EA","sand":"#E4E0D2","ink":"#1A1C22","muted":"#6A6E78","paper":"#F8F7F2"},
  "hero":"center", "dark_hero":True, "emblem":"scale",
  "h1":"L’équité dans le conseil. L’excellence dans l’exécution.",
  "sub":"Avocats, notaires, magistrats et juristes d’affaires : une gestion de fortune à la hauteur de l’exigence de votre profession et de la confidentialité qu’elle impose.",
  "intro":("Le cabinet","Le sens de la preuve, appliqué à votre patrimoine",
    "Rigueur, confidentialité, indépendance totale du conseil.",
    "Exercice en SELARL, cession de charge notariale, association d’avocats, revenus variables : nous structurons votre patrimoine avec la même méthode que vous instruisez un dossier — pièce par pièce, sans approximation, dans votre seul intérêt."),
  "sol":[("vault","Structuration SEL & SCM","Optimiser votre société d’exercice et vos flux professionnels."),
         ("handshake","Cession de charge & clientèle","Valoriser et transmettre votre cabinet ou votre étude."),
         ("chart","Allocation sur-mesure","Architecture ouverte, assurance-vie luxembourgeoise, non coté."),
         ("lock","Confidentialité","Mandats discrets et structures patrimoniales protectrices."),
         ("retire","Retraite des libéraux","Compenser une pension souvent inférieure aux revenus d’activité."),
         ("globe","Mobilité & international","Pour les avocats d’affaires exerçant hors de France.")],
  "stats":[("SELARL","Structuration experte"),("+25 ans","D’expérience cumulée"),("Confidentiel","À chaque étape"),("Indépendant","Sans conflit d’intérêt")],
  "quote":"« Vous plaidez l’intérêt d’autrui. Nous ne plaidons que le vôtre. »",
 },
 {
  "slug":"maison-sainte-foy", "brand":"Maison Sainte-Foy", "brand2":"", "mono":"✠",
  "metier":"Gestion de patrimoine selon vos convictions",
  "fonts":("EB+Garamond:wght@400;500;600","Mulish:wght@300;400;500"),
  "serif":"'EB Garamond', Georgia, serif", "sans":"'Mulish', system-ui, sans-serif",
  "c":{"base":"#5A1320","base2":"#6E1423","accent":"#C9A227","accent2":"#E2C766",
       "cream":"#F8F3E9","sand":"#EEE3CF","ink":"#2A1C1A","muted":"#6A5A52","paper":"#FCF8F0"},
  "hero":"center", "emblem":"cross",
  "h1":"Investir en accord avec sa foi et ses valeurs.",
  "sub":"Une gestion patrimoniale pour les familles catholiques : placements compatibles avec la doctrine sociale de l’Église, mécénat, fondations et transmission dans la durée.",
  "intro":("La maison","Le bien commun, au cœur de chaque décision",
    "Faire fructifier son patrimoine sans renoncer à ses principes.",
    "Investissement responsable et excluant les secteurs contraires à vos convictions, soutien aux œuvres et au denier, transmission familiale guidée par le sens : nous conjuguons performance financière et fidélité à vos valeurs, avec exigence et discrétion."),
  "sol":[("shield2","Placements éthiques","Allocation excluant les secteurs contraires à la doctrine sociale."),
         ("hands","Mécénat & dons","Optimiser votre générosité envers les œuvres et votre paroisse."),
         ("column","Fondations & legs","Créer une fondation ou organiser un legs pérenne et utile."),
         ("tree","Transmission familiale","Préparer l’avenir de vos enfants dans l’unité et le sens."),
         ("coins","Épargne de précaution","Constituer un socle prudent pour votre famille."),
         ("doc","Conseil fiscal","Réduire votre imposition tout en soutenant des causes justes.")],
  "stats":[("ISR","Investissement responsable"),("Familial","Sur plusieurs générations"),("Mécénat","Optimisé fiscalement"),("Discret","& bienveillant")],
  "quote":"« À chacun selon ses œuvres : que votre patrimoine serve aussi ce qui vous dépasse. »",
 },
 {
  "slug":"maison-sillon", "brand":"Maison Sillon", "brand2":"", "mono":"S",
  "metier":"Patrimoine du monde agricole & viticole",
  "fonts":("Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600","Karla:wght@300;400;500"),
  "serif":"'Source Serif 4', Georgia, serif", "sans":"'Karla', system-ui, sans-serif",
  "c":{"base":"#2E3A24","base2":"#3B4A2F","accent":"#A8552E","accent2":"#C97A4E",
       "cream":"#F4F0E4","sand":"#E7DDC6","ink":"#23271C","muted":"#5E6452","paper":"#FAF7EE"},
  "hero":"left", "emblem":"wheat",
  "h1":"La terre se transmet. Le patrimoine se cultive.",
  "sub":"Exploitants agricoles, viticulteurs et familles du foncier rural : structurer, valoriser et transmettre une exploitation, c’est préparer plusieurs générations à la fois.",
  "intro":("La maison","Enracinés dans le réel, tournés vers la durée",
    "La patience de la terre, la précision du conseil.",
    "Transmission d’exploitation, GFA et foncier, fiscalité agricole (DPI, DEP), diversification du patrimoine hors sol : nous accompagnons celles et ceux qui nourrissent le pays avec une stratégie qui respecte le temps long de votre métier."),
  "sol":[("tree","Transmission d’exploitation","Préparer la reprise familiale ou la cession dans de bonnes conditions."),
         ("doc","Fiscalité agricole","Optimiser DPI, DEP et revenus exceptionnels de récolte."),
         ("key","Foncier & GFA","Structurer la détention du foncier et sécuriser le portage."),
         ("growth","Diversification","Constituer un patrimoine financier hors aléas climatiques."),
         ("retire","Retraite agricole","Compenser une pension MSA souvent insuffisante."),
         ("shield2","Aléas & prévoyance","Protéger l’exploitation et la famille face aux imprévus.")],
  "stats":[("GFA","Foncier structuré"),("MSA","Retraite anticipée"),("Long terme","Le temps de la terre"),("Familial","De génération en génération")],
  "quote":"« On ne récolte bien que ce que l’on a patiemment semé — y compris son patrimoine. »",
 },
 {
  "slug":"cap-meridien", "brand":"Cap Méridien", "brand2":"", "mono":"⊕",
  "metier":"Patrimoine des navigants & personnels de l’air",
  "fonts":("Spectral:wght@300;400;500;600","Sora:wght@300;400;500"),
  "serif":"'Spectral', Georgia, serif", "sans":"'Sora', system-ui, sans-serif",
  "c":{"base":"#10283F","base2":"#173655","accent":"#5FA8C4","accent2":"#9FCFE0",
       "cream":"#EEF3F6","sand":"#DDE7EC","ink":"#16232E","muted":"#566876","paper":"#F7FAFB"},
  "hero":"right", "emblem":"compass",
  "h1":"Gardez le cap, où que vous portent vos lignes.",
  "sub":"Pilotes de ligne, personnel navigant et professionnels de l’aéronautique : une gestion patrimoniale conçue pour les revenus en devises, l’expatriation et les carrières en altitude.",
  "intro":("La maison","Un plan de vol patrimonial, calculé au plus juste",
    "La stabilité au sol pour ceux dont la vie est en mouvement.",
    "Revenus perçus en plusieurs devises, mobilité internationale, résidence fiscale mouvante et risque de perte de licence : nous traçons une trajectoire patrimoniale précise et résiliente, quel que soit votre fuseau horaire."),
  "sol":[("globe","Expatriation & résidence","Optimiser votre fiscalité selon votre lieu de résidence réel."),
         ("coins","Revenus en devises","Structurer et placer des revenus multidevises efficacement."),
         ("shield2","Perte de licence","Couvrir le risque majeur de votre profession."),
         ("growth","Allocation internationale","Assurance-vie luxembourgeoise et comptes-titres transfrontaliers."),
         ("retire","Retraite des navigants","Anticiper la fin de carrière, souvent précoce."),
         ("key","Immobilier en France","Investir au pays depuis l’étranger, en toute sérénité.")],
  "stats":[("Multidevise","Revenus optimisés"),("Lux","Contrat transfrontalier"),("Mobilité","Pensée pour vous"),("Cap","Tenu dans la durée")],
  "quote":"« Une carrière en altitude exige un patrimoine qui garde, lui, les pieds sur terre. »",
 },
 {
  "slug":"bastion", "brand":"Bastion", "brand2":"Patrimoine", "mono":"B",
  "metier":"Patrimoine des officiers & militaires",
  "fonts":("Libre+Baskerville:wght@400;700","Barlow:wght@300;400;500"),
  "serif":"'Libre Baskerville', Georgia, serif", "sans":"'Barlow', system-ui, sans-serif",
  "c":{"base":"#0E2A3F","base2":"#143750","accent":"#A89968","accent2":"#C9BC93",
       "cream":"#F2EFE7","sand":"#E2DBC9","ink":"#172430","muted":"#566472","paper":"#F8F6EF"},
  "hero":"left", "emblem":"shield",
  "h1":"Servir le pays. Protéger les siens.",
  "sub":"Officiers, sous-officiers, gendarmes et personnels de la Défense : un accompagnement patrimonial fidèle, discret et adapté aux mutations, aux OPEX et au statut militaire.",
  "intro":("La maison","La discipline du conseil, au service de ceux qui servent",
    "Une stratégie qui tient ses positions, dans la durée.",
    "Mobilité géographique permanente, indemnités d’opérations, pension à liquidation anticipée, accession difficile à la propriété : nous bâtissons un patrimoine solide, capable de résister à un parcours fait de mouvements et d’engagements."),
  "sol":[("key","Accession à la propriété","Devenir propriétaire malgré les mutations fréquentes."),
         ("coins","Épargne & indemnités","Valoriser soldes, primes et indemnités d’opérations extérieures."),
         ("retire","Pension militaire","Optimiser une retraite à liquidation anticipée."),
         ("shield2","Prévoyance & famille","Protéger vos proches face aux risques du métier."),
         ("globe","Mutations & expatriation","Gérer votre fiscalité au gré de vos affectations."),
         ("growth","Placements de long terme","Construire un capital régulier et sécurisé.")],
  "stats":[("Anticipée","Pension optimisée"),("OPEX","Indemnités valorisées"),("Mobilité","Patrimoine adapté"),("Fidèle","Dans la durée")],
  "quote":"« À ceux qui tiennent la ligne, un patrimoine qui ne cède jamais de terrain. »",
 },
 {
  "slug":"le-preau", "brand":"Le Préau", "brand2":"", "mono":"≡",
  "metier":"Patrimoine des enseignants & de la fonction publique",
  "fonts":("Lora:wght@400;500;600","Nunito+Sans:wght@300;400;600"),
  "serif":"'Lora', Georgia, serif", "sans":"'Nunito Sans', system-ui, sans-serif",
  "c":{"base":"#143A40","base2":"#1B4A52","accent":"#D8A23B","accent2":"#EBC474",
       "cream":"#F3F1E8","sand":"#E5E0CE","ink":"#1A2A2C","muted":"#5A6868","paper":"#F9F7F0"},
  "hero":"split", "emblem":"book",
  "h1":"Transmettre le savoir. Préparer l’avenir.",
  "sub":"Enseignants, agents et cadres de la fonction publique : une gestion patrimoniale claire et pédagogique, pensée pour les traitements réguliers et la retraite des agents publics.",
  "intro":("La maison","Apprendre à faire travailler son épargne",
    "La clarté d’un bon cours, appliquée à vos finances.",
    "Traitement indiciaire régulier, RAFP, PER de la fonction publique, capacité d’épargne stable mais maîtrisée : nous vous donnons les clés pour comprendre, décider et investir sereinement — sans jamais subir une décision que vous ne maîtrisez pas."),
  "sol":[("book","Pédagogie financière","Comprendre vos placements avant de vous engager."),
         ("retire","Retraite & RAFP","Compléter une pension publique souvent insuffisante."),
         ("coins","Épargne régulière","Construire un capital pas à pas, à votre rythme."),
         ("key","Premier investissement","Accéder à la propriété ou à l’immobilier locatif."),
         ("doc","PER fonction publique","Réduire votre impôt tout en préparant l’avenir."),
         ("tree","Transmission","Protéger et préparer l’avenir de votre famille.")],
  "stats":[("RAFP","Retraite complétée"),("Pédagogie","Avant tout"),("Régulier","Épargne maîtrisée"),("0 €","Premier bilan")],
  "quote":"« On n’apprend bien qu’en comprenant. Votre argent ne fait pas exception. »",
 },
 {
  "slug":"olympe", "brand":"Olympe", "brand2":"Patrimoine", "mono":"Ω",
  "metier":"Patrimoine des sportifs de haut niveau",
  "fonts":("Saira+Condensed:wght@400;500;600","Inter:wght@300;400;500"),
  "serif":"'Saira Condensed', Arial, sans-serif", "sans":"'Inter', system-ui, sans-serif",
  "c":{"base":"#121418","base2":"#1B1E24","accent":"#C2342F","accent2":"#E4615C",
       "cream":"#F2F1EF","sand":"#E1DFDB","ink":"#16181C","muted":"#6A6E76","paper":"#F8F8F7"},
  "hero":"center", "dark_hero":True, "emblem":"laurel",
  "h1":"VOTRE CARRIÈRE EST COURTE. VOTRE PATRIMOINE DOIT DURER.",
  "sub":"Sportifs professionnels et de haut niveau : transformer un pic de revenus de quelques saisons en une sécurité financière pour toute la vie — et réussir l’après-carrière.",
  "intro":("La maison","Jouer l’après-match dès la première saison",
    "La performance financière au service de votre reconversion.",
    "Revenus exceptionnels mais concentrés sur quelques années, droits à l’image, contrats internationaux et fin de carrière précoce : nous structurons votre patrimoine comme un plan de jeu — pour que le meilleur de votre vie ne s’arrête pas au coup de sifflet final."),
  "sol":[("growth","Capitaliser le pic","Faire travailler des revenus exceptionnels et limités dans le temps."),
         ("doc","Droits à l’image","Structurer vos revenus via une société dédiée."),
         ("globe","Contrats internationaux","Optimiser votre fiscalité de sportif expatrié."),
         ("medal","Reconversion","Préparer et financer votre vie d’après-carrière."),
         ("vault","Protection du capital","Sécuriser un patrimoine contre les imprévus et les mauvais conseils."),
         ("key","Investissement immobilier","Bâtir un socle tangible et générateur de revenus.")],
  "stats":[("Pic","Revenus capitalisés"),("Image","Droits structurés"),("Après","Reconversion préparée"),("Durée","Au-delà du terrain")],
  "quote":"« Le talent gagne des matchs. La stratégie gagne une vie entière. »",
 },
 {
  "slug":"la-guilde", "brand":"La Guilde", "brand2":"", "mono":"G",
  "metier":"Patrimoine des artisans, commerçants & indépendants",
  "fonts":("Domine:wght@400;500;600","Mulish:wght@300;400;500"),
  "serif":"'Domine', Georgia, serif", "sans":"'Mulish', system-ui, sans-serif",
  "c":{"base":"#3A2316","base2":"#4A2E1C","accent":"#B08D57","accent2":"#CDAF82",
       "cream":"#F4EFE6","sand":"#E7DCC9","ink":"#2A1C12","muted":"#665647","paper":"#FAF6EE"},
  "hero":"right", "emblem":"anvil",
  "h1":"Vous avez bâti votre métier. Bâtissons votre patrimoine.",
  "sub":"Artisans, commerçants et travailleurs indépendants : votre entreprise est votre œuvre. Nous la protégeons, l’optimisons et préparons le jour où elle deviendra votre capital.",
  "intro":("La maison","Le goût de l’ouvrage bien fait",
    "Un conseil concret, sans jargon, à hauteur d’atelier.",
    "Statut TNS, loi Madelin, trésorerie de TPE, cession de fonds de commerce : nous parlons votre langage et travaillons votre patrimoine avec le même soin que vous mettez dans votre métier — pièce par pièce, sans rien laisser au hasard."),
  "sol":[("doc","Statut TNS & Madelin","Optimiser votre protection sociale et votre fiscalité d’indépendant."),
         ("handshake","Cession de fonds","Valoriser et transmettre votre commerce ou votre atelier."),
         ("vault","Trésorerie d’entreprise","Dynamiser la trésorerie excédentaire de votre TPE."),
         ("retire","Retraite des indépendants","Compenser une pension souvent faible."),
         ("coins","Épargne & placements","Constituer un patrimoine personnel hors de l’entreprise."),
         ("key","Murs commerciaux","Acquérir et détenir vos locaux de façon optimisée.")],
  "stats":[("TNS","Statut optimisé"),("Madelin","Protection renforcée"),("Cession","Fonds valorisé"),("Concret","Sans jargon")],
  "quote":"« Le bon artisan ne laisse rien au hasard. Votre patrimoine non plus. »",
 },
]

# ---------------------------------------------------------------------------
# Gabarit CSS (thémé par variables) — un seul design system, décliné
# ---------------------------------------------------------------------------
def css(t):
    c = t["c"]
    serif, sans = t["serif"], t["sans"]
    dark_hero = t.get("dark_hero", False)
    # Precomputed equivalents of CSS color-mix() — kept static for maximum
    # rendering compatibility (older WebKit engines don't support color-mix).
    m_paper_92    = rgba_pct(c["paper"], 92)
    m_ink_14      = rgba_pct(c["ink"], 14)
    m_base2_70_0  = mix_solid(c["base2"], 70, "#000000")
    m_accent_45   = rgba_pct(c["accent"], 45)
    m_accent2_50  = rgba_pct(c["accent2"], 50)
    m_base_60     = rgba_pct(c["base"], 60)
    m_accent2_30  = rgba_pct(c["accent2"], 30)
    m_cream_88    = rgba_pct(c["cream"], 88)
    m_accent2_36  = rgba_pct(c["accent2"], 36)
    m_base_45     = rgba_pct(c["base"], 45)
    m_accent2_40  = rgba_pct(c["accent2"], 40)
    m_ink_12      = rgba_pct(c["ink"], 12)
    m_base_14     = rgba_pct(c["base"], 14)
    m_cream_70    = rgba_pct(c["cream"], 70)
    m_cream_80    = rgba_pct(c["cream"], 80)
    m_base_88_0   = mix_solid(c["base"], 88, "#000000")
    m_cream_74    = rgba_pct(c["cream"], 74)
    m_cream_14    = rgba_pct(c["cream"], 14)
    m_cream_48    = rgba_pct(c["cream"], 48)
    return f"""
:root{{
  --base:{c['base']}; --base2:{c['base2']}; --accent:{c['accent']}; --accent2:{c['accent2']};
  --cream:{c['cream']}; --sand:{c['sand']}; --ink:{c['ink']}; --muted:{c['muted']}; --paper:{c['paper']};
  --serif:{serif}; --sans:{sans};
  --maxw:1240px; --gutter:clamp(20px,5vw,64px); --header-h:84px;
  --ease:cubic-bezier(.22,.61,.36,1);
}}
*,*::before,*::after{{box-sizing:border-box}}
html{{scroll-behavior:smooth}}
body{{margin:0;font-family:var(--sans);color:var(--ink);background:var(--paper);
  line-height:1.7;font-size:17px;font-weight:300;letter-spacing:.01em;-webkit-font-smoothing:antialiased}}
img{{max-width:100%;display:block}}
a{{color:inherit;text-decoration:none}}
h1,h2,h3,h4{{font-family:var(--serif);font-weight:500;line-height:1.12;margin:0;letter-spacing:.005em}}
p{{margin:0 0 1.1em}}
.container{{width:100%;max-width:var(--maxw);margin-inline:auto;padding-inline:var(--gutter)}}
.section{{padding-block:clamp(64px,9vw,124px)}}
.section--tight{{padding-block:clamp(48px,6vw,80px)}}
.eyebrow{{font-family:var(--sans);font-size:.74rem;font-weight:500;letter-spacing:.28em;
  text-transform:uppercase;color:var(--accent);margin:0 0 18px}}
.eyebrow--light{{color:var(--accent2)}}
.lede{{font-size:clamp(1.05rem,1.6vw,1.26rem);color:var(--muted);font-weight:300}}
.rule{{width:64px;height:2px;background:var(--accent);border:0;margin:22px 0}}
.center{{text-align:center}} .center .rule{{margin-inline:auto}}
.title-lg{{font-size:clamp(2rem,4.4vw,3.2rem)}}

/* Header */
.site-header{{position:fixed;inset:0 0 auto 0;z-index:1000;height:var(--header-h);display:flex;align-items:center;
  transition:background .45s var(--ease),height .45s var(--ease),border-color .45s var(--ease);border-bottom:1px solid transparent}}
.site-header::before{{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0));transition:opacity .45s}}
.site-header .container{{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:24px}}
.site-header.is-solid{{background:{m_paper_92};backdrop-filter:blur(10px);border-bottom-color:{m_ink_14};height:72px}}
.site-header.is-solid::before{{opacity:0}}
.brand{{display:flex;align-items:center;gap:12px;color:#fff}}
.site-header.is-solid .brand{{color:var(--base)}}
.brand__mark{{width:40px;height:40px;flex:none;border:1px solid currentColor;border-radius:50%;display:grid;place-items:center;
  font-family:var(--serif);font-size:1.2rem;font-weight:600}}
.brand__name{{display:flex;flex-direction:column;line-height:1.05}}
.brand__name b{{font-family:var(--serif);font-weight:600;font-size:1.16rem;letter-spacing:.02em}}
.brand__name span{{font-family:var(--sans);font-weight:400;font-size:.6rem;letter-spacing:.22em;text-transform:uppercase;opacity:.8;margin-top:3px}}
.nav{{display:flex;align-items:center;gap:clamp(16px,2.4vw,38px)}}
.nav a.nav__link{{font-size:.92rem;font-weight:400;letter-spacing:.02em;color:#fff;position:relative;padding:8px 0}}
.site-header.is-solid .nav a.nav__link{{color:var(--base)}}
.nav a.nav__link::after{{content:"";position:absolute;left:0;bottom:0;height:1px;width:100%;background:currentColor;
  transform:scaleX(0);transform-origin:right;transition:transform .4s var(--ease);opacity:.8}}
.nav a.nav__link:hover::after{{transform:scaleX(1);transform-origin:left}}
.btn{{position:relative;display:inline-flex;align-items:center;gap:11px;padding:15px 30px;font-family:var(--sans);
  font-size:.78rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--base);
  border:1px solid var(--base);background:transparent;cursor:pointer;overflow:hidden;border-radius:2px;isolation:isolate;
  transition:color .45s var(--ease),border-color .45s}}
.btn::before{{content:"";position:absolute;inset:0;background:var(--base);z-index:-1;transform:translateY(101%);transition:transform .5s var(--ease)}}
.btn:hover{{color:#fff}} .btn:hover::before{{transform:translateY(0)}}
.btn svg{{transition:transform .45s var(--ease)}} .btn:hover svg{{transform:translateX(5px)}}
.btn--accent{{color:var(--accent);border-color:var(--accent)}} .btn--accent::before{{background:var(--accent)}} .btn--accent:hover{{color:#fff}}
.btn--light{{color:#fff;border-color:rgba(255,255,255,.6)}} .btn--light::before{{background:var(--cream)}} .btn--light:hover{{color:var(--base)}}
.btn--ghost{{color:#fff;border-color:rgba(255,255,255,.45)}} .btn--ghost::before{{background:#fff}} .btn--ghost:hover{{color:var(--base)}}
.site-header.is-solid .btn--ghost{{color:var(--base);border-color:var(--base)}} .site-header.is-solid .btn--ghost::before{{background:var(--base)}} .site-header.is-solid .btn--ghost:hover{{color:#fff}}
.link-arrow{{display:inline-flex;align-items:center;gap:9px;font-size:.82rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}}
.link-arrow svg{{transition:transform .4s var(--ease)}} .link-arrow:hover svg,.tile:hover .link-arrow svg{{transform:translateX(6px)}}

/* Hero */
.hero{{position:relative;min-height:100svh;display:flex;align-items:center;overflow:hidden;
  background:linear-gradient(135deg,var(--base) 0%,var(--base2) 60%,{m_base2_70_0} 100%);color:var(--cream)}}
.hero__scene{{position:absolute;inset:0;z-index:0;overflow:hidden}}
.hero__scene svg{{position:absolute}}
.hero__emblem{{position:absolute;right:-4%;top:50%;transform:translateY(-50%);width:min(58vh,640px);height:min(58vh,640px);
  color:var(--accent);opacity:.14}}
.hero__glow{{position:absolute;width:70vh;height:70vh;border-radius:50%;
  background:radial-gradient(circle,{m_accent_45},transparent 65%);filter:blur(20px);opacity:.5}}
.guides{{position:absolute;inset:0;z-index:1;pointer-events:none}}
.guides span{{position:absolute}}
.guides .v{{top:0;bottom:0;border-left:1px dashed {m_accent2_50}}}
.guides .h{{left:0;right:0;border-top:1px dashed {m_accent2_50}}}
.hero .container{{position:relative;z-index:2;width:100%}}
.hero__panel{{width:min(560px,100%);background:{m_base_60};backdrop-filter:blur(7px);
  border:1px solid {m_accent2_30};padding:clamp(28px,3.4vw,46px);border-radius:4px}}
.hero__panel h1{{color:#fff;font-size:clamp(2rem,3.7vw,3.2rem);font-weight:600}}
.hero__panel .rule{{background:var(--accent2);margin:16px 0}}
.hero__panel p{{color:{m_cream_88};font-weight:300;font-size:1rem}}
.hero__actions{{display:flex;flex-wrap:wrap;gap:14px;margin-top:26px}}
.hero--right .container{{display:flex;justify-content:flex-end}}
.hero--center{{text-align:center}}
.hero--center .hero__panel{{width:min(760px,100%);margin-inline:auto;background:transparent;border:0;backdrop-filter:none;padding:0}}
.hero--center .rule{{margin-inline:auto}}
.hero--center .hero__actions{{justify-content:center}}
.hero--center h1{{font-size:clamp(2.3rem,5vw,4rem)}}
.hero--split .container{{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(36px,6vw,80px);align-items:center}}
.hero--split .hero__panel{{background:transparent;border:0;backdrop-filter:none;padding:0;width:auto}}
.hero__card{{position:relative;aspect-ratio:4/5;border:1px solid {m_accent2_36};border-radius:6px;
  background:{m_base_45};display:grid;place-items:center;overflow:hidden}}
.hero__card svg.emblem{{width:54%;height:54%;color:var(--accent2);opacity:.85}}
.hero__card::after{{content:"";position:absolute;inset:14px;border:1px dashed {m_accent2_40};border-radius:4px}}
.scroll-cue{{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;
  align-items:center;gap:9px;color:rgba(255,255,255,.8);font-size:.66rem;letter-spacing:.25em;text-transform:uppercase}}
.scroll-cue .mouse{{width:23px;height:37px;border:1px solid rgba(255,255,255,.6);border-radius:13px;position:relative}}
.scroll-cue .mouse::after{{content:"";position:absolute;left:50%;top:7px;width:3px;height:7px;background:#fff;border-radius:2px;
  transform:translateX(-50%);animation:dot 1.8s var(--ease) infinite}}
@keyframes dot{{0%{{opacity:0;transform:translate(-50%,0)}}30%,70%{{opacity:1}}100%{{opacity:0;transform:translate(-50%,12px)}}}}

/* Content blocks */
.split{{display:grid;grid-template-columns:1fr 1fr;gap:clamp(36px,6vw,90px);align-items:center}}
.split__media{{position:relative}}
.media-frame{{position:relative;aspect-ratio:4/3;border-radius:4px;overflow:hidden;
  background:linear-gradient(150deg,var(--base),var(--base2));display:grid;place-items:center}}
.media-frame svg{{width:42%;height:42%;color:var(--accent2);opacity:.9}}
.media-frame::after{{content:"";position:absolute;inset:14px -14px -14px 14px;border:1px solid var(--accent);z-index:-1;border-radius:4px}}
.grid{{display:grid;gap:26px}} .grid-3{{grid-template-columns:repeat(3,1fr)}}
.tile{{display:flex;flex-direction:column;gap:14px;padding:32px;background:#fff;border:1px solid {m_ink_12};
  border-radius:4px;transition:transform .5s var(--ease),box-shadow .5s var(--ease),border-color .5s;height:100%;position:relative;overflow:hidden}}
.tile::after{{content:"";position:absolute;left:0;top:0;height:3px;width:0;background:var(--accent);transition:width .5s var(--ease)}}
.tile:hover{{transform:translateY(-6px);box-shadow:0 24px 50px {m_base_14};border-color:transparent}}
.tile:hover::after{{width:100%}}
.tile .ico{{width:44px;height:44px;color:var(--accent)}}
.tile h3{{font-size:1.4rem}} .tile p{{font-size:.95rem;color:var(--muted);margin:0;flex:1}}
.band-dark{{background:linear-gradient(135deg,var(--base),var(--base2));color:var(--cream)}}
.band-dark h2{{color:#fff}}
.band-cream{{background:var(--cream)}} .band-sand{{background:var(--sand)}}
.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;text-align:center}}
.stat__num{{font-family:var(--serif);font-size:clamp(2rem,3.6vw,3rem);color:#fff;line-height:1}}
.stat__lbl{{font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;color:{m_cream_70};margin-top:10px}}
.quote{{max-width:880px;margin-inline:auto;text-align:center}}
.quote p{{font-family:var(--serif);font-size:clamp(1.5rem,3vw,2.2rem);line-height:1.4;font-style:italic;color:var(--base)}}
.quote cite{{display:block;margin-top:18px;font-family:var(--sans);font-style:normal;font-size:.8rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}}
.cta-band{{position:relative;background:linear-gradient(135deg,var(--base),var(--base2));color:var(--cream);overflow:hidden}}
.cta-band .container{{position:relative;z-index:1;display:grid;grid-template-columns:1.3fr auto;gap:40px;align-items:center}}
.cta-band h2{{color:#fff;font-size:clamp(1.8rem,3.4vw,2.8rem)}}
.cta-band p{{color:{m_cream_80};margin:0;max-width:54ch}}
.cta-band__actions{{display:flex;gap:14px;flex-wrap:wrap}}

/* Footer */
.site-footer{{background:{m_base_88_0};color:{m_cream_74};padding-top:70px}}
.footer-grid{{display:grid;grid-template-columns:1.6fr 1fr 1.2fr;gap:40px;padding-bottom:50px}}
.site-footer .brand{{color:#fff;margin-bottom:18px}}
.site-footer h5{{font-family:var(--sans);font-weight:500;font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent2);margin:0 0 18px}}
.footer-links{{list-style:none;margin:0;padding:0;display:grid;gap:11px}}
.footer-links a{{font-size:.94rem;transition:color .3s,padding-left .3s}} .footer-links a:hover{{color:#fff;padding-left:5px}}
.footer-contact p{{font-size:.94rem;margin:0 0 9px}} .footer-contact a{{color:#fff}}
.footer-bottom{{border-top:1px solid {m_cream_14};padding:22px 0;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:.8rem}}
.disclaimer{{font-size:.76rem;color:{m_cream_48};padding-bottom:26px;line-height:1.6}}

/* Reveal */
[data-reveal]{{opacity:0;transform:translateY(26px);transition:opacity .9s var(--ease),transform .9s var(--ease)}}
[data-reveal].is-in{{opacity:1;transform:none}}
[data-reveal][data-delay="1"]{{transition-delay:.1s}} [data-reveal][data-delay="2"]{{transition-delay:.2s}} [data-reveal][data-delay="3"]{{transition-delay:.3s}}
@media (prefers-reduced-motion:reduce){{[data-reveal]{{opacity:1!important;transform:none!important}}}}

/* Responsive */
@media (max-width:900px){{
  .nav{{display:none}}
  .hero--split .container,.split,.cta-band .container{{grid-template-columns:1fr}}
  .grid-3{{grid-template-columns:repeat(2,1fr)}}
  .stats{{grid-template-columns:repeat(2,1fr);gap:34px 20px}}
  .footer-grid{{grid-template-columns:1fr 1fr}}
  .hero--split .hero__card{{display:none}}
}}
@media (max-width:560px){{
  .grid-3{{grid-template-columns:1fr}}
  .hero__panel{{width:100%}}
}}
"""

# ---------------------------------------------------------------------------
# Construction d'une page
# ---------------------------------------------------------------------------
NAV = [("Accueil","#"),("Notre approche","#approche"),("Nos solutions","#solutions"),("Nous contacter","#contact")]

def big_emblem(name):
    return (f'<svg class="hero__emblem" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IC[name]}</svg>')

def hero(t):
    variant = t["hero"]
    panel = f"""<div class="hero__panel" data-reveal>
      <p class="eyebrow eyebrow--light">{t['metier']}</p>
      <h1>{t['h1']}</h1>
      <hr class="rule">
      <p>{t['sub']}</p>
      <div class="hero__actions">
        <a class="btn btn--light" href="#solutions">Découvrir nos solutions {ARROW}</a>
        <a class="btn btn--ghost" href="#contact">Prendre rendez-vous</a>
      </div>
    </div>"""
    scene = f"""<div class="hero__scene">
      <span class="hero__glow" style="right:-8%;top:-10%"></span>
      <span class="hero__glow" style="left:-12%;bottom:-14%;opacity:.3"></span>
      {big_emblem(t['emblem'])}
    </div>
    <div class="guides"><span class="v" style="left:13%"></span><span class="v" style="right:13%"></span><span class="h" style="top:20%"></span></div>"""
    cls = {"left":"hero--left","right":"hero--right","center":"hero--center","split":"hero--split"}[variant]
    if variant == "split":
        body = f"""<div class="container">{panel}
        <div data-reveal data-delay="1"><div class="hero__card"><svg class="emblem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">{IC[t['emblem']]}</svg></div></div>
        </div>"""
    else:
        body = f"""<div class="container">{panel}</div>"""
    return f"""<section class="hero {cls}">
    {scene}
    {body}
    <a class="scroll-cue" href="#approche" aria-label="Faire défiler"><span class="mouse"></span><span>Défiler</span></a>
  </section>"""

def solutions(t):
    cards = ""
    for i,(ic,h3,p) in enumerate(t["sol"]):
        cards += f"""<a class="tile" href="#contact" data-reveal data-delay="{(i%3)+1}">{icon(ic)}<h3>{h3}</h3><p>{p}</p><span class="link-arrow">En savoir plus {ARROW}</span></a>"""
    return f"""<section class="section band-cream" id="solutions">
    <div class="container">
      <div class="center" style="max-width:720px;margin-inline:auto" data-reveal>
        <p class="eyebrow">Nos solutions</p>
        <h2 class="title-lg">Une expertise patrimoniale complète, dédiée à votre métier</h2>
        <hr class="rule">
        <p class="lede">Chaque solution est pensée pour les réalités concrètes de votre profession — fiscalité, revenus, retraite et transmission.</p>
      </div>
      <div class="grid grid-3" style="margin-top:54px">{cards}</div>
      <div class="center" style="margin-top:46px" data-reveal><a class="btn btn--accent" href="#contact">Échanger avec un conseiller {ARROW}</a></div>
    </div>
  </section>"""

def stats(t):
    items = ""
    for i,(num,lbl) in enumerate(t["stats"]):
        items += f"""<div data-reveal data-delay="{i}"><div class="stat__num">{num}</div><div class="stat__lbl">{lbl}</div></div>"""
    return f"""<section class="section band-dark"><div class="container"><div class="stats">{items}</div></div></section>"""

def page(t):
    nav = "".join(f'<a class="nav__link" href="{href}">{label}</a>' for label,href in NAV)
    brand2 = f' <span style="opacity:.7">{t["brand2"]}</span>' if t["brand2"] else ""
    f1,f2 = t["fonts"]
    fonts_link = (f'<link href="https://fonts.googleapis.com/css2?family={f1}&family={f2}&display=swap" rel="stylesheet">')
    intro_eb,intro_t,intro_l,intro_b = t["intro"]
    foot_links = "".join(f'<li><a href="#solutions">{h3}</a></li>' for ic,h3,p in t["sol"][:4])
    email = f'contact@{t["slug"].replace("-","")}.fr'
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(t['brand'])} — {html.escape(t['metier'])}</title>
<meta name="description" content="{html.escape(t['metier'])}. {html.escape(t['sub'])}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts_link}
<style>{css(t)}</style>
</head>
<body>
<header class="site-header">
  <div class="container">
    <a class="brand" href="#" aria-label="{html.escape(t['brand'])} — accueil">
      <span class="brand__mark">{t['mono']}</span>
      <span class="brand__name"><b>{t['brand']}{brand2}</b><span>{t['metier']}</span></span>
    </a>
    <nav class="nav" aria-label="Navigation principale">{nav}<a class="btn btn--ghost" href="#contact">Prendre rendez-vous</a></nav>
  </div>
</header>
<main>
  {hero(t)}

  <section class="section" id="approche">
    <div class="container split">
      <div data-reveal>
        <p class="eyebrow">{intro_eb}</p>
        <h2 class="title-lg">{intro_t}</h2>
        <hr class="rule">
        <p class="lede">{intro_l}</p>
        <p>{intro_b}</p>
        <a class="link-arrow" href="#solutions">Découvrir notre accompagnement {ARROW}</a>
      </div>
      <div class="split__media" data-reveal data-delay="1"><div class="media-frame">{icon(t['emblem'],'')}</div></div>
    </div>
  </section>

  {solutions(t)}
  {stats(t)}

  <section class="section">
    <div class="container">
      <div class="quote" data-reveal>
        <p>{t['quote']}</p>
        <cite>{t['brand']}{(' '+t['brand2']) if t['brand2'] else ''}</cite>
      </div>
    </div>
  </section>

  <section class="cta-band section--tight" id="contact"><div class="container">
    <div data-reveal>
      <p class="eyebrow eyebrow--light">Un échange confidentiel</p>
      <h2>Échangeons sur votre situation</h2>
      <p>Nos conseillers, spécialistes de votre profession, vous reçoivent en toute confidentialité pour étudier vos objectifs patrimoniaux.</p>
    </div>
    <div class="cta-band__actions" data-reveal data-delay="1">
      <a class="btn btn--light" href="mailto:{email}">Nous contacter {ARROW}</a>
      <a class="btn btn--ghost" href="mailto:{email}">{email}</a>
    </div>
  </div></section>
</main>
<footer class="site-footer"><div class="container">
  <div class="footer-grid">
    <div>
      <a class="brand" href="#"><span class="brand__mark">{t['mono']}</span><span class="brand__name"><b>{t['brand']}{brand2}</b><span>{t['metier']}</span></span></a>
      <p style="max-width:36ch;font-size:.94rem;margin-top:14px">{t['metier']}. Une gestion patrimoniale sur-mesure, alignée avec les réalités de votre profession.</p>
    </div>
    <div><h5>Nos solutions</h5><ul class="footer-links">{foot_links}</ul></div>
    <div class="footer-contact"><h5>Nous contacter</h5><p>58 avenue des Champs-Élysées, 75008 Paris</p><p><a href="mailto:{email}">{email}</a></p>
      <p style="margin-top:14px"><a class="link-arrow" href="#contact">Prendre rendez-vous {ARROW}</a></p></div>
  </div>
  <p class="disclaimer">Maquette de démonstration. Les informations présentées ont une vocation strictement illustrative et ne constituent ni un conseil en investissement, ni une offre. Tout investissement comporte des risques, notamment de perte en capital. La fiscalité dépend de la situation individuelle de chaque client.</p>
  <div class="footer-bottom"><span>© 2026 {t['brand']}{(' '+t['brand2']) if t['brand2'] else ''} — Tous droits réservés.</span><span>Mentions légales · Contact</span></div>
</div></footer>
<script>
(function(){{
  var h=document.querySelector('.site-header');
  function s(){{h.classList.toggle('is-solid',window.scrollY>40);}}
  s();window.addEventListener('scroll',s,{{passive:true}});
  var els=document.querySelectorAll('[data-reveal]');
  function revealAll(){{for(var i=0;i<els.length;i++){{els[i].className+=' is-in';}}}}
  try {{
    if('IntersectionObserver' in window){{
      var io=new IntersectionObserver(function(es){{
        for(var i=0;i<es.length;i++){{
          if(es[i].isIntersecting){{es[i].target.className+=' is-in';io.unobserve(es[i].target);}}
        }}
      }},{{threshold:.12}});
      for(var i=0;i<els.length;i++){{io.observe(els[i]);}}
    }} else {{
      revealAll();
    }}
  }} catch(e) {{ revealAll(); }}
  /* Safety net: guarantee visibility even if the observer never fires
     (static renderers, snapshot tools, edge-case browsers). Skips the
     transition for stragglers only, so normal scroll-triggered reveals
     (already done well before this fires) are unaffected. */
  setTimeout(function(){{
    for(var i=0;i<els.length;i++){{
      if(els[i].className.indexOf('is-in')===-1){{ els[i].style.transition='none'; els[i].className+=' is-in'; }}
    }}
  }}, 1200);
}})();
</script>
</body>
</html>"""

# ---------------------------------------------------------------------------
# Galerie d'index
# ---------------------------------------------------------------------------
def gallery():
    cards = ""
    for t in THEMES:
        c = t["c"]
        cards += f"""<a class="g-card" href="{t['slug']}.html">
          <div class="g-prev" style="background:linear-gradient(135deg,{c['base']},{c['base2']})">
            <span class="g-mono" style="border-color:{c['accent2']};color:{c['accent2']}">{t['mono']}</span>
            <svg class="g-em" viewBox="0 0 24 24" fill="none" stroke="{c['accent']}" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round">{IC[t['emblem']]}</svg>
            <span class="g-pill" style="color:{c['accent2']};border-color:{c['accent2']}">{t['metier']}</span>
          </div>
          <div class="g-body">
            <b>{t['brand']}{(' '+t['brand2']) if t['brand2'] else ''}</b>
            <p>{t['sub'][:96]}…</p>
            <span class="g-link" style="color:{c['accent']}">Voir la maquette →</span>
          </div>
        </a>"""
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maquettes "clones" par corps de métier — galerie</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box}}
body{{margin:0;font-family:'Jost',system-ui,sans-serif;background:#0f1410;color:#1a1a1a;line-height:1.6}}
.hd{{background:linear-gradient(135deg,#001B00,#0B2E16);color:#F6F2E9;padding:64px 24px 56px;text-align:center}}
.hd h1{{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:clamp(2rem,5vw,3.2rem);margin:0 0 14px}}
.hd p{{max-width:640px;margin:0 auto;color:rgba(246,242,233,.8);font-weight:300}}
.eb{{font-size:.74rem;letter-spacing:.28em;text-transform:uppercase;color:#C9A86A;margin:0 0 16px}}
.wrap{{max-width:1240px;margin:-30px auto 0;padding:0 24px 80px}}
.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}}
.g-card{{background:#fff;border-radius:8px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:0 18px 50px rgba(0,0,0,.18);
  transition:transform .5s cubic-bezier(.22,.61,.36,1),box-shadow .5s;display:flex;flex-direction:column}}
.g-card:hover{{transform:translateY(-8px);box-shadow:0 30px 70px rgba(0,0,0,.28)}}
.g-prev{{position:relative;aspect-ratio:16/10;display:grid;place-items:center;overflow:hidden}}
.g-em{{width:46%;height:46%;opacity:.85}}
.g-mono{{position:absolute;top:16px;left:18px;width:40px;height:40px;border:1px solid;border-radius:50%;display:grid;place-items:center;
  font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:600}}
.g-pill{{position:absolute;left:18px;right:18px;bottom:16px;border:1px solid;border-radius:30px;padding:7px 14px;font-size:.66rem;
  letter-spacing:.12em;text-transform:uppercase;text-align:center;background:rgba(0,0,0,.18);backdrop-filter:blur(4px)}}
.g-body{{padding:22px 24px 26px}}
.g-body b{{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:600;display:block;margin-bottom:8px}}
.g-body p{{font-size:.9rem;color:#5B6058;margin:0 0 16px;font-weight:300}}
.g-link{{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;font-weight:500}}
.ft{{text-align:center;color:rgba(246,242,233,.6);font-size:.82rem;padding:0 24px 50px}}
@media (max-width:980px){{.grid{{grid-template-columns:repeat(2,1fr)}}}}
@media (max-width:620px){{.grid{{grid-template-columns:1fr}}}}
</style></head>
<body>
<div class="hd">
  <p class="eb">10 maquettes — Gestion privée spécialisée</p>
  <h1>Des sites « clones » par corps de métier</h1>
  <p>Dix déclinaisons de la maison-mère, chacune avec son identité visuelle propre (palette, typographie, mise en page), mais toutes résolument haut de gamme. Cliquez pour ouvrir chaque page d’accueil.</p>
</div>
<div class="wrap"><div class="grid">{cards}</div></div>
<p class="ft">Maquettes de démonstration générées par <code>clones/build_clones.py</code></p>
</body></html>"""

# ---------------------------------------------------------------------------
def main():
    for t in THEMES:
        with open(os.path.join(OUT, f"{t['slug']}.html"), "w", encoding="utf-8") as f:
            f.write(page(t))
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(gallery())
    print(f"OK — {len(THEMES)} pages + index.html générés dans {OUT}")

if __name__ == "__main__":
    main()
