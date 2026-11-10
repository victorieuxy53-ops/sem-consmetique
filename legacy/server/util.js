'use strict';
/**
 * Validation, références, slugs, disponibilités, promotions, images.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { HttpError, fail } = require('./http');

/* ------------------------------------------------------------ validation */
const bad = (msg) => new HttpError(400, msg);

function str(v, max = 200, label = 'champ', required = false) {
  const s = v == null ? '' : String(v).trim().slice(0, max);
  if (required && !s) throw bad(`Le champ « ${label} » est requis.`);
  return s || null;
}
function int(v, label = 'nombre', { min = -Infinity, max = Infinity, required = false } = {}) {
  if (v === undefined || v === null || v === '') { if (required) throw bad(`Le champ « ${label} » est requis.`); return null; }
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw bad(`Valeur invalide pour « ${label} ».`);
  return n;
}
function phone(v, required = true) {
  const s = str(v, 40, 'téléphone', required);
  if (!s) return null;
  if (s.replace(/\D/g, '').length < 8) throw bad('Numéro de téléphone invalide.');
  return s;
}
function email(v, required = false) {
  const s = str(v, 160, 'e-mail', required);
  if (!s) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw bad('Adresse e-mail invalide.');
  return s.toLowerCase();
}
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const digits = (s) => String(s || '').replace(/\D/g, '');
/** Compare deux numéros sur leurs 8 derniers chiffres (tolère indicatif / préfixe). */
const samePhone = (a, b) => { const x = digits(a), y = digits(b); return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8); };

/* -------------------------------------------- spécifications de champs
   's120' chaîne max 120 · 't' texte long · 'i' entier · 'b' booléen
   'd' date AAAA-MM-JJ · 'h' heure HH:MM · 'slug' · suffixe '!' = requis */
function coerce(spec, v, label) {
  const required = spec.endsWith('!');
  const sp = required ? spec.slice(0, -1) : spec;
  const empty = v === undefined || v === null || v === '';
  if (sp === 'b') return v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0;
  if (empty) { if (required) throw bad(`Le champ « ${label} » est requis.`); return null; }
  if (sp === 'slug') return slugify(v);
  if (sp === 't') return String(v).slice(0, 60000);
  if (sp === 'i') return int(v, label);
  if (sp === 'd') { if (!isDate(String(v))) throw bad(`Date invalide pour « ${label} ».`); return String(v); }
  if (sp === 'h') { if (!isTime(String(v))) throw bad(`Heure invalide pour « ${label} ».`); return String(v); }
  if (sp[0] === 's') return str(v, +sp.slice(1) || 200, label, required);
  return v;
}

/* --------------------------------------------------------- slug & ref */
function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'element';
}
function uniqueSlug(table, base, id = null) {
  let s = slugify(base), n = 2;
  while (db.get(`SELECT id FROM ${table} WHERE slug = ? AND id IS NOT ?`, s, id)) s = `${slugify(base)}-${n++}`;
  return s;
}
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function uniqueRef(table, prefix) {
  for (;;) {
    const bytes = crypto.randomBytes(6);
    let r = prefix + '-';
    for (const b of bytes) r += ALPHA[b % ALPHA.length];
    if (!db.get(`SELECT id FROM ${table} WHERE ref = ?`, r)) return r;
  }
}

/* ------------------------------------------------------ disponibilités */
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

function bookingsOn(date) {
  return db.all("SELECT time, duration FROM bookings WHERE date = ? AND status IN ('pending','confirmed')", date);
}

/** Créneaux d'une journée pour une durée donnée. */
function daySlots(date, duration, existing = bookingsOn(date)) {
  const s = db.settings();
  const t0 = db.today();
  if (!isDate(date)) return { closed: true, reason: 'invalid', slots: [] };
  if (date < t0) return { closed: true, reason: 'past', slots: [] };
  if (dayDiff(t0, date) > (+s.max_days || 60)) return { closed: true, reason: 'far', slots: [] };
  if ((s.closed_dates || []).includes(date)) return { closed: true, reason: 'closed', slots: [] };
  const wd = new Date(date + 'T00:00:00Z').getUTCDay();
  const h = s.hours && s.hours[wd];
  if (!h || !h[0] || !h[1]) return { closed: true, reason: 'closed', slots: [] };
  const open = toMin(h[0]), close = toMin(h[1]);
  const step = Math.max(10, +s.slot_interval || 30);
  const cap = Math.max(1, +s.capacity || 1);
  const dur = Math.max(10, +duration || 60);
  const limit = date === t0 ? db.nowMinutes() + (+s.min_advance || 0) : -1;
  const slots = [];
  for (let t = open; t + dur <= close; t += step) {
    if (t < limit) continue;
    const overlap = existing.filter((b) => { const bs = toMin(b.time); return bs < t + dur && bs + (b.duration || 60) > t; }).length;
    slots.push({ time: fromMin(t), available: overlap < cap });
  }
  return { closed: false, slots };
}

