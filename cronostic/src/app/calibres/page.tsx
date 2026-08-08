import type { Metadata } from "next";
import Link from "next/link";

import { CaliberSearch } from "@/components/caliber-search";
import { listCalibers } from "@/lib/repo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Calibres Omega vintage",
  description:
    "Encyclopédie Cronostic des calibres Omega vintage : fiches techniques, nomenclature, huiles et guides d'atelier.",
};

export default async function CalibresPage() {
  const calibers = await listCalibers();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="surtitre">Encyclopédie</p>
      <h1 className="titre mt-4 text-couverture text-encre sm:text-couverture">Calibres</h1>
      <p className="mt-5 max-w-2xl leading-relaxed text-encre/72">
        Le catalogue de lancement couvre la famille des mouvements Omega de 30 millimètres à
        remontage manuel. Chaque fiche est gratuite et s&apos;enrichit au fil des relectures
        d&apos;atelier.
      </p>

      <div className="mt-10 max-w-xl">
        <CaliberSearch calibers={calibers} size="compact" />
      </div>

      <ul className="mt-12 grid gap-px border border-gris-trait bg-gris-trait sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
