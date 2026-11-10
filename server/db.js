/**
 * Base de données SQLite (module natif node:sqlite) + paramètres du site.
 * Connexion unique par processus (globalThis) : Next.js peut charger ce module plusieurs fois.
 */
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || 'data'); // données d'exécution, hors bundle
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const VIDEO_DIR = path.join(DATA_DIR, 'videos');
const G = (globalThis.__institutDb ||= { stmts: new Map(), depth: 0, settings: null });

if (!G.db) {
  for (const d of [DATA_DIR, UPLOAD_DIR, VIDEO_DIR]) fs.mkdirSync(d, { recursive: true });
  const warn = process.emitWarning; // masque l'avertissement « SQLite expérimental »
  process.emitWarning = (w, ...a) => (String(w?.message ?? w).includes('SQLite') ? undefined : warn.call(process, w, ...a));
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  process.emitWarning = warn;
  G.db = new DatabaseSync(path.join(DATA_DIR, 'institut.sqlite'));
  G.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;');
  G.db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, phone TEXT,
  password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'client', created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE, category TEXT, name TEXT NOT NULL, short TEXT, description TEXT,
  price INTEGER DEFAULT 0, duration INTEGER DEFAULT 60, image TEXT, tags TEXT,
  featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, sort INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE, service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, name TEXT, phone TEXT, email TEXT,
  date TEXT, time TEXT, duration INTEGER DEFAULT 60, price INTEGER DEFAULT 0, notes TEXT,
  status TEXT DEFAULT 'pending', source TEXT DEFAULT 'web', created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE, category TEXT, name TEXT NOT NULL, brand TEXT, short TEXT,
  description TEXT, usage TEXT, price INTEGER DEFAULT 0, compare_price INTEGER, stock INTEGER,
  image TEXT, art TEXT DEFAULT 'jar', color TEXT DEFAULT '#c49a5a', tags TEXT,
  featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT, phone TEXT, email TEXT, address TEXT, city TEXT, delivery TEXT, payment TEXT, payment_ref TEXT,
  subtotal INTEGER, discount INTEGER DEFAULT 0, delivery_fee INTEGER DEFAULT 0, total INTEGER, promo TEXT,
  notes TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER, name TEXT, price INTEGER, qty INTEGER);

CREATE TABLE IF NOT EXISTS custom_orders (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT, details TEXT, budget TEXT, wanted_date TEXT, image TEXT, name TEXT, phone TEXT, email TEXT,
  status TEXT DEFAULT 'new', quote INTEGER, admin_note TEXT, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT NOT NULL, subtitle TEXT, description TEXT, level TEXT,
  price INTEGER DEFAULT 0, compare_price INTEGER, image TEXT, color TEXT DEFAULT '#9b4d6e', instructor TEXT,
  duration_label TEXT, what_you_learn TEXT, published INTEGER DEFAULT 1, featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, video_type TEXT DEFAULT 'none', video_src TEXT,
  duration INTEGER DEFAULT 0, is_preview INTEGER DEFAULT 0, sort INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, amount INTEGER DEFAULT 0,
  payment_method TEXT, payment_ref TEXT, payer_phone TEXT, status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')), activated_at TEXT, UNIQUE(course_id, user_id));

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  done_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (user_id, lesson_id));

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT NOT NULL, description TEXT, date TEXT, time TEXT,
  end_time TEXT, location TEXT, price INTEGER DEFAULT 0, seats INTEGER DEFAULT 10, image TEXT,
  color TEXT DEFAULT '#9b4d6e', active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE, event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, name TEXT, phone TEXT, email TEXT,
  seats INTEGER DEFAULT 1, status TEXT DEFAULT 'pending', payment_ref TEXT, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY, kind TEXT DEFAULT 'contact', name TEXT, email TEXT, phone TEXT, subject TEXT,
  message TEXT, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY, name TEXT, rating INTEGER DEFAULT 5, text TEXT, service TEXT,
  approved INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT NOT NULL, excerpt TEXT, content TEXT, category TEXT,
  image TEXT, color TEXT DEFAULT '#9b4d6e', read_time INTEGER DEFAULT 4, published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS promos (
  id INTEGER PRIMARY KEY, code TEXT UNIQUE COLLATE NOCASE, type TEXT DEFAULT 'percent', value INTEGER,
  min_amount INTEGER DEFAULT 0, max_uses INTEGER, uses INTEGER DEFAULT 0, expires TEXT, active INTEGER DEFAULT 1);

