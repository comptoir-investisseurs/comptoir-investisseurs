import type { Metadata } from "next";

import { listLubricants, listTools } from "@/lib/repo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Huiles, graisses et consommables",
  description:
    "Références de lubrifiants horlogers : huiles Moebius, graisses, épilame et produits de nettoyage, avec leurs usages à l'établi.",
};

const ORDRE = ["huile", "graisse", "épilame", "produit de nettoyage"];

export default async function HuilesPage() {
  const [lubricants, tools] = await Promise.all([listLubricants(), listTools()]);

  const groupes = ORDRE.map((type) => ({
    type,
    items: lubricants.filter((l) => l.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="surtitre">Consommables</p>
      <h1 className="titre mt-4 text-couverture text-encre sm:text-couverture">Huiles et lubrification</h1>
      <p className="mt-6 max-w-2xl leading-relaxed text-encre/72">
        Les références utilisées dans les guides Cronostic. Le choix d&apos;un lubrifiant se fait
        d&apos;abord par la charge et la vitesse du pivot&nbsp;: une huile trop épaisse sur
        l&apos;échappement coûte de l&apos;amplitude, une huile trop fine sur le barillet ne tient
        pas.
      </p>

      {groupes.map((groupe) => (
        <section key={groupe.type} className="mt-14">
          <h2 className="surtitre capitalize">{groupe.type}s</h2>
          <ul className="mt-5 grid gap-px border border-gris-trait bg-gris-trait sm:grid-cols-2 lg:grid-cols-3">
            {groupe.items.map((l) => (
              <li key={l.id} className="flex flex-col bg-white p-6">
                <div className="flex items-baseline gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: l.colorHex ?? "#8b9097" }}
                    aria-hidden="true"
                  />
                  <span className="text-[0.7rem] tracking-[0.2em] text-encre/55 uppercase">
                    {l.brand}
                  </span>
                </div>
                <p className="font-titre mt-2 text-section text-encre">{l.reference}</p>
                <p className="mt-1 text-legende text-encre/72">{l.name}</p>
                {l.viscosity && (
                  <p className="mt-3 text-[0.7rem] tracking-[0.14em] text-laiton uppercase">
                    Viscosité&nbsp;: {l.viscosity}
                  </p>
                )}
                {l.usage && (
                  <p className="mt-3 text-legende leading-relaxed text-encre/72">{l.usage}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-16">
        <h2 className="surtitre">Outillage</h2>
        <ul className="cadre mt-5 divide-y divide-gris-clair">
          {tools.map((t) => (
            <li key={t.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
              <span className="text-encre">{t.name}</span>
              {t.category && (
                <span className="text-surtitre tracking-[0.16em] text-laiton uppercase">
                  {t.category}
                </span>
              )}
              {t.description && (
                <span className="w-full text-legende text-encre/55 sm:w-auto sm:flex-1 sm:text-right">
                  {t.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 max-w-2xl text-legende leading-relaxed text-encre/55">
        Les correspondances indiquées reprennent les usages courants d&apos;atelier. Elles ne
        remplacent pas les préconisations du fabricant du lubrifiant ni les fiches de sécurité
        associées.
      </p>
    </div>
  );
}
