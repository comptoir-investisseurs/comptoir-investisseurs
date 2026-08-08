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
    <article className="carte carte-interactive group flex flex-col p-4">
      <Link href={`/calibres/${guide.caliberSlug}#guide`} className="block">
        <GuideCover
          caliberReference={guide.caliberReference}
          coverImageUrl={guide.coverImageUrl}
          pageCount={guide.pageCount}
        />
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="surtitre-marque">Guide Cronostic</p>

        <h3 className="titre mt-2 text-lg text-ivoire">
          <Link href={`/calibres/${guide.caliberSlug}#guide`} className="lien-souligne">
            Omega {guide.caliberReference}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm text-parchemin/65">
          {guide.shortDescription ?? guide.title}
        </p>

        <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] tracking-wide text-acier uppercase">
          <div className="flex gap-1.5">
            <dt className="sr-only">Calibre</dt>
            <dd>Calibre {guide.caliberReference}</dd>
          </div>
          {guide.pageCount ? (
            <div className="flex gap-1.5">
              <dt className="sr-only">Pages</dt>
              <dd>{guide.pageCount} pages</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-auto pt-4">
          <div className="filet mb-3" />
          {owned ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-laiton-clair">Vous possédez ce guide</span>
              <Link
                href="/compte/guides"
                className="text-[0.78rem] tracking-wide text-ivoire underline underline-offset-4"
              >
                Télécharger
              </Link>
            </div>
          ) : viaSubscription ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-laiton-clair">Inclus avec Cronostic Pro</span>
              <Link
                href="/compte/guides"
                className="text-[0.78rem] tracking-wide text-ivoire underline underline-offset-4"
              >
                Télécharger
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-display text-xl text-ivoire">
                {formatPrice(guide.priceCents, guide.currency)}
              </span>
              <Link
                href={`/calibres/${guide.caliberSlug}#guide`}
                className="border border-laiton/50 px-4 py-1.5 text-[0.78rem] tracking-wide text-laiton-clair transition-colors group-hover:bg-laiton/10"
              >
                Voir le guide
              </Link>
            </div>
          )}
          {guide.includedInSubscription && !owned && !viaSubscription && (
            <p className="mt-2 text-[0.7rem] tracking-wide text-acier">Inclus avec Cronostic Pro</p>
          )}
        </div>
      </div>
    </article>
  );
}
