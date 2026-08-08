import { listLubricants } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminHuilesPage() {
  const lubricants = await listLubricants();

  return (
    <>
      <h2 className="surtitre">Huiles et consommables</h2>

      <div className="cadre mt-6 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-legende">
          <thead>
            <tr className="border-b border-gris-trait text-surtitre tracking-[0.16em] text-encre/55 uppercase">
              <th className="px-4 py-3 font-medium">Marque</th>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Usage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gris-clair">
            {lubricants.map((l) => (
              <tr key={l.id} className="hover:bg-papier">
                <td className="px-4 py-3 text-encre/72">{l.brand}</td>
                <td className="px-4 py-3 text-encre">{l.reference}</td>
                <td className="px-4 py-3 text-encre/72">{l.type}</td>
                <td className="px-4 py-3 text-encre/72">{l.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
