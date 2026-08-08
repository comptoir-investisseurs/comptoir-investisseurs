import type { Metadata } from "next";
import Link from "next/link";

import { openBillingPortal, startProCheckout } from "@/app/actions";
import { getCurrentUser, signInPath } from "@/lib/auth";
import { proAnnualPriceCents, proPriceCents } from "@/lib/env";
import { formatDate, formatPrice } from "@/lib/format";
import { getSubscriptionForUser, isSubscriptionActive, listGuides } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Cronostic Pro",
  description:
    "Tous les guides d'atelier Cronostic dans un abonnement mensuel ou annuel, avec accès aux nouveaux manuels dès leur publication.",
};

const FREE = [
  "Encyclopédie des calibres",
  "Fiches techniques complètes",
  "Nomenclature des fournitures",
  "Recherche de pièces et estimation de prix",
  "Références d'huiles et consommables",
];

const PRO = [
  "Tous les guides inclus dans l'abonnement",
  "Téléchargement des PDF, sans limite",
  "Nouveaux guides dès leur publication",
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
  const inclus = guides.filter((g) => g.includedInSubscription);

  const mensuel = proPriceCents();
  const annuel = proAnnualPriceCents();
  const prixUnitaire = inclus[0]?.priceCents ?? 2490;
  const valeurCatalogue = inclus.reduce((s, g) => s + g.priceCents, 0);
  const moisOfferts = Math.round(12 - annuel / mensuel);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="surtitre-marque">Cronostic Pro</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">Tous les guides. Un seul abonnement.</h1>

      {(sp.abonnement === "succes" || sp.simule === "1") && (
        <div className="encart encart-methode mt-8">
          <p className="encart-titre">Conseil d&apos;atelier</p>
          <p className="mt-2">
            Votre abonnement est actif.{" "}
            <Link href="/account/guides" className="lien-souligne">
              Accéder aux guides
            </Link>
            {sp.simule === "1" && (
              <span className="legende mt-1 block">
                Abonnement simulé : Stripe n&apos;est pas encore configuré sur cette instance.
              </span>
            )}
          </p>
        </div>
      )}

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        {/* ── Gratuit ─────────────────────────────────────── */}
        <section className="cadre flex flex-col p-7">
          <p className="surtitre">Cronostic Free</p>
          <p className="titre mt-3 text-section">Gratuit</p>
          <p className="legende mt-1">Sans compte, sans limite de consultation</p>
          <ul className="mt-7 space-y-2.5 text-legende not-italic">
            {FREE.map((item) => (
              <li key={item} className="flex items-baseline gap-2.5">
                <span className="text-laiton">·</span>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/calibres" className="lien-souligne mt-auto pt-7 text-legende not-italic">
            Parcourir l&apos;encyclopédie
          </Link>
        </section>

        {/* ── Mensuel ─────────────────────────────────────── */}
        <section className="cadre-papier flex flex-col border-l-[3px] border-l-laiton p-7">
          <p className="surtitre">Mensuel</p>
          <p className="titre mt-3 text-section">
            {formatPrice(mensuel)}
            <span className="legende ml-1 not-italic">par mois</span>
          </p>
          <p className="legende mt-1">Sans engagement</p>

          <ul className="mt-7 space-y-2.5 text-legende not-italic">
            {PRO.map((item) => (
              <li key={item} className="flex items-baseline gap-2.5">
                <span className="text-laiton">·</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-7">
            {!user ? (
              <Link href={signInPath("/pro")} className="bouton w-full">
                S&apos;abonner
              </Link>
            ) : active ? (
              <p className="legende">Abonnement en cours</p>
            ) : (
              <form action={startProCheckout}>
                <input type="hidden" name="periode" value="mensuel" />
                <button type="submit" className="bouton w-full">
                  S&apos;abonner
                </button>
              </form>
            )}
          </div>
        </section>

        {/* ── Annuel ──────────────────────────────────────── */}
        <section className="cadre-papier flex flex-col border-l-[3px] border-l-laiton p-7">
          <p className="surtitre">Annuel</p>
          <p className="titre mt-3 text-section">
            {formatPrice(annuel)}
            <span className="legende ml-1 not-italic">par an</span>
          </p>
          <p className="legende mt-1">
            Soit {formatPrice(Math.round(annuel / 12))} par mois
            {moisOfferts > 0 ? ` — ${moisOfferts} mois offerts` : ""}
          </p>

          <ul className="mt-7 space-y-2.5 text-legende not-italic">
            {PRO.map((item) => (
              <li key={item} className="flex items-baseline gap-2.5">
                <span className="text-laiton">·</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-7">
            {!user ? (
              <Link href={signInPath("/pro")} className="bouton w-full">
                S&apos;abonner à l&apos;année
              </Link>
            ) : active ? (
              <p className="legende">Abonnement en cours</p>
            ) : (
              <form action={startProCheckout}>
                <input type="hidden" name="periode" value="annuel" />
                <button type="submit" className="bouton w-full">
                  S&apos;abonner à l&apos;année
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      {active && (
        <div className="cadre mt-10 flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <p className="text-encre">Abonnement actif</p>
            {subscription?.currentPeriodEnd && (
              <p className="legende mt-1">
                {subscription.cancelAtPeriodEnd ? "Prend fin le " : "Renouvelé le "}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
          <form action={openBillingPortal}>
            <button type="submit" className="bouton-secondaire">
              Gérer
            </button>
          </form>
        </div>
      )}

      {/* ── Quand l'unité, quand l'abonnement ─────────────── */}
      <section className="mt-16">
        <h2 className="surtitre">Choisir</h2>
        <div className="filet mt-2" />
        <div className="mt-6 overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th scope="col">Usage</th>
                <th scope="col">Formule</th>
                <th scope="col">Coût</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Un calibre à réviser</td>
                <td>Guide à l&apos;unité</td>
                <td className="font-technique">{formatPrice(prixUnitaire)}, à vie</td>
              </tr>
              <tr>
                <td>Deux ou trois calibres</td>
                <td>Guides à l&apos;unité</td>
                <td className="font-technique">
                  {formatPrice(prixUnitaire * 2)} à {formatPrice(prixUnitaire * 3)}
                </td>
              </tr>
              <tr>
                <td>Un chantier de quelques mois</td>
                <td>Abonnement mensuel</td>
                <td className="font-technique">{formatPrice(mensuel)} par mois</td>
              </tr>
              <tr>
                <td>Atelier travaillant la famille entière</td>
                <td>Abonnement annuel</td>
                <td className="font-technique">{formatPrice(annuel)} par an</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="legende mt-2">
          {inclus.length > 0
            ? `${inclus.length} guide${inclus.length > 1 ? "s" : ""} inclus à ce jour, soit ${formatPrice(valeurCatalogue)} à l'unité`
            : "Les guides rejoignent l'abonnement au fil des publications"}
        </p>
      </section>

      <p className="mt-10 max-w-[68ch] text-legende not-italic text-encre/72">
        Un guide acheté à l&apos;unité reste accessible définitivement, y compris après
        résiliation de l&apos;abonnement. Les guides ouverts au seul titre de l&apos;abonnement
        cessent de l&apos;être à la fin de la période payée.
      </p>
    </div>
  );
}
