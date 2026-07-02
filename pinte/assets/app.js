/* ============================================================
 * Ma p'tite pinte 🍺 — Application (vanilla JS, sans build)
 * Site 100 % indépendant. Backend : Firebase
 * (Auth + Firestore temps réel + Storage).
 * ============================================================ */

'use strict';

const CFG = window.PP_CONFIG || {};
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Init Firebase ---------- */
let auth = null, db = null;
const fb = CFG.firebase || {};
const configured = fb.apiKey && !String(fb.apiKey).includes('VOTRE') &&
                   fb.projectId && !String(fb.projectId).includes('VOTRE');

if (configured && window.firebase) {
  firebase.initializeApp(fb);
  auth = firebase.auth();
  db = firebase.firestore();
}
const SERVER_TS = () => firebase.firestore.FieldValue.serverTimestamp();

/* ---------- État ---------- */
const state = {
  user: null,    // utilisateur Firebase Auth
  me: null,      // profil joueur (doc players/{uid})
  teams: [],     // cache équipes
  players: [],   // cache joueurs
  pints: [],     // cache pintes (toutes, pour stats + fil)
  unsub: [],     // désabonnements onSnapshot
  teamMode: 'join',     // inscription : 'join' | 'create'
  editTeamMode: 'join', // édition profil : 'join' | 'create'
  signingUp: false,     // inscription en cours (évite une race sur le profil)
  currentCity: null,    // ville choisie au moment de poster { name, cp, lat, lng }
  map: null,            // instance Leaflet
  mapLayer: null,       // calque des marqueurs
};

/* Réactions disponibles (cartons + smileys) */
const REACTIONS = ['🟨', '🟥', '😂', '🔥', '🍺', '🤮'];

/* ---------- Helpers UI ---------- */
const COLORS = ['#F5A623','#E8503A','#7FB800','#FFD23F','#2EC4F1','#B36AE2','#FF7AB6','#00C2A8'];
const colorFor = (str) => COLORS[[...(str||'?')].reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];
const initials = (p, n) => ((p||'?')[0] + (n||'')[0]).toUpperCase();
function avatarUrlOf(playerId) {
  if (state.me && state.me.id === playerId && state.me.avatarUrl) return state.me.avatarUrl;
  const pl = state.players.find(p => p.id === playerId);
  return (pl && pl.avatarUrl) || null;
}
const avatarInner = (playerId, prenom, nom) => {
  const url = avatarUrlOf(playerId);
  return url ? `<img src="${url}" alt="">` : initials(prenom, nom);
};
const litres   = (cl) => (Number(cl||0) / 100);
const fmtL     = (cl) => litres(cl).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const millis   = (ts) => ts && typeof ts.toMillis === 'function' ? ts.toMillis() : (ts ? +new Date(ts) : 0);

function timeAgo(ts) {
  const t = millis(ts); if (!t) return 'à l’instant';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60)    return "à l'instant";
  if (s < 3600)  return `il y a ${Math.floor(s/60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s/3600)} h`;
  return `il y a ${Math.floor(s/86400)} j`;
}

/* ---------- Saison mensuelle + décompte ---------- */
function seasonKeyOf(ts) {
  const d = new Date(millis(ts) || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const currentSeasonKey = () => seasonKeyOf(Date.now());
const inCurrentSeason  = (p) => seasonKeyOf(p.createdAt) === currentSeasonKey();
const seasonLabel = () => new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
function nextResetDate() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0); }