CREATE TABLE IF NOT EXISTS newsletter (email TEXT PRIMARY KEY COLLATE NOCASE, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY, title TEXT, category TEXT, image TEXT, after_image TEXT, sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));
`);
}
// Migrations douces : colonnes ajoutées après la création initiale de la base
// (hors du bloc ci-dessus pour s'appliquer aussi à un serveur déjà lancé).
if (G.schema !== 2) {
  const cols = new Set(G.db.prepare('PRAGMA table_info(products)').all().map((c) => c.name));
  if (!cols.has('bulk_qty')) G.db.exec('ALTER TABLE products ADD COLUMN bulk_qty INTEGER');     // prix dégressif : dès N articles…
  if (!cols.has('bulk_price')) G.db.exec('ALTER TABLE products ADD COLUMN bulk_price INTEGER'); // …ce prix à l'unité
  G.schema = 2;
}
export const db = G.db;

/* ------------------------------------------------------------ helpers */
function stmt(sql) {
  let s = G.stmts.get(sql);
  if (!s) { s = db.prepare(sql); G.stmts.set(sql, s); }
  return s;
}
const norm = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
export const all = (sql, ...p) => stmt(sql).all(...p.map(norm));
export const get = (sql, ...p) => stmt(sql).get(...p.map(norm));
export const run = (sql, ...p) => stmt(sql).run(...p.map(norm));

export function tx(fn) {
  if (G.depth) return fn();
  G.depth++;
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
  finally { G.depth--; }
}

/* ------------------------------------------------------------ settings */
export const DEFAULT_SETTINGS = {
  site_name: 'SEM Cosmétique',
  tagline: 'Soins & beauté au naturel',
  slogan: 'Parce que votre peau mérite le meilleur',
  hero_title: 'Révélez l’éclat *naturel* de votre peau',
  hero_image: '',
  hero_video: '',
  about_image: '/assets/img/sem/ella-sodonon.jpg',
  hero_sub: 'Huiles, savons, laits et crèmes SEM Cosmétique, et des soins où chaque geste est pensé pour votre peau : visage, corps, make-up, attache foulard et dermo-conseils.',
  about_story: "SEM Cosmétique est née d'une conviction simple : chaque femme mérite des soins qui respectent sa peau, la subliment et lui redonnent confiance.\n\nDe cette passion sont nés nos soins signature : l'huile réparatrice Oil Secret, le lait corporel Lucioles, la crème correctrice Ciole, notre savon anti-transpiration ou encore le gel intime Belle V. Chaque formule est pensée pour les peaux noires et métissées, avec des actifs choisis avec exigence.\n\nSur place, nous prolongeons cette attention avec des soins du visage et du corps, le make-up, l'attache foulard et des dermo-conseils honnêtes, pour vous accompagner au quotidien comme lors de vos plus beaux moments.",
  founder_name: 'Ella Sodonon',
  founder_role: 'Fondatrice de SEM Cosmétique',
  founder_image: '/assets/img/sem/ella-sodonon.jpg',
  founder_quote: 'Je crée chaque soin comme je l’offrirais à une amie : avec exigence, douceur et le désir sincère de vous voir rayonner.',
  phones: ['01 63 40 35 39', '01 97 04 52 83'],
  whatsapp: '01 63 40 35 39',
  country_code: '229',
  email: '',
  address: '',
  city: 'Bénin',
  map_embed: '',
  facebook: 'https://www.facebook.com/ella.sodonon.37', instagram: '', tiktok: '',
  hours: { 0: null, 1: ['08:00', '19:00'], 2: ['08:00', '19:00'], 3: ['08:00', '19:00'], 4: ['08:00', '19:00'], 5: ['08:00', '19:00'], 6: ['09:00', '18:00'] },
  tz_offset: 1,
  capacity: 2,
  slot_interval: 30,
  min_advance: 60,
  max_days: 60,
  closed_dates: [],
  momo: [
    { network: 'MTN MoMo', number: '01 63 40 35 39', name: '' },
    { network: 'Moov Money', number: '01 97 04 52 83', name: '' },
  ],
  payment_note: 'Envoyez le montant exact sur l’un des numéros ci-dessous, puis indiquez la référence (ID) de la transaction. Votre accès est activé dès vérification.',
  delivery_fee: 1500,
  free_delivery_from: 50000,
  stats: { years: 8, clients: 2500, services: 30, rating: 4.9 },
};


export function settings() {
  // Le cache vit dans globalThis (survit au rechargement à chaud de `npm run dev`) : on le jette dès que
  // les valeurs par défaut du code changent, sinon le site garderait les anciens textes jusqu'au redémarrage.
  if (G.settings && G.settingsFrom === DEFAULT_SETTINGS) return G.settings;
  G.settingsFrom = DEFAULT_SETTINGS;
  const s = structuredClone(DEFAULT_SETTINGS);
  for (const r of all('SELECT key, value FROM settings')) {
    try { s[r.key] = JSON.parse(r.value); } catch { /* ignore */ }
  }
  return (G.settings = s);
}
export function saveSettings(obj) {
  tx(() => {
    for (const [k, v] of Object.entries(obj)) {
      if (!(k in DEFAULT_SETTINGS)) continue;
      run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', k, JSON.stringify(v));
    }
  });
  G.settings = null;
  return settings();
}

/* ------------------------------------------------------ heure locale */
export function localNow() { return new Date(Date.now() + (Number(settings().tz_offset) || 0) * 3600_000); }
export function today() { return localNow().toISOString().slice(0, 10); }
export function nowMinutes() { const d = localNow(); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
export function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
