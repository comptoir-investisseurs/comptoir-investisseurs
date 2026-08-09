import { listParts } from "@/lib/repo";
import { validerPieceAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fournitures" };

export default async function AdminPiecesPage({
  searchParams,
}: {
  searchParams: Promise<{ validee?: string }>;
}) {
  const sp = await searchParams;
  const parts = await listParts();
  const attestees = parts.filter((p) => p.isVerified).length;

  return (
    <>
      <h2 className="surtitre">Fournitures</h2>

      <div className="encart encart-alerte mt-5 max-w-[80ch]">
        <p className="encart-titre">Ce qui s&apos;affiche et ce qui ne s&apos;affiche pas</p>
        <p className="mt-2">
          Le <strong>numéro de fourniture</strong> vient de la liste normalisée de l&apos;horlogerie
          suisse. Il identifie la pièce, il ne permet pas de la commander.
        </p>
        <p className="mt-2">
          La <strong>référence de commande</strong> est celle du constructeur, relevée sur la
          planche du calibre. Tant qu&apos;elle n&apos;est pas saisie et attestée ici, la fiche
          publique n&apos;affiche rien à sa place : une référence inventée ferait commander la
          mauvaise fourniture, ce qui est pire que pas de référence du tout.
        </p>
        <p className="mt-2">
          Indiquez la <strong>source</strong> — planche, catalogue, page, date. C&apos;est elle qui
          permettra de trancher dans six mois quand un doute reviendra.
        </p>
      </div>

      <p className="mt-6 text-legende text-encre/72">
        <span className="pastille">{attestees}</span> fourniture{attestees > 1 ? "s" : ""} attestée
        {attestees > 1 ? "s" : ""} sur {parts.length}.
      </p>

      {sp.validee && (
        <p className="mt-4 border-l-2 border-laiton bg-papier px-5 py-3 text-legende text-encre/72">
          Fourniture enregistrée.
        </p>
      )}

      <div className="cadre mt-6 overflow-x-auto">
        <table className="w-full min-w-[64rem] text-left text-legende">
          <thead>
            <tr className="border-b border-gris-trait text-surtitre tracking-[0.16em] text-encre/55 uppercase">
              <th className="px-4 py-3 font-medium">N°</th>
              <th className="px-4 py-3 font-medium">Désignation</th>
              <th className="px-4 py-3 font-medium">Anglais</th>
              <th className="px-4 py-3 font-medium">Référence de commande</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Attestée</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gris-clair">
            {parts.map((p) => (
              <tr key={p.id} className="align-top hover:bg-papier">
                <td className="px-4 py-3 tabular-nums text-laiton">{p.positionNumber ?? "—"}</td>
                <td className="px-4 py-3 text-encre">{p.name}</td>
                <td className="px-4 py-3 text-encre/60">{p.nameEn}</td>
                <td className="px-4 py-3" colSpan={4}>
                  <form action={validerPieceAction} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="partId" value={p.id} />
                    <input
                      name="orderReference"
                      defaultValue={p.orderReference ?? ""}
                      placeholder="ex. 265-1100"
                      className="w-40 border border-gris-trait bg-papier px-3 py-1.5 tabular-nums text-encre outline-none focus:border-laiton"
                      aria-label={`Référence de commande — ${p.name}`}
                    />
                    <input
                      name="source"
                      defaultValue={p.source ?? ""}
                      placeholder="Planche Omega 265, p. 3, éd. 1957"
                      className="min-w-0 flex-1 border border-gris-trait bg-papier px-3 py-1.5 text-encre outline-none focus:border-laiton"
                      aria-label={`Source — ${p.name}`}
                    />
                    <label className="flex shrink-0 items-center gap-2">
                      <input
                        type="checkbox"
                        name="isVerified"
                        defaultChecked={p.isVerified}
                        className="h-4 w-4 accent-laiton"
                      />
                      <span className={p.isVerified ? "text-methode" : "text-encre/55"}>
                        {p.isVerified ? "attestée" : "à relever"}
                      </span>
                    </label>
                    <button type="submit" className="bouton-secondaire shrink-0 !px-4">
                      Enregistrer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
