import "server-only";

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Photographies déposées dans `public/photos/`.
 *
 * Aucune configuration : le contenu du dossier est lu au moment du rendu.
 * Déposer un fichier suffit à le faire apparaître, en retirer un suffit à le
 * faire disparaître — le site retombe alors proprement sur une mise en page
 * sans image.
 *
 * Conventions de nommage :
 *   photos/hero.*            → ouverture de la page d'accueil
 *   photos/mouvement-*.*     → filets d'illustration en marge des autres pages
 *
 * La charte proscrit la photographie décorative sans fonction technique :
 * chaque image porte donc une légende, et les illustrations de marge ne
 * s'affichent qu'en grand écran, où elles n'entrent pas en concurrence avec le
 * contenu.
 */

const RACINE = path.join(process.cwd(), "public", "photos");
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

export type Photo = { src: string; legende: string };

function fichiers(): string[] {
  if (!existsSync(RACINE)) return [];
  return readdirSync(RACINE)
    .filter((f) => EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();
}

/** Photo d'ouverture. Le premier fichier commençant par « hero », sinon rien. */
export function heroPhoto(): Photo | null {
  const f =
    fichiers().find((n) => n.toLowerCase().startsWith("hero")) ??
    fichiers().find((n) => n.toLowerCase().includes("omega")) ??
    null;
  return f ? { src: `/photos/${f}`, legende: legendeDepuisNom(f) } : null;
}

/** Illustrations de marge, dans l'ordre du dossier. */
export function mouvementPhotos(): Photo[] {
  return fichiers()
    .filter((n) => n.toLowerCase().startsWith("mouvement"))
    .map((f) => ({ src: `/photos/${f}`, legende: legendeDepuisNom(f) }));
}

/** Choisit une illustration de façon stable pour une clé donnée. */
export function mouvementPour(cle: string): Photo | null {
  const photos = mouvementPhotos();
  if (photos.length === 0) return null;
  let somme = 0;
  for (const c of cle) somme = (somme + c.charCodeAt(0)) % 9973;
  return photos[somme % photos.length];
}

/**
 * `mouvement-omega-266-cote-ponts.jpg` → « Omega 266, côté ponts ».
 * Le nom du fichier porte la légende : pas de table à tenir à jour.
 */
function legendeDepuisNom(fichier: string): string {
  const base = path
    .basename(fichier, path.extname(fichier))
    .replace(/^(hero|mouvement)[-_]?/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!base) return "Mouvement horloger";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
