import "server-only";

import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { CALIBERS, FAMILIES } from "@/data/catalog";
import { getDb, hasDatabase, schema } from "@/db";
import { caliberIdFor, demoLubricants, demoParts, demoTools, store } from "./demo-store";
import { detailDe, sommairesEncyclopedie, trouverMouvement } from "./encyclopedie";
import type {
  AppUser,
  CaliberDetail,
  CaliberSummary,
  GuideRow,
  LubricantRow,
  PartRow,
  PurchaseRow,
  SpecRow,
  SubscriptionRow,
  ToolRow,
} from "./types";

/* ────────────────────────────────────────────────────────────
   Mode démo
   ──────────────────────────────────────────────────────────── */

export const usingDatabase = hasDatabase;

function demoCaliberSummary(slug: string): CaliberSummary | null {
  const c = CALIBERS.find((x) => x.slug === slug);
  if (!c) return null;
  const family = FAMILIES.find((f) => f.slug === c.family);
  return {
    id: caliberIdFor(c.slug),
    slug: c.slug,
    brand: "Omega",
    reference: c.reference,
    name: c.name,
    familyName: family?.name ?? null,
    introducedYear: c.introducedYear ?? null,
    discontinuedYear: c.discontinuedYear ?? null,
    summary: c.summary,
    dataStatus: "draft",
    isPublished: true,
  };
}

/* ────────────────────────────────────────────────────────────
   Calibres
   ──────────────────────────────────────────────────────────── */

export async function listCalibers(): Promise<CaliberSummary[]> {
  if (!hasDatabase()) {
    return CALIBERS.map((c) => demoCaliberSummary(c.slug)!).filter(Boolean);
  }

  const db = getDb();
  const rows = await db
    .select({
      id: schema.calibers.id,
      slug: schema.calibers.slug,
      brand: schema.calibers.brand,
      reference: schema.calibers.reference,
      name: schema.calibers.name,
      familyName: schema.caliberFamilies.name,
      introducedYear: schema.calibers.introducedYear,
      discontinuedYear: schema.calibers.discontinuedYear,
      summary: schema.calibers.summary,
      dataStatus: schema.calibers.dataStatus,
      isPublished: schema.calibers.isPublished,
    })
    .from(schema.calibers)
    .leftJoin(schema.caliberFamilies, eq(schema.calibers.familyId, schema.caliberFamilies.id))
    .where(eq(schema.calibers.isPublished, true))
    .orderBy(asc(schema.calibers.introducedYear), asc(schema.calibers.reference));

  return rows as CaliberSummary[];
}

/**
 * Fiches d'amorce de l'encyclopédie : toutes les marques, tous les mouvements.
 *
 * Séparée de `listCalibers()` à dessein. La première renvoie les calibres
 * documentés en détail — ceux qui portent un guide, et qui alimentent le pied
 * de page, l'accueil et le back-office. Celle-ci renvoie les centaines de
 * fiches d'amorce, qui n'ont vocation qu'à peupler l'encyclopédie et la
 * recherche.
 */
export async function listCalibresEncyclopedie(): Promise<CaliberSummary[]> {
  return sommairesEncyclopedie();
}

/**
 * Tous les calibres, documentés et fiches d'amorce confondus.
 *
 * C'est la liste qu'il faut partout où un calibre doit pouvoir **recevoir**
 * quelque chose : rattachement d'un guide au back-office, résolution d'un
 * identifiant. Les listes d'affichage, elles, continuent de s'appuyer sur
 * `listCalibers()`, qui ne renvoie que les fiches complètes.
 */
export async function listCalibresTous(): Promise<CaliberSummary[]> {
  const [documentes, encyclopedie] = await Promise.all([
    listCalibers(),
    listCalibresEncyclopedie(),
  ]);
  return [...documentes, ...encyclopedie];
}

/** Retrouve un calibre par son identifiant, quelle que soit son origine. */
export async function getCaliberById(id: string): Promise<CaliberSummary | null> {
  return (await listCalibresTous()).find((c) => c.id === id) ?? null;
}

