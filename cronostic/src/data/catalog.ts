/**
 * Catalogue de lancement CRONOSTIC.
 *
 * Ce fichier est la source unique du seed de base de données ET du mode démo
 * (site consultable sans `DATABASE_URL`). Il ne contient aucun contenu de
 * guide : les PDF CRONOSTIC sont produits hors du site et simplement
 * téléversés depuis /admin/guides.
 *
 * ⚠️ Statut des données : `draft`.
 * Les valeurs techniques ci-dessous sont un point de départ destiné à être
 * relu à l'établi puis validé depuis le back-office. Toute caractéristique
 * portant `verified: false` est affichée sur le site avec la mention
 * « à valider » et n'est jamais présentée comme certifiée.
 */

export type SeedSpec = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  verified?: boolean;
};

export type SeedLubricationPoint = {
  location: string;
  lubricant: string; // slug d'un lubrifiant
  quantity?: string;
  notes?: string;
};

export type SeedCaliber = {
  slug: string;
  reference: string;
  name: string;
  family: string; // slug de famille
  introducedYear?: number;
  discontinuedYear?: number;
  summary: string;
  presentation: string;
  history: string;
  architecture: string;
  specs: SeedSpec[];
  related: string[]; // slugs
  parts: string[]; // références de pièces
  lubrication: SeedLubricationPoint[];
  tools: string[]; // slugs d'outils
};

export type SeedFamily = {
  slug: string;
  name: string;
  brand: string;
  yearsActive: string;
  description: string;
};

export type SeedPart = {
  reference: string;
  positionNumber: string;
  name: string;
  nameEn: string;
  category: string;
  description?: string;
};

export type SeedLubricant = {
  slug: string;
  brand: string;
  reference: string;
  name: string;
  type: string;
  viscosity?: string;
  usage: string;
  colorHex: string;
};

export type SeedTool = {
  slug: string;
  name: string;
  category: string;
  description: string;
};

/* ────────────────────────────────────────────────────────────
   Familles
   ──────────────────────────────────────────────────────────── */

export const FAMILIES: SeedFamily[] = [
  {
    slug: "omega-30-mm",
    name: "Omega 30 mm",
    brand: "Omega",
    yearsActive: "1939 – 1963",
    description:
      "La famille des mouvements ronds de 30 millimètres à remontage manuel, ouverte par le calibre 30T2 en 1939 puis prolongée par les séries 26x et 28x. Architecture à barillet unique, rouage droit et échappement à ancre suisse, réputée pour sa robustesse d'atelier et sa facilité de réglage.",
  },
];

/* ────────────────────────────────────────────────────────────
   Nomenclature des fournitures (famille 30 mm)
   Les numéros suivent la nomenclature suisse des fournitures.
   Ils restent à recouper avec les planches Omega d'époque.
   ──────────────────────────────────────────────────────────── */

