import type { Metadata } from "next";
import Link from "next/link";

import { SiteSearch } from "@/components/site-search";
import { PageHeader } from "@/components/page-header";
import { listCalibers } from "@/lib/repo";
import { indexReduit } from "@/lib/search-index";
import { totalMouvements } from "@/lib/encyclopedie";
import { MARQUES } from "@/data/encyclopedie";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Calibres Omega vintage",
  description:
    "Encyclopédie Cronostic des calibres Omega vintage : fiches techniques, nomenclature, huiles et guides d'atelier.",
};

export default async function CalibresPage() {
  const [calibers, index] = await Promise.all([listCalibers(), indexReduit()]);
  const total = totalMouvements() - calibers.length;

  return (
    <>
      <PageHeader
        surtitre="Encyclopédie"
        titre="Calibres"
        chapeau={`Les calibres documentés en détail : présentation, architecture, nomenclature des fournitures, points de lubrification. ${total} autres calibres, répartis sur ${MARQUES.length} marques, sont répertoriés dans l'encyclopédie et attendent leur relecture d'atelier.`}
        cle="calibres"
      >
        <div className="mt-8 max-w-xl">
          <SiteSearch index={index} size="compact" />
        </div>
      </PageHeader>

      <ul className="mx-auto mt-12 grid max-w-6xl gap-px border border-gris-trait bg-gris-trait sm:grid-cols-2 lg:grid-cols-3 grid gap-px border border-gris-trait bg-gris-trait">
        {calibers.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/calibres/${c.slug}`}
              className="cadre-interactif flex h-full flex-col bg-white p-7 hover:bg-papier"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-titre text-couverture text-encre">{c.reference}</span>
                <span className="text-[0.7rem] tracking-[0.18em] text-encre/55 uppercase">
                  {c.brand}
                </span>
              </div>
              <p className="mt-4 line-clamp-3 text-legende leading-relaxed text-encre/72">
                {c.summary}
              </p>
              <p className="mt-6 text-[0.7rem] tracking-[0.16em] text-encre/55 uppercase">
                {c.familyName ?? "—"}
                {c.introducedYear ? ` · ${c.introducedYear}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mx-auto mt-14 mb-16 max-w-6xl px-5">
        <h2 className="surtitre">Le reste de l&apos;encyclopédie</h2>
        <div className="filet mt-2" />
        <div className="cadre mt-6 flex flex-wrap items-center justify-between gap-6 p-7">
          <p className="max-w-[58ch] text-encre/72">
            {total} calibres supplémentaires, de {MARQUES.length} marques — ébauches Valjoux et ETA,
            manufactures Rolex, Zenith ou Jaeger-LeCoultre, mouvements japonais et soviétiques. Ces
            fiches donnent la référence, la période, le type et les repères dimensionnels ; le reste
            se complète au fil des relectures.
          </p>
          <Link href="/marques" className="bouton">
            Parcourir par marque
          </Link>
        </div>
      </section>
    </>
  );
}
