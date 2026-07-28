// ===========================================================================
// extract-doc — Supabase Edge Function (Deno)
// Lecture automatique et fiable des documents patrimoniaux via Claude.
//   • kind = "releve" : relevé d'assureur / de banque -> enveloppe + supports
//   • kind = "piece"  : pièce justificative -> type, dates, validité, numéro
//
// La clé API Anthropic reste côté serveur (secret Supabase ANTHROPIC_API_KEY)
// et n'est JAMAIS exposée au navigateur.
//
// Déploiement :
//   supabase functions deploy extract-doc
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Appel (front) : POST { data: <base64>, media_type, kind }
// ===========================================================================

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-opus-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

// ---- Schémas de sortie (tool use forcé, fiable sur tous les modèles) ------
const RELEVE_SCHEMA = {
  type: "object",
  properties: {
    enveloppe: {
      type: "object",
      properties: {
        type: { type: "string", enum: ENV_TYPES, description: "Type d'enveloppe. Un produit structuré n'est JAMAIS un type d'enveloppe : c'est un support logé dans une enveloppe." },
        etablissement: { type: ["string", "null"], description: "Assureur ou banque (ex : Generali, Spirica, Swiss Life…)." },
        numero: { type: ["string", "null"], description: "Numéro de contrat / police / compte." },
        date_valorisation: { type: ["string", "null"], description: "Date de la valorisation au format AAAA-MM-JJ." },
        valorisation_totale: { type: ["number", "null"], description: "Valorisation totale du contrat en euros (nombre, sans symbole)." },
        devise: { type: "string", description: "Devise ISO (EUR, USD, CHF, GBP)." },
      },
      required: ["type", "devise"],
      additionalProperties: false,
    },
    supports: {
      type: "array",
      description: "Un élément par ligne / support / unité de compte du relevé.",
      items: {
        type: "object",
        properties: {
          libelle: { type: "string", description: "Nom du support / fonds / unité de compte." },
          isin: { type: ["string", "null"], description: "Code ISIN (2 lettres + 10 caractères) si présent." },
          classe: { type: "string", enum: ASSET_CLASSES, description: "Classe d'actif. Un fonds en euros = 'Fonds euro'. Une note/autocall/Phoenix = 'Produit structuré'. Une SCPI/OPCI = 'Immobilier'." },
          montant_investi: { type: ["number", "null"], description: "Montant investi / versé en euros si indiqué." },
          valorisation: { type: ["number", "null"], description: "Valorisation actuelle en euros." },
        },
        required: ["libelle", "classe"],
        additionalProperties: false,
      },
    },
  },
  required: ["enveloppe", "supports"],
  additionalProperties: false,
};

const PIECE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: PIECE_TYPES, description: "Nature de la pièce justificative." },
    titulaire: { type: ["string", "null"], description: "Nom du titulaire / de la personne concernée." },
    numero: { type: ["string", "null"], description: "Numéro du document (n° pièce d'identité, n° KBIS, référence avis d'imposition…)." },
    date_document: { type: ["string", "null"], description: "Date d'émission / d'établissement au format AAAA-MM-JJ." },
    date_validite: { type: ["string", "null"], description: "Date d'expiration / de fin de validité au format AAAA-MM-JJ (ex : date d'expiration d'une CNI). null si non applicable." },
  },
  required: ["type"],
  additionalProperties: false,
};

function prompt(kind: string): string {
  if (kind === "releve") {
    return "Tu es un assistant pour un cabinet de gestion de patrimoine. On te fournit un relevé de situation d'un contrat d'assurance-vie, de capitalisation, PER, ou d'un compte-titres/PEA émis par un assureur ou une banque. Extrais l'enveloppe (type, établissement, numéro de contrat, date et montant de valorisation, devise) et la liste complète des supports détenus (chaque unité de compte, fonds euro, ligne titre). Pour chaque support : libellé, ISIN si présent, classe d'actif, montant investi et valorisation en euros. Rappel important : un produit structuré (note, autocall, Phoenix, Athéna…) est un SUPPORT de classe 'Produit structuré' logé dans l'enveloppe, ce n'est jamais un type d'enveloppe. N'invente aucun chiffre : laisse null ce qui n'est pas lisible.";
  }
  return "Tu es un assistant pour un cabinet de gestion de patrimoine. On te fournit une pièce justificative (pièce d'identité, justificatif de domicile, avis d'imposition, RIB, extrait KBIS, statuts, registre des bénéficiaires effectifs, livret de famille…). Identifie précisément la nature du document, le titulaire, son numéro/référence, sa date d'émission, et sa date d'expiration/fin de validité si elle existe (ex : date d'expiration d'une carte d'identité ou d'un passeport). Toutes les dates au format AAAA-MM-JJ. Laisse null ce qui n'est pas présent.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "not_configured", message: "ANTHROPIC_API_KEY absente côté serveur." }, 503);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const data = body?.data;
  const mediaType = body?.media_type || "application/pdf";
  const kind = body?.kind === "piece" ? "piece" : "releve";
  if (!data || typeof data !== "string") {
    return json({ error: "bad_request", message: "champ 'data' (base64) requis." }, 400);
  }

  const isPdf = mediaType === "application/pdf";
  const fileBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data } };

  const schema = kind === "piece" ? PIECE_SCHEMA : RELEVE_SCHEMA;
  const toolName = kind === "piece" ? "enregistrer_piece" : "enregistrer_releve";

  const payload = {
    model: MODEL,
    max_tokens: 4096,
    tools: [{ name: toolName, description: "Enregistre les données extraites du document.", input_schema: schema }],
    tool_choice: { type: "tool", name: toolName },
    messages: [{
      role: "user",
      content: [fileBlock, { type: "text", text: prompt(kind) }],
    }],
  };

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json({ error: "upstream_unreachable", message: String(e) }, 502);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return json({ error: "anthropic_error", status: resp.status, detail: detail.slice(0, 800) }, 502);
  }

  const out = await resp.json();
  const toolUse = (out.content || []).find((c: any) => c.type === "tool_use");
  if (!toolUse) {
    return json({ error: "no_extraction", message: "Le modèle n'a pas renvoyé de données structurées." }, 422);
  }
  return json({ kind, result: toolUse.input }, 200);
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
