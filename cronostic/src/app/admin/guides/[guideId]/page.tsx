import Link from "next/link";
import { notFound } from "next/navigation";

import { GuideForm } from "@/components/admin/guide-form";
import { GuideCover } from "@/components/guide-cover";
import { hasR2 } from "@/lib/env";
import { getGuideById, listCalibers } from "@/lib/repo";
import { updateGuideAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditerGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ guideId: string }>;
  searchParams: Promise<{ enregistre?: string; erreur?: string; fichier?: string }>;
}) {
  const { guideId } = await params;
  const sp = await searchParams;
  const [guide, calibers] = await Promise.all([getGuideById(guideId), listCalibers()]);
  if (!guide) notFound();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="surtitre">Modifier le guide</h2>
        <Link href="/admin/guides" className="text-sm text-parchemin/70 underline underline-offset-4">
          Retour à la liste
        </Link>
      </div>

      {sp.enregistre === "1" && (
        <p className="mt-5 border-l-2 border-laiton bg-graphite/40 px-5 py-3 text-sm text-parchemin/75">
          Modifications enregistrées.
        </p>
      )}
      {sp.fichier === "ok" && (
        <p className="mt-5 border-l-2 border-laiton bg-graphite/40 px-5 py-3 text-sm text-parchemin/75">
          Fichier téléversé.
        </p>
      )}
      {sp.erreur === "pdf-manquant" && (
        <p className="mt-5 border-l-2 border-rubis bg-graphite/40 px-5 py-3 text-sm text-parchemin/75">
          Impossible de publier&nbsp;: aucun PDF n&apos;est associé à ce guide.
        </p>
      )}
      {sp.erreur === "upload" && (
        <p className="mt-5 border-l-2 border-rubis bg-graphite/40 px-5 py-3 text-sm text-parchemin/75">
          Le téléversement a échoué. Vérifiez le format du fichier.
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <GuideForm
          action={updateGuideAction}
          calibers={calibers}
          guide={guide}
          submitLabel="Enregistrer"
        />

        <aside className="space-y-8">
          <div>
            <p className="surtitre">Couverture</p>
            <GuideCover
              caliberReference={guide.caliberReference}
              coverImageUrl={guide.coverImageUrl}
              pageCount={guide.pageCount}
              className="mt-4"
            />
          </div>

          <div>
            <p className="surtitre">Fichier premium</p>
            <p className="mt-3 text-sm break-all text-parchemin/70">
              {guide.r2FileKey ?? "Aucun PDF associé."}
            </p>
            <form
              action={`/api/admin/guides/${guide.id}/file`}
              method="post"
              encType="multipart/form-data"
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="kind" value="pdf" />
              <input
                type="file"
                name="file"
                accept="application/pdf"
                required
                className="block w-full text-xs text-parchemin/70 file:mr-3 file:border file:border-parchemin/25 file:bg-transparent file:px-3 file:py-1.5 file:text-parchemin/80"
              />
              <button
                type="submit"
                className="w-full border border-laiton/50 px-4 py-2 text-[0.72rem] tracking-[0.16em] text-laiton-clair uppercase transition-colors hover:bg-laiton/10"
              >
                {guide.r2FileKey ? "Remplacer le PDF" : "Téléverser le PDF"}
              </button>
            </form>
          </div>

          <div>
            <p className="surtitre">Extrait public</p>
            <p className="mt-3 text-sm break-all text-parchemin/70">
              {guide.previewFileKey ?? "Aucun extrait."}
            </p>
            <form
              action={`/api/admin/guides/${guide.id}/file`}
              method="post"
              encType="multipart/form-data"
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="kind" value="preview" />
              <input
                type="file"
                name="file"
                accept="application/pdf"
                required
                className="block w-full text-xs text-parchemin/70 file:mr-3 file:border file:border-parchemin/25 file:bg-transparent file:px-3 file:py-1.5 file:text-parchemin/80"
              />
              <button
                type="submit"
                className="w-full border border-parchemin/30 px-4 py-2 text-[0.72rem] tracking-[0.16em] text-parchemin/75 uppercase transition-colors hover:border-laiton/50"
              >
                Téléverser l&apos;extrait
              </button>
            </form>
          </div>

          <p className="text-xs leading-relaxed text-acier">
            {hasR2
              ? "Stockage : bucket Cloudflare R2 privé. Le PDF premium n'est jamais servi sans vérification des droits."
              : "Cloudflare R2 n'est pas configuré : les fichiers sont écrits dans .local-storage/ et servis par la route de téléchargement, avec le même contrôle d'accès."}
          </p>
        </aside>
      </div>
    </>
  );
}
