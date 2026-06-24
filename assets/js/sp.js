/* ===========================================================================
   Suivi des produits structurés — La Financière de Rochechouart
   Données embarquées (sp-data.js) + persistance optionnelle Supabase.
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
  let sbProducts = true, sbPositions = true; // passe à false si table absente

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
    if(!SB){ // pas de backend : accès direct (démo)
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
  const productsMap = new Map();   // isin -> product
  let positions = [];              // holdings
  let crmClients = [];             // depuis CRM (table clients)
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
      .then(() => { buildIsinList(); updateStats(); renderSuggest(); renderPortfolio(); buildReportSelect(); })
      .catch(e => { console.warn(e); buildIsinList(); updateStats(); renderSuggest(); renderPortfolio(); buildReportSelect(); });
  }
  function loadSbProducts(){
    if(!SB) return;
    return fetch(API + '/sp_products?select=*', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => { (rows||[]).forEach(r => { const p = fromDbProduct(r); productsMap.set(p.isin, p); }); })
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
      ac:r.ac, bcap:r.bcap, bcpn:r.bcpn, strike:r.strike, nextObs:r.next_obs, maturity:r.maturity,
      trade:r.trade_date, nominalRef:r.nominal_ref, fam:r.fam||'Autre', uls:r.uls||[], _db:true };
  }
  function toDbProduct(p){
    return { isin:p.isin, lib:p.lib, emetteur:p.emetteur, dev:p.dev, coupon:p.coupon, freq:p.freq,
      ac:p.ac, bcap:p.bcap, bcpn:p.bcpn, strike:p.strike, next_obs:p.nextObs, maturity:p.maturity,
      trade_date:p.trade, nominal_ref:p.nominalRef, fam:p.fam, uls:p.uls };
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
  function daysBetween(a,b){ return Math.round((pd(b)-pd(a))/86400000); }
  function fullName(p){ return ((p.prenom||'')+' '+(p.nom||'')).trim()||'—'; }
  function toast(msg, err){ const t=document.getElementById('sp-toast'); t.textContent=msg; t.className='sp-toast show'+(err?' err':''); setTimeout(()=>t.className='sp-toast',2600); }

  const FREQ_M = {'Trimestrielle':3,'Mensuelle':1,'Semestrielle':6,'Annuelle':12,'Bimestrielle':2,'Journalière':null,'Bullet':null};
  function freqMonths(f){ return (f in FREQ_M)?FREQ_M[f]:3; }

  function productStatus(isin){
    const ps = positions.filter(p=>p.isin===isin && !p._deleted);
    if(ps.length){ return ps.some(p=>(p.statut||'LIVE')==='LIVE')?'LIVE':'DONE'; }
    const p = productsMap.get(isin); if(p && p.maturity){ return pd(p.maturity) >= today()?'LIVE':'DONE'; }
    return 'LIVE';
  }

  const UL_COLORS=['#1565c0','#c62828','#7b1fa2','#00838f','#e65100'];
  function ulColor(i){ return UL_COLORS[i%UL_COLORS.length]; }

  /* ---------------- SIMULATEUR DE COURS (déterministe par sous-jacent) ---------------- */
  const EPOCH = new Date(2018,0,1);
  const seriesCache = new Map();
  function hashStr(s){ let h=2166136261>>>0; s=String(s||''); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function masterSeries(name){
    if(seriesCache.has(name)) return seriesCache.get(name);
    const seed = hashStr(name); const rnd = mulberry32(seed);
    const vol = 0.14 + (seed%13)/100;           // 14% .. 26% (amplitude des oscillations)
    const mu  = 0.00 + ((seed>>5)%10)/100;       // 0% .. 9% drift annuel
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
  // série rebasée à 100 au strike, du strike à min(today, maturité).
  // Si `target` est fourni, la trajectoire est inclinée pour atterrir à ce niveau
  // (forme conservée), afin d'obtenir des niveaux finaux réalistes et stables.
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
  // niveau final cible (déterministe) d'un sous-jacent, dans une fourchette crédible vs strike
  function targetLevel(p, name){
    const g = gaussSeed(hashStr((p.isin||'')+'|'+name));
    const done = productStatus(p.isin)==='DONE';
    const T = done ? 100*Math.exp(0.10*g+0.05) : 100*Math.exp(0.12*g-0.015);
    return Math.max(58, Math.min(146, T));
  }

  /* ---------------- CALENDRIER D'OBSERVATIONS ---------------- */
  function genSchedule(p){
    const sd=pd(p.strike), mat=pd(p.maturity); if(!sd||!mat) return [];
    const m = freqMonths(p.freq);
    const status = productStatus(p.isin);
    const couponPer = (p.coupon!=null && m) ? p.coupon*m/12 : p.coupon;
    let calledDate=null;
    if(status==='DONE'){
      const no=pd(p.nextObs);
      calledDate = (no && no<mat) ? no : mat;
    }
    const rows=[];
    if(!m){ // bullet / journalière -> une échéance
      rows.push({date:mat, pay:addDays(mat,7), coupon:p.coupon, ac:p.ac, status: today()>=mat?'paid':'next'});
      return rows;
    }
    let d=addMonths(sd,m); let guard=0;
    while(d<=addDays(mat,2) && guard<240){
      guard++;
      const r={date:new Date(d), pay:addDays(d,7), coupon:couponPer, ac:p.ac};
      rows.push(r); d=addMonths(d,m);
    }
    const tod=today();
    rows.forEach(r=>{
      if(status==='DONE' && calledDate){
        if(sameDayOrBefore(r.date,calledDate) && Math.abs(daysBetween(r.date,calledDate))<=20){ r.status='called'; }
        else if(r.date<calledDate){ r.status='paid'; }
        else { r.status='after'; }
      } else {
        if(r.date<=tod){ r.status='paid'; } else { r.status='future'; }
      }
    });
    // marque la prochaine observation pour les produits vivants
    if(status==='LIVE'){ const nx=rows.find(r=>r.status==='future'); if(nx) nx.status='next'; }
    // retire les observations après remboursement
    return rows.filter(r=>r.status!=='after');
  }
  function addDays(d,n){ const x=pd(d); return new Date(x.getFullYear(),x.getMonth(),x.getDate()+n); }
  function sameDayOrBefore(a,b){ return pd(a)<=pd(b); }

  /* ---------------- TABS ---------------- */
  let activeTab='suivi';
  document.querySelectorAll('.dash-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      activeTab=btn.dataset.tab;
      document.querySelectorAll('.dash-tab').forEach(b=>b.classList.toggle('is-active',b===btn));
      document.querySelectorAll('.dash-view').forEach(v=>v.classList.remove('is-active'));
      document.getElementById('view-'+activeTab).classList.add('is-active');
      if(activeTab==='portefeuille') renderPortfolio();
      if(activeTab==='reporting') renderReport();
    });
  });

  function updateStats(){
    document.getElementById('stat-products').textContent = productsMap.size;
    const live = positions.filter(p=>!p._deleted && (p.statut||'LIVE')==='LIVE');
    document.getElementById('stat-live').textContent = live.length;
    const enc = live.reduce((s,p)=>s+(toEur(p.nominal,p.dev)||0),0);
    document.getElementById('stat-encours').textContent = compact(enc);
    // observations dans 30 j (produits vivants distincts)
    const tod=today(), in30=addDays(tod,30); let cnt=0;
    productsMap.forEach((p,isin)=>{ if(productStatus(isin)!=='LIVE') return;
      const sch=genSchedule(p); if(sch.some(r=>(r.status==='next'||r.status==='future') && r.date>=tod && r.date<=in30)) cnt++; });
    document.getElementById('stat-obs').textContent = cnt;
    document.getElementById('tab-count-pf').textContent = positions.filter(p=>!p._deleted).length;
  }
  const FX={EUR:1,USD:0.92,CHF:1.04,GBP:1.17};
  function toEur(n,dev){ return n==null?null:n*(FX[dev]||1); }

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
    const live=Array.from(productsMap.values()).filter(p=>productStatus(p.isin)==='LIVE' && p.uls && p.uls.length);
    const pick=live.slice(0,6);
    box.innerHTML = pick.map(p=>`<button data-isin="${esc(p.isin)}">${esc((p.fam||'')+' · '+(p.uls.map(u=>u.n).slice(0,2).join(', ')))}</button>`).join('');
    box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>doSearch(b.dataset.isin)));
  }

  function findProduct(q){
    q=(q||'').trim(); if(!q) return null;
    const up=q.toUpperCase();
    if(productsMap.has(up)) return productsMap.get(up);
    // recherche souple : ISIN partiel, libellé, sous-jacent
    const ql=q.toLowerCase();
    let best=null;
    for(const p of productsMap.values()){
      const hay=((p.isin||'')+' '+(p.lib||'')+' '+(p.uls||[]).map(u=>u.n).join(' ')).toLowerCase();
      if((p.isin||'').toUpperCase()===up) return p;
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
    const status=productStatus(p.isin);
    const uls=(p.uls||[]);
    const sch=genSchedule(p);
    box.innerHTML = `
      <div class="sp-col-main">
        <div class="sp-phead">
          <div class="sp-phead__badges">
            <span class="sp-badge fam">${esc(p.fam||'Structuré')}</span>
            <span class="sp-badge ${status==='LIVE'?'live':'done'}">${status==='LIVE'?'En cours':'Soldé'}</span>
            ${p.ac!=null?`<span class="sp-badge">Autocall ${pct(p.ac,0)}</span>`:''}
            <span class="sp-badge">${esc(p.dev||'EUR')}</span>
          </div>
          <h2 class="sp-phead__name">${esc(p.lib||p.isin)}</h2>
          <div class="sp-phead__meta">
            <span>ISIN <b class="sp-phead__isin">${esc(p.isin)}</b></span>
            <span>Émetteur <b>${esc(p.emetteur||'—')}</b></span>
            <span>Strike <b>${fmtShort(p.strike)}</b></span>
            <span>Échéance <b>${fmtShort(p.maturity)}</b></span>
          </div>
          ${allocBarHTML(p)}
        </div>

        <div class="sp-card">
          <h4>Évolution des sous-jacents <span style="color:var(--muted);text-transform:none;letter-spacing:0;font-weight:400">— base 100 au strike</span></h4>
          ${uls.length?`
          <div class="sp-chart-legend" id="sp-legend"></div>
          <div class="sp-canvas-box"><canvas id="sp-chart"></canvas><div class="sp-chart-tip" id="sp-tip"></div></div>
          `:'<p style="color:var(--muted)">Aucun sous-jacent renseigné pour ce produit.</p>'}
        </div>

        ${uls.length?`<div class="sp-card">
          <h4>Niveaux de barrière <span style="color:var(--muted);text-transform:none;letter-spacing:0;font-weight:400">— pire sous-jacent vs barrière</span></h4>
          <div id="sp-barriers" class="sp-barriers"></div>
        </div>`:''}
      </div>

      <div class="sp-col-aside">
        <div class="sp-card">
          <h4>Conditions du produit</h4>
          ${conditionsHTML(p, sch)}
        </div>
        <div class="sp-card">
          <h4>Calendrier — coupons & remboursement</h4>
          ${scheduleHTML(p, sch)}
        </div>
      </div>`;

    if(uls.length){ setTimeout(()=>{ drawChart(p); renderBarriers(p); },20); }
    bindAlloc(p);
  }

  /* ---- barre d'allocation ---- */
  function allocBarHTML(p){
    const allocs=positions.filter(x=>x.isin===p.isin && !x._deleted);
    const chips=allocs.slice(0,8).map(a=>`<span class="sp-alloc-chip"><b>${esc(fullName(a))}</b> · ${compact(a.nominal)} ${a._seed?'':''}<i class="x" data-del="${a.id}" title="Retirer">×</i></span>`).join('');
    const more=allocs.length>8?`<span class="sp-alloc-chip" style="opacity:.6">+${allocs.length-8}</span>`:'';
    return `<div class="sp-alloc-bar">
      <span class="lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0119 7"/></svg>Détenteurs</span>
      <div class="sp-alloc-chips">${chips||'<span style="color:var(--muted);font-size:.82rem">Aucune allocation</span>'}${more}</div>
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

  /* ---- conditions ---- */
  function conditionsHTML(p, sch){
    const m=freqMonths(p.freq);
    const couponPer=(p.coupon!=null&&m)?p.coupon*m/12:p.coupon;
    const annual=p.coupon;
    const uls=(p.uls||[]);
    // niveaux courants (pire)
    const cur=currentLevels(p);
    const ulRows=uls.map((u,i)=>{
      const lv=cur.levels[i];
      const cls=lv==null?'':(lv>=100?'positive':'negative');
      return `<div class="sp-ul-row"><span class="dot" style="background:${ulColor(i)}"></span>
        <span class="nm">${esc(u.n)}</span>
        <span class="sk">strike ${u.k!=null?u.k:'—'}</span>
        <span class="pc ${cls}">${lv!=null?lv.toFixed(1)+'%':'—'}</span></div>`;
    }).join('');
    return `
      <div class="sp-cond-hero">
        <div class="y">${annual!=null?pct(annual,2):'—'}</div>
        <div class="yl">Coupon annuel${p.ac!=null?' · autocall':''}</div>
        <div class="ys">${couponPer!=null?pct(couponPer,3)+' par '+freqWord(p.freq):''} ${p.freq?'· '+esc(p.freq.toLowerCase()):''}</div>
      </div>
      <div class="sp-cond-grid">
        <div class="sp-cond-cell"><div class="k">Barrière coupon</div><div class="v">${p.bcpn!=null?pct(p.bcpn,0):'—'}</div></div>
        <div class="sp-cond-cell"><div class="k">Barrière capital</div><div class="v">${p.bcap!=null?pct(p.bcap,0):'—'}</div></div>
        <div class="sp-cond-cell"><div class="k">Seuil autocall</div><div class="v">${p.ac!=null?pct(p.ac,0):'—'}</div></div>
        <div class="sp-cond-cell"><div class="k">Fréquence</div><div class="v">${esc(p.freq||'—')}</div></div>
        <div class="sp-cond-cell"><div class="k">Date de strike</div><div class="v" style="font-size:.86rem">${fmtShort(p.strike)}</div></div>
        <div class="sp-cond-cell"><div class="k">Échéance finale</div><div class="v" style="font-size:.86rem">${fmtShort(p.maturity)}</div></div>
        <div class="sp-cond-cell"><div class="k">Prochaine obs.</div><div class="v" style="font-size:.86rem">${fmtShort(p.nextObs)}</div></div>
        <div class="sp-cond-cell"><div class="k">Nominal type</div><div class="v" style="font-size:.86rem">${p.nominalRef!=null?money(p.nominalRef,p.dev):'—'}</div></div>
      </div>
      <div class="sp-uls">${ulRows}</div>`;
  }
  function freqWord(f){ return ({'Trimestrielle':'trimestre','Mensuelle':'mois','Semestrielle':'semestre','Annuelle':'an','Bimestrielle':'bimestre'})[f]||'période'; }

  function currentLevels(p){
    const uls=(p.uls||[]); const end = pd(p.maturity)&&pd(p.maturity)<today()?p.maturity:today();
    const levels = uls.map(u=>{ const s=rebasedSeries(u.n,p.strike,end,targetLevel(p,u.n)); return s.length?s[s.length-1].v:null; });
    let worst=null,wi=-1; levels.forEach((l,i)=>{ if(l!=null&&(worst==null||l<worst)){worst=l;wi=i;} });
    return {levels, worst, wi};
  }

  /* ---- barrières ---- */
  function renderBarriers(p){
    const host=document.getElementById('sp-barriers'); if(!host) return;
    const cur=currentLevels(p); const uls=(p.uls||[]);
    const worstName = cur.wi>=0?uls[cur.wi].n:'—';
    const bars=[];
    if(p.ac!=null)  bars.push({name:'Seuil autocall', lvl:p.ac*100, color:'#A9853F', desc:'remboursement anticipé'});
    if(p.bcpn!=null)bars.push({name:'Barrière coupon', lvl:p.bcpn*100, color:'#1565c0', desc:'versement du coupon'});
    if(p.bcap!=null)bars.push({name:'Barrière capital', lvl:p.bcap*100, color:'#c0392b', desc:'protection du capital'});
    const note=`<div class="sp-worst-note">Pire sous-jacent : <b>${esc(worstName)}</b> à <b>${cur.worst!=null?cur.worst.toFixed(1)+'%':'—'}</b> du strike</div>`;
    host.innerHTML = note + bars.map(b=>{
      const w=cur.worst==null?100:cur.worst;
      const dist=w-b.lvl; // points vs barrière
      const sev = dist>15?'safe':(dist>0?'warn':'danger');
      const lo=Math.min(40,b.lvl-10), hi=Math.max(130,w+10);
      const posPct=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
      return `<div class="sp-bar ${sev}">
        <div class="sp-bar__top">
          <span class="sp-bar__name"><span class="sp-bar__dot" style="background:${b.color}"></span>${b.name} <span style="color:var(--muted);font-weight:400">(${b.lvl.toFixed(0)}%)</span></span>
          <span class="sp-bar__dist">${dist>=0?'+':''}${dist.toFixed(1)} pts</span>
        </div>
        <div class="sp-bar__track">
          <div class="sp-bar__barrier" style="left:${posPct(b.lvl)}%" data-l="${b.lvl.toFixed(0)}%"></div>
          <div class="sp-bar__cur" style="left:${posPct(w)}%"><i style="background:${b.color}"></i><span>${w.toFixed(1)}%</span></div>
        </div>
        <div class="sp-bar__scale"><span>${lo.toFixed(0)}%</span><span style="color:var(--muted)">${b.desc}</span><span>${hi.toFixed(0)}%</span></div>
      </div>`;
    }).join('');
  }

  /* ---- calendrier ---- */
  function scheduleHTML(p, sch){
    if(!sch.length) return '<p style="color:var(--muted)">Calendrier indisponible (dates manquantes).</p>';
    const rows=sch.map(r=>{
      let cls='', label='', lcls='';
      if(r.status==='paid'){ cls='paid'; label='Payé'; lcls='st-paid'; }
      else if(r.status==='called'){ cls='called'; label='Remboursé'; lcls='st-called'; }
      else if(r.status==='next'){ cls='next'; label='Prochaine'; lcls='st-coupon'; }
      else { cls='future'; label='À venir'; lcls='st-future'; }
      const cpn=r.coupon!=null?pct(r.coupon,3):'—';
      return `<div class="sp-sched-row ${cls}">
        <div class="sp-sched-mark"><span class="sp-sched-dot"></span></div>
        <div class="sp-sched-info">
          <div class="dt">${fmtShort(r.date)}</div>
          <div class="sub">Paiement ${fmtShort(r.pay)} · seuil ${r.ac!=null?pct(r.ac,0):'—'}</div>
        </div>
        <div class="sp-sched-right">
          <div class="sp-sched-cpn">${r.status==='called'?'Capital + '+cpn:cpn}</div>
          <span class="sp-sched-status ${lcls}">${label}</span>
        </div>
      </div>`;
    }).join('');
    return `<div class="sp-sched">${rows}</div>
      <div class="sp-sched-legend">
        <span><i style="background:#2e7d32"></i>Coupon payé</span>
        <span><i style="background:#A9853F"></i>Remboursé (autocall)</span>
        <span><i style="background:#fff;border:2px solid #A9853F"></i>À venir</span>
      </div>`;
  }

  /* ---- graphique multi-séries ---- */
  function drawChart(p){
    const canvas=document.getElementById('sp-chart'); if(!canvas) return;
    const uls=(p.uls||[]);
    const end = pd(p.maturity)&&pd(p.maturity)<today()?p.maturity:today();
    const series = uls.map((u,i)=>({name:u.n, color:ulColor(i), pts:rebasedSeries(u.n,p.strike,end,targetLevel(p,u.n)), on:true}));
    // pire sous-jacent (série)
    const len=Math.min(...series.map(s=>s.pts.length));
    const worst=[]; for(let k=0;k<len;k++){ let mv=Infinity,t=series[0].pts[k].t; series.forEach(s=>{ if(s.pts[k].v<mv){mv=s.pts[k].v;} }); worst.push({t,v:mv}); }
    chartState={p, series, worst, range:'max', hover:-1, showWorst:uls.length>1};

    // légende
    const leg=document.getElementById('sp-legend');
    const cur=currentLevels(p);
    leg.innerHTML = series.map((s,i)=>`<span class="sp-leg" data-i="${i}"><span class="ln" style="background:${s.color}"></span><b>${esc(s.name)}</b> <span class="lv">${cur.levels[i]!=null?cur.levels[i].toFixed(1)+'%':''}</span></span>`).join('')
      + (chartState.showWorst?`<span class="sp-leg" data-i="worst"><span class="ln" style="background:#001B00;height:4px"></span><b>Pire</b> <span class="lv">${cur.worst!=null?cur.worst.toFixed(1)+'%':''}</span></span>`:'')
      + `<span class="sp-rangebtns">${['6M','1A','3A','Max'].map(r=>`<button data-r="${r}" class="${r==='Max'?'on':''}">${r}</button>`).join('')}</span>`;
    leg.querySelectorAll('.sp-leg[data-i]').forEach(el=>el.addEventListener('click',()=>{
      const id=el.dataset.i;
      if(id==='worst'){ chartState.showWorst=!chartState.showWorst; el.classList.toggle('off',!chartState.showWorst); }
      else { const s=series[+id]; s.on=!s.on; el.classList.toggle('off',!s.on); }
      paint();
    }));
    leg.querySelectorAll('.sp-rangebtns button').forEach(b=>b.addEventListener('click',()=>{
      leg.querySelectorAll('.sp-rangebtns button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
      chartState.range=b.dataset.r; paint();
    }));

    const ro=()=>paint();
    window.removeEventListener('resize', chartState._ro||(()=>{}));
    chartState._ro=ro; window.addEventListener('resize', ro);
    paint();

    canvas.onmousemove=function(e){
      const br=canvas.getBoundingClientRect(); const mx=(e.clientX-br.left);
      chartState.hover=mx; paint();
    };
    canvas.onmouseleave=function(){ chartState.hover=-1; document.getElementById('sp-tip').style.opacity=0; paint(); };
  }

  function rangeStart(range){
    const t=today();
    if(range==='6M') return addMonths(t,-6).getTime();
    if(range==='1A') return addMonths(t,-12).getTime();
    if(range==='3A') return addMonths(t,-36).getTime();
    return 0;
  }

  function paint(){
    if(!chartState) return;
    const {p, series, worst} = chartState;
    const canvas=document.getElementById('sp-chart'); if(!canvas) return;
    const tip=document.getElementById('sp-tip');
    const dpr=window.devicePixelRatio||1;
    const w=canvas.parentElement.getBoundingClientRect().width, h=300;
    canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=w+'px'; canvas.style.height=h+'px';
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const pad={t:14,r:54,b:26,l:14};
    const x0=pad.l, x1=w-pad.r, y0=pad.t, y1=h-pad.b;

    const rs=rangeStart(chartState.range);
    const visible=series.filter(s=>s.on);
    const allPts=[]; visible.forEach(s=>s.pts.forEach(pt=>{ if(pt.t>=rs) allPts.push(pt.v); }));
    if(chartState.showWorst) worst.forEach(pt=>{ if(pt.t>=rs) allPts.push(pt.v); });
    // bornes incluant barrières
    const barr=[100]; if(p.ac!=null)barr.push(p.ac*100); if(p.bcpn!=null)barr.push(p.bcpn*100); if(p.bcap!=null)barr.push(p.bcap*100);
    let lo=Math.min(...allPts, ...barr), hi=Math.max(...allPts, ...barr);
    if(!isFinite(lo)){lo=50;hi=120;} const padR=(hi-lo)*0.08||5; lo-=padR; hi+=padR;
    // domaine x
    const tmin=Math.max(rs, pd(p.strike)?pd(p.strike).getTime():rs);
    let tmax=-Infinity; visible.concat([{pts:worst}]).forEach(s=>s.pts.forEach(pt=>{ if(pt.t>tmax)tmax=pt.t; }));
    if(!isFinite(tmax)) tmax=today().getTime();
    const sx=t=>x0+(x1-x0)*((t-tmin)/((tmax-tmin)||1));
    const sy=v=>y1-(y1-y0)*((v-lo)/((hi-lo)||1));

    // grille horizontale + axe
    ctx.font='10px Jost,sans-serif'; ctx.textBaseline='middle';
    for(let i=0;i<=4;i++){ const v=lo+(hi-lo)*i/4; const y=sy(v);
      ctx.strokeStyle='#eee8da'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
      ctx.fillStyle='#a8a496'; ctx.textAlign='left'; ctx.fillText(v.toFixed(0)+'%', x1+6, y);
    }
    // lignes de barrière
    function barLine(v,col,dash,label){ if(v==null) return; const y=sy(v*100);
      ctx.strokeStyle=col; ctx.lineWidth=1.4; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=col; ctx.font='600 9px Jost,sans-serif'; ctx.textAlign='left'; ctx.fillText(label, x0+3, y-6);
    }
    barLine(1,'#8a8780',[2,3],'Strike 100%');
    if(p.ac!=null) barLine(p.ac,'#A9853F',[5,3],'Autocall '+(p.ac*100).toFixed(0)+'%');
    if(p.bcpn!=null) barLine(p.bcpn,'#1565c0',[5,3],'Coupon '+(p.bcpn*100).toFixed(0)+'%');
    if(p.bcap!=null) barLine(p.bcap,'#c0392b',[5,3],'Capital '+(p.bcap*100).toFixed(0)+'%');

    // axe x (années)
    ctx.fillStyle='#a8a496'; ctx.font='10px Jost,sans-serif'; ctx.textAlign='center';
    const span=tmax-tmin; const yStep= span>3*31536000000?12:(span>31536000000?6:3);
    let dd=new Date(tmin); dd.setDate(1);
    for(let g=0;g<60;g++){ const t=dd.getTime(); if(t>tmax) break; if(t>=tmin){ const x=sx(t);
      ctx.strokeStyle='#f2eee3'; ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke();
      ctx.fillText((dd.getMonth()===0?dd.getFullYear():MONTHS[dd.getMonth()].replace('.',''))+'', x, y1+14); }
      dd=addMonths(dd,yStep);
    }

    // pire sous-jacent (aire + ligne épaisse)
    function drawSeries(pts,col,width,fill){
      const vis=pts.filter(pt=>pt.t>=tmin); if(vis.length<2) return;
      if(fill){ const grad=ctx.createLinearGradient(0,y0,0,y1); grad.addColorStop(0,col+'22'); grad.addColorStop(1,col+'02');
        ctx.beginPath(); ctx.moveTo(sx(vis[0].t),y1); vis.forEach(pt=>ctx.lineTo(sx(pt.t),sy(pt.v))); ctx.lineTo(sx(vis[vis.length-1].t),y1); ctx.closePath(); ctx.fillStyle=grad; ctx.fill(); }
      ctx.beginPath(); vis.forEach((pt,i)=>{ const X=sx(pt.t),Y=sy(pt.v); i?ctx.lineTo(X,Y):ctx.moveTo(X,Y); });
      ctx.strokeStyle=col; ctx.lineWidth=width; ctx.lineJoin='round'; ctx.stroke();
    }
    visible.forEach(s=>drawSeries(s.pts,s.color,1.8,false));
    if(chartState.showWorst) drawSeries(worst,'#001B00',2.6,true);

    // points de fin
    visible.forEach(s=>{ const vis=s.pts.filter(pt=>pt.t>=tmin); if(!vis.length)return; const last=vis[vis.length-1];
      ctx.beginPath(); ctx.arc(sx(last.t),sy(last.v),3.5,0,7); ctx.fillStyle=s.color; ctx.fill(); });

    // hover
    if(chartState.hover>=0){
      const tHov=tmin+(chartState.hover-x0)/((x1-x0)||1)*(tmax-tmin);
      if(tHov>=tmin && tHov<=tmax){
        const x=sx(tHov);
        ctx.strokeStyle='rgba(0,27,0,.18)'; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke(); ctx.setLineDash([]);
        const rows=[]; let nearestDate=null;
        const all=visible.concat(chartState.showWorst?[{name:'Pire',color:'#001B00',pts:worst}]:[]);
        all.forEach(s=>{ const vis=s.pts.filter(pt=>pt.t>=tmin); if(!vis.length)return;
          let nb=vis[0],md=Infinity; vis.forEach(pt=>{const d=Math.abs(pt.t-tHov); if(d<md){md=d;nb=pt;}}); nearestDate=nb.t;
          ctx.beginPath(); ctx.arc(sx(nb.t),sy(nb.v),4,0,7); ctx.fillStyle=s.color; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
          rows.push(`<div class="r"><span>${esc(s.name)}</span><span class="v" style="color:${s.color==='#001B00'?'#e6c988':'#fff'}">${nb.v.toFixed(1)}%</span></div>`); });
        tip.innerHTML=`<div class="d">${fmtShort(new Date(nearestDate))}</div>${rows.join('')}`;
        tip.style.opacity=1;
        let tx=x+12; if(tx> w-150) tx=x-145; tip.style.left=tx+'px'; tip.style.top='14px';
      }
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
      <p style="color:var(--muted);font-size:.88rem;margin:0 0 16px">Allouer <b style="color:var(--green)">${esc(p.lib||p.isin)}</b> à un contact du CRM ou à un détenteur libre. Une ligne sera créée dans le Portefeuille.</p>
      <div class="sp-alloc-form">
        <div class="sp-fld"><label>Contact CRM</label>
          <select id="al-crm"><option value="">— Sélectionner —</option>${opts}</select></div>
        <div class="sp-form-grid">
          <div class="sp-fld"><label>Prénom / Société</label><input id="al-prenom"></div>
          <div class="sp-fld"><label>Nom</label><input id="al-nom"></div>
          <div class="sp-fld"><label>Taille (nominal ${symbol(p.dev)})</label><input id="al-nominal" type="number" inputmode="numeric" placeholder="ex : 100000"></div>
          <div class="sp-fld"><label>Compte / Enveloppe</label><input id="al-compte" placeholder="ex : UBS, AV…"></div>
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
        ${existing.length?existing.map(a=>`<div class="sp-alloc-list-row"><span class="nm">${esc(fullName(a))}</span><span class="sz">${money(a.nominal,a.dev)} · ${esc(a.compte||'—')} · ${(a.statut||'LIVE')==='LIVE'?'en cours':'soldé'}</span></div>`).join(''):'<p style="color:var(--muted);font-size:.85rem">Aucun pour l\'instant.</p>'}
      </div>`;
    document.getElementById('al-crm').addEventListener('change',function(){
      const c=crmClients.find(x=>String(x.id)===this.value); if(c){ document.getElementById('al-prenom').value=c.prenom||''; document.getElementById('al-nom').value=c.nom||''; }
    });
    document.getElementById('al-save').addEventListener('click',()=>{
      const prenom=document.getElementById('al-prenom').value.trim();
      const nom=document.getElementById('al-nom').value.trim();
      const nominal=parseFloat(document.getElementById('al-nominal').value)||null;
      if(!prenom && !nom){ document.getElementById('al-status').textContent='Indiquez un détenteur.'; document.getElementById('al-status').style.color='#c0392b'; return; }
      const pos={ id:++nextLocalId, isin:p.isin, prenom, nom, nominal, dev:p.dev,
        compte:document.getElementById('al-compte').value.trim()||null,
        vendeur:document.getElementById('al-vendeur').value.trim()||null,
        trade:document.getElementById('al-trade').value||null,
        client_id:document.getElementById('al-crm').value||null, statut:'LIVE' };
      const st=document.getElementById('al-status'); st.textContent='Enregistrement…'; st.style.color='var(--muted)';
      savePosition(pos).then(()=>{ st.textContent='✓ Allocation créée'; st.style.color='#2e7d32';
        updateStats(); buildReportSelect();
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
    if(pos._seed && SB && sbPositions){
      return fetch(API+'/sp_positions',{method:'POST',headers:headers(),body:JSON.stringify(Object.assign(toDbPosition(pos),{seed_id:pos.id,deleted:true}))})
        .then(()=>{ positions=positions.filter(x=>x!==pos); updateStats(); }).catch(()=>{ positions=positions.filter(x=>x!==pos); updateStats(); });
    }
    positions=positions.filter(x=>String(x.id)!==String(pos.id));
    if(SB && sbPositions && pos._db && !pos._seed){ fetch(API+'/sp_positions?id=eq.'+pos.id,{method:'DELETE',headers:headers()}).catch(()=>{}); }
    updateStats(); return Promise.resolve();
  }
  function saveProduct(p){
    productsMap.set(p.isin, Object.assign(productsMap.get(p.isin)||{}, p));
    buildIsinList();
    if(!SB || !sbProducts) return Promise.resolve();
    return fetch(API+'/sp_products', {method:'POST', headers:headers({'Prefer':'resolution=merge-duplicates,return=minimal'}), body:JSON.stringify(toDbProduct(p))})
      .catch(()=>{ sbProducts=false; });
  }

  /* ===================================================================
     ONGLET 2 — PORTEFEUILLE
     =================================================================== */
  let pfLimit=60;
  document.getElementById('pf-search').addEventListener('input',()=>{ pfLimit=60; renderPortfolio(); });
  document.getElementById('pf-filter-statut').addEventListener('change',()=>{ pfLimit=60; renderPortfolio(); });
  document.getElementById('pf-filter-emetteur').addEventListener('change',()=>{ pfLimit=60; renderPortfolio(); });

  function buildFilters(){
    const stSel=document.getElementById('pf-filter-statut');
    if(stSel.options.length<=1){ ['LIVE','DONE'].forEach(s=>stSel.add(new Option(s==='LIVE'?'En cours':'Soldé',s))); }
    const emSel=document.getElementById('pf-filter-emetteur');
    if(emSel.options.length<=1){ const em=new Set(); productsMap.forEach(p=>{ if(p.emetteur) em.add(p.emetteur); });
      Array.from(em).sort().forEach(e=>emSel.add(new Option(e,e))); }
  }

  function renderPortfolio(){
    buildFilters();
    const q=(document.getElementById('pf-search').value||'').toLowerCase().trim();
    const fSt=document.getElementById('pf-filter-statut').value;
    const fEm=document.getElementById('pf-filter-emetteur').value;
    let list=positions.filter(p=>!p._deleted).map(p=>({pos:p, prod:productsMap.get(p.isin)||{isin:p.isin}}));
    if(fSt) list=list.filter(x=>(x.pos.statut||'LIVE')===fSt);
    if(fEm) list=list.filter(x=>x.prod.emetteur===fEm);
    if(q) list=list.filter(x=>{
      const hay=((x.pos.isin||'')+' '+(x.prod.lib||'')+' '+(x.prod.emetteur||'')+' '+fullName(x.pos)+' '+(x.prod.uls||[]).map(u=>u.n).join(' ')).toLowerCase();
      return hay.includes(q);
    });
    // tri : en cours d'abord, puis prochaine obs
    list.sort((a,b)=>{
      const la=(a.pos.statut||'LIVE')==='LIVE'?0:1, lb=(b.pos.statut||'LIVE')==='LIVE'?0:1;
      if(la!==lb) return la-lb;
      return (pd(b.prod.strike)||0)-(pd(a.prod.strike)||0);
    });

    // résumé
    const liveList=list.filter(x=>(x.pos.statut||'LIVE')==='LIVE');
    const enc=liveList.reduce((s,x)=>s+(toEur(x.pos.nominal,x.pos.dev)||0),0);
    const distinct=new Set(list.map(x=>x.pos.isin)).size;
    const coupons=list.reduce((s,x)=>s+((x.pos.gc!=null?x.pos.gc:0)*(toEur(x.pos.nominal,x.pos.dev)||0)),0);
    document.getElementById('pf-summary').innerHTML=`
      <div class="sp-pf-sum-card"><div class="v">${list.length}</div><div class="l">Lignes affichées</div></div>
      <div class="sp-pf-sum-card"><div class="v">${distinct}</div><div class="l">Produits distincts</div></div>
      <div class="sp-pf-sum-card"><div class="v">${compact(enc)}</div><div class="l">Encours en cours</div></div>
      <div class="sp-pf-sum-card"><div class="v">${compact(coupons)}</div><div class="l">Coupons estimés perçus</div></div>`;

    const tbody=document.getElementById('pf-list');
    const slice=list.slice(0,pfLimit);
    if(!slice.length){ tbody.innerHTML='<tr><td colspan="10" class="dash-empty"><p>Aucune ligne ne correspond.</p></td></tr>'; document.getElementById('pf-more').hidden=true; return; }
    tbody.innerHTML=slice.map(x=>{
      const p=x.prod, pos=x.pos; const status=(pos.statut||'LIVE');
      const sch=p.uls?genSchedule(p):[]; const nx=sch.find(r=>r.status==='next'||r.status==='future');
      return `<tr data-isin="${esc(pos.isin)}">
        <td class="sp-pf-prod">${esc(p.lib||'—')}<small>${esc(p.fam||'')} · ${esc(p.dev||'EUR')}</small></td>
        <td><span class="sp-pf-isin">${esc(pos.isin)}</span></td>
        <td>${esc(p.emetteur||'—')}</td>
        <td class="sp-pf-uls">${esc((p.uls||[]).map(u=>u.n).join(', ')||'—')}</td>
        <td>${esc(fullName(pos))}${pos.compte?'<br><small style="color:var(--muted)">'+esc(pos.compte)+'</small>':''}</td>
        <td class="num">${pos.nominal!=null?money(pos.nominal,pos.dev):'—'}</td>
        <td class="num">${p.coupon!=null?pct(p.coupon,2):'—'}</td>
        <td>${status==='LIVE'&&nx?fmtShort(nx.date):'—'}</td>
        <td><span class="sp-chip-status ${status==='LIVE'?'cs-live':'cs-done'}">${status==='LIVE'?'En cours':'Soldé'}</span></td>
        <td><div class="sp-row-act">
          <button class="sp-icon-btn act-view" title="Voir le suivi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="sp-icon-btn act-edit" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="sp-icon-btn act-del" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
        </div></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('tr[data-isin]').forEach(tr=>{
      const isin=tr.dataset.isin; const pos=slice.find(s=>s.pos.isin===isin);
      tr.querySelector('.act-view').addEventListener('click',e=>{ e.stopPropagation(); gotoProduct(isin); });
      tr.querySelector('.act-edit').addEventListener('click',e=>{ e.stopPropagation(); openEdit(productsMap.get(isin), findPos(tr)); });
      tr.querySelector('.act-del').addEventListener('click',e=>{ e.stopPropagation(); const pp=findPos(tr); if(pp && confirm('Supprimer cette ligne ?')){ removePosition(pp); renderPortfolio(); } });
      tr.addEventListener('click',()=>gotoProduct(isin));
    });
    function findPos(tr){ const rows=tbody.querySelectorAll('tr'); const i=Array.prototype.indexOf.call(rows,tr); return slice[i]?slice[i].pos:null; }
    const more=document.getElementById('pf-more');
    if(list.length>pfLimit){ more.hidden=false; more.innerHTML=`<button id="pf-more-btn">Afficher plus (${list.length-pfLimit} restantes)</button>`;
      document.getElementById('pf-more-btn').onclick=()=>{ pfLimit+=80; renderPortfolio(); }; }
    else more.hidden=true;
  }
  function gotoProduct(isin){
    const p=productsMap.get(isin); if(!p) return;
    document.querySelector('.dash-tab[data-tab="suivi"]').click();
    searchInput.value=isin; renderProduct(p);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  /* ---- édition produit + ligne ---- */
  const editModal=document.getElementById('edit-modal');
  document.getElementById('edit-close').addEventListener('click',()=>editModal.classList.remove('is-open'));
  editModal.addEventListener('click',e=>{ if(e.target===editModal) editModal.classList.remove('is-open'); });
  function openEdit(prod, pos){
    prod=prod||{isin:'',uls:[]}; pos=pos||null;
    document.getElementById('edit-title').textContent = pos?'Modifier la ligne':'Nouveau produit';
    document.getElementById('edit-body').innerHTML = productFormHTML(prod,pos);
    bindProductForm(prod,pos);
    editModal.classList.add('is-open');
    document.getElementById('edit-body').parentElement.scrollTop=0;
  }
  function productFormHTML(p,pos){
    const u=(p.uls||[]); const ul=(i)=>u[i]||{};
    const freqs=['Trimestrielle','Mensuelle','Semestrielle','Annuelle','Bimestrielle','Bullet'];
    return `
      <div class="sp-form-grid">
        <div class="sp-form-section">Produit</div>
        <div class="sp-fld full"><label>Libellé</label><input id="e-lib" value="${esc(p.lib||'')}"></div>
        <div class="sp-fld"><label>ISIN</label><input id="e-isin" value="${esc(p.isin||'')}" ${p.isin?'':''}></div>
        <div class="sp-fld"><label>Émetteur</label><input id="e-emetteur" value="${esc(p.emetteur||'')}"></div>
        <div class="sp-fld"><label>Famille</label><input id="e-fam" value="${esc(p.fam||'')}" placeholder="Phoenix, Athéna…"></div>
        <div class="sp-fld"><label>Devise</label><select id="e-dev">${['EUR','USD','CHF','GBP'].map(d=>`<option ${d===(p.dev||'EUR')?'selected':''}>${d}</option>`).join('')}</select></div>
        <div class="sp-fld"><label>Coupon annuel (ex 0.093)</label><input id="e-coupon" type="number" step="0.0001" value="${p.coupon!=null?p.coupon:''}"></div>
        <div class="sp-fld"><label>Fréquence</label><select id="e-freq">${freqs.map(f=>`<option ${f===p.freq?'selected':''}>${f}</option>`).join('')}</select></div>
        <div class="sp-fld"><label>Seuil autocall (ex 1 = 100%)</label><input id="e-ac" type="number" step="0.01" value="${p.ac!=null?p.ac:''}"></div>
        <div class="sp-fld"><label>Barrière coupon (ex 0.7)</label><input id="e-bcpn" type="number" step="0.01" value="${p.bcpn!=null?p.bcpn:''}"></div>
        <div class="sp-fld"><label>Barrière capital (ex 0.6)</label><input id="e-bcap" type="number" step="0.01" value="${p.bcap!=null?p.bcap:''}"></div>
        <div class="sp-fld"><label>Date de strike</label><input id="e-strike" type="date" value="${p.strike?String(p.strike).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Prochaine observation</label><input id="e-nextobs" type="date" value="${p.nextObs?String(p.nextObs).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Échéance finale</label><input id="e-maturity" type="date" value="${p.maturity?String(p.maturity).slice(0,10):''}"></div>
        <div class="sp-fld"><label>Nominal type</label><input id="e-nominalref" type="number" value="${p.nominalRef!=null?p.nominalRef:''}"></div>
        <div class="sp-form-section">Sous-jacents (nom · niveau de strike)</div>
        ${[0,1,2,3,4].map(i=>`<div class="sp-fld"><label>Sous-jacent ${i+1}</label><input id="e-uln${i}" value="${esc(ul(i).n||'')}" placeholder="Nom"></div>
          <div class="sp-fld"><label>Strike ${i+1}</label><input id="e-ulk${i}" type="number" step="0.0001" value="${ul(i).k!=null?ul(i).k:''}"></div>`).join('')}
        ${pos?`<div class="sp-form-section">Ligne (détenteur)</div>
        <div class="sp-fld"><label>Prénom / Société</label><input id="e-prenom" value="${esc(pos.prenom||'')}"></div>
        <div class="sp-fld"><label>Nom</label><input id="e-nom" value="${esc(pos.nom||'')}"></div>
        <div class="sp-fld"><label>Nominal</label><input id="e-nominal" type="number" value="${pos.nominal!=null?pos.nominal:''}"></div>
        <div class="sp-fld"><label>Compte</label><input id="e-compte" value="${esc(pos.compte||'')}"></div>
        <div class="sp-fld"><label>Statut</label><select id="e-statut"><option ${pos.statut!=='DONE'?'selected':''}>LIVE</option><option ${pos.statut==='DONE'?'selected':''}>DONE</option></select></div>
        <div class="sp-fld"><label>Coupons perçus % (ex 0.18)</label><input id="e-gc" type="number" step="0.0001" value="${pos.gc!=null?pos.gc:''}"></div>`:''}
      </div>
      <div class="sp-save-bar">
        <button class="btn btn--solid" id="e-save">Enregistrer</button>
        ${pos&&!pos._seed?'<button class="btn" id="e-delete" style="border-color:#c0392b;color:#c0392b">Supprimer</button>':''}
        <span class="sp-save-status" id="e-status"></span>
      </div>`;
  }
  function bindProductForm(prod,pos){
    document.getElementById('e-save').addEventListener('click',()=>{
      const isin=(document.getElementById('e-isin').value.trim()||prod.isin||('TMP'+(++nextLocalId))).toUpperCase();
      const uls=[]; for(let i=0;i<5;i++){ const n=document.getElementById('e-uln'+i).value.trim(); if(n){ uls.push({n, k:numv('e-ulk'+i)}); } }
      const np={ isin, lib:val('e-lib'), emetteur:val('e-emetteur'), fam:val('e-fam')||'Autre', dev:val('e-dev'),
        coupon:numv('e-coupon'), freq:val('e-freq'), ac:numv('e-ac'), bcpn:numv('e-bcpn'), bcap:numv('e-bcap'),
        strike:val('e-strike')||null, nextObs:val('e-nextobs')||null, maturity:val('e-maturity')||null,
        nominalRef:numv('e-nominalref'), uls };
      const st=document.getElementById('e-status'); st.textContent='Enregistrement…'; st.style.color='var(--muted)';
      saveProduct(np).then(()=>{
        if(pos){ const upos=Object.assign({},pos,{ isin, prenom:val('e-prenom'), nom:val('e-nom'), nominal:numv('e-nominal'),
            compte:val('e-compte'), statut:val('e-statut'), gc:numv('e-gc') });
          return savePosition(upos);
        } else if(document.getElementById('e-prenom')){ /* n/a */ }
      }).then(()=>{
        st.textContent='✓ Enregistré'; st.style.color='#2e7d32'; updateStats(); buildReportSelect();
        setTimeout(()=>{ editModal.classList.remove('is-open'); renderPortfolio();
          if(currentProduct && currentProduct.isin===prod.isin){ renderProduct(productsMap.get(prod.isin)); } },650);
      });
    });
    const del=document.getElementById('e-delete');
    if(del) del.addEventListener('click',()=>{ if(confirm('Supprimer cette ligne ?')){ removePosition(pos).then(()=>{ editModal.classList.remove('is-open'); renderPortfolio(); }); } });
    function val(id){ const e=document.getElementById(id); return e?(e.value.trim()||null):null; }
    function numv(id){ const e=document.getElementById(id); if(!e||e.value==='')return null; const n=parseFloat(e.value); return isNaN(n)?null:n; }
  }
  // exposer pour boutons
  function val(id){ const e=document.getElementById(id); return e?(e.value.trim()||null):null; }
  function numv(id){ const e=document.getElementById(id); if(!e||e.value==='')return null; const n=parseFloat(e.value); return isNaN(n)?null:n; }

  document.getElementById('pf-add-manual').addEventListener('click',()=>openEdit({isin:'',uls:[]}, {id:++nextLocalId, statut:'LIVE', dev:'EUR'}));

  /* ---- import TS / KID ---- */
  const importModal=document.getElementById('import-modal');
  document.getElementById('import-close').addEventListener('click',()=>importModal.classList.remove('is-open'));
  importModal.addEventListener('click',e=>{ if(e.target===importModal) importModal.classList.remove('is-open'); });
  document.getElementById('pf-import-ts').addEventListener('click',()=>openImport('TS'));
  document.getElementById('pf-import-kid').addEventListener('click',()=>openImport('KID'));

  function openImport(kind){
    document.getElementById('import-title').textContent = kind==='TS'?'Importer une Term Sheet':'Importer un KID';
    document.getElementById('import-body').innerHTML=`
      <p style="color:var(--muted);font-size:.9rem;margin:0 0 16px">Déposez le PDF (${kind==='TS'?'Term Sheet':'Key Information Document'}). Les caractéristiques détectées seront pré-remplies dans un formulaire éditable, puis ajoutées au portefeuille.</p>
      <label class="sp-drop" id="sp-drop">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>
        <div><b>Cliquez ou glissez le PDF ici</b></div>
        <div style="font-size:.82rem;margin-top:5px">PDF · TS / KID — l'analyse est faite localement dans le navigateur</div>
        <input type="file" id="sp-file" accept="application/pdf,.pdf,.txt">
      </label>
      <div class="sp-import-status" id="sp-import-status"></div>
      <div id="sp-import-form"></div>`;
    const drop=document.getElementById('sp-drop'), file=document.getElementById('sp-file');
    ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over');}));
    ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');}));
    drop.addEventListener('drop',e=>{ if(e.dataTransfer.files[0]) handleImport(e.dataTransfer.files[0],kind); });
    file.addEventListener('change',()=>{ if(file.files[0]) handleImport(file.files[0],kind); });
    importModal.classList.add('is-open');
  }
  function setImpStatus(msg,cls){ const s=document.getElementById('sp-import-status'); s.className='sp-import-status show '+(cls||''); s.textContent=msg; }

  function handleImport(f,kind){
    setImpStatus('Lecture du document…','work');
    const reader=new FileReader();
    if(/pdf$/i.test(f.name) || f.type==='application/pdf'){
      reader.onload=()=>extractPdfText(reader.result).then(txt=>parseAndForm(txt,kind,f.name)).catch(err=>{ console.warn(err); setImpStatus('Impossible de lire le PDF. Saisissez les champs manuellement.','err'); parseAndForm('',kind,f.name); });
      reader.readAsArrayBuffer(f);
    } else {
      reader.onload=()=>parseAndForm(String(reader.result||''),kind,f.name); reader.readAsText(f);
    }
  }
  function extractPdfText(buf){
    if(!window.pdfjsLib) return Promise.reject('pdfjs absent');
    return pdfjsLib.getDocument({data:buf}).promise.then(doc=>{
      const pages=[]; const N=Math.min(doc.numPages,8);
      const seq=[]; for(let i=1;i<=N;i++) seq.push(i);
      return seq.reduce((pr,i)=>pr.then(()=>doc.getPage(i).then(pg=>pg.getTextContent()).then(tc=>{ pages.push(tc.items.map(it=>it.str).join(' ')); })),Promise.resolve()).then(()=>pages.join('\n'));
    });
  }

  function parseTermSheet(txt){
    const out={uls:[]};
    const T=txt.replace(/\s+/g,' ');
    const isin=(T.match(/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/)||[])[1]; if(isin) out.isin=isin;
    // émetteur
    const em=(T.match(/(?:Issuer|Émetteur|Emetteur)\s*[:\-]?\s*([A-Za-zÀ-ÿ&\. ]{3,40})/i)||[])[1]; if(em) out.emetteur=em.trim().replace(/ (Notes?|Programme|S\.A).*/i,'');
    // coupon
    const cp=(T.match(/(?:Coupon|Coupon Rate|Taux de coupon)\s*[:\-]?\s*(?:de\s*)?(\d{1,2}[.,]\d{1,3})\s*%/i)||T.match(/(\d{1,2}[.,]\d{1,3})\s*%\s*(?:p\.a\.|per annum|par an)/i)||[]);
    if(cp[1]) out.coupon=parseFloat(cp[1].replace(',','.'))/100;
    // barrières
    const bc=(T.match(/(?:Capital|Protection|Barrier|Barrière)\s*(?:Barrier|de capital)?\s*[:\-]?\s*(\d{2,3})\s*%/i)||[]); if(bc[1]) out.bcap=parseInt(bc[1])/100;
    const bcp=(T.match(/(?:Coupon Barrier|Barrière de coupon|Coupon Trigger)\s*[:\-]?\s*(\d{2,3})\s*%/i)||[]); if(bcp[1]) out.bcpn=parseInt(bcp[1])/100;
    const ac=(T.match(/(?:Autocall|Auto-?call|Early Redemption)\s*(?:Trigger|Level|Barrier)?\s*[:\-]?\s*(\d{2,3})\s*%/i)||[]); if(ac[1]) out.ac=parseInt(ac[1])/100;
    // fréquence
    if(/quarter|trimestr/i.test(T)) out.freq='Trimestrielle'; else if(/semi-?annual|semestr/i.test(T)) out.freq='Semestrielle';
    else if(/monthly|mensuel/i.test(T)) out.freq='Mensuelle'; else if(/annual|annuel/i.test(T)) out.freq='Annuelle';
    // devise
    const dv=(T.match(/\b(EUR|USD|CHF|GBP)\b/)||[])[1]; if(dv) out.dev=dv;
    // dates
    const ds=T.match(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\b/g)||[];
    const toIso=s=>{ const m=s.split(/[\/\.-]/); if(m.length<3)return null; let[a,b,c]=m; if(a.length===4){return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;} if(c.length===2)c='20'+c; return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`; };
    if(ds[0]) out.strike=toIso(ds[0]);
    if(ds.length>1) out.maturity=toIso(ds[ds.length-1]);
    // sous-jacents (heuristique : mots après "Underlying(s)")
    const um=T.match(/(?:Underlyings?|Sous-?jacents?|Basket)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9&\.,\/\- ]{3,80})/i);
    if(um){ um[1].split(/[,;\/]| and | et /i).map(s=>s.trim()).filter(s=>s.length>1&&s.length<30).slice(0,5).forEach(n=>out.uls.push({n})); }
    // libellé
    out.lib = out.uls.length?(`${out.freq?'Autocall':''} ${out.uls.map(u=>u.n).join(', ')}`).trim():'';
    return out;
  }

  function parseAndForm(txt,kind,fname){
    const parsed = parseTermSheet(txt);
    const got = Object.keys(parsed).filter(k=>k!=='uls'&&parsed[k]).length + (parsed.uls.length?1:0);
    if(got>=2) setImpStatus(`✓ ${got} champ(s) détecté(s) dans ${esc(fname)} — vérifiez puis enregistrez.`,'ok');
    else setImpStatus(`Peu de champs détectés automatiquement. Complétez le formulaire ci-dessous.`,'err');
    if(!parsed.fam) parsed.fam = /phoenix/i.test(txt)?'Phoenix':(/athena|athéna/i.test(txt)?'Athéna':'Autocall');
    // formulaire pré-rempli (réutilise productFormHTML avec une ligne vierge)
    const host=document.getElementById('sp-import-form');
    host.innerHTML = productFormHTML(parsed, {id:++nextLocalId, statut:'LIVE', dev:parsed.dev||'EUR'});
    // surligne les champs pré-remplis
    ['e-isin','e-emetteur','e-coupon','e-bcap','e-bcpn','e-ac','e-strike','e-maturity','e-dev','e-freq','e-uln0','e-uln1'].forEach(id=>{ const e=document.getElementById(id); if(e&&e.value) e.classList.add('pref'); });
    bindImportSave(parsed);
  }
  function bindImportSave(parsed){
    const btn=document.getElementById('e-save'); if(!btn) return;
    // remplace le handler de sauvegarde pour fermer la modale d'import
    const fresh=btn.cloneNode(true); btn.parentNode.replaceChild(fresh,btn);
    fresh.addEventListener('click',()=>{
      const isin=(val('e-isin')||('TMP'+(++nextLocalId))).toUpperCase();
      const uls=[]; for(let i=0;i<5;i++){ const n=val('e-uln'+i); if(n) uls.push({n,k:numv('e-ulk'+i)}); }
      const np={ isin, lib:val('e-lib')||('Produit '+isin), emetteur:val('e-emetteur'), fam:val('e-fam')||'Autocall', dev:val('e-dev'),
        coupon:numv('e-coupon'), freq:val('e-freq'), ac:numv('e-ac'), bcpn:numv('e-bcpn'), bcap:numv('e-bcap'),
        strike:val('e-strike')||null, nextObs:val('e-nextobs')||null, maturity:val('e-maturity')||null, nominalRef:numv('e-nominalref'), uls };
      const st=document.getElementById('e-status'); st.textContent='Enregistrement…'; st.style.color='var(--muted)';
      saveProduct(np).then(()=>{
        const prenom=val('e-prenom'), nom=val('e-nom');
        if(prenom||nom||numv('e-nominal')){ return savePosition({ id:++nextLocalId, isin, prenom, nom, nominal:numv('e-nominal'), dev:np.dev, compte:val('e-compte'), statut:val('e-statut')||'LIVE', gc:numv('e-gc') }); }
      }).then(()=>{
        st.textContent='✓ Produit ajouté au portefeuille'; st.style.color='#2e7d32';
        updateStats(); buildIsinList();
        setTimeout(()=>{ importModal.classList.remove('is-open'); document.querySelector('.dash-tab[data-tab="portefeuille"]').click(); renderPortfolio(); toast('Produit importé : '+isin); },800);
      });
    });
  }

  /* ===================================================================
     ONGLET 3 — REPORTING CLIENT
     =================================================================== */
  function holders(){
    const map=new Map();
    positions.filter(p=>!p._deleted).forEach(p=>{ const k=fullName(p); if(k==='—')return; if(!map.has(k)) map.set(k,{name:k,client_id:p.client_id,items:[]}); map.get(k).items.push(p); });
    return Array.from(map.values()).sort((a,b)=>b.items.length-a.items.length);
  }
  function buildReportSelect(){
    const sel=document.getElementById('rep-client'); const prev=sel.value;
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
    if(!name){ host.innerHTML='<div class="sp-rep-empty"><p>Sélectionnez un client pour générer son reporting de positions en produits structurés.</p></div>'; return; }
    const items=clientPositions(name);
    const live=items.filter(p=>(p.statut||'LIVE')==='LIVE');
    const enc=live.reduce((s,p)=>s+(toEur(p.nominal,p.dev)||0),0);
    const encAll=items.reduce((s,p)=>s+(toEur(p.nominal,p.dev)||0),0);
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
    if(cur.worst!=null) bars.push(`<span class="sp-mini-bar" style="border-color:${cur.worst>= (p.bcap?p.bcap*100:0)?'#bfe3c4':'#f3c0bb'}">Pire ss-jacent <b>${cur.worst.toFixed(1)}%</b></span>`);
    return `<div class="sp-rep-pos">
      <div class="sp-rep-pos__head">
        <div><div class="sp-rep-pos__name">${esc(p.lib||pos.isin)}</div><div class="sp-rep-pos__isin">${esc(pos.isin)} · ${esc(p.emetteur||'—')}</div></div>
        <div class="sp-rep-pos__fig"><div class="sp-rep-pos__nom">${pos.nominal!=null?money(pos.nominal,pos.dev):'—'}</div>
          <span class="sp-chip-status ${status==='LIVE'?'cs-live':'cs-done'}">${status==='LIVE'?'En cours':'Soldé'}</span></div>
      </div>
      <div class="sp-rep-pos__meta">
        <span>Coupon <b>${p.coupon!=null?pct(p.coupon,2):'—'}</b></span>
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
    const today=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const rows=items.map(pos=>{ const p=productsMap.get(pos.isin)||{isin:pos.isin}; const status=(pos.statut||'LIVE');
      const cur=p.uls?currentLevels(p):{worst:null};
      return `<tr>
        <td><b>${esc(p.lib||pos.isin)}</b><div class="mono">${esc(pos.isin)} · ${esc(p.emetteur||'')}</div></td>
        <td>${esc((p.uls||[]).map(u=>u.n).join(', '))}</td>
        <td>${p.coupon!=null?(p.coupon*100).toFixed(2)+'%':'—'}</td>
        <td>${p.bcap!=null?(p.bcap*100).toFixed(0)+'%':'—'}</td>
        <td>${cur.worst!=null?cur.worst.toFixed(1)+'%':'—'}</td>
        <td>${pos.nominal!=null?Math.round(pos.nominal).toLocaleString('fr-FR')+' '+symbol(pos.dev):'—'}</td>
        <td>${fmtShort(p.maturity)}</td>
        <td>${status==='LIVE'?'En cours':'Soldé'}</td></tr>`; }).join('');
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Reporting produits structurés — ${esc(name)} — ${today}</title>
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
<div class="header"><h1>La Financière de Rochechouart</h1><div class="date">Reporting produits structurés au ${today}</div></div>
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

  /* ---------------- AUTO-LOGIN (après initialisation de tout l'état) ---------------- */
  if(sessionStorage.getItem('sb_access_token')){
    document.getElementById('dash-user-email').textContent = sessionStorage.getItem('sb_user_email') || '';
    showDash();
  }

})();
