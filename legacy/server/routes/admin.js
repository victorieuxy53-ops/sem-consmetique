'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const { get, post, put, del, fail, HttpError } = require('../http');
const A = require('../auth');
const U = require('../util');

/* ---------------------------------------------------- ressources CRUD */
const R = {
  services: {
    table: 'services', slugFrom: 'name', order: 'sort, id',
    f: { name: 's120!', slug: 'slug', category: 's30', short: 's300', description: 't', price: 'i', duration: 'i', image: 's400', tags: 's200', featured: 'b', active: 'b', sort: 'i' },
  },
  products: {
    table: 'products', slugFrom: 'name', order: 'id DESC',
    f: { name: 's140!', slug: 'slug', category: 's40', brand: 's80', short: 's300', description: 't', usage: 't', price: 'i!', compare_price: 'i', stock: 'i', image: 's400', art: 's20', color: 's20', tags: 's200', featured: 'b', active: 'b' },
  },
  courses: {
    table: 'courses', slugFrom: 'title', order: 'id DESC',
    f: { title: 's160!', slug: 'slug', subtitle: 's300', description: 't', level: 's40', price: 'i', compare_price: 'i', image: 's400', color: 's20', instructor: 's120', duration_label: 's60', what_you_learn: 't', published: 'b', featured: 'b' },
    list: `SELECT c.*, (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) lessons_count,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') students FROM courses c`,
  },
  lessons: {
    table: 'lessons', order: 'course_id, sort, id',
    f: { course_id: 'i!', title: 's160!', description: 't', video_type: 's10', video_src: 's500', duration: 'i', is_preview: 'b', sort: 'i' },
    list: 'SELECT l.*, c.title course_title FROM lessons l LEFT JOIN courses c ON c.id = l.course_id',
    alias: 'l',
  },
  events: {
    table: 'events', slugFrom: 'title', order: 'date DESC',
    f: { title: 's160!', slug: 'slug', description: 't', date: 'd!', time: 'h', end_time: 'h', location: 's200', price: 'i', seats: 'i', image: 's400', color: 's20', active: 'b' },
    list: `SELECT e.*, COALESCE((SELECT SUM(seats) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled'), 0) taken FROM events e`,
  },
  posts: {
    table: 'posts', slugFrom: 'title', order: 'id DESC',
    f: { title: 's200!', slug: 'slug', excerpt: 's500', content: 't', category: 's60', image: 's400', color: 's20', read_time: 'i', published: 'b' },
  },
  promos: {
    table: 'promos', order: 'id DESC',
    f: { code: 's40!', type: 's10', value: 'i!', min_amount: 'i', max_uses: 'i', expires: 'd', active: 'b' },
  },
  gallery: { table: 'gallery', order: 'sort, id DESC', f: { title: 's160', category: 's40', image: 's400!', after_image: 's400', sort: 'i' } },
  reviews: { table: 'reviews', order: 'id DESC', f: { name: 's80!', rating: 'i', text: 's1000!', service: 's120', approved: 'b' } },
  bookings: {
    table: 'bookings', order: 'b.date DESC, b.time DESC', alias: 'b', ref: 'RDV', search: ['b.ref', 'b.name', 'b.phone'],
    f: { service_id: 'i', name: 's120!', phone: 's40!', email: 's160', date: 'd!', time: 'h!', duration: 'i', price: 'i', notes: 's1000', status: 's20' },
    list: 'SELECT b.*, s.name service_name, s.category FROM bookings b LEFT JOIN services s ON s.id = b.service_id',
  },
  orders: {
    table: 'orders', order: 'id DESC', ref: 'CMD', noCreate: true, search: ['ref', 'name', 'phone'],
    f: { status: 's20', payment_ref: 's120', notes: 's1000' },
  },
  custom_orders: {
    table: 'custom_orders', order: 'id DESC', ref: 'SM', noCreate: true, search: ['ref', 'name', 'phone'],
    f: { status: 's20', quote: 'i', admin_note: 's2000' },
  },
  enrollments: {
    table: 'enrollments', order: 'e.id DESC', alias: 'e', ref: 'FOR', search: ['e.ref', 'u.name', 'u.email', 'e.payment_ref'],
    f: { course_id: 'i!', user_id: 'i!', amount: 'i', payment_method: 's40', payment_ref: 's120', status: 's20' },
    list: `SELECT e.*, u.name user_name, u.email user_email, u.phone user_phone, c.title course_title
           FROM enrollments e LEFT JOIN users u ON u.id = e.user_id LEFT JOIN courses c ON c.id = e.course_id`,
  },
  registrations: {
    table: 'registrations', order: 'r.id DESC', alias: 'r', noCreate: true, search: ['r.ref', 'r.name', 'r.phone'],
    f: { status: 's20', seats: 'i', payment_ref: 's120' },
    list: 'SELECT r.*, e.title event_title, e.date event_date, e.price event_price FROM registrations r LEFT JOIN events e ON e.id = r.event_id',
  },
  messages: { table: 'messages', order: 'id DESC', noCreate: true, f: { is_read: 'b' }, search: ['name', 'phone', 'email', 'message'] },
  users: {
    table: 'users', order: 'id DESC', noCreate: true, search: ['name', 'email', 'phone'],
    f: { name: 's120!', phone: 's40', role: 's10' },
    list: `SELECT id, name, email, phone, role, created_at,
           (SELECT COUNT(*) FROM bookings b WHERE b.user_id = users.id) bookings,
           (SELECT COUNT(*) FROM orders o WHERE o.user_id = users.id) orders FROM users`,
  },
  newsletter: { table: 'newsletter', order: 'created_at DESC', noCreate: true, f: {}, pk: 'email' },
};

