import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions de vente",
  robots: { index: false, follow: true },
};

export default function ConditionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="surtitre">Informations</p>
      <h1 className="titre mt-4 text-4xl text-ivoire">Conditions de vente</h1>

      <p className="mt-8 border-l-2 border-laiton/60 bg-graphite/40 px-5 py-4 text-sm text-parchemin/75">
        Page à compléter et à faire relire avant mise en ligne — notamment la clause de
        renonciation au droit de rétractation sur les contenus numériques, obligatoire pour la
        vente de PDF.
      </p>

      <div className="prose-atelier mt-10 space-y-8">
        <section>
          <h2 className="surtitre">Produits</h2>
          <p>
            CRONOSTIC vend des guides d&apos;atelier au format PDF, à l&apos;unité ou par
            abonnement mensuel CRONOSTIC PRO.
          </p>
        </section>
        <section>
          <h2 className="surtitre">Accès aux guides achetés</h2>
          <p>
            Un guide acheté à l&apos;unité reste accessible au téléchargement depuis votre compte,
            y compris après résiliation de l&apos;abonnement. Les guides accessibles au seul titre
            de l&apos;abonnement cessent de l&apos;être à la fin de la période payée.
          </p>
        </section>
        <section>
          <h2 className="surtitre">Abonnement</h2>
          <p>
            L&apos;abonnement est mensuel, sans engagement, résiliable à tout moment depuis
            l&apos;espace de facturation. La résiliation prend effet à la fin de la période en
            cours.
          </p>
        </section>
        <section>
          <h2 className="surtitre">Usage</h2>
          <p>
            Les guides sont destinés à un usage personnel ou professionnel au sein d&apos;un même
            atelier. Toute rediffusion est interdite.
          </p>
        </section>
      </div>
    </div>
  );
}
