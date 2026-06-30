/* =========================================================================
   Villa Quiberon — Contrôleur d'interface (onglets, header, formulaire)
   ========================================================================= */
(function () {
  /* ---- Loader ---------------------------------------------------------- */
  const hideLoader = () => { const l = document.getElementById("loader"); if (l) l.classList.add("is-done"); };
  window.addEventListener("load", () => setTimeout(hideLoader, 600));
  // Repli : ne jamais bloquer si une ressource externe (polices) traîne.
  setTimeout(hideLoader, 1800);

  /* ---- Onglets / vues -------------------------------------------------- */
  const tabs  = Array.from(document.querySelectorAll("[data-tab]"));
  const views = Array.from(document.querySelectorAll(".view"));
  const tabsWrap = document.getElementById("tabs");
  const toggle   = document.getElementById("menuToggle");

  /* ---- Révélations au défilement (défini avant le 1er activate) -------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.16 });
  function revealScan() {
    document.querySelectorAll(".view.is-active [data-reveal]:not(.in)").forEach((el) => io.observe(el));
  }

  function activate(name, push) {
    views.forEach((v) => v.classList.toggle("is-active", v.id === "view-" + name));
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === name));
    window.scrollTo({ top: 0, behavior: "auto" });
    if (push !== false) history.replaceState(null, "", "#" + name);
    const pb = document.getElementById("journeyProgress");
    if (pb && name !== "decouverte") pb.style.width = "0%";
    closeMenu();
    if (name === "decouverte" && window.VILLA_kickJourney) requestAnimationFrame(() => window.VILLA_kickJourney());
    if (name === "disponibilites" && window.VILLA_initAvailability) window.VILLA_initAvailability();
    revealScan();
  }
  tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.tab)));
  document.querySelectorAll("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => activate(b.dataset.goto)));

  // Au chargement : onglet depuis l'URL (sinon découverte)
  const initial = (location.hash || "#decouverte").slice(1);
  activate(["decouverte", "disponibilites", "contact"].includes(initial) ? initial : "decouverte", false);

  /* ---- Menu mobile ----------------------------------------------------- */
  function closeMenu() { tabsWrap && tabsWrap.classList.remove("open"); toggle && toggle.classList.remove("open"); }
  toggle && toggle.addEventListener("click", () => {
    tabsWrap.classList.toggle("open"); toggle.classList.toggle("open");
  });

  /* ---- Header solide au scroll ---------------------------------------- */
  const header = document.getElementById("siteHeader");
  const onScroll = () => header && header.classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  revealScan();

  /* ---- Formulaire de contact ------------------------------------------ */
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const subject = encodeURIComponent("Demande de séjour — Villa Quiberon");
      const body = encodeURIComponent(
        `Nom : ${f.get("nom") || ""}\nEmail : ${f.get("email") || ""}\nTéléphone : ${f.get("tel") || ""}\n` +
        `Arrivée : ${f.get("arrivee") || ""}\nDépart : ${f.get("depart") || ""}\nVoyageurs : ${f.get("voyageurs") || ""}\n\n` +
        `${f.get("message") || ""}`
      );
      window.location.href = `mailto:contact@villa-quiberon.fr?subject=${subject}&body=${body}`;
      const ok = document.getElementById("formOk");
      if (ok) { ok.classList.add("show"); ok.scrollIntoView({ behavior: "smooth", block: "center" }); }
      form.reset();
    });
  }

  /* ---- Année du pied de page ------------------------------------------ */
  const yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
