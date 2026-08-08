/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

import { buildPartQuery, searchParts } from "@/lib/ebay";
import { formatPrice } from "@/lib/format";
import { getCaliberBySlug, listCalibers } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Recherche de pièces détachées",
  description:
    "Trouvez la bonne référence de fourniture pour un calibre Omega vintage, son prix moyen sur le marché de l'occasion, et l'annonce correspondante.",
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
    (caliber ? buildPartQuery(caliber.reference, part?.nameEn ?? null) : "Omega watch part");

  const result = await searchParts(query);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="surtitre">Pièces détachées</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 max-w-[24ch] text-couverture">
        Trouvez la bonne référence. Puis trouvez la pièce.
      </h1>
      <p className="mt-4 max-w-[64ch] text-encre/72">
        La recherche est restreinte aux vendeurs de fournitures : les montres complètes sont
        écartées.
      </p>

      <form action="/pieces" method="get" className="mt-8 flex max-w-2xl gap-3">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Omega 265 balance staff, ressort de barillet 30T2..."
          className="flex-1 border border-gris-trait bg-papier px-4 py-2.5 text-encre outline-none focus:border-laiton"
          aria-label="Recherche libre d'une fourniture"
        />
        <button type="submit" className="bouton-secondaire">
          Chercher
        </button>
      </form>

      <div className="mt-12 grid gap-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        {/* ── Sélection ────────────────────────────────── */}
        <aside className="space-y-8 lg:sticky lg:top-28">
          <div>
            <h2 className="surtitre">Calibre</h2>
            <div className="filet mt-2" />
            <ul className="mt-4 flex flex-wrap gap-2">
              {calibers.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/pieces?calibre=${c.slug}`}
                    className={`block border px-3 py-1.5 text-legende transition-colors ${
                      c.slug === selectedSlug
                        ? "border-laiton bg-papier text-laiton"
                        : "border-gris-trait text-encre/72 hover:border-laiton"
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
              <div className="filet mt-2" />
              <ul className="cadre mt-4 max-h-[24rem] divide-y divide-gris-clair overflow-auto">
                {caliber.parts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pieces?calibre=${caliber.slug}&piece=${encodeURIComponent(p.reference)}`}
                      className={`flex items-center gap-3 px-4 py-2.5 text-legende transition-colors hover:bg-papier ${
                        p.reference === sp.piece ? "bg-papier text-laiton" : "text-encre/72"
                      }`}
                    >
                      <span className="pastille-cerclee shrink-0">{p.positionNumber}</span>
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/calibres/${caliber.slug}#pieces`}
                className="lien-souligne mt-4 inline-block text-legende not-italic"
              >
                Fiche du calibre {caliber.reference}
              </Link>
            </div>
          )}
        </aside>

        {/* ── Résultats ────────────────────────────────── */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="surtitre">Offres</h2>
            <p className="legende">
              {part ? `${part.name} — ` : ""}
              {result.query}
            </p>
          </div>
          <div className="filet mt-2" />

          {/* Estimation de prix */}
          {result.estimation && (
            <div className="cadre-papier mt-6 flex flex-wrap items-end gap-x-10 gap-y-4 border-l-[3px] border-l-laiton p-6">
              <div>
                <p className="surtitre">Prix moyen</p>
                <p className="titre mt-1 text-couverture">
                  {formatPrice(result.estimation.moyenneCents, result.estimation.currency)}
                </p>
              </div>
              <div>
                <p className="surtitre">Fourchette</p>
                <p className="font-technique mt-2">
                  {formatPrice(result.estimation.minCents, result.estimation.currency)} —{" "}
                  {formatPrice(result.estimation.maxCents, result.estimation.currency)}
                </p>
              </div>
              <div>
                <p className="surtitre">Annonces</p>
                <p className="font-technique mt-2">{result.estimation.effectif}</p>
              </div>
              {result.meilleureOffre && (
                <a
                  href={result.meilleureOffre.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="bouton ml-auto"
                >
                  Voir la moins chère
                </a>
              )}
            </div>
          )}

          {result.mode === "live" && result.estimation && (
            <p className="legende mt-2">
              Moyenne des annonces en cours, hors extrêmes
              {result.ecartees > 0
                ? ` · ${result.ecartees} montre${result.ecartees > 1 ? "s" : ""} complète${result.ecartees > 1 ? "s" : ""} écartée${result.ecartees > 1 ? "s" : ""}`
                : ""}
              . Indicatif ◆, non contractuel.
            </p>
          )}

          {result.mode === "live" ? (
            result.listings.length === 0 ? (
              <p className="cadre mt-6 p-6 text-encre/72">
                Aucune fourniture ne correspond actuellement à cette recherche. Les liens marchands
                ci-dessous restent utilisables.
              </p>
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {result.listings.map((item) => (
                  <li key={item.id} className="cadre cadre-interactif">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex gap-4 p-4"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-24 w-24 shrink-0 border border-gris-trait object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-24 w-24 shrink-0 bg-gris-clair" />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-legende not-italic">{item.title}</p>
                        <p className="titre mt-2 text-etape">
                          {item.priceCents != null
                            ? formatPrice(item.priceCents, item.currency ?? "EUR")
                            : "Prix sur demande"}
                        </p>
                        <p className="legende mt-1">
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
            <div className="encart mt-6">
              <p className="encart-titre text-laiton">Recherche</p>
              <p className="mt-2">{result.reason}</p>
            </div>
          )}

          <h2 className="surtitre mt-12">Marchands de fournitures</h2>
          <div className="filet mt-2" />
          <ul className="cadre mt-4 divide-y divide-gris-clair">
            {result.links.map((link) => (
              <li key={link.merchant}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-papier"
                >
                  <span>{link.merchant}</span>
                  <span className="legende">{link.note}</span>
                  <span className="surtitre ml-auto">Ouvrir</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