function updateCountdowns() {
  let diff = Math.max(0, nextResetDate().getTime() - Date.now());
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);    diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  const txt = `${d}j ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  const big = $('#countdownBig'); if (big) big.textContent = txt;
  const hero = $('#countdownHero'); if (hero) hero.textContent = txt;
  const sh = $('#seasonHero');  if (sh) sh.textContent = seasonLabel();
  const ss = $('#seasonStats'); if (ss) ss.textContent = seasonLabel();
}

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  $('#toastWrap').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => t.remove(), 3000);
}

function openOverlay(id)  { $(id).classList.add('open'); }
function closeOverlay(id) { $(id).classList.remove('open'); }
$$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('.overlay').classList.remove('open')));
$$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }));

function showView(name) {
  $('#viewPublic').classList.toggle('hidden',  name !== 'public');
  $('#viewFeed').classList.toggle('hidden',    name !== 'feed');
  $('#viewProfile').classList.toggle('hidden', name !== 'profile');
  $('#viewStats').classList.toggle('hidden',   name !== 'stats');
  $('#viewMap').classList.toggle('hidden',     name !== 'map');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ============================================================
 * DÉMARRAGE
 * ============================================================ */
function boot() {
  wireEvents();

  if (!configured || !auth) {
    toast('⚙️ Configurez assets/config.js avec votre projet Firebase', 'ko');
    showView('public');
    return;
  }

  subscribeData();  // temps réel : équipes, joueurs, pintes
  updateCountdowns();
  setInterval(updateCountdowns, 1000);

  auth.onAuthStateChanged(async (user) => {
    state.user = user;
    if (user) {
      await ensureProfile();
      $('#loginBtn').classList.add('hidden');
      $('#meBtn').classList.remove('hidden');
      $('#fab').classList.remove('hidden');
      applyMeToUI();
      showView('feed');
      renderFeed();
    } else {
      state.me = null;
      $('#loginBtn').classList.remove('hidden');
      $('#meBtn').classList.add('hidden');
      $('#fab').classList.add('hidden');
      showView('public');
    }
  });
}

/* Reflète le profil connecté dans la barre (avatar) */
function applyMeToUI() {
  const has = !!state.me;
  const av = has && state.me.avatarUrl;
  $('#meBtn').innerHTML = av ? `<img src="${av}" alt="">` : (has ? initials(state.me.prenom, state.me.nom) : '🙂');
  $('#meBtn').style.background = av ? '#000'
    : (has ? `linear-gradient(135deg, ${colorFor(state.me.id)}, var(--pop))` : '');
}

/* ============================================================
 * TEMPS RÉEL : équipes, joueurs, pintes
 * ============================================================ */
function subscribeData() {
  state.unsub.push(
    db.collection('teams').orderBy('name').onSnapshot((snap) => {
      state.teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fillTeamSelect();
      refreshDynamic();
    }, console.error)
  );
  state.unsub.push(
    db.collection('players').onSnapshot((snap) => {
      state.players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      refreshDynamic();
    }, console.error)
  );
  state.unsub.push(
    db.collection('pints').orderBy('createdAt', 'desc').limit(300).onSnapshot((snap) => {
      const before = state.pints.length;
      state.pints = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      refreshDynamic();
      // notif d'une nouvelle pinte d'un autre joueur
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added' && before > 0) {
          const p = ch.doc.data();
          if (state.me && p.playerId !== state.me.id) toast(`🍺 ${p.prenom} vient de poster une pinte !`);
        }
      });
    }, console.error)
  );
}

/* Rafraîchit toutes les vues dépendant des données (temps réel) */
function refreshDynamic() {
  renderStats();
  if (!$('#viewStats').classList.contains('hidden')) renderStatsView();
  if (!$('#viewMap').classList.contains('hidden') && state.map) renderMapAll();
  if (state.user && !$('#viewFeed').classList.contains('hidden')) renderFeed();
  if (!$('#viewProfile').classList.contains('hidden') && state.viewingProfile) openProfile(state.viewingProfile);
}

function fillTeamSelect() {
  const sel = $('#teamSelect'); if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = state.teams.length
    ? state.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')
    : '';
  if (cur && state.teams.some(t => t.id === cur)) sel.value = cur;
  refreshTeamMode();
}

/* Bascule Rejoindre / Créer une équipe */
function setTeamMode(mode) {
  state.teamMode = mode;
  $$('#teamMode .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#joinTeamField').classList.toggle('hidden', mode !== 'join');
  $('#newTeamField').classList.toggle('hidden', mode !== 'create');
}

/* S'assure que le mode choisi reste cohérent avec les équipes existantes */
function refreshTeamMode() {
  const hasTeams = state.teams.length > 0;
  const joinBtn = $('#teamMode .seg-btn[data-mode="join"]');
  const hint = $('#noTeamHint');
  if (joinBtn) joinBtn.disabled = !hasTeams;
  if (hint) hint.textContent = hasTeams ? '' : 'Aucune équipe pour l’instant — crée la première !';
  // Sans équipe existante : on force la création
  if (!hasTeams) setTeamMode('create');
  else if (!state.teamMode) setTeamMode('join');
  else setTeamMode(state.teamMode);
}

/* ---------- Éditeur d'équipe (profil) ---------- */
function setEditTeamMode(mode) {
  state.editTeamMode = mode;
  $$('#editTeamMode .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#editJoinField').classList.toggle('hidden', mode !== 'join');
  $('#editNewTeamField').classList.toggle('hidden', mode !== 'create');
}
function openTeamEditor() {
  const sel = $('#editTeamSelect');
  const hasTeams = state.teams.length > 0;
  sel.innerHTML = state.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  if (state.me && state.me.teamId) sel.value = state.me.teamId;
  $('#editTeamMode .seg-btn[data-mode="join"]').disabled = !hasTeams;
  $('#editNoTeamHint').textContent = hasTeams ? '' : 'Aucune autre équipe — crée la tienne !';
  $('#editNewTeamInput').value = '';
  $('#editTeamErr').textContent = '';
  setEditTeamMode(hasTeams ? 'join' : 'create');
  openOverlay('#teamOverlay');
}

/* Applique un changement d'équipe : profil + toutes ses pintes (dénormalisées) */
async function changeTeam(team) {
  const uid = state.me.id;
  await db.collection('players').doc(uid).update({
    teamId: team.id, teamName: team.name, teamColor: team.color,
  });
  state.me.teamId = team.id; state.me.teamName = team.name; state.me.teamColor = team.color;

  // Met à jour ses pintes existantes pour rester cohérent (max 300 en cache)
  const mine = state.pints.filter(p => p.playerId === uid);
  if (mine.length) {
    const batch = db.batch();
    mine.forEach(p => batch.update(db.collection('pints').doc(p.id),
      { teamId: team.id, teamName: team.name, teamColor: team.color }));
    await batch.commit();
  }
  applyMeToUI();
}

$('#saveTeamBtn').addEventListener('click', async () => {
  const btn = $('#saveTeamBtn'); const err = $('#editTeamErr'); err.textContent = '';
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    let team;
    if (state.editTeamMode === 'create' || state.teams.length === 0) {
      const name = $('#editNewTeamInput').value.trim();
      if (!name) throw new Error("Donne un nom à l'équipe.");
      const existing = state.teams.find(t => (t.name || '').toLowerCase() === name.toLowerCase());
      if (existing) team = existing;
      else {
        const color = colorFor(name);
        const ref = await db.collection('teams').add({ name, color, createdAt: SERVER_TS() });
        team = { id: ref.id, name, color };
      }
    } else {
      const chosen = $('#editTeamSelect').value;
      team = state.teams.find(t => t.id === chosen);
      if (!team) throw new Error('Choisis une équipe.');
    }
    await changeTeam(team);
    toast(`🚩 Tu joues maintenant pour « ${team.name} »`, 'ok');
    closeOverlay('#teamOverlay');
    if (state.viewingProfile) openProfile(state.viewingProfile);
  } catch (e) {
    err.textContent = prettyErr(e);
  } finally {
    btn.disabled = false; btn.textContent = 'Enregistrer';
  }
});

/* ============================================================
 * STATISTIQUES (calculées côté client)
 * ============================================================ */
function verified(p) { return p.status !== 'rejected'; }  // rejeté = ne compte pas

/* seasonOnly=true → uniquement les pintes du mois en cours (compétition) */
function computeStats(seasonOnly = true) {
  const pts = state.pints.filter(p => verified(p) && (!seasonOnly || inCurrentSeason(p)));
  const totalVol = pts.reduce((a, p) => a + (p.volumeCl || 0), 0);

  // équipes
  const teamMap = new Map();
  state.teams.forEach(t => teamMap.set(t.id, { ...t, pintes: 0, volume: 0, joueurs: 0 }));
  state.players.forEach(pl => { const t = teamMap.get(pl.teamId); if (t) t.joueurs++; });
  pts.forEach(p => { const t = teamMap.get(p.teamId); if (t) { t.pintes++; t.volume += (p.volumeCl||0); } });
  const teams = [...teamMap.values()].sort((a,b) => b.pintes - a.pintes || b.volume - a.volume);

  // joueurs
  const plMap = new Map();
  state.players.forEach(pl => plMap.set(pl.id, { ...pl, pintes: 0, volume: 0 }));
  pts.forEach(p => {
    let e = plMap.get(p.playerId);
    if (!e) { e = { id: p.playerId, prenom: p.prenom, nom: p.nom, teamId: p.teamId, teamName: p.teamName, teamColor: p.teamColor, pintes: 0, volume: 0 }; plMap.set(p.playerId, e); }
    e.pintes++; e.volume += (p.volumeCl||0);
  });
  const players = [...plMap.values()].sort((a,b) => b.pintes - a.pintes || b.volume - a.volume);

  return {
    totalPintes: pts.length, totalVol,
    totalJoueurs: state.players.length, totalEquipes: state.teams.length,
    teams, players,
  };
}

function teamRowHtml(t, i) {
  return `
    <div class="board-row ${i<3?'top'+(i+1):''}">
      <div class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)}</div>
      <span class="dot" style="background:${t.color||'#F5A623'}"></span>
      <div class="name">${escapeHtml(t.name)}
        <div class="sub">${t.joueurs} joueur${t.joueurs>1?'s':''} · ${fmtL(t.volume)} L</div>
      </div>
      <div class="val">${t.pintes} <small>🍺</small></div>
    </div>`;
}
function playerRowHtml(p, i) {
  return `
    <div class="board-row ${i<3?'top'+(i+1):''}">
      <div class="rank">${i+1}</div>
      <span class="dot" style="background:${p.teamColor||colorFor(p.id)}"></span>
      <div class="name">${escapeHtml(p.prenom)} ${escapeHtml((p.nom||'')[0]||'')}.
        <div class="sub">${escapeHtml(p.teamName||'Sans équipe')}</div>
      </div>
      <div class="val">${p.pintes} <small>🍺</small></div>
    </div>`;
}
const EMPTY_TEAMS   = `<div class="empty"><div class="big">🚩</div>Aucune équipe ce mois-ci.<br>Lance la compét' !</div>`;
const EMPTY_PLAYERS = `<div class="empty"><div class="big">🍺</div>La première pinte du mois n'attend que toi !</div>`;

