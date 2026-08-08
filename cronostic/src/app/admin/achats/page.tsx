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
        <p className="text-sm text-parchemin/70">
          {purchases.length} achat(s) · {formatPrice(total)}
        </p>
      </div>

      <div className="carte mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-parchemin/12 text-[0.66rem] tracking-[0.16em] text-acier uppercase">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Guide</th>
              <th className="px-4 py-3 font-medium">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchemin/8">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-graphite/40">
                <td className="px-4 py-3 text-parchemin/60">{formatDate(p.purchasedAt)}</td>
                <td className="px-4 py-3 text-ivoire">{p.userEmail}</td>
                <td className="px-4 py-3 text-parchemin/70">{p.guideTitle}</td>
                <td className="px-4 py-3 text-parchemin/70">
                  {formatPrice(p.amountCents, p.currency)}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-acier">
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
