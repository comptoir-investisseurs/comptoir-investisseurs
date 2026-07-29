import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DemoProvider } from "../src/lib/providers";
import { ingestProspects, changeStatus } from "../src/lib/prospect-service";
import { computeScore, looksLikeChain } from "../src/lib/scoring";
import { buildAuditWithRules } from "../src/lib/audit";
import { buildAllMessages } from "../src/lib/messages";
import { buildWebsiteContent } from "../src/lib/demo-generator";
import { templateForCategory } from "../src/lib/domain";
import type { SiteAnalysis } from "../src/lib/site-analyzer";
import { toJson, slugify, parseJson } from "../src/lib/utils";

const prisma = new PrismaClient();

/** SiteAnalysis synthétique déterministe (évite les appels réseau au seed). */
function syntheticSite(url: string, variant: number): SiteAnalysis {
  const modern = variant % 3 === 0;
  const mobile = variant % 2 === 0;
  return {
    url,
    finalUrl: url,
    reachable: variant % 7 !== 0,
    httpStatus: variant % 7 !== 0 ? 200 : 500,
    redirects: 0,
    https: variant % 2 === 0,
    hasViewport: mobile,
    title: "Accueil",
    metaDescription: modern ? "Bienvenue" : null,
    h1: "Bienvenue",
    hasForm: modern,
    hasCallToAction: modern,
    hasBooking: modern,
    hasBookingWellIntegrated: modern,
    hasSocialLinks: true,
    hasLegalMentions: modern,
    hasStructuredData: modern,
    hasFavicon: true,
    phoneClickable: mobile,
    copyrightYear: modern ? 2025 : 2015,
    looksOld: !modern,
    isModern: modern && mobile,
    slow: variant % 4 === 0,
    responseMs: variant % 4 === 0 ? 6000 : 800,
    approxSizeKb: 120,
    brokenReasons: variant % 7 === 0 ? ["HTTP 500"] : [],
  };
}

const DEFAULT_OFFERS = [
  {
    name: "Offre Essentielle",
    description: "Site vitrine une page, design mobile, coordonnées, services, formulaire, hébergement, maintenance.",
    features: ["Site vitrine 1 page", "Design mobile", "Formulaire de contact", "Hébergement & maintenance"],
    setupPrice: 390,
    monthlyPrice: 29,
  },
  {
    name: "Offre Réservation",
    description: "Site complet, prise de rendez-vous, galerie, tarifs, référencement local de base, hébergement, maintenance.",
    features: ["Site complet", "Prise de rendez-vous", "Galerie & tarifs", "Référencement local de base"],
    setupPrice: 690,
    monthlyPrice: 49,
  },
  {
    name: "Offre Sérénité",
    description: "Création sans paiement initial important, hébergement, maintenance, petites modifications, suivi, prise de rendez-vous.",
    features: ["Sans frais de création élevés", "Hébergement & maintenance", "Petites modifications incluses", "Prise de rendez-vous"],
    setupPrice: 0,
    monthlyPrice: 79,
  },
];

