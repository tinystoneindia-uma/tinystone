/* ════════════════════════════════════════════════════════════
   SUPABASE-DATA.JS
   Pure data-fetching layer — no DOM access here.
   All functions talk to the `products` table via the
   Supabase client configured in config.js.
   ════════════════════════════════════════════════════════════ */

// Fetch ALL active products (called once on load for featured/trending)
async function fetchAllProducts() {
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) { console.error('fetchAllProducts:', error); return []; }
  return data || [];
}

// Fetch products for a specific category (cached per session)
async function fetchProductsByCategory(cat) {
  if (catCache[cat]) return catCache[cat];
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('active', true)
    .eq('category', cat)
    .order('sort_order', { ascending: true });
  if (error) { console.error('fetchByCategory:', error); return []; }
  catCache[cat] = data || [];
  return catCache[cat];
}

// Fetch single product by id (checks local caches first)
async function fetchProductById(id) {
  const cached = PRODUCTS.find(p => p.id === id)
    || Object.values(catCache).flat().find(p => p.id === id);
  if (cached) return cached;

  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('fetchById:', error); return null; }
  return data;
}

// ─── INIT: load on page boot ──────────────────────────────────────────────────
async function initProducts() {
  PRODUCTS = await fetchAllProducts();
  // Store in catCache too so category pages don't need to refetch
  PRODUCTS.forEach(p => {
    if (!catCache[p.category]) catCache[p.category] = [];
    if (!catCache[p.category].find(x => x.id === p.id)) catCache[p.category].push(p);
  });
  renderTrendingSection();
}
