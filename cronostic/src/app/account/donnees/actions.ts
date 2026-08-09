"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEV_SESSION_COOKIE, requireUser } from "@/lib/auth";
import { hasClerk } from "@/lib/env";
import { supprimerUtilisateur } from "@/lib/repo";
import { viderPanier } from "@/lib/cart";

/**
 * Effacement du compte (RGPD, art. 17).
 *
 * La confirmation est explicite : il faut saisir son adresse. Une suppression
 * déclenchée par un clic malheureux ferait perdre les guides achetés — un
 * geste irréversible mérite une saisie, pas une case à cocher.
 */
export async function supprimerMonCompte(formData: FormData) {
  const user = await requireUser("/account/donnees");
  const saisie = String(formData.get("confirmation") ?? "")
    .trim()
    .toLowerCase();

  if (saisie !== user.email.toLowerCase()) {
    redirect("/account/donnees?erreur=confirmation");
  }

  await supprimerUtilisateur(user.id);

  if (hasClerk) {
    // Le compte d'authentification est supprimé chez Clerk aussi : le laisser
    // vivant recréerait silencieusement la ligne au prochain passage.
    try {
      const { currentUser, clerkClient } = await import("@clerk/nextjs/server");
      const compte = await currentUser();
      if (compte) await (await clerkClient()).users.deleteUser(compte.id);
    } catch (error) {
      console.error("[rgpd] suppression Clerk en échec", error);
    }
  }

  await viderPanier();
  const jar = await cookies();
  jar.delete(DEV_SESSION_COOKIE);

  redirect("/compte-supprime");
}
