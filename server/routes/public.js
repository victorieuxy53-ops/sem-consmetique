import path from 'node:path';
import fs from 'node:fs';
import * as db from '../db.js';
import { get, post, fail, rateLimit, streamFile } from '../http.js';
import { currentUser, requireUser, publicUser } from '../auth.js';
import * as U from '../util.js';

const nowISO = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

/* ================================================================ BOOT */
get('/api/bootstrap', (ctx) => ({ settings: db.settings(), user: publicUser(currentUser(ctx)), slides: slides() }));

/** Photos du carrousel affiché en haut de chaque page : produits (avec photo), fondatrice, galerie.
    Tout vient de la base : une photo ajoutée dans l'admin apparaît automatiquement. */
function slides() {
  const s = db.settings();
  const out = db.all(`SELECT slug, name, short, price, image FROM products WHERE active = 1 AND image IS NOT NULL AND image != ''
                      ORDER BY featured DESC, id DESC LIMIT 8`)
    .map((p) => ({ image: p.image, title: p.name, sub: p.short, price: p.price, href: `/boutique/${p.slug}` }));
  const founder = s.founder_image ? { image: s.founder_image, title: s.founder_name, sub: s.founder_role, href: '/a-propos' } : null;
  if (founder) out.splice(Math.min(2, out.length), 0, founder); // la fondatrice en 3e position
  for (const g of db.all("SELECT title, image FROM gallery WHERE image IS NOT NULL AND image != '' ORDER BY sort, id DESC LIMIT 6")) out.push({ image: g.image, title: g.title || '', sub: '', href: null });
  return out;
}

get('/api/home', () => {
  const t = db.today();
  return {
    services: db.all('SELECT * FROM services WHERE active = 1 AND featured = 1 ORDER BY sort, id LIMIT 8'),
    products: db.all('SELECT * FROM products WHERE active = 1 ORDER BY featured DESC, id DESC LIMIT 10'),
    courses: courseList('AND c.featured = 1').slice(0, 3),
    events: eventList(t).slice(0, 3),
    reviews: db.all('SELECT id, name, rating, text, service FROM reviews WHERE approved = 1 ORDER BY id DESC LIMIT 10'),
    posts: db.all('SELECT id, slug, title, excerpt, category, image, color, read_time, created_at FROM posts WHERE published = 1 ORDER BY id DESC LIMIT 3'),
    gallery: db.all('SELECT * FROM gallery ORDER BY sort, id DESC LIMIT 12'),
    counts: {
      services: db.get('SELECT COUNT(*) n FROM services WHERE active = 1').n,
      courses: db.get('SELECT COUNT(*) n FROM courses WHERE published = 1').n,
    },
    next: U.nextSlot(60),
  };
});

/* ============================================================ SERVICES */
get('/api/services', () => db.all('SELECT * FROM services WHERE active = 1 ORDER BY sort, id'));

get('/api/availability', (ctx) => {
  const svc = db.get('SELECT duration FROM services WHERE id = ? AND active = 1', U.int(ctx.query.service, 'prestation'));
  if (!svc) fail(404, 'Prestation introuvable');
  if (ctx.query.month) return { days: U.monthAvailability(ctx.query.month, svc.duration) };
  return U.daySlots(String(ctx.query.date || ''), svc.duration);
});

post('/api/bookings', async (ctx) => {
  rateLimit(ctx, 'booking', 12, 3600);
  const b = await ctx.json();
  const svc = db.get('SELECT * FROM services WHERE id = ? AND active = 1', U.int(b.service_id, 'prestation', { required: true }));
  if (!svc) fail(404, 'Prestation introuvable');
  const name = U.str(b.name, 120, 'nom', true);
  const phone = U.phone(b.phone);
  const email = U.email(b.email);
  const notes = U.str(b.notes, 1000);
  if (!U.isDate(b.date) || !U.isTime(b.time)) fail(400, 'Date ou heure invalide.');
  const user = currentUser(ctx);
  return db.tx(() => {
    const { slots } = U.daySlots(b.date, svc.duration);
    const slot = slots.find((x) => x.time === b.time);
    if (!slot || !slot.available) fail(409, 'Ce créneau vient d’être réservé. Merci d’en choisir un autre.');
    const ref = U.uniqueRef('bookings', 'RDV');
    db.run(`INSERT INTO bookings (ref, service_id, user_id, name, phone, email, date, time, duration, price, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`, ref, svc.id, user?.id, name, phone, email, b.date, b.time, svc.duration, svc.price, notes);
    return { ref, date: b.date, time: b.time, service: svc.name, price: svc.price, duration: svc.duration };
  });
});