export async function getCaliberBySlug(slug: string): Promise<CaliberDetail | null> {
  if (!hasDatabase()) {
    const seed = CALIBERS.find((c) => c.slug === slug);
    const summary = demoCaliberSummary(slug);
    if (!seed || !summary) {
      // Pas de fiche détaillée : l'encyclopédie prend le relais.
      const trouve = trouverMouvement(slug);
      return trouve ? detailDe(trouve.marque, trouve.mvt) : null;
    }

    return {
      ...summary,
      presentation: seed.presentation,
      history: seed.history,
      architecture: seed.architecture,
      specs: seed.specs.map((s) => ({
        key: s.key,
        label: s.label,
        value: s.value,
        unit: s.unit ?? null,
        isVerified: s.verified ?? false,
      })),
      parts: demoParts.filter((p) => seed.parts.includes(p.reference)),
      lubrication: seed.lubrication.map((lp, i) => ({
        id: `lp_${slug}_${i}`,
        location: lp.location,
        quantity: lp.quantity ?? null,
        notes: lp.notes ?? null,
        lubricant: demoLubricants.find((l) => l.slug === lp.lubricant) ?? null,
      })),
      tools: demoTools.filter((t) => seed.tools.includes(t.slug)),
      related: seed.related.map((s) => demoCaliberSummary(s)).filter(Boolean) as CaliberSummary[],
    };
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: schema.calibers.id,
      slug: schema.calibers.slug,
      brand: schema.calibers.brand,
      reference: schema.calibers.reference,
      name: schema.calibers.name,
      familyName: schema.caliberFamilies.name,
      introducedYear: schema.calibers.introducedYear,
      discontinuedYear: schema.calibers.discontinuedYear,
      summary: schema.calibers.summary,
      presentation: schema.calibers.presentation,
      history: schema.calibers.history,
      architecture: schema.calibers.architecture,
      dataStatus: schema.calibers.dataStatus,
      isPublished: schema.calibers.isPublished,
    })
    .from(schema.calibers)
    .leftJoin(schema.caliberFamilies, eq(schema.calibers.familyId, schema.caliberFamilies.id))
    .where(eq(schema.calibers.slug, slug))
    .limit(1);

  if (!row) {
    // Même repli qu'en mode démo : une fiche d'amorce vaut mieux qu'un 404.
    const trouve = trouverMouvement(slug);
    return trouve ? detailDe(trouve.marque, trouve.mvt) : null;
  }

  const [specs, parts, lubrication, tools, related] = await Promise.all([
    db
      .select()
      .from(schema.caliberSpecs)
      .where(eq(schema.caliberSpecs.caliberId, row.id))
      .orderBy(asc(schema.caliberSpecs.position)),
    db
      .select({
        id: schema.parts.id,
        reference: schema.parts.reference,
        positionNumber: schema.partCalibers.positionNumber,
        name: schema.parts.name,
        nameEn: schema.parts.nameEn,
        category: schema.parts.category,
        description: schema.parts.description,
        orderReference: schema.parts.orderReference,
        isVerified: schema.parts.isVerified,
        source: schema.parts.source,
      })
      .from(schema.partCalibers)
      .innerJoin(schema.parts, eq(schema.partCalibers.partId, schema.parts.id))
      .where(eq(schema.partCalibers.caliberId, row.id))
      .orderBy(asc(schema.partCalibers.positionNumber)),
    db
      .select({
        id: schema.caliberLubricationPoints.id,
        location: schema.caliberLubricationPoints.location,
        quantity: schema.caliberLubricationPoints.quantity,
        notes: schema.caliberLubricationPoints.notes,
        lubricant: schema.lubricants,
      })
      .from(schema.caliberLubricationPoints)
      .leftJoin(
        schema.lubricants,
        eq(schema.caliberLubricationPoints.lubricantId, schema.lubricants.id),
      )
      .where(eq(schema.caliberLubricationPoints.caliberId, row.id))
      .orderBy(asc(schema.caliberLubricationPoints.position)),
    db
      .select({
        id: schema.tools.id,
        slug: schema.tools.slug,
        name: schema.tools.name,
        category: schema.tools.category,
        description: schema.tools.description,
      })
      .from(schema.caliberTools)
      .innerJoin(schema.tools, eq(schema.caliberTools.toolId, schema.tools.id))
      .where(eq(schema.caliberTools.caliberId, row.id)),
    db
      .select({
        id: schema.calibers.id,
        slug: schema.calibers.slug,
        brand: schema.calibers.brand,
        reference: schema.calibers.reference,
        name: schema.calibers.name,
        familyName: sql<string | null>`null`,
        introducedYear: schema.calibers.introducedYear,
        discontinuedYear: schema.calibers.discontinuedYear,
        summary: schema.calibers.summary,
        dataStatus: schema.calibers.dataStatus,
        isPublished: schema.calibers.isPublished,
      })
      .from(schema.caliberRelations)
      .innerJoin(schema.calibers, eq(schema.caliberRelations.relatedCaliberId, schema.calibers.id))
      .where(eq(schema.caliberRelations.caliberId, row.id))
      .orderBy(asc(schema.calibers.reference)),
  ]);

  return {
    ...(row as CaliberSummary & {
      presentation: string | null;
      history: string | null;
      architecture: string | null;
    }),
    specs: specs.map((s) => ({
      key: s.key,
      label: s.label,
      value: s.value,
      unit: s.unit,
      isVerified: s.isVerified,
    })) satisfies SpecRow[],
    parts: parts as PartRow[],
    lubrication: lubrication.map((l) => ({
      id: l.id,
      location: l.location,
      quantity: l.quantity,
      notes: l.notes,
      lubricant: (l.lubricant as LubricantRow | null) ?? null,
    })),
    tools: tools as ToolRow[],
    related: related as CaliberSummary[],
  };
}

