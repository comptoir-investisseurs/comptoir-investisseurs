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

  // ---- Vérification IA des photos (Google Gemini, palier gratuit) ----
  // Obtenez une clé sur https://aistudio.google.com/apikey (gratuit).
  // ⚠️ Restreignez cette clé par « Référents HTTP » dans Google Cloud
  //    (ex : https://hugoflpp-afk.github.io/*) pour éviter tout abus.
  // Sans clé, les pintes passent en « en attente » au lieu d'être validées.
  GEMINI_API_KEY: 'VOTRE_CLE_GEMINI',
  GEMINI_MODEL:   'gemini-2.0-flash',

  // Renouvellement de la compétition : 'monthly' (tous les mois).
  SEASON: 'monthly',
};