/* Vue publique (déconnecté) */
function renderStats() {
  if (!state.teams.length && !state.players.length && !state.pints.length) return;
  const s = computeStats(true);

  $('#stPintes').textContent  = s.totalPintes.toLocaleString('fr-FR');
  $('#stJoueurs').textContent = s.totalJoueurs.toLocaleString('fr-FR');
  $('#stEquipes').textContent = s.totalEquipes.toLocaleString('fr-FR');
  $('#stLitres').textContent  = fmtL(s.totalVol);

  const teams = s.teams.slice(0, 10);
  $('#teamCount').textContent = teams.length ? `${teams.length} équipes` : '';
  $('#teamBoard').innerHTML = teams.length ? teams.map(teamRowHtml).join('') : EMPTY_TEAMS;

  const players = s.players.filter(p => p.pintes > 0).slice(0, 8);
  $('#playerBoard').innerHTML = players.length ? players.map(playerRowHtml).join('') : EMPTY_PLAYERS;
}

/* Vue Statistiques (bouton 📊) — compétition du mois + mon équipe */
function renderStatsView() {
  const s = computeStats(true);

  // Total de pintes bues depuis le début (toutes saisons) + courbe
  const allTime = state.pints.filter(verified);
  $('#statTotalPintes').textContent = allTime.length.toLocaleString('fr-FR');
  $('#pintChart').innerHTML = chartSvg(cumulativeByDay(allTime));

  const teams = s.teams.slice(0, 20);
  $('#statTeamBoard').innerHTML = teams.length ? teams.map(teamRowHtml).join('') : EMPTY_TEAMS;

  // Détail de mon équipe (classement interne des coéquipiers)
  const myTeamId = state.me && state.me.teamId;
  if (myTeamId) {
    $('#myTeamBlock').classList.remove('hidden');
    $('#myTeamName').textContent = state.me.teamName || '—';
    const mates = s.players
      .filter(p => p.teamId === myTeamId)
      .sort((a, b) => b.pintes - a.pintes || b.volume - a.volume);
    $('#myTeamBoard').innerHTML = mates.length
      ? mates.map(playerRowHtml).join('')
      : `<div class="empty">Personne n'a encore posté dans ton équipe. À toi de lancer ! 🍺</div>`;
  } else {
    $('#myTeamBlock').classList.add('hidden');
  }

  const players = s.players.filter(p => p.pintes > 0).slice(0, 15);
  $('#statPlayerBoard').innerHTML = players.length ? players.map(playerRowHtml).join('') : EMPTY_PLAYERS;
}

function openStatsView() { showView('stats'); renderStatsView(); updateCountdowns(); }

/* Série cumulée des pintes bues par jour (toutes saisons confondues) */
function cumulativeByDay(pts) {
  if (!pts.length) return [];
  const byDay = new Map();
  let min = Infinity, max = -Infinity;
  pts.forEach(p => {
    const d = new Date(millis(p.createdAt) || Date.now());
    d.setHours(0, 0, 0, 0);
    const k = d.getTime();
    byDay.set(k, (byDay.get(k) || 0) + 1);
    if (k < min) min = k; if (k > max) max = k;
  });
  const out = []; let cum = 0;
  for (let t = min; t <= max; t += 86400000) { cum += (byDay.get(t) || 0); out.push({ t, cum }); }
  return out;
}