export async function searchCalibers(query: string): Promise<CaliberSummary[]> {
  const all = await listCalibers();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((c) =>
    [c.reference, c.name, c.slug, c.summary ?? "", c.familyName ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

/* ────────────────────────────────────────────────────────────
   Guides
   ──────────────────────────────────────────────────────────── */

export async function listGuides(opts: { activeOnly?: boolean } = {}): Promise<GuideRow[]> {
  if (!hasDatabase()) {
    const rows = store().guides;
    return opts.activeOnly ? rows.filter((g) => g.isActive) : rows;
  }

  const db = getDb();
  const rows = await db
    .select({
      id: schema.guides.id,
      caliberId: schema.guides.caliberId,
      caliberSlug: schema.calibers.slug,
      caliberBrand: schema.calibers.brand,
      caliberReference: schema.calibers.reference,
      caliberName: schema.calibers.name,
      title: schema.guides.title,
      slug: schema.guides.slug,
      shortDescription: schema.guides.shortDescription,
      priceCents: schema.guides.priceCents,
      currency: schema.guides.currency,
      r2FileKey: schema.guides.r2FileKey,
      coverImageUrl: schema.guides.coverImageUrl,
      previewFileKey: schema.guides.previewFileKey,
      pageCount: schema.guides.pageCount,
      includedInSubscription: schema.guides.includedInSubscription,
      isActive: schema.guides.isActive,
    })
    .from(schema.guides)
    .innerJoin(schema.calibers, eq(schema.guides.caliberId, schema.calibers.id))
    .where(opts.activeOnly ? eq(schema.guides.isActive, true) : undefined)
    .orderBy(asc(schema.calibers.reference));

  return rows as GuideRow[];
}

export async function getGuideById(id: string): Promise<GuideRow | null> {
  const rows = await listGuides();
  return rows.find((g) => g.id === id) ?? null;
}

export async function getGuideForCaliber(caliberId: string): Promise<GuideRow | null> {
  const rows = (await listGuides()).filter((g) => g.caliberId === caliberId);
  // Un calibre peut porter un brouillon en préparation à côté du guide en
  // vente : c'est toujours le guide publié qui s'affiche sur la fiche.
  return rows.find((g) => g.isActive) ?? rows[0] ?? null;
}

export async function guideSalesCounts(): Promise<Record<string, number>> {
  if (!hasDatabase()) {
    const counts: Record<string, number> = {};
    for (const p of store().purchases) counts[p.guideId] = (counts[p.guideId] ?? 0) + 1;
    return counts;
  }
  const db = getDb();
  const rows = await db
    .select({ guideId: schema.purchases.guideId, total: count() })
    .from(schema.purchases)
    .groupBy(schema.purchases.guideId);
  return Object.fromEntries(rows.map((r) => [r.guideId, Number(r.total)]));
}

/* Écritures back-office ------------------------------------- */

export type GuideInput = {
  caliberId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  priceCents: number;
  pageCount: number | null;
  includedInSubscription: boolean;
  isActive: boolean;
  coverImageUrl: string | null;
};

export async function createGuide(input: GuideInput): Promise<GuideRow> {
  if (!hasDatabase()) {
    const s = store();
    // N'importe quel calibre peut porter un guide, y compris une fiche
    // d'amorce : c'est le PDF qui fait le guide, pas le niveau de la fiche.
    const caliber = await getCaliberById(input.caliberId);
    if (!caliber) throw new Error("Calibre inconnu.");
    const row: GuideRow = {
      ...input,
      id: `gid_${input.slug}`,
      caliberSlug: caliber.slug,
      caliberBrand: caliber.brand,
      caliberReference: caliber.reference,
      caliberName: caliber.name,
      currency: "EUR",
      r2FileKey: null,
      previewFileKey: null,
    };
    s.guides.push(row);
    return row;
  }

  const db = getDb();
  const [row] = await db.insert(schema.guides).values(input).returning({ id: schema.guides.id });
  return (await getGuideById(row.id))!;
}

export type GuidePatch = Partial<
  GuideInput & { r2FileKey: string | null; previewFileKey: string | null }
>;

export async function updateGuide(id: string, patch: GuidePatch) {
  if (!hasDatabase()) {
    const s = store();
    const guide = s.guides.find((g) => g.id === id);
    if (!guide) throw new Error("Guide introuvable.");
    Object.assign(guide, patch);
    if (patch.caliberId) {
      const caliber = await getCaliberById(patch.caliberId);
      if (caliber) {
        guide.caliberSlug = caliber.slug;
        guide.caliberBrand = caliber.brand;
        guide.caliberReference = caliber.reference;
        guide.caliberName = caliber.name;
      }
    }
    return;
  }
  const db = getDb();
  await db
    .update(schema.guides)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.guides.id, id));
}

export async function deleteGuide(id: string) {
  if (!hasDatabase()) {
    const s = store();
    s.guides = s.guides.filter((g) => g.id !== id);
    return;
  }
  const db = getDb();
  await db.delete(schema.guides).where(eq(schema.guides.id, id));
}

/* ────────────────────────────────────────────────────────────
   Utilisateurs
   ──────────────────────────────────────────────────────────── */

export async function ensureUser(input: {
  authId: string | null;
  email: string;
  displayName?: string | null;
}): Promise<AppUser> {
  const email = input.email.toLowerCase();

  if (!hasDatabase()) {
    const s = store();
    let user = s.users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: `usr_${s.users.length + 1}_${email.replace(/[^a-z0-9]/g, "")}`,
        email,
        displayName: input.displayName ?? null,
        role: "user",
        stripeCustomerId: null,
      };
      s.users.push(user);
    }
    return user;
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing) {
    if (input.authId && existing.authId !== input.authId) {
      await db
        .update(schema.users)
        .set({ authId: input.authId, updatedAt: new Date() })
        .where(eq(schema.users.id, existing.id));
    }
    return {
      id: existing.id,
      email: existing.email,
      displayName: existing.displayName,
      role: existing.role === "admin" ? "admin" : "user",
      stripeCustomerId: existing.stripeCustomerId,
    };
  }

  const [created] = await db
    .insert(schema.users)
    .values({ authId: input.authId, email, displayName: input.displayName ?? null })
    .returning();

  return {
    id: created.id,
    email: created.email,
    displayName: created.displayName,
    role: created.role === "admin" ? "admin" : "user",
    stripeCustomerId: created.stripeCustomerId,
  };
}

