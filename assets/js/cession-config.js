/* =========================================================================
   Configuration — Pôle Cession & rapprochement de cabinet (pré-valorisation)
   -------------------------------------------------------------------------
   L'estimation est calculée dans le navigateur et affichée immédiatement.
   Pour ENVOYER l'estimation par e-mail (au dirigeant et à LFDR) sans serveur,
   renseignez UNE des deux options ci-dessous. Sans configuration, le site
   bascule automatiquement sur l'ouverture de la messagerie du visiteur
   (mailto) et l'estimation reste affichée à l'écran.
   ========================================================================= */

/* Adresse qui reçoit les demandes de pré-valorisation. */
const CESSION_NOTIFY_EMAIL = 'contact@lfd-rochechouart.com';

/* --- Option 1 (recommandée) : Web3Forms — https://web3forms.com ---------
   Gratuit, sans compte serveur. Créez une clé d'accès (Access Key) et
   collez-la ci-dessous. Web3Forms envoie chaque demande à l'adresse liée
   à la clé et peut renvoyer une copie au dirigeant (auto-réponse).        */
const CESSION_WEB3FORMS_KEY = ''; // ex : 'a1b2c3d4-....'

/* --- Option 2 : Formspree — https://formspree.io ------------------------
   Collez l'URL de votre formulaire (https://formspree.io/f/xxxx).
   Laissé vide si vous utilisez Web3Forms.                                 */
const CESSION_FORMSPREE_URL = '';
