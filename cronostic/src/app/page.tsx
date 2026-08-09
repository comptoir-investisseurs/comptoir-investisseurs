import Image from "next/image";
import Link from "next/link";

import { SiteSearch } from "@/components/site-search";
import { GuideCover } from "@/components/guide-cover";
import { GUIDE_HIGHLIGHTS } from "@/data/catalog";
import { TARIFS } from "@/lib/env";
import { formatPrice } from "@/lib/format";
import { heroPhoto } from "@/lib/photos";
import { listCalibers, listGuides } from "@/lib/repo";
import { indexReduit } from "@/lib/search-index";
import { totalMouvements } from "@/lib/encyclopedie";
import { MARQUES } from "@/data/encyclopedie";

export const revalidate = 3600;

/**
 * Les marques mises en avant sur l'accueil. Le choix n'est pas alphabétique :
 * ce sont celles qu'un horloger rencontre le plus souvent à l'établi, deux
 * ébauches pour une manufacture — c'est la proportion réelle du métier.
 */
const MARQUES_EN_VITRINE = [
  "valjoux",
  "eta",
  "omega",
  "rolex",
  "lemania",
  "landeron",
  "as",
  "seiko",
  "longines",
  "zenith",
  "unitas",
  "venus",
];

export default async function HomePage() {
  const [calibers, guides, index] = await Promise.all([
    listCalibers(),
    listGuides({ activeOnly: true }),
    indexReduit(),
  ]);
  const vitrine = guides.slice(0, 4);
  const totalCalibres = totalMouvements();
  const hero = heroPhoto();

  return (
    <>
      {/* ── Ouverture ────────────────────────────────────────
          Même composition sur téléphone et sur ordinateur : la photographie
          occupe le fond, le texte est posé dessus dans un cartouche papier
          plein. Elle était auparavant reléguée en bande sous le texte sur
          petit écran — deux blocs qui ne se parlaient pas.

          Le cartouche n'est pas une coquetterie : le bracelet noir traverse
          le tiers gauche de l'image et du texte directement incrusté y
          tomberait à 3,5:1, en deçà du seuil de lisibilité. Un aplat, que la
          charte autorise — contrairement aux dégradés — règle la question à
          toutes les tailles.

          Le cadrage suit la taille d'écran : sur téléphone on serre sur le
          mouvement, sur grand écran on laisse respirer. */}
      <section className="relative border-b border-gris-trait bg-gris-fond">
        {hero && (
          <figure className="absolute inset-0">
            <Image
              src={hero.src}
              alt={hero.legende}
              fill
              sizes="100vw"
              priority
              className="object-cover object-[78%_center] lg:object-[68%_center]"
            />
            <figcaption className="legende absolute right-0 bottom-0 bg-papier px-3 py-1 not-italic">
              {hero.legende}
            </figcaption>
          </figure>
        )}

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-12 lg:py-16">
          <div
            className={
              hero
                ? "max-w-2xl border-l-[3px] border-l-laiton bg-papier px-5 py-7 sm:px-7 sm:py-9 lg:px-9 lg:py-11"
                : undefined
            }
          >
            <p className="surtitre">Documentation technique horlogère</p>
            <div className="filet mt-3" />
            <h1 className="titre mt-5 max-w-[20ch] text-couverture sm:mt-6">
              La documentation technique de l&apos;horloger.
            </h1>
            <p className="mt-5 max-w-[56ch] text-encre/72">
              Guides d&apos;atelier et pièces détachées pour mouvements horlogers vintage.{" "}
              <strong className="font-normal text-encre">
                {totalCalibres} calibres répertoriés, {MARQUES.length} marques
              </strong>{" "}
              — d&apos;Omega à Valjoux, de Rolex à Seiko. La consultation est libre.
            </p>

            <div className="mt-7 sm:mt-8">
              <p className="mb-2 text-legende not-italic text-encre/60">
                Que recherchez-vous&nbsp;? Calibre, fourniture, huile, guide.
              </p>
              <SiteSearch index={index} />
            </div>
          </div>
        </div>
      </section>

      {/* ── L'encyclopédie ───────────────────────────────
          Le chiffre d'abord, les marques ensuite : un visiteur doit voir en
          une seconde qu'il ne tombe pas sur un catalogue de dix références. */}
      <section className="border-b border-gris-trait">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="surtitre">L&apos;encyclopédie</h2>
              <div className="filet mt-2" />
            </div>
            <Link href="/marques" className="lien-souligne text-legende not-italic">
              Toutes les marques
            </Link>
          </div>

          <p className="titre mt-6 max-w-3xl text-section">
            {totalCalibres} calibres, {MARQUES.length} marques. Consultation libre.
          </p>
          <p className="mt-4 max-w-[68ch] text-encre/72">
            Des ébauches qui ont équipé tout le monde — Valjoux, ETA, Lémania, Landeron — aux
            manufactures qui n&apos;ont jamais rien acheté à personne. Fiche technique, période,
            architecture, ébauche d&apos;origine quand la marque du cadran n&apos;est pas celle du
            mouvement.
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-px border border-gris-trait bg-gris-trait sm:grid-cols-3 lg:grid-cols-6">
            {MARQUES_EN_VITRINE.map((slug) => {
              const m = MARQUES.find((x) => x.slug === slug);
              if (!m) return null;
              return (
                <li key={m.slug}>
                  <Link
                    href={`/marques/${m.slug}`}
                    className="flex h-full flex-col justify-between bg-white p-5 transition-colors hover:bg-papier"
                  >
                    <span className="titre text-etape leading-tight">{m.nom}</span>
                    <span className="mt-4 block text-surtitre tracking-[0.14em] text-encre/55 uppercase">
                      {m.mouvements.length} calibres
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="legende mt-4">
            et {MARQUES.length - MARQUES_EN_VITRINE.length} autres marques —{" "}
            <Link href="/marques" className="lien-souligne">
              parcourir l&apos;encyclopédie
            </Link>
          </p>
        </div>
      </section>

      {/* ── Calibres documentés en détail ────────────────── */}
      <section className="border-b border-gris-trait">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="surtitre">Fiches détaillées</h2>
              <div className="filet mt-2" />
            </div>
            <Link href="/calibres" className="lien-souligne text-legende not-italic">
              Les voir toutes
            </Link>
          </div>

          <p className="mt-5 max-w-[68ch] text-encre/72">
            Nomenclature des fournitures, points de lubrification, outillage : les calibres
            relus à l&apos;établi, ceux qui portent un guide.
          </p>

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
                    brand={guide.caliberBrand}
                    coverImageUrl={guide.coverImageUrl}
                    pageCount={guide.pageCount}
                  />
                  <p className="mt-3">
                    {guide.caliberBrand} {guide.caliberReference}
                  </p>
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
              {formatPrice(TARIFS.atelier.mois())}
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
