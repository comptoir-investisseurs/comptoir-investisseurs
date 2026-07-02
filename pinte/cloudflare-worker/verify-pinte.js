/**
 * Ma p'tite pinte 🍺 — Cloudflare Worker « verify-pinte »
 * ------------------------------------------------------------
 * Proxy de vérification des photos : garde la clé Gemini SECRÈTE
 * côté serveur. Le navigateur appelle ce Worker, jamais Gemini.
 *
 * Déploiement (voir README) :
 *   1. Colle ce script dans un nouveau Worker Cloudflare (gratuit).
 *   2. Ajoute une variable SECRÈTE : GEMINI_API_KEY = <ta clé AIza…>
 *      (Worker → Settings → Variables and Secrets → Add → type "Secret").
 *   3. (option) Variable texte GEMINI_MODEL (défaut : gemini-2.0-flash).
 *   4. Déploie → copie l'URL (…workers.dev) dans assets/config.js (VERIFY_URL).
 *
 * Entrée  (POST JSON) : { "image": "data:image/jpeg;base64,..." }
 * Sortie  (JSON)      : { "verified": true|false|null, "reason": "..." }
 *   verified=null → vérification indisponible (la pinte passe « en attente »).
 */

const PROMPT = `Tu es l'arbitre d'un concours de bière "Ma p'tite pinte".
Réponds UNIQUEMENT par un objet JSON, sans texte autour :
{"verified": true|false, "reason": "explication courte en français, max 10 mots"}

verified = true SEULEMENT si TOUTES ces conditions sont réunies :
1. La photo montre une PINTE de bière (environ 50 cl) servie dans un VERRE EN VERRE transparent.
2. Le verre est grand (format pinte), bien rempli, et la BIÈRE (liquide) est clairement visible.

verified = false dans TOUS ces cas :
- verre trop petit : galopin (~12,5 cl), demi (~25 cl) ou tout verre nettement plus petit qu'une pinte ;
- chope opaque, canette, bouteille, gobelet plastique ;
- verre vide ou quasi vide ; pas de bière identifiable ; photo floue.
En cas de doute sur la taille, considère que ce n'est PAS une pinte (verified=false).`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
    if (!env.GEMINI_API_KEY) return json({ verified: null, reason: 'clé absente' });

    let image;
    try { ({ image } = await request.json()); }
    catch { return json({ error: 'JSON invalide' }, 400); }
    if (!image || typeof image !== 'string') return json({ error: 'champ image manquant' }, 400);

    const m = /^data:(image\/\w+);base64,(.+)$/s.exec(image);
    const mime = m ? m[1] : 'image/jpeg';
    const b64  = m ? m[2] : image;

    const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mime, data: b64 } },
          ] }],
          generationConfig: { temperature: 0, maxOutputTokens: 120 },
        }),
      });
      if (!r.ok) {
        console.error('Gemini', r.status, await r.text());
        return json({ verified: null, reason: 'vérif indisponible' });
      }
      const data = await r.json();
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || '').join('').trim();
      const jm = text.match(/\{[\s\S]*\}/);
      if (!jm) return json({ verified: null, reason: 'réponse illisible' });
      const parsed = JSON.parse(jm[0]);
      return json({
        verified: parsed.verified === true,
        reason: String(parsed.reason || '').slice(0, 140),
      });
    } catch (e) {
      console.error(e);
      return json({ verified: null, reason: 'erreur serveur' });
    }
  },
};
