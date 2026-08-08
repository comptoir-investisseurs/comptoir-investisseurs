import { NextResponse } from "next/server";

import { getCurrentUser, signInPath } from "@/lib/auth";
import { guideAccessFor } from "@/lib/entitlements";
import { readObject, signedDownloadUrl } from "@/lib/r2";
import { getGuideById } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Téléchargement d'un guide.
 *
 * L'URL du bucket R2 n'est jamais exposée : la route vérifie la session, puis
 * le droit (achat OU abonnement PRO actif couvrant ce guide), et ne délivre
 * qu'ensuite une URL signée à durée de vie courte.
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
          "Accès refusé. Ce guide nécessite un achat à l'unité ou un abonnement CRONOSTIC PRO actif.",
      },
      { status: 403 },
    );
  }

  if (!guide.r2FileKey) {
    return NextResponse.json(
      { error: "Aucun fichier n'est encore associé à ce guide." },
      { status: 404 },
    );
  }

  const filename = `CRONOSTIC-${guide.caliberReference}.pdf`;

  const url = await signedDownloadUrl(guide.r2FileKey, filename);
  if (url) return NextResponse.redirect(url);

  // Stockage local (R2 non configuré) : la route sert elle-même le flux.
  const buffer = await readObject(guide.r2FileKey);
  if (!buffer) {
    return NextResponse.json({ error: "Fichier introuvable dans le stockage." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
