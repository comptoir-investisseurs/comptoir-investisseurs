"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./db";
import { getCurrentUser } from "./auth";
import { getProvider, rawProspectsFromCsv, type RawProspect } from "./providers";
import { ingestProspects, analyzeProspect, changeStatus, siteFromAnalysis } from "./prospect-service";
import { getAIProvider } from "./ai";
import { getIdentity, getWeights, setIdentity, setWeights, type CommercialIdentity } from "./settings";
import { type ScoringWeights } from "./scoring";
import { templateForCategory } from "./domain";
import { buildWebsiteContent, renderDemoHtml } from "./demo-generator";
import { parseJson, slugify, toJson } from "./utils";
import type { AuditInput } from "./audit";
import type { MessageInput } from "./messages";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// ─── Recherche & import ──────────────────────────────────────

export async function searchAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const schema = z.object({
    category: z.string().min(1),
    city: z.string().min(1),
    radiusKm: z.coerce.number().int().min(0).max(100).optional(),
    maxResults: z.coerce.number().int().min(1).max(40).default(12),
    provider: z.string().default("demo"),
  });
  const parsed = schema.parse({
    category: formData.get("category"),
    city: formData.get("city"),
    radiusKm: formData.get("radiusKm") || undefined,
    maxResults: formData.get("maxResults") || 12,
    provider: formData.get("provider") || "demo",
  });

  const provider = getProvider(parsed.provider);
  const raws = await provider.searchBusinesses({
    category: parsed.category,
    city: parsed.city,
    radiusKm: parsed.radiusKm,
    maxResults: parsed.maxResults,
  });
  const result = await ingestProspects(user.workspaceId, raws);
  await prisma.searchCampaign.create({
    data: {
      workspaceId: user.workspaceId,
      category: parsed.category,
      city: parsed.city,
      radiusKm: parsed.radiusKm,
      maxResults: parsed.maxResults,
      provider: parsed.provider,
      createdCount: result.imported,
    },
  });
  revalidatePath("/prospects");
  redirect(`/prospects?imported=${result.imported}&duplicates=${result.duplicates}`);
}

export async function importCsvAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/prospects?error=fichier");
  const text = await file.text();
  const raws = rawProspectsFromCsv(text);
  const result = await ingestProspects(user.workspaceId, raws);
  await prisma.importJob.create({
    data: {
      workspaceId: user.workspaceId,
      filename: file.name,
      total: raws.length,
      imported: result.imported,
      duplicates: result.duplicates,
      errors: result.duplicateReasons.length ? toJson(result.duplicateReasons) : null,
    },
  });
  revalidatePath("/prospects");
  redirect(`/prospects?imported=${result.imported}&duplicates=${result.duplicates}`);
}

export async function createProspectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const schema = z.object({
    businessName: z.string().min(1),
    category: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    websiteUrl: z.string().optional(),
    facebookUrl: z.string().optional(),
    instagramUrl: z.string().optional(),
    rating: z.coerce.number().optional(),
    reviewCount: z.coerce.number().int().optional(),
    description: z.string().optional(),
  });
  const data = schema.parse(Object.fromEntries(formData));
  const raw: RawProspect = { ...data, source: "manual" };
  const result = await ingestProspects(user.workspaceId, [raw]);
  revalidatePath("/prospects");
  if (result.imported === 0) redirect("/prospects/new?error=doublon");
  redirect("/prospects?imported=1");
}

// ─── Analyse & scoring ───────────────────────────────────────

async function assertProspectInWorkspace(prospectId: string, workspaceId: string) {
  const p = await prisma.prospect.findUnique({ where: { id: prospectId }, select: { workspaceId: true } });
  if (!p || p.workspaceId !== workspaceId) redirect("/prospects");
}

export async function analyzeAction(prospectId: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  await analyzeProspect(prospectId);
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/prospects");
}

export async function analyzeAllAction(): Promise<void> {
  const user = await requireUser();
  const pending = await prisma.prospect.findMany({
    where: { workspaceId: user.workspaceId, score: null },
    select: { id: true },
    take: 50,
  });
  for (const p of pending) {
    try {
      await analyzeProspect(p.id);
    } catch {
      // ignore les erreurs individuelles
    }
  }
  revalidatePath("/prospects");
}

// ─── Audit ───────────────────────────────────────────────────

