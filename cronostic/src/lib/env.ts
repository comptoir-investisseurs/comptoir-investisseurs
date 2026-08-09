/**
 * Détection des briques réellement configurées.
 *
 * Aucune de ces variables n'est obligatoire pour lancer le site :
 * chaque brique absente bascule sur un équivalent local documenté,
 * de façon à pouvoir dérouler tout le parcours sans compte externe.
 */

export const isProduction = process.env.NODE_ENV === "production";

export const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);

export const hasR2 = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET,
);

export const hasEbay = Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function entier(valeur: string | undefined, defaut: number): number {
  const raw = Number(valeur);
  return Number.isFinite(raw) && raw > 0 ? raw : defaut;
}

/** Formule Atelier : quota de guides par période de facturation. */
export function quotaAtelier(): number {
  return entier(process.env.NEXT_PUBLIC_QUOTA_ATELIER, 5);
}

export const TARIFS = {
  atelier: {
    mois: () => entier(process.env.NEXT_PUBLIC_ATELIER_MENSUEL_CENTS, 1990),
    an: () => entier(process.env.NEXT_PUBLIC_ATELIER_ANNUEL_CENTS, 19900),
  },
  integral: {
    mois: () => entier(process.env.NEXT_PUBLIC_INTEGRAL_MENSUEL_CENTS, 2990),
    an: () => entier(process.env.NEXT_PUBLIC_INTEGRAL_ANNUEL_CENTS, 29900),
  },
} as const;

export function prixAbonnement(plan: "atelier" | "integral", interval: "month" | "year"): number {
  return interval === "year" ? TARIFS[plan].an() : TARIFS[plan].mois();
}

/** Identifiant de prix Stripe correspondant, quand il est configuré. */
export function stripePriceId(
  plan: "atelier" | "integral",
  interval: "month" | "year",
): string | undefined {
  const cle = `STRIPE_${plan.toUpperCase()}_${interval === "year" ? "ANNUEL" : "MENSUEL"}_PRICE_ID`;
  return process.env[cle] || undefined;
}

export function contactEmail(): string {
  return process.env.CONTACT_EMAIL ?? "cronostic.info@gmail.com";
}
