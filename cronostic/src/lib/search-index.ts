import "server-only";

import {
  listCalibers,
  listCalibresEncyclopedie,
  listGuides,
  listLubricants,
  listParts,
  listTools,
} from "./repo";
import { MARQUES } from "@/data/encyclopedie";
import { construireIndex, type EntreeIndex } from "./search";

/**
 * Index réduit, embarqué dans les pages : calibres documentés, guides, marques
 * et pages du site. Quelques kilo-octets, disponibles à la première frappe.
 *
 * Le reste — les centaines de fiches d'amorce, les fournitures, les huiles —
 * arrive par `/api/recherche` dès que le champ prend le curseur. C'est
 * imperceptible à l'usage et cela épargne deux cents kilo-octets à chaque
 * chargement de page, y compris pour les visiteurs qui ne cherchent rien.
 */
export async function indexReduit(): Promise<EntreeIndex[]> {
  const [documentes, guides] = await Promise.all([
    listCalibers(),
    listGuides({ activeOnly: true }),
  ]);

  return construireIndex({
    calibers: documentes,
    guides,
    parts: [],
    lubricants: [],
    tools: [],
    marques: MARQUES.map((m) => ({
      slug: m.slug,
      nom: m.nom,
      pays: m.pays,
      nombre: m.mouvements.length,
      resume: "",
    })),
  });
}

/**
 * Index complet, servi par `/api/recherche`.
 */
export async function indexDeRecherche(): Promise<EntreeIndex[]> {
  const [documentes, encyclopedie, guides, parts, lubricants, tools] = await Promise.all([
    listCalibers(),
    listCalibresEncyclopedie(),
    listGuides({ activeOnly: true }),
    listParts(),
    listLubricants(),
    listTools(),
  ]);

  // Les calibres documentés d'abord : à référence égale, c'est la fiche
  // complète qu'il faut proposer, pas l'amorce.
  const calibers = [...documentes, ...encyclopedie];

  return construireIndex({
    calibers,
    guides,
    parts,
    lubricants,
    tools,
    marques: MARQUES.map((m) => ({
      slug: m.slug,
      nom: m.nom,
      pays: m.pays,
      nombre: m.mouvements.length,
      resume: m.resume,
    })),
  });
}
