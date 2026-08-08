import { formatDate, formatPrice } from "@/lib/format";
import { listSubscriptions } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminAbonnementsPage() {
  const subscriptions = await listSubscriptions();

  return (
    <>
      <h2 className="surtitre">Abonnements</h2>

      <div className="carte mt-6 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr className="border-b border-parchemin/12 text-[0.66rem] tracking-[0.16em] text-acier uppercase">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Période</th>
              <th className="px-4 py-3 font-medium">Résiliation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchemin/8">
            {subscriptions.map((s) => (
              <tr key={s.id} className="hover:bg-graphite/40">
                <td className="px-4 py-3 text-ivoire">{s.userEmail}</td>
                <td className="px-4 py-3 text-parchemin/70">{s.status}</td>
                <td className="px-4 py-3 text-parchemin/70">
                  {s.priceCents ? formatPrice(s.priceCents, s.currency) : "—"}
                </td>
                <td className="px-4 py-3 text-parchemin/60">{formatDate(s.currentPeriodEnd)}</td>
                <td className="px-4 py-3 text-parchemin/60">
                  {s.cancelAtPeriodEnd ? "programmée" : "—"}
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-acier">
                  Aucun abonnement enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