/* Petite courbe SVG (abscisse = date, ordonnée = pintes cumulées) */
function chartSvg(series) {
  if (!series.length) return `<div class="empty">Pas encore de pinte à afficher 📈</div>`;
  const W = 560, H = 150, pad = { l: 10, r: 12, t: 14, b: 24 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const minX = series[0].t, maxX = series[series.length - 1].t;
  const maxY = Math.max(...series.map(s => s.cum), 1);
  const X = t => pad.l + (maxX === minX ? iw / 2 : (t - minX) / (maxX - minX) * iw);
  const Y = v => pad.t + ih - (v / maxY) * ih;
  const fmtD = t => { const d = new Date(t); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };

  const pts = series.map(s => `${X(s.t).toFixed(1)},${Y(s.cum).toFixed(1)}`);
  const line = 'M' + pts.join(' L');
  const baseY = pad.t + ih;
  const area = `M${X(minX).toFixed(1)},${baseY} L` + pts.join(' L') + ` L${X(maxX).toFixed(1)},${baseY} Z`;
  const last = series[series.length - 1];

  // libellés d'axe X : début, milieu, fin (sans doublon)
  const idxs = [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])];
  const xLabels = idxs.map(i => {
    const s = series[i];
    const anchor = i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle';
    return `<text class="lbl" x="${X(s.t).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}">${fmtD(s.t)}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution des pintes bues">
    <defs>
      <linearGradient id="ppFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="#F5A623" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="#F5A623" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line class="grid" x1="${pad.l}" y1="${baseY}" x2="${W - pad.r}" y2="${baseY}"/>
    <text class="lbl" x="${pad.l}" y="${pad.t - 2}" text-anchor="start">${maxY} 🍺</text>
    <path d="${area}" fill="url(#ppFill)"/>
    <path class="area-line" d="${line}"/>
    <circle class="dot" cx="${X(last.t).toFixed(1)}" cy="${Y(last.cum).toFixed(1)}" r="4.5"/>
    <text class="dot-lbl" x="${(X(last.t) - 6).toFixed(1)}" y="${(Y(last.cum) - 8).toFixed(1)}" text-anchor="end">${last.cum}</text>
    ${xLabels}
  </svg>`;
}

/* ============================================================
 * CARTE DES PINTES (Leaflet + OpenStreetMap)
 * ============================================================ */
function openMapView() {
  showView('map');
  if (!window.L) { $('#map').innerHTML = `<div class="empty">Carte indisponible (hors-ligne).</div>`; return; }
  if (!state.map) {
    state.map = L.map('map', { scrollWheelZoom: true, attributionControl: true })
      .setView([46.6, 2.4], 6);  // centré sur la France
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(state.map);
    state.mapLayer = L.layerGroup().addTo(state.map);
  }
  setTimeout(async () => {
    state.map.invalidateSize();
    await ensureDepGeo();
    renderMapAll();
  }, 60);
}

function renderMapAll() { renderDepartments(); renderMarkers(); }

/* Regroupe les pintes par ville (coordonnées) et pose un marqueur par ville */
function renderMarkers() {
  if (!state.map || !state.mapLayer) return;
  state.mapLayer.clearLayers();

  const withGeo = state.pints.filter(p => verified(p) && typeof p.lat === 'number' && typeof p.lng === 'number');
  $('#mapCount').textContent = withGeo.length ? `${withGeo.length} pinte${withGeo.length>1?'s':''}` : '';

  // groupement par ville (clé lat,lng arrondie)
  const groups = new Map();
  withGeo.forEach(p => {
    const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    if (!groups.has(key)) groups.set(key, { lat: p.lat, lng: p.lng, city: p.city || p.lieu || 'Ville', pints: [] });
    groups.get(key).pints.push(p);
  });
  if (!groups.size) return;

  const bounds = [];
  groups.forEach(g => {
    const n = g.pints.length;
    const size = Math.min(52, 24 + n * 4);
    const icon = L.divIcon({
      className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
      html: `<div class="pin" style="width:${size}px;height:${size}px;background:${teamColorMix(g.pints)}">${n}</div>`,
    });
    const recent = [...g.pints].sort((a,b) => millis(b.createdAt) - millis(a.createdAt)).slice(0, 6);
    const rows = recent.map(p => `
      <div class="row">
        <span class="dot" style="background:${p.teamColor||colorFor(p.playerId||'?')}"></span>
        <span><b style="color:var(--txt);font-size:.9rem">${escapeHtml(p.prenom||'Joueur')} ${escapeHtml((p.nom||'')[0]||'')}.</b>
        ${p.lieu ? `<span class="muted"> · ${escapeHtml(p.lieu)}</span>` : ''}
        <span class="muted"> · ${timeAgo(p.createdAt)}</span></span>
      </div>`).join('');
    const more = n > recent.length ? `<div class="muted" style="margin-top:6px">+ ${n - recent.length} autre(s)…</div>` : '';
    L.marker([g.lat, g.lng], { icon })
      .bindPopup(`<div class="map-pop"><b>🍺 ${escapeHtml(g.city)}</b> — ${n} pinte${n>1?'s':''}${rows}${more}</div>`)
      .addTo(state.mapLayer);
    bounds.push([g.lat, g.lng]);
  });
  if (bounds.length > 1) state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  else state.map.setView(bounds[0], 11);
}

/* Couleur d'un marqueur : l'équipe majoritaire sur ce lieu */
function teamColorMix(pints) {
  const c = {};
  pints.forEach(p => { const k = p.teamColor || '#F5A623'; c[k] = (c[k]||0) + 1; });
  return Object.entries(c).sort((a,b) => b[1]-a[1])[0][0];
}

/* ---------- Localisation par GPS (non déclaratif) ---------- */
async function requestGeo() {
  const hint = $('#cityChosen'), btn = $('#geoBtn');
  if (!navigator.geolocation) { hint.className = 'hint geo-ko'; hint.textContent = '📍 Géolocalisation non supportée par ton navigateur.'; return; }
  btn.disabled = true; btn.textContent = '📍 Localisation en cours…'; hint.className = 'hint'; hint.textContent = '';
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    const loc = await reverseGeocode(lat, lng);
    if (!loc) {
      hint.className = 'hint geo-ko'; hint.textContent = 'Impossible de déterminer ta commune (hors France ?).';
      btn.disabled = false; btn.textContent = '📍 Réessayer'; return;
    }
    state.currentCity = { name: loc.city, cp: loc.cp, dep: loc.dep, depName: loc.depName, lat, lng };
    if ($('#citySelect')) $('#citySelect').value = '';
    hint.className = 'hint geo-ok';
    hint.innerHTML = `✅ ${escapeHtml(loc.city)} <span class="muted">(dép. ${escapeHtml(loc.dep)})</span> — position confirmée`;
    btn.disabled = false; btn.textContent = '📍 Position confirmée ✓';
  }, (err) => {
    hint.className = 'hint geo-ko';
    hint.textContent = err.code === 1
      ? 'Autorise la localisation : elle est obligatoire pour valider ta pinte.'
      : 'Position indisponible, réessaie.';
    btn.disabled = false; btn.textContent = '📍 Partager ma position';
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

/* Saisie manuelle de la ville (secours si le GPS échoue) — toutes les communes */
let cityTimer = null;
function setupCityAutocomplete() {
  const input = $('#cityInput'), box = $('#citySuggest');
  if (!input) return;
  input.addEventListener('input', () => {
    state.currentCity = null;
    const q = input.value.trim();
    clearTimeout(cityTimer);
    if (q.length < 2) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    cityTimer = setTimeout(() => fetchCities(q), 250);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#cityInput') && !e.target.closest('#citySuggest')) box.classList.add('hidden');
  });
}
async function fetchCities(q) {
  const box = $('#citySuggest');
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=6`);
    const data = await res.json();
    const feats = data.features || [];
    if (!feats.length) { box.innerHTML = `<button disabled>Aucune ville trouvée</button>`; box.classList.remove('hidden'); return; }
    box.innerHTML = feats.map(f => {
      const p = f.properties, [lng, lat] = f.geometry.coordinates;
      const ctx = (p.context || '').split(',').map(s => s.trim());
      return `<button type="button" data-lat="${lat}" data-lng="${lng}"
        data-name="${escapeHtml(p.city || p.name)}" data-cp="${escapeHtml(p.postcode||'')}"
        data-dep="${escapeHtml(ctx[0]||'')}" data-depname="${escapeHtml(ctx[1]||'')}">
        ${escapeHtml(p.city || p.name)} <small>${escapeHtml(p.postcode||'')} · ${escapeHtml(p.context||'')}</small></button>`;
    }).join('');
    box.classList.remove('hidden');
    $$('#citySuggest button[data-name]').forEach(btn => btn.addEventListener('click', () => {
      state.currentCity = { name: btn.dataset.name, cp: btn.dataset.cp, dep: btn.dataset.dep,
                            depName: btn.dataset.depname, lat: parseFloat(btn.dataset.lat), lng: parseFloat(btn.dataset.lng) };
      $('#cityInput').value = btn.dataset.name;
      if ($('#citySelect')) $('#citySelect').value = '';
      $('#cityChosen').className = 'hint geo-ok';
      $('#cityChosen').innerHTML = `✅ ${escapeHtml(btn.dataset.name)} <span class="muted">(dép. ${escapeHtml(btn.dataset.dep)})</span> — saisie manuelle`;
      box.classList.add('hidden');
    }));
  } catch (e) {
    box.innerHTML = `<button disabled>Recherche indisponible</button>`; box.classList.remove('hidden');
  }
}

/* Menu déroulant de villes (secours 100% hors-ligne, aucune requête) */
function fillCitySelect() {
  const sel = $('#citySelect'); if (!sel || !window.PP_CITIES) return;
  const list = [...window.PP_CITIES].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  sel.innerHTML = `<option value="">— Choisir une ville —</option>` +
    list.map((c, i) => `<option value="${window.PP_CITIES.indexOf(c)}">${escapeHtml(c.name)} (${escapeHtml(c.dep)})</option>`).join('');
  sel.addEventListener('change', () => {
    const c = window.PP_CITIES[parseInt(sel.value, 10)];
    if (!c) { state.currentCity = null; $('#cityChosen').textContent = ''; $('#cityChosen').className = 'hint'; return; }
    state.currentCity = { name: c.name, cp: '', dep: c.dep, depName: '', lat: c.lat, lng: c.lng };
    // reset GPS visuel
    const gb = $('#geoBtn'); gb.textContent = '📍 Partager ma position (GPS)';
    $('#cityChosen').className = 'hint geo-ok';
    $('#cityChosen').innerHTML = `✅ ${escapeHtml(c.name)} <span class="muted">(dép. ${escapeHtml(c.dep)})</span> — choisie dans la liste`;
  });
}

/* Reverse-geocoding GPS → commune + département (API gouv, gratuit) */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}&type=municipality`);
    const data = await res.json();
    const f = data.features && data.features[0];
    if (!f) return null;
    const p = f.properties;
    const ctx = (p.context || '').split(',').map(s => s.trim()); // ["75","Paris","Île-de-France"]
    const dep = ctx[0] || (p.citycode || '').slice(0, 2);
    return { city: p.city || p.name, cp: p.postcode || '', dep, depName: ctx[1] || '' };
  } catch { return null; }
}