/** État de chaque jour d'un mois : open | full | closed | past */
function monthAvailability(month, duration) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw bad('Mois invalide');
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rows = db.all("SELECT date, time, duration FROM bookings WHERE date LIKE ? AND status IN ('pending','confirmed')", month + '-%');
  const byDate = {};
  for (const r of rows) (byDate[r.date] ||= []).push(r);
  const out = {};
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const r = daySlots(date, duration, byDate[date] || []);
    out[date] = r.closed ? (r.reason === 'past' ? 'past' : 'closed') : r.slots.some((x) => x.available) ? 'open' : 'full';
  }
  return out;
}

/** Premier créneau libre (pour l'accroche « prochain créneau » de l'accueil). */
function nextSlot(duration = 60) {
  let d = db.today();
  for (let i = 0; i < 14; i++, d = db.addDays(d, 1)) {
    const r = daySlots(d, duration);
    const s = r.slots.find((x) => x.available);
    if (s) return { date: d, time: s.time };
  }
  return null;
}

/* ---------------------------------------------------------- promotions */
function applyPromo(code, subtotal) {
  if (!code) return { discount: 0, promo: null };
  const p = db.get('SELECT * FROM promos WHERE code = ? AND active = 1', String(code).trim());
  if (!p) fail(400, 'Code promo invalide.');
  if (p.expires && p.expires < db.today()) fail(400, 'Ce code promo a expiré.');
  if (p.max_uses && p.uses >= p.max_uses) fail(400, 'Ce code promo a atteint sa limite d’utilisation.');
  if (p.min_amount && subtotal < p.min_amount) fail(400, `Ce code est valable dès ${p.min_amount.toLocaleString('fr-FR')} FCFA d’achat.`);
  const discount = p.type === 'percent' ? Math.round((subtotal * Math.min(100, p.value)) / 100) : Math.min(p.value, subtotal);
  return { discount, promo: p };
}

/* ------------------------------------------------------------- images */
const MAGIC = [
  { ext: '.jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: '.webp', test: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  { ext: '.gif', test: (b) => b.slice(0, 3).toString() === 'GIF' },
];
function imageExt(buf) { const m = MAGIC.find((x) => x.test(buf)); return m ? m.ext : null; }

/** Enregistre une image envoyée en data-URL base64 (formulaires publics). */
function saveDataImage(dataUrl, maxBytes = 5 * 1024 * 1024) {
  if (!dataUrl) return null;
  const m = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) throw bad('Image invalide.');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > maxBytes) throw bad('Image trop lourde (5 Mo maximum).');
  const ext = imageExt(buf);
  if (!ext) throw bad('Format d’image non pris en charge (JPG, PNG, WEBP).');
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(db.UPLOAD_DIR, name), buf);
  return '/uploads/' + name;
}

/* --------------------------------------------------------------- vidéos */
function videoEmbed(type, src) {
  if (!src) return null;
  if (type === 'youtube') {
    const m = /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/.exec(src) || /^([\w-]{11})$/.exec(src);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
  }
  if (type === 'vimeo') {
    const m = /(\d{6,})/.exec(src);
    return m ? `https://player.vimeo.com/video/${m[1]}` : null;
  }
  return null;
}

function csv(rows) {
  if (!rows.length) return '﻿';
  const cols = Object.keys(rows[0]);
  const cell = (v) => { const s = v == null ? '' : String(v); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\r\n');
}

module.exports = {
  bad, str, int, phone, email, isDate, isTime, digits, samePhone, coerce,
  slugify, uniqueSlug, uniqueRef, toMin, fromMin, daySlots, monthAvailability, nextSlot,
  applyPromo, imageExt, saveDataImage, videoEmbed, csv,
};
