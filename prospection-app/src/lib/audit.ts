// Génération d'un audit commercial (mode « sans IA », déterministe).
//
// Règles de rédaction : formulations prudentes, aucune donnée chiffrée
// inventée, aucune promesse de chiffre d'affaires.

import { z } from "zod";
import type { SiteAnalysis } from "./site-analyzer";
import { STATUS_LABELS, PRIORITY_LABELS, type ProspectPriority } from "./domain";

export const ProspectAuditSchema = z.object({
  summary: z.string().min(1).max(1200),
  strengths: z.array(z.string()).max(8),
  weaknesses: z.array(z.string()).max(8),
  priorityIssues: z.array(z.string()).max(6),
  opportunities: z.array(z.string()).max(8),
  recommendedSolution: z.string().max(600),
  commercialProposal: z.string().max(600),
  possibleBenefits: z.array(z.string()).max(8),
  priority: z.enum(["faible", "moyenne", "elevee", "tres_elevee"]),
});

export type ProspectAudit = z.infer<typeof ProspectAuditSchema>;

export interface AuditInput {
  businessName: string;
  category?: string | null;
  city?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  hasWebsite: boolean;
  site: SiteAnalysis | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  priority: ProspectPriority;
}

function ratingSentence(input: AuditInput): string {
  if (input.rating && input.reviewCount) {
    return `${input.businessName} dispose d'une fiche locale bien identifiée avec ${input.reviewCount} avis et une note de ${input.rating.toString().replace(".", ",")}/5.`;
  }
  if (input.rating) {
    return `${input.businessName} affiche une note de ${input.rating.toString().replace(".", ",")}/5 sur sa fiche locale.`;
  }
  return `${input.businessName} est présent localement${input.city ? ` à ${input.city}` : ""}.`;
}

export function buildAuditWithRules(input: AuditInput): ProspectAudit {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const priorityIssues: string[] = [];
  const opportunities: string[] = [];
  const benefits: string[] = [];

  if ((input.rating ?? 0) >= 4) strengths.push("Bonne réputation locale (note élevée)");
  if ((input.reviewCount ?? 0) > 30) strengths.push("Volume d'avis significatif");
  if (input.facebookUrl || input.instagramUrl) strengths.push("Présence sur les réseaux sociaux");

  const site = input.site;
  let summaryTail = "";

  if (!input.hasWebsite) {
    weaknesses.push("Aucun site internet associé à l'établissement");
    priorityIssues.push("Absence totale de site : information dispersée entre téléphone et réseaux sociaux");
    opportunities.push("Créer un site vitrine mobile présentant prestations, horaires et coordonnées");
    if (input.facebookUrl || input.instagramUrl) {
      opportunities.push("Centraliser l'information aujourd'hui dispersée sur les réseaux sociaux");
    }
    benefits.push("Donnerait une image plus professionnelle");
    benefits.push("Permettrait aux clients de trouver les informations plus facilement");
    summaryTail =
      " En revanche, aucun site internet n'est actuellement associé à l'établissement. Les clients doivent passer par téléphone ou par les réseaux sociaux pour obtenir des informations.";
  } else if (site) {
    if (!site.reachable || site.brokenReasons.length > 0) {
      weaknesses.push("Le site actuel semble inaccessible ou en erreur");
      priorityIssues.push("Site cassé : la présence en ligne ne remplit pas son rôle");
      opportunities.push("Remettre en ligne un site fiable et rapide");
      summaryTail = " Le site actuellement référencé semble inaccessible ou en erreur.";
    } else {
      if (!site.hasViewport) {
        weaknesses.push("Site peu adapté à la consultation sur mobile");
        priorityIssues.push("Non-adaptation mobile : navigation difficile pour une majorité de visiteurs");
      }
      if (site.looksOld) weaknesses.push("Le site paraît ancien (technologies ou copyright datés)");
      if (site.slow) weaknesses.push("Temps de chargement perfectible");
      if (!site.hasBooking) opportunities.push("Ajouter un bouton de prise de rendez-vous en ligne");
      if (!site.hasCallToAction) weaknesses.push("Absence d'appel à l'action clair");
      if (!site.hasLegalMentions) weaknesses.push("Mentions légales non détectées");
      if (site.isModern) strengths.push("Site déjà moderne et fonctionnel");
      benefits.push("Pourrait réduire les frictions lors de la prise de contact");
      benefits.push("Pourrait améliorer la conversion des visiteurs");
      summaryTail =
        " Le site existant présente toutefois des points d'amélioration, notamment sur l'expérience mobile et la simplicité de contact.";
    }
  }

  if (!input.phone || !input.email) {
    weaknesses.push("Informations de contact incomplètes");
    opportunities.push("Regrouper des coordonnées complètes et cliquables");
  }

  const recommendedSolution = !input.hasWebsite
    ? "Création d'un site vitrine mobile simple (présentation, prestations, horaires, galerie) avec bouton de réservation."
    : "Refonte / modernisation du site existant avec priorité au mobile et à la prise de rendez-vous.";

  const commercialProposal = !input.hasWebsite
    ? "Proposer l'offre « Réservation » : site complet avec prise de rendez-vous et référencement local de base."
    : "Proposer une refonte ciblée : mobile, appel à l'action clair et intégration d'un module de réservation.";

  const summary = `${ratingSentence(input)}${summaryTail}\n\nLa mise en place d'un site mobile clair avec présentation des prestations, horaires, galerie et bouton de réservation permettrait de centraliser les informations et de faciliter les demandes de rendez-vous.`;

  if (strengths.length === 0) strengths.push("Activité locale identifiable");
  if (benefits.length === 0) benefits.push("Donnerait une image plus professionnelle");

  return ProspectAuditSchema.parse({
    summary,
    strengths,
    weaknesses,
    priorityIssues,
    opportunities,
    recommendedSolution,
    commercialProposal,
    possibleBenefits: benefits,
    priority: input.priority,
  });
}

// Ré-exports pratiques (évite les imports croisés côté UI).
export { STATUS_LABELS, PRIORITY_LABELS };
