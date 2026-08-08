import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { guideSalesCounts, listGuides } from "@/lib/repo";
import { deleteGuideAction, toggleProAction, togglePublishAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminGuidesPage() {
  const [guides, sales] = await Promise.all([listGuides(), guideSalesCounts()]);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="surtitre">Guides</h2>
        <Link
          href="/admin/guides/nouveau"
          className="border border-laiton/50 px-5 py-2 text-[0.75rem] tracking-[0.16em] text-laiton-clair uppercase transition-colors hover:bg-laiton/10"
        >
          Ajouter
        </Link>
      </div>

      <div className="carte mt-6 overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b border-parchemin/12 text-[0.66rem] tracking-[0.16em] text-acier uppercase">
              <th className="px-4 py-3 font-medium">Guide</th>
              <th className="px-4 py-3 font-medium">Calibre</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">PRO</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Ventes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchemin/8">
            {guides.map((g) => (
              <tr key={g.id} className="align-middle hover:bg-graphite/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/guides/${g.id}`} className="text-ivoire hover:text-laiton-clair">
                    {g.title}
                  </Link>
                  {!g.r2FileKey && (
                    <span className="mt-0.5 block text-[0.68rem] text-rubis">PDF manquant</span>
                  )}
                </td>
                <td className="px-4 py-3 text-parchemin/70">{g.caliberReference}</td>
                <td className="px-4 py-3 text-parchemin/70">
                  {formatPrice(g.priceCents, g.currency)}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleProAction}>
                    <input type="hidden" name="guideId" value={g.id} />
                    <button
                      type="submit"
                      className={`text-[0.7rem] tracking-[0.14em] uppercase ${
                        g.includedInSubscription ? "text-laiton-clair" : "text-acier"
                      }`}
                    >
                      {g.includedInSubscription ? "Inclus" : "Exclu"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[0.7rem] tracking-[0.14em] uppercase ${
                      g.isActive ? "text-laiton-clair" : "text-acier"
                    }`}
                  >
                    {g.isActive ? "Publié" : "Brouillon"}
                  </span>
                </td>
                <td className="px-4 py-3 text-parchemin/70">{sales[g.id] ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3 text-[0.72rem]">
                    <Link href={`/admin/guides/${g.id}`} className="text-parchemin/70 underline underline-offset-2">
                      Modifier
                    </Link>
                    <form action={togglePublishAction}>
                      <input type="hidden" name="guideId" value={g.id} />
                      <button type="submit" className="text-parchemin/70 underline underline-offset-2">
                        {g.isActive ? "Dépublier" : "Publier"}
                      </button>
                    </form>
                    <form action={deleteGuideAction}>
                      <input type="hidden" name="guideId" value={g.id} />
                      <button type="submit" className="text-rubis underline underline-offset-2">
                        Supprimer
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {guides.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-acier">
                  Aucun guide. Commencez par en ajouter un.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
