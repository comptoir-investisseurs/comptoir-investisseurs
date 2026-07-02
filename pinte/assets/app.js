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
let auth = null, db = null, storage = null;
const fb = CFG.firebase || {};
const configured = fb.apiKey && !String(fb.apiKey).includes('VOTRE') &&
                   fb.projectId && !String(fb.projectId).includes('VOTRE');

if (configured && window.firebase) {
  firebase.initializeApp(fb);
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();
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
};

/* ---------- Helpers UI ---------- */
const COLORS = ['#F5A623','#E8503A','#7FB800','#FFD23F','#2EC4F1','#B36AE2','#FF7AB6','#00C2A8'];
const colorFor = (str) => COLORS[[...(str||'?')].reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];
const initials = (p, n) => ((p||'?')[0] + (n||'')[0]).toUpperCase();
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

  auth.onAuthStateChanged(async (user) => {
    state.user = user;
    if (user) {
      await ensureProfile();
      $('#loginBtn').classList.add('hidden');
      $('#meBtn').classList.remove('hidden');
      $('#fab').classList.remove('hidden');
      $('#meBtn').textContent = state.me ? initials(state.me.prenom, state.me.nom) : '🙂';
      $('#meBtn').style.background = state.me
        ? `linear-gradient(135deg, ${colorFor(state.me.id)}, var(--pop))` : '';
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

/* ============================================================
 * TEMPS RÉEL : équipes, joueurs, pintes
 * ============================================================ */
function subscribeData() {
  state.unsub.push(
    db.collection('teams').orderBy('name').onSnapshot((snap) => {
      state.teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fillTeamSelect();
      renderStats();
    }, console.error)
  );
  state.unsub.push(
    db.collection('players').onSnapshot((snap) => {
      state.players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStats();
    }, console.error)
  );
  state.unsub.push(
    db.collection('pints').orderBy('createdAt', 'desc').limit(300).onSnapshot((snap) => {
      const before = state.pints.length;
      state.pints = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStats();
      if (state.user) renderFeed();
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

function fillTeamSelect() {
  const sel = $('#teamSelect'); if (!sel) return;
  const cur = sel.value;
  sel.innerHTML =
    state.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('') +
    `<option value="__new__">➕ Créer une nouvelle équipe</option>`;
  if (cur) sel.value = cur;
}

/* ============================================================
 * STATISTIQUES (calculées côté client)
 * ============================================================ */
function verified(p) { return p.status !== 'rejected'; }  // rejeté = ne compte pas

function computeStats() {
  const pts = state.pints.filter(verified);
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
    if (!e) { e = { id: p.playerId, prenom: p.prenom, nom: p.nom, teamName: p.teamName, teamColor: p.teamColor, pintes: 0, volume: 0 }; plMap.set(p.playerId, e); }
    e.pintes++; e.volume += (p.volumeCl||0);
  });
  const players = [...plMap.values()].sort((a,b) => b.pintes - a.pintes || b.volume - a.volume);

  return {
    totalPintes: pts.length, totalVol,
    totalJoueurs: state.players.length, totalEquipes: state.teams.length,
    teams, players,
  };
}

function renderStats() {
  if (!state.teams.length && !state.players.length && !state.pints.length) return;
  const s = computeStats();

  $('#stPintes').textContent  = s.totalPintes.toLocaleString('fr-FR');
  $('#stJoueurs').textContent = s.totalJoueurs.toLocaleString('fr-FR');
  $('#stEquipes').textContent = s.totalEquipes.toLocaleString('fr-FR');
  $('#stLitres').textContent  = fmtL(s.totalVol);

  const teams = s.teams.slice(0, 10);
  $('#teamCount').textContent = teams.length ? `${teams.length} équipes` : '';
  $('#teamBoard').innerHTML = teams.length
    ? teams.map((t, i) => `
        <div class="board-row ${i<3?'top'+(i+1):''}">
          <div class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)}</div>
          <span class="dot" style="background:${t.color||'#F5A623'}"></span>
          <div class="name">${escapeHtml(t.name)}
            <div class="sub">${t.joueurs} joueur${t.joueurs>1?'s':''} · ${fmtL(t.volume)} L</div>
          </div>
          <div class="val">${t.pintes} <small>🍺</small></div>
        </div>`).join('')
    : `<div class="empty"><div class="big">🚩</div>Aucune équipe pour l'instant.<br>Sois le premier à en créer une !</div>`;

  const players = s.players.filter(p => p.pintes > 0).slice(0, 8);
  $('#playerBoard').innerHTML = players.length
    ? players.map((p, i) => `
        <div class="board-row ${i<3?'top'+(i+1):''}">
          <div class="rank">${i+1}</div>
          <span class="dot" style="background:${p.teamColor||colorFor(p.id)}"></span>
          <div class="name">${escapeHtml(p.prenom)} ${escapeHtml((p.nom||'')[0]||'')}.
            <div class="sub">${escapeHtml(p.teamName||'Sans équipe')}</div>
          </div>
          <div class="val">${p.pintes} <small>🍺</small></div>
        </div>`).join('')
    : `<div class="empty"><div class="big">🍺</div>La première pinte n'attend que toi !</div>`;
}

/* ============================================================
 * PROFIL (auth)
 * ============================================================ */
async function ensureProfile() {
  const uid = state.user.uid;
  const ref = db.collection('players').doc(uid);
  const doc = await ref.get();
  if (doc.exists) { state.me = { id: uid, ...doc.data() }; return; }

  // Profil manquant : on le reconstruit depuis le displayName si possible
  const dn = (state.user.displayName || '').split('|');
  if (dn.length >= 2) {
    const row = { prenom: dn[0], nom: dn[1], email: state.user.email, teamId: null, teamName: null, teamColor: null };
    await ref.set(row);
    state.me = { id: uid, ...row };
  }
}

/* --- Inscription --- */
$('#signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const errEl = $('#signupErr'); errEl.textContent = '';
  const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Création…';
  try {
    const prenom = f.prenom.value.trim();
    const nom    = f.nom.value.trim();
    const email  = f.email.value.trim();
    const pwd    = f.password.value;

    // 1) Compte Auth
    const cred = await auth.createUserWithEmailAndPassword(email, pwd);
    const uid = cred.user.uid;
    await cred.user.updateProfile({ displayName: `${prenom}|${nom}` });

    // 2) Équipe (existante ou nouvelle)
    let team = null;
    if (f.team.value === '__new__') {
      const name = $('#newTeamInput').value.trim();
      if (!name) throw new Error("Donne un nom à ta nouvelle équipe.");
      const color = colorFor(name);
      const ref = await db.collection('teams').add({ name, color, createdAt: SERVER_TS() });
      team = { id: ref.id, name, color };
    } else {
      team = state.teams.find(t => t.id === f.team.value) || null;
    }

    // 3) Profil joueur
    await db.collection('players').doc(uid).set({
      prenom, nom, email,
      teamId:    team ? team.id : null,
      teamName:  team ? team.name : null,
      teamColor: team ? team.color : null,
      createdAt: SERVER_TS(),
    });

    toast('🍻 Bienvenue dans la compét’ !', 'ok');
    closeOverlay('#authOverlay');
  } catch (err) {
    errEl.textContent = prettyErr(err);
  } finally {
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
        <div class="pa" data-player="${p.playerId||''}" style="background:${colorFor(p.playerId||'?')}">${initials(p.prenom, p.nom)}</div>
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
    </article>`;
}

function bindPostAvatars(root) {
  $$('[data-player]', root).forEach(el => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', () => { const id = el.dataset.player; if (id) openProfile(id); });
  });
}

/* ============================================================
 * PROFIL D'UN JOUEUR
 * ============================================================ */
function openProfile(playerId) {
  showView('profile');
  const s = computeStats();
  const idx = s.players.findIndex(x => x.id === playerId);
  const p = idx >= 0 ? s.players[idx]
          : (state.players.find(x => x.id === playerId) || { id: playerId, prenom: '?', nom: '', pintes: 0, volume: 0 });
  const rank = (idx >= 0 && p.pintes > 0) ? `#${idx + 1}` : '–';

  $('#pfAvatar').textContent = initials(p.prenom, p.nom);
  $('#pfAvatar').style.background = `linear-gradient(135deg, ${p.teamColor||colorFor(p.id)}, var(--pop))`;
  $('#pfName').textContent = `${p.prenom} ${p.nom||''}`.trim();
  $('#pfTeam').textContent = `🚩 ${p.teamName || 'Sans équipe'}`;
  $('#pfTeam').style.background = p.teamColor || 'var(--biere)';
  $('#pfPintes').textContent = p.pintes || 0;
  $('#pfLitres').textContent = fmtL(p.volume);
  $('#pfRank').textContent   = rank;

  const isMe = state.me && state.me.id === playerId;
  $('#pfActions').innerHTML = isMe
    ? `<button class="btn btn-ghost btn-block" id="logoutBtn">Se déconnecter</button>` : '';
  if (isMe) $('#logoutBtn').addEventListener('click', () => auth.signOut());

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
    currentPhoto = await compressImage(file, 1080, 0.82);
    $('#previewImg').src = currentPhoto.dataUrl;
    $('#photoDrop').classList.add('hidden');
    $('#photoPreview').classList.remove('hidden');
    // Rappel des règles (validation à l'honneur pour l'instant)
    const box = $('#verifyBox');
    box.classList.remove('hidden', 'ok', 'ko', 'loading');
    box.classList.add('ok');
    box.innerHTML = `✅ Photo prête ! Vérifie qu'on voit bien une pinte 50 cl, liquide visible.`;
    $('#postSubmit').disabled = false;
  } catch (err) {
    toast('Impossible de lire cette image', 'ko');
  }
});

$('#postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#postErr'); errEl.textContent = '';
  const submit = $('#postSubmit');
  if (!currentPhoto) { errEl.textContent = 'Ajoute une photo de ta pinte.'; return; }
  const lieu = $('#lieuInput').value.trim();
  if (!lieu) { errEl.textContent = 'Indique le lieu.'; return; }

  submit.disabled = true; submit.textContent = 'Envoi…';
  try {
    const uid = state.user.uid;
    const path = `pintes/${uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
    const ref = storage.ref().child(path);
    const snap = await ref.put(currentPhoto.blob, { contentType: 'image/jpeg' });
    const url = await snap.ref.getDownloadURL();

    await db.collection('pints').add({
      playerId:  uid,
      prenom:    state.me ? state.me.prenom : (state.user.displayName||'').split('|')[0] || 'Joueur',
      nom:       state.me ? state.me.nom : '',
      teamId:    state.me ? state.me.teamId : null,
      teamName:  state.me ? state.me.teamName : null,
      teamColor: state.me ? state.me.teamColor : null,
      photoUrl:  url,
      lieu,
      volumeCl:  CFG.PINTE_CL || 50,
      status:    'verified',   // comptée immédiatement (validation à l'honneur)
      createdAt: SERVER_TS(),
    });

    toast('🍻 Pinte postée !', 'ok');
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
  $('#photoInput').value = '';
  $('#previewImg').src = '';
  $('#lieuInput').value = '';
  $('#photoDrop').classList.remove('hidden');
  $('#photoPreview').classList.add('hidden');
  $('#verifyBox').classList.add('hidden');
  $('#postSubmit').disabled = true;
  $('#postErr').textContent = '';
}

/* Compression/redimensionnement via canvas → Blob JPEG */
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (Math.max(w, h) > maxSize) {
        const r = maxSize / Math.max(w, h); w = Math.round(w*r); h = Math.round(h*r);
      }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob((blob) => {
        if (!blob) return reject(new Error('canvas'));
        resolve({ blob, dataUrl: c.toDataURL('image/jpeg', quality) });
      }, 'image/jpeg', quality);
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
    openOverlay('#authOverlay');
  };
  $('#loginBtn').addEventListener('click', () => showAuth('login'));
  $('#ctaLogin').addEventListener('click', () => showAuth('login'));
  $('#ctaSignup').addEventListener('click', () => showAuth('signup'));
  $('#toSignup').addEventListener('click', () => showAuth('signup'));
  $('#toLogin').addEventListener('click',  () => showAuth('login'));

  $('#teamSelect').addEventListener('change', (e) => {
    $('#newTeamField').classList.toggle('hidden', e.target.value !== '__new__');
  });

  $('#goHome').addEventListener('click', () => showView(state.user ? 'feed' : 'public'));
  $('#meBtn').addEventListener('click', () => state.me && openProfile(state.me.id));
  $('#backFromProfile').addEventListener('click', () => showView(state.user ? 'feed' : 'public'));
  $('#fabHome').addEventListener('click', () => showView('feed'));
  $('#fabPost').addEventListener('click', () => { resetPostForm(); openOverlay('#postOverlay'); });
}

/* Go 🍺 */
boot();
