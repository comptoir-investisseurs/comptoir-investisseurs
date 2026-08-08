import { listParts } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminPiecesPage() {
  const parts = await listParts();

  return (
    <>
      <h2 className="surtitre">Pièces</h2>
      <p className="mt-4 max-w-2xl text-legende leading-relaxed text-encre/55">
        Nomenclature commune à la famille 30&nbsp;mm. Les numéros restent à recouper avec les
        planches Omega d&apos;époque avant d&apos;être marqués comme validés.
      </p>

      <div className="cadre mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-legende">
          <thead>
            <tr className="border-b border-gris-trait text-surtitre tracking-[0.16em] text-encre/55 uppercase">
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Désignation</th>
              <th className="px-4 py-3 font-medium">Anglais</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gris-clair">
            {parts.map((p) => (
              <tr key={p.id} className="hover:bg-papier">
                <td className="px-4 py-3 font-technique text-legende text-laiton">{p.reference}</td>
                <td className="px-4 py-3 text-encre">{p.name}</td>
                <td className="px-4 py-3 text-encre/72">{p.nameEn}</td>
                <td className="px-4 py-3 text-encre/72">{p.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
