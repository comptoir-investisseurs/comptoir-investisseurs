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
          className="bouton-secondaire"
        >
          Ajouter
        </Link>
      </div>

      <div className="cadre mt-6 overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-legende">
          <thead>
            <tr className="border-b border-gris-trait text-surtitre tracking-[0.16em] text-encre/55 uppercase">
              <th className="px-4 py-3 font-medium">Guide</th>
              <th className="px-4 py-3 font-medium">Calibre</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Pro</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Ventes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gris-clair">
            {guides.map((g) => (
              <tr key={g.id} className="align-middle hover:bg-papier">
                <td className="px-4 py-3">
                  <Link href={`/admin/guides/${g.id}`} className="text-encre hover:text-laiton">
                    {g.title}
                  </Link>
                  {!g.r2FileKey && (
                    <span className="mt-0.5 block text-surtitre text-alerte">PDF manquant</span>
                  )}
                </td>
                <td className="px-4 py-3 text-encre/72">{g.caliberReference}</td>
                <td className="px-4 py-3 text-encre/72">
                  {formatPrice(g.priceCents, g.currency)}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleProAction}>
                    <input type="hidden" name="guideId" value={g.id} />
                    <button
                      type="submit"
                      className={`text-[0.7rem] tracking-[0.14em] uppercase ${
                        g.includedInSubscription ? "text-laiton" : "text-encre/55"
                      }`}
                    >
                      {g.includedInSubscription ? "Inclus" : "Exclu"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[0.7rem] tracking-[0.14em] uppercase ${
                      g.isActive ? "text-laiton" : "text-encre/55"
                    }`}
                  >
                    {g.isActive ? "Publié" : "Brouillon"}
                  </span>
                </td>
                <td className="px-4 py-3 text-encre/72">{sales[g.id] ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3 text-surtitre">
                    <Link href={`/admin/guides/${g.id}`} className="text-encre/72 underline underline-offset-2">
                      Modifier
                    </Link>
                    <form action={togglePublishAction}>
                      <input type="hidden" name="guideId" value={g.id} />
                      <button type="submit" className="text-encre/72 underline underline-offset-2">
                        {g.isActive ? "Dépublier" : "Publier"}
                      </button>
                    </form>
                    <form action={deleteGuideAction}>
                      <input type="hidden" name="guideId" value={g.id} />
                      <button type="submit" className="text-alerte underline underline-offset-2">
                        Supprimer
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {guides.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-encre/55">
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
