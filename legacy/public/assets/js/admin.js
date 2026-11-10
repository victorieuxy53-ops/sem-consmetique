/* Espace administrateur : connexion, navigation, tableau de bord, agenda, paramètres, notifications. */
import { $, $$, esc, api, state, emit, icon, money, num, fdur, fdate, fshort, fdatetime, cap, initials, STATUS, statusPill, modal, toast, confirmBox, busy, formData, telHref, waHref, localNow, DAYS } from './core.js';
import { logoMark, brandName } from './art.js';
import { revenueChart, hbars, formModal, bindImageFields, fieldHtml } from './admin-kit.js';
import { A, R, listView, contactBtns, bookingMsg } from './admin-res.js';

const NAV = [
  ['Pilotage', [['', 'Tableau de bord', 'chart'], ['agenda', 'Agenda', 'calendar', 'bookings'], ['r/bookings', 'Rendez-vous', 'list', 'bookings']]],
  ['Ventes', [['r/orders', 'Commandes', 'bag', 'orders'], ['r/custom_orders', 'Sur-mesure', 'gift', 'custom_orders'], ['r/promos', 'Codes promo', 'tag']]],
  ['Académie', [['r/enrollments', 'Paiements formations', 'wallet', 'enrollments'], ['r/courses', 'Formations', 'film'], ['r/lessons', 'Leçons vidéo', 'video']]],
  ['Ateliers', [['r/events', 'Ateliers', 'ticket'], ['r/registrations', 'Inscriptions', 'users', 'registrations']]],
  ['Catalogue', [['r/services', 'Prestations', 'sparkle'], ['r/products', 'Produits', 'store'], ['r/gallery', 'Galerie', 'image']]],
  ['Relation client', [['r/messages', 'Messages & rappels', 'chat', 'messages'], ['r/reviews', 'Avis', 'heart', 'reviews'], ['r/users', 'Clientes', 'user'], ['r/newsletter', 'Newsletter', 'mail']]],
  ['Contenu', [['r/posts', 'Conseils beauté', 'book'], ['settings', 'Paramètres', 'sliders']]],
];
const TITLES = { '': 'Tableau de bord', agenda: 'Agenda', settings: 'Paramètres du site' };
let counts = {}, cleanup = null;

/* ================================================================= CONNEXION */
function loginScreen(user) {
  document.body.innerHTML = `<div class="alog">
    <div class="alog__art"><span class="orb o1"></span><span class="orb o2"></span>
      <div class="alog__brand">${logoMark()}<h2>${brandName()}</h2><p>${esc(state.settings.tagline)}</p></div>
      <p class="alog__quote">« Votre institut, piloté du bout des doigts. »</p></div>
    <div class="alog__form">
      <form class="card stack" data-login>
        <span class="alog__ic">${icon('lock')}</span>
        <h1>Espace administration</h1>
        ${user ? `<p class="pill pill--warn">Connectée en tant que ${esc(user.email)} : ce compte n’a pas les droits d’administration.</p>` : '<p class="muted">Connectez-vous pour gérer rendez-vous, commandes, formations et contenus.</p>'}
        <label class="field"><input name="email" type="email" required placeholder=" " autocomplete="username"><span>E-mail</span></label>
        <label class="field"><input name="password" type="password" required placeholder=" " autocomplete="current-password"><span>Mot de passe</span></label>
        <button class="btn btn-primary btn-lg btn-block">Se connecter ${icon('arrow')}</button>
        <a href="/" class="link-arrow link-arrow--back center">${icon('arrowL')} Retour au site</a>
      </form>
    </div></div><div id="toasts"></div>`;
  $('[data-login]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    await busy(f.querySelector('button'), async () => {
      try {
        const { user: u } = await api('/api/auth/login', { method: 'POST', body: formData(f) });
        if (u.role !== 'admin') throw new Error('Ce compte n’a pas les droits d’administration.');
        location.reload();
      } catch (err) { toast(err.message, 'err'); }
    });
  });
}

