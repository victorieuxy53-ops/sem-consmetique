'use strict';
/**
 * Institut de beauté — serveur d'application.
 * Node.js ≥ 22.13, aucune dépendance externe. Lancement : npm start
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const db = require('./server/db');
const { handle, sendJson } = require('./server/http');
require('./server/routes/public');
require('./server/routes/account');
require('./server/routes/admin');
const { seedIfEmpty } = require('./server/seed');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};
const COMPRESSIBLE = /\.(html|js|css|json|svg|webmanifest|txt|xml)$/;

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://www.google.com https://maps.google.com",
  "connect-src 'self'",
  "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "object-src 'none'",
].join('; ');

/* -------------------------------------------- fichiers statiques (cache) */
const memo = new Map();
function loadStatic(file) {
  let st;
  try { st = fs.statSync(file); } catch { return null; }
  if (!st.isFile()) return null;
  const key = file + ':' + st.mtimeMs + ':' + st.size;
  const hit = memo.get(file);
  if (hit && hit.key === key) return hit;
  const raw = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  const entry = {
    key, raw, ext,
    etag: '"' + crypto.createHash('sha1').update(raw).digest('base64').slice(0, 20) + '"',
    gz: COMPRESSIBLE.test(ext) && raw.length > 1024 ? zlib.gzipSync(raw, { level: 8 }) : null,
  };
  if (raw.length < 2 * 1024 * 1024) memo.set(file, entry);
  return entry;
}

function sendStatic(req, res, entry, { cache = 'no-cache', body } = {}) {
  const headers = { 'Content-Type': MIME[entry.ext] || 'application/octet-stream', 'Cache-Control': cache, ETag: entry.etag, Vary: 'Accept-Encoding' };
  if (!body && req.headers['if-none-match'] === entry.etag) { res.writeHead(304, headers); return res.end(); }
  let data = body || entry.raw;
  if (/\bgzip\b/.test(req.headers['accept-encoding'] || '') && (body ? data.length > 1024 : entry.gz)) {
    data = body ? zlib.gzipSync(data) : entry.gz;
    headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = data.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : data);
}

function safeJoin(base, rel) {
  const p = path.normalize(path.join(base, rel));
  return p.startsWith(base + path.sep) || p === base ? p : null;
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function shell(file) {
  const entry = loadStatic(path.join(PUBLIC_DIR, file));
  const s = db.settings();
  const html = entry.raw.toString('utf8')
    .replaceAll('%%NAME%%', escHtml(s.site_name))
    .replaceAll('%%TAGLINE%%', escHtml(s.tagline))
    .replaceAll('%%DESC%%', escHtml(s.hero_sub));
  return { entry: { ...entry, etag: '"shell"' }, body: Buffer.from(html) };
}

/* ------------------------------------------------------------- serveur */
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP);

  let url, pathname;
  try {
    url = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch { res.writeHead(400); return res.end('Bad request'); }

  try {
    if (pathname.startsWith('/api/') || pathname.startsWith('/media/')) return await handle(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }

    if (pathname.startsWith('/uploads/')) {
      const f = safeJoin(db.UPLOAD_DIR, pathname.slice('/uploads/'.length));
      const e = f && loadStatic(f);
      if (!e) { res.writeHead(404); return res.end(); }
      return sendStatic(req, res, e, { cache: 'public, max-age=2592000, immutable' });
    }

    if (pathname !== '/' && !pathname.endsWith('.html')) {
      const f = safeJoin(PUBLIC_DIR, pathname);
      const e = f && loadStatic(f);
      if (e) return sendStatic(req, res, e, { cache: pathname === '/sw.js' ? 'no-cache' : 'no-cache' });
      if (path.extname(pathname)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Introuvable'); }
    }

    // Routes de l'application (SPA)
    const { entry, body } = shell(pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin.html' : 'index.html');
    sendStatic(req, res, entry, { body });
  } catch (e) {
    console.error('[server]', e);
    if (!res.headersSent) sendJson(res, 500, { error: 'Erreur interne du serveur' });
  }
});

server.requestTimeout = 2 * 60 * 60 * 1000; // envois de vidéos volumineuses
server.headersTimeout = 60 * 1000;

seedIfEmpty().then(() => {
  server.listen(PORT, HOST, () => {
    const s = db.settings();
    console.log(`\n  ✦ ${s.site_name} — ${s.tagline}`);
    console.log(`  ✦ Site public :  http://localhost:${PORT}`);
    console.log(`  ✦ Espace admin : http://localhost:${PORT}/admin\n`);
  });
}).catch((e) => { console.error(e); process.exit(1); });

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.close(); try { db.db.close(); } catch { /* ignore */ } process.exit(0); });
