/**
 * Lecture d'un CSV rempli dans un tableur.
 *
 * Écrit à la main plutôt qu'emprunté à une bibliothèque : le besoin tient en
 * trente lignes, et une dépendance de plus dans un projet qui en compte peu
 * se paierait à chaque mise à jour. Ce qui compte ici, ce sont les
 * particularités des tableurs francophones, qu'une bibliothèque générique ne
 * traite pas mieux :
 *
 *   — le séparateur est le point-virgule, et non la virgule ;
 *   — Excel écrit un BOM en tête, qu'il faut retirer sous peine de ne jamais
 *     reconnaître la première colonne ;
 *   — les fins de ligne peuvent être CRLF, LF ou CR selon la machine ;
 *   — un champ encadré de guillemets peut contenir séparateur et sauts de
 *     ligne, les guillemets internes étant doublés.
 */

export type LigneCsv = Record<string, string>;

/** Découpe une source CSV en lignes de champs, guillemets respectés. */
function decouper(source: string, separateur: string): string[][] {
  const lignes: string[][] = [];
  let champs: string[] = [];
  let courant = "";
  let entreGuillemets = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];

    if (entreGuillemets) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          courant += '"';
          i++;
        } else {
          entreGuillemets = false;
        }
      } else {
        courant += c;
      }
      continue;
    }

    if (c === '"') {
      entreGuillemets = true;
    } else if (c === separateur) {
      champs.push(courant);
      courant = "";
    } else if (c === "\n" || c === "\r") {
      // CRLF compte pour une seule fin de ligne.
      if (c === "\r" && source[i + 1] === "\n") i++;
      champs.push(courant);
      courant = "";
      lignes.push(champs);
      champs = [];
    } else {
      courant += c;
    }
  }

  if (courant !== "" || champs.length > 0) {
    champs.push(courant);
    lignes.push(champs);
  }

  return lignes.filter((l) => l.some((c) => c.trim() !== ""));
}

/**
 * Analyse un CSV et renvoie une ligne par enregistrement, indexée par
 * l'en-tête. Le séparateur est déduit de la première ligne : point-virgule
 * s'il y en a plus que de virgules, virgule sinon — un fichier réenregistré
 * en anglais reste lisible.
 */
export function lireCsv(source: string): LigneCsv[] {
  const texte = source.replace(/^﻿/, "");
  const premiere = texte.split(/\r\n|\n|\r/)[0] ?? "";
  const separateur =
    (premiere.match(/;/g)?.length ?? 0) >= (premiere.match(/,/g)?.length ?? 0) ? ";" : ",";

  const lignes = decouper(texte, separateur);
  if (lignes.length < 2) return [];

  const entete = lignes[0].map((c) => c.trim().toLowerCase());
  return lignes.slice(1).map((champs) => {
    const ligne: LigneCsv = {};
    entete.forEach((nom, i) => {
      ligne[nom] = (champs[i] ?? "").trim();
    });
    return ligne;
  });
}
