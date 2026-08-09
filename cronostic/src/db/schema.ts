import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ────────────────────────────────────────────────────────────
   Utilisateurs
   ──────────────────────────────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Identifiant Clerk (user_xxx). Null en mode démo local.
    authId: text("auth_id").unique(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("user"), // user | admin
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

/* ────────────────────────────────────────────────────────────
   Calibres
   ──────────────────────────────────────────────────────────── */

export const caliberFamilies = pgTable("caliber_families", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand").notNull().default("Omega"),
  description: text("description"),
  yearsActive: text("years_active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calibers = pgTable(
  "calibers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(), // omega-265
    brand: text("brand").notNull().default("Omega"),
    reference: text("reference").notNull(), // 265
    name: text("name").notNull(), // Omega calibre 265
    familyId: uuid("family_id").references(() => caliberFamilies.id, { onDelete: "set null" }),
    introducedYear: integer("introduced_year"),
    discontinuedYear: integer("discontinued_year"),
    summary: text("summary"), // chapô de la fiche
    presentation: text("presentation"), // présentation longue (markdown léger)
    history: text("history"),
    architecture: text("architecture"),
    // Les données saisies avant relecture d'atelier restent marquées « brouillon ».
    dataStatus: text("data_status").notNull().default("draft"), // draft | verified
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calibers_reference_idx").on(t.reference)],
);

/** Caractéristiques techniques, une ligne par couple (calibre, caractéristique). */
export const caliberSpecs = pgTable(
  "caliber_specs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caliberId: uuid("caliber_id")
      .notNull()
      .references(() => calibers.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // diameter_mm, jewels, frequency_vph…
    label: text("label").notNull(), // Diamètre
    value: text("value").notNull(), // 30,0 mm
    unit: text("unit"),
    position: integer("position").notNull().default(0),
    isVerified: boolean("is_verified").notNull().default(false),
    /** Document qui atteste la valeur : éditeur, titre, page, date. */
    source: text("source"),
    sourceUrl: text("source_url"),
  },
  (t) => [uniqueIndex("caliber_specs_caliber_key").on(t.caliberId, t.key)],
);

/** Renvois « calibres apparentés » (relation dirigée, dupliquée dans les deux sens au seed). */
export const caliberRelations = pgTable(
  "caliber_relations",
  {
    caliberId: uuid("caliber_id")
      .notNull()
      .references(() => calibers.id, { onDelete: "cascade" }),
    relatedCaliberId: uuid("related_caliber_id")
      .notNull()
      .references(() => calibers.id, { onDelete: "cascade" }),
    relation: text("relation").notNull().default("famille"), // famille | évolution | base
  },
  (t) => [primaryKey({ columns: [t.caliberId, t.relatedCaliberId] })],
);

/* ────────────────────────────────────────────────────────────
   Guides Cronostic (PDF déjà produits hors du site)
   ──────────────────────────────────────────────────────────── */

export const guides = pgTable(
  "guides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caliberId: uuid("caliber_id")
      .notNull()
      .references(() => calibers.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    shortDescription: text("short_description"),
    priceCents: integer("price_cents").notNull().default(1490),
    currency: text("currency").notNull().default("EUR"),
    // Clé de l'objet dans le bucket privé — ex. premium/guides/omega-265.pdf
    r2FileKey: text("r2_file_key"),
    coverImageUrl: text("cover_image_url"),
    // Aperçu public facultatif : PDF d'extrait ou planches. Jamais le PDF complet.
    previewFileKey: text("preview_file_key"),
    pageCount: integer("page_count"),
    includedInSubscription: boolean("included_in_subscription").notNull().default(true),
    isActive: boolean("is_active").notNull().default(false),
    stripePriceId: text("stripe_price_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("guides_caliber_idx").on(t.caliberId)],
);

/* ────────────────────────────────────────────────────────────
   Achats & abonnements
   ──────────────────────────────────────────────────────────── */

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "restrict" }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Un guide n'est acheté qu'une fois par utilisateur : la possession est définitive.
    uniqueIndex("purchases_user_guide_key").on(t.userId, t.guideId),
    uniqueIndex("purchases_checkout_session_key").on(t.stripeCheckoutSessionId),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripeCustomerId: text("stripe_customer_id"),
    status: text("status").notNull(), // active | trialing | past_due | canceled | incomplete
    // atelier : quota de guides par période. integral : accès à tout.
    plan: text("plan").notNull().default("atelier"),
    interval: text("interval").notNull().default("month"), // month | year
    priceCents: integer("price_cents"),
    currency: text("currency").notNull().default("EUR"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

/**
 * Déblocage d'un guide au titre du quota de la formule Atelier.
 *
 * Un déblocage consomme un crédit de la période en cours et reste valable tant
 * que l'abonnement est actif : l'abonné constitue sa bibliothèque, il ne
 * repaie pas chaque mois ce qu'il a déjà ouvert.
 */
export const guideUnlocks = pgTable(
  "guide_unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
    // Début de la période de facturation qui a porté ce déblocage.
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("guide_unlocks_user_guide_key").on(t.userId, t.guideId),
    index("guide_unlocks_period_idx").on(t.userId, t.periodStart),
  ],
);

/* ────────────────────────────────────────────────────────────
   Pièces détachées
   ──────────────────────────────────────────────────────────── */

export const parts = pgTable(
  "parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Identifiant interne de la fourniture. Ce n'est PAS une référence de
    // commande : celle du constructeur se saisit dans `orderReference`, et
    // seulement une fois relevée sur une planche.
    reference: text("reference").notNull(),
    name: text("name").notNull(), // Barillet complet
    nameEn: text("name_en"), // Barrel complete — utile pour chercher sur eBay
    category: text("category"), // rouage | échappement | remontage | cadrature | habillage
    description: text("description"),
    imageUrl: text("image_url"),
    /** Référence de commande relevée sur une planche constructeur. */
    orderReference: text("order_reference"),
    /** Faux tant que la fourniture n'a pas été recoupée sur un document. */
    isVerified: boolean("is_verified").notNull().default(false),
    /** Planche, catalogue, page et date : ce qui atteste la référence. */
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("parts_reference_key").on(t.reference)],
);

/** Pièces montées sur un calibre donné (avec le numéro de nomenclature du manuel). */
export const partCalibers = pgTable(
  "part_calibers",
  {
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    caliberId: uuid("caliber_id")
      .notNull()
      .references(() => calibers.id, { onDelete: "cascade" }),
    positionNumber: text("position_number"), // n° de planche
    notes: text("notes"),
  },
  (t) => [primaryKey({ columns: [t.partId, t.caliberId] })],
);

/** Interchangeabilité entre deux pièces. */
export const partCompatibilities = pgTable(
  "part_compatibilities",
  {
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    compatiblePartId: uuid("compatible_part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    level: text("level").notNull().default("identique"), // identique | interchangeable | adaptable
    notes: text("notes"),
  },
  (t) => [primaryKey({ columns: [t.partId, t.compatiblePartId] })],
);

/* ────────────────────────────────────────────────────────────
   Huiles & consommables
   ──────────────────────────────────────────────────────────── */

export const lubricants = pgTable(
  "lubricants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    brand: text("brand").notNull(), // Moebius, Kluber…
    reference: text("reference").notNull(), // 9010
    name: text("name").notNull(),
    type: text("type").notNull(), // huile | graisse | épilame | produit de nettoyage
    viscosity: text("viscosity"),
    usage: text("usage"),
    colorHex: text("color_hex"),
    /** Faux tant que la valeur n'a pas été lue sur une fiche technique. */
    isVerified: boolean("is_verified").notNull().default(false),
    /** Ce qui atteste la valeur : éditeur, document, date. */
    source: text("source"),
    /** Lien vers la fiche technique du fabricant. */
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lubricants_brand_reference_key").on(t.brand, t.reference)],
);

/** Points de lubrification d'un calibre : où, quoi, combien. */
export const caliberLubricationPoints = pgTable("caliber_lubrication_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  caliberId: uuid("caliber_id")
    .notNull()
    .references(() => calibers.id, { onDelete: "cascade" }),
  lubricantId: uuid("lubricant_id").references(() => lubricants.id, { onDelete: "set null" }),
  location: text("location").notNull(), // Pierres du rouage, côté platine
  quantity: text("quantity"), // 1 goutte fine
  notes: text("notes"),
  position: integer("position").notNull().default(0),
});

/* ────────────────────────────────────────────────────────────
   Outillage
   ──────────────────────────────────────────────────────────── */

export const tools = pgTable("tools", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const caliberTools = pgTable(
  "caliber_tools",
  {
    caliberId: uuid("caliber_id")
      .notNull()
      .references(() => calibers.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    notes: text("notes"),
  },
  (t) => [primaryKey({ columns: [t.caliberId, t.toolId] })],
);

/* ────────────────────────────────────────────────────────────
   Offres marchandes (cache des résultats eBay + saisies manuelles)
   ──────────────────────────────────────────────────────────── */

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partId: uuid("part_id").references(() => parts.id, { onDelete: "cascade" }),
    caliberId: uuid("caliber_id").references(() => calibers.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // ebay | cousins | manuel
    externalId: text("external_id"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    priceCents: integer("price_cents"),
    currency: text("currency"),
    condition: text("condition"),
    sellerName: text("seller_name"),
    location: text("location"),
    raw: jsonb("raw"),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("marketplace_listings_source_external_key").on(t.source, t.externalId),
    index("marketplace_listings_part_idx").on(t.partId),
  ],
);

/* ────────────────────────────────────────────────────────────
   Favoris
   ──────────────────────────────────────────────────────────── */

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // caliber | part | guide | listing
    entityId: text("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favorites_user_entity_key").on(t.userId, t.entityType, t.entityId)],
);

/* ────────────────────────────────────────────────────────────
   Mesure d'audience — sans cookie, sans identifiant persistant
   ──────────────────────────────────────────────────────────── */

/** Compteur agrégé : une ligne par jour et par page. Rien d'individuel. */
export const pageViews = pgTable(
  "page_views",
  {
    day: date("day").notNull(),
    path: text("path").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.day, t.path] }),
    index("page_views_day_idx").on(t.day),
  ],
);

/**
 * Empreintes de visite. Le sel change chaque jour : une même personne n'est
 * pas reconnaissable d'un jour sur l'autre, et l'empreinte n'est réversible
 * ni vers l'adresse IP, ni vers le navigateur. Purgée au bout de 30 jours.
 */
export const visitFingerprints = pgTable(
  "visit_fingerprints",
  {
    day: date("day").notNull(),
    fingerprint: text("fingerprint").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.fingerprint] })],
);

export type User = typeof users.$inferSelect;
export type Caliber = typeof calibers.$inferSelect;
export type CaliberSpec = typeof caliberSpecs.$inferSelect;
export type Guide = typeof guides.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type GuideUnlock = typeof guideUnlocks.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type Lubricant = typeof lubricants.$inferSelect;
