/* ============================================================
 * Ma p'tite pinte 🍺 — Application (vanilla JS, sans build)
 * Site 100 % indépendant. Backend : Supabase (auth + DB +
 * storage + realtime). Vérification photo : fonction Edge.
 * ============================================================ */

'use strict';

const CFG = window.PP_CONFIG || {};
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Client Supabase ---------- */
let sb = null;
const configured =
  CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('VOTRE-PROJET') &&
  CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes('VOTRE_CLE');

if (configured && window.supabase) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
}

/* ---------- État ---------- */
const state = {
  session: null,   // session Supabase
  me: null,        // profil pp_players du joueur connecté
  teams: [],       // cache des équipes
  channel: null,   // canal realtime
};

/* ---------- Helpers UI ---------- */
const COLORS = ['#F5A623','#E8503A','#7FB800','#FFD23F','#2EC4F1','#B36AE2','#FF7AB6','#00C2A8'];
const colorFor = (str) => COLORS[[...(str||'?')].reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];
const initials = (p, n) => ((p||'?')[0] + (n||'')[0]).toUpperCase();
const litres   = (cl) => (Number(cl||0) / 100);
const fmtL     = (cl) => litres(cl).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
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

/* ============================================================
 * DÉMARRAGE
 * ============================================================ */
async function boot() {
  wireEvents();

  if (!configured || !sb) {
    toast('⚙️ Configurez assets/config.js avec votre projet Supabase', 'ko');
    // On affiche quand même l'interface publique (stats vides).
    showView('public');
    return;
  }

  await loadTeams();
  await refreshStats();

  const { data } = await sb.auth.getSession();
  onSession(data.session);

  sb.auth.onAuthStateChange((_evt, session) => onSession(session));
}

/* ---------- Réaction au changement de session ---------- */
async function onSession(session) {
  state.session = session;
  if (session) {
    await ensureProfile();
    $('#loginBtn').classList.add('hidden');
    $('#meBtn').classList.remove('hidden');
    $('#fab').classList.remove('hidden');
    $('#meBtn').textContent = state.me ? initials(state.me.prenom, state.me.nom) : '🙂';
    $('#meBtn').style.background = state.me
      ? `linear-gradient(135deg, ${colorFor(state.me.id)}, var(--pop))` : '';
    startFeed();
    showView('feed');
  } else {
    state.me = null;
    $('#loginBtn').classList.remove('hidden');
    $('#meBtn').classList.add('hidden');
    $('#fab').classList.add('hidden');
    stopFeed();
    showView('public');
    await refreshStats();
  }
}

/* ============================================================
 * ÉQUIPES & STATISTIQUES
 * ============================================================ */
async function loadTeams() {
  const { data, error } = await sb.from('pp_teams').select('*').order('name');
  if (!error) state.teams = data || [];
  const sel = $('#teamSelect');
  sel.innerHTML =
    state.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('') +
    `<option value="__new__">➕ Créer une nouvelle équipe</option>`;
}

async function refreshStats() {
  // Compteurs globaux
  const { data: g } = await sb.from('pp_global_stats').select('*').single();
  if (g) {
    $('#stPintes').textContent  = (g.total_pintes ?? 0).toLocaleString('fr-FR');
    $('#stJoueurs').textContent = (g.total_joueurs ?? 0).toLocaleString('fr-FR');
    $('#stEquipes').textContent = (g.total_equipes ?? 0).toLocaleString('fr-FR');
    $('#stLitres').textContent  = fmtL(g.total_volume_cl);
  }

  // Classement équipes
  const { data: teams } = await sb.from('pp_team_stats')
    .select('*').order('pintes', { ascending: false }).limit(10);
  $('#teamCount').textContent = teams ? `${teams.length} équipes` : '';
  $('#teamBoard').innerHTML = (teams && teams.length)
    ? teams.map((t, i) => `
        <div class="board-row ${i<3?'top'+(i+1):''}">
          <div class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)}</div>
          <span class="dot" style="background:${t.color||'#F5A623'}"></span>
          <div class="name">${escapeHtml(t.name)}
            <div class="sub">${t.joueurs} joueur${t.joueurs>1?'s':''} · ${fmtL(t.volume_cl)} L</div>
          </div>
          <div class="val">${t.pintes} <small>🍺</small></div>
        </div>`).join('')
    : `<div class="empty"><div class="big">🚩</div>Aucune équipe pour l'instant.<br>Sois le premier à en créer une !</div>`;

  // Top joueurs
  const { data: players } = await sb.from('pp_player_stats')
    .select('*').order('pintes', { ascending: false }).limit(8);
  const withPints = (players||[]).filter(p => p.pintes > 0);
  $('#playerBoard').innerHTML = withPints.length
    ? withPints.map((p, i) => `
        <div class="board-row ${i<3?'top'+(i+1):''}">
          <div class="rank">${i+1}</div>
          <span class="dot" style="background:${p.team_color||colorFor(p.id)}"></span>
          <div class="name">${escapeHtml(p.prenom)} ${escapeHtml((p.nom||'')[0]||'')}.
            <div class="sub">${escapeHtml(p.team_name||'Sans équipe')}</div>
          </div>
          <div class="val">${p.pintes} <small>🍺</small></div>
        </div>`).join('')
    : `<div class="empty"><div class="big">🍺</div>La première pinte n'attend que toi !</div>`;
}

