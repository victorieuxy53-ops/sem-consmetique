'use strict';
/**
 * Mini-framework HTTP sans dépendance : routeur, contexte de requête,
 * lecture du corps, cookies, limitation de débit, streaming de fichiers.
 */
const fs = require('fs');

const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const SECURE_COOKIES = process.env.SECURE_COOKIES === '1';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => { throw new HttpError(status, message); };

/* ---------------------------------------------------------------- routes */
const routes = [];
function add(method, pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ method, re, keys, handler });
}
const get = (p, h) => add('GET', p, h);
const post = (p, h) => add('POST', p, h);
const put = (p, h) => add('PUT', p, h);
const patch = (p, h) => add('PATCH', p, h);
const del = (p, h) => add('DELETE', p, h);

/* ---------------------------------------------------------------- utils */
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, over = false;
    req.on('data', (c) => {
      if (over) return;
      size += c.length;
      if (size > limit) { over = true; chunks.length = 0; } else chunks.push(c);
    });
    req.on('end', () => (over ? reject(new HttpError(413, 'Contenu trop volumineux')) : resolve(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/* ------------------------------------------------------- rate limiting */
const buckets = new Map();
function rateLimit(ctx, name, max, windowSec) {
  const key = name + '|' + ctx.ip;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowSec * 1000 }; buckets.set(key, b); }
  if (++b.n > max) fail(429, 'Trop de tentatives. Merci de réessayer un peu plus tard.');
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 10 * 60 * 1000).unref();

/* ---------------------------------------------------------------- ctx */
function makeCtx(req, res, url, params) {
  const fwd = TRUST_PROXY && req.headers['x-forwarded-for'];
  return {
    req, res, url, params,
    query: Object.fromEntries(url.searchParams),
    ip: (fwd && String(fwd).split(',')[0].trim()) || req.socket.remoteAddress || '',
    cookies: parseCookies(req.headers.cookie),
    async json(limit = 200_000) {
      const buf = await readBody(req, limit);
      if (!buf.length) return {};
      let v;
      try { v = JSON.parse(buf.toString('utf8')); } catch { fail(400, 'Données invalides (JSON)'); }
      if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(400, 'Données invalides');
      return v;
    },
    setCookie(name, value, maxAge) {
      const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
      if (SECURE_COOKIES) parts.push('Secure');
      res.setHeader('Set-Cookie', parts.join('; '));
    },
  };
}

async function handle(req, res, url) {
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  let mismatch = false;
  for (const r of routes) {
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    if (r.method !== method) { mismatch = true; continue; }
    const params = {};
    try { r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); }
    catch { return sendJson(res, 400, { error: 'URL invalide' }); }
    const ctx = makeCtx(req, res, url, params);
    try {
      // Protection CSRF : toute écriture doit venir de notre client fetch (en-tête personnalisé).
      if (method !== 'GET' && req.headers['x-requested-with'] !== 'fetch') fail(403, 'Requête refusée');
      const out = await r.handler(ctx);
      if (!res.headersSent && !res.writableEnded) sendJson(res, 200, out === undefined ? { ok: true } : out);
    } catch (e) {
      if (!(e instanceof HttpError)) console.error('[api]', req.method, url.pathname, e);
      if (!res.headersSent) sendJson(res, e.status || 500, { error: e.status ? e.message : 'Erreur interne du serveur' });
      else res.end();
    }
    return;
  }
  sendJson(res, mismatch ? 405 : 404, { error: mismatch ? 'Méthode non autorisée' : 'Ressource introuvable' });
}

/* ------------------------------------------------- streaming (Range) */
function streamFile(req, res, file, type) {
  let stat;
  try { stat = fs.statSync(file); } catch { return sendJson(res, 404, { error: 'Fichier introuvable' }); }
  const size = stat.size;
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' };
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let start = m && m[1] ? +m[1] : NaN;
    let end = m && m[2] ? +m[2] : NaN;
    if (Number.isNaN(start)) { start = size - (Number.isNaN(end) ? 0 : end); end = size - 1; }
    if (Number.isNaN(end) || end >= size) end = size - 1;
    if (!m || start < 0 || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

module.exports = { HttpError, fail, get, post, put, patch, del, handle, rateLimit, readBody, sendJson, streamFile };
