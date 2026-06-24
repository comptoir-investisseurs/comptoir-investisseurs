/* ===========================================================================
   Suivi des produits structurés — La Financière de Rochechouart
   Book agrégé par produit (sp-data.js, sans données nominatives).
   Allocations détenteurs + persistance optionnelle via Supabase (CRM).
   =========================================================================== */
(function(){
  'use strict';

  /* ---------------- Supabase (optionnel, dégradé proprement) ---------------- */
  const SB = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : '';
  const SB_KEY = (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '';
  const API = SB + '/rest/v1';
  const headers = (extra) => Object.assign({
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + (sessionStorage.getItem('sb_access_token') || SB_KEY),
    'Content-Type': 'application/json'
  }, extra || {});
  let sbProducts = true, sbPositions = true;

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

  /* ---------------- STATE ---------------- */
  const productsMap = new Map();   // isin -> product (agrégé)
  let positions = [];              // allocations détenteurs (CRM / Supabase)
  let crmClients = [];
  let nextLocalId = 900000;

  function seedState(){
    (window.SP_PRODUCTS||[]).forEach(p => { p.uls = p.uls||[]; productsMap.set(p.isin, Object.assign({}, p)); });
    positions = (window.SP_POSITIONS||[]).map(p => Object.assign({_seed:true}, p));
  }

  function init(){
    seedState();
    Promise.resolve()
      .then(loadSbProducts)
      .then(loadSbPositions)
      .then(loadCrm)
      .then(afterLoad)
      .catch(e => { console.warn(e); afterLoad(); });
  }
  function afterLoad(){ buildIsinList(); updateStats(); renderSuggest(); renderPortfolio(); buildReportSelect(); buildOverviewClientSelect(); renderOverview(); }

  function loadSbProducts(){
    if(!SB) return;
    return fetch(API + '/sp_products?select=*', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => { (rows||[]).forEach(r => {
        if(r.deleted){ productsMap.delete(r.isin); return; }
        const p = fromDbProduct(r); productsMap.set(p.isin, Object.assign(productsMap.get(p.isin)||{}, p));
      }); })
      .catch(() => { sbProducts = false; });
  }
  function loadSbPositions(){
    if(!SB) return;
    return fetch(API + '/sp_positions?select=*', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => {
        (rows||[]).forEach(r => {
          const pos = fromDbPosition(r);
          if(pos.seed_id){ positions = positions.filter(x => !(x._seed && x.id===pos.seed_id)); if(pos._deleted) return; }
          positions.push(pos);
        });
      })
      .catch(() => { sbPositions = false; });
  }
  function loadCrm(){
    if(!SB) return;
    return fetch(API + '/clients?select=id,nom,prenom,email,type&order=nom.asc', {headers:headers()})
      .then(r => r.ok ? r.json() : []).then(rows => { crmClients = rows||[]; }).catch(()=>{});
  }

  /* ---------------- DB <-> objet ---------------- */
  function fromDbProduct(r){
    return { isin:r.isin, lib:r.lib, emetteur:r.emetteur, dev:r.dev||'EUR', coupon:r.coupon, freq:r.freq,
      ac:r.ac, bcap:r.bcap, bcpn:r.bcpn, strike:r.strike, emission:r.emission, nextObs:r.next_obs, nextCpn:r.next_cpn,
      finalObs:r.final_obs, maturity:r.maturity, trade:r.trade_date, nominalRef:r.nominal_ref,
      fam:r.fam||'Autre', mem:r.mem, trig:r.trig, trigStep:r.trig_step, trigFreq:r.trig_freq, uls:r.uls||[], _db:true };
  }
  function toDbProduct(p){
    return { isin:p.isin, lib:p.lib, emetteur:p.emetteur, dev:p.dev, coupon:p.coupon, freq:p.freq,
      ac:p.ac, bcap:p.bcap, bcpn:p.bcpn, strike:p.strike, emission:p.emission||null, next_obs:p.nextObs,
      next_cpn:p.nextCpn||null, final_obs:p.finalObs||null, maturity:p.maturity, trade_date:p.trade,
      nominal_ref:p.nominalRef, fam:p.fam, mem:!!p.mem, trig:!!p.trig, trig_step:p.trigStep||null, trig_freq:p.trigFreq||null, uls:p.uls };
  }
  function fromDbPosition(r){
    return { id:r.id, seed_id:r.seed_id, isin:r.isin, prenom:r.prenom, nom:r.nom, pole:r.pole, compte:r.compte,
      vendeur:r.vendeur, nominal:r.nominal, dev:r.dev||'EUR', pxa:r.pxa, pxv:r.pxv, gc:r.gc, gk:r.gk, gt:r.gt,
      gain:r.gain, statut:r.statut, trade:r.trade_date, client_id:r.client_id, _deleted:r.deleted, _db:true };
  }
  function toDbPosition(p){
    return { isin:p.isin, seed_id:p.seed_id||null, prenom:p.prenom, nom:p.nom, pole:p.pole, compte:p.compte,
      vendeur:p.vendeur, nominal:p.nominal, dev:p.dev, pxa:p.pxa, pxv:p.pxv, gc:p.gc, gk:p.gk, gt:p.gt,
      gain:p.gain, statut:p.statut, trade_date:p.trade, client_id:p.client_id||null, deleted:p._deleted||false };
  }

  /* ---------------- HELPERS ---------------- */
  function esc(s){ const d=document.createElement('div'); d.textContent=(s==null)?'':s; return d.innerHTML; }
  function pd(s){ if(!s) return null; if(s instanceof Date) return s; const m=String(s).slice(0,10).split('-'); return m.length===3?new Date(+m[0],+m[1]-1,+m[2]):null; }
  const MONTHS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  function fmtDate(d){ d=pd(d); return d?`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`:'—'; }
  function fmtShort(d){ d=pd(d); return d?`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`:'—'; }
  function pct(v,nd){ if(v==null) return '—'; let s=(v*100).toFixed(nd==null?2:nd); if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,''); return s+'%'; }
  function money(n,dev){ if(n==null) return '—'; return Math.round(n).toLocaleString('fr-FR')+' '+(symbol(dev)); }
  function symbol(d){ return {EUR:'€',USD:'$',CHF:'CHF',GBP:'£'}[d]||'€'; }
  function compact(n){ if(n==null) return '—'; const a=Math.abs(n);
    if(a>=1e6) return (n/1e6).toFixed(1).replace('.',',')+' M€';
    if(a>=1e3) return Math.round(n/1e3)+' k€'; return Math.round(n)+' €'; }
  function today(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function addMonths(d,m){ const x=new Date(d.getFullYear(),d.getMonth()+m,d.getDate()); return x; }
  function addDays(d,n){ const x=pd(d); return new Date(x.getFullYear(),x.getMonth(),x.getDate()+n); }
  function daysBetween(a,b){ return Math.round((pd(b)-pd(a))/86400000); }
  function yearsBetween(a,b){ return (pd(b)-pd(a))/(365.25*86400000); }
  function sameDayOrBefore(a,b){ return pd(a)<=pd(b); }
  function fullName(p){ return ((p.prenom||'')+' '+(p.nom||'')).trim()||'—'; }
  function toast(msg, err){ const t=document.getElementById('sp-toast'); t.textContent=msg; t.className='sp-toast show'+(err?' err':''); setTimeout(()=>t.className='sp-toast',2600); }

  const FREQ_M = {'Trimestrielle':3,'Mensuelle':1,'Semestrielle':6,'Annuelle':12,'Bimestrielle':2,'Journalière':null,'Bullet':null};
  function freqMonths(f){ return (f in FREQ_M)?FREQ_M[f]:3; }
  function freqWord(f){ return ({'Trimestrielle':'trimestre','Mensuelle':'mois','Semestrielle':'semestre','Annuelle':'an','Bimestrielle':'bimestre'})[f]||'période'; }

  function productStatus(p){ if(typeof p==='string') p=productsMap.get(p);
    if(!p) return 'LIVE'; if(p.statut) return p.statut;
    if(p.maturity) return pd(p.maturity) >= today()?'LIVE':'DONE'; return 'LIVE'; }
  // familles « income » sans coupon périodique garanti (coupon versé au rappel)
  function isAthena(p){ return p.fam==='Athéna' || p.fam==='Athénix'; }

  const FX={EUR:1,USD:0.92,CHF:1.04,GBP:1.17};
  function toEur(n,dev){ return n==null?null:n*(FX[dev]||1); }

  // palette « camaïeu » LFDR : verts, or, terre — une couleur par sous-jacent
  const UL_COLORS=['#1f4d2e','#A9853F','#5b7d6a','#356a78','#9c6b3f'];
  function ulColor(i){ return UL_COLORS[i%UL_COLORS.length]; }
  // couleurs cohérentes des barrières (chart + jauge + chips)
  const BARC={strike:'#9a978f', ac:'#A9853F', cpn:'#3f6b4a', cap:'#b04a32'};

  /* ---------------- SIMULATEUR DE COURS (déterministe par sous-jacent) ---------------- */
  const EPOCH = new Date(2018,0,1);
  const seriesCache = new Map();
  function hashStr(s){ let h=2166136261>>>0; s=String(s||''); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function masterSeries(name){
    if(seriesCache.has(name)) return seriesCache.get(name);
    const seed = hashStr(name); const rnd = mulberry32(seed);
    const vol = 0.14 + (seed%13)/100;
    const mu  = 0.00 + ((seed>>5)%10)/100;
    const dt = 1/365, sq = Math.sqrt(dt);
    const end = today(); let price = 100; const pts=[];
    let g2=null;
    function gauss(){ if(g2!=null){ const v=g2; g2=null; return v; } const u1=Math.max(rnd(),1e-9),u2=rnd();
      const r=Math.sqrt(-2*Math.log(u1)); g2=r*Math.sin(2*Math.PI*u2); return r*Math.cos(2*Math.PI*u2); }
    for(let d=new Date(EPOCH); d<=end; d.setDate(d.getDate()+1)){
      const ret = (mu - vol*vol/2)*dt + vol*sq*gauss();
      price *= Math.exp(ret);
      pts.push({t:d.getTime(), p:price});
    }
    seriesCache.set(name, pts); return pts;
  }
  function rebasedSeries(name, strikeDate, endDate, target){
    const ms = masterSeries(name);
    const s0 = pd(strikeDate)?pd(strikeDate).getTime():EPOCH.getTime();
    const e0 = (pd(endDate)?pd(endDate).getTime():today().getTime());
    let base=null; const out=[];
    for(const pt of ms){
      if(pt.t < s0) continue;
      if(base==null) base = pt.p;
      if(pt.t > e0) break;
      out.push({t:pt.t, v: pt.p/base*100});
    }
    if(!out.length) out.push({t:s0, v:100});
    if(target!=null && out.length>1){
      const t0=out[0].t, tN=out[out.length-1].t, vN=out[out.length-1].v, span=(tN-t0)||1;
      const k=Math.log(target/vN);
      for(const r of out){ r.v = r.v*Math.exp(k*(r.t-t0)/span); }
    }
    return out;
  }
  function gaussSeed(seed){ const r=mulberry32(seed); const u1=Math.max(r(),1e-9),u2=r(); return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2); }
  function targetLevel(p, name){
    const g = gaussSeed(hashStr((p.isin||'')+'|'+name));
    const done = productStatus(p)==='DONE';
    const T = done ? 100*Math.exp(0.10*g+0.05) : 100*Math.exp(0.12*g-0.015);
    return Math.max(58, Math.min(146, T));
  }

  /* ---------------- CALENDRIER D'OBSERVATIONS ---------------- */
  // Liste des dates d'observation périodiques (strike -> maturité).
  function observationDates(p){
    const sd=pd(p.strike), mat=pd(p.maturity); const m=freqMonths(p.freq);
    if(!sd||!mat||!m) return mat?[mat]:[];
    const out=[]; let d=addMonths(sd,m), guard=0;
    while(d<=addDays(mat,4) && guard<400){ out.push(new Date(d)); d=addMonths(d,m); guard++; }
    if(!out.length) out.push(new Date(mat));
    return out;
  }
  // Date de rappel estimée pour un produit soldé : dernière observation passée.
  function callDate(p){
    if(productStatus(p)!=='DONE') return null;
    const obs=observationDates(p), tod=today(); let c=null;
    for(const o of obs){ if(o<=tod) c=o; else break; }
    if(!c){ const no=pd(p.nextObs); c = (no && no<tod)?no:(obs[0]||pd(p.maturity)); }
    const mat=pd(p.maturity); if(mat && c>mat) c=mat;
    return c;
  }
  // Fin de vie « graphique » : aujourd'hui (vivant) ou date de rappel (soldé).
  function lifeEnd(p){ const cd=callDate(p); if(cd) return cd; const mat=pd(p.maturity); const t=today(); return (mat&&mat<t)?mat:t; }
  // Dégressivité du seuil autocall (Trigger Descending) : décrément + fréquence.
  function trigStepOf(p){ return p.trigStep!=null?p.trigStep:0.05; }      // défaut -5 %
  function trigFreqOf(p){ return p.trigFreq||'Annuelle'; }                // défaut /an
  // Seuil autocall à une observation k (0-based), avec dégressivité éventuelle.
  function trigAt(p,k){
    if(p.ac==null) return null;
    if(!p.trig) return p.ac;
    const obsM=freqMonths(p.freq)||3, decM=freqMonths(trigFreqOf(p))||12;
    const nDec=Math.floor((k*obsM)/decM);
    const floor=(p.bcpn!=null?p.bcpn:0.6);
    return Math.max(floor, +(p.ac - trigStepOf(p)*nDec).toFixed(4));
  }
  // Calendrier unifié : une entrée par observation.
  function genSchedule(p){
    const obs=observationDates(p); if(!obs.length) return [];
    const m=freqMonths(p.freq);
    const couponPer=(p.coupon!=null&&m)?p.coupon*m/12:p.coupon;
    const status=productStatus(p), cd=callDate(p), tod=today();
    const rows=obs.map((date,k)=>{
      const r={date:new Date(date), pay:addDays(date,7), k, coupon:couponPer, bcpn:p.bcpn,
               ac:trigAt(p,k), idx:k};
      if(status==='DONE' && cd){
        if(Math.abs(daysBetween(date,cd))<=20 && date<=addDays(cd,20)){ r.status='called'; }
        else if(date<cd){ r.status='paid'; }
        else { r.status='after'; }
      } else {
        r.status = date<=tod ? 'paid' : 'future';
      }
      return r;
    }).filter(r=>r.status!=='after');
    if(status==='LIVE'){ const nx=rows.find(r=>r.status==='future'); if(nx) nx.status='next'; }
    return rows;
  }

  /* ---------------- TABS ---------------- */
  let activeTab='apercu';
  document.querySelectorAll('.dash-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      activeTab=btn.dataset.tab;
      document.querySelectorAll('.dash-tab').forEach(b=>b.classList.toggle('is-active',b===btn));
      document.querySelectorAll('.dash-view').forEach(v=>v.classList.remove('is-active'));
      const view=document.getElementById('view-'+activeTab); if(view) view.classList.add('is-active');
      if(activeTab==='portefeuille') renderPortfolio();
      if(activeTab==='reporting') renderReport();
      if(activeTab==='apercu') renderOverview();
    });
  });

  function liveProducts(){ return Array.from(productsMap.values()).filter(p=>productStatus(p)==='LIVE'); }
  function updateStats(){
    document.getElementById('stat-products').textContent = productsMap.size;
    const live=liveProducts();
    document.getElementById('stat-live').textContent = live.length;
    const enc=live.reduce((s,p)=>s+(toEur(p.nomLive!=null?p.nomLive:p.nominalRef,p.dev)||0),0);
    document.getElementById('stat-encours').textContent = compact(enc);
    const tod=today(), in30=addDays(tod,30); let cnt=0;
    live.forEach(p=>{ const sch=genSchedule(p); if(sch.some(r=>(r.status==='next'||r.status==='future') && r.date>=tod && r.date<=in30)) cnt++; });
    document.getElementById('stat-obs').textContent = cnt;
    const pf=document.getElementById('tab-count-pf'); if(pf) pf.textContent = productsMap.size;
  }

  /* ===================================================================
     ONGLET 1 — SUIVI PRODUIT
     =================================================================== */
  const searchInput=document.getElementById('sp-search');
  document.getElementById('sp-search-btn').addEventListener('click',()=>doSearch(searchInput.value));
  searchInput.addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(searchInput.value); });
  searchInput.addEventListener('change',()=>{ if(productsMap.has(searchInput.value.trim().toUpperCase())) doSearch(searchInput.value); });

  function buildIsinList(){
    const dl=document.getElementById('sp-isin-list');
    dl.innerHTML = Array.from(productsMap.values()).slice(0,1500)
      .map(p=>`<option value="${esc(p.isin)}">${esc(p.lib||'')}</option>`).join('');
  }
  function renderSuggest(){
    const box=document.getElementById('sp-suggest');
    const live=liveProducts().filter(p=>p.uls && p.uls.length);
    box.innerHTML = live.slice(0,6).map(p=>`<button data-isin="${esc(p.isin)}">${esc((p.fam||'')+' · '+(p.uls.map(u=>u.n).slice(0,2).join(', ')))}</button>`).join('');
    box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>doSearch(b.dataset.isin)));
  }
  function findProduct(q){
    q=(q||'').trim(); if(!q) return null;
    const up=q.toUpperCase();
    if(productsMap.has(up)) return productsMap.get(up);
    const ql=q.toLowerCase(); let best=null;
    for(const p of productsMap.values()){
      if((p.isin||'').toUpperCase()===up) return p;
      const hay=((p.isin||'')+' '+(p.lib||'')+' '+(p.uls||[]).map(u=>u.n).join(' ')+' '+(p.emetteur||'')).toLowerCase();
      if(hay.includes(ql)){ best=best||p; }
    }
    return best;
  }
  let currentProduct=null, chartState=null;
  function doSearch(q){
    const p=findProduct(q);
    if(!p){ toast('Aucun produit trouvé pour « '+q+' »', true); return; }
    searchInput.value=p.isin; renderProduct(p);
  }

  function renderProduct(p){
    currentProduct=p;
    document.getElementById('sp-product-empty').hidden=true;
    const box=document.getElementById('sp-product'); box.hidden=false;
    const status=productStatus(p);
    const uls=(p.uls||[]);
    const sch=genSchedule(p);
    box.innerHTML = `
      <div class="sp-phead">
        <div class="sp-phead__top">
          <div class="sp-phead__badges">
            <span class="sp-badge fam">${esc(p.fam||'Structuré')}</span>
            <span class="sp-badge ${status==='LIVE'?'live':'done'}">${status==='LIVE'?'En cours':'Soldé'}</span>
            ${p.ac!=null?`<span class="sp-badge">Autocall ${pct(p.ac,0)}${p.trig?' ↓':''}</span>`:''}
            ${p.mem?`<span class="sp-badge">Mémoire</span>`:''}
            ${p.trig?`<span class="sp-badge">Trigger dégressif</span>`:''}
            <span class="sp-badge">${esc(p.dev||'EUR')}</span>
          </div>
          <div class="sp-phead__search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M21 21l-5-5"/></svg>
            <input id="sp-search-mini" list="sp-isin-list" placeholder="Autre ISIN / produit…" autocomplete="off">
          </div>
        </div>
        <h2 class="sp-phead__name">${esc(p.lib||p.isin)}</h2>
        <div class="sp-phead__meta">
          <span>ISIN <b class="sp-phead__isin">${esc(p.isin)}</b></span>
          <span>Émetteur <b>${esc(p.emetteur||'—')}</b></span>
          <span>Strike <b>${fmtShort(p.strike)}</b></span>
          <span>Échéance <b>${fmtShort(p.maturity)}</b></span>
          <span>Coupon <b>${p.coupon!=null?pct(p.coupon,2)+'/an':'—'}</b></span>
        </div>
        ${allocBarHTML(p)}
      </div>

      <div class="sp-grid">
        <div class="sp-col-main">
          <div class="sp-card sp-chart-card">
            <h4>Évolution des sous-jacents <span class="sp-h4-note">— base 100 au strike${status==='LIVE'?', courbe arrêtée à ce jour':''}</span></h4>
            ${uls.length?`
            <div class="sp-canvas-box"><canvas id="sp-chart"></canvas><div class="sp-chart-tip" id="sp-tip"></div></div>
            <div class="sp-chart-legend" id="sp-legend"></div>
            `:'<p class="sp-muted">Aucun sous-jacent renseigné pour ce produit.</p>'}
          </div>
          ${uls.length?`<div class="sp-card sp-bar-card">
            <h4>Niveau vs barrières <span class="sp-h4-note" id="sp-worst-inline"></span></h4>
            <div id="sp-barriers" class="sp-barriers"></div>
          </div>`:''}
        </div>

        <div class="sp-card sp-cond-card">
          <h4>Conditions & caractéristiques</h4>
          ${conditionsHTML(p)}
        </div>
        <div class="sp-card sp-cal-card">
          <h4>Calendrier</h4>
          ${scheduleHTML(p, sch)}
        </div>
      </div>`;

    const sb=document.querySelector('.sp-searchbar'); if(sb) sb.hidden=true;
    const mini=document.getElementById('sp-search-mini');
    if(mini){ mini.addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(mini.value); });
      mini.addEventListener('change',()=>{ if(productsMap.has(mini.value.trim().toUpperCase())) doSearch(mini.value); }); }
    bindCalTabs();
    if(uls.length){ setTimeout(()=>{ drawChart(p); renderBarriers(p); syncCalHeight(); },20); }
    else { setTimeout(syncCalHeight,20); }
    bindAlloc(p);
  }

  /* ---- barre d'allocation (compacte) ---- */
  function allocBarHTML(p){
    const allocs=positions.filter(x=>x.isin===p.isin && !x._deleted);
    const chips=allocs.slice(0,6).map(a=>`<span class="sp-alloc-chip"><b>${esc(fullName(a))}</b> · ${compact(a.nominal)}<i class="x" data-del="${a.id}" title="Retirer">×</i></span>`).join('');
    const more=allocs.length>6?`<span class="sp-alloc-chip more">+${allocs.length-6}</span>`:'';
    return `<div class="sp-alloc-bar">
      <span class="lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0119 7"/></svg>Détenteurs</span>
      <div class="sp-alloc-chips">${chips||'<span class="sp-alloc-empty">Aucune allocation</span>'}${more}</div>
      <button class="add" id="sp-alloc-add">＋ Allouer</button>
    </div>`;
  }
  function bindAlloc(p){
    const add=document.getElementById('sp-alloc-add');
    if(add) add.addEventListener('click',()=>openAlloc(p));
    document.querySelectorAll('#sp-product [data-del]').forEach(x=>x.addEventListener('click',()=>{
      const id=x.dataset.del; const pos=positions.find(z=>String(z.id)===String(id)); if(pos) removePosition(pos).then(()=>renderProduct(p));
    }));
  }

  /* ---- conditions : organisées par groupe ---- */
  function cell(k,v,cls){ return `<div class="sp-kv ${cls||''}"><div class="k">${k}</div><div class="v">${v}</div></div>`; }
  function grp(title, cells){ cells=cells.filter(Boolean); if(!cells.length) return ''; return `<div class="sp-kv-sub">${title}</div><div class="sp-kv-grid">${cells.join('')}</div>`; }
  function conditionsHTML(p){
    const m=freqMonths(p.freq);
    const couponPer=(p.coupon!=null&&m)?p.coupon*m/12:p.coupon;
    const status=productStatus(p);
    const rendement=grp('Rendement',[
      cell('Coupon annuel', p.coupon!=null?`<span class="hi">${pct(p.coupon,2)}</span>`:'—'),
      cell('Par '+freqWord(p.freq), couponPer!=null?pct(couponPer,3):'—'),
      cell('Fréquence', esc(p.freq||'—')),
      cell('Mémoire', p.mem?'Oui':'Non'),
    ]);
    const barrieres=grp('Barrières & autocall',[
      cell('Barrière capital', p.bcap!=null?pct(p.bcap,0):'—'),
      cell('Barrière coupon', p.bcpn!=null?pct(p.bcpn,0):'—'),
      cell('Seuil autocall', p.ac!=null?pct(p.ac,0):'—'),
      p.trig?cell('Dégressivité', '−'+pct(trigStepOf(p),2)+' / '+freqWord(trigFreqOf(p))):'',
    ]);
    const dates=grp('Dates',[
      cell('Strike', fmtShort(p.strike)),
      cell('Émission', fmtShort(p.emission)),
      cell('Constatation finale', fmtShort(p.finalObs)),
      cell('Échéance', fmtShort(p.maturity)),
      cell('Prochaine obs.', status==='LIVE'?fmtShort(p.nextObs):'—'),
      cell('Prochain coupon', status==='LIVE'?fmtShort(p.nextCpn||p.nextObs):'—'),
    ]);
    const carac=grp('Caractéristiques',[
      cell('Famille', esc(p.fam||'—')),
      cell('Émetteur', esc(p.emetteur||'—')),
      cell('Devise', esc(p.dev||'EUR')),
      cell('Nominal unitaire', money(1000,p.dev)),
      p.nomTot!=null?cell('Taille book', compact(toEur(p.nomTot,p.dev))):'',
      p.cpnPercus!=null?cell('Coupons perçus', compact(toEur(p.cpnPercus,p.dev))):'',
    ]);
    return rendement+barrieres+dates+carac;
  }

  function currentLevels(p){
    const uls=(p.uls||[]); const end=lifeEnd(p);
    const levels = uls.map(u=>{ const s=rebasedSeries(u.n,p.strike,end,targetLevel(p,u.n)); return s.length?s[s.length-1].v:null; });
    let worst=null,wi=-1; levels.forEach((l,i)=>{ if(l!=null&&(worst==null||l<worst)){worst=l;wi=i;} });
    return {levels, worst, wi};
  }

  /* ---- barrières (compact) ---- */
  function renderBarriers(p){
    const host=document.getElementById('sp-barriers'); if(!host) return;
    const cur=currentLevels(p); const uls=(p.uls||[]);
    const worstName = cur.wi>=0?uls[cur.wi].n:'—';
    const inline=document.getElementById('sp-worst-inline');
    if(inline) inline.textContent = cur.worst!=null?`— pire : ${worstName} ${cur.worst.toFixed(1)}%`:'';
    const bars=[];
    if(p.ac!=null)  bars.push({name:'Autocall', lvl:p.ac*100, color:BARC.ac});
    if(p.bcpn!=null)bars.push({name:'Coupon', lvl:p.bcpn*100, color:BARC.cpn});
    if(p.bcap!=null)bars.push({name:'Capital', lvl:p.bcap*100, color:BARC.cap});
    const w=cur.worst==null?100:cur.worst;
    const lo=Math.min(40, ...bars.map(b=>b.lvl-8), w-8), hi=Math.max(125, w+8);
    const posPct=v=>Math.max(2,Math.min(98,(v-lo)/((hi-lo)||1)*100));
    // jauge épurée : ticks colorés sans texte (les valeurs sont dans les chips dessous)
    const ticks=bars.map(b=>`<div class="sp-g-bar" style="left:${posPct(b.lvl)}%;background:${b.color}" title="${b.name} ${b.lvl.toFixed(0)}%"></div>`).join('');
    host.innerHTML=`
      <div class="sp-gauge">
        <div class="sp-g-track"></div>
        ${ticks}
        <div class="sp-g-cur" style="left:${posPct(w)}%"><i></i><b>${w.toFixed(1)}%</b></div>
        <div class="sp-g-scale"><span>${lo.toFixed(0)}%</span><span>strike 100%</span><span>${hi.toFixed(0)}%</span></div>
      </div>
      <div class="sp-bar-dist">${bars.map(b=>{ const d=w-b.lvl; const sev=d>12?'safe':(d>0?'warn':'danger');
        return `<span class="sp-dist ${sev}"><i style="background:${b.color}"></i>${b.name} ${b.lvl.toFixed(0)}% <b>${d>=0?'+':''}${d.toFixed(1)} pts</b></span>`; }).join('')}</div>`;
  }

  /* ---- calendrier : coupons + autocalls séparés ---- */
  function statusChip(st){
    if(st==='paid') return '<span class="sp-st st-paid">Constaté</span>';
    if(st==='called') return '<span class="sp-st st-called">Rappel</span>';
    if(st==='next') return '<span class="sp-st st-next">Prochaine</span>';
    return '<span class="sp-st st-future">À venir</span>';
  }
  function calTable(rows, kind, p){
    if(!rows.length) return '';
    const head = kind==='coupon'
      ? `<tr><th>Constatation</th><th>Paiement</th><th class="num">Barrière</th><th class="num">Coupon</th><th>Statut</th></tr>`
      : `<tr><th>Constatation</th><th>Paiement</th><th class="num">Seuil${p.trig?' ↓':''}</th><th>Statut</th></tr>`;
    const body=rows.map(r=>{
      const cpn = r.coupon!=null?pct(r.coupon,3):'—';
      if(kind==='coupon') return `<tr class="r-${r.status}"><td>${fmtShort(r.date)}</td><td>${fmtShort(r.pay)}</td><td class="num">${r.bcpn!=null?pct(r.bcpn,0):'—'}</td><td class="num">${r.status==='paid'||r.status==='called'?cpn:'<span class="muted">'+cpn+'</span>'}</td><td>${statusChip(r.status)}</td></tr>`;
      return `<tr class="r-${r.status}"><td>${fmtShort(r.date)}</td><td>${fmtShort(r.pay)}</td><td class="num">${r.ac!=null?pct(r.ac,0):'—'}</td><td>${statusChip(r.status)}</td></tr>`;
    }).join('');
    return `<table class="sp-cal">${head}${body}</table>`;
  }
  function scheduleHTML(p, sch){
    if(!sch.length) return '<p class="sp-muted">Calendrier indisponible (dates manquantes).</p>';
    const showCoupons = !isAthena(p) && p.coupon!=null;
    const showAutocall = p.ac!=null;
    const tabs=[], panes=[];
    if(showCoupons){
      tabs.push(`<button class="sp-cal-tab is-active" data-pane="cpn">Coupons${p.mem?' · mémoire':''}</button>`);
      panes.push(`<div class="sp-cal-pane is-active" data-pane="cpn">${calTable(sch,'coupon',p)}</div>`);
    }
    if(showAutocall){
      const a=showCoupons?'':' is-active';
      tabs.push(`<button class="sp-cal-tab${a}" data-pane="ac">Autocalls${p.trig?' ↓':''}</button>`);
      panes.push(`<div class="sp-cal-pane${a}" data-pane="ac">${calTable(sch,'autocall',p)}</div>`);
    }
    if(!panes.length){
      tabs.push(`<button class="sp-cal-tab is-active" data-pane="cpn">Coupons</button>`);
      panes.push(`<div class="sp-cal-pane is-active" data-pane="cpn">${calTable(sch,'coupon',p)}</div>`);
    }
    const bar = tabs.length>1?`<div class="sp-cal-tabs">${tabs.join('')}</div>`:'';
    return `${bar}<div class="sp-cal-scroll">${panes.join('')}</div>`;
  }
  function bindCalTabs(){
    const card=document.querySelector('.sp-cal-card'); if(!card) return;
    card.querySelectorAll('.sp-cal-tab').forEach(b=>b.addEventListener('click',()=>{
      const pane=b.dataset.pane;
      card.querySelectorAll('.sp-cal-tab').forEach(x=>x.classList.toggle('is-active',x===b));
      card.querySelectorAll('.sp-cal-pane').forEach(x=>x.classList.toggle('is-active',x.dataset.pane===pane));
    }));
  }
  // Cale la hauteur du calendrier sur celle des conditions : bords bas alignés,
  // molette interne si le calendrier dépasse (sans gonfler la fiche).
  function syncCalHeight(){
    const cond=document.querySelector('.sp-cond-card');
    const calCard=document.querySelector('.sp-cal-card');
    if(!cond||!calCard) return;
    const scroll=calCard.querySelector('.sp-cal-scroll'); if(!scroll) return;
    if(window.innerWidth<=1240){ scroll.style.maxHeight=''; return; }   // layout empilé
    // 1) on « réduit » le calendrier pour qu'il ne gonfle plus la rangée
    scroll.style.maxHeight='60px';
    const _cs=getComputedStyle(calCard);
    const chrome=(scroll.getBoundingClientRect().top-calCard.getBoundingClientRect().top)+parseFloat(_cs.paddingBottom||0);            // h4 + onglets + paddings
    // 2) hauteur cible = hauteur naturelle de la rangée (conditions / graphe)
    const rowH=cond.offsetHeight;
    // 3) le calendrier remplit cette hauteur (molette si plus long)
    scroll.style.maxHeight=Math.max(160, rowH - chrome)+'px';
    // la rangée a pu changer de hauteur : on redessine le graphe à la bonne taille
    if(chartState) requestAnimationFrame(paint);
  }

  /* ---- graphique multi-séries ---- */
  function drawChart(p){
    const canvas=document.getElementById('sp-chart'); if(!canvas) return;
    const uls=(p.uls||[]);
    const end=lifeEnd(p);
    const series = uls.map((u,i)=>({name:u.n, color:ulColor(i), pts:rebasedSeries(u.n,p.strike,end,targetLevel(p,u.n)), on:true}));
    const obs=observationDates(p).map(d=>d.getTime());
    chartState={p, series, range:'max', hover:-1, showObs:true, obs};

    const leg=document.getElementById('sp-legend');
    leg.innerHTML = series.map((s,i)=>`<span class="sp-leg" data-i="${i}"><span class="ln" style="background:${s.color}"></span><b>${esc(s.name)}</b></span>`).join('')
      + `<span class="sp-leg" data-i="obs"><span class="ln dotted"></span><b>Observations</b></span>`
      + `<span class="sp-rangebtns">${['1A','3A','Max'].map(r=>`<button data-r="${r}" class="${r==='Max'?'on':''}">${r}</button>`).join('')}</span>`;
    leg.querySelectorAll('.sp-leg[data-i]').forEach(el=>el.addEventListener('click',()=>{
      const id=el.dataset.i;
      if(id==='obs'){ chartState.showObs=!chartState.showObs; el.classList.toggle('off',!chartState.showObs); }
      else { const s=series[+id]; s.on=!s.on; el.classList.toggle('off',!s.on); }
      paint();
    }));
    leg.querySelectorAll('.sp-rangebtns button').forEach(b=>b.addEventListener('click',()=>{
      leg.querySelectorAll('.sp-rangebtns button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
      chartState.range=b.dataset.r; paint();
    }));

    const ro=()=>{ paint(); syncCalHeight(); };
    window.removeEventListener('resize', chartState._ro||(()=>{}));
    chartState._ro=ro; window.addEventListener('resize', ro);
    paint();

    canvas.onmousemove=function(e){ const br=canvas.getBoundingClientRect(); chartState.hover=(e.clientX-br.left); paint(); };
    canvas.onmouseleave=function(){ chartState.hover=-1; const tip=document.getElementById('sp-tip'); if(tip) tip.style.opacity=0; paint(); };
  }
  function rangeStart(range){
    const t=today();
    if(range==='1A') return addMonths(t,-12).getTime();
    if(range==='3A') return addMonths(t,-36).getTime();
    return 0;
  }
  function paint(){
    if(!chartState) return;
    const {p, series} = chartState;
    const canvas=document.getElementById('sp-chart'); if(!canvas) return;
    const tip=document.getElementById('sp-tip');
    const dpr=window.devicePixelRatio||1;
    const box=canvas.parentElement, rect=box.getBoundingClientRect();
    const w=rect.width; let h=rect.height; if(!h||h<200) h=262;
    canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=w+'px'; canvas.style.height=h+'px';
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const pad={t:14,r:52,b:24,l:14};
    const x0=pad.l, x1=w-pad.r, y0=pad.t, y1=h-pad.b;

    const status=productStatus(p);
    const rs=rangeStart(chartState.range);
    const visible=series.filter(s=>s.on);

    // domaine x : strike -> maturité (vivant, laisse un espace à droite) ou date de rappel (soldé, touche le bord)
    const tStrike=pd(p.strike)?pd(p.strike).getTime():rs;
    const tmin=Math.max(rs, tStrike);
    const tMat=pd(p.maturity)?pd(p.maturity).getTime():today().getTime();
    const tEnd=lifeEnd(p).getTime();
    let tmax = status==='DONE' ? tEnd : tMat;
    if(tmax<=tmin) tmax=tmin+86400000;

    const allPts=[]; visible.forEach(s=>s.pts.forEach(pt=>{ if(pt.t>=tmin) allPts.push(pt.v); }));
    const barr=[100]; if(p.ac!=null)barr.push(p.ac*100); if(p.bcpn!=null)barr.push(p.bcpn*100); if(p.bcap!=null)barr.push(p.bcap*100);
    let lo=Math.min(...allPts, ...barr), hi=Math.max(...allPts, ...barr);
    if(!isFinite(lo)){lo=50;hi=120;} const padR=(hi-lo)*0.08||5; lo-=padR; hi+=padR;

    const sx=t=>x0+(x1-x0)*((t-tmin)/((tmax-tmin)||1));
    const sy=v=>y1-(y1-y0)*((v-lo)/((hi-lo)||1));
    const tToday=today().getTime();

    // zone « vie restante » (vivant) : de aujourd'hui à maturité
    if(status==='LIVE' && tToday<tmax){
      ctx.fillStyle='rgba(169,133,63,.05)'; ctx.fillRect(sx(Math.max(tToday,tmin)),y0,x1-sx(Math.max(tToday,tmin)),y1-y0);
    }

    // grille horizontale
    ctx.font='10px Jost,sans-serif'; ctx.textBaseline='middle';
    for(let i=0;i<=4;i++){ const v=lo+(hi-lo)*i/4; const y=sy(v);
      ctx.strokeStyle='#eee8da'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
      ctx.fillStyle='#a8a496'; ctx.textAlign='left'; ctx.fillText(v.toFixed(0)+'%', x1+6, y); }

    // lignes de barrière (couleurs cohérentes + labels décalés pour éviter les chevauchements)
    const blines=[{v:1,col:BARC.strike,t:'Strike 100%'}];
    if(p.ac!=null) blines.push({v:p.ac,col:BARC.ac,t:'Autocall '+(p.ac*100).toFixed(0)+'%'});
    if(p.bcpn!=null) blines.push({v:p.bcpn,col:BARC.cpn,t:'Coupon '+(p.bcpn*100).toFixed(0)+'%'});
    if(p.bcap!=null) blines.push({v:p.bcap,col:BARC.cap,t:'Capital '+(p.bcap*100).toFixed(0)+'%'});
    blines.forEach(b=>{ const y=sy(b.v*100); ctx.strokeStyle=b.col; ctx.lineWidth=1.2; ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); ctx.setLineDash([]); });
    ctx.font='600 9px Jost,sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
    const lbl=blines.map(b=>({col:b.col,t:b.t,y:sy(b.v*100)})).sort((a,b)=>a.y-b.y);
    let lastY=-1e9; lbl.forEach(b=>{ let ly=b.y-7; if(ly-lastY<11) ly=lastY+11; lastY=ly; ctx.fillStyle=b.col; ctx.fillText(b.t, x0+3, ly); });

    // droites verticales d'observation (pointillés)
    if(chartState.showObs){
      ctx.setLineDash([2,4]);
      chartState.obs.forEach(t=>{ if(t<tmin||t>tmax) return; const x=sx(t); const past=t<=tToday;
        ctx.strokeStyle=past?'rgba(120,116,104,.30)':'rgba(169,133,63,.55)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke(); });
      ctx.setLineDash([]);
    }
    // axe x (années)
    ctx.fillStyle='#a8a496'; ctx.font='10px Jost,sans-serif'; ctx.textAlign='center';
    const span=tmax-tmin; const yStep= span>3*31536000000?12:(span>31536000000?6:3);
    let dd=new Date(tmin); dd.setDate(1);
    for(let g=0;g<80;g++){ const t=dd.getTime(); if(t>tmax) break; if(t>=tmin){ const x=sx(t);
      ctx.fillText((dd.getMonth()===0?dd.getFullYear():MONTHS[dd.getMonth()].replace('.','')), x, y1+13); }
      dd=addMonths(dd,yStep); }

    // ligne « aujourd'hui »
    if(status==='LIVE' && tToday>=tmin && tToday<=tmax){ const x=sx(tToday);
      ctx.strokeStyle='rgba(11,31,18,.45)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke();
      ctx.fillStyle='#0b1f12'; ctx.font='600 9px Jost,sans-serif'; ctx.textAlign='center'; ctx.fillText('aujourd\'hui', x, y0+2+5); }

    function drawSeries(pts,col,width,fill){
      const vis=pts.filter(pt=>pt.t>=tmin); if(vis.length<2) return;
      if(fill){ const grad=ctx.createLinearGradient(0,y0,0,y1); grad.addColorStop(0,col+'22'); grad.addColorStop(1,col+'02');
        ctx.beginPath(); ctx.moveTo(sx(vis[0].t),y1); vis.forEach(pt=>ctx.lineTo(sx(pt.t),sy(pt.v))); ctx.lineTo(sx(vis[vis.length-1].t),y1); ctx.closePath(); ctx.fillStyle=grad; ctx.fill(); }
      ctx.beginPath(); vis.forEach((pt,i)=>{ const X=sx(pt.t),Y=sy(pt.v); i?ctx.lineTo(X,Y):ctx.moveTo(X,Y); });
      ctx.strokeStyle=col; ctx.lineWidth=width; ctx.lineJoin='round'; ctx.stroke();
    }
    visible.forEach(s=>drawSeries(s.pts,s.color,1.8,false));

    // points de fin
    visible.forEach(s=>{ const vis=s.pts.filter(pt=>pt.t>=tmin); if(!vis.length)return; const last=vis[vis.length-1];
      ctx.beginPath(); ctx.arc(sx(last.t),sy(last.v),3.4,0,7); ctx.fillStyle=s.color; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.4; ctx.stroke(); });

    // hover
    if(chartState.hover>=0){
      const tHov=tmin+(chartState.hover-x0)/((x1-x0)||1)*(tmax-tmin);
      if(tHov>=tmin && tHov<=tEnd){
        const x=sx(tHov);
        ctx.strokeStyle='rgba(0,27,0,.18)'; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke(); ctx.setLineDash([]);
        const rows=[]; let nearestDate=null;
        visible.forEach(s=>{ const vis=s.pts.filter(pt=>pt.t>=tmin); if(!vis.length)return;
          let nb=vis[0],md=Infinity; vis.forEach(pt=>{const d=Math.abs(pt.t-tHov); if(d<md){md=d;nb=pt;}}); nearestDate=nb.t;
          ctx.beginPath(); ctx.arc(sx(nb.t),sy(nb.v),4,0,7); ctx.fillStyle=s.color; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
          rows.push(`<div class="r"><span>${esc(s.name)}</span><span class="v" style="color:#fff">${nb.v.toFixed(1)}%</span></div>`); });
        if(tip){ tip.innerHTML=`<div class="d">${fmtShort(new Date(nearestDate))}</div>${rows.join('')}`;
          tip.style.opacity=1; let tx=x+12; if(tx> w-150) tx=x-145; tip.style.left=tx+'px'; tip.style.top='14px'; }
      } else if(tip){ tip.style.opacity=0; }
    }
  }

  /* ---- modale allocation ---- */
  const allocModal=document.getElementById('alloc-modal');
  document.getElementById('alloc-close').addEventListener('click',()=>allocModal.classList.remove('is-open'));
  allocModal.addEventListener('click',e=>{ if(e.target===allocModal) allocModal.classList.remove('is-open'); });
  function openAlloc(p){
    const body=document.getElementById('alloc-body');
    const opts = crmClients.map(c=>`<option value="${c.id}">${esc(((c.prenom||'')+' '+(c.nom||'')).trim())}${c.email?' — '+esc(c.email):''}</option>`).join('');
    const existing=positions.filter(x=>x.isin===p.isin && !x._deleted);
    body.innerHTML=`
      <p class="sp-modal-intro">Allouer <b>${esc(p.lib||p.isin)}</b> à un contact du CRM ou à un détenteur libre.</p>
      <div class="sp-alloc-form">
        <div class="sp-fld"><label>Contact CRM</label>
          <select id="al-crm"><option value="">— Sélectionner —</option>${opts}</select></div>
        <div class="sp-form-grid">
          <div class="sp-fld"><label>Prénom / Société</label><input id="al-prenom"></div>
          <div class="sp-fld"><label>Nom</label><input id="al-nom"></div>
          <div class="sp-fld"><label>Taille (nominal ${symbol(p.dev)})</label><input id="al-nominal" type="number" inputmode="numeric" placeholder="ex : 100000"></div>
          <div class="sp-fld"><label>Compte / Enveloppe (optionnel)</label><input id="al-compte" placeholder="ex : UBS, AV…"></div>
          <div class="sp-fld"><label>Vendeur</label><input id="al-vendeur"></div>
          <div class="sp-fld"><label>Date de trade</label><input id="al-trade" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        </div>
        <div class="sp-save-bar">
          <button class="btn btn--solid" id="al-save">Créer l'allocation</button>
          <span class="sp-save-status" id="al-status"></span>
        </div>
      </div>
      <div class="sp-alloc-existing">
        <h5>Détenteurs actuels (${existing.length})</h5>
        ${existing.length?existing.map(a=>`<div class="sp-alloc-list-row"><span class="nm">${esc(fullName(a))}</span><span class="sz">${money(a.nominal,a.dev)} · ${esc(a.compte||'—')} · ${(a.statut||'LIVE')==='LIVE'?'en cours':'soldé'}</span></div>`).join(''):'<p class="sp-muted sm">Aucun pour l\'instant.</p>'}
      </div>`;
    document.getElementById('al-crm').addEventListener('change',function(){
      const c=crmClients.find(x=>String(x.id)===this.value); if(c){ document.getElementById('al-prenom').value=c.prenom||''; document.getElementById('al-nom').value=c.nom||''; }
    });
    document.getElementById('al-save').addEventListener('click',()=>{
      const prenom=document.getElementById('al-prenom').value.trim();
      const nom=document.getElementById('al-nom').value.trim();
      const nominal=parseFloat(document.getElementById('al-nominal').value)||null;
      const st=document.getElementById('al-status');
      if(!prenom && !nom){ st.textContent='Indiquez un détenteur.'; st.style.color='#c0392b'; return; }
      const pos={ id:++nextLocalId, isin:p.isin, prenom, nom, nominal, dev:p.dev,
        compte:document.getElementById('al-compte').value.trim()||null,
        vendeur:document.getElementById('al-vendeur').value.trim()||null,
        trade:document.getElementById('al-trade').value||null,
        client_id:document.getElementById('al-crm').value||null, statut:'LIVE' };
      st.textContent='Enregistrement…'; st.style.color='var(--muted)';
      savePosition(pos).then(()=>{ st.textContent='✓ Allocation créée'; st.style.color='#2e7d32';
        updateStats(); buildReportSelect(); buildOverviewClientSelect();
        setTimeout(()=>{ allocModal.classList.remove('is-open'); renderProduct(p); },700);
      });
    });
    allocModal.classList.add('is-open');
  }

  /* ===================================================================
     PERSISTANCE
     =================================================================== */
  function savePosition(pos){
    const idx=positions.findIndex(x=>String(x.id)===String(pos.id));
    if(idx>=0) positions[idx]=Object.assign(positions[idx],pos); else positions.push(pos);
    if(!SB || !sbPositions) return Promise.resolve();
    const payload=toDbPosition(pos);
    if(pos._seed) payload.seed_id=pos.id;
    return fetch(API+'/sp_positions', {method:'POST', headers:headers({'Prefer':'return=representation'}), body:JSON.stringify(payload)})
      .then(r=>r.ok?r.json():Promise.reject(r.status)).then(rows=>{ if(rows&&rows[0]){ const np=positions.find(x=>String(x.id)===String(pos.id)); if(np){ np.id=rows[0].id; np._db=true; np._seed=false; np.seed_id=rows[0].seed_id; } } })
      .catch(()=>{ sbPositions=false; });
  }
  function removePosition(pos){
    positions=positions.filter(x=>String(x.id)!==String(pos.id));
    if(SB && sbPositions && pos._db && !pos._seed){ fetch(API+'/sp_positions?id=eq.'+pos.id,{method:'DELETE',headers:headers()}).catch(()=>{}); }
    updateStats(); buildReportSelect(); buildOverviewClientSelect(); return Promise.resolve();
  }
  function saveProduct(p){
    productsMap.set(p.isin, Object.assign(productsMap.get(p.isin)||{}, p));
    buildIsinList();
    if(!SB || !sbProducts) return Promise.resolve();
    return fetch(API+'/sp_products', {method:'POST', headers:headers({'Prefer':'resolution=merge-duplicates,return=minimal'}), body:JSON.stringify(toDbProduct(p))})
      .catch(()=>{ sbProducts=false; });
  }
  function deleteProduct(isin){
    productsMap.delete(isin);
    positions=positions.filter(x=>x.isin!==isin);
    buildIsinList(); updateStats();
    if(SB && sbProducts){ fetch(API+'/sp_products', {method:'POST', headers:headers({'Prefer':'resolution=merge-duplicates,return=minimal'}), body:JSON.stringify({isin, deleted:true})}).catch(()=>{}); }
    return Promise.resolve();
  }

  /* ===================================================================
     ONGLET 2 — PORTEFEUILLE (une ligne par produit)
     =================================================================== */
  let pfLimit=60;
  document.getElementById('pf-search').addEventListener('input',()=>{ pfLimit=60; renderPortfolio(); });
  document.getElementById('pf-filter-statut').addEventListener('change',()=>{ pfLimit=60; renderPortfolio(); });
  document.getElementById('pf-filter-emetteur').addEventListener('change',()=>{ pfLimit=60; renderPortfolio(); });
  const pfFam=document.getElementById('pf-filter-fam'); if(pfFam) pfFam.addEventListener('change',()=>{ pfLimit=60; renderPortfolio(); });

  function buildFilters(){
    const stSel=document.getElementById('pf-filter-statut');
    if(stSel.options.length<=1){ stSel.add(new Option('En cours','LIVE')); stSel.add(new Option('Soldé','DONE')); }
    const emSel=document.getElementById('pf-filter-emetteur');
    if(emSel.options.length<=1){ const em=new Set(); productsMap.forEach(p=>{ if(p.emetteur) em.add(p.emetteur); });
      Array.from(em).sort().forEach(e=>emSel.add(new Option(e,e))); }
    const famSel=document.getElementById('pf-filter-fam');
    if(famSel && famSel.options.length<=1){ const fa=new Set(); productsMap.forEach(p=>{ if(p.fam) fa.add(p.fam); });
      Array.from(fa).sort().forEach(e=>famSel.add(new Option(e,e))); }
  }
  function renderPortfolio(){
    buildFilters();
    const q=(document.getElementById('pf-search').value||'').toLowerCase().trim();
    const fSt=document.getElementById('pf-filter-statut').value;
    const fEm=document.getElementById('pf-filter-emetteur').value;
    const fFa=(document.getElementById('pf-filter-fam')||{}).value||'';
    let list=Array.from(productsMap.values());
    if(fSt) list=list.filter(p=>productStatus(p)===fSt);
    if(fEm) list=list.filter(p=>p.emetteur===fEm);
    if(fFa) list=list.filter(p=>p.fam===fFa);
    if(q) list=list.filter(p=>{
      const hay=((p.isin||'')+' '+(p.lib||'')+' '+(p.emetteur||'')+' '+(p.fam||'')+' '+(p.uls||[]).map(u=>u.n).join(' ')).toLowerCase();
      return hay.includes(q);
    });
    list.sort((a,b)=>{ const la=productStatus(a)==='LIVE'?0:1, lb=productStatus(b)==='LIVE'?0:1;
      if(la!==lb) return la-lb; return (pd(b.strike)||0)-(pd(a.strike)||0); });

    const liveList=list.filter(p=>productStatus(p)==='LIVE');
    const enc=liveList.reduce((s,p)=>s+(toEur(p.nomLive!=null?p.nomLive:p.nominalRef,p.dev)||0),0);
    const coupons=list.reduce((s,p)=>s+(toEur(p.cpnPercus,p.dev)||0),0);
    document.getElementById('pf-summary').innerHTML=`
      <div class="sp-pf-sum-card"><div class="v">${list.length}</div><div class="l">Produits</div></div>
      <div class="sp-pf-sum-card"><div class="v">${liveList.length}</div><div class="l">En cours</div></div>
      <div class="sp-pf-sum-card"><div class="v">${compact(enc)}</div><div class="l">Encours nominal</div></div>
      <div class="sp-pf-sum-card"><div class="v">${compact(coupons)}</div><div class="l">Coupons perçus</div></div>`;

    const tbody=document.getElementById('pf-list');
    const slice=list.slice(0,pfLimit);
    if(!slice.length){ tbody.innerHTML='<tr><td colspan="10" class="dash-empty"><p>Aucun produit ne correspond.</p></td></tr>'; document.getElementById('pf-more').hidden=true; return; }
    tbody.innerHTML=slice.map(p=>{
      const status=productStatus(p);
      const tags=[p.fam||'', p.trig?'Trigger ↓':'', p.mem?'Mémoire':''].filter(Boolean).join(' · ');
      const barr=[p.bcap!=null?'cap '+pct(p.bcap,0):'', p.bcpn!=null?'cpn '+pct(p.bcpn,0):''].filter(Boolean).join(' / ')||'—';
      return `<tr data-isin="${esc(p.isin)}">
        <td class="sp-pf-prod">${esc(p.lib||'—')}<small>${esc(p.isin)} · ${esc(tags)}</small></td>
        <td>${esc(p.emetteur||'—')}</td>
        <td class="sp-pf-uls">${esc((p.uls||[]).map(u=>u.n).join(', ')||'—')}</td>
        <td class="num">${p.coupon!=null?pct(p.coupon,2)+'<small class="u">/an</small>':'—'}</td>
        <td class="num">${barr}</td>
        <td class="sp-pf-dates">${fmtShort(p.strike)}<small>→ ${fmtShort(p.maturity)}</small></td>
        <td class="num">${compact(toEur(p.nomLive!=null?p.nomLive:p.nominalRef,p.dev))}</td>
        <td class="num">${p.cpnPercus!=null?compact(toEur(p.cpnPercus,p.dev)):'—'}</td>
        <td><span class="sp-chip-status ${status==='LIVE'?'cs-live':'cs-done'}">${status==='LIVE'?'En cours':'Soldé'}</span></td>
        <td><div class="sp-row-act">
          <button class="sp-icon-btn act-view" title="Voir le suivi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="sp-icon-btn act-edit" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="sp-icon-btn act-del" title="Supprimer le produit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
        </div></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('tr[data-isin]').forEach(tr=>{
      const isin=tr.dataset.isin;
      tr.querySelector('.act-view').addEventListener('click',e=>{ e.stopPropagation(); gotoProduct(isin); });
      tr.querySelector('.act-edit').addEventListener('click',e=>{ e.stopPropagation(); openEdit(productsMap.get(isin)); });
      tr.querySelector('.act-del').addEventListener('click',e=>{ e.stopPropagation();
        if(confirm('Supprimer définitivement ce produit du book ?')){ deleteProduct(isin).then(renderPortfolio); } });
      tr.addEventListener('click',()=>gotoProduct(isin));
    });
    const more=document.getElementById('pf-more');
    if(list.length>pfLimit){ more.hidden=false; more.innerHTML=`<button id="pf-more-btn">Afficher plus (${list.length-pfLimit} restants)</button>`;
      document.getElementById('pf-more-btn').onclick=()=>{ pfLimit+=80; renderPortfolio(); }; }
    else more.hidden=true;
  }
  function gotoProduct(isin){
    const p=productsMap.get(isin); if(!p) return;
    document.querySelector('.dash-tab[data-tab="suivi"]').click();
    searchInput.value=isin; renderProduct(p);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  /* ---- édition / création produit ---- */
  const editModal=document.getElementById('edit-modal');
  document.getElementById('edit-close').addEventListener('click',()=>editModal.classList.remove('is-open'));
  editModal.addEventListener('click',e=>{ if(e.target===editModal) editModal.classList.remove('is-open'); });
  function openEdit(prod){
    prod=prod||{isin:'',uls:[]};
    document.getElementById('edit-title').textContent = prod.isin?'Modifier le produit':'Nouveau produit';
    document.getElementById('edit-body').innerHTML = productFormHTML(prod);
    bindProductForm(prod);
    editModal.classList.add('is-open');
    document.getElementById('edit-body').parentElement.scrollTop=0;
  }
  function productFormHTML(p){
    const u=(p.uls||[]); const ul=(i)=>u[i]||{};
    const freqs=['Trimestrielle','Mensuelle','Semestrielle','Annuelle','Bimestrielle','Bullet'];
    const fams=['Phoenix','Athéna','Athénix','Note callable','BRC','Autre'];
    return `
      <div class="sp-form-grid">
        <div class="sp-form-section">Produit</div>
        <div class="sp-fld full"><label>Libellé</label><input id="e-lib" value="${esc(p.lib||'')}"></div>
        <div class="sp-fld"><label>ISIN</label><input id="e-isin" value="${esc(p.isin||'')}"></div>
        <div class="sp-fld"><label>Émetteur</label><input id="e-emetteur" value="${esc(p.emetteur||'')}"></div>
        <div class="sp-fld"><label>Famille</label><select id="e-fam">${fams.map(f=>`<option ${f===(p.fam||'Autre')?'selected':''}>${f}</option>`).join('')}</select></div>
        <div class="sp-fld"><label>Devise</label><select id="e-dev">${['EUR','USD','CHF','GBP'].map(d=>`<option ${d===(p.dev||'EUR')?'selected':''}>${d}</option>`).join('')}</select></div>
        <div class="sp-fld"><label>Coupon annuel (ex 0.093 = 9,3 %/an)</label><input id="e-coupon" type="number" step="0.0001" value="${p.coupon!=null?p.coupon:''}"></div>
        <div class="sp-fld"><label>Fréquence d'observation</label><select id="e-freq">${freqs.map(f=>`<option ${f===p.freq?'selected':''}>${f}</option>`).join('')}</select></div>
        <div class="sp-fld"><label>Seuil autocall (ex 1 = 100 %)</label><input id="e-ac" type="number" step="0.01" value="${p.ac!=null?p.ac:''}"></div>
        <div class="sp-fld"><label>Barrière coupon (ex 0.7)</label><input id="e-bcpn" type="number" step="0.01" value="${p.bcpn!=null?p.bcpn:''}"></div>
        <div class="sp-fld"><label>Barrière capital (ex 0.6)</label><input id="e-bcap" type="number" step="0.01" value="${p.bcap!=null?p.bcap:''}"></div>
        <div class="sp-fld sp-check"><label><input type="checkbox" id="e-mem" ${p.mem?'checked':''}> Coupon à mémoire</label></div>
        <div class="sp-fld sp-check"><label><input type="checkbox" id="e-trig" ${p.trig?'checked':''}> Autocall dégressif (Trigger Descending)</label></div>
        <div class="sp-fld"><label>Décrément autocall (ex 0.05 = −5 %)</label><input id="e-trigstep" type="number" step="0.005" value="${p.trigStep!=null?p.trigStep:''}" placeholder="0.05"></div>
        <div class="sp-fld"><label>Fréquence de décrément</label><select id="e-trigfreq">${['Annuelle','Semestrielle','Trimestrielle','Mensuelle'].map(f=>`<option ${f===(p.trigFreq||'Annuelle')?'selected':''}>${f}</option>`).join('')}</select></div>
        <div class="sp-fld"><label>Date de strike</label><input id="e-strike" type="date" value="${p.strike?String(p.strike).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Date d'émission</label><input id="e-emission" type="date" value="${p.emission?String(p.emission).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Prochaine observation</label><input id="e-nextobs" type="date" value="${p.nextObs?String(p.nextObs).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Prochain coupon</label><input id="e-nextcpn" type="date" value="${p.nextCpn?String(p.nextCpn).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Constatation finale</label><input id="e-finalobs" type="date" value="${p.finalObs?String(p.finalObs).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Échéance finale</label><input id="e-maturity" type="date" value="${p.maturity?String(p.maturity).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Nominal unitaire</label><input id="e-nominalref" type="number" value="${p.nominalRef!=null?p.nominalRef:''}"></div>
        <div class="sp-form-section">Sous-jacents (nom · niveau de strike)</div>
        ${[0,1,2,3,4].map(i=>`<div class="sp-fld"><label>Sous-jacent ${i+1}</label><input id="e-uln${i}" value="${esc(ul(i).n||'')}" placeholder="Nom"></div>
          <div class="sp-fld"><label>Strike ${i+1}</label><input id="e-ulk${i}" type="number" step="0.0001" value="${ul(i).k!=null?ul(i).k:''}"></div>`).join('')}
      </div>
      <div class="sp-save-bar">
        <button class="btn btn--solid" id="e-save">Enregistrer</button>
        ${p.isin?'<button class="btn" id="e-delete" style="border-color:#c0392b;color:#c0392b">Supprimer le produit</button>':''}
        <span class="sp-save-status" id="e-status"></span>
      </div>`;
  }
  function gatherProduct(prod){
    const isin=(val('e-isin')||prod.isin||('TMP'+(++nextLocalId))).toUpperCase();
    const uls=[]; for(let i=0;i<5;i++){ const n=val('e-uln'+i); if(n) uls.push({n,k:numv('e-ulk'+i)}); }
    return { isin, lib:val('e-lib'), emetteur:val('e-emetteur'), fam:val('e-fam')||'Autre', dev:val('e-dev'),
      coupon:numv('e-coupon'), freq:val('e-freq'), ac:numv('e-ac'), bcpn:numv('e-bcpn'), bcap:numv('e-bcap'),
      mem:document.getElementById('e-mem')&&document.getElementById('e-mem').checked,
      trig:document.getElementById('e-trig')&&document.getElementById('e-trig').checked,
      trigStep:numv('e-trigstep'), trigFreq:val('e-trigfreq'),
      strike:val('e-strike')||null, emission:val('e-emission')||null, nextObs:val('e-nextobs')||null,
      nextCpn:val('e-nextcpn')||null, finalObs:val('e-finalobs')||null, maturity:val('e-maturity')||null,
      nominalRef:numv('e-nominalref'), uls,
      statut:prod.statut, nomTot:prod.nomTot, nomLive:prod.nomLive, cpnPercus:prod.cpnPercus, nL:prod.nL, vend:prod.vend };
  }
  function bindProductForm(prod){
    document.getElementById('e-save').addEventListener('click',()=>{
      const np=gatherProduct(prod);
      const st=document.getElementById('e-status'); st.textContent='Enregistrement…'; st.style.color='var(--muted)';
      saveProduct(np).then(()=>{
        st.textContent='✓ Enregistré'; st.style.color='#2e7d32'; updateStats();
        setTimeout(()=>{ editModal.classList.remove('is-open'); renderPortfolio();
          if(currentProduct && currentProduct.isin===np.isin){ renderProduct(productsMap.get(np.isin)); } },550);
      });
    });
    const del=document.getElementById('e-delete');
    if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer définitivement ce produit du book ?')){ deleteProduct(prod.isin).then(()=>{ editModal.classList.remove('is-open'); renderPortfolio(); }); } });
  }
  function val(id){ const e=document.getElementById(id); return e?(e.value.trim()||null):null; }
  function numv(id){ const e=document.getElementById(id); if(!e||e.value==='')return null; const n=parseFloat(e.value); return isNaN(n)?null:n; }

  document.getElementById('pf-add-manual').addEventListener('click',()=>openEdit({isin:'',uls:[]}));

  /* ---- import Term Sheet (PDF) ---- */
  const importModal=document.getElementById('import-modal');
  document.getElementById('import-close').addEventListener('click',()=>importModal.classList.remove('is-open'));
  importModal.addEventListener('click',e=>{ if(e.target===importModal) importModal.classList.remove('is-open'); });
  document.getElementById('pf-import-ts').addEventListener('click',()=>openImport());

  function openImport(){
    document.getElementById('import-title').textContent = 'Importer une Term Sheet';
    document.getElementById('import-body').innerHTML=`
      <p class="sp-modal-intro">Déposez la Term Sheet (PDF). Les caractéristiques détectées seront pré-remplies dans un formulaire éditable, puis ajoutées au book. L'analyse est faite localement dans le navigateur.</p>
      <label class="sp-drop" id="sp-drop" for="sp-file">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>
        <div><b>Cliquez ou glissez le PDF ici</b></div>
        <div class="sp-drop-sub">PDF · Term Sheet</div>
      </label>
      <input type="file" id="sp-file" accept="application/pdf,.pdf,.txt" hidden>
      <div class="sp-import-status" id="sp-import-status"></div>
      <div id="sp-import-form"></div>`;
    const drop=document.getElementById('sp-drop'), file=document.getElementById('sp-file');
    ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();drop.classList.add('over');}));
    ['dragleave','dragend'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');}));
    drop.addEventListener('drop',e=>{ e.preventDefault(); e.stopPropagation(); drop.classList.remove('over');
      const f=e.dataTransfer.files && e.dataTransfer.files[0]; if(f) handleImport(f); });
    file.addEventListener('change',()=>{ if(file.files[0]) handleImport(file.files[0]); });
    importModal.classList.add('is-open');
  }
  function setImpStatus(msg,cls){ const s=document.getElementById('sp-import-status'); s.className='sp-import-status show '+(cls||''); s.textContent=msg; }
  function handleImport(f){
    setImpStatus('Lecture du document…','work');
    const reader=new FileReader();
    if(/pdf$/i.test(f.name) || f.type==='application/pdf'){
      reader.onload=()=>extractPdfText(reader.result).then(txt=>parseAndForm(txt,f.name)).catch(err=>{ console.warn(err); setImpStatus('Impossible de lire le PDF. Saisissez les champs manuellement.','err'); parseAndForm('',f.name); });
      reader.readAsArrayBuffer(f);
    } else { reader.onload=()=>parseAndForm(String(reader.result||''),f.name); reader.readAsText(f); }
  }
  function extractPdfText(buf){
    if(!window.pdfjsLib) return Promise.reject('pdfjs absent');
    return pdfjsLib.getDocument({data:buf}).promise.then(doc=>{
      const pages=[]; const N=Math.min(doc.numPages,10); const seq=[]; for(let i=1;i<=N;i++) seq.push(i);
      return seq.reduce((pr,i)=>pr.then(()=>doc.getPage(i).then(pg=>pg.getTextContent()).then(tc=>{ pages.push(tc.items.map(it=>it.str).join(' ')); })),Promise.resolve()).then(()=>pages.join('\n'));
    });
  }
  function parseTermSheet(txt){
    const out={uls:[]};
    const T=txt.replace(/\s+/g,' ');
    const isin=(T.match(/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/)||[])[1]; if(isin) out.isin=isin;
    const em=(T.match(/(?:Issuer|Émetteur|Emetteur)\s*[:\-]?\s*([A-Za-zÀ-ÿ&\. ]{3,40})/i)||[])[1]; if(em) out.emetteur=em.trim().replace(/ (Notes?|Programme|S\.A|Bank|AG|N\.V).*/i,'');
    const cp=(T.match(/(?:Coupon(?:\s*Rate)?|Taux de coupon)\s*[:\-]?\s*(?:de\s*)?(\d{1,2}[.,]\d{1,3})\s*%/i)||T.match(/(\d{1,2}[.,]\d{1,3})\s*%\s*(?:p\.a\.|per annum|par an)/i)||[]);
    if(cp[1]) out.coupon=parseFloat(cp[1].replace(',','.'))/100;
    const bc=(T.match(/(?:Capital|Protection|Barrier|Barrière)\s*(?:Barrier|de capital)?\s*[:\-]?\s*(\d{2,3})\s*%/i)||[]); if(bc[1]) out.bcap=parseInt(bc[1])/100;
    const bcp=(T.match(/(?:Coupon Barrier|Barrière de coupon|Coupon Trigger)\s*[:\-]?\s*(\d{2,3})\s*%/i)||[]); if(bcp[1]) out.bcpn=parseInt(bcp[1])/100;
    const ac=(T.match(/(?:Autocall|Auto-?call|Early Redemption)\s*(?:Trigger|Level|Barrier)?\s*[:\-]?\s*(\d{2,3})\s*%/i)||[]); if(ac[1]) out.ac=parseInt(ac[1])/100;
    if(/quarter|trimestr/i.test(T)) out.freq='Trimestrielle'; else if(/semi-?annual|semestr/i.test(T)) out.freq='Semestrielle';
    else if(/monthly|mensuel/i.test(T)) out.freq='Mensuelle'; else if(/annual|annuel/i.test(T)) out.freq='Annuelle';
    const dv=(T.match(/\b(EUR|USD|CHF|GBP)\b/)||[])[1]; if(dv) out.dev=dv;
    if(/m[ée]moire|memory/i.test(T)) out.mem=true;
    if(/trigger descending|d[ée]gressif|step\s*down|decreasing/i.test(T)) out.trig=true;
    const lbl=(T.match(/(Phoenix|Ath[ée]na|Ath[ée]nix|Note callable|Reverse Convertible|BRC)/i)||[])[1];
    if(lbl){ const m=lbl.toLowerCase(); out.fam = /ath[ée]nix/.test(m)?'Athénix':/ath[ée]na/.test(m)?'Athéna':/phoenix/.test(m)?'Phoenix':/callable/.test(m)?'Note callable':'BRC'; }
    const ds=T.match(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\b/g)||[];
    const toIso=s=>{ const m=s.split(/[\/\.-]/); if(m.length<3)return null; let[a,b,c]=m; if(a.length===4){return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;} if(c.length===2)c='20'+c; return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`; };
    if(ds[0]) out.strike=toIso(ds[0]);
    if(ds.length>1) out.maturity=toIso(ds[ds.length-1]);
    const um=T.match(/(?:Underlyings?|Sous-?jacents?|Basket)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9&\.,\/\- ]{3,80})/i);
    if(um){ um[1].split(/[,;\/]| and | et /i).map(s=>s.trim()).filter(s=>s.length>1&&s.length<30).slice(0,5).forEach(n=>out.uls.push({n})); }
    out.lib = out.uls.length?((out.fam||'Autocall')+' '+out.uls.map(u=>u.n).join(', ')).trim():'';
    return out;
  }
  function parseAndForm(txt,fname){
    const parsed = parseTermSheet(txt);
    const got = Object.keys(parsed).filter(k=>k!=='uls'&&parsed[k]).length + (parsed.uls.length?1:0);
    if(got>=3) setImpStatus(`✓ ${got} champ(s) détecté(s) dans ${esc(fname)} — vérifiez puis enregistrez.`,'ok');
    else setImpStatus(`Peu de champs détectés automatiquement. Complétez le formulaire ci-dessous.`,'err');
    if(!parsed.fam) parsed.fam = /phoenix/i.test(txt)?'Phoenix':(/ath[ée]na/i.test(txt)?'Athéna':'Autre');
    const host=document.getElementById('sp-import-form');
    host.innerHTML = productFormHTML(parsed);
    ['e-isin','e-emetteur','e-coupon','e-bcap','e-bcpn','e-ac','e-strike','e-maturity','e-dev','e-freq','e-uln0','e-uln1'].forEach(id=>{ const e=document.getElementById(id); if(e&&e.value) e.classList.add('pref'); });
    bindImportSave(parsed);
  }
  function bindImportSave(parsed){
    const btn=document.getElementById('e-save'); if(!btn) return;
    const fresh=btn.cloneNode(true); btn.parentNode.replaceChild(fresh,btn);
    fresh.addEventListener('click',()=>{
      const np=gatherProduct(parsed); if(!np.lib) np.lib='Produit '+np.isin;
      const st=document.getElementById('e-status'); st.textContent='Enregistrement…'; st.style.color='var(--muted)';
      saveProduct(np).then(()=>{
        st.textContent='✓ Produit ajouté au book'; st.style.color='#2e7d32'; updateStats(); buildIsinList();
        setTimeout(()=>{ importModal.classList.remove('is-open'); document.querySelector('.dash-tab[data-tab="portefeuille"]').click(); renderPortfolio(); toast('Produit importé : '+np.isin); },800);
      });
    });
    const del=document.getElementById('e-delete'); if(del) del.remove();
  }

  /* ===================================================================
     ONGLET 3 — REPORTING CLIENT (allocations CRM)
     =================================================================== */
  function holders(){
    const map=new Map();
    positions.filter(p=>!p._deleted).forEach(p=>{ const k=fullName(p); if(k==='—')return; if(!map.has(k)) map.set(k,{name:k,client_id:p.client_id,items:[]}); map.get(k).items.push(p); });
    return Array.from(map.values()).sort((a,b)=>b.items.length-a.items.length);
  }
  function buildReportSelect(){
    const sel=document.getElementById('rep-client'); if(!sel) return; const prev=sel.value;
    const hs=holders();
    sel.innerHTML='<option value="">— Sélectionner un client —</option>'+hs.map(h=>`<option value="${esc(h.name)}">${esc(h.name)} (${h.items.length})</option>`).join('');
    if(prev) sel.value=prev;
  }
  document.getElementById('rep-client').addEventListener('change',renderReport);
  document.getElementById('rep-export').addEventListener('click',exportReport);
  function clientPositions(name){ return positions.filter(p=>!p._deleted && fullName(p)===name); }

  function renderReport(){
    const name=document.getElementById('rep-client').value;
    const host=document.getElementById('rep-body');
    if(!name){ host.innerHTML='<div class="sp-rep-empty"><p>Sélectionnez un client pour générer son reporting. Les clients apparaissent ici dès qu\'un produit leur est alloué (onglet Suivi produit › Allouer).</p></div>'; return; }
    const items=clientPositions(name);
    const live=items.filter(p=>(p.statut||'LIVE')==='LIVE');
    const enc=live.reduce((s,p)=>s+(toEur(p.nominal,p.dev)||0),0);
    const coupons=items.reduce((s,p)=>s+((p.gc!=null?p.gc:0)*(toEur(p.nominal,p.dev)||0)),0);
    const avgCoupon = (()=>{ let w=0,s=0; items.forEach(p=>{ const pr=productsMap.get(p.isin); if(pr&&pr.coupon!=null){ const n=toEur(p.nominal,p.dev)||0; s+=pr.coupon*n; w+=n; } }); return w?s/w:null; })();
    host.innerHTML=`
      <div class="sp-rep-head">
        <h3>${esc(name)}</h3>
        <div class="sub">Reporting produits structurés · ${items.length} ligne(s) · ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
        <div class="sp-rep-kpis">
          <div class="sp-rep-kpi"><div class="v">${compact(enc)}</div><div class="l">Encours en cours</div></div>
          <div class="sp-rep-kpi"><div class="v">${live.length}/${items.length}</div><div class="l">Produits vivants</div></div>
          <div class="sp-rep-kpi"><div class="v">${avgCoupon!=null?pct(avgCoupon,2):'—'}</div><div class="l">Coupon moyen pondéré</div></div>
          <div class="sp-rep-kpi"><div class="v">${compact(coupons)}</div><div class="l">Coupons estimés perçus</div></div>
        </div>
      </div>
      ${items.map(p=>repPosHTML(p)).join('')}`;
  }
  function repPosHTML(pos){
    const p=productsMap.get(pos.isin)||{isin:pos.isin}; const status=(pos.statut||'LIVE');
    const cur=p.uls?currentLevels(p):{worst:null};
    const sch=p.uls?genSchedule(p):[]; const nx=sch.find(r=>r.status==='next'||r.status==='future');
    const bars=[];
    if(p.bcap!=null) bars.push(`<span class="sp-mini-bar">Capital <b>${pct(p.bcap,0)}</b></span>`);
    if(p.bcpn!=null) bars.push(`<span class="sp-mini-bar">Coupon <b>${pct(p.bcpn,0)}</b></span>`);
    if(p.ac!=null) bars.push(`<span class="sp-mini-bar">Autocall <b>${pct(p.ac,0)}</b></span>`);
    if(cur.worst!=null) bars.push(`<span class="sp-mini-bar" style="border-color:${cur.worst>=(p.bcap?p.bcap*100:0)?'#bfe3c4':'#f3c0bb'}">Pire ss-jacent <b>${cur.worst.toFixed(1)}%</b></span>`);
    return `<div class="sp-rep-pos">
      <div class="sp-rep-pos__head">
        <div><div class="sp-rep-pos__name">${esc(p.lib||pos.isin)}</div><div class="sp-rep-pos__isin">${esc(pos.isin)} · ${esc(p.emetteur||'—')}</div></div>
        <div class="sp-rep-pos__fig"><div class="sp-rep-pos__nom">${pos.nominal!=null?money(pos.nominal,pos.dev):'—'}</div>
          <span class="sp-chip-status ${status==='LIVE'?'cs-live':'cs-done'}">${status==='LIVE'?'En cours':'Soldé'}</span></div>
      </div>
      <div class="sp-rep-pos__meta">
        <span>Coupon <b>${p.coupon!=null?pct(p.coupon,2)+'/an':'—'}</b></span>
        <span>Sous-jacents <b>${esc((p.uls||[]).map(u=>u.n).join(', ')||'—')}</b></span>
        <span>Strike <b>${fmtShort(p.strike)}</b></span>
        <span>Échéance <b>${fmtShort(p.maturity)}</b></span>
        ${status==='LIVE'&&nx?`<span>Prochaine obs. <b>${fmtShort(nx.date)}</b></span>`:''}
        ${pos.compte?`<span>Compte <b>${esc(pos.compte)}</b></span>`:''}
      </div>
      <div class="sp-rep-pos__bars">${bars.join('')}</div>
    </div>`;
  }
  function exportReport(){
    const name=document.getElementById('rep-client').value;
    if(!name){ toast('Sélectionnez un client.',true); return; }
    const items=clientPositions(name);
    const live=items.filter(p=>(p.statut||'LIVE')==='LIVE');
    const enc=live.reduce((s,p)=>s+(toEur(p.nominal,p.dev)||0),0);
    const coupons=items.reduce((s,p)=>s+((p.gc!=null?p.gc:0)*(toEur(p.nominal,p.dev)||0)),0);
    const tday=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const rows=items.map(pos=>{ const p=productsMap.get(pos.isin)||{isin:pos.isin}; const status=(pos.statut||'LIVE');
      const cur=p.uls?currentLevels(p):{worst:null};
      return `<tr><td><b>${esc(p.lib||pos.isin)}</b><div class="mono">${esc(pos.isin)} · ${esc(p.emetteur||'')}</div></td>
        <td>${esc((p.uls||[]).map(u=>u.n).join(', '))}</td>
        <td>${p.coupon!=null?(p.coupon*100).toFixed(2)+'% /an':'—'}</td>
        <td>${p.bcap!=null?(p.bcap*100).toFixed(0)+'%':'—'}</td>
        <td>${cur.worst!=null?cur.worst.toFixed(1)+'%':'—'}</td>
        <td>${pos.nominal!=null?Math.round(pos.nominal).toLocaleString('fr-FR')+' '+symbol(pos.dev):'—'}</td>
        <td>${fmtShort(p.maturity)}</td><td>${status==='LIVE'?'En cours':'Soldé'}</td></tr>`; }).join('');
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Reporting produits structurés — ${esc(name)} — ${tday}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Jost,Arial,sans-serif;color:#1E211C;padding:46px 54px;max-width:960px;margin:0 auto;font-size:13px;line-height:1.6}
.header{text-align:center;border-bottom:2px solid #A9853F;padding-bottom:22px;margin-bottom:28px}
.header h1{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:23px;font-weight:500}
.header .date{color:#5B6058;font-size:12px;margin-top:6px}
h2{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:18px;margin-bottom:4px}
.sub{color:#5B6058;font-size:12px;margin-bottom:22px}
.summary{background:#f6f4ee;border-radius:10px;padding:20px 26px;margin-bottom:28px;display:flex;gap:40px;flex-wrap:wrap}
.summary .item .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#5B6058}
.summary .item .v{font-size:20px;font-weight:600;color:#001B00;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:11.5px}
th{text-align:left;padding:9px 8px;border-bottom:1.5px solid #d5d2c9;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#5B6058}
td{padding:9px 8px;border-bottom:1px solid #eae8e1;vertical-align:top}
.mono{font-family:Consolas,monospace;font-size:9.5px;color:#8a8780;margin-top:2px}
.footer{text-align:center;font-size:10px;color:#999;margin-top:40px;border-top:1px solid #e8e6df;padding-top:18px;line-height:1.7}
.print-btn{position:fixed;top:18px;right:18px;background:#A9853F;color:#fff;border:0;padding:11px 22px;border-radius:8px;font-family:Jost;font-size:13px;cursor:pointer}
@media print{.print-btn{display:none}body{padding:20px}}</style></head><body>
<button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
<div class="header"><h1>La Financière de Rochechouart</h1><div class="date">Reporting produits structurés au ${tday}</div></div>
<h2>${esc(name)}</h2><div class="sub">${items.length} position(s) · ${live.length} en cours</div>
<div class="summary">
  <div class="item"><div class="l">Encours en cours</div><div class="v">${Math.round(enc).toLocaleString('fr-FR')} €</div></div>
  <div class="item"><div class="l">Coupons estimés perçus</div><div class="v">${Math.round(coupons).toLocaleString('fr-FR')} €</div></div>
  <div class="item"><div class="l">Produits</div><div class="v">${items.length}</div></div>
</div>
<table><thead><tr><th>Produit</th><th>Sous-jacents</th><th>Coupon</th><th>Barr. capital</th><th>Pire</th><th>Nominal</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer"><p><strong>La Financière de Rochechouart</strong> · 58 rue de Monceau, 75008 Paris</p><p>Document confidentiel — Valorisations et niveaux indicatifs, non contractuels.</p></div>
</body></html>`;
    const w=window.open('','_blank'); w.document.write(html); w.document.close();
  }

  /* ===================================================================
     ONGLET 4 — VUE D'ENSEMBLE
     =================================================================== */
  const ovSel=document.getElementById('ov-client');
  if(ovSel) ovSel.addEventListener('change',renderOverview);
  function buildOverviewClientSelect(){
    if(!ovSel) return; const prev=ovSel.value; const hs=holders();
    ovSel.innerHTML='<option value="">Tout le book</option>'+hs.map(h=>`<option value="${esc(h.name)}">${esc(h.name)} (${h.items.length})</option>`).join('');
    if(prev) ovSel.value=prev;
  }
  // construit la liste de « positions » à analyser : book complet (produits) ou positions d'un client
  function overviewUnits(clientName){
    if(clientName){
      return clientPositions(clientName).map(pos=>({p:productsMap.get(pos.isin)||{isin:pos.isin}, nomEur:toEur(pos.nominal,pos.dev)||0, dev:pos.dev}));
    }
    return Array.from(productsMap.values()).map(p=>({p, nomEur:toEur(p.nomLive!=null?p.nomLive:p.nominalRef,p.dev)||0, dev:p.dev}));
  }
  function renderOverview(){
    const host=document.getElementById('ov-body'); if(!host) return;
    const clientName=ovSel?ovSel.value:'';
    const units=overviewUnits(clientName).filter(u=>u.p && u.p.isin);
    if(!units.length){ host.innerHTML='<div class="sp-rep-empty"><p>Aucune position à afficher.</p></div>'; return; }
    const live=units.filter(u=>productStatus(u.p)==='LIVE');
    const encLive=live.reduce((s,u)=>s+u.nomEur,0);
    const encTot=units.reduce((s,u)=>s+u.nomEur,0);
    const coupons=units.reduce((s,u)=>s+(toEur(u.p.cpnPercus,u.p.dev)||(clientName?0:0)),0);
    const avgCoupon=(()=>{ let w=0,s=0; live.forEach(u=>{ if(u.p.coupon!=null){ s+=u.p.coupon*u.nomEur; w+=u.nomEur; } }); return w?s/w:null; })();

    // expositions sous-jacents (par encours vivant pondéré)
    const ulMap=new Map(), emMap=new Map(), famMap=new Map();
    live.forEach(u=>{ const uls=u.p.uls||[]; const share=uls.length?u.nomEur/uls.length:0;
      uls.forEach(ul=>{ const k=ul.n; ulMap.set(k,(ulMap.get(k)||0)+share); });
      if(u.p.emetteur) emMap.set(u.p.emetteur,(emMap.get(u.p.emetteur)||0)+u.nomEur);
      const f=u.p.fam||'Autre'; famMap.set(f,(famMap.get(f)||0)+u.nomEur);
    });
    const topUl=Array.from(ulMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const topEm=Array.from(emMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const topFam=Array.from(famMap.entries()).sort((a,b)=>b[1]-a[1]);

    // worst-of les plus à risque (proximité de la barrière capital)
    const risk=live.map(u=>{ const cur=(u.p.uls&&u.p.uls.length)?currentLevels(u.p):{worst:null};
      const cap=u.p.bcap!=null?u.p.bcap*100:null; const dist=(cur.worst!=null&&cap!=null)?cur.worst-cap:null;
      return {u, worst:cur.worst, cap, dist}; }).filter(r=>r.dist!=null).sort((a,b)=>a.dist-b.dist).slice(0,8);

    const maxUl=topUl.length?topUl[0][1]:1, maxEm=topEm.length?topEm[0][1]:1;
    const bar=(v,max,col)=>`<div class="ov-bar"><div class="ov-bar__fill" style="width:${Math.max(3,v/max*100).toFixed(0)}%;background:${col||'var(--gold)'}"></div></div>`;
    const title=clientName?esc(clientName):'Tout le book';

    host.innerHTML=`
      <div class="ov-kpis">
        <div class="ov-kpi"><div class="v">${compact(encLive)}</div><div class="l">Encours en cours</div></div>
        <div class="ov-kpi"><div class="v">${live.length}<span class="sub">/ ${units.length}</span></div><div class="l">Produits vivants</div></div>
        <div class="ov-kpi"><div class="v">${avgCoupon!=null?pct(avgCoupon,2):'—'}</div><div class="l">Coupon moyen /an</div></div>
        <div class="ov-kpi"><div class="v">${compact(coupons)}</div><div class="l">Coupons perçus</div></div>
      </div>
      <div class="ov-grid">
        <div class="sp-card">
          <h4>Principales expositions sous-jacents</h4>
          <div class="ov-list">${topUl.map(([n,v])=>`<div class="ov-row"><span class="ov-row__n">${esc(n)}</span>${bar(v,maxUl,'#2563eb')}<span class="ov-row__v">${compact(v)}</span></div>`).join('')||'<p class="sp-muted sm">—</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Émetteurs principaux</h4>
          <div class="ov-list">${topEm.map(([n,v])=>`<div class="ov-row"><span class="ov-row__n">${esc(n)}</span>${bar(v,maxEm,'#A9853F')}<span class="ov-row__v">${compact(v)}</span></div>`).join('')||'<p class="sp-muted sm">—</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Répartition par famille</h4>
          <div class="ov-list">${topFam.map(([n,v])=>`<div class="ov-row"><span class="ov-row__n">${esc(n)}</span>${bar(v,encLive||1,'#0891b2')}<span class="ov-row__v">${compact(v)} · ${(v/(encLive||1)*100).toFixed(0)}%</span></div>`).join('')||'<p class="sp-muted sm">—</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Worst-of les plus à risque <span class="sp-h4-note">— pire sous-jacent vs barrière capital</span></h4>
          <div class="ov-risk">${risk.map(r=>{ const sev=r.dist>15?'safe':(r.dist>0?'warn':'danger');
            return `<div class="ov-risk__row ${sev}" data-isin="${esc(r.u.p.isin)}"><div class="ov-risk__n">${esc(r.u.p.lib||r.u.p.isin)}<small>${esc((r.u.p.uls||[]).map(x=>x.n).join(', '))}</small></div>
              <div class="ov-risk__fig"><b>${r.worst!=null?r.worst.toFixed(1)+'%':'—'}</b><span>cap ${r.cap!=null?r.cap.toFixed(0)+'%':'—'} · ${r.dist>=0?'+':''}${r.dist.toFixed(1)} pts</span></div></div>`; }).join('')||'<p class="sp-muted sm">—</p>'}</div>
        </div>
      </div>`;
    host.querySelectorAll('.ov-risk__row[data-isin]').forEach(el=>el.addEventListener('click',()=>gotoProduct(el.dataset.isin)));
  }

  /* ---------------- AUTO-LOGIN ---------------- */
  if(sessionStorage.getItem('sb_access_token')){
    document.getElementById('dash-user-email').textContent = sessionStorage.getItem('sb_user_email') || '';
    showDash();
  }

})();
