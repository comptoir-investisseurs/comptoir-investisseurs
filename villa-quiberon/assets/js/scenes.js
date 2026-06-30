/* =========================================================================
   Villa Quiberon — Définition des scènes du parcours immersif
   -------------------------------------------------------------------------
   Chaque scène = une pièce. Le défilement nous fait "marcher" de l'une à
   l'autre sans coupure (dolly + fondu + passage de seuil via le calque fg).

   ► POUR UTILISER VOS VRAIES PHOTOS / VIDÉOS :
     Ajoutez `img:"chemin/photo.jpg"` (ou `video:"clip.mp4"`) à une scène.
     Le visuel réel remplacera alors la scène illustrée, sans rien casser.
   ========================================================================= */
(function (global) {
  // Dégradés ciel/mer réutilisables (jour & couchant)
  const SKY_DAY = `
    <linearGradient id="$_sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cfe2e9"/><stop offset=".55" stop-color="#bcd4dd"/>
      <stop offset="1" stop-color="#9fbecb"/></linearGradient>
    <linearGradient id="$_sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a7e96"/><stop offset="1" stop-color="#1f4d61"/></linearGradient>
    <radialGradient id="$_sun" cx=".7" cy=".28" r=".4">
      <stop offset="0" stop-color="#fff6e0" stop-opacity=".9"/>
      <stop offset="1" stop-color="#fff6e0" stop-opacity="0"/></radialGradient>`;
  const SKY_SET = `
    <linearGradient id="$_sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b5a86"/><stop offset=".4" stop-color="#c98f7a"/>
      <stop offset=".75" stop-color="#f0b072"/><stop offset="1" stop-color="#f6cf8e"/></linearGradient>
    <linearGradient id="$_sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#caa06a"/><stop offset=".4" stop-color="#6e6f86"/>
      <stop offset="1" stop-color="#33405a"/></linearGradient>
    <radialGradient id="$_sun" cx=".68" cy=".34" r=".34">
      <stop offset="0" stop-color="#fff1cf"/><stop offset=".4" stop-color="#ffd089" stop-opacity=".7"/>
      <stop offset="1" stop-color="#ffd089" stop-opacity="0"/></radialGradient>`;

  // Petit utilitaire : remplace le marqueur $ par un préfixe unique par scène
  const px = (svg, p) => svg.replace(/\$/g, p);

  // Calque de premier plan partagé : encadrement type "seuil de porte"
  // qui s'agrandit/s'estompe → sensation de franchir une pièce.
  function doorway(p, opts) {
    const o = opts || {};
    const tone = o.tone || "#0a0f14";
    return px(`
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="$_dwL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="${tone}" stop-opacity="0"/></linearGradient>
        <linearGradient id="$_dwR" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="${tone}" stop-opacity="0"/></linearGradient>
        <linearGradient id="$_dwT" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="${tone}" stop-opacity="0"/></linearGradient>
      </defs>
      <rect x="0" y="0" width="300" height="900" fill="url(#$_dwL)"/>
      <rect x="1300" y="0" width="300" height="900" fill="url(#$_dwR)"/>
      <rect x="0" y="0" width="1600" height="170" fill="url(#$_dwT)"/>
      <path d="M0 0 H260 Q150 220 150 470 Q150 720 260 900 H0 Z" fill="${tone}" opacity=".5"/>
      <path d="M1600 0 H1340 Q1450 220 1450 470 Q1450 720 1340 900 H1600 Z" fill="${tone}" opacity=".5"/>
    </svg>`, p);
  }

  // Sol en perspective (lignes de fuite)
  const floor = (col1, col2) => `
    <linearGradient id="$_fl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${col1}"/><stop offset="1" stop-color="${col2}"/></linearGradient>`;

  /* ---------------------------------------------------------------------- */
  const SCENES = [
    /* 0 — ARRIVÉE / FAÇADE -------------------------------------------------*/
    {
      id: "exterieur", chapter: "Arrivée",
      title: "Villa d’exception",
      caption: "Une demeure contemporaine posée sur la presqu’île, à quelques pas de l’océan.",
      specs: ["Quiberon · Morbihan", "≈ 320 m²", "Jusqu’à 12 voyageurs"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>${SKY_DAY}
            <linearGradient id="$_grd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#b9b089"/><stop offset="1" stop-color="#8d8a63"/></linearGradient>
            <linearGradient id="$_hse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#efe9dc"/><stop offset="1" stop-color="#d8cfba"/></linearGradient></defs>
          <rect width="1600" height="900" fill="url(#$_sky)"/>
          <circle cx="1120" cy="250" r="260" fill="url(#$_sun)"/>
          <rect y="430" width="1600" height="120" fill="url(#$_sea)"/>
          <rect y="540" width="1600" height="360" fill="url(#$_grd)"/>
          <!-- pins maritimes -->
          <g fill="#2f4332" opacity=".9">
            <path d="M180 540 q14-150 28 0 z"/><rect x="190" y="520" width="6" height="40" fill="#5a4631"/>
            <path d="M120 560 q22-200 44 0 z"/><rect x="138" y="535" width="7" height="40" fill="#5a4631"/>
          </g>
          <g fill="#33493a" opacity=".85">
            <path d="M1430 560 q26-210 52 0 z"/><rect x="1452" y="535" width="8" height="46" fill="#5a4631"/>
            <path d="M1500 555 q18-160 36 0 z"/></g>
          <!-- villa -->
          <g>
            <rect x="560" y="360" width="520" height="240" fill="url(#$_hse)"/>
            <rect x="560" y="360" width="520" height="34" fill="#cdbf9f"/>
            <rect x="1030" y="300" width="160" height="300" fill="#e6dfd0"/>
            <rect x="620" y="430" width="90" height="120" fill="#2c3b44"/>
            <rect x="740" y="430" width="90" height="120" fill="#33424b"/>
            <rect x="1060" y="360" width="100" height="170" fill="#2c3b44"/>
            <rect x="880" y="470" width="70" height="130" fill="#1f2a31"/><!-- porte -->
            <rect x="980" y="470" width="50" height="130" fill="#33424b"/>
          </g>
          <!-- allée -->
          <path d="M820 900 L900 600 L1010 600 L1180 900 Z" fill="#c9bf9f"/>
          <ellipse cx="1000" cy="612" rx="220" ry="20" fill="#000" opacity=".08"/>
        </svg>`, p),
      fg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs><linearGradient id="$_lv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1c3326"/><stop offset="1" stop-color="#27452f"/></linearGradient></defs>
          <g fill="url(#$_lv)" opacity=".96">
            <path d="M0 900 V640 q120 30 150 120 q40 120 -10 140 Z"/>
            <path d="M1600 900 V600 q-150 20 -190 150 q-30 110 30 150 Z"/>
          </g>
        </svg>`, p),
    },

    /* 1 — ENTRÉE / HALL ----------------------------------------------------*/
    {
      id: "entree", chapter: "Le seuil",
      title: "Entrée & hall lumineux",
      caption: "Un volume traversant, baigné de lumière, qui annonce le calme des lieux.",
      specs: ["Double hauteur", "Escalier sur-mesure", "Lumière zénithale"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="$_w" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#e7e0d2"/><stop offset="1" stop-color="#cfc6b3"/></linearGradient>
            ${floor("#c9ae82", "#a98a5d")}
            <radialGradient id="$_light" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff4d6" stop-opacity=".8"/><stop offset=".6" stop-color="#fff4d6" stop-opacity="0"/></radialGradient></defs>
          <rect width="1600" height="640" fill="url(#$_w)"/>
          <rect y="600" width="1600" height="300" fill="url(#$_fl)"/>
          <rect width="1600" height="900" fill="url(#$_light)" opacity=".5"/>
          <!-- baie zénithale -->
          <rect x="620" y="0" width="360" height="250" fill="#eef3f0"/>
          <line x1="740" y1="0" x2="740" y2="250" stroke="#c7c0ad" stroke-width="4"/>
          <line x1="860" y1="0" x2="860" y2="250" stroke="#c7c0ad" stroke-width="4"/>
          <!-- escalier -->
          <g fill="#b89a6e">
            <rect x="1120" y="560" width="360" height="20"/><rect x="1150" y="500" width="330" height="20"/>
            <rect x="1180" y="440" width="300" height="20"/><rect x="1210" y="380" width="270" height="20"/>
            <rect x="1240" y="320" width="240" height="20"/></g>
          <rect x="1120" y="320" width="14" height="260" fill="#8a6f48"/>
          <!-- console + miroir -->
          <rect x="180" y="520" width="240" height="16" fill="#3a4750"/>
          <rect x="200" y="536" width="14" height="120" fill="#2c3840"/><rect x="386" y="536" width="14" height="120" fill="#2c3840"/>
          <rect x="230" y="300" width="140" height="200" rx="6" fill="#d8e0e2" opacity=".7"/>
          <!-- plante -->
          <path d="M470 660 q-60-150 0-220 q40 70 0 220" fill="#33493a"/>
          <path d="M470 660 q60-150 0-220" fill="#3f5a46"/>
          <rect x="450" y="650" width="40" height="50" fill="#7d6a4d"/>
          <ellipse cx="780" cy="780" rx="520" ry="40" fill="#000" opacity=".06"/>
        </svg>`, p),
      fg: (p) => doorway(p),
    },

    /* 2 — GRAND SALON ------------------------------------------------------*/
    {
      id: "salon", chapter: "Pièce de vie",
      title: "Le grand salon",
      caption: "Un double séjour ouvert sur l’océan : cheminée, baies toute hauteur, lumière du soir.",
      specs: ["Cheminée", "Baies plein sud", "Vue mer panoramique"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>${SKY_DAY}
            <linearGradient id="$_w" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#33414b"/><stop offset="1" stop-color="#222d35"/></linearGradient>
            ${floor("#bda079", "#8f7551")}
            <radialGradient id="$_glow" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#e9c98a" stop-opacity=".18"/><stop offset="1" stop-color="#e9c98a" stop-opacity="0"/></radialGradient></defs>
          <rect width="1600" height="640" fill="url(#$_w)"/>
          <rect y="600" width="1600" height="300" fill="url(#$_fl)"/>
          <!-- grande baie vitrée sur mer -->
          <rect x="760" y="90" width="720" height="520" fill="url(#$_sky)"/>
          <circle cx="1180" cy="250" r="180" fill="url(#$_sun)"/>
          <rect x="760" y="380" width="720" height="230" fill="url(#$_sea)"/>
          <g stroke="#1a242b" stroke-width="10"><line x1="1000" y1="90" x2="1000" y2="610"/><line x1="1240" y1="90" x2="1240" y2="610"/></g>
          <rect x="752" y="90" width="14" height="520" fill="#1a242b"/>
          <rect width="1600" height="900" fill="url(#$_glow)"/>
          <!-- cheminée -->
          <rect x="120" y="300" width="220" height="320" fill="#2a343c"/>
          <rect x="150" y="430" width="160" height="120" fill="#1a2026"/>
          <rect x="160" y="445" width="140" height="95" fill="#c87a3a" opacity=".55"/>
          <rect x="110" y="290" width="240" height="22" fill="#3c4954"/>
          <!-- canapé -->
          <g>
            <rect x="430" y="560" width="520" height="120" rx="20" fill="#3d4a54"/>
            <rect x="430" y="500" width="520" height="80" rx="18" fill="#46545f"/>
            <rect x="470" y="520" width="120" height="80" rx="14" fill="#c8a86a" opacity=".85"/>
            <rect x="640" y="520" width="120" height="80" rx="14" fill="#b7c2c4" opacity=".7"/>
          </g>
          <!-- table basse + tapis -->
          <ellipse cx="690" cy="760" rx="430" ry="60" fill="#6e5a3d" opacity=".5"/>
          <rect x="560" y="710" width="260" height="50" rx="8" fill="#1e262c"/>
          <ellipse cx="690" cy="800" rx="360" ry="34" fill="#000" opacity=".18"/>
        </svg>`, p),
      fg: (p) => doorway(p),
    },

    /* 3 — CUISINE & SALLE À MANGER -----------------------------------------*/
    {
      id: "cuisine", chapter: "Convivialité",
      title: "Cuisine & salle à manger",
      caption: "Une cuisine d’architecte entièrement équipée, son îlot central et sa grande tablée.",
      specs: ["Îlot central", "Électroménager pro", "Cave à vin"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="$_w" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#2c3a37"/><stop offset="1" stop-color="#1d2826"/></linearGradient>
            ${floor("#c6b48f", "#9a8763")}
            <linearGradient id="$_cab" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#3a4a45"/><stop offset="1" stop-color="#2a3733"/></linearGradient>
            <radialGradient id="$_pl" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ffe6ad" stop-opacity=".55"/><stop offset="1" stop-color="#ffe6ad" stop-opacity="0"/></radialGradient></defs>
          <rect width="1600" height="640" fill="url(#$_w)"/>
          <rect y="600" width="1600" height="300" fill="url(#$_fl)"/>
          <!-- meubles hauts + crédence -->
          <rect x="120" y="180" width="600" height="120" fill="url(#$_cab)"/>
          <rect x="120" y="360" width="600" height="40" fill="#cdbf9f"/>
          <rect x="120" y="400" width="600" height="180" fill="url(#$_cab)"/>
          <!-- fenêtre -->
          <rect x="780" y="150" width="700" height="260" fill="#cfe2e9"/>
          <rect x="780" y="320" width="700" height="90" fill="#3a7e96"/>
          <g stroke="#1a242b" stroke-width="8"><line x1="1015" y1="150" x2="1015" y2="410"/><line x1="1250" y1="150" x2="1250" y2="410"/></g>
          <!-- îlot -->
          <rect x="430" y="560" width="560" height="150" rx="6" fill="url(#$_cab)"/>
          <rect x="420" y="548" width="580" height="22" rx="4" fill="#e7dcc4"/>
          <!-- suspensions -->
          <g stroke="#8a6f48" stroke-width="3"><line x1="560" y1="300" x2="560" y2="430"/><line x1="700" y1="300" x2="700" y2="430"/><line x1="840" y1="300" x2="840" y2="430"/></g>
          <g fill="#c8a86a"><circle cx="560" cy="445" r="22"/><circle cx="700" cy="445" r="22"/><circle cx="840" cy="445" r="22"/></g>
          <rect width="1600" height="640" fill="url(#$_pl)"/>
          <!-- table à manger -->
          <rect x="1080" y="620" width="420" height="40" rx="6" fill="#7d6648"/>
          <g fill="#2e3a40"><rect x="1110" y="660" width="18" height="90"/><rect x="1450" y="660" width="18" height="90"/></g>
          <ellipse cx="780" cy="820" rx="560" ry="44" fill="#000" opacity=".14"/>
        </svg>`, p),
      fg: (p) => doorway(p),
    },

    /* 4 — SUITE PARENTALE --------------------------------------------------*/
    {
      id: "suite", chapter: "Suite parentale",
      title: "La suite des maîtres",
      caption: "Une chambre principale plein sud, son dressing et sa salle de bain privative.",
      specs: ["Lit king size", "Dressing", "Salle de bain privative"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>${SKY_DAY}
            <linearGradient id="$_w" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#3a3a44"/><stop offset="1" stop-color="#28282f"/></linearGradient>
            ${floor("#b6a07c", "#8b7656")}</defs>
          <rect width="1600" height="640" fill="url(#$_w)"/>
          <rect y="600" width="1600" height="300" fill="url(#$_fl)"/>
          <!-- baie + voilage -->
          <rect x="1060" y="120" width="420" height="490" fill="url(#$_sky)"/>
          <rect x="1060" y="400" width="420" height="210" fill="url(#$_sea)"/>
          <g fill="#f3efe6" opacity=".5"><rect x="1060" y="120" width="70" height="490"/><rect x="1180" y="120" width="60" height="490"/><rect x="1320" y="120" width="70" height="490"/></g>
          <!-- tête de lit -->
          <rect x="180" y="300" width="620" height="220" rx="10" fill="#41464f"/>
          <rect x="180" y="300" width="620" height="220" rx="10" fill="none" stroke="#c8a86a" stroke-width="3" opacity=".5"/>
          <!-- lit -->
          <rect x="160" y="520" width="660" height="150" rx="14" fill="#e7dcc4"/>
          <rect x="160" y="500" width="660" height="60" rx="14" fill="#f3ede0"/>
          <rect x="200" y="500" width="150" height="80" rx="12" fill="#fff" opacity=".85"/>
          <rect x="380" y="500" width="150" height="80" rx="12" fill="#fff" opacity=".85"/>
          <rect x="160" y="610" width="660" height="60" rx="10" fill="#c8a86a" opacity=".8"/>
          <!-- lampes de chevet -->
          <g fill="#2e333b"><rect x="60" y="540" width="90" height="90"/><rect x="830" y="540" width="90" height="90"/></g>
          <g fill="#e9c98a"><path d="M70 500 h70 l-12 40 h-46 z"/><path d="M840 500 h70 l-12 40 h-46 z"/></g>
          <ellipse cx="500" cy="800" rx="520" ry="40" fill="#000" opacity=".14"/>
        </svg>`, p),
      fg: (p) => doorway(p),
    },

    /* 5 — LES CHAMBRES -----------------------------------------------------*/
    {
      id: "chambres", chapter: "Pour tous",
      title: "Six chambres, huit lits",
      caption: "De vastes chambres à la literie hôtelière : la ville accueille familles et tribus.",
      specs: ["6 chambres", "8 lits", "Linge premium"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="$_w" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#33414b"/><stop offset="1" stop-color="#232d34"/></linearGradient>
            ${floor("#bda079", "#90764f")}
            <radialGradient id="$_pl" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ffe6ad" stop-opacity=".4"/><stop offset="1" stop-color="#ffe6ad" stop-opacity="0"/></radialGradient></defs>
          <rect width="1600" height="640" fill="url(#$_w)"/>
          <rect y="600" width="1600" height="300" fill="url(#$_fl)"/>
          <rect x="640" y="140" width="320" height="220" fill="#2a343c"/>
          <rect x="660" y="160" width="280" height="180" fill="#8fb0bf" opacity=".5"/>
          <rect width="1600" height="640" fill="url(#$_pl)"/>
          <!-- deux lits jumeaux -->
          <g>
            <rect x="170" y="330" width="360" height="170" rx="8" fill="#3f4750"/>
            <rect x="150" y="500" width="400" height="120" rx="12" fill="#e7dcc4"/>
            <rect x="150" y="486" width="400" height="44" rx="12" fill="#f3ede0"/>
            <rect x="180" y="488" width="120" height="56" rx="10" fill="#fff" opacity=".85"/>
            <rect x="150" y="565" width="400" height="55" rx="8" fill="#9fb6bf" opacity=".75"/>
          </g>
          <g>
            <rect x="1070" y="330" width="360" height="170" rx="8" fill="#3f4750"/>
            <rect x="1050" y="500" width="400" height="120" rx="12" fill="#e7dcc4"/>
            <rect x="1050" y="486" width="400" height="44" rx="12" fill="#f3ede0"/>
            <rect x="1320" y="488" width="120" height="56" rx="10" fill="#fff" opacity=".85"/>
            <rect x="1050" y="565" width="400" height="55" rx="8" fill="#c8a86a" opacity=".75"/>
          </g>
          <!-- table de nuit centrale -->
          <rect x="740" y="540" width="120" height="90" fill="#2e333b"/>
          <circle cx="800" cy="520" r="18" fill="#e9c98a"/>
          <ellipse cx="800" cy="800" rx="640" ry="44" fill="#000" opacity=".12"/>
        </svg>`, p),
      fg: (p) => doorway(p),
    },

    /* 6 — SALLE DE BAIN / SPA ----------------------------------------------*/
    {
      id: "bain", chapter: "Bien-être",
      title: "Salles de bain spa",
      caption: "Quatre salles de bain habillées de pierre : baignoire îlot et douche à l’italienne.",
      specs: ["4 salles de bain", "Baignoire îlot", "Douche à l’italienne"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>${SKY_DAY}
            <linearGradient id="$_w" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#d7d2c6"/><stop offset="1" stop-color="#bcb6a6"/></linearGradient>
            ${floor("#cfc7b4", "#a8a08c")}
            <radialGradient id="$_st" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
          <rect width="1600" height="640" fill="url(#$_w)"/>
          <rect width="1600" height="900" fill="url(#$_st)"/>
          <rect y="600" width="1600" height="300" fill="url(#$_fl)"/>
          <!-- fenêtre verticale -->
          <rect x="120" y="150" width="180" height="460" fill="url(#$_sky)"/>
          <rect x="120" y="430" width="180" height="180" fill="url(#$_sea)"/>
          <!-- baignoire îlot -->
          <g>
            <ellipse cx="700" cy="640" rx="280" ry="90" fill="#000" opacity=".08"/>
            <rect x="470" y="470" width="460" height="170" rx="85" fill="#f4f1ea"/>
            <rect x="490" y="490" width="420" height="120" rx="60" fill="#dfe7e6"/>
          </g>
          <!-- robinet -->
          <path d="M700 470 v-70 h60" stroke="#b89a6e" stroke-width="8" fill="none"/>
          <!-- meuble vasque -->
          <rect x="1120" y="430" width="360" height="190" fill="#3a4a45"/>
          <rect x="1110" y="418" width="380" height="20" fill="#e7dcc4"/>
          <rect x="1180" y="250" width="240" height="150" rx="6" fill="#d8e0e2" opacity=".75"/>
          <rect x="1190" y="438" width="100" height="14" rx="7" fill="#c9c2b1"/>
          <!-- plante & serviettes -->
          <path d="M360 660 q-40-130 0-180 q30 60 0 180" fill="#33493a"/>
          <ellipse cx="700" cy="820" rx="520" ry="40" fill="#000" opacity=".1"/>
        </svg>`, p),
      fg: (p) => doorway(p),
    },

    /* 7 — TERRASSE & PISCINE -----------------------------------------------*/
    {
      id: "terrasse", chapter: "Dehors",
      title: "Terrasse & piscine",
      caption: "120 m² de terrasse plein sud, piscine chauffée et cuisine d’été face au large.",
      specs: ["Piscine chauffée", "Cuisine d’été", "Terrasse 120 m²"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>${SKY_DAY}
            <linearGradient id="$_deck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#d8c39a"/><stop offset="1" stop-color="#b89c70"/></linearGradient>
            <linearGradient id="$_pool" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#6cc0d6"/><stop offset="1" stop-color="#2f8fb0"/></linearGradient></defs>
          <rect width="1600" height="430" fill="url(#$_sky)"/>
          <circle cx="1200" cy="200" r="220" fill="url(#$_sun)"/>
          <rect y="360" width="1600" height="120" fill="url(#$_sea)"/>
          <rect y="460" width="1600" height="440" fill="url(#$_deck)"/>
          <!-- piscine à débordement -->
          <path d="M520 560 H1280 L1360 760 H440 Z" fill="url(#$_pool)"/>
          <path d="M520 560 H1280 l8 22 H512 Z" fill="#fff" opacity=".35"/>
          <g stroke="#fff" stroke-width="3" opacity=".3"><line x1="560" y1="620" x2="1300" y2="620"/><line x1="540" y1="680" x2="1330" y2="680"/></g>
          <!-- bains de soleil -->
          <g fill="#e7dcc4"><rect x="120" y="600" width="220" height="40" rx="10" transform="rotate(-4 230 620)"/>
            <rect x="120" y="560" width="80" height="60" rx="8" transform="rotate(-4 160 590)"/></g>
          <g fill="#e7dcc4"><rect x="120" y="700" width="220" height="40" rx="10" transform="rotate(-4 230 720)"/>
            <rect x="120" y="660" width="80" height="60" rx="8" transform="rotate(-4 160 690)"/></g>
          <!-- parasol -->
          <rect x="380" y="560" width="8" height="200" fill="#5a4631"/>
          <path d="M250 560 q150-90 300 0 z" fill="#c8a86a"/>
          <ellipse cx="800" cy="850" rx="700" ry="40" fill="#000" opacity=".06"/>
        </svg>`, p),
      fg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs><linearGradient id="$_lv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1c3326"/><stop offset="1" stop-color="#27452f"/></linearGradient></defs>
          <g fill="url(#$_lv)" opacity=".95">
            <path d="M1600 900 V560 q-160 10 -210 160 q-30 110 40 180 Z"/>
            <path d="M0 900 V680 q90 20 120 110 q20 70 -20 110 Z"/></g>
        </svg>`, p),
    },

    /* 8 — COUCHER DE SOLEIL (final) ----------------------------------------*/
    {
      id: "horizon", chapter: "L’heure dorée",
      title: "Le large, rien que pour vous",
      caption: "À 200 mètres des plages, les soirs s’étirent face à l’Atlantique.",
      specs: ["200 m des plages", "Plein ouest", "Couchers inoubliables"],
      bg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>${SKY_SET}</defs>
          <rect width="1600" height="520" fill="url(#$_sky)"/>
          <circle cx="1090" cy="360" r="120" fill="#fff2cf"/>
          <circle cx="1090" cy="360" r="300" fill="url(#$_sun)"/>
          <rect y="470" width="1600" height="430" fill="url(#$_sea)"/>
          <!-- reflet soleil -->
          <path d="M1090 470 L1030 900 H1150 Z" fill="#ffe2a6" opacity=".5"/>
          <!-- garde-corps terrasse -->
          <rect y="760" width="1600" height="140" fill="#5a4a3a" opacity=".55"/>
          <g stroke="#2a2118" stroke-width="10" opacity=".7">
            <line x1="120" y1="640" x2="120" y2="780"/><line x1="420" y1="640" x2="420" y2="780"/>
            <line x1="720" y1="640" x2="720" y2="780"/><line x1="1020" y1="640" x2="1020" y2="780"/>
            <line x1="1320" y1="640" x2="1320" y2="780"/></g>
          <rect y="636" width="1600" height="14" fill="#3a2e20" opacity=".7"/>
        </svg>`, p),
      fg: (p) => px(`
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs><radialGradient id="$_v" cx=".5" cy=".5" r=".75">
            <stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0a0f14" stop-opacity=".5"/></radialGradient></defs>
          <rect width="1600" height="900" fill="url(#$_v)"/>
        </svg>`, p),
    },
  ];

  global.VILLA_SCENES = SCENES;
})(window);
