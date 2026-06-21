/* ════════════════════════════════════════════════════════════
   PDP.JS
   Product Detail Page: fetch + render single product,
   image gallery switching, and "Buy Now" WhatsApp flow.
   Depends on: config.js, supabase-data.js (fetchProductById),
               product-render.js (parseImgs)
   ════════════════════════════════════════════════════════════ */

async function openPdp(id) {
  // Show PDP page immediately with a loader
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-pdp').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const content = document.getElementById('pdp-content');
  content.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--muted);">
    <div style="font-size:2rem;margin-bottom:.8rem;">⏳</div><p>Loading product…</p></div>`;

  const p = await fetchProductById(id);
  if (!p) {
    content.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--muted);">
      <p>Product not found. <button onclick="showPage('home')" style="color:var(--gold-dark);background:none;border:none;cursor:pointer;font-size:14px;">Go home</button></p></div>`;
    return;
  }

  currentPdp = p;
  document.getElementById('pdp-back-btn').onclick = () => showPage(p.category);

  const imgs    = parseImgs(p.images);
  const sizes   = Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? JSON.parse(p.sizes) : []);
  const emoji   = CAT_EMOJI[p.category] || '💎';
  const offPct  = (p.mrp && p.mrp > p.price) ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const catInfo = CATEGORIES[p.category] || { title: p.category };

  const mainImgHTML = imgs[0]
    ? `<img src="${imgs[0]}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block;" id="pdp-main-img">`
    : `<span style="font-size:6rem;">${emoji}</span>`;

  const thumbsHTML = imgs.length > 0
    ? imgs.map((url, i) => `
        <div class="pdp-thumb ${i === 0 ? 'active' : ''}" onclick="pdpSwitchImg('${url}',this)">
          <img src="${url}" alt="${p.name} view ${i + 1}" style="width:100%;height:100%;object-fit:cover;">
        </div>`).join('')
    : `<div class="pdp-thumb active">${emoji}</div>`;

  const sizesHTML = sizes.length > 0 ? `
    <div class="pdp-meta-item">
      <span class="pdp-meta-label">Sizes</span>
      <span class="pdp-meta-val" style="display:flex;gap:6px;flex-wrap:wrap;">
        ${sizes.map(s => `<span style="border:1.5px solid var(--border);border-radius:8px;padding:3px 10px;font-size:12px;cursor:pointer;transition:all .2s;"
          onclick="this.style.borderColor='var(--gold)';this.style.background='var(--gold-light)'">${s}</span>`).join('')}
      </span>
    </div>` : '';

  content.innerHTML = `
    <div>
      <div class="pdp-main-img" style="cursor:zoom-in;">${mainImgHTML}</div>
      <div class="pdp-thumb-row">${thumbsHTML}</div>
    </div>
    <div>
      <div class="pdp-eyebrow">${catInfo.title}</div>
      <h1 class="pdp-title">${p.name}</h1>
      <div class="pdp-sub">${p.subcategory || ''}</div>
      <div class="pdp-price-row">
        <span class="pdp-price">₹${Number(p.price).toLocaleString('en-IN')}</span>
        ${p.mrp && p.mrp > p.price ? `<span class="prod-mrp" style="font-size:1rem;">₹${Number(p.mrp).toLocaleString('en-IN')}</span>` : ''}
        ${offPct > 0 ? `<span class="prod-off">${offPct}% off</span>` : ''}
      </div>
      <div class="pdp-desc">${p.description}</div>
      <div class="pdp-meta-row">
        ${p.material          ? `<div class="pdp-meta-item"><span class="pdp-meta-label">Material</span><span class="pdp-meta-val">${p.material}</span></div>` : ''}
        ${p.finish            ? `<div class="pdp-meta-item"><span class="pdp-meta-label">Finish</span><span class="pdp-meta-val">${p.finish}</span></div>` : ''}
        ${p.care_instructions ? `<div class="pdp-meta-item"><span class="pdp-meta-label">Care</span><span class="pdp-meta-val">${p.care_instructions}</span></div>` : ''}
        ${sizesHTML}
      </div>
      <div class="pdp-add-row">
        <button class="pdp-add-btn" onclick="addToBasket('${p.id}')">🛒 Add to Basket</button>
        <button class="pdp-wa-btn" onclick="buyNowWA('${p.id}')">
          <svg style="width:16px;height:16px;fill:white;flex-shrink:0;" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Buy Now
        </button>
      </div>
    </div>`;
}

function pdpSwitchImg(url, thumbEl) {
  const mainImg = document.getElementById('pdp-main-img');
  if (mainImg) { mainImg.src = url; }
  document.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
}

function buyNowWA(id) {
  const p = PRODUCTS.find(pr => pr.id === id)
    || Object.values(catCache).flat().find(pr => pr.id === id)
    || currentPdp;
  if (!p) return;
  const msg = `Hi! I want to buy:\n\n*${p.name}*\n${p.material || ''}\nPrice: ₹${Number(p.price).toLocaleString('en-IN')}\n\nPlease confirm availability and share payment details.`;
  window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
}
