/* =========================================================================
   Permis Boussole — logique applicative (vanilla JS, sans dépendance)
   ========================================================================= */
(function () {
  "use strict";

  // -------- décodage des données compactes --------
  // COMMUNES : [ville, dep, lat, lon, pop]
  var COMMUNES = (window.COMMUNES || []).map(function (a) {
    return { ville: a[0], dep: a[1], lat: a[2], lon: a[3], pop: a[4] };
  });
  // AUTO_ECOLES : [nom, ville, dep, adresse, taux, presentes, lat, lon]
  var SCHOOLS = (window.AUTO_ECOLES || []).map(function (a, i) {
    return { id: i + 1, nom: a[0], ville: a[1], dep: a[2], adresse: a[3],
             taux: a[4], presentes: a[5], lat: a[6], lon: a[7] };
  });
  var IS_OFFICIAL = !!window.AUTO_ECOLES_OFFICIEL;
  var DEPS = window.DEPARTEMENTS || [];
  var GEO = window.FRANCE_DEPARTEMENTS_GEO || { features: [] };
  var K = 35; // force du prior bayésien (en nb de candidats)

  // -------- utilitaires --------
  function norm(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function depName(code) { var d = DEP_BY_CODE[code]; return d ? d.nom : code; }
  function fmt(n) { return n.toLocaleString("fr-FR"); }
  function rateClass(t) { return t >= 62 ? "good" : t >= 50 ? "mid" : "low"; }
  function rateColor(t) { return t >= 62 ? "#2e7d5b" : t >= 50 ? "#c08a2a" : "#b14a3c"; }
  function esc(s) { return (s || "").replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function haversine(a, b, c, d) {
    var R = 6371, dLat = (c - a) * Math.PI / 180, dLon = (d - b) * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  var DEP_BY_CODE = {};
  DEPS.forEach(function (d) { DEP_BY_CODE[d.code] = d; });

  // -------- stats par département + prior --------
  var DEP_STATS = {};
  SCHOOLS.forEach(function (s) {
    var st = DEP_STATS[s.dep] || (DEP_STATS[s.dep] = { n: 0, presentes: 0, sumW: 0 });
    st.n++; st.presentes += s.presentes; st.sumW += s.taux * s.presentes;
  });
  Object.keys(DEP_STATS).forEach(function (c) {
    var st = DEP_STATS[c]; st.mean = st.presentes ? st.sumW / st.presentes : 57;
  });
  var NAT_MEAN = (function () {
    var w = 0, p = 0;
    SCHOOLS.forEach(function (s) { w += s.taux * s.presentes; p += s.presentes; });
    return p ? w / p : 57;
  })();

  // -------- Score Boussole (moyenne bayésienne pondérée) --------
  SCHOOLS.forEach(function (s) {
    var prior = (DEP_STATS[s.dep] && DEP_STATS[s.dep].mean) || NAT_MEAN;
    s.score = Math.round(((s.presentes * s.taux + K * prior) / (s.presentes + K)) * 10) / 10;
  });

  // -------- index communes & agrégats par commune (avec écoles) --------
  var COMMUNE_BY = {}; // norm(ville)|dep -> commune
  COMMUNES.forEach(function (c) { COMMUNE_BY[norm(c.ville) + "|" + c.dep] = c; });

  var COMMUNE_STATS = {}; // ville|dep -> {ville,dep,lat,lon,n,presentes,mean,best}
  SCHOOLS.forEach(function (s) {
    var key = s.ville + "|" + s.dep;
    var cs = COMMUNE_STATS[key];
    if (!cs) {
      var c = COMMUNE_BY[norm(s.ville) + "|" + s.dep];
      cs = COMMUNE_STATS[key] = { ville: s.ville, dep: s.dep,
        lat: c ? c.lat : s.lat, lon: c ? c.lon : s.lon,
        n: 0, presentes: 0, sumW: 0 };
    }
    cs.n++; cs.presentes += s.presentes; cs.sumW += s.taux * s.presentes;
  });
  var SCHOOL_COMMUNES = Object.keys(COMMUNE_STATS).map(function (k) {
    var cs = COMMUNE_STATS[k]; cs.mean = cs.sumW / cs.presentes; return cs;
  });

  // ====================================================================
  // Navigation par onglets
  // ====================================================================
  var tabs = document.querySelectorAll(".tab");
  function showTab(name) {
    tabs.forEach(function (t) { t.classList.toggle("active", t.id === "tab-" + name); });
    document.querySelectorAll(".nav-links button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    document.getElementById("navLinks").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll("[data-tab]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      var t = b.getAttribute("data-tab");
      if (t) { e.preventDefault(); showTab(t); }
    });
  });
  document.getElementById("navToggle").addEventListener("click", function () {
    document.getElementById("navLinks").classList.toggle("open");
  });

  // ====================================================================
  // ACCUEIL — recommandation
  // ====================================================================
  var cityInput = document.getElementById("cityInput");
  var citySuggest = document.getElementById("citySuggest");
  var recoResult = document.getElementById("reco-result");

  // -------- régions métropolitaines (code département) --------
  var REGIONS = [
    { nom: "Auvergne-Rhône-Alpes", deps: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"] },
    { nom: "Bourgogne-Franche-Comté", deps: ["21", "25", "39", "58", "70", "71", "89", "90"] },
    { nom: "Bretagne", deps: ["22", "29", "35", "56"] },
    { nom: "Centre-Val de Loire", deps: ["18", "28", "36", "37", "41", "45"] },
    { nom: "Corse", deps: ["2A", "2B"] },
    { nom: "Grand Est", deps: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"] },
    { nom: "Hauts-de-France", deps: ["02", "59", "60", "62", "80"] },
    { nom: "Île-de-France", deps: ["75", "77", "78", "91", "92", "93", "94", "95"] },
    { nom: "Normandie", deps: ["14", "27", "50", "61", "76"] },
    { nom: "Nouvelle-Aquitaine", deps: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"] },
    { nom: "Occitanie", deps: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"] },
    { nom: "Pays de la Loire", deps: ["44", "49", "53", "72", "85"] },
    { nom: "Provence-Alpes-Côte d'Azur", deps: ["04", "05", "06", "13", "83", "84"] }
  ];
  var REGION_BY = {}; REGIONS.forEach(function (r) { REGION_BY[norm(r.nom)] = r; });
  var DEP_NAME_BY = {}; DEPS.forEach(function (d) { DEP_NAME_BY[norm(d.nom)] = d.code; });
  var FRANCE_ALIASES = { "france": 1, "france entiere": 1, "toute la france": 1, "national": 1, "nationale": 1 };

  function findCommune(q) {
    var nq = norm(q);
    if (!nq) return null;
    var exact = COMMUNES.filter(function (c) { return norm(c.ville) === nq; });
    if (exact.length) return exact.sort(function (a, b) { return b.pop - a.pop; })[0];
    var starts = COMMUNES.filter(function (c) { return norm(c.ville).indexOf(nq) === 0; });
    if (starts.length) return starts.sort(function (a, b) { return b.pop - a.pop; })[0];
    var contains = COMMUNES.filter(function (c) { return norm(c.ville).indexOf(nq) >= 0; });
    return contains.length ? contains.sort(function (a, b) { return b.pop - a.pop; })[0] : null;
  }

  // Résout une saisie en périmètre : France / région / département / commune.
  function resolveScope(q) {
    var nq = norm(q);
    if (!nq) return null;
    if (FRANCE_ALIASES[nq]) return { type: "france", label: "France entière" };
    if (REGION_BY[nq]) return { type: "region", region: REGION_BY[nq], label: REGION_BY[nq].nom };
    var code = q.trim().toUpperCase();
    if (DEP_BY_CODE[code]) return { type: "dep", code: code, label: depName(code) };
    if (DEP_NAME_BY[nq]) return { type: "dep", code: DEP_NAME_BY[nq], label: depName(DEP_NAME_BY[nq]) };
    var c = findCommune(q);
    if (c) return { type: "commune", commune: c, label: c.ville };
    var r = REGIONS.filter(function (r) { return norm(r.nom).indexOf(nq) >= 0; })[0];
    if (r) return { type: "region", region: r, label: r.nom };
    var d = DEPS.filter(function (d) { return norm(d.nom).indexOf(nq) >= 0; })[0];
    if (d) return { type: "dep", code: d.code, label: depName(d.code) };
    return null;
  }

  function renderSuggest(q) {
    var nq = norm(q);
    if (!nq) { citySuggest.style.display = "none"; return; }
    var items = [];
    if ("france entiere".indexOf(nq) === 0 || "toute la france".indexOf(nq) === 0)
      items.push({ q: "France", main: "France entière", sub: "Recommandation nationale", tag: "France" });
    REGIONS.filter(function (r) { return norm(r.nom).indexOf(nq) >= 0; }).slice(0, 3)
      .forEach(function (r) { items.push({ q: r.nom, main: r.nom, sub: r.deps.length + " départements", tag: "Région" }); });
    DEPS.filter(function (d) { return norm(d.nom).indexOf(nq) >= 0 || d.code.toLowerCase().indexOf(nq) === 0; }).slice(0, 3)
      .forEach(function (d) { items.push({ q: d.nom, main: d.nom, sub: "Département " + d.code, tag: "Dépt" }); });
    COMMUNES.filter(function (c) { return norm(c.ville).indexOf(nq) >= 0; })
      .sort(function (a, b) {
        var pa = norm(a.ville).indexOf(nq), pb = norm(b.ville).indexOf(nq);
        if (pa !== pb) return pa - pb;
        return b.pop - a.pop;
      }).slice(0, 6)
      .forEach(function (c) { items.push({ q: c.ville, dep: c.dep, main: c.ville, sub: c.dep + " · " + depName(c.dep), tag: "Ville" }); });
    if (!items.length) { citySuggest.style.display = "none"; return; }
    citySuggest.innerHTML = items.map(function (it) {
      return '<button data-q="' + esc(it.q) + '"' + (it.dep ? ' data-dep="' + it.dep + '"' : "") + '>' +
        '<span class="s-tag">' + it.tag + '</span>' +
        '<span class="s-city">' + esc(it.main) + '</span> ' +
        '<span class="s-dep">' + esc(it.sub) + "</span></button>";
    }).join("");
    citySuggest.style.display = "block";
  }

  function scoreRing(score) {
    var r = 52, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    return '<div class="score-ring"><svg width="130" height="130" viewBox="0 0 130 130">' +
      '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="10"/>' +
      '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="#c8a24c" stroke-width="10" stroke-linecap="round"' +
      ' stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '<text x="65" y="60" text-anchor="middle" transform="rotate(90 65 65)" fill="#fff" font-family="Cormorant Garamond,serif" font-size="30" font-weight="600">' + score.toFixed(0) + '</text>' +
      '<text x="65" y="80" text-anchor="middle" transform="rotate(90 65 65)" fill="#9fabbd" font-size="11" letter-spacing="1">/ 100</text>' +
      '</svg><div class="lab">Score Boussole</div></div>';
  }

  function nearestWithSchools(commune, maxKm, maxN) {
    return SCHOOL_COMMUNES.map(function (cs) {
      return { cs: cs, d: haversine(commune.lat, commune.lon, cs.lat, cs.lon) };
    }).filter(function (o) { return o.d <= maxKm; })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, maxN);
  }

  function byScore(a, b) { return b.score - a.score; }

  function schoolsInScope(scope) {
    if (scope.type === "france") return SCHOOLS.slice();
    if (scope.type === "region") {
      var set = {}; scope.region.deps.forEach(function (d) { set[d] = 1; });
      return SCHOOLS.filter(function (s) { return set[s.dep]; });
    }
    if (scope.type === "dep") return SCHOOLS.filter(function (s) { return s.dep === scope.code; });
    return [];
  }

  // Mise en avant choisie : Auto École Jacques (Isbergues, 62) pour le
  // Pas-de-Calais et pour la France entière.
  var PIN_JACQUES = SCHOOLS.filter(function (s) {
    return s.dep === "62" && norm(s.nom) === "auto ecole jacques";
  }).sort(function (a, b) { return b.presentes - a.presentes; })[0];
  function pinnedFor(scope) {
    if (!PIN_JACQUES) return null;
    if (scope.type === "france") return PIN_JACQUES;
    if (scope.type === "dep" && scope.code === "62") return PIN_JACQUES;
    return null;
  }

  function emptyReco(title, sub) {
    recoResult.innerHTML = '<div class="search-card"><h3 style="color:#fff;font-family:var(--serif)">' + title + "</h3>" +
      '<p style="color:#cdd6e3">' + sub + "</p></div>";
  }

  function recommend(scope) {
    citySuggest.style.display = "none";
    var note = "", showVille = true, list;

    if (scope.type === "commune") {
      var commune = scope.commune, ville = commune.ville, dep = commune.dep;
      list = SCHOOLS.filter(function (s) { return s.ville === ville && s.dep === dep; }).sort(byScore);
      showVille = false;
      if (!list.length) {
        var near = nearestWithSchools(commune, 35, 4);
        if (!near.length) {
          emptyReco("Aucune auto-école à proximité de " + esc(ville),
            "Essayez une commune plus importante, un département ou une région.");
          return;
        }
        var keys = {};
        near.forEach(function (o) { keys[o.cs.ville + "|" + o.cs.dep] = true; });
        list = SCHOOLS.filter(function (s) { return keys[s.ville + "|" + s.dep]; }).sort(byScore);
        note = "Aucune auto-école n'est référencée à " + esc(ville) +
          ". Voici les meilleures dans un rayon de 35 km (la plus proche à ~" + Math.round(near[0].d) + " km).";
        scope.label = "autour de " + ville; showVille = true;
      }
    } else {
      list = schoolsInScope(scope).sort(byScore);
      var pin = pinnedFor(scope);
      if (pin && list.indexOf(pin) >= 0) {
        list = [pin].concat(list.filter(function (s) { return s !== pin; }));
      }
    }
    if (!list.length) { emptyReco("Aucune donnée pour « " + esc(scope.label) + " »", "Essayez un autre périmètre."); return; }

    var best = list[0];
    var totalPres = list.reduce(function (a, s) { return a + s.presentes; }, 0);
    var html = "";
    if (note) html += '<div class="reco-note">' + note + "</div>";
    html += '<div class="reco-hero"><div>';
    html += '<span class="badge">Recommandation · ' + esc(scope.label) + "</span>";
    html += "<h3>" + esc(best.nom) + ' <span class="dep-chip">' + best.dep + "</span></h3>";
    html += '<div class="addr">' + esc(best.adresse) + "</div>";
    html += '<div class="reco-metrics">';
    html += '<div class="m"><div class="v">' + best.taux.toFixed(0) + '%</div><div class="k">Taux de réussite</div></div>';
    html += '<div class="m"><div class="v">' + fmt(best.presentes) + '</div><div class="k">Présentés au permis B</div></div>';
    html += '<div class="m"><div class="v">' + best.score.toFixed(0) + '</div><div class="k">Score pondéré</div></div>';
    html += "</div></div>" + scoreRing(best.score) + "</div>";

    if (list.length > 1) {
      var rest = list.slice(0, 12);
      html += '<div class="card" style="margin-top:1.4rem">';
      html += '<h3 style="font-family:var(--serif)">Le classement — ' + esc(scope.label) + "</h3>";
      html += '<p class="muted" style="margin-bottom:1rem">' + fmt(list.length) + ' auto-écoles · ' + fmt(totalPres) + ' candidats présentés au total.</p>';
      html += '<div class="table-wrap" style="box-shadow:none;border:1px solid var(--line)"><table class="ranking"><thead><tr>' +
        "<th>#</th><th>Auto-école</th><th>Taux</th><th>Présentés</th><th>Score</th></tr></thead><tbody>";
      rest.forEach(function (s, i) {
        html += '<tr><td><span class="rank-badge ' + (i < 3 ? "top" + (i + 1) : "") + '">' + (i + 1) + "</span></td>" +
          '<td><span class="ae-name">' + esc(s.nom) + "</span>" +
          (showVille ? '<br><span class="ae-city">' + esc(s.ville) + " (" + s.dep + ")</span>" : "") + "</td>" +
          '<td><span class="rate" style="color:' + rateColor(s.taux) + '">' + s.taux.toFixed(0) + "%</span></td>" +
          "<td>" + fmt(s.presentes) + "</td>" +
          '<td><span class="pill ' + rateClass(s.score) + '">' + s.score.toFixed(0) + "</span></td></tr>";
      });
      html += "</tbody></table></div></div>";
    }
    recoResult.innerHTML = html;
    recoResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function doReco() {
    citySuggest.style.display = "none";
    var scope = resolveScope(cityInput.value);
    if (!scope) {
      emptyReco("Introuvable", "Essayez une ville, un département, une région, ou « France ».");
      return;
    }
    recommend(scope);
  }

  cityInput.addEventListener("input", function () { renderSuggest(cityInput.value); });
  cityInput.addEventListener("keydown", function (e) { if (e.key === "Enter") doReco(); });
  document.getElementById("recoBtn").addEventListener("click", doReco);
  citySuggest.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    cityInput.value = btn.getAttribute("data-q");
    var dep = btn.getAttribute("data-dep");
    if (dep) {
      var c = COMMUNE_BY[norm(btn.getAttribute("data-q")) + "|" + dep];
      if (c) { recommend({ type: "commune", commune: c, label: c.ville }); return; }
    }
    doReco();
  });
  document.querySelectorAll(".chips button").forEach(function (b) {
    b.addEventListener("click", function () { cityInput.value = b.getAttribute("data-q"); doReco(); });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".field")) citySuggest.style.display = "none";
  });

  // ====================================================================
  // Stats nationales
  // ====================================================================
  (function () {
    var el = document.getElementById("nationalStats");
    if (!el) return;
    var totalPres = SCHOOLS.reduce(function (a, s) { return a + s.presentes; }, 0);
    var cards = [
      { v: fmt(SCHOOLS.length), k: "auto-écoles référencées" },
      { v: fmt(COMMUNES.length), k: "communes couvertes" },
      { v: NAT_MEAN.toFixed(0) + "%", k: "taux de réussite moyen" },
      { v: fmt(totalPres), k: "candidats au permis B" }
    ];
    el.innerHTML = cards.map(function (c) {
      return '<div class="card"><div class="num">' + c.v + '</div><h3>' + c.k + "</h3></div>";
    }).join("");
  })();

  // ====================================================================
  // CARTE — projection + choropleth + zoom + marqueurs
  // ====================================================================
  var MAP_W = 600, MAP_H = 560, PAD = 14;
  var proj = (function () {
    var minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    function scan(c) {
      if (typeof c[0] === "number") {
        if (c[0] < minLon) minLon = c[0]; if (c[0] > maxLon) maxLon = c[0];
        if (c[1] < minLat) minLat = c[1]; if (c[1] > maxLat) maxLat = c[1];
      } else c.forEach(scan);
    }
    GEO.features.forEach(function (f) { scan(f.geometry.coordinates); });
    var midLat = (minLat + maxLat) / 2, kx = Math.cos(midLat * Math.PI / 180);
    var xMin = minLon * kx, xMax = maxLon * kx;
    var scale = Math.min((MAP_W - 2 * PAD) / (xMax - xMin), (MAP_H - 2 * PAD) / (maxLat - minLat));
    var offX = (MAP_W - (xMax - xMin) * scale) / 2, offY = (MAP_H - (maxLat - minLat) * scale) / 2;
    return function (lon, lat) {
      return [offX + (lon * kx - xMin) * scale, offY + (maxLat - lat) * scale];
    };
  })();

  function ringToPath(ring) {
    var d = "";
    for (var i = 0; i < ring.length; i++) {
      var p = proj(ring[i][0], ring[i][1]);
      d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }
    return d + "Z";
  }
  function geoToPath(geom) {
    var polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    return polys.map(function (poly) { return poly.map(ringToPath).join(""); }).join("");
  }
  function geomBBox(geom) {
    var b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    function scan(c) {
      if (typeof c[0] === "number") {
        var p = proj(c[0], c[1]);
        if (p[0] < b.x0) b.x0 = p[0]; if (p[0] > b.x1) b.x1 = p[0];
        if (p[1] < b.y0) b.y0 = p[1]; if (p[1] > b.y1) b.y1 = p[1];
      } else c.forEach(scan);
    }
    scan(geom.coordinates);
    return b;
  }

  var depMeans = Object.keys(DEP_STATS).map(function (c) { return DEP_STATS[c].mean; });
  var loMean = Math.min.apply(null, depMeans), hiMean = Math.max.apply(null, depMeans);
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function choro(mean) {
    if (mean == null) return "#e7e0d0";
    var t = Math.max(0, Math.min(1, (mean - loMean) / (hiMean - loMean || 1)));
    return "rgb(" + lerp(236, 47, t) + "," + lerp(220, 125, t) + "," + lerp(189, 91, t) + ")";
  }

  var mapSvg = document.getElementById("france-map");
  var tooltip = document.getElementById("mapTooltip");
  var DEP_BBOX = {};
  var currentVB = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  var vbAnim = null;

  function setVB(x, y, w, h) {
    currentVB = { x: x, y: y, w: w, h: h };
    mapSvg.setAttribute("viewBox", x + " " + y + " " + w + " " + h);
  }
  function animateVB(tx, ty, tw, th) {
    var s = { x: currentVB.x, y: currentVB.y, w: currentVB.w, h: currentVB.h };
    var t0 = null, dur = 480;
    if (vbAnim) cancelAnimationFrame(vbAnim);
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      setVB(s.x + (tx - s.x) * e, s.y + (ty - s.y) * e,
            s.w + (tw - s.w) * e, s.h + (th - s.h) * e);
      sizeMarkers();
      if (k < 1) vbAnim = requestAnimationFrame(step);
    }
    vbAnim = requestAnimationFrame(step);
  }

  function buildMap() {
    if (!mapSvg) return;
    var deps = GEO.features.map(function (f) {
      var code = f.properties.code;
      DEP_BBOX[code] = geomBBox(f.geometry);
      var st = DEP_STATS[code];
      return '<path class="dep" d="' + geoToPath(f.geometry) + '" data-code="' + code +
        '" fill="' + choro(st ? st.mean : null) + '"></path>';
    }).join("");
    mapSvg.innerHTML = '<g id="depLayer">' + deps + '</g><g id="markerLayer"></g>';

    mapSvg.querySelectorAll("#depLayer path.dep").forEach(function (p) {
      var code = p.getAttribute("data-code");
      p.addEventListener("mousemove", function (e) {
        var st = DEP_STATS[code];
        tooltip.innerHTML = "<strong>" + code + " · " + esc(depName(code)) + "</strong>" +
          (st ? "<br>Taux moyen : " + st.mean.toFixed(0) + "% · " + st.n + " auto-écoles" : "");
        tooltip.style.left = (e.clientX + 14) + "px";
        tooltip.style.top = (e.clientY + 14) + "px";
        tooltip.style.opacity = "1";
      });
      p.addEventListener("mouseleave", function () { tooltip.style.opacity = "0"; });
      p.addEventListener("click", function () { selectDep(code); });
    });

    var leg = document.getElementById("legendScale");
    if (leg) {
      var n = 6, h = "";
      for (var i = 0; i < n; i++) h += '<i style="background:' + choro(loMean + (hiMean - loMean) * i / (n - 1)) + '"></i>';
      leg.innerHTML = h;
      document.getElementById("legendLow").textContent = loMean.toFixed(0) + "%";
      document.getElementById("legendHigh").textContent = hiMean.toFixed(0) + "%";
    }
  }

  var markerEls = [];
  function sizeMarkers() {
    var k = currentVB.w / MAP_W; // facteur d'échelle du zoom
    markerEls.forEach(function (m) {
      m.el.setAttribute("r", (m.base * k).toFixed(2));
      m.el.setAttribute("stroke-width", (1.1 * k).toFixed(2));
    });
  }

  function renderMarkers(code) {
    var layer = document.getElementById("markerLayer");
    markerEls = [];
    var communes = SCHOOL_COMMUNES.filter(function (cs) { return cs.dep === code; })
      .sort(function (a, b) { return b.n - a.n; });
    layer.innerHTML = communes.map(function (cs) {
      var p = proj(cs.lon, cs.lat);
      var base = Math.max(1.6, Math.min(4.2, 1.4 + Math.sqrt(cs.n)));
      return '<circle class="ae-marker" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) +
        '" fill="' + rateColor(cs.mean) + '" stroke="#fff" data-ville="' + esc(cs.ville) +
        '" data-r="' + base.toFixed(2) + '"></circle>';
    }).join("");
    layer.querySelectorAll("circle").forEach(function (el) {
      markerEls.push({ el: el, base: parseFloat(el.getAttribute("data-r")) });
      var ville = el.getAttribute("data-ville");
      var cs = COMMUNE_STATS[ville + "|" + code];
      el.addEventListener("mousemove", function (e) {
        tooltip.innerHTML = "<strong>" + esc(ville) + "</strong><br>" + cs.n +
          " auto-écoles · taux moyen " + cs.mean.toFixed(0) + "%";
        tooltip.style.left = (e.clientX + 14) + "px";
        tooltip.style.top = (e.clientY + 14) + "px";
        tooltip.style.opacity = "1";
      });
      el.addEventListener("mouseleave", function () { tooltip.style.opacity = "0"; });
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        fVille.value = ville; applyFilters();
        document.querySelector("#tab-carte .section.alt").scrollIntoView({ behavior: "smooth" });
      });
    });
    sizeMarkers();
  }

  var selectedDep = null;
  function selectDep(code) {
    selectedDep = code;
    mapSvg.querySelectorAll("#depLayer path.dep").forEach(function (p) {
      p.classList.toggle("selected", p.getAttribute("data-code") === code);
      p.classList.toggle("dim", p.getAttribute("data-code") !== code);
    });
    var b = DEP_BBOX[code];
    var pad = Math.max((b.x1 - b.x0), (b.y1 - b.y0)) * 0.12 + 6;
    animateVB(b.x0 - pad, b.y0 - pad, (b.x1 - b.x0) + 2 * pad, (b.y1 - b.y0) + 2 * pad);
    renderMarkers(code);
    document.getElementById("mapReset").style.display = "inline-flex";
    renderMapSide(code);
    fDep.value = code; populateVille(); applyFilters();
  }

  function resetMap() {
    selectedDep = null;
    mapSvg.querySelectorAll("#depLayer path.dep").forEach(function (p) {
      p.classList.remove("selected", "dim");
    });
    document.getElementById("markerLayer").innerHTML = ""; markerEls = [];
    animateVB(0, 0, MAP_W, MAP_H);
    document.getElementById("mapReset").style.display = "none";
    mapSideDefault();
    fDep.value = ""; populateVille(); applyFilters();
  }

  function renderMapSide(code) {
    var el = document.getElementById("mapSide");
    var st = DEP_STATS[code];
    if (!st) { el.innerHTML = '<div class="card"><p class="muted">Pas de données pour ce département.</p></div>'; return; }
    var list = SCHOOLS.filter(function (s) { return s.dep === code; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, 6);
    var nCommunes = SCHOOL_COMMUNES.filter(function (cs) { return cs.dep === code; }).length;
    var html = '<div class="card"><span class="eyebrow">' + code + " · Département</span>";
    html += "<h3>" + esc(depName(code)) + "</h3>";
    html += '<div class="dep-stats">' +
      '<div class="m"><div class="v">' + st.n + '</div><div class="k">auto-écoles</div></div>' +
      '<div class="m"><div class="v">' + nCommunes + '</div><div class="k">communes</div></div>' +
      '<div class="m"><div class="v">' + st.mean.toFixed(0) + '%</div><div class="k">taux moyen</div></div>' +
      "</div>";
    html += '<h4 style="font-family:var(--serif);margin-bottom:.4rem">Top auto-écoles</h4><ul class="mini-list">';
    list.forEach(function (s, i) {
      html += '<li><span class="r">' + (i + 1) + '</span><div class="nm"><b>' + esc(s.nom) +
        '</b><span>' + esc(s.ville) + " · " + fmt(s.presentes) + ' présentés</span></div>' +
        '<span class="rt" style="color:' + rateColor(s.taux) + '">' + s.taux.toFixed(0) + "%</span></li>";
    });
    html += "</ul><button class=\"btn dark\" style=\"margin-top:1.2rem\" id=\"seeDirectory\">Voir l'annuaire du " + code + "</button></div>";
    el.innerHTML = html;
    var b = document.getElementById("seeDirectory");
    if (b) b.addEventListener("click", function () {
      document.querySelector("#tab-carte .section.alt").scrollIntoView({ behavior: "smooth" });
    });
  }

  function mapSideDefault() {
    document.getElementById("mapSide").innerHTML =
      '<div class="card"><span class="eyebrow">Mode d\'emploi</span><h3>Cliquez un département</h3>' +
      '<p class="muted">La carte zoome sur le département et affiche toutes ses communes équipées. ' +
      'Survolez un point pour voir une ville, cliquez pour filtrer l\'annuaire ci-dessous.</p></div>';
  }

  // ====================================================================
  // ANNUAIRE — filtres + tri
  // ====================================================================
  var fDep = document.getElementById("fDep");
  var fVille = document.getElementById("fVille");
  var fSearch = document.getElementById("fSearch");
  var rankBody = document.getElementById("rankBody");
  var resultCount = document.getElementById("resultCount");
  var sortKey = "taux", sortDir = -1;
  var RENDER_CAP = 300;

  (function populateDep() {
    var codes = Object.keys(DEP_STATS).sort();
    var html = '<option value="">Tous les départements</option>';
    codes.forEach(function (c) { html += '<option value="' + c + '">' + c + " · " + esc(depName(c)) + "</option>"; });
    fDep.innerHTML = html;
  })();

  function populateVille() {
    var dep = fDep.value;
    var html = '<option value="">Toutes les villes</option>';
    if (dep) {
      SCHOOL_COMMUNES.filter(function (cs) { return cs.dep === dep; })
        .sort(function (a, b) { return a.ville.localeCompare(b.ville, "fr"); })
        .forEach(function (cs) { html += '<option value="' + esc(cs.ville) + '">' + esc(cs.ville) + " (" + cs.n + ")</option>"; });
    }
    fVille.innerHTML = html;
    fVille.disabled = !dep;
  }

  function currentList() {
    var dep = fDep.value, ville = fVille.value, q = norm(fSearch.value);
    var list = SCHOOLS.filter(function (s) {
      if (dep && s.dep !== dep) return false;
      if (ville && s.ville !== ville) return false;
      if (q && norm(s.nom).indexOf(q) < 0 && norm(s.ville).indexOf(q) < 0) return false;
      return true;
    });
    list.sort(function (a, b) {
      var va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") return va.localeCompare(vb, "fr") * sortDir;
      return (va - vb) * sortDir;
    });
    return list;
  }

  function applyFilters() {
    var list = currentList();
    var shown = list.slice(0, RENDER_CAP);
    resultCount.textContent = list.length + " auto-école" + (list.length > 1 ? "s" : "") +
      (list.length > RENDER_CAP ? " · 300 affichées" : "");
    if (!list.length) {
      rankBody.innerHTML = '<tr><td colspan="6"><div class="empty">Aucune auto-école ne correspond à ces critères.</div></td></tr>';
      return;
    }
    rankBody.innerHTML = shown.map(function (s, i) {
      var w = Math.max(4, Math.min(100, s.taux));
      return "<tr>" +
        '<td><span class="rank-badge ' + (i < 3 ? "top" + (i + 1) : "") + '">' + (i + 1) + "</span></td>" +
        '<td><span class="ae-name">' + esc(s.nom) + '</span><br><span class="ae-city">' + esc(s.ville) + " (" + s.dep + ")</span></td>" +
        "<td>" + s.dep + "</td>" +
        '<td><span class="rate" style="color:' + rateColor(s.taux) + '">' + s.taux.toFixed(0) + "%</span>" +
        '<div class="bar"><i style="width:' + w + "%;background:" + rateColor(s.taux) + '"></i></div></td>' +
        "<td>" + fmt(s.presentes) + "</td>" +
        '<td><span class="pill ' + rateClass(s.score) + '">' + s.score.toFixed(0) + "</span></td></tr>";
    }).join("");
  }

  fDep.addEventListener("change", function () { populateVille(); applyFilters(); });
  fVille.addEventListener("change", applyFilters);
  fSearch.addEventListener("input", applyFilters);

  document.querySelectorAll("#rankTable th[data-sort]").forEach(function (th) {
    th.addEventListener("click", function () {
      var key = th.getAttribute("data-sort");
      if (key === "rank") return;
      if (sortKey === key) sortDir *= -1;
      else { sortKey = key; sortDir = (key === "nom" || key === "dep") ? 1 : -1; }
      document.querySelectorAll("#rankTable th").forEach(function (h) { h.classList.remove("sorted", "asc"); });
      th.classList.add("sorted"); if (sortDir === 1) th.classList.add("asc");
      applyFilters();
    });
  });

  // ====================================================================
  // Contact — mailto
  // ====================================================================
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("cName").value.trim();
      var email = document.getElementById("cEmail").value.trim();
      var subject = document.getElementById("cSubject").value;
      var msg = document.getElementById("cMessage").value.trim();
      if (!name || !email || !msg) { alert("Merci de renseigner votre nom, votre e-mail et un message."); return; }
      var body = "Nom : " + name + "\nE-mail : " + email + "\n\n" + msg;
      window.location.href = "mailto:contact@lfd-rochechouart.com?subject=" +
        encodeURIComponent("[" + subject + "] " + name) + "&body=" + encodeURIComponent(body);
      document.getElementById("formOk").style.display = "block";
    });
  }

  // ====================================================================
  // Init
  // ====================================================================
  document.getElementById("year").textContent = "2026";
  if (!IS_OFFICIAL) {
    var banner = document.getElementById("dataBanner");
    if (banner) banner.style.display = "block";
  }
  buildMap();
  mapSideDefault();
  populateVille();
  applyFilters();
  var rb = document.getElementById("mapReset");
  if (rb) rb.addEventListener("click", resetMap);

})();
