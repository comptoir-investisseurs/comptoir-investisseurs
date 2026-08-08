import { formatDate, formatPrice } from "@/lib/format";
import { listAllPurchases } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminAchatsPage() {
  const purchases = await listAllPurchases();
  const total = purchases.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="surtitre">Achats</h2>
        <p className="text-legende text-encre/72">
          {purchases.length} achat(s) · {formatPrice(total)}
        </p>
      </div>

      <div className="cadre mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-legende">
          <thead>
            <tr className="border-b border-gris-trait text-surtitre tracking-[0.16em] text-encre/55 uppercase">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Guide</th>
              <th className="px-4 py-3 font-medium">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gris-clair">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-papier">
                <td className="px-4 py-3 text-encre/72">{formatDate(p.purchasedAt)}</td>
                <td className="px-4 py-3 text-encre">{p.userEmail}</td>
                <td className="px-4 py-3 text-encre/72">{p.guideTitle}</td>
                <td className="px-4 py-3 text-encre/72">
                  {formatPrice(p.amountCents, p.currency)}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-encre/55">
                  Aucun achat enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
