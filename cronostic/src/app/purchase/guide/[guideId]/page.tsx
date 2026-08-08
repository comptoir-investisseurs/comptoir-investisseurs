import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { startGuideCheckout } from "@/app/actions";
import { GuideCover } from "@/components/guide-cover";
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
}: {
  params: Promise<{ guideId: string }>;
}) {
  const { guideId } = await params;
  const user = await requireUser(`/purchase/guide/${guideId}`);
  const guide = await getGuideById(guideId);
  if (!guide || !guide.isActive) notFound();

  // Jamais de second achat : on renvoie directement vers le téléchargement.
  const access = await guideAccessFor(user, guide);
  if (access.canDownload) redirect("/account/guides");

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <p className="surtitre">Récapitulatif</p>
      <h1 className="titre mt-4 text-3xl text-ivoire sm:text-4xl">
        Guide Cronostic — Omega {guide.caliberReference}
      </h1>

      <div className="carte mt-10 flex flex-wrap items-start gap-8 p-8">
        <GuideCover
          caliberReference={guide.caliberReference}
          coverImageUrl={guide.coverImageUrl}
          pageCount={guide.pageCount}
          className="w-36 shrink-0"
        />

        <div className="min-w-[14rem] flex-1">
          <p className="text-parchemin/70">{guide.shortDescription ?? guide.title}</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-parchemin/80">
            {GUIDE_HIGHLIGHTS.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-laiton">✓</span>
                {h}
              </li>
            ))}
          </ul>

          <div className="filet my-7" />

          <div className="flex flex-wrap items-center gap-6">
            <span className="font-display text-3xl text-ivoire">
              {formatPrice(guide.priceCents, guide.currency)}
            </span>
            <form action={startGuideCheckout}>
              <input type="hidden" name="guideId" value={guide.id} />
              <button
                type="submit"
                className="bg-laiton px-8 py-3 text-[0.8rem] tracking-[0.16em] text-noir uppercase transition-colors hover:bg-laiton-clair"
              >
                Payer
              </button>
            </form>
          </div>

          {guide.includedInSubscription && (
            <p className="mt-5 text-sm text-acier">
              Ce guide est également inclus dans{" "}
              <Link href="/pro" className="text-laiton-clair underline underline-offset-4">
                Cronostic Pro
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <Link
        href={`/calibres/${guide.caliberSlug}#guide`}
        className="lien-souligne mt-10 inline-block text-sm text-parchemin/60"
      >
        Retour à la fiche du calibre
      </Link>
    </div>
  );
}
