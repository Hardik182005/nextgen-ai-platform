# Quanta — Next-Gen AI Data Automation Platform

A premium, high-converting, fully responsive landing page for an AI-driven data
automation platform. Built **from scratch** with semantic HTML, custom CSS, and
vanilla JavaScript — **no UI or animation libraries**.

**Live demo:** https://mediflow-nexus-2026.vercel.app

---

## Why vanilla?

The two core features have hard architectural constraints (strict state isolation,
zero external dependencies, native-only motion). Plain HTML/CSS/JS gives full control
over the render path, so we can guarantee no global re-renders and no banned libraries.

## Core features

### Feature 1 — Matrix-driven pricing & performance-isolated currency switcher
- Prices are **computed**, never hardcoded, from a multi-dimensional matrix:
  `tier (base rate) × currency (regional tariff) × billing cycle`.
- Flat **20% annual discount** multiplier.
- Three currencies: **INR (₹), USD ($), EUR (€)** · Monthly / Annual cycles.
- Changing currency or cycle mutates **only the targeted price text nodes**
  (`textContent`) — no parent re-render, no `innerHTML` rebuild, no layout reflow
  of surrounding blocks. See [`assets/js/pricing.js`](assets/js/pricing.js).

### Feature 2 — Bento-to-Accordion wrapper with state persistence
- Desktop: modern **bento grid**. Mobile: the same DOM nodes refactor into a
  touch-optimized **accordion**.
- A single source of truth (`activeIndex`) carries the `.is-active` class, so the
  **context locks across the breakpoint** — hover/lock a node on desktop, resize past
  the mobile breakpoint, and the matching accordion panel opens smoothly.
- Breakpoint crossing is detected with `matchMedia` (one event per crossing → no
  resize thrashing). Transitions are native CSS `grid-template-rows`.
  See [`assets/js/bento.js`](assets/js/bento.js).

## Motion
- Micro-interactions (hovers/toggles): **180ms** ease-out.
- Structural reflows: **360ms** ease-in-out.
- Entry orchestration completes **under 500ms** and never blocks TTI.
- Native CSS Transitions/Animations + WAAPI only.

## Provided assets used
- **Fonts:** JetBrains Mono (display) + Inter (body), self-hosted in `assets/fonts/`.
- **Color palette (MP025):** Arctic Powder `#F1F6F4`, Forsythia `#FFC801`,
  Nocturnal Expedition `#114C5A`, Mystic Mint `#D9E8E2`, Deep Saffron `#FF9932`,
  Oceanic Noir `#172B36`.
- **SVGs:** all 14 provided icons in `assets/icons/`, recolored via CSS masks.
- **demo.mp4:** referenced layout/motion; embedded in the in-page video modal.

## Run locally
```bash
npm run dev      # serves on http://localhost:5173
# or simply open index.html
```

## Deploy
Static site — deploy anywhere (Vercel / Netlify / GitHub Pages). No build step.

## Project structure
```
index.html
assets/
  css/styles.css
  js/{pricing,bento,main}.js
  fonts/         self-hosted woff2 + fonts.css
  icons/         14 provided SVGs
  img/           favicon + OG image
  media/demo.mp4
robots.txt · sitemap.xml · site.webmanifest · vercel.json
```
