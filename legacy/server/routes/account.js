'use strict';
const db = require('../db');
const { get, post, put, fail, rateLimit } = require('../http');
const A = require('../auth');
const U = require('../util');

post('/api/auth/register', async (ctx) => {
  rateLimit(ctx, 'register', 8, 3600);
  const b = await ctx.json();
  const name = U.str(b.name, 120, 'nom', true);
  const email = U.email(b.email, true);
  const phone = U.phone(b.phone, false);
  const pw = String(b.password || '');
  if (pw.length < 8) fail(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  if (db.get('SELECT id FROM users WHERE email = ?', email)) fail(409, 'Un compte existe déjà avec cet e-mail. Connectez-vous.');
  const r = db.run('INSERT INTO users (name, email, phone, password) VALUES (?,?,?,?)', name, email, phone, await A.hashPassword(pw));
  A.createSession(ctx, r.lastInsertRowid);
  return { user: { id: r.lastInsertRowid, name, email, phone, role: 'client' } };
});

post('/api/auth/login', async (ctx) => {
  rateLimit(ctx, 'login', 10, 900);
  const b = await ctx.json();
  const u = db.get('SELECT * FROM users WHERE email = ?', String(b.email || '').trim().toLowerCase());
  if (!u || !(await A.verifyPassword(b.password, u.password))) fail(401, 'E-mail ou mot de passe incorrect.');
  A.createSession(ctx, u.id);
  return { user: A.publicUser(u) };
});

post('/api/auth/logout', (ctx) => { A.destroySession(ctx); return { ok: true }; });
get('/api/auth/me', (ctx) => ({ user: A.publicUser(A.currentUser(ctx)) }));

get('/api/me/dashboard', (ctx) => {
  const u = A.requireUser(ctx);
  const orders = db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', u.id);
  for (const o of orders) o.items = db.all('SELECT name, qty, price FROM order_items WHERE order_id = ?', o.id);
  return {
    bookings: db.all(`SELECT b.*, s.name service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id
                      WHERE b.user_id = ? ORDER BY b.date DESC, b.time DESC`, u.id),
    orders,
    courses: db.all(`SELECT e.status, e.ref, e.created_at, c.id, c.slug, c.title, c.subtitle, c.color, c.image,
                     (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) total,
                     (SELECT COUNT(*) FROM progress p JOIN lessons l ON l.id = p.lesson_id WHERE p.user_id = e.user_id AND l.course_id = c.id) done
                     FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY e.id DESC`, u.id),
    custom: db.all('SELECT id, ref, type, budget, wanted_date, status, quote, admin_note, created_at FROM custom_orders WHERE user_id = ? ORDER BY id DESC', u.id),
    events: db.all(`SELECT r.ref, r.seats, r.status, e.title, e.date, e.time, e.location FROM registrations r
                    JOIN events e ON e.id = r.event_id WHERE r.user_id = ? ORDER BY e.date DESC`, u.id),
  };
});

post('/api/me/bookings/:id/cancel', (ctx) => {
  const u = A.requireUser(ctx);
  const b = db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', U.int(ctx.params.id), u.id);
  if (!b) fail(404, 'Rendez-vous introuvable');
  if (!['pending', 'confirmed'].includes(b.status) || b.date < db.today()) fail(400, 'Ce rendez-vous ne peut plus être annulé en ligne. Appelez-nous.');
  db.run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", b.id);
  return { ok: true };
});

put('/api/me/profile', async (ctx) => {
  const u = A.requireUser(ctx);
  const b = await ctx.json();
  const name = U.str(b.name, 120, 'nom', true);
  const phone = U.phone(b.phone, false);
  if (b.new_password) {
    if (String(b.new_password).length < 8) fail(400, 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
    const row = db.get('SELECT password FROM users WHERE id = ?', u.id);
    if (!(await A.verifyPassword(b.current_password, row.password))) fail(400, 'Mot de passe actuel incorrect.');
    db.run('UPDATE users SET password = ? WHERE id = ?', await A.hashPassword(b.new_password), u.id);
  }
  db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', name, phone, u.id);
  return { user: { ...A.publicUser(u), name, phone } };
});
