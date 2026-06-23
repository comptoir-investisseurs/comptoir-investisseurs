/* CRM Admin Dashboard — LFDR */
(function(){
  'use strict';

  const API = SUPABASE_URL + '/rest/v1';
  const headers = () => ({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + (sessionStorage.getItem('sb_access_token') || SUPABASE_ANON_KEY),
    'Content-Type': 'application/json'
  });

  // ---------- AUTH ----------
  const loginWrap = document.querySelector('.login-wrap');
  const dash = document.querySelector('.dash');
  const loginForm = document.getElementById('login-form');
  const loginError = document.querySelector('.login-error');

  function showDash(){
    loginWrap.classList.add('is-hidden');
    dash.classList.add('is-visible');
    loadClients();
  }

  function showLogin(){
    sessionStorage.removeItem('sb_access_token');
    sessionStorage.removeItem('sb_user_email');
    loginWrap.classList.remove('is-hidden');
    dash.classList.remove('is-visible');
  }

  // Check for existing session
  if(sessionStorage.getItem('sb_access_token')) showDash();

  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    loginError.style.display = 'none';

    fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    })
    .then(r => r.json())
    .then(data => {
      if(data.access_token){
        sessionStorage.setItem('sb_access_token', data.access_token);
        sessionStorage.setItem('sb_user_email', email);
        document.getElementById('dash-user-email').textContent = email;
        showDash();
      } else {
        loginError.textContent = 'Identifiants incorrects.';
        loginError.style.display = 'block';
      }
    })
    .catch(() => {
      loginError.textContent = 'Erreur de connexion au serveur.';
      loginError.style.display = 'block';
    });
  });

  document.getElementById('btn-logout').addEventListener('click', showLogin);

  // ---------- DATA ----------
  let clients = [];

  function loadClients(){
    document.getElementById('client-list').innerHTML = '<tr><td colspan="6" class="dash-loading">Chargement…</td></tr>';

    fetch(API + '/clients?select=*&order=created_at.desc', {headers: headers()})
    .then(r => {
      if(!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(data => {
      clients = data;
      updateStats();
      renderTable(clients);
    })
    .catch(err => {
      console.error(err);
      document.getElementById('client-list').innerHTML =
        '<tr><td colspan="6" class="dash-empty"><p>Impossible de charger les données.</p></td></tr>';
    });
  }

  function updateStats(){
    document.getElementById('stat-total').textContent = clients.length;
    const today = new Date().toISOString().slice(0,10);
    const thisMonth = new Date().toISOString().slice(0,7);
    document.getElementById('stat-today').textContent = clients.filter(c => c.created_at && c.created_at.slice(0,10) === today).length;
    document.getElementById('stat-month').textContent = clients.filter(c => c.created_at && c.created_at.slice(0,7) === thisMonth).length;
  }

  function renderTable(list){
    const tbody = document.getElementById('client-list');
    if(!list.length){
      tbody.innerHTML = '<tr><td colspan="6" class="dash-empty"><p>Aucun client trouvé.</p></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(c => {
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—';
      return `<tr data-id="${c.id}">
        <td><strong>${esc(c.nom || '')}</strong> ${esc(c.prenom || '')}</td>
        <td>${esc(c.email || '—')}</td>
        <td>${esc(c.telephone || '—')}</td>
        <td>${esc(c.patrimoine_financier || '—')}</td>
        <td>${date}</td>
        <td>${esc(c.couple_rendement_risque || '—')}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => openDetail(tr.dataset.id));
    });
  }

  function esc(s){ const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ---------- SEARCH ----------
  document.getElementById('dash-search').addEventListener('input', function(){
    const q = this.value.toLowerCase();
    const filtered = clients.filter(c =>
      (c.nom || '').toLowerCase().includes(q) ||
      (c.prenom || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.telephone || '').includes(q)
    );
    renderTable(filtered);
  });

  // ---------- EXPORT CSV ----------
  document.getElementById('btn-export').addEventListener('click', function(){
    if(!clients.length) return;
    const keys = Object.keys(clients[0]);
    const csvRows = [keys.join(';')];
    clients.forEach(c => {
      csvRows.push(keys.map(k => {
        let v = c[k];
        if(Array.isArray(v)) v = v.join(', ');
        if(v === null || v === undefined) v = '';
        return '"' + String(v).replace(/"/g, '""') + '"';
      }).join(';'));
    });
    const blob = new Blob(['﻿' + csvRows.join('\n')], {type: 'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'clients_lfdr_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  });

  // ---------- INVITE CLIENT ----------
  const inviteModal = document.getElementById('invite-modal');
  const inviteForm = document.getElementById('invite-form');
  const inviteStatus = document.getElementById('invite-status');

  document.getElementById('btn-invite').addEventListener('click', () => {
    inviteForm.reset();
    inviteStatus.textContent = '';
    inviteModal.classList.add('is-open');
  });
  document.getElementById('invite-close').addEventListener('click', () => inviteModal.classList.remove('is-open'));
  inviteModal.addEventListener('click', e => { if(e.target === inviteModal) inviteModal.classList.remove('is-open'); });

  inviteForm.addEventListener('submit', function(e){
    e.preventDefault();
    const nom = document.getElementById('inv-nom').value.trim();
    const prenom = document.getElementById('inv-prenom').value.trim();
    const email = document.getElementById('inv-email').value.trim();
    const btn = document.getElementById('invite-submit');

    btn.disabled = true;
    inviteStatus.style.color = 'var(--muted)';
    inviteStatus.textContent = 'Envoi en cours…';

    // Appel sécurisé à la fonction Supabase invite_client (la clé Brevo reste côté serveur)
    fetch(API + '/rpc/invite_client', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({p_nom: nom, p_prenom: prenom, p_email: email})
    })
    .then(r => {
      if(!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(() => {
      inviteStatus.style.color = '#2e7d32';
      inviteStatus.textContent = '✓ Invitation envoyée à ' + email;
      btn.disabled = false;
      inviteForm.reset();
    })
    .catch(err => {
      console.error(err);
      inviteStatus.style.color = '#c0392b';
      inviteStatus.textContent = 'Erreur lors de l\'envoi. Vérifiez la configuration.';
      btn.disabled = false;
    });
  });

  // ---------- DETAIL MODAL ----------
  const modal = document.getElementById('client-modal');
  const modalBody = document.getElementById('modal-body');

  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });

  function closeModal(){ modal.classList.remove('is-open'); }

  function openDetail(id){
    const c = clients.find(x => x.id === id);
    if(!c) return;

    const date = c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    document.getElementById('modal-title').textContent = (c.prenom || '') + ' ' + (c.nom || '');

    function field(label, val){
      if(Array.isArray(val)) val = val.length ? val.join(', ') : '—';
      return `<div class="detail-item"><strong>${label}</strong><br><span>${esc(val || '—')}</span></div>`;
    }

    modalBody.innerHTML = `
      <div class="detail-section"><h4>Identité & Coordonnées</h4><div class="detail-grid">
        ${field('Civilité', c.civilite)}${field('Nom', c.nom)}${field('Prénom', c.prenom)}
        ${field('Date de naissance', c.date_naissance)}${field('Lieu de naissance', c.lieu_naissance)}
        ${field('Nationalité', c.nationalite)}${field('Pays de résidence', c.pays_residence)}
        ${field('Adresse', c.adresse)}${field('Code postal', c.code_postal)}${field('Ville', c.ville)}
        ${field('Email', c.email)}${field('Téléphone', c.telephone)}
      </div></div>
      <div class="detail-section"><h4>Situation familiale</h4><div class="detail-grid">
        ${field('Situation matrimoniale', c.situation_matrimoniale)}
        ${field('Régime matrimonial', c.regime_matrimonial)}
        ${field('Enfants', c.nb_enfants)}${field('Âges des enfants', c.ages_enfants)}
        ${field('Personnes à charge', c.personnes_a_charge)}
        ${field('Testament / Donations', c.testament_donation)}
      </div></div>
      <div class="detail-section"><h4>Situation professionnelle</h4><div class="detail-grid">
        ${field('CSP', c.csp)}${field('Profession', c.profession)}
        ${field('Employeur', c.employeur)}${field('Revenus annuels', c.revenus)}
        ${field('Capacité d\'épargne', c.capacite_epargne)}
      </div></div>
      <div class="detail-section"><h4>Patrimoine</h4><div class="detail-grid">
        ${field('Patrimoine financier', c.patrimoine_financier)}
        ${field('Patrimoine immobilier', c.patrimoine_immobilier)}
        ${field('Placements existants', c.placements_existants)}
        ${field('Crédits', c.credits)}${field('Montant à investir', c.montant_investir)}
        ${field('Origine des fonds', c.origine_fonds)}
      </div></div>
      <div class="detail-section"><h4>Objectifs</h4><div class="detail-grid">
        ${field('Objectifs', c.objectifs)}${field('Horizon', c.horizon)}
        ${field('Besoin de liquidité', c.besoin_liquidite)}
        ${field('Projets spécifiques', c.projets_specifiques)}
      </div></div>
      <div class="detail-section"><h4>Expérience financière</h4><div class="detail-grid">
        ${field('Niveau', c.niveau_connaissance)}
        ${field('Produits connus', c.experience_produits)}
        ${field('Durée d\'expérience', c.experience_duree)}
        ${field('Fréquence', c.frequence_operations)}
        ${field('Pertes passées', c.pertes_passees)}
      </div></div>
      <div class="detail-section"><h4>Profil de risque</h4><div class="detail-grid">
        ${field('Réaction en baisse', c.reaction_baisse)}
        ${field('Perte max acceptée', c.perte_max)}
        ${field('Profil rendement/risque', c.couple_rendement_risque)}
        ${field('Part illiquide acceptée', c.part_illiquide)}
        ${field('ESG', c.esg)}${field('Préférence géographique', c.preference_geo)}
      </div></div>
      <div class="detail-section"><h4>Autres</h4><div class="detail-grid">
        ${field('Commentaires', c.commentaires)}${field('Source', c.comment_connu)}
        ${field('Consentement RGPD', c.consentement_rgpd ? 'Oui' : 'Non')}
        ${field('Consentement commercial', c.consentement_commercial ? 'Oui' : 'Non')}
        ${field('Date de soumission', date)}
      </div></div>
    `;
    modal.classList.add('is-open');
  }

})();