export async function listUsers(): Promise<(AppUser & { createdAt: Date | null })[]> {
  if (!hasDatabase()) {
    return store().users.map((u) => ({ ...u, createdAt: null }));
  }
  const db = getDb();
  const rows = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(200);
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role === "admin" ? "admin" : "user",
    stripeCustomerId: u.stripeCustomerId,
    createdAt: u.createdAt,
  }));
}

export async function setUserStripeCustomer(userId: string, customerId: string) {
  if (!hasDatabase()) {
    const user = store().users.find((u) => u.id === userId);
    if (user) user.stripeCustomerId = customerId;
    return;
  }
  const db = getDb();
  await db
    .update(schema.users)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

export async function findUserByStripeCustomer(customerId: string): Promise<AppUser | null> {
  if (!hasDatabase()) {
    return store().users.find((u) => u.stripeCustomerId === customerId) ?? null;
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.stripeCustomerId, customerId))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role === "admin" ? "admin" : "user",
    stripeCustomerId: row.stripeCustomerId,
  };
}

export async function findUserById(id: string): Promise<AppUser | null> {
  if (!hasDatabase()) return store().users.find((u) => u.id === id) ?? null;
  const db = getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role === "admin" ? "admin" : "user",
    stripeCustomerId: row.stripeCustomerId,
  };
}