/* ============================================================
 * AUTHENTIFICATION
 * ============================================================ */
async function ensureProfile() {
  const uid = state.session.user.id;
  let { data } = await sb.from('pp_players').select('*').eq('id', uid).maybeSingle();

  // Profil pas encore créé (ex : inscription confirmée par email) → on le crée
  if (!data) {
    const m = state.session.user.user_metadata || {};
    if (m.prenom && m.nom) {
      const row = {
        id: uid, prenom: m.prenom, nom: m.nom,
        email: state.session.user.email, team_id: m.team_id || null,
      };
      const { data: ins } = await sb.from('pp_players').insert(row).select().single();
      data = ins;
    }
  }
  state.me = data || null;
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

    // 1) Équipe : existante ou nouvelle
    let teamId = f.team.value;
    if (teamId === '__new__') {
      const name = $('#newTeamInput').value.trim();
      if (!name) throw new Error("Donne un nom à ta nouvelle équipe.");
      teamId = null; // créée après connexion (RLS exige d'être connecté)
      var pendingTeamName = name;
    }

    // 2) Création du compte auth (métadonnées = prénom/nom/équipe)
    const { data, error } = await sb.auth.signUp({
      email, password: pwd,
      options: { data: { prenom, nom, team_id: teamId } },
    });
    if (error) throw error;

    // Si l'email doit être confirmé, il n'y a pas encore de session.
    if (!data.session) {
      toast('📧 Vérifie tes emails pour confirmer ton inscription !', 'ok');
      closeOverlay('#authOverlay');
      return;
    }

    // 3) Session immédiate : on crée l'équipe si besoin, puis le profil
    if (typeof pendingTeamName === 'string') {
      const { data: t } = await sb.from('pp_teams')
        .insert({ name: pendingTeamName, color: colorFor(pendingTeamName) })
        .select().single();
      if (t) teamId = t.id;
    }
    await sb.from('pp_players').insert({
      id: data.user.id, prenom, nom, email, team_id: teamId,
    });
    // Met à jour la métadonnée team_id (utile si équipe créée après-coup)
    if (teamId) await sb.auth.updateUser({ data: { team_id: teamId } });

    toast('🍻 Bienvenue dans la compét’ !', 'ok');
    closeOverlay('#authOverlay');
    // onAuthStateChange s'occupe du reste
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
    const { error } = await sb.auth.signInWithPassword({
      email: f.email.value.trim(), password: f.password.value,
    });
    if (error) throw error;
    closeOverlay('#authOverlay');
  } catch (err) {
    errEl.textContent = prettyErr(err);
  } finally {
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
});

function prettyErr(err) {
  const m = (err && err.message) || String(err);
  if (/already registered|already exists/i.test(m)) return 'Cet email est déjà inscrit. Connecte-toi !';
  if (/invalid login/i.test(m))                     return 'Email ou mot de passe incorrect.';
  if (/password should be at least/i.test(m))       return 'Mot de passe : 6 caractères minimum.';
  return m;
}

/* ============================================================
 * LE FIL (realtime)
 * ============================================================ */
const PINT_SELECT = '*, player:pp_players(id,prenom,nom), team:pp_teams(name,color)';

async function startFeed() {
  await loadFeed();
  stopFeed();
  state.channel = sb.channel('pp_pints_live')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pp_pints' },
      async (payload) => {
        const { data } = await sb.from('pp_pints').select(PINT_SELECT).eq('id', payload.new.id).single();
        if (data) prependPost(data);
        refreshStats();
      })
    .subscribe();
}
function stopFeed() { if (state.channel) { sb.removeChannel(state.channel); state.channel = null; } }