export async function generateAuditAction(prospectId: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  const prospect = await prisma.prospect.findUniqueOrThrow({
    where: { id: prospectId },
    include: { analysis: true },
  });
  const site = siteFromAnalysis(prospect.analysis?.data ?? null);
  const input: AuditInput = {
    businessName: prospect.businessName,
    category: prospect.category,
    city: prospect.city,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    hasWebsite: Boolean(prospect.websiteUrl),
    site,
    facebookUrl: prospect.facebookUrl,
    instagramUrl: prospect.instagramUrl,
    phone: prospect.phone,
    email: prospect.email,
    priority: (prospect.priority as AuditInput["priority"]) ?? "moyenne",
  };
  const ai = getAIProvider();
  const { audit } = await ai.generateProspectAudit(input);
  await prisma.auditReport.upsert({
    where: { prospectId },
    create: { prospectId, data: toJson(audit), generator: ai.name },
    update: { data: toJson(audit), generator: ai.name },
  });
  revalidatePath(`/prospects/${prospectId}`);
}

// ─── Messages ────────────────────────────────────────────────

export async function generateMessagesAction(prospectId: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  const prospect = await prisma.prospect.findUniqueOrThrow({
    where: { id: prospectId },
    include: { analysis: true },
  });
  const identity = await getIdentity(user.workspaceId);
  const site = siteFromAnalysis(prospect.analysis?.data ?? null);
  const input: MessageInput = {
    businessName: prospect.businessName,
    category: prospect.category,
    city: prospect.city,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    hasWebsite: Boolean(prospect.websiteUrl),
    site,
    firstName: identity.firstName || null,
    signature: identity.signature || null,
  };
  const ai = getAIProvider();
  const { messages } = await ai.generateOutreachMessages(input);
  await prisma.generatedMessage.deleteMany({ where: { prospectId } });
  await prisma.generatedMessage.createMany({
    data: messages.map((m) => ({
      prospectId,
      channel: m.channel,
      kind: m.kind,
      subject: m.subject,
      body: m.body,
      usedData: toJson(m.usedData),
      generator: ai.name,
    })),
  });
  revalidatePath(`/prospects/${prospectId}`);
}

// ─── Démonstration ───────────────────────────────────────────

export async function generateDemoAction(prospectId: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  const template = templateForCategory(prospect.category);
  const content = buildWebsiteContent(
    {
      businessName: prospect.businessName,
      category: prospect.category,
      city: prospect.city,
      description: prospect.description,
      services: parseJson<string[]>(prospect.services ?? null, []),
      openingHours: parseJson<{ day: string; hours: string }[]>(prospect.openingHours ?? null, []),
      phone: prospect.phone,
      email: prospect.email,
      address: prospect.address,
      photos: parseJson<string[]>(prospect.photos ?? null, []),
      rating: prospect.rating,
      reviewCount: prospect.reviewCount,
    },
    template,
  );

  const baseSlug = slugify(prospect.businessName) || "demo";
  let slug = baseSlug;
  let n = 1;
  while (await prisma.websiteDemo.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }
  const days = Number(process.env.DEMO_EXPIRATION_DAYS ?? "30");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.websiteDemo.create({
    data: {
      workspaceId: user.workspaceId,
      prospectId,
      slug,
      template,
      content: toJson(content),
      expiresAt,
    },
  });
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/demos");
}

export async function deleteDemoAction(demoId: string): Promise<void> {
  const user = await requireUser();
  const demo = await prisma.websiteDemo.findUnique({ where: { id: demoId } });
  if (demo && demo.workspaceId === user.workspaceId) {
    await prisma.websiteDemo.delete({ where: { id: demoId } });
  }
  revalidatePath("/demos");
}

// ─── CRM : statut, notes, tâches, contact ────────────────────

export async function changeStatusAction(prospectId: string, status: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  await changeStatus(prospectId, status);
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/prospects");
  revalidatePath("/pipeline");
}

export async function addNoteAction(prospectId: string, body: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  if (!body.trim()) return;
  await prisma.prospectNote.create({ data: { prospectId, userId: user.id, body: body.trim() } });
  revalidatePath(`/prospects/${prospectId}`);
}

