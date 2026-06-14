/* ════════════════════════════════════════════════════════════
   CHECKOUT.JS
   Shipping/address modal flow:
   - opens before WhatsApp checkout
   - PIN → city/state/area autofill (from `pincodes` table)
   - validates fields
   - saves order to Supabase `orders` table (or 'skipped' if user skips)
   - persists address in sessionStorage across visits
   Depends on: config.js (sb, basket, WA_NUMBER, CAT_EMOJI),
               promo.js (calcDiscount, appliedPromo),
               toast.js (showToast)
   ════════════════════════════════════════════════════════════ */

const _SHIP_SESS = 'ttj_ship'; // sessionStorage key (jewells-prefixed, separate from kidswear)

// ─── SESSION SAVE / LOAD ─────────────────────────────────────────────────────
function _shipSave(d) {
  try { sessionStorage.setItem(_SHIP_SESS, JSON.stringify(d)); } catch (e) {}
}
function _shipLoad() {
  try { return JSON.parse(sessionStorage.getItem(_SHIP_SESS) || 'null'); } catch (e) { return null; }
}

// ─── OPEN / CLOSE MODAL ───────────────────────────────────────────────────────
function openShipModal() {
  const subtotal = basket.reduce((s, i) => s + i.qty * i.price, 0);
  const items    = basket.reduce((s, i) => s + i.qty, 0);
  const disc     = calcDiscount(subtotal);

  const bar = document.getElementById('shipBasketBar');
  if (bar) {
    bar.innerHTML = `<strong>${items} item${items !== 1 ? 's' : ''}</strong> · Subtotal ₹${subtotal.toLocaleString('en-IN')}`
      + (disc ? ` · Discount −₹${disc.toLocaleString('en-IN')} · <strong>Total ₹${(subtotal - disc).toLocaleString('en-IN')}</strong>` : '');
  }

  document.getElementById('shipOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(_shipRestore, 60);
}

function closeShipModal() {
  document.getElementById('shipOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function shipOverlayClick(e) {
  if (e.target === document.getElementById('shipOverlay')) closeShipModal();
}

document.addEventListener('keydown', function (e) {
  const overlay = document.getElementById('shipOverlay');
  if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) closeShipModal();
});

// ─── RESTORE SAVED ADDRESS ────────────────────────────────────────────────────
function _shipRestore() {
  const d = _shipLoad();
  if (!d) return;
  _sset('sinp-name', d.name || '');
  _sset('sinp-mobile', d.mobile || '');
  _sset('sinp-addr1', d.addr1 || '');
  _sset('sinp-addr2', d.addr2 || '');
  if (d.pin && d.pin.length === 6) {
    _sset('sinp-pin', d.pin);
    _shipPinLookup(d.pin, d.area || '');
  }
}

// ─── FIELD HELPERS ────────────────────────────────────────────────────────────
function _sset(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function _sget(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function _serr(fId, on) { const el = document.getElementById(fId); if (el) el.classList.toggle('has-error', on); }
function _sclerr(fId) { _serr(fId, false); }

// Clear field error on input
(function () {
  const map = {
    'sinp-name': 'sf-name', 'sinp-mobile': 'sf-mobile', 'sinp-pin': 'sf-pin',
    'sinp-city': 'sf-city', 'sinp-area': 'sf-area', 'sinp-addr1': 'sf-addr1'
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => _sclerr(map[id]));
  });
})();

// ─── PIN CODE LOOKUP (pincodes table) ────────────────────────────────────────
let _shipPinTimer = null;
(function () {
  const pinEl = document.getElementById('sinp-pin');
  if (!pinEl) return;
  pinEl.addEventListener('input', function () {
    clearTimeout(_shipPinTimer);
    const v = this.value.replace(/\D/g, '');
    this.value = v;
    if (v.length === 6) {
      _shipPinTimer = setTimeout(() => _shipPinLookup(v, ''), 400);
    } else {
      _resetShipPin();
      _shipPinSt('', '');
    }
  });
})();

function _resetShipPin() {
  _sset('sinp-city', '');
  _sset('sinp-state', '');
  const areaEl = document.getElementById('sinp-area');
  if (areaEl) areaEl.innerHTML = '<option value="">Enter PIN to load areas...</option>';
}

function _shipPinSt(cls, msg) {
  const el = document.getElementById('shipPinSt');
  if (!el) return;
  el.className = 'ship-pin-st' + (cls ? ' ' + cls : '');
  el.textContent = msg;
}

async function _shipPinLookup(pin, preferArea) {
  _shipPinSt('loading', '⏳ Looking up...');
  _resetShipPin();

  const cityEl  = document.getElementById('sinp-city');
  const stateEl = document.getElementById('sinp-state');
  const areaEl  = document.getElementById('sinp-area');
  if (cityEl)  cityEl.removeAttribute('readonly');
  if (stateEl) stateEl.removeAttribute('readonly');

  try {
    const { data: rows, error } = await sb
      .from('pincodes')
      .select('offices')
      .eq('pin', pin);

    if (error) throw error;

    if (!rows || !rows.length) {
      _shipPinSt('warn', '⚠️ PIN not found — please enter manually');
      areaEl.innerHTML = '<option value="">Select area...</option><option value="Other">Other / Not listed</option>';
      return;
    }

    const offices = rows[0].offices || [];
    if (!offices.length) {
      _shipPinSt('warn', '⚠️ No data — please enter manually');
      areaEl.innerHTML = '<option value="">Select area...</option><option value="Other">Other / Not listed</option>';
      return;
    }

    const city  = offices[0].District || offices[0].Division || '';
    const state = offices[0].State || '';
    _sset('sinp-city', city);
    _sset('sinp-state', state);
    _sclerr('sf-city');

    areaEl.innerHTML = '<option value="">Select your area...</option>';
    const seen = new Set();
    offices.forEach(o => {
      if (o.Name && !seen.has(o.Name)) {
        seen.add(o.Name);
        const opt = document.createElement('option');
        opt.value = o.Name;
        opt.textContent = o.Name;
        if (preferArea && o.Name === preferArea) opt.selected = true;
        areaEl.appendChild(opt);
      }
    });
    const other = document.createElement('option');
    other.value = 'Other';
    other.textContent = 'Other / Not listed';
    areaEl.appendChild(other);

    _sclerr('sf-area');
    _shipPinSt('ok', '✓ ' + city + ', ' + state);

  } catch (e) {
    _shipPinSt('warn', '⚠️ Could not auto-fill — please enter manually');
    areaEl.innerHTML = '<option value="">Select area...</option><option value="Other">Other / Not listed</option>';
  }
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────
function _shipValidate() {
  let ok = true;
  if (!_sget('sinp-name')) { _serr('sf-name', true); ok = false; }
  if (!/^\d{10}$/.test(_sget('sinp-mobile'))) { _serr('sf-mobile', true); ok = false; }
  if (!/^\d{6}$/.test(_sget('sinp-pin'))) { _serr('sf-pin', true); ok = false; }
  if (!_sget('sinp-city')) { _serr('sf-city', true); ok = false; }
  if (!_sget('sinp-area')) { _serr('sf-area', true); ok = false; }
  if (!_sget('sinp-addr1')) { _serr('sf-addr1', true); ok = false; }
  return ok;
}

const SHIP_WA_BTN_HTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Confirm & Checkout on WhatsApp`;

// ─── SUBMIT (with address) ────────────────────────────────────────────────────
async function shipSubmit() {
  if (!_shipValidate()) {
    const first = document.querySelector('#shipOverlay .has-error input, #shipOverlay .has-error select');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('shipSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="ship-spin"></div> Saving details...';

  const ship = {
    name: _sget('sinp-name'), mobile: _sget('sinp-mobile'),
    pin: _sget('sinp-pin'), city: _sget('sinp-city'),
    area: _sget('sinp-area'), state: _sget('sinp-state'),
    addr1: _sget('sinp-addr1'), addr2: _sget('sinp-addr2'),
  };
  _shipSave(ship);

  const subtotal     = basket.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt  = calcDiscount(subtotal);
  const total        = subtotal - discountAmt;

  let orderId = null;
  try {
    const { data, error } = await sb.from('orders').insert({
      source: 'jewells',
      customer_name: ship.name,
      mobile: ship.mobile,
      address_line1: ship.addr1,
      address_line2: ship.addr2 || null,
      area: ship.area,
      city: ship.city,
      pincode: ship.pin,
      state: ship.state || null,
      product_id: 'BASKET',
      product_name: basket.map(i => i.name + ' ×' + i.qty).join(' | '),
      product_price: total,
      items: basket.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      order_total: total,
      promo_code: appliedPromo ? appliedPromo.code : '',
      discount_amount: discountAmt,
      status: 'pending',
      wa_sent: true
    }).select();

    if (error) throw error;
    orderId = (data && data[0]) ? data[0].id : null;
  } catch (e) {
    console.warn('[checkout] order save failed:', e.message);
  }

  showToast('✅ Address saved! Opening WhatsApp...');
  setTimeout(() => {
    closeShipModal();
    _doCheckoutWA({ ...ship, orderId });
    btn.disabled = false;
    btn.innerHTML = SHIP_WA_BTN_HTML;
  }, 700);
}

// ─── SKIP (guest order, no address) ──────────────────────────────────────────
async function shipSkip() {
  const subtotal    = basket.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = calcDiscount(subtotal);
  const total       = subtotal - discountAmt;

  try {
    await sb.from('orders').insert({
      source: 'jewells',
      customer_name: 'Guest (Skipped)',
      mobile: 'unknown',
      address_line1: 'Not provided',
      city: 'Not provided',
      pincode: '000000',
      product_id: 'BASKET',
      product_name: basket.map(i => i.name + ' ×' + i.qty).join(' | '),
      product_price: total,
      items: basket.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      order_total: total,
      promo_code: appliedPromo ? appliedPromo.code : '',
      discount_amount: discountAmt,
      status: 'skipped',
      wa_sent: true
    });
  } catch (e) {
    console.warn('[checkout] skip save failed:', e.message);
  }

  closeShipModal();
  _doCheckoutWA(null);
}

// ─── FINAL WHATSAPP MESSAGE (itemized + promo + shipping) ────────────────────
function _doCheckoutWA(ship) {
  if (basket.length === 0) return;

  const subtotal    = basket.reduce((s, i) => s + i.qty * i.price, 0);
  const discountAmt = calcDiscount(subtotal);
  const total       = subtotal - discountAmt;
  const div = '─────────────────────────';

  let msg = `🛍️ *New Order — Tiny Threads Jewells*\n${div}\n\n`;
  basket.forEach((item, idx) => {
    msg += `*${idx + 1}. ${item.name}*\n   ${item.material ? '💎 ' + item.material + '\n   ' : ''}🔢 Qty : ${item.qty} × ₹${item.price.toLocaleString('en-IN')} = ₹${(item.qty * item.price).toLocaleString('en-IN')}\n\n`;
  });

  msg += `${div}\n🧾 *Order Summary*\n   Items    : ${basket.reduce((s, i) => s + i.qty, 0)}\n   Subtotal : ₹${subtotal.toLocaleString('en-IN')}\n`;
  if (appliedPromo) msg += `   Promo    : *${appliedPromo.code}* (${Math.round(appliedPromo.discount * 100)}% off) −₹${discountAmt.toLocaleString('en-IN')}\n`;
  msg += `   *Total   : ₹${total.toLocaleString('en-IN')}*\n${div}\n`;

  if (ship) {
    msg += `\n📦 *Shipping Details*\n   Name    : ${ship.name}\n   Mobile  : ${ship.mobile}\n   Address : ${ship.addr1}${ship.addr2 ? ', ' + ship.addr2 : ''}\n   Area    : ${ship.area}\n   City    : ${ship.city} - ${ship.pin}\n   State   : ${ship.state}\n   Order # : ${ship.orderId || 'pending'}\n`;
  } else {
    msg += '\n📦 Shipping details: Not shared\n';
  }

  msg += '\nPlease confirm availability. Thank you! 🙏';
  window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
}
