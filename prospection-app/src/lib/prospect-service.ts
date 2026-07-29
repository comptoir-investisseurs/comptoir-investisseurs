// Service métier prospect : ingestion (avec dédoublonnage), analyse de site,
// calcul et persistance du score. Sépare la logique de l'UI et des routes.

import { prisma } from "./db";
import { analyzeSite, type SiteAnalysis } from "./site-analyzer";
import { computeScore, looksLikeChain, type ScoringWeights } from "./scoring";
import { buildIndex, checkDuplicate, addToIndex, type DedupeKeyable } from "./dedupe";
import { normalizeName, toJson, parseJson } from "./utils";
import { getWeights } from "./settings";
import type { RawProspect } from "./providers";

export interface IngestResult {
  imported: number;
  duplicates: number;
  duplicateReasons: string[];
}

/** Insère des prospects bruts en dédoublonnant contre l'existant et le lot. */
export async function ingestProspects(
  workspaceId: string,
  raws: RawProspect[],
): Promise<IngestResult> {
  const existing = await prisma.prospect.findMany({
    where: { workspaceId },
    select: {
      externalId: true,
      businessName: true,
      phone: true,
      address: true,
      websiteUrl: true,
      city: true,
    },
  });
  const index = buildIndex(existing as DedupeKeyable[]);

  let imported = 0;
  let duplicates = 0;
  const reasons: string[] = [];

  for (const raw of raws) {
    const keyable: DedupeKeyable = {
      externalId: raw.externalId ?? null,
      businessName: raw.businessName,
      phone: raw.phone ?? null,
      address: raw.address ?? null,
      websiteUrl: raw.websiteUrl ?? null,
      city: raw.city ?? null,
    };
    const dup = checkDuplicate(index, keyable);
    if (dup.isDuplicate) {
      duplicates++;
      if (dup.reason) reasons.push(dup.reason);
      continue;
    }
    await prisma.prospect.create({
      data: {
        workspaceId,
        externalId: raw.externalId,
        source: raw.source,
        businessName: raw.businessName,
        normalizedName: normalizeName(raw.businessName),
        category: raw.category,
        description: raw.description,
        address: raw.address,
        city: raw.city,
        postalCode: raw.postalCode,
        country: raw.country ?? "France",
        latitude: raw.latitude,
        longitude: raw.longitude,
        phone: raw.phone,
        email: raw.email,
        websiteUrl: raw.websiteUrl,
        facebookUrl: raw.facebookUrl,
        instagramUrl: raw.instagramUrl,
        listingUrl: raw.listingUrl,
        rating: raw.rating,
        reviewCount: raw.reviewCount,
        openingHours: raw.openingHours ? toJson(raw.openingHours) : null,
        services: raw.services ? toJson(raw.services) : null,
        photos: raw.photos ? toJson(raw.photos) : null,
        status: "nouveau",
      },
    });
    addToIndex(index, keyable);
    imported++;
  }

  return { imported, duplicates, duplicateReasons: Array.from(new Set(reasons)) };
}

export interface AnalyzeResult {
  score: number;
  priority: string;
  hasWebsite: boolean;
  site: SiteAnalysis | null;
}

/** Analyse un prospect (site + réputation), calcule et persiste le score. */
export async function analyzeProspect(prospectId: string, weightsOverride?: ScoringWeights): Promise<AnalyzeResult> {
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospect introuvable");

  const weights = weightsOverride ?? (await getWeights(prospect.workspaceId));
  const hasWebsite = Boolean(prospect.websiteUrl && prospect.websiteUrl.trim());
  const site = hasWebsite ? await analyzeSite(prospect.websiteUrl as string) : null;

  const result = computeScore(
    {
      hasWebsite,
      site,
      rating: prospect.rating,
      reviewCount: prospect.reviewCount,
      facebookUrl: prospect.facebookUrl,
      instagramUrl: prospect.instagramUrl,
      phone: prospect.phone,
      email: prospect.email,
      address: prospect.address,
      isChain: looksLikeChain(prospect.businessName),
    },
    weights,
  );

  await prisma.$transaction([
    prisma.prospectAnalysis.upsert({
      where: { prospectId },
      create: {
        prospectId,
        hasWebsite,
        data: toJson({ site }),
        scoreBreakdown: toJson(result.contributions),
      },
      update: {
        hasWebsite,
        data: toJson({ site }),
        scoreBreakdown: toJson(result.contributions),
        analyzedAt: new Date(),
      },
    }),
    prisma.prospect.update({
      where: { id: prospectId },
      data: { score: result.score, priority: result.priority },
    }),
  ]);

  return { score: result.score, priority: result.priority, hasWebsite, site };
}

/** Change le statut et enregistre l'historique. */
export async function changeStatus(prospectId: string, toStatus: string): Promise<void> {
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospect introuvable");
  if (prospect.status === toStatus) return;
  await prisma.$transaction([
    prisma.prospectStatusHistory.create({
      data: { prospectId, fromStatus: prospect.status, toStatus },
    }),
    prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status: toStatus,
        doNotContact: toStatus === "ne_pas_contacter" ? true : prospect.doNotContact,
      },
    }),
  ]);
}

export function siteFromAnalysis(analysisData: string | null): SiteAnalysis | null {
  return parseJson<{ site: SiteAnalysis | null }>(analysisData, { site: null }).site;
}
