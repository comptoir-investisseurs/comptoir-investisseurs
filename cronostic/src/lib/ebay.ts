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
 * Catégories eBay des fournitures et outillage horlogers. Surchargeable par
 * `EBAY_CATEGORY_IDS` si le marché interrogé utilise d'autres identifiants.
 *   173699 → Watch Parts
 *   175776 → Watchmaking Tools & Parts
 */
function categories(): string {
  return process.env.EBAY_CATEGORY_IDS ?? "173699,175776";
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

export async function searchParts(query: string, limit = 40): Promise<PartSearchResult> {
  const links = merchantLinks(query);

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
        "Recherche live indisponible : les identifiants eBay ne sont pas configurés. Les liens ci-dessous ouvrent la recherche directement chez les marchands, restreinte aux fournitures.",
    };
  }

  try {
    const token = await accessToken();
    const url = new URL(`https://${apiHost()}/buy/browse/v1/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("category_ids", categories());
    url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE|AUCTION}");
    url.searchParams.set("sort", "price");

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) throw new Error(`eBay Browse ${res.status}`);

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
export function buildPartQuery(caliberReference: string, partNameEn?: string | null): string {
  const base = `Omega ${caliberReference}`;
  return partNameEn ? `${base} ${partNameEn}` : `${base} part`;
}

export { hasEbay };
