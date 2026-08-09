import "server-only";

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * PDF déposés directement dans le dépôt, sous `guides-pdf/`.
 *
 * Ce dossier est **hors de `public/`** : rien n'y est servi statiquement. Les
 * fichiers ne sortent que par `/api/guides/[guideId]/download`, après
 * vérification de la session puis du droit. Poser un PDF dans le dépôt ne le
 * rend donc pas téléchargeable sans achat.
 *
 * C'est la voie la plus courte pour rattacher les guides : ni base de données,
 * ni compte Cloudflare. Cloudflare R2 reste préférable en production — les
 * fichiers ne pèsent alors plus sur le dépôt ni sur chaque déploiement — et
 * prend automatiquement le pas dès qu'un PDF est téléversé depuis le
 * back-office.
 *
 * Nommage : le fichier doit contenir le slug du calibre. `omega-265.pdf` comme
 * `Cronostic_Omega_265_manuel_de_service.pdf` conviennent tous deux.
 */

const RACINE = path.join(process.cwd(), "guides-pdf");

/** Chemin du PDF présent dans le dépôt pour ce calibre, s'il existe. */
export function pdfDuDepot(caliberSlug: string): string | null {
  const attendu = path.join(RACINE, `${caliberSlug}.pdf`);
  if (existsSync(attendu)) return attendu;

  if (!existsSync(RACINE)) return null;

  // Les fichiers livrés portent souvent un nom complet —
  // « Cronostic_Omega_265_manuel_de_service.pdf ». On accepte donc tout nom
  // qui contient le slug, séparateurs libres, à condition qu'il soit délimité :
  // « omega-265 » ne doit pas se reconnaître dans « omega-2650 ».
  const motif = new RegExp(
    `(^|[^a-z0-9])${caliberSlug.split("-").join("[^a-z0-9]*")}([^a-z0-9]|$)`,
    "i",
  );
  const candidats = readdirSync(RACINE).filter(
    (f) => f.toLowerCase().endsWith(".pdf") && motif.test(path.basename(f, ".pdf")),
  );
  // Ambiguïté : deux fichiers pour un même calibre, on ne devine pas.
  if (candidats.length !== 1) return null;
  return path.join(RACINE, candidats[0]);
}

export function aUnPdfDansLeDepot(caliberSlug: string): boolean {
  return pdfDuDepot(caliberSlug) !== null;
}

/**
 * Parmi les slugs proposés, ceux dont le PDF est déjà présent dans le dépôt.
 *
 * C'est le mécanisme qui rend une fiche vendeuse sans rien saisir : on dépose
 * `Cronostic_Valjoux_7733_manuel_de_service.pdf`, la fiche du 7733 porte un
 * guide au redémarrage suivant. Le balayage se fait une seule fois, sur la
 * liste des fichiers lue une seule fois — pas un accès disque par calibre.
 */
export function calibresAvecPdf(slugs: string[]): string[] {
  if (!existsSync(RACINE)) return [];
  const fichiers = readdirSync(RACINE)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.basename(f, ".pdf").toLowerCase());
  if (fichiers.length === 0) return [];

  return slugs.filter((slug) => {
    const motif = new RegExp(
      `(^|[^a-z0-9])${slug.split("-").join("[^a-z0-9]*")}([^a-z0-9]|$)`,
      "i",
    );
    return fichiers.filter((f) => motif.test(f)).length === 1;
  });
}

/** Fichiers PDF présents dans le dépôt. */
export function pdfDisponibles(): string[] {
  if (!existsSync(RACINE)) return [];
  return readdirSync(RACINE).filter((f) => f.toLowerCase().endsWith(".pdf"));
}
