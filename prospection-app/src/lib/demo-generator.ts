// Générateur de landing pages de démonstration.
//
// Produit un contenu structuré (WebsiteContent) puis un rendu HTML autonome.
// Chaque démonstration porte une mention claire « non officielle » et la
// balise <meta name="robots" content="noindex, nofollow" />.

import { z } from "zod";
import { type DemoTemplate, templateForCategory } from "./domain";
import { parseJson } from "./utils";

export const DEMO_DISCLAIMER =
  "Concept de démonstration créé à titre de proposition commerciale. Ce site n'est pas le site officiel de l'établissement.";

export const WebsiteContentSchema = z.object({
  businessName: z.string(),
  category: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  tagline: z.string(),
  about: z.string(),
  services: z.array(z.object({ name: z.string(), description: z.string().optional() })).max(12),
  openingHours: z.array(z.object({ day: z.string(), hours: z.string() })).max(7),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  photos: z.array(z.string()).max(12),
  rating: z.number().optional().nullable(),
  reviewCount: z.number().optional().nullable(),
  ctaLabel: z.string(),
  bookingLabel: z.string(),
});
export type WebsiteContent = z.infer<typeof WebsiteContentSchema>;

export interface WebsiteContentInput {
  businessName: string;
  category?: string | null;
  city?: string | null;
  description?: string | null;
  services?: string[];
  openingHours?: { day: string; hours: string }[];
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  photos?: string[];
  rating?: number | null;
  reviewCount?: number | null;
}

const DEFAULT_SERVICES: Record<DemoTemplate, string[]> = {
  coiffeur: ["Coupe & brushing", "Couleur & mèches", "Soins capillaires", "Coiffure événement"],
  barbier: ["Coupe homme", "Taille de barbe", "Rasage traditionnel", "Contour & finitions"],
  institut: ["Soin du visage", "Épilation", "Manucure & beauté des mains", "Massage relaxant"],
  artisan: ["Devis gratuit", "Dépannage", "Installation", "Rénovation"],
  restaurant: ["Menu du midi", "Carte du soir", "Formules groupes", "À emporter"],
  sante: ["Première consultation", "Suivi", "Bilan", "Prise en charge"],
  garage: ["Révision & entretien", "Diagnostic", "Pneumatiques", "Carrosserie"],
  photographe: ["Portrait", "Mariage & événement", "Photo entreprise", "Shooting produit"],
  coach: ["Coaching individuel", "Programme personnalisé", "Suivi nutrition", "Séances en groupe"],
};

const TAGLINES: Record<DemoTemplate, string> = {
  coiffeur: "Votre style, entre de bonnes mains",
  barbier: "L'art du soin masculin",
  institut: "Prenez soin de vous",
  artisan: "Un savoir-faire à votre service",
  restaurant: "Une cuisine qui a du goût",
  sante: "Votre bien-être, notre priorité",
  garage: "L'entretien de votre véhicule en confiance",
  photographe: "Capturer vos plus beaux moments",
  coach: "Atteignez vos objectifs",
};

const DEFAULT_HOURS = [
  { day: "Lundi", hours: "09:00 – 19:00" },
  { day: "Mardi", hours: "09:00 – 19:00" },
  { day: "Mercredi", hours: "09:00 – 19:00" },
  { day: "Jeudi", hours: "09:00 – 19:00" },
  { day: "Vendredi", hours: "09:00 – 19:00" },
  { day: "Samedi", hours: "09:00 – 18:00" },
  { day: "Dimanche", hours: "Fermé" },
];

export function buildWebsiteContent(input: WebsiteContentInput, template: DemoTemplate): WebsiteContent {
  const services =
    input.services && input.services.length > 0
      ? input.services.map((s) => ({ name: s }))
      : DEFAULT_SERVICES[template].map((s) => ({ name: s }));

  const about =
    input.description?.trim() ||
    `${input.businessName}${input.city ? ` à ${input.city}` : ""} vous accueille dans un cadre professionnel et chaleureux. Découvrez nos prestations et prenez rendez-vous facilement.`;

  return WebsiteContentSchema.parse({
    businessName: input.businessName,
    category: input.category ?? null,
    city: input.city ?? null,
    tagline: TAGLINES[template],
    about,
    services,
    openingHours: input.openingHours && input.openingHours.length ? input.openingHours : DEFAULT_HOURS,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    photos: input.photos ?? [],
    rating: input.rating ?? null,
    reviewCount: input.reviewCount ?? null,
    ctaLabel: "Nous appeler",
    bookingLabel: "Prendre rendez-vous",
  });
}