/* ==================================================================== SHELL */
function shell() {
  const u = state.user;
  document.body.innerHTML = `<div class="adm">
    <aside class="adm__side">
      <a href="#/" class="adm__brand">${logoMark()}<span><strong>${esc(state.settings.site_name)}</strong><small>Administration</small></span></a>
      <nav class="adm__nav">${NAV.map(([g, items]) => `<div class="adm__group"><span>${g}</span>${items.map(([h, l, i, c]) => `<a href="#/${h}" data-route="${h}">${icon(i)}<em>${l}</em>${c ? `<b class="badge-n" data-count="${c}" hidden></b>` : ''}</a>`).join('')}</div>`).join('')}</nav>
      <div class="adm__me"><span class="avatar">${esc(initials(u.name))}</span><span><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></span><button class="icon-btn sm" data-logout title="Déconnexion">${icon('logout')}</button></div>
    </aside>
    <div class="adm__scrim"></div>
    <div class="adm__main">
      <header class="adm__top">
        <button class="icon-btn adm__burger" aria-label="Menu">${icon('menu')}</button>
        <h1 data-title></h1>
        <div class="adm__top-act">
          <button class="icon-btn adm__bell" data-bell title="Notifications">${icon('bell')}<b class="badge-n" data-total hidden></b></button>
          <a href="/" target="_blank" class="btn btn-ghost btn-sm">${icon('eye')} Voir le site</a>
        </div>
      </header>
      <main id="view" class="adm__view"></main>
    </div></div><div id="toasts"></div>`;
  $('.adm__burger').addEventListener('click', () => document.body.classList.toggle('side-open'));
  $('.adm__scrim').addEventListener('click', () => document.body.classList.remove('side-open'));
  $('[data-logout]').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {}); location.href = '/'; });
  $('[data-bell]').addEventListener('click', () => { location.hash = '#/'; });
}

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  document.body.classList.remove('side-open');
  $$('[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === path));
  try { cleanup?.(); } catch { /* ignore */ }
  cleanup = null;
  // Conteneur neuf à chaque vue : aucun écouteur d'une vue précédente ne survit.
  const old = $('#view');
  const view = old.cloneNode(false);
  old.replaceWith(view);
  view.classList.add('enter');
  const title = path.startsWith('r/') ? R[path.slice(2)]?.title : TITLES[path];
  $('[data-title]').textContent = title || 'Administration';
  document.title = `${title || 'Administration'} — ${state.settings.site_name}`;
  if (path === '' || path === 'dashboard') return dashboard(view);
  if (path === 'agenda') return agenda(view, query);
  if (path === 'settings') return settings(view);
  if (path.startsWith('r/')) return listView(view, path.slice(2), query);
  view.innerHTML = '<p>Page introuvable.</p>';
}

/* ======================================================= NOTIFICATIONS */
const LABELS = { bookings: 'nouveau rendez-vous', orders: 'nouvelle commande', custom_orders: 'nouvelle demande sur-mesure', enrollments: 'paiement de formation à valider', registrations: 'inscription à un atelier', messages: 'nouveau message', reviews: 'avis à modérer' };
let audio;
function ding() {
  try {
    audio ||= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, audio.currentTime); o.frequency.setValueAtTime(1320, audio.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.15, audio.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.45);
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.5);
  } catch { /* son indisponible */ }
}
async function refreshCounts(notify = false) {
  let c;
  try { c = await api('/api/admin/counts'); } catch { return; }
  if (notify) {
    for (const [k, n] of Object.entries(c)) if (n > (counts[k] || 0)) { toast(`🔔 ${n - (counts[k] || 0) > 1 ? (n - (counts[k] || 0)) + ' × ' : ''}${LABELS[k]}`, 'info', 7000); ding(); }
  }
  counts = c;
  $$('[data-count]').forEach((b) => { const n = c[b.dataset.count] || 0; b.textContent = n; b.hidden = !n; });
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const t = $('[data-total]');
  if (t) { t.textContent = total; t.hidden = !total; }
  document.title = document.title.replace(/^\(\d+\) /, '');
  if (total) document.title = `(${total}) ${document.title}`;
}