export const PARTS: SeedPart[] = [
  { reference: "30MM-100", positionNumber: "100", name: "Platine", nameEn: "Main plate", category: "bâti" },
  { reference: "30MM-105", positionNumber: "105", name: "Pont de barillet", nameEn: "Barrel bridge", category: "bâti" },
  { reference: "30MM-110", positionNumber: "110", name: "Pont de rouage", nameEn: "Train wheel bridge", category: "bâti" },
  { reference: "30MM-121", positionNumber: "121", name: "Pont de balancier", nameEn: "Balance bridge", category: "bâti" },
  { reference: "30MM-125", positionNumber: "125", name: "Pont d'ancre", nameEn: "Pallet bridge", category: "bâti" },
  { reference: "30MM-180", positionNumber: "180", name: "Barillet complet", nameEn: "Barrel complete", category: "barillet" },
  { reference: "30MM-182", positionNumber: "182", name: "Tambour de barillet avec arbre", nameEn: "Barrel drum with arbor", category: "barillet" },
  { reference: "30MM-195", positionNumber: "195", name: "Ressort de barillet", nameEn: "Mainspring", category: "barillet", description: "Pièce d'usure : remplacement systématique au démontage complet." },
  { reference: "30MM-201", positionNumber: "201", name: "Roue de centre", nameEn: "Centre wheel", category: "rouage" },
  { reference: "30MM-210", positionNumber: "210", name: "Roue moyenne", nameEn: "Third wheel", category: "rouage" },
  { reference: "30MM-224", positionNumber: "224", name: "Roue de seconde", nameEn: "Fourth wheel", category: "rouage" },
  { reference: "30MM-227", positionNumber: "227", name: "Roue d'échappement", nameEn: "Escape wheel", category: "échappement" },
  { reference: "30MM-710", positionNumber: "710", name: "Ancre", nameEn: "Pallet fork", category: "échappement" },
  { reference: "30MM-721", positionNumber: "721", name: "Balancier complet", nameEn: "Balance complete", category: "échappement" },
  { reference: "30MM-722", positionNumber: "722", name: "Axe de balancier", nameEn: "Balance staff", category: "échappement", description: "Pièce fragile : contrôler les pivots à la loupe avant remontage." },
  { reference: "30MM-771", positionNumber: "771", name: "Spiral", nameEn: "Hairspring", category: "échappement" },
  { reference: "30MM-401", positionNumber: "401", name: "Tige de remontoir", nameEn: "Winding stem", category: "remontage" },
  { reference: "30MM-407", positionNumber: "407", name: "Pignon coulant", nameEn: "Sliding pinion", category: "remontage" },
  { reference: "30MM-410", positionNumber: "410", name: "Pignon de remontoir", nameEn: "Winding pinion", category: "remontage" },
  { reference: "30MM-415", positionNumber: "415", name: "Rochet", nameEn: "Ratchet wheel", category: "remontage" },
  { reference: "30MM-420", positionNumber: "420", name: "Roue de couronne", nameEn: "Crown wheel", category: "remontage" },
  { reference: "30MM-423", positionNumber: "423", name: "Cliquet", nameEn: "Click", category: "remontage" },
  { reference: "30MM-425", positionNumber: "425", name: "Ressort-cliquet", nameEn: "Click spring", category: "remontage", description: "Pièce facilement perdue : travailler sous cloche ou sur tapis clair." },
  { reference: "30MM-435", positionNumber: "435", name: "Bascule de pignon de remontoir", nameEn: "Yoke", category: "remontage" },
  { reference: "30MM-443", positionNumber: "443", name: "Tirette", nameEn: "Setting lever", category: "remontage" },
  { reference: "30MM-445", positionNumber: "445", name: "Sautoir de tirette", nameEn: "Setting lever jumper", category: "remontage" },
  { reference: "30MM-450", positionNumber: "450", name: "Renvoi", nameEn: "Setting wheel", category: "remontage" },
  { reference: "30MM-2501", positionNumber: "2501", name: "Chaussée", nameEn: "Cannon pinion", category: "cadrature" },
  { reference: "30MM-2556", positionNumber: "2556", name: "Roue des heures", nameEn: "Hour wheel", category: "cadrature" },
  { reference: "30MM-2557", positionNumber: "2557", name: "Roue de minuterie", nameEn: "Minute wheel", category: "cadrature" },
];

/** Pièces communes à toute la famille 30 mm. */
const COMMON_PARTS = PARTS.map((p) => p.reference);

/* ────────────────────────────────────────────────────────────
   Huiles, graisses et consommables
   ──────────────────────────────────────────────────────────── */

