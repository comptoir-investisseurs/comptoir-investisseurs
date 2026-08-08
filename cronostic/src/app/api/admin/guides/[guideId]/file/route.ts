import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { guideObjectKey, previewObjectKey, putObject } from "@/lib/r2";
import { getGuideById, updateGuide } from "@/lib/repo";

export const dynamic = "force-dynamic";

const MAX_BYTES = 60 * 1024 * 1024;

/**
 * Téléversement du PDF final d'un guide (ou de son extrait public).
 *
 * Le site ne produit ni ne modifie les PDF : il reçoit le fichier déjà mis en
 * page par CRONOSTIC et l'écrit tel quel dans le bucket privé.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ guideId: string }> },
) {
  const { guideId } = await params;

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const guide = await getGuideById(guideId);
  if (!guide) return NextResponse.json({ error: "Guide introuvable." }, { status: 404 });

  const back = (query: string) =>
    NextResponse.redirect(new URL(`/admin/guides/${guideId}?${query}`, request.url), 303);

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "pdf");

  if (!(file instanceof File) || file.size === 0) return back("erreur=upload");
  if (file.size > MAX_BYTES) return back("erreur=upload");
  if (file.type && file.type !== "application/pdf") return back("erreur=upload");

  const key =
    kind === "preview" ? previewObjectKey(guide.caliberSlug) : guideObjectKey(guide.caliberSlug);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await putObject(key, buffer, "application/pdf");
  } catch (error) {
    console.error("[upload-guide]", error);
    return back("erreur=upload");
  }

  await updateGuide(guide.id, kind === "preview" ? { previewFileKey: key } : { r2FileKey: key });

  return back("fichier=ok");
}