/* ---------- Départements conquis ---------- */
function conqueredDepsOf(playerId) {
  const set = new Set();
  state.pints.forEach(p => { if (p.playerId === playerId && verified(p) && p.dep) set.add(String(p.dep)); });
  return set;
}
function updateConquestStat(conquered) {
  const total = state.depGeo ? state.depGeo.features.length : 101;
  const n = conquered.size;
  const pct = total ? Math.round(n / total * 100) : 0;
  if ($('#depPct'))   $('#depPct').textContent = pct + '%';
  if ($('#depBar'))   $('#depBar').style.width = pct + '%';
  if ($('#depCount')) $('#depCount').textContent = n;
}

/* Charge (une fois) le contour des départements français */
async function ensureDepGeo() {
  if (state.depGeo || !window.L) return;
  try {
    const res = await fetch('https://france-geojson.gregoiredavid.fr/repo/departements-version-simplifiee.geojson');
    state.depGeo = await res.json();
  } catch { state.depGeo = null; }
}

/* Colore les départements : jaune = conquis par le joueur connecté */
function renderDepartments() {
  if (!state.map || !state.depGeo) return;
  const conquered = state.me ? conqueredDepsOf(state.me.id) : new Set();
  if (state.depLayer) { state.depLayer.remove(); state.depLayer = null; }
  state.depLayer = L.geoJSON(state.depGeo, {
    style: (feat) => {
      const won = conquered.has(String(feat.properties.code));
      return { color: won ? '#FFD23F' : 'rgba(255,244,214,0.22)', weight: won ? 1.6 : 0.5,
               fillColor: won ? '#FFD23F' : '#ffffff', fillOpacity: won ? 0.42 : 0.03 };
    },
    onEachFeature: (feat, layer) => {
      const won = conquered.has(String(feat.properties.code));
      layer.bindPopup(`<div class="map-pop"><b>${escapeHtml(feat.properties.nom)} (${feat.properties.code})</b><br>${won ? '🏴 Conquis !' : 'À conquérir 👀'}</div>`);
    },
  }).addTo(state.map);
  state.depLayer.bringToBack();
  updateConquestStat(conquered);
}

/* ============================================================
 * PROFIL (auth)
 * ============================================================ */
async function ensureProfile() {
  const uid = state.user.uid;
  const ref = db.collection('players').doc(uid);
  const doc = await ref.get();
  if (doc.exists) { state.me = { id: uid, ...doc.data() }; return; }

  // Inscription en cours : c'est le formulaire qui créera le profil (avec l'équipe).
  // On n'écrit surtout PAS ici pour ne pas écraser l'équipe (race condition).
  if (state.signingUp) return;

  // Profil manquant (ex : email confirmé plus tard) : reconstruction minimale.
  const dn = (state.user.displayName || '').split('|');
  const row = { prenom: dn[0] || 'Joueur', nom: dn[1] || '', email: state.user.email,
                teamId: null, teamName: null, teamColor: null, createdAt: SERVER_TS() };
  await ref.set(row, { merge: true });
  state.me = { id: uid, ...row };
}

