import type { Metadata } from "next";
import Link from "next/link";

import { openBillingPortal } from "@/app/actions";
import { signOutLocally } from "@/app/connexion/actions";
import { requireUser } from "@/lib/auth";
import { hasClerk } from "@/lib/env";
import { formatDate, formatPrice } from "@/lib/format";
import {
  getSubscriptionForUser,
  isSubscriptionActive,
  listGuides,
  listPurchasesForUser,
} from "@/lib/repo";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ portail?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser("/account");
  const [subscription, purchases, guides] = await Promise.all([
    getSubscriptionForUser(user.id),
    listPurchasesForUser(user.id),
    listGuides(),
  ]);
  const active = isSubscriptionActive(subscription);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="surtitre">Mon compte</p>
      <h1 className="titre mt-3 text-couverture text-encre">{user.email}</h1>

      {sp.portail === "simule" && (
        <p className="mt-8 border-l-2 border-laiton bg-papier px-5 py-4 text-legende text-encre/72">
          Portail de facturation simulé : Stripe n&apos;est pas configuré sur cette instance.
        </p>
      )}

      {/* Abonnement */}
      <section className="mt-12">
        <h2 className="surtitre">Abonnement</h2>
        <div className="cadre mt-5 flex flex-wrap items-center justify-between gap-6 p-7">
          <div>
            <p className="text-etape text-encre">
              {active ? "Cronostic Pro — actif" : "Aucun abonnement actif"}
            </p>
            {subscription && (
              <p className="mt-1 text-legende text-encre/55">
                {subscription.priceCents ? formatPrice(subscription.priceCents) + " / mois · " : ""}
                {subscription.cancelAtPeriodEnd ? "prend fin le " : "période en cours jusqu'au "}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
          {active ? (
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="bouton-secondaire"
              >
                Gérer
              </button>
            </form>
          ) : (
            <Link
              href="/pro"
              className="bouton"
            >
              S&apos;abonner
            </Link>
          )}
        </div>
      </section>

      {/* Achats */}
      <section className="mt-12">
        <h2 className="surtitre">Achats</h2>
        {purchases.length === 0 ? (
          <p className="cadre mt-5 p-7 text-encre/72">Aucun achat pour le moment.</p>
        ) : (
          <ul className="cadre mt-5 divide-y divide-gris-clair">
            {purchases.map((p) => {
              const guide = guides.find((g) => g.id === p.guideId);
              return (
                <li key={p.id} className="flex flex-wrap items-baseline gap-4 px-5 py-4">
                  <span className="text-encre">
                    {guide ? `Omega ${guide.caliberReference}` : "Guide"}
                  </span>
                  <span className="text-legende text-encre/55">{formatDate(p.purchasedAt)}</span>
                  <span className="ml-auto text-legende text-encre/72">
                    {formatPrice(p.amountCents, p.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
          <Link href="/account/guides" className="lien-souligne text-legende text-laiton">
            Accéder à mes guides
          </Link>
          <Link href="/account/donnees" className="lien-souligne text-legende text-laiton">
            Mes données personnelles
          </Link>
        </div>
      </section>

      {!hasClerk && (
        <form action={signOutLocally} className="mt-14">
          <button
            type="submit"
            className="text-surtitre tracking-[0.16em] text-encre/55 uppercase underline underline-offset-4 hover:text-encre"
          >
            Se déconnecter
          </button>
        </form>
      )}
    </div>
  );
}
