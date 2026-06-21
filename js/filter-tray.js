/* ════════════════════════════════════════════════════════════
   FILTER-TRAY.JS
   One unified Filter/Sort tray shared across every category page.
   - Filter: multi-select Price-range checkboxes + multi-select Type
     (subcategory) checkboxes, both ANDed together (price OR within
     selected ranges, AND type OR within selected types).
   - Sort: single-select (Relevance / Newest / Trending / Price asc/desc).
   State is kept per-category in FTRAY_STATE so switching between
   category pages preserves each page's own filter/sort selection.
   Depends on: config.js (CATEGORIES), product-render.js (productCardHTML
               — used indirectly via the onApply callback)
   ════════════════════════════════════════════════════════════ */

// Price bucket definitions — order matters (used for display + matching)
const FTRAY_PRICE_BUCKETS = [
  { value: '0-299',     min: 0,    max: 299 },
  { value: '300-500',   min: 300,  max: 500 },
  { value: '501-1000',  min: 501,  max: 1000 },
  { value: '1000-1500', min: 1000, max: 1500 },
  { value: '1500-2000', min: 1500, max: 2000 },
  { value: '2000-up',   min: 2000, max: Infinity },
];

// Per-category state: { [cat]: { products, subtypes, price:Set, type:Set, sort, onApply } }
const FTRAY_STATE = {};

let _ftrayActiveCat  = null;  // which category's tray is currently open
let _ftrayActiveMode = 'filter'; // 'filter' | 'sort'

// ─── REGISTER A CATEGORY (called once per renderCategoryPage) ────────────────
// Preserves existing filter/sort selections if the user already visited this
// category earlier in the session — only the product list + subtypes refresh.
function registerCategoryForFilterTray(cat, products, onApply) {
  const subtypes = [...new Set(products.map(p => p.subcategory).filter(Boolean))].sort();
  const existing = FTRAY_STATE[cat];
  FTRAY_STATE[cat] = {
    products,
    subtypes,
    price: existing ? existing.price : new Set(),
    type:  existing ? existing.type  : new Set(),
    sort:  existing ? existing.sort  : 'relevance',
    onApply
  };
  _updateFilterBadge(cat);
}

// ─── COMPUTE FILTERED + SORTED PRODUCTS FOR A CATEGORY ───────────────────────
function getFilteredSortedProducts(cat) {
  const st = FTRAY_STATE[cat];
  if (!st) return [];

  let list = [...st.products];

  // Price filter (OR across selected buckets)
  if (st.price.size > 0) {
    const buckets = FTRAY_PRICE_BUCKETS.filter(b => st.price.has(b.value));
    list = list.filter(p => buckets.some(b => p.price >= b.min && p.price <= b.max));
  }

  // Type filter (OR across selected subcategories)
  if (st.type.size > 0) {
    list = list.filter(p => st.type.has(p.subcategory));
  }

  // Sort
  switch (st.sort) {
    case 'newest':     list.sort((a, b) => (b.badge === 'New' ? 1 : 0) - (a.badge === 'New' ? 1 : 0)); break;
    case 'trending':   list.sort((a, b) => (b.badge === 'Trending' ? 1 : 0) - (a.badge === 'Trending' ? 1 : 0)); break;
    case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    default: break; // relevance = keep original sort_order from Supabase
  }

  return list;
}

// ─── OPEN / CLOSE TRAY ────────────────────────────────────────────────────────
function openFilterTray(cat, mode) {
  _ftrayActiveCat  = cat;
  _ftrayActiveMode = mode || 'filter';

  const st = FTRAY_STATE[cat];
  if (!st) return;

  // Build Type checklist for this category (dynamic per category)
  const typeList = document.getElementById('ftray-type-list');
  typeList.innerHTML = st.subtypes.length
    ? st.subtypes.map(sub => `
        <label class="ftray-check">
          <input type="checkbox" value="${sub}" ${st.type.has(sub) ? 'checked' : ''}>
          <span>${sub}</span>
        </label>`).join('')
    : '<p class="ftray-empty-note">No types available for this category.</p>';

  // Restore Price checkbox state
  document.querySelectorAll('#ftray-price-list input[type=checkbox]').forEach(cb => {
    cb.checked = st.price.has(cb.value);
  });

  // Restore Sort radio state
  document.querySelectorAll('#ftray-sort-list input[type=radio]').forEach(rb => {
    rb.checked = (rb.value === st.sort);
  });

  // Show correct panel + title
  const isFilter = _ftrayActiveMode === 'filter';
  document.getElementById('ftray-panel-filter').style.display = isFilter ? 'block' : 'none';
  document.getElementById('ftray-panel-sort').style.display   = isFilter ? 'none'  : 'block';
  document.getElementById('ftray-title').textContent = isFilter ? 'Filter' : 'Sort By';
  document.getElementById('ftray-apply-btn').textContent = isFilter ? 'Apply' : 'Apply Sort';

  // Direction: Filter slides in from the left, Sort slides in from the right
  const overlay = document.getElementById('ftray-overlay');
  overlay.classList.remove('ftray-from-left', 'ftray-from-right');
  overlay.classList.add(isFilter ? 'ftray-from-left' : 'ftray-from-right');

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFilterTray() {
  document.getElementById('ftray-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function ftrayOverlayClick(e) {
  if (e.target === document.getElementById('ftray-overlay')) closeFilterTray();
}

document.addEventListener('keydown', function (e) {
  const overlay = document.getElementById('ftray-overlay');
  if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) closeFilterTray();
});

// ─── APPLY ────────────────────────────────────────────────────────────────────
function applyFilterTray() {
  const cat = _ftrayActiveCat;
  const st  = FTRAY_STATE[cat];
  if (!st) return;

  if (_ftrayActiveMode === 'filter') {
    st.price = new Set(
      [...document.querySelectorAll('#ftray-price-list input[type=checkbox]:checked')].map(cb => cb.value)
    );
    st.type = new Set(
      [...document.querySelectorAll('#ftray-type-list input[type=checkbox]:checked')].map(cb => cb.value)
    );
    _updateFilterBadge(cat);
  } else {
    const checked = document.querySelector('#ftray-sort-list input[type=radio]:checked');
    st.sort = checked ? checked.value : 'relevance';
  }

  closeFilterTray();
  if (typeof st.onApply === 'function') st.onApply();
}

// ─── CLEAR ────────────────────────────────────────────────────────────────────
function clearFilterTray() {
  if (_ftrayActiveMode === 'filter') {
    document.querySelectorAll('#ftray-price-list input[type=checkbox]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#ftray-type-list input[type=checkbox]').forEach(cb => cb.checked = false);
  } else {
    document.querySelectorAll('#ftray-sort-list input[type=radio]').forEach(rb => rb.checked = (rb.value === 'relevance'));
  }
}

// Clear + apply immediately for a given category (used by the "Clear filters" link
// shown in the empty-results message — bypasses the tray UI entirely)
function clearFilterTrayFor(cat) {
  const st = FTRAY_STATE[cat];
  if (!st) return;
  st.price = new Set();
  st.type  = new Set();
  st.sort  = 'relevance';
  _updateFilterBadge(cat);
  if (typeof st.onApply === 'function') st.onApply();
}

// ─── FILTER BADGE (small count bubble on the Filter button) ──────────────────
function _updateFilterBadge(cat) {
  const st = FTRAY_STATE[cat];
  if (!st) return;
  const count = st.price.size + st.type.size;
  const badge = document.getElementById('fs-filter-badge-' + cat);
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}