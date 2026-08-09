import type { Metadata } from "next";
import Link from "next/link";

import { contactEmail } from "@/lib/env";

export const metadata: Metadata = {
  title: "Compte supprimé",
  robots: { index: false, follow: false },
};

export default function CompteSupprimePage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="surtitre">Mon compte</p>
      <div className="filet mx-auto mt-2 max-w-24" />
      <h1 className="titre mt-5 text-couverture">Compte supprimé</h1>
      <p className="mt-5 text-encre/72">
        Vos données ont été effacées : compte, historique d&apos;achats et droits d&apos;accès. Il
        ne reste rien à votre nom sur le site.
      </p>
      <p className="legende mt-4">
        Les pièces comptables demeurent chez notre prestataire de paiement, où la conservation
        légale de dix ans s&apos;applique. Pour toute question :{" "}
        <a href={`mailto:${contactEmail()}`} className="lien-souligne">
          {contactEmail()}
        </a>
        .
      </p>
      <Link href="/calibres" className="bouton mt-10 inline-block">
        Retour à l&apos;encyclopédie
      </Link>
    </div>
  );
}
