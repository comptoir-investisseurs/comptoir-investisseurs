/* =========================================================================
   Permis Boussole — logique applicative (vanilla JS, sans dépendance)
   ========================================================================= */
(function () {
  "use strict";

  var SCHOOLS = window.AUTO_ECOLES || [];
  var DEPS = window.DEPARTEMENTS || [];
  var GEO = window.FRANCE_DEPARTEMENTS_GEO || { features: [] };
  var K = 35; // force du prior bayésien (en nb de candidats)

  // -------- utilitaires --------
  function norm(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function depName(code) {
    var d = DEP_BY_CODE[code];
    return d ? d.nom : code;
  }
  function fmt(n) { return n.toLocaleString("fr-FR"); }
  function rateClass(t) { return t >= 62 ? "good" : t >= 50 ? "mid" : "low"; }
  function rateColor(t) { return t >= 62 ? "#2e7d5b" : t >= 50 ? "#c08a2a" : "#b14a3c"; }

  // -------- index départements --------
  var DEP_BY_CODE = {};
  DEPS.forEach(function (d) { DEP_BY_CODE[d.code] = d; });

  // -------- stats par département + prior --------
  var DEP_STATS = {}; // code -> {n, presentes, sumW, mean}
  SCHOOLS.forEach(function (s) {
    var st = DEP_STATS[s.dep] || (DEP_STATS[s.dep] = { n: 0, presentes: 0, sumW: 0 });
    st.n++; st.presentes += s.presentes; st.sumW += s.taux * s.presentes;
  });
  Object.keys(DEP_STATS).forEach(function (c) {
    var st = DEP_STATS[c];
    st.mean = st.presentes ? st.sumW / st.presentes : 57;
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

  // communes uniques (pour autocomplétion)
  var COMMUNES = (function () {
    var seen = {}, out = [];
    SCHOOLS.forEach(function (s) {
      var key = s.ville + "|" + s.dep;
      if (!seen[key]) { seen[key] = true; out.push({ ville: s.ville, dep: s.dep }); }
    });
    out.sort(function (a, b) { return a.ville.localeCompare(b.ville, "fr"); });
    return out;
  })();

  // ====================================================================
  // Navigation par onglets
  // ====================================================================
  var tabs = document.querySelectorAll(".tab");
  var navBtns = document.querySelectorAll("[data-tab]");
  function showTab(name) {
    tabs.forEach(function (t) { t.classList.toggle("active", t.id === "tab-" + name); });
    document.querySelectorAll(".nav-links button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    document.getElementById("navLinks").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  navBtns.forEach(function (b) {
    b.addEventListener("click", function (e) {
      var t = b.getAttribute("data-tab");
      if (t) { e.preventDefault(); showTab(t); }
    });
  });
  document.getElementById("navToggle").addEventListener("click", function () {
    document.getElementById("navLinks").classList.toggle("open");
  });

  // ====================================================================
  // Onglet ACCUEIL — recommandation
  // ====================================================================
  var cityInput = document.getElementById("cityInput");
  var citySuggest = document.getElementById("citySuggest");
  var recoResult = document.getElementById("reco-result");

  function findCommune(q) {
    var nq = norm(q);
    if (!nq) return null;
    // correspondance exacte d'abord
    var exact = COMMUNES.filter(function (c) { return norm(c.ville) === nq; });
    if (exact.length) return exact[0];
    var starts = COMMUNES.filter(function (c) { return norm(c.ville).indexOf(nq) === 0; });
    if (starts.length) return starts[0];
    var contains = COMMUNES.filter(function (c) { return norm(c.ville).indexOf(nq) >= 0; });
    return contains.length ? contains[0] : null;
  }

  function renderSuggest(q) {
    var nq = norm(q);
    if (!nq) { citySuggest.style.display = "none"; return; }
    var matches = COMMUNES.filter(function (c) { return norm(c.ville).indexOf(nq) >= 0; })
      .sort(function (a, b) {
        return (norm(a.ville).indexOf(nq)) - (norm(b.ville).indexOf(nq));
      }).slice(0, 8);
    if (!matches.length) { citySuggest.style.display = "none"; return; }
    citySuggest.innerHTML = matches.map(function (c) {
      return '<button data-city="' + c.ville + '"><span class="s-city">' + c.ville +
        '</span> <span class="s-dep">' + c.dep + " · " + depName(c.dep) + "</span></button>";
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

  function recommend(ville, dep) {
    var list = SCHOOLS.filter(function (s) { return s.ville === ville && s.dep === dep; })
      .sort(function (a, b) { return b.score - a.score; });
    if (!list.length) {
      recoResult.innerHTML = '<div class="search-card"><h3 style="color:#fff;font-family:var(--serif)">Aucune auto-école trouvée pour « ' + ville + ' »</h3>' +
        '<p style="color:#cdd6e3">Essayez une grande ville proche, ou explorez la carte des départements.</p></div>';
      return;
    }
    var best = list[0];
    var totalPres = list.reduce(function (a, s) { return a + s.presentes; }, 0);
    var html = '';
    html += '<div class="reco-hero">';
    html += '<div><span class="badge">Recommandation · ' + ville + '</span>';
    html += '<h3>' + best.nom + '</h3>';
    html += '<div class="addr">' + best.adresse + '</div>';
    html += '<div class="reco-metrics">';
    html += '<div class="m"><div class="v">' + best.taux.toFixed(0) + '%</div><div class="k">Taux de réussite</div></div>';
    html += '<div class="m"><div class="v">' + fmt(best.presentes) + '</div><div class="k">Présentés au permis B</div></div>';
    html += '<div class="m"><div class="v">' + best.score.toFixed(0) + '</div><div class="k">Score pondéré</div></div>';
    html += '</div></div>';
    html += scoreRing(best.score);
    html += '</div>';

    // autres écoles de la ville
    if (list.length > 1) {
      html += '<div class="card" style="margin-top:1.4rem">';
      html += '<h3 style="font-family:var(--serif)">Les autres auto-écoles de ' + ville + '</h3>';
      html += '<p class="muted" style="margin-bottom:1rem">' + list.length + ' auto-écoles · ' + fmt(totalPres) + ' candidats présentés au total. Classées par Score Boussole.</p>';
      html += '<div class="table-wrap" style="box-shadow:none;border:1px solid var(--line)"><table class="ranking"><thead><tr>' +
        '<th>#</th><th>Auto-école</th><th>Taux</th><th>Présentés</th><th>Score</th></tr></thead><tbody>';
      list.forEach(function (s, i) {
        html += '<tr><td><span class="rank-badge ' + (i < 3 ? "top" + (i + 1) : "") + '">' + (i + 1) + '</span></td>' +
          '<td class="ae-name">' + s.nom + '</td>' +
          '<td><span class="rate" style="color:' + rateColor(s.taux) + '">' + s.taux.toFixed(0) + '%</span></td>' +
          '<td>' + fmt(s.presentes) + '</td>' +
          '<td><span class="pill ' + rateClass(s.score) + '">' + s.score.toFixed(0) + '</span></td></tr>';
      });
      html += '</tbody></table></div></div>';
    }
    recoResult.innerHTML = html;
    recoResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function doReco() {
    var c = findCommune(cityInput.value);
    citySuggest.style.display = "none";
    if (!c) {
      recoResult.innerHTML = '<div class="search-card"><h3 style="color:#fff;font-family:var(--serif)">Ville introuvable</h3>' +
        '<p style="color:#cdd6e3">Nous ne couvrons pas encore « ' + (cityInput.value || "") + ' ». Essayez une ville plus grande à proximité, ou parcourez la carte.</p></div>';
      return;
    }
    cityInput.value = c.ville;
    recommend(c.ville, c.dep);
  }

  cityInput.addEventListener("input", function () { renderSuggest(cityInput.value); });
  cityInput.addEventListener("keydown", function (e) { if (e.key === "Enter") doReco(); });
  document.getElementById("recoBtn").addEventListener("click", doReco);
  citySuggest.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    cityInput.value = btn.getAttribute("data-city");
    doReco();
  });
  document.querySelectorAll(".chips button").forEach(function (b) {
    b.addEventListener("click", function () { cityInput.value = b.getAttribute("data-city"); doReco(); });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".field")) citySuggest.style.display = "none";
  });

  // ====================================================================
  // Statistiques nationales (accueil)
  // ====================================================================
  (function nationalStats() {
    var el = document.getElementById("nationalStats");
    if (!el) return;
    var totalPres = SCHOOLS.reduce(function (a, s) { return a + s.presentes; }, 0);
    var best = SCHOOLS.slice().sort(function (a, b) { return b.score - a.score; })[0];
    var cards = [
      { v: fmt(SCHOOLS.length), k: "auto-écoles référencées" },
      { v: Object.keys(DEP_STATS).length, k: "départements couverts" },
      { v: NAT_MEAN.toFixed(0) + "%", k: "taux de réussite moyen" },
      { v: fmt(totalPres), k: "candidats au permis B" }
    ];
    el.innerHTML = cards.map(function (c) {
      return '<div class="card"><div class="num">' + c.v + '</div><h3>' + c.k + '</h3></div>';
    }).join("");
  })();

  // ====================================================================
  // Onglet CARTE — projection SVG + choropleth + interaction
  // ====================================================================
  var MAP_W = 600, MAP_H = 560, PAD = 14;
  var proj = (function () {
    var minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    function scan(coords) {
      if (typeof coords[0] === "number") {
        if (coords[0] < minLon) minLon = coords[0];
        if (coords[0] > maxLon) maxLon = coords[0];
        if (coords[1] < minLat) minLat = coords[1];
        if (coords[1] > maxLat) maxLat = coords[1];
      } else coords.forEach(scan);
    }
    GEO.features.forEach(function (f) { scan(f.geometry.coordinates); });
    var midLat = (minLat + maxLat) / 2;
    var kx = Math.cos(midLat * Math.PI / 180);
    var xMin = minLon * kx, xMax = maxLon * kx;
    var scale = Math.min((MAP_W - 2 * PAD) / (xMax - xMin), (MAP_H - 2 * PAD) / (maxLat - minLat));
    var offX = (MAP_W - (xMax - xMin) * scale) / 2;
    var offY = (MAP_H - (maxLat - minLat) * scale) / 2;
    return function (lon, lat) {
      var x = offX + (lon * kx - xMin) * scale;
      var y = offY + (maxLat - lat) * scale;
      return [x, y];
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
    return polys.map(function (poly) {
      return poly.map(ringToPath).join("");
    }).join("");
  }

  // échelle de couleur (champagne -> vert profond) selon le taux moyen
  var depMeans = Object.keys(DEP_STATS).map(function (c) { return DEP_STATS[c].mean; });
  var loMean = Math.min.apply(null, depMeans), hiMean = Math.max.apply(null, depMeans);
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function choro(mean) {
    if (mean == null) return "#e7e0d0";
    var t = (mean - loMean) / (hiMean - loMean || 1);
    t = Math.max(0, Math.min(1, t));
    // #ecdcbd (sable) -> #2f7d5b (vert)
    var r = lerp(236, 47, t), g = lerp(220, 125, t), b = lerp(189, 91, t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  var mapSvg = document.getElementById("france-map");
  var tooltip = document.getElementById("mapTooltip");
  var selectedDep = null;

  function buildMap() {
    if (!mapSvg) return;
    var paths = GEO.features.map(function (f) {
      var code = f.properties.code;
      var st = DEP_STATS[code];
      var fill = choro(st ? st.mean : null);
      return '<path class="dep" d="' + geoToPath(f.geometry) + '" data-code="' + code +
        '" fill="' + fill + '"></path>';
    }).join("");
    mapSvg.innerHTML = paths;

    mapSvg.querySelectorAll("path.dep").forEach(function (p) {
      var code = p.getAttribute("data-code");
      p.addEventListener("mousemove", function (e) {
        var st = DEP_STATS[code];
        tooltip.innerHTML = "<strong>" + code + " · " + depName(code) + "</strong>" +
          (st ? "<br>Taux moyen : " + st.mean.toFixed(0) + "% · " + st.n + " auto-écoles" : "<br>Données à venir");
        tooltip.style.left = (e.clientX + 14) + "px";
        tooltip.style.top = (e.clientY + 14) + "px";
        tooltip.style.opacity = "1";
      });
      p.addEventListener("mouseleave", function () { tooltip.style.opacity = "0"; });
      p.addEventListener("click", function () { selectDep(code); });
    });

    // légende
    var leg = document.getElementById("legendScale");
    if (leg) {
      var n = 6, html = "";
      for (var i = 0; i < n; i++) html += '<i style="background:' + choro(loMean + (hiMean - loMean) * i / (n - 1)) + '"></i>';
      leg.innerHTML = html;
      document.getElementById("legendLow").textContent = loMean.toFixed(0) + "%";
      document.getElementById("legendHigh").textContent = hiMean.toFixed(0) + "%";
    }
  }

  function selectDep(code) {
    selectedDep = code;
    mapSvg.querySelectorAll("path.dep").forEach(function (p) {
      p.classList.toggle("selected", p.getAttribute("data-code") === code);
    });
    renderMapSide(code);
    // synchronise l'annuaire
    fDep.value = code;
    populateVille();
    applyFilters();
  }

  function renderMapSide(code) {
    var el = document.getElementById("mapSide");
    var st = DEP_STATS[code];
    if (!st) { el.innerHTML = '<div class="card"><p class="muted">Pas encore de données pour ce département.</p></div>'; return; }
    var list = SCHOOLS.filter(function (s) { return s.dep === code; })
      .sort(function (a, b) { return b.score - a.score; });
    var top = list.slice(0, 5);
    var html = '<div class="card">';
    html += '<span class="eyebrow">' + code + " · Département</span>";
    html += "<h3>" + depName(code) + "</h3>";
    html += '<div class="dep-stats">' +
      '<div class="m"><div class="v">' + st.n + '</div><div class="k">auto-écoles</div></div>' +
      '<div class="m"><div class="v">' + st.mean.toFixed(0) + '%</div><div class="k">taux moyen</div></div>' +
      '<div class="m"><div class="v">' + fmt(st.presentes) + '</div><div class="k">présentés</div></div>' +
      "</div>";
    html += '<h4 style="font-family:var(--serif);margin-bottom:.4rem">Top auto-écoles</h4>';
    html += '<ul class="mini-list">';
    top.forEach(function (s, i) {
      html += '<li><span class="r">' + (i + 1) + '</span><div class="nm"><b>' + s.nom + '</b>' +
        '<span>' + s.ville + ' · ' + fmt(s.presentes) + ' présentés</span></div>' +
        '<span class="rt" style="color:' + rateColor(s.taux) + '">' + s.taux.toFixed(0) + '%</span></li>';
    });
    html += "</ul>";
    html += '<button class="btn dark" style="margin-top:1.2rem" id="seeDirectory">Voir l\'annuaire complet du ' + code + '</button>';
    html += "</div>";
    el.innerHTML = html;
    var b = document.getElementById("seeDirectory");
    if (b) b.addEventListener("click", function () {
      document.querySelector("#tab-carte .section.alt").scrollIntoView({ behavior: "smooth" });
    });
  }

  // ====================================================================
  // Onglet CARTE — annuaire (filtres + tri)
  // ====================================================================
  var fDep = document.getElementById("fDep");
  var fVille = document.getElementById("fVille");
  var fSearch = document.getElementById("fSearch");
  var rankBody = document.getElementById("rankBody");
  var resultCount = document.getElementById("resultCount");
  var sortKey = "taux", sortDir = -1;

  (function populateDep() {
    var codes = Object.keys(DEP_STATS).sort();
    var html = '<option value="">Tous les départements</option>';
    codes.forEach(function (c) { html += '<option value="' + c + '">' + c + " · " + depName(c) + "</option>"; });
    fDep.innerHTML = html;
  })();

  function populateVille() {
    var dep = fDep.value;
    var villes = COMMUNES.filter(function (c) { return !dep || c.dep === dep; })
      .map(function (c) { return c.ville; });
    villes = villes.filter(function (v, i) { return villes.indexOf(v) === i; }).sort(function (a, b) { return a.localeCompare(b, "fr"); });
    var html = '<option value="">Toutes les villes</option>';
    villes.forEach(function (v) { html += '<option value="' + v + '">' + v + "</option>"; });
    fVille.innerHTML = html;
  }
  populateVille();

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
    resultCount.textContent = list.length + " auto-école" + (list.length > 1 ? "s" : "");
    if (!list.length) {
      rankBody.innerHTML = '<tr><td colspan="6"><div class="empty">Aucune auto-école ne correspond à ces critères.</div></td></tr>';
      return;
    }
    var rows = list.map(function (s, i) {
      var w = Math.max(4, Math.min(100, s.taux));
      return '<tr>' +
        '<td><span class="rank-badge ' + (i < 3 ? "top" + (i + 1) : "") + '">' + (i + 1) + "</span></td>" +
        '<td><span class="ae-name">' + s.nom + '</span><br><span class="ae-city">' + s.ville + " (" + s.dep + ")</span></td>" +
        "<td>" + s.dep + "</td>" +
        '<td><span class="rate" style="color:' + rateColor(s.taux) + '">' + s.taux.toFixed(0) + "%</span>" +
        '<div class="bar"><i style="width:' + w + "%;background:" + rateColor(s.taux) + '"></i></div></td>' +
        "<td>" + fmt(s.presentes) + "</td>" +
        '<td><span class="pill ' + rateClass(s.score) + '">' + s.score.toFixed(0) + "</span></td>" +
        "</tr>";
    }).join("");
    rankBody.innerHTML = rows;
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
      th.classList.add("sorted");
      if (sortDir === 1) th.classList.add("asc");
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
      window.location.href = "mailto:contact@permis-boussole.fr?subject=" +
        encodeURIComponent("[" + subject + "] " + name) + "&body=" + encodeURIComponent(body);
      document.getElementById("formOk").style.display = "block";
    });
  }

  // ====================================================================
  // Init
  // ====================================================================
  document.getElementById("year").textContent = "2026";
  buildMap();
  applyFilters();
  // panneau latéral par défaut
  document.getElementById("mapSide").innerHTML =
    '<div class="card"><span class="eyebrow">Mode d\'emploi</span><h3>Cliquez un département</h3>' +
    '<p class="muted">Survolez la carte pour voir le taux de réussite moyen, cliquez pour afficher ' +
    'le détail du département, ses meilleures auto-écoles et filtrer l\'annuaire ci-dessous.</p></div>';

})();
