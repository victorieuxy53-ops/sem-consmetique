/* Noyau client : paramètres, formatage, téléphone, horaires, catalogue, API, stores (panier, toasts, modales). */
import { useSyncExternalStore } from 'react';

/* ------------------------------------------------- paramètres du site */
let S = {};
export const settings = () => S;
export const setSettings = (s) => { S = s || {}; };

export const cx = (...a) => a.filter(Boolean).join(' ');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* navigation avec rideau (enregistrée par <FX />) */
let nav = (url) => { location.href = url; };
export const setNavigator = (fn) => { nav = fn; };
export const go = (url, opts) => nav(url, opts);

/* ------------------------------------------------------------- API */
export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const opts = { method, headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin' };
  if (body !== undefined) {
    if (raw) opts.body = body;
    else { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  }
  let res;
  try { res = await fetch(path, opts); } catch { throw new Error('Connexion impossible. Vérifiez votre réseau puis réessayez.'); }
  const data = (res.headers.get('content-type') || '').includes('json') ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Une erreur est survenue.'), { status: res.status });
  return data;
}

/* ------------------------------------------------------ formatage */
const nf = new Intl.NumberFormat('fr-FR');
export const num = (n) => nf.format(Math.round(+n || 0));
export const money = (n) => `${num(n)} FCFA`;
/** Dates « AAAA-MM-JJ » à midi UTC, horodatages (UTC en base) décalés à l'heure de l'institut :
    rendu identique côté serveur et navigateur. */
const asDate = (d) => {
  if (d instanceof Date) return d;
  const s = String(d);
  if (s.length === 10) return new Date(s + 'T12:00:00Z');
  return new Date(Date.parse(s.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z')) + (+S.tz_offset || 0) * 36e5);
};
export const fdate = (d, o = { weekday: 'long', day: 'numeric', month: 'long' }) => (d ? asDate(d).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...o }) : '');
export const fshort = (d) => fdate(d, { day: 'numeric', month: 'short', year: 'numeric' });
export const fdatetime = (d) => (d ? asDate(d).toLocaleString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const fdur = (m) => { m = +m || 0; const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ' ' + String(r).padStart(2, '0') : ''}` : `${r} min`; };
export const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
export const initials = (s) => String(s || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const hm = (t) => String(t || '').replace(':', 'h');
export const first = (n) => String(n || '').split(' ')[0];
export const pct = (a, b) => Math.min(100, Math.round((a / Math.max(1, b)) * 100));
export const discount = (p) => (p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0);
/** Prix dégressif : `bulk_price` l'unité dès `bulk_qty` articles (même règle côté serveur, server/util.js). */
export const hasBulk = (p) => p.bulk_qty > 1 && p.bulk_price > 0 && p.bulk_price < p.price;
export const unitPrice = (p, qty) => (hasBulk(p) && qty >= p.bulk_qty ? p.bulk_price : p.price);

/* --------------------------------------------------------- téléphone */
export const digits = (s) => String(s || '').replace(/\D/g, '');
export function intl(n) {
  const d = digits(n), cc = digits(S.country_code || '229');
  if (!d) return '';
  return d.startsWith(cc) && d.length > 10 ? d : cc + d;
}
export const telHref = (n) => 'tel:+' + intl(n);
export const waHref = (n, text = '') => `https://wa.me/${intl(n)}${text ? '?text=' + encodeURIComponent(text) : ''}`;
export const waMain = (text) => waHref(S.whatsapp || S.phones?.[0], text);

/** Toutes les demandes du site arrivent sur le WhatsApp de la structure.
    À appeler PENDANT le clic d'envoi (avant tout `await`) : sur ordinateur, l'onglet est ouvert tout de suite
    (sinon le navigateur le bloquerait), puis dirigé vers WhatsApp une fois la demande enregistrée ;
    sur téléphone, l'application WhatsApp s'ouvre directement. */
export function whatsappRelay() {
  const mobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  let w = null;
  if (!mobile) {
    try {
      w = window.open('', '_blank');
      if (w) { w.opener = null; w.document.title = 'WhatsApp'; w.document.body.innerHTML = '<p style="font:16px sans-serif;padding:24px">Ouverture de WhatsApp…</p>'; }
    } catch { w = null; }
  }
  return {
    /** Ouvre la conversation avec le message prérempli ; renvoie le lien (à proposer en bouton si l'ouverture est bloquée). */
    send(text) {
      const url = waMain(text);
      if (w && !w.closed) w.location.href = url;
      else if (mobile) location.href = url;
      return url;
    },
    cancel() { if (w && !w.closed) w.close(); },
  };
}
export const phones = () => (S.phones || []).filter(Boolean);
export const address = () => [S.address, S.city].filter(Boolean).join(', ');

/* ------------------------------------------------- horaires d'ouverture */
export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const localNow = () => new Date(Date.now() + (+S.tz_offset || 0) * 3600e3);
export const todayStr = () => localNow().toISOString().slice(0, 10);
export const hoursLabel = (h) => (h ? `${hm(h[0])} à ${hm(h[1])}` : 'Fermé');
export function openStatus() {
  const h = S.hours || {}, now = localNow(), wd = now.getUTCDay();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toM = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
  const today = h[wd];
  if (today && mins >= toM(today[0]) && mins < toM(today[1])) return { open: true, label: `Ouvert · ferme à ${hm(today[1])}` };
  for (let i = 0; i < 7; i++) {
    const d = (wd + i) % 7, x = h[d];
    if (!x) continue;
    if (i === 0 && mins < toM(x[0])) return { open: false, label: `Fermé · ouvre à ${hm(x[0])}` };
    if (i > 0) return { open: false, label: `Fermé · ouvre ${i === 1 ? 'demain' : DAYS[d].toLowerCase()} à ${hm(x[0])}` };
  }
  return { open: false, label: 'Fermé' };
}

/* --------------------------------------------------------- catalogue */
export const CATS = {
  visage: { label: 'Soins du visage', icon: 'face', color: '#d6336f', desc: 'Nettoyage profond, éclat, anti-taches, anti-âge' },
  corps: { label: 'Soins du corps', icon: 'leaf', color: '#3b56a6', desc: 'Gommages, massages, enveloppements au karité' },
  makeup: { label: 'Make-up', icon: 'brush', color: '#a8235a', desc: 'Jour, soirée, mariée, cours d’auto-maquillage' },
  foulard: { label: 'Attache foulard', icon: 'wrap', color: '#2d4387', desc: 'Quotidien, gele de cérémonie, forfaits mariage' },
  sante: { label: 'Santé & bien-être', icon: 'heart', color: '#d6336f', desc: 'Pédicure, manucure, réflexologie' },
  dermo: { label: 'Dermo-conseils', icon: 'drop', color: '#3b56a6', desc: 'Diagnostic, routine personnalisée, suivi de peau' },
};
export const PCATS = {
  'soin-visage': 'Soins visage', 'soin-corps': 'Soins corps', maquillage: 'Maquillage',
  foulards: 'Foulards & geles', coffrets: 'Coffrets cadeaux', 'bien-etre': 'Intimité & bien-être',
};
export const STATUS = {
  bookings: { pending: ['En attente', 'warn'], confirmed: ['Confirmé', 'info'], done: ['Effectué', 'ok'], cancelled: ['Annulé', 'bad'], noshow: ['Absente', 'bad'] },
  orders: { pending: ['Reçue', 'warn'], confirmed: ['Confirmée', 'info'], preparing: ['En préparation', 'info'], shipped: ['En livraison', 'info'], delivered: ['Livrée', 'ok'], cancelled: ['Annulée', 'bad'] },
  custom_orders: { new: ['Nouvelle', 'warn'], quoted: ['Devis envoyé', 'info'], accepted: ['Acceptée', 'info'], in_progress: ['En réalisation', 'info'], done: ['Terminée', 'ok'], cancelled: ['Annulée', 'bad'] },
  enrollments: { pending: ['Paiement en vérification', 'warn'], active: ['Accès actif', 'ok'], rejected: ['Refusé', 'bad'] },
  registrations: { pending: ['En attente', 'warn'], confirmed: ['Confirmée', 'ok'], attended: ['Présente', 'ok'], cancelled: ['Annulée', 'bad'] },
};
export const CUSTOM_TYPES = {
  coffret: ['Coffret cadeau personnalisé', 'gift'], soin: ['Soin / routine sur-mesure', 'drop'], foulard: ['Attache foulard événement', 'wrap'],
  makeup: ['Make-up événement / domicile', 'brush'], bon: ['Bon cadeau', 'ticket'], autre: ['Autre demande', 'edit'],
};

/* ------------------------------------------------------- markdown sûr */
export function md(src) {
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  let html = '', list = false, para = [];
  const flush = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const endList = () => { if (list) { html += '</ul>'; list = false; } };
  for (const line of esc(src).split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith('### ')) { flush(); endList(); html += `<h3>${inline(t.slice(4))}</h3>`; }
    else if (t.startsWith('## ')) { flush(); endList(); html += `<h2>${inline(t.slice(3))}</h2>`; }
    else if (t.startsWith('- ')) { flush(); if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(t.slice(2))}</li>`; }
    else if (!t) { flush(); endList(); }
    else { endList(); para.push(t); }
  }
  flush(); endList();
  return html;
}

/** Lit un formulaire en objet (cases à cocher multiples : tableaux). */
export function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') {
      if (form.querySelectorAll(`[name="${el.name}"]`).length > 1) { (o[el.name] ||= []); if (el.checked) o[el.name].push(el.value); }
      else o[el.name] = el.checked;
    } else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value;
  }
  return o;
}

export function imageToDataUrl(file, max = 1600, q = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

export function downloadIcs({ title, date, time, duration = 60, location = '', description = '' }) {
  const clean = (s) => String(s).replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number);
  const f = (dt) => dt.toISOString().replace(/[-:]/g, '').slice(0, 15);
  const start = new Date(Date.UTC(y, m - 1, d, hh, mm)), end = new Date(start.getTime() + duration * 60000);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SEM Cosmetique//RDV//FR', 'BEGIN:VEVENT', `UID:${Date.now()}@sem-cosmetique`,
    `DTSTAMP:${f(new Date())}Z`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${clean(title)}`, `LOCATION:${clean(location)}`,
    `DESCRIPTION:${clean(description)}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: 'rendez-vous.ics' });
  document.body.append(a); a.click(); a.remove();
}

/* coordonnées mémorisées pour pré-remplir les formulaires */
const CONTACT_KEY = 'institut.contact';
export const savedContact = () => { try { return JSON.parse(localStorage.getItem(CONTACT_KEY)) || {}; } catch { return {}; } };
export const saveContact = (c) => { try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: c.name, phone: c.phone, email: c.email })); } catch { /* ignore */ } };

/* ------------------------------------------------------------- stores */
export function store(init) {
  let v = init;
  const subs = new Set();
  return {
    init, get: () => v,
    set(n) { v = typeof n === 'function' ? n(v) : n; subs.forEach((f) => f()); },
    sub(f) { subs.add(f); return () => subs.delete(f); },
  };
}
export const useStore = (st) => useSyncExternalStore(st.sub, st.get, () => st.init);

export const ui = store({ cart: false, menu: false });
export const toasts = store([]);
export const modals = store([]);

let uid = 0;
export function toast(msg, type = 'ok', ms = 4500) { toasts.set((l) => [...l, { id: ++uid, msg, type, ms }]); }
export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers'); }
  catch { toast('Copie impossible : ' + text, 'info'); }
}

/** Ouvre une modale : `render(close)` fournit le contenu. */
export function openModal({ title = '', size = '', render, onClose }) {
  const id = ++uid;
  modals.set((l) => [...l, { id, title, size, render, onClose }]);
  return { close: () => closeModal(id) };
}
export const closeModal = (id) => modals.set((l) => l.map((m) => (m.id === id ? { ...m, closing: true } : m)));

/** Verrou de défilement partagé (modales, tiroir panier…). */
const locks = new Set();
export function lockScroll(key, on) {
  if (on) locks.add(key); else locks.delete(key);
  document.body.classList.toggle('no-scroll', locks.size > 0);
}

/* ------------------------------------------------------------- panier */
const CART_KEY = 'institut.cart.v1';
export const cartStore = store([]);
const save = (items) => { cartStore.set(items); try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { /* stockage indisponible */ } };
export const cart = {
  load() { try { const v = JSON.parse(localStorage.getItem(CART_KEY)); if (Array.isArray(v)) cartStore.set(v); } catch { /* ignore */ } },
  add(p, qty = 1) {
    const items = cartStore.get(), it = items.find((i) => i.id === p.id);
    save(it ? items.map((i) => (i === it ? { ...i, price: p.price, bulk_qty: p.bulk_qty, bulk_price: p.bulk_price, qty: Math.min(99, i.qty + qty) } : i))
      : [...items, { id: p.id, slug: p.slug, name: p.name, price: p.price, bulk_qty: p.bulk_qty, bulk_price: p.bulk_price, qty, art: p.art, color: p.color, image: p.image, stock: p.stock }]);
  },
  set(id, qty) { if (qty <= 0) return cart.remove(id); save(cartStore.get().map((i) => (i.id === id ? { ...i, qty: Math.min(99, qty) } : i))); },
  remove(id) { save(cartStore.get().filter((i) => i.id !== id)); },
  clear() { save([]); },
  /** Aligne le panier mémorisé sur le catalogue en ligne : retire les produits masqués ou supprimés
      (sinon leurs liens mènent à une page introuvable) et met à jour prix, photo et stock. */
  async sync() {
    if (!cartStore.get().length) return;
    let list;
    try { list = await api('/api/products'); } catch { return; }
    const byId = new Map(list.map((p) => [p.id, p]));
    const items = cartStore.get(), kept = [];
    for (const i of items) {
      const p = byId.get(i.id);
      if (p) kept.push({ ...i, slug: p.slug, name: p.name, price: p.price, bulk_qty: p.bulk_qty, bulk_price: p.bulk_price, art: p.art, color: p.color, image: p.image, stock: p.stock });
    }
    save(kept);
    if (kept.length < items.length) toast('Votre panier a été mis à jour : certains produits ne sont plus disponibles.', 'info');
  },
  count: (items = cartStore.get()) => items.reduce((t, i) => t + i.qty, 0),
  total: (items = cartStore.get()) => items.reduce((t, i) => t + i.qty * unitPrice(i, i.qty), 0),
};
export const useCart = () => useStore(cartStore);