const THEMES: Record<DemoTemplate, { primary: string; accent: string; font: string }> = {
  coiffeur: { primary: "#111827", accent: "#c084fc", font: "Georgia, serif" },
  barbier: { primary: "#1c1917", accent: "#d97706", font: "Georgia, serif" },
  institut: { primary: "#831843", accent: "#f472b6", font: "Georgia, serif" },
  artisan: { primary: "#1e3a8a", accent: "#f59e0b", font: "system-ui, sans-serif" },
  restaurant: { primary: "#7c2d12", accent: "#ea580c", font: "Georgia, serif" },
  sante: { primary: "#065f46", accent: "#10b981", font: "system-ui, sans-serif" },
  garage: { primary: "#0f172a", accent: "#ef4444", font: "system-ui, sans-serif" },
  photographe: { primary: "#18181b", accent: "#a78bfa", font: "Helvetica, sans-serif" },
  coach: { primary: "#0c4a6e", accent: "#22d3ee", font: "system-ui, sans-serif" },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rendu HTML autonome (aucune dépendance externe), noindex, avec mention démo. */
export function renderDemoHtml(content: WebsiteContent, template: DemoTemplate): string {
  const t = THEMES[template];
  const c = content;
  const tel = c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : "#contact";
  const stars = c.rating ? "★".repeat(Math.round(c.rating)) + "☆".repeat(5 - Math.round(c.rating)) : "";

  const gallery =
    c.photos.length > 0
      ? c.photos
          .slice(0, 6)
          .map((p) => `<img src="${esc(p)}" alt="Photo ${esc(c.businessName)}" loading="lazy" />`)
          .join("")
      : Array.from({ length: 3 })
          .map((_, i) => `<div class="ph" aria-hidden="true">Photo ${i + 1}</div>`)
          .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(c.businessName)} — Démonstration</title>
<style>
  :root { --primary:${t.primary}; --accent:${t.accent}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family:${t.font}; color:#1f2937; line-height:1.6; }
  .demo-banner { background:#fef3c7; color:#92400e; text-align:center; padding:8px 12px; font-size:13px; font-family:system-ui,sans-serif; border-bottom:1px solid #fde68a; }
  header.hero { background:var(--primary); color:#fff; padding:72px 20px; text-align:center; }
  header.hero h1 { font-size:2.4rem; margin-bottom:10px; }
  header.hero p { opacity:.9; font-size:1.15rem; }
  .btn { display:inline-block; margin:8px 6px 0; padding:12px 22px; border-radius:8px; text-decoration:none; font-family:system-ui,sans-serif; font-weight:600; }
  .btn-primary { background:var(--accent); color:#111; }
  .btn-ghost { border:1px solid rgba(255,255,255,.6); color:#fff; }
  section { max-width:960px; margin:0 auto; padding:48px 20px; }
  h2 { color:var(--primary); font-size:1.6rem; margin-bottom:18px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; }
  .card { border:1px solid #e5e7eb; border-radius:10px; padding:18px; }
  .gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; }
  .gallery img, .ph { width:100%; height:140px; object-fit:cover; border-radius:8px; }
  .ph { background:#e5e7eb; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-family:system-ui,sans-serif; font-size:13px; }
  .hours { list-style:none; }
  .hours li { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9; }
  .reviews { background:var(--primary); color:#fff; border-radius:12px; padding:24px; text-align:center; }
  .stars { color:var(--accent); font-size:1.6rem; }
  form input, form textarea { width:100%; padding:10px; margin:6px 0; border:1px solid #d1d5db; border-radius:8px; font-family:system-ui,sans-serif; }
  footer { background:#111827; color:#cbd5e1; padding:28px 20px; text-align:center; font-family:system-ui,sans-serif; font-size:14px; }
  .contact-bar { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; font-family:system-ui,sans-serif; }
</style>
</head>
<body>
  <div class="demo-banner">${esc(DEMO_DISCLAIMER)}</div>
  <header class="hero" id="top">
    <h1>${esc(c.businessName)}</h1>
    <p>${esc(c.tagline)}${c.city ? " · " + esc(c.city) : ""}</p>
    <div>
      <a class="btn btn-primary" href="#contact">${esc(c.bookingLabel)}</a>
      <a class="btn btn-ghost" href="${esc(tel)}">${esc(c.ctaLabel)}</a>
    </div>
  </header>

  <section id="apropos">
    <h2>Présentation</h2>
    <p>${esc(c.about)}</p>
  </section>

  <section id="prestations">
    <h2>Prestations</h2>
    <div class="grid">
      ${c.services.map((s) => `<div class="card"><strong>${esc(s.name)}</strong>${s.description ? `<p>${esc(s.description)}</p>` : ""}</div>`).join("")}
    </div>
  </section>

  <section id="galerie">
    <h2>Galerie</h2>
    <div class="gallery">${gallery}</div>
  </section>

  <section id="horaires">
    <h2>Horaires</h2>
    <ul class="hours">
      ${c.openingHours.map((h) => `<li><span>${esc(h.day)}</span><span>${esc(h.hours)}</span></li>`).join("")}
    </ul>
  </section>

  ${
    c.rating
      ? `<section><div class="reviews"><div class="stars">${stars}</div><p>${c.rating.toString().replace(".", ",")}/5${c.reviewCount ? ` · ${c.reviewCount} avis` : ""}</p></div></section>`
      : ""
  }

  <section id="zone">
    <h2>Nous trouver</h2>
    <p>${c.address ? esc(c.address) : "Zone d'intervention locale."}</p>
  </section>

  <section id="contact">
    <h2>Contact</h2>
    <div class="contact-bar">
      ${c.phone ? `<a class="btn btn-primary" href="${esc(tel)}">${esc(c.ctaLabel)}</a>` : ""}
      <a class="btn btn-primary" href="#contact">${esc(c.bookingLabel)}</a>
    </div>
    <form onsubmit="event.preventDefault(); alert('Démonstration : le formulaire n\\'envoie rien.');" style="margin-top:18px;">
      <input type="text" placeholder="Votre nom" required />
      <input type="email" placeholder="Votre e-mail" required />
      <textarea placeholder="Votre message" rows="4"></textarea>
      <button class="btn btn-primary" type="submit">Envoyer</button>
    </form>
  </section>

  <footer>
    <p>${esc(c.businessName)}${c.city ? " · " + esc(c.city) : ""}</p>
    <p style="margin-top:8px; opacity:.8;">${esc(DEMO_DISCLAIMER)}</p>
  </footer>
</body>
</html>`;
}

export function contentFromJson(json: string): WebsiteContent | null {
  const raw = parseJson<unknown>(json, null);
  const parsed = WebsiteContentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export { templateForCategory };
