/* ════════════════════════════════════════════════════════════
   MAIN.JS
   Boot sequence — runs after all other modules are loaded.
   Must be the LAST script tag in index.html.
   ════════════════════════════════════════════════════════════ */

// Start fetching products as soon as the page loads (before splash exits)
initProducts();

// Load active promo codes (used for basket discounts)
loadPromoCodes();
