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
// Each category now carries a `group`: 'jewellery' or 'accessories'.
// This drives the grouped nav menu, mobile drawer sections, and home page grid.
const CATEGORIES = {
  // ── Jewellery ──
  rings:            { title:'Rings',              desc:'Stackable, statement, and everyday — a ring for every finger and every mood.',                      emoji:'💍', group:'jewellery' },
  necklaces:        { title:'Necklaces',          desc:'From delicate chains to statement temple jewellery — adorn your neckline.',                        emoji:'📿', group:'jewellery' },
  earrings:         { title:'Earrings',           desc:'Studs, drops, jhumkas, chandbalis — earrings that complete every look.',                           emoji:'✨', group:'jewellery' },
  bangles:          { title:'Bangles & Bracelets',desc:'From slim gold bangles to bold oxidised kadas — grace your wrists.',                                emoji:'🌸', group:'jewellery' },
  bridal:           { title:'Bridal Collections', desc:'Your most important day deserves the most beautiful jewellery. Bridal sets crafted to perfection.', emoji:'👰', group:'jewellery' },
  gifting:          { title:'Gifting Collections',desc:'Beautiful curated sets, gift-boxed and ready to delight someone special.',                          emoji:'🎁', group:'jewellery' },
  anklets:          { title:'Anklets',            desc:'Delicate payals and bold anklets — let your feet sparkle too.',                                     emoji:'🦶', group:'jewellery' },
  maangtika:        { title:'Maang Tika',         desc:'Festive and bridal maang tikas in Kundan, Polki, and more.',                                        emoji:'🌺', group:'jewellery' },

  // ── Accessories (kids, moms & ladies) ──
  hairaccessories:  { title:'Hair Accessories',   desc:'Clips, bands, bows & scrunchies — pretty everyday hair essentials.',                                emoji:'🎀', group:'accessories' },
  kidsaccessories:  { title:'Kids Accessories',   desc:'Cute charms, bracelets & fun accessories made just for little ones.',                               emoji:'🧸', group:'accessories' },
  bags:             { title:'Bags & Potlis',      desc:'Potli bags, clutches & slings to complete every outfit.',                                           emoji:'👜', group:'accessories' },
  mombaby:          { title:'Mom & Baby',         desc:'Nursing-friendly & baby-safe accessories, plus matching mom-baby sets.',                            emoji:'🤱', group:'accessories' },
  watches:          { title:'Watches',            desc:'Fashion watches for ladies and kids — style that keeps time.',                                      emoji:'⌚', group:'accessories' },
  scarves:          { title:'Scarves & Stoles',   desc:'Dupattas, stoles & scarves to drape any look in elegance.',                                         emoji:'🧣', group:'accessories' },
};

// Ordered group metadata — used to render grouped sections (nav, drawer, home grid)
const CATEGORY_GROUPS = [
  { key:'jewellery',   label:'Jewellery',   icon:'💎' },
  { key:'accessories', label:'Accessories', icon:'🎀' },
];

// Helper: get all category keys belonging to a group, in CATEGORIES insertion order
function getCategoriesByGroup(groupKey) {
  return Object.keys(CATEGORIES).filter(k => CATEGORIES[k].group === groupKey);
}

// Category → emoji fallback (used when no product image is available)
const CAT_EMOJI = {
  rings:'💍', necklaces:'📿', earrings:'✨', bangles:'🌸',
  bridal:'👰', gifting:'🎁', anklets:'🦶', maangtika:'🌺',
  hairaccessories:'🎀', kidsaccessories:'🧸', bags:'👜',
  mombaby:'🤱', watches:'⌚', scarves:'🧣'
};

// ─── SHARED STATE ────────────────────────────────────────────────────────────
let PRODUCTS   = [];   // all active products, filled from Supabase on load
let basket     = [];   // basket line items
let currentPdp = null; // product currently shown on PDP
let currentCat = null; // category page currently shown
let catCache   = {};   // { category: [products] } — avoids refetching per category