export async function addTaskAction(prospectId: string, title: string, dueAt?: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  if (!title.trim()) return;
  await prisma.prospectTask.create({
    data: {
      prospectId,
      userId: user.id,
      title: title.trim(),
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { nextAction: title.trim(), nextActionAt: dueAt ? new Date(dueAt) : null },
  });
  revalidatePath(`/prospects/${prospectId}`);
}

export async function toggleTaskAction(taskId: string): Promise<void> {
  const user = await requireUser();
  const task = await prisma.prospectTask.findUnique({
    where: { id: taskId },
    include: { prospect: { select: { workspaceId: true, id: true } } },
  });
  if (!task || task.prospect.workspaceId !== user.workspaceId) return;
  await prisma.prospectTask.update({ where: { id: taskId }, data: { done: !task.done } });
  revalidatePath(`/prospects/${task.prospect.id}`);
}

export async function markContactedAction(prospectId: string, channel: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  const now = new Date();
  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  await prisma.$transaction([
    prisma.prospectContact.create({
      data: { prospectId, channel, direction: "outbound", outcome: "envoye" },
    }),
    prisma.prospect.update({
      where: { id: prospectId },
      data: {
        channel,
        lastContactedAt: now,
        firstContactedAt: prospect.firstContactedAt ?? now,
        status: ["nouveau", "qualifie", "a_contacter", "a_analyser"].includes(prospect.status)
          ? "contacte"
          : prospect.status,
      },
    }),
  ]);
  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/queue");
  revalidatePath("/prospects");
}

export async function setDoNotContactAction(prospectId: string, value: boolean): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { doNotContact: value, status: value ? "ne_pas_contacter" : undefined },
  });
  revalidatePath(`/prospects/${prospectId}`);
}

export async function recordResponseAction(prospectId: string, outcome: string, body?: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  await prisma.prospectContact.create({
    data: { prospectId, channel: "autre", direction: "inbound", outcome, body: body?.trim() || null },
  });
  if (outcome === "reponse_negative") {
    await changeStatus(prospectId, "ne_pas_contacter");
  } else if (outcome === "reponse_positive") {
    await changeStatus(prospectId, "interesse");
  }
  revalidatePath(`/prospects/${prospectId}`);
}

export async function updateProspectAmountAction(prospectId: string, amount: number | null, offerId?: string | null): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { potentialAmount: amount, offerId: offerId || null },
  });
  revalidatePath(`/prospects/${prospectId}`);
}

// ─── Paramètres ──────────────────────────────────────────────

export async function updateWeightsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const current = await getWeights(user.workspaceId);
  const next: ScoringWeights = { ...current };
  for (const key of Object.keys(current) as (keyof ScoringWeights)[]) {
    const raw = formData.get(key);
    if (raw !== null) next[key] = Number(raw);
  }
  await setWeights(user.workspaceId, next);
  revalidatePath("/settings");
}

export async function updateIdentityAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const identity: CommercialIdentity = {
    firstName: String(formData.get("firstName") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    signature: String(formData.get("signature") ?? ""),
  };
  await setIdentity(user.workspaceId, identity);
  revalidatePath("/settings");
}

// ─── Modèles de messages ─────────────────────────────────────

export async function createTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const schema = z.object({
    name: z.string().min(1),
    channel: z.enum(["facebook", "instagram", "email", "phone"]),
    kind: z.enum(["outreach", "followup1", "followup2"]).default("outreach"),
    subject: z.string().optional(),
    body: z.string().min(1),
  });
  const data = schema.parse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    kind: formData.get("kind") || "outreach",
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
  });
  await prisma.messageTemplate.create({ data: { workspaceId: user.workspaceId, ...data } });
  revalidatePath("/templates");
}

export async function deleteTemplateAction(templateId: string): Promise<void> {
  const user = await requireUser();
  const tpl = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
  if (tpl && tpl.workspaceId === user.workspaceId) {
    await prisma.messageTemplate.delete({ where: { id: templateId } });
  }
  revalidatePath("/templates");
}

export async function saveOfferAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    setupPrice: formData.get("setupPrice") ? Number(formData.get("setupPrice")) : null,
    monthlyPrice: formData.get("monthlyPrice") ? Number(formData.get("monthlyPrice")) : null,
  };
  if (!data.name) return;
  if (id) {
    const existing = await prisma.offer.findUnique({ where: { id } });
    if (existing && existing.workspaceId === user.workspaceId) {
      await prisma.offer.update({ where: { id }, data });
    }
  } else {
    await prisma.offer.create({ data: { workspaceId: user.workspaceId, ...data } });
  }
  revalidatePath("/settings");
}

export async function deleteProspectAction(prospectId: string): Promise<void> {
  const user = await requireUser();
  await assertProspectInWorkspace(prospectId, user.workspaceId);
  await prisma.prospect.delete({ where: { id: prospectId } });
  revalidatePath("/prospects");
  redirect("/prospects");
}
