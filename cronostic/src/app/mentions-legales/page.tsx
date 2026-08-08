import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="surtitre">Informations</p>
      <h1 className="titre mt-4 text-couverture text-encre">Mentions légales</h1>

      <p className="mt-8 border-l-2 border-laiton bg-papier px-5 py-4 text-legende text-encre/72">
        Page à compléter avant mise en ligne&nbsp;: raison sociale, forme juridique, capital,
        SIREN, siège, directeur de la publication, hébergeur et coordonnées de contact.
      </p>

      <div className="prose-atelier mt-10 space-y-8">
        <section>
          <h2 className="surtitre">Éditeur du site</h2>
          <p>À compléter.</p>
        </section>
        <section>
          <h2 className="surtitre">Hébergement</h2>
          <p>À compléter.</p>
        </section>
        <section>
          <h2 className="surtitre">Propriété intellectuelle</h2>
          <p>
            Les guides Cronostic, leurs textes, schémas et mises en page sont protégés. Leur
            diffusion, revente ou mise à disposition publique est interdite sans autorisation
            écrite.
          </p>
        </section>
        <section>
          <h2 className="surtitre">Marques citées</h2>
          <p>
            Les marques et références citées appartiennent à leurs détenteurs respectifs. Cronostic
            est un éditeur indépendant, sans lien avec ces sociétés&nbsp;; les mentions n&apos;ont
            qu&apos;une fonction d&apos;identification technique.
          </p>
        </section>
      </div>
    </div>
  );
}
