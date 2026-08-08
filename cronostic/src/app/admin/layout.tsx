import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { hasClerk, hasEbay, hasR2, hasStripe } from "@/lib/env";
import { usingDatabase } from "@/lib/repo";

const SECTIONS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/calibres", label: "Calibres" },
  { href: "/admin/guides", label: "Guides" },
  { href: "/admin/pieces", label: "Pièces" },
  { href: "/admin/huiles", label: "Huiles" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/achats", label: "Achats" },
  { href: "/admin/abonnements", label: "Abonnements" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const db = usingDatabase();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="surtitre">Back-office</p>
          <h1 className="titre mt-2 text-3xl text-ivoire">CRONOSTIC</h1>
        </div>
        <p className="text-xs text-acier">{admin.email}</p>
      </div>

      {!db && (
        <p className="mt-6 border-l-2 border-laiton bg-graphite/50 px-5 py-4 text-sm leading-relaxed text-parchemin/75">
          Mode démonstration&nbsp;: <code className="text-laiton-clair">DATABASE_URL</code>{" "}
          n&apos;est pas définie. Les modifications sont conservées en mémoire et disparaîtront au
          redémarrage du serveur.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.68rem] tracking-[0.14em] text-acier uppercase">
        {[
          ["Neon", db],
          ["Clerk", hasClerk],
          ["Stripe", hasStripe],
          ["R2", hasR2],
          ["eBay", hasEbay],
        ].map(([label, ok]) => (
          <span key={String(label)} className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-laiton" : "bg-acier/50"}`}
              aria-hidden="true"
            />
            {String(label)} {ok ? "" : "— non configuré"}
          </span>
        ))}
      </div>

      <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-y border-parchemin/12 py-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="text-sm text-parchemin/70 transition-colors hover:text-laiton-clair"
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="mt-10">{children}</div>
    </div>
  );
}
