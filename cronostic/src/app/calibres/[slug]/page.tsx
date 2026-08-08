import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuidePanel } from "@/components/guide-panel";
import { getCurrentUser } from "@/lib/auth";
import { guideAccessFor } from "@/lib/entitlements";
import { toParagraphs } from "@/lib/format";
import { getCaliberBySlug, getGuideForCaliber, listCalibers } from "@/lib/repo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const calibers = await listCalibers();
  return calibers.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const caliber = await getCaliberBySlug(slug);
  if (!caliber) return { title: "Calibre introuvable" };

  return {
    title: `${caliber.brand} calibre ${caliber.reference}`,
    description:
      caliber.summary ??
      `Fiche technique du calibre ${caliber.brand} ${caliber.reference} : caractéristiques, nomenclature, lubrification et guide d'atelier CRONOSTIC.`,
    alternates: { canonical: `/calibres/${caliber.slug}` },
  };
}

export default async function CaliberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caliber = await getCaliberBySlug(slug);
  if (!caliber) notFound();

  const [user, guide] = await Promise.all([getCurrentUser(), getGuideForCaliber(caliber.id)]);
  const access = guide
    ? await guideAccessFor(user, guide)
    : { owned: false, viaSubscription: false, canDownload: false };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${caliber.brand} calibre ${caliber.reference}`,
    category: "Mouvement horloger",
    brand: { "@type": "Brand", name: caliber.brand },
    description: caliber.summary ?? undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-[0.72rem] tracking-[0.16em] text-acier uppercase">
        <Link href="/calibres" className="hover:text-laiton">
          Calibres
        </Link>
        <span className="mx-2">/</span>
        <span className="text-parchemin/70">{caliber.reference}</span>
      </nav>

      {/* ── Titre ─────────────────────────────────────────── */}
      <header className="mt-8 border-b border-parchemin/12 pb-10">
        <p className="text-[0.8rem] tracking-[0.34em] text-laiton uppercase">{caliber.brand}</p>
        <h1 className="titre mt-2 text-5xl text-ivoire sm:text-7xl">
          Calibre {caliber.reference}
        </h1>
        {caliber.summary && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-parchemin/75">
            {caliber.summary}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-2 text-[0.72rem] tracking-[0.16em] text-acier uppercase">
          {caliber.familyName && <span>Famille&nbsp;: {caliber.familyName}</span>}
          {caliber.introducedYear && <span>Introduit en {caliber.introducedYear}</span>}
          {caliber.discontinuedYear && <span>Jusqu&apos;en {caliber.discontinuedYear}</span>}
        </div>

        {caliber.dataStatus !== "verified" && (
          <p className="mt-7 max-w-2xl border-l-2 border-laiton/50 bg-graphite/40 px-4 py-3 text-sm text-parchemin/70">
            Fiche en cours de validation d&apos;atelier. Les caractéristiques marquées «&nbsp;à
            valider&nbsp;» n&apos;ont pas encore été recoupées avec la documentation d&apos;époque.
          </p>
        )}
      </header>

      <div className="mt-14 grid gap-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-16">
          {/* ── Présentation ─────────────────────────────── */}
          {caliber.presentation && (
            <section>
              <h2 className="surtitre">Présentation</h2>
              <div className="prose-atelier mt-5 max-w-2xl">
                {toParagraphs(caliber.presentation).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {/* ── Guide CRONOSTIC ──────────────────────────── */}
          <GuidePanel
            guide={guide}
            access={access}
            isSignedIn={Boolean(user)}
            caliberSlug={caliber.slug}
          />

          {/* ── Historique ───────────────────────────────── */}
          {caliber.history && (
            <section>
              <h2 className="surtitre">Historique</h2>
              <div className="prose-atelier mt-5 max-w-2xl">
                {toParagraphs(caliber.history).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {/* ── Architecture ─────────────────────────────── */}
          {caliber.architecture && (
            <section>
              <h2 className="surtitre">Architecture générale</h2>
              <div className="prose-atelier mt-5 max-w-2xl">
                {toParagraphs(caliber.architecture).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {/* ── Pièces détachées ─────────────────────────── */}
          {caliber.parts.length > 0 && (
            <section id="pieces" className="scroll-mt-24">
              <div className="flex items-end justify-between gap-6">
                <h2 className="surtitre">Pièces détachées</h2>
                <Link
                  href={`/pieces?calibre=${caliber.slug}`}
                  className="lien-souligne text-sm text-parchemin/70 hover:text-ivoire"
                >
                  Rechercher des offres
                </Link>
              </div>

              <div className="carte mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-parchemin/12 text-[0.68rem] tracking-[0.16em] text-acier uppercase">
                      <th className="px-5 py-3 font-medium">N°</th>
                      <th className="px-5 py-3 font-medium">Fourniture</th>
                      <th className="hidden px-5 py-3 font-medium sm:table-cell">Désignation</th>
                      <th className="px-5 py-3 font-medium">Offres</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-parchemin/8">
                    {caliber.parts.map((part) => (
                      <tr key={part.id} className="hover:bg-graphite/50">
                        <td className="px-5 py-3 font-mono text-xs text-laiton">
                          {part.positionNumber ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-ivoire">
                          {part.name}
                          {part.description && (
                            <span className="mt-0.5 block text-xs text-acier">
                              {part.description}
                            </span>
                          )}
                        </td>
                        <td className="hidden px-5 py-3 text-parchemin/60 sm:table-cell">
                          {part.nameEn}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/pieces?calibre=${caliber.slug}&piece=${encodeURIComponent(
                              part.reference,
                            )}`}
                            className="text-[0.75rem] tracking-wide text-laiton-clair underline underline-offset-4"
                          >
                            Chercher
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-acier">
                Numéros de nomenclature à recouper avec les planches Omega d&apos;époque.
              </p>
            </section>
          )}

          {/* ── Huiles ───────────────────────────────────── */}
          {caliber.lubrication.length > 0 && (
            <section id="huiles" className="scroll-mt-24">
              <div className="flex items-end justify-between gap-6">
                <h2 className="surtitre">Huiles et lubrification</h2>
                <Link
                  href="/huiles"
                  className="lien-souligne text-sm text-parchemin/70 hover:text-ivoire"
                >
                  Toutes les références
                </Link>
              </div>

              <ul className="carte mt-6 divide-y divide-parchemin/8">
                {caliber.lubrication.map((point) => (
                  <li key={point.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: point.lubricant?.colorHex ?? "#8b9097" }}
                      aria-hidden="true"
                    />
                    <span className="text-ivoire">{point.location}</span>
                    {point.lubricant && (
                      <span className="text-sm text-laiton-clair">
                        {point.lubricant.brand} {point.lubricant.reference}
                      </span>
                    )}
                    {point.quantity && (
                      <span className="ml-auto text-xs text-acier">{point.quantity}</span>
                    )}
                    {point.notes && (
                      <span className="w-full text-xs text-acier">{point.notes}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Outillage ────────────────────────────────── */}
          {caliber.tools.length > 0 && (
            <section>
              <h2 className="surtitre">Outillage recommandé</h2>
              <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {caliber.tools.map((tool) => (
                  <li key={tool.id} className="text-sm">
                    <span className="text-ivoire">{tool.name}</span>
                    {tool.description && (
                      <span className="mt-0.5 block text-xs leading-relaxed text-acier">
                        {tool.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Calibres apparentés ──────────────────────── */}
          {caliber.related.length > 0 && (
            <section>
              <h2 className="surtitre">Calibres apparentés</h2>
              <ul className="mt-6 flex flex-wrap gap-3">
                {caliber.related.map((rel) => (
                  <li key={rel.slug}>
                    <Link
                      href={`/calibres/${rel.slug}`}
                      className="carte carte-interactive flex items-baseline gap-3 px-5 py-3"
                    >
                      <span className="font-display text-xl text-ivoire">{rel.reference}</span>
                      <span className="text-xs text-acier">{rel.brand}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Caractéristiques techniques ────────────────── */}
        <aside className="lg:sticky lg:top-24">
          <h2 className="surtitre">Caractéristiques techniques</h2>
          <dl className="carte mt-5 divide-y divide-parchemin/8">
            {caliber.specs.map((spec) => (
              <div key={spec.key} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <dt className="text-xs tracking-wide text-acier">{spec.label}</dt>
                <dd className="text-right text-sm text-ivoire">
                  {spec.value}
                  {spec.unit ? <span className="ml-1 text-acier">{spec.unit}</span> : null}
                  {!spec.isVerified && (
                    <span className="mt-0.5 block text-[0.62rem] tracking-[0.14em] text-laiton/70 uppercase">
                      à valider
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