/* --- Inscription --- */
$('#signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const errEl = $('#signupErr'); errEl.textContent = '';
  const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Création…';
  state.signingUp = true;
  try {
    const prenom = f.prenom.value.trim();
    const nom    = f.nom.value.trim();
    const email  = f.email.value.trim();
    const pwd    = f.password.value;

    // 1) Compte Auth
    const cred = await auth.createUserWithEmailAndPassword(email, pwd);
    const uid = cred.user.uid;
    await cred.user.updateProfile({ displayName: `${prenom}|${nom}` });

    // 2) Équipe : rejoindre une existante ou en créer une
    let team = null;
    if (state.teamMode === 'create' || state.teams.length === 0) {
      const name = $('#newTeamInput').value.trim();
      if (!name) throw new Error("Donne un nom à ta nouvelle équipe.");
      // Réutilise une équipe du même nom si elle existe déjà (évite les doublons)
      const existing = state.teams.find(t => (t.name||'').toLowerCase() === name.toLowerCase());
      if (existing) {
        team = existing;
      } else {
        const color = colorFor(name);
        const ref = await db.collection('teams').add({ name, color, createdAt: SERVER_TS() });
        team = { id: ref.id, name, color };
      }
    } else {
      const chosen = f.team.value;
      if (!chosen) throw new Error("Choisis une équipe à rejoindre (ou crée la tienne).");
      team = state.teams.find(t => t.id === chosen) || null;
      if (!team) throw new Error("Équipe introuvable, réessaie.");
    }

    // 3) Profil joueur (avec l'équipe)
    const profile = {
      prenom, nom, email,
      teamId:    team ? team.id : null,
      teamName:  team ? team.name : null,
      teamColor: team ? team.color : null,
      createdAt: SERVER_TS(),
    };
    await db.collection('players').doc(uid).set(profile);

    // On fixe le profil localement tout de suite (évite la race avec onAuthStateChanged)
    state.me = { id: uid, ...profile };
    applyMeToUI();

    toast('🍻 Bienvenue dans la compét’ !', 'ok');
    closeOverlay('#authOverlay');
  } catch (err) {
    errEl.textContent = prettyErr(err);
  } finally {
    state.signingUp = false;
    btn.disabled = false; btn.textContent = '🍻 Créer mon compte';
  }
});

/* --- Connexion --- */
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const errEl = $('#loginErr'); errEl.textContent = '';
  const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    await auth.signInWithEmailAndPassword(f.email.value.trim(), f.password.value);
    closeOverlay('#authOverlay');
  } catch (err) {
    errEl.textContent = prettyErr(err);
  } finally {
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
});

function prettyErr(err) {
  const code = (err && err.code) || '';
  const m = (err && err.message) || String(err);
  if (code === 'auth/email-already-in-use') return 'Cet email est déjà inscrit. Connecte-toi !';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found')
    return 'Email ou mot de passe incorrect.';
  if (code === 'auth/weak-password')  return 'Mot de passe : 6 caractères minimum.';
  if (code === 'auth/invalid-email')  return 'Email invalide.';
  return m;
}

/* ============================================================
 * LE FIL
 * ============================================================ */
function renderFeed() {
  const feed = $('#feed');
  const list = state.pints.filter(p => p.status !== 'rejected').slice(0, 50);
  if (!list.length) {
    feed.innerHTML = `<div class="empty"><div class="big">🍺</div>Aucune pinte encore.<br>Sois le premier à dégainer ta photo !</div>`;
    return;
  }
  feed.innerHTML = list.map(postHtml).join('');
  bindPostAvatars(feed);
}

function postHtml(p) {
  const teamName  = p.teamName  || 'Sans équipe';
  const teamColor = p.teamColor || colorFor(p.playerId || '?');
  const statusTxt = { verified: '✅ Validée', pending: '🍺 Postée', rejected: '❌ Refusée' }[p.status] || '🍺 Postée';
  return `
    <article class="post">
      <div class="post-head">
        <div class="pa" data-player="${p.playerId||''}" style="background:${colorFor(p.playerId||'?')}">${avatarInner(p.playerId, p.prenom, p.nom)}</div>
        <div class="who" data-player="${p.playerId||''}">
          <b>${escapeHtml(p.prenom||'Joueur')} ${escapeHtml((p.nom||'')[0]||'')}.</b>
          <span><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${teamColor};display:inline-block"></span> ${escapeHtml(teamName)}</span>
        </div>
        <div class="when">${timeAgo(p.createdAt)}</div>
      </div>
      <img class="post-photo" loading="lazy" src="${p.photoUrl}" alt="Pinte de ${escapeHtml(p.prenom||'')}">
      <div class="post-foot">
        <span class="pill vol">🍺 ${p.volumeCl} cl</span>
        ${p.lieu ? `<span class="pill loc">📍 ${escapeHtml(p.lieu)}</span>` : ''}
        <span class="pill team" style="background:${teamColor}">🚩 ${escapeHtml(teamName)}</span>
        <span class="badge-status ${p.status||'pending'}">${statusTxt}</span>
      </div>
      ${reactionsHtml(p)}
    </article>`;
}

/* Barre de réactions (cartons + smileys) */
function reactionsHtml(p) {
  const r = p.reactions || {};
  const uid = state.me && state.me.id;
  return `<div class="reactions">` + REACTIONS.map(em => {
    const arr = r[em] || [];
    const mine = uid && arr.includes(uid);
    return `<button class="react-btn ${mine?'mine':''}" data-react="${em}" data-pint="${p.id}">${em}${arr.length ? `<span class="cnt">${arr.length}</span>` : ''}</button>`;
  }).join('') + `</div>`;
}

/* Ajoute/retire ma réaction sur une pinte */
async function toggleReaction(pintId, emoji) {
  if (!state.user) { toast('Connecte-toi pour réagir 🍻'); return; }
  const uid = state.user.uid;
  const p = state.pints.find(x => x.id === pintId); if (!p) return;
  const mine = ((p.reactions && p.reactions[emoji]) || []).includes(uid);
  const fp = new firebase.firestore.FieldPath('reactions', emoji);
  const val = mine
    ? firebase.firestore.FieldValue.arrayRemove(uid)
    : firebase.firestore.FieldValue.arrayUnion(uid);
  try {
    await db.collection('pints').doc(pintId).update(fp, val);
  } catch (e) { console.error(e); toast('Réaction impossible', 'ko'); }
}

function bindPostAvatars(root) {
  $$('[data-player]', root).forEach(el => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', () => { const id = el.dataset.player; if (id) openPreview(id); });
  });
}

/* Mini-fenêtre d'aperçu des stats d'un joueur (depuis le fil) */
function openPreview(playerId) {
  const s = computeStats(true);
  const idx = s.players.findIndex(x => x.id === playerId);
  const p = idx >= 0 ? s.players[idx]
          : (state.players.find(x => x.id === playerId) || { id: playerId, prenom: '?', nom: '', pintes: 0, volume: 0 });
  const av = avatarUrlOf(playerId);
  $('#pvAvatar').style.background = av ? '#000' : `linear-gradient(135deg, ${p.teamColor||colorFor(p.id)}, var(--pop))`;
  $('#pvAvatar').innerHTML = av ? `<img src="${av}" alt="">` : initials(p.prenom, p.nom);
  $('#pvName').textContent = `${p.prenom} ${p.nom||''}`.trim();
  $('#pvTeam').textContent = `🚩 ${p.teamName || 'Sans équipe'}`;
  $('#pvTeam').style.background = p.teamColor || 'var(--biere)';
  $('#pvPintes').textContent = p.pintes || 0;
  $('#pvLitres').textContent = fmtL(p.volume);
  $('#pvDeps').textContent = conqueredDepsOf(playerId).size;
  $('#pvFull').onclick = () => { closeOverlay('#previewOverlay'); openProfile(playerId); };
  openOverlay('#previewOverlay');
}

