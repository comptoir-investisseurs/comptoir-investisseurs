import { listLubricants } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminHuilesPage() {
  const lubricants = await listLubricants();

  return (
    <>
      <h2 className="surtitre">Huiles et consommables</h2>

      <div className="carte mt-6 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr className="border-b border-parchemin/12 text-[0.66rem] tracking-[0.16em] text-acier uppercase">
              <th className="px-4 py-3 font-medium">Marque</th>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Usage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchemin/8">
            {lubricants.map((l) => (
              <tr key={l.id} className="hover:bg-graphite/40">
                <td className="px-4 py-3 text-parchemin/70">{l.brand}</td>
                <td className="px-4 py-3 text-ivoire">{l.reference}</td>
                <td className="px-4 py-3 text-parchemin/60">{l.type}</td>
                <td className="px-4 py-3 text-parchemin/60">{l.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
