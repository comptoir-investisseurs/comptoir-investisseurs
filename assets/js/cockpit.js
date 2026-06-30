/* ===========================================================================
   Cockpit client / brief pré-RDV — La Financière de Rochechouart
   Module 360 autonome. Vue patrimoniale consolidée par client :
   toutes les enveloppes (AV, AV Lux, CTO, PER, capi…) et tous leurs supports
   (fonds €, ETF, OPCVM, SCPI, obligations, actions, produits structurés,
   liquidités…), allocation par classe d'actif actuelle vs cible, performance,
   échéances, conformité documentaire datée, et brief pré-RDV auto-généré.
   Données : CRM (clients + activités) + tables enveloppes/supports/documents.
   Les produits structurés sont enrichis (échéances) via l'ISIN (sp-data.js).
   Persistance Supabase optionnelle ; dégradé proprement hors connexion.
   =========================================================================== */
(function(){
  'use strict';

  /* ---------------- Supabase ---------------- */
  const SB = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : '';
  const SB_KEY = (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '';
  const API = SB + '/rest/v1';
  const headers = (extra) => Object.assign({
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + (sessionStorage.getItem('sb_access_token') || SB_KEY),
    'Content-Type': 'application/json'
  }, extra || {});

  /* ---------------- AUTH ---------------- */
  const loginWrap = document.querySelector('.login-wrap');
  const dash = document.querySelector('.dash');
  const loginForm = document.getElementById('login-form');
  const loginError = document.querySelector('.login-error');

  function showDash(){ loginWrap.classList.add('is-hidden'); dash.classList.add('is-visible'); init(); }
  function showLogin(){
    sessionStorage.removeItem('sb_access_token'); sessionStorage.removeItem('sb_user_email');
    loginWrap.classList.remove('is-hidden'); dash.classList.remove('is-visible');
  }
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    loginError.style.display = 'none';
    if(!SB){
      sessionStorage.setItem('sb_access_token','demo'); sessionStorage.setItem('sb_user_email',email||'demo');
      document.getElementById('dash-user-email').textContent = email||'demo'; showDash(); return;
    }
    fetch(SB + '/auth/v1/token?grant_type=password', {
      method:'POST', headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
      body: JSON.stringify({email, password})
    }).then(r => r.json()).then(data => {
      if(data.access_token){
        sessionStorage.setItem('sb_access_token', data.access_token);
        sessionStorage.setItem('sb_user_email', email);
        document.getElementById('dash-user-email').textContent = email;
        showDash();
      } else { loginError.textContent = 'Identifiants incorrects.'; loginError.style.display='block'; }
    }).catch(() => { loginError.textContent='Erreur de connexion.'; loginError.style.display='block'; });
  });
  document.getElementById('btn-logout').addEventListener('click', showLogin);

  /* ---------------- RÉFÉRENTIELS ---------------- */
  const ENV_TYPES = ['Assurance-vie','Assurance-vie luxembourgeoise','Contrat de capitalisation','PER','Compte-titres (CTO)','PEA','PEA-PME','Autre'];
  const ASSET_CLASSES = ['Fonds euro','Actions','ETF','OPCVM','Obligations','Produit structuré','Immobilier','Private Equity','Liquidités','Autre'];
  const CLASS_COLORS = {'Fonds euro':'#558b2f','Actions':'#1565c0','ETF':'#2e7d32','OPCVM':'#6a1b9a','Obligations':'#e65100','Produit structuré':'#A9853F','Immobilier':'#00838f','Private Equity':'#5d4037','Liquidités':'#9e9e9e','Autre':'#7a8a99'};
  const DOC_TYPES = ['Convention de conseil','Document d\'entrée en relation (DER)','Questionnaire / Profil de risque (MIF)','KYC / Pièce d\'identité','Origine des fonds (LCB-FT)','Consentement RGPD','Bulletin de souscription','Rapport de mission (arbitrage)','Avenant','Autre'];
  // Pièces socle attendues au niveau client (alimentent la checklist conformité)
  const REQUIRED_CLIENT_DOCS = ['Convention de conseil','Document d\'entrée en relation (DER)','Questionnaire / Profil de risque (MIF)','KYC / Pièce d\'identité','Origine des fonds (LCB-FT)','Consentement RGPD'];

  /* ---------------- STATE ---------------- */
  const productsMap = new Map();   // isin -> produit structuré (pour enrichir les échéances)
  let crmClients = [];
  let crmActivities = [];
  let enveloppes = [];
  let supports = [];
  let documents = [];
  let localId = 900000;

  function seedState(){ (window.SP_PRODUCTS||[]).forEach(p => { p.uls = p.uls||[]; productsMap.set(p.isin, Object.assign({}, p)); }); }

  function init(){
    seedState();
    Promise.resolve()
      .then(loadSbProducts)
      .then(loadCrm)
      .then(loadPortfolio)
      .then(afterLoad)
      .catch(e => { console.warn(e); afterLoad(); });
  }
  function loadSbProducts(){
    if(!SB) return;
    return fetch(API + '/sp_products?select=isin,lib,emetteur,fam,coupon,freq,ac,bcpn,bcap,strike,maturity,next_obs,uls,deleted', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => { (rows||[]).forEach(r => { if(r.deleted){ productsMap.delete(r.isin); return; }
        productsMap.set(r.isin, Object.assign(productsMap.get(r.isin)||{}, {isin:r.isin, lib:r.lib, emetteur:r.emetteur, fam:r.fam||'Autre', coupon:r.coupon, freq:r.freq, ac:r.ac, bcpn:r.bcpn, bcap:r.bcap, strike:r.strike, maturity:r.maturity, nextObs:r.next_obs, uls:r.uls||[]})); }); })
      .catch(()=>{});
  }
  function loadCrm(){
    if(!SB) return;
    return Promise.all([
      fetch(API + '/clients?select=*&order=nom.asc', {headers:headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/activities?select=*&order=date_activite.desc', {headers:headers()}).then(r => r.ok ? r.json() : [])
    ]).then(([cs, as]) => { crmClients = cs||[]; crmActivities = as||[]; }).catch(()=>{});
  }
  function loadPortfolio(){
    if(!SB) return;
    return Promise.all([
      fetch(API + '/enveloppes?select=*', {headers:headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/supports?select=*', {headers:headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/documents?select=*', {headers:headers()}).then(r => r.ok ? r.json() : [])
    ]).then(([e,s,d]) => { enveloppes = e||[]; supports = s||[]; documents = d||[]; }).catch(()=>{});
  }
  function afterLoad(){
    // repli démo (preview / hors base) : injecté via window.CK_DEMO
    if(window.CK_DEMO){ if(!crmClients.length) crmClients = window.CK_DEMO.clients||[]; if(!crmActivities.length) crmActivities = window.CK_DEMO.activities||[];
      if(!enveloppes.length) enveloppes = window.CK_DEMO.enveloppes||[]; if(!supports.length) supports = window.CK_DEMO.supports||[]; if(!documents.length) documents = window.CK_DEMO.documents||[]; }
    buildClientSelect(); renderStats(); renderCockpit();
  }

  /* ---------------- HELPERS ---------------- */
  function esc(s){ const d=document.createElement('div'); d.textContent=(s==null)?'':s; return d.innerHTML; }
  function pd(s){ if(!s) return null; if(s instanceof Date) return s; const m=String(s).slice(0,10).split('-'); return m.length===3?new Date(+m[0],+m[1]-1,+m[2]):null; }
  function fmtShort(d){ d=pd(d); return d?`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`:'—'; }
  function pct(v,nd){ if(v==null) return '—'; let s=(v*100).toFixed(nd==null?2:nd); if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,''); return s+'%'; }
  function perfPct(v){ if(v==null) return '—'; const s=v*100; return (s>=0?'+':'')+s.toFixed(1).replace('.',',')+' %'; }
  function fmtEur(n){ if(n==null) return '—'; return Math.round(n).toLocaleString('fr-FR')+' €'; }
  function compact(n){ if(n==null) return '—'; const a=Math.abs(n);
    if(a>=1e6) return (n/1e6).toFixed(2).replace(/0$/,'').replace('.',',')+' M€';
    if(a>=1e3) return Math.round(n/1e3)+' k€'; return Math.round(n)+' €'; }
  function today(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function addMonths(d,m){ return new Date(d.getFullYear(),d.getMonth()+m,d.getDate()); }
  function addDays(d,n){ const x=pd(d); return new Date(x.getFullYear(),x.getMonth(),x.getDate()+n); }
  function todayStrSp(){ const d=today(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function toast(msg, err){ const t=document.getElementById('ck-toast'); if(!t) return; t.textContent=msg; t.className='sp-toast show'+(err?' err':''); setTimeout(()=>t.className='sp-toast',2800); }
  function normName(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
  function clientName(c){ return ((c.prenom||'')+' '+(c.nom||'')).trim()||'(sans nom)'; }
  function ovBar(v,max,col){ return `<div class="ov-bar"><div class="ov-bar__fill" style="width:${Math.max(2,v/(max||1)*100).toFixed(0)}%;background:${col||'var(--gold)'}"></div></div>`; }

  const FREQ_M = {'Trimestrielle':3,'Mensuelle':1,'Semestrielle':6,'Annuelle':12,'Bimestrielle':2,'Journalière':null,'Bullet':null};
  function freqMonths(f){ return (f in FREQ_M)?FREQ_M[f]:3; }
  function productStatus(p){ if(!p) return 'LIVE'; if(p.statut) return p.statut; if(p.maturity) return pd(p.maturity)>=today()?'LIVE':'DONE'; return 'LIVE'; }
  function observationDates(p){
    const sd=pd(p.strike), mat=pd(p.maturity); const m=freqMonths(p.freq);
    if(!sd||!mat||!m) return mat?[mat]:[];
    const out=[]; let d=addMonths(sd,m), guard=0;
    while(d<=addDays(mat,4) && guard<400){ out.push(new Date(d)); d=addMonths(d,m); guard++; }
    if(!out.length) out.push(new Date(mat)); return out;
  }
  function nextObsDate(p){ const tod=today(); const o=observationDates(p).find(d=>d>tod); return o||pd(p.nextObs); }

  /* ---------------- DONNÉES PAR CLIENT ---------------- */
  function clientEnvs(id){ return enveloppes.filter(e=>String(e.client_id)===String(id)); }
  function envSupports(eid){ return supports.filter(s=>String(s.enveloppe_id)===String(eid)); }
  function clientDocs(id){ return documents.filter(d=>String(d.client_id)===String(id)); }
  function envValo(e){ const sup=envSupports(e.id); if(sup.length) return sup.reduce((s,x)=>s+(+x.valorisation||0),0); return e.valorisation!=null?+e.valorisation:(e.montant_investi!=null?+e.montant_investi:0); }
  function envInvesti(e){ const sup=envSupports(e.id); if(sup.length && sup.some(x=>x.montant_investi!=null)) return sup.reduce((s,x)=>s+(+x.montant_investi||0),0); return e.montant_investi!=null?+e.montant_investi:envValo(e); }

  function ckActsOf(id){ return crmActivities.filter(a=>String(a.client_id)===String(id)); }
  function lastContact(id){ const a=ckActsOf(id).map(x=>x.date_activite).filter(Boolean).sort(); return a.length?a[a.length-1]:null; }
  function lastRdv(id){ const a=ckActsOf(id).filter(x=>x.type==='rdv').map(x=>x.date_activite).filter(Boolean).sort(); return a.length?a[a.length-1]:null; }
  function nextRdv(id){ const t=todayStrSp(); const a=ckActsOf(id).filter(x=>x.type==='rdv'&&!x.done&&x.date_activite&&x.date_activite.slice(0,10)>=t).map(x=>x.date_activite).sort(); return a.length?a[0]:null; }

  function docStatus(d){ if(!d.date_signature) return 'pending'; if(d.date_echeance && pd(d.date_echeance)<today()) return 'expired'; return 'signed'; }

  /* ---------------- CONFORMITÉ ---------------- */
  function complianceItems(client, envs, docs){
    const out=[]; const add=(sev,label,detail)=>out.push({sev,label,detail:detail||''});
    if(!client){ add('warn','Fiche CRM non reliée',''); return out; }
    // Pièces socle attendues (checklist présent / manquant / expiré)
    REQUIRED_CLIENT_DOCS.forEach(type=>{
      const ds=docs.filter(d=>d.type===type).sort((a,b)=>String(b.date_signature||'').localeCompare(String(a.date_signature||'')));
      const signed=ds.find(d=>docStatus(d)==='signed');
      if(signed) return;
      const expired=ds.find(d=>docStatus(d)==='expired');
      // repli sur les champs CRM pour RGPD / origine des fonds si pas de document
      if(type==='Consentement RGPD' && client.consentement_rgpd===true) return;
      if(type==='Origine des fonds (LCB-FT)' && client.origine_fonds) return;
      if(type==='Questionnaire / Profil de risque (MIF)' && client.couple_rendement_risque && client.niveau_connaissance) return;
      if(expired) add('warn', type+' expiré', 'Signé le '+fmtShort(expired.date_signature)+', échéance '+fmtShort(expired.date_echeance)+' — à renouveler.');
      else if(ds.length) add('todo', type+' à signer', 'Document créé, signature non enregistrée.');
      else add('todo', type+' manquant', 'Pièce socle attendue.');
    });
    // Bulletin de souscription attendu par enveloppe
    envs.forEach(e=>{
      const has=docs.some(d=>d.type==='Bulletin de souscription' && String(d.enveloppe_id)===String(e.id) && docStatus(d)!=='pending');
      if(!has) add('todo','Bulletin de souscription manquant', (e.libelle||e.type||'Contrat'));
    });
    // Documents arrivant à échéance / expirés (tous types)
    docs.forEach(d=>{ const st=docStatus(d); if(st==='expired' && REQUIRED_CLIENT_DOCS.indexOf(d.type)<0) add('warn', (d.type||'Document')+' expiré', (d.libelle||'')+' — échéance '+fmtShort(d.date_echeance)); });
    // Actions / tâches CRM en retard
    if(client.next_action && client.next_action_date && client.next_action_date.slice(0,10)<todayStrSp()) add('todo','Action en retard : '+client.next_action, 'Échéance '+fmtShort(client.next_action_date));
    const od=ckActsOf(client.id).filter(a=>!a.done && a.date_activite && a.date_activite.slice(0,10)<todayStrSp());
    if(od.length) add('todo', od.length+' tâche(s) en retard', od.slice(0,3).map(a=>a.titre||a.type).join(', '));
    // Revue annuelle
    const lr=lastRdv(client.id);
    if(!lr) add('warn','Aucun RDV enregistré','Planifier une première revue.');
    else { const months=(today()-new Date(lr))/(30.44*864e5); if(months>=12) add('warn','Revue annuelle à planifier','Dernier RDV il y a '+Math.round(months)+' mois.'); }
    if(!out.length) add('ok','Dossier conforme','Aucun point bloquant identifié.');
    return out;
  }
  // Registre documentaire (toutes pièces datées), trié.
  function docRegister(docs){
    return docs.slice().sort((a,b)=>{
      const sa=a.date_signature||a.created_at||'', sb=b.date_signature||b.created_at||''; return String(sb).localeCompare(String(sa));
    });
  }

  /* ---------------- AGRÉGATION 360 ---------------- */
  function buildCockpitData(client){
    const envs=clientEnvs(client.id);
    const docs=clientDocs(client.id);
    const valoTotal=envs.reduce((s,e)=>s+envValo(e),0);
    const investiTotal=envs.reduce((s,e)=>s+envInvesti(e),0);
    const plusValue=valoTotal-investiTotal;
    const perf=investiTotal?plusValue/investiTotal:null;
    // YTD (sur les enveloppes disposant d'une valo début d'année)
    let ytdRef=0, ytdHas=false;
    envs.forEach(e=>{ if(e.valo_debut_annee!=null){ ytdRef+=+e.valo_debut_annee; ytdHas=true; } });
    const ytd = ytdHas && ytdRef ? (valoTotal-ytdRef)/ytdRef : null;
    // allocation par classe d'actif (global)
    const classMap=new Map();
    envs.forEach(e=>{ const sup=envSupports(e.id);
      if(sup.length){ sup.forEach(s=>{ const c=s.classe||'Autre'; classMap.set(c,(classMap.get(c)||0)+(+s.valorisation||0)); }); }
      else { classMap.set('Autre',(classMap.get('Autre')||0)+envValo(e)); }
    });
    const classes=Array.from(classMap.entries()).sort((a,b)=>b[1]-a[1]);
    // enveloppes enrichies (valo, perf, classes)
    const envRows=envs.map(e=>{ const sup=envSupports(e.id); const v=envValo(e), inv=envInvesti(e);
      return {e, sup, valo:v, investi:inv, perf:inv?(v-inv)/inv:null}; }).sort((a,b)=>b.valo-a.valo);
    // prochaines échéances : structurés (via ISIN) + documents
    const tod=today(); const upcoming=[];
    envs.forEach(e=>{ envSupports(e.id).forEach(s=>{ if(s.classe==='Produit structuré' && s.isin && productsMap.has(s.isin)){
      const p=productsMap.get(s.isin); if(productStatus(p)!=='LIVE') return; const d=nextObsDate(p); if(!d||d<tod) return;
      upcoming.push({date:d, kind:'Observation structuré', label:p.lib||s.libelle||s.isin, env:e.libelle||e.type,
        detail:[p.ac!=null?'autocall '+pct(p.ac,0):'', p.bcpn!=null?'cpn '+pct(p.bcpn,0):''].filter(Boolean).join(' · ')}); } }); });
    docs.forEach(d=>{ if(d.date_echeance){ const de=pd(d.date_echeance); if(de>=tod) upcoming.push({date:de, kind:'Échéance documentaire', label:(d.type||'Document')+(d.libelle?' — '+d.libelle:''), env:'', detail:'renouvellement'}); } });
    upcoming.sort((a,b)=>a.date-b.date);
    const compliance=complianceItems(client, envs, docs);
    return {client, envs, envRows, docs, valoTotal, investiTotal, plusValue, perf, ytd, classes, upcoming:upcoming.slice(0,8), compliance, register:docRegister(docs)};
  }

  /* ===================================================================
     SÉLECTION CLIENT + RENDU
     =================================================================== */
  const ckSel = document.getElementById('ck-client');
  if(ckSel) ckSel.addEventListener('change', renderCockpit);
  const ckBriefBtn = document.getElementById('ck-brief-btn');
  if(ckBriefBtn) ckBriefBtn.addEventListener('click', ()=>{ if(currentCockpit) openBrief(currentCockpit); else toast('Sélectionnez un client.', true); });
  let currentCockpit = null;

  function clientsWithData(){
    // Tous les clients CRM, triés ; ceux avec portefeuille d'abord.
    return crmClients.slice().sort((a,b)=>{
      const na=clientEnvs(a.id).length>0?0:1, nb=clientEnvs(b.id).length>0?0:1;
      if(na!==nb) return na-nb; return clientName(a).localeCompare(clientName(b));
    });
  }
  function buildClientSelect(){
    if(!ckSel) return; const prev=ckSel.value; const list=clientsWithData();
    ckSel.innerHTML='<option value="">— Sélectionner un client —</option>'+list.map(c=>{ const n=clientEnvs(c.id).length; return `<option value="${esc(c.id)}">${esc(clientName(c))}${n?' ('+n+' enveloppe'+(n>1?'s':'')+')':''}</option>`; }).join('');
    if(prev) ckSel.value=prev;
  }

  function renderCockpit(){
    const host=document.getElementById('ck-body'); if(!host) return;
    const id = ckSel ? ckSel.value : '';
    if(!id){ currentCockpit=null; host.innerHTML='<div class="sp-rep-empty"><p>Sélectionnez un client pour afficher son cockpit patrimonial 360° et générer le brief pré-RDV.</p></div>'; return; }
    const client = crmClients.find(c=>String(c.id)===String(id)); if(!client){ host.innerHTML='<div class="sp-rep-empty"><p>Client introuvable.</p></div>'; return; }
    const d = buildCockpitData(client); currentCockpit=d;
    host.innerHTML = cockpitHTML(d); bindCockpit(d);
  }

  function cockpitHTML(d){
    const c=d.client;
    const maxEnv=d.envRows.length?d.envRows[0].valo:1;
    const classTotal=d.classes.reduce((s,x)=>s+x[1],0)||1;
    const target=loadTarget(c.id);
    const todo=d.compliance.filter(x=>x.sev==='todo').length, warn=d.compliance.filter(x=>x.sev==='warn').length;
    const lc=lastContact(c.id), nr=nextRdv(c.id);
    const perfCls=d.perf==null?'':(d.perf>=0?'positive':'negative');
    const ytdCls=d.ytd==null?'':(d.ytd>=0?'positive':'negative');
    return `
      <div class="ck-head">
        <div class="ck-head__l">
          <h3>${esc(clientName(c))}</h3>
          <div class="ck-head__meta">
            ${c.email?`<span>✉ ${esc(c.email)}</span>`:''}
            ${c.telephone?`<span>☎ ${esc(c.telephone)}</span>`:''}
            ${c.couple_rendement_risque?`<span class="ck-tag">Profil ${esc(c.couple_rendement_risque)}</span>`:''}
            <span>Dernier contact&nbsp;: <b>${lc?fmtShort(lc):'—'}</b></span>
            ${nr?`<span class="ck-tag gold">RDV ${fmtShort(nr)}</span>`:''}
          </div>
        </div>
        <button class="ck-brief-cta" id="ck-brief-cta">Générer le brief pré-RDV</button>
      </div>

      <div class="ov-kpis">
        <div class="ov-kpi"><div class="v">${compact(d.valoTotal)}</div><div class="l">Valorisation totale</div></div>
        <div class="ov-kpi"><div class="v ${perfCls}">${perfPct(d.perf)}</div><div class="l">Perf. depuis souscription</div></div>
        <div class="ov-kpi"><div class="v ${ytdCls}">${d.ytd!=null?perfPct(d.ytd):'—'}</div><div class="l">Performance YTD</div></div>
        <div class="ov-kpi"><div class="v">${d.envs.length}<span class="sub"> env.</span></div><div class="l">Plus/moins-value ${d.plusValue>=0?'+':''}${compact(d.plusValue)}</div></div>
      </div>

      <div class="ck-grid">
        <div class="sp-card">
          <h4>Encours par enveloppe <span class="ck-card-act"><button class="ck-mini-btn" id="ck-add-env">＋ Enveloppe</button></span></h4>
          <div class="ck-envs">${d.envRows.map(r=>envRowHTML(r)).join('')||'<p class="sp-muted sm">Aucune enveloppe. Cliquez sur « ＋ Enveloppe » pour démarrer.</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Allocation par classe d'actif <span class="sp-h4-note">— actuelle vs cible · cible ajustable</span></h4>
          <div class="ck-alloc" id="ck-alloc">${allocVsTargetHTML(d, target, classTotal)}</div>
        </div>
        <div class="sp-card">
          <h4>Prochaines échéances <span class="sp-h4-note">— structurés &amp; documents</span></h4>
          <div class="ov-risk">${d.upcoming.map(dueRowHTML).join('')||'<p class="sp-muted sm">Aucune échéance à venir.</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Conformité <span class="sp-h4-note">— ${todo} à traiter · ${warn} à surveiller</span><span class="ck-card-act"><button class="ck-mini-btn" id="ck-add-doc">＋ Document</button></span></h4>
          <div class="ck-comp">${d.compliance.map(x=>`<div class="ck-comp__row ${x.sev}"><span class="ck-dot"></span><div><b>${esc(x.label)}</b>${x.detail?`<small>${esc(x.detail)}</small>`:''}</div></div>`).join('')}</div>
          ${d.register.length?`<div class="ck-reg"><div class="ck-reg__h">Registre documentaire</div>${d.register.map(docRowHTML).join('')}</div>`:''}
        </div>
      </div>

      <div class="sp-card ck-brief-card">
        <h4>Brief pré-RDV <span class="sp-h4-note">— synthèse auto-générée</span>
          <span class="ck-brief-actions"><button class="ck-mini-btn" id="ck-brief-copy">Copier</button><button class="ck-mini-btn" id="ck-brief-print">Imprimer / PDF</button></span>
        </h4>
        <div class="ck-brief" id="ck-brief">${briefHTML(d)}</div>
      </div>`;
  }

  function envRowHTML(r){
    const e=r.e; const pcls=r.perf==null?'':(r.perf>=0?'positive':'negative');
    const mix=classMixHTML(r.sup);
    return `<div class="ck-env" data-env="${esc(e.id)}">
      <div class="ck-env__head">
        <div class="ck-env__id"><b>${esc(e.type||'Enveloppe')}</b><small>${esc(e.etablissement||'')}${e.numero?' · '+esc(e.numero):''}${e.date_souscription?' · depuis '+fmtShort(e.date_souscription):''}</small></div>
        <div class="ck-env__fig"><span class="ck-env__valo">${compact(r.valo)}</span><span class="ck-env__perf ${pcls}">${perfPct(r.perf)}</span></div>
        <div class="ck-env__act">
          <button class="ck-icon ck-add-sup" title="Ajouter un support">＋</button>
          <button class="ck-icon ck-edit-env" title="Modifier l'enveloppe">✎</button>
          <button class="ck-icon ck-toggle-sup" title="Voir les supports">▾</button>
        </div>
      </div>
      ${mix?`<div class="ck-env__mix">${mix}</div>`:''}
      <div class="ck-env__sup" hidden>
        ${r.sup.length?r.sup.map(supRowHTML).join(''):'<p class="sp-muted sm">Aucun support. Cliquez sur ＋ pour en ajouter.</p>'}
      </div>
    </div>`;
  }
  function classMixHTML(sup){
    if(!sup.length) return '';
    const total=sup.reduce((s,x)=>s+(+x.valorisation||0),0)||1;
    const m=new Map(); sup.forEach(s=>{ const c=s.classe||'Autre'; m.set(c,(m.get(c)||0)+(+s.valorisation||0)); });
    const seg=Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<span class="ck-seg" style="width:${(v/total*100).toFixed(1)}%;background:${CLASS_COLORS[c]||'#789'}" title="${esc(c)} ${(v/total*100).toFixed(0)}%"></span>`).join('');
    return `<div class="ck-mixbar">${seg}</div>`;
  }
  function supRowHTML(s){
    const pcls=(s.montant_investi!=null && s.valorisation!=null)?((s.valorisation-s.montant_investi)>=0?'positive':'negative'):'';
    const perf=(s.montant_investi)?(s.valorisation-s.montant_investi)/s.montant_investi:null;
    return `<div class="ck-sup" data-sup="${esc(s.id)}">
      <span class="ck-sup__dot" style="background:${CLASS_COLORS[s.classe]||'#789'}"></span>
      <div class="ck-sup__n">${esc(s.libelle||'—')}<small>${esc(s.classe||'')}${s.isin?' · '+esc(s.isin):''}</small></div>
      <span class="ck-sup__v">${compact(+s.valorisation||0)}</span>
      <span class="ck-sup__p ${pcls}">${perf!=null?perfPct(perf):''}</span>
      <button class="ck-icon ck-edit-sup" title="Modifier">✎</button>
    </div>`;
  }
  function dueRowHTML(x){
    const struct = x.kind==='Observation structuré';
    return `<div class="ov-risk__row ${struct?'safe':'warn'}">
      <div class="ov-risk__n">${esc(x.label)}<small>${esc(x.kind)}${x.env?' · '+esc(x.env):''}${x.detail?' — '+esc(x.detail):''}</small></div>
      <div class="ov-risk__fig"><b>${fmtShort(x.date)}</b></div></div>`;
  }
  function docRowHTML(d){
    const st=docStatus(d); const lbl={signed:'Signé',pending:'À signer',expired:'Expiré'}[st];
    return `<div class="ck-reg__row ${st}" data-doc="${esc(d.id)}">
      <span class="ck-reg__t">${esc(d.type||'Document')}${d.libelle?' — '+esc(d.libelle):''}</span>
      <span class="ck-reg__d">${d.date_signature?fmtShort(d.date_signature):'—'}${d.date_echeance?' → '+fmtShort(d.date_echeance):''}</span>
      <span class="ck-reg__s ${st}">${lbl}</span>
      <button class="ck-icon ck-edit-doc" title="Modifier">✎</button>
    </div>`;
  }

  /* ---- Allocation actuelle vs cible (par classe d'actif) ---- */
  function allocVsTargetHTML(d, target, classTotal){
    if(!d.classes.length) return '<p class="sp-muted sm">Aucun support — pas d\'allocation à comparer.</p>';
    const rows=d.classes.map(([c,v])=>{
      const act=v/classTotal*100, tgt=target[c]!=null?target[c]:Math.round(act), gap=act-tgt, gcls=Math.abs(gap)<5?'ok':(gap>0?'over':'under');
      return `<div class="ck-alloc__row">
        <span class="ck-alloc__n"><i style="background:${CLASS_COLORS[c]||'#789'}"></i>${esc(c)}</span>
        <div class="ck-alloc__bar"><div class="ck-alloc__fill" style="width:${Math.min(100,act).toFixed(0)}%;background:${CLASS_COLORS[c]||'var(--gold)'}"></div><div class="ck-alloc__tgt" style="left:${Math.min(100,tgt)}%"></div></div>
        <span class="ck-alloc__act">${act.toFixed(0)}%</span>
        <span class="ck-alloc__tgtv">cible <input type="number" class="ck-tgt-input" data-cls="${esc(c)}" value="${tgt}" min="0" max="100">%</span>
        <span class="ck-alloc__gap ${gcls}">${gap>=0?'+':''}${gap.toFixed(0)} pts</span>
      </div>`;
    }).join('');
    const detail=d.envRows.filter(r=>r.sup.length).map(r=>`<div class="ck-alloc-env"><span class="ck-alloc-env__n">${esc(r.e.type||'Enveloppe')}${r.e.etablissement?' · '+esc(r.e.etablissement):''}</span>${classMixHTML(r.sup)}</div>`).join('');
    return rows
      +`<div class="ck-alloc__foot"><button class="ck-mini-btn" id="ck-tgt-save">Enregistrer la cible</button><button class="ck-mini-btn ghost" id="ck-tgt-auto">Réinitialiser</button><span class="sp-muted sm" id="ck-tgt-status"></span></div>`
      +(detail?`<div class="ck-alloc-detail"><div class="ck-reg__h">Détail par enveloppe</div>${detail}</div>`:'');
  }

  function bindCockpit(d){
    const c=d.client;
    const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',fn); };
    on('ck-brief-cta',()=>openBrief(d)); on('ck-brief-copy',()=>copyBrief(d)); on('ck-brief-print',()=>openBrief(d));
    on('ck-add-env',()=>openEnvForm(c)); on('ck-add-doc',()=>openDocForm(c));
    on('ck-tgt-save',()=>{ const map={}; document.querySelectorAll('#ck-alloc .ck-tgt-input').forEach(i=>{ map[i.dataset.cls]=Math.max(0,Math.min(100,parseFloat(i.value)||0)); }); saveTarget(c.id,map);
      const st=document.getElementById('ck-tgt-status'); if(st){ st.textContent='✓ Cible enregistrée'; st.style.color='#2e7d32'; } });
    on('ck-tgt-auto',()=>{ saveTarget(c.id,null); renderCockpit(); });
    document.querySelectorAll('#ck-alloc .ck-tgt-input').forEach(i=>i.addEventListener('input',()=>updateAllocGaps(d)));
    // enveloppes / supports
    document.querySelectorAll('#ck-body .ck-env').forEach(row=>{
      const eid=row.dataset.env; const env=enveloppes.find(e=>String(e.id)===String(eid));
      row.querySelector('.ck-toggle-sup').addEventListener('click',()=>{ const box=row.querySelector('.ck-env__sup'); box.hidden=!box.hidden; row.querySelector('.ck-toggle-sup').textContent=box.hidden?'▾':'▴'; });
      row.querySelector('.ck-edit-env').addEventListener('click',()=>openEnvForm(c, env));
      row.querySelector('.ck-add-sup').addEventListener('click',()=>openSupForm(env));
      row.querySelectorAll('.ck-sup').forEach(sr=>{ const sup=supports.find(s=>String(s.id)===String(sr.dataset.sup));
        sr.querySelector('.ck-edit-sup').addEventListener('click',()=>openSupForm(env, sup)); });
    });
    document.querySelectorAll('#ck-body .ck-reg__row').forEach(r=>{ const doc=documents.find(x=>String(x.id)===String(r.dataset.doc));
      r.querySelector('.ck-edit-doc').addEventListener('click',()=>openDocForm(c, null, doc)); });
  }
  function updateAllocGaps(d){
    const classTotal=d.classes.reduce((s,x)=>s+x[1],0)||1;
    document.querySelectorAll('#ck-alloc .ck-alloc__row').forEach(row=>{
      const inp=row.querySelector('.ck-tgt-input'); if(!inp) return;
      const ent=d.classes.find(x=>x[0]===inp.dataset.cls); const v=ent?ent[1]:0;
      const act=v/classTotal*100, tgt=parseFloat(inp.value)||0, gap=act-tgt;
      const g=row.querySelector('.ck-alloc__gap'); if(g){ g.textContent=(gap>=0?'+':'')+gap.toFixed(0)+' pts'; g.className='ck-alloc__gap '+(Math.abs(gap)<5?'ok':(gap>0?'over':'under')); }
      const mk=row.querySelector('.ck-alloc__tgt'); if(mk) mk.style.left=Math.min(100,tgt)+'%';
    });
  }

  /* ---------------- CIBLE (localStorage) ---------------- */
  function ckTargetKey(id){ return 'lfdr:ck:alloc:'+id; }
  function loadTarget(id){ try{ return JSON.parse(localStorage.getItem(ckTargetKey(id))||'null')||{}; }catch(e){ return {}; } }
  function saveTarget(id,map){ try{ if(map) localStorage.setItem(ckTargetKey(id),JSON.stringify(map)); else localStorage.removeItem(ckTargetKey(id)); }catch(e){} }

  /* ===================================================================
     SAISIE / PERSISTANCE (enveloppes, supports, documents)
     =================================================================== */
  const modal=document.getElementById('ck-modal');
  if(document.getElementById('ck-modal-close')) document.getElementById('ck-modal-close').addEventListener('click',()=>modal.classList.remove('is-open'));
  if(modal) modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('is-open'); });
  function openModal(title){ document.getElementById('ck-modal-title').textContent=title; modal.classList.add('is-open'); document.getElementById('ck-modal-body').scrollTop=0; }
  function fld(id,label,type,value,opts){
    let input;
    if(type==='select'){ input=`<select id="${id}">${(opts||[]).map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select>`; }
    else if(type==='textarea'){ input=`<textarea id="${id}" rows="2">${esc(value==null?'':value)}</textarea>`; }
    else input=`<input type="${type}" id="${id}" value="${value==null?'':esc(value)}">`;
    return `<div class="sp-fld"><label>${esc(label)}</label>${input}</div>`;
  }
  function val(id){ const e=document.getElementById(id); return e?(String(e.value).trim()||null):null; }
  function numv(id){ const e=document.getElementById(id); if(!e||e.value==='') return null; const n=parseFloat(String(e.value).replace(/\s/g,'').replace(',','.')); return isNaN(n)?null:n; }

  function persistInsert(table, arr, payload){
    if(!SB){ const local=Object.assign({id:'loc'+(++localId)},payload); arr.push(local); return Promise.resolve(local); }
    return fetch(API+'/'+table,{method:'POST',headers:headers({'Prefer':'return=representation'}),body:JSON.stringify(payload)})
      .then(r=>r.ok?r.json():Promise.reject(r.status)).then(rows=>{ const row=(rows&&rows[0])||Object.assign({id:'loc'+(++localId)},payload); arr.push(row); return row; })
      .catch(()=>{ const local=Object.assign({id:'loc'+(++localId)},payload); arr.push(local); toast('Ajouté pour cette session — non sauvegardé (base non connectée).',true); return local; });
  }
  function persistUpdate(table, arr, id, patch){
    const obj=arr.find(x=>String(x.id)===String(id)); if(obj) Object.assign(obj,patch);
    if(SB) fetch(API+'/'+table+'?id=eq.'+id,{method:'PATCH',headers:headers({'Prefer':'return=minimal'}),body:JSON.stringify(patch)}).catch(()=>{});
    return Promise.resolve(obj);
  }
  function persistDelete(table, arr, id){
    const i=arr.findIndex(x=>String(x.id)===String(id)); if(i>=0) arr.splice(i,1);
    if(table==='enveloppes'){ const subs=supports.filter(s=>String(s.enveloppe_id)===String(id)); subs.forEach(s=>persistDelete('supports',supports,s.id)); }
    if(SB) fetch(API+'/'+table+'?id=eq.'+id,{method:'DELETE',headers:headers()}).catch(()=>{});
    return Promise.resolve();
  }
  function refresh(){ buildClientSelect(); renderStats(); renderCockpit(); }

  function openEnvForm(client, env){
    env=env||{};
    openModal(env.id?'Modifier l\'enveloppe':'Nouvelle enveloppe');
    document.getElementById('ck-modal-body').innerHTML=`
      <div class="sp-form-grid">
        ${fld('en-type','Type d\'enveloppe','select',env.type||'Assurance-vie',ENV_TYPES)}
        ${fld('en-etab','Établissement / Assureur','text',env.etablissement)}
        ${fld('en-num','N° de contrat','text',env.numero)}
        ${fld('en-date','Date de souscription','date',env.date_souscription?String(env.date_souscription).slice(0,10):'')}
        ${fld('en-inv','Montant investi (€)','number',env.montant_investi)}
        ${fld('en-valo','Valorisation actuelle (€)','number',env.valorisation)}
        ${fld('en-ytd','Valorisation au 01/01 (€, pour la perf YTD)','number',env.valo_debut_annee)}
        ${fld('en-dev','Devise','select',env.devise||'EUR',['EUR','USD','CHF','GBP'])}
      </div>
      <p class="sp-muted sm" style="margin-top:8px">La valorisation et l'investi se déduisent des supports si vous en ajoutez ; les montants saisis ici servent de repli.</p>
      <div class="sp-save-bar">
        <button class="btn btn--solid" id="en-save">Enregistrer</button>
        ${env.id?'<button class="btn" id="en-del" style="border-color:#c0392b;color:#c0392b">Supprimer</button>':''}
        <span class="sp-save-status" id="en-status"></span>
      </div>`;
    document.getElementById('en-save').addEventListener('click',()=>{
      const payload={ client_id:client.id, type:val('en-type'), etablissement:val('en-etab'), numero:val('en-num'),
        date_souscription:val('en-date'), montant_investi:numv('en-inv'), valorisation:numv('en-valo'),
        valo_debut_annee:numv('en-ytd'), devise:val('en-dev')||'EUR', libelle:val('en-type') };
      const p = env.id ? persistUpdate('enveloppes',enveloppes,env.id,payload) : persistInsert('enveloppes',enveloppes,payload);
      p.then(()=>{ modal.classList.remove('is-open'); refresh(); toast('Enveloppe enregistrée.'); });
    });
    const del=document.getElementById('en-del');
    if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer cette enveloppe et ses supports ?')) persistDelete('enveloppes',enveloppes,env.id).then(()=>{ modal.classList.remove('is-open'); refresh(); }); });
  }

  function openSupForm(env, sup){
    if(!env){ toast('Enveloppe introuvable.',true); return; }
    sup=sup||{};
    openModal(sup.id?'Modifier le support':'Nouveau support — '+(env.type||'Enveloppe'));
    document.getElementById('ck-modal-body').innerHTML=`
      <div class="sp-form-grid">
        ${fld('su-lib','Libellé du support','text',sup.libelle)}
        ${fld('su-cls','Classe d\'actif','select',sup.classe||'Fonds euro',ASSET_CLASSES)}
        ${fld('su-isin','ISIN (optionnel)','text',sup.isin)}
        ${fld('su-inv','Montant investi (€)','number',sup.montant_investi)}
        ${fld('su-valo','Valorisation (€)','number',sup.valorisation)}
        ${fld('su-date','Date de valorisation','date',sup.date_valo?String(sup.date_valo).slice(0,10):'')}
      </div>
      <p class="sp-muted sm" style="margin-top:8px">Pour un produit structuré, renseignez l'ISIN : ses prochaines échéances (autocall/coupon) seront reprises automatiquement.</p>
      <div class="sp-save-bar">
        <button class="btn btn--solid" id="su-save">Enregistrer</button>
        ${sup.id?'<button class="btn" id="su-del" style="border-color:#c0392b;color:#c0392b">Supprimer</button>':''}
        <span class="sp-save-status" id="su-status"></span>
      </div>`;
    document.getElementById('su-save').addEventListener('click',()=>{
      const payload={ enveloppe_id:env.id, libelle:val('su-lib'), classe:val('su-cls'),
        isin:val('su-isin')?val('su-isin').toUpperCase():null, montant_investi:numv('su-inv'),
        valorisation:numv('su-valo'), date_valo:val('su-date') };
      const p = sup.id ? persistUpdate('supports',supports,sup.id,payload) : persistInsert('supports',supports,payload);
      p.then(()=>{ modal.classList.remove('is-open'); refresh(); toast('Support enregistré.'); });
    });
    const del=document.getElementById('su-del');
    if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer ce support ?')) persistDelete('supports',supports,sup.id).then(()=>{ modal.classList.remove('is-open'); refresh(); }); });
  }

  function openDocForm(client, env, doc){
    doc=doc||{};
    const envOpts=['(aucune)'].concat(clientEnvs(client.id).map(e=>(e.type||'Enveloppe')+(e.numero?' · '+e.numero:'')));
    const envIds=[''].concat(clientEnvs(client.id).map(e=>e.id));
    const curEnvIdx=doc.enveloppe_id?Math.max(0,envIds.indexOf(doc.enveloppe_id)):(env?Math.max(0,envIds.indexOf(env.id)):0);
    openModal(doc.id?'Modifier le document':'Nouveau document de conformité');
    document.getElementById('ck-modal-body').innerHTML=`
      <div class="sp-form-grid">
        ${fld('dc-type','Type de document','select',doc.type||'Convention de conseil',DOC_TYPES)}
        ${fld('dc-lib','Libellé / objet','text',doc.libelle)}
        <div class="sp-fld"><label>Enveloppe rattachée (optionnel)</label><select id="dc-env">${envOpts.map((o,i)=>`<option value="${esc(envIds[i]||'')}" ${i===curEnvIdx?'selected':''}>${esc(o)}</option>`).join('')}</select></div>
        ${fld('dc-sign','Date de signature','date',doc.date_signature?String(doc.date_signature).slice(0,10):'')}
        ${fld('dc-ech','Date d\'échéance / renouvellement','date',doc.date_echeance?String(doc.date_echeance).slice(0,10):'')}
        ${fld('dc-ref','Référence','text',doc.reference)}
      </div>
      ${fld('dc-notes','Notes','textarea',doc.notes)}
      <p class="sp-muted sm" style="margin-top:4px">Laissez la date de signature vide pour un document « à signer ». L'échéance déclenche une relance (ex : convention de conseil annuelle).</p>
      <div class="sp-save-bar">
        <button class="btn btn--solid" id="dc-save">Enregistrer</button>
        ${doc.id?'<button class="btn" id="dc-del" style="border-color:#c0392b;color:#c0392b">Supprimer</button>':''}
        <span class="sp-save-status" id="dc-status"></span>
      </div>`;
    document.getElementById('dc-save').addEventListener('click',()=>{
      const payload={ client_id:client.id, enveloppe_id:val('dc-env')||null, type:val('dc-type'),
        libelle:val('dc-lib'), date_signature:val('dc-sign'), date_echeance:val('dc-ech'),
        reference:val('dc-ref'), notes:val('dc-notes') };
      const p = doc.id ? persistUpdate('documents',documents,doc.id,payload) : persistInsert('documents',documents,payload);
      p.then(()=>{ modal.classList.remove('is-open'); refresh(); toast('Document enregistré.'); });
    });
    const del=document.getElementById('dc-del');
    if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer ce document ?')) persistDelete('documents',documents,doc.id).then(()=>{ modal.classList.remove('is-open'); refresh(); }); });
  }

  /* ---------------- BRIEF ---------------- */
  function briefLines(d){
    const c=d.client, L=[];
    L.push({h:'Synthèse patrimoniale'});
    L.push({t:`${clientName(c)} — valorisation totale ${compact(d.valoTotal)} sur ${d.envs.length} enveloppe(s), investi ${compact(d.investiTotal)}, plus/moins-value ${d.plusValue>=0?'+':''}${compact(d.plusValue)} (${perfPct(d.perf)})${d.ytd!=null?`, performance ${perfPct(d.ytd)} YTD`:''}.`});
    if(d.envRows.length){ L.push({h:'Enveloppes'}); d.envRows.forEach(r=>L.push({li:`${r.e.type||'Enveloppe'}${r.e.etablissement?' ('+r.e.etablissement+')':''} : ${compact(r.valo)}${r.perf!=null?' · '+perfPct(r.perf):''}`})); }
    if(d.classes.length){ const ct=d.classes.reduce((s,x)=>s+x[1],0)||1; L.push({h:'Allocation par classe d\'actif'}); d.classes.forEach(([cl,v])=>L.push({li:`${cl} : ${(v/ct*100).toFixed(0)}%`})); }
    if(d.upcoming.length){ L.push({h:'À l\'ordre du jour — échéances'}); d.upcoming.slice(0,5).forEach(x=>L.push({li:`${fmtShort(x.date)} — ${x.label} (${x.kind}${x.detail?', '+x.detail:''})`})); }
    const todo=d.compliance.filter(x=>x.sev!=='ok');
    if(todo.length){ L.push({h:'Conformité à régulariser'}); todo.forEach(x=>L.push({li:x.label+(x.detail?` — ${x.detail}`:'')})); }
    L.push({h:'Relation & objectifs'});
    const lc=lastContact(c.id), nr=nextRdv(c.id);
    L.push({t:`Dernier contact : ${lc?fmtShort(lc):'—'}.${nr?` Prochain RDV : ${fmtShort(nr)}.`:''}${c.next_action?` Prochaine action : ${c.next_action}${c.next_action_date?' ('+fmtShort(c.next_action_date)+')':''}.`:''}`});
    if(c.objectifs&&c.objectifs.length) L.push({t:`Objectifs : ${Array.isArray(c.objectifs)?c.objectifs.join(', '):c.objectifs}.`});
    if(c.horizon||c.couple_rendement_risque) L.push({t:`Horizon : ${c.horizon||'—'} · Profil : ${c.couple_rendement_risque||'—'}.`});
    if(c.notes_internes) L.push({t:`Note interne : ${c.notes_internes}`});
    return L;
  }
  function linesToHTML(L, hTag){
    let html='', inUl=false;
    L.forEach(x=>{ if(x.li){ if(!inUl){ html+='<ul>'; inUl=true; } html+=`<li>${esc(x.li)}</li>`; return; }
      if(inUl){ html+='</ul>'; inUl=false; }
      if(x.h) html+=`<${hTag}>${esc(x.h)}</${hTag}>`; else html+=`<p>${esc(x.t)}</p>`; });
    if(inUl) html+='</ul>'; return html;
  }
  function briefHTML(d){ return linesToHTML(briefLines(d),'h5'); }
  function briefPlain(d){
    const tday=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const out=['BRIEF PRÉ-RDV — '+clientName(d.client), 'La Financière de Rochechouart · '+tday];
    briefLines(d).forEach(x=>{ if(x.h) out.push('', x.h.toUpperCase()); else if(x.li) out.push('  • '+x.li); else out.push(x.t); });
    return out.join('\n');
  }
  function copyBrief(d){
    const txt=briefPlain(d);
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(()=>toast('Brief copié dans le presse-papiers.')).catch(()=>toast('Copie impossible.',true)); }
    else toast('Presse-papiers indisponible.',true);
  }
  function openBrief(d){
    const tday=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const body=linesToHTML(briefLines(d),'h2');
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Brief pré-RDV — ${esc(clientName(d.client))} — ${tday}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Jost,Arial,sans-serif;color:#1E211C;padding:46px 54px;max-width:880px;margin:0 auto;font-size:13px;line-height:1.65}
.header{text-align:center;border-bottom:2px solid #A9853F;padding-bottom:22px;margin-bottom:24px}
.header h1{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:23px;font-weight:500}
.header .date{color:#5B6058;font-size:12px;margin-top:6px}
h1.client{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:21px;font-weight:600;margin-bottom:14px}
.summary{background:#f6f4ee;border-radius:10px;padding:18px 24px;margin-bottom:26px;display:flex;gap:30px;flex-wrap:wrap}
.summary .item .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#5B6058}
.summary .item .v{font-size:18px;font-weight:600;color:#001B00;margin-top:3px}
.pos{color:#2e7d32}.neg{color:#c0392b}
h2{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:16px;margin:22px 0 7px;font-weight:600;border-bottom:1px solid #e8e6df;padding-bottom:4px}
p{margin:0 0 7px}ul{margin:0 0 7px;padding-left:20px}li{margin-bottom:3px}
.footer{text-align:center;font-size:10px;color:#999;margin-top:38px;border-top:1px solid #e8e6df;padding-top:16px;line-height:1.7}
.print-btn{position:fixed;top:18px;right:18px;background:#A9853F;color:#fff;border:0;padding:11px 22px;border-radius:8px;font-family:Jost;font-size:13px;cursor:pointer}
@media print{.print-btn{display:none}body{padding:20px}}</style></head><body>
<button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
<div class="header"><h1>La Financière de Rochechouart</h1><div class="date">Brief pré-RDV · ${tday}</div></div>
<h1 class="client">${esc(clientName(d.client))}</h1>
<div class="summary">
  <div class="item"><div class="l">Valorisation totale</div><div class="v">${fmtEur(d.valoTotal)}</div></div>
  <div class="item"><div class="l">Investi</div><div class="v">${fmtEur(d.investiTotal)}</div></div>
  <div class="item"><div class="l">Plus/moins-value</div><div class="v ${d.plusValue>=0?'pos':'neg'}">${d.plusValue>=0?'+':''}${fmtEur(d.plusValue)} (${perfPct(d.perf)})</div></div>
  <div class="item"><div class="l">Performance YTD</div><div class="v ${d.ytd!=null&&d.ytd<0?'neg':'pos'}">${d.ytd!=null?perfPct(d.ytd):'—'}</div></div>
</div>
${body}
<div class="footer"><p><strong>La Financière de Rochechouart</strong> · 58 rue de Monceau, 75008 Paris</p><p>Document interne de préparation — Valorisations indicatives, non contractuelles.</p></div>
</body></html>`;
    const w=window.open('','_blank'); if(!w){ toast('Autorisez les pop-ups pour ouvrir le brief.',true); return; }
    w.document.write(html); w.document.close();
  }

  /* ---------------- STATS (en-tête module) ---------------- */
  function renderStats(){
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('stat-clients', clientsWithData().filter(c=>clientEnvs(c.id).length).length);
    let enc=0; enveloppes.forEach(e=>enc+=envValo(e)); set('stat-encours', compact(enc));
    const tod=today(), in30=addDays(tod,30); let due=0;
    supports.forEach(s=>{ if(s.classe==='Produit structuré' && s.isin && productsMap.has(s.isin)){ const p=productsMap.get(s.isin); if(productStatus(p)!=='LIVE') return; const o=nextObsDate(p); if(o&&o>=tod&&o<=in30) due++; } });
    documents.forEach(d=>{ if(d.date_echeance){ const de=pd(d.date_echeance); if(de>=tod&&de<=in30) due++; } });
    set('stat-due', due);
    let toReg=0; crmClients.forEach(c=>{ const items=complianceItems(c, clientEnvs(c.id), clientDocs(c.id)); if(items.some(x=>x.sev==='todo')) toReg++; });
    set('stat-compliance', toReg);
  }

  /* ---------------- AUTO-LOGIN ---------------- */
  if(sessionStorage.getItem('sb_access_token')){
    document.getElementById('dash-user-email').textContent = sessionStorage.getItem('sb_user_email') || '';
    showDash();
  }

})();
