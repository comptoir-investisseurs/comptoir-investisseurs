#!/usr/bin/env node
/* =========================================================================
   Collecte des offres chez les structureurs partenaires (Equitim, Irbis).
   -------------------------------------------------------------------------
   Prérequis, à mettre en place dans les réglages de l'environnement cloud
   (menu de l'environnement dans la barre de titre, puis « Edit ») :

     1. Network access > Allowed domains : les domaines des extranets.
     2. Secrets / variables d'environnement :
            EQUITIM_USER  EQUITIM_PASS  IRBIS_USER  IRBIS_PASS
        Les secrets ne sont lus qu'ici et ne sont jamais écrits dans un
        fichier, un journal ni une capture.
     3. Redémarrer une session : les variables ne sont lues qu'au démarrage.

   USAGE
     node tools/collecte-structures.mjs doctor
         Vérifie identifiants, réseau et navigateur. À lancer en premier.

     node tools/collecte-structures.mjs discover <url>
         Ouvre l'URL et décrit la page : titre, formulaires, champs, boutons.
         Sert à écrire les sélecteurs sans les deviner. Aucune saisie.

     node tools/collecte-structures.mjs login <equitim|irbis>
         Se connecte et enregistre la session dans .sessions/<site>.json
         (dossier ignoré par git). Relancer si la session expire.

     node tools/collecte-structures.mjs dump <equitim|irbis> <url> [fichier]
         Rejoue la session enregistrée et sauvegarde le HTML de la page
         ainsi que les réponses JSON interceptées, pour analyse hors ligne.

   Les sélecteurs de connexion sont inconnus tant que les extranets ne sont
   pas joignables : ils se remplissent dans SITES après un `discover`.
   ========================================================================= */

/* Playwright est installé globalement dans ce conteneur : il ne se résout
   qu'en CommonJS, d'où ce fichier .cjs plutôt qu'un module ES. */
const { chromium } = require('playwright');
const { mkdir, writeFile, access } = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');

const SESSIONS = '.sessions';
const SORTIES = 'tools/collecte';

const SITES = {
  equitim: {
    nom: 'Equitim — KEY-OPS',
    // L'application redirige vers sa page de connexion si la session manque.
    loginUrl: process.env.EQUITIM_LOGIN_URL || 'https://keyops.equitim.com/',
    // Page qui porte la liste des produits, une fois connecté.
    cible: 'https://keyops.equitim.com/structured-products/all-structured-products',
    user: 'EQUITIM_USER',
    pass: 'EQUITIM_PASS',
    // Sélecteurs à renseigner après un `discover` sur la page de connexion.
    selUser: '', selPass: '', selSubmit: '',
    // Indice que la connexion a réussi (sélecteur présent une fois dedans).
    selConnecte: '',
  },
  irbis: {
    nom: 'Irbis Finance — IRBIS MAP',
    loginUrl: process.env.IRBIS_LOGIN_URL || 'https://irbismap.irbis-finance.com/',
    cible: 'https://irbismap.irbis-finance.com/',
    user: 'IRBIS_USER',
    pass: 'IRBIS_PASS',
    selUser: '', selPass: '', selSubmit: '',
    selConnecte: '',
  },
};

/* ------------------------------------------------------------------ */

function proxyConfig() {
  const p = process.env.HTTPS_PROXY || process.env.https_proxy;
  return p ? { proxy: { server: p } } : {};
}

async function navigateur() {
  return chromium.launch({ args: ['--no-sandbox'], ...proxyConfig() });
}

function secret(nom) {
  const v = process.env[nom];
  return v && v.trim() ? v : null;
}

async function existe(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

/* ---------------------------- doctor ------------------------------ */

async function doctor() {
  console.log('— Identifiants —');
  let manquants = 0;
  for (const [cle, s] of Object.entries(SITES)) {
    for (const n of [s.user, s.pass]) {
      const ok = !!secret(n);
      if (!ok) manquants++;
      console.log(`  ${n.padEnd(14)} ${ok ? 'présent' : 'ABSENT'}`);
    }
    if (!s.loginUrl) console.log(`  ${(cle.toUpperCase() + '_LOGIN_URL').padEnd(18)} ABSENTE — URL de connexion à fournir`);
  }

  console.log('\n— Réseau —');
  const hotes = [];
  for (const s of Object.values(SITES)) {
    for (const u of [s.loginUrl, s.cible]) {
      if (!u) continue;
      const h = new URL(u).host;
      if (!hotes.includes(h)) hotes.push(h);
    }
  }
  if (!hotes.length) console.log('  (aucune URL de connexion renseignée : rien à tester)');
  const b = await navigateur();
  for (const h of hotes) {
    const ctx = await b.newContext();
    const pg = await ctx.newPage();
    try {
      const r = await pg.goto(`https://${h}/`, { timeout: 20000, waitUntil: 'domcontentloaded' });
      console.log(`  ${h.padEnd(30)} HTTP ${r ? r.status() : '?'}`);
    } catch (e) {
      console.log(`  ${h.padEnd(30)} INJOIGNABLE — ${String(e.message).split('\n')[0].slice(0, 70)}`);
    }
    await ctx.close();
  }
  await b.close();
  console.log(manquants ? `\n${manquants} secret(s) manquant(s).` : '\nIdentifiants au complet.');
}

/* --------------------------- discover ----------------------------- */

async function discover(url) {
  if (!url) throw new Error('usage : discover <url>');
  const b = await navigateur();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const pg = await ctx.newPage();
  await pg.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

  const infos = await pg.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const decrire = (el) => ({
      tag: el.tagName.toLowerCase(), type: el.type || '', name: el.name || '',
      id: el.id || '', placeholder: el.placeholder || '',
      aria: el.getAttribute('aria-label') || '',
      texte: (el.innerText || el.value || '').trim().slice(0, 60),
      visible: vis(el),
    });
    return {
      titre: document.title,
      url: location.href,
      formulaires: [...document.querySelectorAll('form')].map((f) => ({
        action: f.getAttribute('action') || '', method: f.method,
        champs: [...f.querySelectorAll('input,select,textarea')].map(decrire),
      })),
      champsHorsForm: [...document.querySelectorAll('input,select')]
        .filter((e) => !e.closest('form')).map(decrire),
      boutons: [...document.querySelectorAll('button,[role=button],input[type=submit]')]
        .map(decrire).filter((x) => x.visible).slice(0, 15),
      cadres: [...document.querySelectorAll('iframe')].map((f) => f.src).slice(0, 5),
    };
  });

  await mkdir(SORTIES, { recursive: true });
  const base = path.join(SORTIES, 'discover-' + new URL(url).host.replace(/\W+/g, '-'));
  await writeFile(base + '.json', JSON.stringify(infos, null, 2), 'utf8');
  await pg.screenshot({ path: base + '.png', fullPage: true });
  console.log(JSON.stringify(infos, null, 2));
  console.log(`\nÉcrit : ${base}.json et ${base}.png`);
  if (infos.cadres.length) console.log('⚠ La page contient des iframes : le formulaire est peut-être à l’intérieur.');
  await b.close();
}