/* ============================================================
 * PROFIL D'UN JOUEUR
 * ============================================================ */
function openProfile(playerId) {
  showView('profile');
  state.viewingProfile = playerId;
  const s = computeStats(true);
  const idx = s.players.findIndex(x => x.id === playerId);
  const p = idx >= 0 ? s.players[idx]
          : (state.players.find(x => x.id === playerId) || { id: playerId, prenom: '?', nom: '', pintes: 0, volume: 0 });
  const rank = (idx >= 0 && p.pintes > 0) ? `#${idx + 1}` : '–';

  const isMe = state.me && state.me.id === playerId;
  const av = avatarUrlOf(playerId);
  $('#pfAvatar').style.background = av ? '#000' : `linear-gradient(135deg, ${p.teamColor||colorFor(p.id)}, var(--pop))`;
  $('#pfAvatar').innerHTML = (av ? `<img src="${av}" alt="">` : initials(p.prenom, p.nom))
    + (isMe ? `<button class="pa-edit" id="pfAvatarEdit" title="Changer la photo">📷</button>` : '');
  $('#pfName').textContent = `${p.prenom} ${p.nom||''}`.trim();
  $('#pfTeam').textContent = `🚩 ${p.teamName || 'Sans équipe'}`;
  $('#pfTeam').style.background = p.teamColor || 'var(--biere)';
  $('#pfPintes').textContent = p.pintes || 0;
  $('#pfLitres').textContent = fmtL(p.volume);
  $('#pfRank').textContent   = rank;

  const deps = conqueredDepsOf(playerId).size;
  $('#pfConquest').innerHTML = `🏴 <b style="color:#FFD23F">${deps}</b> département${deps>1?'s':''} conquis`;

  $('#pfActions').innerHTML = isMe
    ? `<button class="btn btn-primary btn-block" id="changeTeamBtn" style="margin-bottom:8px">🔀 Changer d'équipe</button>
       <button class="btn btn-ghost btn-block" id="logoutBtn">Se déconnecter</button>` : '';
  if (isMe) {
    $('#pfAvatarEdit').addEventListener('click', () => $('#avatarInput').click());
    $('#changeTeamBtn').addEventListener('click', openTeamEditor);
    $('#logoutBtn').addEventListener('click', () => auth.signOut());
  }

  const pints = state.pints.filter(x => x.playerId === playerId && x.status !== 'rejected').slice(0, 30);
  $('#pfFeed').innerHTML = pints.length ? pints.map(postHtml).join('') : `<div class="empty">Pas encore de pinte 🍺</div>`;
  bindPostAvatars($('#pfFeed'));
}

/* ============================================================
 * POSTER UNE PINTE (photo + upload)
 * ============================================================ */
let currentPhoto = null;  // { blob, dataUrl }

$('#photoDrop').addEventListener('click', () => $('#photoInput').click());
$('#photoPreview').addEventListener('click', () => $('#photoInput').click());

$('#photoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    // Photo stockée en base64 dans Firestore → on vise < ~700 Ko.
    currentPhoto = await compressImage(file, 1000, 700 * 1024);
    $('#previewImg').src = currentPhoto.dataUrl;
    $('#photoDrop').classList.add('hidden');
    $('#photoPreview').classList.remove('hidden');
    await runVerification();
  } catch (err) {
    toast('Impossible de lire cette image', 'ko');
  }
});

/* Vérifie la photo (IA Gemini) et met à jour l'UI + le bouton */
async function runVerification() {
  const box = $('#verifyBox'), submit = $('#postSubmit');
  box.classList.remove('hidden', 'ok', 'ko', 'loading');
  box.classList.add('loading');
  box.innerHTML = `<span class="spin"></span> L'IA vérifie ta pinte…`;
  submit.disabled = true;

  const res = await verifyPhoto(currentPhoto.dataUrl);
  currentPhoto.verify = res;
  box.classList.remove('loading');

  if (res.status === 'rejected') {
    box.classList.add('ko');
    box.innerHTML = `❌ Refusée — ${escapeHtml(res.reason || 'ce n’est pas une pinte valide')}.<br>Reprends une photo 📷`;
    submit.disabled = true;
  } else if (res.status === 'verified') {
    box.classList.add('ok');
    box.innerHTML = `✅ Pinte validée !${res.reason ? ' ' + escapeHtml(res.reason) : ''}`;
    submit.disabled = false;
  } else {
    box.classList.add('loading');
    box.innerHTML = `⏳ Vérification IA non configurée — ta pinte partira « en attente ».`;
    submit.disabled = false;
  }
}

/* Vérification via le Cloudflare Worker (qui appelle Gemini côté serveur).
 * La clé reste secrète : le navigateur n'envoie que l'image au Worker.
 * Retour : { status: 'verified'|'rejected'|'pending', reason } */
async function verifyPhoto(dataUrl) {
  const url = CFG.VERIFY_URL;
  const configured = url && !String(url).includes('VOTRE');

  // Fausse vérification : on simule l'analyse puis on valide (si pas de vrai Worker)
  if (!configured && CFG.FAKE_VERIFY) {
    await new Promise(r => setTimeout(r, 1300));
    return { status: 'verified', reason: '' };
  }
  if (!configured) return { status: 'pending', reason: '' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!res.ok) { console.error('verify', res.status); return { status: 'pending', reason: '' }; }
    const data = await res.json();
    if (typeof data.verified === 'boolean') {
      return { status: data.verified ? 'verified' : 'rejected', reason: data.reason || '' };
    }
    return { status: 'pending', reason: data.reason || '' };  // verified=null → indisponible
  } catch (e) {
    console.error(e);
    return { status: 'pending', reason: '' };
  }
}

