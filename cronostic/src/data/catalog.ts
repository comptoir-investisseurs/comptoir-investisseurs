/**
 * Catalogue de lancement Cronostic.
 *
 * Ce fichier est la source unique du seed de base de données ET du mode démo
 * (site consultable sans `DATABASE_URL`). Il ne contient aucun contenu de
 * guide : les PDF Cronostic sont produits hors du site et simplement
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
  /** Publication qui porte la valeur : éditeur, nature de la fiche, date du relevé. */
  source?: string;
  sourceUrl?: string;
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
  /** Identifiant interne, jamais affiché : ce n'est pas une référence de commande. */
  reference: string;
  /** Numéro de la liste normalisée des fournitures d'horlogerie. */
  positionNumber: string;
  name: string;
  nameEn: string;
  category: string;
  description?: string;
  /** Relevé sur une planche constructeur ? Faux tant que ce n'est pas le cas. */
  verified?: boolean;
  /** D'où vient la valeur validée : planche, catalogue, page et date. */
  source?: string;
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

   ⚠️ Deux choses distinctes, à ne pas confondre :

   1. Le **numéro de fourniture** (100, 195, 721…) vient de la liste
      normalisée de l'horlogerie suisse, commune à tous les calibres. Elle est
      publique et stable — mais les valeurs ci-dessous n'ont pas été recoupées
      une à une sur un document d'époque.

   2. La **référence de commande** du constructeur, qui seule permet de
      commander une fourniture, ne se déduit pas du numéro. Elle figure sur la
      planche du calibre. Aucune n'est connue ici : le champ `reference`
      ci-dessous est un identifiant interne, jamais affiché comme référence.

   Tant que `verified` est faux, la fiche l'annonce et n'affiche pas de
   référence de commande. La validation se fait depuis /admin/pieces, où l'on
   saisit la référence relevée et la source qui l'atteste.
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

/* ────────────────────────────────────────────────────────────
   Relevé du 9 août 2026

   Deux publications indépendantes ont été dépouillées calibre par calibre :

   - **Ranfft DB** (ranfft.org), qui couvre les dix calibres. Chaque fiche
     porte les cotes, le nombre de rubis, la réserve, l'angle de levée, et
     reprend en pied la composition complète de la série 30.
   - **Caliber Corner** (calibercorner.com), qui ne publie de fiche que pour
     le 265 et le 269.

   La règle appliquée est celle du dépôt : **deux sources concordantes valent
   une attestation** (`verified: true`), une source seule vaut une valeur
   corrigée mais toujours annoncée comme indicative, et une divergence vaut un
   doute signalé — jamais un arbitrage silencieux.

   Ce relevé a corrigé quatre erreurs de fond, dont trois portaient la mention
   « vérifié » à tort :

   1. **Diamètre.** 30,5 mm hors tout, et non 30,0. Les deux publications
      concordent ; Caliber Corner lève l'ambiguïté en distinguant le diamètre
      total (30,5) du diamètre d'encageage (30,0). C'est ce dernier qui donne
      son nom à la famille — le nom est nominal, la cote ne l'est pas.
   2. **Affichage de la seconde.** Les 267, 268 et 269 étaient donnés à
      seconde au centre : ils sont à **petite seconde**. La série 30 se scinde
      en deux lignées parallèles, `sub second` (30T2, 26x) et `sweep second`
      (30T2SC, 28x). La hauteur le confirme d'elle-même : 4,05 mm sans mobile
      de seconde au centre, 5,10 mm avec.
   3. **Hauteur.** 4,5 mm partout, valeur qui ne correspond à aucune des deux
      lignées.
   4. **Balancier et spiral.** « Annulaire à vis, spiral plat » partout, alors
      que la série évolue : balancier à vis puis annulaire à partir du 268,
      spiral Breguet puis plat à partir du 269.

   L'angle de levée (49°) est ajouté : il ne figurait pas et c'est le réglage
   qu'on saisit au chronocomparateur avant toute mesure d'amplitude.
   ──────────────────────────────────────────────────────────── */

const RANFFT = (id: string) => `https://ranfft.org/caliber/${id}`;
const CC = (ref: string) => `https://calibercorner.com/omega-caliber-${ref}/`;

