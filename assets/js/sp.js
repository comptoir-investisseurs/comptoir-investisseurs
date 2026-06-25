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
  let sbProducts = true, sbPositions = true, sbObs = true;

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
  const obsValid = new Map();      // observations validées : "isin|kind|YYYY-MM-DD" -> {result, amount, note, by, at}
  function obsKey(isin,kind,d){ const iso=(d instanceof Date)?d.toISOString().slice(0,10):String(d).slice(0,10); return isin+'|'+kind+'|'+iso; }

  function seedState(){
    (window.SP_PRODUCTS||[]).forEach(p => { p.uls = p.uls||[]; productsMap.set(p.isin, Object.assign({}, p)); });
    positions = (window.SP_POSITIONS||[]).map(p => Object.assign({_seed:true}, p));
  }

  function init(){
    seedState();
    Promise.resolve()
      .then(loadSbProducts)
      .then(loadSbPositions)
      .then(loadSbObservations)
      .then(loadCrm)
      .then(afterLoad)
      .catch(e => { console.warn(e); afterLoad(); });
  }
  function loadSbObservations(){
    if(!SB) return;
    return fetch(API + '/sp_observations?select=*', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => { (rows||[]).forEach(r => { obsValid.set(obsKey(r.isin,r.kind,r.obs_date), {result:r.result, amount:r.amount, note:r.note, by:r.validated_by, at:r.updated_at||r.created_at}); }); })
      .catch(() => { sbObs = false; });
  }
  function saveObservation(isin,kind,d,result,amount,note){
    const iso=(d instanceof Date)?d.toISOString().slice(0,10):String(d).slice(0,10);
    obsValid.set(obsKey(isin,kind,iso), {result, amount:amount!=null?amount:null, note:note||null, by:sessionStorage.getItem('sb_user_email')||'', at:new Date().toISOString()});
    if(!SB || !sbObs) return Promise.resolve(false);
    const payload={isin,kind,obs_date:iso,result,amount:amount!=null?amount:null,note:note||null,validated_by:sessionStorage.getItem('sb_user_email')||null,updated_at:new Date().toISOString()};
    return fetch(API+'/sp_observations?on_conflict=isin,kind,obs_date',{method:'POST',headers:headers({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(payload)})
      .then(r=>r.ok?true:Promise.reject(r.status)).catch(()=>{ sbObs=false; return false; });
  }
  function clearObservation(isin,kind,d){
    const iso=(d instanceof Date)?d.toISOString().slice(0,10):String(d).slice(0,10);
    obsValid.delete(obsKey(isin,kind,iso));
    if(SB && sbObs){ fetch(API+'/sp_observations?isin=eq.'+encodeURIComponent(isin)+'&kind=eq.'+kind+'&obs_date=eq.'+iso,{method:'DELETE',headers:headers()}).catch(()=>{}); }
  }
  function afterLoad(){ buildIsinList(); updateStats(); renderSuggest(); renderPortfolio(); buildReportSelect(); buildOverviewClientSelect(); renderOverview(); updateObsCount(); }

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
      fam:r.fam||'Autre', mem:r.mem, trig:r.trig, trigStep:r.trig_step, trigFreq:r.trig_freq, nonCall:r.non_call, uls:r.uls||[], _db:true };
  }
  function toDbProduct(p){
    return { isin:p.isin, lib:p.lib, emetteur:p.emetteur, dev:p.dev, coupon:p.coupon, freq:p.freq,
      ac:p.ac, bcap:p.bcap, bcpn:p.bcpn, strike:p.strike, emission:p.emission||null, next_obs:p.nextObs,
      next_cpn:p.nextCpn||null, final_obs:p.finalObs||null, maturity:p.maturity, trade_date:p.trade,
      nominal_ref:p.nominalRef, fam:p.fam, mem:!!p.mem, trig:!!p.trig, trig_step:p.trigStep||null, trig_freq:p.trigFreq||null, non_call:(p.nonCall!=null?p.nonCall:null), uls:p.uls };
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

  /* ---------------- COURS RÉELS (Yahoo Finance via proxy CORS) ----------------
     Cours réels rebasés à 100 au strike. Sans ticker connu ou si la
     récupération échoue → « Visualisation indisponible ». Cache localStorage 1 j. */
  const EPOCH = new Date(2015,0,1);
  const TICKERS = {
    // France (Euronext Paris)
    'TotalEnergies':'TTE.PA','Total':'TTE.PA','BNP Paribas':'BNP.PA','BNP':'BNP.PA',
    'Société Générale':'GLE.PA','Société générale':'GLE.PA','Airbus':'AIR.PA','Stellantis':'STLAP.PA',
    'Unibail':'URW.PA','Carrefour':'CA.PA','Orange':'ORA.PA','Crédit Agricole':'ACA.PA',
    'Credit agricole':'ACA.PA','Crédit Agricole 1.05':'ACA.PA','Bouygues':'EN.PA','LVMH':'MC.PA',
    'Engie':'ENGI.PA','Sanofi':'SAN.PA','Saint-Gobain':'SGO.PA','Saint Gobain':'SGO.PA',
    'Veolia':'VIE.PA','Alstom':'ALO.PA','Axa':'CS.PA','Schneider Electric':'SU.PA','Schneider':'SU.PA',
    'Vivendi':'VIV.PA','Pernod-Ricard':'RI.PA','Pernod Ricard':'RI.PA','Publicis':'PUB.PA',
    'Vinci':'DG.PA','Danone':'BN.PA','Accor':'AC.PA','Air France':'AF.PA','Renault':'RNO.PA',
    'Valeo':'FR.PA','Michelin':'ML.PA','Safran':'SAF.PA','Klepierre':'LI.PA','Klépierre':'LI.PA',
    'Dassault System':'DSY.PA',"L'Oréal":'OR.PA','Ubisoft':'UBI.PA','Air Liquide':'AI.PA',
    'Legrand':'LR.PA','EssilorLuxottica':'EL.PA','Capgemini':'CAP.PA','Eiffage':'FGR.PA',
    'Arkema':'AKE.PA','Thales':'HO.PA','Thalès':'HO.PA','Worldline':'WLN.PA','Sodexo':'SW.PA',
    'Atos':'ATO.PA','Hermès':'RMS.PA','Forvia':'FRVIA.PA','Cointreau':'RCO.PA','Technip':'TE.PA',
    // Europe
    'Richemont':'CFR.SW','ASML':'ASML.AS','ING Groep':'INGA.AS','UMG':'UMG.AS',
    'Banco Santander':'SAN.MC','BBVA':'BBVA.MC','Intesa':'ISP.MI','Eni':'ENI.MI','ENI':'ENI.MI',
    'Barclays':'BARC.L','Rolls-Royce':'RR.L','Nestlé':'NESN.SW','ArcelorMittal':'MT.AS',
    'Mercedes-benz':'MBG.DE','Volkswagen':'VOW3.DE','Volkswagen 6.36':'VOW3.DE','Adidas':'ADS.DE',
    'Allianz':'ALV.DE','Rheinmetall':'RHM.DE','Novo Nordisk':'NVO',
    // US
    'Amazon':'AMZN','Microsoft':'MSFT','Alphabet':'GOOGL','Apple':'AAPL','Nvidia':'NVDA',
    'Tesla':'TSLA','Chevron':'CVX','Salesforce':'CRM','Visa':'V','Broadcom':'AVGO','Abbvie':'ABBV',
    'Facebook':'META','Meta':'META','Intel':'INTC','NextEra':'NEE','Nextera':'NEE','Morgan Stanley':'MS',
    'UnitedHealth Group':'UNH','UnitedHealth':'UNH','Citi':'C','Conocophillips':'COP','ConocoPhilips':'COP',
    'Air Product':'APD','AppLovin':'APP','Eli Lilly':'LLY','Moderna':'MRNA','Brookfield Corp.':'BN',
    'Uber':'UBER','Mercadolibre':'MELI','MercadoLibre':'MELI',
    // Asie / ADR
    'Alibaba':'BABA','Baidu':'BIDU','Tencent':'0700.HK','TSMC':'TSM',
    // Indices
    'SPX':'^GSPC','SX5E':'^STOXX50E','CAC 40':'^FCHI'
  };
  function tickerFor(name){ if(!name) return null; if(TICKERS[name]) return TICKERS[name];
    const lk=String(name).toLowerCase().trim(); const k=Object.keys(TICKERS).find(x=>x.toLowerCase()===lk); return k?TICKERS[k]:null; }

  function fetchYahoo(ticker, fromTs){
    const day=new Date().toISOString().slice(0,10), ck='sppx:'+ticker;
    let cached=null; try{ cached=JSON.parse(localStorage.getItem(ck)||'null'); }catch(e){}
    if(cached && cached.day===day && cached.pts && cached.pts.length) return Promise.resolve(cached.pts);
    const p1=Math.floor((Math.min(fromTs,Date.now())-31*86400000)/1000), p2=Math.floor(Date.now()/1000);
    const qs='?period1='+p1+'&period2='+p2+'&interval=1wk';
    // Plusieurs hôtes Yahoo + plusieurs proxys CORS : on enchaîne jusqu'à une réponse valide.
    const hosts=['https://query1.finance.yahoo.com/v8/finance/chart/',
                 'https://query2.finance.yahoo.com/v8/finance/chart/'];
    const wraps=[ u=>'https://corsproxy.io/?url='+encodeURIComponent(u),
                  u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
                  u=>'https://api.codetabs.com/v1/proxy/?quest='+encodeURIComponent(u),
                  u=>'https://thingproxy.freeboard.io/fetch/'+u ];
    const urls=[]; hosts.forEach(h=>wraps.forEach(w=>urls.push(w(h+encodeURIComponent(ticker)+qs))));
    let chain=Promise.reject(0);
    urls.forEach(u=>{ chain=chain.catch(()=>fetch(u).then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(j=>{
      const res=j&&j.chart&&j.chart.result&&j.chart.result[0]; if(!res||!res.timestamp) throw 0;
      const cl=res.indicators.quote[0].close, pts=[];
      for(let i=0;i<res.timestamp.length;i++) if(cl[i]!=null) pts.push({t:res.timestamp[i]*1000,p:cl[i]});
      if(pts.length<3) throw 0;
      try{ localStorage.setItem(ck,JSON.stringify({day,pts})); }catch(e){}
      return pts; })); });
    // En dernier recours : on réutilise le dernier cache disponible (même périmé) plutôt qu'un trou.
    return chain.catch(()=>(cached&&cached.pts&&cached.pts.length)?cached.pts:null);
  }
  // Charge + rebase à 100 au strike les sous-jacents d'un produit.
  function loadProductSeries(p){
    const uls=p.uls||[], s0=(pd(p.strike)||EPOCH).getTime();
    return Promise.all(uls.map((u,i)=>{
      const t=tickerFor(u.n);
      if(!t) return Promise.resolve({name:u.n, color:ulColor(i), ticker:null, ok:false});
      return fetchYahoo(t,s0).then(pts=>{
        if(!pts||!pts.length) return {name:u.n,color:ulColor(i),ticker:t,ok:false};
        // base = clôture du strike (dernière ≤ date de strike, à défaut la 1re disponible)
        let base=null, bi=0;
        for(let k=0;k<pts.length;k++){ if(pts[k].t<=s0){ base=pts[k].p; bi=k; } else break; }
        if(base==null||base<=0){ base=pts[0].p; bi=0; }
        const reb=[]; for(let k=bi;k<pts.length;k++) reb.push({t:pts[k].t, v:pts[k].p/base*100});
        if(reb.length<2) return {name:u.n,color:ulColor(i),ticker:t,ok:false};
        reb[0]={t:s0, v:100};   // le graphe démarre exactement au strike, à 100 %
        return {name:u.n,color:ulColor(i),ticker:t,ok:true,pts:reb};
      });
    })).then(series=>({ok:series.length>0 && series.every(s=>s.ok), series}));
  }
  function levelAt(pts, t){ if(!pts||!pts.length) return null; let v=pts[0].v; for(const pt of pts){ if(pt.t<=t) v=pt.v; else break; } return v; }
  function worstAt(data, t){ if(!data||!data.ok) return null; let w=null; data.series.forEach(s=>{ const v=levelAt(s.pts,t); if(v!=null&&(w==null||v<w)) w=v; }); return w; }
  function currentLevelsFrom(data){
    if(!data||!data.ok) return {ok:false, levels:[], worst:null, wi:-1};
    const levels=data.series.map(s=>s.pts[s.pts.length-1].v);
    let worst=null,wi=-1; levels.forEach((l,i)=>{ if(l!=null&&(worst==null||l<worst)){worst=l;wi=i;} });
    return {ok:true, levels, worst, wi};
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
  function nextObsDate(p){ const tod=today(); const o=observationDates(p).find(d=>d>tod); return o||pd(p.nextObs); }
  // Période de non-rappel : pas d'autocall possible avant strike + N mois (défaut 1 an).
  function nonCallMonths(p){ return p.nonCall!=null?p.nonCall:12; }
  function firstCallIdx(p){
    const obs=observationDates(p), sd=pd(p.strike); if(!sd||!obs.length) return 0;
    const fc=addMonths(sd, nonCallMonths(p)).getTime();
    const idx=obs.findIndex(d=>d.getTime()>=fc-4*86400000); return idx<0?obs.length:idx;
  }
  // Dégressivité du seuil autocall (Trigger Descending) : décrément + fréquence.
  function trigStepOf(p){ return p.trigStep!=null?p.trigStep:0.01; }     // défaut −1 % / période
  function trigFreqOf(p){ return p.trigFreq||'Trimestrielle'; }          // défaut / trimestre
  // Seuil autocall à l'observation k : niveau initial pendant la non-call, puis dégressif.
  function trigAt(p,k){
    if(p.ac==null) return null;
    if(!p.trig) return p.ac;
    const fi=firstCallIdx(p); if(k<fi) return p.ac;
    const obsM=freqMonths(p.freq)||3, decM=freqMonths(trigFreqOf(p))||12;
    const nDec=Math.floor(((k-fi)*obsM)/decM);
    const floor=(p.bcpn!=null?p.bcpn:0.6);
    return Math.max(floor, +(p.ac - trigStepOf(p)*nDec).toFixed(4));
  }
  // Date de rappel : 1re observation RAPPELABLE (après non-call) où le pire ≥ seuil (cours réels).
  function callDateFrom(p,data){
    if(!data||!data.ok || p.ac==null) return null;
    const obs=observationDates(p), tod=today(), fi=firstCallIdx(p);
    for(let k=fi;k<obs.length;k++){ const d=obs[k]; if(d>tod) break;
      const w=worstAt(data,d.getTime()); if(w!=null && w>=trigAt(p,k)*100) return d; }
    return null;
  }
  // Fin de vie « graphique » : date de rappel calculée, sinon aujourd'hui (ou maturité si échu).
  function lifeEndFrom(p,data){ const cd=callDateFrom(p,data); if(cd) return cd; const mat=pd(p.maturity), t=today(); return (mat&&mat<t)?mat:t; }
  // Calendrier détaillé à partir des cours réels.
  // Coupons : payé / non payé (pire < barrière coupon) avec report mémoire.
  // Autocalls : remboursé / non remboursé (pire ≥ seuil).
  function computeSchedule(p,data){
    const obs=observationDates(p), m=freqMonths(p.freq);
    const per=(p.coupon!=null&&m)?p.coupon*m/12:p.coupon;
    const tod=today(), ok=!!(data&&data.ok), fi=firstCallIdx(p);
    const coupons=[], autocalls=[]; let carry=0, called=false, redeemDate=null;
    for(let k=0;k<obs.length;k++){
      const date=obs[k], past=date<=tod, pay=addDays(date,7), w=ok?worstAt(data,date.getTime()):null;
      if(p.ac!=null){
        const trig=trigAt(p,k), callable=k>=fi; const aov=obsValid.get(obsKey(p.isin,'autocall',date)); let st;
        if(called) st='after';
        else if(aov){ st = aov.result==='called'?'called':'notcalled'; if(st==='called'){ called=true; redeemDate=date; } }
        else if(!past) st='future';
        else if(!callable) st='notcalled';                    // période de non-rappel
        else if(ok){ if(w!=null && w>=trig*100){ st='called'; called=true; redeemDate=date; } else st='notcalled'; }
        else st='na';                                          // pas de cours : indéterminé
        if(st!=='after') autocalls.push({date,pay,trig,status:st,w,nonCall:!callable,valid:!!aov});
      }
      if(!isAthena(p) && p.coupon!=null){
        if(called){ /* après rappel : plus de coupon */ }
        else {
          const cov=obsValid.get(obsKey(p.isin,'coupon',date));
          if(cov){
            if(cov.result==='paid'){ const amt=cov.amount!=null?cov.amount:per*(p.mem?(1+carry):1); carry=0; coupons.push({date,pay,bcpn:p.bcpn,amount:amt,status:'paid',w,valid:true}); }
            else { if(p.mem) carry+=1; coupons.push({date,pay,bcpn:p.bcpn,amount:0,status:'unpaid',w,valid:true}); }
          }
          else if(!past) coupons.push({date,pay,bcpn:p.bcpn,amount:per,status:'future',w});
          else if(ok){
            const paid = (p.bcpn!=null) ? (w!=null && w>=p.bcpn*100) : (w!=null);
            if(paid){ const amt=per*(p.mem?(1+carry):1); carry=0; coupons.push({date,pay,bcpn:p.bcpn,amount:amt,status:'paid',w}); }
            else { if(p.mem) carry+=1; coupons.push({date,pay,bcpn:p.bcpn,amount:0,status:'unpaid',w}); }
          }
          else coupons.push({date,pay,bcpn:p.bcpn,amount:per,status:'na',w});
        }
      }
    }
    if(!called){ const na=autocalls.find(r=>r.status==='future'); if(na) na.status='next';
                 const nc=coupons.find(r=>r.status==='future'); if(nc) nc.status='next'; }
    const matured = pd(p.maturity)&&pd(p.maturity)<tod;
    return {coupons, autocalls, hasData:ok, redeemed:called, redeemDate, matured,
            status: (called||matured)?'DONE':'LIVE'};
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
      if(activeTab==='observations') renderObservations();
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
    live.forEach(p=>{ const o=nextObsDate(p); if(o && o>=tod && o<=in30) cnt++; });
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

  let renderToken=0;
  function renderProduct(p){
    currentProduct=p;
    const myTok=++renderToken;
    document.getElementById('sp-product-empty').hidden=true;
    const box=document.getElementById('sp-product'); box.hidden=false;
    const status=productStatus(p);
    const uls=(p.uls||[]);
    box.innerHTML = `
      <div class="sp-phead">
        <div class="sp-phead__top">
          <div class="sp-phead__badges">
            <span class="sp-badge fam">${esc(p.fam||'Structuré')}</span>
            <span class="sp-badge ${status==='LIVE'?'live':'done'}" id="sp-status-badge">${status==='LIVE'?'En cours':'Soldé'}</span>
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
            <div class="sp-canvas-box"><canvas id="sp-chart"></canvas><div class="sp-chart-tip" id="sp-tip"></div><div class="sp-chart-msg" id="sp-chart-msg">Chargement des cours réels…</div></div>
            <div class="sp-chart-legend" id="sp-legend"></div>
            `:'<p class="sp-muted">Aucun sous-jacent renseigné pour ce produit.</p>'}
          </div>
          ${uls.length?`<div class="sp-card sp-bar-card">
            <h4>Niveau vs barrières <span class="sp-h4-note" id="sp-worst-inline"></span></h4>
            <div id="sp-barriers" class="sp-barriers"><p class="sp-muted sm">Chargement…</p></div>
          </div>`:''}
        </div>

        <div class="sp-card sp-cond-card">
          <h4>Conditions & caractéristiques</h4>
          ${conditionsHTML(p)}
        </div>
        <div class="sp-card sp-cal-card">
          <h4>Calendrier</h4>
          <div id="sp-cal-host">${scheduleHTML(p,null)}</div>
        </div>
      </div>`;

    const sb=document.querySelector('.sp-searchbar'); if(sb) sb.hidden=true;
    const mini=document.getElementById('sp-search-mini');
    if(mini){ mini.addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(mini.value); });
      mini.addEventListener('change',()=>{ if(productsMap.has(mini.value.trim().toUpperCase())) doSearch(mini.value); }); }
    bindAlloc(p);
    bindCalTabs(); setTimeout(syncCalHeight,20);
    const calHost=document.getElementById('sp-cal-host');
    if(uls.length){
      loadProductSeries(p).then(data=>{
        if(myTok!==renderToken) return;                 // un autre produit a été ouvert
        const sch=computeSchedule(p,data);
        applyComputedStatus(p, sch);                    // statut déduit des observations
        drawChart(p,data,sch); renderBarriers(p,data);
        if(calHost){ calHost.innerHTML=scheduleHTML(p,data); bindCalTabs(); syncCalHeight(); }
      });
    }
  }
  // Met à jour le badge de statut d'après les observations réelles (et non le book).
  function applyComputedStatus(p, sch){
    const el=document.getElementById('sp-status-badge'); if(!el || !sch.hasData) return;
    if(sch.redeemed){ el.className='sp-badge done'; el.textContent='Remboursé '+fmtShort(sch.redeemDate); }
    else if(sch.matured){ el.className='sp-badge done'; el.textContent='Échu'; }
    else { el.className='sp-badge live'; el.textContent='En cours'; }
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

  /* ---- barrières (compact, cours réels) ---- */
  function renderBarriers(p,data){
    const host=document.getElementById('sp-barriers'); if(!host) return;
    const cur=currentLevelsFrom(data); const uls=(p.uls||[]);
    const inline=document.getElementById('sp-worst-inline');
    const bars=[];
    if(p.ac!=null)  bars.push({name:'Autocall', lvl:p.ac*100, color:BARC.ac});
    if(p.bcpn!=null)bars.push({name:'Coupon', lvl:p.bcpn*100, color:BARC.cpn});
    if(p.bcap!=null)bars.push({name:'Capital', lvl:p.bcap*100, color:BARC.cap});
    if(!cur.ok){
      if(inline) inline.textContent='— niveau actuel indisponible';
      host.innerHTML=`<div class="sp-bar-dist">${bars.map(b=>`<span class="sp-dist"><i style="background:${b.color}"></i>${b.name} <b>${b.lvl.toFixed(0)}%</b></span>`).join('')}</div>
        <p class="sp-muted sm" style="margin-top:9px">Cours réels indisponibles — niveau vs barrière non calculable.</p>`;
      return;
    }
    const worstName = cur.wi>=0?uls[cur.wi].n:'—', w=cur.worst;
    if(inline) inline.textContent=`— pire : ${worstName} ${w.toFixed(1)}%`;
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

  /* ---- calendrier : coupons (payé/non payé + mémoire) & autocalls (remboursé/non remboursé) ---- */
  function statusChip(st){
    return ({ paid:'<span class="sp-st st-paid">Payé</span>',
      unpaid:'<span class="sp-st st-unpaid">Non payé</span>',
      called:'<span class="sp-st st-called">Remboursé</span>',
      notcalled:'<span class="sp-st st-notcalled">Non remb.</span>',
      next:'<span class="sp-st st-next">Prochaine</span>',
      future:'<span class="sp-st st-future">À venir</span>',
      na:'<span class="sp-st st-na">n/d</span>' })[st]||'';
  }
  function fmtLvl(w){ return w!=null?w.toFixed(1)+'%':'—'; }
  function calTable(rows, kind, p){
    if(!rows.length) return '<p class="sp-muted sm">Aucune échéance.</p>';
    if(kind==='coupon'){
      const head=`<tr><th>Constat.</th><th>Paiem.</th><th class="num">Barr.</th><th class="num">Pire</th><th class="num">Coupon</th><th>Statut</th></tr>`;
      const body=rows.map(r=>{
        const amt = r.status==='paid' ? pct(r.amount,3)
          : r.status==='unpaid' ? '<span class="muted">reporté</span>'
          : '<span class="muted">'+pct(r.amount,3)+'</span>';
        return `<tr class="r-${r.status}"><td>${fmtShort(r.date)}</td><td>${fmtShort(r.pay)}</td><td class="num">${r.bcpn!=null?pct(r.bcpn,0):'—'}</td><td class="num">${fmtLvl(r.w)}</td><td class="num">${amt}</td><td>${statusChip(r.status)}</td></tr>`;
      }).join('');
      return `<table class="sp-cal">${head}${body}</table>`;
    }
    const head=`<tr><th>Constat.</th><th>Paiem.</th><th class="num">Seuil${p.trig?' ↓':''}</th><th class="num">Pire</th><th>Statut</th></tr>`;
    const body=rows.map(r=>`<tr class="r-${r.status}"><td>${fmtShort(r.date)}</td><td>${fmtShort(r.pay)}</td><td class="num">${r.trig!=null?pct(r.trig,0):'—'}</td><td class="num">${fmtLvl(r.w)}</td><td>${statusChip(r.status)}</td></tr>`).join('');
    return `<table class="sp-cal">${head}${body}</table>`;
  }
  function scheduleHTML(p, data){
    if(!observationDates(p).length) return '<p class="sp-muted sm">Calendrier indisponible (dates manquantes).</p>';
    const sch=computeSchedule(p,data);
    const showCoupons = !isAthena(p) && p.coupon!=null;
    const showAutocall = p.ac!=null;
    const tabs=[], panes=[];
    if(showCoupons){
      tabs.push(`<button class="sp-cal-tab is-active" data-pane="cpn">Coupons${p.mem?' · mémoire':''}</button>`);
      panes.push(`<div class="sp-cal-pane is-active" data-pane="cpn">${calTable(sch.coupons,'coupon',p)}</div>`);
    }
    if(showAutocall){
      const a=showCoupons?'':' is-active';
      tabs.push(`<button class="sp-cal-tab${a}" data-pane="ac">Autocalls${p.trig?' ↓':''}</button>`);
      panes.push(`<div class="sp-cal-pane${a}" data-pane="ac">${calTable(sch.autocalls,'autocall',p)}</div>`);
    }
    if(!panes.length){
      tabs.push(`<button class="sp-cal-tab is-active" data-pane="cpn">Coupons</button>`);
      panes.push(`<div class="sp-cal-pane is-active" data-pane="cpn">${calTable(sch.coupons,'coupon',p)}</div>`);
    }
    const note = !sch.hasData ? `<div class="sp-cal-note">Statuts indisponibles — cours réels non récupérés.</div>` : '';
    const bar = tabs.length>1?`<div class="sp-cal-tabs">${tabs.join('')}</div>`:'';
    return `${bar}${note}<div class="sp-cal-scroll">${panes.join('')}</div>`;
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

  /* ---- graphique multi-séries (cours réels) ---- */
  function drawChart(p,data,sch){
    const canvas=document.getElementById('sp-chart'); if(!canvas) return;
    const msg=document.getElementById('sp-chart-msg');
    const leg=document.getElementById('sp-legend');
    if(!data||!data.ok){
      canvas.style.display='none';
      const miss=data?data.series.filter(s=>!s.ok).map(s=>s.name):[];
      if(msg){ msg.style.display='flex';
        msg.innerHTML='<div class="big">Visualisation indisponible</div><div class="sub">'+(miss.length?'Cours non disponibles : '+esc(miss.join(', ')):'Cours réels non disponibles')+'</div>'; }
      if(leg) leg.innerHTML=''; chartState=null; return;
    }
    canvas.style.display=''; if(msg) msg.style.display='none';
    const endTs=lifeEndFrom(p,data).getTime();
    const series=data.series.map(s=>({name:s.name, color:s.color, pts:s.pts.filter(pt=>pt.t<=endTs+6*86400000), on:true}));
    const obs=observationDates(p).map(d=>d.getTime());
    const live = !(sch && (sch.redeemed||sch.matured));
    chartState={p, data, series, range:'max', hover:-1, showObs:true, obs, live};

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

    const live=chartState.live;
    const rs=rangeStart(chartState.range);
    const visible=series.filter(s=>s.on);

    // domaine x : strike -> maturité (vivant, laisse un espace à droite) ou date de rappel (soldé, touche le bord)
    const tStrike=pd(p.strike)?pd(p.strike).getTime():rs;
    const tmin=Math.max(rs, tStrike);
    const tMat=pd(p.maturity)?pd(p.maturity).getTime():today().getTime();
    const tEnd=lifeEndFrom(p,chartState.data).getTime();
    let tmax = live ? tMat : tEnd;
    if(tmax<=tmin) tmax=tmin+86400000;

    const allPts=[]; visible.forEach(s=>s.pts.forEach(pt=>{ if(pt.t>=tmin) allPts.push(pt.v); }));
    const barr=[100]; if(p.ac!=null)barr.push(p.ac*100); if(p.bcpn!=null)barr.push(p.bcpn*100); if(p.bcap!=null)barr.push(p.bcap*100);
    let lo=Math.min(...allPts, ...barr), hi=Math.max(...allPts, ...barr);
    if(!isFinite(lo)){lo=50;hi=120;} const padR=(hi-lo)*0.08||5; lo-=padR; hi+=padR;

    const sx=t=>x0+(x1-x0)*((t-tmin)/((tmax-tmin)||1));
    const sy=v=>y1-(y1-y0)*((v-lo)/((hi-lo)||1));
    const tToday=today().getTime();

    // zone « vie restante » (vivant) : de aujourd'hui à maturité
    if(live && tToday<tmax){
      ctx.fillStyle='rgba(169,133,63,.05)'; ctx.fillRect(sx(Math.max(tToday,tmin)),y0,x1-sx(Math.max(tToday,tmin)),y1-y0);
    }

    // grille horizontale
    ctx.font='10px Helvetica,Arial,sans-serif'; ctx.textBaseline='middle';
    for(let i=0;i<=4;i++){ const v=lo+(hi-lo)*i/4; const y=sy(v);
      ctx.strokeStyle='#eee8da'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
      ctx.fillStyle='#a8a496'; ctx.textAlign='left'; ctx.fillText(v.toFixed(0)+'%', x1+6, y); }

    // lignes de barrière (couleurs cohérentes + labels décalés pour éviter les chevauchements)
    const blines=[{v:1,col:BARC.strike,t:'Strike 100%'}];
    if(p.ac!=null) blines.push({v:p.ac,col:BARC.ac,t:'Autocall '+(p.ac*100).toFixed(0)+'%'});
    if(p.bcpn!=null) blines.push({v:p.bcpn,col:BARC.cpn,t:'Coupon '+(p.bcpn*100).toFixed(0)+'%'});
    if(p.bcap!=null) blines.push({v:p.bcap,col:BARC.cap,t:'Capital '+(p.bcap*100).toFixed(0)+'%'});
    blines.forEach(b=>{ const y=sy(b.v*100); ctx.strokeStyle=b.col; ctx.lineWidth=1.2; ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); ctx.setLineDash([]); });
    ctx.font='600 9px Helvetica,Arial,sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
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
    ctx.fillStyle='#a8a496'; ctx.font='10px Helvetica,Arial,sans-serif'; ctx.textAlign='center';
    const span=tmax-tmin; const yStep= span>3*31536000000?12:(span>31536000000?6:3);
    let dd=new Date(tmin); dd.setDate(1);
    for(let g=0;g<80;g++){ const t=dd.getTime(); if(t>tmax) break; if(t>=tmin){ const x=sx(t);
      ctx.fillText((dd.getMonth()===0?dd.getFullYear():MONTHS[dd.getMonth()].replace('.','')), x, y1+13); }
      dd=addMonths(dd,yStep); }

    // ligne « aujourd'hui »
    if(live && tToday>=tmin && tToday<=tmax){ const x=sx(tToday);
      ctx.strokeStyle='rgba(11,31,18,.45)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke();
      ctx.fillStyle='#0b1f12'; ctx.font='600 9px Helvetica,Arial,sans-serif'; ctx.textAlign='center'; ctx.fillText('aujourd\'hui', x, y0+2+5); }

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
      ${(!SB||!sbPositions)?`<div class="sp-cal-note">⚠ Sauvegarde indisponible : la table <code>sp_positions</code> n'est pas accessible dans Supabase (lancez <code>supabase-structures.sql</code>, et connectez-vous avec un compte conseiller). Les allocations resteront limitées à cette session tant que ce n'est pas fait.</div>`:''}
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
      savePosition(pos).then((persisted)=>{
        updateStats(); buildReportSelect(); buildOverviewClientSelect();
        if(persisted){ st.textContent='✓ Allocation enregistrée (sauvegardée)'; st.style.color='#2e7d32';
          setTimeout(()=>{ allocModal.classList.remove('is-open'); renderProduct(p); },700); }
        else { st.textContent='⚠ Ajoutée pour cette session — non sauvegardée (base non connectée)'; st.style.color='#b06f15';
          setTimeout(()=>{ allocModal.classList.remove('is-open'); renderProduct(p); },1600); }
      });
    });
    allocModal.classList.add('is-open');
  }

  /* ===================================================================
     PERSISTANCE
     =================================================================== */
  // Résout à true si l'allocation a bien été persistée en base, false sinon.
  function savePosition(pos){
    const idx=positions.findIndex(x=>String(x.id)===String(pos.id));
    if(idx>=0) positions[idx]=Object.assign(positions[idx],pos); else positions.push(pos);
    if(!SB || !sbPositions) return Promise.resolve(false);
    const payload=toDbPosition(pos);
    if(pos._seed) payload.seed_id=pos.id;
    return fetch(API+'/sp_positions', {method:'POST', headers:headers({'Prefer':'return=representation'}), body:JSON.stringify(payload)})
      .then(r=>r.ok?r.json():Promise.reject(r.status)).then(rows=>{ if(rows&&rows[0]){ const np=positions.find(x=>String(x.id)===String(pos.id)); if(np){ np.id=rows[0].id; np._db=true; np._seed=false; np.seed_id=rows[0].seed_id; } } return true; })
      .catch(()=>{ sbPositions=false; return false; });
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
        <div class="sp-fld"><label>Décrément autocall (ex 0.01 = −1 %)</label><input id="e-trigstep" type="number" step="0.005" value="${p.trigStep!=null?p.trigStep:''}" placeholder="0.01"></div>
        <div class="sp-fld"><label>Fréquence de décrément</label><select id="e-trigfreq">${['Trimestrielle','Semestrielle','Annuelle','Mensuelle'].map(f=>`<option ${f===(p.trigFreq||'Trimestrielle')?'selected':''}>${f}</option>`).join('')}</select></div>
        <div class="sp-fld"><label>Période de non-rappel (mois)</label><input id="e-noncall" type="number" step="1" value="${p.nonCall!=null?p.nonCall:''}" placeholder="12"></div>
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
      trigStep:numv('e-trigstep'), trigFreq:val('e-trigfreq'), nonCall:numv('e-noncall'),
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
    const nx=p.uls?nextObsDate(p):null;
    const bars=[];
    if(p.coupon!=null) bars.push(`<span class="sp-mini-bar">Coupon <b>${pct(p.coupon,2)}/an</b></span>`);
    if(p.bcap!=null) bars.push(`<span class="sp-mini-bar">Capital <b>${pct(p.bcap,0)}</b></span>`);
    if(p.bcpn!=null) bars.push(`<span class="sp-mini-bar">Barr. coupon <b>${pct(p.bcpn,0)}</b></span>`);
    if(p.ac!=null) bars.push(`<span class="sp-mini-bar">Autocall <b>${pct(p.ac,0)}${p.trig?' ↓':''}</b></span>`);
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
        ${status==='LIVE'&&nx?`<span>Prochaine obs. <b>${fmtShort(nx)}</b></span>`:''}
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
      return `<tr><td><b>${esc(p.lib||pos.isin)}</b><div class="mono">${esc(pos.isin)} · ${esc(p.emetteur||'')}</div></td>
        <td>${esc((p.uls||[]).map(u=>u.n).join(', '))}</td>
        <td>${p.coupon!=null?(p.coupon*100).toFixed(2)+'% /an':'—'}</td>
        <td>${p.bcap!=null?(p.bcap*100).toFixed(0)+'%':'—'}</td>
        <td>${p.bcpn!=null?(p.bcpn*100).toFixed(0)+'%':'—'}</td>
        <td>${pos.nominal!=null?Math.round(pos.nominal).toLocaleString('fr-FR')+' '+symbol(pos.dev):'—'}</td>
        <td>${fmtShort(p.maturity)}</td><td>${status==='LIVE'?'En cours':'Soldé'}</td></tr>`; }).join('');
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Reporting produits structurés — ${esc(name)} — ${tday}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Helvetica,Arial,sans-serif;color:#1E211C;padding:46px 54px;max-width:960px;margin:0 auto;font-size:13px;line-height:1.6}
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
.print-btn{position:fixed;top:18px;right:18px;background:#A9853F;color:#fff;border:0;padding:11px 22px;border-radius:8px;font-family:Helvetica,Arial,sans-serif;font-size:13px;cursor:pointer}
@media print{.print-btn{display:none}body{padding:20px}}</style></head><body>
<button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
<div class="header"><h1>La Financière de Rochechouart</h1><div class="date">Reporting produits structurés au ${tday}</div></div>
<h2>${esc(name)}</h2><div class="sub">${items.length} position(s) · ${live.length} en cours</div>
<div class="summary">
  <div class="item"><div class="l">Encours en cours</div><div class="v">${Math.round(enc).toLocaleString('fr-FR')} €</div></div>
  <div class="item"><div class="l">Coupons estimés perçus</div><div class="v">${Math.round(coupons).toLocaleString('fr-FR')} €</div></div>
  <div class="item"><div class="l">Produits</div><div class="v">${items.length}</div></div>
</div>
<table><thead><tr><th>Produit</th><th>Sous-jacents</th><th>Coupon</th><th>Barr. capital</th><th>Barr. coupon</th><th>Nominal</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>
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

    // prochaines observations (factuel, trié par date)
    const upcoming=live.map(u=>({u, d:nextObsDate(u.p)})).filter(x=>x.d).sort((a,b)=>a.d-b.d).slice(0,9);

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
          <h4>Prochaines observations <span class="sp-h4-note">— dates de constatation à venir</span></h4>
          <div class="ov-risk">${upcoming.map(x=>{ const p=x.u.p;
            return `<div class="ov-risk__row safe" data-isin="${esc(p.isin)}"><div class="ov-risk__n">${esc(p.lib||p.isin)}<small>${esc((p.uls||[]).map(y=>y.n).join(', '))}</small></div>
              <div class="ov-risk__fig"><b>${fmtShort(x.d)}</b><span>${p.ac!=null?'autocall '+pct(p.ac,0):''}${p.bcpn!=null?' · cpn '+pct(p.bcpn,0):''}</span></div></div>`; }).join('')||'<p class="sp-muted sm">—</p>'}</div>
        </div>
      </div>`;
    host.querySelectorAll('.ov-risk__row[data-isin]').forEach(el=>el.addEventListener('click',()=>gotoProduct(el.dataset.isin)));
  }

  /* ===================================================================
     ONGLET — OBSERVATIONS (validation quotidienne coupon / autocall)
     =================================================================== */
  const obsDataCache = new Map();   // isin -> data cours (session)
  // Date de remboursement anticipé d'un produit : autocall validé « Remboursé », sinon déduit des cours.
  function redeemDateOf(p){
    if(p.ac==null) return null;
    const obs=observationDates(p);
    for(const d of obs){ const v=obsValid.get(obsKey(p.isin,'autocall',d)); if(v && v.result==='called') return d; }
    const data=obsDataCache.get(p.isin);
    if(data && data.ok){ const cd=callDateFrom(p,data); if(cd) return cd; }
    return null;
  }
  // Observations sur [since, until] : constatations d'autocall rappelables (hors non-call) uniquement.
  // Un produit déjà remboursé par anticipation ne remonte plus d'observation après son rappel.
  function gatherObs(since, until){
    const out=[];
    productsMap.forEach(p=>{
      if(p.ac==null) return;
      const obs=observationDates(p); if(!obs.length) return;
      const fi=firstCallIdx(p), rd=redeemDateOf(p);
      obs.forEach((d,k)=>{
        if(d<since || d>until || k<fi) return;
        if(rd && d>rd) return;                              // produit remboursé : plus rien après le rappel
        out.push({p,k,date:d,kind:'autocall', barrier:trigAt(p,k)});
      });
    });
    return out;
  }
  function countDueObs(){ const tod=today();
    return gatherObs(addDays(tod,-1), tod).filter(o=>!obsValid.get(obsKey(o.p.isin,o.kind,o.date))).length; }
  function updateObsCount(){ const el=document.getElementById('tab-count-obs'); if(el) el.textContent=countDueObs(); }

  function obsProposal(o){
    const v=obsValid.get(obsKey(o.p.isin,o.kind,o.date));
    if(v) return {validated:true, result:v.result, by:v.by};
    const data=obsDataCache.get(o.p.isin); const w=(data&&data.ok)?worstAt(data,o.date.getTime()):null;
    let proposed=null;
    if(w!=null){ proposed = o.kind==='coupon' ? ((o.barrier==null||w>=o.barrier*100)?'paid':'unpaid')
                                              : (w>=o.barrier*100?'called':'notcalled'); }
    return {validated:false, worst:w, proposed};
  }
  function obsLabels(kind){ return kind==='coupon'?{pos:'paid',neg:'unpaid',posL:'Payé',negL:'Non payé'}
                                                  :{pos:'called',neg:'notcalled',posL:'Remboursé',negL:'Non remb.'}; }
  // Clients détenant un produit (allocations CRM) + leur email éventuel.
  function holdersForIsin(isin){
    return positions.filter(x=>!x._deleted && x.isin===isin).map(pos=>{
      const c = pos.client_id ? crmClients.find(cc=>String(cc.id)===String(pos.client_id)) : null;
      return {name:fullName(pos), email:(c&&c.email)?c.email:'', pos};
    });
  }
  function obsRowHTML(o, loading){
    const pr=obsProposal(o), isin=o.p.isin, di=o.date.toISOString().slice(0,10), L=obsLabels(o.kind);
    const barr=o.barrier!=null?pct(o.barrier,0):'—';
    const worst=loading?'<span class="muted">…</span>':(pr.worst!=null?pr.worst.toFixed(1)+'%':'—');
    const data=`data-isin="${esc(isin)}" data-kind="${o.kind}" data-date="${di}"`;
    let act;
    if(pr.validated){
      act=`<span class="obs-validated ${pr.result===L.pos?'pos':'neg'}">✓ ${pr.result===L.pos?L.posL:L.negL}</span><button class="obs-edit" ${data}>Modifier</button>`;
    } else {
      const sg=r=>pr.proposed===r?' is-sugg':'';
      act=`<button class="obs-btn ok${sg(L.pos)}" ${data} data-res="${L.pos}">${L.posL}</button>`+
          `<button class="obs-btn no${sg(L.neg)}" ${data} data-res="${L.neg}">${L.negL}</button>`;
    }
    // Événement « positif » (coupon payé / produit remboursé) -> on propose le mail client.
    const positive = pr.validated ? (pr.result===L.pos) : (pr.proposed===L.pos || pr.proposed==null);
    const cli = holdersForIsin(isin);
    const cliHtml = cli.length
      ? `<span class="lbl">Client${cli.length>1?'s':''}</span>`+cli.map(h=>{
          const md=`data-isin="${esc(isin)}" data-kind="${o.kind}" data-date="${di}" data-name="${esc(h.name)}" data-email="${esc(h.email||'')}" data-nominal="${h.pos.nominal!=null?h.pos.nominal:''}" data-dev="${esc(h.pos.dev||'EUR')}"`;
          return `<span class="obs-cli"><span class="obs-cli__n">${esc(h.name)}</span>${positive?`<button class="obs-mail" title="Pré-rédiger l'email client" ${md}>✉</button>`:''}</span>`;
        }).join('')
      : `<span class="obs-cli muted">Aucun client alloué</span>`;
    return `<div class="obs-row ${o.kind}">
      <div class="obs-row__date">${fmtShort(o.date)}</div>
      <div class="obs-row__prod">${esc(o.p.lib||isin)}<small>${esc(isin)} · ${esc((o.p.uls||[]).map(u=>u.n).join(', '))}</small></div>
      <div class="obs-row__type"><span class="obs-type ${o.kind}">${o.kind==='coupon'?'Coupon':'Autocall'}</span><small>barr. ${barr}</small></div>
      <div class="obs-row__worst"><span>Pire</span><b>${worst}</b></div>
      <div class="obs-row__sugg">${pr.validated?('validé · '+esc(pr.by||'—')):(pr.proposed?('proposé : '+(pr.proposed===L.pos?L.posL:L.negL)):'cours indispo — à renseigner')}</div>
      <div class="obs-row__act">${act}</div>
      <div class="obs-row__clients">${cliHtml}</div>
    </div>`;
  }
  function obsSoonHTML(o){
    return `<div class="obs-row soonrow ${o.kind}">
      <div class="obs-row__date">${fmtShort(o.date)}</div>
      <div class="obs-row__prod">${esc(o.p.lib||o.p.isin)}<small>${esc((o.p.uls||[]).map(u=>u.n).join(', '))}</small></div>
      <div class="obs-row__type"><span class="obs-type ${o.kind}">${o.kind==='coupon'?'Coupon':'Autocall'}</span><small>barr. ${o.barrier!=null?pct(o.barrier,0):'—'}</small></div>
      <div class="obs-row__sugg">à venir</div></div>`;
  }
  function obsListHTML(due, soon, loading){
    let h=`<div class="sp-card"><h4>À valider <span class="sp-h4-note">— constatations dues (du plus récent)</span></h4>`;
    h+= due.length? `<div class="obs-list">${due.map(o=>obsRowHTML(o,loading)).join('')}</div>` : '<p class="sp-muted sm">Rien à valider sur la période.</p>';
    h+=`</div>`;
    if(soon.length) h+=`<div class="sp-card"><h4>À venir (14 jours)</h4><div class="obs-list">${soon.map(obsSoonHTML).join('')}</div></div>`;
    return h;
  }
  function bindObsRows(due){
    const host=document.getElementById('obs-body'); if(!host) return;
    host.querySelectorAll('.obs-btn').forEach(b=>b.addEventListener('click',()=>{
      const {isin,kind,date,res}=b.dataset; b.textContent='…';
      saveObservation(isin,kind,date,res,null,null).then(()=>{ updateObsCount();
        if(currentProduct && currentProduct.isin===isin && activeTab==='suivi'){ /* recalcul au prochain rendu */ }
        renderObservations(); });
    }));
    host.querySelectorAll('.obs-edit').forEach(b=>b.addEventListener('click',()=>{
      clearObservation(b.dataset.isin,b.dataset.kind,b.dataset.date); updateObsCount(); renderObservations();
    }));
    host.querySelectorAll('.obs-mail').forEach(b=>b.addEventListener('click',()=>prepareMail(b.dataset)));
  }

  /* ---- Email client : paiement de coupon / remboursement anticipé ---- */
  // Rendement de l'événement + rendement total (fractions) à une date donnée.
  function eventYield(p, data, kind, date){
    const sch=computeSchedule(p,data); let total=0, evt=0;
    sch.coupons.forEach(c=>{ if(c.status==='paid' && c.date<=date){ total+=c.amount; if(+c.date===+date) evt=c.amount; } });
    if(kind==='autocall'){
      if(isAthena(p) && total===0 && p.coupon!=null) total=p.coupon*Math.max(0,yearsBetween(p.strike,date));
      evt=total;
    } else if(evt===0){ const m=freqMonths(p.freq); evt=(p.coupon!=null&&m)?p.coupon*m/12:(p.coupon||0); total=Math.max(total,evt); }
    return {evt, total};
  }
  // Graphique produit rendu sur un canvas hors-écran (fond blanc), prêt à coller dans un mail.
  function renderMailChart(p, data){
    if(!data||!data.ok) return null;
    const w=760, h=340, s=2, cv=document.createElement('canvas'); cv.width=w*s; cv.height=h*s;
    const ctx=cv.getContext('2d'); ctx.scale(s,s); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
    const series=data.series.map(se=>({name:se.name,color:se.color,pts:se.pts}));
    const pad={t:46,r:58,b:28,l:16}, x0=pad.l,x1=w-pad.r,y0=pad.t,y1=h-pad.b;
    const tmin=pd(p.strike)?pd(p.strike).getTime():0;
    const tMat=pd(p.maturity)?pd(p.maturity).getTime():today().getTime();
    const tEnd=lifeEndFrom(p,data).getTime(), live=!callDateFrom(p,data);
    let tmax=live?tMat:tEnd; if(tmax<=tmin) tmax=tmin+86400000;
    const allPts=[]; series.forEach(se=>se.pts.forEach(pt=>{ if(pt.t>=tmin&&pt.t<=tmax+6*864e5) allPts.push(pt.v); }));
    const barr=[100]; if(p.ac!=null)barr.push(p.ac*100); if(p.bcpn!=null)barr.push(p.bcpn*100); if(p.bcap!=null)barr.push(p.bcap*100);
    let lo=Math.min(...allPts,...barr), hi=Math.max(...allPts,...barr); if(!isFinite(lo)){lo=50;hi=120;}
    const pr=(hi-lo)*0.08||5; lo-=pr; hi+=pr;
    const sx=t=>x0+(x1-x0)*((t-tmin)/((tmax-tmin)||1)), sy=v=>y1-(y1-y0)*((v-lo)/((hi-lo)||1));
    ctx.fillStyle='#001B00'; ctx.font='600 15px Helvetica,Arial,sans-serif'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.fillText(p.lib||p.isin, x0, 20);
    let lx=x0; ctx.font='12px Helvetica,Arial,sans-serif'; ctx.textBaseline='middle';
    series.forEach(se=>{ ctx.fillStyle=se.color; ctx.fillRect(lx,32,11,11); lx+=15; ctx.fillStyle='#444';
      ctx.fillText(se.name,lx,38); lx+=ctx.measureText(se.name).width+18; });
    ctx.font='10px Helvetica,Arial,sans-serif';
    for(let i=0;i<=4;i++){ const v=lo+(hi-lo)*i/4, y=sy(v); ctx.strokeStyle='#eee8da'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
      ctx.fillStyle='#a8a496'; ctx.textAlign='left'; ctx.fillText(v.toFixed(0)+'%',x1+6,y); }
    const bl=[{v:1,c:'#9a978f',t:'100%'}];
    if(p.ac!=null)bl.push({v:p.ac,c:'#A9853F',t:'Autocall '+(p.ac*100).toFixed(0)+'%'});
    if(p.bcpn!=null)bl.push({v:p.bcpn,c:'#3f6b4a',t:'Coupon '+(p.bcpn*100).toFixed(0)+'%'});
    if(p.bcap!=null)bl.push({v:p.bcap,c:'#b04a32',t:'Capital '+(p.bcap*100).toFixed(0)+'%'});
    bl.forEach(b=>{ const y=sy(b.v*100); ctx.strokeStyle=b.c; ctx.lineWidth=1.1; ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); ctx.setLineDash([]); });
    ctx.font='600 9px Helvetica,Arial,sans-serif';
    const lbl=bl.map(b=>({c:b.c,t:b.t,y:sy(b.v*100)})).sort((a,b)=>a.y-b.y); let last=-1e9;
    lbl.forEach(b=>{ let ly=b.y-6; if(ly-last<11)ly=last+11; last=ly; ctx.fillStyle=b.c; ctx.textAlign='left'; ctx.fillText(b.t,x0+3,ly); });
    ctx.fillStyle='#a8a496'; ctx.font='10px Helvetica,Arial,sans-serif'; ctx.textAlign='center';
    const span=tmax-tmin, step=span>3*31536e6?12:(span>31536e6?6:3); let dd=new Date(tmin); dd.setDate(1);
    for(let g=0;g<80;g++){ const t=dd.getTime(); if(t>tmax)break; if(t>=tmin){ const x=sx(t);
      ctx.fillText(dd.getMonth()===0?String(dd.getFullYear()):MONTHS[dd.getMonth()].replace('.',''),x,y1+14); } dd=addMonths(dd,step); }
    const tTod=today().getTime(); if(live&&tTod>=tmin&&tTod<=tmax){ const x=sx(tTod);
      ctx.strokeStyle='rgba(11,31,18,.4)'; ctx.lineWidth=1.1; ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke(); }
    series.forEach(se=>{ const vis=se.pts.filter(pt=>pt.t>=tmin&&pt.t<=tmax+6*864e5); if(vis.length<2)return;
      ctx.beginPath(); vis.forEach((pt,i)=>{ const X=sx(pt.t),Y=sy(pt.v); i?ctx.lineTo(X,Y):ctx.moveTo(X,Y); });
      ctx.strokeStyle=se.color; ctx.lineWidth=1.8; ctx.lineJoin='round'; ctx.stroke();
      const lp=vis[vis.length-1]; ctx.beginPath(); ctx.arc(sx(lp.t),sy(lp.v),3.2,0,7); ctx.fillStyle=se.color; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.3; ctx.stroke(); });
    return cv;
  }
  function prepareMail(ds){
    const p=productsMap.get(ds.isin); if(!p){ toast('Produit introuvable',true); return; }
    const have=obsDataCache.get(ds.isin);
    const go=data=>buildMail(p, ds.kind, pd(ds.date), ds.name, ds.email, ds.nominal!==''?+ds.nominal:null, ds.dev||'EUR', data);
    if(have){ go(have); }
    else { toast('Préparation du mail…'); loadProductSeries(p).then(d=>{ obsDataCache.set(ds.isin,d); go(d); }); }
  }
  function buildMail(p, kind, date, name, email, nominal, dev, data){
    const {evt,total}=eventYield(p, data, kind, date);
    const evtPct=(evt*100).toFixed(2), totPct=(total*100).toFixed(2);
    const totEur = nominal!=null ? Math.round(total*nominal).toLocaleString('fr-FR')+' '+symbol(dev) : null;
    const isCpn = kind==='coupon';
    const subject = (isCpn?'Paiement des intérêts':'Remboursement par anticipation')+` (+${isCpn?evtPct:totPct}%) | La Financière de Rochechouart`;
    const greet = name&&name!=='—'?name:'Madame, Monsieur';
    const intro = isCpn?'détachement du coupon':'remboursement par anticipation';
    const rend = `+${totPct}%${totEur?(' ('+totEur+')'):''}`;
    // Version texte (repli) + version HTML enrichie (texte + graphique en ligne).
    const plain=[
      `Bonjour ${greet},`,'',
      `Nous avons le plaisir de vous informer du ${intro} de ce produit :`,'',
      `ISIN : ${p.isin}`,
      `Nom du produit : ${p.lib||'—'}`,
      `Nominal : ${nominal!=null?money(nominal,dev):'—'}`,
      `Rendement total : ${rend}`,'',
      'Nous vous remercions pour votre confiance et vous souhaitons une excellente journée,','',
      'Bien cordialement,','La Financière de Rochechouart'
    ].join('\n');
    const cv=renderMailChart(p,data);
    const dataUrl = cv?cv.toDataURL('image/png'):'';
    const eh=s=>esc(s);
    const row=(k,v)=>`<tr><td style="padding:1px 16px 1px 0;color:#5B6058">${k}</td><td><b>${eh(v)}</b></td></tr>`;
    const html=`<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E211C;line-height:1.6">`
      +`<p>Bonjour ${eh(greet)},</p>`
      +`<p>Nous avons le plaisir de vous informer du ${intro} de ce produit&nbsp;:</p>`
      +`<table style="border-collapse:collapse;margin:8px 0 14px"><tbody>`
      +row('ISIN',p.isin)+row('Nom du produit',p.lib||'—')
      +row('Nominal',nominal!=null?money(nominal,dev):'—')+row('Rendement total',rend)
      +`</tbody></table>`
      +(dataUrl?`<p><img src="${dataUrl}" alt="Graphique du produit" style="display:block;width:680px;max-width:100%;border:1px solid #eee8da;border-radius:6px"/></p>`:'')
      +`<p>Nous vous remercions pour votre confiance et vous souhaitons une excellente journée,</p>`
      +`<p>Bien cordialement,<br>La Financière de Rochechouart</p></div>`;
    // Tout l'email (texte + graphique) dans le presse-papiers : un seul Ctrl+V dans le corps.
    const clipOK = !!(navigator.clipboard && window.ClipboardItem);
    if(clipOK){ try{ navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html],{type:'text/html'}),
        'text/plain': new Blob([plain],{type:'text/plain'}) })]).catch(()=>{}); }catch(e){} }
    // Téléchargement du graphique (repli pièce jointe si le presse-papiers n'est pas géré).
    if(cv && cv.toBlob){ cv.toBlob(blob=>{ if(!blob) return;
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='LFDR_'+p.isin+'.png';
      document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500);
    }, 'image/png'); }
    // Ouverture du brouillon dans le compte mail de connexion (Gmail si applicable).
    // Si le presse-papiers fonctionne : corps vide (un Ctrl+V suffit). Sinon : on pré-remplit le texte.
    const me=sessionStorage.getItem('sb_user_email')||'';
    const bodyParam = clipOK?'':'&body='+encodeURIComponent(plain);
    if(/@(gmail|googlemail)\./i.test(me)){
      window.open('https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email||'')+'&su='+encodeURIComponent(subject)+bodyParam+(me?'&authuser='+encodeURIComponent(me):''),'_blank');
    } else {
      const a=document.createElement('a'); a.href='mailto:'+(email||'')+'?subject='+encodeURIComponent(subject)+(clipOK?'':'&body='+encodeURIComponent(plain));
      document.body.appendChild(a); a.click(); a.remove();
    }
    toast(clipOK?'Brouillon ouvert — cliquez dans le corps et collez (Ctrl+V) : texte + graphique.':'Brouillon prêt. Ajoutez le graphique téléchargé en pièce jointe.');
  }
  function renderObservations(){
    const host=document.getElementById('obs-body'); if(!host) return;
    const sinceEl=document.getElementById('obs-since'), tod=today();
    if(sinceEl && !sinceEl.value) sinceEl.value=addDays(tod,-1).toISOString().slice(0,10);
    const since = sinceEl&&sinceEl.value ? pd(sinceEl.value) : addDays(tod,-1);
    const collect=()=>({
      due: gatherObs(since, tod).sort((a,b)=> b.date-a.date || (a.p.lib||'').localeCompare(b.p.lib||'')),
      soon: gatherObs(addDays(tod,1), addDays(tod,14)).sort((a,b)=>a.date-b.date) });
    const paint=(loading)=>{
      const {due,soon}=collect();
      const sum=document.getElementById('obs-summary');
      if(sum) sum.textContent=`${due.filter(o=>!obsValid.get(obsKey(o.p.isin,o.kind,o.date))).length} à valider · ${soon.length} à venir (14 j)`;
      if(!due.length && !soon.length){ host.innerHTML='<div class="sp-rep-empty"><p>Aucune observation sur la période. Ajustez la date « À valider depuis ».</p></div>'; return {due,soon}; }
      host.innerHTML = obsListHTML(due, soon, loading); bindObsRows(due);
      return {due,soon};
    };
    const {due}=paint(true);
    // Charge les cours réels des produits dus, puis re-rend (filtre les remboursés, calcule le pire réel).
    const isins=[...new Set(due.filter(o=>!obsValid.get(obsKey(o.p.isin,o.kind,o.date))).map(o=>o.p.isin))].slice(0,80);
    Promise.all(isins.map(isin=>{ if(obsDataCache.has(isin)) return null;
      const p=productsMap.get(isin); if(!p||!p.uls||!p.uls.length){ obsDataCache.set(isin,{ok:false,series:[]}); return null; }
      return loadProductSeries(p).then(d=>obsDataCache.set(isin,d)); })
    ).then(()=>{ if(activeTab!=='observations') return; paint(false); updateObsCount(); });
  }
  (function wireObs(){
    const since=document.getElementById('obs-since'); if(since) since.addEventListener('change',renderObservations);
    const all=document.getElementById('obs-validate-all');
    if(all) all.addEventListener('click',()=>{
      const tod=today(), sinceEl=document.getElementById('obs-since');
      const since=sinceEl&&sinceEl.value?pd(sinceEl.value):addDays(tod,-1);
      const due=gatherObs(since,tod); const ps=[];
      due.forEach(o=>{ if(obsValid.get(obsKey(o.p.isin,o.kind,o.date))) return;
        const data=obsDataCache.get(o.p.isin); const w=(data&&data.ok)?worstAt(data,o.date.getTime()):null;
        if(w==null) return; const L=obsLabels(o.kind);
        const res = o.kind==='coupon'?((o.barrier==null||w>=o.barrier*100)?'paid':'unpaid'):(w>=o.barrier*100?'called':'notcalled');
        ps.push(saveObservation(o.p.isin,o.kind,o.date,res,null,null)); });
      if(!ps.length){ toast('Rien à valider automatiquement (cours indisponibles).',true); return; }
      Promise.all(ps).then(()=>{ toast(ps.length+' observation(s) validée(s)'); updateObsCount(); renderObservations(); });
    });
  })();

  /* ---------------- AUTO-LOGIN ---------------- */
  if(sessionStorage.getItem('sb_access_token')){
    document.getElementById('dash-user-email').textContent = sessionStorage.getItem('sb_user_email') || '';
    showDash();
  }

})();
