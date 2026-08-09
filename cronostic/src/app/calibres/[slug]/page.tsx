import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuidePanel } from "@/components/guide-panel";
import { getCurrentUser } from "@/lib/auth";
import { panierContient } from "@/lib/cart";
import { guideAccessFor } from "@/lib/entitlements";
import { toParagraphs } from "@/lib/format";
import { trouverMouvement } from "@/lib/encyclopedie";
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
      `Fiche technique du calibre ${caliber.brand} ${caliber.reference} : caractéristiques, nomenclature, lubrification et guide d'atelier Cronostic.`,
    alternates: { canonical: `/calibres/${caliber.slug}` },
  };
}

function Section({
  titre,
  children,
  id,
  action,
}: {
  titre: string;
  children: React.ReactNode;
  id?: string;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-28" : undefined}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="surtitre">{titre}</h2>
          <div className="filet mt-2" />
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function CaliberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caliber = await getCaliberBySlug(slug);
  if (!caliber) notFound();

  const [user, guide] = await Promise.all([getCurrentUser(), getGuideForCaliber(caliber.id)]);
  const access = guide
    ? await guideAccessFor(user, guide)
    : {
        owned: false,
        viaSubscription: false,
        canDownload: false,
        deblocablePar: null,
        creditsRestants: null,
      };
  const dansLePanier = guide ? await panierContient(guide.id) : false;

  const indicatives = caliber.specs.filter((s) => !s.isVerified).length;
  // Fiche d'amorce : pas de présentation rédigée, pas de nomenclature relevée.
  const encyclopedie = trouverMouvement(slug);
  const amorce = caliber.parts.length === 0 && !caliber.history && !caliber.architecture;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${caliber.brand} calibre ${caliber.reference}`,
    category: "Mouvement horloger",
    brand: { "@type": "Brand", name: caliber.brand },
    description: caliber.summary ?? undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-legende not-italic text-encre/60">
        <Link href="/marques" className="lien-souligne">
          Marques
        </Link>
        <span className="mx-2">/</span>
        {encyclopedie ? (
          <Link href={`/marques/${encyclopedie.marque.slug}`} className="lien-souligne">
            {encyclopedie.marque.nom}
          </Link>
        ) : (
          <Link href="/calibres" className="lien-souligne">
            {caliber.brand}
          </Link>
        )}
        <span className="mx-2">/</span>
        <span>{caliber.reference}</span>
      </nav>

      {/* ── Titre ─────────────────────────────────────────── */}
      <header className="mt-6 border-b border-gris-trait pb-8">
        <p className="surtitre">{caliber.brand}</p>
        <div className="filet mt-2" />
        <h1 className="titre mt-5 text-couverture">
          Calibre {caliber.reference}
        </h1>
        {caliber.summary && (
          <p className="mt-5 max-w-[68ch] text-encre/72">{caliber.summary}</p>
        )}
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-2 text-legende not-italic">
          {caliber.familyName && (
            <div className="flex gap-2">
              <dt className="text-encre/55">Famille</dt>
              <dd>{caliber.familyName}</dd>
            </div>
          )}
          {caliber.introducedYear && (
            <div className="flex gap-2">
              <dt className="text-encre/55">Introduit</dt>
              <dd className="font-technique">{caliber.introducedYear}</dd>
            </div>
          )}
          {caliber.discontinuedYear && (
            <div className="flex gap-2">
              <dt className="text-encre/55">Fin de production</dt>
              <dd className="font-technique">{caliber.discontinuedYear}</dd>
            </div>
          )}
        </dl>
      </header>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-14">
          {/* Périmètre et statut des données, énoncés en préambule. */}
          {indicatives > 0 && (
            <div className="encart encart-alerte">
              <p className="encart-titre">Attention</p>
              <p className="mt-2 max-w-[68ch]">
                {indicatives} caractéristique{indicatives > 1 ? "s" : ""} de cette fiche
                {indicatives > 1 ? " sont indicatives" : " est indicative"} : elle
                {indicatives > 1 ? "s n'ont" : " n'a"} pas été relevée
                {indicatives > 1 ? "s" : ""} sur une source constructeur. Ces valeurs portent le
                repère ◆ et restent à recouper avec la documentation d&apos;époque.
              </p>
            </div>
          )}

          {amorce && (
            <div className="encart">
              <p className="encart-titre text-laiton">Fiche d&apos;amorce</p>
              <p className="mt-2 max-w-[68ch]">
                Cette fiche recense la référence, la période et les repères dimensionnels du
                calibre. La nomenclature des fournitures, les points de lubrification et la
                procédure d&apos;atelier ne sont pas encore relevés — les inventer serait pire que
                de ne rien afficher.
                {encyclopedie && (
                  <>
                    {" "}
                    <Link href={`/marques/${encyclopedie.marque.slug}`} className="lien-souligne">
                      Voir les {encyclopedie.marque.mouvements.length} calibres{" "}
                      {encyclopedie.marque.nom}
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          )}

          {caliber.presentation && (
            <Section titre="Présentation">
              <div className="prose-atelier">
                {toParagraphs(caliber.presentation).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Section>
          )}

          <GuidePanel
            guide={guide}
            access={access}
            isSignedIn={Boolean(user)}
            caliberSlug={caliber.slug}
            dansLePanier={dansLePanier}
          />

          {caliber.history && (
            <Section titre="Historique">
              <div className="prose-atelier">
                {toParagraphs(caliber.history).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Section>
          )}

          {caliber.architecture && (
            <Section titre="Architecture générale">
              <div className="prose-atelier">
                {toParagraphs(caliber.architecture).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Section>
          )}

          {caliber.parts.length === 0 && (
            <Section
              titre="Pièces détachées"
              id="pieces"
              action={
                <Link
                  href={`/pieces?q=${encodeURIComponent(`${caliber.brand} ${caliber.reference} part`)}`}
                  className="lien-souligne text-legende not-italic"
                >
                  Chercher des offres
                </Link>
              }
            >
              <p className="max-w-[68ch] text-encre/72">
                La nomenclature des fournitures de ce calibre n&apos;est pas encore relevée. La
                recherche de pièces reste ouverte : elle interroge les vendeurs de fournitures sur
                la référence {caliber.brand} {caliber.reference} et en donne le prix moyen.
              </p>
            </Section>
          )}

          {caliber.parts.length > 0 && (
            <Section
              titre="Pièces détachées"
              id="pieces"
              action={
                <Link
                  href={`/pieces?calibre=${caliber.slug}`}
                  className="lien-souligne text-legende not-italic"
                >
                  Rechercher des offres
                </Link>
              }
            >
              <div className="overflow-x-auto">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th scope="col">N°</th>
                      <th scope="col">Fourniture</th>
                      <th scope="col" className="hidden sm:table-cell">
                        Désignation
                      </th>
                      <th scope="col">Offres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caliber.parts.map((part) => (
                      <tr key={part.id}>
                        <td>
                          <span className="pastille-cerclee">{part.positionNumber ?? "—"}</span>
                        </td>
                        <td>
                          {part.name}
                          {part.description && (
                            <span className="legende mt-1 block">{part.description}</span>
                          )}
                        </td>
                        <td className="hidden text-encre/60 sm:table-cell">{part.nameEn}</td>
                        <td>
                          <Link
                            href={`/pieces?calibre=${caliber.slug}&piece=${encodeURIComponent(
                              part.reference,
                            )}`}
                            className="lien-souligne text-legende not-italic"
                          >
                            Chercher
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="legende mt-2">
                Numéros de nomenclature indicatifs ◆, à recouper avec les planches{" "}
                {caliber.brand} d&apos;époque
              </p>
            </Section>
          )}

          {caliber.lubrication.length > 0 && (
            <Section
              titre="Huiles et lubrification"
              id="huiles"
              action={
                <Link href="/huiles" className="lien-souligne text-legende not-italic">
                  Toutes les références
                </Link>
              }
            >
              <div className="overflow-x-auto">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th scope="col">Point</th>
                      <th scope="col">Produit</th>
                      <th scope="col">Quantité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caliber.lubrication.map((point) => (
                      <tr key={point.id}>
                        <td>
                          <span className="flex items-start gap-2.5">
                            {/* Bleu technique : code réservé aux rubis, pierres et
                                lubrifiants. */}
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 bg-technique"
                              aria-hidden="true"
                            />
                            <span>
                              {point.location}
                              {point.notes && <span className="legende mt-1 block">{point.notes}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="font-technique text-legende not-italic">
                          {point.lubricant
                            ? `${point.lubricant.brand} ${point.lubricant.reference}`
                            : "—"}
                        </td>
                        <td className="text-encre/60">{point.quantity ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {caliber.tools.length > 0 && (
            <Section titre="Outillage">
              <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                {caliber.tools.map((tool) => (
                  <li key={tool.id}>
                    <span>{tool.name}</span>
                    {tool.description && <span className="legende block">{tool.description}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {caliber.related.length > 0 && (
            <Section titre="Calibres apparentés">
              <ul className="flex flex-wrap gap-3">
                {caliber.related.map((rel) => (
                  <li key={rel.slug}>
                    <Link
                      href={`/calibres/${rel.slug}`}
                      className="cadre cadre-interactif flex items-baseline gap-3 px-4 py-2.5"
                    >
                      <span className="titre text-etape">{rel.reference}</span>
                      <span className="text-legende not-italic text-encre/55">{rel.brand}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* ── Caractéristiques techniques ────────────────── */}
        <aside className="lg:sticky lg:top-28">
          <h2 className="surtitre">Caractéristiques</h2>
          <div className="filet mt-2" />
          <div className="mt-5 overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th scope="col">Paramètre</th>
                  <th scope="col">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {caliber.specs.map((spec) => (
                  <tr key={spec.key}>
                    <td className="text-encre/70">{spec.label}</td>
                    <td className={`font-technique ${spec.isVerified ? "" : "indicatif"}`}>
                      {spec.value}
                      {spec.unit ? <span className="text-encre/60"> {spec.unit}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="legende mt-2">◆ valeur indicative, non relevée sur source constructeur</p>
        </aside>
      </div>
    </div>
  );
}