const STATUSES = {
  bookings: ['pending', 'confirmed', 'done', 'cancelled', 'noshow'],
  orders: ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'],
  custom_orders: ['new', 'quoted', 'accepted', 'in_progress', 'done', 'cancelled'],
  enrollments: ['pending', 'active', 'rejected'],
  registrations: ['pending', 'confirmed', 'attended', 'cancelled'],
};

function resource(ctx) {
  A.requireAdmin(ctx);
  const r = R[ctx.params.res];
  if (!r) fail(404, 'Ressource inconnue');
  return r;
}

function readFields(r, body, partial) {
  const out = {};
  for (const [k, spec] of Object.entries(r.f)) {
    if (partial && !(k in body)) continue;
    out[k] = U.coerce(spec, body[k], k);
  }
  return out;
}

get('/api/admin/r/:res', (ctx) => {
  const r = resource(ctx);
  const where = [], params = [];
  const a = r.alias ? r.alias + '.' : '';
  if (ctx.query.status) { where.push(`${a}status = ?`); params.push(ctx.query.status); }
  if (ctx.query.course_id && ctx.params.res === 'lessons') { where.push('l.course_id = ?'); params.push(+ctx.query.course_id); }
  if (ctx.query.from) { where.push(`${a}date >= ?`); params.push(ctx.query.from); }
  if (ctx.query.to) { where.push(`${a}date <= ?`); params.push(ctx.query.to); }
  if (ctx.query.q && r.search) {
    where.push('(' + r.search.map((c) => `${c} LIKE ?`).join(' OR ') + ')');
    r.search.forEach(() => params.push(`%${ctx.query.q}%`));
  }
  const base = r.list || `SELECT * FROM ${r.table}`;
  const sql = `SELECT * FROM (${base}${where.length && r.alias ? ' WHERE ' + where.join(' AND ') : ''}) ${!r.alias && where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
  const order = r.alias ? r.order.replace(new RegExp(`\\b${r.alias}\\.`, 'g'), '') : r.order;
  const rows = db.all(`${sql} ORDER BY ${order} LIMIT ${Math.min(2000, +ctx.query.limit || 1000)}`, ...params);
  if (ctx.params.res === 'orders' && rows.length) {
    const items = db.all(`SELECT * FROM order_items WHERE order_id IN (${rows.map(() => '?').join(',')})`, ...rows.map((o) => o.id));
    for (const o of rows) o.items = items.filter((i) => i.order_id === o.id);
  }
  return rows;
});

post('/api/admin/r/:res', async (ctx) => {
  const r = resource(ctx);
  if (r.noCreate) fail(405, 'Création non disponible pour cette ressource');
  const body = await ctx.json(1_000_000);
  const data = readFields(r, body, false);
  if (r.slugFrom) data.slug = U.uniqueSlug(r.table, data.slug || data[r.slugFrom]);
  if (r.ref) data.ref = U.uniqueRef(r.table, r.ref);
  if (ctx.params.res === 'promos') data.code = data.code.toUpperCase().replace(/\s+/g, '');
  if (ctx.params.res === 'bookings') {
    const s = data.service_id && db.get('SELECT duration, price FROM services WHERE id = ?', data.service_id);
    data.duration ??= s?.duration || 60;
    data.price ??= s?.price || 0;
    data.status ||= 'confirmed';
    data.source = 'admin';
  }
  if (ctx.params.res === 'enrollments') {
    data.status ||= 'active';
    if (data.status === 'active') data.activated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    data.payment_method ||= 'manuel';
    if (db.get('SELECT id FROM enrollments WHERE course_id = ? AND user_id = ?', data.course_id, data.user_id)) fail(409, 'Cette cliente est déjà inscrite à cette formation.');
  }
  if (STATUSES[ctx.params.res] && data.status && !STATUSES[ctx.params.res].includes(data.status)) fail(400, 'Statut invalide');
  const keys = Object.keys(data);
  const res = db.run(`INSERT INTO ${r.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, ...keys.map((k) => data[k]));
  return db.get(`SELECT * FROM ${r.table} WHERE id = ?`, res.lastInsertRowid);
});

