/**
 * Base de données + paramètres du site.
 * - En ligne (Vercel) : base Turso (libSQL, compatible SQLite) si TURSO_DATABASE_URL est défini → données PERMANENTES,
 *   partagées par toutes les instances : ce qu'Ella modifie dans l'admin reste en ligne.
 * - En local / sur un VPS : fichier SQLite dans le dossier des données (data/institut.sqlite).
 * Une seule API asynchrone pour les deux : get / all / run / tx (+ settings() synchrone, rechargé à chaque requête).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from '@libsql/client';

/**
 * Dossier des données locales (base hors Turso, photos et vidéos hors Vercel Blob), hors bundle :
 * - `DATA_DIR` si défini (serveur VPS, disque persistant) ;
 * - sur Vercel, `/tmp` : le dossier du projet y est en lecture seule ;
 * - sinon `./data`, avec repli sur le dossier temporaire si l'hébergeur interdit l'écriture.
 */
function dataDir() {
  const tmp = path.join(/* turbopackIgnore: true */ os.tmpdir(), 'sem-cosmetique-data');
  const wanted = process.env.DATA_DIR ? path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR) : process.env.VERCEL ? tmp : path.resolve(/* turbopackIgnore: true */ 'data');
  for (const dir of wanted === tmp ? [tmp] : [wanted, tmp]) {
    try {
      for (const d of [dir, path.join(/* turbopackIgnore: true */ dir, 'uploads'), path.join(/* turbopackIgnore: true */ dir, 'videos')]) fs.mkdirSync(/* turbopackIgnore: true */ d, { recursive: true });
      fs.accessSync(/* turbopackIgnore: true */ dir, fs.constants.W_OK);
      if (dir !== wanted) console.warn(`[données] « ${wanted} » n'est pas accessible en écriture : utilisation de « ${dir} » (données éphémères).`);
      return dir;
    } catch (e) { if (dir === tmp) throw e; }
  }
}
const G = (globalThis.__institutDb ||= { settings: null, settingsAt: 0 });
export const DATA_DIR = (G.dir ||= dataDir());
export const UPLOAD_DIR = path.join(/* turbopackIgnore: true */ DATA_DIR, 'uploads');
export const VIDEO_DIR = path.join(/* turbopackIgnore: true */ DATA_DIR, 'videos');

/** Base distante Turso (persistante). Variables posées automatiquement par l'intégration Vercel › Turso. */
const REMOTE_URL = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '';
export const REMOTE = /^(libsql|https?|wss?):\/\//.test(REMOTE_URL);
/** Photos et vidéos stockées dans Vercel Blob (persistant) quand le jeton est présent. */
export const BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const IN_TMP = DATA_DIR.startsWith(os.tmpdir());
/** Vrai quand la base vit dans le dossier temporaire : perdue au prochain démarrage à froid. */
export const EPHEMERAL = !REMOTE && IN_TMP;
/** Vrai quand les photos/vidéos envoyées vivent dans le dossier temporaire : perdues au prochain démarrage à froid. */
export const MEDIA_EPHEMERAL = !BLOB && IN_TMP;

/* ------------------------------------------------------------ connexion */
const SCHEMA = `
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
`;

const BUSY = /locked|busy/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Réessaie quand un autre processus tient le verrou du fichier local (jamais au milieu d'une transaction). */
async function retry(fn) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) { if (i >= 60 || !BUSY.test(e.message)) throw e; await sleep(30 + Math.random() * 120); }
  }
}

/** Colonnes ajoutées après la création initiale de la base. */
const COLUMNS = {
  products: { bulk_qty: 'INTEGER', bulk_price: 'INTEGER', video: 'TEXT', images: 'TEXT' },
};

