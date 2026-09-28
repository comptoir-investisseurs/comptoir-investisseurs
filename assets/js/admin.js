/* CRM Admin Dashboard v2 — LFDR (Pipedrive-inspired) */
(function(){
  'use strict';

  const API = SUPABASE_URL + '/rest/v1';
  const headers = (extra) => Object.assign({
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + (sessionStorage.getItem('sb_access_token') || SUPABASE_ANON_KEY),
    'Content-Type': 'application/json'
  }, extra || {});

  // Pipeline commercial, réservé aux prospects : R0 (bilan patrimonial réalisé) → R1 (objectifs et
  // difficultés) → R2 (solutions proposées) → R3 (décision finale). Gagné bascule la fiche en client
  // (avec une petite animation) et sort du pipeline ; Perdu sort aussi du pipeline. Un prospect créé
  // manuellement (lead, pas encore de bilan) n'a pas d'étape : il vit dans l'onglet « À rappeler »
  // jusqu'à ce qu'on le fasse entrer au pipeline (R0).
  const STAGES = ['R0', 'R1', 'R2', 'R3'];
  const STAGE_META = {
    R0: 'Bilan patrimonial réalisé', R1: 'Objectifs & difficultés', R2: 'Solutions proposées', R3: 'Décision finale'
  };
  const LEGACY_STAGES = {
    'Nouveau':'R0', 'Contacté':'R0', 'RDV planifié':'R0',
    'R1 : Bilan':'R1', 'R2 : Objectifs':'R2',
    'R3 : Offre':'R3', 'Proposition':'R3', 'Prospect chaud':'R3'
  };
  function stageOf(c){ const s = c.stage; if(!s) return null; return LEGACY_STAGES[s] || s; }
  function isLead(c){ return (c.type||'client')==='prospect' && !stageOf(c); }
  const PROVENANCE_OPTIONS = ['Rappel', 'Recommandation', 'Réseau personnel', 'Lead site', 'Bilan patrimonial', 'Autre'];

  // Sections communes aux deux types de personne
  const SEC_PATRIMOINE = {title:'Patrimoine', fields:[
    ['patrimoine_financier','Patrimoine financier','text'],
    ['patrimoine_immobilier','Patrimoine immobilier','text'],
    ['placements_existants','Placements existants','array'],
    ['credits','Crédits (restant dû)','text'],['montant_investir','Montant à investir','text'],
    ['origine_fonds','Origine des fonds','text'],
  ]};
  const SEC_OBJECTIFS = {title:'Objectifs', fields:[
    ['objectifs','Objectifs','array'],['horizon','Horizon','text'],
    ['besoin_liquidite','Besoin de liquidité','text'],
    ['projets_specifiques','Projets spécifiques','textarea'],
  ]};
  const SEC_RISQUE = {title:'Profil de risque', fields:[
    ['niveau_connaissance','Niveau de connaissance','text'],
    ['experience_produits','Produits connus','array'],
    ['couple_rendement_risque','Profil rendement/risque','text'],
    ['part_illiquide','Part illiquide','text'],['esg','ESG','text'],
    ['reaction_baisse','Réaction en baisse','text'],['perte_max','Perte max acceptée','text'],
  ]};
  const SEC_SUIVI = {title:'Pôle, suivi & notes', fields:[
    ['type','Type','select',['prospect','client']],
    ['next_action','Prochaine action','text'],
    ['next_action_date','Échéance','date'],
    ['comment_connu','Provenance','source',PROVENANCE_OPTIONS],
    ['notes_internes','Notes internes','textarea'],
    ['commentaires','Commentaires','textarea'],
  ]};

  // Personne physique
  const SECTIONS_PHYS = [
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
      ['revenus','Revenus (par an)','text'],['capacite_epargne','Capacité d\'épargne (par mois)','text'],
    ]},
    SEC_PATRIMOINE, SEC_OBJECTIFS, SEC_RISQUE, SEC_SUIVI,
  ];
  // Personne morale
  const SECTIONS_MORALE = [
    {title:'Identité société', fields:[
      ['raison_sociale','Raison sociale','text'],
      ['forme_juridique','Forme juridique','select',['','SAS','SASU','SARL','EURL','SA','SCI','SC','Holding (SAS)','Holding (SARL)','SNC','Autre']],
      ['siren','SIREN / SIRET','text'],['capital_social','Capital social','text'],
      ['date_creation','Date de création','date'],['activite','Activité / Code NAF','text'],
      ['siege_social','Siège social','text'],
      ['email','Email','email'],['telephone','Téléphone','tel'],
    ]},
    {title:'Dirigeant & bénéficiaires effectifs', fields:[
      ['dirigeant','Dirigeant / Représentant légal','text'],
      ['beneficiaires_effectifs','Bénéficiaires effectifs','textarea'],
    ]},
    SEC_PATRIMOINE, SEC_OBJECTIFS, SEC_RISQUE, SEC_SUIVI,
  ];
  function sectionsFor(personne){ return personne==='morale' ? SECTIONS_MORALE : SECTIONS_PHYS; }
  const ALL_SECTIONS = SECTIONS_PHYS.concat(SECTIONS_MORALE);
  const EDITABLE_KEYS = Array.from(new Set(ALL_SECTIONS.flatMap(s => s.fields.map(f => f[0]))));
  const ARRAY_KEYS = Array.from(new Set(ALL_SECTIONS.flatMap(s => s.fields.filter(f => f[2]==='array').map(f => f[0]))));

  // ---------- PORTFOLIO (demo data) ----------
  const ALLOC_COLORS = {
    'Actions':'#1565c0','ETF':'#2e7d32','OPCVM':'#6a1b9a','Obligations':'#e65100',
    'Produit structuré':'#A9853F','Immobilier':'#00838f','Fonds euro':'#558b2f',
    'Private Equity':'#5d4037','Liquidités':'#9e9e9e','Autre':'#7a8a99'
  };
  // ---------- PORTFOLIO : données réelles (voir clientPortfolio) ----------

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
  let poles = [];
  let enveloppes = [];
  let supports = [];
  let spPositions = [];
  const spProducts = new Map(); // isin -> {lib, fam}

  function loadAll(){
    Promise.all([
      fetch(API + '/clients?select=*&order=created_at.desc', {headers: headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/activities?select=*&order=date_activite.desc', {headers: headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/poles?select=*', {headers: headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/enveloppes?select=*', {headers: headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/supports?select=*', {headers: headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/sp_positions?select=*', {headers: headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/sp_products?select=isin,lib,fam', {headers: headers()}).then(r => r.ok ? r.json() : [])
    ]).then(([c, a, p, e, s, sp, pr]) => {
      contacts = c || []; activities = a || []; poles = p || [];
      enveloppes = e || []; supports = s || []; spPositions = sp || [];
      (pr || []).forEach(x => spProducts.set(x.isin, {lib:x.lib, fam:x.fam}));
      updateStats(); renderActiveTab();
    }).catch(err => console.error(err));
  }

  // Portefeuille réel d'un client : enveloppes (AV, PER, CTO…) + leurs supports.
  // Les produits structurés sont une CLASSE de support, logée dans ces enveloppes.
  function clientPortfolio(id){
    const envs = enveloppes.filter(e => String(e.client_id) === String(id));
    return envs.map(e => {
      const lines = supports.filter(s => String(s.enveloppe_id) === String(e.id)).map(s => ({
        name:s.libelle||'—', isin:s.isin||'—', type:s.classe||'Autre', invested:+s.montant_investi||0, value:+s.valorisation||0
      }));
      const value = lines.length ? lines.reduce((a,l)=>a+l.value,0) : (e.valorisation!=null?+e.valorisation:(+e.montant_investi||0));
      const invested = (lines.length && lines.some(l=>l.invested)) ? lines.reduce((a,l)=>a+l.invested,0) : (e.montant_investi!=null?+e.montant_investi:value);
      return {name:e.type||'Enveloppe', provider:(e.etablissement||'')+(e.numero?' · '+e.numero:''), openDate:e.date_souscription, invested, value, lines};
    });
  }

  // Résout un pôle par son nom (crée la fiche pôle si nécessaire), renvoie l'id (ou null).
  function resolvePole(name){
    name = (name||'').trim();
    if(!name) return Promise.resolve(null);
    const existing = poles.find(p => (p.nom||'').trim().toLowerCase() === name.toLowerCase());
    if(existing) return Promise.resolve(existing.id);
    return fetch(API + '/poles', {method:'POST', headers: headers({'Prefer':'return=representation'}), body: JSON.stringify({nom:name})})
      .then(r => r.ok ? r.json() : Promise.reject(r.status)).then(rows => { const p=(rows&&rows[0]); if(p){ poles.push(p); return p.id; } return null; })
      .catch(() => null);
  }
  function poleName(id){ const p = poles.find(x => String(x.id)===String(id)); return p ? (p.nom||'') : ''; }

  // ---------- HELPERS ----------
  function esc(s){ const d = document.createElement('div'); d.textContent = (s===null||s===undefined)?'':s; return d.innerHTML; }
  function isMorale(c){ return c && c.personne==='morale'; }
  function fullName(c){ if(isMorale(c)) return (c.raison_sociale||c.nom||'(société)').trim(); return ((c.prenom||'') + ' ' + (c.nom||'')).trim() || '(sans nom)'; }
  function fmtDate(d){ return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
  function fmtDateTime(d){ return d ? new Date(d).toLocaleString('fr-FR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'; }
  function fmtMoney(n){ return (n||0).toLocaleString('fr-FR',{maximumFractionDigits:0})+' €'; }
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function numFromStr(s){ if(s==null || s==='') return -Infinity; if(typeof s==='number') return s; const m = String(s).replace(/[^\d]/g,''); return m ? parseInt(m,10) : -Infinity; }
  function moneyDisplay(v){ const n = numFromStr(v); return n > -Infinity ? fmtMoney(n) : null; }

  // Statut de la pastille d'activité d'un prospect : gris = rien de programmé, vert = un
  // prochain contact est prévu, rouge = en retard OU aucun contact fait depuis 2 semaines
  // (l'emporte sur le reste, même si quelque chose est programmé plus tard).
  const DAY_MS = 86400000;
  function activityStatus(c){
    const acts = activities.filter(a => a.client_id === c.id);
    const done = acts.filter(a => a.done && a.date_activite);
    const pending = acts.filter(a => !a.done && a.date_activite);
    const now = Date.now();
    const refMs = done.length ? Math.max.apply(null, done.map(a => new Date(a.date_activite).getTime())) : (c.created_at ? new Date(c.created_at).getTime() : now);
    if((now - refMs) / DAY_MS > 14) return 'red';
    if(pending.length){
      const nextMs = Math.min.apply(null, pending.map(a => new Date(a.date_activite).getTime()));
      return nextMs < now ? 'red' : 'green';
    }
    return 'grey';
  }
  const ACTIVITY_STATUS_LABEL = { grey:'Aucune activité programmée', green:'Prochaine activité planifiée', red:'En retard ou sans contact depuis 2 semaines' };

  function updateStats(){
    const clients = contacts.filter(c => (c.type||'client') === 'client');
    const prospects = contacts.filter(c => (c.type||'client') === 'prospect');
    const leads = contacts.filter(isLead);
    document.getElementById('stat-clients').textContent = clients.length;
    document.getElementById('stat-prospects').textContent = prospects.length;
    const pending = activities.filter(a => !a.done);
    const overdue = pending.filter(a => a.date_activite && a.date_activite.slice(0,10) < todayStr());
    document.getElementById('stat-todo').textContent = pending.length;
    document.getElementById('stat-overdue').textContent = overdue.length;
    document.getElementById('tab-count-clients').textContent = clients.length;
    document.getElementById('tab-count-rappeler').textContent = leads.length;
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
    else if(activeTab==='rappeler') renderRappeler();
    else if(activeTab==='activites') renderActivities();
  }

  // ---------- PIPELINE (KANBAN) — réservé aux prospects ----------
  let draggingId = null;
  function renderPipeline(){
    const board = document.getElementById('kanban');
    const prospects = contacts.filter(c => (c.type||'client')==='prospect');
    board.innerHTML = STAGES.map(stage => {
      const cards = prospects.filter(c => stageOf(c) === stage);
      return `<div class="kanban-col" data-stage="${esc(stage)}">
        <div class="kanban-col__head"><span class="kanban-col__title">${esc(stage)}<span class="kanban-col__sub">${esc(STAGE_META[stage]||'')}</span></span><span class="kanban-col__count">${cards.length}</span></div>
        <div class="kanban-col__body">${cards.map(cardHTML).join('') || '<p class="kanban-col__empty">Aucun prospect</p>'}</div>
      </div>`;
    }).join('');

    board.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', e => { draggingId = card.dataset.id; card.classList.add('is-dragging'); });
      card.addEventListener('dragend', () => { card.classList.remove('is-dragging'); draggingId = null; });
      card.addEventListener('click', () => openContact(card.dataset.id));
    });
    board.querySelectorAll('.kanban-card__outcome-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.closest('.kanban-card').dataset.id;
        if(btn.dataset.outcome==='won') markWon(id); else markLost(id);
      });
    });
    board.querySelectorAll('.kanban-card__activity-dot').forEach(dot => {
      dot.addEventListener('click', e => { e.stopPropagation(); openContact(dot.dataset.id, 'activites'); });
    });
    board.querySelectorAll('.kanban-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('is-dragover'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-dragover'));
      col.addEventListener('drop', e => {
        e.preventDefault(); col.classList.remove('is-dragover');
        if(draggingId) updateStage(draggingId, col.dataset.stage);
      });
    });
    const lostCount = contacts.filter(c => (c.type||'client')==='prospect' && stageOf(c)==='Perdu').length;
    const lostCountEl = document.getElementById('tab-count-lost'); if(lostCountEl) lostCountEl.textContent = lostCount;
  }
  function renderLostModal(){
    const list = contacts.filter(c => (c.type||'client')==='prospect' && stageOf(c)==='Perdu');
    const tbody = document.getElementById('list-lost');
    if(!list.length){ tbody.innerHTML = '<tr><td colspan="4" class="dash-empty"><p>Aucun prospect perdu.</p></td></tr>'; return; }
    tbody.innerHTML = list.map(c => `<tr data-id="${c.id}">
      <td><strong>${esc(fullName(c))}</strong></td><td>${esc(c.email||'—')}</td><td>${esc(c.telephone||'—')}</td><td>${esc(c.comment_connu||'—')}</td></tr>`).join('');
    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => { document.getElementById('lost-modal').classList.remove('is-open'); openContact(tr.dataset.id); }));
  }
  const lostModal = document.getElementById('lost-modal');
  document.getElementById('btn-show-lost').addEventListener('click', () => { renderLostModal(); lostModal.classList.add('is-open'); });
  document.getElementById('lost-close').addEventListener('click', () => lostModal.classList.remove('is-open'));
  lostModal.addEventListener('click', e => { if(e.target===lostModal) lostModal.classList.remove('is-open'); });
  function cardHTML(c){
    const action = c.next_action ? `<div class="kanban-card__action"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${esc(c.next_action)}${c.next_action_date ? ' · '+fmtDate(c.next_action_date) : ''}</div>` : '';
    const provenance = c.comment_connu ? `<span class="kanban-card__badge badge-provenance">${esc(c.comment_connu)}</span>` : '';
    const fin = moneyDisplay(c.patrimoine_financier);
    const outcome = stageOf(c)==='R3' ? `<div class="kanban-card__outcomes">
        <button type="button" class="kanban-card__outcome-btn" data-outcome="won" title="Marquer gagné">✓ Gagné</button>
        <button type="button" class="kanban-card__outcome-btn kanban-card__outcome-btn--lose" data-outcome="lost" title="Marquer perdu">✗ Perdu</button>
      </div>` : '';
    const status = activityStatus(c);
    return `<div class="kanban-card" draggable="true" data-id="${c.id}">
      <button type="button" class="kanban-card__activity-dot kanban-card__activity-dot--${status}" data-id="${c.id}" title="${esc(ACTIVITY_STATUS_LABEL[status])} — cliquer pour programmer une activité"></button>
      <div class="kanban-card__name">${esc(fullName(c))}</div>
      <div class="kanban-card__meta">${esc(c.email||'')}${fin ? ' · '+fin : ''}</div>
      ${provenance}${action}${outcome}
    </div>`;
  }
  function updateStage(id, stage){
    const c = contacts.find(x => x.id === id); if(!c) return;
    Object.assign(c, {stage});
    fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify({stage})})
      .catch(err => console.error(err));
    updateStats(); renderPipeline();
  }
  function markWon(id){
    const c = contacts.find(x => x.id === id); if(!c) return;
    const patch = {stage:'Gagné', type:'client'};
    Object.assign(c, patch);
    fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify(patch)})
      .catch(err => console.error(err));
    celebrate(fullName(c));
    modal.classList.remove('is-open');
    updateStats(); renderActiveTab();
  }
  function markLost(id){
    const c = contacts.find(x => x.id === id); if(!c) return;
    Object.assign(c, {stage:'Perdu'});
    fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify({stage:'Perdu'})})
      .catch(err => console.error(err));
    modal.classList.remove('is-open');
    updateStats(); renderActiveTab();
  }
  function addToPipeline(id){
    const c = contacts.find(x => x.id === id); if(!c) return;
    Object.assign(c, {stage:'R0'});
    fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify({stage:'R0'})})
      .catch(err => console.error(err));
    modal.classList.remove('is-open');
    updateStats(); renderActiveTab();
  }
  function backToProspect(id){
    const c = contacts.find(x => x.id === id); if(!c) return;
    if(!confirm('Remettre ' + fullName(c) + ' en prospect (étape R3) ?')) return;
    const patch = {type:'prospect', stage:'R3'};
    Object.assign(c, patch);
    fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify(patch)})
      .catch(err => console.error(err));
    modal.classList.remove('is-open');
    updateStats(); renderActiveTab();
  }

  // ---------- CÉLÉBRATION (nouveau client) ----------
  function celebrate(name){
    const wrap = document.createElement('div');
    wrap.className = 'celebrate-overlay';
    const colors = ['#A9853F', '#001B00', '#E6C989', '#15462A', '#FCF7EC'];
    let pieces = '';
    for(let i=0;i<60;i++){
      const left = Math.random()*100, delay = Math.random()*0.4, dur = 1.6+Math.random()*1.1;
      const size = 6+Math.random()*7, rot = Math.random()*360, color = colors[i%colors.length];
      pieces += `<span class="confetti-piece" style="left:${left}%;width:${size}px;height:${size*0.4}px;background:${color};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)"></span>`;
    }
    wrap.innerHTML = `<div class="confetti-field">${pieces}</div><div class="celebrate-msg"><span class="celebrate-emoji">🎳</span><div class="celebrate-title">Strike !</div><div class="celebrate-sub">${esc(name)} devient client</div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('is-on'));
    setTimeout(() => { wrap.classList.remove('is-on'); setTimeout(() => wrap.remove(), 400); }, 2600);
  }

  // ---------- CLIENTS TABLE ----------
  let clientSort = {key:null, dir:1};
  let lastClientsFilter = '';
  function renderClients(filter){
    if(filter!==undefined) lastClientsFilter = filter;
    const q = (lastClientsFilter||'').toLowerCase();
    let list = contacts.filter(c => (c.type||'client')==='client').filter(c => matchSearch(c,q));
    if(clientSort.key==='nom') list = list.slice().sort((a,b) => fullName(a).localeCompare(fullName(b)) * clientSort.dir);
    else if(clientSort.key==='patrimoine') list = list.slice().sort((a,b) => (numFromStr(a.patrimoine_financier) - numFromStr(b.patrimoine_financier)) * clientSort.dir);
    const tbody = document.getElementById('list-clients');
    if(!list.length){ tbody.innerHTML = '<tr><td colspan="6" class="dash-empty"><p>Aucun client.</p></td></tr>'; return; }
    tbody.innerHTML = list.map(c => `<tr data-id="${c.id}">
      <td><strong>${esc(fullName(c))}</strong>${isMorale(c)?' <span class="kanban-card__badge badge-prospect">Morale</span>':''}</td>
      <td>${esc(c.email||'—')}</td><td>${esc(c.telephone||'—')}</td>
      <td>${esc(moneyDisplay(c.patrimoine_financier)||'—')}</td><td>${esc(c.stage||'—')}</td>
      <td>${esc(c.next_action||'—')}</td></tr>`).join('');
    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => openContact(tr.dataset.id)));
  }
  document.querySelectorAll('#view-clients .dash-th-sort').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      clientSort.dir = (clientSort.key===key) ? -clientSort.dir : -1;
      clientSort.key = key;
      document.querySelectorAll('#view-clients .dash-th-sort').forEach(x => x.classList.remove('is-asc','is-desc'));
      th.classList.add(clientSort.dir>0 ? 'is-asc' : 'is-desc');
      renderClients();
    });
  });
  function renderRappeler(filter){
    const q = (filter||'').toLowerCase();
    const list = contacts.filter(isLead).filter(c => matchSearch(c,q));
    const tbody = document.getElementById('list-rappeler');
    if(!list.length){ tbody.innerHTML = '<tr><td colspan="6" class="dash-empty"><p>Aucun lead à rappeler. Cliquez sur « Ajouter un prospect ».</p></td></tr>'; return; }
    tbody.innerHTML = list.map(c => `<tr data-id="${c.id}">
      <td><strong>${esc(fullName(c))}</strong>${isMorale(c)?' <span class="kanban-card__badge badge-prospect">Morale</span>':''}</td>
      <td>${esc(c.email||'—')}</td><td>${esc(c.telephone||'—')}</td>
      <td>${esc(c.comment_connu||'—')}</td><td>${esc(c.next_action||'—')}</td>
      <td><button type="button" class="btn btn--solid rappeler-to-pipeline" data-id="${c.id}" style="padding:6px 14px;font-size:.76rem">Ajouter au pipeline (R0)</button></td></tr>`).join('');
    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', (e) => { if(e.target.closest('.rappeler-to-pipeline')) return; openContact(tr.dataset.id); }));
    tbody.querySelectorAll('.rappeler-to-pipeline').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = contacts.find(x => x.id === btn.dataset.id); if(!c) return;
      Object.assign(c, {stage:'R0'});
      fetch(API + '/clients?id=eq.' + c.id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify({stage:'R0'})}).catch(err => console.error(err));
      updateStats(); renderActiveTab();
    }));
  }
  function matchSearch(c,q){
    if(!q) return true;
    return (c.nom||'').toLowerCase().includes(q) || (c.prenom||'').toLowerCase().includes(q) ||
           (c.email||'').toLowerCase().includes(q) || (c.telephone||'').includes(q);
  }
  document.getElementById('search-clients').addEventListener('input', function(){ renderClients(this.value); });
  document.getElementById('search-rappeler').addEventListener('input', function(){ renderRappeler(this.value); });

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
    if(type==='source'){
      const isCustom = v && !options.includes(v);
      const sel = `<select id="f_${key}">${options.map(o => `<option value="${esc(o)}" ${(o==='Autre'?isCustom:o===v)?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
      const autre = `<input type="text" id="f_${key}__autre" placeholder="Précisez la provenance" value="${esc(isCustom?v:'')}" style="margin-top:6px${isCustom?'':';display:none'}">`;
      input = sel + autre;
    } else if(type==='select'){
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

  function contactInfoInner(c, id){
    const isProspect = (c.type||'client')==='prospect';
    let stageBar = '';
    if(isProspect && isLead(c)){
      stageBar = `<div class="contact-stage-info">
        <div class="contact-stage-info__txt">Ce prospect n'est pas encore entré dans le pipeline (pas de bilan patrimonial réalisé).</div>
        <button type="button" class="btn btn--solid" id="btn-to-pipeline">Ajouter au pipeline (R0)</button>
      </div>
      <div class="contact-outcome-bar">
        <button type="button" class="btn contact-outcome-btn contact-outcome-btn--lose" id="btn-mark-lost">✗ Perdu</button>
      </div>`;
    } else if(isProspect && stageOf(c)==='Perdu'){
      stageBar = `<div class="contact-stage-info">
        <div class="contact-stage-info__txt">Ce prospect a été marqué comme <strong>perdu</strong>.</div>
      </div>
      <div class="contact-outcome-bar">
        <button type="button" class="btn contact-outcome-btn contact-outcome-btn--win" id="btn-to-pipeline">↺ Remettre dans le pipeline (R0)</button>
      </div>`;
    } else if(isProspect){
      stageBar = `<div class="contact-stage-info">
        <div class="contact-stage-info__txt">Étape actuelle : <strong>${esc(stageOf(c))}</strong> — ${esc(STAGE_META[stageOf(c)]||'')}<br><span class="contact-stage-info__hint">Pour changer d'étape, glissez la carte dans une autre colonne du Pipeline.</span></div>
      </div>
      <div class="contact-outcome-bar">
        <button type="button" class="btn contact-outcome-btn contact-outcome-btn--win" id="btn-mark-won">✓ Gagné (devient client)</button>
        <button type="button" class="btn contact-outcome-btn contact-outcome-btn--lose" id="btn-mark-lost">✗ Perdu</button>
      </div>`;
    } else {
      stageBar = `<div class="contact-outcome-bar">
        <button type="button" class="btn contact-outcome-btn contact-outcome-btn--lose" id="btn-to-prospect">↩ Remettre en prospect</button>
        <a href="cockpit.html?client=${encodeURIComponent(id)}" target="_blank" rel="noopener" class="btn contact-outcome-btn" style="border-color:var(--gold);background:#fdf6e8;color:#96732f;text-decoration:none;text-align:center">Ouvrir le Cockpit client ↗</a>
      </div>`;
    }
    const personneSwitch = `<div class="detail-section"><h4>Type de personne</h4><div class="edit-grid">
      <div class="edit-field"><label>Personne</label><select id="f_personne">
        <option value="physique" ${!isMorale(c)?'selected':''}>Personne physique</option>
        <option value="morale" ${isMorale(c)?'selected':''}>Personne morale</option>
      </select></div></div></div>`;
    const formHTML = sectionsFor(c.personne).map(sec =>
      `<div class="detail-section"><h4>${esc(sec.title)}</h4><div class="edit-grid">${
        sec.fields.map(f => editField(f[0], f[1], f[2], f[3], c[f[0]])).join('')
      }</div></div>`).join('');
    const poleBlock = `<div class="detail-section"><h4>Pôle / regroupement</h4><div class="edit-grid">
      <div class="edit-field"><label>Pôle (nom)</label><input type="text" id="f_pole_nom" list="pole-list" value="${esc(poleName(c.pole_id))}" placeholder="ex : Famille Durand"></div>
      <div class="edit-field"><label>Rôle dans le pôle</label><input type="text" id="f_pole_role" value="${esc(c.pole_role||'')}" placeholder="Dirigeant, Holding, SCI, Conjoint…"></div>
      </div><datalist id="pole-list">${poles.map(p=>`<option value="${esc(p.nom||'')}"></option>`).join('')}</datalist></div>`;
    const saveBar = `<div class="modal-save-bar">
      <button class="btn btn--solid" id="save-contact">Enregistrer les modifications</button>
      <button class="btn" id="delete-contact" style="border-color:#c0392b;color:#c0392b">Supprimer</button>
      <span class="modal-save-status" id="save-status"></span></div>`;
    return personneSwitch + stageBar + formHTML + poleBlock + saveBar;
  }
  function collectForm(){
    const o = {};
    EDITABLE_KEYS.forEach(key => { const el = document.getElementById('f_' + key); if(!el) return;
      let v = el.value;
      if(v==='Autre'){ const autreEl = document.getElementById('f_' + key + '__autre'); if(autreEl) v = autreEl.value.trim(); }
      if(ARRAY_KEYS.includes(key)) v = v.split(',').map(s => s.trim()).filter(Boolean);
      else if(key==='nb_enfants') v = parseInt(v,10) || 0;
      else if(v==='') v = null;
      o[key] = v; });
    return o;
  }
  function bindSourceToggle(root){
    root.querySelectorAll('select[id^="f_"]').forEach(sel => {
      const autre = document.getElementById(sel.id + '__autre'); if(!autre) return;
      sel.addEventListener('change', () => { autre.style.display = sel.value==='Autre' ? '' : 'none'; });
    });
  }
  function bindContactInfo(c, id){
    const pe = document.getElementById('f_personne');
    if(pe) pe.addEventListener('change', () => {
      const cur = collectForm(); Object.assign(c, cur); c.personne = pe.value;
      const pane = document.getElementById('pane-infos'); pane.innerHTML = contactInfoInner(c, id); bindContactInfo(c, id);
    });
    document.getElementById('save-contact').addEventListener('click', () => saveContact(id));
    document.getElementById('delete-contact').addEventListener('click', () => deleteContact(id));
    const wonBtn = document.getElementById('btn-mark-won'), lostBtn = document.getElementById('btn-mark-lost');
    const toPipelineBtn = document.getElementById('btn-to-pipeline'), toProspectBtn = document.getElementById('btn-to-prospect');
    if(wonBtn) wonBtn.addEventListener('click', () => markWon(id));
    if(lostBtn) lostBtn.addEventListener('click', () => markLost(id));
    if(toPipelineBtn) toPipelineBtn.addEventListener('click', () => addToPipeline(id));
    if(toProspectBtn) toProspectBtn.addEventListener('click', () => backToProspect(id));
    bindSourceToggle(modalBody);
  }

  function openContact(id, pane){
    const c = contacts.find(x => x.id === id); if(!c) return;
    currentId = id;
    currentBilanResume = null;
    pane = pane || 'infos';
    document.getElementById('modal-title').textContent = fullName(c);
    modalBody.innerHTML = `
      <div class="modal-tabs">
        <button class="modal-tab${pane==='infos'?' is-active':''}" data-pane="infos">Informations</button>
        <button class="modal-tab${pane==='portefeuille'?' is-active':''}" data-pane="portefeuille">Actifs</button>
        <button class="modal-tab${pane==='activites'?' is-active':''}" data-pane="activites">Activités</button>
        <button class="modal-tab${pane==='bilans'?' is-active':''}" data-pane="bilans">Documentation</button>
      </div>
      <div class="modal-pane${pane==='infos'?' is-active':''}" id="pane-infos">${contactInfoInner(c, id)}</div>
      <div class="modal-pane${pane==='portefeuille'?' is-active':''}" id="pane-portefeuille">${portfolioPaneHTML()}</div>
      <div class="modal-pane${pane==='activites'?' is-active':''}" id="pane-activites">${activitiesPaneHTML(id)}</div>
      <div class="modal-pane${pane==='bilans'?' is-active':''}" id="pane-bilans"><p class="dash-empty">Chargement…</p></div>`;
    loadBilans(id);
    modalBody.querySelectorAll('.modal-tab').forEach(t => t.addEventListener('click', () => {
      modalBody.querySelectorAll('.modal-tab').forEach(x => x.classList.toggle('is-active', x===t));
      modalBody.querySelectorAll('.modal-pane').forEach(p => p.classList.remove('is-active'));
      modalBody.querySelector('#pane-' + t.dataset.pane).classList.add('is-active');
      if(t.dataset.pane==='portefeuille') setTimeout(drawPortfolioCharts,30);
    }));
    bindContactInfo(c, id);
    bindActivityForm(id);
    bindPortfolioEvents();
    if(pane==='portefeuille') setTimeout(drawPortfolioCharts,30);
    modal.classList.add('is-open');
    modalBody.scrollTop = 0;
    if(pane==='activites'){ const t = document.getElementById('act-titre'); if(t) setTimeout(() => t.focus(), 60); }
  }

  function saveContact(id){
    const patch = collectForm();
    const pe = document.getElementById('f_personne'); if(pe) patch.personne = pe.value;
    // Personne morale : garantir les colonnes NOT NULL nom/prenom (recherche + intégrité)
    if(patch.personne==='morale'){ if(patch.raison_sociale) patch.nom = patch.raison_sociale; if(patch.prenom==null) patch.prenom = ''; }

    const status = document.getElementById('save-status');
    status.style.color = 'var(--muted)'; status.textContent = 'Enregistrement…';
    const poleNom = (document.getElementById('f_pole_nom')||{}).value || '';
    const poleRole = ((document.getElementById('f_pole_role')||{}).value || '').trim() || null;
    resolvePole(poleNom).then(pid => {
      patch.pole_id = pid; patch.pole_role = poleRole;
      return fetch(API + '/clients?id=eq.' + id, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify(patch)})
        .then(r => {
          if(!r.ok) throw new Error(r.status);
          Object.assign(contacts.find(x => x.id===id), patch);
          status.style.color = '#2e7d32'; status.textContent = '✓ Enregistré';
          document.getElementById('modal-title').textContent = fullName(contacts.find(x => x.id===id));
          updateStats(); renderActiveTab();
        });
    }).catch(err => { console.error(err); status.style.color = '#c0392b'; status.textContent = 'Erreur'; });
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
  // ---------- BILANS PATRIMONIAUX (table bilans, alimentée par bilan-patrimonial.html) ----------
  let currentBilanResume = null;
  // Présentation R2 générée en mémoire (le temps de la session) : { blob, selection, at, slideCount } par client.
  const r2Generated = {};
  function sendDocumentFlow(c, docLabel, filename, buildBlob){
    if(!confirm('Envoyer « ' + docLabel + ' » à ' + (c.email || 'ce contact') + ' ?\n\nLe fichier va être téléchargé puis un brouillon d\'email va s\'ouvrir : joignez-y le fichier téléchargé (un lien mailto ne peut pas joindre de pièce automatiquement).')) return;
    Promise.resolve(buildBlob()).then(blob => {
      LFDRDocs.downloadBlob(blob, filename);
      const subject = docLabel + ' — La Financière de Rochechouart';
      const body = 'Bonjour ' + (fullName(c) || '') + ',\n\nVeuillez trouver ci-joint : ' + docLabel + '.\n\nBien cordialement,\nLa Financière de Rochechouart';
      setTimeout(() => LFDRDocs.mailtoDraft(c.email, subject, body), 400);
    }).catch(err => { console.error(err); alert('Erreur lors de la génération du document : ' + err.message); });
  }

  /* ---------- DOCUMENTATION : une section par étape ----------
     R0 — la présentation issue du bilan patrimonial, une ligne par bilan enregistré ;
     R1 — la présentation commerciale « objectifs & difficultés », modèle fixe ;
     R2 — la présentation commerciale « solutions proposées », composée à la carte
          (voir r2-composer.js) : un bouton « Configurer » en plus des 4 actions
          habituelles, lesquelles restent grisées tant qu'aucune présentation
          n'a été générée pour ce client (voir r2Generated).
     Aperçu       : consulter le document sans le modifier (PDF)
     Modifier     : récupérer la version éditable, personnalisée (.pptx)
     Télécharger  : la même version personnalisée (.pptx), pas de PDF — aucun
                    convertisseur .pptx→PDF n'existe sans service serveur dédié,
                    et un .pptx propre à chaque client est de toute façon le
                    format à transmettre.
     Drive        : dépose ce même fichier dans <Nom Prénom>/Financier/
                    2. Présentations commerciales/ du client, dans Google Drive. */
  const DOC_ACTS_PRES  = [['apercu', 'Aperçu'], ['modifier', 'Modifier'], ['telecharger', 'Télécharger'], ['pdf', 'PDF']];
  const DOC_ACTS_BILAN = [['apercu', 'Aperçu'], ['modifier', 'Modifier'], ['telecharger', 'Télécharger']];

  function docRowHTML(key, title, sub, pending, actList){
    const off = pending ? ' disabled title="Vérification de la disponibilité…"' : '';
    const acts = (actList || DOC_ACTS_PRES).map(([act, label]) =>
      `<button type="button" class="btn doc-act" data-doc="${key}" data-act="${act}"${off}>${label}</button>`).join('');
    return `<div class="doc-row" data-row="${key}">
      <div class="doc-row__id"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>
      <div class="doc-row__acts">${acts}
        <button type="button" class="btn doc-act" data-doc="${key}" data-act="drive"${off} title="Enregistrer dans le Drive du client">Drive</button>
        <button type="button" class="btn btn--solid doc-act" data-doc="${key}" data-act="envoyer"${off}>Envoyer</button>
      </div>
      <p class="doc-row__status" data-status="${key}"></p>
    </div>`;
  }
  function docSectionHTML(stage, label, inner, head){
    return `<div class="detail-section doc-section">
      <div class="detail-section__head"><h4><span class="doc-stage">${stage}</span>${esc(label)}</h4>${head || ''}</div>
      ${inner}
    </div>`;
  }
  function docStatus(key, msg, isErr){
    const el = document.querySelector('[data-status="' + key + '"]');
    if(!el) return;
    el.textContent = msg || '';
    el.classList.toggle('is-error', !!isErr);
  }
  function docSetDisabled(key, act, reason){
    const btn = document.querySelector('[data-doc="' + key + '"][data-act="' + act + '"]');
    if(!btn) return;
    btn.disabled = !!reason;
    if(reason) btn.title = reason; else btn.removeAttribute('title');
  }
  // Grise ce qui n'est pas disponible : un .pptx pas encore fourni, ou un PDF
  // pas encore exporté — aucun navigateur ne sait convertir un .pptx en PDF.
  // Modifier/Télécharger/Drive/Envoyer livrent tous le .pptx personnalisé (donc
  // ont besoin du modèle) ; Aperçu ouvre le PDF générique pré-exporté.
  function refreshDocAvailability(){
    const p1 = LFDRDocs.presentation('R1');
    Promise.all([LFDRDocs.fileExists(p1.pptx), LFDRDocs.fileExists(p1.pdf)]).then(([hasPptx, hasPdf]) => {
      const noPptx = hasPptx ? null : 'Présentation non fournie : déposez le fichier dans assets/docs/.';
      const noPdf = hasPdf ? null : 'PDF non disponible : exportez-le une fois depuis PowerPoint vers assets/docs/.';
      docStatus('R1', '');
      docSetDisabled('R1', 'modifier', noPptx);
      docSetDisabled('R1', 'telecharger', noPptx);
      docSetDisabled('R1', 'drive', noPptx);
      docSetDisabled('R1', 'envoyer', noPptx);
      docSetDisabled('R1', 'apercu', noPdf);
      if(noPptx) docStatus('R1', 'Présentation à fournir.');
      else if(noPdf) docStatus('R1', 'PDF à exporter une fois depuis PowerPoint.');
    });
    LFDRDocs2.fileExists('assets/docs/lfdr-presentation-r2.pptx').then(has => {
      const btn = document.getElementById('r2-configure');
      if(!btn) return;
      btn.disabled = !has;
      btn.title = has ? '' : 'Modèle source non fourni : déposez assets/docs/lfdr-presentation-r2.pptx.';
      if(!has) docStatus('R2', 'Modèle source à fournir.');
    });
  }

  /* ---------- R0 : le vrai deck (24 pages), pas un lien vers l'outil ----------
     bilan-patrimonial.html sait se charger en mode « embed » : ?vue=synthese&embed=1
     masque tout sauf le deck (mêmes règles CSS que l'impression) et signale par
     postMessage quand le rendu est prêt. Le token de session (sessionStorage) est
     partagé avec l'iframe — même origine, même onglet — donc pas de reconnexion. */
  function withBilanFrame(bid, timeoutMs){
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.src = 'bilan-patrimonial.html?bilan=' + encodeURIComponent(bid) + '&vue=synthese&embed=1';
      frame.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1300px;height:900px;border:0;visibility:hidden';
      let done = false;
      const timer = setTimeout(() => { if(done) return; done = true; cleanup(); frame.remove(); reject(new Error('Délai dépassé.')); }, timeoutMs || 25000);
      function cleanup(){ window.removeEventListener('message', onMsg); clearTimeout(timer); }
      function onMsg(e){
        if(done || e.source !== frame.contentWindow || !e.data || e.data.source !== 'lfdr-bilan') return;
        done = true; cleanup();
        if(e.data.type === 'ready') resolve(frame); else { frame.remove(); reject(new Error(e.data.message || 'Chargement du bilan impossible.')); }
      }
      window.addEventListener('message', onMsg);
      document.body.appendChild(frame);
    });
  }
  // Reconstruit le PDF exactement comme le fait « Enregistrer dans le Drive » (drive.js),
  // via jsPDF + html2canvas déjà chargés par bilan-patrimonial.html — un vrai document,
  // pas une capture d'écran de la fenêtre d'impression.
  function bilanPdfBlob(bid){
    return withBilanFrame(bid).then(frame =>
      frame.contentWindow.LFDRDrive.buildSynthesisPdfBlob().then(
        blob => { frame.remove(); return blob; },
        err => { frame.remove(); throw err; }));
  }
  function openDeckLightbox(bid, title){
    const box = document.createElement('div');
    box.className = 'doc-lightbox';
    box.innerHTML = `<div class="doc-lightbox__box">
      <div class="doc-lightbox__head"><b>${esc(title)}</b><button type="button" class="doc-lightbox__close" aria-label="Fermer">&times;</button></div>
      <div class="doc-lightbox__body">
        <p class="doc-lightbox__loading">Génération de l'aperçu…</p>
        <iframe class="doc-lightbox__frame" src="bilan-patrimonial.html?bilan=${encodeURIComponent(bid)}&vue=synthese&embed=1" title="${esc(title)}" hidden></iframe>
      </div>
    </div>`;
    document.body.appendChild(box);
    const frame = box.querySelector('iframe'), loading = box.querySelector('.doc-lightbox__loading');
    function onMsg(e){
      if(e.source !== frame.contentWindow || !e.data || e.data.source !== 'lfdr-bilan') return;
      if(e.data.type === 'ready'){ loading.remove(); frame.hidden = false; }
      else loading.textContent = 'Erreur : ' + (e.data.message || 'aperçu indisponible.');
    }
    window.addEventListener('message', onMsg);
    function close(){ window.removeEventListener('message', onMsg); document.removeEventListener('keydown', onKey); box.remove(); }
    function onKey(e){ if(e.key === 'Escape') close(); }
    box.querySelector('.doc-lightbox__close').addEventListener('click', close);
    box.addEventListener('click', e => { if(e.target === box) close(); });
    document.addEventListener('keydown', onKey);
  }

  /* ---------- R2 : composition à la carte de la présentation commerciale ----------
     Pas de modèle fixe : le sales coche les produits/SCPI/objectifs à inclure,
     choisit le profil de risque (et l'enveloppe si besoin), renseigne la grille
     tarifaire, puis un vrai .pptx est composé à la volée (r2-composer.js). */
  function parseFrNum(s){ const n = parseFloat(String(s == null ? '' : s).trim().replace(',', '.')); return isFinite(n) ? n : 0; }
  function fmtFrNum(n){ return (Math.round(n * 100) / 100).toString().replace('.', ','); }

  function r2RowHTML(id){
    const g = r2Generated[id];
    const off = g ? '' : ' disabled title="Configurez d’abord la présentation."';
    const acts = DOC_ACTS_BILAN.map(([act, label]) =>
      `<button type="button" class="btn doc-act" data-doc="R2" data-act="${act}"${off}>${label}</button>`).join('');
    return `<div class="doc-row" data-row="R2">
      <div class="doc-row__id"><b>Présentation commerciale</b><span>À la carte : choisissez les diapositives à inclure.</span></div>
      <div class="doc-row__acts">
        <button type="button" class="btn btn--solid" id="r2-configure" disabled title="Vérification de la disponibilité…">Configurer</button>
        ${acts}
        <button type="button" class="btn doc-act" data-doc="R2" data-act="drive"${off} title="Enregistrer dans le Drive du client">Drive</button>
        <button type="button" class="btn btn--solid doc-act" data-doc="R2" data-act="envoyer"${off}>Envoyer</button>
      </div>
      <p class="doc-row__status" data-status="R2"></p>
    </div>`;
  }
  // Réactive/grise les actions R2 (Aperçu/Modifier/Télécharger/Drive/Envoyer)
  // selon qu'une présentation a déjà été générée pour ce client (r2Generated),
  // et met à jour le statut affiché.
  function refreshR2RowState(id){
    const pane = document.getElementById('pane-bilans'); if(!pane) return;
    const row = pane.querySelector('[data-row="R2"]'); if(!row) return;
    const g = r2Generated[id];
    row.querySelectorAll('.doc-act[data-doc="R2"]').forEach(btn => {
      btn.disabled = !g;
      if(g) btn.removeAttribute('title'); else btn.title = 'Configurez d’abord la présentation.';
    });
    if(g) docStatus('R2', 'Généré le ' + fmtDate(g.at) + ' (' + g.slideCount + ' diapositives).');
  }
  // Applique la présentation composée à une action de la ligne R2 (aperçu,
  // modifier, télécharger, envoyer) : aucun convertisseur .pptx→PDF n'existe
  // dans le navigateur, donc Aperçu ouvre aussi le .pptx (le navigateur le
  // proposera au téléchargement, faute de visionneuse intégrée) — Modifier et
  // Télécharger livrent le même fichier, la seule version disponible.
  function r2Actions(c, act){
    const g = r2Generated[c.id];
    if(!g){ docStatus('R2', 'Configurez d’abord la présentation.', true); return; }
    const name = 'Presentation R2 - ' + fullName(c) + '.pptx';
    if(act === 'apercu'){
      const url = URL.createObjectURL(g.blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    if(act === 'modifier' || act === 'telecharger'){ LFDRDocs.downloadBlob(g.blob, name); docStatus('R2', 'Téléchargé.'); return; }
    if(act === 'envoyer') sendDocumentFlow(c, 'Présentation commerciale (R2)', name, () => g.blob);
    if(act === 'drive') driveAction(c, 'R2', () => Promise.resolve({ blob: g.blob, filename: name, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
  }

  // Dépose un fichier déjà généré (buildFile renvoie {blob, filename, mimeType})
  // dans <Nom Prénom>/Financier/2. Présentations commerciales/ du client, sur
  // Google Drive (assets/js/drive.js — même mécanisme que le bilan patrimonial).
  function driveAction(c, key, buildFile){
    if(!window.LFDRDrive || !LFDRDrive.configured()){ docStatus(key, 'Google Drive non configuré.', true); return; }
    const folderName = isMorale(c) ? (c.raison_sociale || c.nom || '') : ((c.nom || '') + (c.prenom ? ' ' + c.prenom : ''));
    docStatus(key, 'Enregistrement dans le Drive…');
    Promise.resolve().then(buildFile)
      .then(({ blob, filename, mimeType }) => LFDRDrive.saveClientFile(folderName, filename, mimeType, blob))
      .then(({ clientFolder }) => {
        docStatus(key, 'Enregistré dans le Drive.');
        if(clientFolder && clientFolder.webViewLink) window.open(clientFolder.webViewLink, '_blank', 'noopener');
      })
      .catch(err => docStatus(key, 'Erreur Drive : ' + err.message, true));
  }

  function r2FormHTML(){
    const chk = (key, label) => `<label class="r2-check"><input type="checkbox" data-r2="${key}"> ${esc(label)}</label>`;
    // Les cases « Produits & enveloppes » portent en plus data-r2-env : c'est
    // sur elles que se cale le champ « Enveloppe choisie » de la grille tarifaire.
    const chkEnv = (key, label) => `<label class="r2-check"><input type="checkbox" data-r2="${key}" data-r2-env="${esc(label)}"> ${esc(label)}</label>`;
    const prodChecks = LFDRDocs2.PRODUCTS.map(p => chkEnv(p.key, p.label)).join('');
    const peCheck = chk(LFDRDocs2.PRIVATE_EQUITY.key, LFDRDocs2.PRIVATE_EQUITY.label);
    const scpiChecks = LFDRDocs2.SCPI_FUNDS.map(f => chk('scpi_' + f.key, f.label)).join('');
    const profileRadios = LFDRDocs2.RISK_PROFILES.map(p =>
      `<label><input type="radio" name="r2-profile" value="${p.key}"> ${esc(p.label)}</label>`).join('');
    const situationRadios = ['<label><input type="radio" name="r2-situation" value="" checked> Aucune</label>']
      .concat(LFDRDocs2.SITUATIONS.map(s => `<label><input type="radio" name="r2-situation" value="${s.key}"> ${esc(s.label)}</label>`))
      .join('');
    const objChecks = LFDRDocs2.OBJECTIVES.map(o => chk('obj_' + o.key, o.label)).join('');
    const repriseCheck = chk('reprise_contrat', 'Reprise de la gestion d’un contrat existant');

    const unit = { pct: '%', eur: '€', text: '' };
    const feeRows = LFDRDocs2.FEE_FIELDS.filter(f => !f.computed).map(f => {
      const disabled = (f.key === 'profil' || f.key === 'enveloppe') ? ' disabled' : '';
      const u = unit[f.type] ? ' (' + unit[f.type] + ')' : '';
      return `<label for="r2-fee-${f.key}">${esc(f.label)}${u}</label>
        <input type="text" id="r2-fee-${f.key}" data-fee="${f.key}" placeholder="${f.optional ? 'Non applicable' : ''}"${disabled}>`;
    }).join('');

    return `<form class="r2-form" id="r2-form">
      <p class="r2-err" id="r2-err"></p>
      <fieldset>
        <legend>Produits &amp; enveloppes<span>Un tronc commun (maison, recommandation) est toujours inclus.</span></legend>
        <div class="r2-grid">${prodChecks}${peCheck}</div>
      </fieldset>
      <fieldset>
        <legend>SCPI<span>Cocher au moins un fonds ajoute la présentation générale des SCPI.</span></legend>
        <div class="r2-grid">${scpiChecks}</div>
      </fieldset>
      <fieldset>
        <legend>Profil de risque *</legend>
        <div class="r2-radio-row" id="r2-profile-row">${profileRadios}</div>
        <div class="r2-envelope" id="r2-envelope" hidden>
          <div class="r2-radio-row">
            <label><input type="radio" name="r2-envelope" value="fr"> Construction — enveloppe française</label>
            <label><input type="radio" name="r2-envelope" value="lux"> Construction — enveloppe luxembourgeoise</label>
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Situation matrimoniale</legend>
        <div class="r2-radio-row">${situationRadios}</div>
      </fieldset>
      <fieldset>
        <legend>Réponse aux objectifs</legend>
        <div class="r2-grid">${objChecks}${repriseCheck}</div>
      </fieldset>
      <fieldset>
        <legend>Conditions tarifaires</legend>
        <div class="r2-fees">${feeRows}</div>
        <div class="r2-total">Total des frais supportés, par an <b id="r2-fee-total">0%</b></div>
      </fieldset>
    </form>`;
  }

  function computeR2Total(form){
    const keys = ['frais_gestion', 'mandat_gestion', 'frais_enveloppe', 'frais_depositaire'];
    let total = 0;
    keys.forEach(k => { const el = form.querySelector('[data-fee="' + k + '"]'); if(el) total += parseFrNum(el.value); });
    const out = form.querySelector('#r2-fee-total');
    if(out) out.textContent = fmtFrNum(total) + '%';
    return total;
  }

  // « Enveloppe choisie » n'est pas saisie à la main : elle reprend les cases
  // cochées dans « Produits & enveloppes » (pas les SCPI, qui ne sont pas des
  // enveloppes et ne sont pas toujours sélectionnées).
  function updateR2EnvelopeFee(form){
    const el = form.querySelector('#r2-fee-enveloppe'); if(!el) return;
    const labels = Array.from(form.querySelectorAll('input[data-r2-env]:checked')).map(i => i.dataset.r2Env);
    el.value = labels.join(' + ');
  }

  function updateR2Envelope(form){
    const checked = form.querySelector('input[name="r2-profile"]:checked');
    const profile = checked && LFDRDocs2.RISK_PROFILES.filter(p => p.key === checked.value)[0];
    const wrap = form.querySelector('#r2-envelope');
    const frRadio = form.querySelector('input[name="r2-envelope"][value="fr"]');
    const luxRadio = form.querySelector('input[name="r2-envelope"][value="lux"]');
    const profilFee = form.querySelector('#r2-fee-profil');
    if(profilFee) profilFee.value = profile ? profile.label : '';
    if(!profile || !profile.construction){
      wrap.hidden = true; frRadio.checked = false; luxRadio.checked = false;
      return;
    }
    wrap.hidden = false;
    frRadio.disabled = !profile.construction.fr;
    luxRadio.disabled = !profile.construction.lux;
    if(frRadio.checked && frRadio.disabled) frRadio.checked = false;
    if(luxRadio.checked && luxRadio.disabled) luxRadio.checked = false;
    if(!frRadio.checked && !luxRadio.checked){
      if(profile.construction.fr && !profile.construction.lux) frRadio.checked = true;
      else if(profile.construction.lux && !profile.construction.fr) luxRadio.checked = true;
    }
  }

  function collectR2Selection(form){
    const sel = {};
    form.querySelectorAll('input[type="checkbox"][data-r2]').forEach(el => { if(el.checked) sel[el.dataset.r2] = true; });
    const profileEl = form.querySelector('input[name="r2-profile"]:checked');
    if(profileEl) sel.profile = profileEl.value;
    const envEl = form.querySelector('input[name="r2-envelope"]:checked');
    if(envEl) sel.envelope = envEl.value;
    const sitEl = form.querySelector('input[name="r2-situation"]:checked');
    if(sitEl && sitEl.value) sel.situation = sitEl.value;
    return sel;
  }

  function collectR2Fees(form){
    const fees = {};
    LFDRDocs2.FEE_FIELDS.forEach(f => {
      if(f.computed) return;
      const el = form.querySelector('[data-fee="' + f.key + '"]');
      fees[f.key] = el ? el.value.trim() : '';
    });
    fees.total = fmtFrNum(computeR2Total(form));
    return fees;
  }

  function openR2Composer(c){
    const box = document.createElement('div');
    box.className = 'doc-lightbox';
    box.innerHTML = `<div class="doc-lightbox__box">
      <div class="doc-lightbox__head"><b>Composer la présentation R2 — ${esc(fullName(c))}</b><button type="button" class="doc-lightbox__close" aria-label="Fermer">&times;</button></div>
      <div class="doc-lightbox__body doc-lightbox__body--form">${r2FormHTML()}</div>
      <div class="r2-actions">
        <span class="r2-status" id="r2-status"></span>
        <button type="button" class="btn" id="r2-cancel">Annuler</button>
        <button type="button" class="btn btn--solid" id="r2-send">Envoyer</button>
        <button type="button" class="btn btn--solid" id="r2-download">Générer &amp; télécharger</button>
      </div>
    </div>`;
    document.body.appendChild(box);

    const form = box.querySelector('#r2-form');
    const statusEl = box.querySelector('#r2-status');
    const errEl = box.querySelector('#r2-err');
    function setStatus(msg, isErr){ statusEl.textContent = msg || ''; statusEl.classList.toggle('is-error', !!isErr); }

    form.querySelectorAll('input[name="r2-profile"]').forEach(el => el.addEventListener('change', () => { updateR2Envelope(form); computeR2Total(form); }));
    form.querySelectorAll('input[name="r2-envelope"]').forEach(el => el.addEventListener('change', () => computeR2Total(form)));
    form.querySelectorAll('[data-fee]').forEach(el => el.addEventListener('input', () => computeR2Total(form)));
    form.querySelectorAll('input[data-r2-env]').forEach(el => el.addEventListener('change', () => updateR2EnvelopeFee(form)));
    updateR2Envelope(form);
    updateR2EnvelopeFee(form);
    computeR2Total(form);

    function buildBlob(){
      const sel = collectR2Selection(form);
      const errs = LFDRDocs2.validateSelection(sel);
      if(errs.length){ errEl.textContent = errs.join(' '); throw new Error('Sélection incomplète.'); }
      errEl.textContent = '';
      const fees = collectR2Fees(form);
      return LFDRDocs2.buildR2PresentationBlob(sel, fullName(c), fmtDate(new Date()), fees);
    }
    // Génère puis garde le résultat en mémoire (r2Generated) : c'est ce qui
    // débloque Aperçu/Modifier/Télécharger/Envoyer sur la ligne R2 du dossier.
    function buildAndCache(){
      return Promise.resolve().then(buildBlob).then(blob => {
        const sel = collectR2Selection(form);
        r2Generated[c.id] = { blob, selection: sel, at: new Date(), slideCount: LFDRDocs2.computeFinalOrder(sel).length };
        refreshR2RowState(c.id);
        return blob;
      });
    }

    box.querySelector('#r2-download').addEventListener('click', () => {
      setStatus('Génération…');
      buildAndCache().then(blob => {
        LFDRDocs.downloadBlob(blob, 'Presentation R2 - ' + fullName(c) + '.pptx');
        setStatus('Généré et téléchargé.');
      }).catch(err => setStatus('Erreur : ' + err.message, true));
    });
    box.querySelector('#r2-send').addEventListener('click', () => {
      const sel = collectR2Selection(form);
      const errs = LFDRDocs2.validateSelection(sel);
      if(errs.length){ errEl.textContent = errs.join(' '); return; }
      errEl.textContent = '';
      sendDocumentFlow(c, 'Présentation commerciale (R2)', 'Presentation R2 - ' + fullName(c) + '.pptx', buildAndCache);
    });

    function close(){ document.removeEventListener('keydown', onKey); box.remove(); }
    function onKey(e){ if(e.key === 'Escape') close(); }
    box.querySelector('.doc-lightbox__close').addEventListener('click', close);
    box.querySelector('#r2-cancel').addEventListener('click', close);
    box.addEventListener('click', e => { if(e.target === box) close(); });
    document.addEventListener('keydown', onKey);
  }

  function bindDocActions(c){
    const pane = document.getElementById('pane-bilans'); if(!pane) return;
    const dateStr = () => fmtDate(new Date());

    function presentationActions(stage, act){
      const p = LFDRDocs.presentation(stage);
      const personalised = () => LFDRDocs.buildPresentationBlob(stage, fullName(c), dateStr());
      const pptxName = 'Presentation ' + stage + ' - ' + fullName(c) + '.pptx';
      // Pas de conversion PDF (aucun convertisseur .pptx→PDF disponible sans
      // service serveur dédié) : Modifier et Télécharger livrent tous deux le
      // même .pptx personnalisé, seul format disponible — Aperçu reste la
      // version générique pré-exportée, pour un simple coup d'œil au contenu.
      if(act === 'apercu'){ window.open(p.pdf, '_blank', 'noopener'); return; }
      if(act === 'modifier' || act === 'telecharger'){
        docStatus(stage, 'Génération…');
        personalised()
          .then(blob => { LFDRDocs.downloadBlob(blob, pptxName); docStatus(stage, 'Téléchargé.'); })
          .catch(err => docStatus(stage, 'Erreur : ' + err.message, true));
        return;
      }
      if(act === 'envoyer') sendDocumentFlow(c, p.label, pptxName, personalised);
      if(act === 'drive') driveAction(c, stage, () => personalised().then(blob => ({ blob, filename: pptxName, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })));
    }

    function bilanActions(bid, act){
      const key = 'bilan:' + bid;
      if(act === 'apercu'){ openDeckLightbox(bid, 'Bilan patrimonial — ' + fullName(c)); return; }
      if(act === 'modifier'){ window.open('bilan-patrimonial.html?bilan=' + encodeURIComponent(bid), '_blank', 'noopener'); return; }
      if(act === 'telecharger'){
        docStatus(key, 'Génération du PDF (24 pages)…');
        bilanPdfBlob(bid)
          .then(blob => { LFDRDocs.downloadBlob(blob, 'Bilan patrimonial - ' + fullName(c) + '.pdf'); docStatus(key, 'Téléchargé.'); })
          .catch(err => docStatus(key, 'Erreur : ' + err.message, true));
        return;
      }
      if(act === 'envoyer'){
        if(!confirm('Envoyer le bilan patrimonial à ' + (c.email || 'ce contact') + ' ?\n\nLe PDF va être téléchargé puis un brouillon d\'email va s\'ouvrir : joignez-y le fichier téléchargé.')) return;
        docStatus(key, 'Génération du PDF (24 pages)…');
        bilanPdfBlob(bid).then(blob => {
          LFDRDocs.downloadBlob(blob, 'Bilan patrimonial - ' + fullName(c) + '.pdf');
          docStatus(key, 'Téléchargé — joignez le fichier au brouillon.');
          const subject = 'Votre bilan patrimonial — La Financière de Rochechouart';
          const body = 'Bonjour ' + (fullName(c) || '') + ',\n\nVeuillez trouver ci-joint votre bilan patrimonial.\n\nBien cordialement,\nLa Financière de Rochechouart';
          setTimeout(() => LFDRDocs.mailtoDraft(c.email, subject, body), 400);
        }).catch(err => docStatus(key, 'Erreur : ' + err.message, true));
        return;
      }
      if(act === 'drive') driveAction(c, key, () => bilanPdfBlob(bid).then(blob => ({ blob, filename: 'Bilan patrimonial - ' + fullName(c) + '.pdf', mimeType: 'application/pdf' })));
    }

    pane.querySelectorAll('.doc-act').forEach(btn => btn.addEventListener('click', () => {
      const doc = btn.dataset.doc, act = btn.dataset.act;
      if(doc.indexOf('bilan:') === 0) bilanActions(doc.slice(6), act);
      else if(doc === 'R2') r2Actions(c, act);
      else presentationActions(doc, act);
    }));

    const r2Btn = pane.querySelector('#r2-configure');
    if(r2Btn) r2Btn.addEventListener('click', () => { if(!r2Btn.disabled) openR2Composer(c); });
    refreshR2RowState(c.id);
  }

  function loadBilans(id){
    const pane = document.getElementById('pane-bilans'); if(!pane) return;
    const c = contacts.find(x => x.id === id) || {};
    const newBtn = `<a class="btn doc-new" href="bilan-patrimonial.html?client=${encodeURIComponent(id)}">＋ Nouveau bilan</a>`;
    const presRow = (stage, actList) => docRowHTML(stage, 'Présentation commerciale', 'Couverture au nom de ' + esc(fullName(c)), true, actList);

    function render(r0Inner){
      pane.innerHTML = docSectionHTML('R0', 'Bilan patrimonial', r0Inner, newBtn)
        + docSectionHTML('R1', STAGE_META.R1, presRow('R1', DOC_ACTS_BILAN))
        + docSectionHTML('R2', STAGE_META.R2, r2RowHTML(id));
      bindDocActions(c);
      refreshDocAvailability();
    }

    fetch(API + '/bilans?client_id=eq.' + id + '&select=id,created_at,updated_at,date_entretien,conseiller,etape,resume&order=created_at.desc', {headers: headers()})
      .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(rows => {
        currentBilanResume = rows.length ? (rows[0].resume || null) : null;
        if(id === currentId){ const pf = document.getElementById('pane-portefeuille'); if(pf){ pf.innerHTML = portfolioPaneHTML(); bindPortfolioEvents(); drawPortfolioCharts(); } }
        render(!rows.length
          ? '<p class="dash-empty">Aucun bilan patrimonial enregistré.</p>'
          : rows.map(b => docRowHTML('bilan:' + b.id,
              'Bilan du ' + fmtDate(b.date_entretien || b.created_at),
              b.conseiller ? esc(b.conseiller) : '', false, DOC_ACTS_BILAN)).join(''));
      })
      .catch(err => { console.error(err); render('<p class="dash-empty">Bilans indisponibles (exécutez supabase-bilans.sql dans Supabase).</p>'); });
  }

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
        if(activeTab==='activites') renderActivities(); else if(activeTab==='pipeline') renderPipeline();
      }).catch(err => console.error(err));
  }
  function toggleActivity(actId, done){
    const a = activities.find(x => x.id === actId); if(a) a.done = done;
    fetch(API + '/activities?id=eq.' + actId, {method:'PATCH', headers: headers({'Prefer':'return=minimal'}), body: JSON.stringify({done})})
      .then(() => { updateStats(); if(activeTab==='activites') renderActivities(); else if(activeTab==='pipeline') renderPipeline(); }).catch(err => console.error(err));
  }
  function deleteActivity(actId){
    activities = activities.filter(x => x.id !== actId);
    fetch(API + '/activities?id=eq.' + actId, {method:'DELETE', headers: headers({'Prefer':'return=minimal'})})
      .then(() => { refreshActivitiesPane(currentId); updateStats(); if(activeTab==='activites') renderActivities(); else if(activeTab==='pipeline') renderPipeline(); })
      .catch(err => console.error(err));
  }
  function refreshActivitiesPane(id){
    const pane = document.getElementById('pane-activites'); if(!pane) return;
    pane.innerHTML = activitiesPaneHTML(id); bindActivityForm(id);
  }

  // ---------- ACTIFS (enveloppes réelles, ou à défaut ce qui a été déclaré au bilan patrimonial) ----------
  function declaredAssetsHTML(){
    const c = contacts.find(x => x.id === currentId) || {};
    const tiles = [];
    if(moneyDisplay(c.patrimoine_financier)) tiles.push(['Financier', moneyDisplay(c.patrimoine_financier)]);
    if(moneyDisplay(c.patrimoine_immobilier)) tiles.push(['Immobilier', moneyDisplay(c.patrimoine_immobilier)]);
    if(currentBilanResume && currentBilanResume.liquidites != null) tiles.push(['Disponible (liquidités)', fmtMoney(currentBilanResume.liquidites)]);
    if(!tiles.length) return '<div class="dash-empty" style="padding:34px"><p>Aucun actif renseigné. Complétez un bilan patrimonial, ou ajoutez ses enveloppes depuis le <strong>Cockpit client</strong> pour les voir apparaître ici.</p></div>';
    return `<div class="pf-declared">
      <p class="pf-declared__note">Répartition déclarée lors du dernier bilan patrimonial (par grande enveloppe, hors évolution de performance).</p>
      <div class="pf-declared-grid">${tiles.map(t => `<div class="pf-declared-tile"><div class="pf-declared-tile__l">${esc(t[0])}</div><div class="pf-declared-tile__v">${esc(t[1])}</div></div>`).join('')}</div>
    </div>`;
  }
  // ---------- PORTFOLIO (données réelles : enveloppes + supports + structurés) ----------
  function portfolioPaneHTML(){
    const contracts = clientPortfolio(currentId);
    if(!contracts.length) return declaredAssetsHTML();
    const totalInvested = contracts.reduce((s,c) => s+c.invested, 0);
    const totalValue = contracts.reduce((s,c) => s+c.value, 0);
    const gain = totalValue - totalInvested;
    const perf = totalInvested ? ((gain/totalInvested)*100).toFixed(1) : '0.0';
    const sign = gain >= 0 ? '+' : '';
    const classMap = {};
    contracts.forEach(c => (c.lines||[]).forEach(l => { classMap[l.type]=(classMap[l.type]||0)+l.value; }));
    const allocEntries = Object.entries(classMap).sort((a,b) => b[1]-a[1]);
    return `
      <div class="pf-toolbar">
        <button class="pf-export-btn" id="pf-export-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Exporter le relevé
        </button>
      </div>
      <div class="pf-header"><div class="pf-total-card">
        <div class="pf-total-label">Valorisation totale du portefeuille</div>
        <div class="pf-total-value">${fmtMoney(totalValue)}</div>
        <div class="pf-total-perf ${gain>=0?'positive':'negative'}">${sign}${fmtMoney(gain)} (${sign}${perf}%)</div>
        <div class="pf-total-invested">Investi : ${fmtMoney(totalInvested)}</div>
      </div></div>
      <div class="pf-alloc-section">
        <h4>Répartition par classe d'actif</h4>
        <div class="pf-alloc-grid">
          <div class="pf-donut-wrap"><canvas id="pf-alloc-donut" width="200" height="200"></canvas></div>
          <div class="pf-alloc-list">${allocEntries.map(([type,val]) => {
            const pct = totalValue ? ((val/totalValue)*100).toFixed(1) : '0.0';
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
        <h4>Détail des enveloppes</h4>
        ${contracts.map(c => contractCardHTML(c)).join('')}
      </div>`;
  }

  function contractCardHTML(c){
    const gain = c.value - c.invested;
    const perf = c.invested ? ((gain/c.invested)*100).toFixed(1) : '0.0';
    const sign = gain >= 0 ? '+' : '';
    const lines = c.lines||[];
    return `<div class="pf-contract">
      <div class="pf-contract__head">
        <div class="pf-contract__info">
          <div class="pf-contract__name">${esc(c.name)}${c.book?' <span class="kanban-card__badge badge-prospect">structurés</span>':''}</div>
          <div class="pf-contract__provider">${esc(c.provider||'')}</div>
        </div>
        <div class="pf-contract__figures">
          <div class="pf-contract__value">${fmtMoney(c.value)}</div>
          <div class="pf-contract__perf ${gain>=0?'positive':'negative'}">${sign}${perf}%</div>
        </div>
        <button class="pf-contract__toggle" aria-label="Détails"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      </div>
      <div class="pf-contract__detail" style="display:none">
        <div class="pf-contract__meta">
          ${c.openDate?`<span>Ouverture : ${fmtDate(c.openDate)}</span>`:''}
          <span>Investi : ${fmtMoney(c.invested)}</span>
          <span class="${gain>=0?'positive':'negative'}">P/L : ${sign}${fmtMoney(gain)}</span>
        </div>
        ${lines.length?`<table class="pf-lines-table"><thead><tr>
          <th>Support</th><th>Classe</th><th>Allocation</th><th>Valorisation</th><th>Perf.</th>
        </tr></thead><tbody>${lines.map(l => { const alloc = c.value?(l.value/c.value*100):0; const lp = l.invested?((l.value-l.invested)/l.invested*100):null; return `<tr>
          <td><div class="pf-line-name">${esc(l.name)}</div><div class="pf-line-isin">${esc(l.isin)}</div></td>
          <td><span class="pf-line-class" style="background:${(ALLOC_COLORS[l.type]||'#999')}20;color:${ALLOC_COLORS[l.type]||'#999'}">${esc(l.type)}</span></td>
          <td>${alloc.toFixed(1)}%</td>
          <td class="pf-line-val">${fmtMoney(l.value)}</td>
          <td class="${lp==null||lp>=0?'positive':'negative'}">${lp==null?'—':(lp>=0?'+':'')+lp.toFixed(1)+'%'}</td>
        </tr>`; }).join('')}</tbody></table>`:'<p style="color:var(--muted);font-size:.85rem">Aucun support détaillé.</p>'}
      </div>
    </div>`;
  }

  function drawPerformanceChart(canvasId, history){
    const canvas = document.getElementById(canvasId); if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(rect.width-32,300), h = 260;
    canvas.width=w*dpr; canvas.height=h*dpr;
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    const pad={top:20,right:16,bottom:36,left:72};
    const plotW=w-pad.left-pad.right, plotH=h-pad.top-pad.bottom;
    const minVal=Math.min(...history)*0.998, maxVal=Math.max(...history)*1.002, range=maxVal-minVal;
    const pts=history.map((v,i)=>({x:pad.left+(plotW*i/(history.length-1)),y:pad.top+plotH-((v-minVal)/range*plotH)}));
    const MONTHS=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    function render(hoverIdx){
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,w,h);
      ctx.strokeStyle='#e8e6df'; ctx.lineWidth=1;
      for(let i=0;i<=4;i++){
        const y=pad.top+(plotH*i/4);
        ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(w-pad.right,y); ctx.stroke();
        ctx.fillStyle='#8a8780'; ctx.font='11px Jost,sans-serif'; ctx.textAlign='right';
        ctx.fillText(fmtMoney(Math.round(maxVal-(range*i/4))), pad.left-8, y+4);
      }
      ctx.fillStyle='#8a8780'; ctx.font='10px Jost,sans-serif'; ctx.textAlign='center';
      const step=Math.max(1,Math.floor(history.length/7));
      for(let i=0;i<history.length;i+=step){
        const x=pad.left+(plotW*i/(history.length-1));
        ctx.fillText(MONTHS[i%12]+' '+(i<12?'25':'26'), x, h-pad.bottom+18);
      }
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

      if(hoverIdx!==undefined&&hoverIdx>=0&&hoverIdx<pts.length){
        const hp=pts[hoverIdx];
        ctx.beginPath(); ctx.setLineDash([4,3]);
        ctx.strokeStyle='rgba(169,133,63,.5)'; ctx.lineWidth=1;
        ctx.moveTo(hp.x,pad.top); ctx.lineTo(hp.x,pad.top+plotH); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(hp.x,hp.y,7,0,Math.PI*2);
        ctx.fillStyle='#A9853F'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke();
        const label=MONTHS[hoverIdx%12]+' '+(hoverIdx<12?'2025':'2026');
        const valTxt=fmtMoney(history[hoverIdx]);
        const txt=valTxt+' · '+label;
        ctx.font='600 12px Jost,sans-serif';
        const tw=ctx.measureText(txt).width+24; const rh=28;
        let tx=hp.x-tw/2;
        if(tx<pad.left) tx=pad.left;
        if(tx+tw>w-pad.right) tx=w-pad.right-tw;
        let ty=hp.y-40; if(ty<4) ty=hp.y+16;
        ctx.fillStyle='#001B00';
        ctx.beginPath();
        const rr=7;
        ctx.moveTo(tx+rr,ty); ctx.lineTo(tx+tw-rr,ty);
        ctx.quadraticCurveTo(tx+tw,ty,tx+tw,ty+rr); ctx.lineTo(tx+tw,ty+rh-rr);
        ctx.quadraticCurveTo(tx+tw,ty+rh,tx+tw-rr,ty+rh); ctx.lineTo(tx+rr,ty+rh);
        ctx.quadraticCurveTo(tx,ty+rh,tx,ty+rh-rr); ctx.lineTo(tx,ty+rr);
        ctx.quadraticCurveTo(tx,ty,tx+rr,ty); ctx.fill();
        ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(txt,tx+tw/2,ty+rh/2);
      }
    }
    render();
    canvas.style.cursor='crosshair';
    canvas.onmousemove=function(e){
      const br=canvas.getBoundingClientRect();
      const mx=(e.clientX-br.left)*(w/br.width);
      let nearest=0,minD=Infinity;
      pts.forEach((p,i)=>{const d=Math.abs(p.x-mx);if(d<minD){minD=d;nearest=i;}});
      render(nearest);
    };
    canvas.onmouseleave=function(){render();};
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
    const contracts=clientPortfolio(currentId);
    const totalValue=contracts.reduce((s,c)=>s+c.value,0);
    const classMap={};
    contracts.forEach(c=>(c.lines||[]).forEach(l=>{classMap[l.type]=(classMap[l.type]||0)+l.value;}));
    if(totalValue>0) drawAllocationDonut('pf-alloc-donut',Object.entries(classMap).sort((a,b)=>b[1]-a[1]),totalValue);
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
    const expBtn=document.getElementById('pf-export-btn');
    if(expBtn) expBtn.addEventListener('click',()=>exportReport());
  }

  function exportReport(){
    const c = contacts.find(x=>x.id===currentId);
    if(!c) return;
    const contracts = clientPortfolio(currentId);
    const totalInvested = contracts.reduce((s,ct)=>s+ct.invested,0);
    const totalValue = contracts.reduce((s,ct)=>s+ct.value,0);
    const gain = totalValue-totalInvested;
    const perf = totalInvested ? ((gain/totalInvested)*100).toFixed(1) : '0.0';
    const sign = gain>=0?'+':'';
    const today = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

    const contractsHTML = contracts.map(ct=>{
      const g = ct.value-ct.invested;
      const p = ct.invested ? ((g/ct.invested)*100).toFixed(1) : '0.0';
      const s = g>=0?'+':'';
      const lines = ct.lines||[];
      return `
        <div class="contract">
          <div class="contract-head">
            <div>
              <h3>${esc(ct.name)}</h3>
              <div class="contract-provider">${esc(ct.provider||'')}</div>
            </div>
            <div class="contract-val">
              <div class="contract-amount">${fmtMoney(ct.value)}</div>
              <div class="${g>=0?'positive':'negative'}">${s}${p}%</div>
            </div>
          </div>
          <div class="contract-meta">
            ${ct.openDate?`<span>Date d'ouverture : ${fmtDate(ct.openDate)}</span>`:''}
            <span>Montant investi : ${fmtMoney(ct.invested)}</span>
            <span class="${g>=0?'positive':'negative'}">Plus/Moins-value : ${s}${fmtMoney(g)}</span>
          </div>
          ${lines.length?`<table>
            <thead><tr><th>Support</th><th>ISIN</th><th>Classe</th><th>Allocation</th><th>Valorisation</th><th>Perf.</th></tr></thead>
            <tbody>${lines.map(l=>{ const alloc=ct.value?(l.value/ct.value*100):0; const lp=l.invested?((l.value-l.invested)/l.invested*100):null; return `<tr>
              <td>${esc(l.name)}</td><td class="mono">${esc(l.isin)}</td><td>${esc(l.type)}</td>
              <td>${alloc.toFixed(1)}%</td><td>${fmtMoney(l.value)}</td>
              <td class="${lp==null||lp>=0?'positive':'negative'}">${lp==null?'—':(lp>=0?'+':'')+lp.toFixed(1)+'%'}</td>
            </tr>`; }).join('')}</tbody>
          </table>`:''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Relevé de situation — ${c.prenom||''} ${c.nom||''} — ${today}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Jost,Helvetica,Arial,sans-serif;color:#1E211C;padding:48px 56px;max-width:900px;margin:0 auto;font-size:13px;line-height:1.6}
.header{text-align:center;border-bottom:2px solid #A9853F;padding-bottom:24px;margin-bottom:32px}
.header h1{font-family:'Cormorant Garamond',Georgia,serif;color:#001B00;font-size:22px;font-weight:500;letter-spacing:.04em}
.header .date{color:#5B6058;font-size:12px;margin-top:6px}
.client-section{margin-bottom:32px;display:flex;gap:40px}
.client-section h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#A9853F;margin-bottom:10px;font-weight:600}
.client-info{flex:1}
.client-info table{font-size:12px;border-collapse:collapse}
.client-info td{padding:3px 20px 3px 0;vertical-align:top}
.client-info td:first-child{color:#5B6058;white-space:nowrap}
.summary{background:#f6f4ee;border-radius:10px;padding:24px 28px;margin-bottom:36px;display:flex;gap:36px;flex-wrap:wrap}
.summary-item .label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#5B6058;margin-bottom:4px}
.summary-item .value{font-size:20px;font-weight:600;color:#001B00}
.summary-item .sub{font-size:12px;margin-top:2px}
.positive{color:#2e7d32}.negative{color:#c0392b}
.contract{margin-bottom:32px;page-break-inside:avoid}
.contract-head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid #A9853F;margin-bottom:10px}
.contract h3{font-size:15px;color:#001B00;font-weight:600;margin:0}
.contract-provider{font-size:11px;color:#5B6058;margin-top:3px}
.contract-val{text-align:right}
.contract-amount{font-size:17px;font-weight:600;color:#001B00}
.contract-meta{display:flex;gap:24px;flex-wrap:wrap;font-size:11px;color:#5B6058;margin-bottom:14px;padding:8px 0}
table{width:100%;border-collapse:collapse;font-size:11.5px}
th{text-align:left;padding:8px 10px;border-bottom:1.5px solid #d5d2c9;font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#5B6058;font-weight:600}
td{padding:8px 10px;border-bottom:1px solid #eae8e1;vertical-align:middle}
.mono{font-family:'SF Mono',Consolas,monospace;font-size:10px;color:#8a8780}
.footer{text-align:center;font-size:10px;color:#999;margin-top:48px;border-top:1px solid #e8e6df;padding-top:20px;line-height:1.7}
.print-btn{position:fixed;top:20px;right:20px;background:#A9853F;color:#fff;border:0;padding:12px 24px;border-radius:8px;font-family:Jost,sans-serif;font-size:13px;font-weight:500;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.15)}
.print-btn:hover{background:#96732f}
@media print{.print-btn{display:none}body{padding:24px}}
</style></head><body>
<button class="print-btn" onclick="window.print()">Imprimer / Enregistrer PDF</button>
<div class="header">
  <h1>La Financière de Rochechouart</h1>
  <div class="date">Relevé de situation au ${today}</div>
</div>
<div class="client-section">
  <div class="client-info">
    <h2>Informations client</h2>
    <table>
      ${c.civilite?'<tr><td>Civilité</td><td>'+c.civilite+'</td></tr>':''}
      <tr><td>Nom</td><td><strong>${c.prenom||''} ${c.nom||''}</strong></td></tr>
      ${c.adresse?'<tr><td>Adresse</td><td>'+c.adresse+(c.code_postal?' '+c.code_postal:'')+(c.ville?' '+c.ville:'')+'</td></tr>':''}
      ${c.email?'<tr><td>Email</td><td>'+c.email+'</td></tr>':''}
      ${c.telephone?'<tr><td>Téléphone</td><td>'+c.telephone+'</td></tr>':''}
      ${c.date_naissance?'<tr><td>Date de naissance</td><td>'+fmtDate(c.date_naissance)+'</td></tr>':''}
    </table>
  </div>
</div>
<div class="summary">
  <div class="summary-item"><div class="label">Valorisation totale</div><div class="value">${fmtMoney(totalValue)}</div></div>
  <div class="summary-item"><div class="label">Montant investi</div><div class="value">${fmtMoney(totalInvested)}</div></div>
  <div class="summary-item"><div class="label">Plus/Moins-value</div><div class="value ${gain>=0?'positive':'negative'}">${sign}${fmtMoney(gain)}</div><div class="sub ${gain>=0?'positive':'negative'}">${sign}${perf}%</div></div>
  <div class="summary-item"><div class="label">Nombre d'enveloppes</div><div class="value">${contracts.length}</div></div>
</div>
${contractsHTML}
<div class="footer">
  <p><strong>La Financière de Rochechouart</strong></p>
  <p>58 rue de Monceau, 75008 Paris</p>
  <p>Document confidentiel — Données à titre indicatif, non contractuelles.</p>
</div>
</body></html>`;

    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
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

  // ---------- ADD PROSPECT / CLIENT ----------
  const prospectModal = document.getElementById('prospect-modal');
  const prospectForm = document.getElementById('prospect-form');
  const prospectStatus = document.getElementById('prospect-status');
  let addMode = 'prospect';
  function openProspect(mode){
    addMode = mode || 'prospect';
    prospectForm.reset(); prospectStatus.textContent=''; togglePersonneFields();
    document.getElementById('pro-source-autre').style.display = 'none';
    document.getElementById('prospect-modal-title').textContent = addMode==='client' ? 'Ajouter un client' : 'Ajouter un prospect';
    document.getElementById('prospect-modal-desc').textContent = addMode==='client'
      ? 'Créez une fiche client manuellement (client existant intégré au CRM, sans passer par le pipeline).'
      : 'Créez une fiche prospect manuellement. Elle apparaît dans l\'onglet « À rappeler » ; vous la ferez entrer au pipeline (R0) une fois son bilan patrimonial réalisé.';
    document.getElementById('prospect-submit').textContent = addMode==='client' ? 'Créer le client' : 'Créer le prospect';
    prospectModal.classList.add('is-open');
  }
  function togglePersonneFields(){
    const morale = document.getElementById('pro-personne').value==='morale';
    document.getElementById('pro-phys-row').style.display = morale?'none':'';
    document.getElementById('pro-morale-row').style.display = morale?'':'none';
  }
  document.getElementById('pro-personne').addEventListener('change', togglePersonneFields);
  document.getElementById('pro-source').addEventListener('change', function(){
    document.getElementById('pro-source-autre').style.display = this.value==='Autre' ? '' : 'none';
  });
  document.getElementById('btn-add-prospect').addEventListener('click', () => openProspect('prospect'));
  document.getElementById('btn-add-prospect-2').addEventListener('click', () => openProspect('prospect'));
  document.getElementById('btn-add-client').addEventListener('click', () => openProspect('client'));
  document.getElementById('prospect-close').addEventListener('click', () => prospectModal.classList.remove('is-open'));
  prospectModal.addEventListener('click', e => { if(e.target===prospectModal) prospectModal.classList.remove('is-open'); });
  prospectForm.addEventListener('submit', function(e){
    e.preventDefault();
    const personne = document.getElementById('pro-personne').value;
    const raison = document.getElementById('pro-raison').value.trim();
    const nom = document.getElementById('pro-nom').value.trim();
    if(personne==='morale' ? !raison : !nom){ prospectStatus.style.color='#c0392b'; prospectStatus.textContent = personne==='morale'?'Raison sociale requise.':'Nom requis.'; return; }
    const sourceSel = document.getElementById('pro-source').value;
    const provenance = sourceSel==='Autre' ? document.getElementById('pro-source-autre').value.trim() : sourceSel;
    const payload = {
      type: addMode, personne,
      nom: personne==='morale' ? raison : nom,
      prenom: personne==='morale' ? '' : (document.getElementById('pro-prenom').value.trim() || null),
      raison_sociale: personne==='morale' ? raison : null,
      email: document.getElementById('pro-email').value.trim() || null,
      telephone: document.getElementById('pro-tel').value.trim() || null,
      comment_connu: provenance || null
    };
    const btn = document.getElementById('prospect-submit');
    btn.disabled=true; prospectStatus.style.color='var(--muted)'; prospectStatus.textContent='Création…';
    fetch(API + '/clients', {method:'POST', headers: headers({'Prefer':'return=representation'}), body: JSON.stringify(payload)})
      .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(rows => {
        if(rows && rows[0]) contacts.unshift(rows[0]);
        prospectStatus.style.color='#2e7d32'; prospectStatus.textContent = addMode==='client' ? '✓ Client créé' : '✓ Prospect créé'; btn.disabled=false;
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
