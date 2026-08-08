import { NextResponse } from "next/server";

import { readObject, signedDownloadUrl } from "@/lib/r2";
import { getGuideById } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Extrait public d'un guide.
 *
 * Fichier distinct du PDF premium : celui-ci n'est jamais servi ici, quel que
 * soit l'état de la session. Un guide sans extrait renvoie 404.
 */
export async function GET(_: Request, { params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;
  const guide = await getGuideById(guideId);

  if (!guide || !guide.isActive || !guide.previewFileKey) {
    return NextResponse.json({ error: "Aucun extrait disponible." }, { status: 404 });
  }

  const filename = `Cronostic-${guide.caliberReference}-extrait.pdf`;
  const url = await signedDownloadUrl(guide.previewFileKey, filename);
  if (url) return NextResponse.redirect(url);

  const buffer = await readObject(guide.previewFileKey);
  if (!buffer) {
    return NextResponse.json({ error: "Extrait introuvable." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
