import type { Metadata } from "next";
import Link from "next/link";

import { openBillingPortal, startProCheckout } from "@/app/actions";
import { Renonciation } from "@/components/renonciation";
import { getCurrentUser, signInPath } from "@/lib/auth";
import { TARIFS, quotaAtelier } from "@/lib/env";
import { creditsRestants } from "@/lib/entitlements";
import { formatDate, formatPrice } from "@/lib/format";
import { getSubscriptionForUser, isSubscriptionActive, listGuides } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Abonnements",
  description:
    "Trois formules : consultation gratuite de l'encyclopédie, Atelier avec un quota de guides par mois, Intégrale avec l'accès à tous les guides.",
};

export const dynamic = "force-dynamic";

const AVANTAGES_FREE = [
  "Encyclopédie des calibres",
  "Fiches techniques complètes",
  "Nomenclature des fournitures",
  "Recherche de pièces et estimation de prix",
  "Références d'huiles et consommables",
];

function Formule({
  nom,
  plan,
  prixMois,
  prixAn,
  accroche,
  avantages,
  actif,
  connecte,
  souligne = false,
  erreur = false,
}: {
  nom: string;
  plan: "atelier" | "integral";
  prixMois: number;
  prixAn: number;
  accroche: string;
  avantages: string[];
  actif: boolean;
  connecte: boolean;
  souligne?: boolean;
  erreur?: boolean;
}) {
  const economie = Math.round(12 - prixAn / prixMois);

  return (
    <section
      className={`flex flex-col p-7 ${souligne ? "cadre-papier border-l-[3px] border-l-laiton" : "cadre"}`}
    >
      <p className="surtitre">{nom}</p>
      <p className="titre mt-3 text-section">
        {formatPrice(prixMois)}
        <span className="legende ml-1 not-italic">par mois</span>
      </p>
      <p className="legende mt-1">{accroche}</p>

      <ul className="mt-6 space-y-2.5 text-legende not-italic">
        {avantages.map((a) => (
          <li key={a} className="flex items-baseline gap-2.5">
            <span className="text-laiton">·</span>
            {a}
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-3 pt-7">
        {actif ? (
          <p className="legende">Formule en cours</p>
        ) : !connecte ? (
          <Link href={signInPath("/pro")} className="bouton w-full">
            S&apos;abonner
          </Link>
        ) : (
          // Un seul formulaire, deux boutons : la renonciation au droit de
          // rétractation est recueillie une fois, quelle que soit la
          // périodicité choisie.
          <form action={startProCheckout} className="space-y-3">
            <input type="hidden" name="plan" value={plan} />
            <Renonciation objet="abonnement" />
            {erreur && (
              <p className="border-l-2 border-alerte bg-papier px-4 py-2.5 text-legende not-italic text-alerte">
                Cochez la renonciation pour ouvrir l&apos;accès immédiatement.
              </p>
            )}
            <button type="submit" name="periode" value="mensuel" className="bouton w-full">
              {formatPrice(prixMois)} par mois
            </button>
            <button
              type="submit"
              name="periode"
              value="annuel"
              className="bouton-secondaire w-full"
            >
              {formatPrice(prixAn)} par an
            </button>
            <p className="legende">
              À l&apos;année : {formatPrice(Math.round(prixAn / 12))} par mois
              {economie > 0 ? `, ${economie} mois offerts` : ""}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default async function ProPage({
  searchParams,
}: {
  searchParams: Promise<{ abonnement?: string; simule?: string; erreur?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const subscription = user ? await getSubscriptionForUser(user.id) : null;
  const actif = isSubscriptionActive(subscription);
  const credits = await creditsRestants(user);
  const guides = await listGuides({ activeOnly: true });
  const inclus = guides.filter((g) => g.includedInSubscription);
  const prixUnitaire = inclus[0]?.priceCents ?? 1490;
  const quota = quotaAtelier();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="surtitre">Formules</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">Trois façons d&apos;accéder aux guides.</h1>
      <p className="mt-5 max-w-[64ch] text-encre/72">
        L&apos;encyclopédie reste gratuite. Les guides d&apos;atelier s&apos;achètent à l&apos;unité
        pour {formatPrice(prixUnitaire)}, ou s&apos;ouvrent par abonnement.
      </p>

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

      <div className="mt-12 grid gap-7 lg:grid-cols-3">
        <section className="cadre flex flex-col p-7">
          <p className="surtitre">Découverte</p>
          <p className="titre mt-3 text-section">Gratuit</p>
          <p className="legende mt-1">Sans compte, sans limite de consultation</p>
          <ul className="mt-6 space-y-2.5 text-legende not-italic">
            {AVANTAGES_FREE.map((a) => (
              <li key={a} className="flex items-baseline gap-2.5">
                <span className="text-laiton">·</span>
                {a}
              </li>
            ))}
          </ul>
          <Link href="/calibres" className="lien-souligne mt-auto pt-7 text-legende not-italic">
            Parcourir l&apos;encyclopédie
          </Link>
        </section>

        <Formule
          nom="Atelier"
          plan="atelier"
          prixMois={TARIFS.atelier.mois()}
          prixAn={TARIFS.atelier.an()}
          accroche={`${quota} guides par mois`}
          avantages={[
            `${quota} guides ouverts par mois`,
            "Un guide ouvert le reste tant que l'abonnement court",
            "Téléchargement des PDF",
            "Résiliation à tout moment",
          ]}
          actif={actif && subscription?.plan === "atelier"}
          connecte={Boolean(user)}
          erreur={sp.erreur === "renonciation"}
        />

        <Formule
          nom="Intégrale"
          plan="integral"
          prixMois={TARIFS.integral.mois()}
          prixAn={TARIFS.integral.an()}
          accroche="Tous les guides, tout le temps"
          avantages={[
            "Accès à l'ensemble des guides",
            "Aucun quota",
            "Nouveaux guides dès leur publication",
            "Résiliation à tout moment",
          ]}
          actif={actif && subscription?.plan === "integral"}
          connecte={Boolean(user)}
          erreur={sp.erreur === "renonciation"}
          souligne
        />
      </div>

      {actif && (
        <div className="cadre mt-10 flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <p className="text-encre">
              Formule {subscription?.plan === "integral" ? "Intégrale" : "Atelier"} — active
            </p>
            <p className="legende mt-1">
              {credits !== null && `${credits} guide${credits > 1 ? "s" : ""} restant${credits > 1 ? "s" : ""} sur la période · `}
              {subscription?.currentPeriodEnd &&
                `${subscription.cancelAtPeriodEnd ? "prend fin le " : "renouvelée le "}${formatDate(subscription.currentPeriodEnd)}`}
            </p>
          </div>
          <form action={openBillingPortal}>
            <button type="submit" className="bouton-secondaire">
              Gérer
            </button>
          </form>
        </div>
      )}

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
                <td>Consulter les fiches, chercher une pièce</td>
                <td>Découverte</td>
                <td className="font-technique">Gratuit</td>
              </tr>
              <tr>
                <td>Un ou deux calibres à réviser</td>
                <td>Guides à l&apos;unité</td>
                <td className="font-technique">{formatPrice(prixUnitaire)} pièce, à vie</td>
              </tr>
              <tr>
                <td>Un flux régulier de mouvements à l&apos;établi</td>
                <td>Atelier</td>
                <td className="font-technique">{formatPrice(TARIFS.atelier.mois())} par mois</td>
              </tr>
              <tr>
                <td>Atelier de restauration, besoin permanent</td>
                <td>Intégrale</td>
                <td className="font-technique">{formatPrice(TARIFS.integral.mois())} par mois</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="legende mt-2">
          {inclus.length > 0
            ? `${inclus.length} guide${inclus.length > 1 ? "s" : ""} au catalogue, soit ${formatPrice(inclus.reduce((s, g) => s + g.priceCents, 0))} à l'unité`
            : "Les guides rejoignent les abonnements au fil des publications"}
        </p>
      </section>

      <p className="mt-10 max-w-[68ch] text-legende not-italic text-encre/72">
        Un guide acheté à l&apos;unité reste accessible définitivement. Un guide ouvert par la
        formule Atelier le reste tant que l&apos;abonnement court : le crédit se consomme une fois,
        au premier téléchargement. Les guides ouverts au seul titre d&apos;un abonnement cessent de
        l&apos;être à la fin de la période payée.
      </p>
    </div>
  );
}