const DEFAULT_TEMPLATES = [
  { name: "Premier message réseaux", channel: "facebook", kind: "outreach", body: "Bonjour,\n\nJe suis tombé sur votre établissement en recherchant des professionnels de votre secteur. J'ai vu que vous aviez d'excellents avis, mais pas encore de site pour présenter vos prestations et faciliter les prises de rendez-vous.\n\nJe crée justement des sites simples pour les commerces locaux. Puis-je vous envoyer une proposition ?" },
  { name: "Relance 1", channel: "facebook", kind: "followup1", body: "Bonjour,\n\nJe me permets de revenir vers vous concernant la proposition de site que j'avais préparée pour votre établissement.\n\nJe peux vous envoyer le lien ici si le sujet peut vous intéresser." },
  { name: "Relance 2", channel: "facebook", kind: "followup2", body: "Bonjour,\n\nDernier petit message concernant votre présence en ligne. J'avais préparé une proposition adaptée à votre activité.\n\nJe peux vous la transmettre sans engagement." },
  { name: "E-mail premier contact", channel: "email", kind: "outreach", subject: "Un site simple pour votre établissement ?", body: "Bonjour,\n\nJ'ai consulté votre présence en ligne et j'ai préparé quelques idées concrètes pour mieux présenter vos services et simplifier les prises de rendez-vous.\n\nPuis-je vous envoyer une proposition gratuite ?\n\nCordialement," },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "demo@prospection.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "demo1234";

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: "Démo" },
    update: { passwordHash },
  });

  let workspace = await prisma.workspace.findFirst({
    where: { memberships: { some: { userId: user.id } } },
  });
  if (!workspace) {
    workspace = await prisma.workspace.create({ data: { name: "Mon espace de prospection" } });
    await prisma.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
    });
  }
  const ws = workspace.id;

  // Offres par défaut
  if ((await prisma.offer.count({ where: { workspaceId: ws } })) === 0) {
    for (const o of DEFAULT_OFFERS) {
      await prisma.offer.create({
        data: { workspaceId: ws, name: o.name, description: o.description, features: toJson(o.features), setupPrice: o.setupPrice, monthlyPrice: o.monthlyPrice },
      });
    }
  }

  // Modèles de messages par défaut
  if ((await prisma.messageTemplate.count({ where: { workspaceId: ws } })) === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      await prisma.messageTemplate.create({
        data: { workspaceId: ws, name: t.name, channel: t.channel, kind: t.kind, subject: (t as { subject?: string }).subject, body: t.body },
      });
    }
  }

  // Prospects fictifs
  const provider = new DemoProvider();
  const batches = [
    { category: "coiffeur", city: "Paris 11e", maxResults: 8 },
    { category: "restaurant", city: "Lyon", maxResults: 6 },
    { category: "garage", city: "Marseille", maxResults: 5 },
    { category: "institut de beauté", city: "Bordeaux", maxResults: 5 },
  ];
  let totalImported = 0;
  for (const b of batches) {
    const raws = await provider.searchBusinesses(b);
    const res = await ingestProspects(ws, raws);
    totalImported += res.imported;
  }

  // Analyse + scoring (synthétique, sans réseau)
  const prospects = await prisma.prospect.findMany({ where: { workspaceId: ws } });
  let i = 0;
  for (const p of prospects) {
    if (p.score !== null) {
      i++;
      continue;
    }
    const hasWebsite = Boolean(p.websiteUrl);
    const site = hasWebsite ? syntheticSite(p.websiteUrl as string, i) : null;
    const result = computeScore({
      hasWebsite,
      site,
      rating: p.rating,
      reviewCount: p.reviewCount,
      facebookUrl: p.facebookUrl,
      instagramUrl: p.instagramUrl,
      phone: p.phone,
      email: p.email,
      address: p.address,
      isChain: looksLikeChain(p.businessName),
    });
    await prisma.prospectAnalysis.upsert({
      where: { prospectId: p.id },
      create: { prospectId: p.id, hasWebsite, data: toJson({ site }), scoreBreakdown: toJson(result.contributions) },
      update: { hasWebsite, data: toJson({ site }), scoreBreakdown: toJson(result.contributions) },
    });
    await prisma.prospect.update({ where: { id: p.id }, data: { score: result.score, priority: result.priority } });
    i++;
  }

  // Audit + messages + démo pour les 3 meilleurs prospects
  const top = await prisma.prospect.findMany({
    where: { workspaceId: ws },
    orderBy: { score: "desc" },
    take: 3,
    include: { analysis: true },
  });
  for (const p of top) {
    const site = parseJson<{ site: SiteAnalysis | null }>(p.analysis?.data ?? null, { site: null }).site;
    const audit = buildAuditWithRules({
      businessName: p.businessName,
      category: p.category,
      city: p.city,
      rating: p.rating,
      reviewCount: p.reviewCount,
      hasWebsite: Boolean(p.websiteUrl),
      site,
      facebookUrl: p.facebookUrl,
      instagramUrl: p.instagramUrl,
      phone: p.phone,
      email: p.email,
      priority: (p.priority as "faible" | "moyenne" | "elevee" | "tres_elevee") ?? "moyenne",
    });
    await prisma.auditReport.upsert({
      where: { prospectId: p.id },
      create: { prospectId: p.id, data: toJson(audit) },
      update: { data: toJson(audit) },
    });

    const messages = buildAllMessages({
      businessName: p.businessName,
      category: p.category,
      city: p.city,
      rating: p.rating,
      reviewCount: p.reviewCount,
      hasWebsite: Boolean(p.websiteUrl),
      site,
    });
    await prisma.generatedMessage.deleteMany({ where: { prospectId: p.id } });
    await prisma.generatedMessage.createMany({
      data: messages.map((m) => ({ prospectId: p.id, channel: m.channel, kind: m.kind, subject: m.subject, body: m.body, usedData: toJson(m.usedData) })),
    });
  }

  // Une démonstration de site pour le meilleur prospect
  const best = top[0];
  if (best && (await prisma.websiteDemo.count({ where: { prospectId: best.id } })) === 0) {
    const template = templateForCategory(best.category);
    const content = buildWebsiteContent(
      {
        businessName: best.businessName,
        category: best.category,
        city: best.city,
        description: best.description,
        phone: best.phone,
        email: best.email,
        address: best.address,
        rating: best.rating,
        reviewCount: best.reviewCount,
      },
      template,
    );
    await prisma.websiteDemo.create({
      data: {
        workspaceId: ws,
        prospectId: best.id,
        slug: slugify(best.businessName) || "demo",
        template,
        content: toJson(content),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await changeStatus(best.id, "qualifie");
  }

  console.log(`Seed terminé : ${prospects.length} prospects (dont ${totalImported} nouveaux), compte ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
