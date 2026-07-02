/* ============================================================
 * Ma p'tite pinte 🍺 — Configuration (Firebase)
 * ------------------------------------------------------------
 * Site 100 % indépendant. Créez VOTRE PROPRE projet Firebase
 * (https://console.firebase.google.com) puis :
 *   1. Ajoutez une application "Web" (</>)  → copiez le firebaseConfig ci-dessous
 *   2. Authentication  → activez "Email/Mot de passe"
 *   3. Firestore Database → créez une base (mode production)
 *   4. Storage           → activez le stockage
 *   5. Collez les règles fournies (firestore.rules / storage.rules)
 *
 *  ⚠️  Ces clés Firebase sont PUBLIQUES par nature (elles vivent dans le
 *      navigateur). La sécurité est assurée par les Security Rules.
 * ============================================================ */

window.PP_CONFIG = {
  firebase: {
    apiKey:            'AIzaSyCP7Vu-aV_6ZS8h1jhuDxeJIKkX5ijPXog',
    authDomain:        'ma-p-tite-pinte.firebaseapp.com',
    projectId:         'ma-p-tite-pinte',
    storageBucket:     'ma-p-tite-pinte.firebasestorage.app',
    messagingSenderId: '501817697579',
    appId:             '1:501817697579:web:130d81b8ac9c5a4b8f116e',
  },

  // Volume attendu d'une pinte, en centilitres.
  PINTE_CL: 50,

  // ---- Vérification IA des photos ----
  // URL de VOTRE Cloudflare Worker "verify-pinte" (voir cloudflare-worker/).
  // La clé Gemini reste SECRÈTE côté Worker — jamais dans le navigateur.
  // Sans URL, les pintes passent en « en attente » au lieu d'être validées.
  VERIFY_URL: 'https://verify-pinte.VOTRE-SOUS-DOMAINE.workers.dev',

  // Renouvellement de la compétition : 'monthly' (tous les mois).
  SEASON: 'monthly',
};
