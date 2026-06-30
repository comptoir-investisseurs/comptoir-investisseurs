/* =========================================================================
   Villa Quiberon — Moteur du parcours immersif (scroll cinématique)
   "Caméra sur la tête" : dolly + fondu enchaîné + franchissement de seuil.
   ========================================================================= */
(function () {
  const scenes = window.VILLA_SCENES || [];
  const N = scenes.length;
  if (!N) return;

  const journey   = document.getElementById("journey");
  const bob       = document.getElementById("stageBob");
  const rail      = document.getElementById("journeyRail");
  const intro     = document.getElementById("journeyIntro");
  const cue       = document.getElementById("scrollCue");
  const progress  = document.getElementById("journeyProgress");
  const view      = document.getElementById("view-decouverte");
  if (!journey || !bob) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dbgRaw = new URLSearchParams(location.search).get("scene");
  const dbg = dbgRaw === null ? null : clampN(parseInt(dbgRaw, 10) || 0, 0, N - 1);

  // Hauteur scrollable du parcours : une "longueur d'écran" par transition.
  journey.style.height = (N * 100) + "vh";

  // ---- Construction du DOM des scènes -----------------------------------
  const els = scenes.map((sc, i) => {
    const el = document.createElement("article");
    el.className = "scene";
    el.style.zIndex = String(N - i);

    const bg = document.createElement("div");
    bg.className = "scene__layer scene__bg";
    if (sc.video) {
      bg.innerHTML = `<video src="${sc.video}" autoplay muted loop playsinline
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`;
    } else if (sc.img) {
      bg.innerHTML = `<img src="${sc.img}" alt="${sc.title}"
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
    } else {
      bg.innerHTML = sc.bg("s" + i);
    }

    const fg = document.createElement("div");
    fg.className = "scene__layer scene__fg";
    fg.innerHTML = sc.fg ? sc.fg("f" + i) : "";

    const grain = document.createElement("div"); grain.className = "scene__grain";
    const vig   = document.createElement("div"); vig.className   = "scene__vignette";

    const cap = document.createElement("div");
    cap.className = "scene__caption";
    cap.innerHTML = `
      <div class="chapter">${sc.chapter}</div>
      <h2>${sc.title}</h2>
      <p>${sc.caption}</p>
      <div class="specs">${(sc.specs || []).map((s) => `<span>${s}</span>`).join("")}</div>`;

    el.append(bg, fg, grain, vig, cap);
    bob.appendChild(el);
    return { el, bg, fg, cap, seed: ((i * 53) % 7) - 3 };
  });

  // ---- Rail des chapitres -----------------------------------------------
  if (rail) {
    scenes.forEach((sc, i) => {
      const item = document.createElement("button");
      item.className = "rail__item";
      item.type = "button";
      item.innerHTML = `<span class="lbl">${sc.chapter}</span><span class="dot"></span>`;
      item.addEventListener("click", () => goToScene(i));
      rail.appendChild(item);
    });
  }
  const railItems = rail ? Array.from(rail.children) : [];

  function goToScene(i) {
    const top = journey.offsetTop + (i / Math.max(1, N - 1)) * (journey.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }

  // ---- Boucle d'animation -----------------------------------------------
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  let current = 0, target = 0, ticking = false, lastActive = -1;

  function readTarget() {
    if (dbg !== null) { target = dbg; if (intro) intro.style.opacity = 0; if (cue) cue.style.opacity = 0; return; }
    const rect = journey.getBoundingClientRect();
    const denom = journey.offsetHeight - window.innerHeight;
    const p = denom > 0 ? clamp(-rect.top / denom, 0, 1) : 0;
    target = p * (N - 1);
    if (progress) progress.style.width = (p * 100).toFixed(2) + "%";
    // Intro & cue ne vivent qu'au tout début
    const introFade = clamp(1 - p / 0.06, 0, 1);
    if (intro) { intro.style.opacity = introFade; intro.style.transform = `translateY(${(1 - introFade) * -30}px)`; }
    if (cue)   cue.style.opacity = clamp(1 - p / 0.04, 0, 1);
  }

  function render() {
    current += (target - current) * (reduce ? 1 : 0.12);
    if (Math.abs(target - current) < 0.0005) current = target;

    for (let i = 0; i < N; i++) {
      const o = els[i];
      const d = current - i;                       // <0 : à venir | >0 : franchie
      let opacity, scale, fgScale, fgOp;

      if (d >= 0) {                                // on traverse cette pièce
        opacity = 1 - smooth(d);                   // fond enchaîné
        scale   = 1 + 0.34 * d;                    // dolly avant
        fgScale = 1 + 0.62 * d;                    // le seuil se rapproche plus vite
      } else {                                     // pièce suivante, en attente derrière
        opacity = d > -1.25 ? 1 : 0;
        scale   = Math.max(0.9, 1 + 0.18 * d);
        fgScale = Math.max(0.86, 1 + 0.3 * d);
      }
      // Le cadre "seuil" ne marque que les transitions, s'efface au centre.
      fgOp = smooth(Math.min(1, Math.abs(d))) * (d >= 0 ? 1 : 0.7);

      const drift = o.seed * d * 1.4;              // léger flottement latéral
      o.el.style.opacity = opacity;
      o.el.style.transform = `scale(${scale.toFixed(4)}) translate3d(${drift.toFixed(2)}px,0,0)`;
      o.el.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
      o.fg.style.opacity = fgOp;
      o.fg.style.transform = `scale(${fgScale.toFixed(4)})`;

      // Légende : présente quand la pièce est centrée
      let cap = clamp(1 - Math.abs(d) / 0.55, 0, 1);
      if (i === 0) cap *= clamp((current - 0.05) / 0.16, 0, 1); // laisse l'intro respirer
      o.cap.style.opacity = cap;
      o.cap.style.transform = `translateY(${((1 - cap) * 42 * (d < 0 ? 1 : -1)).toFixed(1)}px)`;
      o.cap.style.pointerEvents = cap > 0.5 ? "auto" : "none";
    }

    const active = Math.round(current);
    if (active !== lastActive) {
      railItems.forEach((it, i) => it.classList.toggle("is-active", i === active));
      lastActive = active;
    }

    if (Math.abs(target - current) > 0.0005) requestAnimationFrame(render);
    else ticking = false;
  }

  function kick() {
    if (!view || !view.classList.contains("is-active")) return;
    readTarget();
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", () => { kick(); }, { passive: true });

  // Premier rendu (et re-init quand l'onglet redevient actif)
  window.VILLA_kickJourney = () => {
    current = target = (dbg !== null ? dbg : 0); readTarget(); render();
  };
  readTarget();
  // rendu initial forcé
  current = target; render();
  if (dbg === null) requestAnimationFrame(() => { current = 0; render(); });
})();