/** Attesté par Ranfft et Caliber Corner sur la fiche même du calibre. */
const DEUX_SOURCES = "Ranfft DB et Caliber Corner, fiches du calibre, relevé du 9 août 2026";
/** Relevé sur Ranfft seul : valeur corrigée, mais non attestée. */
const RANFFT_SEUL = "Ranfft DB, fiche du calibre, relevé du 9 août 2026 — source unique";
/**
 * Caractéristiques que toute la série partage — marque, remontage, fréquence,
 * échappement. Caliber Corner ne publie que le 265 et le 269, mais ces
 * valeurs-là ne varient pas d'un calibre à l'autre : les deux fiches suffisent
 * à les attester pour la famille entière. Les porter comme « source unique »
 * sur les huit autres serait faux dans l'autre sens.
 */
const FAMILLE_DEUX =
  "Ranfft DB et Caliber Corner, fiches des 265 et 269, relevé du 9 août 2026 — caractéristique commune à la série 30";

type SpecsInput = {
  /** Identifiant de la fiche Ranfft, seule source à couvrir les dix calibres. */
  ranfft: string;
  /** Référence Caliber Corner quand la fiche existe (265 et 269 seulement). */
  cc?: string;
  seconds: string;
  jewels: string;
  height: string;
  balance: string;
  /**
   * Seul le 269 a son balancier décrit par les deux publications : la fiche
   * Caliber Corner du 265 ne porte ni balancier ni spiral.
   */
  balanceAtteste?: boolean;
  shock: string;
  /** Renseigné quand les deux sources divergent : la divergence est affichée. */
  shockNote?: string;
  reserve?: string;
};

