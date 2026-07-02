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
    apiKey:            'VOTRE_API_KEY',
    authDomain:        'VOTRE-PROJET.firebaseapp.com',
    projectId:         'VOTRE-PROJET',
    storageBucket:     'VOTRE-PROJET.appspot.com',
    messagingSenderId: 'VOTRE_SENDER_ID',
    appId:             'VOTRE_APP_ID',
  },

  // Volume attendu d'une pinte, en centilitres.
  PINTE_CL: 50,
};