/* ────────────────────────────────────────────────────────────
   Achats
   ──────────────────────────────────────────────────────────── */

export async function listPurchasesForUser(userId: string): Promise<PurchaseRow[]> {
  if (!hasDatabase()) return store().purchases.filter((p) => p.userId === userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.purchases)
    .where(eq(schema.purchases.userId, userId))
    .orderBy(desc(schema.purchases.purchasedAt));
  return rows as PurchaseRow[];
}

export async function listAllPurchases(): Promise<
  (PurchaseRow & { userEmail: string; guideTitle: string })[]
> {
  if (!hasDatabase()) {
    const s = store();
    return s.purchases.map((p) => ({
      ...p,
      userEmail: s.users.find((u) => u.id === p.userId)?.email ?? "—",
      guideTitle: s.guides.find((g) => g.id === p.guideId)?.title ?? "—",
    }));
  }
  const db = getDb();
  const rows = await db
    .select({
      id: schema.purchases.id,
      userId: schema.purchases.userId,
      guideId: schema.purchases.guideId,
      amountCents: schema.purchases.amountCents,
      currency: schema.purchases.currency,
      purchasedAt: schema.purchases.purchasedAt,
      userEmail: schema.users.email,
      guideTitle: schema.guides.title,
    })
    .from(schema.purchases)
    .innerJoin(schema.users, eq(schema.purchases.userId, schema.users.id))
    .innerJoin(schema.guides, eq(schema.purchases.guideId, schema.guides.id))
    .orderBy(desc(schema.purchases.purchasedAt))
    .limit(200);
  return rows;
}

/** Idempotent : un même guide n'est jamais racheté par le même utilisateur. */
export async function recordPurchase(input: {
  userId: string;
  guideId: string;
  amountCents: number;
  currency: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
}): Promise<void> {
  if (!hasDatabase()) {
    const s = store();
    if (s.purchases.some((p) => p.userId === input.userId && p.guideId === input.guideId)) return;
    s.purchases.push({
      id: `pur_${s.purchases.length + 1}`,
      userId: input.userId,
      guideId: input.guideId,
      amountCents: input.amountCents,
      currency: input.currency,
      purchasedAt: new Date(),
    });
    return;
  }

  const db = getDb();
  await db
    .insert(schema.purchases)
    .values({
      userId: input.userId,
      guideId: input.guideId,
      amountCents: input.amountCents,
      currency: input.currency,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    })
    .onConflictDoNothing({ target: [schema.purchases.userId, schema.purchases.guideId] });
}

/* ────────────────────────────────────────────────────────────
   Abonnements
   ──────────────────────────────────────────────────────────── */

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export async function getSubscriptionForUser(userId: string): Promise<SubscriptionRow | null> {
  if (!hasDatabase()) {
    return store().subscriptions.find((s) => s.userId === userId) ?? null;
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId))
    .orderBy(desc(schema.subscriptions.updatedAt))
    .limit(1);
  return row ? (row as unknown as SubscriptionRow) : null;
}

/* Déblocages au titre du quota de la formule Atelier ---------- */

