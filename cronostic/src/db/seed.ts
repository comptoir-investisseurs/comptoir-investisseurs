import "dotenv/config";

import { eq } from "drizzle-orm";

import { CALIBERS, FAMILIES, GUIDES, LUBRICANTS, PARTS, TOOLS } from "../data/catalog";
import { MARQUES } from "../data/encyclopedie";
import { slugMouvement, specsDe } from "../lib/encyclopedie";
import { getDb, schema } from "./index";

/**
 * Seed du catalogue de lancement.
 *
 * Idempotent : relancer la commande met à jour les enregistrements existants
 * sans dupliquer. Aucune donnée utilisateur, achat ou abonnement n'est touchée.
 *
 *   npm run db:push && npm run db:seed
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL est absente : rien à seeder.");
    process.exit(1);
  }

  const db = getDb();

  /* Familles ------------------------------------------------ */
  const familyIds = new Map<string, string>();
  for (const family of FAMILIES) {
    const [row] = await db
      .insert(schema.caliberFamilies)
      .values({
        slug: family.slug,
        name: family.name,
        brand: family.brand,
        yearsActive: family.yearsActive,
        description: family.description,
      })
      .onConflictDoUpdate({
        target: schema.caliberFamilies.slug,
        set: { name: family.name, description: family.description, yearsActive: family.yearsActive },
      })
      .returning({ id: schema.caliberFamilies.id });
    familyIds.set(family.slug, row.id);
  }

  /* Calibres ------------------------------------------------ */
  const caliberIds = new Map<string, string>();
  for (const caliber of CALIBERS) {
    const values = {
      slug: caliber.slug,
      brand: "Omega",
      reference: caliber.reference,
      name: caliber.name,
      familyId: familyIds.get(caliber.family) ?? null,
      introducedYear: caliber.introducedYear ?? null,
      discontinuedYear: caliber.discontinuedYear ?? null,
      summary: caliber.summary,
      presentation: caliber.presentation,
      history: caliber.history,
      architecture: caliber.architecture,
      dataStatus: "draft",
      isPublished: true,
      updatedAt: new Date(),
    };

    const [row] = await db
      .insert(schema.calibers)
      .values(values)
      .onConflictDoUpdate({ target: schema.calibers.slug, set: values })
      .returning({ id: schema.calibers.id });
    caliberIds.set(caliber.slug, row.id);
  }

  /* Caractéristiques ---------------------------------------- */
  for (const caliber of CALIBERS) {
    const caliberId = caliberIds.get(caliber.slug)!;
    await db.delete(schema.caliberSpecs).where(eq(schema.caliberSpecs.caliberId, caliberId));
    await db.insert(schema.caliberSpecs).values(
      caliber.specs.map((spec, position) => ({
        caliberId,
        key: spec.key,
        label: spec.label,
        value: spec.value,
        unit: spec.unit ?? null,
        position,
        isVerified: spec.verified ?? false,
        source: spec.source ?? null,
        sourceUrl: spec.sourceUrl ?? null,
      })),
    );
  }

  /* Calibres apparentés ------------------------------------- */
  for (const caliber of CALIBERS) {
    const caliberId = caliberIds.get(caliber.slug)!;
    await db
      .delete(schema.caliberRelations)
      .where(eq(schema.caliberRelations.caliberId, caliberId));
    const relations = caliber.related
      .map((slug) => caliberIds.get(slug))
      .filter((id): id is string => Boolean(id))
      .map((relatedCaliberId) => ({ caliberId, relatedCaliberId, relation: "famille" }));
    if (relations.length > 0) {
      await db.insert(schema.caliberRelations).values(relations).onConflictDoNothing();
    }
  }

  /* Pièces --------------------------------------------------- */
  const partIds = new Map<string, string>();
  for (const part of PARTS) {
    const values = {
      reference: part.reference,
      name: part.name,
      nameEn: part.nameEn,
      category: part.category,
      description: part.description ?? null,
    };
    const [row] = await db
      .insert(schema.parts)
      .values(values)
      .onConflictDoUpdate({ target: schema.parts.reference, set: values })
      .returning({ id: schema.parts.id });
    partIds.set(part.reference, row.id);
  }

  for (const caliber of CALIBERS) {
    const caliberId = caliberIds.get(caliber.slug)!;
    const rows = caliber.parts
      .map((reference) => {
        const partId = partIds.get(reference);
        const seedPart = PARTS.find((p) => p.reference === reference);
        if (!partId || !seedPart) return null;
        return { partId, caliberId, positionNumber: seedPart.positionNumber, notes: null };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (rows.length > 0) {
      await db.insert(schema.partCalibers).values(rows).onConflictDoNothing();
    }
  }

  /* Lubrifiants --------------------------------------------- */
  const lubricantIds = new Map<string, string>();
  for (const lubricant of LUBRICANTS) {
    const values = {
      slug: lubricant.slug,
      brand: lubricant.brand,
      reference: lubricant.reference,
      name: lubricant.name,
      type: lubricant.type,
      viscosity: lubricant.viscosity ?? null,
      usage: lubricant.usage,
      colorHex: lubricant.colorHex,
    };
    const [row] = await db
      .insert(schema.lubricants)
      .values(values)
      .onConflictDoUpdate({ target: schema.lubricants.slug, set: values })
      .returning({ id: schema.lubricants.id });
    lubricantIds.set(lubricant.slug, row.id);
  }

  for (const caliber of CALIBERS) {
    const caliberId = caliberIds.get(caliber.slug)!;
    await db
      .delete(schema.caliberLubricationPoints)
      .where(eq(schema.caliberLubricationPoints.caliberId, caliberId));
    if (caliber.lubrication.length > 0) {
      await db.insert(schema.caliberLubricationPoints).values(
        caliber.lubrication.map((point, position) => ({
          caliberId,
          lubricantId: lubricantIds.get(point.lubricant) ?? null,
          location: point.location,
          quantity: point.quantity ?? null,
          notes: point.notes ?? null,
          position,
        })),
      );
    }
  }

  /* Outillage ------------------------------------------------ */
  const toolIds = new Map<string, string>();
  for (const tool of TOOLS) {
    const values = {
      slug: tool.slug,
      name: tool.name,
      category: tool.category,
      description: tool.description,
    };
    const [row] = await db
      .insert(schema.tools)
      .values(values)
      .onConflictDoUpdate({ target: schema.tools.slug, set: values })
      .returning({ id: schema.tools.id });
    toolIds.set(tool.slug, row.id);
  }

  for (const caliber of CALIBERS) {
    const caliberId = caliberIds.get(caliber.slug)!;
    const rows = caliber.tools
      .map((slug) => toolIds.get(slug))
      .filter((id): id is string => Boolean(id))
      .map((toolId) => ({ caliberId, toolId, notes: null }));
    if (rows.length > 0) {
      await db.insert(schema.caliberTools).values(rows).onConflictDoNothing();
    }
  }

  /* Encyclopédie --------------------------------------------
     Les fiches d'amorce entrent en base au même titre que les calibres
     documentés. Ce n'est pas une redondance : sans ligne en base, aucun guide
     ne pourrait leur être rattaché — la clé étrangère l'interdirait. Une fiche
     d'amorce doit pouvoir devenir vendeuse sans migration préalable. */
  let amorces = 0;
  for (const marque of MARQUES) {
    for (const mvt of marque.mouvements) {
      const slug = slugMouvement(marque, mvt);
      if (caliberIds.has(slug)) continue; // le calibre documenté l'emporte

      const periode =
        mvt.debut && mvt.fin
          ? `${mvt.debut}–${mvt.fin}`
          : mvt.debut
            ? `à partir de ${mvt.debut}`
            : null;
      const resume = [mvt.nom, mvt.base ? `base ${mvt.base}` : null, periode]
        .filter(Boolean)
        .join(", ");

      const [row] = await db
        .insert(schema.calibers)
        .values({
          slug,
          brand: marque.nom,
          reference: mvt.ref,
          name: mvt.nom ? `${marque.nom} ${mvt.ref} — ${mvt.nom}` : `${marque.nom} calibre ${mvt.ref}`,
          familyId: null,
          introducedYear: mvt.debut ?? null,
          discontinuedYear: mvt.fin ?? null,
          summary: `${marque.nom} — ${resume}.`,
          // Aucune présentation rédigée : c'est ce qui distingue une fiche
          // d'amorce d'une fiche relue à l'établi.
          presentation: mvt.note ?? null,
          history: null,
          architecture: null,
          dataStatus: "draft",
          isPublished: true,
        })
        .onConflictDoUpdate({
          target: schema.calibers.slug,
          set: { brand: marque.nom, reference: mvt.ref, summary: `${marque.nom} — ${resume}.` },
        })
        .returning({ id: schema.calibers.id });

      caliberIds.set(slug, row.id);
      amorces++;

      const specs = specsDe(mvt).map((spec, i) => ({
        caliberId: row.id,
        key: spec.key,
        label: spec.label,
        value: spec.value,
        unit: spec.unit,
        isVerified: false,
        position: i,
      }));
      if (specs.length > 0) {
        await db
          .insert(schema.caliberSpecs)
          .values(specs)
          .onConflictDoNothing({ target: [schema.caliberSpecs.caliberId, schema.caliberSpecs.key] });
      }
    }
  }

  /* Guides --------------------------------------------------- */
  // Créés en brouillon, sans PDF : le fichier se téléverse depuis /admin/guides.
  for (const guide of GUIDES) {
    const caliberId = caliberIds.get(guide.caliberSlug);
    if (!caliberId) continue;
    await db
      .insert(schema.guides)
      .values({
        caliberId,
        title: guide.title,
        slug: guide.slug,
        shortDescription: guide.shortDescription,
        priceCents: guide.priceCents,
        currency: "EUR",
        pageCount: guide.pageCount,
        includedInSubscription: guide.includedInSubscription,
        isActive: guide.isActive,
      })
      .onConflictDoNothing({ target: schema.guides.slug });
  }

  console.log(
    `Seed terminé : ${FAMILIES.length} famille(s), ${CALIBERS.length} calibres documentés, ${amorces} fiches d'amorce sur ${MARQUES.length} marques, ${PARTS.length} fournitures, ${LUBRICANTS.length} lubrifiants, ${TOOLS.length} outils, ${GUIDES.length} guides (brouillon).`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