/* ===================================================== TABLEAU DE BORD */
async function dashboard(el) {
  el.innerHTML = '<div class="loading-row"></div><div class="loading-row"></div>';
  let d;
  try { d = await api('/api/admin/stats'); } catch (e) { el.innerHTML = `<p>${esc(e.message)}</p>`; return; }
  const total30 = d.series.reduce((a, x) => a + x.total, 0);
  const prev = d.series.slice(0, 15).reduce((a, x) => a + x.total, 0), last = d.series.slice(15).reduce((a, x) => a + x.total, 0);
  const trend = prev ? Math.round(((last - prev) / prev) * 100) : null;
  const h = localNow().getUTCHours();
  const pl = (n, one, many) => (n > 1 ? many : one);
  const todo = [
    ['r/bookings?status=pending', d.counts.bookings, 'rendez-vous à confirmer', 'calendar'],
    ['r/orders?status=pending', d.counts.orders, pl(d.counts.orders, 'commande à traiter', 'commandes à traiter'), 'bag'],
    ['r/enrollments?status=pending', d.counts.enrollments, pl(d.counts.enrollments, 'paiement de formation à vérifier', 'paiements de formation à vérifier'), 'wallet'],
    ['r/custom_orders?status=new', d.counts.custom_orders, pl(d.counts.custom_orders, 'demande sur-mesure (devis)', 'demandes sur-mesure (devis)'), 'gift'],
    ['r/messages', d.counts.messages, pl(d.counts.messages, 'message / rappel à traiter', 'messages / rappels à traiter'), 'phone'],
    ['r/registrations?status=pending', d.counts.registrations, pl(d.counts.registrations, 'inscription atelier', 'inscriptions ateliers'), 'ticket'],
    ['r/reviews', d.counts.reviews, 'avis à modérer', 'heart'],
  ].filter((x) => x[1]);
  el.innerHTML = `
    ${d.default_password ? `<a href="#/settings" class="alert-bar">${icon('alert')}<span><strong>Sécurité :</strong> vous utilisez encore le mot de passe par défaut. Changez-le maintenant dans Paramètres › Sécurité.</span>${icon('arrow')}</a>` : ''}
    <div class="dash-head"><div><h2>${h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'}, ${esc(state.user.name.split(' ')[0])} ✨</h2><p class="muted">${cap(fdate(d.today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p></div>
      <div class="row-wrap"><a class="btn btn-ghost btn-sm" href="#/agenda">${icon('calendar')} Agenda</a><button class="btn btn-primary btn-sm" data-quick-book>${icon('plus')} Rendez-vous téléphonique</button></div></div>
    <div class="kpis">
      <div class="kpi kpi--hero"><span>${icon('wallet')} Chiffre d’affaires du mois</span><strong>${money(d.kpi.month_revenue)}</strong><small>Boutique + formations + soins effectués</small></div>
      <a class="kpi" href="#/agenda"><span>${icon('calendar')} RDV aujourd’hui</span><strong>${num(d.kpi.today_bookings)}</strong><small>${num(d.kpi.upcoming_bookings)} à venir au total</small></a>
      <a class="kpi" href="#/r/orders"><span>${icon('bag')} Commandes du mois</span><strong>${num(d.kpi.orders_month)}</strong><small>${num(d.counts.orders)} en attente</small></a>
      <a class="kpi" href="#/r/users"><span>${icon('users')} Clientes inscrites</span><strong>${num(d.kpi.clients)}</strong><small>${num(d.kpi.students)} ${pl(d.kpi.students, 'élève', 'élèves')} · ${num(d.kpi.newsletter)} ${pl(d.kpi.newsletter, 'abonnée', 'abonnées')}</small></a>
    </div>
    <div class="dgrid">
      <section class="card dcard dcard--wide">
        <div class="dcard__head"><div><h3>Chiffre d’affaires — 30 derniers jours</h3><p class="muted small">Survolez une barre pour le détail par activité</p></div>
          <div class="dcard__num"><strong>${money(total30)}</strong>${trend !== null ? `<span class="trend ${trend >= 0 ? 'up' : 'down'}">${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)} % <small>vs 15 j précédents</small></span>` : ''}</div></div>
        <div data-chart class="chart-box"></div>
        <details class="tblview"><summary>Voir les données en tableau</summary><div class="tbl-scroll"><table class="mini"><thead><tr><th>Jour</th><th>Boutique</th><th>Formations</th><th>Soins</th><th>Ateliers</th><th>Total</th></tr></thead><tbody>${d.series.filter((x) => x.total).map((x) => `<tr><td>${fshort(x.date)}</td><td>${money(x.shop)}</td><td>${money(x.courses)}</td><td>${money(x.care)}</td><td>${money(x.events)}</td><td><strong>${money(x.total)}</strong></td></tr>`).join('') || '<tr><td colspan="6">Aucune vente sur la période.</td></tr>'}</tbody></table></div></details>
      </section>
      <section class="card dcard">
        <div class="dcard__head"><h3>À traiter</h3></div>
        ${todo.length ? `<ul class="todo">${todo.map(([h2, n, l, i]) => `<li><a href="#/${h2}"><span class="todo__ic">${icon(i)}</span><strong>${n}</strong><span>${l}</span>${icon('chevR')}</a></li>`).join('')}</ul>` : `<div class="empty">${icon('check')}<p>Tout est à jour, bravo !</p></div>`}
      </section>
      <section class="card dcard">
        <div class="dcard__head"><h3>Agenda du jour</h3><a href="#/agenda" class="link-arrow small">Semaine ${icon('arrow')}</a></div>
        ${d.agenda.length ? `<ul class="day-list">${d.agenda.map((b) => `<li class="st-${b.status}"><span class="day-list__t">${b.time.replace(':', 'h')}</span><span><strong>${esc(b.name)}</strong><small>${esc(b.service_name || '')} · ${fdur(b.duration)}</small></span>${statusPill('bookings', b.status)}<span class="acts">${contactBtns(b.phone, bookingMsg(b))}</span></li>`).join('')}</ul>` : `<div class="empty">${icon('calendar')}<p>Aucun rendez-vous aujourd’hui.</p></div>`}
      </section>
      <section class="card dcard">
        <div class="dcard__head"><h3>Prestations les plus demandées</h3><span class="muted small">90 jours</span></div>
        ${hbars(d.top_services)}
      </section>
      <section class="card dcard">
        <div class="dcard__head"><h3>Prochains ateliers</h3><a href="#/r/events" class="link-arrow small">Gérer ${icon('arrow')}</a></div>
        ${d.events.length ? `<ul class="ev-list">${d.events.map((e) => `<li><div><strong>${esc(e.title)}</strong><small>${cap(fdate(e.date))}</small></div><div class="fill"><span style="width:${Math.min(100, (e.taken / Math.max(1, e.seats)) * 100)}%"></span></div><small>${e.taken}/${e.seats}</small></li>`).join('')}</ul>` : '<p class="muted small">Aucun atelier programmé.</p>'}
      </section>
      <section class="card dcard">
        <div class="dcard__head"><h3>Stock faible</h3><a href="#/r/products" class="link-arrow small">Produits ${icon('arrow')}</a></div>
        ${d.low_stock.length ? `<ul class="ev-list">${d.low_stock.map((p) => `<li><strong>${esc(p.name)}</strong><span class="pill ${p.stock <= 0 ? 'pill--bad' : 'pill--warn'}">${p.stock <= 0 ? 'Épuisé' : p.stock + ' restant(s)'}</span></li>`).join('')}</ul>` : `<div class="empty">${icon('check')}<p>Stocks suffisants.</p></div>`}
      </section>
      <section class="card dcard">
        <div class="dcard__head"><h3>Dernières commandes</h3><a href="#/r/orders" class="link-arrow small">Tout voir ${icon('arrow')}</a></div>
        ${d.recent_orders.length ? `<ul class="ev-list">${d.recent_orders.map((o) => `<li><div><strong>${esc(o.name)}</strong><small>${esc(o.ref)} · ${fdatetime(o.created_at)}</small></div><strong>${money(o.total)}</strong>${statusPill('orders', o.status)}</li>`).join('')}</ul>` : '<p class="muted small">Aucune commande pour le moment.</p>'}
      </section>
    </div>`;
  cleanup = revenueChart($('[data-chart]', el), d.series);
  $('[data-quick-book]', el).addEventListener('click', () => newBooking({}, route));
}

