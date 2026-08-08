import "server-only";

import { cookies } from "next/headers";

import { ownedGuideIds } from "./entitlements";
import { getGuideById } from "./repo";
import type { AppUser, GuideRow } from "./types";

/**
 * Panier.
 *
 * Il ne contient que des identifiants de guides, dans un cookie : un guide
 * numérique n'a ni quantité, ni stock, ni frais de port. Le panier survit à la
 * connexion, ce qui permet de le remplir avant d'avoir un compte, puis de
 * payer une fois connecté.
 *
 * Les guides déjà acquis sont retirés à la lecture : on ne vend jamais deux
 * fois le même fichier.
 */

const COOKIE = "cronostic_panier";
const MAX = 20;

async function lireIds(): Promise<string[]> {
  const jar = await cookies();
  const brut = jar.get(COOKIE)?.value;
  if (!brut) return [];
  return brut.split(",").filter(Boolean).slice(0, MAX);
}

async function ecrireIds(ids: string[]): Promise<void> {
  const jar = await cookies();
  const uniques = [...new Set(ids)].slice(0, MAX);
  if (uniques.length === 0) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, uniques.join(","), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function ajouterAuPanier(guideId: string): Promise<void> {
  await ecrireIds([...(await lireIds()), guideId]);
}

export async function retirerDuPanier(guideId: string): Promise<void> {
  await ecrireIds((await lireIds()).filter((id) => id !== guideId));
}

export async function viderPanier(): Promise<void> {
  await ecrireIds([]);
}

export async function panierContient(guideId: string): Promise<boolean> {
  return (await lireIds()).includes(guideId);
}

export type Panier = {
  lignes: GuideRow[];
  totalCents: number;
  currency: string;
  /** Guides retirés parce que déjà acquis, signalés à l'utilisateur. */
  dejaAcquis: GuideRow[];
};

export async function lirePanier(user: AppUser | null): Promise<Panier> {
  const ids = await lireIds();
  const guides = (await Promise.all(ids.map((id) => getGuideById(id)))).filter(
    (g): g is GuideRow => g !== null && g.isActive,
  );

  const possedes = await ownedGuideIds(user);
  const lignes = guides.filter((g) => !possedes.has(g.id));
  const dejaAcquis = guides.filter((g) => possedes.has(g.id));

  return {
    lignes,
    dejaAcquis,
    totalCents: lignes.reduce((somme, g) => somme + g.priceCents, 0),
    currency: lignes[0]?.currency ?? "EUR",
  };
}

/** Nombre d'articles, pour la pastille de l'en-tête. */
export async function nombreArticles(user: AppUser | null): Promise<number> {
  return (await lirePanier(user)).lignes.length;
}
