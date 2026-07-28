// ===========================================================================
// extract-doc — Supabase Edge Function (Deno)
// Lecture IA fiable des documents patrimoniaux, moteur basculable.
//   • kind = "releve" : reporting de contrat (assureur/banque) -> enveloppe + supports
//   • kind = "piece"  : pièce justificative -> type, titulaire, dates, validité, n°
//
// Moteur choisi par le secret EXTRACT_PROVIDER :
//   • "gemini"    (défaut) — Google Gemini, quota gratuit (GEMINI_API_KEY)
//   • "anthropic"          — Claude, payant à l'usage (ANTHROPIC_API_KEY)
//
// La clé API reste TOUJOURS côté serveur, jamais exposée au navigateur.
//
// Déploiement :
//   supabase functions deploy extract-doc
//   # gratuit :
//   supabase secrets set EXTRACT_PROVIDER=gemini GEMINI_API_KEY=AIza...
//   # ou payant, sans réutilisation des données :
//   supabase secrets set EXTRACT_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...
//
// Appel (front) : POST { data: <base64>, media_type, kind }
// ===========================================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const PROVIDER = (Deno.env.get("EXTRACT_PROVIDER") ||
  (GEMINI_API_KEY ? "gemini" : (ANTHROPIC_API_KEY ? "anthropic" : "gemini"))).toLowerCase();
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-opus-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSET_CLASSES = [
  "Fonds euro", "Actions", "ETF", "OPCVM", "Obligations",
  "Produit structuré", "Immobilier", "Private Equity", "Liquidités", "Autre",
];
const ENV_TYPES = [
  "Assurance-vie", "Assurance-vie luxembourgeoise", "Contrat de capitalisation",
  "PER", "Compte-titres (CTO)", "PEA", "PEA-PME", "Autre",
];
const PIECE_TYPES = [
  "Pièce d'identité", "Justificatif de domicile", "Avis d'imposition", "RIB",
  "Extrait KBIS", "Statuts à jour", "Registre des bénéficiaires effectifs",
  "Pièce d'identité du dirigeant", "Livret de famille", "Autre",
];

function prompt(kind: string): string {
  if (kind === "releve") {
    return "Tu es un assistant pour un cabinet de gestion de patrimoine. On te fournit un reporting / relevé de situation d'un contrat d'assurance-vie, de capitalisation, PER, ou d'un compte-titres/PEA émis par un assureur ou une banque. Extrais l'enveloppe (type, établissement, numéro de contrat, date et montant de valorisation, devise) et la liste complète des supports détenus (chaque unité de compte, fonds euro, ligne titre). Pour chaque support : libellé, ISIN si présent, classe d'actif, montant investi et valorisation en euros (nombres sans symbole ni espace). Rappel important : un produit structuré (note, autocall, Phoenix, Athéna…) est un SUPPORT de classe 'Produit structuré' logé dans l'enveloppe, ce n'est jamais un type d'enveloppe. N'invente aucun chiffre : mets null pour ce qui n'est pas lisible. Toutes les dates au format AAAA-MM-JJ.";
  }
  return "Tu es un assistant pour un cabinet de gestion de patrimoine. On te fournit une pièce justificative. Identifie précisément la nature du document (type), le titulaire principal, son numéro/référence, sa date d'émission/délivrance (date_document) et sa date d'expiration/fin de validité (date_validite) si elle existe.\n\n" +
    "De plus, dans 'champs', renseigne TOUTES les informations pertinentes du document sous forme de paires label/valeur (labels courts et clairs), selon le type :\n" +
    "• Pièce d'identité (CNI, passeport, titre de séjour, permis) : Type de pièce, Nom, Nom d'usage, Tous les prénoms, Sexe, Date de naissance, Lieu de naissance, Nationalité, Numéro du document, Date de délivrance, Autorité de délivrance, Date d'expiration.\n" +
    "• Justificatif de domicile : Nature (facture EDF/eau/téléphone, quittance de loyer, avis de taxe…), Émetteur, Titulaire, Adresse complète, Date du document.\n" +
    "• Avis d'imposition : Déclarant(s), Année des revenus, Revenu fiscal de référence, Nombre de parts, Numéro fiscal, Date de mise en recouvrement.\n" +
    "• RIB : Titulaire, Banque, IBAN, BIC, Domiciliation.\n" +
    "• Extrait KBIS : Dénomination, Forme juridique, SIREN, RCS, Capital social, Adresse du siège, Dirigeant(s), Activité, Date d'immatriculation, Date de l'extrait.\n" +
    "• Statuts : Dénomination, Forme juridique, Capital social, Date, Objet social.\n" +
    "• Registre des bénéficiaires effectifs : Société, et pour chaque bénéficiaire : Nom Prénom, % de détention, Nature du contrôle.\n" +
    "• Livret de famille : Époux, Épouse, et chaque enfant avec sa date de naissance.\n\n" +
    "Toutes les dates au format AAAA-MM-JJ. N'invente rien : n'inclus dans 'champs' que ce qui est réellement lisible sur le document.";
}

