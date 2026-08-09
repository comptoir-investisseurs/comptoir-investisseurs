import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { listCalibers, listLubricants, listParts, getCaliberBySlug } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Échappement CSV : guillemets doublés, champ encadré dès qu'il contient un séparateur. */
function champ(valeur: string | null | undefined): string {
  const v = (valeur ?? "").replace(/"/g, '""');
  return /[";\n]/.test(v) ? `"${v}"` : v;
}

/**
 * Liste de travail : une ligne par valeur à attester.
 *
 * Le point-virgule plutôt que la virgule, et un BOM en tête : c'est ce qui
 * fait qu'Excel en français ouvre le fichier dans des colonnes plutôt que
 * d'empiler tout dans la première, et qu'il n'affiche pas « Ã© » à la place
 * des accents. Un export qu'on doit reformater n'est pas un export.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  // La première colonne est la clé de reprise : c'est elle qui permet de
  // réinjecter le fichier rempli sans se fier à un libellé que l'on aura
  // peut-être corrigé entre-temps. Ne pas la modifier dans le tableur.
  const lignes: string[][] = [
    ["cle_reprise", "section", "objet", "champ", "valeur_actuelle", "valeur_relevee", "source", "url_source"],
  ];

  const [calibres, pieces, lubrifiants] = await Promise.all([
    listCalibers(),
    listParts(),
    listLubricants(),
  ]);

  for (const c of calibres) {
    const detail = await getCaliberBySlug(c.slug);
    for (const s of detail?.specs ?? []) {
      if (s.isVerified) continue;
      lignes.push([
        `spec:${c.slug}:${s.key}`,
        "caracteristique",
        `${c.brand} ${c.reference}`,
        s.label,
        [s.value, s.unit].filter(Boolean).join(" "),
        "",
        "",
        "",
      ]);
    }
  }

  for (const p of pieces) {
    if (p.isVerified) continue;
    lignes.push([
      `piece:${p.id}`,
      "fourniture",
      p.name,
      `référence de commande (n° ${p.positionNumber ?? "?"})`,
      p.orderReference ?? "",
      "",
      "",
      "",
    ]);
  }

  for (const l of lubrifiants) {
    if (l.isVerified) continue;
    lignes.push([
      `huile:${l.id}:viscosite`,
      "lubrifiant",
      `${l.brand} ${l.reference}`,
      "viscosité",
      l.viscosity ?? "",
      "",
      "",
      "",
    ]);
    lignes.push([
      `huile:${l.id}:usage`,
      "lubrifiant",
      `${l.brand} ${l.reference}`,
      "usage",
      l.usage ?? "",
      "",
      "",
      "",
    ]);
  }

  const csv = "﻿" + lignes.map((l) => l.map(champ).join(";")).join("\r\n");
  const jour = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cronostic-a-attester-${jour}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
