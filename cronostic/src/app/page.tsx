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
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="border-b border-parchemin/10">
        <div className="mx-auto max-w-6xl px-5 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <p className="surtitre-marque">Cronostic</p>
          <h1 className="titre mt-5 max-w-3xl text-4xl text-ivoire sm:text-6xl">
            La documentation technique de l&apos;horloger.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-parchemin/70">
            Guides d&apos;atelier et pièces détachées pour mouvements horlogers vintage.
          </p>

          <div className="mt-10 max-w-2xl">
            <p className="mb-3 text-sm tracking-wide text-acier">
              Quel calibre recherchez-vous&nbsp;?
            </p>
            <CaliberSearch calibers={calibers} />
          </div>
        </div>
      </section>

      {/* ── Calibres disponibles ─────────────────────────── */}
      <section className="border-b border-parchemin/10">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex items-end justify-between gap-6">
            <h2 className="surtitre">Calibres disponibles</h2>
            <Link
              href="/calibres"
              className="lien-souligne text-sm text-parchemin/70 hover:text-ivoire"
            >
              Tout le catalogue
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-px border border-parchemin/12 bg-parchemin/12 sm:grid-cols-3 lg:grid-cols-5">
            {calibers.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/calibres/${c.slug}`}
                  className="flex h-full flex-col justify-between bg-noir p-6 transition-colors hover:bg-graphite"
                >
                  <span className="font-display text-3xl text-ivoire">{c.reference}</span>
                  <span className="mt-6 block text-[0.7rem] tracking-[0.18em] text-acier uppercase">
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
      <section className="border-b border-parchemin/10">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="surtitre-marque">Guides Cronostic</h2>
          <p className="titre mt-4 max-w-2xl text-3xl text-ivoire sm:text-4xl">
            Des manuels conçus pour être utilisés directement à l&apos;établi.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {["Démonter", "Entretenir", "Remonter"].map((verbe) => (
              <span
                key={verbe}
                className="border border-laiton/40 px-5 py-2 text-[0.78rem] tracking-[0.16em] text-laiton-clair uppercase"
              >
                {verbe}
              </span>
            ))}
          </div>

          {vitrine.length > 0 ? (
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {vitrine.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/calibres/${guide.caliberSlug}#guide`}
                  className="group block"
                >
                  <GuideCover
                    caliberReference={guide.caliberReference}
                    coverImageUrl={guide.coverImageUrl}
                    pageCount={guide.pageCount}
                    className="transition-transform duration-200 group-hover:-translate-y-1"
                  />
                  <p className="mt-4 text-sm text-ivoire">Omega {guide.caliberReference}</p>
                  <p className="mt-1 text-[0.78rem] text-acier">
                    {formatPrice(guide.priceCents, guide.currency)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="carte mt-12 flex flex-col gap-6 p-8 sm:flex-row sm:items-center">
              <GuideCover caliberReference="265" className="w-40 shrink-0" />
              <div>
                <p className="text-sm leading-relaxed text-parchemin/70">
                  Les guides Cronostic sont mis en ligne calibre par calibre. Chaque manuel couvre
                  le cycle complet d&apos;entretien&nbsp;:
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-parchemin/80">
                  {GUIDE_HIGHLIGHTS.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span className="text-laiton">✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/guides"
                  className="lien-souligne mt-6 inline-block text-sm text-laiton-clair"
                >
                  Voir les guides disponibles
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Pièces détachées ─────────────────────────────── */}
      <section className="border-b border-parchemin/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="surtitre">Pièces détachées</h2>
            <p className="titre mt-4 text-3xl text-ivoire sm:text-4xl">
              Trouvez la bonne référence.
              <br />
              Puis trouvez la pièce.
            </p>
            <p className="mt-6 max-w-lg leading-relaxed text-parchemin/70">
              Chaque calibre est accompagné de sa nomenclature. Depuis une fourniture, Cronostic
              lance la recherche d&apos;offres chez les marchands spécialisés et sur le marché de
              l&apos;occasion.
            </p>
            <Link
              href="/pieces"
              className="mt-8 inline-block border border-laiton/50 px-6 py-3 text-[0.8rem] tracking-[0.16em] text-laiton-clair uppercase transition-colors hover:bg-laiton/10"
            >
              Rechercher une pièce
            </Link>
          </div>

          <ul className="carte divide-y divide-parchemin/10">
            {[
              ["100", "Platine", "Main plate"],
              ["180", "Barillet complet", "Barrel complete"],
              ["195", "Ressort de barillet", "Mainspring"],
              ["721", "Balancier complet", "Balance complete"],
              ["722", "Axe de balancier", "Balance staff"],
            ].map(([num, fr, en]) => (
              <li key={num} className="flex items-baseline gap-4 px-6 py-4">
                <span className="font-mono text-xs text-laiton">{num}</span>
                <span className="text-ivoire">{fr}</span>
                <span className="ml-auto text-xs text-acier">{en}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Cronostic Pro ────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="carte relative overflow-hidden px-8 py-14 text-center sm:px-14">
            <div className="pointer-events-none absolute inset-4 border border-laiton/15" />
            <h2 className="surtitre-marque relative">Cronostic Pro</h2>
            <p className="titre relative mt-5 text-4xl text-ivoire sm:text-5xl">
              Tous les guides. Un seul abonnement.
            </p>
            <p className="relative mx-auto mt-6 max-w-xl leading-relaxed text-parchemin/70">
              L&apos;accès à l&apos;ensemble des guides Cronostic inclus dans l&apos;abonnement, aux
              nouveaux manuels dès leur publication, et au téléchargement des PDF.
            </p>
            <p className="font-display relative mt-8 text-2xl text-laiton-clair">
              {formatPrice(proPriceCents())}
              <span className="ml-1 text-sm text-acier">/ mois</span>
            </p>
            <Link
              href="/pro"
              className="relative mt-8 inline-block bg-laiton px-8 py-3 text-[0.8rem] tracking-[0.16em] text-noir uppercase transition-colors hover:bg-laiton-clair"
            >
              Découvrir Cronostic Pro
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