// ---------- Schémas ----------------------------------------------------------
// Anthropic / JSON Schema classique
const RELEVE_JSON = {
  type: "object",
  properties: {
    enveloppe: {
      type: "object",
      properties: {
        type: { type: "string", enum: ENV_TYPES },
        etablissement: { type: ["string", "null"] },
        numero: { type: ["string", "null"] },
        date_valorisation: { type: ["string", "null"] },
        valorisation_totale: { type: ["number", "null"] },
        devise: { type: "string" },
      },
      required: ["type", "devise"], additionalProperties: false,
    },
    supports: {
      type: "array",
      items: {
        type: "object",
        properties: {
          libelle: { type: "string" },
          isin: { type: ["string", "null"] },
          classe: { type: "string", enum: ASSET_CLASSES },
          montant_investi: { type: ["number", "null"] },
          valorisation: { type: ["number", "null"] },
        },
        required: ["libelle", "classe"], additionalProperties: false,
      },
    },
  },
  required: ["enveloppe", "supports"], additionalProperties: false,
};
const PIECE_JSON = {
  type: "object",
  properties: {
    type: { type: "string", enum: PIECE_TYPES },
    titulaire: { type: ["string", "null"] },
    numero: { type: ["string", "null"] },
    date_document: { type: ["string", "null"] },
    date_validite: { type: ["string", "null"] },
    champs: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, valeur: { type: "string" } },
        required: ["label", "valeur"], additionalProperties: false,
      },
    },
  },
  required: ["type"], additionalProperties: false,
};
// Gemini responseSchema (types MAJUSCULES, nullable, pas d'additionalProperties)
const RELEVE_GEMINI = {
  type: "OBJECT",
  properties: {
    enveloppe: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", format: "enum", enum: ENV_TYPES },
        etablissement: { type: "STRING", nullable: true },
        numero: { type: "STRING", nullable: true },
        date_valorisation: { type: "STRING", nullable: true },
        valorisation_totale: { type: "NUMBER", nullable: true },
        devise: { type: "STRING" },
      },
      required: ["type", "devise"],
    },
    supports: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          libelle: { type: "STRING" },
          isin: { type: "STRING", nullable: true },
          classe: { type: "STRING", format: "enum", enum: ASSET_CLASSES },
          montant_investi: { type: "NUMBER", nullable: true },
          valorisation: { type: "NUMBER", nullable: true },
        },
        required: ["libelle", "classe"],
      },
    },
  },
  required: ["enveloppe", "supports"],
};
const PIECE_GEMINI = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", format: "enum", enum: PIECE_TYPES },
    titulaire: { type: "STRING", nullable: true },
    numero: { type: "STRING", nullable: true },
    date_document: { type: "STRING", nullable: true },
    date_validite: { type: "STRING", nullable: true },
    champs: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { label: { type: "STRING" }, valeur: { type: "STRING" } },
        required: ["label", "valeur"],
      },
    },
  },
  required: ["type"],
};

// ---------- Appels moteurs ---------------------------------------------------
async function callGemini(kind: string, mediaType: string, data: string) {
  const schema = kind === "piece" ? PIECE_GEMINI : RELEVE_GEMINI;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mediaType, data } }, { text: prompt(kind) }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema },
    }),
  });
  if (!resp.ok) throw { status: resp.status, detail: (await resp.text().catch(() => "")).slice(0, 800) };
  const out = await resp.json();
  const text = (out?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("").trim();
  if (!text) throw { status: 422, detail: "empty" };
  return JSON.parse(text);
}

async function callAnthropic(kind: string, mediaType: string, data: string) {
  const schema = kind === "piece" ? PIECE_JSON : RELEVE_JSON;
  const toolName = kind === "piece" ? "enregistrer_piece" : "enregistrer_releve";
  const isPdf = mediaType === "application/pdf";
  const fileBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data } };
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL, max_tokens: 4096,
      tools: [{ name: toolName, description: "Enregistre les données extraites.", input_schema: schema }],
      tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: prompt(kind) }] }],
    }),
  });
  if (!resp.ok) throw { status: resp.status, detail: (await resp.text().catch(() => "")).slice(0, 800) };
  const out = await resp.json();
  const toolUse = (out.content || []).find((c: any) => c.type === "tool_use");
  if (!toolUse) throw { status: 422, detail: "no tool_use" };
  return toolUse.input;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const key = PROVIDER === "anthropic" ? ANTHROPIC_API_KEY : GEMINI_API_KEY;
  if (!key) {
    return json({ error: "not_configured", message: `Clé absente pour le moteur '${PROVIDER}'.` }, 503);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const data = body?.data;
  const mediaType = body?.media_type || "application/pdf";
  const kind = body?.kind === "piece" ? "piece" : "releve";
  if (!data || typeof data !== "string") {
    return json({ error: "bad_request", message: "champ 'data' (base64) requis." }, 400);
  }

  try {
    const result = PROVIDER === "anthropic"
      ? await callAnthropic(kind, mediaType, data)
      : await callGemini(kind, mediaType, data);
    return json({ kind, provider: PROVIDER, result }, 200);
  } catch (e: any) {
    return json({ error: "extraction_failed", provider: PROVIDER, status: e?.status, detail: String(e?.detail || e) }, 502);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}
