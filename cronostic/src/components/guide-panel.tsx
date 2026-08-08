import Link from "next/link";

import { startGuideCheckout } from "@/app/actions";
import { GUIDE_HIGHLIGHTS } from "@/data/catalog";
import { formatPrice } from "@/lib/format";
import type { GuideAccess, GuideRow } from "@/lib/types";
import { GuideCover } from "./guide-cover";

/**
 * Bloc « Guide Cronostic » d'une fiche calibre.
 *
 * Trois états, jamais mélangés :
 *   — guide déjà acquis   → téléchargement, aucune proposition d'achat ;
 *   — abonné Cronostic Pro → téléchargement, mention de l'abonnement ;
 *   — sinon               → prix et achat (connexion d'abord si nécessaire).
 */
export function GuidePanel({
  guide,
  access,
  isSignedIn,
}: {
  guide: GuideRow | null;
  access: GuideAccess;
  isSignedIn: boolean;
  caliberSlug: string;
}) {
  if (!guide || !guide.isActive) {
    return (
      <section id="guide" className="scroll-mt-28">
        <h2 className="surtitre-marque">Guide Cronostic</h2>
        <div className="filet mt-2" />
        <p className="mt-5 text-encre/72">
          Le guide d&apos;atelier consacré à ce calibre n&apos;est pas encore publié.
        </p>
        <Link href="/guides" className="lien-souligne mt-3 inline-block">
          Guides disponibles
        </Link>
      </section>
    );
  }

  return (
    <section id="guide" className="scroll-mt-28">
      <h2 className="surtitre-marque">Guide Cronostic</h2>
      <div className="filet mt-2" />

      <div className="cadre-papier mt-6 grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,200px)_1fr] lg:items-start">
        <GuideCover
          caliberReference={guide.caliberReference}
          coverImageUrl={guide.coverImageUrl}
          pageCount={guide.pageCount}
        />

        <div>
          <p className="surtitre">Omega {guide.caliberReference}</p>
          <p className="titre mt-1 text-section">Guide complet d&apos;entretien</p>

          <p className="mt-4 max-w-[60ch] text-encre/72">
            {guide.shortDescription ??
              `Guide d'atelier Cronostic consacré au calibre Omega ${guide.caliberReference}.`}
          </p>

          <ul className="mt-6 grid max-w-lg grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {GUIDE_HIGHLIGHTS.map((item, i) => (
              <li key={item} className="flex items-center gap-3">
                <span className="pastille-cerclee">{i + 1}</span>
                {item}
              </li>
            ))}
          </ul>

          {guide.pageCount ? (
            <p className="mt-5 font-technique text-legende not-italic text-encre/60">
              {guide.pageCount} pages · PDF
            </p>
          ) : null}

          <div className="filet-fin my-6" />

          {access.owned || access.viaSubscription ? (
            <div className="flex flex-wrap items-center gap-5">
              <p className="text-encre">
                {access.owned ? "Vous possédez ce guide" : "Inclus avec votre abonnement Cronostic Pro"}
              </p>
              <a href={`/api/guides/${guide.id}/download`} className="bouton">
                Télécharger
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <p className="titre text-couverture">
                {formatPrice(guide.priceCents, guide.currency)}
              </p>

              {isSignedIn ? (
                <form action={startGuideCheckout}>
                  <input type="hidden" name="guideId" value={guide.id} />
                  <button type="submit" className="bouton">
                    Acheter
                  </button>
                </form>
              ) : (
                <Link
                  href={`/connexion?redirect=${encodeURIComponent(`/purchase/guide/${guide.id}`)}`}
                  className="bouton"
                >
                  Acheter
                </Link>
              )}

              {guide.includedInSubscription && (
                <Link href="/pro" className="lien-souligne">
                  ou inclus avec Cronostic Pro
                </Link>
              )}
            </div>
          )}

          {guide.previewFileKey && !access.canDownload && (
            <Link
              href={`/api/guides/${guide.id}/preview`}
              className="lien-souligne mt-5 inline-block text-legende not-italic"
            >
              Extrait
            </Link>
          )}

          <p className="mt-5 text-legende not-italic text-encre/60">
            Guide produit et mis en page par Cronostic. Fichier PDF, téléchargeable depuis votre
            compte.
          </p>
        </div>
      </div>
    </section>
  );
}
