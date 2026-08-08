import Link from "next/link";

import { GuideForm } from "@/components/admin/guide-form";
import { listCalibers } from "@/lib/repo";
import { createGuideAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NouveauGuidePage() {
  const calibers = await listCalibers();

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="surtitre">Nouveau guide</h2>
        <Link href="/admin/guides" className="text-legende text-encre/72 underline underline-offset-4">
          Retour
        </Link>
      </div>

      <p className="mt-4 max-w-2xl text-legende leading-relaxed text-encre/55">
        Créez d&apos;abord la fiche produit, puis téléversez le PDF final depuis la page du guide.
        Le site ne produit ni ne modifie les PDF&nbsp;: il les distribue.
      </p>

      <div className="mt-8">
        <GuideForm action={createGuideAction} calibers={calibers} submitLabel="Créer le guide" />
      </div>
    </>
  );
}
