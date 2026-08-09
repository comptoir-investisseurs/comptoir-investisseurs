import type { Metadata } from "next";
import Link from "next/link";

import { GuideCover } from "@/components/guide-cover";
import { requireUser } from "@/lib/auth";
import { hasActivePro, ownedGuideIds } from "@/lib/entitlements";
import { listGuides } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Mes guides",
  robots: { index: false, follow: false },
};

export default async function MesGuidesPage() {
  const user = await requireUser("/account/guides");
  const [guides, owned, pro] = await Promise.all([
    listGuides({ activeOnly: true }),
    ownedGuideIds(user),
    hasActivePro(user),
  ]);

  const accessibles = guides
    .map((guide) => ({
      guide,
      owned: owned.has(guide.id),
      viaSubscription: pro && guide.includedInSubscription,
    }))
    .filter((row) => row.owned || row.viaSubscription);

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="surtitre">Mon compte</p>
          <h1 className="titre mt-3 text-couverture text-encre">Mes guides</h1>
        </div>
        <Link href="/account" className="lien-souligne text-legende text-encre/72">
          Abonnement et facturation
        </Link>
      </div>

      {accessibles.length === 0 ? (
        <div className="cadre mt-12 p-10">
          <p className="text-encre/72">
            Vous n&apos;avez encore accès à aucun guide. Les guides achetés à l&apos;unité et ceux
            inclus dans Cronostic Pro apparaissent ici.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/guides"
              className="bouton-secondaire"
            >
              Voir les guides
            </Link>
            <Link
              href="/pro"
              className="px-2 py-3 text-surtitre tracking-[0.16em] text-encre/72 uppercase underline underline-offset-4"
            >
              Découvrir Cronostic Pro
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-12 space-y-5">
          {accessibles.map(({ guide, owned: isOwned, viaSubscription }) => (
            <li key={guide.id} className="cadre flex flex-wrap items-center gap-6 p-5">
              <Link href={`/calibres/${guide.caliberSlug}#guide`} className="w-24 shrink-0">
                <GuideCover
                  compact
                  caliberReference={guide.caliberReference}
          brand={guide.caliberBrand}
                  coverImageUrl={guide.coverImageUrl}
                />
              </Link>

              <div className="min-w-[12rem] flex-1">
                <p className="font-titre text-etape text-encre">
                  {guide.caliberBrand} {guide.caliberReference}
                </p>
                <p className="mt-1 text-legende text-encre/72">Guide complet Cronostic</p>
                <p className="mt-2 text-[0.7rem] tracking-[0.14em] text-encre/55 uppercase">
                  {isOwned ? "Acheté — accès définitif" : "Inclus avec Cronostic Pro"}
                  {guide.pageCount ? ` · ${guide.pageCount} pages` : ""}
                </p>
              </div>

              <a
                href={`/api/guides/${guide.id}/download`}
                className="bouton-secondaire"
              >
                Télécharger
              </a>
            </li>
          ))}
        </ul>
      )}

      {!pro && (
        <div className="cadre mt-14 flex flex-wrap items-center justify-between gap-6 p-7">
          <p className="text-encre/72">
            Cronostic Pro donne accès à l&apos;ensemble des guides inclus dans l&apos;abonnement.
          </p>
          <Link
            href="/pro"
            className="text-surtitre tracking-[0.16em] text-laiton uppercase underline underline-offset-4"
          >
            En savoir plus
          </Link>
        </div>
      )}
    </div>
  );
}
