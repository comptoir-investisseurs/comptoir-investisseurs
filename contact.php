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

// --- Envoi SMTP (optionnel) -------------------------------------------------
// Laisser $SMTP_HOST vide = envoi par la fonction mail() de l'hebergeur.
// Hostinger bride souvent mail() ; dans ce cas renseignez ces valeurs dans un
// contact-secrets.php place a cote (non suivi par git, jamais publie) :
//   $SMTP_HOST   = 'smtp.hostinger.com';
//   $SMTP_PORT   = 465;          // 465 = SSL implicite, 587 = STARTTLS
//   $SMTP_SECURE = 'ssl';        // 'ssl', 'tls', ou '' (aucun chiffrement)
//   $SMTP_USER   = 'contact@lfd-rochechouart.com';
//   $SMTP_PASS   = '<mot de passe de la boite>';
// Avec SMTP, l'expediteur doit etre la boite authentifiee : $CONTACT_FROM est
// alors aligne automatiquement sur $SMTP_USER (voir plus bas).
$SMTP_HOST   = '';
$SMTP_PORT   = 465;
$SMTP_SECURE = 'ssl';
$SMTP_USER   = '';
$SMTP_PASS   = '';

if (is_file(__DIR__ . '/contact-secrets.php')) {
    require __DIR__ . '/contact-secrets.php';
}

// Avec SMTP, le serveur n'accepte en general que la boite authentifiee comme
// expediteur : on aligne, sinon l'envoi est refuse (550 sender rejected).
if ($SMTP_HOST !== '' && $SMTP_USER !== '') {
    $CONTACT_FROM = $SMTP_USER;
}

/**
 * Envoi SMTP minimal (AUTH LOGIN). Renvoie '' si l'envoi a reussi,
 * sinon la reponse du serveur, pour que l'appelant puisse la journaliser.
 */
function smtp_send($host, $port, $secure, $user, $pass, $from, $to, $headers, $subject, $body, &$err) {
    $err = '';
    $dsn = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $fp = @stream_socket_client($dsn, $errno, $errstr, 20);
    if (!$fp) { $err = 'connexion impossible : ' . $errstr; return false; }
    stream_set_timeout($fp, 20);

    $read = static function () use ($fp) {
        $out = '';
        while (($line = fgets($fp, 512)) !== false) {
            $out .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') break;   // derniere ligne
        }
        return $out;
    };
    // $etape est un libelle fixe : on ne renvoie JAMAIS $c, qui contient
    // l'identifiant et le mot de passe encodes aux etapes d'authentification.
    $cmd = static function ($c, $expect, $etape = '') use ($fp, $read, &$err) {
        if ($c !== null) fwrite($fp, $c . "\r\n");
        $r = $read();
        if (strncmp($r, (string) $expect, strlen((string) $expect)) !== 0) {
            $err = trim($r) . ($etape !== '' ? ' (etape : ' . $etape . ')' : '');
            return false;
        }
        return true;
    };

    $ok = $cmd(null, '220', 'accueil')
       && $cmd('EHLO ' . $host, '250', 'EHLO');
    if ($ok && $secure === 'tls') {
        $ok = $cmd('STARTTLS', '220', 'STARTTLS')
           && @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)
           && $cmd('EHLO ' . $host, '250', 'EHLO apres TLS');
        if (!$ok && $err === '') $err = 'passage en TLS impossible';
    }
    $ok = $ok
       && $cmd('AUTH LOGIN', '334', 'AUTH LOGIN')
       && $cmd(base64_encode($user), '334', 'identifiant refuse')
       && $cmd(base64_encode($pass), '235', 'mot de passe refuse')
       && $cmd('MAIL FROM:<' . $from . '>', '250', 'expediteur refuse')
       && $cmd('RCPT TO:<' . $to . '>', '250', 'destinataire refuse')
       && $cmd('DATA', '354', 'DATA');
    if ($ok) {
        // Un point seul en debut de ligne termine les donnees : on l'echappe.
        $data = 'To: ' . $to . "\r\n" . 'Subject: ' . $subject . "\r\n"
              . $headers . "\r\n\r\n"
              . preg_replace('/^\./m', '..', str_replace("\n", "\r\n", str_replace("\r\n", "\n", $body)));
        fwrite($fp, $data . "\r\n.\r\n");
        $ok = $cmd(null, '250', 'remise du message');
    }
    @fwrite($fp, "QUIT\r\n");
    @fclose($fp);
    return $ok;
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---- Auto-test : /contact.php?selftest=1 --------------------------------
   Envoie un message de controle a $CONTACT_TO (et nulle part ailleurs) et
   rapporte precisement pourquoi l'envoi echoue. Soumis a la meme limite de
   debit que le formulaire, donc inexploitable pour du spam. A ouvrir
   simplement dans un navigateur quand une notification n'arrive pas. */
