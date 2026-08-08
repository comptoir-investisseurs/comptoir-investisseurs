import { listParts } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminPiecesPage() {
  const parts = await listParts();

  return (
    <>
      <h2 className="surtitre">Pièces</h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-acier">
        Nomenclature commune à la famille 30&nbsp;mm. Les numéros restent à recouper avec les
        planches Omega d&apos;époque avant d&apos;être marqués comme validés.
      </p>

      <div className="carte mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-parchemin/12 text-[0.66rem] tracking-[0.16em] text-acier uppercase">
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Désignation</th>
              <th className="px-4 py-3 font-medium">Anglais</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchemin/8">
            {parts.map((p) => (
              <tr key={p.id} className="hover:bg-graphite/40">
                <td className="px-4 py-3 font-mono text-xs text-laiton">{p.reference}</td>
                <td className="px-4 py-3 text-ivoire">{p.name}</td>
                <td className="px-4 py-3 text-parchemin/60">{p.nameEn}</td>
                <td className="px-4 py-3 text-parchemin/60">{p.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
