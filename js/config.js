/* ════════════════════════════════════════════════════════════
   CONFIG.JS
   Global configuration: Supabase credentials, WhatsApp number,
   category metadata, shared state.
   ── This is the file you'll edit most often ──
   ════════════════════════════════════════════════════════════ */

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const SB_URL = 'https://uzzkitpcmoghrwxahtrc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6emtpdHBjbW9naHJ3eGFodHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODU2MTYsImV4cCI6MjA5Njg2MTYxNn0.F8GdHWOQTIIBLEWqZzXaHdQKXEPhNDsOea5SdraPx3I';
const sb = supabase.createClient(SB_URL, SB_KEY);

// ─── WHATSAPP ────────────────────────────────────────────────────────────────
const WA_NUMBER = '917879976016';

// ─── CATEGORY META ───────────────────────────────────────────────────────────
const CATEGORIES = {
  rings:      { title:'Rings',              desc:'Stackable, statement, and everyday — a ring for every finger and every mood.',                      emoji:'💍' },
  necklaces:  { title:'Necklaces',          desc:'From delicate chains to statement temple jewellery — adorn your neckline.',                        emoji:'📿' },
  earrings:   { title:'Earrings',           desc:'Studs, drops, jhumkas, chandbalis — earrings that complete every look.',                           emoji:'✨' },
  bangles:    { title:'Bangles & Bracelets',desc:'From slim gold bangles to bold oxidised kadas — grace your wrists.',                                emoji:'🌸' },
  bridal:     { title:'Bridal Collections', desc:'Your most important day deserves the most beautiful jewellery. Bridal sets crafted to perfection.', emoji:'👰' },
  gifting:    { title:'Gifting Collections',desc:'Beautiful curated sets, gift-boxed and ready to delight someone special.',                          emoji:'🎁' },
  anklets:    { title:'Anklets',            desc:'Delicate payals and bold anklets — let your feet sparkle too.',                                     emoji:'🦶' },
  maangtika:  { title:'Maang Tika',         desc:'Festive and bridal maang tikas in Kundan, Polki, and more.',                                        emoji:'🌺' },
};

// Category → emoji fallback (used when no product image is available)
const CAT_EMOJI = {
  rings:'💍', necklaces:'📿', earrings:'✨', bangles:'🌸',
  bridal:'👰', gifting:'🎁', anklets:'🦶', maangtika:'🌺'
};

// ─── SHARED STATE ────────────────────────────────────────────────────────────
let PRODUCTS   = [];   // all active products, filled from Supabase on load
let basket     = [];   // basket line items
let currentPdp = null; // product currently shown on PDP
let currentCat = null; // category page currently shown
let catCache   = {};   // { category: [products] } — avoids refetching per category
