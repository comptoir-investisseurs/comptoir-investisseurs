/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

import { buildPartQuery, searchParts } from "@/lib/ebay";
import { formatPrice } from "@/lib/format";
import { getCaliberBySlug, listCalibers } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Recherche de pièces détachées",
  description:
    "Trouvez la bonne référence de fourniture pour un calibre Omega vintage, puis les offres disponibles chez les marchands spécialisés.",
};

type SearchParams = Promise<{ calibre?: string; piece?: string; q?: string }>;

export default async function PiecesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const calibers = await listCalibers();
  const selectedSlug = sp.calibre ?? calibers[0]?.slug;
  const caliber = selectedSlug ? await getCaliberBySlug(selectedSlug) : null;
  const part = caliber?.parts.find((p) => p.reference === sp.piece) ?? null;

  const query =
    sp.q?.trim() ||
    (caliber ? buildPartQuery(caliber.reference, part?.nameEn ?? null) : "Omega movement parts");

  const result = await searchParts(query);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="surtitre">Pièces détachées</p>
      <h1 className="titre mt-4 max-w-2xl text-4xl text-ivoire sm:text-5xl">
        Trouvez la bonne référence. Puis trouvez la pièce.
      </h1>

      <form action="/pieces" method="get" className="mt-10 flex max-w-2xl gap-3">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Omega 265 balance staff, ressort de barillet 30T2..."
          className="flex-1 border border-parchemin/20 bg-encre/70 px-4 py-3 text-ivoire outline-none focus:border-laiton/60"
          aria-label="Recherche libre d'une pièce"
        />
        <button
          type="submit"
          className="border border-laiton/50 px-6 text-[0.78rem] tracking-[0.16em] text-laiton-clair uppercase transition-colors hover:bg-laiton/10"
        >
          Chercher
        </button>
      </form>

      <div className="mt-12 grid gap-12 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        {/* ── Colonne de sélection ─────────────────────── */}
        <aside className="space-y-8 lg:sticky lg:top-24">
          <div>
            <h2 className="surtitre">Calibre</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {calibers.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/pieces?calibre=${c.slug}`}
                    className={`block border px-3 py-1.5 text-sm transition-colors ${
                      c.slug === selectedSlug
                        ? "border-laiton/60 bg-laiton/10 text-laiton-clair"
                        : "border-parchemin/18 text-parchemin/70 hover:border-laiton/40"
                    }`}
                  >
                    {c.reference}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {caliber && (
            <div>
              <h2 className="surtitre">Fourniture</h2>
              <ul className="carte mt-4 max-h-[26rem] divide-y divide-parchemin/8 overflow-auto">
                {caliber.parts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pieces?calibre=${caliber.slug}&piece=${encodeURIComponent(p.reference)}`}
                      className={`flex items-baseline gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-graphite/60 ${
                        p.reference === sp.piece ? "bg-laiton/10 text-laiton-clair" : "text-parchemin/75"
                      }`}
                    >
                      <span className="font-mono text-[0.68rem] text-laiton">
                        {p.positionNumber}
                      </span>
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/calibres/${caliber.slug}#pieces`}
                className="lien-souligne mt-4 inline-block text-sm text-parchemin/70"
              >
                Voir la fiche du calibre {caliber.reference}
              </Link>
            </div>
          )}
        </aside>

        {/* ── Résultats ────────────────────────────────── */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="surtitre">Offres</h2>
            <p className="text-xs text-acier">
              Requête&nbsp;: <span className="text-parchemin/70">{result.query}</span>
            </p>
          </div>

          {result.mode === "live" ? (
            result.listings.length === 0 ? (
              <p className="carte mt-6 p-8 text-parchemin/70">
                Aucune offre ne correspond actuellement à cette recherche. Les liens marchands
                ci-dessous restent utilisables.
              </p>
            ) : (
              <ul className="mt-6 grid gap-5 sm:grid-cols-2">
                {result.listings.map((item) => (
                  <li key={item.id} className="carte carte-interactive overflow-hidden">
                    <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="flex gap-4 p-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-24 w-24 shrink-0 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-24 w-24 shrink-0 bg-graphite" />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm text-ivoire">{item.title}</p>
                        <p className="font-display mt-2 text-lg text-laiton-clair">
                          {item.priceCents != null
                            ? formatPrice(item.priceCents, item.currency ?? "EUR")
                            : "Prix sur demande"}
                        </p>
                        <p className="mt-1 text-xs text-acier">
                          {[item.condition, item.sellerName, item.location]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="carte mt-6 border-l-2 border-laiton/50 p-6 text-sm leading-relaxed text-parchemin/70">
              {result.reason}
            </p>
          )}

          <h2 className="surtitre mt-12">Chercher chez les marchands</h2>
          <ul className="carte mt-4 divide-y divide-parchemin/8">
            {result.links.map((link) => (
              <li key={link.merchant}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-graphite/60"
                >
                  <span className="text-ivoire">{link.merchant}</span>
                  <span className="text-xs text-acier">{link.note}</span>
                  <span className="ml-auto text-[0.72rem] tracking-[0.16em] text-laiton uppercase">
                    Ouvrir ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
