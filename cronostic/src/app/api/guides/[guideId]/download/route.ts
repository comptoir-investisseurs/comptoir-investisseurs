import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getCurrentUser, signInPath } from "@/lib/auth";
import { guideAccessFor } from "@/lib/entitlements";
import { pdfDuDepot } from "@/lib/guide-files";
import { readObject, signedDownloadUrl } from "@/lib/r2";
import { getGuideById } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Téléchargement d'un guide.
 *
 * L'URL du bucket R2 n'est jamais exposée : la route vérifie la session, puis
 * le droit (achat OU abonnement Cronostic Pro actif couvrant ce guide), et ne
 * délivre qu'ensuite le fichier.
 *
 * Trois sources, dans cet ordre : le bucket R2 quand un PDF y a été téléversé,
 * le stockage local qui le remplace en développement, puis le PDF déposé dans
 * `guides-pdf/` au sein du dépôt. Ce dernier n'est jamais servi statiquement :
 * il ne sort que par ici, après contrôle des droits.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ guideId: string }> },
) {
  const { guideId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(signInPath(`/api/guides/${guideId}/download`), request.url),
    );
  }

  const guide = await getGuideById(guideId);
  if (!guide || !guide.isActive) {
    return NextResponse.json({ error: "Guide introuvable." }, { status: 404 });
  }

  const access = await guideAccessFor(user, guide);
  if (!access.canDownload) {
    return NextResponse.json(
      {
        error:
          "Accès refusé. Ce guide nécessite un achat à l'unité ou un abonnement Cronostic Pro actif.",
      },
      { status: 403 },
    );
  }

  const filename = `Cronostic_Omega_${guide.caliberReference}_manuel_de_service.pdf`;

  // 1. Bucket R2, quand un fichier y a été téléversé.
  if (guide.r2FileKey) {
    const url = await signedDownloadUrl(guide.r2FileKey, filename);
    if (url) return NextResponse.redirect(url);

    const buffer = await readObject(guide.r2FileKey);
    if (buffer) return servirPdf(buffer, filename);
  }

  // 2. PDF déposé dans le dépôt.
  const chemin = pdfDuDepot(guide.caliberSlug);
  if (chemin) return servirPdf(await readFile(chemin), filename);

  return NextResponse.json(
    { error: "Aucun fichier n'est encore associé à ce guide." },
    { status: 404 },
  );
}

function servirPdf(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
