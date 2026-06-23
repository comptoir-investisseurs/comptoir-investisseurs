/* CRM Admin Dashboard v2 — LFDR (Pipedrive-inspired) */
(function(){
  'use strict';

  const API = SUPABASE_URL + '/rest/v1';
  const headers = (extra) => Object.assign({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + (sessionStorage.getItem('sb_access_token') || SUPABASE_ANON_KEY),
    'Content-Type': 'application/json'
  }, extra || {});

  const STAGES = ['Nouveau', 'Contacté', 'RDV planifié', 'Proposition', 'Gagné', 'Perdu'];

  // Champs éditables, organisés par section
  const FIELD_SECTIONS = [
    {title:'Identité & Coordonnées', fields:[
      ['civilite','Civilité','select',['','Monsieur','Madame']],
      ['nom','Nom','text'],['prenom','Prénom','text'],
      ['date_naissance','Date de naissance','date'],['lieu_naissance','Lieu de naissance','text'],
      ['nationalite','Nationalité','text'],['pays_residence','Pays de résidence','text'],
      ['adresse','Adresse','text'],['code_postal','Code postal','text'],['ville','Ville','text'],
      ['email','Email','email'],['telephone','Téléphone','tel'],
    ]},
    {title:'Situation familiale', fields:[
      ['situation_matrimoniale','Situation matrimoniale','text'],
      ['regime_matrimonial','Régime matrimonial','text'],
      ['nb_enfants','Nombre d\'enfants','number'],['ages_enfants','Âges des enfants','text'],
      ['personnes_a_charge','Personnes à charge','text'],
      ['testament_donation','Testament / Donations','text'],
    ]},
    {title:'Situation professionnelle', fields:[
      ['csp','CSP','text'],['profession','Profession','text'],['employeur','Employeur','text'],
      ['revenus','Revenus annuels','text'],['capacite_epargne','Capacité d\'épargne','text'],
    ]},
    {title:'Patrimoine', fields:[
      ['patrimoine_financier','Patrimoine financier','text'],
      ['patrimoine_immobilier','Patrimoine immobilier','text'],
      ['placements_existants','Placements existants','array'],
      ['credits','Crédits','text'],['montant_investir','Montant à investir','text'],
      ['origine_fonds','Origine des fonds','text'],
    ]},
    {title:'Objectifs', fields:[
      ['objectifs','Objectifs','array'],['horizon','Horizon','text'],
      ['besoin_liquidite','Besoin de liquidité','text'],
      ['projets_specifiques','Projets spécifiques','textarea'],
    ]},
    {title:'Expérience financière', fields:[
      ['niveau_connaissance','Niveau de connaissance','text'],
      ['experience_produits','Produits connus','array'],
      ['experience_duree','Durée d\'expérience','text'],
      ['frequence_operations','Fréquence','text'],['pertes_passees','Pertes passées','text'],
    ]},
    {title:'Profil de risque', fields:[
      ['reaction_baisse','Réaction en baisse','text'],['perte_max','Perte max acceptée','text'],
      ['couple_rendement_risque','Profil rendement/risque','text'],
      ['part_illiquide','Part illiquide','text'],['esg','ESG','text'],
      ['preference_geo','Préférence géographique','array'],
    ]},
    {title:'Suivi & notes', fields:[
      ['type','Type','select',['prospect','client']],
      ['next_action','Prochaine action','text'],
      ['next_action_date','Échéance','date'],
      ['comment_connu','Source','text'],
      ['notes_internes','Notes internes','textarea'],
      ['commentaires','Commentaires du client','textarea'],
    ]},
  ];
  const EDITABLE_KEYS = FIELD_SECTIONS.flatMap(s => s.fields.map(f => f[0]));
  const ARRAY_KEYS = FIELD_SECTIONS.flatMap(s => s.fields.filter(f => f[2]==='array').map(f => f[0]));

  // ---------- AUTH ----------
  const loginWrap = document.querySelector('.login-wrap');
  const dash = document.querySelector('.dash');
  const loginForm = document.getElementById('login-form');
  const loginError = document.querySelector('.login-error');

  function showDash(){ loginWrap.classList.add('is-hidden'); dash.classList.add('is-visible'); loadAll(); }
  function showLogin(){
    sessionStorage.removeItem('sb_access_token'); sessionStorage.removeItem('sb_user_email');
    loginWrap.classList.remove('is-hidden'); dash.classList.remove('is-visible');
  }
  if(sessionStorage.getItem('sb_access_token')){
    document.getElementById('dash-user-email').textContent = sessionStorage.getItem('sb_user_email') || '';
    showDash();
  }

  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    loginError.style.display = 'none';
    fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method:'POST', headers:{'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},
      body: JSON.stringify({email, password})
    }).then(r => r.json()).then(data => {
      if(data.access_token){
        sessionStorage.setItem('sb_access_token', data.access_token);
        sessionStorage.setItem('sb_user_email', email);
        document.getElementById('dash-user-email').textContent = email;
        showDash();
      } else { loginError.textContent = 'Identifiants incorrects.'; loginError.style.display = 'block'; }
    }).catch(() => { loginError.textContent = 'Erreur de connexion.'; loginError.style.display = 'block'; });
  });
  document.getElementById('btn-logout').addEventListener('click', showLogin);

  // ---------- STATE ----------
  let contacts = [];
  let activities = [];

  function loadAll(){
    Promise.all([
      fetch(API + '/clients?select=*&order=created_at.desc', {headers: headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/activities?select=*&order=date_activite.desc', {headers: headers()}).then(r => r.ok ? r.json() : [])
    ]).then(([c, a]) => {
      contacts = c || []; activities = a || [];
      updateStats(); renderActiveTab();
    }).catch(err => console.error(err));
  }

  // ---------- HELPERS ----------
  function esc(s){ const d = document.createElement('div'); d.textContent = (s===null||s===undefined)?'':s; return d.innerHTML; }
  function fullName(c){ return ((c.prenom||'') + ' ' + (c.nom||'')).trim() || '(sans nom)'; }
  function fmtDate(d){ return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
  function fmtDateTime(d){ return d ? new Date(d).toLocaleString('fr-FR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'; }
  function todayStr(){ return new Date().toISOString().slice(0,10); }

  function updateStats(){
    const clients = contacts.filter(c => (c.type||'client') === 'client');
    const prospects = contacts.filter(c => (c.type||'client') === 'prospect');
    document.getElementById('stat-clients').textContent = clients.length;
    document.getElementById('stat-prospects').textContent = prospects.length;
    const pending = activities.filter(a => !a.done);
    const overdue = pending.filter(a => a.date_activite && a.date_activite.slice(0,10) < todayStr());
    document.getElementById('stat-todo').textContent = pending.length;
    document.getElementById('stat-overdue').textContent = overdue.length;
    document.getElementById('tab-count-clients').textContent = clients.length;
    document.getElementById('tab-count-prospects').textContent = prospects.length;
    document.getElementById('tab-count-activites').textContent = pending.length;
  }

  // ---------- TABS ----------
  let activeTab = 'pipeline';
  document.querySelectorAll('.dash-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.dash-tab').forEach(b => b.classList.toggle('is-active', b===btn));
      document.querySelectorAll('.dash-view').forEach(v => v.classList.remove('is-active'));
      document.getElementById('view-' + activeTab).classList.add('is-active');
      renderActiveTab();
    });
  });
  function renderActiveTab(){
    if(activeTab==='pipeline') renderPipeline();
    else if(activeTab==='clients') renderClients();
    else if(activeTab==='prospects') renderProspects();
    else if(activeTab==='activites') renderActivities();
  }

  // ---------- PIPELINE (KANBAN) ----------
  let draggingId = null;
  function renderPipeline(){
    const board = document.getElementById('kanban');
    board.innerHTML = STAGES.map(stage => {
      const cards = contacts.filter(c => (c.stage||'Nouveau') === stage);
      return `<div class="kanban-col" data-stage="${esc(stage)}">
        <div class="kanban-col__head"><span class="kanban-col__title">${esc(stage)}</span><span class="kanban-col__count">${cards.length}</span></div>
        <div class="kanban-col__body">${cards.map(cardHTML).join('')}</div>
      </div>`;
    }).join('');

    board.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', e => { draggingId = card.dataset.id; card.classList.add('is-dragging'); });
      card.addEventListener('dragend', () => { card.classList.remove('is-dragging'); draggingId = null; });
      card.addEventListener('click', () => openContact(card.dataset.id));
    });
    board.querySelectorAll('.kanban-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('is-dragover'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-dragover'));
      col.addEventListener('drop', e => {
        e.preventDefault(); col.classList.remove('is-dragover');
        if(draggingId) updateStage(draggingId, col.dataset.stage);
      });
    });
  }
  function cardHTML(c){
    const badge = (c.type||'client')==='prospect' ? '<span class="kanban-card__badge badge-prospect">Prospect</span>' : '<span class="kanban-card__badge badge-client">Client</span>';
    const action = c.next_action ? `<div class="kanban-card__action"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${esc(c.next_action)}${c.next_action_date ? ' · '+fmtDate(c.next_action_date) : ''}</div>` : '';
    return `<div class="kanban-card" draggable="true" data-id="${c.id}">
      <div class="kanban-card__name">${esc(fullName(c))}</div>
      <div class="kanban-card__meta">${esc(c.email||'')}${c.patrimoine_financier ? ' · '+esc(c.patrimoine_financier) : ''}</div>
      ${badge}${action}
    </div>`;
  }
  function updateStage(id, stage){
    const c = contacts.find(x => x.id === id); if(!c) return;
    c.stage = stage;
    fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify({stage})})
      .catch(err => console.error(err));
    renderPipeline();
  }

  // ---------- CLIENTS TABLE ----------
  function renderClients(filter){
    const q = (filter||'').toLowerCase();
    const list = contacts.filter(c => (c.type||'client')==='client').filter(c => matchSearch(c,q));
    const tbody = document.getElementById('list-clients');
    if(!list.length){ tbody.innerHTML = '<tr><td colspan="6" class="dash-empty"><p>Aucun client.</p></td></tr>'; return; }
    tbody.innerHTML = list.map(c => `<tr data-id="${c.id}">
      <td><strong>${esc(c.nom||'')}</strong> ${esc(c.prenom||'')}</td>
      <td>${esc(c.email||'—')}</td><td>${esc(c.telephone||'—')}</td>
      <td>${esc(c.patrimoine_financier||'—')}</td><td>${esc(c.stage||'Nouveau')}</td>
      <td>${esc(c.next_action||'—')}</td></tr>`).join('');
    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => openContact(tr.dataset.id)));
  }
  function renderProspects(filter){
    const q = (filter||'').toLowerCase();
    const list = contacts.filter(c => (c.type||'client')==='prospect').filter(c => matchSearch(c,q));
    const tbody = document.getElementById('list-prospects');
    if(!list.length){ tbody.innerHTML = '<tr><td colspan="6" class="dash-empty"><p>Aucun prospect. Cliquez sur « Ajouter un prospect ».</p></td></tr>'; return; }
    tbody.innerHTML = list.map(c => `<tr data-id="${c.id}">
      <td><strong>${esc(c.nom||'')}</strong> ${esc(c.prenom||'')}</td>
      <td>${esc(c.email||'—')}</td><td>${esc(c.telephone||'—')}</td>
      <td>${esc(c.stage||'Nouveau')}</td><td>${esc(c.next_action||'—')}</td>
      <td>${fmtDate(c.next_action_date)}</td></tr>`).join('');
    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => openContact(tr.dataset.id)));
  }
  function matchSearch(c,q){
    if(!q) return true;
    return (c.nom||'').toLowerCase().includes(q) || (c.prenom||'').toLowerCase().includes(q) ||
           (c.email||'').toLowerCase().includes(q) || (c.telephone||'').includes(q);
  }
  document.getElementById('search-clients').addEventListener('input', function(){ renderClients(this.value); });
  document.getElementById('search-prospects').addEventListener('input', function(){ renderProspects(this.value); });

  // ---------- ACTIVITIES FEED ----------
  const ACT_ICONS = {
    appel:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    email:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    rdv:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    tache:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
    note:'<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/>'
  };
  function actIcon(type){ return `<span class="activity-ico t-${type}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ACT_ICONS[type]||ACT_ICONS.note}</svg></span>`; }

  function renderActivities(){
    const feed = document.getElementById('activities-feed');
    const byId = {}; contacts.forEach(c => byId[c.id] = c);
    const enrich = a => Object.assign({}, a, {contact: byId[a.client_id]});
    const all = activities.map(enrich);
    const today = todayStr();
    const overdue = all.filter(a => !a.done && a.date_activite && a.date_activite.slice(0,10) < today);
    const todayA = all.filter(a => !a.done && a.date_activite && a.date_activite.slice(0,10) === today);
    const upcoming = all.filter(a => !a.done && a.date_activite && a.date_activite.slice(0,10) > today);
    const done = all.filter(a => a.done).slice(0,30);

    function group(title, arr, cls){
      if(!arr.length) return '';
      return `<div class="act-group"><h3 class="${cls||''}">${title} (${arr.length})</h3>${arr.map(actRow).join('')}</div>`;
    }
    function actRow(a){
      const name = a.contact ? fullName(a.contact) : 'Contact supprimé';
      return `<div class="act-row" data-id="${a.client_id}">
        ${actIcon(a.type)}
        <div class="act-row__main">
          <div class="activity-title">${esc(a.titre||a.type)}</div>
          <div class="act-row__client">${esc(name)}</div>
          ${a.notes ? '<div class="activity-notes">'+esc(a.notes)+'</div>' : ''}
        </div>
        <div class="activity-meta">${fmtDateTime(a.date_activite)}</div>
      </div>`;
    }
    const html = group('En retard', overdue, 'activity-overdue') + group('Aujourd\'hui', todayA) +
                 group('À venir', upcoming) + group('Terminées', done);
    feed.innerHTML = html || '<div class="dash-empty"><p>Aucune activité pour le moment. Ouvrez une fiche pour en ajouter.</p></div>';
    feed.querySelectorAll('.act-row').forEach(r => r.addEventListener('click', () => openContact(r.dataset.id)));
  }

  // ---------- CONTACT DETAIL MODAL ----------
  const modal = document.getElementById('client-modal');
  const modalBody = document.getElementById('modal-body');
  let currentId = null;
  document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('is-open'));
  modal.addEventListener('click', e => { if(e.target===modal) modal.classList.remove('is-open'); });

  function editField(key,label,type,options,value){
    const v = value===null||value===undefined ? '' : value;
    let input;
    if(type==='select'){
      input = `<select id="f_${key}">${(options||[]).map(o => `<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
    } else if(type==='textarea'){
      input = `<textarea id="f_${key}" rows="2">${esc(v)}</textarea>`;
    } else if(type==='array'){
      input = `<input type="text" id="f_${key}" value="${esc(Array.isArray(v)?v.join(', '):v)}" placeholder="séparé par des virgules">`;
    } else {
      input = `<input type="${type}" id="f_${key}" value="${esc(v)}">`;
    }
    return `<div class="edit-field"><label>${esc(label)}</label>${input}</div>`;
  }

  function openContact(id){
    const c = contacts.find(x => x.id === id); if(!c) return;
    currentId = id;
    document.getElementById('modal-title').textContent = fullName(c);

    const stageBar = `<div class="contact-pipeline">${STAGES.map(s =>
      `<div class="contact-stage ${(c.stage||'Nouveau')===s?'is-active':''}" data-stage="${esc(s)}">${esc(s)}</div>`).join('')}</div>`;

    const formHTML = FIELD_SECTIONS.map(sec =>
      `<div class="detail-section"><h4>${esc(sec.title)}</h4><div class="edit-grid">${
        sec.fields.map(f => editField(f[0], f[1], f[2], f[3], c[f[0]])).join('')
      }</div></div>`).join('');

    modalBody.innerHTML = `
      <div class="modal-tabs">
        <button class="modal-tab is-active" data-pane="infos">Informations</button>
        <button class="modal-tab" data-pane="activites">Activités</button>
      </div>
      <div class="modal-pane is-active" id="pane-infos">
        ${stageBar}
        ${formHTML}
        <div class="modal-save-bar">
          <button class="btn btn--solid" id="save-contact">Enregistrer les modifications</button>
          <button class="btn" id="delete-contact" style="border-color:#c0392b;color:#c0392b">Supprimer</button>
          <span class="modal-save-status" id="save-status"></span>
        </div>
      </div>
      <div class="modal-pane" id="pane-activites">${activitiesPaneHTML(id)}</div>
    `;

    // Stage selector
    modalBody.querySelectorAll('.contact-stage').forEach(el => el.addEventListener('click', () => {
      modalBody.querySelectorAll('.contact-stage').forEach(s => s.classList.remove('is-active'));
      el.classList.add('is-active');
    }));
    // Modal tabs
    modalBody.querySelectorAll('.modal-tab').forEach(t => t.addEventListener('click', () => {
      modalBody.querySelectorAll('.modal-tab').forEach(x => x.classList.toggle('is-active', x===t));
      modalBody.querySelectorAll('.modal-pane').forEach(p => p.classList.remove('is-active'));
      modalBody.querySelector('#pane-' + t.dataset.pane).classList.add('is-active');
    }));
    document.getElementById('save-contact').addEventListener('click', () => saveContact(id));
    document.getElementById('delete-contact').addEventListener('click', () => deleteContact(id));
    bindActivityForm(id);

    modal.classList.add('is-open');
    modalBody.scrollTop = 0;
  }

  function saveContact(id){
    const patch = {};
    EDITABLE_KEYS.forEach(key => {
      const el = document.getElementById('f_' + key); if(!el) return;
      let v = el.value;
      if(ARRAY_KEYS.includes(key)) v = v.split(',').map(s => s.trim()).filter(Boolean);
      else if(key==='nb_enfants') v = parseInt(v,10) || 0;
      else if(v==='') v = null;
      patch[key] = v;
    });
    const activeStage = modalBody.querySelector('.contact-stage.is-active');
    if(activeStage) patch.stage = activeStage.dataset.stage;

    const status = document.getElementById('save-status');
    status.style.color = 'var(--muted)'; status.textContent = 'Enregistrement…';
    fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify(patch)})
      .then(r => {
        if(!r.ok) throw new Error(r.status);
        Object.assign(contacts.find(x => x.id===id), patch);
        status.style.color = '#2e7d32'; status.textContent = '✓ Enregistré';
        updateStats(); renderActiveTab();
      })
      .catch(err => { console.error(err); status.style.color = '#c0392b'; status.textContent = 'Erreur'; });
  }

  function deleteContact(id){
    if(!confirm('Supprimer définitivement cette fiche et toutes ses activités ?')) return;
    fetch(API + '/clients?id=eq.' + id, {method:'DELETE', headers: headers({'Prefer':'return=minimal'})})
      .then(r => { if(!r.ok) throw new Error(r.status);
        contacts = contacts.filter(x => x.id !== id);
        activities = activities.filter(a => a.client_id !== id);
        modal.classList.remove('is-open'); updateStats(); renderActiveTab();
      }).catch(err => { console.error(err); alert('Erreur lors de la suppression.'); });
  }

  // ---------- ACTIVITIES (within contact) ----------
  let selectedActType = 'appel';
  function activitiesPaneHTML(id){
    const list = activities.filter(a => a.client_id === id);
    const types = [['appel','Appel'],['email','Email'],['rdv','RDV'],['tache','Tâche'],['note','Note']];
    return `
      <div class="activity-add">
        <div class="activity-types">${types.map((t,i) =>
          `<button type="button" class="activity-type-btn ${i===0?'is-active':''}" data-type="${t[0]}">${actIcon(t[0])}${t[1]}</button>`).join('')}</div>
        <input type="text" id="act-titre" placeholder="Intitulé (ex : Appel de suivi, RDV bilan…)">
        <div class="activity-add__row">
          <input type="datetime-local" id="act-date" style="flex:1" value="${new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}">
          <label style="font-size:.82rem;color:var(--muted);display:flex;align-items:center;gap:6px"><input type="checkbox" id="act-done" class="activity-done-check">Déjà fait</label>
        </div>
        <textarea id="act-notes" rows="2" placeholder="Notes…"></textarea>
        <button class="btn btn--solid" id="act-add-btn" style="margin-top:4px">Ajouter l'activité</button>
      </div>
      <ul class="activity-list" id="act-list">${list.map(activityItemHTML).join('') || '<p style="color:var(--muted);font-size:.88rem">Aucune activité.</p>'}</ul>
    `;
  }
  function activityItemHTML(a){
    const overdue = !a.done && a.date_activite && a.date_activite.slice(0,10) < todayStr();
    return `<li class="activity-item" data-act="${a.id}">
      ${actIcon(a.type)}
      <div class="activity-content">
        <div class="activity-title"><input type="checkbox" class="activity-done-check act-toggle" ${a.done?'checked':''}> ${esc(a.titre||a.type)}</div>
        <div class="activity-meta ${overdue?'activity-overdue':''}">${fmtDateTime(a.date_activite)}${overdue?' · en retard':''}</div>
        ${a.notes ? '<div class="activity-notes">'+esc(a.notes)+'</div>' : ''}
      </div>
      <button class="dash-modal__close act-del" title="Supprimer"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
    </li>`;
  }
  function bindActivityForm(id){
    const pane = document.getElementById('pane-activites');
    pane.querySelectorAll('.activity-type-btn').forEach(b => b.addEventListener('click', () => {
      pane.querySelectorAll('.activity-type-btn').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active'); selectedActType = b.dataset.type;
    }));
    selectedActType = 'appel';
    document.getElementById('act-add-btn').addEventListener('click', () => addActivity(id));
    pane.querySelectorAll('.act-toggle').forEach(chk => chk.addEventListener('change', e => {
      const li = e.target.closest('[data-act]'); toggleActivity(li.dataset.act, e.target.checked);
    }));
    pane.querySelectorAll('.act-del').forEach(btn => btn.addEventListener('click', e => {
      const li = e.target.closest('[data-act]'); deleteActivity(li.dataset.act);
    }));
  }
  function addActivity(id){
    const titre = document.getElementById('act-titre').value.trim();
    const dateVal = document.getElementById('act-date').value;
    const notes = document.getElementById('act-notes').value.trim();
    const done = document.getElementById('act-done').checked;
    const payload = {client_id:id, type:selectedActType, titre:titre||null, notes:notes||null,
      date_activite: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(), done};
    fetch(API + '/activities', {method:'POST', headers: headers({'Prefer':'return=representation'}), body: JSON.stringify(payload)})
      .then(r => r.json()).then(rows => {
        if(rows && rows[0]) activities.unshift(rows[0]);
        refreshActivitiesPane(id); updateStats();
        if(activeTab==='activites') renderActivities();
      }).catch(err => console.error(err));
  }
  function toggleActivity(actId, done){
    const a = activities.find(x => x.id === actId); if(a) a.done = done;
    fetch(API + '/activities?id=eq.' + actId, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify({done})})
      .then(() => { updateStats(); if(activeTab==='activites') renderActivities(); }).catch(err => console.error(err));
  }
  function deleteActivity(actId){
    activities = activities.filter(x => x.id !== actId);
    fetch(API + '/activities?id=eq.' + actId, {method:'DELETE', headers: headers({'Prefer':'return=minimal'})})
      .then(() => { refreshActivitiesPane(currentId); updateStats(); if(activeTab==='activites') renderActivities(); })
      .catch(err => console.error(err));
  }
  function refreshActivitiesPane(id){
    const pane = document.getElementById('pane-activites'); if(!pane) return;
    pane.innerHTML = activitiesPaneHTML(id); bindActivityForm(id);
  }

  // ---------- INVITE CLIENT ----------
  const inviteModal = document.getElementById('invite-modal');
  const inviteForm = document.getElementById('invite-form');
  const inviteStatus = document.getElementById('invite-status');
  document.getElementById('btn-invite').addEventListener('click', () => { inviteForm.reset(); inviteStatus.textContent=''; inviteModal.classList.add('is-open'); });
  document.getElementById('invite-close').addEventListener('click', () => inviteModal.classList.remove('is-open'));
  inviteModal.addEventListener('click', e => { if(e.target===inviteModal) inviteModal.classList.remove('is-open'); });
  inviteForm.addEventListener('submit', function(e){
    e.preventDefault();
    const nom=document.getElementById('inv-nom').value.trim(), prenom=document.getElementById('inv-prenom').value.trim(), email=document.getElementById('inv-email').value.trim();
    const btn=document.getElementById('invite-submit');
    btn.disabled=true; inviteStatus.style.color='var(--muted)'; inviteStatus.textContent='Envoi en cours…';
    fetch(API + '/rpc/invite_client', {method:'POST', headers: headers(), body: JSON.stringify({p_nom:nom,p_prenom:prenom,p_email:email})})
      .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(() => { inviteStatus.style.color='#2e7d32'; inviteStatus.textContent='✓ Invitation envoyée à '+email; btn.disabled=false; inviteForm.reset(); })
      .catch(err => { console.error(err); inviteStatus.style.color='#c0392b'; inviteStatus.textContent='Erreur lors de l\'envoi.'; btn.disabled=false; });
  });

  // ---------- ADD PROSPECT ----------
  const prospectModal = document.getElementById('prospect-modal');
  const prospectForm = document.getElementById('prospect-form');
  const prospectStatus = document.getElementById('prospect-status');
  function openProspect(){ prospectForm.reset(); prospectStatus.textContent=''; prospectModal.classList.add('is-open'); }
  document.getElementById('btn-add-prospect').addEventListener('click', openProspect);
  document.getElementById('btn-add-prospect-2').addEventListener('click', openProspect);
  document.getElementById('prospect-close').addEventListener('click', () => prospectModal.classList.remove('is-open'));
  prospectModal.addEventListener('click', e => { if(e.target===prospectModal) prospectModal.classList.remove('is-open'); });
  prospectForm.addEventListener('submit', function(e){
    e.preventDefault();
    const payload = {
      type:'prospect', stage:'Nouveau',
      nom: document.getElementById('pro-nom').value.trim(),
      prenom: document.getElementById('pro-prenom').value.trim() || null,
      email: document.getElementById('pro-email').value.trim() || null,
      telephone: document.getElementById('pro-tel').value.trim() || null,
      comment_connu: document.getElementById('pro-source').value.trim() || null
    };
    const btn = document.getElementById('prospect-submit');
    btn.disabled=true; prospectStatus.style.color='var(--muted)'; prospectStatus.textContent='Création…';
    fetch(API + '/clients', {method:'POST', headers: headers({'Prefer':'return=representation'}), body: JSON.stringify(payload)})
      .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(rows => {
        if(rows && rows[0]) contacts.unshift(rows[0]);
        prospectStatus.style.color='#2e7d32'; prospectStatus.textContent='✓ Prospect créé'; btn.disabled=false;
        updateStats(); renderActiveTab();
        setTimeout(() => prospectModal.classList.remove('is-open'), 700);
      })
      .catch(err => { console.error(err); prospectStatus.style.color='#c0392b'; prospectStatus.textContent='Erreur'; btn.disabled=false; });
  });

  // ---------- EXPORT CSV ----------
  document.getElementById('btn-export').addEventListener('click', function(){
    const list = contacts.filter(c => (c.type||'client')==='client');
    if(!list.length) return;
    const keys = Object.keys(list[0]);
    const rows = [keys.join(';')];
    list.forEach(c => rows.push(keys.map(k => {
      let v = c[k]; if(Array.isArray(v)) v = v.join(', '); if(v===null||v===undefined) v='';
      return '"' + String(v).replace(/"/g,'""') + '"';
    }).join(';')));
    const blob = new Blob(['﻿' + rows.join('\n')], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'clients_lfdr_' + todayStr() + '.csv'; a.click();
  });

})();
