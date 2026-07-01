/* ===========================================================================
   Cockpit client / brief pré-RDV — La Financière de Rochechouart
   Vue patrimoniale 360 par personne (physique OU morale) ou par PÔLE
   (regroupement de personnes liées, consolidé). Pour chaque sujet :
   enveloppes + supports (toutes classes d'actifs), allocation actuelle vs
   cible, performance, échéances, pièces justificatives (validité auto),
   procédures en cours (suivi retard/aujourd'hui/à venir/fait), et brief.
   Import d'un relevé PDF pour alimenter les supports d'une enveloppe.
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
  function showLogin(){ sessionStorage.removeItem('sb_access_token'); sessionStorage.removeItem('sb_user_email'); loginWrap.classList.remove('is-hidden'); dash.classList.remove('is-visible'); }
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    loginError.style.display = 'none';
    if(!SB){ sessionStorage.setItem('sb_access_token','demo'); sessionStorage.setItem('sb_user_email',email||'demo'); document.getElementById('dash-user-email').textContent = email||'demo'; showDash(); return; }
    fetch(SB + '/auth/v1/token?grant_type=password', { method:'POST', headers:{'apikey':SB_KEY,'Content-Type':'application/json'}, body: JSON.stringify({email, password}) })
      .then(r => r.json()).then(data => {
        if(data.access_token){ sessionStorage.setItem('sb_access_token', data.access_token); sessionStorage.setItem('sb_user_email', email); document.getElementById('dash-user-email').textContent = email; showDash(); }
        else { loginError.textContent = 'Identifiants incorrects.'; loginError.style.display='block'; }
      }).catch(() => { loginError.textContent='Erreur de connexion.'; loginError.style.display='block'; });
  });
  document.getElementById('btn-logout').addEventListener('click', showLogin);

  /* ---------------- RÉFÉRENTIELS ---------------- */
  const ENV_TYPES = ['Assurance-vie','Assurance-vie luxembourgeoise','Contrat de capitalisation','PER','Compte-titres (CTO)','PEA','PEA-PME','Autre'];
  const ASSET_CLASSES = ['Fonds euro','Actions','ETF','OPCVM','Obligations','Produit structuré','Immobilier','Private Equity','Liquidités','Autre'];
  const CLASS_COLORS = {'Fonds euro':'#558b2f','Actions':'#1565c0','ETF':'#2e7d32','OPCVM':'#6a1b9a','Obligations':'#e65100','Produit structuré':'#A9853F','Immobilier':'#00838f','Private Equity':'#5d4037','Liquidités':'#9e9e9e','Autre':'#7a8a99'};
  const POLE_ROLES = ['Titulaire','Dirigeant','Holding','SCI','Conjoint','Enfant','Associé','Autre'];
  // Pièces justificatives attendues + règle de péremption
  const PIECE_DEFS_PHYS = [
    {type:'Pièce d\'identité', rule:'expiry'},
    {type:'Justificatif de domicile', rule:{months:3}},
    {type:'Avis d\'imposition', rule:'yearN1'},
    {type:'RIB', rule:'none'}
  ];
  const PIECE_DEFS_MORALE = [
    {type:'Extrait KBIS', rule:{months:3}},
    {type:'Statuts à jour', rule:'none'},
    {type:'Registre des bénéficiaires effectifs', rule:'none'},
    {type:'Pièce d\'identité du dirigeant', rule:'expiry'},
    {type:'RIB', rule:'none'}
  ];
  const PIECE_TYPES = Array.from(new Set(PIECE_DEFS_PHYS.concat(PIECE_DEFS_MORALE).map(d=>d.type))).concat(['Livret de famille','Autre']);
  function pieceDefs(personne){ return personne==='morale'?PIECE_DEFS_MORALE:PIECE_DEFS_PHYS; }
  function pieceRuleFor(type){ const d=PIECE_DEFS_PHYS.concat(PIECE_DEFS_MORALE).find(x=>x.type===type); return d?d.rule:'none'; }
  // Procédures (suivi)
  const PROC_TYPES = ['Convention de conseil','Document d\'entrée en relation (DER)','Bulletin de souscription','Rapport de mission (arbitrage)','Souscription / Versement','Rachat / Arbitrage','LCB-FT / Origine des fonds','Actualisation KYC','Avenant','Autre'];
  const PROC_STATUTS = [['a_faire','À faire'],['en_cours','En cours'],['fait','Fait']];
  const REQUIRED_PROCS = ['Convention de conseil','Document d\'entrée en relation (DER)'];

  /* ---------------- STATE ---------------- */
  const productsMap = new Map();
  let crmClients = [], crmActivities = [], poles = [], enveloppes = [], supports = [], documents = [];
  let localId = 900000;

  function seedState(){ (window.SP_PRODUCTS||[]).forEach(p => { p.uls = p.uls||[]; productsMap.set(p.isin, Object.assign({}, p)); }); }
  function init(){
    seedState();
    Promise.resolve().then(loadSbProducts).then(loadCrm).then(loadPortfolio).then(afterLoad).catch(e => { console.warn(e); afterLoad(); });
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
      fetch(API + '/activities?select=*&order=date_activite.desc', {headers:headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/poles?select=*', {headers:headers()}).then(r => r.ok ? r.json() : [])
    ]).then(([cs, as, ps]) => { crmClients = cs||[]; crmActivities = as||[]; poles = ps||[]; }).catch(()=>{});
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
    if(window.CK_DEMO){ const D=window.CK_DEMO;
      if(!crmClients.length) crmClients=D.clients||[]; if(!crmActivities.length) crmActivities=D.activities||[];
      if(!poles.length) poles=D.poles||[]; if(!enveloppes.length) enveloppes=D.enveloppes||[];
      if(!supports.length) supports=D.supports||[]; if(!documents.length) documents=D.documents||[]; }
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
  function addMonths(d,m){ d=pd(d); return new Date(d.getFullYear(),d.getMonth()+m,d.getDate()); }
  function addDays(d,n){ const x=pd(d); return new Date(x.getFullYear(),x.getMonth(),x.getDate()+n); }
  function todayStrSp(){ const d=today(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function toast(msg, err){ const t=document.getElementById('ck-toast'); if(!t) return; t.textContent=msg; t.className='sp-toast show'+(err?' err':''); setTimeout(()=>t.className='sp-toast',2800); }
  function isMorale(c){ return c && c.personne==='morale'; }
  function clientName(c){ if(!c) return '(sans nom)'; if(isMorale(c)) return (c.raison_sociale||c.nom||'(société)').trim(); return ((c.prenom||'')+' '+(c.nom||'')).trim()||'(sans nom)'; }
  function ovBar(v,max,col){ return `<div class="ov-bar"><div class="ov-bar__fill" style="width:${Math.max(2,v/(max||1)*100).toFixed(0)}%;background:${col||'var(--gold)'}"></div></div>`; }

  const FREQ_M = {'Trimestrielle':3,'Mensuelle':1,'Semestrielle':6,'Annuelle':12,'Bimestrielle':2,'Journalière':null,'Bullet':null};
  function freqMonths(f){ return (f in FREQ_M)?FREQ_M[f]:3; }
  function productStatus(p){ if(!p) return 'LIVE'; if(p.statut) return p.statut; if(p.maturity) return pd(p.maturity)>=today()?'LIVE':'DONE'; return 'LIVE'; }
  function observationDates(p){ const sd=pd(p.strike), mat=pd(p.maturity); const m=freqMonths(p.freq);
    if(!sd||!mat||!m) return mat?[mat]:[]; const out=[]; let d=addMonths(sd,m), guard=0;
    while(d<=addDays(mat,4) && guard<400){ out.push(new Date(d)); d=addMonths(d,m); guard++; }
    if(!out.length) out.push(new Date(mat)); return out; }
  function nextObsDate(p){ const tod=today(); const o=observationDates(p).find(d=>d>tod); return o||pd(p.nextObs); }

  /* ---------------- ACCÈS DONNÉES ---------------- */
  function clientEnvs(id){ return enveloppes.filter(e=>String(e.client_id)===String(id)); }
  function envSupports(eid){ return supports.filter(s=>String(s.enveloppe_id)===String(eid)); }
  function clientDocs(id){ return documents.filter(d=>String(d.client_id)===String(id)); }
  function envValo(e){ const sup=envSupports(e.id); if(sup.length) return sup.reduce((s,x)=>s+(+x.valorisation||0),0); return e.valorisation!=null?+e.valorisation:(e.montant_investi!=null?+e.montant_investi:0); }
  function envInvesti(e){ const sup=envSupports(e.id); if(sup.length && sup.some(x=>x.montant_investi!=null)) return sup.reduce((s,x)=>s+(+x.montant_investi||0),0); return e.montant_investi!=null?+e.montant_investi:envValo(e); }
  function poleMembers(pid){ return crmClients.filter(c=>String(c.pole_id)===String(pid)); }

  function ckActsOf(id){ return crmActivities.filter(a=>String(a.client_id)===String(id)); }
  function lastContact(ids){ const set=[].concat(ids); const a=crmActivities.filter(x=>set.indexOf(String(x.client_id))>=0||set.indexOf(x.client_id)>=0).map(x=>x.date_activite).filter(Boolean).sort(); return a.length?a[a.length-1]:null; }
  function lastRdv(id){ const a=ckActsOf(id).filter(x=>x.type==='rdv').map(x=>x.date_activite).filter(Boolean).sort(); return a.length?a[a.length-1]:null; }
  function nextRdv(ids){ const set=[].concat(ids).map(String); const t=todayStrSp(); const a=crmActivities.filter(x=>set.indexOf(String(x.client_id))>=0 && x.type==='rdv' && !x.done && x.date_activite && x.date_activite.slice(0,10)>=t).map(x=>x.date_activite).sort(); return a.length?a[0]:null; }

  /* ---------------- PIÈCES (validité) ---------------- */
  function pieceStatus(doc){
    const rule = pieceRuleFor(doc.type);
    if(doc.date_validite){ const until=pd(doc.date_validite); return {state: until>=today()?'valide':'renouveler', until}; }
    if(rule && rule.months && doc.date_document){ const until=addMonths(doc.date_document, rule.months); return {state: until>=today()?'valide':'renouveler', until}; }
    if(rule==='yearN1' && doc.date_document){ const y=pd(doc.date_document).getFullYear(); return {state: y>=today().getFullYear()-1?'valide':'renouveler', until:null}; }
    if(rule==='expiry'){ return {state:'renouveler', until:null}; }   // date d'expiration à renseigner
    if(doc.date_document || doc.date_signature) return {state:'valide', until:null};
    return {state:'valide', until:null};
  }
  // Checklist des pièces attendues pour un client (état à jour / à renouveler / manquant)
  function pieceChecklist(client, docs){
    const defs=pieceDefs(client.personne);
    return defs.map(def=>{
      const cand=docs.filter(d=>(d.categorie==='piece') && d.type===def.type);
      if(!cand.length) return {type:def.type, state:'manquant', doc:null};
      // meilleure pièce = la plus récente valide, sinon la plus récente
      const scored=cand.map(d=>({d, st:pieceStatus(d)}));
      const ok=scored.find(x=>x.st.state==='valide');
      const chosen=ok||scored.sort((a,b)=>String(b.d.date_document||'').localeCompare(String(a.d.date_document||'')))[0];
      return {type:def.type, state:chosen.st.state, until:chosen.st.until, doc:chosen.d};
    });
  }

  /* ---------------- PROCÉDURES (suivi) ---------------- */
  function procBucket(d){ if(d.statut==='fait') return 'fait'; const de=d.date_echeance?pd(d.date_echeance):null;
    if(!de) return 'avenir'; const t=today(); if(de<t) return 'retard'; if(+de===+t) return 'aujourdhui'; return 'avenir'; }
  function clientProcs(docs){ return docs.filter(d=>d.categorie!=='piece'); }
  // Procédures socle manquantes (à initier)
  function missingProcs(client, envs, procs){
    const out=[];
    REQUIRED_PROCS.forEach(t=>{ if(!procs.some(p=>p.type===t)) out.push({type:t, forEnv:null}); });
    envs.forEach(e=>{ if(!procs.some(p=>p.type==='Bulletin de souscription' && String(p.enveloppe_id)===String(e.id))) out.push({type:'Bulletin de souscription', forEnv:e}); });
    return out;
  }

  /* ---------------- SUJET (personne ou pôle) ---------------- */
  function subjectFromValue(v){
    if(!v) return null;
    if(v.indexOf('pole:')===0){ const p=poles.find(x=>String(x.id)===v.slice(5)); if(!p) return null; const members=poleMembers(p.id);
      return {kind:'pole', pole:p, members, ids:members.map(m=>m.id)}; }
    const c=crmClients.find(x=>String(x.id)===v.replace('client:','')); if(!c) return null;
    return {kind:'client', client:c, members:[c], ids:[c.id]};
  }

  function buildData(subj){
    const members=subj.members;
    const envs=[]; members.forEach(m=>clientEnvs(m.id).forEach(e=>envs.push(Object.assign({}, e, {_owner:m}))));
    const docs=[]; members.forEach(m=>clientDocs(m.id).forEach(d=>docs.push(Object.assign({}, d, {_owner:m}))));
    const valoTotal=envs.reduce((s,e)=>s+envValo(e),0);
    const investiTotal=envs.reduce((s,e)=>s+envInvesti(e),0);
    const plusValue=valoTotal-investiTotal;
    const perf=investiTotal?plusValue/investiTotal:null;
    let ytdRef=0, ytdHas=false; envs.forEach(e=>{ if(e.valo_debut_annee!=null){ ytdRef+=+e.valo_debut_annee; ytdHas=true; } });
    const ytd = ytdHas && ytdRef ? (valoTotal-ytdRef)/ytdRef : null;
    const classMap=new Map();
    envs.forEach(e=>{ const sup=envSupports(e.id); if(sup.length){ sup.forEach(s=>{ const c=s.classe||'Autre'; classMap.set(c,(classMap.get(c)||0)+(+s.valorisation||0)); }); } else classMap.set('Autre',(classMap.get('Autre')||0)+envValo(e)); });
    const classes=Array.from(classMap.entries()).sort((a,b)=>b[1]-a[1]);
    const envRows=envs.map(e=>{ const sup=envSupports(e.id); const v=envValo(e), inv=envInvesti(e); return {e, sup, valo:v, investi:inv, perf:inv?(v-inv)/inv:null, owner:e._owner}; }).sort((a,b)=>b.valo-a.valo);
    // échéances : structurés (ISIN) + pièces à renouveler + procédures à venir
    const tod=today(); const upcoming=[];
    envs.forEach(e=>{ envSupports(e.id).forEach(s=>{ if(s.classe==='Produit structuré' && s.isin && productsMap.has(s.isin)){ const p=productsMap.get(s.isin); if(productStatus(p)!=='LIVE') return; const d=nextObsDate(p); if(!d||d<tod) return;
      upcoming.push({date:d, kind:'Observation structuré', label:p.lib||s.libelle||s.isin, detail:[p.ac!=null?'autocall '+pct(p.ac,0):'', p.bcpn!=null?'cpn '+pct(p.bcpn,0):''].filter(Boolean).join(' · ')}); } }); });
    docs.forEach(d=>{ if(d.categorie==='piece'){ const st=pieceStatus(d); if(st.until && st.until>=tod) upcoming.push({date:st.until, kind:'Pièce à renouveler', label:d.type, detail:''}); } });
    upcoming.sort((a,b)=>a.date-b.date);
    // conformité agrégée (par membre)
    const perMember=members.map(m=>{ const md=clientDocs(m.id); return {member:m, pieces:pieceChecklist(m,md), procs:clientProcs(md), missing:missingProcs(m, clientEnvs(m.id), clientProcs(md))}; });
    return {subj, members, envs, envRows, docs, valoTotal, investiTotal, plusValue, perf, ytd, classes, upcoming:upcoming.slice(0,8), perMember};
  }

  /* ===================================================================
     SÉLECTION + RENDU
     =================================================================== */
  const ckSel = document.getElementById('ck-client');
  if(ckSel) ckSel.addEventListener('change', renderCockpit);
  const ckBriefBtn = document.getElementById('ck-brief-btn');
  if(ckBriefBtn) ckBriefBtn.addEventListener('click', ()=>{ if(currentData) openBrief(currentData); else toast('Sélectionnez un client ou un pôle.', true); });
  let currentData = null;

  function buildClientSelect(){
    if(!ckSel) return; const prev=ckSel.value;
    let html='<option value="">— Sélectionner un client ou un pôle —</option>';
    if(poles.length){ html+='<optgroup label="Pôles">'+poles.slice().sort((a,b)=>String(a.nom).localeCompare(b.nom)).map(p=>{ const n=poleMembers(p.id).length; return `<option value="pole:${esc(p.id)}">▣ ${esc(p.nom||'Pôle')} (${n} membre${n>1?'s':''})</option>`; }).join('')+'</optgroup>'; }
    const persons=crmClients.slice().sort((a,b)=>clientName(a).localeCompare(clientName(b)));
    html+='<optgroup label="Personnes">'+persons.map(c=>{ const n=clientEnvs(c.id).length; return `<option value="client:${esc(c.id)}">${isMorale(c)?'🏢 ':'👤 '}${esc(clientName(c))}${n?' · '+n+' env.':''}</option>`; }).join('')+'</optgroup>';
    ckSel.innerHTML=html; if(prev) ckSel.value=prev;
  }

  function renderCockpit(){
    const host=document.getElementById('ck-body'); if(!host) return;
    const v = ckSel ? ckSel.value : '';
    const subj = subjectFromValue(v);
    if(!subj){ currentData=null; host.innerHTML='<div class="sp-rep-empty"><p>Sélectionnez une personne (physique ou morale) ou un pôle pour afficher le cockpit patrimonial 360° et générer le brief pré-RDV.</p></div>'; return; }
    const d = buildData(subj); currentData=d;
    host.innerHTML = cockpitHTML(d); bindCockpit(d);
  }

  function cockpitHTML(d){
    const subj=d.subj, isPole=subj.kind==='pole';
    const title = isPole ? (subj.pole.nom||'Pôle') : clientName(subj.client);
    const classTotal=d.classes.reduce((s,x)=>s+x[1],0)||1;
    const target=loadTarget(targetKey(subj));
    const lc=lastContact(subj.ids), nr=nextRdv(subj.ids);
    const perfCls=d.perf==null?'':(d.perf>=0?'positive':'negative');
    const ytdCls=d.ytd==null?'':(d.ytd>=0?'positive':'negative');
    const c=subj.client;
    let meta='';
    if(isPole){ meta=`<span class="ck-tag gold">${esc(subj.pole.type||'Pôle')}</span><span>${d.members.length} membre(s)</span>`; }
    else if(isMorale(c)){ meta=`${c.forme_juridique?`<span class="ck-tag">${esc(c.forme_juridique)}</span>`:''}${c.siren?`<span>SIREN ${esc(c.siren)}</span>`:''}${c.dirigeant?`<span>Dirigeant : ${esc(c.dirigeant)}</span>`:''}`; }
    else { meta=`${c.email?`<span>✉ ${esc(c.email)}</span>`:''}${c.telephone?`<span>☎ ${esc(c.telephone)}</span>`:''}${c.couple_rendement_risque?`<span class="ck-tag">Profil ${esc(c.couple_rendement_risque)}</span>`:''}`; }

    const membersCard = isPole ? `
      <div class="sp-card ck-span2">
        <h4>Membres du pôle</h4>
        <div class="ck-members">${d.members.map(m=>{ const v=clientEnvs(m.id).reduce((s,e)=>s+envValo(e),0);
          return `<div class="ck-member"><span class="ck-member__ico">${isMorale(m)?'🏢':'👤'}</span><div class="ck-member__n">${esc(clientName(m))}<small>${esc(m.pole_role||(isMorale(m)?'Personne morale':'Personne physique'))}</small></div><span class="ck-member__v">${compact(v)}</span></div>`; }).join('')||'<p class="sp-muted sm">Aucun membre rattaché à ce pôle.</p>'}</div>
      </div>` : '';

    return `
      <div class="ck-head">
        <div class="ck-head__l">
          <h3>${isPole?'▣ ':(isMorale(c)?'🏢 ':'')}${esc(title)}</h3>
          <div class="ck-head__meta">${meta}<span>Dernier contact&nbsp;: <b>${lc?fmtShort(lc):'—'}</b></span>${nr?`<span class="ck-tag gold">RDV ${fmtShort(nr)}</span>`:''}</div>
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
        ${membersCard}
        <div class="sp-card">
          <h4>Encours par enveloppe <span class="ck-card-act"><button class="ck-mini-btn" id="ck-add-env">＋ Enveloppe</button></span></h4>
          <div class="ck-envs">${d.envRows.map(r=>envRowHTML(r,isPole)).join('')||'<p class="sp-muted sm">Aucune enveloppe. Cliquez sur « ＋ Enveloppe ».</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Allocation par classe d'actif <span class="sp-h4-note">— actuelle vs cible</span></h4>
          <div class="ck-alloc" id="ck-alloc">${allocVsTargetHTML(d, target, classTotal)}</div>
        </div>
        <div class="sp-card">
          <h4>Pièces justificatives <span class="sp-h4-note">— à jour / à renouveler</span><span class="ck-card-act"><button class="ck-mini-btn" id="ck-add-piece">＋ Pièce</button></span></h4>
          <div class="ck-pieces">${d.perMember.map(pm=>pieceBlockHTML(pm,isPole)).join('')}</div>
        </div>
        <div class="sp-card">
          <h4>Procédures en cours <span class="sp-h4-note">— suivi</span><span class="ck-card-act"><button class="ck-mini-btn" id="ck-add-proc">＋ Procédure</button></span></h4>
          <div class="ck-procs">${proceduresHTML(d)}</div>
        </div>
        <div class="sp-card">
          <h4>Prochaines échéances <span class="sp-h4-note">— structurés &amp; pièces</span></h4>
          <div class="ov-risk">${d.upcoming.map(dueRowHTML).join('')||'<p class="sp-muted sm">Aucune échéance à venir.</p>'}</div>
        </div>
      </div>

      <div class="sp-card ck-brief-card">
        <h4>Brief pré-RDV <span class="sp-h4-note">— synthèse auto-générée</span>
          <span class="ck-brief-actions"><button class="ck-mini-btn" id="ck-brief-copy">Copier</button><button class="ck-mini-btn" id="ck-brief-print">Imprimer / PDF</button></span>
        </h4>
        <div class="ck-brief" id="ck-brief">${briefHTML(d)}</div>
      </div>`;
  }

  function envRowHTML(r, isPole){
    const e=r.e; const pcls=r.perf==null?'':(r.perf>=0?'positive':'negative');
    return `<div class="ck-env" data-env="${esc(e.id)}">
      <div class="ck-env__head">
        <div class="ck-env__id"><b>${esc(e.type||'Enveloppe')}</b><small>${esc(e.etablissement||'')}${e.numero?' · '+esc(e.numero):''}${isPole&&r.owner?' · '+esc(clientName(r.owner)):''}${e.date_souscription?' · depuis '+fmtShort(e.date_souscription):''}</small></div>
        <div class="ck-env__fig"><span class="ck-env__valo">${compact(r.valo)}</span><span class="ck-env__perf ${pcls}">${perfPct(r.perf)}</span></div>
        <div class="ck-env__act">
          <button class="ck-icon ck-import-pdf" title="Importer un relevé PDF">⤓</button>
          <button class="ck-icon ck-add-sup" title="Ajouter un support">＋</button>
          <button class="ck-icon ck-edit-env" title="Modifier l'enveloppe">✎</button>
          <button class="ck-icon ck-toggle-sup" title="Voir les supports">▾</button>
        </div>
      </div>
      ${classMixHTML(r.sup)}
      <div class="ck-env__sup" hidden>${r.sup.length?r.sup.map(supRowHTML).join(''):'<p class="sp-muted sm">Aucun support. Cliquez sur ＋ (ou importez un relevé PDF ⤓).</p>'}</div>
    </div>`;
  }
  function classMixHTML(sup){ if(!sup.length) return '';
    const total=sup.reduce((s,x)=>s+(+x.valorisation||0),0)||1; const m=new Map();
    sup.forEach(s=>{ const c=s.classe||'Autre'; m.set(c,(m.get(c)||0)+(+s.valorisation||0)); });
    const seg=Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<span class="ck-seg" style="width:${(v/total*100).toFixed(1)}%;background:${CLASS_COLORS[c]||'#789'}" title="${esc(c)} ${(v/total*100).toFixed(0)}%"></span>`).join('');
    return `<div class="ck-env__mix"><div class="ck-mixbar">${seg}</div></div>`; }
  function supRowHTML(s){
    const perf=(s.montant_investi)?(s.valorisation-s.montant_investi)/s.montant_investi:null;
    const pcls=perf==null?'':(perf>=0?'positive':'negative');
    return `<div class="ck-sup" data-sup="${esc(s.id)}">
      <span class="ck-sup__dot" style="background:${CLASS_COLORS[s.classe]||'#789'}"></span>
      <div class="ck-sup__n">${esc(s.libelle||'—')}<small>${esc(s.classe||'')}${s.isin?' · '+esc(s.isin):''}</small></div>
      <span class="ck-sup__v">${compact(+s.valorisation||0)}</span>
      <span class="ck-sup__p ${pcls}">${perf!=null?perfPct(perf):''}</span>
      <button class="ck-icon ck-edit-sup" title="Modifier">✎</button>
    </div>`;
  }
  function dueRowHTML(x){ const struct=x.kind==='Observation structuré';
    return `<div class="ov-risk__row ${struct?'safe':'warn'}">
      <div class="ov-risk__n">${esc(x.label)}<small>${esc(x.kind)}${x.detail?' — '+esc(x.detail):''}</small></div>
      <div class="ov-risk__fig"><b>${fmtShort(x.date)}</b></div></div>`; }

  function pieceBlockHTML(pm, isPole){
    const rows=pm.pieces.map(p=>{ const cls={valide:'ok',renouveler:'warn',manquant:'todo'}[p.state]; const lbl={valide:'À jour',renouveler:'À renouveler',manquant:'Manquant'}[p.state];
      return `<div class="ck-piece ${cls}" ${p.doc?`data-doc="${esc(p.doc.id)}"`:`data-newpiece="${esc(p.type)}" data-owner="${esc(pm.member.id)}"`}>
        <span class="ck-dot"></span>
        <div class="ck-piece__n">${esc(p.type)}${p.until?`<small>valide jusqu'au ${fmtShort(p.until)}</small>`:(p.doc&&(p.doc.date_document)?`<small>émis le ${fmtShort(p.doc.date_document)}</small>`:'')}</div>
        <span class="ck-piece__s ${cls}">${lbl}</span>
      </div>`; }).join('');
    return (isPole?`<div class="ck-reg__h">${esc(clientName(pm.member))}</div>`:'')+rows;
  }

  function proceduresHTML(d){
    // agrège procédures + suggestions "à initier" sur tous les membres
    const items=[]; d.perMember.forEach(pm=>{ pm.procs.forEach(p=>items.push({p, owner:pm.member})); });
    const buckets={retard:[],aujourdhui:[],avenir:[],fait:[]};
    items.forEach(it=>buckets[procBucket(it.p)].push(it));
    const suggest=[]; d.perMember.forEach(pm=>pm.missing.forEach(m=>suggest.push({m, owner:pm.member})));
    const grp=(key,title,cls)=>{ const arr=buckets[key]; if(!arr.length) return ''; return `<div class="ck-proc-grp"><div class="ck-proc-grp__h ${cls}">${title} (${arr.length})</div>${arr.sort((a,b)=>String(a.p.date_echeance||'').localeCompare(String(b.p.date_echeance||''))).map(it=>procRowHTML(it,d.subj.kind==='pole')).join('')}</div>`; };
    let html = grp('retard','En retard','retard')+grp('aujourdhui','Aujourd\'hui','today')+grp('avenir','À venir','soon')+grp('fait','Terminées','done');
    if(suggest.length) html += `<div class="ck-proc-grp"><div class="ck-proc-grp__h init">À initier (${suggest.length})</div>${suggest.map(s=>`<div class="ck-proc init" data-init="${esc(s.m.type)}" data-owner="${esc(s.owner.id)}" ${s.m.forEnv?`data-env="${esc(s.m.forEnv.id)}"`:''}><span class="ck-dot"></span><div class="ck-proc__n">${esc(s.m.type)}${s.m.forEnv?`<small>${esc(s.m.forEnv.type||'')} ${esc(s.m.forEnv.numero||'')}</small>`:''}</div><button class="ck-mini-btn ck-proc-create">Créer</button></div>`).join('')}</div>`;
    if(!html) html='<p class="sp-muted sm">Aucune procédure. Cliquez sur « ＋ Procédure ».</p>';
    return html;
  }
  function procRowHTML(it, isPole){
    const p=it.p; const b=procBucket(p); const scls={retard:'retard',aujourdhui:'today',avenir:'soon',fait:'done'}[b];
    const stLbl=(PROC_STATUTS.find(s=>s[0]===p.statut)||['','—'])[1];
    return `<div class="ck-proc ${scls}" data-doc="${esc(p.id)}">
      <span class="ck-dot"></span>
      <div class="ck-proc__n">${esc(p.type)}${p.libelle?' — '+esc(p.libelle):''}<small>${p.date_echeance?'échéance '+fmtShort(p.date_echeance):'sans échéance'}${isPole?' · '+esc(clientName(it.owner)):''}${p.date_signature?' · signé '+fmtShort(p.date_signature):''}</small></div>
      <span class="ck-proc__st st-${p.statut||'a_faire'}">${stLbl}</span>
      <button class="ck-icon ck-adv-proc" title="Avancer le statut">›</button>
      <button class="ck-icon ck-edit-proc" title="Modifier">✎</button>
    </div>`;
  }

  /* ---- Allocation ---- */
  function allocVsTargetHTML(d, target, classTotal){
    if(!d.classes.length) return '<p class="sp-muted sm">Aucun support — pas d\'allocation à comparer.</p>';
    const rows=d.classes.map(([c,v])=>{ const act=v/classTotal*100, tgt=target[c]!=null?target[c]:Math.round(act), gap=act-tgt, gcls=Math.abs(gap)<5?'ok':(gap>0?'over':'under');
      return `<div class="ck-alloc__row"><span class="ck-alloc__n"><i style="background:${CLASS_COLORS[c]||'#789'}"></i>${esc(c)}</span>
        <div class="ck-alloc__bar"><div class="ck-alloc__fill" style="width:${Math.min(100,act).toFixed(0)}%;background:${CLASS_COLORS[c]||'var(--gold)'}"></div><div class="ck-alloc__tgt" style="left:${Math.min(100,tgt)}%"></div></div>
        <span class="ck-alloc__act">${act.toFixed(0)}%</span><span class="ck-alloc__tgtv">cible <input type="number" class="ck-tgt-input" data-cls="${esc(c)}" value="${tgt}" min="0" max="100">%</span>
        <span class="ck-alloc__gap ${gcls}">${gap>=0?'+':''}${gap.toFixed(0)} pts</span></div>`; }).join('');
    const detail=d.envRows.filter(r=>r.sup.length).map(r=>`<div class="ck-alloc-env"><span class="ck-alloc-env__n">${esc(r.e.type||'Enveloppe')}${r.e.etablissement?' · '+esc(r.e.etablissement):''}</span>${classMixHTML(r.sup)}</div>`).join('');
    return rows+`<div class="ck-alloc__foot"><button class="ck-mini-btn" id="ck-tgt-save">Enregistrer la cible</button><button class="ck-mini-btn ghost" id="ck-tgt-auto">Réinitialiser</button><span class="sp-muted sm" id="ck-tgt-status"></span></div>`
      +(detail?`<div class="ck-alloc-detail"><div class="ck-reg__h">Détail par enveloppe</div>${detail}</div>`:'');
  }

  /* ---------------- BINDINGS ---------------- */
  function bindCockpit(d){
    const subj=d.subj;
    const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',fn); };
    on('ck-brief-cta',()=>openBrief(d)); on('ck-brief-copy',()=>copyBrief(d)); on('ck-brief-print',()=>openBrief(d));
    on('ck-add-env',()=>openEnvForm(subj)); on('ck-add-piece',()=>openDocForm(subj,'piece')); on('ck-add-proc',()=>openDocForm(subj,'procedure'));
    on('ck-tgt-save',()=>{ const map={}; document.querySelectorAll('#ck-alloc .ck-tgt-input').forEach(i=>{ map[i.dataset.cls]=Math.max(0,Math.min(100,parseFloat(i.value)||0)); }); saveTarget(targetKey(subj),map); const st=document.getElementById('ck-tgt-status'); if(st){ st.textContent='✓ Cible enregistrée'; st.style.color='#2e7d32'; } });
    on('ck-tgt-auto',()=>{ saveTarget(targetKey(subj),null); renderCockpit(); });
    document.querySelectorAll('#ck-alloc .ck-tgt-input').forEach(i=>i.addEventListener('input',()=>updateAllocGaps(d)));
    document.querySelectorAll('#ck-body .ck-env').forEach(row=>{
      const env=enveloppes.find(e=>String(e.id)===String(row.dataset.env));
      row.querySelector('.ck-toggle-sup').addEventListener('click',()=>{ const box=row.querySelector('.ck-env__sup'); box.hidden=!box.hidden; row.querySelector('.ck-toggle-sup').textContent=box.hidden?'▾':'▴'; });
      row.querySelector('.ck-edit-env').addEventListener('click',()=>openEnvForm(subj, env));
      row.querySelector('.ck-add-sup').addEventListener('click',()=>openSupForm(env));
      row.querySelector('.ck-import-pdf').addEventListener('click',()=>importReleve(env));
      row.querySelectorAll('.ck-sup').forEach(sr=>{ const sup=supports.find(s=>String(s.id)===String(sr.dataset.sup)); sr.querySelector('.ck-edit-sup').addEventListener('click',()=>openSupForm(env, sup)); });
    });
    document.querySelectorAll('#ck-body .ck-piece[data-doc]').forEach(el=>el.addEventListener('click',()=>{ const doc=documents.find(x=>String(x.id)===String(el.dataset.doc)); openDocForm(subj,'piece',doc); }));
    document.querySelectorAll('#ck-body .ck-piece[data-newpiece]').forEach(el=>el.addEventListener('click',()=>openDocForm(subj,'piece',{type:el.dataset.newpiece, client_id:el.dataset.owner})));
    document.querySelectorAll('#ck-body .ck-proc[data-doc]').forEach(el=>{ const doc=documents.find(x=>String(x.id)===String(el.dataset.doc));
      const adv=el.querySelector('.ck-adv-proc'); if(adv) adv.addEventListener('click',ev=>{ ev.stopPropagation(); advanceProc(doc); });
      const ed=el.querySelector('.ck-edit-proc'); if(ed) ed.addEventListener('click',ev=>{ ev.stopPropagation(); openDocForm(subj,'procedure',doc); }); });
    document.querySelectorAll('#ck-body .ck-proc[data-init]').forEach(el=>{ el.querySelector('.ck-proc-create').addEventListener('click',()=>openDocForm(subj,'procedure',{type:el.dataset.init, client_id:el.dataset.owner, enveloppe_id:el.dataset.env||null, statut:'a_faire'})); });
  }
  function updateAllocGaps(d){ const classTotal=d.classes.reduce((s,x)=>s+x[1],0)||1;
    document.querySelectorAll('#ck-alloc .ck-alloc__row').forEach(row=>{ const inp=row.querySelector('.ck-tgt-input'); if(!inp) return;
      const ent=d.classes.find(x=>x[0]===inp.dataset.cls); const v=ent?ent[1]:0; const act=v/classTotal*100, tgt=parseFloat(inp.value)||0, gap=act-tgt;
      const g=row.querySelector('.ck-alloc__gap'); if(g){ g.textContent=(gap>=0?'+':'')+gap.toFixed(0)+' pts'; g.className='ck-alloc__gap '+(Math.abs(gap)<5?'ok':(gap>0?'over':'under')); }
      const mk=row.querySelector('.ck-alloc__tgt'); if(mk) mk.style.left=Math.min(100,tgt)+'%'; }); }
  function advanceProc(doc){ if(!doc) return; const order=['a_faire','en_cours','fait']; const i=order.indexOf(doc.statut||'a_faire'); const next=order[Math.min(order.length-1,i+1)];
    const patch={statut:next}; if(next==='fait' && !doc.date_signature) patch.date_signature=todayStrSp();
    persistUpdate('documents',documents,doc.id,patch).then(()=>{ renderStats(); renderCockpit(); toast('Procédure : '+ (PROC_STATUTS.find(s=>s[0]===next)||['','—'])[1]); }); }

  /* ---------------- CIBLE (localStorage) ---------------- */
  function targetKey(subj){ return 'lfdr:ck:alloc:'+(subj.kind==='pole'?'pole'+subj.pole.id:subj.client.id); }
  function loadTarget(k){ try{ return JSON.parse(localStorage.getItem(k)||'null')||{}; }catch(e){ return {}; } }
  function saveTarget(k,map){ try{ if(map) localStorage.setItem(k,JSON.stringify(map)); else localStorage.removeItem(k); }catch(e){} }

  /* ===================================================================
     FORMULAIRES / PERSISTANCE
     =================================================================== */
  const modal=document.getElementById('ck-modal');
  if(document.getElementById('ck-modal-close')) document.getElementById('ck-modal-close').addEventListener('click',()=>modal.classList.remove('is-open'));
  if(modal) modal.addEventListener('click',e=>{ if(e.target===modal) modal.classList.remove('is-open'); });
  function openModal(title){ document.getElementById('ck-modal-title').textContent=title; modal.classList.add('is-open'); document.getElementById('ck-modal-body').scrollTop=0; }
  function fld(id,label,type,value,opts){
    let input;
    if(type==='select') input=`<select id="${id}">${(opts||[]).map(o=>{ const val=Array.isArray(o)?o[0]:o, lab=Array.isArray(o)?o[1]:o; return `<option value="${esc(val)}" ${String(val)===String(value)?'selected':''}>${esc(lab)}</option>`; }).join('')}</select>`;
    else if(type==='textarea') input=`<textarea id="${id}" rows="2">${esc(value==null?'':value)}</textarea>`;
    else input=`<input type="${type}" id="${id}" value="${value==null?'':esc(value)}">`;
    return `<div class="sp-fld"><label>${esc(label)}</label>${input}</div>`;
  }
  function val(id){ const e=document.getElementById(id); return e?(String(e.value).trim()||null):null; }
  function numv(id){ const e=document.getElementById(id); if(!e||e.value==='') return null; const n=parseFloat(String(e.value).replace(/\s/g,'').replace(',','.')); return isNaN(n)?null:n; }
  function memberSelect(subj, curId){ if(subj.kind!=='pole') return ''; const cur=curId||subj.members[0]&&subj.members[0].id;
    return `<div class="sp-fld"><label>Membre du pôle</label><select id="fm-member">${subj.members.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(cur)?'selected':''}>${esc(clientName(m))}</option>`).join('')}</select></div>`; }
  function pickClientId(subj, fallback){ if(subj.kind==='pole'){ const el=document.getElementById('fm-member'); return el?el.value:(fallback||subj.members[0].id); } return subj.client.id; }

  function persistInsert(table, arr, payload){
    if(!SB){ const local=Object.assign({id:'loc'+(++localId)},payload); arr.push(local); return Promise.resolve(local); }
    return fetch(API+'/'+table,{method:'POST',headers:headers({'Prefer':'return=representation'}),body:JSON.stringify(payload)})
      .then(r=>r.ok?r.json():Promise.reject(r.status)).then(rows=>{ const row=(rows&&rows[0])||Object.assign({id:'loc'+(++localId)},payload); arr.push(row); return row; })
      .catch(()=>{ const local=Object.assign({id:'loc'+(++localId)},payload); arr.push(local); toast('Ajouté pour cette session — non sauvegardé (base non connectée).',true); return local; });
  }
  function persistUpdate(table, arr, id, patch){ const obj=arr.find(x=>String(x.id)===String(id)); if(obj) Object.assign(obj,patch);
    if(SB) fetch(API+'/'+table+'?id=eq.'+id,{method:'PATCH',headers:headers({'Prefer':'return=minimal'}),body:JSON.stringify(patch)}).catch(()=>{}); return Promise.resolve(obj); }
  function persistDelete(table, arr, id){ const i=arr.findIndex(x=>String(x.id)===String(id)); if(i>=0) arr.splice(i,1);
    if(table==='enveloppes'){ supports.filter(s=>String(s.enveloppe_id)===String(id)).slice().forEach(s=>persistDelete('supports',supports,s.id)); }
    if(SB) fetch(API+'/'+table+'?id=eq.'+id,{method:'DELETE',headers:headers()}).catch(()=>{}); return Promise.resolve(); }
  function refresh(){ buildClientSelect(); renderStats(); renderCockpit(); }

  function openEnvForm(subj, env){ env=env||{};
    openModal(env.id?'Modifier l\'enveloppe':'Nouvelle enveloppe');
    document.getElementById('ck-modal-body').innerHTML=`
      ${memberSelect(subj, env.client_id)}
      <div class="sp-form-grid">
        ${fld('en-type','Type d\'enveloppe','select',env.type||'Assurance-vie',ENV_TYPES)}
        ${fld('en-etab','Établissement / Assureur','text',env.etablissement)}
        ${fld('en-num','N° de contrat','text',env.numero)}
        ${fld('en-date','Date de souscription','date',env.date_souscription?String(env.date_souscription).slice(0,10):'')}
        ${fld('en-inv','Montant investi (€)','number',env.montant_investi)}
        ${fld('en-valo','Valorisation actuelle (€)','number',env.valorisation)}
        ${fld('en-ytd','Valorisation au 01/01 (€, perf YTD)','number',env.valo_debut_annee)}
        ${fld('en-dev','Devise','select',env.devise||'EUR',['EUR','USD','CHF','GBP'])}
      </div>
      <p class="sp-muted sm" style="margin-top:8px">Valorisation et investi se déduisent des supports si vous en ajoutez (ou via l'import d'un relevé PDF).</p>
      <div class="sp-save-bar"><button class="btn btn--solid" id="en-save">Enregistrer</button>${env.id?'<button class="btn" id="en-del" style="border-color:#c0392b;color:#c0392b">Supprimer</button>':''}<span class="sp-save-status" id="en-status"></span></div>`;
    document.getElementById('en-save').addEventListener('click',()=>{
      const payload={ client_id:pickClientId(subj, env.client_id), type:val('en-type'), libelle:val('en-type'), etablissement:val('en-etab'), numero:val('en-num'), date_souscription:val('en-date'), montant_investi:numv('en-inv'), valorisation:numv('en-valo'), valo_debut_annee:numv('en-ytd'), devise:val('en-dev')||'EUR' };
      (env.id?persistUpdate('enveloppes',enveloppes,env.id,payload):persistInsert('enveloppes',enveloppes,payload)).then(()=>{ modal.classList.remove('is-open'); refresh(); toast('Enveloppe enregistrée.'); });
    });
    const del=document.getElementById('en-del'); if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer cette enveloppe et ses supports ?')) persistDelete('enveloppes',enveloppes,env.id).then(()=>{ modal.classList.remove('is-open'); refresh(); }); });
  }

  function openSupForm(env, sup){ if(!env){ toast('Enveloppe introuvable.',true); return; } sup=sup||{};
    openModal(sup.id?'Modifier le support':'Nouveau support');
    document.getElementById('ck-modal-body').innerHTML=`
      <div class="sp-form-grid">
        ${fld('su-lib','Libellé du support','text',sup.libelle)}
        ${fld('su-cls','Classe d\'actif','select',sup.classe||'Fonds euro',ASSET_CLASSES)}
        ${fld('su-isin','ISIN (optionnel)','text',sup.isin)}
        ${fld('su-inv','Montant investi (€)','number',sup.montant_investi)}
        ${fld('su-valo','Valorisation (€)','number',sup.valorisation)}
        ${fld('su-date','Date de valorisation','date',sup.date_valo?String(sup.date_valo).slice(0,10):'')}
      </div>
      <p class="sp-muted sm" style="margin-top:8px">Pour un produit structuré, renseignez l'ISIN : ses échéances sont reprises automatiquement.</p>
      <div class="sp-save-bar"><button class="btn btn--solid" id="su-save">Enregistrer</button>${sup.id?'<button class="btn" id="su-del" style="border-color:#c0392b;color:#c0392b">Supprimer</button>':''}<span class="sp-save-status" id="su-status"></span></div>`;
    document.getElementById('su-save').addEventListener('click',()=>{
      const payload={ enveloppe_id:env.id, libelle:val('su-lib'), classe:val('su-cls'), isin:val('su-isin')?val('su-isin').toUpperCase():null, montant_investi:numv('su-inv'), valorisation:numv('su-valo'), date_valo:val('su-date') };
      (sup.id?persistUpdate('supports',supports,sup.id,payload):persistInsert('supports',supports,payload)).then(()=>{ modal.classList.remove('is-open'); refresh(); toast('Support enregistré.'); });
    });
    const del=document.getElementById('su-del'); if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer ce support ?')) persistDelete('supports',supports,sup.id).then(()=>{ modal.classList.remove('is-open'); refresh(); }); });
  }

  // Document : pièce justificative OU procédure
  function openDocForm(subj, categorie, doc){ doc=doc||{}; categorie=doc.categorie||categorie||'procedure';
    const isPiece=categorie==='piece';
    openModal(doc.id?(isPiece?'Modifier la pièce':'Modifier la procédure'):(isPiece?'Nouvelle pièce justificative':'Nouvelle procédure'));
    const typeOpts=isPiece?PIECE_TYPES:PROC_TYPES;
    const body=[ memberSelect(subj, doc.client_id) ];
    body.push('<div class="sp-form-grid">');
    body.push(fld('dc-type','Type',/*t*/'select',doc.type||typeOpts[0],typeOpts));
    body.push(fld('dc-lib','Libellé / objet','text',doc.libelle));
    if(isPiece){
      body.push(fld('dc-docdate','Date du document','date',doc.date_document?String(doc.date_document).slice(0,10):''));
      body.push(fld('dc-valid','Valide jusqu\'au (laisser vide = règle auto)','date',doc.date_validite?String(doc.date_validite).slice(0,10):''));
    } else {
      body.push(fld('dc-statut','Statut','select',doc.statut||'a_faire',PROC_STATUTS));
      body.push(fld('dc-ech','Échéance / à faire pour','date',doc.date_echeance?String(doc.date_echeance).slice(0,10):''));
      body.push(fld('dc-sign','Date de réalisation','date',doc.date_signature?String(doc.date_signature).slice(0,10):''));
      // enveloppe rattachée
      const cid=doc.client_id||subj.members[0].id; const envs=clientEnvs(cid);
      const opts=[['','(aucune)']].concat(envs.map(e=>[e.id,(e.type||'Enveloppe')+(e.numero?' · '+e.numero:'')]));
      body.push(`<div class="sp-fld"><label>Enveloppe rattachée</label><select id="dc-env">${opts.map(o=>`<option value="${esc(o[0])}" ${String(o[0])===String(doc.enveloppe_id||'')?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`);
    }
    body.push(fld('dc-ref','Référence','text',doc.reference));
    body.push('</div>');
    body.push(fld('dc-notes','Notes','textarea',doc.notes));
    body.push(`<div class="sp-save-bar"><button class="btn btn--solid" id="dc-save">Enregistrer</button>${doc.id?'<button class="btn" id="dc-del" style="border-color:#c0392b;color:#c0392b">Supprimer</button>':''}<span class="sp-save-status" id="dc-status"></span></div>`);
    document.getElementById('ck-modal-body').innerHTML=body.join('');
    document.getElementById('dc-save').addEventListener('click',()=>{
      const payload={ client_id:pickClientId(subj, doc.client_id), categorie, type:val('dc-type'), libelle:val('dc-lib'), reference:val('dc-ref'), notes:val('dc-notes') };
      if(isPiece){ payload.date_document=val('dc-docdate'); payload.date_validite=val('dc-valid'); }
      else { payload.statut=val('dc-statut'); payload.date_echeance=val('dc-ech'); payload.date_signature=val('dc-sign'); payload.enveloppe_id=val('dc-env')||null; }
      (doc.id?persistUpdate('documents',documents,doc.id,payload):persistInsert('documents',documents,payload)).then(()=>{ modal.classList.remove('is-open'); refresh(); toast(isPiece?'Pièce enregistrée.':'Procédure enregistrée.'); });
    });
    const del=document.getElementById('dc-del'); if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer ?')) persistDelete('documents',documents,doc.id).then(()=>{ modal.classList.remove('is-open'); refresh(); }); });
  }

  /* ---------------- IMPORT RELEVÉ PDF ---------------- */
  function importReleve(env){
    if(!env){ toast('Enveloppe introuvable.',true); return; }
    const inp=document.createElement('input'); inp.type='file'; inp.accept='application/pdf,.pdf,.txt';
    inp.addEventListener('change',()=>{ const f=inp.files[0]; if(f) readReleve(f, env); });
    inp.click();
  }
  function readReleve(f, env){
    toast('Lecture du relevé…');
    const reader=new FileReader();
    if(/pdf$/i.test(f.name)||f.type==='application/pdf'){
      reader.onload=()=>extractPdfText(reader.result).then(txt=>reviewReleve(parseReleve(txt), env, f.name)).catch(err=>{ console.warn(err); toast('PDF illisible — saisie manuelle.',true); reviewReleve([], env, f.name); });
      reader.readAsArrayBuffer(f);
    } else { reader.onload=()=>reviewReleve(parseReleve(String(reader.result||'')), env, f.name); reader.readAsText(f); }
  }
  function extractPdfText(buf){ if(!window.pdfjsLib) return Promise.reject('pdfjs absent');
    return pdfjsLib.getDocument({data:buf}).promise.then(doc=>{ const pages=[]; const N=Math.min(doc.numPages,15); const seq=[]; for(let i=1;i<=N;i++) seq.push(i);
      return seq.reduce((pr,i)=>pr.then(()=>doc.getPage(i).then(pg=>pg.getTextContent()).then(tc=>{ pages.push(tc.items.map(it=>it.str).join(' ')); })),Promise.resolve()).then(()=>pages.join('\n')); }); }
  function guessClasse(name){ const n=(name||'').toLowerCase();
    if(/phoenix|ath[ée]na|autocall|structur|phénix|note/.test(n)) return 'Produit structuré';
    if(/etf|ucits|tracker|msci|s&p|index|indiciel/.test(n)) return 'ETF';
    if(/fonds?\s*(en\s*)?euros?|support\s*euro|actif g[ée]n[ée]ral|netissima|s[ée]curit/.test(n)) return 'Fonds euro';
    if(/scpi|opci|immobili|pierre|foncier/.test(n)) return 'Immobilier';
    if(/oblig|bond|taux|crédit|crossover|crps|crd/.test(n)) return 'Obligations';
    if(/private equity|fpci|fcpr|capital invest/.test(n)) return 'Private Equity';
    if(/liquidit|cash|monétaire|espèces/.test(n)) return 'Liquidités';
    if(/action|equity|equities/.test(n)) return 'Actions';
    return 'OPCVM'; }
  // Extraction best-effort : une ligne = ISIN + libellé (avant) + montants (après).
  function parseReleve(txt){
    const T=(txt||'').replace(/ /g,' ');
    const out=[]; const re=/([A-Za-zÀ-ÿ0-9&'’\.\-\/ ]{3,60}?)\s*([A-Z]{2}[A-Z0-9]{9}\d)\s*([0-9 .,%\-]{0,60})/g;
    let m, guard=0;
    while((m=re.exec(T)) && guard<200){ guard++;
      const name=m[1].replace(/\s+/g,' ').trim().replace(/[•·\-–]+$/,'').trim();
      const isin=m[2]; const tail=m[3]||'';
      const nums=(tail.match(/-?\d[\d .]*[,.]?\d*/g)||[]).map(s=>parseFloat(s.replace(/[ ]/g,'').replace(',','.'))).filter(n=>!isNaN(n));
      // heuristique : plus grand nombre = valorisation, nombre juste avant = investi éventuel
      let valo=null, inv=null;
      const big=nums.filter(n=>Math.abs(n)>=100);
      if(big.length){ valo=big[big.length-1]; if(big.length>1) inv=big[big.length-2]; }
      out.push({libelle:name||isin, isin, classe:guessClasse(name), montant_investi:inv, valorisation:valo});
    }
    // dédoublonnage par ISIN
    const seen=new Set(); return out.filter(r=>{ if(seen.has(r.isin)) return false; seen.add(r.isin); return true; });
  }
  function reviewReleve(rows, env, fname){
    openModal('Import du relevé — '+(env.type||'Enveloppe'));
    const head=`<p class="sp-muted sm">${rows.length?`${rows.length} ligne(s) détectée(s) dans « ${esc(fname)} ». Vérifiez / corrigez, puis importez.`:`Aucune ligne détectée automatiquement dans « ${esc(fname)} ». Ajoutez les supports manuellement.`} Les montants alimentent la valorisation de l'enveloppe.</p>`;
    const rowHTML=(r,i)=>`<div class="ck-imp-row" data-i="${i}">
      <input class="imp-lib" placeholder="Libellé" value="${esc(r.libelle||'')}">
      <input class="imp-isin" placeholder="ISIN" value="${esc(r.isin||'')}" style="width:120px">
      <select class="imp-cls">${ASSET_CLASSES.map(c=>`<option ${c===r.classe?'selected':''}>${c}</option>`).join('')}</select>
      <input class="imp-inv" type="number" placeholder="Investi" value="${r.montant_investi!=null?r.montant_investi:''}" style="width:96px">
      <input class="imp-valo" type="number" placeholder="Valo" value="${r.valorisation!=null?r.valorisation:''}" style="width:96px">
      <button class="ck-icon imp-del" title="Retirer">×</button></div>`;
    document.getElementById('ck-modal-body').innerHTML=head
      +`<div class="ck-imp-list" id="ck-imp-list">${rows.map(rowHTML).join('')}</div>`
      +`<div class="ck-imp-foot"><button class="ck-mini-btn" id="imp-add">＋ Ligne</button></div>`
      +`<div class="sp-save-bar"><button class="btn btn--solid" id="imp-save">Importer les supports</button><span class="sp-save-status" id="imp-status"></span></div>`;
    const list=document.getElementById('ck-imp-list');
    const bindDel=()=>list.querySelectorAll('.imp-del').forEach(b=>b.onclick=()=>b.closest('.ck-imp-row').remove());
    bindDel();
    document.getElementById('imp-add').addEventListener('click',()=>{ const div=document.createElement('div'); div.innerHTML=rowHTML({classe:'OPCVM'},'x'); list.appendChild(div.firstChild); bindDel(); });
    document.getElementById('imp-save').addEventListener('click',()=>{
      const proms=[]; list.querySelectorAll('.ck-imp-row').forEach(row=>{
        const lib=row.querySelector('.imp-lib').value.trim(); const isin=row.querySelector('.imp-isin').value.trim().toUpperCase();
        const cls=row.querySelector('.imp-cls').value; const inv=parseFloat(row.querySelector('.imp-inv').value)||null; const valo=parseFloat(row.querySelector('.imp-valo').value)||null;
        if(!lib && !isin) return; proms.push(persistInsert('supports',supports,{enveloppe_id:env.id, libelle:lib||isin, isin:isin||null, classe:cls, montant_investi:inv, valorisation:valo, date_valo:todayStrSp()}));
      });
      if(!proms.length){ toast('Rien à importer.',true); return; }
      Promise.all(proms).then(()=>{ modal.classList.remove('is-open'); refresh(); toast(proms.length+' support(s) importé(s).'); });
    });
  }

  /* ---------------- BRIEF ---------------- */
  function briefLines(d){
    const subj=d.subj, L=[]; const isPole=subj.kind==='pole'; const title=isPole?(subj.pole.nom||'Pôle'):clientName(subj.client);
    L.push({h:'Synthèse patrimoniale'});
    L.push({t:`${title}${isPole?` (pôle, ${d.members.length} membres)`:(isMorale(subj.client)?' (personne morale)':'')} — valorisation totale ${compact(d.valoTotal)} sur ${d.envs.length} enveloppe(s), investi ${compact(d.investiTotal)}, plus/moins-value ${d.plusValue>=0?'+':''}${compact(d.plusValue)} (${perfPct(d.perf)})${d.ytd!=null?`, performance ${perfPct(d.ytd)} YTD`:''}.`});
    if(isPole){ L.push({h:'Membres'}); d.members.forEach(m=>{ const v=clientEnvs(m.id).reduce((s,e)=>s+envValo(e),0); L.push({li:`${clientName(m)}${m.pole_role?' ('+m.pole_role+')':''} : ${compact(v)}`}); }); }
    if(d.envRows.length){ L.push({h:'Enveloppes'}); d.envRows.forEach(r=>L.push({li:`${r.e.type||'Enveloppe'}${r.e.etablissement?' ('+r.e.etablissement+')':''}${isPole&&r.owner?' — '+clientName(r.owner):''} : ${compact(r.valo)}${r.perf!=null?' · '+perfPct(r.perf):''}`})); }
    if(d.classes.length){ const ct=d.classes.reduce((s,x)=>s+x[1],0)||1; L.push({h:'Allocation par classe d\'actif'}); d.classes.forEach(([cl,v])=>L.push({li:`${cl} : ${(v/ct*100).toFixed(0)}%`})); }
    if(d.upcoming.length){ L.push({h:'À l\'ordre du jour — échéances'}); d.upcoming.slice(0,5).forEach(x=>L.push({li:`${fmtShort(x.date)} — ${x.label} (${x.kind}${x.detail?', '+x.detail:''})`})); }
    // pièces non à jour
    const badPieces=[]; d.perMember.forEach(pm=>pm.pieces.forEach(p=>{ if(p.state!=='valide') badPieces.push(`${p.type}${subj.kind==='pole'?' — '+clientName(pm.member):''} (${p.state==='manquant'?'manquant':'à renouveler'})`); }));
    if(badPieces.length){ L.push({h:'Pièces à régulariser'}); badPieces.forEach(x=>L.push({li:x})); }
    // procédures en retard / aujourd'hui / à initier
    const proc=[]; d.perMember.forEach(pm=>{ pm.procs.forEach(p=>{ const b=procBucket(p); if(b==='retard'||b==='aujourdhui') proc.push(`${p.type}${p.libelle?' — '+p.libelle:''} (${b==='retard'?'en retard':'aujourd\'hui'}${p.date_echeance?', '+fmtShort(p.date_echeance):''})`); }); pm.missing.forEach(m=>proc.push(`${m.type}${m.forEnv?' ('+(m.forEnv.type||'')+')':''} (à initier)`)); });
    if(proc.length){ L.push({h:'Procédures à traiter'}); proc.forEach(x=>L.push({li:x})); }
    L.push({h:'Relation & objectifs'});
    const lc=lastContact(subj.ids), nr=nextRdv(subj.ids); const c=isPole?d.members[0]:subj.client;
    L.push({t:`Dernier contact : ${lc?fmtShort(lc):'—'}.${nr?` Prochain RDV : ${fmtShort(nr)}.`:''}`});
    if(c && c.objectifs && c.objectifs.length) L.push({t:`Objectifs : ${Array.isArray(c.objectifs)?c.objectifs.join(', '):c.objectifs}.`});
    if(c && (c.horizon||c.couple_rendement_risque)) L.push({t:`Horizon : ${c.horizon||'—'} · Profil : ${c.couple_rendement_risque||'—'}.`});
    return L;
  }
  function linesToHTML(L,hTag){ let html='',inUl=false; L.forEach(x=>{ if(x.li){ if(!inUl){ html+='<ul>'; inUl=true; } html+=`<li>${esc(x.li)}</li>`; return; } if(inUl){ html+='</ul>'; inUl=false; } if(x.h) html+=`<${hTag}>${esc(x.h)}</${hTag}>`; else html+=`<p>${esc(x.t)}</p>`; }); if(inUl) html+='</ul>'; return html; }
  function briefHTML(d){ return linesToHTML(briefLines(d),'h5'); }
  function briefPlain(d){ const tday=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const title=d.subj.kind==='pole'?(d.subj.pole.nom||'Pôle'):clientName(d.subj.client);
    const out=['BRIEF PRÉ-RDV — '+title, 'La Financière de Rochechouart · '+tday];
    briefLines(d).forEach(x=>{ if(x.h) out.push('', x.h.toUpperCase()); else if(x.li) out.push('  • '+x.li); else out.push(x.t); }); return out.join('\n'); }
  function copyBrief(d){ const txt=briefPlain(d); if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(()=>toast('Brief copié.')).catch(()=>toast('Copie impossible.',true)); } else toast('Presse-papiers indisponible.',true); }
  function openBrief(d){
    const tday=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const title=d.subj.kind==='pole'?(d.subj.pole.nom||'Pôle'):clientName(d.subj.client);
    const body=linesToHTML(briefLines(d),'h2');
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Brief pré-RDV — ${esc(title)} — ${tday}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Jost,Arial,sans-serif;color:#1E211C;padding:46px 54px;max-width:880px;margin:0 auto;font-size:13px;line-height:1.65}
.header{text-align:center;border-bottom:2px solid #A9853F;padding-bottom:22px;margin-bottom:24px}
.header h1{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:23px;font-weight:500}
.header .date{color:#5B6058;font-size:12px;margin-top:6px}
h1.client{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:21px;font-weight:600;margin-bottom:14px}
.summary{background:#f6f4ee;border-radius:10px;padding:18px 24px;margin-bottom:26px;display:flex;gap:30px;flex-wrap:wrap}
.summary .item .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#5B6058}
.summary .item .v{font-size:18px;font-weight:600;color:#001B00;margin-top:3px}.pos{color:#2e7d32}.neg{color:#c0392b}
h2{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:16px;margin:22px 0 7px;font-weight:600;border-bottom:1px solid #e8e6df;padding-bottom:4px}
p{margin:0 0 7px}ul{margin:0 0 7px;padding-left:20px}li{margin-bottom:3px}
.footer{text-align:center;font-size:10px;color:#999;margin-top:38px;border-top:1px solid #e8e6df;padding-top:16px;line-height:1.7}
.print-btn{position:fixed;top:18px;right:18px;background:#A9853F;color:#fff;border:0;padding:11px 22px;border-radius:8px;font-family:Jost;font-size:13px;cursor:pointer}
@media print{.print-btn{display:none}body{padding:20px}}</style></head><body>
<button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
<div class="header"><h1>La Financière de Rochechouart</h1><div class="date">Brief pré-RDV · ${tday}</div></div>
<h1 class="client">${esc(title)}</h1>
<div class="summary">
  <div class="item"><div class="l">Valorisation totale</div><div class="v">${fmtEur(d.valoTotal)}</div></div>
  <div class="item"><div class="l">Investi</div><div class="v">${fmtEur(d.investiTotal)}</div></div>
  <div class="item"><div class="l">Plus/moins-value</div><div class="v ${d.plusValue>=0?'pos':'neg'}">${d.plusValue>=0?'+':''}${fmtEur(d.plusValue)} (${perfPct(d.perf)})</div></div>
  <div class="item"><div class="l">Performance YTD</div><div class="v ${d.ytd!=null&&d.ytd<0?'neg':'pos'}">${d.ytd!=null?perfPct(d.ytd):'—'}</div></div>
</div>
${body}
<div class="footer"><p><strong>La Financière de Rochechouart</strong> · 58 rue de Monceau, 75008 Paris</p><p>Document interne de préparation — Valorisations indicatives, non contractuelles.</p></div>
</body></html>`;
    const w=window.open('','_blank'); if(!w){ toast('Autorisez les pop-ups.',true); return; } w.document.write(html); w.document.close();
  }

  /* ---------------- STATS (en-tête module) ---------------- */
  function renderStats(){
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('stat-clients', crmClients.filter(c=>clientEnvs(c.id).length).length);
    let enc=0; enveloppes.forEach(e=>enc+=envValo(e)); set('stat-encours', compact(enc));
    const tod=today(), in30=addDays(tod,30); let due=0;
    supports.forEach(s=>{ if(s.classe==='Produit structuré' && s.isin && productsMap.has(s.isin)){ const p=productsMap.get(s.isin); if(productStatus(p)!=='LIVE') return; const o=nextObsDate(p); if(o&&o>=tod&&o<=in30) due++; } });
    documents.forEach(d=>{ if(d.categorie!=='piece' && d.statut!=='fait' && d.date_echeance){ const de=pd(d.date_echeance); if(de>=tod&&de<=in30) due++; } });
    set('stat-due', due);
    // dossiers à régulariser : pièce non à jour OU procédure en retard
    let toReg=0; crmClients.forEach(c=>{ const md=clientDocs(c.id);
      const badPiece=pieceChecklist(c,md).some(p=>p.state!=='valide');
      const lateProc=clientProcs(md).some(p=>procBucket(p)==='retard');
      if(clientEnvs(c.id).length && (badPiece||lateProc)) toReg++; });
    set('stat-compliance', toReg);
  }

  /* ---------------- AUTO-LOGIN ---------------- */
  if(sessionStorage.getItem('sb_access_token')){
    document.getElementById('dash-user-email').textContent = sessionStorage.getItem('sb_user_email') || '';
    showDash();
  }

})();
