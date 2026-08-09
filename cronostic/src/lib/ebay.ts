import "server-only";

import { hasEbay } from "./env";

/**
 * Recherche d'offres de pièces détachées.
 *
 * Deux choix guident cette implémentation :
 *
 * 1. On ne cherche que des **fournitures**, jamais des montres complètes. La
 *    Browse API est donc restreinte aux catégories de pièces horlogères, et
 *    les intitulés évoquant une montre entière sont écartés — sans quoi une
 *    recherche « Omega 265 » remonte surtout des montres à quatre chiffres.
 *
 * 2. On affiche une **estimation de prix** : moyenne des annonces retenues,
 *    accompagnée de la fourchette et de l'effectif. Une moyenne seule sur trois
 *    annonces induirait en erreur ; la fourchette dit ce qu'elle vaut.
 *
 * Sans identifiants eBay, la page retombe sur des liens de recherche
 * pré-remplis vers les marchands spécialisés.
 */

export type Listing = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  priceCents: number | null;
  currency: string | null;
  condition: string | null;
  sellerName: string | null;
  location: string | null;
};

export type MerchantLink = {
  merchant: string;
  url: string;
  note: string;
};

export type Estimation = {
  moyenneCents: number;
  minCents: number;
  maxCents: number;
  currency: string;
  effectif: number;
};

export type PartSearchResult =
  | {
      mode: "live";
      query: string;
      listings: Listing[];
      links: MerchantLink[];
      estimation: Estimation | null;
      /** Annonce la moins chère parmi celles retenues. */
      meilleureOffre: Listing | null;
      ecartees: number;
      /** Vrai uniquement en mode démonstration : annonces fictives. */
      exemple?: boolean;
    }
  | {
      mode: "links";
      query: string;
      listings: [];
      links: MerchantLink[];
      estimation: null;
      meilleureOffre: null;
      ecartees: 0;
      reason: string;
    };

const globalForToken = globalThis as unknown as {
  __ebayToken?: { value: string; expiresAt: number };
};

/**
 * Catégories eBay, **facultatives et non renseignées par défaut**.
 *
 * Les identifiants de catégorie diffèrent d'une place de marché à l'autre :
 * un identifiant valable sur ebay.com ne l'est pas forcément sur ebay.fr, et
 * une catégorie inconnue ne renvoie pas une erreur — elle renvoie zéro
 * résultat. Le symptôme est alors indiscernable d'une panne d'API.
 *
 * On préfère donc ne rien filtrer côté eBay et écarter les montres complètes
 * sur l'intitulé, ce qui fonctionne sur toutes les places de marché. Qui veut
 * resserrer renseigne `EBAY_CATEGORY_IDS` après avoir vérifié les
 * identifiants de sa place de marché.
 */
function categories(): string | null {
  const brut = process.env.EBAY_CATEGORY_IDS?.trim();
  return brut ? brut : null;
}

/** Intitulés qui trahissent une montre complète plutôt qu'une fourniture. */
const MONTRE_COMPLETE =
  /\b(wristwatch|montre compl|complete watch|running watch|serviced watch|men'?s watch|ladies'? watch|montre homme|montre femme|avec bracelet|full watch|watch working)\b/i;

function apiHost(): string {
  return process.env.EBAY_ENV === "sandbox" ? "api.sandbox.ebay.com" : "api.ebay.com";
}

