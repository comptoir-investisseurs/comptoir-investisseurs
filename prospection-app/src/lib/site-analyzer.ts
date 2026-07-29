// Analyse technique statique d'un site web (sans exécuter de JavaScript).
//
// Sécurité : protection contre le SSRF (résolution DNS + rejet des IP
// privées/loopback/link-local), limite de redirections, délai maximum
// strict, et taille de réponse plafonnée.

import { lookup } from "node:dns/promises";
import net from "node:net";

export interface SiteAnalysis {
  url: string;
  finalUrl: string | null;
  reachable: boolean;
  httpStatus: number | null;
  redirects: number;
  https: boolean;
  hasViewport: boolean;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasForm: boolean;
  hasCallToAction: boolean;
  hasBooking: boolean;
  hasBookingWellIntegrated: boolean;
  hasSocialLinks: boolean;
  hasLegalMentions: boolean;
  hasStructuredData: boolean;
  hasFavicon: boolean;
  phoneClickable: boolean;
  copyrightYear: number | null;
  looksOld: boolean;
  isModern: boolean;
  slow: boolean;
  responseMs: number | null;
  approxSizeKb: number | null;
  brokenReasons: string[];
}

const REQUEST_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_BYTES = 1_500_000; // 1,5 Mo
const SLOW_THRESHOLD_MS = 4000;

/** Vérifie qu'une IP n'appartient pas à une plage interne/privée. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map((p) => Number(p));
    const [a, b] = [parts[0] ?? 0, parts[1] ?? 0];
    if (a === 10) return true;
    if (a === 127) return true; // loopback
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / réservé
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === "::1" || low === "::") return true;
    if (low.startsWith("fc") || low.startsWith("fd")) return true; // ULA
    if (low.startsWith("fe80")) return true; // link-local
    if (low.startsWith("::ffff:")) {
      const v4 = low.split(":").pop() ?? "";
      if (net.isIPv4(v4)) return isPrivateIp(v4);
    }
    return false;
  }
  return true; // inconnu -> on refuse par précaution
}

/** Autorise uniquement les hôtes publics résolvant vers des IP publiques. */
export async function assertPublicHost(hostname: string): Promise<void> {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost")
  ) {
    throw new Error("Hôte local interdit");
  }
  if (net.isIP(lower)) {
    if (isPrivateIp(lower)) throw new Error("Adresse IP privée interdite");
    return;
  }
  const results = await lookup(hostname, { all: true });
  if (results.length === 0) throw new Error("Résolution DNS impossible");
  for (const r of results) {
    if (isPrivateIp(r.address)) throw new Error("Résout vers une adresse privée");
  }
}

function normalizeInputUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

async function fetchWithGuard(url: string): Promise<Response> {
  let current = url;
  let redirects = 0;
  // Boucle de redirection manuelle : chaque saut est re-validé (anti-SSRF).
  while (true) {
    const parsed = new URL(current);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Protocole non autorisé");
    }
    await assertPublicHost(parsed.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "ProspectionLocaleBot/1.0 (+audit)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      if (redirects >= MAX_REDIRECTS) throw new Error("Trop de redirections");
      redirects += 1;
      current = new URL(location, current).toString();
      continue;
    }
    (res as Response & { __redirects?: number }).__redirects = redirects;
    (res as Response & { __finalUrl?: string }).__finalUrl = current;
    return res;
  }
}

async function readLimited(res: Response): Promise<{ text: string; bytes: number }> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    return { text: text.slice(0, MAX_BYTES), bytes: text.length };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      chunks.push(value);
      if (total >= MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { text: buf.toString("utf-8"), bytes: total };
}

const BOOKING_HINTS = [
  "rendez-vous",
  "prendre rdv",
  "réserver",
  "reserver",
  "réservation",
  "booking",
  "planity",
  "treatwell",
  "calendly",
  "doctolib",
  "resmio",
  "thefork",
  "livebooking",
];

const CTA_HINTS = ["contactez", "appelez", "réserver", "reserver", "devis", "prendre rendez", "demander"];

