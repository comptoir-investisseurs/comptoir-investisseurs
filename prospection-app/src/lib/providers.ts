// Fournisseurs de données de prospects.
//
// Interface commune permettant de remplacer facilement la source :
// - DemoProvider  : données fictives déterministes (aucune dépendance).
// - CSV           : import de fichier (parseur inclus).
// - (extension)   : brancher ultérieurement une API de recherche locale
//                   conforme aux conditions d'utilisation des plateformes.

import { CATEGORIES } from "./domain";

export interface SearchParams {
  category: string;
  city: string;
  radiusKm?: number;
  maxResults?: number;
}

export interface RawProspect {
  externalId?: string;
  source: string;
  businessName: string;
  category?: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  listingUrl?: string;
  rating?: number;
  reviewCount?: number;
  openingHours?: { day: string; hours: string }[];
  services?: string[];
  photos?: string[];
}

export type RawProspectDetails = RawProspect;

export interface ProspectProvider {
  readonly name: string;
  searchBusinesses(params: SearchParams): Promise<RawProspect[]>;
  getBusinessDetails(externalId: string): Promise<RawProspectDetails | null>;
}

// ─── Fournisseur de démonstration ────────────────────────────

const FIRST = ["Salon", "Studio", "Atelier", "Maison", "Espace", "Le", "Chez", "L'"];
const NAMES = ["Élégance", "Harmonie", "Prestige", "Éclat", "Moderne", "Central", "du Coin", "Marie", "Léa", "Concept"];
const STREETS = ["rue de la Paix", "avenue Victor Hugo", "rue des Lilas", "place du Marché", "boulevard Voltaire"];

/** PRNG déterministe (seed) pour des données stables entre les exécutions. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class DemoProvider implements ProspectProvider {
  readonly name = "demo";

  async searchBusinesses(params: SearchParams): Promise<RawProspect[]> {
    const count = Math.min(params.maxResults ?? 12, 40);
    const rand = seeded(hashString(`${params.category}|${params.city}`));
    const category = CATEGORIES.includes(params.category as (typeof CATEGORIES)[number])
      ? params.category
      : "artisan";
    const results: RawProspect[] = [];

    for (let i = 0; i < count; i++) {
      const first = FIRST[Math.floor(rand() * FIRST.length)] ?? "Salon";
      const nm = NAMES[Math.floor(rand() * NAMES.length)] ?? "Central";
      const name = `${first} ${nm}`;
      const hasWebsite = rand() > 0.55;
      const onlySocial = !hasWebsite && rand() > 0.4;
      const rating = Math.round((3.2 + rand() * 1.8) * 10) / 10;
      const reviewCount = Math.floor(rand() * 180);
      const street = STREETS[Math.floor(rand() * STREETS.length)] ?? "rue de la Paix";
      const num = 1 + Math.floor(rand() * 90);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      results.push({
        externalId: `demo-${hashString(`${name}-${i}-${params.city}`)}`,
        source: "demo",
        businessName: name,
        category,
        description: `${category} situé à ${params.city}.`,
        address: `${num} ${street}`,
        city: params.city,
        postalCode: "75011",
        country: "France",
        phone: `01 ${40 + Math.floor(rand() * 9)} ${randDigits(rand, 2)} ${randDigits(rand, 2)} ${randDigits(rand, 2)}`,
        email: rand() > 0.5 ? `contact@${slug}.fr` : undefined,
        websiteUrl: hasWebsite ? `https://www.${slug}.fr` : undefined,
        facebookUrl: onlySocial || rand() > 0.5 ? `https://facebook.com/${slug}` : undefined,
        instagramUrl: onlySocial || rand() > 0.6 ? `https://instagram.com/${slug}` : undefined,
        listingUrl: `https://maps.example.com/${slug}`,
        rating,
        reviewCount,
        openingHours: [
          { day: "Lundi", hours: "09:00 – 19:00" },
          { day: "Samedi", hours: "09:00 – 18:00" },
          { day: "Dimanche", hours: "Fermé" },
        ],
        services: [],
        photos: [],
      });
    }
    return results;
  }

  async getBusinessDetails(externalId: string): Promise<RawProspectDetails | null> {
    return {
      externalId,
      source: "demo",
      businessName: "Établissement de démonstration",
    };
  }
}

function randDigits(rand: () => number, n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(rand() * 10).toString();
  return out;
}

// ─── Import CSV ──────────────────────────────────────────────

/** Parseur CSV minimal gérant les guillemets et les virgules échappées. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") pushField();
    else if (ch === "\n") pushRow();
    else if (ch === "\r") {
      // ignore
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  if (rows.length === 0) return [];
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

const CSV_ALIASES: Record<string, keyof RawProspect> = {
  nom: "businessName",
  name: "businessName",
  businessname: "businessName",
  "raison sociale": "businessName",
  categorie: "category",
  catégorie: "category",
  category: "category",
  adresse: "address",
  address: "address",
  ville: "city",
  city: "city",
  "code postal": "postalCode",
  cp: "postalCode",
  postalcode: "postalCode",
  telephone: "phone",
  téléphone: "phone",
  tel: "phone",
  phone: "phone",
  email: "email",
  "e-mail": "email",
  mail: "email",
  site: "websiteUrl",
  website: "websiteUrl",
  "site web": "websiteUrl",
  websiteurl: "websiteUrl",
  facebook: "facebookUrl",
  instagram: "instagramUrl",
  note: "rating",
  rating: "rating",
  avis: "reviewCount",
  reviews: "reviewCount",
  reviewcount: "reviewCount",
};

export function rawProspectsFromCsv(text: string): RawProspect[] {
  const rows = parseCsv(text);
  return rows
    .map((row) => {
      const raw: Partial<RawProspect> = { source: "csv" };
      for (const [key, value] of Object.entries(row)) {
        const field = CSV_ALIASES[key];
        if (!field || !value) continue;
        if (field === "rating") raw.rating = Number(value.replace(",", "."));
        else if (field === "reviewCount") raw.reviewCount = parseInt(value, 10) || undefined;
        else (raw as Record<string, unknown>)[field] = value;
      }
      return raw;
    })
    .filter((r): r is RawProspect => Boolean(r.businessName))
    .map((r) => ({ ...r, source: "csv" }));
}

export function getProvider(name: string): ProspectProvider {
  switch (name) {
    case "demo":
    default:
      return new DemoProvider();
  }
}
