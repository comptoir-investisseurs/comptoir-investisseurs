import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { Marque, Wordmark } from "./logo";

const NAV = [
  { href: "/calibres", label: "Calibres" },
  { href: "/guides", label: "Guides" },
  { href: "/pieces", label: "Pièces" },
  { href: "/huiles", label: "Huiles" },
  { href: "/pro", label: "CRONOSTIC PRO" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-parchemin/12 bg-noir/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Link href="/" className="flex items-center gap-3 text-ivoire">
          <Marque className="text-laiton" />
          <Wordmark className="text-[0.95rem]" />
        </Link>

        <nav className="hidden flex-1 items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="lien-souligne text-[0.8125rem] tracking-wide text-parchemin/80 hover:text-ivoire"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="hidden text-[0.75rem] tracking-[0.14em] text-acier uppercase hover:text-laiton sm:block"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account/guides"
                className="rounded-full border border-laiton/45 px-4 py-1.5 text-[0.78rem] tracking-wide text-laiton-clair transition-colors hover:bg-laiton/10"
              >
                Mes guides
              </Link>
            </>
          ) : (
            <Link
              href="/connexion"
              className="rounded-full border border-parchemin/25 px-4 py-1.5 text-[0.78rem] tracking-wide text-parchemin transition-colors hover:border-laiton/50 hover:text-laiton-clair"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>

      <nav className="flex gap-5 overflow-x-auto border-t border-parchemin/8 px-5 py-2.5 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-[0.75rem] whitespace-nowrap text-parchemin/75"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
