/* =========================================================================
   Villa Quiberon — Calendrier de disponibilités (synchro iCal multi-canal)
   -------------------------------------------------------------------------
   Airbnb ET Booking.com exposent un lien d'export iCal (.ics) des
   réservations. On les fusionne ici en direct : c'est exactement le
   mécanisme de "channel sync" du secteur.

   ► POUR CONNECTER VOS CANAUX :
     1. Récupérez vos liens d'export iCal :
        - Airbnb  : Annonce ▸ Disponibilités ▸ « Synchroniser les agendas »
        - Booking : Extranet ▸ Tarifs & Disponibilités ▸ « Exporter le calendrier »
     2. Collez-les dans AVAIL_CONFIG.sources[].ics ci-dessous.
     3. Les calendriers distants étant sur un autre domaine, le navigateur
        exige un proxy CORS. Renseignez AVAIL_CONFIG.proxy (auto-hébergé de
        préférence). Sans proxy/lien, un jeu de démonstration s'affiche et le
        widget Airbnb officiel reste la source faisant foi.
   ========================================================================= */
(function () {
  const AVAIL_CONFIG = {
    airbnbRoomId: "1441102902853230034",
    refreshMinutes: 30,
    // Préfixe proxy CORS. Le lien iCal est ajouté à la suite (encodé).
    proxy: "", // ex : "https://votre-proxy.workers.dev/?url="
    sources: [
      { name: "Airbnb",      badge: "iCal", ics: "", color: "#ff5a5f" },
      { name: "Booking.com", badge: "iCal", ics: "", color: "#003580" },
    ],
  };

  // Jeu de démonstration (utilisé tant qu'aucun flux iCal n'est branché)
  const DEMO_BUSY = [
    ["2026-07-05", "2026-07-12"],
    ["2026-07-19", "2026-07-26"],
    ["2026-08-09", "2026-08-16"],
    ["2026-08-24", "2026-08-31"],
    ["2026-09-13", "2026-09-20"],
  ];

  const elMonths  = document.getElementById("calMonths");
  const elTitle   = document.getElementById("calTitle");
  const elPrev    = document.getElementById("calPrev");
  const elNext    = document.getElementById("calNext");
  const elSources = document.getElementById("syncSources");
  if (!elMonths) return;

  const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet",
    "Août","Septembre","Octobre","Novembre","Décembre"];

  const key = (y, m, d) => `${y}-${m}-${d}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let base = new Date(today.getFullYear(), today.getMonth(), 1);
  let busy = new Set();

  /* ---- Parseur iCal minimal (VEVENT → plages bloquées) ----------------- */
  function parseICS(text) {
    const ranges = [];
    const lines = text.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
    let start = null, end = null, inEvent = false;
    for (const line of lines) {
      if (line.startsWith("BEGIN:VEVENT")) { inEvent = true; start = end = null; }
      else if (line.startsWith("END:VEVENT")) {
        if (inEvent && start) ranges.push([start, end || start]);
        inEvent = false;
      } else if (inEvent && line.startsWith("DTSTART")) start = icsDate(line);
      else if (inEvent && line.startsWith("DTEND")) end = icsDate(line);
    }
    return ranges;
  }
  function icsDate(line) {
    const m = line.split(":").pop().trim().match(/(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function addRange(set, start, end) {
    const d = new Date(start);
    while (d < end) { // DTEND = jour de départ (libre) → exclu
      set.add(key(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setDate(d.getDate() + 1);
    }
    if (+start === +end) set.add(key(start.getFullYear(), start.getMonth(), start.getDate()));
  }

  /* ---- Récupération des flux ------------------------------------------ */
  function sourceRow(src, state, meta) {
    const cls = { loading: "loading", ok: "ok", err: "err", idle: "" }[state] || "";
    return `<div class="source">
      <span class="state ${cls}"></span>
      <span class="name">${src.name}</span>
      <span class="meta">${meta}</span></div>`;
  }
  function renderSources(states) {
    if (!elSources) return;
    elSources.innerHTML = AVAIL_CONFIG.sources.map((s, i) => sourceRow(s, states[i].state, states[i].meta)).join("");
  }

  async function fetchSource(src) {
    if (!src.ics) return { state: "idle", meta: "à connecter", ranges: null };
    const url = AVAIL_CONFIG.proxy ? AVAIL_CONFIG.proxy + encodeURIComponent(src.ics) : src.ics;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const ranges = parseICS(await res.text());
      return { state: "ok", meta: `synchronisé · ${ranges.length} période(s)`, ranges };
    } catch (e) {
      return { state: "err", meta: "indisponible (proxy/CORS)", ranges: null };
    }
  }

  async function sync() {
    const states = AVAIL_CONFIG.sources.map(() => ({ state: "loading", meta: "synchronisation…" }));
    renderSources(states);

    const results = await Promise.all(AVAIL_CONFIG.sources.map(fetchSource));
    const next = new Set();
    let anyLive = false;
    results.forEach((r, i) => {
      states[i] = { state: r.state, meta: r.meta };
      if (r.ranges) { anyLive = true; r.ranges.forEach(([s, e]) => addRange(next, s, e)); }
    });

    if (!anyLive) {
      // Démonstration tant qu'aucun canal n'est branché
      DEMO_BUSY.forEach(([s, e]) => addRange(next, new Date(s), new Date(e)));
      states.forEach((st) => { if (st.state === "idle") st.meta = "démonstration"; });
    }
    busy = next;
    renderSources(states);
    renderCalendar();
  }

  /* ---- Rendu du calendrier (2 mois) ------------------------------------ */
  function monthHTML(year, month) {
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // lundi = 0
    const days = new Date(year, month + 1, 0).getDate();
    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<div class="cal__cell is-empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      const k = key(year, month, d);
      let cls = "cal__cell ";
      if (+date === +today) cls += "is-today ";
      if (date < today) cls += "is-past";
      else cls += busy.has(k) ? "is-busy" : "is-free";
      cells += `<div class="${cls}" title="${d} ${MONTHS[month]} ${year}">${d}</div>`;
    }
    return `<div class="cal__month">
      <h4>${MONTHS[month]} ${year}</h4>
      <div class="cal__grid">${DOW.map((x) => `<div class="cal__dow">${x}</div>`).join("")}${cells}</div>
    </div>`;
  }

  function renderCalendar() {
    const y = base.getFullYear(), m = base.getMonth();
    const n = new Date(y, m + 1, 1);
    elMonths.innerHTML = monthHTML(y, m) + monthHTML(n.getFullYear(), n.getMonth());
    if (elTitle) elTitle.textContent = `${MONTHS[m]} – ${MONTHS[n.getMonth()]} ${n.getFullYear()}`;
  }

  elPrev && elPrev.addEventListener("click", () => { base.setMonth(base.getMonth() - 1); renderCalendar(); });
  elNext && elNext.addEventListener("click", () => { base.setMonth(base.getMonth() + 1); renderCalendar(); });

  /* ---- Widget Airbnb officiel ----------------------------------------- */
  function mountAirbnbWidget() {
    const host = document.getElementById("airbnbWidget");
    if (!host || host.dataset.mounted) return;
    host.dataset.mounted = "1";
    const id = AVAIL_CONFIG.airbnbRoomId;
    host.innerHTML = `<div class="airbnb-embed-frame" data-id="${id}" data-view="home" data-hide-price="true"
        style="width:100%;max-width:450px;height:300px;margin:auto">
        <a href="https://www.airbnb.fr/rooms/${id}?source=embed_widget">Voir sur Airbnb</a></div>`;
    const s = document.createElement("script");
    s.async = true; s.src = "https://www.airbnb.fr/embeddable/airbnb_jssdk";
    host.appendChild(s);
  }

  // Exposé pour l'activation à l'ouverture de l'onglet
  window.VILLA_initAvailability = function () {
    renderCalendar();
    mountAirbnbWidget();
    if (!window.__villaSynced) { window.__villaSynced = true; sync(); }
  };

  // Rafraîchissement périodique (temps réel léger)
  setInterval(() => { if (window.__villaSynced) sync(); }, AVAIL_CONFIG.refreshMinutes * 60 * 1000);

  renderCalendar();
})();
