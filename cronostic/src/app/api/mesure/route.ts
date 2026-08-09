import { NextResponse } from "next/server";

import { enregistrerVue, normaliserChemin } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Point de collecte de la mesure d'audience.
 *
 * Le corps ne contient que le chemin consulté. L'adresse et le navigateur ne
 * servent qu'à calculer l'empreinte salée du jour — ils ne sont jamais
 * écrits. La réponse est vide et immédiate : un échec de mesure ne doit
 * jamais se voir côté visiteur.
 */
export async function POST(request: Request) {
  try {
    const corps = (await request.json()) as { chemin?: unknown };
    const chemin = typeof corps.chemin === "string" ? normaliserChemin(corps.chemin) : null;
    if (!chemin) return new NextResponse(null, { status: 204 });

    // Les robots consomment des compteurs sans rien apporter.
    const navigateur = request.headers.get("user-agent");
    if (navigateur && /bot|crawler|spider|preview|monitor|curl|wget/i.test(navigateur)) {
      return new NextResponse(null, { status: 204 });
    }

    await enregistrerVue(chemin, {
      adresse:
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip"),
      navigateur,
    });
  } catch {
    // Silence volontaire : la mesure n'est jamais critique.
  }
  return new NextResponse(null, { status: 204 });
}