export const LUBRICANTS: SeedLubricant[] = [
  {
    slug: "moebius-9010",
    brand: "Moebius",
    reference: "9010",
    name: "Synt-A-Lube 9010",
    type: "huile",
    viscosity: "fine",
    usage: "Pivots du rouage rapide, roue d'échappement, ancre, contre-pivots antichocs.",
    colorHex: "#D8C48A",
  },
  {
    slug: "moebius-9020",
    brand: "Moebius",
    reference: "9020",
    name: "Synt-A-Lube 9020",
    type: "huile",
    viscosity: "fine à moyenne",
    usage: "Alternative au 9010 sur les pivots du rouage lorsqu'une viscosité légèrement supérieure est souhaitée.",
    colorHex: "#CBB77E",
  },
  {
    slug: "moebius-hp-1300",
    brand: "Moebius",
    reference: "HP-1300",
    name: "Synt-HP-1300",
    type: "huile",
    viscosity: "épaisse",
    usage: "Pivots lents et fortement chargés : barillet, roue de centre, mobiles de mise à l'heure.",
    colorHex: "#B99755",
  },
  {
    slug: "moebius-9415",
    brand: "Moebius",
    reference: "9415",
    name: "Lubeta 9415",
    type: "graisse",
    viscosity: "thixotrope",
    usage: "Levées de l'ancre et plateau. Application au huileur fin, quantité minimale.",
    colorHex: "#E0DCCB",
  },
  {
    slug: "moebius-8200",
    brand: "Moebius",
    reference: "8200",
    name: "Graisse 8200",
    type: "graisse",
    usage: "Ressort de barillet des mouvements à remontage manuel, parois du tambour.",
    colorHex: "#EDE7D4",
  },
  {
    slug: "moebius-8300",
    brand: "Moebius",
    reference: "8300",
    name: "Graisse 8300",
    type: "graisse",
    usage: "Cadrature, chaussée, roue des heures, minuterie.",
    colorHex: "#E6DFC8",
  },
  {
    slug: "moebius-9501",
    brand: "Moebius",
    reference: "9501",
    name: "Molykote / Graisse 9501",
    type: "graisse",
    usage: "Tige de remontoir, pignon coulant, bascule, tirette, dentures de remontage.",
    colorHex: "#D5D0BE",
  },
  {
    slug: "moebius-9504",
    brand: "Moebius",
    reference: "9504",
    name: "Graisse 9504",
    type: "graisse",
    usage: "Ressort-cliquet, sautoir de tirette et points de frottement à forte pression.",
    colorHex: "#DAD4C0",
  },
  {
    slug: "moebius-8981",
    brand: "Moebius",
    reference: "8981",
    name: "Épilame Fixodrop ES/BS",
    type: "épilame",
    usage: "Traitement anti-étalement de la roue d'échappement, de l'ancre et des pierres avant lubrification.",
    colorHex: "#C9D3D6",
  },
  {
    slug: "elma-wf-pro",
    brand: "Elma",
    reference: "WF Pro",
    name: "Elma WF Pro",
    type: "produit de nettoyage",
    usage: "Bain de nettoyage des composants métalliques en machine, hors balancier et pièces collées.",
    colorHex: "#B7C6CC",
  },
];

/* ────────────────────────────────────────────────────────────
   Outillage
   ──────────────────────────────────────────────────────────── */

export const TOOLS: SeedTool[] = [
  { slug: "porte-mouvement", name: "Porte-mouvement réglable", category: "établi", description: "Maintien du mouvement pendant le démontage et le remontage, sans contrainte sur les ponts." },
  { slug: "tournevis-060-160", name: "Jeu de tournevis 0,60 à 1,60 mm", category: "établi", description: "Lames affûtées et ajustées aux fentes d'origine pour ne pas marquer les vis." },
  { slug: "brucelles-laiton", name: "Brucelles laiton n° 3", category: "établi", description: "Manipulation des pièces polies sans risque de magnétisation ni de rayure." },
  { slug: "huileurs", name: "Jeu de huileurs 1 à 4", category: "lubrification", description: "Un huileur dédié par produit, jamais mélangé." },
  { slug: "machine-nettoyage", name: "Machine à nettoyer à ultrasons", category: "nettoyage", description: "Cycles courts, paniers séparés pour les petites fournitures." },
  { slug: "potence-chassage", name: "Potence de chassage", category: "outillage lourd", description: "Chassage de l'axe de balancier et des canons, avec jeu de tas et poinçons." },
  { slug: "chronocomparateur", name: "Chronocomparateur", category: "contrôle", description: "Contrôle de la marche, de l'amplitude et du repère dans les positions de référence." },
  { slug: "loupe-35", name: "Loupe binoculaire ou loupe 3,5×", category: "contrôle", description: "Contrôle des pivots, des pierres et de l'état de l'ellipse." },
  { slug: "poire-soufflante", name: "Poire soufflante", category: "nettoyage", description: "Séchage et dépoussiérage sans contact." },
  { slug: "demagnetiseur", name: "Démagnétiseur", category: "contrôle", description: "Passage systématique avant contrôle de marche." },
];