async function loadFeed() {
  const { data, error } = await sb.from('pp_pints')
    .select(PINT_SELECT).order('created_at', { ascending: false }).limit(50);
  const feed = $('#feed');
  if (error) { feed.innerHTML = `<div class="empty">Impossible de charger le fil.</div>`; return; }
  if (!data.length) {
    feed.innerHTML = `<div class="empty"><div class="big">🍺</div>Aucune pinte encore.<br>Sois le premier à dégainer ta photo !</div>`;
    return;
  }
  feed.innerHTML = data.map(postHtml).join('');
  bindPostAvatars(feed);
}

function prependPost(p) {
  const feed = $('#feed');
  const empty = feed.querySelector('.empty');
  if (empty) feed.innerHTML = '';
  feed.insertAdjacentHTML('afterbegin', postHtml(p));
  bindPostAvatars(feed);
  if (p.player && state.me && p.player.id !== state.me.id) {
    toast(`🍺 ${p.player.prenom} vient de poster une pinte !`);
  }
}

function postHtml(p) {
  const pl = p.player || {};
  const teamName  = p.team?.name  || 'Sans équipe';
  const teamColor = p.team?.color || colorFor(pl.id || '?');
  const statusTxt = { verified: '✅ Vérifiée', pending: '⏳ En attente', rejected: '❌ Refusée' }[p.status] || '';
  return `
    <article class="post">
      <div class="post-head">
        <div class="pa" data-player="${pl.id||''}" style="background:${colorFor(pl.id||'?')}">${initials(pl.prenom, pl.nom)}</div>
        <div class="who" data-player="${pl.id||''}">
          <b>${escapeHtml(pl.prenom||'Joueur')} ${escapeHtml((pl.nom||'')[0]||'')}.</b>
          <span><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${teamColor};display:inline-block"></span> ${escapeHtml(teamName)}</span>
        </div>
        <div class="when">${timeAgo(p.created_at)}</div>
      </div>
      <img class="post-photo" loading="lazy" src="${p.photo_url}" alt="Pinte de ${escapeHtml(pl.prenom||'')}">
      <div class="post-foot">
        <span class="pill vol">🍺 ${p.volume_cl} cl</span>
        ${p.lieu ? `<span class="pill loc">📍 ${escapeHtml(p.lieu)}</span>` : ''}
        <span class="pill team" style="background:${teamColor}">🚩 ${escapeHtml(teamName)}</span>
        <span class="badge-status ${p.status}">${statusTxt}</span>
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
 * PROFIL
 * ============================================================ */
async function openProfile(playerId) {
  showView('profile');
  const box = $('#viewProfile'); box.classList.add('loading-dim');

  const { data: p } = await sb.from('pp_player_stats').select('*').eq('id', playerId).single();
  // rang global
  const { data: all } = await sb.from('pp_player_stats').select('id,pintes').order('pintes', { ascending: false });
  const rank = all ? all.findIndex(x => x.id === playerId) + 1 : '–';

  if (p) {
    $('#pfAvatar').textContent = initials(p.prenom, p.nom);
    $('#pfAvatar').style.background = `linear-gradient(135deg, ${p.team_color||colorFor(p.id)}, var(--pop))`;
    $('#pfName').textContent = `${p.prenom} ${p.nom}`;
    $('#pfTeam').textContent = `🚩 ${p.team_name || 'Sans équipe'}`;
    $('#pfTeam').style.background = p.team_color || 'var(--biere)';
    $('#pfPintes').textContent = p.pintes || 0;
    $('#pfLitres').textContent = fmtL(p.volume_cl);
    $('#pfRank').textContent   = p.pintes > 0 ? `#${rank}` : '–';
  }

  // Actions (déconnexion sur son propre profil)
  const isMe = state.me && state.me.id === playerId;
  $('#pfActions').innerHTML = isMe
    ? `<button class="btn btn-ghost btn-block" id="logoutBtn">Se déconnecter</button>` : '';
  if (isMe) $('#logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); });

  // Ses pintes
  const { data: pints } = await sb.from('pp_pints')
    .select(PINT_SELECT).eq('player_id', playerId).order('created_at', { ascending: false }).limit(30);
  $('#pfFeed').innerHTML = (pints && pints.length)
    ? pints.map(postHtml).join('')
    : `<div class="empty">Pas encore de pinte 🍺</div>`;
  bindPostAvatars($('#pfFeed'));

  box.classList.remove('loading-dim');
}

