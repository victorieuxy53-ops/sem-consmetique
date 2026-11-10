/**
 * Ajoute des données de démonstration (rendez-vous, commandes, inscriptions…)
 * pour visualiser le tableau de bord. À ne pas lancer sur le site en production.
 * Toutes les lignes créées portent la mention « démo » et peuvent être supprimées depuis l'admin.
 */
import * as db from '../server/db.js';
import { seedIfEmpty } from '../server/seed.js';
import { hashPassword } from '../server/auth.js';
import { uniqueRef } from '../server/util.js';

(async () => {
  await seedIfEmpty();
  const t = db.today();
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const names = ['Aminata B.', 'Chantal G.', 'Rosine A.', 'Fatou S.', 'Brigitte H.', 'Mireille D.', 'Esther K.', 'Prisca O.', 'Josiane T.', 'Laure M.'];
  const services = db.all('SELECT * FROM services');
  const products = db.all('SELECT * FROM products');
  const courses = db.all('SELECT * FROM courses');

  let demo = db.get("SELECT id FROM users WHERE email = 'cliente.demo@institut.local'");
  if (!demo) {
    const r = db.run("INSERT INTO users (name, email, phone, password) VALUES ('Cliente Démo', 'cliente.demo@institut.local', '01 00 00 00 00', ?)", await hashPassword('Demo@2026'));
    demo = { id: r.lastInsertRowid };
  }

  db.tx(() => {
    for (let i = -20; i <= 10; i++) {
      const n = i < 0 ? 1 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const s = pick(services);
        const date = db.addDays(t, i);
        const time = `${String(9 + Math.floor(Math.random() * 8)).padStart(2, '0')}:${pick(['00', '30'])}`;
        const status = i < 0 ? pick(['done', 'done', 'done', 'cancelled']) : pick(['pending', 'confirmed']);
        db.run(`INSERT INTO bookings (ref, service_id, name, phone, date, time, duration, price, status, notes, source)
                VALUES (?,?,?,?,?,?,?,?,?,?, 'demo')`, uniqueRef('bookings', 'RDV'), s.id, pick(names), '01 90 00 00 0' + k, date, time, s.duration, s.price, status, 'démo');
      }
    }
    for (let i = 0; i < 14; i++) {
      const lines = [pick(products), pick(products)];
      const subtotal = lines.reduce((a, p) => a + p.price, 0);
      const days = Math.floor(Math.random() * 28);
      const created = new Date(Date.now() - days * 864e5).toISOString().replace('T', ' ').slice(0, 19);
      const r = db.run(`INSERT INTO orders (ref, name, phone, delivery, payment, subtotal, total, status, created_at, notes)
                        VALUES (?,?,?,?,?,?,?,?,?, 'démo')`, uniqueRef('orders', 'CMD'), pick(names), '01 91 00 00 00', pick(['livraison', 'retrait']), pick(['cash', 'momo']), subtotal, subtotal,
        days < 2 ? 'pending' : pick(['delivered', 'delivered', 'shipped', 'confirmed']), created);
      for (const p of lines) db.run('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?,?,?,?,1)', r.lastInsertRowid, p.id, p.name, p.price);
    }
    const c = courses[0];
    if (c && !db.get('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?', demo.id, c.id))
      db.run("INSERT INTO enrollments (ref, course_id, user_id, amount, payment_method, payment_ref, status, activated_at) VALUES (?,?,?,?, 'MTN MoMo', 'DEMO123', 'active', datetime('now','-3 days'))", uniqueRef('enrollments', 'FOR'), c.id, demo.id, c.price);
    if (courses[1] && !db.get('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?', demo.id, courses[1].id))
      db.run("INSERT INTO enrollments (ref, course_id, user_id, amount, payment_method, payment_ref, payer_phone, status) VALUES (?,?,?,?, 'Moov Money', 'DEMO456', '01 00 00 00 00', 'pending')", uniqueRef('enrollments', 'FOR'), courses[1].id, demo.id, courses[1].price);
    db.run("INSERT INTO custom_orders (ref, type, details, budget, name, phone) VALUES (?, 'coffret', ?, '20 000 – 35 000 FCFA', 'Rosine A.', '01 92 00 00 00')",
      uniqueRef('custom_orders', 'SM'), JSON.stringify({ Occasion: 'Anniversaire', 'Produits souhaités': ['Sérum', 'Crème karité'], Message: 'Joyeux anniversaire maman ! (démo)' }));
    db.run("INSERT INTO messages (kind, name, phone, subject, message) VALUES ('rappel', 'Fatou S.', '01 93 00 00 00', 'Demande de rappel', 'Rappel souhaité dans l’après-midi (démo)')");
    db.run("INSERT INTO messages (kind, name, email, subject, message) VALUES ('contact', 'Laure M.', 'laure@example.com', 'Tarifs mariage', 'Bonjour, je souhaite un devis pour 5 attaches foulard le 20 décembre. (démo)')");
  });
  console.log('Données de démonstration ajoutées.');
  console.log('  Compte cliente démo : cliente.demo@institut.local / Demo@2026');
})();
