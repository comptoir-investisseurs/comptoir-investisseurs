import { listLubricants } from "@/lib/repo";
import { validerLubrifiantAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Huiles" };

export default async function AdminHuilesPage({
  searchParams,
}: {
  searchParams: Promise<{ validee?: string }>;
}) {
  const sp = await searchParams;
  const lubricants = await listLubricants();
  const attestes = lubricants.filter((l) => l.isVerified).length;

  return (
    <>
      <h2 className="surtitre">Huiles et consommables</h2>

      <div className="encart encart-alerte mt-5 max-w-[80ch]">
        <p className="encart-titre">Une viscosité se lit, elle ne se déduit pas</p>
        <p className="mt-2">
          Les valeurs saisies ici s&apos;affichent avec le repère{" "}
          <span className="text-laiton">◆</span> tant qu&apos;elles ne sont pas attestées. Une
          viscosité est une donnée mesurée par le fabricant : la reprendre d&apos;un forum ou d&apos;un
          revendeur, c&apos;est risquer de propager son erreur.
        </p>
        <p className="mt-2">
          Les fiches techniques Moebius sont publiques et donnent la valeur à 0, 20 et 40 °C.
          Indiquez le lien : il s&apos;affichera sous la référence, et n&apos;importe qui pourra
          vérifier.
        </p>
      </div>

      <p className="mt-6 text-legende text-encre/72">
        <span className="pastille">{attestes}</span> référence{attestes > 1 ? "s" : ""} attestée
        {attestes > 1 ? "s" : ""} sur {lubricants.length}.
      </p>

      {sp.validee && (
        <p className="mt-4 border-l-2 border-laiton bg-papier px-5 py-3 text-legende text-encre/72">
          Référence enregistrée.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {lubricants.map((l) => (
          <form
            key={l.id}
            action={validerLubrifiantAction}
            className="cadre grid gap-4 p-5 lg:grid-cols-[200px_minmax(0,1fr)]"
          >
            <input type="hidden" name="lubricantId" value={l.id} />

            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: l.colorHex ?? "#8b9097" }}
                  aria-hidden="true"
                />
                <span className="surtitre">{l.brand}</span>
              </div>
              <p className="font-titre mt-1 text-etape">{l.reference}</p>
              <p className="legende mt-0.5">{l.name}</p>
              <p className={`legende mt-2 ${l.isVerified ? "text-methode" : "text-encre/55"}`}>
                {l.isVerified ? "attestée" : "à relever"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-legende not-italic text-encre/55">Viscosité</span>
                <input
                  name="viscosity"
                  defaultValue={l.viscosity ?? ""}
                  placeholder="150 cSt à 20 °C"
                  className="mt-1 w-full border border-gris-trait bg-papier px-3 py-1.5 text-encre outline-none focus:border-laiton"
                />
              </label>
              <label className="block">
                <span className="text-legende not-italic text-encre/55">Usage</span>
                <input
                  name="usage"
                  defaultValue={l.usage ?? ""}
                  placeholder="Échappement, mobiles rapides"
                  className="mt-1 w-full border border-gris-trait bg-papier px-3 py-1.5 text-encre outline-none focus:border-laiton"
                />
              </label>
              <label className="block">
                <span className="text-legende not-italic text-encre/55">Source</span>
                <input
                  name="source"
                  defaultValue={l.source ?? ""}
                  placeholder="Fiche technique Moebius, éd. 2023"
                  className="mt-1 w-full border border-gris-trait bg-papier px-3 py-1.5 text-encre outline-none focus:border-laiton"
                />
              </label>
              <label className="block">
                <span className="text-legende not-italic text-encre/55">Lien de la fiche</span>
                <input
                  name="sourceUrl"
                  type="url"
                  defaultValue={l.sourceUrl ?? ""}
                  placeholder="https://…"
                  className="mt-1 w-full border border-gris-trait bg-papier px-3 py-1.5 text-encre outline-none focus:border-laiton"
                />
              </label>

              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isVerified"
                    defaultChecked={l.isVerified}
                    className="h-4 w-4 accent-laiton"
                  />
                  <span className="text-legende not-italic text-encre/72">Attestée</span>
                </label>
                <button type="submit" className="bouton-secondaire !px-5">
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