/* ================================================================ SHOP */
get('/api/products', () => db.all('SELECT * FROM products WHERE active = 1 ORDER BY featured DESC, id DESC'));

get('/api/products/:slug', (ctx) => {
  const p = db.get('SELECT * FROM products WHERE slug = ? AND active = 1', ctx.params.slug);
  if (!p) fail(404, 'Produit introuvable');
  const related = db.all('SELECT * FROM products WHERE active = 1 AND category = ? AND id != ? ORDER BY RANDOM() LIMIT 4', p.category, p.id);
  return { product: p, related };
});

post('/api/promo', async (ctx) => {
  rateLimit(ctx, 'promo', 30, 600);
  const b = await ctx.json();
  const { discount, promo } = U.applyPromo(U.str(b.code, 40, 'code', true), U.int(b.subtotal, 'montant', { min: 0 }) || 0);
  return { code: promo.code, type: promo.type, value: promo.value, discount };
});

post('/api/orders', async (ctx) => {
  rateLimit(ctx, 'order', 15, 3600);
  const b = await ctx.json();
  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  if (!items.length) fail(400, 'Votre panier est vide.');
  const name = U.str(b.name, 120, 'nom', true);
  const phone = U.phone(b.phone);
  const email = U.email(b.email);
  const delivery = b.delivery === 'livraison' ? 'livraison' : 'retrait';
  const address = U.str(b.address, 300, 'adresse de livraison', delivery === 'livraison');
  const city = U.str(b.city, 80);
  const payment = b.payment === 'momo' ? 'momo' : 'cash';
  const paymentRef = U.str(b.payment_ref, 120);
  const notes = U.str(b.notes, 1000);
  const user = currentUser(ctx);
  const s = db.settings();

  return db.tx(() => {
    const lines = [];
    for (const it of items) {
      const p = db.get('SELECT * FROM products WHERE id = ? AND active = 1', U.int(it.id, 'produit'));
      const qty = U.int(it.qty, 'quantité', { min: 1, max: 99 }) || 1;
      if (!p) fail(409, 'Un produit de votre panier n’est plus disponible.');
      if (p.stock !== null && p.stock < qty) fail(409, `Stock insuffisant pour « ${p.name} » (reste ${p.stock}).`);
      lines.push({ p, qty, unit: U.unitPrice(p, qty) });
    }
    const subtotal = lines.reduce((t, l) => t + l.unit * l.qty, 0);
    const { discount, promo } = U.applyPromo(U.str(b.promo, 40), subtotal);
    const after = subtotal - discount;
    const fee = delivery === 'livraison' ? (after >= (+s.free_delivery_from || Infinity) ? 0 : +s.delivery_fee || 0) : 0;
    const total = after + fee;
    const ref = U.uniqueRef('orders', 'CMD');
    const r = db.run(`INSERT INTO orders (ref, user_id, name, phone, email, address, city, delivery, payment, payment_ref,
                      subtotal, discount, delivery_fee, total, promo, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ref, user?.id, name, phone, email, address, city, delivery, payment, paymentRef, subtotal, discount, fee, total, promo?.code, notes);
    for (const l of lines) {
      db.run('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?,?,?,?,?)', r.lastInsertRowid, l.p.id, l.p.name, l.unit, l.qty);
      if (l.p.stock !== null) db.run('UPDATE products SET stock = stock - ? WHERE id = ?', l.qty, l.p.id);
    }
    if (promo) db.run('UPDATE promos SET uses = uses + 1 WHERE id = ?', promo.id);
    return { ref, total, subtotal, discount, delivery_fee: fee, payment };
  });
});

/* ========================================================= SUR-MESURE */
const CUSTOM_TYPES = ['coffret', 'soin', 'foulard', 'makeup', 'bon', 'autre'];
post('/api/custom-orders', async (ctx) => {
  rateLimit(ctx, 'custom', 8, 3600);
  const b = await ctx.json(8_000_000);
  const type = CUSTOM_TYPES.includes(b.type) ? b.type : 'autre';
  const details = {};
  if (b.details && typeof b.details === 'object') {
    for (const [k, v] of Object.entries(b.details).slice(0, 25)) {
      const key = String(k).slice(0, 60);
      details[key] = Array.isArray(v) ? v.slice(0, 20).map((x) => String(x).slice(0, 200)) : String(v ?? '').slice(0, 1500);
    }
  }
  const name = U.str(b.name, 120, 'nom', true);
  const phone = U.phone(b.phone);
  const email = U.email(b.email);
  const wanted = b.wanted_date && U.isDate(b.wanted_date) ? b.wanted_date : null;
  const image = U.saveDataImage(b.image);
  const ref = U.uniqueRef('custom_orders', 'SM');
  db.run(`INSERT INTO custom_orders (ref, user_id, type, details, budget, wanted_date, image, name, phone, email)
          VALUES (?,?,?,?,?,?,?,?,?,?)`, ref, currentUser(ctx)?.id, type, JSON.stringify(details), U.str(b.budget, 60), wanted, image, name, phone, email);
  return { ref };
});

/* ============================================================ COURSES */
function courseList(extra = '') {
  return db.all(`SELECT c.*, COUNT(l.id) lessons_count, COALESCE(SUM(l.duration), 0) total_minutes
                 FROM courses c LEFT JOIN lessons l ON l.course_id = c.id
                 WHERE c.published = 1 ${extra} GROUP BY c.id ORDER BY c.featured DESC, c.id`);
}
get('/api/courses', () => courseList());

get('/api/courses/:slug', (ctx) => {
  const c = db.get('SELECT * FROM courses WHERE slug = ? AND published = 1', ctx.params.slug);
  if (!c) fail(404, 'Formation introuvable');
  const user = currentUser(ctx);
  const lessons = db.all(`SELECT id, title, description, duration, is_preview, sort,
                          (video_type != 'none' AND video_src IS NOT NULL AND video_src != '') has_video
                          FROM lessons WHERE course_id = ? ORDER BY sort, id`, c.id);
  let enrollment = null, done = [];
  if (user) {
    enrollment = db.get('SELECT id, ref, status, created_at, activated_at FROM enrollments WHERE course_id = ? AND user_id = ?', c.id, user.id) || null;
    done = db.all('SELECT p.lesson_id FROM progress p JOIN lessons l ON l.id = p.lesson_id WHERE p.user_id = ? AND l.course_id = ?', user.id, c.id).map((r) => r.lesson_id);
  }
  const access = user?.role === 'admin' || enrollment?.status === 'active';
  return { course: c, lessons, enrollment, access, done };
});

post('/api/courses/:id/enroll', async (ctx) => {
  const user = requireUser(ctx);
  rateLimit(ctx, 'enroll', 20, 3600);
  const b = await ctx.json();
  const c = db.get('SELECT * FROM courses WHERE id = ? AND published = 1', U.int(ctx.params.id));
  if (!c) fail(404, 'Formation introuvable');
  const existing = db.get('SELECT * FROM enrollments WHERE course_id = ? AND user_id = ?', c.id, user.id);
  if (existing?.status === 'active') return { status: 'active', ref: existing.ref };
  const free = !c.price;
  const method = free ? 'gratuit' : U.str(b.method, 40, 'mode de paiement', true);
  const pref = free ? null : U.str(b.payment_ref, 120, 'référence de transaction', true);
  const payer = free ? null : U.phone(b.payer_phone);
  const status = free ? 'active' : 'pending';
  if (existing) {
    db.run(`UPDATE enrollments SET payment_method = ?, payment_ref = ?, payer_phone = ?, amount = ?, status = ?,
            created_at = datetime('now'), activated_at = ? WHERE id = ?`, method, pref, payer, c.price, status, free ? nowISO() : null, existing.id);
    return { status, ref: existing.ref };
  }
  const ref = U.uniqueRef('enrollments', 'FOR');
  db.run(`INSERT INTO enrollments (ref, course_id, user_id, amount, payment_method, payment_ref, payer_phone, status, activated_at)
          VALUES (?,?,?,?,?,?,?,?,?)`, ref, c.id, user.id, c.price, method, pref, payer, status, free ? nowISO() : null);
  return { status, ref };
});

function lessonAccess(ctx, id) {
  const l = db.get(`SELECT l.*, c.published FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`, U.int(id));
  if (!l) fail(404, 'Leçon introuvable');
  const user = currentUser(ctx);
  const ok = user?.role === 'admin' || (l.published && l.is_preview) ||
    (user && db.get("SELECT 1 FROM enrollments WHERE course_id = ? AND user_id = ? AND status = 'active'", l.course_id, user.id));
  if (!ok) fail(user ? 403 : 401, user ? 'Cette leçon fait partie de la formation complète.' : 'Connectez-vous pour accéder à cette leçon.');
  return l;
}

get('/api/lessons/:id', (ctx) => {
  const l = lessonAccess(ctx, ctx.params.id);
  let src = null;
  if (l.video_type === 'file' && l.video_src) src = `/media/lesson/${l.id}`;
  else if (l.video_type === 'youtube' || l.video_type === 'vimeo') src = U.videoEmbed(l.video_type, l.video_src);
  else if (l.video_type === 'url' && /^https:\/\//.test(l.video_src || '')) src = l.video_src;
  return { id: l.id, title: l.title, description: l.description, type: l.video_type, src };
});

const VIDEO_MIME = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
get('/media/lesson/:id', (ctx) => {
  const l = lessonAccess(ctx, ctx.params.id);
  if (l.video_type !== 'file' || !l.video_src) fail(404, 'Vidéo indisponible');
  const file = path.join(db.VIDEO_DIR, path.basename(l.video_src));
  if (!fs.existsSync(file)) fail(404, 'Vidéo introuvable sur le serveur');
  return streamFile(ctx.req, file, VIDEO_MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
});

post('/api/lessons/:id/done', async (ctx) => {
  const user = requireUser(ctx);
  const l = lessonAccess(ctx, ctx.params.id);
  const b = await ctx.json();
  if (b.done === false) db.run('DELETE FROM progress WHERE user_id = ? AND lesson_id = ?', user.id, l.id);
  else db.run('INSERT OR IGNORE INTO progress (user_id, lesson_id) VALUES (?, ?)', user.id, l.id);
  return { ok: true };
});

/* ============================================================= EVENTS */
function eventList(fromDate) {
  return db.all(`SELECT e.*, COALESCE((SELECT SUM(seats) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled'), 0) taken
                 FROM events e WHERE e.active = 1 AND e.date >= ? ORDER BY e.date, e.time`, fromDate);
}
get('/api/events', () => eventList(db.today()));

post('/api/events/:id/register', async (ctx) => {
  rateLimit(ctx, 'event', 10, 3600);
  const b = await ctx.json();
  const e = db.get('SELECT * FROM events WHERE id = ? AND active = 1', U.int(ctx.params.id));
  if (!e || e.date < db.today()) fail(404, 'Cet atelier n’est plus disponible.');
  const seats = U.int(b.seats, 'places', { min: 1, max: 10 }) || 1;
  const name = U.str(b.name, 120, 'nom', true);
  const phone = U.phone(b.phone);
  const email = U.email(b.email);
  return db.tx(() => {
    const taken = db.get("SELECT COALESCE(SUM(seats), 0) n FROM registrations WHERE event_id = ? AND status != 'cancelled'", e.id).n;
    if (taken + seats > e.seats) fail(409, e.seats - taken > 0 ? `Il ne reste que ${e.seats - taken} place(s).` : 'Cet atelier est complet.');
    const ref = U.uniqueRef('registrations', 'ATL');
    db.run(`INSERT INTO registrations (ref, event_id, user_id, name, phone, email, seats, payment_ref, status) VALUES (?,?,?,?,?,?,?,?,?)`,
      ref, e.id, currentUser(ctx)?.id, name, phone, email, seats, U.str(b.payment_ref, 120), e.price ? 'pending' : 'confirmed');
    return { ref, total: e.price * seats, status: e.price ? 'pending' : 'confirmed' };
  });
});

/* ========================================================= CONTENU */
get('/api/posts', () => db.all('SELECT id, slug, title, excerpt, category, image, color, read_time, created_at FROM posts WHERE published = 1 ORDER BY id DESC'));
get('/api/posts/:slug', (ctx) => {
  const p = db.get('SELECT * FROM posts WHERE slug = ? AND published = 1', ctx.params.slug);
  if (!p) fail(404, 'Article introuvable');
  const more = db.all('SELECT id, slug, title, excerpt, category, image, color, read_time, created_at FROM posts WHERE published = 1 AND id != ? ORDER BY id DESC LIMIT 3', p.id);
  return { post: p, more };
});
get('/api/reviews', () => db.all('SELECT id, name, rating, text, service, created_at FROM reviews WHERE approved = 1 ORDER BY id DESC'));
get('/api/gallery', () => db.all('SELECT * FROM gallery ORDER BY sort, id DESC'));

post('/api/reviews', async (ctx) => {
  rateLimit(ctx, 'review', 3, 3600);
  const b = await ctx.json();
  db.run('INSERT INTO reviews (name, rating, text, service) VALUES (?,?,?,?)',
    U.str(b.name, 80, 'nom', true), U.int(b.rating, 'note', { min: 1, max: 5 }) || 5, U.str(b.text, 1000, 'avis', true), U.str(b.service, 120));
  return { ok: true };
});

post('/api/contact', async (ctx) => {
  rateLimit(ctx, 'contact', 6, 3600);
  const b = await ctx.json();
  const kind = b.kind === 'rappel' ? 'rappel' : 'contact';
  const phone = U.phone(b.phone, kind === 'rappel');
  const email = U.email(b.email);
  if (kind === 'contact' && !phone && !email) fail(400, 'Indiquez au moins un téléphone ou un e-mail.');
  db.run('INSERT INTO messages (kind, name, email, phone, subject, message) VALUES (?,?,?,?,?,?)',
    kind, U.str(b.name, 120, 'nom', true), email, phone, U.str(b.subject, 160), U.str(b.message, 3000, 'message', kind === 'contact'));
  return { ok: true };
});

post('/api/newsletter', async (ctx) => {
  rateLimit(ctx, 'news', 5, 3600);
  const b = await ctx.json();
  db.run('INSERT OR IGNORE INTO newsletter (email) VALUES (?)', U.email(b.email, true));
  return { ok: true };
});

/* =============================================================== SUIVI */
get('/api/track', (ctx) => {
  rateLimit(ctx, 'track', 20, 600);
  const ref = String(ctx.query.ref || '').trim().toUpperCase();
  const tel = String(ctx.query.phone || '');
  const map = { RDV: 'bookings', CMD: 'orders', SM: 'custom_orders', ATL: 'registrations' };
  const table = map[ref.split('-')[0]];
  if (!table) fail(404, 'Référence introuvable. Vérifiez le format (ex : RDV-XXXXXX).');
  const row = db.get(`SELECT * FROM ${table} WHERE ref = ?`, ref);
  if (!row || !U.samePhone(row.phone, tel)) fail(404, 'Aucune demande ne correspond à cette référence et ce numéro.');
  const out = { kind: table, ref: row.ref, status: row.status, created_at: row.created_at, name: row.name };
  if (table === 'bookings') Object.assign(out, { date: row.date, time: row.time, service: db.get('SELECT name FROM services WHERE id = ?', row.service_id)?.name, price: row.price });
  if (table === 'orders') Object.assign(out, { total: row.total, delivery: row.delivery, items: db.all('SELECT name, qty, price FROM order_items WHERE order_id = ?', row.id) });
  if (table === 'custom_orders') Object.assign(out, { type: row.type, quote: row.quote, admin_note: row.admin_note });
  if (table === 'registrations') { const e = db.get('SELECT title, date, time FROM events WHERE id = ?', row.event_id); Object.assign(out, { event: e?.title, date: e?.date, time: e?.time, seats: row.seats }); }
  return out;
});

export { courseList, eventList };
