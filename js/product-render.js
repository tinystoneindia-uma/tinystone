/* ════════════════════════════════════════════════════════════
   PRODUCT-RENDER.JS
   Everything related to rendering product listings:
   - parseImgs()           → normalises the images jsonb column
   - productCardHTML()     → shared product card markup
   - skeletonGrid()         → shimmer placeholder while loading
   - renderTrendingSection()→ home page "Trending" grid
   - renderCategoryPage()   → category page with Price + Type filters
   ════════════════════════════════════════════════════════════ */

// ─── IMAGE HELPER ────────────────────────────────────────────────────────────
// images column is stored as a plain string array: ["url1","url2","url3"]
// Each element may also be a legacy {url,alt} object — handle both gracefully.
function parseImgs(raw) {
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch (e) { arr = []; }
  }
  // Normalise every element → plain URL string
  return arr.map(item => (typeof item === 'string' ? item : (item?.url || ''))).filter(Boolean);
}

// ─── PRODUCT CARD HTML ───────────────────────────────────────────────────────
function productCardHTML(p) {
  const offPct   = (p.mrp && p.mrp > p.price) ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const badgeCls = p.badge === 'New' ? 'new' : p.badge === 'Trending' ? 'trending' : '';
  const imgs     = parseImgs(p.images);
  const firstImg = imgs[0];
  const emoji    = CAT_EMOJI[p.category] || '💎';
  const imgHTML  = firstImg
    ? `<img src="${firstImg}" alt="${p.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : `<div class="prod-img-placeholder">${emoji}</div>`;

  return `
    <div class="prod-card" onclick="openPdp('${p.id}')">
      <div class="prod-img-wrap">
        ${imgHTML}
        ${p.badge ? `<div class="prod-badge ${badgeCls}">${p.badge}</div>` : ''}
        <button class="prod-wishlist" onclick="event.stopPropagation();showToast('Added to wishlist 💛');">♡</button>
      </div>
      <div class="prod-info">
        <div class="prod-name">${p.name}</div>
        <div class="prod-sub">${[p.material, p.subcategory].filter(Boolean).join(' · ')}</div>
        <div class="prod-price-row">
          <span class="prod-price">₹${Number(p.price).toLocaleString('en-IN')}</span>
          ${p.mrp && p.mrp > p.price ? `<span class="prod-mrp">₹${Number(p.mrp).toLocaleString('en-IN')}</span>` : ''}
          ${offPct > 0 ? `<span class="prod-off">${offPct}% off</span>` : ''}
        </div>
        <button class="prod-add-btn" onclick="event.stopPropagation();addToBasket('${p.id}')">+ Add to Basket</button>
      </div>
    </div>`;
}

// ─── SKELETON LOADER ─────────────────────────────────────────────────────────
function skeletonGrid(count = 3) {
  return `<div class="prod-grid">${Array(count).fill(0).map(() => `
    <div class="prod-card" style="pointer-events:none;">
      <div class="prod-img-wrap" style="background:linear-gradient(90deg,#f0e8d0 25%,#fdf6e0 50%,#f0e8d0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;">
      </div>
      <div class="prod-info">
        <div style="height:14px;background:#f0e8d0;border-radius:6px;margin-bottom:8px;animation:shimmer 1.4s infinite;"></div>
        <div style="height:11px;background:#f5f0e0;border-radius:6px;width:70%;margin-bottom:12px;animation:shimmer 1.4s infinite;"></div>
        <div style="height:30px;background:#f0e8d0;border-radius:10px;animation:shimmer 1.4s infinite;"></div>
      </div>
    </div>`).join('')}</div>`;
}

// ─── HOME PAGE: TRENDING SECTION ─────────────────────────────────────────────
function renderTrendingSection() {
  const trending = PRODUCTS.filter(p => p.badge === 'Trending').slice(0, 6);
  const grid = document.getElementById('trending-grid');
  if (!grid) return;
  if (trending.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:14px;">No trending products yet.</p>';
    return;
  }
  grid.innerHTML = trending.map(productCardHTML).join('');
}

// ─── CATEGORY PAGE (async, with skeleton loader + Price/Type filters) ────────
async function renderCategoryPage(cat) {
  const info = CATEGORIES[cat] || { title: cat, desc: '', emoji: '💎' };
  const el   = document.getElementById('page-' + cat);
  if (!el) return;

  // Show banner + skeleton immediately
  el.innerHTML = `
    <div class="cat-page-banner">
      <h1>${info.emoji} ${info.title}</h1>
      <p>${info.desc}</p>
    </div>
    <div class="filter-bars-wrap" id="fbars-${cat}">
      <div class="fs-bar">
        <button class="fs-btn" id="fs-filter-btn-${cat}" onclick="openFilterTray('${cat}','filter')">
          <span class="fs-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="white" stroke="none"/>
              <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="white" stroke="none"/>
              <line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="white" stroke="none"/>
            </svg>
          </span>
          Filter
          <span class="fs-badge" id="fs-filter-badge-${cat}" style="display:none;">0</span>
        </button>
        <span class="fs-sep"></span>
        <button class="fs-btn" id="fs-sort-btn-${cat}" onclick="openFilterTray('${cat}','sort')">
          <span class="fs-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 4v15M7 19l-3.5-3.5M7 19l3.5-3.5"/>
              <path d="M17 20V5M17 5l3.5 3.5M17 5l-3.5 3.5"/>
            </svg>
          </span>
          Sort
        </button>
      </div>
    </div>
    <div class="section prod-section-wrap" id="prod-section-${cat}">
      ${skeletonGrid(3)}
    </div>`;

  // Fetch products
  const prods = await fetchProductsByCategory(cat);

  // Register this category with the shared filter tray (subcategories + product set)
  registerCategoryForFilterTray(cat, prods, () => renderFilteredProducts(cat));

  // Initial render (no filters/sort applied yet)
  renderFilteredProducts(cat);
}

// Renders the product grid for a category using whatever filter/sort state
// is currently held by the shared filter tray (js/filter-tray.js).
function renderFilteredProducts(cat) {
  const info    = CATEGORIES[cat] || { emoji: '💎' };
  const section = document.getElementById('prod-section-' + cat);
  if (!section) return;

  const filtered = getFilteredSortedProducts(cat);

  if (filtered.length === 0) {
    section.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--muted)">
        <div style="font-size:2.5rem;margin-bottom:.8rem;">${info.emoji}</div>
        <p style="font-size:14px;">No products match this filter.<br>
        <a href="#" onclick="clearFilterTrayFor('${cat}');return false;"
           style="color:var(--gold-dark);font-weight:600;">Clear filters</a>
        &nbsp;or&nbsp;
        <a href="https://wa.me/${WA_NUMBER}" target="_blank"
           style="color:var(--gold-dark)">chat with us</a>.
        </p>
      </div>`;
  } else {
    section.innerHTML = `<div class="prod-grid">${filtered.map(productCardHTML).join('')}</div>`;
  }
}