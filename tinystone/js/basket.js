/* ════════════════════════════════════════════════════════════
   BASKET.JS
   Cart state + UI: add/remove items, quantity changes,
   drawer open/close, promo discount display, and checkout
   (opens the shipping modal before sending to WhatsApp).
   Depends on: config.js (basket, WA_NUMBER, CAT_EMOJI),
               toast.js (showToast), product-render.js (parseImgs),
               promo.js (appliedPromo, calcDiscount),
               checkout.js (openShipModal, _doCheckoutWA)
   ════════════════════════════════════════════════════════════ */

function addToBasket(id) {
  const p = PRODUCTS.find(pr => pr.id === id)
    || Object.values(catCache).flat().find(pr => pr.id === id)
    || currentPdp;
  if (!p) return;

  const existing = basket.find(b => b.id === id);
  if (existing) {
    existing.qty++;
  } else {
    const imgs = parseImgs(p.images);
    basket.push({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      material: p.material || '',
      category: p.category,
      img: imgs[0] || null,
      qty: 1
    });
  }
  updateBasketUI();
  showToast((CAT_EMOJI[p.category] || '💎') + ' Added to basket!');
}

function changeQty(id, delta) {
  const item = basket.find(b => b.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) basket = basket.filter(b => b.id !== id);
  updateBasketUI();
}

function updateBasketUI() {
  const subtotal    = basket.reduce((s, b) => s + b.price * b.qty, 0);
  const count       = basket.reduce((s, b) => s + b.qty, 0);
  const discountAmt = (typeof calcDiscount === 'function') ? calcDiscount(subtotal) : 0;
  const total       = subtotal - discountAmt;

  document.getElementById('nav-basket-count').textContent = count;

  const subtotalEl = document.getElementById('basket-subtotal');
  if (subtotalEl) subtotalEl.textContent = '₹' + subtotal.toLocaleString('en-IN');

  document.getElementById('basket-total').textContent = '₹' + total.toLocaleString('en-IN');

  // Discount row (only present if promo applied)
  const discRow = document.getElementById('discount-row');
  if (discRow) {
    if (typeof appliedPromo !== 'undefined' && appliedPromo && subtotal > 0) {
      discRow.style.display = 'flex';
      const labelEl  = document.getElementById('discount-label');
      const amountEl = document.getElementById('discount-amount');
      if (labelEl)  labelEl.textContent  = appliedPromo.label;
      if (amountEl) amountEl.textContent = '−₹' + discountAmt.toLocaleString('en-IN');
    } else {
      discRow.style.display = 'none';
    }
  }

  // Checkout button enable/disable
  const checkoutBtn = document.getElementById('basket-checkout-btn');
  if (checkoutBtn) checkoutBtn.disabled = basket.length === 0;

  const foot    = document.getElementById('basket-foot');
  const itemsEl = document.getElementById('basket-items');

  if (basket.length === 0) {
    foot.style.display = 'none';
    itemsEl.innerHTML = '<div class="basket-empty"><div class="basket-empty-icon">💍</div><p>Your basket is empty.<br>Add some beautiful pieces!</p></div>';
    return;
  }

  foot.style.display = 'block';
  itemsEl.innerHTML = basket.map(item => {
    const emoji = CAT_EMOJI[item.category] || '💎';
    const imgHTML = item.img
      ? `<img src="${item.img}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
      : emoji;
    return `
      <div class="basket-item">
        <div class="basket-item-img">${imgHTML}</div>
        <div class="basket-item-info">
          <div class="basket-item-name">${item.name}</div>
          <div class="basket-item-sub">${item.material}</div>
          <div class="basket-item-row">
            <span class="basket-item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
            <div class="basket-qty">
              <button onclick="changeQty('${item.id}',-1)">−</button>
              <span>${item.qty}</span>
              <button onclick="changeQty('${item.id}',+1)">+</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function openBasket() {
  document.getElementById('basket-overlay').classList.add('open');
  document.getElementById('basket-drawer').classList.add('open');
}
function closeBasket() {
  document.getElementById('basket-overlay').classList.remove('open');
  document.getElementById('basket-drawer').classList.remove('open');
}

// Checkout now opens the shipping/address modal first (checkout.js).
// The modal's "Confirm" or "Skip" buttons trigger _doCheckoutWA() which
// builds the itemized WhatsApp message (incl. promo discount + address).
function checkoutWA() {
  if (!basket.length) return;
  if (typeof openShipModal === 'function') {
    openShipModal();
  } else {
    // Fallback if checkout.js isn't loaded
    _doCheckoutWA(null);
  }
}
