/* ════════════════════════════════════════════════════════════
   TOAST.JS
   Small shared utilities used across the app:
   - showToast()  → bottom notification pill
   - openWA()     → open a WhatsApp chat with a pre-filled message
   ════════════════════════════════════════════════════════════ */

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ─── WA HELPER ───────────────────────────────────────────────────────────────
function openWA(msg) {
  window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
}