/* ============================================================
 * POSTER UNE PINTE (photo + vérification + upload)
 * ============================================================ */
let currentPhoto = null;  // { blob, dataUrl } — photo compressée prête

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
    await runVerification();
  } catch (err) {
    toast('Impossible de lire cette image', 'ko');
  }
});

async function runVerification() {
  const box = $('#verifyBox');
  const submit = $('#postSubmit');
  box.classList.remove('hidden', 'ok', 'ko', 'loading');
  box.classList.add('loading');
  box.innerHTML = `<span class="spin"></span> Vérification de ta pinte en cours…`;
  submit.disabled = true;

  const res = await verifyPhoto(currentPhoto.dataUrl);
  currentPhoto.verify = res;

  box.classList.remove('loading');
  if (res.status === 'rejected') {
    box.classList.add('ko');
    box.innerHTML = `❌ Photo refusée — ${escapeHtml(res.reason || 'ce n’est pas une pinte valide')}.<br>Reprends une photo 📷`;
    submit.disabled = true;
  } else if (res.status === 'verified') {
    box.classList.add('ok');
    box.innerHTML = `✅ Pinte validée ! ${escapeHtml(res.reason || '')}`;
    submit.disabled = false;
  } else { // pending — vérif indisponible
    box.classList.add('loading');
    box.innerHTML = `⏳ Vérification différée — ta pinte sera validée par les organisateurs.`;
    submit.disabled = false;
  }
}

/* Appel de la fonction Edge de vérification.
 * Retourne { status: 'verified'|'rejected'|'pending', reason }. */
async function verifyPhoto(dataUrl) {
  if (!CFG.VERIFY_FUNCTION) return { status: 'pending', reason: '' };
  try {
    const { data, error } = await sb.functions.invoke(CFG.VERIFY_FUNCTION, {
      body: { image: dataUrl },
    });
    if (error) throw error;
    if (data && typeof data.verified === 'boolean') {
      return { status: data.verified ? 'verified' : 'rejected', reason: data.reason || '' };
    }
    return { status: 'pending', reason: '' };
  } catch (_e) {
    // Fonction non déployée / hors-ligne : on n'empêche pas de jouer.
    return { status: 'pending', reason: '' };
  }
}

$('#postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#postErr'); errEl.textContent = '';
  const submit = $('#postSubmit');

  if (!currentPhoto) { errEl.textContent = 'Ajoute une photo de ta pinte.'; return; }
  if (currentPhoto.verify && currentPhoto.verify.status === 'rejected') {
    errEl.textContent = 'Cette photo a été refusée. Reprends-en une.'; return;
  }
  const lieu = $('#lieuInput').value.trim();
  if (!lieu) { errEl.textContent = 'Indique le lieu.'; return; }

  submit.disabled = true; submit.textContent = 'Envoi…';
  try {
    const uid = state.session.user.id;
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;

    const { error: upErr } = await sb.storage
      .from(CFG.BUCKET).upload(path, currentPhoto.blob, { contentType: 'image/jpeg', upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = sb.storage.from(CFG.BUCKET).getPublicUrl(path);

    const status = (currentPhoto.verify && currentPhoto.verify.status) || 'pending';
    const reason = (currentPhoto.verify && currentPhoto.verify.reason) || null;

    const { error: insErr } = await sb.from('pp_pints').insert({
      player_id: uid,
      team_id:   state.me ? state.me.team_id : null,
      photo_url: pub.publicUrl,
      lieu,
      volume_cl: CFG.PINTE_CL || 50,
      status, verify_reason: reason,
    });
    if (insErr) throw insErr;

    toast(status === 'verified' ? '🍻 Pinte validée et postée !' : '🍺 Pinte postée (en attente de validation)', 'ok');
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
  // Auth panes
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

  // Bascule "nouvelle équipe"
  $('#teamSelect').addEventListener('change', (e) => {
    $('#newTeamField').classList.toggle('hidden', e.target.value !== '__new__');
  });

  // Navigation
  $('#goHome').addEventListener('click', () => showView(state.session ? 'feed' : 'public'));
  $('#meBtn').addEventListener('click', () => state.me && openProfile(state.me.id));
  $('#backFromProfile').addEventListener('click', () => showView(state.session ? 'feed' : 'public'));
  $('#fabHome').addEventListener('click', () => showView('feed'));

  // Poster
  $('#fabPost').addEventListener('click', () => { resetPostForm(); openOverlay('#postOverlay'); });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* Go 🍺 */
boot();