export async function deblocagesDeLUtilisateur(
  userId: string,
): Promise<{ guideId: string; periodStart: Date }[]> {
  if (!hasDatabase()) {
    return store().unlocks.filter((u) => u.userId === userId);
  }
  const db = getDb();
  return db
    .select({
      guideId: schema.guideUnlocks.guideId,
      periodStart: schema.guideUnlocks.periodStart,
    })
    .from(schema.guideUnlocks)
    .where(eq(schema.guideUnlocks.userId, userId));
}

export async function compterDeblocages(userId: string, depuis: Date): Promise<number> {
  if (!hasDatabase()) {
    return store().unlocks.filter((u) => u.userId === userId && u.periodStart >= depuis).length;
  }
  const db = getDb();
  const [row] = await db
    .select({ total: count() })
    .from(schema.guideUnlocks)
    .where(
      and(eq(schema.guideUnlocks.userId, userId), gte(schema.guideUnlocks.periodStart, depuis)),
    );
  return Number(row?.total ?? 0);
}

export async function enregistrerDeblocage(
  userId: string,
  guideId: string,
  periodStart: Date,
): Promise<void> {
  if (!hasDatabase()) {
    const s = store();
    if (!s.unlocks.some((u) => u.userId === userId && u.guideId === guideId)) {
      s.unlocks.push({ userId, guideId, periodStart });
    }
    return;
  }
  const db = getDb();
  await db
    .insert(schema.guideUnlocks)
    .values({ userId, guideId, periodStart })
    .onConflictDoNothing({ target: [schema.guideUnlocks.userId, schema.guideUnlocks.guideId] });
}

export function isSubscriptionActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  if (!ACTIVE_STATUSES.includes(sub.status)) return false;
  // Une résiliation programmée reste active jusqu'à la fin de la période payée.
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}

export async function upsertSubscription(input: {
  userId: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: string;
  priceCents: number | null;
  currency?: string;
  plan?: "atelier" | "integral";
  interval?: "month" | "year";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  if (!hasDatabase()) {
    const s = store();
    const existing = s.subscriptions.find(
      (x) =>
        x.userId === input.userId ||
        (input.stripeSubscriptionId && x.stripeSubscriptionId === input.stripeSubscriptionId),
    );
    if (existing) {
      Object.assign(existing, {
        status: input.status,
        stripeSubscriptionId: input.stripeSubscriptionId,
        priceCents: input.priceCents,
        plan: input.plan ?? existing.plan,
        interval: input.interval ?? existing.interval,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      });
      return;
    }
    s.subscriptions.push({
      id: `sub_${s.subscriptions.length + 1}`,
      userId: input.userId,
      status: input.status,
      stripeSubscriptionId: input.stripeSubscriptionId,
      priceCents: input.priceCents,
      currency: input.currency ?? "EUR",
      plan: input.plan ?? "atelier",
      interval: input.interval ?? "month",
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    });
    return;
  }

  const db = getDb();
  const values = {
    userId: input.userId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    stripeCustomerId: input.stripeCustomerId,
    status: input.status,
    priceCents: input.priceCents,
    currency: input.currency ?? "EUR",
    plan: input.plan ?? "atelier",
    interval: input.interval ?? "month",
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    updatedAt: new Date(),
  };

  if (input.stripeSubscriptionId) {
    await db
      .insert(schema.subscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: schema.subscriptions.stripeSubscriptionId,
        set: values,
      });
    return;
  }

  const existing = await getSubscriptionForUser(input.userId);
  if (existing) {
    await db.update(schema.subscriptions).set(values).where(eq(schema.subscriptions.id, existing.id));
  } else {
    await db.insert(schema.subscriptions).values(values);
  }
}

export async function listSubscriptions(): Promise<(SubscriptionRow & { userEmail: string })[]> {
  if (!hasDatabase()) {
    const s = store();
    return s.subscriptions.map((sub) => ({
      ...sub,
      userEmail: s.users.find((u) => u.id === sub.userId)?.email ?? "—",
    }));
  }
  const db = getDb();
  const rows = (await db
    .select({
      id: schema.subscriptions.id,
      userId: schema.subscriptions.userId,
      status: schema.subscriptions.status,
      stripeSubscriptionId: schema.subscriptions.stripeSubscriptionId,
      priceCents: schema.subscriptions.priceCents,
      currency: schema.subscriptions.currency,
      plan: schema.subscriptions.plan,
      interval: schema.subscriptions.interval,
      currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: schema.subscriptions.cancelAtPeriodEnd,
      userEmail: schema.users.email,
    })
    .from(schema.subscriptions)
    .innerJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
    .orderBy(desc(schema.subscriptions.updatedAt))
    .limit(200)) as unknown as (SubscriptionRow & { userEmail: string })[];
  return rows;
}

