import Link from "next/link";

import { CALIBERS } from "@/data/catalog";
import { Marque, Wordmark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-parchemin/12 bg-encre/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3 text-ivoire">
            <Marque size={20} className="text-laiton" />
            <Wordmark className="text-[1.5rem]" />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-parchemin/60">
            La documentation technique de l&apos;horloger. Guides d&apos;atelier, nomenclatures et
            consommables pour mouvements vintage.
          </p>
        </div>

        <div>
          <p className="surtitre">Calibres</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-parchemin/70">
            {CALIBERS.map((c) => (
              <li key={c.slug}>
                <Link href={`/calibres/${c.slug}`} className="lien-souligne hover:text-ivoire">
                  {c.reference}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="surtitre">Le site</p>
          <ul className="mt-4 space-y-2 text-sm text-parchemin/70">
            <li>
              <Link href="/guides" className="lien-souligne hover:text-ivoire">
                Guides Cronostic
              </Link>
            </li>
            <li>
              <Link href="/pieces" className="lien-souligne hover:text-ivoire">
                Recherche de pièces
              </Link>
            </li>
            <li>
              <Link href="/huiles" className="lien-souligne hover:text-ivoire">
                Huiles et consommables
              </Link>
            </li>
            <li>
              <Link href="/pro" className="lien-souligne hover:text-ivoire">
                Cronostic Pro
              </Link>
            </li>
            <li>
              <Link href="/compte/guides" className="lien-souligne hover:text-ivoire">
                Mes guides
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="surtitre">Informations</p>
          <ul className="mt-4 space-y-2 text-sm text-parchemin/70">
            <li>
              <Link href="/mentions-legales" className="lien-souligne hover:text-ivoire">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/conditions" className="lien-souligne hover:text-ivoire">
                Conditions de vente
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-acier">
            Cronostic est un éditeur indépendant. Les marques citées appartiennent à leurs
            détenteurs respectifs et ne sont mentionnées qu&apos;à des fins d&apos;identification
            technique.
          </p>
        </div>
      </div>

      <div className="border-t border-parchemin/8 py-5 text-center text-xs text-acier">
        © {new Date().getFullYear()} Cronostic
      </div>
    </footer>
  );
}
