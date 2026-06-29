/* ===========================================================================
   Cockpit client / brief pré-RDV — La Financière de Rochechouart
   Module 360 autonome : agrège le CRM (clients + activités) et le book
   produits structurés (positions + produits + observations) pour préparer
   un rendez-vous sans rien compiler à la main.
   Persistance optionnelle via Supabase ; données embarquées via sp-data.js.
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
  const productsMap = new Map();   // isin -> produit (agrégé)
  let positions = [];              // allocations détenteurs
  let crmClients = [];             // fiches CRM complètes (KYC, profil, suivi)
  let crmActivities = [];          // activités CRM (appels, RDV, tâches…)
  const obsValid = new Map();      // observations validées : "isin|kind|YYYY-MM-DD" -> {result,...}
  const obsDataCache = new Map();  // isin -> cours (session)
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
  function loadSbProducts(){
    if(!SB) return;
    return fetch(API + '/sp_products?select=*', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => { (rows||[]).forEach(r => {
        if(r.deleted){ productsMap.delete(r.isin); return; }
        const p = fromDbProduct(r); productsMap.set(p.isin, Object.assign(productsMap.get(p.isin)||{}, p));
      }); }).catch(()=>{});
  }
  function loadSbPositions(){
    if(!SB) return;
    return fetch(API + '/sp_positions?select=*', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => { (rows||[]).forEach(r => {
        const pos = fromDbPosition(r);
        if(pos.seed_id){ positions = positions.filter(x => !(x._seed && x.id===pos.seed_id)); if(pos._deleted) return; }
        positions.push(pos);
      }); }).catch(()=>{});
  }
  function loadSbObservations(){
    if(!SB) return;
    return fetch(API + '/sp_observations?select=*', {headers:headers()})
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(rows => { (rows||[]).forEach(r => { obsValid.set(obsKey(r.isin,r.kind,r.obs_date), {result:r.result, amount:r.amount, note:r.note, by:r.validated_by, at:r.updated_at||r.created_at}); }); })
      .catch(()=>{});
  }
  function loadCrm(){
    if(!SB) return;
    return Promise.all([
      fetch(API + '/clients?select=*&order=nom.asc', {headers:headers()}).then(r => r.ok ? r.json() : []),
      fetch(API + '/activities?select=*&order=date_activite.desc', {headers:headers()}).then(r => r.ok ? r.json() : [])
    ]).then(([cs, as]) => { crmClients = cs||[]; crmActivities = as||[]; }).catch(()=>{});
  }
  function afterLoad(){ buildCockpitClientSelect(); renderStats(); renderCockpit(); }

  /* ---------------- DB <-> objet ---------------- */
  function fromDbProduct(r){
    return { isin:r.isin, lib:r.lib, emetteur:r.emetteur, dev:r.dev||'EUR', coupon:r.coupon, freq:r.freq,
      ac:r.ac, bcap:r.bcap, bcpn:r.bcpn, strike:r.strike, emission:r.emission, nextObs:r.next_obs, nextCpn:r.next_cpn,
      finalObs:r.final_obs, maturity:r.maturity, trade:r.trade_date, nominalRef:r.nominal_ref,
      fam:r.fam||'Autre', mem:r.mem, trig:r.trig, trigStep:r.trig_step, trigFreq:r.trig_freq, nonCall:r.non_call, uls:r.uls||[], _db:true };
  }
  function fromDbPosition(r){
    return { id:r.id, seed_id:r.seed_id, isin:r.isin, prenom:r.prenom, nom:r.nom, pole:r.pole, compte:r.compte,
      vendeur:r.vendeur, nominal:r.nominal, dev:r.dev||'EUR', pxa:r.pxa, pxv:r.pxv, gc:r.gc, gk:r.gk, gt:r.gt,
      gain:r.gain, statut:r.statut, trade:r.trade_date, client_id:r.client_id, _deleted:r.deleted, _db:true };
  }

  /* ---------------- HELPERS ---------------- */
  function esc(s){ const d=document.createElement('div'); d.textContent=(s==null)?'':s; return d.innerHTML; }
  function pd(s){ if(!s) return null; if(s instanceof Date) return s; const m=String(s).slice(0,10).split('-'); return m.length===3?new Date(+m[0],+m[1]-1,+m[2]):null; }
  const MONTHS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  function fmtShort(d){ d=pd(d); return d?`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`:'—'; }
  function pct(v,nd){ if(v==null) return '—'; let s=(v*100).toFixed(nd==null?2:nd); if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,''); return s+'%'; }
  function money(n,dev){ if(n==null) return '—'; return Math.round(n).toLocaleString('fr-FR')+' '+(symbol(dev)); }
  function symbol(d){ return {EUR:'€',USD:'$',CHF:'CHF',GBP:'£'}[d]||'€'; }
  function compact(n){ if(n==null) return '—'; const a=Math.abs(n);
    if(a>=1e6) return (n/1e6).toFixed(1).replace('.',',')+' M€';
    if(a>=1e3) return Math.round(n/1e3)+' k€'; return Math.round(n)+' €'; }
  function today(){ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function addMonths(d,m){ return new Date(d.getFullYear(),d.getMonth()+m,d.getDate()); }
  function addDays(d,n){ const x=pd(d); return new Date(x.getFullYear(),x.getMonth(),x.getDate()+n); }
  function yearsBetween(a,b){ return (pd(b)-pd(a))/(365.25*86400000); }
  function fullName(p){ return ((p.prenom||'')+' '+(p.nom||'')).trim()||'—'; }
  function toast(msg, err){ const t=document.getElementById('ck-toast'); if(!t) return; t.textContent=msg; t.className='sp-toast show'+(err?' err':''); setTimeout(()=>t.className='sp-toast',2600); }
  function normName(s){ return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
  function todayStrSp(){ const d=today(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function ovBar(v,max,col){ return `<div class="ov-bar"><div class="ov-bar__fill" style="width:${Math.max(3,v/(max||1)*100).toFixed(0)}%;background:${col||'var(--gold)'}"></div></div>`; }

  const FREQ_M = {'Trimestrielle':3,'Mensuelle':1,'Semestrielle':6,'Annuelle':12,'Bimestrielle':2,'Journalière':null,'Bullet':null};
  function freqMonths(f){ return (f in FREQ_M)?FREQ_M[f]:3; }
  function productStatus(p){ if(typeof p==='string') p=productsMap.get(p);
    if(!p) return 'LIVE'; if(p.statut) return p.statut;
    if(p.maturity) return pd(p.maturity) >= today()?'LIVE':'DONE'; return 'LIVE'; }
  function isAthena(p){ return p && (p.fam==='Athéna' || p.fam==='Athénix'); }

  const FX={EUR:1,USD:0.92,CHF:1.04,GBP:1.17};
  function toEur(n,dev){ return n==null?null:n*(FX[dev]||1); }
  const UL_COLORS=['#1f4d2e','#A9853F','#5b7d6a','#356a78','#9c6b3f'];
  function ulColor(i){ return UL_COLORS[i%UL_COLORS.length]; }

  /* ---------------- COURS RÉELS (Yahoo Finance via proxy CORS) ---------------- */
  const EPOCH = new Date(2015,0,1);
  const TICKERS = {
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
    'Richemont':'CFR.SW','ASML':'ASML.AS','ING Groep':'INGA.AS','UMG':'UMG.AS',
    'Banco Santander':'SAN.MC','BBVA':'BBVA.MC','Intesa':'ISP.MI','Eni':'ENI.MI','ENI':'ENI.MI',
    'Barclays':'BARC.L','Rolls-Royce':'RR.L','Nestlé':'NESN.SW','ArcelorMittal':'MT.AS',
    'Mercedes-benz':'MBG.DE','Volkswagen':'VOW3.DE','Volkswagen 6.36':'VOW3.DE','Adidas':'ADS.DE',
    'Allianz':'ALV.DE','Rheinmetall':'RHM.DE','Novo Nordisk':'NVO',
    'Amazon':'AMZN','Microsoft':'MSFT','Alphabet':'GOOGL','Apple':'AAPL','Nvidia':'NVDA',
    'Tesla':'TSLA','Chevron':'CVX','Salesforce':'CRM','Visa':'V','Broadcom':'AVGO','Abbvie':'ABBV',
    'Facebook':'META','Meta':'META','Intel':'INTC','NextEra':'NEE','Nextera':'NEE','Morgan Stanley':'MS',
    'UnitedHealth Group':'UNH','UnitedHealth':'UNH','Citi':'C','Conocophillips':'COP','ConocoPhilips':'COP',
    'Air Product':'APD','AppLovin':'APP','Eli Lilly':'LLY','Moderna':'MRNA','Brookfield Corp.':'BN',
    'Uber':'UBER','Mercadolibre':'MELI','MercadoLibre':'MELI',
    'Alibaba':'BABA','Baidu':'BIDU','Tencent':'0700.HK','TSMC':'TSM',
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
    const hosts=['https://query1.finance.yahoo.com/v8/finance/chart/','https://query2.finance.yahoo.com/v8/finance/chart/'];
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
    return chain.catch(()=>(cached&&cached.pts&&cached.pts.length)?cached.pts:null);
  }
  function loadProductSeries(p){
    const uls=p.uls||[], s0=(pd(p.strike)||EPOCH).getTime();
    return Promise.all(uls.map((u,i)=>{
      const t=tickerFor(u.n);
      if(!t) return Promise.resolve({name:u.n, color:ulColor(i), ticker:null, ok:false});
      return fetchYahoo(t,s0).then(pts=>{
        if(!pts||!pts.length) return {name:u.n,color:ulColor(i),ticker:t,ok:false};
        let base=null, bi=0;
        for(let k=0;k<pts.length;k++){ if(pts[k].t<=s0){ base=pts[k].p; bi=k; } else break; }
        if(base==null||base<=0){ base=pts[0].p; bi=0; }
        const reb=[]; for(let k=bi;k<pts.length;k++) reb.push({t:pts[k].t, v:pts[k].p/base*100});
        if(reb.length<2) return {name:u.n,color:ulColor(i),ticker:t,ok:false};
        reb[0]={t:s0, v:100};
        return {name:u.n,color:ulColor(i),ticker:t,ok:true,pts:reb};
      });
    })).then(series=>({ok:series.length>0 && series.every(s=>s.ok), series}));
  }
  function levelAt(pts, t){ if(!pts||!pts.length) return null; let v=pts[0].v; for(const pt of pts){ if(pt.t<=t) v=pt.v; else break; } return v; }
  function worstAt(data, t){ if(!data||!data.ok) return null; let w=null; data.series.forEach(s=>{ const v=levelAt(s.pts,t); if(v!=null&&(w==null||v<w)) w=v; }); return w; }

  /* ---------------- CALENDRIER D'OBSERVATIONS ---------------- */
  function observationDates(p){
    const sd=pd(p.strike), mat=pd(p.maturity); const m=freqMonths(p.freq);
    if(!sd||!mat||!m) return mat?[mat]:[];
    const out=[]; let d=addMonths(sd,m), guard=0;
    while(d<=addDays(mat,4) && guard<400){ out.push(new Date(d)); d=addMonths(d,m); guard++; }
    if(!out.length) out.push(new Date(mat));
    return out;
  }
  function nextObsDate(p){ const tod=today(); const o=observationDates(p).find(d=>d>tod); return o||pd(p.nextObs); }
  function nonCallMonths(p){ return p.nonCall!=null?p.nonCall:12; }
  function firstCallIdx(p){
    const obs=observationDates(p), sd=pd(p.strike); if(!sd||!obs.length) return 0;
    const fc=addMonths(sd, nonCallMonths(p)).getTime();
    const idx=obs.findIndex(d=>d.getTime()>=fc-4*86400000); return idx<0?obs.length:idx;
  }
  function trigStepOf(p){ return p.trigStep!=null?p.trigStep:0.01; }
  function trigFreqOf(p){ return p.trigFreq||'Trimestrielle'; }
  function trigAt(p,k){
    if(p.ac==null) return null;
    if(!p.trig) return p.ac;
    const fi=firstCallIdx(p); if(k<fi) return p.ac;
    const obsM=freqMonths(p.freq)||3, decM=freqMonths(trigFreqOf(p))||12;
    const nDec=Math.floor(((k-fi)*obsM)/decM);
    const floor=(p.bcpn!=null?p.bcpn:0.6);
    return Math.max(floor, +(p.ac - trigStepOf(p)*nDec).toFixed(4));
  }
  function callDateFrom(p,data){
    if(!data||!data.ok || p.ac==null) return null;
    const obs=observationDates(p), tod=today(), fi=firstCallIdx(p);
    for(let k=fi;k<obs.length;k++){ const d=obs[k]; if(d>tod) break;
      const w=worstAt(data,d.getTime()); if(w!=null && w>=trigAt(p,k)*100) return d; }
    return null;
  }
  // Calendrier coupons / autocalls à partir des cours réels (+ observations validées).
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
        else if(!callable) st='notcalled';
        else if(ok){ if(w!=null && w>=trig*100){ st='called'; called=true; redeemDate=date; } else st='notcalled'; }
        else st='na';
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
    const matured = pd(p.maturity)&&pd(p.maturity)<tod;
    return {coupons, autocalls, hasData:ok, redeemed:called, redeemDate, matured,
            status:(called||matured)?'DONE':'LIVE'};
  }

  /* ---------------- DÉTENTEURS ---------------- */
  function holders(){
    const map=new Map();
    positions.filter(p=>!p._deleted).forEach(p=>{ const k=fullName(p); if(k==='—')return; if(!map.has(k)) map.set(k,{name:k,client_id:p.client_id,items:[]}); map.get(k).items.push(p); });
    return Array.from(map.values()).sort((a,b)=>b.items.length-a.items.length);
  }
  function clientPositions(name){ return positions.filter(p=>!p._deleted && fullName(p)===name); }

  /* ===================================================================
     COCKPIT 360
     =================================================================== */
  const ckSel = document.getElementById('ck-client');
  if(ckSel) ckSel.addEventListener('change', renderCockpit);
  const ckBriefBtn = document.getElementById('ck-brief-btn');
  if(ckBriefBtn) ckBriefBtn.addEventListener('click', ()=>{ if(currentCockpit) openBrief(currentCockpit); else toast('Sélectionnez un client.', true); });
  let currentCockpit = null;

  function ckCrmName(c){ return ((c.prenom||'')+' '+(c.nom||'')).trim(); }
  function cockpitList(){
    return holders().map(h=>{
      let crm = h.client_id ? crmClients.find(c=>String(c.id)===String(h.client_id)) : null;
      if(!crm) crm = crmClients.find(c=>normName(ckCrmName(c))===normName(h.name));
      return Object.assign({}, h, {crm});
    });
  }
  function buildCockpitClientSelect(){
    if(!ckSel) return; const prev=ckSel.value; const list=cockpitList();
    ckSel.innerHTML='<option value="">— Sélectionner un client —</option>'+list.map(h=>`<option value="${esc(h.name)}">${esc(h.name)} (${h.items.length})</option>`).join('');
    if(prev) ckSel.value=prev;
  }

  function ckActsOf(crm){ return crm ? crmActivities.filter(a=>String(a.client_id)===String(crm.id)) : []; }
  function lastContact(crm){ const a=ckActsOf(crm).map(x=>x.date_activite).filter(Boolean).sort(); return a.length?a[a.length-1]:null; }
  function lastRdv(crm){ const a=ckActsOf(crm).filter(x=>x.type==='rdv').map(x=>x.date_activite).filter(Boolean).sort(); return a.length?a[a.length-1]:null; }
  function nextRdv(crm){ const t=todayStrSp(); const a=ckActsOf(crm).filter(x=>x.type==='rdv'&&!x.done&&x.date_activite&&x.date_activite.slice(0,10)>=t).map(x=>x.date_activite).sort(); return a.length?a[0]:null; }

  /* --- Cible d'allocation (modèle), ajustable, persistée localement par client --- */
  function ckTargetKey(d){ return 'lfdr:ck:target:'+(d.crm?('id'+d.crm.id):normName(d.name)); }
  function loadTarget(d){ try{ return JSON.parse(localStorage.getItem(ckTargetKey(d))||'null')||{}; }catch(e){ return {}; } }
  function saveTarget(d,map){ try{ if(map) localStorage.setItem(ckTargetKey(d),JSON.stringify(map)); else localStorage.removeItem(ckTargetKey(d)); }catch(e){} }

  /* --- Points de conformité (KYC, profil DDA/MIF, RGPD, LCB-FT, revue, actions) --- */
  function complianceItems(crm, items){
    const out=[]; const add=(sev,label,detail)=>out.push({sev,label,detail:detail||''});
    if(!crm){ add('warn','Fiche CRM non reliée','Aucun contact CRM rattaché à ce détenteur — reliez l\'allocation à une fiche (Produits structurés › Suivi produit › Allouer › Contact CRM).'); return out; }
    const miss=[];
    if(!crm.date_naissance) miss.push('date de naissance');
    if(!crm.adresse) miss.push('adresse');
    if(!crm.nationalite) miss.push('nationalité');
    if(!crm.telephone) miss.push('téléphone');
    if(miss.length) add('todo','Identité / KYC à compléter', miss.join(', '));
    const profMiss=[];
    if(!crm.couple_rendement_risque) profMiss.push('profil rendement/risque');
    if(!crm.niveau_connaissance) profMiss.push('niveau de connaissance');
    if(!crm.experience_produits || !crm.experience_produits.length) profMiss.push('expérience produits');
    if(!crm.horizon) profMiss.push('horizon');
    if(profMiss.length) add('todo','Profil investisseur (DDA / MIF) incomplet', profMiss.join(', '));
    const exp=(crm.experience_produits||[]).map(x=>normName(x));
    const knowsStruct=exp.some(x=>x.indexOf('struct')>=0);
    const lowKnow=/debut|faible|aucun|novice|limit/.test(normName(crm.niveau_connaissance||''));
    if(items.length && (!knowsStruct || lowKnow)) add('warn','Adéquation produits structurés à tracer','Le client détient des produits structurés — documenter connaissance/expérience et justifier le conseil.');
    if(crm.consentement_rgpd!==true) add('todo','Consentement RGPD à recueillir');
    if(!crm.origine_fonds) add('todo','Origine des fonds (LCB-FT) à renseigner');
    const lr=lastRdv(crm);
    if(!lr) add('warn','Aucun RDV enregistré','Planifier une première revue de portefeuille.');
    else { const months=(today()-new Date(lr))/(30.44*864e5); if(months>=12) add('warn','Revue annuelle à planifier','Dernier RDV il y a '+Math.round(months)+' mois.'); }
    if(crm.next_action && crm.next_action_date && crm.next_action_date.slice(0,10)<todayStrSp()) add('todo','Action en retard : '+crm.next_action, 'Échéance '+fmtShort(crm.next_action_date));
    const od=ckActsOf(crm).filter(a=>!a.done && a.date_activite && a.date_activite.slice(0,10)<todayStrSp());
    if(od.length) add('todo', od.length+' tâche(s) en retard', od.slice(0,3).map(a=>a.titre||a.type).join(', '));
    if(!out.length) add('ok','Dossier conforme','Aucun point bloquant identifié à ce stade.');
    return out;
  }

  /* --- Agrégation 360 d'un client --- */
  function buildCockpitData(entry, items){
    const crm=entry.crm||null;
    const schedules=new Map();
    items.forEach(pos=>{ const p=productsMap.get(pos.isin); if(!p) return; const data=obsDataCache.get(pos.isin); schedules.set(pos.isin, computeSchedule(p, data||{ok:false,series:[]})); });
    const live=items.filter(p=>(p.statut||'LIVE')==='LIVE');
    const encours=live.reduce((s,p)=>s+(toEur(p.nominal,p.dev)||0),0);
    const investedNom=items.reduce((s,p)=>s+(toEur(p.nominal,p.dev)||0),0);
    const envMap=new Map();
    live.forEach(p=>{ const k=(p.compte||'').trim()||'Enveloppe non précisée'; envMap.set(k,(envMap.get(k)||0)+(toEur(p.nominal,p.dev)||0)); });
    const envelopes=Array.from(envMap.entries()).sort((a,b)=>b[1]-a[1]);
    const famMap=new Map();
    live.forEach(p=>{ const pr=productsMap.get(p.isin)||{}; const f=pr.fam||'Autre'; famMap.set(f,(famMap.get(f)||0)+(toEur(p.nominal,p.dev)||0)); });
    const families=Array.from(famMap.entries()).sort((a,b)=>b[1]-a[1]);
    const yearStart=new Date(today().getFullYear(),0,1);
    let coupTot=0, coupYtd=0;
    items.forEach(pos=>{ const pr=productsMap.get(pos.isin); const nomEur=toEur(pos.nominal,pos.dev)||0; const sch=schedules.get(pos.isin);
      if(sch && sch.hasData){
        sch.coupons.forEach(c=>{ if(c.status==='paid'){ const e=c.amount*nomEur; coupTot+=e; if(pd(c.date)>=yearStart) coupYtd+=e; } });
        if(sch.redeemed && pr && isAthena(pr) && pr.coupon!=null){ const yrs=Math.max(0,yearsBetween(pr.strike,sch.redeemDate)); const e=pr.coupon*yrs*nomEur; coupTot+=e; if(pd(sch.redeemDate)>=yearStart) coupYtd+=e; }
      } else if(pos.gc!=null){ coupTot+=pos.gc*nomEur; }
    });
    const hasData=items.some(p=>{ const dd=obsDataCache.get(p.isin); return dd&&dd.ok; });
    const upcoming=live.map(pos=>{ const p=productsMap.get(pos.isin); if(!p) return null; const d=nextObsDate(p); if(!d) return null;
      const data=obsDataCache.get(pos.isin); const w=(data&&data.ok)?worstAt(data,d.getTime()):null;
      return {pos,p,date:d,worst:w}; }).filter(Boolean).sort((a,b)=>a.date-b.date).slice(0,8);
    let cw=0,cs=0; live.forEach(p=>{ const pr=productsMap.get(p.isin); if(pr&&pr.coupon!=null){ const n=toEur(p.nominal,p.dev)||0; cs+=pr.coupon*n; cw+=n; } });
    const avgCoupon=cw?cs/cw:null;
    const compliance=complianceItems(crm, items);
    return {name:entry.name, crm, items, live, encours, investedNom, envelopes, families, coupTot, coupYtd, hasData, upcoming, compliance, avgCoupon, schedules};
  }

  function renderCockpit(){
    const host=document.getElementById('ck-body'); if(!host) return;
    const name = ckSel ? ckSel.value : '';
    if(!name){ currentCockpit=null; host.innerHTML='<div class="sp-rep-empty"><p>Sélectionnez un client pour afficher son cockpit 360° et générer le brief pré-RDV. Les clients apparaissent ici dès qu\'un produit leur est alloué (module Produits structurés › Suivi produit › Allouer).</p></div>'; return; }
    const entry = cockpitList().find(h=>h.name===name) || {name, items:clientPositions(name), crm:null};
    const items = clientPositions(name);
    const render=(loading)=>{ const d=buildCockpitData(entry, items); currentCockpit=d; host.innerHTML=cockpitHTML(d, loading); bindCockpit(d); };
    render(true);
    const liveIsins=[...new Set(items.filter(p=>(p.statut||'LIVE')==='LIVE').map(p=>p.isin))]
      .filter(isin=>{ const p=productsMap.get(isin); return p&&p.uls&&p.uls.length; }).slice(0,40);
    const need=liveIsins.filter(isin=>!obsDataCache.has(isin));
    if(!need.length){ render(false); return; }
    Promise.all(need.map(isin=>{ const p=productsMap.get(isin); return loadProductSeries(p).then(dd=>obsDataCache.set(isin,dd)); }))
      .then(()=>{ if(ckSel && ckSel.value!==name) return; render(false); });
  }

  function cockpitHTML(d, loading){
    const crm=d.crm;
    const totPct = d.investedNom? d.coupTot/d.investedNom : null;
    const ytdPct = d.investedNom? d.coupYtd/d.investedNom : null;
    const maxEnv = d.envelopes.length? d.envelopes[0][1] : 1;
    const famTotal = d.families.reduce((s,f)=>s+f[1],0)||1;
    const target = loadTarget(d);
    const todo = d.compliance.filter(c=>c.sev==='todo').length;
    const warn = d.compliance.filter(c=>c.sev==='warn').length;
    const lc=crm?lastContact(crm):null, nr=crm?nextRdv(crm):null;
    const perfCell=(p)=> p!=null ? pct(p,2) : (loading?'<span class="ck-loading">…</span>':'—');
    return `
      <div class="ck-head">
        <div class="ck-head__l">
          <h3>${esc(d.name)}</h3>
          <div class="ck-head__meta">
            ${crm?'':'<span class="ck-warn-inline">⚠ Fiche CRM non reliée</span>'}
            ${crm&&crm.email?`<span>✉ ${esc(crm.email)}</span>`:''}
            ${crm&&crm.telephone?`<span>☎ ${esc(crm.telephone)}</span>`:''}
            ${crm&&crm.stage?`<span class="ck-tag">${esc(crm.stage)}</span>`:''}
            <span>Dernier contact&nbsp;: <b>${lc?fmtShort(lc):'—'}</b></span>
            ${nr?`<span class="ck-tag gold">RDV ${fmtShort(nr)}</span>`:''}
          </div>
        </div>
        <button class="ck-brief-cta" id="ck-brief-cta">Générer le brief pré-RDV</button>
      </div>

      <div class="ov-kpis">
        <div class="ov-kpi"><div class="v">${compact(d.encours)}</div><div class="l">Encours en cours</div></div>
        <div class="ov-kpi"><div class="v">${d.live.length}<span class="sub">/ ${d.items.length}</span></div><div class="l">Produits vivants</div></div>
        <div class="ov-kpi"><div class="v">${perfCell(ytdPct)}</div><div class="l">Perf. YTD (coupons)</div></div>
        <div class="ov-kpi"><div class="v">${perfCell(totPct)}</div><div class="l">Depuis origine (coupons)</div></div>
      </div>

      <div class="ck-grid">
        <div class="sp-card">
          <h4>Encours par enveloppe</h4>
          <div class="ov-list">${d.envelopes.map(([n,v])=>`<div class="ov-row"><span class="ov-row__n">${esc(n)}</span>${ovBar(v,maxEnv,'#A9853F')}<span class="ov-row__v">${compact(v)} · ${(v/(d.encours||1)*100).toFixed(0)}%</span></div>`).join('')||'<p class="sp-muted sm">Aucun produit vivant alloué.</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Allocation actuelle vs cible <span class="sp-h4-note">— par famille, % de l'encours · cible ajustable</span></h4>
          <div class="ck-alloc" id="ck-alloc">${allocVsTargetHTML(d, target, famTotal)}</div>
        </div>
        <div class="sp-card">
          <h4>Prochaines échéances <span class="sp-h4-note">— constatations à venir${loading?' · chargement des cours…':''}</span></h4>
          <div class="ov-risk">${d.upcoming.map(cockpitDueRow).join('')||'<p class="sp-muted sm">Aucune échéance à venir.</p>'}</div>
        </div>
        <div class="sp-card">
          <h4>Points de conformité <span class="sp-h4-note">— ${todo} à traiter · ${warn} à surveiller</span></h4>
          <div class="ck-comp">${d.compliance.map(c=>`<div class="ck-comp__row ${c.sev}"><span class="ck-dot"></span><div><b>${esc(c.label)}</b>${c.detail?`<small>${esc(c.detail)}</small>`:''}</div></div>`).join('')}</div>
        </div>
      </div>

      <div class="sp-card ck-brief-card">
        <h4>Brief pré-RDV <span class="sp-h4-note">— synthèse auto-générée</span>
          <span class="ck-brief-actions"><button class="ck-mini-btn" id="ck-brief-copy">Copier</button><button class="ck-mini-btn" id="ck-brief-print">Imprimer / PDF</button></span>
        </h4>
        <div class="ck-brief" id="ck-brief">${briefHTML(d)}</div>
      </div>`;
  }

  function allocVsTargetHTML(d, target, famTotal){
    if(!d.families.length) return '<p class="sp-muted sm">Aucun produit vivant alloué — pas d\'allocation à comparer.</p>';
    const rows=d.families.map(([f,v])=>{
      const act=v/famTotal*100;
      const tgt=target[f]!=null?target[f]:Math.round(act);
      const gap=act-tgt, gcls=Math.abs(gap)<5?'ok':(gap>0?'over':'under');
      return `<div class="ck-alloc__row">
        <span class="ck-alloc__n" title="${esc(f)}">${esc(f)}</span>
        <div class="ck-alloc__bar"><div class="ck-alloc__fill" style="width:${Math.min(100,act).toFixed(0)}%"></div><div class="ck-alloc__tgt" style="left:${Math.min(100,tgt)}%"></div></div>
        <span class="ck-alloc__act">${act.toFixed(0)}%</span>
        <span class="ck-alloc__tgtv">cible <input type="number" class="ck-tgt-input" data-fam="${esc(f)}" value="${tgt}" min="0" max="100">%</span>
        <span class="ck-alloc__gap ${gcls}">${gap>=0?'+':''}${gap.toFixed(0)} pts</span>
      </div>`;
    }).join('');
    return rows+`<div class="ck-alloc__foot"><button class="ck-mini-btn" id="ck-tgt-save">Enregistrer la cible</button><button class="ck-mini-btn ghost" id="ck-tgt-auto">Réinitialiser</button><span class="sp-muted sm" id="ck-tgt-status"></span></div>`;
  }
  function cockpitDueRow(x){
    const p=x.p; let sev='safe', note='';
    if(x.worst!=null){
      const ac=p.ac!=null?p.ac*100:null, cpn=p.bcpn!=null?p.bcpn*100:null;
      if(cpn!=null && x.worst<cpn){ sev='danger'; note='sous barrière coupon'; }
      else if(ac!=null && x.worst>=ac){ sev='warn'; note='autocall probable'; }
      else note='pire '+x.worst.toFixed(0)+'%';
    }
    const tags=[p.ac!=null?'autocall '+pct(p.ac,0):'', p.bcpn!=null?'cpn '+pct(p.bcpn,0):''].filter(Boolean).join(' · ');
    return `<div class="ov-risk__row ${sev}">
      <div class="ov-risk__n">${esc(p.lib||p.isin)}<small>${esc((p.uls||[]).map(u=>u.n).join(', '))}${note?' — '+esc(note):''}</small></div>
      <div class="ov-risk__fig"><b>${fmtShort(x.date)}</b><span>${tags}</span></div></div>`;
  }

  function bindCockpit(d){
    const cta=document.getElementById('ck-brief-cta'); if(cta) cta.addEventListener('click',()=>openBrief(d));
    const cp=document.getElementById('ck-brief-copy'); if(cp) cp.addEventListener('click',()=>copyBrief(d));
    const pr=document.getElementById('ck-brief-print'); if(pr) pr.addEventListener('click',()=>openBrief(d));
    const save=document.getElementById('ck-tgt-save');
    if(save) save.addEventListener('click',()=>{ const map={}; document.querySelectorAll('#ck-alloc .ck-tgt-input').forEach(i=>{ map[i.dataset.fam]=Math.max(0,Math.min(100,parseFloat(i.value)||0)); }); saveTarget(d,map);
      const st=document.getElementById('ck-tgt-status'); if(st){ st.textContent='✓ Cible enregistrée'; st.style.color='#2e7d32'; } });
    const auto=document.getElementById('ck-tgt-auto');
    if(auto) auto.addEventListener('click',()=>{ saveTarget(d,null); renderCockpit(); });
    document.querySelectorAll('#ck-alloc .ck-tgt-input').forEach(i=>i.addEventListener('input',()=>updateAllocGaps(d)));
  }
  function updateAllocGaps(d){
    const famTotal=d.families.reduce((s,f)=>s+f[1],0)||1;
    document.querySelectorAll('#ck-alloc .ck-alloc__row').forEach(row=>{
      const inp=row.querySelector('.ck-tgt-input'); if(!inp) return;
      const ent=d.families.find(x=>x[0]===inp.dataset.fam); const v=ent?ent[1]:0;
      const act=v/famTotal*100, tgt=parseFloat(inp.value)||0, gap=act-tgt;
      const g=row.querySelector('.ck-alloc__gap'); if(g){ g.textContent=(gap>=0?'+':'')+gap.toFixed(0)+' pts'; g.className='ck-alloc__gap '+(Math.abs(gap)<5?'ok':(gap>0?'over':'under')); }
      const mk=row.querySelector('.ck-alloc__tgt'); if(mk) mk.style.left=Math.min(100,tgt)+'%';
    });
  }

  /* ---- Brief : lignes structurées (affichage / copier / impression) ---- */
  function briefLines(d){
    const crm=d.crm, L=[];
    const totPct=d.investedNom?d.coupTot/d.investedNom:null, ytdPct=d.investedNom?d.coupYtd/d.investedNom:null;
    L.push({h:'Synthèse patrimoniale'});
    L.push({t:`${d.name} — ${d.live.length} produit(s) structuré(s) vivant(s), encours ${compact(d.encours)} réparti sur ${d.envelopes.length} enveloppe(s).`});
    if(d.avgCoupon!=null || d.coupTot) L.push({t:`${d.avgCoupon!=null?`Coupon moyen pondéré ${pct(d.avgCoupon,2)}/an. `:''}Coupons perçus depuis origine ${compact(d.coupTot)}${totPct!=null?` (${pct(totPct,2)})`:''}${d.coupYtd?`, dont ${compact(d.coupYtd)}${ytdPct!=null?` (${pct(ytdPct,2)})`:''} cette année`:''}.`});
    if(d.envelopes.length>1){ L.push({h:'Répartition par enveloppe'}); d.envelopes.forEach(([n,v])=>L.push({li:`${n} : ${compact(v)} (${(v/(d.encours||1)*100).toFixed(0)}%)`})); }
    if(d.families.length){ const ft=d.families.reduce((s,f)=>s+f[1],0)||1; L.push({h:'Allocation par famille'}); d.families.forEach(([f,v])=>L.push({li:`${f} : ${(v/ft*100).toFixed(0)}%`})); }
    if(d.upcoming.length){ L.push({h:'À l\'ordre du jour — échéances'});
      d.upcoming.slice(0,5).forEach(x=>{ const w=x.worst!=null?`, pire ${x.worst.toFixed(0)}%`:''; const cnd=[x.p.ac!=null?'autocall '+pct(x.p.ac,0):'', x.p.bcpn!=null?'cpn '+pct(x.p.bcpn,0):''].filter(Boolean).join(', ');
        L.push({li:`${fmtShort(x.date)} — ${x.p.lib||x.p.isin}${cnd?' ('+cnd+w+')':w}`}); }); }
    const todo=d.compliance.filter(c=>c.sev!=='ok');
    if(todo.length){ L.push({h:'Conformité à régulariser'}); todo.forEach(c=>L.push({li:c.label+(c.detail?` — ${c.detail}`:'')})); }
    L.push({h:'Relation & objectifs'});
    const lc=crm?lastContact(crm):null, nr=crm?nextRdv(crm):null;
    L.push({t:`Dernier contact : ${lc?fmtShort(lc):'—'}.${nr?` Prochain RDV : ${fmtShort(nr)}.`:''}${crm&&crm.next_action?` Prochaine action : ${crm.next_action}${crm.next_action_date?' ('+fmtShort(crm.next_action_date)+')':''}.`:''}`});
    if(crm&&crm.objectifs&&crm.objectifs.length) L.push({t:`Objectifs : ${Array.isArray(crm.objectifs)?crm.objectifs.join(', '):crm.objectifs}.`});
    if(crm&&(crm.horizon||crm.couple_rendement_risque)) L.push({t:`Horizon : ${crm.horizon||'—'} · Profil : ${crm.couple_rendement_risque||'—'}.`});
    if(crm&&crm.notes_internes) L.push({t:`Note interne : ${crm.notes_internes}`});
    return L;
  }
  function linesToHTML(L, hTag){
    let html='', inUl=false;
    L.forEach(x=>{
      if(x.li){ if(!inUl){ html+='<ul>'; inUl=true; } html+=`<li>${esc(x.li)}</li>`; return; }
      if(inUl){ html+='</ul>'; inUl=false; }
      if(x.h) html+=`<${hTag}>${esc(x.h)}</${hTag}>`; else html+=`<p>${esc(x.t)}</p>`;
    });
    if(inUl) html+='</ul>';
    return html;
  }
  function briefHTML(d){ return linesToHTML(briefLines(d),'h5'); }
  function briefPlain(d){
    const tday=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const out=['BRIEF PRÉ-RDV — '+d.name, 'La Financière de Rochechouart · '+tday];
    briefLines(d).forEach(x=>{ if(x.h) out.push('', x.h.toUpperCase()); else if(x.li) out.push('  • '+x.li); else out.push(x.t); });
    return out.join('\n');
  }
  function copyBrief(d){
    const txt=briefPlain(d);
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(()=>toast('Brief copié dans le presse-papiers.')).catch(()=>toast('Copie impossible.',true)); }
    else toast('Presse-papiers indisponible sur ce navigateur.',true);
  }
  function openBrief(d){
    const tday=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
    const totPct=d.investedNom?d.coupTot/d.investedNom:null, ytdPct=d.investedNom?d.coupYtd/d.investedNom:null;
    const body=linesToHTML(briefLines(d),'h2');
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Brief pré-RDV — ${esc(d.name)} — ${tday}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Jost,Arial,sans-serif;color:#1E211C;padding:46px 54px;max-width:880px;margin:0 auto;font-size:13px;line-height:1.65}
.header{text-align:center;border-bottom:2px solid #A9853F;padding-bottom:22px;margin-bottom:24px}
.header h1{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:23px;font-weight:500}
.header .date{color:#5B6058;font-size:12px;margin-top:6px}
h1.client{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:21px;font-weight:600;margin-bottom:14px}
.summary{background:#f6f4ee;border-radius:10px;padding:18px 24px;margin-bottom:26px;display:flex;gap:34px;flex-wrap:wrap}
.summary .item .l{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#5B6058}
.summary .item .v{font-size:19px;font-weight:600;color:#001B00;margin-top:3px}
h2{font-family:'Cormorant Garamond',serif;color:#001B00;font-size:16px;margin:22px 0 7px;font-weight:600;border-bottom:1px solid #e8e6df;padding-bottom:4px}
p{margin:0 0 7px}ul{margin:0 0 7px;padding-left:20px}li{margin-bottom:3px}
.footer{text-align:center;font-size:10px;color:#999;margin-top:38px;border-top:1px solid #e8e6df;padding-top:16px;line-height:1.7}
.print-btn{position:fixed;top:18px;right:18px;background:#A9853F;color:#fff;border:0;padding:11px 22px;border-radius:8px;font-family:Jost;font-size:13px;cursor:pointer}
@media print{.print-btn{display:none}body{padding:20px}}</style></head><body>
<button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
<div class="header"><h1>La Financière de Rochechouart</h1><div class="date">Brief pré-RDV · ${tday}</div></div>
<h1 class="client">${esc(d.name)}</h1>
<div class="summary">
  <div class="item"><div class="l">Encours en cours</div><div class="v">${Math.round(d.encours).toLocaleString('fr-FR')} €</div></div>
  <div class="item"><div class="l">Produits vivants</div><div class="v">${d.live.length} / ${d.items.length}</div></div>
  <div class="item"><div class="l">Coupons perçus (origine)</div><div class="v">${Math.round(d.coupTot).toLocaleString('fr-FR')} €${totPct!=null?' · '+pct(totPct,2):''}</div></div>
  <div class="item"><div class="l">dont YTD</div><div class="v">${Math.round(d.coupYtd).toLocaleString('fr-FR')} €${ytdPct!=null?' · '+pct(ytdPct,2):''}</div></div>
</div>
${body}
<div class="footer"><p><strong>La Financière de Rochechouart</strong> · 58 rue de Monceau, 75008 Paris</p><p>Document interne de préparation — Valorisations et niveaux indicatifs, non contractuels.</p></div>
</body></html>`;
    const w=window.open('','_blank'); if(!w){ toast('Autorisez les pop-ups pour ouvrir le brief.',true); return; }
    w.document.write(html); w.document.close();
  }

  /* ---------------- STATS (en-tête du module) ---------------- */
  function renderStats(){
    const list=cockpitList();
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('stat-clients', list.length);
    let enc=0; positions.filter(p=>!p._deleted && (p.statut||'LIVE')==='LIVE').forEach(p=>enc+=(toEur(p.nominal,p.dev)||0));
    set('stat-encours', compact(enc));
    const tod=today(), in30=addDays(tod,30); let due=0;
    positions.filter(p=>!p._deleted && (p.statut||'LIVE')==='LIVE').forEach(p=>{ const pr=productsMap.get(p.isin); if(!pr) return; const o=nextObsDate(pr); if(o && o>=tod && o<=in30) due++; });
    set('stat-due', due);
    let toReg=0; list.forEach(h=>{ const c=complianceItems(h.crm, h.items); if(c.some(x=>x.sev==='todo')) toReg++; });
    set('stat-compliance', toReg);
  }

  /* ---------------- AUTO-LOGIN ---------------- */
  if(sessionStorage.getItem('sb_access_token')){
    document.getElementById('dash-user-email').textContent = sessionStorage.getItem('sb_user_email') || '';
    showDash();
  }

})();