put('/api/admin/r/:res/:id', async (ctx) => {
  const r = resource(ctx);
  const id = U.int(ctx.params.id);
  const before = db.get(`SELECT * FROM ${r.table} WHERE id = ?`, id);
  if (!before) fail(404, 'Élément introuvable');
  const body = await ctx.json(1_000_000);
  const data = readFields(r, body, true);
  const name = ctx.params.res;
  if (STATUSES[name] && data.status && !STATUSES[name].includes(data.status)) fail(400, 'Statut invalide');
  if (r.slugFrom && 'slug' in data) data.slug = U.uniqueSlug(r.table, data.slug || before[r.slugFrom], id);
  if (name === 'promos' && data.code) data.code = data.code.toUpperCase().replace(/\s+/g, '');
  if (name === 'users') {
    const me = A.currentUser(ctx);
    if (id === me.id && data.role && data.role !== 'admin') fail(400, 'Vous ne pouvez pas retirer vos propres droits administrateur.');
    if (data.role && !['client', 'admin'].includes(data.role)) fail(400, 'Rôle invalide');
  }
  if (name === 'enrollments' && data.status === 'active' && before.status !== 'active') data.activated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

  return db.tx(() => {
    // Gestion du stock lors d'une annulation / réactivation de commande.
    if (name === 'orders' && data.status && data.status !== before.status) {
      const items = db.all('SELECT product_id, qty FROM order_items WHERE order_id = ?', id);
      const sign = data.status === 'cancelled' ? 1 : before.status === 'cancelled' ? -1 : 0;
      if (sign) for (const it of items) db.run('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL', sign * it.qty, it.product_id);
    }
    const keys = Object.keys(data);
    if (keys.length) db.run(`UPDATE ${r.table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => data[k]), id);
    return db.get(`SELECT * FROM ${r.table} WHERE id = ?`, id);
  });
});

del('/api/admin/r/:res/:id', (ctx) => {
  const r = resource(ctx);
  if (r.pk === 'email') { db.run(`DELETE FROM ${r.table} WHERE email = ?`, ctx.params.id); return { ok: true }; }
  const id = U.int(ctx.params.id);
  if (ctx.params.res === 'users' && id === A.currentUser(ctx).id) fail(400, 'Vous ne pouvez pas supprimer votre propre compte.');
  if (ctx.params.res === 'orders') {
    const o = db.get('SELECT status FROM orders WHERE id = ?', id);
    if (o && o.status !== 'cancelled') for (const it of db.all('SELECT product_id, qty FROM order_items WHERE order_id = ?', id)) db.run('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL', it.qty, it.product_id);
  }
  db.run(`DELETE FROM ${r.table} WHERE id = ?`, id);
  return { ok: true };
});

/* ---------------------------------------------------------- statistiques */
get('/api/admin/counts', (ctx) => {
  A.requireAdmin(ctx);
  return counts();
});
function counts() {
  const n = (sql, ...p) => db.get(sql, ...p).n;
  return {
    bookings: n("SELECT COUNT(*) n FROM bookings WHERE status = 'pending'"),
    orders: n("SELECT COUNT(*) n FROM orders WHERE status = 'pending'"),
    custom_orders: n("SELECT COUNT(*) n FROM custom_orders WHERE status = 'new'"),
    enrollments: n("SELECT COUNT(*) n FROM enrollments WHERE status = 'pending'"),
    registrations: n("SELECT COUNT(*) n FROM registrations WHERE status = 'pending'"),
    messages: n('SELECT COUNT(*) n FROM messages WHERE is_read = 0'),
    reviews: n('SELECT COUNT(*) n FROM reviews WHERE approved = 0'),
  };
}

get('/api/admin/stats', (ctx) => {
  A.requireAdmin(ctx);
  const t = db.today();
  const from = db.addDays(t, -29);
  const month = t.slice(0, 7);
  const off = `'${(Number(db.settings().tz_offset) || 0) >= 0 ? '+' : ''}${Number(db.settings().tz_offset) || 0} hours'`;
  const days = {};
  for (let i = 0; i < 30; i++) { const d = db.addDays(from, i); days[d] = { date: d, shop: 0, courses: 0, care: 0, events: 0, bookings: 0 }; }
  for (const r of db.all(`SELECT date(created_at, ${off}) d, SUM(total) v FROM orders WHERE status != 'cancelled' AND date(created_at, ${off}) >= ? GROUP BY d`, from)) if (days[r.d]) days[r.d].shop = r.v;
  for (const r of db.all(`SELECT date(COALESCE(activated_at, created_at), ${off}) d, SUM(amount) v FROM enrollments WHERE status = 'active' AND date(COALESCE(activated_at, created_at), ${off}) >= ? GROUP BY d`, from)) if (days[r.d]) days[r.d].courses = r.v;
  for (const r of db.all("SELECT date d, SUM(price) v, COUNT(*) n FROM bookings WHERE status = 'done' AND date >= ? AND date <= ? GROUP BY date", from, t)) if (days[r.d]) days[r.d].care = r.v;
  for (const r of db.all("SELECT date d, COUNT(*) n FROM bookings WHERE status != 'cancelled' AND date >= ? AND date <= ? GROUP BY date", from, t)) if (days[r.d]) days[r.d].bookings = r.n;
  for (const r of db.all(`SELECT date(r.created_at, ${off}) d, SUM(r.seats * e.price) v FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.status IN ('confirmed','attended') AND date(r.created_at, ${off}) >= ? GROUP BY d`, from)) if (days[r.d]) days[r.d].events = r.v;
  const series = Object.values(days).map((d) => ({ ...d, total: d.shop + d.courses + d.care + d.events }));

  const monthRevenue =
    db.get(`SELECT COALESCE(SUM(total), 0) n FROM orders WHERE status != 'cancelled' AND strftime('%Y-%m', created_at, ${off}) = ?`, month).n +
    db.get(`SELECT COALESCE(SUM(amount), 0) n FROM enrollments WHERE status = 'active' AND strftime('%Y-%m', COALESCE(activated_at, created_at), ${off}) = ?`, month).n +
    db.get("SELECT COALESCE(SUM(price), 0) n FROM bookings WHERE status = 'done' AND substr(date, 1, 7) = ?", month).n;

  return {
    today: t,
    counts: counts(),
    kpi: {
      month_revenue: monthRevenue,
      today_bookings: db.get("SELECT COUNT(*) n FROM bookings WHERE date = ? AND status IN ('pending','confirmed','done')", t).n,
      upcoming_bookings: db.get("SELECT COUNT(*) n FROM bookings WHERE date >= ? AND status IN ('pending','confirmed')", t).n,
      clients: db.get("SELECT COUNT(*) n FROM users WHERE role = 'client'").n,
      students: db.get("SELECT COUNT(DISTINCT user_id) n FROM enrollments WHERE status = 'active'").n,
      orders_month: db.get(`SELECT COUNT(*) n FROM orders WHERE status != 'cancelled' AND strftime('%Y-%m', created_at, ${off}) = ?`, month).n,
      newsletter: db.get('SELECT COUNT(*) n FROM newsletter').n,
    },
    series,
    agenda: db.all(`SELECT b.*, s.name service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id
                    WHERE b.date = ? AND b.status != 'cancelled' ORDER BY b.time`, t),
    top_services: db.all(`SELECT s.name, COUNT(*) n FROM bookings b JOIN services s ON s.id = b.service_id
                          WHERE b.status != 'cancelled' AND b.date >= ? GROUP BY s.id ORDER BY n DESC LIMIT 6`, db.addDays(t, -90)),
    low_stock: db.all('SELECT id, name, stock FROM products WHERE active = 1 AND stock IS NOT NULL AND stock <= 5 ORDER BY stock LIMIT 8'),
    events: db.all(`SELECT e.id, e.title, e.date, e.seats, COALESCE((SELECT SUM(seats) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled'), 0) taken
                    FROM events e WHERE e.date >= ? AND e.active = 1 ORDER BY e.date LIMIT 4`, t),
    recent_orders: db.all('SELECT id, ref, name, total, status, created_at FROM orders ORDER BY id DESC LIMIT 5'),
    default_password: !!db.get("SELECT 1 FROM settings WHERE key = 'admin_default_pw'"),
  };
});

get('/api/admin/options', (ctx) => {
  A.requireAdmin(ctx);
  return {
    services: db.all('SELECT id, name, category, duration, price FROM services ORDER BY sort, id'),
    courses: db.all('SELECT id, title, price FROM courses ORDER BY id DESC'),
    users: db.all('SELECT id, name, email FROM users ORDER BY name'),
    events: db.all('SELECT id, title, date FROM events ORDER BY date DESC'),
  };
});

/* ------------------------------------------------------------ paramètres */
get('/api/admin/settings', (ctx) => { A.requireAdmin(ctx); return db.settings(); });

put('/api/admin/settings', async (ctx) => {
  A.requireAdmin(ctx);
  const b = await ctx.json(500_000);
  const clean = {};
  for (const [k, def] of Object.entries(db.DEFAULT_SETTINGS)) {
    if (!(k in b)) continue;
    const v = b[k];
    if (typeof def === 'number') clean[k] = Number(v) || 0;
    else if (typeof def === 'string') clean[k] = String(v ?? '').slice(0, 8000);
    else if (Array.isArray(def)) clean[k] = Array.isArray(v) ? v.slice(0, 50) : def;
    else if (typeof def === 'object' && def) clean[k] = v && typeof v === 'object' ? v : def;
  }
  if ('map_embed' in clean && clean.map_embed && !/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(clean.map_embed)) {
    const m = /src="([^"]+)"/.exec(clean.map_embed);
    clean.map_embed = m && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/.test(m[1]) ? m[1] : '';
  }
  if (clean.closed_dates) clean.closed_dates = clean.closed_dates.filter(U.isDate);
  return db.saveSettings(clean);
});

post('/api/admin/password', async (ctx) => {
  const u = A.requireAdmin(ctx);
  const b = await ctx.json();
  const row = db.get('SELECT password FROM users WHERE id = ?', u.id);
  if (!(await A.verifyPassword(b.current, row.password))) fail(400, 'Mot de passe actuel incorrect.');
  if (String(b.next || '').length < 10) fail(400, 'Le nouveau mot de passe doit contenir au moins 10 caractères.');
  const email = b.email ? U.email(b.email, true) : null;
  if (email && db.get('SELECT id FROM users WHERE email = ? AND id != ?', email, u.id)) fail(409, 'Cet e-mail est déjà utilisé.');
  db.run('UPDATE users SET password = ?, email = COALESCE(?, email) WHERE id = ?', await A.hashPassword(b.next), email, u.id);
  db.run("DELETE FROM settings WHERE key = 'admin_default_pw'");
  db.run('DELETE FROM sessions WHERE user_id = ? AND token != ?', u.id, crypto.createHash('sha256').update(ctx.cookies.sid || '').digest('hex'));
  return { ok: true };
});

/* ---------------------------------------------------------------- upload */
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VID_EXT = ['.mp4', '.webm', '.mov', '.m4v'];
post('/api/admin/upload', (ctx) => {
  A.requireAdmin(ctx);
  const ext = path.extname(String(ctx.query.name || '')).toLowerCase();
  const isImg = IMG_EXT.includes(ext), isVid = VID_EXT.includes(ext);
  if (!isImg && !isVid) fail(400, 'Format non pris en charge. Images : JPG, PNG, WEBP · Vidéos : MP4, WEBM, MOV');
  const limit = isImg ? 12 * 1024 * 1024 : 4 * 1024 * 1024 * 1024;
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext === '.jpeg' ? '.jpg' : ext}`;
  const dest = path.join(isImg ? db.UPLOAD_DIR : db.VIDEO_DIR, name);
  return new Promise((resolve, reject) => {
    let size = 0, head = null, failed = false;
    const out = fs.createWriteStream(dest);
    const abort = (status, msg) => {
      if (failed) return;
      failed = true;
      ctx.req.unpipe(out); out.destroy();
      fs.unlink(dest, () => {});
      ctx.req.resume();
      reject(new HttpError(status, msg));
    };
    ctx.req.on('data', (c) => {
      size += c.length;
      if (!head) head = c.subarray(0, 16);
      if (size > limit) abort(413, isImg ? 'Image trop lourde (12 Mo max).' : 'Vidéo trop lourde (4 Go max).');
    });
    ctx.req.pipe(out);
    out.on('finish', () => {
      if (failed) return;
      if (!size) return abort(400, 'Fichier vide');
      if (isImg && !U.imageExt(head)) return abort(400, 'Le fichier n’est pas une image valide.');
      resolve(isImg ? { url: '/uploads/' + name, size } : { src: name, size });
    });
    out.on('error', () => abort(500, 'Écriture du fichier impossible'));
    ctx.req.on('error', () => abort(400, 'Envoi interrompu'));
  });
});

/* ---------------------------------------------------------------- export */
get('/api/admin/export/:res', (ctx) => {
  const r = resource(ctx);
  const rows = db.all(`SELECT * FROM (${r.list || `SELECT * FROM ${r.table}`})`).map((row) => {
    const o = { ...row };
    delete o.password;
    return o;
  });
  const body = U.csv(rows);
  ctx.res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${ctx.params.res}-${db.today()}.csv"`,
    'Cache-Control': 'no-store',
  });
  ctx.res.end(body);
});
