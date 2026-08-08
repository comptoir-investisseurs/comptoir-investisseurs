import "server-only";

import { hasEbay } from "./env";

/**
 * Recherche d'offres de pièces détachées.
 *
 * Avec des identifiants eBay : interrogation live de la Browse API.
 * Sans identifiants : liens de recherche pré-remplis vers les marchands
 * spécialisés — le site reste utilisable sans compte développeur.
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

export type PartSearchResult =
  | { mode: "live"; query: string; listings: Listing[]; links: MerchantLink[] }
  | { mode: "links"; query: string; listings: []; links: MerchantLink[]; reason: string };

const globalForToken = globalThis as unknown as {
  __ebayToken?: { value: string; expiresAt: number };
};

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

  if (!res.ok) {
    throw new Error(`eBay OAuth ${res.status}: ${await res.text()}`);
  }

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

/** Liens de recherche profonds vers les marchands spécialisés. */
export function merchantLinks(query: string): MerchantLink[] {
  const q = encodeURIComponent(query);
  return [
    {
      merchant: "eBay",
      url: `https://www.ebay.fr/sch/i.html?_nkw=${q}`,
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
      merchant: "Chrono24",
      url: `https://www.chrono24.fr/search/index.htm?query=${q}`,
      note: "Montres complètes : utile pour identifier un mouvement donneur.",
    },
    {
      merchant: "Ranfft / archives",
      url: `https://www.google.com/search?q=${q}+site%3Aranfft.org+OR+caliber`,
      note: "Documentation et planches de référence.",
    },
  ];
}

export async function searchParts(query: string, limit = 24): Promise<PartSearchResult> {
  const links = merchantLinks(query);

  if (!hasEbay) {
    return {
      mode: "links",
      query,
      listings: [],
      links,
      reason:
        "Recherche live indisponible : les identifiants eBay ne sont pas configurés. Les liens ci-dessous ouvrent la recherche directement chez les marchands.",
    };
  }

  try {
    const token = await accessToken();
    const url = new URL(`https://${apiHost()}/buy/browse/v1/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) throw new Error(`eBay Browse ${res.status}`);

    const json = (await res.json()) as { itemSummaries?: EbayItemSummary[] };
    const listings: Listing[] = (json.itemSummaries ?? []).map((item) => ({
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

    return { mode: "live", query, listings, links };
  } catch (error) {
    return {
      mode: "links",
      query,
      listings: [],
      links,
      reason: `Recherche live momentanément indisponible (${
        error instanceof Error ? error.message : "erreur inconnue"
      }). Les liens marchands restent utilisables.`,
    };
  }
}

/** Requête eBay construite à partir d'un calibre et éventuellement d'une pièce. */
export function buildPartQuery(caliberReference: string, partNameEn?: string | null): string {
  const base = `Omega ${caliberReference}`;
  return partNameEn ? `${base} ${partNameEn}` : `${base} movement parts`;
}

export { hasEbay };
