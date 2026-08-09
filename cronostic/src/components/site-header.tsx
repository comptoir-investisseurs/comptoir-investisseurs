import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { nombreArticles } from "@/lib/cart";
import { Wordmark } from "./logo";

const NAV = [
  { href: "/marques", label: "Marques" },
  { href: "/calibres", label: "Calibres" },
  { href: "/guides", label: "Guides" },
  { href: "/pieces", label: "Pièces" },
  { href: "/huiles", label: "Huiles" },
  { href: "/pro", label: "Cronostic Pro" },
];

/**
 * En-tête. La charte impose le logotype à gauche sur toutes les pages,
 * le rappel du sujet à droite, et un filet de séparation.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const articles = await nombreArticles(user);

  return (
    <header className="sticky top-0 z-50 border-b border-gris-trait bg-gris-clair">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center px-5">
        <Link href="/" aria-label="Cronostic — accueil">
          <Wordmark hauteur={32} />
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.9375rem] text-encre transition-colors hover:text-laiton"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-5">
          <Link
            href="/panier"
            className="flex items-center gap-2 text-[0.9375rem] text-encre transition-colors hover:text-laiton"
          >
            Panier
            {articles > 0 && <span className="pastille">{articles}</span>}
          </Link>
          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="surtitre hidden hover:opacity-70 sm:inline"
                >
                  Admin
                </Link>
              )}
              <Link href="/account/guides" className="bouton-secondaire">
                Mes guides
              </Link>
            </>
          ) : (
            <Link href="/connexion" className="bouton-secondaire">
              Connexion
            </Link>
          )}
        </div>
      </div>

      <nav className="flex gap-6 overflow-x-auto border-t border-gris-trait px-5 py-2.5 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-[0.875rem] whitespace-nowrap text-encre"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
