import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { desc, gte, sql } from "drizzle-orm";

import { getDb, hasDatabase } from "@/db";
import * as schema from "@/db/schema";

/**
 * Mesure d'audience interne, sans cookie ni identifiant persistant.
 *
 * Deux chiffres seulement : le nombre de consultations par page et par jour,
 * et une estimation du nombre de visites distinctes. Cette dernière repose
 * sur une empreinte salée — sha256(sel du jour + adresse + navigateur) — dont
 * le sel change toutes les vingt-quatre heures. Conséquences voulues :
 *
 *   — l'empreinte n'est pas réversible vers l'adresse IP ;
 *   — la même personne n'est pas reconnaissable d'un jour sur l'autre ;
 *   — aucun consentement n'est requis (exemption CNIL pour la mesure
 *     d'audience strictement nécessaire, sans recoupement ni partage).
 *
 * Aucune adresse IP n'est jamais écrite. Sans base de données, les compteurs
 * vivent en mémoire : la démonstration reste déroulable, les chiffres
 * disparaissent au redémarrage.
 */

const RETENTION_JOURS = 30;

type Memoire = {
  vues: Map<string, number>; // `${jour}|${chemin}` -> compteur
  empreintes: Set<string>; // `${jour}|${empreinte}`
};

const globalForAudience = globalThis as unknown as {
  __cronosticAudience?: Memoire;
  __cronosticSel?: string;
};

function memoire(): Memoire {
  globalForAudience.__cronosticAudience ??= { vues: new Map(), empreintes: new Set() };
  return globalForAudience.__cronosticAudience;
}

/** Sel de l'installation. Faute de variable d'environnement, un sel aléatoire
 *  est tiré au démarrage : les empreintes deviennent alors incomparables d'un
 *  redémarrage à l'autre, ce qui dégrade la statistique sans jamais exposer
 *  quoi que ce soit. */
function selInstallation(): string {
  const fourni = process.env.ANALYTICS_SALT;
  if (fourni) return fourni;
  globalForAudience.__cronosticSel ??= randomBytes(32).toString("hex");
  return globalForAudience.__cronosticSel;
}

export function jourCourant(): string {
  return new Date().toISOString().slice(0, 10);
}

function empreinte(jour: string, adresse: string, navigateur: string): string {
  return createHash("sha256")
    .update(`${selInstallation()}|${jour}|${adresse}|${navigateur}`)
    .digest("base64url")
    .slice(0, 22);
}

/** Ne garde qu'un chemin propre et borné : ni requête, ni fragment, ni URL
 *  d'une autre origine glissée par un client bavard. */
export function normaliserChemin(brut: string): string | null {
  if (!brut.startsWith("/")) return null;
  const chemin = brut.split("?")[0].split("#")[0];
  if (chemin.length > 120) return null;
  // Ni l'administration, ni l'espace personnel : le tableau de bord porte
  // sur le contenu public, et rien ne doit rapprocher une empreinte d'un compte.
  if (/^\/(api\/|admin|account)/.test(chemin)) return null;
  return chemin;
}

export async function enregistrerVue(
  chemin: string,
  contexte: { adresse: string | null; navigateur: string | null },
): Promise<void> {
  const jour = jourCourant();
  const marque = empreinte(jour, contexte.adresse ?? "-", contexte.navigateur ?? "-");

  if (!hasDatabase()) {
    const m = memoire();
    const cle = `${jour}|${chemin}`;
    m.vues.set(cle, (m.vues.get(cle) ?? 0) + 1);
    m.empreintes.add(`${jour}|${marque}`);
    return;
  }

  const db = getDb();
  await db
    .insert(schema.pageViews)
    .values({ day: jour, path: chemin, views: 1 })
    .onConflictDoUpdate({
      target: [schema.pageViews.day, schema.pageViews.path],
      set: { views: sql`${schema.pageViews.views} + 1` },
    });

  await db
    .insert(schema.visitFingerprints)
    .values({ day: jour, fingerprint: marque })
    .onConflictDoNothing();
}

/** Purge les empreintes au-delà de la rétention. Appelée au fil de l'eau
 *  depuis le tableau de bord : pas d'ordonnanceur à maintenir. */
export async function purgerEmpreintes(): Promise<void> {
  if (!hasDatabase()) {
    const limite = jourDecale(-RETENTION_JOURS);
    const m = memoire();
    for (const cle of m.empreintes) {
      if (cle.slice(0, 10) < limite) m.empreintes.delete(cle);
    }
    return;
  }
  const db = getDb();
  await db
    .delete(schema.visitFingerprints)
    .where(sql`${schema.visitFingerprints.day} < ${jourDecale(-RETENTION_JOURS)}`);
}

export function jourDecale(jours: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

export type Audience = {
  vues_totales: number;
  visites_estimees: number;
  pages: { chemin: string; vues: number }[];
  jours: { jour: string; vues: number }[];
};

export async function audience(jours = 30): Promise<Audience> {
  const depuis = jourDecale(-(jours - 1));

  if (!hasDatabase()) {
    const m = memoire();
    const parPage = new Map<string, number>();
    const parJour = new Map<string, number>();
    let total = 0;
    for (const [cle, n] of m.vues) {
      const [jour, chemin] = [cle.slice(0, 10), cle.slice(11)];
      if (jour < depuis) continue;
      total += n;
      parPage.set(chemin, (parPage.get(chemin) ?? 0) + n);
      parJour.set(jour, (parJour.get(jour) ?? 0) + n);
    }
    let visites = 0;
    for (const cle of m.empreintes) if (cle.slice(0, 10) >= depuis) visites++;
    return {
      vues_totales: total,
      visites_estimees: visites,
      pages: [...parPage.entries()]
        .map(([chemin, vues]) => ({ chemin, vues }))
        .sort((a, b) => b.vues - a.vues),
      jours: [...parJour.entries()]
        .map(([jour, vues]) => ({ jour, vues }))
        .sort((a, b) => (a.jour < b.jour ? 1 : -1)),
    };
  }

  const db = getDb();
  const [pages, parJour, visites] = await Promise.all([
    db
      .select({
        chemin: schema.pageViews.path,
        vues: sql<number>`sum(${schema.pageViews.views})::int`,
      })
      .from(schema.pageViews)
      .where(gte(schema.pageViews.day, depuis))
      .groupBy(schema.pageViews.path)
      .orderBy(desc(sql`sum(${schema.pageViews.views})`)),
    db
      .select({
        jour: schema.pageViews.day,
        vues: sql<number>`sum(${schema.pageViews.views})::int`,
      })
      .from(schema.pageViews)
      .where(gte(schema.pageViews.day, depuis))
      .groupBy(schema.pageViews.day)
      .orderBy(desc(schema.pageViews.day)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.visitFingerprints)
      .where(gte(schema.visitFingerprints.day, depuis)),
  ]);

  return {
    vues_totales: pages.reduce((s, p) => s + Number(p.vues), 0),
    visites_estimees: Number(visites[0]?.total ?? 0),
    pages: pages.map((p) => ({ chemin: p.chemin, vues: Number(p.vues) })),
    jours: parJour.map((j) => ({ jour: String(j.jour), vues: Number(j.vues) })),
  };
}

/** Consultations d'une page précise — utilisé pour classer les guides. */
export async function vuesParChemin(chemins: string[], jours = 30): Promise<Record<string, number>> {
  const resultat: Record<string, number> = {};
  const { pages } = await audience(jours);
  for (const chemin of chemins) {
    resultat[chemin] = pages.find((p) => p.chemin === chemin)?.vues ?? 0;
  }
  return resultat;
}
