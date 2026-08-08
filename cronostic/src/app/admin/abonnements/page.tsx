import { formatDate, formatPrice } from "@/lib/format";
import { listSubscriptions } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminAbonnementsPage() {
  const subscriptions = await listSubscriptions();

  return (
    <>
      <h2 className="surtitre">Abonnements</h2>

      <div className="cadre mt-6 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-legende">
          <thead>
            <tr className="border-b border-gris-trait text-surtitre tracking-[0.16em] text-encre/55 uppercase">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Période</th>
              <th className="px-4 py-3 font-medium">Résiliation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gris-clair">
            {subscriptions.map((s) => (
              <tr key={s.id} className="hover:bg-papier">
                <td className="px-4 py-3 text-encre">{s.userEmail}</td>
                <td className="px-4 py-3 text-encre/72">{s.status}</td>
                <td className="px-4 py-3 text-encre/72">
                  {s.priceCents ? formatPrice(s.priceCents, s.currency) : "—"}
                </td>
                <td className="px-4 py-3 text-encre/72">{formatDate(s.currentPeriodEnd)}</td>
                <td className="px-4 py-3 text-encre/72">
                  {s.cancelAtPeriodEnd ? "programmée" : "—"}
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-encre/55">
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
