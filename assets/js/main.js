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
    // Budget: loader bar is 300ms; lift at 300ms keeps the whole
    // entry orchestration comfortably under the 500ms cap.
    window.setTimeout(finishLoader, 300);
  }

  /* ---------- Hero staggered entrance (WAAPI-free, CSS class) ---------- */
  function playHeroEntrance() {
    const lines = $$(".reveal-line > span");
    lines.forEach((el, i) => {
      el.style.transitionDelay = i * 70 + "ms"; // 3 lines -> ~210ms tail
      el.classList.add("in");
    });
    // Other hero blocks — tight stagger to stay inside the 500ms budget
    $$(".hero [data-reveal]").forEach((el, i) => {
      el.style.transitionDelay = i * 35 + "ms";
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

  /* ---------- Text reveal for lower-section headings (staggered) ---------- */
  $$(".section-head").forEach((head) => {
    Array.from(head.children).forEach((el, i) => {
      el.setAttribute("data-reveal", "");
      el.style.transitionDelay = i * 80 + "ms";
      if (io) io.observe(el); else el.classList.add("in");
    });
  });

  /* ---------- Fill-in remaining text blocks (scroll-reveal everywhere) ---------- */
  const gapSel = [
    ".proof-strip__label", ".logos li", ".engine-pills li",
    ".faq-item", ".cta-final h2", ".cta-final p",
    ".site-footer__brand", ".site-footer nav", ".site-footer__bar"
  ].join(",");
  $$(gapSel).forEach((el, i) => {
    el.setAttribute("data-reveal", "");
    // light stagger between immediate siblings
    const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.hasAttribute("data-reveal")) : [];
    el.style.transitionDelay = Math.min(Math.max(0, sibs.indexOf(el)) * 55, 280) + "ms";
    if (io) io.observe(el); else el.classList.add("in");
  });

  /* ---------- 3D scroll reveal for lower-section cards ---------- */
  const groups = [".bento", ".plans", ".gauges", ".testi__track"];
  const cardSel = ".bento__node, .plan, .gauge, .testi__card";
  $$(cardSel).forEach((el) => el.classList.add("r3d"));
  const r3dObs = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          // stagger siblings within the same container
          const siblings = Array.from(e.target.parentElement.children).filter((c) => c.classList.contains("r3d"));
          const idx = Math.max(0, siblings.indexOf(e.target));
          e.target.style.transitionDelay = Math.min(idx * 70, 350) + "ms";
          e.target.classList.add("in3d");
          r3dObs.unobserve(e.target);
        });
      }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" })
    : null;
  if (r3dObs) $$(cardSel).forEach((el) => r3dObs.observe(el));
  else $$(cardSel).forEach((el) => el.classList.add("in3d"));
  void groups; // grouping handled via parentElement above

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

  /* ---------- Sticky header + scroll progress ---------- */
  const header = $(".site-header");
  const sp = $("#scrollProgress");
  const onScroll = () => {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 8);
    if (sp) {
      const d = document.documentElement;
      const max = d.scrollHeight - d.clientHeight;
      sp.style.width = (max > 0 ? (d.scrollTop / max) * 100 : 0) + "%";
    }
  };
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

  /* ---------- Hero pipeline: sequential activation ---------- */
  const pipeline = $("#pipeline");
  if (pipeline) {
    const steps = $$(".pstep", pipeline);
    function runPipeline() {
      const total = steps.length;
      if (reduceMotion) {
        steps.forEach((s) => s.classList.add("is-on"));
        pipeline.style.setProperty("--fill", "100%");
        return;
      }
      steps.forEach((step, i) => {
        setTimeout(() => {
          step.classList.add("is-on");
          // grow the connector line to this node
          pipeline.style.setProperty("--fill", ((i + 1) / total) * 100 + "%");
        }, 140 * i); // 4 steps -> ~420ms, within budget
      });
    }
    if ("IntersectionObserver" in window) {
      const po = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { runPipeline(); po.disconnect(); } });
      }, { threshold: 0.35 });
      po.observe(pipeline);
    } else { runPipeline(); }

    /* Interactive 3D parallax — tilt toward the cursor (transform only) */
    const stage = pipeline.closest(".hero__stage");
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (stage && canHover && !reduceMotion) {
      let raf;
      stage.addEventListener("pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          pipeline.classList.add("is-tilting");
          pipeline.style.setProperty("--ry", (-7 + px * 13).toFixed(2) + "deg");
          pipeline.style.setProperty("--rx", (2.5 - py * 12).toFixed(2) + "deg");
        });
      });
      stage.addEventListener("pointerleave", () => {
        pipeline.classList.remove("is-tilting");
        pipeline.style.setProperty("--ry", "-7deg");
        pipeline.style.setProperty("--rx", "2.5deg");
      });
    }

    /* Live, state-isolated ESI telemetry — mutate ONLY the score text node */
    const esi = $("#esiScore"), esiFill = $("#esiFill");
    if (esi && esiFill && !reduceMotion) {
      setTimeout(() => {
        setInterval(() => {
          const v = 84 + Math.floor(Math.random() * 5); // 84..88
          esi.textContent = v;                            // isolated text update
          esiFill.style.setProperty("--p", v + "%");
        }, 2400);
      }, 2200);
    }
  }

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
        if (video) { try { video.currentTime = 0; video.play(); } catch (_) {} }
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