/* ────────────────────────────────────────────────────────────
   Pièces, huiles, outillage
   ──────────────────────────────────────────────────────────── */

export async function listParts(): Promise<PartRow[]> {
  if (!hasDatabase()) return demoParts;
  const db = getDb();
  const rows = await db
    .select({
      id: schema.parts.id,
      reference: schema.parts.reference,
      positionNumber: sql<string | null>`null`,
      name: schema.parts.name,
      nameEn: schema.parts.nameEn,
      category: schema.parts.category,
      description: schema.parts.description,
      orderReference: schema.parts.orderReference,
      isVerified: schema.parts.isVerified,
      source: schema.parts.source,
    })
    .from(schema.parts)
    .orderBy(asc(schema.parts.reference));
  return rows as PartRow[];
}

export async function getPartByReference(reference: string): Promise<PartRow | null> {
  const parts = await listParts();
  return parts.find((p) => p.reference === reference) ?? null;
}

/**
 * Validation d'une fourniture : référence de commande relevée sur un document,
 * et la source qui l'atteste. Tant que ce n'est pas fait, la fiche du calibre
 * n'affiche aucune référence — seulement le numéro de la liste normalisée.
 */
export async function validerPiece(
  id: string,
  patch: { orderReference: string | null; source: string | null; isVerified: boolean },
): Promise<void> {
  if (!hasDatabase()) {
    const piece = demoParts.find((p) => p.id === id);
    if (piece) Object.assign(piece, patch);
    return;
  }
  const db = getDb();
  await db.update(schema.parts).set(patch).where(eq(schema.parts.id, id));
}

export async function calibersForPart(partId: string): Promise<CaliberSummary[]> {
  if (!hasDatabase()) {
    // Dans le catalogue de lancement, la nomenclature est commune à la famille 30 mm.
    return listCalibers();
  }
  const db = getDb();
  const rows = await db
    .select({
      id: schema.calibers.id,
      slug: schema.calibers.slug,
      brand: schema.calibers.brand,
      reference: schema.calibers.reference,
      name: schema.calibers.name,
      familyName: sql<string | null>`null`,
      introducedYear: schema.calibers.introducedYear,
      discontinuedYear: schema.calibers.discontinuedYear,
      summary: schema.calibers.summary,
      dataStatus: schema.calibers.dataStatus,
      isPublished: schema.calibers.isPublished,
    })
    .from(schema.partCalibers)
    .innerJoin(schema.calibers, eq(schema.partCalibers.caliberId, schema.calibers.id))
    .where(eq(schema.partCalibers.partId, partId));
  return rows as CaliberSummary[];
}

export async function listLubricants(): Promise<LubricantRow[]> {
  if (!hasDatabase()) return demoLubricants;
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.lubricants)
    .orderBy(asc(schema.lubricants.brand), asc(schema.lubricants.reference));
  return rows as LubricantRow[];
}

export async function listTools(): Promise<ToolRow[]> {
  if (!hasDatabase()) return demoTools;
  const db = getDb();
  const rows = await db.select().from(schema.tools).orderBy(asc(schema.tools.name));
  return rows as ToolRow[];
}

/* ────────────────────────────────────────────────────────────
   Offres marchandes mises en cache
   ──────────────────────────────────────────────────────────── */

export async function cacheListings(
  rows: {
    partId: string | null;
    caliberId: string | null;
    source: string;
    externalId: string;
    title: string;
    url: string;
    imageUrl: string | null;
    priceCents: number | null;
    currency: string | null;
    condition: string | null;
    sellerName: string | null;
    location: string | null;
  }[],
): Promise<void> {
  if (!hasDatabase() || rows.length === 0) return;
  const db = getDb();
  await db
    .insert(schema.marketplaceListings)
    .values(rows.map((r) => ({ ...r, seenAt: new Date() })))
    .onConflictDoUpdate({
      target: [schema.marketplaceListings.source, schema.marketplaceListings.externalId],
      set: { seenAt: new Date() },
    });
}

