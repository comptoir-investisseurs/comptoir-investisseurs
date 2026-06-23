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

  // ---------- PORTFOLIO (demo data) ----------
  const ALLOC_COLORS = {
    'Actions':'#1565c0','ETF':'#2e7d32','OPCVM':'#6a1b9a','Obligations':'#e65100',
    'Produit structuré':'#c62828','Immobilier':'#00838f','Fonds euro':'#558b2f','Liquidités':'#9e9e9e'
  };
  const DEMO_PORTFOLIO = { contracts:[
    { name:'Assurance-vie Luxembourgeoise', provider:'Generali Luxembourg',
      number:'GL-2024-00847', type:'Assurance-vie', openDate:'2024-03-15',
      invested:500000, currentValue:567800,
      history:[500000,502300,498700,505100,512400,508900,515600,522100,518700,526300,534100,541800,537200,545600,552300,559800,563400,567800],
      lines:[
        {name:'Amundi MSCI World UCITS ETF',isin:'LU1681043599',type:'ETF',allocation:25,value:141950,perf:18.2},
        {name:'Carmignac Patrimoine',isin:'FR0010135103',type:'OPCVM',allocation:15,value:85170,perf:8.4},
        {name:'Produit Structuré Phoenix — BNP',isin:'XS2548712345',type:'Produit structuré',allocation:12,value:68136,perf:6.8},
        {name:'iShares Euro Corp Bond',isin:'IE00B3F81R35',type:'Obligations',allocation:10,value:56780,perf:4.2},
        {name:'Fonds en euros Netissima',isin:'—',type:'Fonds euro',allocation:18,value:102204,perf:3.1},
        {name:'SC Tempo (SCPI)',isin:'—',type:'Immobilier',allocation:10,value:56780,perf:5.6},
        {name:'Liquidités',isin:'—',type:'Liquidités',allocation:10,value:56780,perf:0}
      ]},
    { name:'Plan Épargne Retraite (PER)', provider:'Intencial Patrimoine',
      number:'INT-PER-2024-03291', type:'PER', openDate:'2024-06-01',
      invested:150000, currentValue:164250,
      history:[150000,150800,149200,151600,153400,152100,154800,156200,155100,157800,159600,160900,161500,162800,163400,163900,164100,164250],
      lines:[
        {name:'Lyxor MSCI EMU ESG',isin:'LU1792117340',type:'ETF',allocation:30,value:49275,perf:12.1},
        {name:'Comgest Growth Europe',isin:'IE0004766675',type:'OPCVM',allocation:25,value:41062,perf:9.8},
        {name:'AXA Aedificandi (OPCI)',isin:'FR0013285004',type:'Immobilier',allocation:15,value:24637,perf:4.2},
        {name:'Tikehau Taux Variables',isin:'FR0010460493',type:'Obligations',allocation:15,value:24637,perf:5.1},
        {name:'Fonds euros Apicil Euro Garanti',isin:'—',type:'Fonds euro',allocation:15,value:24639,perf:2.8}
      ]},
    { name:'Compte-Titres Ordinaire', provider:'Saxo Banque',
      number:'SXO-FR-2023-18754', type:'CTO', openDate:'2023-11-10',
      invested:300000, currentValue:347200,
      history:[300000,303200,298100,305400,312800,309100,316500,321700,317400,324600,330200,335800,331900,338400,341200,344800,345600,347200],
      lines:[
        {name:'LVMH Moët Hennessy',isin:'FR0000121014',type:'Actions',allocation:12,value:41664,perf:15.3},
        {name:'ASML Holding',isin:'NL0010273215',type:'Actions',allocation:10,value:34720,perf:28.4},
        {name:'Air Liquide',isin:'FR0000120073',type:'Actions',allocation:8,value:27776,perf:11.2},
        {name:'iShares Core S&P 500 UCITS',isin:'IE00B5BMR087',type:'ETF',allocation:20,value:69440,perf:22.1},
        {name:'Xtrackers MSCI Emerging Markets',isin:'IE00BTJRMP35',type:'ETF',allocation:10,value:34720,perf:8.7},
        {name:'Produit Structuré Autocall — SG',isin:'XS2634521000',type:'Produit structuré',allocation:15,value:52080,perf:7.2},
        {name:'Obligations souveraines EUR',isin:'LU0290355717',type:'Obligations',allocation:10,value:34720,perf:3.8},
        {name:'Liquidités',isin:'—',type:'Liquidités',allocation:15,value:52080,perf:0}
      ]},
    { name:'Assurance-vie Française', provider:'Spirica (Linxea Spirit 2)',
      number:'SPI-AV-2024-07832', type:'Assurance-vie', openDate:'2024-01-20',
      invested:200000, currentValue:218750,
      history:[200000,201500,199200,203100,206400,204800,207600,210200,208900,211500,213800,215200,214100,216300,217400,218100,218500,218750],
      lines:[
        {name:'Fonds en euros Spirica',isin:'—',type:'Fonds euro',allocation:40,value:87500,perf:3.5},
        {name:'R-co Valor',isin:'FR0011253624',type:'OPCVM',allocation:20,value:43750,perf:12.3},
        {name:'Amundi IS MSCI Europe SRI',isin:'LU1861137484',type:'ETF',allocation:15,value:32812,perf:9.8},
        {name:'Primonial Capimmo (OPCI)',isin:'FR0013157320',type:'Immobilier',allocation:15,value:32813,perf:3.9},
        {name:'Liquidités',isin:'—',type:'Liquidités',allocation:10,value:21875,perf:0}
      ]}
  ]};

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
  function fmtMoney(n){ return (n||0).toLocaleString('fr-FR',{maximumFractionDigits:0})+' €'; }
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
        <button class="modal-tab" data-pane="portefeuille">Portefeuille</button>
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
      <div class="modal-pane" id="pane-portefeuille">${portfolioPaneHTML()}</div>
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
      if(t.dataset.pane==='portefeuille') setTimeout(drawPortfolioCharts,30);
    }));
    document.getElementById('save-contact').addEventListener('click', () => saveContact(id));
    document.getElementById('delete-contact').addEventListener('click', () => deleteContact(id));
    bindActivityForm(id);
    bindPortfolioEvents();

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

  // ---------- PORTFOLIO ----------
  function portfolioPaneHTML(){
    const pf = DEMO_PORTFOLIO;
    const totalInvested = pf.contracts.reduce((s,c) => s+c.invested, 0);
    const totalValue = pf.contracts.reduce((s,c) => s+c.currentValue, 0);
    const gain = totalValue - totalInvested;
    const perf = ((gain/totalInvested)*100).toFixed(1);
    const sign = gain >= 0 ? '+' : '';
    const classMap = {};
    pf.contracts.forEach(c => c.lines.forEach(l => { classMap[l.type]=(classMap[l.type]||0)+l.value; }));
    const allocEntries = Object.entries(classMap).sort((a,b) => b[1]-a[1]);
    return `
      <div class="pf-header"><div class="pf-total-card">
        <div class="pf-total-label">Valorisation totale du portefeuille</div>
        <div class="pf-total-value">${fmtMoney(totalValue)}</div>
        <div class="pf-total-perf ${gain>=0?'positive':'negative'}">${sign}${fmtMoney(gain)} (${sign}${perf}%)</div>
        <div class="pf-total-invested">Investi : ${fmtMoney(totalInvested)}</div>
      </div></div>
      <div class="pf-chart-section">
        <h4>Évolution de la valorisation</h4>
        <div class="pf-chart-wrap"><canvas id="pf-perf-chart"></canvas></div>
      </div>
      <div class="pf-alloc-section">
        <h4>Répartition par classe d'actif</h4>
        <div class="pf-alloc-grid">
          <div class="pf-donut-wrap"><canvas id="pf-alloc-donut" width="200" height="200"></canvas></div>
          <div class="pf-alloc-list">${allocEntries.map(([type,val]) => {
            const pct = ((val/totalValue)*100).toFixed(1);
            return `<div class="pf-alloc-item">
              <span class="pf-alloc-dot" style="background:${ALLOC_COLORS[type]||'#999'}"></span>
              <span class="pf-alloc-name">${esc(type)}</span>
              <span class="pf-alloc-val">${fmtMoney(val)}</span>
              <span class="pf-alloc-pct">${pct}%</span>
            </div>`;
          }).join('')}</div>
        </div>
      </div>
      <div class="pf-contracts-section">
        <h4>Détail des contrats</h4>
        ${pf.contracts.map(c => contractCardHTML(c)).join('')}
      </div>`;
  }

  function contractCardHTML(c){
    const gain = c.currentValue - c.invested;
    const perf = ((gain/c.invested)*100).toFixed(1);
    const sign = gain >= 0 ? '+' : '';
    return `<div class="pf-contract">
      <div class="pf-contract__head">
        <div class="pf-contract__info">
          <div class="pf-contract__name">${esc(c.name)}</div>
          <div class="pf-contract__provider">${esc(c.provider)} · ${esc(c.number)}</div>
        </div>
        <div class="pf-contract__figures">
          <div class="pf-contract__value">${fmtMoney(c.currentValue)}</div>
          <div class="pf-contract__perf ${gain>=0?'positive':'negative'}">${sign}${perf}%</div>
        </div>
        <button class="pf-contract__toggle" aria-label="Détails"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      </div>
      <div class="pf-contract__detail" style="display:none">
        <div class="pf-contract__meta">
          <span>Ouverture : ${fmtDate(c.openDate)}</span>
          <span>Investi : ${fmtMoney(c.invested)}</span>
          <span class="${gain>=0?'positive':'negative'}">P/L : ${sign}${fmtMoney(gain)}</span>
        </div>
        <table class="pf-lines-table"><thead><tr>
          <th>Support</th><th>Classe</th><th>Allocation</th><th>Valorisation</th><th>Perf.</th>
        </tr></thead><tbody>${c.lines.map(l => `<tr>
          <td><div class="pf-line-name">${esc(l.name)}</div><div class="pf-line-isin">${esc(l.isin)}</div></td>
          <td><span class="pf-line-class" style="background:${(ALLOC_COLORS[l.type]||'#999')}20;color:${ALLOC_COLORS[l.type]||'#999'}">${esc(l.type)}</span></td>
          <td>${l.allocation.toFixed(1)}%</td>
          <td class="pf-line-val">${fmtMoney(l.value)}</td>
          <td class="${l.perf>=0?'positive':'negative'}">${l.perf>=0?'+':''}${l.perf.toFixed(1)}%</td>
        </tr>`).join('')}</tbody></table>
      </div>
    </div>`;
  }

  function drawPerformanceChart(canvasId, history){
    const canvas = document.getElementById(canvasId); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(rect.width-32, 300), h = 260;
    canvas.width=w*dpr; canvas.height=h*dpr;
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    ctx.scale(dpr,dpr);
    const pad={top:20,right:16,bottom:36,left:72};
    const plotW=w-pad.left-pad.right, plotH=h-pad.top-pad.bottom;
    const minVal=Math.min(...history)*0.998, maxVal=Math.max(...history)*1.002, range=maxVal-minVal;
    ctx.strokeStyle='#e8e6df'; ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=pad.top+(plotH*i/4);
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(w-pad.right,y); ctx.stroke();
      ctx.fillStyle='#8a8780'; ctx.font='11px Jost,sans-serif'; ctx.textAlign='right';
      ctx.fillText(fmtMoney(Math.round(maxVal-(range*i/4))), pad.left-8, y+4);
    }
    const months=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    ctx.fillStyle='#8a8780'; ctx.font='10px Jost,sans-serif'; ctx.textAlign='center';
    const step=Math.max(1,Math.floor(history.length/7));
    for(let i=0;i<history.length;i+=step){
      const x=pad.left+(plotW*i/(history.length-1));
      ctx.fillText(months[i%12]+' '+(i<12?'25':'26'), x, h-pad.bottom+18);
    }
    const pts=history.map((v,i)=>({x:pad.left+(plotW*i/(history.length-1)),y:pad.top+plotH-((v-minVal)/range*plotH)}));
    const grad=ctx.createLinearGradient(0,pad.top,0,pad.top+plotH);
    grad.addColorStop(0,'rgba(169,133,63,.18)'); grad.addColorStop(1,'rgba(169,133,63,.02)');
    ctx.beginPath(); ctx.moveTo(pts[0].x,pad.top+plotH);
    pts.forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.lineTo(pts[pts.length-1].x,pad.top+plotH); ctx.closePath();
    ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle='#A9853F'; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();
    const last=pts[pts.length-1];
    ctx.beginPath(); ctx.arc(last.x,last.y,5,0,Math.PI*2);
    ctx.fillStyle='#A9853F'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
  }

  function drawAllocationDonut(canvasId, allocEntries, totalValue){
    const canvas = document.getElementById(canvasId); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    canvas.width=200*dpr; canvas.height=200*dpr;
    canvas.style.width='200px'; canvas.style.height='200px';
    ctx.scale(dpr,dpr);
    const cx=100,cy=100,r=82,innerR=54;
    let start=-Math.PI/2;
    allocEntries.forEach(([type,val])=>{
      const slice=(val/totalValue)*Math.PI*2;
      ctx.beginPath(); ctx.arc(cx,cy,r,start,start+slice);
      ctx.arc(cx,cy,innerR,start+slice,start,true); ctx.closePath();
      ctx.fillStyle=ALLOC_COLORS[type]||'#999'; ctx.fill();
      start+=slice;
    });
    ctx.fillStyle='#001B00'; ctx.font='600 14px Jost,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(allocEntries.length+' classes',cx,cy);
  }

  function drawPortfolioCharts(){
    const pf=DEMO_PORTFOLIO;
    const totalValue=pf.contracts.reduce((s,c)=>s+c.currentValue,0);
    const maxLen=Math.max(...pf.contracts.map(c=>c.history.length));
    const agg=[];
    for(let i=0;i<maxLen;i++){let sum=0;pf.contracts.forEach(c=>{sum+=c.history[Math.min(i,c.history.length-1)];});agg.push(sum);}
    const classMap={};
    pf.contracts.forEach(c=>c.lines.forEach(l=>{classMap[l.type]=(classMap[l.type]||0)+l.value;}));
    drawPerformanceChart('pf-perf-chart',agg);
    drawAllocationDonut('pf-alloc-donut',Object.entries(classMap).sort((a,b)=>b[1]-a[1]),totalValue);
  }

  function bindPortfolioEvents(){
    document.querySelectorAll('.pf-contract__head').forEach(head=>{
      head.addEventListener('click',()=>{
        const card=head.closest('.pf-contract');
        const detail=card.querySelector('.pf-contract__detail');
        const toggle=card.querySelector('.pf-contract__toggle');
        const open=detail.style.display!=='none';
        detail.style.display=open?'none':'block';
        toggle.classList.toggle('is-open',!open);
      });
    });
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
