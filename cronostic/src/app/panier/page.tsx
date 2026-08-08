import type { Metadata } from "next";
import Link from "next/link";

import { payerLePanier, retirerDuPanierAction } from "@/app/actions";
import { GuideCover } from "@/components/guide-cover";
import { getCurrentUser, signInPath } from "@/lib/auth";
import { lirePanier } from "@/lib/cart";
import { proPriceCents } from "@/lib/env";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PanierPage() {
  const user = await getCurrentUser();
  const panier = await lirePanier(user);

  // Au-delà de deux guides, l'abonnement revient moins cher : autant le dire.
  const seuilAbonnement = panier.totalCents >= proPriceCents();

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <p className="surtitre">Commande</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">Panier</h1>

      {panier.dejaAcquis.length > 0 && (
        <div className="encart encart-methode mt-8">
          <p className="encart-titre">Conseil d&apos;atelier</p>
          <p className="mt-2">
            {panier.dejaAcquis.length === 1 ? "Un guide a été retiré" : `${panier.dejaAcquis.length} guides ont été retirés`}{" "}
            du panier : vous {panier.dejaAcquis.length === 1 ? "le possédez" : "les possédez"} déjà.{" "}
            <Link href="/account/guides" className="lien-souligne">
              Mes guides
            </Link>
          </p>
        </div>
      )}

      {panier.lignes.length === 0 ? (
        <div className="cadre mt-10 p-8">
          <p className="text-encre/72">Votre panier est vide.</p>
          <Link href="/guides" className="bouton-secondaire mt-6">
            Voir les guides
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-10 divide-y divide-gris-clair border-y border-gris-trait">
            {panier.lignes.map((guide) => (
              <li key={guide.id} className="flex flex-wrap items-center gap-5 py-5">
                <Link href={`/calibres/${guide.caliberSlug}#guide`} className="w-20 shrink-0">
                  <GuideCover
                    compact
                    caliberReference={guide.caliberReference}
                    coverImageUrl={guide.coverImageUrl}
                  />
                </Link>

                <div className="min-w-[12rem] flex-1">
                  <p className="titre text-etape">Omega {guide.caliberReference}</p>
                  <p className="mt-1 text-legende not-italic text-encre/60">
                    Guide complet d&apos;entretien
                    {guide.pageCount ? ` · ${guide.pageCount} pages` : ""} · PDF
                  </p>
                </div>

                <p className="font-technique">{formatPrice(guide.priceCents, guide.currency)}</p>

                <form action={retirerDuPanierAction}>
                  <input type="hidden" name="guideId" value={guide.id} />
                  <button
                    type="submit"
                    className="lien-souligne text-legende not-italic text-encre/60 hover:text-alerte"
                  >
                    Retirer
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="surtitre">Total</p>
              <p className="titre mt-1 text-couverture">
                {formatPrice(panier.totalCents, panier.currency)}
              </p>
              <p className="legende mt-1">
                {panier.lignes.length} guide{panier.lignes.length > 1 ? "s" : ""} · accès définitif
              </p>
            </div>

            {user ? (
              <form action={payerLePanier}>
                <button type="submit" className="bouton">
                  Payer
                </button>
              </form>
            ) : (
              <Link href={signInPath("/panier")} className="bouton">
                Se connecter pour payer
              </Link>
            )}
          </div>

          {seuilAbonnement && (
            <div className="encart mt-10">
              <p className="encart-titre text-laiton">Cronostic Pro</p>
              <p className="mt-2">
                À partir de {formatPrice(proPriceCents())} par mois, l&apos;abonnement donne accès à
                l&apos;ensemble des guides — soit moins que ce panier.{" "}
                <Link href="/pro" className="lien-souligne">
                  Comparer
                </Link>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