function newBooking(data, done) {
  formModal({
    title: 'Nouveau rendez-vous', fields: R.bookings.form(), data: { status: 'confirmed', ...data },
    onSubmit: async (v) => { await api('/api/admin/r/bookings', { method: 'POST', body: v }); toast('Rendez-vous enregistré'); refreshCounts(); done?.(); },
  });
}

/* ================================================================= AGENDA */
async function agenda(el, query) {
  const todayStr = localNow().toISOString().slice(0, 10);
  const base = new Date((query.week || todayStr) + 'T12:00:00Z');
  const monday = new Date(base); monday.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => { const x = new Date(monday); x.setUTCDate(monday.getUTCDate() + i); return x.toISOString().slice(0, 10); });
  const shift = (n) => { const x = new Date(monday); x.setUTCDate(x.getUTCDate() + n * 7); return x.toISOString().slice(0, 10); };
  const hours = state.settings.hours || {};
  const opens = Object.values(hours).filter(Boolean);
  const H0 = Math.min(8, ...opens.map((h) => +h[0].split(':')[0])), H1 = Math.max(19, ...opens.map((h) => Math.ceil(+h[1].replace(':', '.'))));
  const PX = 1.3; // pixels par minute
  el.innerHTML = `<div class="ag-head">
      <div class="row-wrap"><a class="icon-btn" href="#/agenda?week=${shift(-1)}" aria-label="Semaine précédente">${icon('chevL')}</a><a class="btn btn-ghost btn-sm" href="#/agenda">Aujourd’hui</a><a class="icon-btn" href="#/agenda?week=${shift(1)}" aria-label="Semaine suivante">${icon('chevR')}</a>
      <h2>${cap(fdate(days[0], { day: 'numeric', month: 'long' }))} – ${fdate(days[6], { day: 'numeric', month: 'long', year: 'numeric' })}</h2></div>
      <div class="row-wrap"><a class="btn btn-ghost btn-sm" href="#/r/bookings">${icon('list')} Vue liste</a><button class="btn btn-primary btn-sm" data-new>${icon('plus')} Nouveau rendez-vous</button></div></div>
    <div class="ag-legend">${Object.entries(STATUS.bookings).map(([k, [l]]) => `<span class="st-${k}"><i></i>${l}</span>`).join('')}</div>
    <div class="ag card"><div class="ag__grid" style="--h:${(H1 - H0) * 60 * PX}px">
      <div class="ag__hours"><div class="ag__corner"></div>${Array.from({ length: H1 - H0 }, (_, i) => `<span style="top:${i * 60 * PX}px">${String(H0 + i).padStart(2, '0')}h</span>`).join('')}</div>
      ${days.map((dd) => { const wd = new Date(dd + 'T12:00:00Z').getUTCDay(); const closed = !hours[wd] || (state.settings.closed_dates || []).includes(dd); return `<div class="ag__day ${dd === todayStr ? 'today' : ''} ${closed ? 'closed' : ''}" data-day="${dd}">
        <div class="ag__dh"><small>${DAYS[wd].slice(0, 3)}</small><strong>${+dd.slice(8)}</strong><b data-n></b></div>
        <div class="ag__col">${Array.from({ length: H1 - H0 }, (_, i) => `<i style="top:${i * 60 * PX}px"></i>`).join('')}${closed ? '<span class="ag__closed">Fermé</span>' : ''}</div></div>`; }).join('')}
    </div></div>`;
  const rows = await api(`/api/admin/r/bookings?from=${days[0]}&to=${days[6]}`).catch(() => []);
  for (const dd of days) {
    const list = rows.filter((b) => b.date === dd && b.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
    const col = $(`[data-day="${dd}"] .ag__col`, el);
    $(`[data-day="${dd}"] [data-n]`, el).textContent = list.length ? `${list.length} RDV` : '';
    const lanes = [];
    const toM = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
    const placed = list.map((b) => {
      const s = toM(b.time), e = s + (b.duration || 60);
      let lane = lanes.findIndex((end) => end <= s);
      if (lane < 0) { lane = lanes.length; lanes.push(e); } else lanes[lane] = e;
      return { b, s, e, lane };
    });
    const n = Math.max(1, lanes.length);
    col.insertAdjacentHTML('beforeend', placed.map(({ b, s, e, lane }, i) => `<button class="ag__ev st-${b.status}" data-id="${b.id}" style="top:${(s - H0 * 60) * PX}px;height:${Math.max(28, (e - s) * PX - 3)}px;left:calc(${(lane / n) * 100}% + 3px);width:calc(${100 / n}% - 6px);--i:${i}">
      <strong>${b.time.replace(':', 'h')} · ${esc(b.name)}</strong><small>${esc(b.service_name || '')}</small></button>`).join(''));
    if (dd === todayStr) {
      const now = localNow(), m = now.getUTCHours() * 60 + now.getUTCMinutes();
      if (m >= H0 * 60 && m <= H1 * 60) col.insertAdjacentHTML('beforeend', `<span class="ag__now" style="top:${(m - H0 * 60) * PX}px"></span>`);
    }
  }
  $('[data-new]', el).addEventListener('click', () => newBooking({}, route));
  el.addEventListener('click', (e) => {
    const ev = e.target.closest('.ag__ev');
    if (ev) return bookingModal(rows.find((r) => r.id === +ev.dataset.id), route);
    const col = e.target.closest('.ag__col');
    if (col && !e.target.closest('.ag__ev')) {
      const y = e.clientY - col.getBoundingClientRect().top;
      const m = Math.floor((y / PX) / 30) * 30 + H0 * 60;
      newBooking({ date: col.parentElement.dataset.day, time: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }, route);
    }
  });
}

