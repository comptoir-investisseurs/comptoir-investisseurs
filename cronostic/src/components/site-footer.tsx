import Link from "next/link";

import { MARQUES } from "@/data/encyclopedie";
import { totalMouvements } from "@/lib/encyclopedie";
import { Wordmark } from "./logo";

/**
 * Pied de page.
 *
 * Volontairement court. Il portait la liste complète des calibres documentés :
 * pertinent à dix, absurde à sept cents. Un pied de page n'est pas un plan du
 * site — il donne l'essentiel et laisse l'encyclopédie faire son travail.
 */
const COLONNES = [
  {
    titre: "Le site",
    liens: [
      { href: "/marques", label: "Encyclopédie" },
      { href: "/guides", label: "Guides d'atelier" },
      { href: "/pieces", label: "Recherche de pièces" },
      { href: "/huiles", label: "Huiles et consommables" },
      { href: "/pro", label: "Abonnements" },
    ],
  },
  {
    titre: "Informations",
    liens: [
      { href: "/account/guides", label: "Mes guides" },
      { href: "/conditions", label: "Conditions de vente" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/account/donnees", label: "Mes données" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-gris-trait bg-gris-clair">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div>
            <Wordmark hauteur={32} />
          </div>
          <p className="mt-4 max-w-sm text-legende not-italic leading-relaxed text-encre/70">
            Documentation technique horlogère. Guides d&apos;atelier, nomenclatures et consommables
            pour mouvements vintage.
          </p>
          <p className="mt-4 text-legende not-italic text-encre/60">
            <Link href="/marques" className="lien-souligne hover:text-laiton">
              {MARQUES.length} marques, {totalMouvements()} calibres
            </Link>
          </p>
        </div>

        {COLONNES.map((colonne) => (
          <div key={colonne.titre}>
            <p className="surtitre">{colonne.titre}</p>
            <div className="filet mt-2" />
            <ul className="mt-4 space-y-1.5 text-legende not-italic">
              {colonne.liens.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="lien-souligne hover:text-laiton">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-gris-trait px-5 py-4 text-center text-legende not-italic text-encre/60">
        © {new Date().getFullYear()} Cronostic · Éditeur indépendant. Les marques citées
        appartiennent à leurs détenteurs respectifs et ne sont mentionnées qu&apos;à des fins
        d&apos;identification technique.
      </div>
    </footer>
  );
}
