<?php
/* =========================================================================
   Notification des demandes de contact — hébergement Hostinger (PHP).
   -------------------------------------------------------------------------
   Appelé par assets/js/contact.js, sur la même origine que le site : pas de
   CORS, pas de service tiers, pas de clé API, pas de réveil à froid.

   La demande est déjà enregistrée dans Supabase côté navigateur avant cet
   appel : ce script n'est qu'une notification. S'il échoue, le lead reste
   visible dans le CRM (admin.html, onglet « À rappeler ») — rien n'est perdu.
   Aucune donnée n'est stockée ici, hormis le compteur anti-abus (temporaire).

   Réglages ci-dessous ; au besoin, surchargez-les sans toucher à ce fichier
   en déposant un contact-secrets.php à côté (non suivi par git).
   ========================================================================= */

// Destinataire : la boite du cabinet, sur le domaine court historique
// (cf. assets/js/bilan.js — le site et l'email sont sur deux domaines).
$CONTACT_TO   = 'contact@lfd-rochechouart.com';

// Expediteur : son DOMAINE doit etre couvert par un SPF autorisant Hostinger,
// sinon l'email part en spam. L'adresse elle-meme n'a pas besoin d'exister
// (convention des « no-reply ») ; seul un message de rebond serait alors perdu,
// ce que rattrape l'ordre des operations : le lead est deja dans Supabase.
// Si lfd-rochechouart.com est heberge sur le meme compte Hostinger (hPanel >
// Emails), preferez-y 'contact@lfd-rochechouart.com' : l'email semblera venir
// du cabinet. Ne mettez jamais l'adresse du visiteur ici : elle va dans
// Reply-To, plus bas, pour que « Repondre » ecrive bien au prospect.
$CONTACT_FROM = 'no-reply@lafinancierederochechouart.com';
$CONTACT_FROM_NAME = 'Site La Financiere de Rochechouart';

if (is_file(__DIR__ . '/contact-secrets.php')) {
    require __DIR__ . '/contact-secrets.php';
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, ['error' => 'Methode non autorisee.']);
}

$raw = file_get_contents('php://input');
if (strlen($raw) > 32768) {
    reply(413, ['error' => 'Demande trop volumineuse.']);
}
$b = json_decode($raw, true);
if (!is_array($b)) {
    reply(400, ['error' => 'Requete invalide.']);
}

// Pot de miel : champ invisible, rempli uniquement par les robots.
if (!empty($b['company'])) {
    reply(200, ['ok' => true]);
}

/* ---- Garde-fou anti-abus : 5 envois par IP et par quart d'heure ---------
   Compteur dans le dossier temporaire du serveur, purgé tout seul. */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'inconnu';
$bucket = sys_get_temp_dir() . '/lfdr-contact-' . sha1($ip) . '.json';
$now = time();
$hits = [];
if (is_file($bucket)) {
    $hits = json_decode((string) @file_get_contents($bucket), true) ?: [];
}
$hits = array_values(array_filter($hits, static fn($t) => $now - $t < 900));
if (count($hits) >= 5) {
    reply(429, ['error' => 'Trop de demandes, reessayez plus tard.']);
}
$hits[] = $now;
@file_put_contents($bucket, json_encode($hits), LOCK_EX);

/* ---- Validation ------------------------------------------------------- */
$clean = static function ($v, $max) {
    // On retire les sauts de ligne : ils serviraient a injecter des en-tetes.
    return mb_substr(trim(str_replace(["\r", "\n"], ' ', (string) $v)), 0, $max);
};

$prenom    = $clean($b['prenom'] ?? '', 120);
$nom       = $clean($b['nom'] ?? '', 120);
$email     = $clean($b['email'] ?? '', 200);
$telephone = $clean($b['telephone'] ?? '', 40);
$objet     = $clean($b['objet'] ?? 'Autre demande', 200);
$message   = mb_substr(trim((string) ($b['message'] ?? '')), 0, 5000);

if ($prenom === '' || $nom === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(400, ['error' => 'Champs manquants ou invalides.']);
}

/* ---- Envoi ------------------------------------------------------------ */
$sujet = 'Demande de contact : ' . $prenom . ' ' . $nom . ' - ' . $objet;

$corps = "Nouvelle demande via le formulaire de contact du site.\n\n"
       . 'Nom       : ' . $prenom . ' ' . $nom . "\n"
       . 'Email     : ' . $email . "\n"
       . ($telephone !== '' ? 'Telephone : ' . $telephone . "\n" : '')
       . 'Objet     : ' . $objet . "\n\n"
       . "Message :\n" . $message . "\n\n"
       . "---\nLa demande est aussi enregistree dans le CRM (onglet « A rappeler »).\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . sprintf('=?UTF-8?B?%s?=', base64_encode($CONTACT_FROM_NAME)) . ' <' . $CONTACT_FROM . '>',
    'Reply-To: ' . sprintf('=?UTF-8?B?%s?=', base64_encode($prenom . ' ' . $nom)) . ' <' . $email . '>',
    'X-Mailer: PHP/' . phpversion(),
];

$envoye = @mail(
    $CONTACT_TO,
    sprintf('=?UTF-8?B?%s?=', base64_encode($sujet)),
    $corps,
    implode("\r\n", $headers),
    '-f' . $CONTACT_FROM
);

if (!$envoye) {
    // Le lead est deja dans Supabase : on signale sans dramatiser.
    error_log('[contact.php] mail() a echoue pour ' . $email);
    reply(502, ['ok' => false, 'error' => 'Envoi de la notification impossible.']);
}

reply(200, ['ok' => true, 'notified' => true]);
