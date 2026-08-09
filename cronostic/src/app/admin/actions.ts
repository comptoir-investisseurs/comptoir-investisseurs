"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readFile } from "node:fs/promises";

import { requireAdmin } from "@/lib/auth";
import { aUnPdfDansLeDepot, calibresAvecPdf, pdfDisponibles, pdfDuDepot } from "@/lib/guide-files";
import { compterPages } from "@/lib/pdf";
import { readObject } from "@/lib/r2";
import { slugify } from "@/lib/format";
import {
  createGuide,
  deleteGuide as deleteGuideRow,
  getGuideById,
  listCalibresTous,
  listGuides,
  updateGuide,
} from "@/lib/repo";

/**
 * Nombre de pages relevé sur le fichier lui-même, quand la fiche ne le porte
 * pas encore. Le saisir à la main pour chaque guide n'apporte rien : la valeur
 * est dans le PDF. Un échec de lecture laisse simplement le champ vide.
 */
async function pagesDuFichier(guide: {
  r2FileKey: string | null;
  caliberSlug: string;
}): Promise<number | null> {
  try {
    if (guide.r2FileKey) {
      const buffer = await readObject(guide.r2FileKey);
      if (buffer) return compterPages(buffer);
    }
    const chemin = pdfDuDepot(guide.caliberSlug);
    if (chemin) return compterPages(await readFile(chemin));
  } catch {
    // Sans conséquence : la fiche reste sans nombre de pages.
  }
  return null;
}

function refresh(caliberSlug?: string) {
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  revalidatePath("/");
  revalidatePath("/calibres");
  revalidatePath("/marques");
  // L'index de recherche embarque les guides publiés : sans cette ligne, un
  // guide tout juste mis en vente reste introuvable jusqu'à expiration du cache.
  revalidatePath("/api/recherche");
  if (caliberSlug) revalidatePath(`/calibres/${caliberSlug}`);
}

function readGuideForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const caliberId = String(formData.get("caliberId") ?? "");
  const priceEuros = Number(String(formData.get("price") ?? "0").replace(",", "."));
  const pageCountRaw = String(formData.get("pageCount") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();

  if (!title) throw new Error("Le titre est obligatoire.");
  if (!caliberId) throw new Error("Le calibre est obligatoire.");
  if (!Number.isFinite(priceEuros) || priceEuros < 0) throw new Error("Prix invalide.");

  return {
    caliberId,
    title,
    slug: slugify(String(formData.get("slug") ?? "") || title),
    shortDescription: String(formData.get("shortDescription") ?? "").trim() || null,
    priceCents: Math.round(priceEuros * 100),
    pageCount: pageCountRaw ? Number(pageCountRaw) : null,
    includedInSubscription: formData.get("includedInSubscription") === "on",
    isActive: formData.get("isActive") === "on",
    coverImageUrl: coverImageUrl || null,
  };
}

export async function createGuideAction(formData: FormData) {
  await requireAdmin();
  const input = readGuideForm(formData);
  // Un guide tout juste créé n'a pas encore de PDF : il naît toujours en brouillon.
  const guide = await createGuide({ ...input, isActive: false });
  refresh(guide.caliberSlug);
  redirect(`/admin/guides/${guide.id}${input.isActive ? "?erreur=pdf-manquant" : ""}`);
}

export async function updateGuideAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("guideId") ?? "");
  const existing = await getGuideById(id);
  if (!existing) throw new Error("Guide introuvable.");

  const patch = readGuideForm(formData);
  // La publication reste impossible tant que le PDF final n'est pas téléversé.
  if (patch.isActive && !existing.r2FileKey && !aUnPdfDansLeDepot(existing.caliberSlug)) {
    await updateGuide(id, { ...patch, isActive: false });
    refresh(existing.caliberSlug);
    redirect(`/admin/guides/${id}?erreur=pdf-manquant`);
  }

  await updateGuide(id, {
    ...patch,
    pageCount: patch.pageCount ?? (await pagesDuFichier(existing)),
  });
  refresh(existing.caliberSlug);
  redirect(`/admin/guides/${id}?enregistre=1`);
}

export async function togglePublishAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("guideId") ?? "");
  const guide = await getGuideById(id);
  if (!guide) throw new Error("Guide introuvable.");

  if (!guide.isActive && !guide.r2FileKey && !aUnPdfDansLeDepot(guide.caliberSlug)) {
    redirect(`/admin/guides/${id}?erreur=pdf-manquant`);
  }

  await updateGuide(id, {
    isActive: !guide.isActive,
    ...(guide.pageCount === null ? { pageCount: await pagesDuFichier(guide) } : {}),
  });
  refresh(guide.caliberSlug);
  redirect("/admin/guides");
}

export async function toggleProAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("guideId") ?? "");
  const guide = await getGuideById(id);
  if (!guide) throw new Error("Guide introuvable.");
  await updateGuide(id, { includedInSubscription: !guide.includedInSubscription });
  refresh(guide.caliberSlug);
  redirect("/admin/guides");
}

export async function deleteGuideAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("guideId") ?? "");
  const guide = await getGuideById(id);
  await deleteGuideRow(id);
  refresh(guide?.caliberSlug);
  redirect("/admin/guides");
}

/**
 * Crée les fiches guides manquantes à partir des PDF déposés dans `guides-pdf/`.
 *
 * C'est le geste qui accompagne l'alimentation du catalogue : on dépose les
 * fichiers, on clique une fois, les fiches existent. Elles naissent en
 * **brouillon** — un PDF posé dans le dépôt ne se met jamais en vente tout
 * seul, la publication reste une décision.
 *
 * Idempotent : un calibre qui porte déjà un guide est ignoré. Un fichier dont
 * le nom ne désigne aucun calibre, ou en désigne deux, est laissé de côté et
 * signalé — on ne devine pas.
 */
export async function importerPdfDuDepotAction() {
  await requireAdmin();

  const [calibres, guides] = await Promise.all([listCalibresTous(), listGuides()]);
  const dejaServis = new Set(guides.map((g) => g.caliberSlug));
  const candidats = calibresAvecPdf(calibres.map((c) => c.slug)).filter(
    (slug) => !dejaServis.has(slug),
  );

  let crees = 0;
  for (const slug of candidats) {
    const calibre = calibres.find((c) => c.slug === slug);
    if (!calibre) continue;
    const chemin = pdfDuDepot(slug);
    if (!chemin) continue;

    await createGuide({
      caliberId: calibre.id,
      title: `${calibre.brand.toUpperCase()} ${calibre.reference} — Guide complet d'entretien`,
      slug: `guide-${slug}`,
      shortDescription: `Le guide d'atelier Cronostic consacré au calibre ${calibre.brand} ${calibre.reference} : démontage, nettoyage, contrôle, lubrification, remontage et points de vigilance.`,
      priceCents: 1490,
      pageCount: await compterPages(await readFile(chemin)),
      includedInSubscription: true,
      isActive: false,
      coverImageUrl: null,
    });
    crees++;
  }

  const orphelins = pdfDisponibles().length - guides.length - crees;
  refresh();
  redirect(`/admin/guides?importes=${crees}&orphelins=${Math.max(0, orphelins)}`);
}
