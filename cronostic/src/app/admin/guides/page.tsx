import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { guideSalesCounts, listGuides } from "@/lib/repo";
import { pdfDisponibles } from "@/lib/guide-files";
import {
  deleteGuideAction,
  importerPdfDuDepotAction,
  toggleProAction,
  togglePublishAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminGuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ importes?: string; orphelins?: string }>;
}) {
  const sp = await searchParams;
  const [guides, sales] = await Promise.all([listGuides(), guideSalesCounts()]);
  const fichiers = pdfDisponibles();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="surtitre">Guides</h2>
        <div className="flex flex-wrap items-center gap-4">
          {fichiers.length > 0 && (
            <form action={importerPdfDuDepotAction}>
              <button type="submit" className="bouton-secondaire">
                Importer les PDF du dépôt
              </button>
            </form>
          )}
          <Link href="/admin/guides/nouveau" className="bouton-secondaire">
            Ajouter
          </Link>
        </div>
      </div>

      {sp.importes !== undefined && (
        <p className="mt-6 border-l-2 border-laiton bg-papier px-5 py-4 text-legende leading-relaxed text-encre/72">
          {Number(sp.importes) === 0
            ? "Aucune fiche à créer : tous les PDF du dépôt sont déjà rattachés à un guide."
            : `${sp.importes} fiche${Number(sp.importes) > 1 ? "s" : ""} créée${Number(sp.importes) > 1 ? "s" : ""} en brouillon. Vérifiez le titre et le prix, puis publiez.`}
          {Number(sp.orphelins) > 0 &&
            ` ${sp.orphelins} fichier(s) n'ont été rattachés à aucun calibre : leur nom ne contient pas de référence reconnue, ou en contient plusieurs.`}
        </p>
      )}

      <p className="mt-4 text-legende leading-relaxed text-encre/55">
        {fichiers.length} PDF dans <code className="font-technique">guides-pdf/</code>. Déposer un
        fichier dont le nom contient la référence du calibre —{" "}
        <code className="font-technique">Cronostic_Valjoux_7733_manuel_de_service.pdf</code> — suffit
        à créer la fiche&nbsp;; la publication reste manuelle.
      </p>

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
