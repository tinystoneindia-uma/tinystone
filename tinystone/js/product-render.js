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
      <div class="filter-bar" id="filter-bar-${cat}">
        <div class="filter-chip active" data-filter="all">All</div>
        <div class="filter-chip" data-filter="under500">Under ₹500</div>
        <div class="filter-chip" data-filter="500to1000">₹500–₹1000</div>
        <div class="filter-chip" data-filter="above1000">Above ₹1000</div>
        <div class="filter-chip" data-filter="New">New</div>
        <div class="filter-chip" data-filter="Trending">Trending</div>
      </div>
      <div class="type-bar" id="type-bar-${cat}">
        <span class="type-bar-label">Type</span>
        <div class="type-chip active" data-type="all">All</div>
      </div>
    </div>
    <div class="section prod-section-wrap" id="prod-section-${cat}">
      ${skeletonGrid(3)}
    </div>`;

  // Fetch products
  const prods = await fetchProductsByCategory(cat);

  // Populate Type bar with unique subcategories from fetched data
  const typeBar  = document.getElementById('type-bar-' + cat);
  const subtypes = [...new Set(prods.map(p => p.subcategory).filter(Boolean))];
  subtypes.forEach(sub => {
    const chip = document.createElement('div');
    chip.className = 'type-chip';
    chip.dataset.type = sub;
    chip.textContent = sub;
    typeBar.appendChild(chip);
  });

  // Active filter state
  let activePrice = 'all';
  let activeType  = 'all';

  function applyFilters() {
    let filtered = [...prods];
    // Price / badge
    if (activePrice === 'under500')   filtered = filtered.filter(p => p.price < 500);
    if (activePrice === 'above1000')  filtered = filtered.filter(p => p.price > 1000);
    if (activePrice === '500to1000')  filtered = filtered.filter(p => p.price >= 500 && p.price <= 1000);
    if (activePrice === 'New')        filtered = filtered.filter(p => p.badge === 'New');
    if (activePrice === 'Trending')   filtered = filtered.filter(p => p.badge === 'Trending');
    // Type (subcategory)
    if (activeType !== 'all')         filtered = filtered.filter(p => p.subcategory === activeType);

    const section = document.getElementById('prod-section-' + cat);
    if (!section) return;
    if (filtered.length === 0) {
      section.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;color:var(--muted)">
          <div style="font-size:2.5rem;margin-bottom:.8rem;">${info.emoji}</div>
          <p style="font-size:14px;">No products match this filter.<br>
          <a href="#" onclick="window['resetFilters_${cat}']();return false;"
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

  // Global reset hook for the "Clear filters" link inside innerHTML
  window['resetFilters_' + cat] = function() {
    activePrice = 'all';
    activeType  = 'all';
    el.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
    el.querySelectorAll('.type-chip').forEach(c => c.classList.toggle('active', c.dataset.type === 'all'));
    applyFilters();
  };

  // Wire price/badge chips
  el.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      el.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activePrice = chip.dataset.filter;
      applyFilters();
    });
  });

  // Wire type chips (including ones added dynamically)
  el.addEventListener('click', e => {
    const chip = e.target.closest('.type-chip');
    if (!chip) return;
    el.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeType = chip.dataset.type;
    applyFilters();
  });

  // Initial render
  applyFilters();
}
