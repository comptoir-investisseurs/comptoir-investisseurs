export type AppUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  stripeCustomerId: string | null;
};

export type CaliberSummary = {
  id: string;
  slug: string;
  brand: string;
  reference: string;
  name: string;
  familyName: string | null;
  introducedYear: number | null;
  discontinuedYear: number | null;
  summary: string | null;
  dataStatus: "draft" | "verified";
  isPublished: boolean;
};

export type SpecRow = {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  isVerified: boolean;
};

export type PartRow = {
  id: string;
  reference: string;
  positionNumber: string | null;
  name: string;
  nameEn: string | null;
  category: string | null;
  description: string | null;
};

export type LubricantRow = {
  id: string;
  slug: string;
  brand: string;
  reference: string;
  name: string;
  type: string;
  viscosity: string | null;
  usage: string | null;
  colorHex: string | null;
};

export type LubricationPointRow = {
  id: string;
  location: string;
  quantity: string | null;
  notes: string | null;
  lubricant: LubricantRow | null;
};

export type ToolRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
};

export type CaliberDetail = CaliberSummary & {
  presentation: string | null;
  history: string | null;
  architecture: string | null;
  specs: SpecRow[];
  parts: PartRow[];
  lubrication: LubricationPointRow[];
  tools: ToolRow[];
  related: CaliberSummary[];
};

export type GuideRow = {
  id: string;
  caliberId: string;
  caliberSlug: string;
  caliberReference: string;
  caliberName: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  priceCents: number;
  currency: string;
  r2FileKey: string | null;
  coverImageUrl: string | null;
  previewFileKey: string | null;
  pageCount: number | null;
  includedInSubscription: boolean;
  isActive: boolean;
};

export type PurchaseRow = {
  id: string;
  userId: string;
  guideId: string;
  amountCents: number;
  currency: string;
  purchasedAt: Date;
};

export type PlanAbonnement = "atelier" | "integral";

export type SubscriptionRow = {
  id: string;
  userId: string;
  status: string;
  stripeSubscriptionId: string | null;
  priceCents: number | null;
  currency: string;
  plan: PlanAbonnement;
  interval: "month" | "year";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type GuideAccess = {
  /** Acheté à l'unité : définitif. */
  owned: boolean;
  /** Ouvert par l'abonnement — quota déjà consommé, ou formule intégrale. */
  viaSubscription: boolean;
  canDownload: boolean;
  /** Formule Atelier : le guide peut être ouvert en consommant un crédit. */
  deblocablePar: "quota" | null;
  creditsRestants: number | null;
};