async function init() {
  const c = REMOTE
    ? createClient({ url: REMOTE_URL, authToken: process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || undefined })
    : createClient({ url: 'file:' + path.join(/* turbopackIgnore: true */ DATA_DIR, 'institut.sqlite').split(path.sep).join('/') });
  if (!REMOTE) {
    await retry(() => c.execute('PRAGMA busy_timeout = 10000'));
    await retry(() => c.execute('PRAGMA journal_mode = WAL'));
  }
  await retry(() => c.executeMultiple(SCHEMA));
  for (const [table, cols] of Object.entries(COLUMNS)) {
    const have = new Set((await c.execute(`PRAGMA table_info(${table})`)).rows.map((r) => r.name));
    for (const [col, type] of Object.entries(cols)) {
      if (have.has(col)) continue;
      try { await retry(() => c.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`)); }
      catch (e) { if (!/duplicate column/i.test(e.message)) throw e; } // ajoutée entre-temps par une autre instance
    }
  }
  G.client = c;
}
/** Connexion prête (ouverte au premier usage, jamais à l'import : `next build` charge ce module sans base). */
const connected = () => (G.init ||= init().catch((e) => { G.init = null; throw e; }));

/** À appeler en début de requête : base prête + paramètres à jour. */
export async function ready() {
  await connected();
  await loadSettings();
}

/* ------------------------------------------------------------ requêtes */
const txStore = (G.als ||= new AsyncLocalStorage());
const norm = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
const rows = (rs) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));

async function exec(sql, params) {
  await connected();
  const stmt = { sql, args: params.map(norm) };
  const t = txStore.getStore();
  return t ? t.execute(stmt) : retry(() => G.client.execute(stmt));
}
export const all = async (sql, ...p) => rows(await exec(sql, p));
export const get = async (sql, ...p) => rows(await exec(sql, p))[0];
export async function run(sql, ...p) {
  const r = await exec(sql, p);
  return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid == null ? undefined : Number(r.lastInsertRowid) };
}

/** Transaction en écriture : toutes les requêtes faites pendant `fn` (même dans d'autres modules) y participent. */
export async function tx(fn) {
  if (txStore.getStore()) return fn();
  await connected();
  const t = await retry(() => G.client.transaction('write'));
  try {
    const out = await txStore.run(t, fn);
    await t.commit();
    return out;
  } catch (e) {
    try { await t.rollback(); } catch { /* déjà annulée */ }
    throw e;
  } finally { t.close(); }
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

/** Paramètres en cache (instance) : rechargés au plus toutes les 3 s pour suivre les modifications faites
    depuis une autre instance (Vercel), et aussitôt après un enregistrement sur celle-ci. */
const SETTINGS_TTL = 3000;
export async function loadSettings(force = false) {
  if (!force && G.settings && G.settingsFrom === DEFAULT_SETTINGS && Date.now() - G.settingsAt < SETTINGS_TTL) return G.settings;
  const s = structuredClone(DEFAULT_SETTINGS);
  for (const r of await all('SELECT key, value FROM settings')) {
    if (!(r.key in DEFAULT_SETTINGS)) continue; // clés internes (ex. admin_env) : jamais envoyées au navigateur
    try { s[r.key] = JSON.parse(r.value); } catch { /* ignore */ }
  }
  Object.assign(G, { settings: s, settingsAt: Date.now(), settingsFrom: DEFAULT_SETTINGS });
  return s;
}
/** Paramètres (synchrone) : chargés par ready() en début de requête. */
export function settings() {
  return G.settings && G.settingsFrom === DEFAULT_SETTINGS ? G.settings : structuredClone(DEFAULT_SETTINGS);
}
export async function saveSettings(obj) {
  await tx(async () => {
    for (const [k, v] of Object.entries(obj)) {
      if (!(k in DEFAULT_SETTINGS)) continue;
      await run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', k, JSON.stringify(v));
    }
  });
  return loadSettings(true);
}

/* ------------------------------------------------------ heure locale */
export function localNow() { return new Date(Date.now() + (Number(settings().tz_offset) || 0) * 3600_000); }
export function today() { return localNow().toISOString().slice(0, 10); }
export function nowMinutes() { const d = localNow(); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
export function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