/* ----------------------------- login ------------------------------ */

async function login(cle) {
  const s = SITES[cle];
  if (!s) throw new Error(`site inconnu : ${cle}`);
  const u = secret(s.user), p = secret(s.pass);
  if (!u || !p) throw new Error(`${s.user} / ${s.pass} absents de l’environnement`);
  if (!s.loginUrl) throw new Error(`URL de connexion non renseignée pour ${cle}`);
  for (const champ of ['selUser', 'selPass', 'selSubmit']) {
    if (!s[champ]) throw new Error(`sélecteur ${champ} non renseigné — lancez d’abord « discover ${s.loginUrl} »`);
  }

  const b = await navigateur();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const pg = await ctx.newPage();
  await pg.goto(s.loginUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await pg.fill(s.selUser, u);
  await pg.fill(s.selPass, p);
  await Promise.all([
    pg.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}),
    pg.click(s.selSubmit),
  ]);
  await pg.waitForTimeout(2500);

  const ok = s.selConnecte ? await pg.locator(s.selConnecte).count() > 0 : true;
  await mkdir(SORTIES, { recursive: true });
  await pg.screenshot({ path: path.join(SORTIES, `login-${cle}.png`), fullPage: true });

  if (!ok) {
    console.log(`✗ Connexion non confirmée. Voir ${SORTIES}/login-${cle}.png`);
    console.log('  Causes fréquentes : double authentification, CAPTCHA, ou sélecteur de confirmation erroné.');
    await b.close(); process.exitCode = 1; return;
  }
  await mkdir(SESSIONS, { recursive: true });
  await ctx.storageState({ path: path.join(SESSIONS, `${cle}.json`) });
  console.log(`✓ Connecté à ${s.nom}. Session enregistrée dans ${SESSIONS}/${cle}.json`);
  await b.close();
}

/* ------------------------------ dump ------------------------------ */

async function dump(cle, url, sortie) {
  const s = SITES[cle];
  if (!s) throw new Error(`site inconnu : ${cle}`);
  const etat = path.join(SESSIONS, `${cle}.json`);
  if (!(await existe(etat))) throw new Error(`pas de session : lancez d’abord « login ${cle} »`);
  url = url || s.cible;
  if (!url) throw new Error('usage : dump <site> <url> [fichier]');

  const b = await navigateur();
  const ctx = await b.newContext({ storageState: etat, viewport: { width: 1440, height: 1200 } });
  const pg = await ctx.newPage();
  const api = [];
  pg.on('response', async (r) => {
    const t = r.headers()['content-type'] || '';
    if (t.includes('application/json') && r.status() < 400) {
      try { api.push({ url: r.url(), corps: await r.json() }); } catch {}
    }
  });
  await pg.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await pg.waitForTimeout(2500);

  await mkdir(SORTIES, { recursive: true });
  const base = path.join(SORTIES, sortie || `dump-${cle}`);
  await writeFile(base + '.html', await pg.content(), 'utf8');
  await writeFile(base + '.api.json', JSON.stringify(api, null, 2), 'utf8');
  await pg.screenshot({ path: base + '.png', fullPage: true });
  console.log(`HTML   : ${base}.html`);
  console.log(`JSON   : ${base}.api.json  (${api.length} réponse(s) interceptée(s))`);
  console.log(`Capture: ${base}.png`);
  console.log('\nLes réponses JSON sont souvent la source la plus propre : s’il y en a,');
  console.log('elles alimenteront data/produits-reels.csv plus sûrement que le HTML.');
  await b.close();
}

/* ------------------------------ main ------------------------------ */

const [, , cmd, ...args] = process.argv;

(async () => {
  try {
    if (cmd === 'doctor') await doctor();
    else if (cmd === 'discover') await discover(args[0]);
    else if (cmd === 'login') await login(args[0]);
    else if (cmd === 'dump') await dump(args[0], args[1], args[2]);
    else {
      console.log('Commandes : doctor | discover <url> | login <site> | dump <site> <url> [fichier]');
      console.log('Sites      : equitim, irbis');
      process.exitCode = 2;
    }
  } catch (e) {
    console.error('Erreur :', e.message);
    process.exitCode = 1;
  }
})();
