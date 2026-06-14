/* ════════════════════════════════════════════════════════════
   BASKET.JS
   Cart state + UI: add/remove items, quantity changes,
   drawer open/close, and WhatsApp checkout.
   Depends on: config.js (basket, WA_NUMBER, CAT_EMOJI),
               toast.js (showToast), product-render.js (parseImgs)
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
  const total = basket.reduce((s, b) => s + b.price * b.qty, 0);
  const count = basket.reduce((s, b) => s + b.qty, 0);
  document.getElementById('nav-basket-count').textContent = count;
  document.getElementById('basket-total').textContent = '₹' + total.toLocaleString('en-IN');

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

function checkoutWA() {
  if (!basket.length) return;
  const lines = basket.map(b => `• *${b.name}* × ${b.qty} = ₹${(b.price * b.qty).toLocaleString('en-IN')}`).join('\n');
  const total = basket.reduce((s, b) => s + b.price * b.qty, 0);
  const msg = `Hi! I'd like to place an order from Tiny Threads Jewells:\n\n${lines}\n\n*Total: ₹${total.toLocaleString('en-IN')}*\n\nPlease confirm availability and share payment & delivery details.`;
  window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
}
