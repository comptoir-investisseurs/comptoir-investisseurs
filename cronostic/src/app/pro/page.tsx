import type { Metadata } from "next";
import Link from "next/link";

import { openBillingPortal, startProCheckout } from "@/app/actions";
import { getCurrentUser, signInPath } from "@/lib/auth";
import { proPriceCents } from "@/lib/env";
import { formatDate, formatPrice } from "@/lib/format";
import { getSubscriptionForUser, isSubscriptionActive, listGuides } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Cronostic Pro",
  description:
    "Tous les guides d'atelier Cronostic inclus dans un abonnement mensuel, avec accès aux nouveaux manuels dès leur publication.",
};

const FREE = [
  "Encyclopédie des calibres",
  "Fiches techniques complètes",
  "Nomenclature des fournitures",
  "Recherche de pièces",
  "Références d'huiles et consommables",
];

const PRO = [
  "Accès aux guides Cronostic inclus dans l'abonnement",
  "Téléchargement des PDF",
  "Accès aux nouveaux guides ajoutés à l’abonnement",
  "Résiliation à tout moment",
];

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ abonnement?: string; simule?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const subscription = user ? await getSubscriptionForUser(user.id) : null;
  const active = isSubscriptionActive(subscription);
  const guides = await listGuides({ activeOnly: true });
  const inclus = guides.filter((g) => g.includedInSubscription).length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <p className="surtitre-marque">Cronostic Pro</p>
      <h1 className="titre mt-4 text-4xl text-ivoire sm:text-6xl">
        Tous les guides. Un seul abonnement.
      </h1>

      {(sp.abonnement === "succes" || sp.simule === "1") && (
        <p className="mt-8 border-l-2 border-laiton bg-graphite/50 px-5 py-4 text-parchemin/80">
          Votre abonnement Cronostic Pro est actif.
          {sp.simule === "1" && (
            <span className="mt-1 block text-xs text-acier">
              Abonnement simulé : Stripe n&apos;est pas encore configuré sur cette instance.
            </span>
          )}{" "}
          <Link href="/account/guides" className="underline underline-offset-4">
            Accéder aux guides
          </Link>
        </p>
      )}

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {/* FREE */}
        <section className="carte flex flex-col p-8">
          <p className="surtitre-marque">Cronostic Free</p>
          <p className="font-display mt-4 text-3xl text-ivoire">Gratuit</p>
          <p className="mt-2 text-sm text-acier">Sans compte, sans limite de consultation.</p>
          <ul className="mt-8 space-y-3 text-sm text-parchemin/75">
            {FREE.map((item) => (
              <li key={item} className="flex items-baseline gap-3">
                <span className="text-acier">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/calibres"
            className="mt-auto pt-8 text-[0.78rem] tracking-[0.16em] text-parchemin/70 uppercase underline underline-offset-4"
          >
            Parcourir l&apos;encyclopédie
          </Link>
        </section>

        {/* PRO */}
        <section className="carte relative flex flex-col overflow-hidden p-8">
          <div className="pointer-events-none absolute inset-3 border border-laiton/18" />
          <p className="surtitre-marque relative">Cronostic Pro</p>
          <p className="font-display relative mt-4 text-3xl text-laiton-clair">
            {formatPrice(subscription?.priceCents ?? proPriceCents())}
            <span className="ml-1 text-sm text-acier">/ mois</span>
          </p>
          <p className="relative mt-2 text-sm text-acier">
            {inclus > 0
              ? `${inclus} guide${inclus > 1 ? "s" : ""} inclus à ce jour`
              : "Les guides sont ajoutés à l'abonnement au fil des publications."}
          </p>

          <ul className="relative mt-8 space-y-3 text-sm text-parchemin/85">
            {PRO.map((item) => (
              <li key={item} className="flex items-baseline gap-3">
                <span className="text-laiton">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="relative mt-auto pt-8">
            {!user ? (
              <Link
                href={signInPath("/pro")}
                className="block bg-laiton px-6 py-3 text-center text-[0.8rem] tracking-[0.16em] text-noir uppercase transition-colors hover:bg-laiton-clair"
              >
                S&apos;abonner
              </Link>
            ) : active ? (
              <div className="space-y-4">
                <p className="text-sm text-laiton-clair">
                  Abonnement actif
                  {subscription?.currentPeriodEnd && (
                    <span className="text-acier">
                      {" "}
                      · {subscription.cancelAtPeriodEnd ? "prend fin le" : "renouvelé le"}{" "}
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  )}
                </p>
                <form action={openBillingPortal}>
                  <button
                    type="submit"
                    className="w-full border border-laiton/50 px-6 py-3 text-[0.8rem] tracking-[0.16em] text-laiton-clair uppercase transition-colors hover:bg-laiton/10"
                  >
                    Gérer mon abonnement
                  </button>
                </form>
              </div>
            ) : (
              <form action={startProCheckout}>
                <button
                  type="submit"
                  className="w-full bg-laiton px-6 py-3 text-[0.8rem] tracking-[0.16em] text-noir uppercase transition-colors hover:bg-laiton-clair"
                >
                  S&apos;abonner
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-acier">
        Les guides achetés à l&apos;unité restent accessibles définitivement, même après
        résiliation de l&apos;abonnement.
      </p>
    </div>
  );
}
