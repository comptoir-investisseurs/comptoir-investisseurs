import { MARQUES, LIBELLES_TYPE, type Marque, type Mvt } from "@/data/encyclopedie";
import { CALIBERS } from "@/data/catalog";
import { slugify } from "./format";
import type { CaliberDetail, CaliberSummary, SpecRow } from "./types";

/**
 * Passerelle entre l'encyclopédie des marques et le modèle de calibre du site.
 *
 * Deux niveaux de fiche cohabitent, volontairement :
 *
 *   — les calibres **détaillés** de `catalog.ts` : présentation, histoire,
 *     architecture, nomenclature, lubrification. Ce sont ceux qui portent un
 *     guide, et ils l'emportent toujours sur l'encyclopédie ;
 *   — les fiches **d'amorce** de l'encyclopédie : référence, marque, période,
 *     type et repères dimensionnels. Rien d'inventé, rien de vérifié non plus.
 *
 * Le second se complète au fil des relectures d'atelier et rejoint le premier
 * quand la fiche est prête. C'est pourquoi tout arrive ici en `draft` : le
 * repère ◆ s'affiche partout tant que la valeur n'a pas été relevée.
 */

/** Slug d'un mouvement : `marque-reference`, sans surprise. */
export function slugMouvement(marque: Marque, m: Mvt): string {
  return `${marque.slug}-${slugify(m.ref)}`;
}

/** Slugs des calibres qui disposent d'une fiche détaillée dans catalog.ts. */
const SLUGS_DETAILLES = new Set(CALIBERS.map((c) => c.slug));

function resumeMouvement(marque: Marque, m: Mvt): string {
  const morceaux: string[] = [];
  morceaux.push(m.nom ?? LIBELLES_TYPE[m.type]);
  if (m.base) morceaux.push(`base ${m.base}`);
  const periode = m.debut && m.fin ? `${m.debut}–${m.fin}` : m.debut ? `à partir de ${m.debut}` : null;
  if (periode) morceaux.push(periode);
  return `${marque.nom} — ${morceaux.join(", ")}.`;
}

export function sommaireDe(marque: Marque, m: Mvt): CaliberSummary {
  return {
    id: `enc_${slugMouvement(marque, m)}`,
    slug: slugMouvement(marque, m),
    brand: marque.nom,
    reference: m.ref,
    name: m.nom ? `${marque.nom} ${m.ref} — ${m.nom}` : `${marque.nom} calibre ${m.ref}`,
    familyName: null,
    introducedYear: m.debut ?? null,
    discontinuedYear: m.fin ?? null,
    summary: resumeMouvement(marque, m),
    dataStatus: "draft",
    isPublished: true,
  };
}

/** Toutes les fiches d'amorce, hors calibres déjà documentés en détail. */
export function sommairesEncyclopedie(): CaliberSummary[] {
  const vus = new Set<string>();
  const sommaires: CaliberSummary[] = [];
  for (const marque of MARQUES) {
    for (const m of marque.mouvements) {
      const slug = slugMouvement(marque, m);
      if (SLUGS_DETAILLES.has(slug) || vus.has(slug)) continue;
      vus.add(slug);
      sommaires.push(sommaireDe(marque, m));
    }
  }
  return sommaires;
}

/** Retrouve le mouvement et sa marque à partir d'un slug. */
export function trouverMouvement(slug: string): { marque: Marque; mvt: Mvt } | null {
  for (const marque of MARQUES) {
    for (const m of marque.mouvements) {
      if (slugMouvement(marque, m) === slug) return { marque, mvt: m };
    }
  }
  return null;
}

export function trouverMarque(slug: string): Marque | null {
  return MARQUES.find((m) => m.slug === slug) ?? null;
}

/**
 * Caractéristiques d'une fiche d'amorce. Aucune n'est vérifiée : elles
 * s'affichent toutes avec le repère ◆.
 */
export function specsDe(m: Mvt): SpecRow[] {
  const specs: SpecRow[] = [];
  const ajouter = (key: string, label: string, value: string | null, unit: string | null = null) => {
    if (value === null || value === "") return;
    specs.push({ key, label, value, unit, isVerified: false });
  };

  ajouter("type", "Type", LIBELLES_TYPE[m.type]);
  if (m.l !== undefined) ajouter("lignes", "Taille", String(m.l).replace(".", ","), "lignes");
  if (m.d !== undefined) ajouter("diametre", "Diamètre", String(m.d).replace(".", ","), "mm");
  if (m.h !== undefined) ajouter("hauteur", "Hauteur", String(m.h).replace(".", ","), "mm");
  if (m.r !== undefined) ajouter("rubis", "Rubis", String(m.r));
  if (m.a !== undefined)
    ajouter("frequence", "Fréquence", m.a.toLocaleString("fr-FR"), "A/h");
  if (m.a !== undefined) ajouter("hertz", "Soit", (m.a / 7200).toString().replace(".", ","), "Hz");
  if (m.res !== undefined) ajouter("reserve", "Réserve de marche", String(m.res), "h");
  ajouter("debut", "Introduction", m.debut ? String(m.debut) : null);
  ajouter("fin", "Fin de production", m.fin ? String(m.fin) : null);
  ajouter("base", "Ébauche d'origine", m.base ?? null);
  return specs;
}

/**
 * Fiche détaillée d'amorce. Volontairement pauvre : ni nomenclature, ni points
 * de lubrification, ni outillage — les inventer serait pire que de ne rien
 * afficher. La page l'annonce clairement au lecteur.
 */
export function detailDe(marque: Marque, m: Mvt): CaliberDetail {
  const sommaire = sommaireDe(marque, m);
  const memeMarque = marque.mouvements
    .filter((x) => x.ref !== m.ref)
    .slice(0, 8)
    .map((x) => sommaireDe(marque, x));

  return {
    ...sommaire,
    presentation: m.note ?? null,
    history: null,
    architecture: null,
    specs: specsDe(m),
    parts: [],
    lubrication: [],
    tools: [],
    related: memeMarque,
  };
}

/** Nombre de mouvements documentés, marque par marque. */
export function compterParMarque(): Record<string, number> {
  const compte: Record<string, number> = {};
  for (const marque of MARQUES) compte[marque.slug] = marque.mouvements.length;
  return compte;
}

export function totalMouvements(): number {
  return MARQUES.reduce((s, m) => s + m.mouvements.length, 0);
}
