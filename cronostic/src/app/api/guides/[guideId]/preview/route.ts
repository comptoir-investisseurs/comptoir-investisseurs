import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { pdfDuDepot } from "@/lib/guide-files";
import { extraireApercu } from "@/lib/pdf";
import { readObject } from "@/lib/r2";
import { getGuideById } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Nombre de pages ouvertes à la consultation libre. */
const PAGES_EXTRAIT = 3;

/**
 * Extrait public d'un guide.
 *
 * Les premières pages sont découpées à la volée depuis le PDF complet : il n'y
 * a donc aucun fichier d'extrait à produire ni à tenir à jour. Le document
 * complet n'est jamais servi par cette route, quel que soit l'état de la
 * session, et l'extrait porte la mention de son périmètre.
 */
export async function GET(_: Request, { params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;
  const guide = await getGuideById(guideId);
  if (!guide || !guide.isActive) {
    return NextResponse.json({ error: "Guide introuvable." }, { status: 404 });
  }

  // Un extrait téléversé à la main prime sur le découpage automatique.
  let source: Buffer | null = guide.previewFileKey
    ? await readObject(guide.previewFileKey)
    : null;
  let dejaExtrait = source !== null;

  if (!source && guide.r2FileKey) source = await readObject(guide.r2FileKey);
  if (!source) {
    const chemin = pdfDuDepot(guide.caliberSlug);
    if (chemin) source = await readFile(chemin);
  }
  if (!source) return NextResponse.json({ error: "Aucun extrait disponible." }, { status: 404 });

  const apercu = dejaExtrait ? source : await extraireApercu(source, PAGES_EXTRAIT);
  if (!apercu) return NextResponse.json({ error: "Extrait indisponible." }, { status: 404 });

  return new NextResponse(new Uint8Array(apercu), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Cronostic_Omega_${guide.caliberReference}_extrait.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
