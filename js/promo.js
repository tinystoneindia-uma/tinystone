/* ════════════════════════════════════════════════════════════
   PROMO.JS
   Promo code system: load active codes from Supabase, validate,
   apply/remove, and compute discount amounts.
   Depends on: config.js (sb, basket), basket.js (updateBasketUI)
   ════════════════════════════════════════════════════════════ */

let PROMO_CODES  = {};   // populated from Supabase at boot via loadPromoCodes()
let appliedPromo = null; // currently applied promo object, or null

// ─── LOAD PROMO CODES FROM SUPABASE ──────────────────────────────────────────
// Pulls active, non-expired codes from the `promocodes` table.
// origin = 'jewells' or 'all' codes are loaded for this site.
async function loadPromoCodes() {
  const now = new Date().toISOString();
  try {
    const { data, error } = await sb
      .from('promocodes')
      .select('code,label,discount,origin,is_public,min_order,max_upto,valid_from,valid_until,active')
      .eq('active', true)
      .order('id', { ascending: true });

    if (error) { console.warn('[promo] load failed:', error.message); return; }
    if (!Array.isArray(data) || !data.length) return;

    // Filter: not time-expired, and relevant to this site (jewells or all)
    const valid = data.filter(p => {
      if (p.valid_from  && now < p.valid_from)  return false;
      if (p.valid_until && now > p.valid_until) return false;
      if (p.origin && !['jewells', 'all'].includes(p.origin)) return false;
      return true;
    });

    valid.forEach(p => {
      PROMO_CODES[p.code.toUpperCase()] = {
        code:      p.code.toUpperCase(),
        label:     p.label,
        discount:  parseFloat(p.discount),
        origin:    p.origin,
        min_order: parseFloat(p.min_order) || 0,
        max_upto:  p.max_upto ? parseFloat(p.max_upto) : null
      };
    });
  } catch (e) {
    console.warn('[promo] load error:', e.message);
  }
}

// ─── DISCOUNT CALCULATION ─────────────────────────────────────────────────────
// Returns the actual rupee discount for a given subtotal, respecting max_upto cap
function calcDiscount(subtotal) {
  if (!appliedPromo) return 0;
  const raw = Math.round(subtotal * appliedPromo.discount);
  return (appliedPromo.max_upto && raw > appliedPromo.max_upto)
    ? Math.round(appliedPromo.max_upto)
    : raw;
}

// ─── APPLY / REMOVE ──────────────────────────────────────────────────────────
function applyPromo() {
  const input = document.getElementById('promo-input');
  const btn   = document.getElementById('promo-apply-btn');
  const msg   = document.getElementById('promo-msg');
  if (!input || !btn || !msg) return;
  if (appliedPromo) return;

  const code = input.value.trim().toUpperCase();
  const pc = PROMO_CODES[code];

  if (!pc) {
    msg.className = 'promo-msg error';
    msg.textContent = 'Invalid promo code. Please check and try again.';
    input.classList.add('invalid');
    setTimeout(() => input.classList.remove('invalid'), 1500);
    return;
  }

  const cartTotal = basket.reduce((s, i) => s + i.price * i.qty, 0);
  if (pc.min_order && cartTotal < pc.min_order) {
    msg.className = 'promo-msg error';
    msg.textContent = `Minimum order ₹${pc.min_order} required for this code.`;
    input.classList.add('invalid');
    setTimeout(() => input.classList.remove('invalid'), 1500);
    return;
  }

  appliedPromo = { ...pc };
  const pct = Math.round(pc.discount * 100);
  let successMsg = `✓ Code applied! ${pct}% off your order.`;
  if (pc.max_upto) successMsg += ` (max discount ₹${pc.max_upto})`;
  msg.className = 'promo-msg success';
  msg.textContent = successMsg;
  btn.textContent = 'Applied ✓';
  btn.classList.add('applied');
  input.classList.add('valid');

  updateBasketUI();
}

function removePromo() {
  appliedPromo = null;
  const input = document.getElementById('promo-input');
  const btn   = document.getElementById('promo-apply-btn');
  const msg   = document.getElementById('promo-msg');
  if (input) { input.value = ''; input.classList.remove('valid', 'invalid'); }
  if (btn)   { btn.textContent = 'Apply'; btn.classList.remove('applied'); }
  if (msg)   { msg.className = 'promo-msg'; msg.textContent = ''; }

  updateBasketUI();
}
