import "server-only";

import { quotaAtelier } from "./env";
import {
  compterDeblocages,
  deblocagesDeLUtilisateur,
  enregistrerDeblocage,
  getSubscriptionForUser,
  isSubscriptionActive,
  listPurchasesForUser,
} from "./repo";
import type { AppUser, GuideAccess, GuideRow, SubscriptionRow } from "./types";

/**
 * Droits d'accès à un guide.
 *
 * Trois sources indépendantes :
 *   — l'achat à l'unité, définitif ;
 *   — la formule **Intégrale**, qui ouvre tout tant qu'elle est active ;
 *   — la formule **Atelier**, qui ouvre un nombre limité de guides par période.
 *
 * Un guide ouvert au titre du quota le reste tant que l'abonnement est actif :
 * l'abonné constitue sa bibliothèque au fil des mois, il ne repaie pas chaque
 * période ce qu'il a déjà ouvert. Le crédit est consommé au premier
 * téléchargement, jamais à l'affichage de la fiche.
 *
 * Résilier ne retire jamais un guide acheté à l'unité.
 */

/** Début de la période de facturation en cours, qui borne le quota. */
export function debutDePeriode(sub: SubscriptionRow | null): Date {
  const fin = sub?.currentPeriodEnd;
  if (!fin) {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  const debut = new Date(fin);
  if (sub?.interval === "year") debut.setFullYear(debut.getFullYear() - 1);
  else debut.setMonth(debut.getMonth() - 1);
  return debut;
}

export async function guideAccessFor(
  user: AppUser | null,
  guide: Pick<GuideRow, "id" | "includedInSubscription">,
): Promise<GuideAccess> {
  const refuse: GuideAccess = {
    owned: false,
    viaSubscription: false,
    canDownload: false,
    deblocablePar: null,
    creditsRestants: null,
  };
  if (!user) return refuse;

  const [purchases, subscription, deblocages] = await Promise.all([
    listPurchasesForUser(user.id),
    getSubscriptionForUser(user.id),
    deblocagesDeLUtilisateur(user.id),
  ]);

  const owned = purchases.some((p) => p.guideId === guide.id);
  if (owned) return { ...refuse, owned: true, canDownload: true };

  const actif = isSubscriptionActive(subscription);
  if (!actif || !guide.includedInSubscription) return refuse;

  if (subscription!.plan === "integral") {
    return { ...refuse, viaSubscription: true, canDownload: true };
  }

  // Formule Atelier : déjà débloqué, ou déblocable si le quota le permet.
  const dejaOuvert = deblocages.some((d) => d.guideId === guide.id);
  const consommes = await compterDeblocages(user.id, debutDePeriode(subscription));
  const restants = Math.max(0, quotaAtelier() - consommes);

  if (dejaOuvert) {
    return { ...refuse, viaSubscription: true, canDownload: true, creditsRestants: restants };
  }

  return {
    ...refuse,
    deblocablePar: restants > 0 ? "quota" : null,
    creditsRestants: restants,
  };
}

/**
 * Consomme un crédit pour ouvrir ce guide, si la formule Atelier le permet.
 * Retourne `true` quand l'accès est acquis à l'issue de l'appel.
 */
export async function ouvrirAvecQuota(user: AppUser, guide: GuideRow): Promise<boolean> {
  const acces = await guideAccessFor(user, guide);
  if (acces.canDownload) return true;
  if (acces.deblocablePar !== "quota") return false;

  const subscription = await getSubscriptionForUser(user.id);
  await enregistrerDeblocage(user.id, guide.id, debutDePeriode(subscription));
  return true;
}

export async function hasActivePro(user: AppUser | null): Promise<boolean> {
  if (!user) return false;
  return isSubscriptionActive(await getSubscriptionForUser(user.id));
}

export async function ownedGuideIds(user: AppUser | null): Promise<Set<string>> {
  if (!user) return new Set();
  const purchases = await listPurchasesForUser(user.id);
  return new Set(purchases.map((p) => p.guideId));
}

/** Guides ouverts par le quota, pour la page « Mes guides ». */
export async function unlockedGuideIds(user: AppUser | null): Promise<Set<string>> {
  if (!user) return new Set();
  return new Set((await deblocagesDeLUtilisateur(user.id)).map((d) => d.guideId));
}

/** Crédits restants sur la période, ou `null` hors formule Atelier. */
export async function creditsRestants(user: AppUser | null): Promise<number | null> {
  if (!user) return null;
  const sub = await getSubscriptionForUser(user.id);
  if (!isSubscriptionActive(sub) || sub!.plan !== "atelier") return null;
  return Math.max(0, quotaAtelier() - (await compterDeblocages(user.id, debutDePeriode(sub))));
}
