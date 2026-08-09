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
      {/* Pas de marge à gauche : la zone de protection du logotype — la charte
          impose la hauteur du « C » de chaque côté — tient lieu de marge de
          page. Elle existe donc bien, sans consommer deux fois la place, ce
          qui compte sur 390 px de large. */}
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center pr-4 sm:pr-5">
        <Link href="/" aria-label="Cronostic — accueil" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden flex-1 items-center gap-7 md:flex">
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

        {/* Le groupe de droite doit rentrer dans 390 px de large sans repousser
            la page : libellés resserrés, boutons compacts sous 640 px. */}
        <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-5">
          <Link
            href="/panier"
            className="flex shrink-0 items-center gap-2 text-legende not-italic text-encre transition-colors hover:text-laiton sm:text-[0.9375rem]"
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
              <Link
                href="/account/guides"
                className="bouton-secondaire shrink-0 !px-3 sm:!px-6"
              >
                <span className="sm:hidden">Compte</span>
                <span className="hidden sm:inline">Mes guides</span>
              </Link>
            </>
          ) : (
            <Link href="/connexion" className="bouton-secondaire shrink-0 !px-3 sm:!px-6">
              Connexion
            </Link>
          )}
        </div>
      </div>

      {/* Navigation de téléphone : une bande défilante plutôt qu'un menu à
          déplier. Les six entrées sont visibles d'un coup d'œil, sans clic
          préalable et sans JavaScript. */}
      <nav className="flex gap-6 overflow-x-auto border-t border-gris-trait px-4 py-2.5 sm:px-5 md:hidden">
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
