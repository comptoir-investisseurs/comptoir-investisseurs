import "server-only";

import { listCalibers, listGuides, listLubricants, listParts, listTools } from "./repo";
import { construireIndex, type EntreeIndex } from "./search";

/**
 * Construit l'index de recherche à partir du dépôt. Appelé par les pages qui
 * affichent le champ de recherche ; le résultat est sérialisé vers le client.
 */
export async function indexDeRecherche(): Promise<EntreeIndex[]> {
  const [calibers, guides, parts, lubricants, tools] = await Promise.all([
    listCalibers(),
    listGuides({ activeOnly: true }),
    listParts(),
    listLubricants(),
    listTools(),
  ]);
  return construireIndex({ calibers, guides, parts, lubricants, tools });
}
