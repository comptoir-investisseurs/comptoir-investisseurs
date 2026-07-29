import { describe, it, expect } from "vitest";
import { buildIndex, checkDuplicate, addToIndex } from "../dedupe";

describe("dedupe", () => {
  const existing = [
    {
      externalId: "ext-1",
      businessName: "Salon Élégance",
      phone: "01 02 03 04 05",
      address: "10 rue de la Paix",
      websiteUrl: "https://www.salon-elegance.fr",
      city: "Paris",
    },
  ];

  it("détecte un doublon par identifiant externe", () => {
    const idx = buildIndex(existing);
    const r = checkDuplicate(idx, { externalId: "ext-1", businessName: "Autre", city: "Lyon" });
    expect(r.isDuplicate).toBe(true);
    expect(r.reason).toContain("Identifiant");
  });

  it("détecte un doublon par téléphone (format différent)", () => {
    const idx = buildIndex(existing);
    const r = checkDuplicate(idx, {
      businessName: "Salon X",
      phone: "+33 1 02 03 04 05",
      city: "Nice",
    });
    expect(r.isDuplicate).toBe(true);
  });

  it("détecte un doublon par domaine", () => {
    const idx = buildIndex(existing);
    const r = checkDuplicate(idx, {
      businessName: "Salon Y",
      websiteUrl: "http://salon-elegance.fr/contact",
      city: "Nice",
    });
    expect(r.isDuplicate).toBe(true);
  });

  it("détecte un doublon par nom + ville", () => {
    const idx = buildIndex(existing);
    const r = checkDuplicate(idx, { businessName: "salon elegance", city: "Paris" });
    expect(r.isDuplicate).toBe(true);
  });

  it("ne signale pas un prospect distinct", () => {
    const idx = buildIndex(existing);
    const r = checkDuplicate(idx, { businessName: "Barbier du Coin", city: "Marseille" });
    expect(r.isDuplicate).toBe(false);
  });

  it("met à jour l'index de façon incrémentale", () => {
    const idx = buildIndex([]);
    addToIndex(idx, { businessName: "Nouveau", city: "Paris", phone: "0600000000" });
    const r = checkDuplicate(idx, { businessName: "Nouveau", city: "Paris" });
    expect(r.isDuplicate).toBe(true);
  });
});
