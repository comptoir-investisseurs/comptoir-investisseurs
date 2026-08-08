import Link from "next/link";

import { formatPrice } from "@/lib/format";
import {
  guideSalesCounts,
  listAllPurchases,
  listCalibers,
  listGuides,
  listSubscriptions,
  listUsers,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [calibers, guides, users, purchases, subscriptions, sales] = await Promise.all([
    listCalibers(),
    listGuides(),
    listUsers(),
    listAllPurchases(),
    listSubscriptions(),
    guideSalesCounts(),
  ]);

  const revenus = purchases.reduce((sum, p) => sum + p.amountCents, 0);
  const actifs = subscriptions.filter((s) => s.status === "active" || s.status === "trialing");
  const publies = guides.filter((g) => g.isActive).length;
  const sansPdf = guides.filter((g) => !g.r2FileKey).length;

  const stats = [
    { label: "Calibres", value: String(calibers.length), href: "/admin/calibres" },
    { label: "Guides publiés", value: `${publies} / ${guides.length}`, href: "/admin/guides" },
    { label: "Utilisateurs", value: String(users.length), href: "/admin/utilisateurs" },
    { label: "Achats", value: String(purchases.length), href: "/admin/achats" },
    { label: "Abonnés actifs", value: String(actifs.length), href: "/admin/abonnements" },
    { label: "Chiffre d'affaires unitaire", value: formatPrice(revenus), href: "/admin/achats" },
  ];

  return (
    <>
      <ul className="grid gap-px border border-parchemin/12 bg-parchemin/12 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="block bg-noir p-6 transition-colors hover:bg-graphite">
              <p className="text-[0.68rem] tracking-[0.16em] text-acier uppercase">{s.label}</p>
              <p className="font-display mt-3 text-3xl text-ivoire">{s.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      {sansPdf > 0 && (
        <p className="mt-8 border-l-2 border-laiton bg-graphite/40 px-5 py-4 text-sm text-parchemin/75">
          {sansPdf} guide{sansPdf > 1 ? "s" : ""} sans PDF associé. Un guide ne peut pas être
          publié tant que son fichier n&apos;a pas été téléversé.{" "}
          <Link href="/admin/guides" className="text-laiton-clair underline underline-offset-4">
            Gérer les guides
          </Link>
        </p>
      )}

      <section className="mt-12">
        <h2 className="surtitre">Ventes par guide</h2>
        <ul className="carte mt-4 divide-y divide-parchemin/8">
          {guides.map((g) => (
            <li key={g.id} className="flex items-baseline gap-4 px-5 py-3">
              <Link href={`/admin/guides/${g.id}`} className="text-ivoire hover:text-laiton-clair">
                Omega {g.caliberReference}
              </Link>
              <span className="text-xs text-acier">
                {g.isActive ? "publié" : "brouillon"}
                {g.includedInSubscription ? " · Pro" : ""}
              </span>
              <span className="ml-auto text-sm text-parchemin/70">{sales[g.id] ?? 0} vente(s)</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
