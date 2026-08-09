import "server-only";

import nodemailer from "nodemailer";

import { contactEmail, siteUrl } from "./env";

/**
 * Courriel transactionnel.
 *
 * Sans configuration SMTP, les messages sont écrits dans les journaux du
 * serveur au lieu d'être envoyés : le parcours reste déroulable en
 * développement, et rien n'échoue silencieusement en production — l'absence
 * d'envoi est visible dans les logs.
 *
 * Un envoi qui échoue ne fait jamais échouer l'achat : le droit est déjà
 * acquis en base, et l'acheteur retrouve ses guides dans son compte. On
 * journalise et on continue.
 */

const EXPEDITEUR = () => `Cronostic <${contactEmail()}>`;

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

export async function envoyer(message: {
  to: string;
  subject: string;
  texte: string;
}): Promise<void> {
  const t = transport();
  if (!t) {
    console.info(
      `[courriel non envoyé — SMTP non configuré]\nÀ : ${message.to}\nObjet : ${message.subject}\n\n${message.texte}\n`,
    );
    return;
  }

  try {
    await t.sendMail({
      from: EXPEDITEUR(),
      to: message.to,
      subject: message.subject,
      text: message.texte,
    });
  } catch (error) {
    console.error("[courriel] envoi en échec", message.subject, error);
  }
}

/* ────────────────────────────────────────────────────────────
   Messages
   ──────────────────────────────────────────────────────────── */

export async function courrielAchat(
  destinataire: string,
  guides: { caliberBrand: string; caliberReference: string; id: string }[],
  totalCents: number,
): Promise<void> {
  const base = siteUrl();
  const liste = guides
    .map((g) => `  · ${g.caliberBrand} ${g.caliberReference}\n    ${base}/api/guides/${g.id}/download`)
    .join("\n");

  await envoyer({
    to: destinataire,
    subject:
      guides.length > 1
        ? `Vos ${guides.length} guides Cronostic`
        : `Votre guide Cronostic — ${guides[0]?.caliberBrand ?? ""} ${guides[0]?.caliberReference ?? ""}`,
    texte: `Merci pour votre commande.

${guides.length > 1 ? "Vos guides sont disponibles" : "Votre guide est disponible"} au téléchargement :

${liste}

Ces liens demandent d'être connecté au compte ${destinataire}. Vous retrouverez
${guides.length > 1 ? "vos guides" : "votre guide"} à tout moment dans votre espace :
${base}/account/guides

Montant réglé : ${(totalCents / 100).toFixed(2).replace(".", ",")} €
La facture est adressée séparément par notre prestataire de paiement.

Chaque exemplaire porte votre nom : il vous est personnel et sa rediffusion
n'est pas autorisée.

Rétractation — conformément à l'article L. 221-28, 13° du code de la
consommation, vous avez demandé expressément l'exécution immédiate de la
commande avant l'expiration du délai de quatorze jours et renoncé expressément
à votre droit de rétractation. Le contenu ayant été mis à disposition, ce droit
ne peut plus être exercé. Les garanties légales restent acquises.
${base}/conditions

— Cronostic
${contactEmail()}`,
  });
}

export async function courrielAbonnement(
  destinataire: string,
  plan: "atelier" | "integral",
  interval: "month" | "year",
): Promise<void> {
  const base = siteUrl();
  await envoyer({
    to: destinataire,
    subject: `Votre abonnement Cronostic ${plan === "integral" ? "Intégrale" : "Atelier"}`,
    texte: `Votre abonnement est actif.

Formule : ${plan === "integral" ? "Intégrale — tous les guides" : "Atelier — quota mensuel de guides"}
Périodicité : ${interval === "year" ? "annuelle" : "mensuelle"}

Vos guides : ${base}/account/guides
Gestion de l'abonnement : ${base}/account

L'abonnement est sans engagement et se résilie à tout moment depuis votre
espace ; il court jusqu'au terme de la période payée. Vous avez demandé
expressément son exécution immédiate et renoncé à votre droit de rétractation
au sens de l'article L. 221-28, 13° du code de la consommation.
${base}/conditions

— Cronostic
${contactEmail()}`,
  });
}
