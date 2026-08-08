/**
 * Magasin en mémoire utilisé UNIQUEMENT quand `DATABASE_URL` est absente.
 *
 * Il permet de dérouler l'intégralité du parcours (catalogue, achat simulé,
 * abonnement simulé, back-office) sans aucun compte externe. Les données sont
 * volatiles : elles disparaissent au redémarrage du serveur. Dès que Neon est
 * branché, ce module n'est plus jamais sollicité.
 */

import { CALIBERS, GUIDES, LUBRICANTS, PARTS, TOOLS } from "@/data/catalog";
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
  favorites: { userId: string; entityType: string; entityId: string }[];
};

const globalForStore = globalThis as unknown as { __cronosticDemoStore?: Store };

function caliberIdFor(slug: string) {
  return `cal_${slug}`;
}

function buildGuides(): GuideRow[] {
  return GUIDES.map((g) => {
    const caliber = CALIBERS.find((c) => c.slug === g.caliberSlug)!;
    return {
      id: `gid_${g.slug}`,
      caliberId: caliberIdFor(caliber.slug),
      caliberSlug: caliber.slug,
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
}

export function store(): Store {
  if (!globalForStore.__cronosticDemoStore) {
    globalForStore.__cronosticDemoStore = {
      guides: buildGuides(),
      users: [],
      purchases: [],
      subscriptions: [],
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