/* ────────────────────────────────────────────────────────────
   Calibres
   ──────────────────────────────────────────────────────────── */

const BASE_SPECS = (opts: {
  seconds: string;
  jewels: string;
  height?: string;
  reserve?: string;
}): SeedSpec[] => [
  { key: "brand", label: "Marque", value: "Omega", verified: true },
  { key: "family", label: "Famille", value: "Omega 30 mm", verified: true },
  { key: "winding", label: "Remontage", value: "Manuel", verified: true },
  { key: "diameter", label: "Diamètre", value: "30,0", unit: "mm", verified: true },
  { key: "lignes", label: "Diamètre en lignes", value: "13 ¼", unit: "'''", verified: true },
  { key: "height", label: "Hauteur", value: opts.height ?? "4,5", unit: "mm", verified: false },
  { key: "jewels", label: "Nombre de rubis", value: opts.jewels, verified: false },
  { key: "frequency", label: "Fréquence", value: "18 000", unit: "alt/h", verified: true },
  { key: "beat", label: "Battements", value: "2,5", unit: "Hz", verified: true },
  { key: "seconds", label: "Affichage de la seconde", value: opts.seconds, verified: false },
  { key: "reserve", label: "Réserve de marche", value: opts.reserve ?? "≈ 45", unit: "h", verified: false },
  { key: "escapement", label: "Échappement", value: "Ancre suisse", verified: true },
  { key: "shock", label: "Protection antichoc", value: "Incabloc (selon exécution)", verified: false },
  { key: "balance", label: "Balancier", value: "Balancier annulaire à vis, spiral plat", verified: false },
];

