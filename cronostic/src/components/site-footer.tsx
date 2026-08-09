import Link from "next/link";

/**
 * Bas de page.
 *
 * Le menu a disparu : la navigation est en tête de page, la répéter en bas
 * n'apportait rien qu'un mur de liens. Ne subsiste que ce qui doit rester
 * atteignable depuis n'importe quelle page — mentions légales, conditions de
 * vente et politique de confidentialité sont obligatoires pour un site
 * marchand, et l'attribution des marques citées protège l'éditeur.
 */
const LEGAL = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions", label: "Conditions de vente" },
  { href: "/confidentialite", label: "Confidentialité" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gris-trait bg-gris-clair">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 text-legende not-italic text-encre/60">
        <span>© {new Date().getFullYear()} Cronostic</span>

        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Informations légales">
          {LEGAL.map((l) => (
            <Link key={l.href} href={l.href} className="lien-souligne hover:text-laiton">
              {l.label}
            </Link>
          ))}
        </nav>

        <span className="basis-full leading-relaxed text-encre/50 sm:basis-auto sm:ml-auto sm:max-w-md sm:text-right">
          Éditeur indépendant. Les marques citées appartiennent à leurs détenteurs respectifs.
        </span>
      </div>
    </footer>
  );
}
