// ============================================================
// Ma p'tite pinte 🍺 — Fonction Edge « verify-pinte »
// Vérifie qu'une photo est bien une PINTE valide :
//   • une pinte dans un vrai verre EN VERRE
//   • volume 50 cl
//   • liquide (bière) VISIBLE dans le verre
// Utilise la vision de l'API Claude (Anthropic).
//
// Déploiement :
//   supabase functions deploy verify-pinte --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Le frontend appelle : sb.functions.invoke('verify-pinte', { body:{ image: dataURL } })
// Réponse : { verified: boolean, reason: string }
// ============================================================

// deno-lint-ignore-file no-explicit-any

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("VERIFY_MODEL") ?? "claude-opus-4-8";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  if (!ANTHROPIC_API_KEY) {
    // Pas de clé : on ne bloque pas le jeu, la pinte passera "en attente".
    return json({ verified: null, reason: "vérification indisponible" }, 200);
  }

  let image = "";
  try {
    ({ image } = await req.json());
  } catch {
    return json({ error: "corps JSON invalide" }, 400);
  }
  if (!image || typeof image !== "string") {
    return json({ error: "champ 'image' manquant" }, 400);
  }

  // Extrait le média-type et les données base64 d'un data URL
  const m = image.match(/^data:(image\/\w+);base64,(.+)$/s);
  const mediaType = m ? m[1] : "image/jpeg";
  const b64 = m ? m[2] : image;

  const prompt = `Tu es l'arbitre d'un concours de bière "Ma p'tite pinte".
Analyse la photo et décide si elle respecte TOUTES ces règles :
1. On voit une PINTE de bière servie dans un VRAI VERRE EN VERRE (pas une canette,
   pas une bouteille, pas un gobelet plastique, pas une chope opaque).
2. Le verre correspond à une pinte (~50 cl).
3. Le LIQUIDE (la bière) est bien VISIBLE dans le verre — le verre n'est pas vide.

Réponds UNIQUEMENT par un objet JSON, sans texte autour, au format :
{"verified": true|false, "reason": "courte explication en français (max 12 mots)"}
Si une règle n'est pas respectée, verified=false et explique laquelle.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("Anthropic error", r.status, t);
      return json({ verified: null, reason: "vérification indisponible" }, 200);
    }

    const data = await r.json();
    const text: string = (data.content?.[0]?.text ?? "").trim();

    // Récupère le JSON même s'il est entouré de texte
    const jm = text.match(/\{[\s\S]*\}/);
    if (!jm) return json({ verified: null, reason: "réponse illisible" }, 200);

    const parsed = JSON.parse(jm[0]);
    return json({
      verified: parsed.verified === true,
      reason: String(parsed.reason ?? "").slice(0, 120),
    });
  } catch (e) {
    console.error(e);
    return json({ verified: null, reason: "vérification indisponible" }, 200);
  }
});
