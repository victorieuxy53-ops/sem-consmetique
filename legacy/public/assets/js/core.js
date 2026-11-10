/* Noyau partagé : état, API, utilitaires, UI (modale, toasts), panier. */
import { icon } from './icons.js';
export { icon };

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export const state = { settings: null, user: null };

/* ------------------------------------------------------------- bus */
const bus = new EventTarget();
export const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));
export const on = (n, f) => { const h = (e) => f(e.detail); bus.addEventListener(n, h); return () => bus.removeEventListener(n, h); };

/* navigation (enregistrée par le routeur) */
let navigator_ = (url) => { location.href = url; };
export const setNavigator = (fn) => { navigator_ = fn; };
export const go = (url, opts) => navigator_(url, opts);

/* ------------------------------------------------------------- API */
export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const opts = { method, headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin' };
  if (body !== undefined) {
    if (raw) opts.body = body;
    else { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  }
  let res;
  try { res = await fetch(path, opts); } catch { throw new Error('Connexion impossible. Vérifiez votre réseau puis réessayez.'); }
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Une erreur est survenue.');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ------------------------------------------------------ formatage */
const nf = new Intl.NumberFormat('fr-FR');
export const num = (n) => nf.format(Math.round(+n || 0));
export const money = (n) => `${nf.format(Math.round(+n || 0))} FCFA`;
const asDate = (d) => (d instanceof Date ? d : new Date(String(d).length === 10 ? d + 'T12:00:00' : String(d).replace(' ', 'T') + (String(d).includes('Z') ? '' : 'Z')));
export const fdate = (d, o = { weekday: 'long', day: 'numeric', month: 'long' }) => (d ? asDate(d).toLocaleDateString('fr-FR', o) : '');
export const fshort = (d) => fdate(d, { day: 'numeric', month: 'short', year: 'numeric' });
export const fdatetime = (d) => (d ? asDate(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const fdur = (m) => { m = +m || 0; const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ' ' + String(r).padStart(2, '0') : ''}` : `${r} min`; };
export const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
export const initials = (s) => String(s || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const plural = (n, one, many) => `${num(n)} ${n > 1 ? many : one}`;

/* --------------------------------------------------------- téléphone */
export const digits = (s) => String(s || '').replace(/\D/g, '');
export function intl(n) {
  const d = digits(n), cc = digits(state.settings?.country_code || '229');
  if (!d) return '';
  return d.startsWith(cc) && d.length > 10 ? d : cc + d;
}
export const telHref = (n) => 'tel:+' + intl(n);
export const waHref = (n, text = '') => `https://wa.me/${intl(n)}${text ? '?text=' + encodeURIComponent(text) : ''}`;
export const waMain = (text) => waHref(state.settings?.whatsapp || state.settings?.phones?.[0], text);
export const phones = () => (state.settings?.phones || []).filter(Boolean);

/* ------------------------------------------------- horaires d'ouverture */
export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export function localNow() { return new Date(Date.now() + (+state.settings?.tz_offset || 0) * 3600e3); }
export function openStatus() {
  const h = state.settings?.hours || {};
  const now = localNow();
  const wd = now.getUTCDay();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toM = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
  const today = h[wd];
  if (today && mins >= toM(today[0]) && mins < toM(today[1])) return { open: true, label: `Ouvert · ferme à ${today[1].replace(':', 'h')}` };
  for (let i = 0; i < 7; i++) {
    const d = (wd + i) % 7, x = h[d];
    if (!x) continue;
    if (i === 0 && mins < toM(x[0])) return { open: false, label: `Fermé · ouvre à ${x[0].replace(':', 'h')}` };
    if (i > 0) return { open: false, label: `Fermé · ouvre ${i === 1 ? 'demain' : DAYS[d].toLowerCase()} à ${x[0].replace(':', 'h')}` };
  }
  return { open: false, label: 'Fermé' };
}

/* --------------------------------------------------------- catalogue */
export const CATS = {
  visage: { label: 'Soins du visage', icon: 'face', color: '#d9924a', desc: 'Nettoyage profond, éclat, anti-taches, anti-âge' },
  corps: { label: 'Soins du corps', icon: 'leaf', color: '#b5838d', desc: 'Gommages, massages, enveloppements au karité' },
  makeup: { label: 'Make-up', icon: 'brush', color: '#7b2d42', desc: 'Jour, soirée, mariée, cours d’auto-maquillage' },
  foulard: { label: 'Attache foulard', icon: 'wrap', color: '#b8432f', desc: 'Quotidien, gele de cérémonie, forfaits mariage' },
  sante: { label: 'Santé & bien-être', icon: 'heart', color: '#5f9e8f', desc: 'Pédicure, manucure, réflexologie' },
  dermo: { label: 'Dermo-conseils', icon: 'drop', color: '#c08a3e', desc: 'Diagnostic, routine personnalisée, suivi de peau' },
};
export const PCATS = {
  'soin-visage': 'Soins visage', 'soin-corps': 'Soins corps', maquillage: 'Maquillage',
  foulards: 'Foulards & geles', coffrets: 'Coffrets cadeaux', 'bien-etre': 'Bien-être',
};
export const STATUS = {
  bookings: { pending: ['En attente', 'warn'], confirmed: ['Confirmé', 'info'], done: ['Effectué', 'ok'], cancelled: ['Annulé', 'bad'], noshow: ['Absente', 'bad'] },
  orders: { pending: ['Reçue', 'warn'], confirmed: ['Confirmée', 'info'], preparing: ['En préparation', 'info'], shipped: ['En livraison', 'info'], delivered: ['Livrée', 'ok'], cancelled: ['Annulée', 'bad'] },
  custom_orders: { new: ['Nouvelle', 'warn'], quoted: ['Devis envoyé', 'info'], accepted: ['Acceptée', 'info'], in_progress: ['En réalisation', 'info'], done: ['Terminée', 'ok'], cancelled: ['Annulée', 'bad'] },
  enrollments: { pending: ['Paiement en vérification', 'warn'], active: ['Accès actif', 'ok'], rejected: ['Refusé', 'bad'] },
  registrations: { pending: ['En attente', 'warn'], confirmed: ['Confirmée', 'ok'], attended: ['Présente', 'ok'], cancelled: ['Annulée', 'bad'] },
};
export const statusPill = (kind, s) => { const [l, c] = STATUS[kind]?.[s] || [s, 'info']; return `<span class="pill pill--${c}">${esc(l)}</span>`; };
export const CUSTOM_TYPES = {
  coffret: ['Coffret cadeau personnalisé', 'gift'], soin: ['Soin / routine sur-mesure', 'drop'], foulard: ['Attache foulard événement', 'wrap'],
  makeup: ['Make-up événement / domicile', 'brush'], bon: ['Bon cadeau', 'ticket'], autre: ['Autre demande', 'sparkle'],
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
export const paras = (s) => String(s || '').split(/\n\s*\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');

/* ---------------------------------------------------------------- UI */
export function toast(msg, type = 'ok', ms = 4500) {
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.innerHTML = `${icon(type === 'err' ? 'alert' : type === 'info' ? 'info' : 'check')}<span>${esc(msg)}</span>`;
  ($('#toasts') || document.body).append(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, ms);
}

export function modal({ title = '', html = '', size = '', onClose } = {}) {
  const el = document.createElement('div');
  el.className = `modal ${size}`;
  el.innerHTML = `<div class="modal__backdrop" data-close></div>
    <div class="modal__box" role="dialog" aria-modal="true" aria-label="${esc(title || 'Fenêtre')}">
      <button class="modal__x" data-close aria-label="Fermer">${icon('x')}</button>
      ${title ? `<h3 class="modal__title">${esc(title)}</h3>` : ''}
      <div class="modal__body">${html}</div>
    </div>`;
  document.body.append(el);
  document.body.classList.add('no-scroll');
  const prev = document.activeElement;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    if (!el.classList.contains('open')) return;
    el.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => el.remove(), 450);
    if (!$$('.modal.open').length) document.body.classList.remove('no-scroll');
    prev?.focus?.();
    onClose?.();
  }
  el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  setTimeout(() => el.querySelector('.modal__body input:not([type=hidden]), .modal__body select, .modal__body textarea')?.focus(), 380);
  return { el, body: el.querySelector('.modal__body'), close };
}

export function confirmBox(text, { ok = 'Confirmer', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title: 'Confirmation', size: 'modal--sm',
      html: `<p class="muted">${esc(text)}</p><div class="row-end"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button></div>`,
      onClose: () => { if (!done) resolve(false); },
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; resolve(true); m.close(); });
  });
}

/** Lit un formulaire en objet (cases à cocher multiples → tableaux). */
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

/** Bouton en état de chargement pendant une promesse. */
export async function busy(btn, fn) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('is-busy');
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('is-busy'); }
}

