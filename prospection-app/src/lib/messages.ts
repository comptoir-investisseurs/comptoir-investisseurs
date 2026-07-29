// Génération de messages de prospection (mode « sans IA », déterministe).
//
// Tous les messages sont construits à partir d'informations réellement
// disponibles ; les données utilisées sont retournées pour transparence.

import { z } from "zod";
import type { SiteAnalysis } from "./site-analyzer";

export const MessageChannels = ["facebook", "instagram", "email", "phone"] as const;
export type MessageChannel = (typeof MessageChannels)[number];

export const GeneratedMessageSchema = z.object({
  channel: z.enum(["facebook", "instagram", "email", "phone"]),
  kind: z.enum(["outreach", "followup1", "followup2"]),
  subject: z.string().max(160).optional(),
  body: z.string().min(1).max(2000),
  usedData: z.array(z.string()),
});
export type GeneratedMessageDTO = z.infer<typeof GeneratedMessageSchema>;

export interface MessageInput {
  businessName: string;
  category?: string | null;
  city?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  hasWebsite: boolean;
  site: SiteAnalysis | null;
  firstName?: string | null; // prénom de l'expéditeur
  signature?: string | null;
}

function observed(input: MessageInput): { line: string; used: string[] } {
  const used: string[] = [];
  const bits: string[] = [];
  if (input.category && input.city) {
    bits.push(`en recherchant des ${input.category}s à ${input.city}`);
    used.push("catégorie", "ville");
  } else if (input.city) {
    bits.push(`à ${input.city}`);
    used.push("ville");
  }
  if ((input.rating ?? 0) >= 4 && (input.reviewCount ?? 0) > 0) {
    bits.push(`vos excellents avis`);
    used.push("note", "nombre d'avis");
  }
  const line = bits.length ? `Je suis tombé sur votre établissement ${bits[0]}${bits[1] ? ` et j'ai remarqué ${bits[1]}` : ""}.` : `Je suis tombé sur votre établissement.`;
  return { line, used };
}

function problem(input: MessageInput): { line: string; used: string[] } {
  if (!input.hasWebsite) {
    return {
      line: "En revanche, vous ne semblez pas encore avoir de site permettant de présenter vos prestations et de faciliter les prises de rendez-vous.",
      used: ["absence de site"],
    };
  }
  const site = input.site;
  if (site && !site.hasViewport) {
    return {
      line: "Votre site semble toutefois assez difficile à consulter sur mobile et la prise de contact pourrait être simplifiée.",
      used: ["site non adapté au mobile"],
    };
  }
  if (site && !site.hasBooking) {
    return {
      line: "Il manque toutefois un moyen simple de réserver directement en ligne.",
      used: ["absence de réservation en ligne"],
    };
  }
  return {
    line: "J'ai repéré quelques améliorations simples pour faciliter la prise de contact.",
    used: ["analyse du site"],
  };
}

export function buildSocialMessage(input: MessageInput, channel: "facebook" | "instagram"): GeneratedMessageDTO {
  const obs = observed(input);
  const prob = problem(input);
  const body = [
    "Bonjour,",
    "",
    `${obs.line} ${prob.line}`,
    "",
    "Je crée justement des sites simples pour les commerces locaux et j'ai préparé une première proposition adaptée à votre activité.",
    "",
    "Est-ce que je peux vous envoyer le lien ?",
    input.signature ? `\n${input.signature}` : "",
  ]
    .join("\n")
    .trim();
  return GeneratedMessageSchema.parse({
    channel,
    kind: "outreach",
    body,
    usedData: Array.from(new Set([...obs.used, ...prob.used])),
  });
}

export function buildEmailMessage(input: MessageInput, detailed: boolean): GeneratedMessageDTO {
  const obs = observed(input);
  const prob = problem(input);
  const subject = input.hasWebsite
    ? `Améliorer le site de ${input.businessName}`
    : `Un site simple pour ${input.businessName} ?`;
  const shortBody = [
    "Bonjour,",
    "",
    `${obs.line} ${prob.line}`,
    "",
    "Je crée des sites modernes pour les commerces locaux. Puis-je vous envoyer une proposition gratuite ?",
    input.signature ? `\n${input.signature}` : "Cordialement,",
  ]
    .join("\n")
    .trim();
  const longBody = [
    "Bonjour,",
    "",
    `${obs.line} ${prob.line}`,
    "",
    "Concrètement, un site clair et adapté au mobile permettrait de présenter vos prestations, vos horaires et vos coordonnées au même endroit, et de faciliter les prises de rendez-vous.",
    "",
    "J'ai préparé une première proposition adaptée à votre activité, sans engagement.",
    "",
    "Seriez-vous disponible pour que je vous envoie le lien de démonstration ?",
    input.signature ? `\n${input.signature}` : "Cordialement,",
  ]
    .join("\n")
    .trim();
  return GeneratedMessageSchema.parse({
    channel: "email",
    kind: "outreach",
    subject,
    body: detailed ? longBody : shortBody,
    usedData: Array.from(new Set([...obs.used, ...prob.used])),
  });
}

export function buildPhoneScript(input: MessageInput): GeneratedMessageDTO {
  const name = input.firstName ?? "[Prénom]";
  const body = `Bonjour, je m'appelle ${name}. Je crée des sites internet pour les commerces locaux. J'ai regardé votre présence en ligne et j'ai préparé une proposition pour faciliter la présentation de vos services et les prises de rendez-vous. Est-ce que je peux vous envoyer le lien par e-mail ou par message ?`;
  return GeneratedMessageSchema.parse({
    channel: "phone",
    kind: "outreach",
    body,
    usedData: ["présence en ligne"],
  });
}

export function buildFollowup(kind: "followup1" | "followup2", channel: MessageChannel, signature?: string | null): GeneratedMessageDTO {
  const body1 = [
    "Bonjour,",
    "",
    "Je me permets de revenir vers vous concernant la proposition de site que j'avais préparée pour votre établissement.",
    "",
    "Je peux vous envoyer le lien ici si le sujet peut vous intéresser.",
    signature ? `\n${signature}` : "",
  ]
    .join("\n")
    .trim();
  const body2 = [
    "Bonjour,",
    "",
    "Dernier petit message concernant votre présence en ligne. J'avais préparé une proposition adaptée à votre activité, notamment pour mieux présenter vos services et simplifier les prises de rendez-vous.",
    "",
    "Je peux vous la transmettre sans engagement.",
    signature ? `\n${signature}` : "",
  ]
    .join("\n")
    .trim();
  return GeneratedMessageSchema.parse({
    channel,
    kind,
    subject: channel === "email" ? "Petite relance" : undefined,
    body: kind === "followup1" ? body1 : body2,
    usedData: [],
  });
}

export function buildAllMessages(input: MessageInput): GeneratedMessageDTO[] {
  return [
    buildSocialMessage(input, "facebook"),
    buildSocialMessage(input, "instagram"),
    buildEmailMessage(input, false),
    buildEmailMessage(input, true),
    buildPhoneScript(input),
  ];
}