function bookingModal(b, done) {
  const m = modal({
    title: `${b.name} — ${b.ref}`, size: 'modal--md',
    html: `<div class="kv"><div><span>Prestation</span><strong>${esc(b.service_name || '—')}</strong></div><div><span>Date</span><strong>${cap(fdate(b.date))} à ${b.time.replace(':', 'h')}</strong></div>
      <div><span>Durée</span><strong>${fdur(b.duration)}</strong></div><div><span>Montant</span><strong>${money(b.price)}</strong></div>
      <div><span>Téléphone</span><strong>${esc(b.phone || '—')}</strong></div><div><span>E-mail</span><strong>${esc(b.email || '—')}</strong></div>
      ${b.notes ? `<div class="full"><span>Notes</span><strong class="pre">${esc(b.notes)}</strong></div>` : ''}</div>
      <p class="small muted mt">Changer le statut :</p>
      <div class="st-btns">${Object.entries(STATUS.bookings).map(([k, [l, c]]) => `<button class="st-btn ${k === b.status ? 'on' : ''} pill--${c}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="row-wrap mt"><a class="btn btn-gold btn-sm" target="_blank" rel="noopener" href="${waHref(b.phone, bookingMsg(b))}">${icon('whatsapp')} Confirmer sur WhatsApp</a><a class="btn btn-ghost btn-sm" href="${telHref(b.phone)}">${icon('phone')} Appeler</a>
        <button class="btn btn-ghost btn-sm" data-edit>${icon('edit')} Modifier</button><button class="btn btn-ghost btn-sm danger" data-del>${icon('trash')} Supprimer</button></div>`,
  });
  m.body.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-st]');
    try {
      if (s) { await api(`/api/admin/r/bookings/${b.id}`, { method: 'PUT', body: { status: s.dataset.st } }); toast(`Statut : ${STATUS.bookings[s.dataset.st][0]}`); m.close(); refreshCounts(); done(); }
      if (e.target.closest('[data-edit]')) { m.close(); formModal({ title: 'Modifier le rendez-vous', fields: R.bookings.form(), data: b, onSubmit: async (v) => { await api(`/api/admin/r/bookings/${b.id}`, { method: 'PUT', body: v }); toast('Enregistré'); done(); } }); }
      if (e.target.closest('[data-del]') && await confirmBox('Supprimer ce rendez-vous ?', { ok: 'Supprimer', danger: true })) { await api(`/api/admin/r/bookings/${b.id}`, { method: 'DELETE' }); toast('Supprimé'); m.close(); refreshCounts(); done(); }
    } catch (err) { toast(err.message, 'err'); }
  });
}

/* ============================================================== PARAMÈTRES */
async function settings(el) {
  const s = await api('/api/admin/settings');
  const F = (k, l, t = 'text', extra = {}) => fieldHtml({ k, l, t, ...extra }, s[k]);
  el.innerHTML = `<form class="settings" data-settings>
    <nav class="settings__nav">${[['id', 'Identité & textes', 'sparkle'], ['ct', 'Contact & réseaux', 'phone'], ['hr', 'Horaires', 'clock'], ['bk', 'Réservations', 'calendar'], ['py', 'Paiement & livraison', 'wallet'], ['st', 'Chiffres clés', 'chart'], ['sec', 'Sécurité', 'lock']].map(([k, l, i], n) => `<a href="#s-${k}" class="${n ? '' : 'active'}" data-sec="${k}">${icon(i)} ${l}</a>`).join('')}</nav>
    <div class="settings__body">
      <section class="card" id="s-id"><h3>${icon('sparkle')} Identité & textes</h3><div class="aform__grid">
        ${F('site_name', 'Nom de l’institut', 'text', { req: 1 })}${F('tagline', 'Activité (sous le logo)')}
        ${F('hero_title', 'Grand titre de l’accueil', 'text', { full: 1, help: 'Entourez un mot d’astérisques pour l’écrire en italique doré : Révélez votre *éclat* naturel' })}
        ${F('hero_sub', 'Texte d’accueil', 'textarea', { full: 1, rows: 3 })}
        ${F('about_story', 'Notre histoire (page À propos)', 'textarea', { full: 1, rows: 7, help: 'Laissez une ligne vide entre les paragraphes.' })}
        ${F('hero_image', 'Photo de l’accueil (facultatif)', 'image', { help: 'Format portrait conseillé. Sans photo, une composition animée est affichée.' })}
        ${F('about_image', 'Photo de la page À propos', 'image', { help: 'Format portrait conseillé (ex. 900 × 1100 px).' })}
      </div></section>
      <section class="card" id="s-ct"><h3>${icon('phone')} Contact & réseaux</h3>
        <div class="list-edit" data-phones><label class="fl">Numéros de téléphone (appel direct)</label>${(s.phones || []).map((p) => `<div class="le-row"><input class="inp" value="${esc(p)}" placeholder="01 00 00 00 00"><button type="button" class="icon-btn sm danger" data-rm>${icon('trash')}</button></div>`).join('')}<button type="button" class="btn btn-ghost btn-xs" data-add-phone>${icon('plus')} Ajouter un numéro</button></div>
        <div class="aform__grid mt">${F('whatsapp', 'Numéro WhatsApp')}${F('country_code', 'Indicatif pays', 'text', { help: 'Bénin : 229' })}${F('email', 'E-mail', 'email')}${F('city', 'Ville / pays')}
        ${F('address', 'Adresse (quartier, repère)', 'text', { full: 1 })}
        ${F('map_embed', 'Carte Google Maps', 'textarea', { full: 1, rows: 2, help: 'Google Maps › Partager › Intégrer une carte › copiez le code <iframe> ici.' })}
        ${F('facebook', 'Lien Facebook', 'url')}${F('instagram', 'Lien Instagram', 'url')}${F('tiktok', 'Lien TikTok', 'url')}</div></section>
      <section class="card" id="s-hr"><h3>${icon('clock')} Horaires d’ouverture</h3><p class="muted small">Utilisés pour l’affichage « ouvert / fermé » et le calcul des créneaux de réservation.</p>
        <div class="hours-edit">${[1, 2, 3, 4, 5, 6, 0].map((d) => { const h = s.hours?.[d]; return `<div class="he-row" data-d="${d}"><label class="switch"><input type="checkbox" ${h ? 'checked' : ''} data-open><span class="switch__ui"></span><span>${DAYS[d]}</span></label><input type="time" class="inp" data-from value="${h ? h[0] : '09:00'}" ${h ? '' : 'disabled'}><span>à</span><input type="time" class="inp" data-to value="${h ? h[1] : '18:00'}" ${h ? '' : 'disabled'}></div>`; }).join('')}</div>
        <div class="aform__grid mt">${F('tz_offset', 'Fuseau horaire (décalage UTC)', 'number', { help: 'Bénin : 1' })}</div></section>
      <section class="card" id="s-bk"><h3>${icon('calendar')} Réservations en ligne</h3><div class="aform__grid">
        ${F('capacity', 'Clientes en même temps', 'number', { help: 'Nombre de postes / esthéticiennes disponibles simultanément' })}
        ${fieldHtml({ k: 'slot_interval', l: 'Intervalle des créneaux', t: 'select', opts: [[15, '15 minutes'], [20, '20 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '1 heure']] }, s.slot_interval)}
        ${F('min_advance', 'Délai minimum avant un RDV (minutes)', 'number')}${F('max_days', 'Réservation possible jusqu’à (jours)', 'number')}</div>
        <div class="list-edit mt" data-closed><label class="fl">Jours de fermeture exceptionnelle (congés, jours fériés)</label><div class="chips" data-closed-list>${(s.closed_dates || []).sort().map((d) => `<span class="chip" data-date="${d}">${fshort(d)} <button type="button" data-rm-date aria-label="Retirer">${icon('x')}</button></span>`).join('')}</div>
          <div class="le-row"><input type="date" class="inp" data-new-date><button type="button" class="btn btn-ghost btn-xs" data-add-date>${icon('plus')} Ajouter</button></div></div></section>
      <section class="card" id="s-py"><h3>${icon('wallet')} Paiement & livraison</h3>
        <div class="list-edit" data-momo><label class="fl">Comptes Mobile Money (affichés pour les paiements)</label>${(s.momo || []).map((m) => momoRow(m)).join('')}<button type="button" class="btn btn-ghost btn-xs" data-add-momo>${icon('plus')} Ajouter un compte</button></div>
        <div class="aform__grid mt">${F('payment_note', 'Instructions de paiement', 'textarea', { full: 1, rows: 2 })}${F('delivery_fee', 'Frais de livraison (FCFA)', 'number')}${F('free_delivery_from', 'Livraison offerte dès (FCFA)', 'number', { help: '0 = jamais offerte' })}</div></section>
      <section class="card" id="s-st"><h3>${icon('chart')} Chiffres clés affichés sur le site</h3><div class="aform__grid">
        <label class="field"><input type="number" data-stat="years" value="${s.stats?.years ?? ''}" placeholder=" "><span>Années d’expérience</span></label>
        <label class="field"><input type="number" data-stat="clients" value="${s.stats?.clients ?? ''}" placeholder=" "><span>Clientes accompagnées</span></label>
        <label class="field"><input type="number" step="0.1" data-stat="rating" value="${s.stats?.rating ?? ''}" placeholder=" "><span>Note moyenne (sur 5)</span></label></div></section>
      <div class="settings__save"><button class="btn btn-primary btn-lg">${icon('check')} Enregistrer les paramètres</button></div>
    </div></form>
    <section class="card settings__sec" id="s-sec"><h3>${icon('lock')} Sécurité du compte</h3>
      <form class="aform" data-pw><div class="aform__grid">
        <label class="field"><input type="password" name="current" required placeholder=" " autocomplete="current-password"><span>Mot de passe actuel</span></label>
        <label class="field"><input type="password" name="next" required minlength="10" placeholder=" " autocomplete="new-password"><span>Nouveau mot de passe (10 caractères min.)</span></label>
        <label class="field full"><input type="email" name="email" placeholder=" " value="${esc(state.user.email)}"><span>E-mail de connexion</span></label></div>
        <div class="row-end"><button class="btn btn-primary">${icon('lock')} Mettre à jour</button></div></form></section>`;
  const form = $('[data-settings]', el);
  bindImageFields(form);
  $$('[data-sec]', el).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); $$('[data-sec]', el).forEach((x) => x.classList.toggle('active', x === a)); $('#s-' + a.dataset.sec, el).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  form.addEventListener('change', (e) => {
    if (e.target.matches('[data-open]')) { const row = e.target.closest('.he-row'); $$('input[type=time]', row).forEach((i) => { i.disabled = !e.target.checked; }); }
  });
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-rm]')) e.target.closest('.le-row').remove();
    if (e.target.closest('[data-add-phone]')) e.target.closest('[data-add-phone]').insertAdjacentHTML('beforebegin', `<div class="le-row"><input class="inp" placeholder="01 00 00 00 00"><button type="button" class="icon-btn sm danger" data-rm>${icon('trash')}</button></div>`);
    if (e.target.closest('[data-add-momo]')) e.target.closest('[data-add-momo]').insertAdjacentHTML('beforebegin', momoRow({}));
    if (e.target.closest('[data-rm-date]')) e.target.closest('[data-date]').remove();
    if (e.target.closest('[data-add-date]')) {
      const v = $('[data-new-date]', form).value;
      if (v && !$(`[data-date="${v}"]`, form)) $('[data-closed-list]', form).insertAdjacentHTML('beforeend', `<span class="chip" data-date="${v}">${fshort(v)} <button type="button" data-rm-date aria-label="Retirer">${icon('x')}</button></span>`);
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (k) => form.elements[k]?.value ?? '';
    const hoursOut = {};
    $$('.he-row', form).forEach((r) => { hoursOut[r.dataset.d] = $('[data-open]', r).checked ? [$('[data-from]', r).value, $('[data-to]', r).value] : null; });
    const body = {
      site_name: v('site_name'), tagline: v('tagline'), hero_title: v('hero_title'), hero_sub: v('hero_sub'), about_story: v('about_story'), hero_image: v('hero_image'), about_image: v('about_image'),
      phones: $$('[data-phones] .le-row input', form).map((i) => i.value.trim()).filter(Boolean),
      whatsapp: v('whatsapp'), country_code: v('country_code'), email: v('email'), city: v('city'), address: v('address'), map_embed: v('map_embed'),
      facebook: v('facebook'), instagram: v('instagram'), tiktok: v('tiktok'), hours: hoursOut, tz_offset: +v('tz_offset') || 0,
      capacity: Math.max(1, +v('capacity') || 1), slot_interval: +v('slot_interval') || 30, min_advance: +v('min_advance') || 0, max_days: +v('max_days') || 60,
      closed_dates: $$('[data-closed-list] [data-date]', form).map((c) => c.dataset.date),
      momo: $$('[data-momo] .le-row', form).map((r) => ({ network: $('[data-n]', r).value.trim(), number: $('[data-num]', r).value.trim(), name: $('[data-name]', r).value.trim() })).filter((m) => m.number),
      payment_note: v('payment_note'), delivery_fee: +v('delivery_fee') || 0, free_delivery_from: +v('free_delivery_from') || 0,
      stats: Object.fromEntries($$('[data-stat]', el).map((i) => [i.dataset.stat, +i.value || 0])),
    };
    await busy(form.querySelector('.settings__save .btn'), async () => {
      try { state.settings = await api('/api/admin/settings', { method: 'PUT', body }); toast('Paramètres enregistrés — le site est à jour'); }
      catch (err) { toast(err.message, 'err'); }
    });
  });
  $('[data-pw]', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    await busy(f.querySelector('button'), async () => {
      try { await api('/api/admin/password', { method: 'POST', body: formData(f) }); toast('Identifiants mis à jour. Les autres appareils ont été déconnectés.'); f.current.value = f.next.value = ''; }
      catch (err) { toast(err.message, 'err'); }
    });
  });
}
const momoRow = (m) => `<div class="le-row le-row--3"><input class="inp" data-n placeholder="Réseau (MTN MoMo…)" value="${esc(m.network || '')}"><input class="inp" data-num placeholder="Numéro" value="${esc(m.number || '')}"><input class="inp" data-name placeholder="Nom du titulaire" value="${esc(m.name || '')}"><button type="button" class="icon-btn sm danger" data-rm>${icon('trash')}</button></div>`;

/* ================================================================ DÉMARRAGE */
(async function boot() {
  let b;
  try { b = await api('/api/bootstrap'); }
  catch (e) { document.body.innerHTML = `<p style="padding:40px">${esc(e.message)}</p>`; return; }
  state.settings = b.settings; state.user = b.user;
  if (!b.user || b.user.role !== 'admin') return loginScreen(b.user);
  shell();
  try { A.opts = await api('/api/admin/options'); } catch { /* listes vides */ }
  A.onChange = async () => { refreshCounts(); try { A.opts = await api('/api/admin/options'); } catch { /* ignore */ } };
  addEventListener('hashchange', route);
  route();
  await refreshCounts();
  setInterval(() => refreshCounts(true), 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCounts(true); });
})();
