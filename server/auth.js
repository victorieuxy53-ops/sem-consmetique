import crypto from 'node:crypto';
import { promisify } from 'node:util';
import * as db from './db.js';
import { HttpError } from './http.js';

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(pw), salt, 64);
  return `s1$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(pw, stored) {  
  const [v, s, k] = String(stored || '').split('$');
  if (v !== 's1' || !s || !k) return false;
  const key = Buffer.from(k, 'base64');
  const test = await scrypt(String(pw), Buffer.from(s, 'base64'), key.length);
  return crypto.timingSafeEqual(key, test);
}

async function createSession(ctx, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.run('INSERT INTO sessions(token, user_id, expires) VALUES (?, ?, ?)', sha(token), userId, Date.now() + SESSION_DAYS * 864e5);
  ctx.setCookie('sid', token, SESSION_DAYS * 86400);
  ctx._user = undefined;
}

async function destroySession(ctx) {
  const t = ctx.cookies.sid;
  if (t) await db.run('DELETE FROM sessions WHERE token = ?', sha(t));
  ctx.setCookie('sid', '', 0);
}

async function currentUser(ctx) {
  if (ctx._user !== undefined) return ctx._user;
  const t = ctx.cookies.sid;
  let u = null;
  if (t && t.length < 120) {
    u = await db.get(`SELECT u.id, u.name, u.email, u.phone, u.role, s.expires
                FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`, sha(t)) || null;
    if (u && u.expires < Date.now()) { await db.run('DELETE FROM sessions WHERE token = ?', sha(t)); u = null; }
  }
  return (ctx._user = u);
}

async function requireUser(ctx) {
  const u = await currentUser(ctx);
  if (!u) throw new HttpError(401, 'Veuillez vous connecter pour continuer.');
  return u;
}

async function requireAdmin(ctx) {
  const u = await requireUser(ctx);
  if (u.role !== 'admin') throw new HttpError(403, 'Accès réservé à l’administration.');
  return u;
}

const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };

globalThis.__institutSessions ||= setInterval(async () => { try { await db.run('DELETE FROM sessions WHERE expires < ?', Date.now()); } catch { /* ignore */ } }, 6 * 3600_000).unref();

export { hashPassword, verifyPassword, createSession, destroySession, currentUser, requireUser, requireAdmin, publicUser };
  