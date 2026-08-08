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

export function proPriceCents(): number {
  const raw = Number(process.env.NEXT_PUBLIC_PRO_PRICE_CENTS);
  return Number.isFinite(raw) && raw > 0 ? raw : 990;
}
