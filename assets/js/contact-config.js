/* Endpoint de notification des demandes de contact.
   Chemin relatif : le script PHP est servi par Hostinger sur la même origine
   que le site (pas de CORS, pas de service tiers, pas de réveil à froid).
   Vide = pas de notification email : la demande est malgré tout enregistrée
   dans Supabase et visible dans le CRM (admin.html). */
const CONTACT_ENDPOINT = 'contact.php';
