import * as db from '../db.js';
import { get, post, put, fail, rateLimit } from '../http.js';
import * as A from '../auth.js';
import * as U from '../util.js';

post('/api/auth/register', async (ctx) => {
  rateLimit(ctx, 'register', 8, 3600);
  const b = await ctx.json();
  const name = U.str(b.name, 120, 'nom', true);
  const email = U.email(b.email, true);
  const phone = U.phone(b.phone, false);
  const pw = String(b.password || '');
  if (pw.length < 8) fail(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  if (await db.get('SELECT id FROM users WHERE email = ?', email)) fail(409, 'Un compte existe déjà avec cet e-mail. Connectez-vous.');
  const r = await db.run('INSERT INTO users (name, email, phone, password) VALUES (?,?,?,?)', name, email, phone, await A.hashPassword(pw));
  await A.createSession(ctx, r.lastInsertRowid);
  return { user: { id: r.lastInsertRowid, name, email, phone, role: 'client' } };
});

post('/api/auth/login', async (ctx) => {
  rateLimit(ctx, 'login', 10, 900);
  const b = await ctx.json();
  // Identifiant : e-mail OU numéro de téléphone (comparé sur ses 8 derniers chiffres : « 01 63 40 35 39 »,
  // « 0163403539 » ou « +229 01 63 40 35 39 » fonctionnent). À numéro égal, le compte administrateur passe en premier.
  const id = String(b.login ?? b.email ?? '').trim();
  let u;
  if (id.includes('@')) u = await db.get('SELECT * FROM users WHERE email = ?', id.toLowerCase());
  else if (U.digits(id).length >= 8) {
    const tail = U.digits(id).slice(-8);
    const found = (await db.all("SELECT * FROM users WHERE phone IS NOT NULL AND phone != '' ORDER BY role = 'admin' DESC, id")).filter((x) => U.samePhone(x.phone, tail));
    for (const x of found) if (await A.verifyPassword(b.password, x.password)) { u = x; break; }
    if (!u) fail(401, 'Téléphone ou mot de passe incorrect.');
  }
  if (!u || !(await A.verifyPassword(b.password, u.password))) fail(401, 'Identifiant ou mot de passe incorrect.');
  await A.createSession(ctx, u.id);
  return { user: A.publicUser(u) };
});

post('/api/auth/logout', async (ctx) => { await A.destroySession(ctx); return { ok: true }; });
get('/api/auth/me', async (ctx) => ({ user: A.publicUser(await A.currentUser(ctx)) }));

get('/api/me/dashboard', async (ctx) => {
  const u = await A.requireUser(ctx);
  const orders = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', u.id);
  for (const o of orders) o.items = await db.all('SELECT name, qty, price FROM order_items WHERE order_id = ?', o.id);
  return {
    bookings: await db.all(`SELECT b.*, s.name service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id
                      WHERE b.user_id = ? ORDER BY b.date DESC, b.time DESC`, u.id),
    orders,
    courses: await db.all(`SELECT e.status, e.ref, e.created_at, c.id, c.slug, c.title, c.subtitle, c.color, c.image,
                     (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) total,
                     (SELECT COUNT(*) FROM progress p JOIN lessons l ON l.id = p.lesson_id WHERE p.user_id = e.user_id AND l.course_id = c.id) done
                     FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY e.id DESC`, u.id),
    custom: await db.all('SELECT id, ref, type, budget, wanted_date, status, quote, admin_note, created_at FROM custom_orders WHERE user_id = ? ORDER BY id DESC', u.id),
    events: await db.all(`SELECT r.ref, r.seats, r.status, e.title, e.date, e.time, e.location FROM registrations r
                    JOIN events e ON e.id = r.event_id WHERE r.user_id = ? ORDER BY e.date DESC`, u.id),
  };
});

post('/api/me/bookings/:id/cancel', async (ctx) => {
  const u = await A.requireUser(ctx);
  const b = await db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', U.int(ctx.params.id), u.id);
  if (!b) fail(404, 'Rendez-vous introuvable');
  if (!['pending', 'confirmed'].includes(b.status) || b.date < db.today()) fail(400, 'Ce rendez-vous ne peut plus être annulé en ligne. Appelez-nous.');
  await db.run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", b.id);
  return { ok: true };
});

put('/api/me/profile', async (ctx) => {
  const u = await A.requireUser(ctx);
  const b = await ctx.json();
  const name = U.str(b.name, 120, 'nom', true);
  const phone = U.phone(b.phone, false);
  if (b.new_password) {
    if (String(b.new_password).length < 8) fail(400, 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
    const row = await db.get('SELECT password FROM users WHERE id = ?', u.id);
    if (!(await A.verifyPassword(b.current_password, row.password))) fail(400, 'Mot de passe actuel incorrect.');
    await db.run('UPDATE users SET password = ? WHERE id = ?', await A.hashPassword(b.new_password), u.id);
  }
  await db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', name, phone, u.id);
  return { user: { ...A.publicUser(u), name, phone } };
});
