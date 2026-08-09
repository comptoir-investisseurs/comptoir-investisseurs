import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { LIBELLES_CATEGORIE, LIBELLES_TYPE, MARQUES, type Mvt } from "@/data/encyclopedie";
import { slugMouvement, trouverMarque } from "@/lib/encyclopedie";
import { listGuides } from "@/lib/repo";

export const revalidate = 3600;

export async function generateStaticParams() {
  return MARQUES.map((m) => ({ marque: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ marque: string }>;
}): Promise<Metadata> {
  const { marque } = await params;
  const m = trouverMarque(marque);
  if (!m) return { title: "Marque introuvable" };
  return {
    title: `${m.nom} — calibres`,
    description: `${m.mouvements.length} calibres ${m.nom} répertoriés : références, périodes, types et repères dimensionnels.`,
  };
}

/** Regroupe par type : on cherche rarement « un calibre », on cherche « un chronographe ». */
const ORDRE_TYPES: Mvt["type"][] = [
  "chrono",
  "chrono-auto",
  "auto",
  "manuel",
  "complication",
  "quartz",
];

export default async function MarquePage({ params }: { params: Promise<{ marque: string }> }) {
  const { marque: slug } = await params;
  const marque = trouverMarque(slug);
  if (!marque) notFound();

  const guides = await listGuides({ activeOnly: true });
  const guidePour = (ref: string) =>
    guides.find(
      (g) =>
        g.caliberReference.toLowerCase() === ref.toLowerCase() &&
        g.caliberSlug.startsWith(marque.slug),
    );

  const periodes = marque.mouvements
    .map((m) => m.debut)
    .filter((y): y is number => typeof y === "number");
  const plusAncien = periodes.length ? Math.min(...periodes) : null;

  return (
    <>
      <PageHeader
        surtitre={LIBELLES_CATEGORIE[marque.categorie]}
        titre={marque.nom}
        chapeau={marque.resume}
        cle={marque.slug}
      >
        <p className="legende mt-6">
          {marque.pays} · {marque.actif} · {marque.mouvements.length} calibres répertoriés
          {plusAncien ? ` · le plus ancien remonte à ${plusAncien}` : ""}
        </p>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-5 pb-16">
        <p className="legende mt-10">
          <Link href="/marques" className="lien-souligne">
            Toutes les marques
          </Link>
        </p>

        {ORDRE_TYPES.map((type) => {
          const lot = marque.mouvements.filter((m) => m.type === type);
          if (lot.length === 0) return null;

          return (
            <section key={type} className="mt-12">
              <h2 className="surtitre">{LIBELLES_TYPE[type]}</h2>
              <div className="filet mt-2" />

              <div className="mt-5 overflow-x-auto">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th scope="col">Calibre</th>
                      <th scope="col">Désignation</th>
                      <th scope="col">Période</th>
                      <th scope="col">Ø</th>
                      <th scope="col">Rubis</th>
                      <th scope="col">A/h</th>
                      <th scope="col">Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lot.map((m) => {
                      const guide = guidePour(m.ref);
                      return (
                        <tr key={`${type}-${m.ref}`}>
                          <td className="font-technique whitespace-nowrap">
                            <Link
                              href={`/calibres/${slugMouvement(marque, m)}`}
                              className="lien-souligne"
                            >
                              {m.ref}
                            </Link>
                            {guide && (
                              <span className="ml-2 text-surtitre tracking-[0.14em] text-laiton uppercase">
                                Guide
                              </span>
                            )}
                          </td>
                          <td>{m.nom ?? "—"}</td>
                          <td className="font-technique whitespace-nowrap">
                            {m.debut && m.fin
                              ? `${m.debut}–${m.fin}`
                              : m.debut
                                ? `dès ${m.debut}`
                                : "—"}
                          </td>
                          <td className="font-technique">
                            {m.d !== undefined
                              ? `${String(m.d).replace(".", ",")} mm`
                              : m.l !== undefined
                                ? `${String(m.l).replace(".", ",")}′′′`
                                : "—"}
                          </td>
                          <td className="font-technique">{m.r ?? "—"}</td>
                          <td className="font-technique whitespace-nowrap">
                            {m.a ? m.a.toLocaleString("fr-FR") : "—"}
                          </td>
                          <td className="text-legende not-italic">{m.base ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <p className="legende indicatif mt-10 max-w-[68ch]">
          Toutes les valeurs de ce tableau sont indicatives et restent à recouper avec la
          documentation constructeur
        </p>

        <div className="cadre mt-10 flex flex-wrap items-center justify-between gap-6 p-6">
          <p className="max-w-[52ch] text-encre/72">
            Une correction, une référence manquante, une planche de fournitures&nbsp;? Les retours
            d&apos;atelier alimentent directement cette encyclopédie.
          </p>
          <Link href="/pieces" className="bouton-secondaire">
            Chercher une fourniture
          </Link>
        </div>
      </div>
    </>
  );
}
