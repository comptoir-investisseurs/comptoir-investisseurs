import Link from "next/link";

import { formatPrice } from "@/lib/format";
import type { GuideRow } from "@/lib/types";
import { GuideCover } from "./guide-cover";

export function GuideCard({
  guide,
  owned = false,
  viaSubscription = false,
}: {
  guide: GuideRow;
  owned?: boolean;
  viaSubscription?: boolean;
}) {
  return (
    <article className="cadre cadre-interactif flex flex-col p-4">
      <Link href={`/calibres/${guide.caliberSlug}#guide`}>
        <GuideCover
          caliberReference={guide.caliberReference}
          coverImageUrl={guide.coverImageUrl}
          pageCount={guide.pageCount}
        />
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="surtitre-marque">Guide Cronostic</p>

        <h3 className="titre mt-1.5 text-etape">
          <Link href={`/calibres/${guide.caliberSlug}#guide`} className="lien-souligne">
            Omega {guide.caliberReference}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-legende not-italic text-encre/72">
          {guide.shortDescription ?? guide.title}
        </p>

        <p className="mt-3 text-surtitre tracking-[0.14em] text-encre/55 uppercase">
          Calibre {guide.caliberReference}
          {guide.pageCount ? ` · ${guide.pageCount} pages` : ""}
        </p>

        <div className="mt-auto pt-4">
          <div className="filet-fin mb-3" />
          {owned || viaSubscription ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-legende not-italic text-encre/72">
                {owned ? "Guide acquis" : "Inclus avec Cronostic Pro"}
              </span>
              <Link href="/account/guides" className="lien-souligne text-legende not-italic">
                Télécharger
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="titre text-etape">
                  {formatPrice(guide.priceCents, guide.currency)}
                </span>
                <Link href={`/calibres/${guide.caliberSlug}#guide`} className="bouton-secondaire">
                  Voir
                </Link>
              </div>
              {guide.includedInSubscription && (
                <p className="mt-2 text-legende not-italic text-encre/55">
                  Inclus avec Cronostic Pro
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