async function accessToken(): Promise<string> {
  const cached = globalForToken.__ebayToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(`https://${apiHost()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`eBay OAuth ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  globalForToken.__ebayToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

type EbayItemSummary = {
  itemId: string;
  title: string;
  itemWebUrl: string;
  image?: { imageUrl?: string };
  thumbnailImages?: { imageUrl?: string }[];
  price?: { value?: string; currency?: string };
  condition?: string;
  seller?: { username?: string };
  itemLocation?: { country?: string };
};

/** Liens de recherche profonds vers les marchands de fournitures. */
export function merchantLinks(query: string): MerchantLink[] {
  const q = encodeURIComponent(query);
  return [
    {
      merchant: "eBay",
      // _sacat restreint à la catégorie horlogerie : on évite les montres.
      url: `https://www.ebay.fr/sch/i.html?_nkw=${q}&_sacat=173699`,
      note: "Le plus grand gisement de fournitures d'époque, à l'unité ou en lot.",
    },
    {
      merchant: "Cousins UK",
      url: `https://www.cousinsuk.com/search?SearchTerm=${q}`,
      note: "Fournitures génériques, outillage et consommables d'atelier.",
    },
    {
      merchant: "Otto Frei",
      url: `https://www.ofrei.com/searchresults?q=${q}`,
      note: "Fournisseur américain, bon fonds de pièces anciennes.",
    },
    {
      merchant: "Emmywatch",
      url: `https://emmywatch.com/search?q=${q}`,
      note: "Moteur spécialisé dans les fournitures horlogères d'occasion.",
    },
  ];
}

function estimer(listings: Listing[]): Estimation | null {
  const prix = listings
    .map((l) => l.priceCents)
    .filter((p): p is number => typeof p === "number" && p > 0)
    .sort((a, b) => a - b);
  if (prix.length === 0) return null;

  // Les annonces extrêmes faussent la moyenne sur de petits effectifs : au-delà
  // de cinq offres, on écarte le décile haut et le décile bas.
  const marge = prix.length >= 5 ? Math.floor(prix.length * 0.1) : 0;
  const retenus = prix.slice(marge, prix.length - marge);

  return {
    moyenneCents: Math.round(retenus.reduce((a, b) => a + b, 0) / retenus.length),
    minCents: prix[0],
    maxCents: prix[prix.length - 1],
    currency: listings.find((l) => l.currency)?.currency ?? "EUR",
    effectif: prix.length,
  };
}

/**
 * Jeu d'annonces d'exemple, servi uniquement quand `EBAY_DEMO=1`.
 *
 * Sa seule raison d'être est de montrer la mise en page des annonces avant
 * d'avoir la clé d'API — sur une maquette, une capture, une démonstration.
 * Chaque carte est estampillée « exemple » à l'écran et aucun lien ne pointe
 * vers une annonce réelle : faire passer des données inventées pour des
 * offres du marché serait trompeur.
 *
 * Jamais actif par défaut, jamais actif sans la variable.
 */
function annoncesExemple(query: string): Listing[] {
  const graine = query.length;
  const modeles = [
    ["Axe de balancier — fourniture d'origine, neuve de stock", 3450, "Neuf", "atelier-horloger-fr", "FR"],
    ["Lot de 3 ressorts de barillet — fournitures d'époque", 2790, "Neuf", "vintage-parts-ch", "CH"],
    ["Roue de centre — dépose sur mouvement, contrôlée", 1890, "Occasion", "watchpartsuk", "GB"],
    ["Tige de remontoir — fourniture générique adaptable", 990, "Neuf", "fournitures-horlogerie", "FR"],
    ["Jeu de pierres empierrées — reste de stock d'atelier", 4600, "Neuf", "oldstock-watch", "DE"],
    ["Pont de rouage — pièce de récupération, bon état", 2400, "Occasion", "movement-spares", "IT"],
  ] as const;

  return modeles.map(([titre, prix, etat, vendeur, pays], i) => ({
    id: `exemple-${i}`,
    title: `${query} · ${titre}`,
    // Aucune annonce réelle derrière : on renvoie vers la recherche eBay.
    url: `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}`,
    imageUrl: null,
    priceCents: prix + graine * 7,
    currency: "EUR",
    condition: etat,
    sellerName: vendeur,
    location: pays,
  }));
}

export async function searchParts(query: string, limit = 40): Promise<PartSearchResult> {
  const links = merchantLinks(query);

  if (!hasEbay && process.env.EBAY_DEMO === "1") {
    const listings = annoncesExemple(query);
    return {
      mode: "live",
      query,
      listings,
      links,
      estimation: estimer(listings),
      meilleureOffre: [...listings].sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0))[0],
      ecartees: 0,
      exemple: true,
    };
  }

  if (!hasEbay) {
    return {
      mode: "links",
      query,
      listings: [],
      links,
      estimation: null,
      meilleureOffre: null,
      ecartees: 0,
      reason:
        "Les annonces en direct demandent une clé d'API eBay, qui n'est pas encore configurée sur cette instance. En attendant, les liens ci-dessous ouvrent la recherche chez les marchands spécialisés.",
    };
  }

  try {
    const token = await accessToken();
    const url = new URL(`https://${apiHost()}/buy/browse/v1/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    const cats = categories();
    if (cats) url.searchParams.set("category_ids", cats);
    url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE|AUCTION}");
    // Pas de tri par prix : il remonterait d'abord la visserie à deux euros.
    // La pertinence donne de meilleures premières lignes, et la moins chère
    // est de toute façon calculée ici.

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      // Le corps porte le motif exact : identifiants refusés, quota, filtre
      // invalide. Le taire rendrait tout diagnostic impossible.
      const corps = await res.text().catch(() => "");
      throw new Error(`eBay Browse ${res.status}${corps ? ` — ${corps.slice(0, 300)}` : ""}`);
    }

    const json = (await res.json()) as { itemSummaries?: EbayItemSummary[] };
    const brut = json.itemSummaries ?? [];

    const listings: Listing[] = brut
      .filter((item) => !MONTRE_COMPLETE.test(item.title ?? ""))
      .map((item) => ({
        id: item.itemId,
        title: item.title,
        url: item.itemWebUrl,
        imageUrl: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
        priceCents: item.price?.value ? Math.round(Number(item.price.value) * 100) : null,
        currency: item.price?.currency ?? null,
        condition: item.condition ?? null,
        sellerName: item.seller?.username ?? null,
        location: item.itemLocation?.country ?? null,
      }));

    const avecPrix = listings.filter((l) => l.priceCents !== null);

    return {
      mode: "live",
      query,
      listings,
      links,
      estimation: estimer(listings),
      meilleureOffre:
        avecPrix.sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0))[0] ?? null,
      ecartees: brut.length - listings.length,
    };
  } catch (error) {
    return {
      mode: "links",
      query,
      listings: [],
      links,
      estimation: null,
      meilleureOffre: null,
      ecartees: 0,
      reason: `Recherche live momentanément indisponible (${
        error instanceof Error ? error.message : "erreur inconnue"
      }). Les liens marchands restent utilisables.`,
    };
  }
}

/**
 * Requête construite à partir d'un calibre et éventuellement d'une pièce.
 * Le terme anglais est privilégié : c'est celui des vendeurs de fournitures.
 */
export function buildPartQuery(
  caliberReference: string,
  partNameEn?: string | null,
  marque = "Omega",
): string {
  const base = `${marque} ${caliberReference}`;
  return partNameEn ? `${base} ${partNameEn}` : `${base} part`;
}

/**
 * Diagnostic de la connexion eBay, pour le back-office.
 *
 * Chaque étape est isolée : sans cela, un « ça ne marche pas » ne distingue
 * pas une clé refusée d'un filtre invalide ou d'un quota atteint.
 */
export type DiagnosticEbay = {
  configure: boolean;
  environnement: string;
  marche: string;
  categories: string | null;
  jeton: { ok: boolean; detail: string };
  recherche: { ok: boolean; detail: string; brut: number; retenus: number };
};

export async function diagnostiquerEbay(query = "Omega 265 balance staff"): Promise<DiagnosticEbay> {
  const base: DiagnosticEbay = {
    configure: hasEbay,
    environnement: process.env.EBAY_ENV === "sandbox" ? "sandbox" : "production",
    marche: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
    categories: categories(),
    jeton: { ok: false, detail: "non tenté" },
    recherche: { ok: false, detail: "non tentée", brut: 0, retenus: 0 },
  };

  if (!hasEbay) {
    base.jeton.detail = "EBAY_CLIENT_ID ou EBAY_CLIENT_SECRET manquante";
    return base;
  }

  let token: string;
  try {
    token = await accessToken();
    base.jeton = { ok: true, detail: `jeton obtenu (${token.slice(0, 12)}…)` };
  } catch (error) {
    base.jeton = {
      ok: false,
      detail: error instanceof Error ? error.message : "erreur inconnue",
    };
    return base;
  }

  try {
    const url = new URL(`https://${apiHost()}/buy/browse/v1/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    const cats = categories();
    if (cats) url.searchParams.set("category_ids", cats);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": base.marche,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      base.recherche = {
        ok: false,
        detail: `HTTP ${res.status} — ${corps.slice(0, 300)}`,
        brut: 0,
        retenus: 0,
      };
      return base;
    }

    const json = (await res.json()) as { itemSummaries?: EbayItemSummary[] };
    const brut = json.itemSummaries ?? [];
    const retenus = brut.filter((i) => !MONTRE_COMPLETE.test(i.title ?? ""));
    base.recherche = {
      ok: retenus.length > 0,
      detail:
        retenus.length > 0
          ? `${retenus.length} annonce(s) exploitables sur « ${query} »`
          : brut.length > 0
            ? "des annonces remontent mais toutes ressemblent à des montres complètes"
            : "aucune annonce — vérifier la place de marché et les catégories",
      brut: brut.length,
      retenus: retenus.length,
    };
  } catch (error) {
    base.recherche = {
      ok: false,
      detail: error instanceof Error ? error.message : "erreur inconnue",
      brut: 0,
      retenus: 0,
    };
  }

  return base;
}

export { hasEbay };
