/* =========================================================================
   Formulaire de contact (contact.html)
   -------------------------------------------------------------------------
   Le formulaire n'ouvrait auparavant que la messagerie du visiteur (mailto:),
   ce qui perdait la demande dès que le poste n'avait pas de client mail
   configuré — le cas sur la plupart des mobiles et des webmails.

   Nouveau parcours, dans cet ordre :
     1. Enregistrement de la demande dans Supabase (table clients, en prospect
        « Lead site ») : elle apparaît aussitôt dans le CRM, onglet « À rappeler ».
     2. Notification email au cabinet via contact.php (PHP servi par Hostinger,
        même origine que le site). Facultative : si elle échoue, la demande
        reste enregistrée.
     3. Repli mailto: uniquement si l'étape 1 est injoignable, pour ne jamais
        laisser un visiteur sans issue.
   ========================================================================= */
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = form.querySelector('.form__status');
  var submitBtn = form.querySelector('button[type=submit]');
  var CABINET_EMAIL = 'contact@lfd-rochechouart.com';

  function val(name) {
    var el = form.querySelector('[name=' + name + ']');
    return el ? (el.value || '').trim() : '';
  }
  function setStatus(kind, text) {
    status.className = 'form__status' + (kind ? ' is-' + kind : '');
    status.textContent = text;
  }
  function busy(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.style.opacity = on ? '.6' : '';
  }
  function supabaseReady() {
    return typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
           SUPABASE_URL.indexOf('VOTRE_PROJET') === -1 &&
           typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY;
  }

  /* Repli ultime : on ouvre la messagerie du visiteur avec la demande pré-remplie. */
  function mailtoFallback(d) {
    var body = [
      'Nom : ' + d.prenom + ' ' + d.nom,
      'Email : ' + d.email,
      d.telephone ? 'Téléphone : ' + d.telephone : '',
      'Objet : ' + d.objet,
      '',
      d.message
    ].filter(Boolean).join('\n');
    window.location.href = 'mailto:' + CABINET_EMAIL +
      '?subject=' + encodeURIComponent('Demande de contact : ' + d.prenom + ' ' + d.nom) +
      '&body=' + encodeURIComponent(body);
    setStatus('err', 'Envoi automatique indisponible. Votre messagerie va s’ouvrir pour finaliser l’envoi, ' +
      'ou écrivez-nous directement à ' + CABINET_EMAIL + '.');
  }

  /* Notification email au cabinet — best effort, ne bloque jamais le visiteur. */
  function notify(d) {
    if (typeof CONTACT_ENDPOINT === 'undefined' || !CONTACT_ENDPOINT) return Promise.resolve(false);
    return fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function (r) {
      if (r && !r.ok) {
        console.warn('[contact] notification refusee par contact.php : HTTP ' + r.status);
        return r.text().then(function (t) { console.warn('[contact] reponse : ' + t); return false; });
      }
      console.info('[contact] notification envoyee.');
      return true;
    }).catch(function (err) {
      console.warn('[contact] contact.php injoignable :', err);
      return false;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var d = {
      prenom: val('prenom'),
      nom: val('nom'),
      email: val('email'),
      telephone: val('phone'),
      objet: val('subject'),
      message: val('message')
    };

    var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email);
    if (!d.prenom || !d.nom || !emailOk || !d.message) {
      setStatus('err', 'Merci de renseigner vos nom et prénom, un email valide et votre message.');
      return;
    }

    if (!supabaseReady()) { mailtoFallback(d); return; }

    busy(true);
    setStatus('', 'Envoi en cours…');

    var payload = {
      type: 'prospect',
      // 'personne' n'est volontairement pas envoye : la colonne n'est declaree
      // dans aucun SQL du depot, et une colonne inconnue ferait echouer l'insert
      // (400 PostgREST). admin.js traite une fiche sans 'personne' comme une
      // personne physique (isMorale -> faux), ce qui est le cas ici.
      // Chaine vide plutot que null : la colonne stage porte DEFAULT 'Nouveau',
      // et 'Nouveau' est traduit en R0 par admin.js, ce qui enverrait la fiche
      // dans le Pipeline au lieu de « A rappeler ». Une chaine vide n'est
      // jamais remplacee par le defaut, et admin.js la lit comme « pas d'etape ».
      stage: '',
      nom: d.nom,
      prenom: d.prenom,
      email: d.email,
      telephone: d.telephone || null,
      comment_connu: 'Lead site',
      commentaires: 'Objet : ' + d.objet + '\n\n' + d.message,
      next_action: 'Recontacter sous 48 h ouvrées',
      consentement_rgpd: true
    };

    // Les deux canaux partent en parallele et sont independants : aucun ne
    // conditionne l'autre. Le message de succes n'est affiche que si l'un au
    // moins a reellement abouti, pour qu'un echec ne passe jamais pour un envoi.
    var pMail = notify(d);

    var pBase = fetch(SUPABASE_URL + '/rest/v1/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.ok) { console.info('[contact] fiche enregistree dans le CRM.'); return true; }
      return res.text().then(function (t) {
        console.warn('[contact] Supabase a refuse la fiche : HTTP ' + res.status + ' ' + t);
        return false;
      });
    }).catch(function (err) {
      console.warn('[contact] Supabase injoignable :', err);
      return false;
    });

    Promise.all([pBase, pMail]).then(function (r) {
      busy(false);
      if (r[0] || r[1]) {
        setStatus('ok', 'Merci, votre demande a bien été transmise. Nous vous répondons sous 48 heures ouvrées.');
        form.reset();
      } else {
        // Aucun canal n'a abouti : on ne ment pas au visiteur.
        mailtoFallback(d);
      }
    });
  });
})();
