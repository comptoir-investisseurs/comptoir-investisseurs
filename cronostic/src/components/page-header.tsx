import Image from "next/image";

import { illustrationPour } from "@/lib/photos";

/**
 * En-tête de page éditoriale.
 *
 * Quand une photographie de mouvement est disponible, elle vient en fuite sur
 * la droite, rognée par le bord de la page : on n'en voit qu'une partie, comme
 * une planche posée à côté du texte. Elle porte une légende — la charte ne
 * tolère pas l'image purement décorative — et disparaît sous 1280 px, où elle
 * entrerait en concurrence avec le contenu.
 */
export function PageHeader({
  surtitre,
  titre,
  chapeau,
  cle,
  marque = false,
  children,
}: {
  surtitre: string;
  titre: string;
  chapeau?: string;
  cle: string;
  marque?: boolean;
  children?: React.ReactNode;
}) {
  const photo = illustrationPour(cle);

  return (
    <section className="relative border-b border-gris-trait">
      {photo && (
        <figure className="absolute inset-y-0 right-0 hidden w-[26%] border-l border-gris-trait xl:block">
          <Image
            src={photo.src}
            alt={photo.legende}
            fill
            sizes="26vw"
            className="object-cover"
            priority={false}
          />
          <figcaption className="legende absolute bottom-0 left-0 bg-papier px-3 py-1 not-italic">
            {photo.legende}
          </figcaption>
        </figure>
      )}

      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className={photo ? "xl:max-w-[70%]" : undefined}>
          <p className={marque ? "surtitre-marque" : "surtitre"}>{surtitre}</p>
          <div className="filet mt-2" />
          <h1 className="titre mt-5 max-w-[24ch] text-couverture">{titre}</h1>
          {chapeau && <p className="mt-5 max-w-[64ch] text-encre/72">{chapeau}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