export const CALIBERS: SeedCaliber[] = [
  {
    slug: "omega-30t2",
    reference: "30T2",
    name: "Omega calibre 30T2",
    family: "omega-30-mm",
    introducedYear: 1939,
    summary:
      "Le mouvement fondateur de la famille 30 millimètres, référence de robustesse et de réglage dans l'horlogerie Omega d'avant-guerre.",
    presentation:
      "Le 30T2 ouvre en 1939 la lignée des mouvements ronds de 30 millimètres à remontage manuel qui équipera Omega pendant près d'un quart de siècle. Sa conception privilégie l'accessibilité : ponts largement dimensionnés, rouage droit, échappement dégagé. C'est un mouvement que l'on démonte sans acrobatie et que l'on règle avec une marge de manœuvre confortable.\n\nÀ l'établi, le 30T2 se distingue par la qualité de ses finitions fonctionnelles — pivots soignés, pierres bien alignées, denture régulière — plutôt que par une décoration ostentatoire. C'est un mouvement d'usage, conçu pour durer et pour être entretenu.",
    history:
      "Introduit à la veille de la Seconde Guerre mondiale, le 30T2 a équipé aussi bien des montres civiles que des commandes militaires britanniques. Il a été décliné en plusieurs exécutions selon l'affichage de la seconde et le niveau de réglage, et a servi de base aux séries 26x et 28x qui lui succèdent au milieu des années 1950.",
    architecture:
      "Barillet unique sous pont dédié, rouage à quatre mobiles, échappement à ancre suisse sous pont d'ancre séparé, balancier annulaire sous pont réglable. Le remontage et la mise à l'heure sont commandés par une bascule classique, tirette et sautoir côté platine.",
    specs: BASE_SPECS({ seconds: "Petite seconde ou seconde au centre selon exécution", jewels: "15 à 17 selon exécution", reserve: "≈ 45" }),
    related: ["omega-265", "omega-266", "omega-267", "omega-268", "omega-269"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-265",
    reference: "265",
    name: "Omega calibre 265",
    family: "omega-30-mm",
    introducedYear: 1955,
    summary:
      "Successeur direct du 30T2 en exécution petite seconde, le 265 est le calibre 30 millimètres le plus répandu de la série.",
    presentation:
      "Le 265 reprend l'architecture éprouvée du 30T2 en y apportant les évolutions de la seconde moitié des années 1950 : protection antichoc généralisée, mise au point du balancier et du spiral, finitions industrielles plus régulières.\n\nC'est le calibre que l'on rencontre le plus souvent à l'établi dans cette famille. Sa mécanique est saine, ses fournitures encore trouvables, et son comportement au chronocomparateur reste excellent dès lors que le nettoyage et la lubrification sont correctement conduits.",
    history:
      "Le 265 s'inscrit dans la renumérotation des mouvements 30 millimètres opérée par Omega au milieu des années 1950. Il a équipé de très nombreuses montres de ville à petite seconde jusqu'au début des années 1960.",
    architecture:
      "Barillet unique, rouage droit, petite seconde entraînée directement par la roue de seconde. Ponts de barillet et de rouage séparés, pont d'ancre indépendant facilitant le contrôle de l'échappement.",
    specs: BASE_SPECS({ seconds: "Petite seconde", jewels: "17" }),
    related: ["omega-30t2", "omega-266", "omega-267", "omega-268"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-266",
    reference: "266",
    name: "Omega calibre 266",
    family: "omega-30-mm",
    introducedYear: 1955,
    summary:
      "Variante soignée du 265, en exécution petite seconde, avec un niveau de réglage supérieur.",
    presentation:
      "Le 266 partage la platine et le rouage du 265. Il s'en distingue par le niveau de finition et de réglage retenu par la manufacture, ce qui en fait un mouvement particulièrement agréable à ajuster.\n\nPour l'horloger, la procédure d'entretien est identique à celle du 265 : les différences portent sur la qualité des composants d'échappement et sur les tolérances de réglage, pas sur la cinématique.",
    history:
      "Produit parallèlement au 265 au sein de la série 26x, le 266 équipe des modèles positionnés plus haut dans la gamme.",
    architecture:
      "Identique au 265 : barillet unique, rouage droit à quatre mobiles, petite seconde, échappement à ancre suisse sous pont séparé.",
    specs: BASE_SPECS({ seconds: "Petite seconde", jewels: "17" }),
    related: ["omega-265", "omega-267", "omega-268", "omega-30t2"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-267",
    reference: "267",
    name: "Omega calibre 267",
    family: "omega-30-mm",
    introducedYear: 1955,
    summary:
      "Exécution à seconde au centre de la série 26x, avec le mobile intermédiaire caractéristique.",
    presentation:
      "Le 267 transpose la base 30 millimètres en affichage seconde au centre. L'aiguille est entraînée par un mobile supplémentaire, avec le dispositif de friction destiné à éviter le flottement de l'aiguille.\n\nCe détail change la méthode de travail : l'ordre de remontage du rouage n'est plus le même que sur un 265, et le contrôle de la friction de la seconde devient un point de vigilance à part entière.",
    history:
      "Introduit avec la série 26x, le 267 répond à la généralisation de la seconde au centre sur les montres de ville de la fin des années 1950.",
    architecture:
      "Barillet unique, rouage droit complété par un mobile de seconde au centre et son ressort de friction. Ponts identiques à ceux du 265 dans leur découpe générale.",
    specs: BASE_SPECS({ seconds: "Seconde au centre", jewels: "17" }),
    related: ["omega-265", "omega-266", "omega-268", "omega-269"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-268",
    reference: "268",
    name: "Omega calibre 268",
    family: "omega-30-mm",
    introducedYear: 1956,
    summary:
      "Variante haut de gamme à seconde au centre de la série 26x.",
    presentation:
      "Le 268 est au 267 ce que le 266 est au 265 : même architecture, exécution plus soignée. Il se règle finement et supporte bien les positions verticales lorsque l'échappement est propre et l'amplitude correcte.\n\nÀ l'entretien, on portera une attention particulière à l'état de l'axe de balancier et à la propreté des levées, deux points qui conditionnent la stabilité de marche de cette exécution.",
    history:
      "Produit au sein de la série 26x à partir du milieu des années 1950, en accompagnement des modèles à seconde au centre les plus soignés.",
    architecture:
      "Barillet unique, rouage droit, mobile de seconde au centre avec friction, échappement à ancre suisse, balancier sous pont réglable.",
    specs: BASE_SPECS({ seconds: "Seconde au centre", jewels: "17" }),
    related: ["omega-267", "omega-266", "omega-269", "omega-283"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-269",
    reference: "269",
    name: "Omega calibre 269",
    family: "omega-30-mm",
    introducedYear: 1957,
    summary:
      "Dernière évolution de la série 26x à seconde au centre, produite jusqu'au début des années 1960.",
    presentation:
      "Le 269 clôt la série 26x. Il bénéficie des mises au point accumulées sur la famille 30 millimètres, notamment au niveau de l'antichoc et du réglage du balancier.\n\nC'est un mouvement fiable, dont la remise en état ne pose pas de difficulté particulière dès lors que les fournitures d'échappement sont disponibles.",
    history:
      "Produit à la fin des années 1950, le 269 accompagne les dernières montres à remontage manuel de 30 millimètres avant le passage d'Omega aux nouvelles familles de calibres du début des années 1960.",
    architecture:
      "Barillet unique, rouage droit avec mobile de seconde au centre, échappement à ancre suisse, pont de balancier réglable.",
    specs: BASE_SPECS({ seconds: "Seconde au centre", jewels: "17" }),
    related: ["omega-267", "omega-268", "omega-283", "omega-284"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-283",
    reference: "283",
    name: "Omega calibre 283",
    family: "omega-30-mm",
    introducedYear: 1956,
    summary:
      "Série 28x à seconde au centre, dérivée de la base 30 millimètres.",
    presentation:
      "La série 28x prolonge la famille 30 millimètres avec des exécutions destinées aux montres de ville et aux Seamaster de l'époque. Le 283 en est l'une des versions à seconde au centre les plus courantes.\n\nLa dépose et la repose suivent la logique de la famille : barillet, rouage, échappement, balancier. Les points de vigilance portent sur la friction de la seconde et sur l'état du ressort de barillet.",
    history:
      "Produit à partir du milieu des années 1950 en parallèle de la série 26x, jusqu'au début des années 1960.",
    architecture:
      "Barillet unique, rouage droit avec mobile de seconde au centre, échappement à ancre suisse sous pont séparé.",
    specs: BASE_SPECS({ seconds: "Seconde au centre", jewels: "17" }),
    related: ["omega-284", "omega-285", "omega-286", "omega-269"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-284",
    reference: "284",
    name: "Omega calibre 284",
    family: "omega-30-mm",
    introducedYear: 1956,
    summary:
      "Variante de la série 28x sur base 30 millimètres à remontage manuel.",
    presentation:
      "Le 284 appartient à la même génération que le 283 et partage l'essentiel de ses fournitures. Les écarts portent sur l'exécution de l'affichage et sur le niveau de réglage.\n\nL'entretien suit la procédure standard de la famille 30 millimètres, avec un contrôle systématique de l'axe de balancier et des pierres avant remontage.",
    history: "Produit au sein de la série 28x à partir du milieu des années 1950.",
    architecture:
      "Barillet unique, rouage droit, échappement à ancre suisse, balancier annulaire sous pont réglable.",
    specs: BASE_SPECS({ seconds: "Selon exécution", jewels: "17" }),
    related: ["omega-283", "omega-285", "omega-286"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-285",
    reference: "285",
    name: "Omega calibre 285",
    family: "omega-30-mm",
    introducedYear: 1957,
    summary:
      "Exécution tardive de la série 28x, contemporaine des dernières montres 30 millimètres à remontage manuel.",
    presentation:
      "Le 285 bénéficie des dernières mises au point de la famille. Il se comporte bien au chronocomparateur et supporte un réglage fin lorsque l'échappement est en bon état.\n\nComme sur l'ensemble de la série, le remplacement du ressort de barillet et un épilamage soigné de l'échappement font une différence nette sur l'amplitude obtenue.",
    history: "Produit à la fin des années 1950 au sein de la série 28x.",
    architecture:
      "Barillet unique, rouage droit, échappement à ancre suisse, pont de balancier réglable.",
    specs: BASE_SPECS({ seconds: "Selon exécution", jewels: "17" }),
    related: ["omega-283", "omega-284", "omega-286"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
  {
    slug: "omega-286",
    reference: "286",
    name: "Omega calibre 286",
    family: "omega-30-mm",
    introducedYear: 1958,
    summary:
      "Dernière référence du catalogue de lancement CRONOSTIC pour la famille 30 millimètres.",
    presentation:
      "Le 286 ferme la série 28x. Il partage la base mécanique de la famille et se travaille exactement de la même manière, ce qui en fait un bon mouvement d'apprentissage pour qui découvre l'architecture 30 millimètres.\n\nLes fournitures étant largement communes à la famille, l'approvisionnement reste raisonnable pour un mouvement de cette époque.",
    history: "Produit à la fin des années 1950 et au début des années 1960, en fin de vie de la famille 30 millimètres.",
    architecture:
      "Barillet unique, rouage droit, échappement à ancre suisse, balancier sous pont réglable.",
    specs: BASE_SPECS({ seconds: "Selon exécution", jewels: "17" }),
    related: ["omega-283", "omega-284", "omega-285"],
    parts: COMMON_PARTS,
    lubrication: [],
    tools: TOOLS.map((t) => t.slug),
  },
];

/* ────────────────────────────────────────────────────────────
   Points de lubrification — communs à la famille 30 mm
   ──────────────────────────────────────────────────────────── */

const COMMON_LUBRICATION: SeedLubricationPoint[] = [
  { location: "Pierres du rouage rapide (moyenne, seconde, échappement)", lubricant: "moebius-9010", quantity: "Goutte fine", notes: "Épilamer au préalable." },
  { location: "Pivots de la roue de centre et du barillet", lubricant: "moebius-hp-1300", quantity: "Goutte moyenne" },
  { location: "Levées de l'ancre et ellipse du plateau", lubricant: "moebius-9415", quantity: "Trace", notes: "Quantité minimale : l'excès fait chuter l'amplitude." },
  { location: "Contre-pivots antichoc du balancier", lubricant: "moebius-9010", quantity: "Goutte très fine", notes: "Huiler la pierre percée avant repose du ressort." },
  { location: "Ressort de barillet et parois du tambour", lubricant: "moebius-8200", quantity: "Filet régulier" },
  { location: "Tige de remontoir, pignon coulant, bascule, tirette", lubricant: "moebius-9501", quantity: "Trace" },
  { location: "Ressort-cliquet et sautoir de tirette", lubricant: "moebius-9504", quantity: "Trace" },
  { location: "Chaussée, roue des heures, minuterie", lubricant: "moebius-8300", quantity: "Trace" },
  { location: "Roue d'échappement et ancre (avant montage)", lubricant: "moebius-8981", quantity: "Traitement au bain", notes: "Séchage complet avant lubrification." },
];

for (const caliber of CALIBERS) {
  caliber.lubrication = COMMON_LUBRICATION;
}

/* ────────────────────────────────────────────────────────────
   Guides CRONOSTIC — enregistrements de démonstration.
   Le PDF réel se téléverse depuis /admin/guides ; tant qu'aucun
   fichier n'est attaché, le guide reste dépublié.
   ──────────────────────────────────────────────────────────── */

export type SeedGuide = {
  caliberSlug: string;
  slug: string;
  title: string;
  shortDescription: string;
  priceCents: number;
  pageCount: number | null;
  includedInSubscription: boolean;
  isActive: boolean;
};

export const GUIDES: SeedGuide[] = CALIBERS.map((c) => ({
  caliberSlug: c.slug,
  slug: `guide-${c.slug}`,
  title: `${c.name.replace("Omega calibre", "Omega").toUpperCase()} — Guide complet d'entretien`,
  shortDescription: `Le guide d'atelier CRONOSTIC consacré au calibre ${c.reference} : démontage, nettoyage, contrôle, lubrification, remontage et points de vigilance.`,
  priceCents: 1490,
  pageCount: null,
  includedInSubscription: true,
  // Aucun PDF n'est encore attaché : les guides restent dépubliés
  // jusqu'au téléversement du fichier depuis le back-office.
  isActive: false,
}));

export const GUIDE_HIGHLIGHTS = [
  "Démontage",
  "Nettoyage",
  "Contrôle",
  "Lubrification",
  "Remontage",
  "Points de vigilance",
] as const;
