import "server-only";

import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

import { contactEmail } from "./env";

/**
 * Personnalisation des PDF au moment du téléchargement.
 *
 * Le fichier remis porte le nom et l'adresse de l'acheteur. C'est un marquage
 * dissuasif, pas une protection : il n'empêche pas la copie, il rend la
 * rediffusion attribuable — ce qui suffit dans la quasi-totalité des cas et
 * n'abîme pas la lisibilité du document, contrairement à un chiffrement ou à
 * un gros filigrane en travers des planches.
 *
 * Deux marques :
 *   — un pied de page discret sur chaque page, en encre atténuée ;
 *   — une diagonale très pâle, lisible de près, invisible à la lecture.
 *
 * En cas d'échec — PDF chiffré, structure inhabituelle — le fichier d'origine
 * est renvoyé tel quel : mieux vaut un guide non marqué qu'un téléchargement
 * en erreur.
 */
export async function personnaliserPdf(
  source: Buffer,
  acheteur: { nom: string | null; email: string; reference: string },
): Promise<Buffer> {
  try {
    const doc = await PDFDocument.load(source, { ignoreEncryption: false });
    const police = await doc.embedFont(StandardFonts.Helvetica);

    const identite = acheteur.nom ? `${acheteur.nom} — ${acheteur.email}` : acheteur.email;
    const pied = `Exemplaire nominatif · ${identite} · ${acheteur.reference} · diffusion interdite`;
    const encre = rgb(0.137, 0.125, 0.098); // #232019

    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();

      // Diagonale très pâle : présente sans gêner la lecture.
      page.drawText(identite, {
        x: width * 0.12,
        y: height * 0.32,
        size: Math.min(28, width / 18),
        font: police,
        color: encre,
        opacity: 0.06,
        rotate: degrees(38),
      });

      // Pied de page.
      const taille = 6.5;
      const largeur = police.widthOfTextAtSize(pied, taille);
      page.drawText(pied, {
        x: Math.max(14, (width - largeur) / 2),
        y: 12,
        size: taille,
        font: police,
        color: encre,
        opacity: 0.55,
      });
    }

    doc.setSubject(`Exemplaire nominatif — ${identite}`);
    doc.setKeywords(["Cronostic", acheteur.reference, "exemplaire nominatif"]);
    doc.setProducer("Cronostic");
    doc.setCreator(`Cronostic — ${contactEmail()}`);

    return Buffer.from(await doc.save());
  } catch {
    return source;
  }
}

/**
 * Extrait public : les premières pages du guide, marquées comme telles.
 * Généré à la volée depuis le PDF complet — il n'y a donc rien à produire ni
 * à téléverser séparément.
 */
export async function extraireApercu(source: Buffer, pages = 3): Promise<Buffer | null> {
  try {
    const complet = await PDFDocument.load(source);
    const total = complet.getPageCount();
    const apercu = await PDFDocument.create();
    const indices = Array.from({ length: Math.min(pages, total) }, (_, i) => i);
    const copiees = await apercu.copyPages(complet, indices);

    const police = await apercu.embedFont(StandardFonts.HelveticaBold);
    for (const page of copiees) {
      apercu.addPage(page);
      const { width } = page.getSize();
      const mention = `Extrait — ${indices.length} pages sur ${total}`;
      const taille = 9;
      page.drawText(mention, {
        x: Math.max(14, (width - police.widthOfTextAtSize(mention, taille)) / 2),
        y: 12,
        size: taille,
        font: police,
        color: rgb(0.659, 0.463, 0.173), // laiton #A8762C
      });
    }

    apercu.setTitle("Extrait — Cronostic");
    return Buffer.from(await apercu.save());
  } catch {
    return null;
  }
}

/** Nombre de pages, pour renseigner automatiquement la fiche du guide. */
export async function compterPages(source: Buffer): Promise<number | null> {
  try {
    return (await PDFDocument.load(source)).getPageCount();
  } catch {
    return null;
  }
}
