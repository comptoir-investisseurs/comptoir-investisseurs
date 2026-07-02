/* ============================================================
 * Ma p'tite pinte 🍺 — Configuration
 * ------------------------------------------------------------
 * Site 100 % indépendant. Créez VOTRE PROPRE projet Supabase
 * (https://supabase.com) puis collez ci-dessous l'URL et la
 * clé "anon public" (Dashboard > Project Settings > API).
 *
 *  ⚠️  La clé "anon" est publique par nature (elle vit dans le
 *      navigateur). La sécurité est assurée par les règles RLS
 *      définies dans supabase.sql. Ne mettez JAMAIS la clé
 *      "service_role" ici.
 * ============================================================ */

window.PP_CONFIG = {
  SUPABASE_URL:      'https://VOTRE-PROJET.supabase.co',
  SUPABASE_ANON_KEY: 'VOTRE_CLE_ANON_PUBLIQUE',

  // Bucket de stockage des photos (créé par supabase.sql)
  BUCKET: 'pintes',

  // Nom de la fonction Edge de vérification des photos (facultatif).
  // Si elle n'est pas déployée, les pintes passent en "en attente".
  VERIFY_FUNCTION: 'verify-pinte',

  // Volume attendu d'une pinte, en centilitres.
  PINTE_CL: 50,
};
