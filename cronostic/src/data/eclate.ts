/**
 * Vue éclatée d'un mouvement — géométrie du schéma.
 *
 * ⚠️ Ce n'est pas un relevé, c'est un **schéma d'assemblage**. Les formes sont
 * stylisées et les positions traduisent l'ordre de montage, pas les cotes
 * réelles du calibre. Un plan coté demanderait le dessin d'atelier du
 * constructeur ; le prétendre serait malhonnête, et la page le dit.
 *
 * Ce que le schéma restitue fidèlement, en revanche :
 *   — l'ordre des couches, de la platine aux ponts puis au balancier ;
 *   — la chaîne cinématique, du barillet à l'échappement ;
 *   — le numéro de fourniture de chaque pièce, qui est la seule donnée
 *     normalisée et donc la seule vérifiable.
 *
 * Les positions sont exprimées dans un repère de 980 × 420, projeté en
 * isométrie légère : chaque couche est décalée vers la droite et vers le haut,
 * comme sur une planche éclatée d'atelier. Le cadrage est serré sur le dessin
 * — de la place perdue autour, c'est du trait perdu à l'écran.
 */

export type FormePiece = "roue" | "pont" | "platine" | "levier" | "ressort" | "axe" | "balancier";

export type PieceSchema = {
  /** Numéro de la liste normalisée des fournitures. */
  n: string;
  x: number;
  y: number;
  /** Rayon pour les roues, demi-largeur pour les autres formes. */
  r: number;
  forme: FormePiece;
  /** Couche d'assemblage, de 0 (platine) vers le haut. */
  couche: number;
};

export type CoucheSchema = { indice: number; titre: string; x: number };

/**
 * Couches d'un mouvement à remontage manuel. L'ordre est celui du remontage à
 * l'établi, pas celui du démontage : c'est dans ce sens qu'on lit un éclaté.
 */
export const COUCHES: CoucheSchema[] = [
  { indice: 0, titre: "Platine", x: 105 },
  { indice: 1, titre: "Rouage et barillet", x: 292 },
  { indice: 2, titre: "Ponts et échappement", x: 502 },
  { indice: 3, titre: "Balancier", x: 676 },
  { indice: 4, titre: "Remontage et cadrature", x: 862 },
];

/** Décalage vertical par couche : l'isométrie légère de la planche éclatée. */
export const PENTE = -18;

export const SCHEMA_MANUEL: PieceSchema[] = [
  // ── Couche 0 : le bâti ────────────────────────────────────────────
  { n: "100", x: 105, y: 214, r: 82, forme: "platine", couche: 0 },

  // ── Couche 1 : ce qui tourne, du barillet à l'échappement ─────────
  { n: "180", x: 268, y: 138, r: 46, forme: "roue", couche: 1 },
  { n: "195", x: 268, y: 138, r: 28, forme: "ressort", couche: 1 },
  { n: "182", x: 268, y: 138, r: 13, forme: "axe", couche: 1 },
  { n: "201", x: 340, y: 208, r: 33, forme: "roue", couche: 1 },
  { n: "210", x: 262, y: 262, r: 26, forme: "roue", couche: 1 },
  { n: "224", x: 336, y: 312, r: 23, forme: "roue", couche: 1 },
  { n: "227", x: 262, y: 356, r: 18, forme: "roue", couche: 1 },

  // ── Couche 2 : ponts et échappement ──────────────────────────────
  { n: "105", x: 470, y: 136, r: 54, forme: "pont", couche: 2 },
  { n: "110", x: 512, y: 234, r: 60, forme: "pont", couche: 2 },
  { n: "125", x: 464, y: 330, r: 32, forme: "pont", couche: 2 },
  { n: "710", x: 542, y: 344, r: 26, forme: "levier", couche: 2 },

  // ── Couche 3 : le balancier ──────────────────────────────────────
  { n: "121", x: 676, y: 144, r: 48, forme: "pont", couche: 3 },
  { n: "721", x: 682, y: 268, r: 52, forme: "balancier", couche: 3 },
  { n: "771", x: 682, y: 268, r: 33, forme: "ressort", couche: 3 },
  { n: "722", x: 682, y: 268, r: 11, forme: "axe", couche: 3 },

  // ── Couche 4 : remontage, mise à l'heure et cadrature ────────────
  { n: "415", x: 846, y: 118, r: 27, forme: "roue", couche: 4 },
  { n: "420", x: 916, y: 160, r: 23, forme: "roue", couche: 4 },
  { n: "423", x: 792, y: 156, r: 17, forme: "levier", couche: 4 },
  { n: "425", x: 838, y: 188, r: 15, forme: "ressort", couche: 4 },
  { n: "401", x: 892, y: 240, r: 38, forme: "axe", couche: 4 },
  { n: "410", x: 830, y: 240, r: 17, forme: "roue", couche: 4 },
  { n: "407", x: 830, y: 288, r: 16, forme: "roue", couche: 4 },
  { n: "435", x: 776, y: 292, r: 22, forme: "levier", couche: 4 },
  { n: "443", x: 892, y: 316, r: 22, forme: "levier", couche: 4 },
  { n: "445", x: 838, y: 344, r: 16, forme: "ressort", couche: 4 },
  { n: "450", x: 940, y: 288, r: 16, forme: "roue", couche: 4 },
  { n: "2501", x: 776, y: 372, r: 15, forme: "roue", couche: 4 },
  { n: "2556", x: 838, y: 404, r: 19, forme: "roue", couche: 4 },
  { n: "2557", x: 902, y: 386, r: 15, forme: "roue", couche: 4 },
];

