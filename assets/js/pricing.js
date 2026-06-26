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
  const labelNode = section.querySelector("[data-cur-label]");

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
    if (labelNode) labelNode.textContent = sym + " " + currency;
  }

  /* ---- Billing toggle (local, isolated) ---- */
  const toggle = document.getElementById("billingToggle");
  toggle.addEventListener("click", (e) => {
    const opt = e.target.closest(".billing-toggle__opt");
    if (!opt) return;
    const cycle = opt.getAttribute("data-cycle");
    if (cycle === state.cycle) return;

    state.cycle = cycle;
    toggle.setAttribute("data-cycle", cycle);
    toggle.querySelectorAll(".billing-toggle__opt").forEach((b) => {
      const on = b === opt;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    render();
  });

  /* ---- Currency dropdown (performance-isolated component) ---- */
  const select = document.getElementById("currencySelect");
  const curBtn = document.getElementById("currencyBtn");
  const curMenu = document.getElementById("currencyMenu");

  function openMenu(open) {
    select.setAttribute("data-open", open ? "true" : "false");
    curBtn.setAttribute("aria-expanded", open ? "true" : "false");
    curMenu.hidden = !open;
  }
  curBtn.addEventListener("click", () =>
    openMenu(select.getAttribute("data-open") !== "true")
  );
  curMenu.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-cur]");
    if (!opt) return;
    const currency = opt.getAttribute("data-cur");
    curMenu.querySelectorAll("[role=option]").forEach((o) =>
      o.setAttribute("aria-selected", o === opt ? "true" : "false")
    );
    openMenu(false);
    if (currency !== state.currency) {
      state.currency = currency;
      render();
    }
  });
  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) openMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openMenu(false);
  });

  /* ---- First paint: values come from the matrix, not the markup ---- */
  render();
})();
