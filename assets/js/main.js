/* =================================================================
   QUANTA — interactions & motion orchestration
   Native CSS / WAAPI only. No runtime animation engines.
   Entry orchestration is kept under the 500ms budget and never
   blocks Time-to-Interactive (content is in the DOM at parse time).
   ================================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- Loader (≤500ms, non-blocking overlay) ---------- */
  const loader = $("#loader");
  function finishLoader() {
    if (!loader) return;
    loader.classList.add("is-done");
    // Kick off the hero line reveal as soon as the curtain lifts.
    requestAnimationFrame(playHeroEntrance);
  }
  if (reduceMotion) {
    finishLoader();
  } else {
    // Budget: bar animation is 480ms; lift at 460ms -> total < 500ms.
    window.setTimeout(finishLoader, 460);
  }

  /* ---------- Hero staggered entrance (WAAPI-free, CSS class) ---------- */
  function playHeroEntrance() {
    const lines = $$(".reveal-line > span");
    lines.forEach((el, i) => {
      el.style.transitionDelay = i * 70 + "ms"; // 3 lines -> ~210ms tail
      el.classList.add("in");
    });
    // Other hero blocks
    $$(".hero [data-reveal]").forEach((el, i) => {
      el.style.transitionDelay = 120 + i * 60 + "ms";
      el.classList.add("in");
    });
  }

  /* ---------- Scroll reveals ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" })
    : null;

  $$("[data-reveal]").forEach((el) => {
    if (el.closest(".hero")) return; // hero handled by entrance
    if (io) io.observe(el); else el.classList.add("in");
  });

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    const target = parseFloat(el.getAttribute("data-countup"));
    const suffix = el.getAttribute("data-suffix") || "";
    const decimals = (String(target).split(".")[1] || "").length;
    if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    const dur = 900, start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
  }
  const countObs = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { countUp(e.target); countObs.unobserve(e.target); }
        });
      }, { threshold: 0.6 })
    : null;
  $$("[data-countup]").forEach((el) => { if (countObs) countObs.observe(el); else countUp(el); });

  /* ---------- Gauges: animate --val from 0 on reveal ---------- */
  $$(".gauge__ring").forEach((ring) => {
    const target = getComputedStyle(ring).getPropertyValue("--val").trim() || "0";
    ring.style.setProperty("--val", "0");
    const obs = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              ring.style.setProperty("--val", reduceMotion ? target : target);
              obs.disconnect();
            }
          });
        }, { threshold: 0.5 })
      : null;
    if (obs) obs.observe(ring); else ring.style.setProperty("--val", target);
  });

  /* ---------- Sticky header state ---------- */
  const header = $(".site-header");
  const onScroll = () => header && header.classList.toggle("is-stuck", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  const mobileNav = $("#mobileNav");
  const menuToggle = $("#menuToggle");
  function setMenu(open) {
    if (!mobileNav) return;
    mobileNav.setAttribute("data-open", open ? "true" : "false");
    mobileNav.setAttribute("aria-hidden", open ? "false" : "true");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  menuToggle && menuToggle.addEventListener("click", () => setMenu(true));
  $("#menuClose") && $("#menuClose").addEventListener("click", () => setMenu(false));
  $$("#mobileNav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- Search overlay (uses provided search / x icons) ---------- */
  const searchBtn = $("#searchBtn");
  if (searchBtn) {
    const sections = $$("main section[id]").map((s) => ({
      id: s.id,
      label: (s.querySelector("h1,h2") || {}).textContent || s.id,
    }));
    let overlay;
    function buildOverlay() {
      overlay = document.createElement("div");
      overlay.className = "search-overlay";
      overlay.innerHTML =
        '<div class="search-overlay__box" role="dialog" aria-label="Search the page">' +
        '<div class="search-overlay__field"><span class="icon icon--search"></span>' +
        '<input type="search" placeholder="Search sections…" aria-label="Search sections" />' +
        '<button class="iconbtn" data-close aria-label="Close search"><span class="icon icon--x"></span></button></div>' +
        '<ul class="search-overlay__results"></ul></div>';
      document.body.appendChild(overlay);
      const input = $("input", overlay);
      const results = $(".search-overlay__results", overlay);
      function paint(q) {
        const m = sections.filter((s) => s.label.toLowerCase().includes(q.toLowerCase()));
        results.innerHTML = (m.length ? m : sections)
          .map((s) => '<li><a href="#' + s.id + '">' + s.label + "</a></li>").join("");
      }
      paint("");
      input.addEventListener("input", () => paint(input.value));
      overlay.addEventListener("click", (e) => {
        if (e.target.closest("[data-close]") || e.target === overlay) close();
        if (e.target.closest("a")) close();
      });
      document.addEventListener("keydown", escClose);
      setTimeout(() => input.focus(), 30);
    }
    function escClose(e) { if (e.key === "Escape") close(); }
    function close() {
      if (!overlay) return;
      overlay.classList.remove("is-open");
      document.removeEventListener("keydown", escClose);
      const o = overlay; overlay = null;
      setTimeout(() => o.remove(), 200);
    }
    searchBtn.addEventListener("click", () => {
      buildOverlay();
      requestAnimationFrame(() => overlay.classList.add("is-open"));
    });
  }

  /* ---------- Testimonials carousel ---------- */
  const track = $("#testiTrack");
  if (track) {
    const step = () => (track.querySelector(".testi__card") || {}).offsetWidth + 19;
    $("#testiNext") && $("#testiNext").addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    $("#testiPrev") && $("#testiPrev").addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  }

  /* ---------- FAQ accordion (from scratch, grid-rows transition) ---------- */
  $$(".faq-item").forEach((item) => {
    const q = $(".faq-item__q", item);
    q.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------- Video modal ---------- */
  const modal = $("#videoModal");
  const watch = $("#watchDemo");
  if (modal && watch) {
    const video = $("video", modal);
    function openModal(open) {
      if (open) {
        modal.hidden = false;
        requestAnimationFrame(() => modal.setAttribute("data-open", "true"));
        document.body.style.overflow = "hidden";
      } else {
        modal.setAttribute("data-open", "false");
        if (video) { video.pause(); }
        document.body.style.overflow = "";
        setTimeout(() => { modal.hidden = true; }, 360);
      }
    }
    watch.addEventListener("click", () => openModal(true));
    $("#modalClose") && $("#modalClose").addEventListener("click", () => openModal(false));
    $("[data-close]", modal) && $("[data-close]", modal).addEventListener("click", () => openModal(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.getAttribute("data-open") === "true") openModal(false);
    });
  }

  /* ---------- Back to top + year ---------- */
  $("#toTop") && $("#toTop").addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
