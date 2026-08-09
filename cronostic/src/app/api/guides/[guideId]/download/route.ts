import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getCurrentUser, signInPath } from "@/lib/auth";
import { guideAccessFor, ouvrirAvecQuota } from "@/lib/entitlements";
import { personnaliserPdf } from "@/lib/pdf";
import { pdfDuDepot } from "@/lib/guide-files";
import { readObject } from "@/lib/r2";
import { getGuideById } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Téléchargement d'un guide.
 *
 * L'URL du bucket R2 n'est jamais exposée : la route vérifie la session, puis
 * le droit (achat OU abonnement Cronostic Pro actif couvrant ce guide), et ne
 * délivre qu'ensuite le fichier.
 *
 * Deux sources, dans cet ordre : le bucket R2 quand un PDF y a été téléversé,
 * puis le PDF déposé dans `guides-pdf/` au sein du dépôt. Ce dernier n'est
 * jamais servi statiquement : il ne sort que par ici.
 *
 * Le fichier remis est personnalisé au nom de l'acheteur. C'est pourquoi la
 * route sert le flux elle-même plutôt que de rediriger vers une URL signée :
 * une redirection livrerait le fichier d'origine, non marqué.
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
  // Formule Atelier : le premier téléchargement consomme un crédit de la
  // période. Un guide déjà ouvert n'en consomme plus.
  const autorise = access.canDownload || (await ouvrirAvecQuota(user, guide));
  if (!autorise) {
    return NextResponse.json(
      {
        error:
          access.creditsRestants === 0
            ? "Quota atteint pour la période en cours. Passez à la formule Intégrale ou achetez ce guide à l'unité."
            : "Accès refusé. Ce guide nécessite un achat à l'unité ou un abonnement actif.",
      },
      { status: 403 },
    );
  }

  const filename = `Cronostic_${guide.caliberBrand.replace(/[^A-Za-z0-9]+/g, "_")}_${guide.caliberReference}_manuel_de_service.pdf`;

  // Le tatouage impose de servir le flux nous-mêmes : une URL signée livrerait
  // le fichier d'origine, non personnalisé.
  const marquer = (buffer: Buffer) =>
    personnaliserPdf(buffer, {
      nom: user.displayName,
      email: user.email,
      reference: `${guide.caliberBrand} ${guide.caliberReference}`,
    });

  // 1. Bucket R2, quand un fichier y a été téléversé.
  if (guide.r2FileKey) {
    const buffer = await readObject(guide.r2FileKey);
    if (buffer) return servirPdf(await marquer(buffer), filename);
  }

  // 2. PDF déposé dans le dépôt.
  const chemin = pdfDuDepot(guide.caliberSlug);
  if (chemin) return servirPdf(await marquer(await readFile(chemin)), filename);

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