/**
 * Chaîne cinématique : les couples qui s'engrènent, du barillet au balancier.
 * Tracée en trait fin sur le schéma — c'est ce qui distingue une planche
 * éclatée d'un simple tas de pièces.
 */
export const ENGRENAGES: [string, string][] = [
  ["180", "201"],
  ["201", "210"],
  ["210", "224"],
  ["224", "227"],
  ["227", "710"],
  ["710", "721"],
  ["415", "180"],
  ["420", "415"],
  ["410", "420"],
  ["401", "410"],
  ["2501", "2557"],
  ["2557", "2556"],
];

/** Nomenclature normalisée, pour les calibres dont la liste n'est pas relevée. */
export const NOMS_NORMALISES: Record<string, { fr: string; en: string }> = {
  "100": { fr: "Platine", en: "Main plate" },
  "105": { fr: "Pont de barillet", en: "Barrel bridge" },
  "110": { fr: "Pont de rouage", en: "Train wheel bridge" },
  "121": { fr: "Pont de balancier", en: "Balance bridge" },
  "125": { fr: "Pont d'ancre", en: "Pallet bridge" },
  "180": { fr: "Barillet complet", en: "Barrel complete" },
  "182": { fr: "Tambour de barillet avec arbre", en: "Barrel drum with arbor" },
  "195": { fr: "Ressort de barillet", en: "Mainspring" },
  "201": { fr: "Roue de centre", en: "Centre wheel" },
  "210": { fr: "Roue moyenne", en: "Third wheel" },
  "224": { fr: "Roue de seconde", en: "Fourth wheel" },
  "227": { fr: "Roue d'échappement", en: "Escape wheel" },
  "401": { fr: "Tige de remontoir", en: "Winding stem" },
  "407": { fr: "Pignon coulant", en: "Sliding pinion" },
  "410": { fr: "Pignon de remontoir", en: "Winding pinion" },
  "415": { fr: "Rochet", en: "Ratchet wheel" },
  "420": { fr: "Roue de couronne", en: "Crown wheel" },
  "423": { fr: "Cliquet", en: "Click" },
  "425": { fr: "Ressort-cliquet", en: "Click spring" },
  "435": { fr: "Bascule de pignon de remontoir", en: "Yoke" },
  "443": { fr: "Tirette", en: "Setting lever" },
  "445": { fr: "Sautoir de tirette", en: "Setting lever jumper" },
  "450": { fr: "Renvoi", en: "Setting wheel" },
  "710": { fr: "Ancre", en: "Pallet fork" },
  "721": { fr: "Balancier complet", en: "Balance complete" },
  "722": { fr: "Axe de balancier", en: "Balance staff" },
  "771": { fr: "Spiral", en: "Hairspring" },
  "2501": { fr: "Chaussée", en: "Cannon pinion" },
  "2556": { fr: "Roue des heures", en: "Hour wheel" },
  "2557": { fr: "Roue de minuterie", en: "Minute wheel" },
};
