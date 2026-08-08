"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import {
  createGuide,
  deleteGuide as deleteGuideRow,
  getGuideById,
  updateGuide,
} from "@/lib/repo";

function refresh(caliberSlug?: string) {
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  revalidatePath("/");
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
  if (patch.isActive && !existing.r2FileKey) {
    await updateGuide(id, { ...patch, isActive: false });
    refresh(existing.caliberSlug);
    redirect(`/admin/guides/${id}?erreur=pdf-manquant`);
  }

  await updateGuide(id, patch);
  refresh(existing.caliberSlug);
  redirect(`/admin/guides/${id}?enregistre=1`);
}

export async function togglePublishAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("guideId") ?? "");
  const guide = await getGuideById(id);
  if (!guide) throw new Error("Guide introuvable.");

  if (!guide.isActive && !guide.r2FileKey) {
    redirect(`/admin/guides/${id}?erreur=pdf-manquant`);
  }

  await updateGuide(id, { isActive: !guide.isActive });
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
