/* =================================================================
   FEATURE 1 — Matrix-Driven Pricing & Performance-Isolated Switcher
   - Prices are NEVER hardcoded in the DOM. They are derived from a
     multi-dimensional configuration matrix (tier x currency x cycle).
   - Changing currency or billing cycle mutates ONLY the targeted
     price text nodes (textContent). No parent/layout re-render,
     no innerHTML rebuild, no global state reflow.
   ================================================================= */
(function () {
  "use strict";

  /* ---- Multi-dimensional configuration matrix ---- */
  // Base monthly tier rate, expressed in a neutral base unit.
  const TIERS = {
    starter:    { base: 29 },
    pro:        { base: 99 },
    enterprise: { base: 199 },
  };

  // Regional tariff variables: FX-style multiplier + locale-aware symbol.
  const CURRENCIES = {
    INR: { symbol: "₹", tariff: 83,   locale: "en-IN" },
    USD: { symbol: "$",      tariff: 1,    locale: "en-US" },
    EUR: { symbol: "€", tariff: 0.92, locale: "de-DE" },
  };

  // Flat 20% annual discount multiplier.
  const ANNUAL_MULTIPLIER = 0.8;

  /* ---- Pure compute layer (the "Data Logic") ---- */
  function monthlyFor(tier, currency, cycle) {
    const base = TIERS[tier].base;                 // base tier rate
    const regional = base * CURRENCIES[currency].tariff; // regional tariff
    const factored = cycle === "annual" ? regional * ANNUAL_MULTIPLIER : regional;
    return Math.round(factored);                   // per-month value
  }

  function fmt(value, currency) {
    return new Intl.NumberFormat(CURRENCIES[currency].locale, {
      maximumFractionDigits: 0,
    }).format(value);
  }

  /* ---- Cache the exact text nodes we are allowed to mutate ---- */
  const section = document.getElementById("pricing");
  if (!section) return;

  const amountNodes = {};
  section.querySelectorAll("[data-price]").forEach((n) => {
    amountNodes[n.getAttribute("data-price")] = n;
  });
  const noteNodes = {};
  section.querySelectorAll("[data-price-note]").forEach((n) => {
    noteNodes[n.getAttribute("data-price-note")] = n;
  });
  const symbolNodes = Array.from(section.querySelectorAll("[data-price-symbol]"));

  /* ---- Single source of truth for the switcher ---- */
  let state = { currency: "INR", cycle: "monthly" };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Render touches ONLY price spans — nothing structural.
  function render() {
    const { currency, cycle } = state;
    const sym = CURRENCIES[currency].symbol;

    Object.keys(TIERS).forEach((tier) => {
      const monthly = monthlyFor(tier, currency, cycle);
      const node = amountNodes[tier];
      const next = fmt(monthly, currency);

      if (node.textContent !== next) {
        node.textContent = next;                   // isolated text mutation
        if (!reduceMotion) {
          node.classList.remove("flash");
          void node.offsetWidth;                   // restart micro-flash
          node.classList.add("flash");
        }
      }
      noteNodes[tier].textContent =
        cycle === "annual"
          ? "billed annually · " + sym + fmt(monthly * 12, currency) + "/yr"
          : "billed monthly";
    });

    symbolNodes.forEach((n) => { n.textContent = sym; });
  }

  /* ---- Segmented control helper: slide knob, isolate updates ---- */
  function wireSegment(el, attr, onPick) {
    const opts = Array.from(el.querySelectorAll(".seg__opt"));
    el.addEventListener("click", (e) => {
      const opt = e.target.closest(".seg__opt");
      if (!opt) return;
      const value = opt.getAttribute(attr);
      const i = opts.indexOf(opt);
      el.style.setProperty("--i", i);          // slide the knob to this segment
      opts.forEach((b) => {
        const on = b === opt;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      onPick(value);
    });
  }

  /* ---- Billing toggle (local, isolated) ---- */
  const toggle = document.getElementById("billingToggle");
  wireSegment(toggle, "data-cycle", (cycle) => {
    if (cycle === state.cycle) return;
    state.cycle = cycle;
    toggle.setAttribute("data-cycle", cycle);
    render();
  });

  /* ---- Currency segmented control (performance-isolated) ---- */
  const curSeg = document.getElementById("currencySeg");
  wireSegment(curSeg, "data-cur", (currency) => {
    if (currency === state.currency) return;
    state.currency = currency;
    curSeg.setAttribute("data-cur", currency);
    render();
  });

  /* ---- First paint: values come from the matrix, not the markup ---- */
  render();
})();
