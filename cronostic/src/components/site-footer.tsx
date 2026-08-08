import Link from "next/link";

import { CALIBERS } from "@/data/catalog";
import { Wordmark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-gris-trait bg-gris-clair">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div>
            <Wordmark hauteur={32} />
          </div>
          <p className="mt-4 max-w-xs text-legende not-italic leading-relaxed text-encre/70">
            Documentation technique horlogère. Guides d&apos;atelier, nomenclatures et
            consommables pour mouvements vintage.
          </p>
        </div>

        <div>
          <p className="surtitre">Calibres</p>
          <div className="filet mt-2" />
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-legende not-italic">
            {CALIBERS.map((c) => (
              <li key={c.slug}>
                <Link href={`/calibres/${c.slug}`} className="lien-souligne hover:text-laiton">
                  {c.reference}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="surtitre">Le site</p>
          <div className="filet mt-2" />
          <ul className="mt-4 space-y-1.5 text-legende not-italic">
            <li>
              <Link href="/guides" className="lien-souligne hover:text-laiton">
                Guides Cronostic
              </Link>
            </li>
            <li>
              <Link href="/pieces" className="lien-souligne hover:text-laiton">
                Recherche de pièces
              </Link>
            </li>
            <li>
              <Link href="/huiles" className="lien-souligne hover:text-laiton">
                Huiles et consommables
              </Link>
            </li>
            <li>
              <Link href="/pro" className="lien-souligne hover:text-laiton">
                Cronostic Pro
              </Link>
            </li>
            <li>
              <Link href="/account/guides" className="lien-souligne hover:text-laiton">
                Mes guides
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="surtitre">Informations</p>
          <div className="filet mt-2" />
          <ul className="mt-4 space-y-1.5 text-legende not-italic">
            <li>
              <Link href="/mentions-legales" className="lien-souligne hover:text-laiton">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/conditions" className="lien-souligne hover:text-laiton">
                Conditions de vente
              </Link>
            </li>
          </ul>
          <p className="mt-5 text-legende not-italic leading-relaxed text-encre/60">
            Éditeur indépendant. Les marques citées appartiennent à leurs détenteurs respectifs et
            ne sont mentionnées qu&apos;à des fins d&apos;identification technique.
          </p>
        </div>
      </div>

      <div className="border-t border-gris-trait py-4 text-center text-legende not-italic text-encre/60">
        © {new Date().getFullYear()} Cronostic
      </div>
    </footer>
  );
}
