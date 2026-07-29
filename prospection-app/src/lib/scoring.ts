// Moteur de scoring commercial — transparent et paramétrable.
//
// Chaque règle produit une contribution (positive ou négative) accompagnée
// d'un libellé lisible, afin d'expliquer le score dans la fiche du prospect.

import type { SiteAnalysis } from "./site-analyzer";
import { priorityFromScore, type ProspectPriority } from "./domain";

export interface ScoringWeights {
  noWebsite: number;
  notMobileFriendly: number;
  noBooking: number;
  slowOrBroken: number;
  goodRating: number; // note >= 4/5
  manyReviews: number; // > 30 avis
  activeSocialNoWebsite: number;
  noCallToAction: number;
  missingInfo: number;
  modernSitePenalty: number; // négatif
  bookingIntegratedPenalty: number; // négatif
  chainPenalty: number; // négatif
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  noWebsite: 30,
  notMobileFriendly: 20,
  noBooking: 15,
  slowOrBroken: 10,
  goodRating: 10,
  manyReviews: 10,
  activeSocialNoWebsite: 15,
  noCallToAction: 5,
  missingInfo: 5,
  modernSitePenalty: -30,
  bookingIntegratedPenalty: -15,
  chainPenalty: -20,
};

export interface ScoreInput {
  hasWebsite: boolean;
  site: SiteAnalysis | null;
  rating?: number | null;
  reviewCount?: number | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isChain?: boolean;
}

export interface ScoreContribution {
  key: keyof ScoringWeights;
  label: string;
  points: number;
}

export interface ScoreResult {
  score: number; // 0..100
  priority: ProspectPriority;
  contributions: ScoreContribution[];
}

export function computeScore(input: ScoreInput, weights: ScoringWeights = DEFAULT_WEIGHTS): ScoreResult {
  const c: ScoreContribution[] = [];
  const site = input.site;
  const hasSocial = Boolean(input.facebookUrl || input.instagramUrl);

  const push = (key: keyof ScoringWeights, label: string) => {
    const points = weights[key];
    if (points !== 0) c.push({ key, label, points });
  };

  if (!input.hasWebsite) {
    push("noWebsite", "Aucun site internet");
    if (hasSocial) push("activeSocialNoWebsite", "Présence sociale mais aucun site");
  } else if (site) {
    if (!site.reachable || site.brokenReasons.length > 0) {
      push("slowOrBroken", "Site cassé ou en erreur");
    }
    if (site.reachable) {
      if (!site.hasViewport) push("notMobileFriendly", "Site non adapté au mobile");
      if (!site.hasBooking) push("noBooking", "Absence de prise de rendez-vous");
      if (site.slow) push("slowOrBroken", "Site lent");
      if (!site.hasCallToAction) push("noCallToAction", "Absence d'appel à l'action clair");
      if (site.isModern) push("modernSitePenalty", "Site déjà moderne et efficace");
      if (site.hasBooking && site.hasBookingWellIntegrated) {
        push("bookingIntegratedPenalty", "Réservation déjà bien intégrée");
      }
    }
  }

  if ((input.rating ?? 0) >= 4) push("goodRating", "Note ≥ 4/5");
  if ((input.reviewCount ?? 0) > 30) push("manyReviews", "Plus de 30 avis");

  const missing = !input.phone || !input.email || !input.address;
  if (missing) push("missingInfo", "Informations de contact incomplètes");

  if (input.isChain) push("chainPenalty", "Chaîne / franchise (digital centralisé)");

  const raw = c.reduce((sum, x) => sum + x.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  return { score, priority: priorityFromScore(score), contributions: c };
}

/**
 * Détection heuristique d'une chaîne/franchise à partir du nom.
 * Volontairement conservatrice.
 */
const CHAIN_HINTS = [
  "franprix",
  "carrefour",
  "mcdonald",
  "subway",
  "dessange",
  "jean louis david",
  "jean-louis david",
  "franck provost",
  "tchip",
  "midas",
  "norauto",
  "feu vert",
  "speedy",
];

export function looksLikeChain(name: string): boolean {
  const n = name.toLowerCase();
  return CHAIN_HINTS.some((h) => n.includes(h));
}