$('#postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#postErr'); errEl.textContent = '';
  const submit = $('#postSubmit');
  if (!currentPhoto) { errEl.textContent = 'Ajoute une photo de ta pinte.'; return; }
  const v = currentPhoto.verify || { status: 'pending', reason: '' };
  if (v.status === 'rejected') { errEl.textContent = 'Photo refusée par l’IA — reprends-en une.'; return; }
  if (!state.currentCity) { errEl.textContent = 'Choisis ta ville dans la liste.'; return; }
  const lieu = $('#lieuInput').value.trim();
  const city = state.currentCity;

  submit.disabled = true; submit.textContent = 'Envoi…';
  try {
    const uid = state.user.uid;

    await db.collection('pints').add({
      playerId:  uid,
      prenom:    state.me ? state.me.prenom : (state.user.displayName||'').split('|')[0] || 'Joueur',
      nom:       state.me ? state.me.nom : '',
      teamId:    state.me ? state.me.teamId : null,
      teamName:  state.me ? state.me.teamName : null,
      teamColor: state.me ? state.me.teamColor : null,
      photoUrl:  currentPhoto.dataUrl,   // image en base64 (stockée dans Firestore)
      lieu,
      city:      city.name,
      cp:        city.cp || null,
      dep:       city.dep || null,
      depName:   city.depName || null,
      lat:       city.lat,
      lng:       city.lng,
      volumeCl:  CFG.PINTE_CL || 50,
      status:    v.status === 'verified' ? 'verified' : 'pending',
      verifyReason: v.reason || null,
      reactions: {},
      createdAt: SERVER_TS(),
    });

    toast(v.status === 'verified' ? '🍻 Pinte validée et postée !' : '🍺 Pinte postée (en attente de validation)', 'ok');
    resetPostForm();
    closeOverlay('#postOverlay');
    showView('feed');
  } catch (err) {
    errEl.textContent = prettyErr(err);
  } finally {
    submit.disabled = false; submit.textContent = 'Poster ma pinte 🍻';
  }
});

function resetPostForm() {
  currentPhoto = null;
  state.currentCity = null;
  $('#photoInput').value = '';
  $('#previewImg').src = '';
  $('#lieuInput').value = '';
  $('#cityChosen').textContent = ''; $('#cityChosen').className = 'hint';
  const gb = $('#geoBtn'); gb.disabled = false; gb.textContent = '📍 Partager ma position (GPS)';
  $('#cityInput').value = '';
  $('#citySuggest').classList.add('hidden'); $('#citySuggest').innerHTML = '';
  $('#manualCityField').classList.add('hidden');
  if ($('#citySelect')) $('#citySelect').value = '';
  $('#photoDrop').classList.remove('hidden');
  $('#photoPreview').classList.add('hidden');
  $('#verifyBox').classList.add('hidden');
  $('#postSubmit').disabled = true;
  $('#postErr').textContent = '';
}

/* Changement de photo de profil (stockée en base64 dans le doc joueur) */
async function onAvatarPicked(e) {
  const file = e.target.files[0];
  if (!file || !state.me) return;
  try {
    const { dataUrl } = await compressImage(file, 256, 120 * 1024);
    await db.collection('players').doc(state.me.id).update({ avatarUrl: dataUrl });
    state.me.avatarUrl = dataUrl;
    applyMeToUI();
    if (state.viewingProfile === state.me.id) openProfile(state.me.id);
    toast('📸 Photo de profil mise à jour !', 'ok');
  } catch (err) {
    console.error(err); toast('Photo impossible', 'ko');
  } finally { e.target.value = ''; }
}

/* Compression via canvas → data URL JPEG, sous une taille cible (octets).
 * On réduit la qualité puis la taille jusqu'à passer sous maxBytes,
 * car la photo est stockée en base64 dans Firestore (limite 1 Mo/doc). */
function compressImage(file, maxSize, maxBytes) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let dim = Math.min(maxSize, Math.max(img.width, img.height));

      const render = (targetDim, q) => {
        const r = targetDim / Math.max(img.width, img.height);
        const w = Math.max(1, Math.round(img.width * r));
        const h = Math.max(1, Math.round(img.height * r));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        return c.toDataURL('image/jpeg', q);
      };

      let dataUrl = '';
      // 1) baisse la qualité, 2) si toujours trop lourd, réduit la dimension
      for (let pass = 0; pass < 6; pass++) {
        for (const q of [0.72, 0.6, 0.5, 0.42]) {
          dataUrl = render(dim, q);
          if (dataUrl.length <= maxBytes) return resolve({ dataUrl });
        }
        dim = Math.round(dim * 0.8);
        if (dim < 320) break;
      }
      // Dernier recours : on renvoie la plus légère obtenue
      resolve({ dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

/* ============================================================
 * ÉVÉNEMENTS UI
 * ============================================================ */
function wireEvents() {
  const showAuth = (pane) => {
    $('#paneLogin').classList.toggle('hidden',  pane !== 'login');
    $('#paneSignup').classList.toggle('hidden', pane !== 'signup');
    if (pane === 'signup') refreshTeamMode();
    openOverlay('#authOverlay');
  };
  $('#loginBtn').addEventListener('click', () => showAuth('login'));
  $('#ctaLogin').addEventListener('click', () => showAuth('login'));
  $('#ctaSignup').addEventListener('click', () => showAuth('signup'));
  $('#toSignup').addEventListener('click', () => showAuth('signup'));
  $('#toLogin').addEventListener('click',  () => showAuth('login'));

  // Bascule Rejoindre / Créer une équipe (inscription)
  $$('#teamMode .seg-btn').forEach(b =>
    b.addEventListener('click', () => { if (!b.disabled) setTeamMode(b.dataset.mode); }));
  // Bascule Rejoindre / Créer (édition d'équipe)
  $$('#editTeamMode .seg-btn').forEach(b =>
    b.addEventListener('click', () => { if (!b.disabled) setEditTeamMode(b.dataset.mode); }));

  $('#goHome').addEventListener('click', () => showView(state.user ? 'feed' : 'public'));
  $('#meBtn').addEventListener('click', () => state.me && openProfile(state.me.id));
  $('#backFromProfile').addEventListener('click', () => showView(state.user ? 'feed' : 'public'));
  $('#backFromStats').addEventListener('click', () => showView(state.user ? 'feed' : 'public'));
  $('#backFromMap').addEventListener('click', () => showView(state.user ? 'feed' : 'public'));
  $('#fabHome').addEventListener('click', () => showView('feed'));
  $('#fabStats').addEventListener('click', openStatsView);
  $('#fabMap').addEventListener('click', openMapView);
  $('#fabPost').addEventListener('click', () => { resetPostForm(); openOverlay('#postOverlay'); });

  // Localisation GPS + saisie manuelle de secours + photo de profil
  $('#geoBtn').addEventListener('click', requestGeo);
  $('#manualToggle').addEventListener('click', () => {
    $('#manualCityField').classList.toggle('hidden');
    if (!$('#manualCityField').classList.contains('hidden')) $('#cityInput').focus();
  });
  fillCitySelect();
  setupCityAutocomplete();
  $('#avatarInput').addEventListener('change', onAvatarPicked);

  // Réactions (délégation : le fil est reconstruit à chaque mise à jour)
  document.addEventListener('click', (e) => {
    const rb = e.target.closest('.react-btn');
    if (rb) toggleReaction(rb.dataset.pint, rb.dataset.react);
  });
}

/* Go 🍺 */
boot();
