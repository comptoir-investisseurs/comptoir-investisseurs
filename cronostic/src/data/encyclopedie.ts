/**
 * Encyclopédie des calibres — segmentation par marque de mouvement.
 *
 * ⚠️ STATUT DES DONNÉES : brouillon intégral.
 *
 * Chaque mouvement listé ici est une **fiche d'amorce** : référence, période,
 * type et, quand ils sont connus sans ambiguïté, les repères dimensionnels.
 * Rien n'y est relevé sur une planche constructeur. Tout s'affiche donc sur le
 * site avec le repère ◆ « indicatif », et rien n'est présenté comme certifié.
 * La validation se fait fiche par fiche depuis le back-office.
 *
 * Un champ dont la valeur n'est pas certaine est **omis**, jamais deviné : une
 * case vide se complète, une case fausse se propage.
 *
 * Les dix calibres Omega 30 mm de `catalog.ts` gardent leur fiche détaillée —
 * ce sont ceux qui portent un guide. Les entrées ci-dessous les complètent
 * sans les remplacer.
 *
 * Abréviations des champs, pour tenir une ligne par mouvement :
 *   l   lignes (1 ligne = 2,2558 mm)      d   diamètre en mm
 *   h   hauteur en mm                     r   nombre de rubis
 *   a   alternances par heure             res réserve de marche en heures
 *   base ébauche d'origine                note précision d'atelier
 */

export type TypeMvt =
  | "manuel"
  | "auto"
  | "chrono"
  | "chrono-auto"
  | "complication"
  | "quartz";

export type Mvt = {
  ref: string;
  nom?: string;
  type: TypeMvt;
  debut?: number;
  fin?: number;
  l?: number;
  d?: number;
  h?: number;
  r?: number;
  a?: number;
  res?: number;
  base?: string;
  note?: string;
};

export type CategorieMarque = "ebauche" | "manufacture" | "maison";

export type Marque = {
  slug: string;
  nom: string;
  pays: string;
  categorie: CategorieMarque;
  actif: string;
  resume: string;
  mouvements: Mvt[];
};

export const LIBELLES_TYPE: Record<TypeMvt, string> = {
  manuel: "Remontage manuel",
  auto: "Automatique",
  chrono: "Chronographe manuel",
  "chrono-auto": "Chronographe automatique",
  complication: "Complication",
  quartz: "Quartz",
};

export const LIBELLES_CATEGORIE: Record<CategorieMarque, string> = {
  ebauche: "Fabriques d'ébauches",
  manufacture: "Manufactures",
  maison: "Maisons horlogères",
};

/**
 * Ordre d'affichage. Le classement suit la **nature** de la marque, pas sa
 * géographie : à l'établi, savoir si un mouvement sort d'une fabrique
 * d'ébauches ou d'une manufacture change tout à la recherche de fournitures ;
 * savoir s'il est suisse ou japonais ne change rien. Le pays figure sur chaque
 * fiche, il n'a pas à structurer la page.
 */
export const ORDRE_CATEGORIES: CategorieMarque[] = ["ebauche", "manufacture", "maison"];

import { EBAUCHES } from "./marques/ebauches";
import { MAISONS } from "./marques/maisons";
import { HORS_SUISSE } from "./marques/hors-suisse";

export const MARQUES: Marque[] = [...EBAUCHES, ...MAISONS, ...HORS_SUISSE];