export async function listCachedListings(partIds: string[]) {
  if (!hasDatabase() || partIds.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(schema.marketplaceListings)
    .where(
      and(
        inArray(schema.marketplaceListings.partId, partIds),
        eq(schema.marketplaceListings.source, "manuel"),
      ),
    );
}

/* ────────────────────────────────────────────────────────────
   RGPD — portabilité et effacement
   ──────────────────────────────────────────────────────────── */

export type ExportPersonnel = {
  genere_le: string;
  compte: {
    identifiant: string;
    email: string;
    nom_affiche: string | null;
    role: string;
    identifiant_stripe: string | null;
  };
  achats: {
    guide: string;
    reference_calibre: string | null;
    montant_eur: number;
    date: string;
  }[];
  abonnement: {
    formule: string;
    periodicite: string;
    statut: string;
    fin_de_periode: string | null;
    resiliation_programmee: boolean;
  } | null;
  guides_ouverts_par_abonnement: { guide: string; debut_de_periode: string }[];
};

/**
 * Export de portabilité (RGPD, art. 20). Contient tout ce que le site
 * conserve sur une personne — rien de plus : aucune donnée bancaire ne
 * transite ni n'est stockée ici, elle reste chez Stripe.
 */
export async function exporterDonneesUtilisateur(user: AppUser): Promise<ExportPersonnel> {
  const [achats, abonnement, deblocages, guides] = await Promise.all([
    listPurchasesForUser(user.id),
    getSubscriptionForUser(user.id),
    deblocagesDeLUtilisateur(user.id),
    listGuides(),
  ]);

  const titre = (guideId: string) => {
    const g = guides.find((x) => x.id === guideId);
    return g ? g.title : guideId;
  };

  return {
    genere_le: new Date().toISOString(),
    compte: {
      identifiant: user.id,
      email: user.email,
      nom_affiche: user.displayName,
      role: user.role,
      identifiant_stripe: user.stripeCustomerId,
    },
    achats: achats.map((p) => ({
      guide: titre(p.guideId),
      reference_calibre: guides.find((g) => g.id === p.guideId)?.caliberReference ?? null,
      montant_eur: p.amountCents / 100,
      date: new Date(p.purchasedAt).toISOString(),
    })),
    abonnement: abonnement
      ? {
          formule: abonnement.plan,
          periodicite: abonnement.interval,
          statut: abonnement.status,
          fin_de_periode: abonnement.currentPeriodEnd
            ? new Date(abonnement.currentPeriodEnd).toISOString()
            : null,
          resiliation_programmee: abonnement.cancelAtPeriodEnd,
        }
      : null,
    guides_ouverts_par_abonnement: deblocages.map((d) => ({
      guide: titre(d.guideId),
      debut_de_periode: new Date(d.periodStart).toISOString(),
    })),
  };
}

/**
 * Effacement du compte (RGPD, art. 17).
 *
 * Les achats, abonnements et déblocages tombent en cascade : c'est voulu,
 * l'accès aux guides disparaît avec le compte. Les pièces comptables, elles,
 * vivent chez Stripe, où la conservation légale de dix ans s'applique — les
 * effacer ici n'y changerait rien et n'est pas de notre ressort.
 */
export async function supprimerUtilisateur(userId: string): Promise<void> {
  if (!hasDatabase()) {
    const s = store();
    s.users = s.users.filter((u) => u.id !== userId);
    s.purchases = s.purchases.filter((p) => p.userId !== userId);
    s.subscriptions = s.subscriptions.filter((sub) => sub.userId !== userId);
    s.unlocks = s.unlocks.filter((u) => u.userId !== userId);
    s.favorites = s.favorites.filter((f) => f.userId !== userId);
    return;
  }
  const db = getDb();
  await db.delete(schema.users).where(eq(schema.users.id, userId));
}
