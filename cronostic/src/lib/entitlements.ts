import "server-only";

import {
  getSubscriptionForUser,
  isSubscriptionActive,
  listPurchasesForUser,
} from "./repo";
import type { AppUser, GuideAccess, GuideRow } from "./types";

/**
 * Droit d'accès à un guide.
 *
 * Deux sources indépendantes : l'achat à l'unité, définitif, et l'abonnement
 * Cronostic Pro, qui n'ouvre que les guides marqués `includedInSubscription`.
 * Résilier PRO ne retire jamais un guide acheté.
 */
export async function guideAccessFor(
  user: AppUser | null,
  guide: Pick<GuideRow, "id" | "includedInSubscription">,
): Promise<GuideAccess> {
  if (!user) return { owned: false, viaSubscription: false, canDownload: false };

  const [purchases, subscription] = await Promise.all([
    listPurchasesForUser(user.id),
    getSubscriptionForUser(user.id),
  ]);

  const owned = purchases.some((p) => p.guideId === guide.id);
  const viaSubscription = guide.includedInSubscription && isSubscriptionActive(subscription);

  return { owned, viaSubscription, canDownload: owned || viaSubscription };
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
