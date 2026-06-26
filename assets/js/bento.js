/* =================================================================
   FEATURE 2 — Bento-to-Accordion Wrapper with State Persistence
   - Single shared DOM. Desktop renders a bento grid; mobile refactors
     the SAME nodes into a touch-optimized accordion.
   - One source of truth: `activeIndex`. The active node carries the
     `.is-active` class, so context transfers automatically across the
     breakpoint (The Context Lock Constraint).
   - Zero external libraries. Transitions are native CSS (grid-rows).
   - Breakpoint crossing is detected via matchMedia (fires once per
     crossing) — no resize thrashing, no layout-thrash penalty.
   ================================================================= */
(function () {
  "use strict";

  const bento = document.getElementById("bento");
  if (!bento) return;

  const nodes = Array.from(bento.querySelectorAll(".bento__node"));
  const heads = nodes.map((n) => n.querySelector(".bento__head"));
  const MOBILE = window.matchMedia("(max-width: 760px)");

  // Source of truth — initialised from the node pre-marked active in markup.
  let activeIndex = Math.max(0, nodes.findIndex((n) => n.classList.contains("is-active")));

  function isAccordion() { return MOBILE.matches; }

  function reflect() {
    nodes.forEach((node, i) => {
      const on = i === activeIndex;
      node.classList.toggle("is-active", on);
      // In accordion mode aria-expanded mirrors the open panel; in grid
      // mode it mirrors the highlighted node.
      heads[i].setAttribute("aria-expanded", on ? "true" : "false");
    });
  }

  function setActive(i) {
    if (i === activeIndex) return;
    activeIndex = i;
    reflect();
  }

  // ---- Desktop (bento): hover / focus previews the active context ----
  nodes.forEach((node, i) => {
    node.addEventListener("mouseenter", () => {
      if (!isAccordion()) setActive(i);
    });
    heads[i].addEventListener("focus", () => {
      if (!isAccordion()) setActive(i);
    });
  });

  // ---- Click works in BOTH modes ----
  heads.forEach((head, i) => {
    head.addEventListener("click", () => {
      if (isAccordion()) {
        // Accordion: toggle open/closed; only one panel open at a time.
        if (i === activeIndex) {
          activeIndex = -1;
          reflect();
        } else {
          setActive(i);
        }
      } else {
        setActive(i); // Desktop: lock the active node
      }
    });
  });

  // ---- The Context Lock: transfer active index across the breakpoint ----
  function applyMode() {
    const mode = isAccordion() ? "accordion" : "grid";
    if (bento.getAttribute("data-mode") === mode) return;
    // When entering accordion, guarantee a valid open panel = last active.
    if (mode === "accordion" && activeIndex < 0) activeIndex = 0;
    bento.setAttribute("data-mode", mode);
    reflect(); // same .is-active node -> panel opens smoothly via CSS
  }

  // matchMedia change = exactly one event per breakpoint crossing.
  if (MOBILE.addEventListener) MOBILE.addEventListener("change", applyMode);
  else MOBILE.addListener(applyMode); // legacy Safari

  applyMode();
  reflect();
})();
