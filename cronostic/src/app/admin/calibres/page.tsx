import Link from "next/link";

import { listCalibers, listGuides } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminCalibresPage() {
  const [calibers, guides] = await Promise.all([listCalibers(), listGuides()]);

  return (
    <>
      <h2 className="surtitre">Calibres</h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-acier">
        Le catalogue est alimenté par le seed puis affiné en base. Les fiches marquées
        «&nbsp;brouillon&nbsp;» affichent publiquement un avertissement de validation tant que
        leurs caractéristiques n&apos;ont pas été recoupées.
      </p>

      <div className="carte mt-6 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr className="border-b border-parchemin/12 text-[0.66rem] tracking-[0.16em] text-acier uppercase">
              <th className="px-4 py-3 font-medium">Calibre</th>
              <th className="px-4 py-3 font-medium">Famille</th>
              <th className="px-4 py-3 font-medium">Années</th>
              <th className="px-4 py-3 font-medium">Données</th>
              <th className="px-4 py-3 font-medium">Guide</th>
              <th className="px-4 py-3 font-medium">Fiche</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchemin/8">
            {calibers.map((c) => {
              const guide = guides.find((g) => g.caliberId === c.id);
              return (
                <tr key={c.id} className="hover:bg-graphite/40">
                  <td className="px-4 py-3 text-ivoire">
                    {c.brand} {c.reference}
                  </td>
                  <td className="px-4 py-3 text-parchemin/70">{c.familyName ?? "—"}</td>
                  <td className="px-4 py-3 text-parchemin/70">
                    {c.introducedYear ?? "—"}
                    {c.discontinuedYear ? ` – ${c.discontinuedYear}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[0.7rem] tracking-[0.14em] uppercase ${
                        c.dataStatus === "verified" ? "text-laiton-clair" : "text-acier"
                      }`}
                    >
                      {c.dataStatus === "verified" ? "Validé" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {guide ? (
                      <Link
                        href={`/admin/guides/${guide.id}`}
                        className="text-parchemin/70 underline underline-offset-2"
                      >
                        {guide.isActive ? "Publié" : "Brouillon"}
                      </Link>
                    ) : (
                      <Link
                        href="/admin/guides/nouveau"
                        className="text-acier underline underline-offset-2"
                      >
                        Créer
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/calibres/${c.slug}`}
                      className="text-laiton-clair underline underline-offset-2"
                    >
                      Voir ↗
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
