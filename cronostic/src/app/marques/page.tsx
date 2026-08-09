import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SiteSearch } from "@/components/site-search";
import {
  LIBELLES_CATEGORIE,
  MARQUES,
  ORDRE_CATEGORIES,
  type CategorieMarque,
} from "@/data/encyclopedie";
import { totalMouvements } from "@/lib/encyclopedie";
import { indexReduit } from "@/lib/search-index";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Marques de mouvements",
  description:
    "L'encyclopédie Cronostic par marque de mouvement : ébauches, manufactures et maisons horlogères, de Valjoux à Seiko en passant par Omega et Rolex.",
};

const CHAPEAU: Record<CategorieMarque, string> = {
  ebauche:
    "Celles qui alimentent tout le reste. Un Valjoux 7733 se retrouve sous des dizaines de noms différents : c'est ici qu'il faut chercher quand la marque du cadran ne dit rien du mouvement.",
  manufacture:
    "Les maisons qui conçoivent et produisent leurs propres calibres, en tout ou en partie.",
  maison:
    "Les marques qui logent des mouvements d'autrui. Le champ « ébauche d'origine » de chaque fiche renvoie vers le calibre réellement à ouvrir.",
};

export default async function MarquesPage() {
  const index = await indexReduit();
  const total = totalMouvements();

  return (
    <>
      <PageHeader
        surtitre="Encyclopédie"
        titre="Marques de mouvements"
        chapeau={`${MARQUES.length} marques et ${total} calibres répertoriés. La consultation est libre et le restera : c'est la partie du site qui ne se vend pas.`}
        cle="calibres"
      >
        <div className="mt-8 max-w-xl">
          <SiteSearch index={index} size="compact" />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-5 pb-16">
        <div className="encart encart-alerte mt-12">
          <p className="encart-titre">Fiches d&apos;amorce</p>
          <p className="mt-2">
            Sauf les calibres qui portent un guide, ces fiches sont un point de départ : référence,
            période, type et repères dimensionnels, sans relevé sur planche constructeur. Toute
            valeur porte donc le repère <span className="text-laiton">◆</span> et rien n&apos;est
            présenté comme certifié. Les corrections d&apos;atelier sont les bienvenues.
          </p>
        </div>

        {ORDRE_CATEGORIES.map((categorie) => {
          const marques = MARQUES.filter((m) => m.categorie === categorie);
          if (marques.length === 0) return null;

          return (
            <section key={categorie} className="mt-16">
              <h2 className="surtitre">{LIBELLES_CATEGORIE[categorie]}</h2>
              <div className="filet mt-2" />
              <p className="legende mt-3 max-w-[68ch]">{CHAPEAU[categorie]}</p>

              <ul className="mt-7 grid gap-px border border-gris-trait bg-gris-trait sm:grid-cols-2 lg:grid-cols-3">
                {marques.map((m) => (
                  <li key={m.slug}>
                    <Link
                      href={`/marques/${m.slug}`}
                      className="cadre-interactif flex h-full flex-col bg-white p-6 hover:bg-papier"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-titre text-section text-encre">{m.nom}</span>
                        <span className="shrink-0 font-technique text-legende not-italic text-laiton">
                          {m.mouvements.length}
                        </span>
                      </div>
                      <p className="legende mt-1">
                        {m.pays} · {m.actif}
                      </p>
                      <p className="mt-3 line-clamp-3 text-legende not-italic leading-relaxed text-encre/72">
                        {m.resume}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
