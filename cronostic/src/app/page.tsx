import Link from "next/link";

import { CaliberSearch } from "@/components/caliber-search";
import { GuideCover } from "@/components/guide-cover";
import { GUIDE_HIGHLIGHTS } from "@/data/catalog";
import { proPriceCents } from "@/lib/env";
import { formatPrice } from "@/lib/format";
import { listCalibers, listGuides } from "@/lib/repo";

export const revalidate = 3600;

export default async function HomePage() {
  const [calibers, guides] = await Promise.all([listCalibers(), listGuides({ activeOnly: true })]);
  const vitrine = guides.slice(0, 4);

  return (
    <>
      {/* ── Ouverture ────────────────────────────────────── */}
      <section className="border-b border-gris-trait">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-14">
          <p className="surtitre">Documentation technique horlogère</p>
          <div className="filet mt-3" />
          <h1 className="titre mt-6 max-w-3xl text-couverture">
            La documentation technique de l&apos;horloger.
          </h1>
          <p className="mt-5 max-w-[60ch] text-encre/72">
            Guides d&apos;atelier et pièces détachées pour mouvements horlogers vintage.
          </p>

          <div className="mt-9 max-w-2xl">
            <p className="mb-2 text-legende not-italic text-encre/60">
              Quel calibre recherchez-vous&nbsp;?
            </p>
            <CaliberSearch calibers={calibers} />
          </div>
        </div>
      </section>

      {/* ── Calibres disponibles ─────────────────────────── */}
      <section className="border-b border-gris-trait">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="surtitre">Calibres disponibles</h2>
              <div className="filet mt-2" />
            </div>
            <Link href="/calibres" className="lien-souligne text-legende not-italic">
              Catalogue complet
            </Link>
          </div>

          <ul className="mt-7 grid grid-cols-2 gap-px border border-gris-trait bg-gris-trait sm:grid-cols-3 lg:grid-cols-5">
            {calibers.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/calibres/${c.slug}`}
                  className="flex h-full flex-col justify-between bg-white p-5 transition-colors hover:bg-papier"
                >
                  <span className="titre text-section">{c.reference}</span>
                  <span className="mt-5 block text-surtitre tracking-[0.14em] text-encre/55 uppercase">
                    {c.brand}
                    {c.introducedYear ? ` · ${c.introducedYear}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Guides Cronostic ─────────────────────────────── */}
      <section className="border-b border-gris-trait">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="surtitre-marque">Guides Cronostic</h2>
          <div className="filet mt-2" />
          <p className="titre mt-5 max-w-2xl text-section">
            Des manuels conçus pour être utilisés directement à l&apos;établi.
          </p>

          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
            {["Démonter", "Entretenir", "Remonter"].map((verbe, i) => (
              <li key={verbe} className="flex items-center gap-3">
                <span className="pastille">{i + 1}</span>
                {verbe}
              </li>
            ))}
          </ul>

          {vitrine.length > 0 ? (
            <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {vitrine.map((guide) => (
                <Link key={guide.id} href={`/calibres/${guide.caliberSlug}#guide`}>
                  <GuideCover
                    caliberReference={guide.caliberReference}
                    coverImageUrl={guide.coverImageUrl}
                    pageCount={guide.pageCount}
                  />
                  <p className="mt-3">Omega {guide.caliberReference}</p>
                  <p className="mt-0.5 font-technique text-legende not-italic text-encre/60">
                    {formatPrice(guide.priceCents, guide.currency)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="cadre-papier mt-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              <GuideCover caliberReference="265" className="w-36 shrink-0" />
              <div>
                <p className="max-w-[60ch] text-encre/72">
                  Les guides sont mis en ligne calibre par calibre. Chaque manuel couvre le cycle
                  complet d&apos;entretien.
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-legende not-italic">
                  {GUIDE_HIGHLIGHTS.map((h, i) => (
                    <li key={h} className="flex items-center gap-2.5">
                      <span className="pastille-cerclee">{i + 1}</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <Link href="/guides" className="lien-souligne mt-5 inline-block">
                  Guides disponibles
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Pièces détachées ─────────────────────────────── */}
      <section className="border-b border-gris-trait">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="surtitre">Pièces détachées</h2>
            <div className="filet mt-2" />
            <p className="titre mt-5 text-section">
              Trouvez la bonne référence. Puis trouvez la pièce.
            </p>
            <p className="mt-4 max-w-[60ch] text-encre/72">
              Chaque calibre est accompagné de sa nomenclature. Depuis une fourniture, la recherche
              d&apos;offres est lancée chez les marchands spécialisés et sur le marché de
              l&apos;occasion.
            </p>
            <Link href="/pieces" className="bouton mt-7">
              Rechercher une pièce
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th scope="col">N°</th>
                  <th scope="col">Fourniture</th>
                  <th scope="col">Désignation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["100", "Platine", "Main plate"],
                  ["180", "Barillet complet", "Barrel complete"],
                  ["195", "Ressort de barillet", "Mainspring"],
                  ["721", "Balancier complet", "Balance complete"],
                  ["722", "Axe de balancier", "Balance staff"],
                ].map(([num, fr, en]) => (
                  <tr key={num}>
                    <td className="font-technique text-legende not-italic">{num}</td>
                    <td>{fr}</td>
                    <td className="text-encre/60">{en}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="legende mt-2">Extrait de la nomenclature de la famille 30 mm</p>
          </div>
        </div>
      </section>

      {/* ── Cronostic Pro ────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="cadre-papier px-6 py-10 sm:px-10">
            <h2 className="surtitre-marque">Cronostic Pro</h2>
            <div className="filet mt-2" />
            <p className="titre mt-5 max-w-2xl text-couverture">
              Tous les guides. Un seul abonnement.
            </p>
            <p className="mt-4 max-w-[60ch] text-encre/72">
              Accès à l&apos;ensemble des guides inclus dans l&apos;abonnement, aux nouveaux manuels
              dès leur publication, et au téléchargement des PDF.
            </p>
            <p className="titre mt-6 text-section">
              {formatPrice(proPriceCents())}
              <span className="ml-1 text-legende not-italic text-encre/60">par mois</span>
            </p>
            <Link href="/pro" className="bouton mt-6">
              Cronostic Pro
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
