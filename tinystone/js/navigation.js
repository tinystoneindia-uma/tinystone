/* ════════════════════════════════════════════════════════════
   NAVIGATION.JS
   Page switching, splash screen, mobile slide-out menu,
   and mobile bottom category nav (scrolling pill strip).
   ════════════════════════════════════════════════════════════ */

// ─── SPLASH ──────────────────────────────────────────────────────────────────
(function() {
  const slides = document.querySelectorAll('.splash-slide');
  let cur = 0;
  if (slides.length > 1) {
    setInterval(() => {
      slides[cur].classList.remove('active');
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add('active');
    }, 3500);
  }
})();

function enterSite() {
  const splash = document.getElementById('splash-screen');
  splash.classList.add('splash-exit');
  setTimeout(() => {
    splash.style.display = 'none';
    document.body.classList.remove('splash-active');
  }, 550);
}

// ─── PAGE NAVIGATION ─────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.desktop-nav-item').forEach(a => a.classList.remove('active'));
  document.querySelectorAll('.mob-nav-item').forEach(b => b.classList.remove('active'));

  const pageEl = document.getElementById('page-' + id);
  if (!pageEl) return;
  pageEl.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Highlight + smooth-scroll active link into centre of desktop nav track
  const deskBtn = document.getElementById('dn-' + id);
  if (deskBtn) {
    deskBtn.classList.add('active');
    const deskTrack = document.getElementById('desktop-nav-track');
    if (deskTrack) {
      const btnLeft  = deskBtn.offsetLeft;
      const btnWidth = deskBtn.offsetWidth;
      const trackW   = deskTrack.offsetWidth;
      deskTrack.scrollTo({ left: btnLeft - (trackW / 2) + (btnWidth / 2), behavior: 'smooth' });
    }
  }

  // Highlight + smooth-scroll active pill into centre of mobile bottom nav track
  const mobBtn = document.getElementById('mn-' + id);
  if (mobBtn) {
    mobBtn.classList.add('active');
    const track = document.getElementById('mob-nav-track');
    if (track) {
      const btnLeft  = mobBtn.offsetLeft;
      const btnWidth = mobBtn.offsetWidth;
      const trackW   = track.offsetWidth;
      track.scrollTo({ left: btnLeft - (trackW / 2) + (btnWidth / 2), behavior: 'smooth' });
    }
  }

  if (CATEGORIES[id]) {
    currentCat = id;
    renderCategoryPage(id);
  }
}

// ─── MOBILE MENU ─────────────────────────────────────────────────────────────
function openMobMenu() {
  document.getElementById('mob-menu-overlay').classList.add('open');
  document.getElementById('mob-menu-drawer').classList.add('open');
}
function closeMobMenu() {
  document.getElementById('mob-menu-overlay').classList.remove('open');
  document.getElementById('mob-menu-drawer').classList.remove('open');
}

// ─── HISTORY BACK SHIM ───────────────────────────────────────────────────────
// PDP "Back" button reuses history.back() — route it to the right category
history.back = function() {
  if (currentPdp) showPage(currentPdp.category);
  else showPage('home');
};