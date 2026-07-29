import { prisma } from "./db";
import { parseJson, toJson } from "./utils";
import { DEFAULT_WEIGHTS, type ScoringWeights } from "./scoring";

export interface CommercialIdentity {
  firstName: string;
  companyName: string;
  signature: string;
}

export const DEFAULT_IDENTITY: CommercialIdentity = {
  firstName: "",
  companyName: "",
  signature: "",
};

const KEYS = {
  weights: "scoring_weights",
  identity: "commercial_identity",
  demo: "demo_settings",
} as const;

export async function getWeights(workspaceId: string): Promise<ScoringWeights> {
  const row = await prisma.appSetting.findUnique({
    where: { workspaceId_key: { workspaceId, key: KEYS.weights } },
  });
  return { ...DEFAULT_WEIGHTS, ...parseJson<Partial<ScoringWeights>>(row?.value, {}) };
}

export async function setWeights(workspaceId: string, weights: ScoringWeights): Promise<void> {
  await prisma.appSetting.upsert({
    where: { workspaceId_key: { workspaceId, key: KEYS.weights } },
    create: { workspaceId, key: KEYS.weights, value: toJson(weights) },
    update: { value: toJson(weights) },
  });
}

export async function getIdentity(workspaceId: string): Promise<CommercialIdentity> {
  const row = await prisma.appSetting.findUnique({
    where: { workspaceId_key: { workspaceId, key: KEYS.identity } },
  });
  return { ...DEFAULT_IDENTITY, ...parseJson<Partial<CommercialIdentity>>(row?.value, {}) };
}

export async function setIdentity(workspaceId: string, identity: CommercialIdentity): Promise<void> {
  await prisma.appSetting.upsert({
    where: { workspaceId_key: { workspaceId, key: KEYS.identity } },
    create: { workspaceId, key: KEYS.identity, value: toJson(identity) },
    update: { value: toJson(identity) },
  });
}