export function imageToDataUrl(file, max = 1600, q = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
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
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Institut//RDV//FR', 'BEGIN:VEVENT', `UID:${Date.now()}@institut`,
    `DTSTAMP:${f(new Date())}Z`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${clean(title)}`, `LOCATION:${clean(location)}`,
    `DESCRIPTION:${clean(description)}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'rendez-vous.ics';
  document.body.append(a); a.click(); a.remove();
}

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers'); }
  catch { toast('Copie impossible : ' + text, 'info'); }
}

/* ------------------------------------------------------------- panier */
const CART_KEY = 'institut.cart.v1';
const loadCart = () => { try { const v = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };
export const cart = {
  items: loadCart(),
  save() { try { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); } catch { /* stockage indisponible */ } emit('cart', this); },
  add(p, qty = 1) {
    const it = this.items.find((i) => i.id === p.id);
    if (it) it.qty = Math.min(99, it.qty + qty);
    else this.items.push({ id: p.id, slug: p.slug, name: p.name, price: p.price, qty, art: p.art, color: p.color, image: p.image, stock: p.stock });
    this.save();
  },
  set(id, qty) { const it = this.items.find((i) => i.id === id); if (!it) return; if (qty <= 0) this.remove(id); else { it.qty = Math.min(99, qty); this.save(); } },
  remove(id) { this.items = this.items.filter((i) => i.id !== id); this.save(); },
  clear() { this.items = []; this.save(); },
  count() { return this.items.reduce((t, i) => t + i.qty, 0); },
  total() { return this.items.reduce((t, i) => t + i.qty * i.price, 0); },
};
