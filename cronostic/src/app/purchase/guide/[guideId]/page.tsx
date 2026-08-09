import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { startGuideCheckout } from "@/app/actions";
import { GuideCover } from "@/components/guide-cover";
import { Renonciation } from "@/components/renonciation";
import { GUIDE_HIGHLIGHTS } from "@/data/catalog";
import { requireUser } from "@/lib/auth";
import { guideAccessFor } from "@/lib/entitlements";
import { formatPrice } from "@/lib/format";
import { getGuideById } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Récapitulatif",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Étape de reprise après connexion : le visiteur non connecté qui clique sur
 * « Acheter » est renvoyé ici une fois authentifié, avec le bon guide en main.
 */
export default async function PurchaseGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ guideId: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { guideId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/purchase/guide/${guideId}`);
  const guide = await getGuideById(guideId);
  if (!guide || !guide.isActive) notFound();

  // Jamais de second achat : on renvoie directement vers le téléchargement.
  const access = await guideAccessFor(user, guide);
  if (access.canDownload) redirect("/account/guides");

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <p className="surtitre">Récapitulatif</p>
      <h1 className="titre mt-4 text-section text-encre sm:text-couverture">
        Guide Cronostic — {guide.caliberBrand} {guide.caliberReference}
      </h1>

      <div className="cadre mt-10 flex flex-wrap items-start gap-8 p-8">
        <GuideCover
          caliberReference={guide.caliberReference}
          brand={guide.caliberBrand}
          coverImageUrl={guide.coverImageUrl}
          pageCount={guide.pageCount}
          className="w-36 shrink-0"
        />

        <div className="min-w-[14rem] flex-1">
          <p className="text-encre/72">{guide.shortDescription ?? guide.title}</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-legende text-encre/72">
            {GUIDE_HIGHLIGHTS.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-laiton">✓</span>
                {h}
              </li>
            ))}
          </ul>

          <div className="filet my-7" />

          <form action={startGuideCheckout}>
            <input type="hidden" name="guideId" value={guide.id} />
            <Renonciation objet="guide" />
            {sp.erreur === "renonciation" && (
              <p className="mt-4 border-l-2 border-alerte bg-papier px-5 py-3 text-legende not-italic text-alerte">
                La commande n&apos;a pas été passée : la renonciation au droit de rétractation doit
                être cochée pour que le fichier soit mis à disposition immédiatement.
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <span className="font-titre text-section text-encre">
                {formatPrice(guide.priceCents, guide.currency)}
              </span>
              <button type="submit" className="bouton">
                Payer
              </button>
            </div>
          </form>

          {guide.includedInSubscription && (
            <p className="mt-5 text-legende text-encre/55">
              Ce guide est également inclus dans{" "}
              <Link href="/pro" className="text-laiton underline underline-offset-4">
                Cronostic Pro
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <Link
        href={`/calibres/${guide.caliberSlug}#guide`}
        className="lien-souligne mt-10 inline-block text-legende text-encre/72"
      >
        Retour à la fiche du calibre
      </Link>
    </div>
  );
}
