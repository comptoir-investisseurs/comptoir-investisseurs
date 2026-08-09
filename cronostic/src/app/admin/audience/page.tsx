import Link from "next/link";

import { audience, purgerEmpreintes } from "@/lib/analytics";
import { listGuides } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audience" };

function Chiffre({ valeur, libelle }: { valeur: string | number; libelle: string }) {
  return (
    <div className="cadre p-6">
      <p className="font-titre text-couverture text-encre">{valeur}</p>
      <p className="surtitre mt-1">{libelle}</p>
    </div>
  );
}

export default async function AudiencePage() {
  // Purge d'entretien : la rétention se tient toute seule, sans ordonnanceur.
  await purgerEmpreintes();

  const [mesure, guides] = await Promise.all([audience(30), listGuides({ activeOnly: true })]);

  const libelleDe = (chemin: string) => {
    if (chemin === "/") return "Accueil";
    const guide = guides.find((g) => `/guides/${g.slug}` === chemin);
    if (guide) return `Guide — Omega ${guide.caliberReference}`;
    const calibre = chemin.match(/^\/calibres\/(.+)$/);
    if (calibre) return `Calibre — ${calibre[1]}`;
    return chemin;
  };

  const maxJour = Math.max(1, ...mesure.jours.map((j) => j.vues));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="titre text-section">Audience — 30 derniers jours</h2>
        <p className="legende">Mesure interne, sans cookie ni traceur tiers</p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <Chiffre valeur={mesure.vues_totales} libelle="Pages consultées" />
        <Chiffre valeur={mesure.visites_estimees} libelle="Visites estimées" />
        <Chiffre
          valeur={
            mesure.visites_estimees > 0
              ? (mesure.vues_totales / mesure.visites_estimees).toFixed(1).replace(".", ",")
              : "—"
          }
          libelle="Pages par visite"
        />
      </div>

      {mesure.vues_totales === 0 && (
        <p className="mt-8 border-l-2 border-laiton bg-papier px-5 py-4 text-legende leading-relaxed text-encre/72">
          Aucune consultation enregistrée pour l&apos;instant. Le compteur démarre à la première
          visite ; sans base de données, il repart de zéro à chaque redémarrage du serveur.
        </p>
      )}

      {/* Pages ---------------------------------------------------- */}
      <section className="mt-12">
        <h3 className="surtitre">Pages les plus consultées</h3>
        <div className="filet mt-2" />
        <div className="mt-5 overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Chemin</th>
                <th scope="col">Vues</th>
              </tr>
            </thead>
            <tbody>
              {mesure.pages.slice(0, 30).map((p) => (
                <tr key={p.chemin}>
                  <td>{libelleDe(p.chemin)}</td>
                  <td className="font-technique">
                    <Link href={p.chemin} className="lien-souligne">
                      {p.chemin}
                    </Link>
                  </td>
                  <td className="font-technique">{p.vues}</td>
                </tr>
              ))}
              {mesure.pages.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-encre/55">
                    Rien à afficher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Jour par jour -------------------------------------------- */}
      {mesure.jours.length > 0 && (
        <section className="mt-12">
          <h3 className="surtitre">Jour par jour</h3>
          <div className="filet mt-2" />
          <ul className="mt-5 space-y-1.5">
            {mesure.jours.map((j) => (
              <li key={j.jour} className="flex items-center gap-4">
                <span className="w-24 shrink-0 font-technique text-legende not-italic text-encre/72">
                  {j.jour}
                </span>
                <span
                  className="h-2.5 bg-laiton"
                  style={{ width: `${Math.max(2, (j.vues / maxJour) * 100)}%` }}
                  aria-hidden="true"
                />
                <span className="font-technique text-legende not-italic text-encre/55">
                  {j.vues}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="legende mt-12 max-w-[68ch]">
        Les visites sont estimées à partir d&apos;une empreinte salée renouvelée chaque jour :
        aucune adresse IP n&apos;est conservée et une même personne n&apos;est pas reconnaissable
        d&apos;un jour sur l&apos;autre. Les empreintes de plus de trente jours sont supprimées à
        l&apos;ouverture de cette page. Les pages d&apos;administration et les appels d&apos;API ne
        sont pas comptés.
      </p>
    </div>
  );
}
