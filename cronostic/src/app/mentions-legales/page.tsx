import type { Metadata } from "next";
import Link from "next/link";

import { contactEmail } from "@/lib/env";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: true, follow: true },
};

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="surtitre">{titre}</h2>
      <div className="filet-fin mt-2" />
      <div className="prose-atelier mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="surtitre">Informations</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">Mentions légales</h1>

      <div className="encart encart-alerte mt-8">
        <p className="encart-titre">Attention</p>
        <p className="mt-2">
          Les champs entre crochets restent à compléter avant la mise en ligne : raison sociale,
          forme juridique, capital, immatriculation, siège, TVA et directeur de la publication. Les
          mêmes mentions figurent à l&apos;article 1 des{" "}
          <Link href="/conditions" className="lien-souligne">
            conditions de vente
          </Link>{" "}
          et de la{" "}
          <Link href="/confidentialite" className="lien-souligne">
            politique de confidentialité
          </Link>{" "}
          — les trois doivent concorder.
        </p>
      </div>

      <Bloc titre="Éditeur du site">
        <p>
          [Raison sociale], [forme juridique] au capital de [montant], immatriculée au registre du
          commerce et des sociétés de [ville] sous le numéro [SIREN], siège social [adresse].
          Numéro de TVA intracommunautaire : [numéro].
        </p>
        <p>
          Directeur de la publication : [nom]. Contact :{" "}
          <a href={`mailto:${contactEmail()}`} className="lien-souligne">
            {contactEmail()}
          </a>
          .
        </p>
      </Bloc>

      <Bloc titre="Hébergement">
        <p>
          Site hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis —{" "}
          <a href="https://vercel.com" className="lien-souligne" target="_blank" rel="noreferrer">
            vercel.com
          </a>
          .
        </p>
        <p>
          Base de données : Neon Inc. — hébergement en Union européenne. Stockage des fichiers :
          Cloudflare, Inc. Authentification : Clerk, Inc. Paiement : Stripe Payments Europe, Ltd.
        </p>
      </Bloc>

      <Bloc titre="Propriété intellectuelle">
        <p>
          Les guides Cronostic, leurs textes, schémas, photographies et mises en page sont protégés
          par le droit d&apos;auteur. L&apos;achat ou l&apos;abonnement confère un droit d&apos;usage
          personnel au sein d&apos;un même atelier ; il n&apos;emporte aucune cession de droits.
        </p>
        <p>
          La revente, la mise à disposition publique, le dépôt sur un service de partage et toute
          reproduction hors de ce cadre sont interdits. Chaque fichier remis porte le nom de son
          acquéreur.
        </p>
      </Bloc>

      <Bloc titre="Marques citées">
        <p>
          Omega est une marque déposée d&apos;OMEGA SA. Les autres marques, calibres et références
          cités appartiennent à leurs détenteurs respectifs. Cronostic est un éditeur indépendant,
          sans lien, affiliation ni agrément d&apos;aucune de ces sociétés ; les mentions
          n&apos;ont qu&apos;une fonction d&apos;identification technique, au sens de la référence
          nécessaire.
        </p>
      </Bloc>

      <Bloc titre="Nature du contenu">
        <p>
          Les guides décrivent des opérations d&apos;horlogerie destinées à des praticiens et
          supposent la maîtrise du métier et de l&apos;outillage correspondants. Les données non
          relevées sur une source constructeur sont signalées comme indicatives par le repère{" "}
          <span className="text-laiton">◆</span>.
        </p>
      </Bloc>

      <Bloc titre="Données personnelles">
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite" className="lien-souligne">
            politique de confidentialité
          </Link>
          . Les droits d&apos;accès, de portabilité et d&apos;effacement s&apos;exercent depuis{" "}
          <Link href="/account/donnees" className="lien-souligne">
            l&apos;espace « Mes données »
          </Link>
          .
        </p>
      </Bloc>

      <Bloc titre="Signalement">
        <p>
          Toute inexactitude technique, erreur de référence ou contenu litigieux peut être signalé à{" "}
          <a href={`mailto:${contactEmail()}`} className="lien-souligne">
            {contactEmail()}
          </a>
          . Les corrections d&apos;atelier sont les bienvenues et créditées lorsqu&apos;elles sont
          retenues.
        </p>
      </Bloc>
    </div>
  );
}
