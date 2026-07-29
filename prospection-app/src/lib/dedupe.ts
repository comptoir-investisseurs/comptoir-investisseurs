// Détection de doublons de prospects sur plusieurs critères :
// identifiant externe, nom normalisé, téléphone, adresse, domaine internet.

import { domainFromUrl, normalizeName, normalizePhone } from "./utils";

export interface DedupeKeyable {
  externalId?: string | null;
  businessName: string;
  phone?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  city?: string | null;
}

export interface DedupeIndex {
  externalIds: Set<string>;
  names: Set<string>;
  phones: Set<string>;
  domains: Set<string>;
  addresses: Set<string>;
}

function normalizeAddress(address?: string | null, city?: string | null): string | null {
  const base = [address, city].filter(Boolean).join(" ");
  if (!base.trim()) return null;
  return normalizeName(base);
}

export function buildIndex(existing: DedupeKeyable[]): DedupeIndex {
  const index: DedupeIndex = {
    externalIds: new Set(),
    names: new Set(),
    phones: new Set(),
    domains: new Set(),
    addresses: new Set(),
  };
  for (const item of existing) addToIndex(index, item);
  return index;
}

export function addToIndex(index: DedupeIndex, item: DedupeKeyable): void {
  if (item.externalId) index.externalIds.add(item.externalId);
  index.names.add(nameCityKey(item));
  const phone = normalizePhone(item.phone);
  if (phone) index.phones.add(phone);
  const domain = domainFromUrl(item.websiteUrl);
  if (domain) index.domains.add(domain);
  const addr = normalizeAddress(item.address, item.city);
  if (addr) index.addresses.add(addr);
}

function nameCityKey(item: DedupeKeyable): string {
  return `${normalizeName(item.businessName)}|${(item.city ?? "").toLowerCase().trim()}`;
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  reason: string | null;
}

/** Renvoie la première raison de doublon détectée, sinon null. */
export function checkDuplicate(index: DedupeIndex, item: DedupeKeyable): DuplicateCheck {
  if (item.externalId && index.externalIds.has(item.externalId)) {
    return { isDuplicate: true, reason: "Identifiant externe déjà présent" };
  }
  const phone = normalizePhone(item.phone);
  if (phone && index.phones.has(phone)) {
    return { isDuplicate: true, reason: "Numéro de téléphone identique" };
  }
  const domain = domainFromUrl(item.websiteUrl);
  if (domain && index.domains.has(domain)) {
    return { isDuplicate: true, reason: "Même domaine internet" };
  }
  if (index.names.has(nameCityKey(item))) {
    return { isDuplicate: true, reason: "Nom + ville identiques" };
  }
  const addr = normalizeAddress(item.address, item.city);
  if (addr && index.addresses.has(addr)) {
    return { isDuplicate: true, reason: "Adresse identique" };
  }
  return { isDuplicate: false, reason: null };
}
