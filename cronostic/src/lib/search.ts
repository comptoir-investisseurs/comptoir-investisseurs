import type { GuideRow, LubricantRow, PartRow, CaliberSummary, ToolRow } from "./types";

/**
 * Index de recherche unifié.
 *
 * Le catalogue de lancement tient intégralement en mémoire : l'index est
 * construit côté serveur, sérialisé dans la page, et filtré côté client sans
 * aller-retour réseau. C'est la bonne réponse à l'établi — on tape une
 * référence, on a la réponse immédiatement, y compris hors connexion stable.
 *
 * Le jour où le catalogue dépassera quelques milliers d'entrées, seule la
 * construction de l'index changera : la signature `EntreeIndex` et le
 * composant de recherche resteront tels quels.
 */

export type TypeEntree = "calibre" | "guide" | "piece" | "huile" | "outil" | "page";

export type EntreeIndex = {
  type: TypeEntree;
  /** Ce qui s'affiche en tête de ligne — référence, numéro de fourniture. */
  titre: string;
  /** Libellé courant. */
  sous_titre: string;
  /** Complément aligné à droite : année, prix, viscosité. */
  detail: string | null;
  href: string;
  /** Termes supplémentaires interrogés mais non affichés. */
  termes: string;
};

const LIBELLES: Record<TypeEntree, string> = {
  calibre: "Calibre",
  guide: "Guide",
  piece: "Fourniture",
  huile: "Consommable",
  outil: "Outillage",
  page: "Page",
};

export function libelle(type: TypeEntree): string {
  return LIBELLES[type];
}

/** Pages fixes utiles : on ne fait pas chercher un menu à l'utilisateur. */
const PAGES: EntreeIndex[] = [
  {
    type: "page",
    titre: "Guides Cronostic",
    sous_titre: "Catalogue des manuels de service",
    detail: null,
    href: "/guides",
    termes: "manuel pdf achat catalogue",
  },
  {
    type: "page",
    titre: "Recherche de pièces",
    sous_titre: "Fournitures d'occasion et estimation de prix",
    detail: null,
    href: "/pieces",
    termes: "ebay occasion prix annonce fourniture",
  },
  {
    type: "page",
    titre: "Huiles et consommables",
    sous_titre: "Références de lubrifiants et points d'application",
    detail: null,
    href: "/huiles",
    termes: "huile graisse moebius lubrification",
  },
  {
    type: "page",
    titre: "Abonnements",
    sous_titre: "Formules Atelier et Intégrale",
    detail: null,
    href: "/pro",
    termes: "abonnement tarif prix formule pro",
  },
  {
    type: "page",
    titre: "Mes guides",
    sous_titre: "Vos achats et téléchargements",
    detail: null,
    href: "/account/guides",
    termes: "compte telechargement achat",
  },
];

export function construireIndex(sources: {
  calibers: CaliberSummary[];
  guides: GuideRow[];
  parts: PartRow[];
  lubricants: LubricantRow[];
  tools: ToolRow[];
}): EntreeIndex[] {
  const entrees: EntreeIndex[] = [];

  for (const c of sources.calibers) {
    entrees.push({
      type: "calibre",
      titre: c.reference,
      sous_titre: c.name,
      detail: c.introducedYear ? String(c.introducedYear) : null,
      href: `/calibres/${c.slug}`,
      termes: [c.brand, c.familyName ?? "", c.slug, c.summary ?? ""].join(" "),
    });
  }

  for (const g of sources.guides) {
    if (!g.isActive) continue;
    entrees.push({
      type: "guide",
      titre: `Omega ${g.caliberReference}`,
      sous_titre: g.title,
      detail: `${(g.priceCents / 100).toFixed(2).replace(".", ",")} €`,
      href: `/guides/${g.slug}`,
      termes: [g.shortDescription ?? "", g.caliberName, "manuel service demontage remontage"].join(
        " ",
      ),
    });
  }

  for (const p of sources.parts) {
    entrees.push({
      type: "piece",
      titre: p.reference,
      sous_titre: p.name,
      detail: p.positionNumber ? `n° ${p.positionNumber}` : null,
      href: `/pieces?piece=${encodeURIComponent(p.reference)}`,
      termes: [p.nameEn ?? "", p.category ?? "", p.description ?? ""].join(" "),
    });
  }

  for (const l of sources.lubricants) {
    entrees.push({
      type: "huile",
      titre: l.reference,
      sous_titre: `${l.brand} ${l.name}`,
      detail: l.viscosity,
      href: `/huiles#${l.slug}`,
      termes: [l.type, l.usage ?? "", l.slug].join(" "),
    });
  }

  for (const t of sources.tools) {
    entrees.push({
      type: "outil",
      titre: t.name,
      sous_titre: t.category ?? "Outillage",
      detail: null,
      href: `/calibres`,
      termes: [t.description ?? "", t.slug].join(" "),
    });
  }

  return [...entrees, ...PAGES];
}

/** Retire accents, ponctuation et casse : « Bréguet » trouve « breguet ». */
export function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Ordre d'affichage des groupes : le plus probable d'abord. */
const RANG: Record<TypeEntree, number> = {
  calibre: 0,
  guide: 1,
  piece: 2,
  huile: 3,
  outil: 4,
  page: 5,
};

/**
 * Filtre l'index. Le classement suit la qualité de la correspondance, pas
 * l'ordre du catalogue : une référence tapée en entier passe avant une
 * occurrence au milieu d'une description.
 */
export function chercher(index: EntreeIndex[], requete: string, limite = 12): EntreeIndex[] {
  const q = normaliser(requete);
  if (!q) return [];

  // « omega 265 », « calibre 265 », « cal. 265 » : le préfixe n'apporte rien.
  const noyau = q.replace(/^(omega|calibres?|cal|ref|reference)\s+/, "") || q;
  const mots = noyau.split(" ").filter(Boolean);

  const scores: { entree: EntreeIndex; score: number }[] = [];

  for (const entree of index) {
    const titre = normaliser(entree.titre);
    const reste = normaliser(`${entree.sous_titre} ${entree.termes}`);
    const tout = `${titre} ${reste}`;

    // Tous les mots doivent être présents : « huile balancier » ne remonte pas
    // tout ce qui contient « huile ».
    if (!mots.every((m) => tout.includes(m))) continue;

    let score = 0;
    if (titre === noyau) score += 100;
    else if (titre.startsWith(noyau)) score += 60;
    else if (titre.includes(noyau)) score += 35;
    else if (reste.includes(noyau)) score += 12;
    else score += 5;

    score -= RANG[entree.type];
    scores.push({ entree, score });
  }

  return scores
    .sort((a, b) => b.score - a.score || RANG[a.entree.type] - RANG[b.entree.type])
    .slice(0, limite)
    .map((s) => s.entree);
}
