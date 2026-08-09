import { NextResponse } from "next/server";

import { getCurrentUser, signInPath } from "@/lib/auth";
import { exporterDonneesUtilisateur } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Portabilité des données (RGPD, art. 20) : l'export est déclenché par la
 * personne elle-même, depuis sa session — il n'y a donc rien à vérifier de
 * plus que l'identité, et rien à envoyer par courriel.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(signInPath("/account/donnees"), request.url));
  }

  const donnees = await exporterDonneesUtilisateur(user);
  const horodatage = donnees.genere_le.slice(0, 10);

  return new NextResponse(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cronostic-donnees-${horodatage}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
