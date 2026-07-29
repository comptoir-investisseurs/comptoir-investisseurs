import { describe, it, expect } from "vitest";
import { computeScore, DEFAULT_WEIGHTS, looksLikeChain } from "../scoring";
import type { SiteAnalysis } from "../site-analyzer";

function modernSite(): SiteAnalysis {
  return {
    url: "https://x.fr",
    finalUrl: "https://x.fr",
    reachable: true,
    httpStatus: 200,
    redirects: 0,
    https: true,
    hasViewport: true,
    title: "Titre",
    metaDescription: "Desc",
    h1: "H1",
    hasForm: true,
    hasCallToAction: true,
    hasBooking: true,
    hasBookingWellIntegrated: true,
    hasSocialLinks: true,
    hasLegalMentions: true,
    hasStructuredData: true,
    hasFavicon: true,
    phoneClickable: true,
    copyrightYear: 2026,
    looksOld: false,
    isModern: true,
    slow: false,
    responseMs: 300,
    approxSizeKb: 100,
    brokenReasons: [],
  };
}

describe("computeScore", () => {
  it("attribue un score élevé à une entreprise sans site mais bien notée", () => {
    const r = computeScore({
      hasWebsite: false,
      site: null,
      rating: 4.7,
      reviewCount: 87,
      facebookUrl: "https://facebook.com/x",
      instagramUrl: null,
      phone: "01 02 03 04 05",
      email: "a@b.fr",
      address: "1 rue X",
    });
    // 30 (no site) + 15 (social+no site) + 10 (note) + 10 (avis) = 65
    expect(r.score).toBe(65);
    expect(r.priority).toBe("elevee");
    expect(r.contributions.some((c) => c.key === "noWebsite")).toBe(true);
  });

  it("borne le score entre 0 et 100", () => {
    const r = computeScore({
      hasWebsite: true,
      site: modernSite(),
      rating: 5,
      reviewCount: 200,
      isChain: true,
      phone: null,
      email: null,
      address: null,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("pénalise un site déjà moderne", () => {
    const r = computeScore({
      hasWebsite: true,
      site: modernSite(),
      rating: 3,
      reviewCount: 5,
      phone: "01",
      email: "a@b.fr",
      address: "x",
    });
    expect(r.contributions.some((c) => c.key === "modernSitePenalty")).toBe(true);
  });

  it("respecte les pondérations personnalisées", () => {
    const weights = { ...DEFAULT_WEIGHTS, noWebsite: 50 };
    const r = computeScore(
      { hasWebsite: false, site: null, phone: "01", email: "a@b.fr", address: "x" },
      weights,
    );
    expect(r.score).toBe(50);
  });
});

describe("looksLikeChain", () => {
  it("détecte une franchise connue", () => {
    expect(looksLikeChain("Coiffure Franck Provost")).toBe(true);
    expect(looksLikeChain("Salon Léa")).toBe(false);
  });
});
