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
 * Nommage : `guides-pdf/<slug-du-calibre>.pdf`, par exemple `omega-265.pdf`.
 */

const RACINE = path.join(process.cwd(), "guides-pdf");

/** Chemin du PDF présent dans le dépôt pour ce calibre, s'il existe. */
export function pdfDuDepot(caliberSlug: string): string | null {
  const attendu = path.join(RACINE, `${caliberSlug}.pdf`);
  if (existsSync(attendu)) return attendu;

  // Tolérance sur la casse et les séparateurs, pour éviter qu'un fichier
  // nommé « Omega_265.pdf » passe inaperçu.
  if (!existsSync(RACINE)) return null;
  const normalise = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cible = normalise(caliberSlug);
  const trouve = readdirSync(RACINE).find(
    (f) => f.toLowerCase().endsWith(".pdf") && normalise(path.basename(f, ".pdf")) === cible,
  );
  return trouve ? path.join(RACINE, trouve) : null;
}

export function aUnPdfDansLeDepot(caliberSlug: string): boolean {
  return pdfDuDepot(caliberSlug) !== null;
}

/** Slugs de calibres pour lesquels un PDF est présent dans le dépôt. */
export function calibresAvecPdf(): string[] {
  if (!existsSync(RACINE)) return [];
  return readdirSync(RACINE)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.basename(f, path.extname(f)));
}