const BASE_SPECS = (o: SpecsInput): SeedSpec[] => {
  const url = RANFFT(o.ranfft);
  const ccUrl = o.cc ? CC(o.cc) : undefined;
  // Une valeur n'est attestée que si les deux publications la portent : pour
  // huit calibres sur dix, Caliber Corner n'a pas de fiche.
  const deux = Boolean(o.cc);
  const src = deux ? DEUX_SOURCES : RANFFT_SEUL;

  return [
    { key: "brand", label: "Marque", value: "Omega", verified: true, source: FAMILLE_DEUX, sourceUrl: url },
    { key: "family", label: "Famille", value: "Omega 30 mm", verified: true, source: FAMILLE_DEUX, sourceUrl: url },
    { key: "winding", label: "Remontage", value: "Manuel", verified: true, source: FAMILLE_DEUX, sourceUrl: url },
    {
      key: "diameter",
      label: "Diamètre",
      value: "30,5",
      unit: "mm",
      verified: true,
      source:
        "Ranfft DB (30,5 mm) et Caliber Corner (30,5 mm hors tout, 30,0 mm d'encageage), relevé du 9 août 2026",
      sourceUrl: ccUrl ?? CC("269"),
    },
    {
      key: "lignes",
      label: "Diamètre en lignes",
      value: "13 ½",
      unit: "'''",
      verified: true,
      source: "Ranfft DB (13,52‴), concordant avec 30,5 mm ÷ 2,2558 — relevé du 9 août 2026",
      sourceUrl: url,
    },
    { key: "height", label: "Hauteur", value: o.height, unit: "mm", verified: deux, source: src, sourceUrl: url },
    { key: "jewels", label: "Nombre de rubis", value: o.jewels, verified: deux, source: src, sourceUrl: url },
    {
      key: "frequency",
      label: "Fréquence",
      value: "18 000",
      unit: "alt/h",
      verified: true,
      source: FAMILLE_DEUX,
      sourceUrl: url,
    },
    { key: "beat", label: "Battements", value: "2,5", unit: "Hz", verified: true, source: FAMILLE_DEUX, sourceUrl: url },
    {
      key: "lift",
      label: "Angle de levée",
      value: "49",
      unit: "°",
      verified: deux,
      source: deux ? src : "Ranfft DB, fiche du calibre — valeur commune à l'échappement de la série",
      sourceUrl: url,
    },
    {
      // Corrigé sur trois calibres. Ranfft porte l'information deux fois — au
      // champ « complication » et dans la composition de la série — et la
      // hauteur la recoupe, mais cela reste un seul éditeur : la valeur ne
      // devient attestée que là où Caliber Corner la confirme.
      key: "seconds",
      label: "Affichage de la seconde",
      value: o.seconds,
      verified: deux,
      source: deux
        ? DEUX_SOURCES
        : "Ranfft DB, complication du calibre et composition de la série 30 portée en pied de fiche — source unique, recoupée par la hauteur",
      sourceUrl: url,
    },
    {
      // Ranfft donne 45 h, Caliber Corner 40~45 h sur le 265 et 42 h et plus
      // sur le 269 : l'ordre de grandeur est constant, la valeur exacte non.
      key: "reserve",
      label: "Réserve de marche",
      value: o.reserve ?? "≈ 45",
      unit: "h",
      verified: false,
      source: "Ranfft DB (45 h) et Caliber Corner (40 à 45 h) — sources divergentes, valeur donnée en ordre de grandeur",
      sourceUrl: url,
    },
    { key: "escapement", label: "Échappement", value: "Ancre suisse", verified: true, source: FAMILLE_DEUX, sourceUrl: url },
    {
      key: "shock",
      label: "Protection antichoc",
      value: o.shock,
      verified: false,
      source: o.shockNote ?? src,
      sourceUrl: url,
    },
    {
      key: "balance",
      label: "Balancier",
      value: o.balance,
      verified: o.balanceAtteste ?? false,
      source: o.balanceAtteste
        ? "Ranfft DB (composition de la série 30) et Caliber Corner (balancier Glucydur sans vis, spiral plat), relevé du 9 août 2026"
        : "Ranfft DB, composition de la série 30 portée en pied de fiche — source unique",
      sourceUrl: url,
    },
  ];
};

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
      "Introduit à la veille de la Seconde Guerre mondiale, le 30T2 a équipé aussi bien des montres civiles que des commandes militaires britanniques. Il a essaimé en références distinctes plutôt qu'en variantes d'un même calibre : le 30T2PC pour l'exécution protégée des chocs, le 30T2SC pour la seconde au centre, avant que les séries 26x et 28x ne lui succèdent au milieu des années 1950 — la première en petite seconde, la seconde au centre.",
    architecture:
      "Barillet unique sous pont dédié, rouage à quatre mobiles, petite seconde entraînée directement, échappement à ancre suisse sous pont d'ancre séparé, balancier à vis sous pont réglable. Le remontage et la mise à l'heure sont commandés par une bascule classique, tirette et sautoir côté platine.",
    specs: BASE_SPECS({
      ranfft: "8414-Omega-30T2",
      seconds: "Petite seconde",
      jewels: "15",
      height: "4,05",
      balance: "Balancier à vis, spiral Breguet",
      shock: "Sans protection antichoc (Incabloc sur l'exécution 30T2PC)",
      shockNote: "Ranfft se contredit : la fiche du calibre porte Incabloc, la composition de la série le donne sans protection — l'antichoc distingue précisément l'exécution PC",
      reserve: "≈ 44",
    }),
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
    specs: BASE_SPECS({
      ranfft: "8376-Omega-265",
      cc: "265",
      seconds: "Petite seconde",
      jewels: "15",
      height: "4,05",
      balance: "Balancier à vis, spiral Breguet",
      shock: "Incabloc",
    }),
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
      "Le 265 porté à dix-sept rubis, en exécution petite seconde et à balancier antimagnétique.",
    presentation:
      "Le 266 partage la platine, le rouage et l'affichage petite seconde du 265. Ce qui les sépare tient au comptage : dix-sept rubis au lieu de quinze, l'empierrage supplémentaire portant sur les mobiles les plus sollicités.\n\nPour l'horloger, la procédure d'entretien est celle du 265 — même cinématique, même ordre de remontage. La vigilance se déplace simplement sur les pierres additionnelles, qu'il faut contrôler et huiler comme les autres.",
    history:
      "Produit parallèlement au 265 au sein de la série 26x, le 266 équipe des modèles positionnés plus haut dans la gamme.",
    architecture:
      "Identique au 265 : barillet unique, rouage droit à quatre mobiles, petite seconde, échappement à ancre suisse sous pont séparé.",
    specs: BASE_SPECS({
      ranfft: "8375-Omega-266",
      seconds: "Petite seconde",
      jewels: "17",
      height: "4,00",
      balance: "Balancier à vis, spiral Breguet",
      shock: "Incabloc",
    }),
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
      "Exécution petite seconde à dix-sept rubis de la série 26x, contemporaine du 266.",
    presentation:
      "Le 267 appartient au même échelon que le 266 : dix-sept rubis, balancier antimagnétique, affichage petite seconde. Les deux références sont données ensemble par la documentation, sans que ce qui les distingue soit établi ici — vraisemblablement une différence d'exécution ou de destination, pas de cinématique.\n\nÀ l'établi, cela signifie qu'un 267 se démonte et se remonte exactement comme un 266. Aucun mobile supplémentaire, aucun dispositif de friction : le rouage est celui, direct, de la petite seconde.",
    history:
      "Introduit avec la série 26x au milieu des années 1950, le 267 accompagne le 266 dans les montres de ville à petite seconde de la fin de la décennie.",
    architecture:
      "Barillet unique, rouage droit à quatre mobiles, petite seconde entraînée directement par la roue de seconde. Ponts identiques à ceux du 265 dans leur découpe générale.",
    specs: BASE_SPECS({
      ranfft: "8374-Omega-267",
      seconds: "Petite seconde",
      jewels: "17",
      height: "4,05",
      balance: "Balancier à vis, spiral Breguet",
      shock: "Incabloc",
    }),
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
      "L'exécution de la série 26x qui abandonne le balancier à vis pour un balancier annulaire.",
    presentation:
      "Le 268 reprend la base petite seconde du 267 et change son organe réglant : au balancier à vis succède un balancier annulaire, sans masselottes. C'est la seule différence que la documentation retienne, et elle n'est pas anodine — c'est le passage au réglage d'usine, sans reprise possible par déplacement des vis.\n\nÀ l'entretien, la conséquence est directe : le réglage se fait à la raquette et par l'état de l'échappement, jamais en touchant au balancier. On contrôlera l'axe et la propreté des levées, qui conditionnent seuls la stabilité de marche.",
    history:
      "Produit au sein de la série 26x à partir du milieu des années 1950, le 268 marque le passage de la famille au balancier annulaire.",
    architecture:
      "Barillet unique, rouage droit à quatre mobiles, petite seconde directe, échappement à ancre suisse, balancier annulaire et spiral Breguet sous pont réglable.",
    specs: BASE_SPECS({
      ranfft: "8371-Omega-268",
      seconds: "Petite seconde",
      jewels: "17",
      height: "4,05",
      balance: "Balancier annulaire, spiral Breguet",
      shock: "Incabloc",
    }),
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
      "Dernière évolution de la série 26x, seule à recevoir le spiral plat. Produite jusqu'au début des années 1960.",
    presentation:
      "Le 269 clôt la série 26x en reprenant le balancier annulaire du 268 et en substituant un spiral plat au spiral Breguet. C'est la seule référence de la lignée petite seconde à recevoir ce spiral, et c'est ce qui la fait reconnaître au démontage.\n\nLe spiral plat se repose plus simplement qu'une courbe Breguet, mais il pardonne moins : la planéité et le centrage doivent être irréprochables, faute de quoi l'écart entre positions horizontales et verticales s'installe et ne se rattrape pas à la raquette.",
    history:
      "Produit au début des années 1960, le 269 accompagne les dernières montres à remontage manuel de 30 millimètres avant le passage d'Omega aux nouvelles familles de calibres.",
    architecture:
      "Barillet unique, rouage droit à quatre mobiles, petite seconde directe, échappement à ancre suisse, balancier annulaire Glucydur et spiral plat sous pont réglable.",
    specs: BASE_SPECS({
      ranfft: "8381-Omega-269",
      cc: "269",
      seconds: "Petite seconde",
      jewels: "17",
      height: "4,05",
      balance: "Balancier annulaire sans vis (Glucydur), spiral plat",
      balanceAtteste: true,
      shock: "KIF ou Novochoc selon la source",
      shockNote: "Ranfft donne KIF, Caliber Corner Novochoc — sources divergentes, à trancher sur une planche Omega",
    }),
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
    specs: BASE_SPECS({
      ranfft: "8398-Omega-283",
      seconds: "Seconde au centre",
      jewels: "17",
      height: "5,10",
      balance: "Balancier à vis, spiral Breguet",
      shock: "Incabloc",
    }),
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
      "Le pendant du 283 dans la série 28x à seconde au centre, à dix-sept rubis et balancier antimagnétique.",
    presentation:
      "Le 284 appartient à la même génération que le 283 et partage l'essentiel de ses fournitures : seconde au centre, dix-sept rubis, balancier à vis antimagnétique. La documentation donne les deux références ensemble, sans que ce qui les sépare soit établi ici.\n\nL'entretien suit la procédure de la famille, avec le point de vigilance propre à la lignée seconde au centre : le ressort de friction du mobile de seconde, dont la tension conditionne la tenue de l'aiguille.",
    history: "Produit au sein de la série 28x à partir du milieu des années 1950.",
    architecture:
      "Barillet unique, rouage droit complété par un mobile de seconde au centre et son ressort de friction, échappement à ancre suisse, balancier à vis et spiral Breguet sous pont réglable.",
    specs: BASE_SPECS({
      ranfft: "8394-Omega-284",
      seconds: "Seconde au centre",
      jewels: "17",
      height: "5,10",
      balance: "Balancier à vis, spiral Breguet",
      shock: "Incabloc",
    }),
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
      "L'exécution de la série 28x qui passe au balancier annulaire, sur base seconde au centre.",
    presentation:
      "Le 285 est au 284 ce que le 268 est au 267 : même base, balancier annulaire à la place du balancier à vis. Les deux lignées de la série 30, petite seconde et seconde au centre, évoluent en parallèle et reçoivent les mêmes organes réglants au même moment.\n\nLe réglage se fait donc à la raquette et par l'état de l'échappement. Comme sur l'ensemble de la série, le remplacement du ressort de barillet et un épilamage soigné font une différence nette sur l'amplitude obtenue.",
    history: "Produit à la fin des années 1950 au sein de la série 28x.",
    architecture:
      "Barillet unique, rouage droit avec mobile de seconde au centre et ressort de friction, échappement à ancre suisse, balancier annulaire et spiral Breguet sous pont réglable.",
    specs: BASE_SPECS({
      ranfft: "8399-Omega-285",
      seconds: "Seconde au centre",
      jewels: "17",
      height: "5,10",
      balance: "Balancier annulaire, spiral Breguet",
      shock: "Incabloc",
    }),
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
      "Dernière référence de la famille 30 millimètres : seconde au centre, balancier annulaire et spiral plat.",
    presentation:
      "Le 286 ferme la série 28x et, avec elle, la famille 30 millimètres. Il est au 285 ce que le 269 est au 268 : le spiral plat y remplace le spiral Breguet. Les deux lignées s'achèvent ainsi sur la même configuration, à l'affichage de la seconde près.\n\nLes fournitures étant largement communes à la famille, l'approvisionnement reste raisonnable pour un mouvement de cette époque. La reprise d'un spiral plat demande en revanche une planéité irréprochable : c'est là que se joue l'écart entre positions.",
    history: "Produit au début des années 1960, en fin de vie de la famille 30 millimètres.",
    architecture:
      "Barillet unique, rouage droit avec mobile de seconde au centre et ressort de friction, échappement à ancre suisse, balancier annulaire et spiral plat sous pont réglable.",
    specs: BASE_SPECS({
      ranfft: "8395-Omega-286",
      seconds: "Seconde au centre",
      jewels: "17",
      height: "5,10",
      balance: "Balancier annulaire, spiral plat",
      shock: "KIF",
    }),
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
   Guides Cronostic — enregistrements de démonstration.
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
  shortDescription: `Le guide d'atelier Cronostic consacré au calibre ${c.reference} : démontage, nettoyage, contrôle, lubrification, remontage et points de vigilance.`,
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