if (isset($_GET['selftest'])) {
    $ip_t = $_SERVER['REMOTE_ADDR'] ?? 'inconnu';
    // Compteur DISTINCT de celui du formulaire : diagnostiquer ne doit jamais
    // empecher un visiteur d'envoyer sa demande.
    $b_t = sys_get_temp_dir() . '/lfdr-selftest-' . sha1($ip_t) . '.json';
    $h_t = is_file($b_t) ? (json_decode((string) @file_get_contents($b_t), true) ?: []) : [];
    $h_t = array_values(array_filter($h_t, static fn($t) => time() - $t < 900));
    if (count($h_t) >= 5) {
        reply(429, ['error' => 'Trop de tests, reessayez dans un quart d\'heure.']);
    }
    $h_t[] = time();
    @file_put_contents($b_t, json_encode($h_t), LOCK_EX);

    $voie = $SMTP_HOST !== '' ? 'smtp' : 'mail()';
    $hdr = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . sprintf('=?UTF-8?B?%s?=', base64_encode($CONTACT_FROM_NAME)) . ' <' . $CONTACT_FROM . '>',
    ]);
    $suj = sprintf('=?UTF-8?B?%s?=', base64_encode('Test d\'envoi - formulaire de contact'));
    $txt = "Ceci est un message de controle envoye par contact.php?selftest=1.\n"
         . "Si vous le recevez, la notification des demandes de contact fonctionne.\n\n"
         . 'Voie : ' . $voie . "\n" . 'Expediteur : ' . $CONTACT_FROM . "\n"
         . 'Destinataire : ' . $CONTACT_TO . "\n";
    $det = '';
    $essais = [];
    if ($SMTP_HOST !== '') {
        $ok_t = smtp_send($SMTP_HOST, $SMTP_PORT, $SMTP_SECURE, $SMTP_USER, $SMTP_PASS,
                          $CONTACT_FROM, $CONTACT_TO, $hdr, $suj, $txt, $det);
        $essais[] = ['voie' => 'smtp', 'expediteur' => $CONTACT_FROM,
                     'accepte' => (bool) $ok_t, 'reponse' => $det ?: 'accepte'];
    } else {
        // mail() refuse souvent un expediteur dont le domaine n'a pas de service
        // mail sur le compte. On essaie donc successivement les expediteurs
        // plausibles, et on rapporte lequel passe : cela evite un aller-retour.
        $candidats = array_values(array_unique([$CONTACT_FROM, $CONTACT_TO]));
        $ok_t = false;
        foreach ($candidats as $exp) {
            $h = str_replace('<' . $CONTACT_FROM . '>', '<' . $exp . '>', $hdr);
            $r = @mail($CONTACT_TO, $suj, $txt, $h, '-f' . $exp);
            $essais[] = ['voie' => 'mail()', 'expediteur' => $exp, 'accepte' => (bool) $r,
                         'reponse' => $r ? 'accepte' : 'mail() a renvoye false'];
            if ($r) { $ok_t = true; $CONTACT_FROM = $exp; break; }
        }
        if (!$ok_t) {
            $det = 'mail() refuse tous les expediteurs testes : la fonction est bridee par '
                 . 'l\'hebergeur. Passez par SMTP (contact-secrets.php).';
        }
    }
    reply($ok_t ? 200 : 502, [
        'envoi_accepte'  => (bool) $ok_t,
        'voie'           => $voie,
        'expediteur_qui_passe' => $ok_t ? $CONTACT_FROM : null,
        'destinataire'   => $CONTACT_TO,
        'smtp_configure' => $SMTP_HOST !== '' ? $SMTP_HOST . ':' . $SMTP_PORT . ' (' . ($SMTP_SECURE ?: 'aucun') . ')' : 'non',
        'essais'         => $essais,
        'detail'         => $det ?: ($ok_t ? 'Message remis au serveur. Si rien n\'arrive, regardez les spams.' : ''),
        'php_version'    => PHP_VERSION,
    ]);
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

// Pas de pot de miel : un champ piege renvoyait un faux succes aux visiteurs
// dont le navigateur le remplissait automatiquement, et faisait disparaitre
// de vraies demandes sans trace. La validation et la limite de debit
// ci-dessous suffisent pour un formulaire de contact.

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

$sujet_mime = sprintf('=?UTF-8?B?%s?=', base64_encode($sujet));
$detail = '';

if ($SMTP_HOST !== '') {
    $envoye = smtp_send($SMTP_HOST, $SMTP_PORT, $SMTP_SECURE, $SMTP_USER, $SMTP_PASS,
                        $CONTACT_FROM, $CONTACT_TO, implode("\r\n", $headers),
                        $sujet_mime, $corps, $detail);
    $voie = 'smtp';
} else {
    $voie = 'mail()';
    $envoye = false;
    // Meme repli que l'auto-test : si l'hebergeur refuse l'expediteur configure,
    // on retente avec l'adresse du cabinet avant d'abandonner.
    foreach (array_values(array_unique([$CONTACT_FROM, $CONTACT_TO])) as $exp) {
        $h = str_replace('<' . $CONTACT_FROM . '>', '<' . $exp . '>', implode("\r\n", $headers));
        if (@mail($CONTACT_TO, $sujet_mime, $corps, $h, '-f' . $exp)) { $envoye = true; break; }
    }
    if (!$envoye) {
        $detail = 'mail() refuse tous les expediteurs testes (fonction bridee par l\'hebergeur)';
    }
}

if (!$envoye) {
    // Le lead est deja dans Supabase : on journalise sans dramatiser.
    error_log('[contact.php] envoi ' . $voie . ' echoue pour ' . $email . ' : ' . $detail);
    reply(502, ['ok' => false, 'voie' => $voie, 'detail' => $detail,
                'error' => 'Envoi de la notification impossible.']);
}

reply(200, ['ok' => true, 'notified' => true, 'voie' => $voie]);
