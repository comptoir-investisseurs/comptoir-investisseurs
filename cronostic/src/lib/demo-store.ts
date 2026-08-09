/**
 * Magasin en mémoire utilisé UNIQUEMENT quand `DATABASE_URL` est absente.
 *
 * Il permet de dérouler l'intégralité du parcours (catalogue, achat simulé,
 * abonnement simulé, back-office) sans aucun compte externe. Les données sont
 * volatiles : elles disparaissent au redémarrage du serveur. Dès que Neon est
 * branché, ce module n'est plus jamais sollicité.
 */

import { CALIBERS, GUIDES, LUBRICANTS, PARTS, TOOLS } from "@/data/catalog";
import { sommairesEncyclopedie } from "./encyclopedie";
import { calibresAvecPdf } from "./guide-files";
import type {
  AppUser,
  GuideRow,
  LubricantRow,
  PartRow,
  PurchaseRow,
  SubscriptionRow,
  ToolRow,
} from "./types";

type Store = {
  guides: GuideRow[];
  users: AppUser[];
  purchases: PurchaseRow[];
  subscriptions: SubscriptionRow[];
  unlocks: { userId: string; guideId: string; periodStart: Date }[];
  favorites: { userId: string; entityType: string; entityId: string }[];
};

const globalForStore = globalThis as unknown as { __cronosticDemoStore?: Store };

function caliberIdFor(slug: string) {
  return `cal_${slug}`;
}

/**
 * Fiches guides créées d'office pour les calibres de l'encyclopédie dont le
 * PDF est déjà dans le dépôt.
 *
 * C'est ce qui rend une fiche d'amorce vendeuse sans rien saisir : déposer
 * `Cronostic_Valjoux_7733_manuel_de_service.pdf` suffit à faire apparaître le
 * guide sur la fiche du 7733, en brouillon — la publication reste un geste
 * volontaire depuis le back-office.
 */
function guidesDepuisLeDepot(deja: Set<string>): GuideRow[] {
  const fiches = sommairesEncyclopedie().filter((c) => !deja.has(c.slug));
  const avecPdf = new Set(calibresAvecPdf(fiches.map((c) => c.slug)));

  return fiches
    .filter((c) => avecPdf.has(c.slug))
    .map((c) => ({
      id: `gid_guide-${c.slug}`,
      caliberId: c.id,
      caliberSlug: c.slug,
      caliberBrand: c.brand,
      caliberReference: c.reference,
      caliberName: c.name,
      title: `${c.brand.toUpperCase()} ${c.reference} — Guide complet d'entretien`,
      slug: `guide-${c.slug}`,
      shortDescription: `Le guide d'atelier Cronostic consacré au calibre ${c.brand} ${c.reference} : démontage, nettoyage, contrôle, lubrification, remontage et points de vigilance.`,
      priceCents: 1490,
      currency: "EUR",
      r2FileKey: null,
      coverImageUrl: null,
      previewFileKey: null,
      pageCount: null,
      includedInSubscription: true,
      // Un PDF déposé ne se met pas en vente tout seul : l'admin publie.
      isActive: false,
    }));
}

function buildGuides(): GuideRow[] {
  const seeds = GUIDES.map((g) => {
    const caliber = CALIBERS.find((c) => c.slug === g.caliberSlug)!;
    return {
      id: `gid_${g.slug}`,
      caliberId: caliberIdFor(caliber.slug),
      caliberSlug: caliber.slug,
      caliberBrand: "Omega",
      caliberReference: caliber.reference,
      caliberName: caliber.name,
      title: g.title,
      slug: g.slug,
      shortDescription: g.shortDescription,
      priceCents: g.priceCents,
      currency: "EUR",
      r2FileKey: null,
      coverImageUrl: null,
      previewFileKey: null,
      pageCount: g.pageCount,
      includedInSubscription: g.includedInSubscription,
      isActive: g.isActive,
    } satisfies GuideRow;
  });

  return [...seeds, ...guidesDepuisLeDepot(new Set(seeds.map((g) => g.caliberSlug)))];
}

export function store(): Store {
  if (!globalForStore.__cronosticDemoStore) {
    globalForStore.__cronosticDemoStore = {
      guides: buildGuides(),
      users: [],
      purchases: [],
      subscriptions: [],
      unlocks: [],
      favorites: [],
    };
  }
  return globalForStore.__cronosticDemoStore;
}

export const demoParts: PartRow[] = PARTS.map((p) => ({
  id: `part_${p.reference}`,
  reference: p.reference,
  positionNumber: p.positionNumber,
  name: p.name,
  nameEn: p.nameEn,
  category: p.category,
  description: p.description ?? null,
}));

export const demoLubricants: LubricantRow[] = LUBRICANTS.map((l) => ({
  id: `lub_${l.slug}`,
  slug: l.slug,
  brand: l.brand,
  reference: l.reference,
  name: l.name,
  type: l.type,
  viscosity: l.viscosity ?? null,
  usage: l.usage,
  colorHex: l.colorHex,
}));

export const demoTools: ToolRow[] = TOOLS.map((t) => ({
  id: `tool_${t.slug}`,
  slug: t.slug,
  name: t.name,
  category: t.category,
  description: t.description,
}));

export { caliberIdFor };
