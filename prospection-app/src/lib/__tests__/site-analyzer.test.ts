import { describe, it, expect } from "vitest";
import { isPrivateIp, assertPublicHost, analyzeHtml } from "../site-analyzer";

describe("protection SSRF", () => {
  it("rejette les IP privées et loopback", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("169.254.1.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("accepte les IP publiques", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("bloque localhost et *.local", async () => {
    await expect(assertPublicHost("localhost")).rejects.toThrow();
    await expect(assertPublicHost("router.local")).rejects.toThrow();
    await expect(assertPublicHost("127.0.0.1")).rejects.toThrow();
  });
});

describe("analyzeHtml", () => {
  it("extrait titre, viewport, formulaire et détecte la réservation", () => {
    const html = `<!doctype html><html><head>
      <title>Salon Test</title>
      <meta name="viewport" content="width=device-width">
      <meta name="description" content="Un salon">
      </head><body>
      <h1>Bienvenue</h1>
      <a href="tel:0102030405">Appeler</a>
      <a href="https://planity.com/x">Prendre rendez-vous</a>
      <form></form>
      </body></html>`;
    const a = analyzeHtml("https://x.fr", "https://x.fr", 200, 0, html, 500, 2000);
    expect(a.title).toBe("Salon Test");
    expect(a.hasViewport).toBe(true);
    expect(a.hasForm).toBe(true);
    expect(a.hasBooking).toBe(true);
    expect(a.phoneClickable).toBe(true);
    expect(a.reachable).toBe(true);
  });

  it("repère un site ancien sans viewport", () => {
    const html = `<html><head><title>Vieux</title></head><body><marquee>© 2011</marquee></body></html>`;
    const a = analyzeHtml("https://x.fr", "https://x.fr", 200, 0, html, 500, 1000);
    expect(a.hasViewport).toBe(false);
    expect(a.looksOld).toBe(true);
    expect(a.isModern).toBe(false);
  });
});
