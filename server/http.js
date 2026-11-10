/**
 * Mini-routeur HTTP au standard Web (Request/Response) : utilisé par les route handlers
 * Next.js (`app/api`, `app/media`) et, sans HTTP, par les Server Components via `call()`.
 */
import fs from 'node:fs';
import { Readable } from 'node:stream';

const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const SECURE_COOKIES = process.env.SECURE_COOKIES === '1';
const G = (globalThis.__institutHttp ||= { buckets: new Map() });

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };

/* ---------------------------------------------------------------- routes */
const routes = [];
function add(method, pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ method, re, keys, handler });
}
export const get = (p, h) => add('GET', p, h);
export const post = (p, h) => add('POST', p, h);
export const put = (p, h) => add('PUT', p, h);
export const patch = (p, h) => add('PATCH', p, h);
export const del = (p, h) => add('DELETE', p, h);

function match(method, pathname) {
  let mismatch = false;
  for (const r of routes) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    if (r.method !== method) { mismatch = true; continue; }
    return { r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return { mismatch };
}

/* ---------------------------------------------------------------- utils */
export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const v = part.slice(i + 1).trim();
    try { out[part.slice(0, i).trim()] = decodeURIComponent(v); } catch { out[part.slice(0, i).trim()] = v; }
  }
  return out;
}

export const json = (status, obj) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

/** IP cliente : 1re adresse derrière un proxy de confiance, sinon le dernier saut (non falsifiable). */
function clientIp(req) {
  const parts = String(req.headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return (TRUST_PROXY ? parts[0] : parts.at(-1)) || req.headers.get('x-real-ip') || '';
}

/* ------------------------------------------------------- rate limiting */
export function rateLimit(ctx, name, max, windowSec) {
  const key = name + '|' + ctx.ip, now = Date.now();
  let b = G.buckets.get(key);
  if (!b || b.reset < now) G.buckets.set(key, (b = { n: 0, reset: now + windowSec * 1000 }));
  if (++b.n > max) fail(429, 'Trop de tentatives. Merci de réessayer un peu plus tard.');
}
G.timer ||= setInterval(() => {
  const now = Date.now();
  for (const [k, b] of G.buckets) if (b.reset < now) G.buckets.delete(k);
}, 10 * 60 * 1000).unref();

/* ---------------------------------------------------------------- ctx */
function makeCtx(req, url, params, cookies) {
  const out = [];
  return {
    req, url, params, cookies, out,
    query: Object.fromEntries(url.searchParams),
    ip: req ? clientIp(req) : '',
    async json(limit = 200_000) {
      if (+req.headers.get('content-length') > limit) fail(413, 'Contenu trop volumineux');
      const buf = Buffer.from(await req.arrayBuffer());
      if (buf.length > limit) fail(413, 'Contenu trop volumineux');
      if (!buf.length) return {};
      let v;
      try { v = JSON.parse(buf.toString('utf8')); } catch { fail(400, 'Données invalides (JSON)'); }
      if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(400, 'Données invalides');
      return v;
    },
    setCookie(name, value, maxAge) {
      out.push([`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`, SECURE_COOKIES && 'Secure'].filter(Boolean).join('; '));
    },
  };
}

/** Point d'entrée HTTP (route handlers). */
export async function handle(req) {
  const url = new URL(req.url);
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  let found;
  try { found = match(method, url.pathname); } catch { return json(400, { error: 'URL invalide' }); }
  if (!found.r) return json(found.mismatch ? 405 : 404, { error: found.mismatch ? 'Méthode non autorisée' : 'Ressource introuvable' });
  const ctx = makeCtx(req, url, found.params, parseCookies(req.headers.get('cookie')));
  let res;
  try {
    // Protection CSRF : toute écriture doit venir de notre client fetch (en-tête personnalisé).
    if (method !== 'GET' && req.headers.get('x-requested-with') !== 'fetch') fail(403, 'Requête refusée');
    const out = await found.r.handler(ctx);
    res = out instanceof Response ? out : json(200, out === undefined ? { ok: true } : out);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error('[api]', req.method, url.pathname, e);
    res = json(e.status || 500, { error: e.status ? e.message : 'Erreur interne du serveur' });
  }
  for (const c of ctx.out) res.headers.append('Set-Cookie', c);
  return res;
}

/** Appel interne depuis un Server Component : même logique métier, sans aller-retour HTTP. */
export async function call(path, cookies = {}) {
  const url = new URL(path, 'http://local');
  const found = match('GET', url.pathname);
  if (!found.r) throw new HttpError(404, 'Ressource introuvable');
  const out = await found.r.handler(makeCtx(null, url, found.params, cookies));
  return JSON.parse(JSON.stringify(out ?? null));
}

/* ------------------------------------------------- streaming (Range) */
export function streamFile(req, file, type) {
  let size;
  try { size = fs.statSync(file).size; } catch { return json(404, { error: 'Fichier introuvable' }); }
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' };
  const body = (o) => (req.method === 'HEAD' ? null : Readable.toWeb(fs.createReadStream(file, o)));
  const range = req.headers.get('range');
  if (!range) return new Response(body(), { headers: { ...headers, 'Content-Length': String(size) } });
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = m && m[1] ? +m[1] : NaN, end = m && m[2] ? +m[2] : NaN;
  if (Number.isNaN(start)) { start = size - (Number.isNaN(end) ? 0 : end); end = size - 1; }
  if (Number.isNaN(end) || end >= size) end = size - 1;
  if (!m || start < 0 || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(body({ start, end }), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
}
