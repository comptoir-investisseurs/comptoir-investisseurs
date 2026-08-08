import Link from "next/link";

import { startGuideCheckout } from "@/app/actions";
import { GUIDE_HIGHLIGHTS } from "@/data/catalog";
import { formatPrice } from "@/lib/format";
import type { GuideAccess, GuideRow } from "@/lib/types";
import { GuideCover } from "./guide-cover";

/**
 * Bloc « GUIDE CRONOSTIC » d'une fiche calibre.
 *
 * Trois états, jamais mélangés :
 *   — guide déjà acheté   → téléchargement, aucune proposition d'achat ;
 *   — abonné PRO          → téléchargement, mention de l'abonnement ;
 *   — sinon               → prix et achat (connexion d'abord si nécessaire).
 */
export function GuidePanel({
  guide,
  access,
  isSignedIn,
  caliberSlug,
}: {
  guide: GuideRow | null;
  access: GuideAccess;
  isSignedIn: boolean;
  caliberSlug: string;
}) {
  if (!guide || !guide.isActive) {
    return (
      <section id="guide" className="scroll-mt-24">
        <h2 className="surtitre">Guide Cronostic</h2>
        <div className="carte mt-6 p-8">
          <p className="text-parchemin/70">
            Le guide d&apos;atelier CRONOSTIC consacré à ce calibre n&apos;est pas encore en ligne.
          </p>
          <Link href="/guides" className="lien-souligne mt-4 inline-block text-sm text-laiton-clair">
            Voir les guides déjà disponibles
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="guide" className="scroll-mt-24">
      <h2 className="surtitre">Guide Cronostic</h2>

      <div className="carte mt-6 grid gap-10 p-8 sm:p-10 lg:grid-cols-[minmax(0,240px)_1fr] lg:items-start">
        <GuideCover
          caliberReference={guide.caliberReference}
          coverImageUrl={guide.coverImageUrl}
          pageCount={guide.pageCount}
        />

        <div>
          <p className="text-[0.7rem] tracking-[0.28em] text-acier uppercase">Omega</p>
          <p className="titre mt-1 text-4xl text-ivoire">{guide.caliberReference}</p>
          <p className="mt-3 text-lg text-parchemin/80">Guide complet d&apos;entretien</p>

          <p className="mt-5 max-w-xl leading-relaxed text-parchemin/65 italic">
            «&nbsp;{guide.shortDescription ??
              `Le guide d'atelier CRONOSTIC consacré au calibre Omega ${guide.caliberReference}.`}
            &nbsp;»
          </p>

          <ul className="mt-7 grid max-w-md grid-cols-1 gap-x-8 gap-y-2 text-sm text-parchemin/85 sm:grid-cols-2">
            {GUIDE_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-baseline gap-2.5">
                <span className="text-laiton">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {guide.pageCount ? (
            <p className="mt-5 text-[0.75rem] tracking-[0.16em] text-acier uppercase">
              {guide.pageCount} pages · PDF
            </p>
          ) : null}

          <div className="filet my-8" />

          {access.owned ? (
            <div className="flex flex-wrap items-center gap-5">
              <p className="text-lg text-laiton-clair">Vous possédez ce guide</p>
              <DownloadButton guideId={guide.id} />
            </div>
          ) : access.viaSubscription ? (
            <div className="flex flex-wrap items-center gap-5">
              <p className="text-lg text-laiton-clair">Inclus avec votre abonnement PRO</p>
              <DownloadButton guideId={guide.id} />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <p className="font-display text-3xl text-ivoire">
                {formatPrice(guide.priceCents, guide.currency)}
              </p>

              {isSignedIn ? (
                <form action={startGuideCheckout}>
                  <input type="hidden" name="guideId" value={guide.id} />
                  <button
                    type="submit"
                    className="bg-laiton px-8 py-3 text-[0.8rem] tracking-[0.16em] text-noir uppercase transition-colors hover:bg-laiton-clair"
                  >
                    Acheter
                  </button>
                </form>
              ) : (
                <Link
                  href={`/connexion?redirect=${encodeURIComponent(`/purchase/guide/${guide.id}`)}`}
                  className="bg-laiton px-8 py-3 text-[0.8rem] tracking-[0.16em] text-noir uppercase transition-colors hover:bg-laiton-clair"
                >
                  Acheter
                </Link>
              )}

              {guide.includedInSubscription && (
                <Link href="/pro" className="lien-souligne text-sm text-parchemin/70">
                  ou inclus avec CRONOSTIC PRO
                </Link>
              )}
            </div>
          )}

          {guide.previewFileKey && !access.canDownload && (
            <Link
              href={`/api/guides/${guide.id}/preview`}
              className="lien-souligne mt-6 inline-block text-sm text-parchemin/70"
            >
              Consulter l&apos;extrait
            </Link>
          )}

          <p className="mt-6 text-xs text-acier">
            Guide produit et mis en page par CRONOSTIC. Fichier PDF, téléchargeable depuis votre
            compte à tout moment.{" "}
            <Link href={`/calibres/${caliberSlug}`} className="underline underline-offset-2">
              Retour à la fiche
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function DownloadButton({ guideId }: { guideId: string }) {
  return (
    <a
      href={`/api/guides/${guideId}/download`}
      className="border border-laiton/60 px-8 py-3 text-[0.8rem] tracking-[0.16em] text-laiton-clair uppercase transition-colors hover:bg-laiton/10"
    >
      Télécharger
    </a>
  );
}