export function analyzeHtml(url: string, finalUrl: string, status: number, redirects: number, html: string, responseMs: number, bytes: number): SiteAnalysis {
  const lower = html.toLowerCase();
  const brokenReasons: string[] = [];
  if (status >= 400) brokenReasons.push(`HTTP ${status}`);

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || null;
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const metaDescription = descMatch?.[1]?.trim() || null;
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);
  const hasFavicon = /rel=["'][^"']*icon[^"']*["']/i.test(html);
  const hasStructuredData = /application\/ld\+json/i.test(html) && /localbusiness|restaurant|hairsalon|store/i.test(lower);
  const hasSocialLinks = /facebook\.com|instagram\.com/i.test(lower);
  const hasLegalMentions = /mentions[\s-]?l[ée]gales|cgv|politique de confidentialit/i.test(lower);
  const phoneClickable = /href=["']tel:/i.test(html);
  const hasBooking = BOOKING_HINTS.some((h) => lower.includes(h));
  const hasBookingWellIntegrated =
    /planity|treatwell|calendly|doctolib|thefork/i.test(lower) || (hasBooking && /iframe/i.test(lower));
  const hasCallToAction = phoneClickable || hasForm || CTA_HINTS.some((h) => lower.includes(h));

  const yearMatch = html.match(/(?:©|&copy;|copyright)[^0-9]{0,12}(20\d{2})/i);
  const copyrightYear = yearMatch?.[1] ? Number(yearMatch[1]) : null;
  const currentYear = 2026;
  const looksOld =
    (copyrightYear !== null && currentYear - copyrightYear >= 4) ||
    !hasViewport ||
    /jquery-1\.|bootstrap\/2\.|<font\b|<marquee/i.test(lower);

  const slow = responseMs > SLOW_THRESHOLD_MS;
  const approxSizeKb = Math.round(bytes / 1024);

  const isModern =
    hasViewport &&
    !looksOld &&
    !slow &&
    Boolean(title) &&
    Boolean(metaDescription) &&
    hasCallToAction &&
    status < 400;

  return {
    url,
    finalUrl,
    reachable: status < 400,
    httpStatus: status,
    redirects,
    https: finalUrl.startsWith("https:"),
    hasViewport,
    title,
    metaDescription,
    h1,
    hasForm,
    hasCallToAction,
    hasBooking,
    hasBookingWellIntegrated,
    hasSocialLinks,
    hasLegalMentions,
    hasStructuredData,
    hasFavicon,
    phoneClickable,
    copyrightYear,
    looksOld,
    isModern,
    slow,
    responseMs,
    approxSizeKb,
    brokenReasons,
  };
}

/** Analyse complète d'une URL. Ne lève jamais : renvoie reachable=false en cas d'échec. */
export async function analyzeSite(rawUrl: string): Promise<SiteAnalysis> {
  const url = normalizeInputUrl(rawUrl);
  const start = Date.now();
  try {
    const res = await fetchWithGuard(url);
    const redirects = (res as Response & { __redirects?: number }).__redirects ?? 0;
    const finalUrl = (res as Response & { __finalUrl?: string }).__finalUrl ?? url;
    const { text, bytes } = await readLimited(res);
    const responseMs = Date.now() - start;
    return analyzeHtml(url, finalUrl, res.status, redirects, text, responseMs, bytes);
  } catch (err) {
    const responseMs = Date.now() - start;
    return {
      url,
      finalUrl: null,
      reachable: false,
      httpStatus: null,
      redirects: 0,
      https: url.startsWith("https:"),
      hasViewport: false,
      title: null,
      metaDescription: null,
      h1: null,
      hasForm: false,
      hasCallToAction: false,
      hasBooking: false,
      hasBookingWellIntegrated: false,
      hasSocialLinks: false,
      hasLegalMentions: false,
      hasStructuredData: false,
      hasFavicon: false,
      phoneClickable: false,
      copyrightYear: null,
      looksOld: true,
      isModern: false,
      slow: false,
      responseMs,
      approxSizeKb: null,
      brokenReasons: [err instanceof Error ? err.message : "Erreur inconnue"],
    };
  }
}
