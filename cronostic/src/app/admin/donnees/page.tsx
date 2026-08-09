import Link from "next/link";

import { inventaireDesManques } from "@/lib/repo";
import { importerAttestationsAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ce qui manque" };

function Barre({
  titre,
  fait,
  total,
  detail,
  lien,
}: {
  titre: string;
  fait: number;
  total: number;
  detail: string;
  lien?: { href: string; label: string };
}) {
  const part = total > 0 ? Math.round((fait / total) * 100) : 0;

  return (
    <div className="cadre p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="surtitre">{titre}</p>
        <p className="font-titre text-section tabular-nums">
          {fait}
          <span className="text-encre/40"> / {total}</span>
        </p>
      </div>
      <div className="mt-4 h-1.5 w-full bg-gris-fond" aria-hidden="true">
        <div className="h-full bg-laiton" style={{ width: `${part}%` }} />
      </div>
      <p className="mt-3 text-legende leading-relaxed text-encre/72">{detail}</p>
      {lien && (
        <Link href={lien.href} className="lien-souligne mt-4 inline-block text-legende not-italic">
          {lien.label}
        </Link>
      )}
    </div>
  );
}

export default async function AdminDonneesPage({
  searchParams,
}: {
  searchParams: Promise<{
    appliquees?: string;
    incompletes?: string;
    inconnues?: string;
    import?: string;
  }>;
}) {
  const sp = await searchParams;
  const m = await inventaireDesManques();

  return (
    <div>
      <h2 className="titre text-section">Ce qui manque</h2>
      <p className="mt-3 max-w-[72ch] text-encre/72">
        La liste de travail, pas un tableau de bord de vanité. Tant qu&apos;une donnée figure ici,
        elle s&apos;affiche sur le site avec le repère <span className="text-laiton">◆</span> et
        n&apos;est jamais présentée comme certaine.
      </p>

      <div className="encart encart-alerte mt-8 max-w-[80ch]">
        <p className="encart-titre">Pourquoi c&apos;est à ce point vide</p>
        <p className="mt-2">
          Les sources horlogères de référence sont inaccessibles depuis cet environnement : la
          politique réseau bloque <span className="font-technique">ranfft.org</span>,{" "}
          <span className="font-technique">calibercorner.com</span>,{" "}
          <span className="font-technique">emmywatch.com</span>,{" "}
          <span className="font-technique">eta.ch</span>,{" "}
          <span className="font-technique">sellita.ch</span>,{" "}
          <span className="font-technique">moebius-lubricants.ch</span>,{" "}
          <span className="font-technique">cousinsuk.com</span> et jusqu&apos;à{" "}
          <span className="font-technique">wikipedia.org</span>.
        </p>
        <p className="mt-2">
          Les moteurs de recherche restent joignables, mais ils ne renvoient que des résumés de
          seconde main — et ces résumés se contredisent : sur un même calibre, la réserve de marche
          donnée varie de 38 à 42 heures selon la page. Recopier l&apos;un ou l&apos;autre, ce
          serait fabriquer une certitude qui n&apos;existe pas.
        </p>
        <p className="mt-2">
          Deux façons d&apos;avancer : ouvrir ces domaines dans la politique réseau, ou saisir les
          valeurs depuis les documents que vous avez déjà en main. Les écrans de validation ci-dessous
          demandent une source pour chaque valeur, et l&apos;affichage public suit aussitôt.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Barre
          titre="Caractéristiques de calibre"
          fait={m.specs.attestees}
          total={m.specs.total}
          detail="Diamètre, hauteur, rubis, fréquence, réserve de marche des calibres documentés. Chacune demande une source constructeur ou une mesure d'atelier."
          lien={{ href: "/calibres", label: "Voir les fiches" }}
        />
        <Barre
          titre="Fournitures"
          fait={m.fournitures.attestees}
          total={m.fournitures.total}
          detail={`${m.fournitures.sansReference} fournitures sans référence de commande. Le numéro de nomenclature ne suffit pas : la référence figure sur la planche du calibre.`}
          lien={{ href: "/admin/pieces", label: "Saisir les références" }}
        />
        <Barre
          titre="Lubrifiants"
          fait={m.lubrifiants.attestes}
          total={m.lubrifiants.total}
          detail={`${m.lubrifiants.sansViscosite} références sans viscosité. Les fiches techniques Moebius et Kluber donnent la valeur exacte à 20 °C.`}
          lien={{ href: "/admin/huiles", label: "Saisir les viscosités" }}
        />
        <Barre
          titre="Guides"
          fait={m.guides.publies}
          total={m.guides.total}
          detail={`${m.guides.sansPdf} guides sans PDF téléversé sur R2 — ils peuvent néanmoins être servis depuis guides-pdf/.`}
          lien={{ href: "/admin/guides", label: "Gérer les guides" }}
        />
      </div>

      <section className="mt-14">
        <h3 className="surtitre">Encyclopédie</h3>
        <div className="filet mt-2" />
        <div className="mt-5 overflow-x-auto">
          <table className="tableau">
            <tbody>
              <tr>
                <td>Calibres répertoriés</td>
                <td className="tabular-nums">{m.calibres.total}</td>
              </tr>
              <tr>
                <td>Fiches détaillées — présentation, nomenclature, lubrification</td>
                <td className="tabular-nums">{m.calibres.documentes}</td>
              </tr>
              <tr>
                <td>Fiches d&apos;amorce — référence, période, repères dimensionnels</td>
                <td className="tabular-nums">{m.calibres.amorces}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="legende mt-3 max-w-[72ch]">
          Les fiches d&apos;amorce ne portent aucune caractéristique attestée. Les compléter
          demande, calibre par calibre, une source : planche constructeur, fiche technique
          d&apos;éditeur, ou relevé au pied à coulisse et au chronocomparateur.
        </p>
      </section>

      <section className="mt-14">
        <h3 className="surtitre">Emporter la liste</h3>
        <div className="filet mt-2" />
        <p className="mt-4 max-w-[72ch] text-legende leading-relaxed text-encre/72">
          Le fichier ci-dessous liste chaque valeur manquante, une ligne par donnée, avec les
          colonnes à remplir. Il s&apos;ouvre dans un tableur, se travaille hors ligne et se
          transmet — c&apos;est le format qui permet d&apos;abattre du volume sans passer par un
          formulaire.
        </p>
        <a href="/api/admin/manques.csv" className="bouton-secondaire mt-5 inline-block" download>
          Télécharger la liste (CSV)
        </a>

        <div className="cadre-papier mt-8 p-6">
          <p className="surtitre">Renvoyer le fichier rempli</p>
          <p className="mt-3 max-w-[72ch] text-legende leading-relaxed text-encre/72">
            Remplissez les colonnes <span className="font-technique">valeur_relevee</span> et{" "}
            <span className="font-technique">source</span> — et{" "}
            <span className="font-technique">url_source</span> si le document est en ligne. Ne
            touchez pas à <span className="font-technique">cle_reprise</span> : c&apos;est elle qui
            rattache chaque ligne à sa donnée. Les lignes laissées vides sont ignorées, celles où
            la source manque aussi : une valeur sans provenance n&apos;est pas attestée.
          </p>

          <form
            action={importerAttestationsAction}
            encType="multipart/form-data"
            className="mt-5 flex flex-wrap items-center gap-4"
          >
            <input
              type="file"
              name="fichier"
              accept=".csv,text/csv"
              required
              className="min-w-0 flex-1 border border-gris-trait bg-white px-3 py-2 text-legende text-encre file:mr-3 file:border-0 file:bg-gris-fond file:px-3 file:py-1.5 file:text-encre"
              aria-label="Fichier CSV rempli"
            />
            <button type="submit" className="bouton shrink-0">
              Importer
            </button>
          </form>
        </div>

        {sp.import === "vide" && (
          <p className="mt-4 border-l-2 border-alerte bg-papier px-5 py-3 text-legende text-alerte">
            Aucun fichier reçu.
          </p>
        )}

        {sp.appliquees !== undefined && (
          <div className="encart encart-methode mt-6 max-w-[76ch]">
            <p className="encart-titre">Import terminé</p>
            <p className="mt-2">
              <strong>{sp.appliquees}</strong> valeur
              {Number(sp.appliquees) > 1 ? "s" : ""} attestée
              {Number(sp.appliquees) > 1 ? "s" : ""}.
              {Number(sp.incompletes) > 0 && (
                <>
                  {" "}
                  {sp.incompletes} ligne{Number(sp.incompletes) > 1 ? "s" : ""} laissée
                  {Number(sp.incompletes) > 1 ? "s" : ""} de côté : valeur sans source, ou
                  l&apos;inverse.
                </>
              )}
              {Number(sp.inconnues) > 0 && (
                <>
                  {" "}
                  {sp.inconnues} clé{Number(sp.inconnues) > 1 ? "s" : ""} de reprise non
                  reconnue{Number(sp.inconnues) > 1 ? "s" : ""} — colonne déplacée ou ligne ajoutée
                  à la main.
                </>
              )}
            </p>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h3 className="surtitre">Déposer des documents</h3>
        <div className="filet mt-2" />
        <p className="mt-4 max-w-[72ch] text-legende leading-relaxed text-encre/72">
          L&apos;autre voie : déposer les planches et fiches techniques dans le dossier{" "}
          <span className="font-technique">sources/</span> du dépôt, comme les PDF des guides. Il
          n&apos;est pas publié — rien n&apos;y est servi. Le mode d&apos;emploi et les conventions
          de nommage figurent dans <span className="font-technique">sources/README.md</span>.
        </p>
      </section>
    </div>
  );
}
