'use client';
/* Espace administrateur : connexion, navigation, notifications, tableau de bord, agenda, paramètres. */
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, cap, cx, DAYS, WEEK, fdate, fdatetime, fdur, fshort, hm, initials, localNow, money, num, openModal, pct, settings, STATUS, telHref, todayStr, toast, useStore, waHref } from '@/lib/core';
import { BrandName, Btn, confirmBox, Icon, Input, LogoMark, Pill, useApp, useSubmit } from '../ui';
import { A, adm, changed, Contact, Field, formModal, HBars, loadOpts, refreshCounts, RevenueChart } from './kit';
import { bookingMsg, R } from './resources';

const NAV = [
  ['Pilotage', [['', 'Tableau de bord', 'chart'], ['/agenda', 'Agenda', 'calendar', 'bookings'], ['/r/bookings', 'Rendez-vous', 'list', 'bookings']]],
  ['Ventes', [['/r/orders', 'Commandes', 'bag', 'orders'], ['/r/custom_orders', 'Sur-mesure', 'gift', 'custom_orders'], ['/r/promos', 'Codes promo', 'tag']]],
  ['Académie', [['/r/enrollments', 'Paiements formations', 'wallet', 'enrollments'], ['/r/courses', 'Formations', 'film'], ['/r/lessons', 'Leçons vidéo', 'video']]],
  ['Ateliers', [['/r/events', 'Ateliers', 'ticket'], ['/r/registrations', 'Inscriptions', 'users', 'registrations']]],
  ['Catalogue', [['/r/services', 'Prestations', 'leaf'], ['/r/products', 'Produits', 'store'], ['/r/gallery', 'Galerie', 'image']]],
  ['Relation client', [['/r/messages', 'Messages & rappels', 'chat', 'messages'], ['/r/reviews', 'Avis', 'heart', 'reviews'], ['/r/users', 'Clientes', 'user'], ['/r/newsletter', 'Newsletter', 'mail']]],
  ['Contenu', [['/r/posts', 'Conseils beauté', 'book'], ['/settings', 'Paramètres', 'sliders']]],
];
const LABELS = { bookings: 'nouveau rendez-vous', orders: 'nouvelle commande', custom_orders: 'nouvelle demande sur-mesure', enrollments: 'paiement de formation à valider', registrations: 'inscription à un atelier', messages: 'nouveau message', reviews: 'avis à modérer' };
const pl = (n, one, many) => (n > 1 ? many : one);

/* ================================================================= CONNEXION */
export function AdminLogin({ user }) {
  const router = useRouter();
  const [submit, busy] = useSubmit(async (d) => {
    const { user: u } = await api('/api/auth/login', { method: 'POST', body: d });
    if (u.role !== 'admin') throw new Error('Ce compte n’a pas les droits d’administration.');
    router.refresh();
  });
  return (
    <div className="alog">
      <div className="alog__art">
        <div className="alog__brand"><LogoMark /><h2><BrandName /></h2><p>{settings().tagline}</p></div>
        <p className="alog__quote">« Votre maison de beauté, pilotée du bout des doigts. »</p></div>
      <div className="alog__form">
        <form className="card stack" onSubmit={submit}>
          <span className="alog__ic"><Icon n="lock" /></span>
          <h1>Espace administration</h1>
          {user ? <p className="pill pill--warn">Connectée en tant que {user.email} : ce compte n’a pas les droits d’administration.</p> : <p className="muted">Connectez-vous pour gérer rendez-vous, commandes, formations et contenus.</p>}
          <Input label="E-mail" name="email" type="email" required autoComplete="username" />
          <Input label="Mot de passe" name="password" type="password" required autoComplete="current-password" />
          <Btn busy={busy} className="btn btn-primary btn-lg btn-block">Se connecter <Icon n="arrow" /></Btn>
          <a href="/" className="link-arrow link-arrow--back center"><Icon n="arrowL" /> Retour au site</a>
        </form>
      </div>
    </div>
  );
}

/* ==================================================================== SHELL */
let audio;
function ding() {
  try {
    audio ||= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1320, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(audio.destination); o.start(); o.stop(t + 0.5);
  } catch { /* son indisponible */ }
}

export function AdminShell({ children }) {
  const { user: u } = useApp();
  const path = usePathname().replace(/^\/admin/, '');
  const { counts } = useStore(adm);
  const [side, setSide] = useState(false);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const title = path.startsWith('/r/') ? R[path.slice(3)]?.title : { '': 'Tableau de bord', '/agenda': 'Agenda', '/settings': 'Paramètres du site' }[path];

  useEffect(() => {
    let prev = null;
    const poll = async (notify) => {
      const c = await refreshCounts();
      if (c && notify && prev) for (const [k, n] of Object.entries(c)) if (n > (prev[k] || 0)) { toast(`Nouveau : ${n - (prev[k] || 0) > 1 ? n - (prev[k] || 0) + ' × ' : ''}${LABELS[k]}`, 'info', 7000); ding(); }
      if (c) prev = c;
    };
    poll(false); loadOpts();
    const t = setInterval(() => poll(true), 30000);
    const vis = () => !document.hidden && poll(true);
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, []);
  useEffect(() => { document.title = `${total ? `(${total}) ` : ''}${title || 'Administration'} | ${settings().site_name}`; }, [title, total]);
  useEffect(() => { document.body.classList.toggle('side-open', side); }, [side]);
  useEffect(() => setSide(false), [path]);
  const logout = async () => { await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {}); location.href = '/'; };

  return (
    <div className="adm">
      <aside className="adm__side">
        <A href="" className="adm__brand"><LogoMark /><span><strong>{settings().site_name}</strong><small>Administration</small></span></A>
        <nav className="adm__nav">{NAV.map(([g, items]) => (
          <div className="adm__group" key={g}><span>{g}</span>{items.map(([h, l, i, c]) => (
            <A key={h} href={h} className={path === h ? 'active' : undefined}><Icon n={i} /><em>{l}</em>{c && <b className="badge-n" hidden={!counts[c]}>{counts[c]}</b>}</A>))}</div>))}</nav>
        <div className="adm__me"><span className="avatar">{initials(u.name)}</span><span><strong>{u.name}</strong><small>{u.email}</small></span><button className="icon-btn sm" onClick={logout} title="Déconnexion"><Icon n="logout" /></button></div>
      </aside>
      <div className="adm__scrim" onClick={() => setSide(false)} />
      <div className="adm__main">
        <header className="adm__top">
          <button className="icon-btn adm__burger" aria-label="Menu" onClick={() => setSide(!side)}><Icon n="menu" /></button>
          <h1>{title || 'Administration'}</h1>
          <div className="adm__top-act">
            <A href="" className="icon-btn adm__bell" title="Notifications"><Icon n="bell" /><b className="badge-n" hidden={!total}>{total}</b></A>
            <a href="/" target="_blank" className="btn btn-ghost btn-sm"><Icon n="eye" /> Voir le site</a>
          </div>
        </header>
        <main className="adm__view enter" key={path}>{children}</main>
      </div>
    </div>
  );
}

const newBooking = (data, done) => formModal({
  title: 'Nouveau rendez-vous', fields: R.bookings.form(), data: { status: 'confirmed', ...data },
  onSubmit: async (v) => { await api('/api/admin/r/bookings', { method: 'POST', body: v }); toast('Rendez-vous enregistré'); changed(); done?.(); },
});
const Loading = () => <><div className="loading-row" /><div className="loading-row" /></>;
const Nothing = ({ icon, text }) => <div className="empty"><Icon n={icon} /><p>{text}</p></div>;

/* ===================================================== TABLEAU DE BORD */
export function Dashboard() {
  const { user } = useApp();
  const [d, setD] = useState(null), [err, setErr] = useState(null), [n, setN] = useState(0);
  useEffect(() => { api('/api/admin/stats').then(setD, (e) => setErr(e.message)); }, [n]);
  if (err) return <p>{err}</p>;
  if (!d) return <Loading />;
  const total30 = d.series.reduce((a, x) => a + x.total, 0);
  const prev = d.series.slice(0, 15).reduce((a, x) => a + x.total, 0), last = d.series.slice(15).reduce((a, x) => a + x.total, 0);
  const trend = prev ? Math.round(((last - prev) / prev) * 100) : null;
  const h = localNow().getUTCHours(), c = d.counts;
  const todo = [
    ['/r/bookings?status=pending', c.bookings, 'rendez-vous à confirmer', 'calendar'],
    ['/r/orders?status=pending', c.orders, pl(c.orders, 'commande à traiter', 'commandes à traiter'), 'bag'],
    ['/r/enrollments?status=pending', c.enrollments, pl(c.enrollments, 'paiement de formation à vérifier', 'paiements de formation à vérifier'), 'wallet'],
    ['/r/custom_orders?status=new', c.custom_orders, pl(c.custom_orders, 'demande sur-mesure (devis)', 'demandes sur-mesure (devis)'), 'gift'],
    ['/r/messages', c.messages, pl(c.messages, 'message / rappel à traiter', 'messages / rappels à traiter'), 'phone'],
    ['/r/registrations?status=pending', c.registrations, pl(c.registrations, 'inscription atelier', 'inscriptions ateliers'), 'ticket'],
    ['/r/reviews', c.reviews, 'avis à modérer', 'heart'],
  ].filter((x) => x[1]);
  const Card = ({ title, link, side, wide, children }) => <section className={cx('card dcard', wide && 'dcard--wide')}><div className="dcard__head">{typeof title === 'string' ? <h3>{title}</h3> : title}{link && <A href={link[0]} className="link-arrow small">{link[1]} <Icon n="arrow" /></A>}{side}</div>{children}</section>;
  return <>
    {d.default_password && <A href="/settings" className="alert-bar"><Icon n="alert" /><span><strong>Sécurité :</strong> vous utilisez encore le mot de passe par défaut. Changez-le maintenant dans Paramètres › Sécurité.</span><Icon n="arrow" /></A>}
    <div className="dash-head"><div><h2>{h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'}, {user.name.split(' ')[0]}</h2><p className="muted">{cap(fdate(d.today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p></div>
      <div className="row-wrap"><A className="btn btn-ghost btn-sm" href="/agenda"><Icon n="calendar" /> Agenda</A><button className="btn btn-primary btn-sm" onClick={() => newBooking({}, () => setN(n + 1))}><Icon n="plus" /> Rendez-vous téléphonique</button></div></div>
    <div className="kpis">
      <div className="kpi kpi--hero"><span><Icon n="wallet" /> Chiffre d’affaires du mois</span><strong>{money(d.kpi.month_revenue)}</strong><small>Boutique + formations + soins effectués</small></div>
      <A className="kpi" href="/agenda"><span><Icon n="calendar" /> RDV aujourd’hui</span><strong>{num(d.kpi.today_bookings)}</strong><small>{num(d.kpi.upcoming_bookings)} à venir au total</small></A>
      <A className="kpi" href="/r/orders"><span><Icon n="bag" /> Commandes du mois</span><strong>{num(d.kpi.orders_month)}</strong><small>{num(c.orders)} en attente</small></A>
      <A className="kpi" href="/r/users"><span><Icon n="users" /> Clientes inscrites</span><strong>{num(d.kpi.clients)}</strong><small>{num(d.kpi.students)} {pl(d.kpi.students, 'élève', 'élèves')} · {num(d.kpi.newsletter)} {pl(d.kpi.newsletter, 'abonnée', 'abonnées')}</small></A>
    </div>
    <div className="dgrid">
      <Card wide title={<div><h3>Chiffre d’affaires des 30 derniers jours</h3><p className="muted small">Survolez une barre pour le détail par activité</p></div>}
        side={<div className="dcard__num"><strong>{money(total30)}</strong>{trend !== null && <span className={cx('trend', trend >= 0 ? 'up' : 'down')}>{trend >= 0 ? '+' : '-'}{Math.abs(trend)} % <small>vs 15 j précédents</small></span>}</div>}>
        <RevenueChart series={d.series} />
        <details className="tblview"><summary>Voir les données en tableau</summary><div className="tbl-scroll"><table className="mini"><thead><tr><th>Jour</th><th>Boutique</th><th>Formations</th><th>Soins</th><th>Ateliers</th><th>Total</th></tr></thead>
          <tbody>{d.series.some((x) => x.total) ? d.series.filter((x) => x.total).map((x) => <tr key={x.date}><td>{fshort(x.date)}</td><td>{money(x.shop)}</td><td>{money(x.courses)}</td><td>{money(x.care)}</td><td>{money(x.events)}</td><td><strong>{money(x.total)}</strong></td></tr>) : <tr><td colSpan={6}>Aucune vente sur la période.</td></tr>}</tbody></table></div></details>
      </Card>
      <Card title="À traiter">{todo.length ? <ul className="todo">{todo.map(([href, k, l, i]) => <li key={href}><A href={href}><span className="todo__ic"><Icon n={i} /></span><strong>{k}</strong><span>{l}</span><Icon n="chevR" /></A></li>)}</ul> : <Nothing icon="check" text="Tout est à jour, bravo !" />}</Card>
      <Card title="Agenda du jour" link={['/agenda', 'Semaine']}>{d.agenda.length ? <ul className="day-list">{d.agenda.map((b) => (
        <li key={b.id} className={`st-${b.status}`}><span className="day-list__t">{hm(b.time)}</span><span><strong>{b.name}</strong><small>{b.service_name} · {fdur(b.duration)}</small></span><Pill kind="bookings" s={b.status} /><span className="acts"><Contact phone={b.phone} msg={bookingMsg(b)} /></span></li>))}</ul>
        : <Nothing icon="calendar" text="Aucun rendez-vous aujourd’hui." />}</Card>
      <Card title="Prestations les plus demandées" side={<span className="muted small">90 jours</span>}><HBars items={d.top_services} /></Card>
      <Card title="Prochains ateliers" link={['/r/events', 'Gérer']}>{d.events.length ? <ul className="ev-list">{d.events.map((e) => <li key={e.id}><div><strong>{e.title}</strong><small>{cap(fdate(e.date))}</small></div><div className="fill"><span style={{ width: pct(e.taken, e.seats) + '%' }} /></div><small>{e.taken}/{e.seats}</small></li>)}</ul> : <p className="muted small">Aucun atelier programmé.</p>}</Card>
      <Card title="Stock faible" link={['/r/products', 'Produits']}>{d.low_stock.length ? <ul className="ev-list">{d.low_stock.map((p) => <li key={p.id}><strong>{p.name}</strong><span className={cx('pill', p.stock <= 0 ? 'pill--bad' : 'pill--warn')}>{p.stock <= 0 ? 'Épuisé' : p.stock + ' restant(s)'}</span></li>)}</ul> : <Nothing icon="check" text="Stocks suffisants." />}</Card>
      <Card title="Dernières commandes" link={['/r/orders', 'Tout voir']}>{d.recent_orders.length ? <ul className="ev-list">{d.recent_orders.map((o) => <li key={o.id}><div><strong>{o.name}</strong><small>{o.ref} · {fdatetime(o.created_at)}</small></div><strong>{money(o.total)}</strong><Pill kind="orders" s={o.status} /></li>)}</ul> : <p className="muted small">Aucune commande pour le moment.</p>}</Card>
    </div>
  </>;
}

/* ================================================================= AGENDA */
const PX = 1.3; // pixels par minute
const toM = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
const shiftDay = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

export function Agenda({ week }) {
  const s = settings(), today = todayStr();
  const base = week || today, monday = shiftDay(base, -((new Date(base + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
  const opens = Object.values(s.hours || {}).filter(Boolean);
  const H0 = Math.min(8, ...opens.map((h) => +h[0].split(':')[0])), H1 = Math.max(19, ...opens.map((h) => Math.ceil(+h[1].replace(':', '.'))));
  const [rows, setRows] = useState([]), [n, setN] = useState(0);
  const reload = () => setN((x) => x + 1);
  useEffect(() => { api(`/api/admin/r/bookings?from=${days[0]}&to=${days[6]}`).then(setRows, () => setRows([])); }, [monday, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = localNow(), nowM = now.getUTCHours() * 60 + now.getUTCMinutes();
  const clickCol = (e, day) => {
    if (e.target.closest('.ag__ev')) return;
    const m = Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / PX / 30) * 30 + H0 * 60;
    newBooking({ date: day, time: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }, reload);
  };
  return <>
    <div className="ag-head">
      <div className="row-wrap"><A className="icon-btn" href={`/agenda?week=${shiftDay(monday, -7)}`} aria-label="Semaine précédente"><Icon n="chevL" /></A><A className="btn btn-ghost btn-sm" href="/agenda">Aujourd’hui</A><A className="icon-btn" href={`/agenda?week=${shiftDay(monday, 7)}`} aria-label="Semaine suivante"><Icon n="chevR" /></A>
        <h2>Du {fdate(days[0], { day: 'numeric', month: 'long' })} au {fdate(days[6], { day: 'numeric', month: 'long', year: 'numeric' })}</h2></div>
      <div className="row-wrap"><A className="btn btn-ghost btn-sm" href="/r/bookings"><Icon n="list" /> Vue liste</A><button className="btn btn-primary btn-sm" onClick={() => newBooking({}, reload)}><Icon n="plus" /> Nouveau rendez-vous</button></div>
    </div>
    <div className="ag-legend">{Object.entries(STATUS.bookings).map(([k, [l]]) => <span key={k} className={`st-${k}`}><i />{l}</span>)}</div>
    <div className="ag card"><div className="ag__grid" style={{ '--h': (H1 - H0) * 60 * PX + 'px' }}>
      <div className="ag__hours"><div className="ag__corner" />{Array.from({ length: H1 - H0 }, (_, i) => <span key={i} style={{ top: i * 60 * PX }}>{String(H0 + i).padStart(2, '0')}h</span>)}</div>
      {days.map((dd) => {
        const wd = new Date(dd + 'T12:00:00Z').getUTCDay(), closed = !s.hours?.[wd] || (s.closed_dates || []).includes(dd);
        const list = rows.filter((b) => b.date === dd && b.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
        const lanes = [];
        const placed = list.map((b) => {
          const st = toM(b.time), en = st + (b.duration || 60);
          let lane = lanes.findIndex((end) => end <= st);
          if (lane < 0) { lane = lanes.length; lanes.push(en); } else lanes[lane] = en;
          return { b, st, en, lane };
        });
        const L = Math.max(1, lanes.length);
        return <div key={dd} className={cx('ag__day', dd === today && 'today', closed && 'closed')}>
          <div className="ag__dh"><small>{DAYS[wd].slice(0, 3)}</small><strong>{+dd.slice(8)}</strong><b>{list.length ? `${list.length} RDV` : ''}</b></div>
          <div className="ag__col" onClick={(e) => clickCol(e, dd)}>
            {Array.from({ length: H1 - H0 }, (_, i) => <i key={i} style={{ top: i * 60 * PX }} />)}{closed && <span className="ag__closed">Fermé</span>}
            {placed.map(({ b, st, en, lane }, i) => (
              <button key={b.id} className={`ag__ev st-${b.status}`} onClick={() => bookingModal(b, reload)}
                style={{ top: (st - H0 * 60) * PX, height: Math.max(28, (en - st) * PX - 3), left: `calc(${(lane / L) * 100}% + 3px)`, width: `calc(${100 / L}% - 6px)`, '--i': i }}>
                <strong>{hm(b.time)} · {b.name}</strong><small>{b.service_name}</small></button>))}
            {dd === today && nowM >= H0 * 60 && nowM <= H1 * 60 && <span className="ag__now" style={{ top: (nowM - H0 * 60) * PX }} />}
          </div>
        </div>;
      })}
    </div></div>
  </>;
}

function bookingModal(b, done) {
  const act = async (fn, close) => { try { await fn(); close(); changed(); done(); } catch (err) { toast(err.message, 'err'); } };
  openModal({
    title: `${b.name} · ${b.ref}`, size: 'modal--md',
    render: (close) => <>
      <div className="kv"><div><span>Prestation</span><strong>{b.service_name || 'Non renseignée'}</strong></div><div><span>Date</span><strong>{cap(fdate(b.date))} à {hm(b.time)}</strong></div>
        <div><span>Durée</span><strong>{fdur(b.duration)}</strong></div><div><span>Montant</span><strong>{money(b.price)}</strong></div>
        <div><span>Téléphone</span><strong>{b.phone || 'Non renseigné'}</strong></div><div><span>E-mail</span><strong>{b.email || 'Non renseigné'}</strong></div>
        {b.notes && <div className="full"><span>Notes</span><strong className="pre">{b.notes}</strong></div>}</div>
      <p className="small muted mt">Changer le statut :</p>
      <div className="st-btns">{Object.entries(STATUS.bookings).map(([k, [l, c]]) => <button key={k} className={cx('st-btn', k === b.status && 'on', `pill--${c}`)}
        onClick={() => act(async () => { await api(`/api/admin/r/bookings/${b.id}`, { method: 'PUT', body: { status: k } }); toast(`Statut : ${l}`); }, close)}>{l}</button>)}</div>
      <div className="row-wrap mt"><a className="btn btn-gold btn-sm" target="_blank" rel="noopener" href={waHref(b.phone, bookingMsg(b))}><Icon n="whatsapp" /> Confirmer sur WhatsApp</a><a className="btn btn-ghost btn-sm" href={telHref(b.phone)}><Icon n="phone" /> Appeler</a>
        <button className="btn btn-ghost btn-sm" onClick={() => { close(); formModal({ title: 'Modifier le rendez-vous', fields: R.bookings.form(), data: b, onSubmit: async (v) => { await api(`/api/admin/r/bookings/${b.id}`, { method: 'PUT', body: v }); toast('Enregistré'); done(); } }); }}><Icon n="edit" /> Modifier</button>
        <button className="btn btn-ghost btn-sm danger" onClick={async () => { if (await confirmBox('Supprimer ce rendez-vous ?', { ok: 'Supprimer', danger: true })) act(async () => { await api(`/api/admin/r/bookings/${b.id}`, { method: 'DELETE' }); toast('Supprimé'); }, close); }}><Icon n="trash" /> Supprimer</button></div>
    </>,
  });
}

/* ============================================================== PARAMÈTRES */
const SECTIONS = [['id', 'Identité & textes', 'edit'], ['ct', 'Contact & réseaux', 'phone'], ['hr', 'Horaires', 'clock'], ['bk', 'Réservations', 'calendar'], ['py', 'Paiement & livraison', 'wallet'], ['st', 'Chiffres clés', 'chart'], ['sec', 'Sécurité', 'lock']];

export function Settings() {
  const { user } = useApp();
  const router = useRouter();
  const [s, setS] = useState(null), [sec, setSec] = useState('id'), [busy, setBusy] = useState(false);
  const [phones, setPhones] = useState([]), [momo, setMomo] = useState([]), [closed, setClosed] = useState([]), [hours, setHours] = useState({});
  const newDate = useRef(null);
  useEffect(() => {
    api('/api/admin/settings').then((v) => { setS(v); setPhones(v.phones || []); setMomo(v.momo || []); setClosed(v.closed_dates || []); setHours(v.hours || {}); }, (e) => toast(e.message, 'err'));
  }, []);
  const [pw, pwBusy] = useSubmit(async (d, f) => { await api('/api/admin/password', { method: 'POST', body: d }); toast('Identifiants mis à jour. Les autres appareils ont été déconnectés.'); f.elements.current.value = f.elements.next.value = ''; });
  if (!s) return <Loading />;

  const F = (k, l, t = 'text', extra = {}) => <Field f={{ k, l, t, ...extra }} v={s[k]} />;
  const upd = (arr, set, i, v) => set(arr.map((x, j) => (j === i ? v : x)));
  const save = async (e) => {
    e.preventDefault();
    const el = e.currentTarget.elements, v = (k) => el[k]?.value ?? '';
    const body = {
      site_name: v('site_name'), tagline: v('tagline'), slogan: v('slogan'), hero_title: v('hero_title'), hero_sub: v('hero_sub'), about_story: v('about_story'), hero_image: v('hero_image'), hero_video: v('hero_video'), about_image: v('about_image'),
      founder_name: v('founder_name'), founder_role: v('founder_role'), founder_quote: v('founder_quote'), founder_image: v('founder_image'),
      phones: phones.map((p) => p.trim()).filter(Boolean), whatsapp: v('whatsapp'), country_code: v('country_code'), email: v('email'), city: v('city'), address: v('address'), map_embed: v('map_embed'),
      facebook: v('facebook'), instagram: v('instagram'), tiktok: v('tiktok'), hours, tz_offset: +v('tz_offset') || 0,
      capacity: Math.max(1, +v('capacity') || 1), slot_interval: +v('slot_interval') || 30, min_advance: +v('min_advance') || 0, max_days: +v('max_days') || 60,
      closed_dates: closed, momo: momo.map((m) => ({ network: (m.network || '').trim(), number: (m.number || '').trim(), name: (m.name || '').trim() })).filter((m) => m.number),
      payment_note: v('payment_note'), delivery_fee: +v('delivery_fee') || 0, free_delivery_from: +v('free_delivery_from') || 0,
      stats: { years: +v('st_years') || 0, clients: +v('st_clients') || 0, rating: +v('st_rating') || 0 },
    };
    setBusy(true);
    try { setS(await api('/api/admin/settings', { method: 'PUT', body })); toast('Paramètres enregistrés, le site est à jour'); router.refresh(); }
    catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  const goSec = (e, k) => { e.preventDefault(); setSec(k); document.getElementById('s-' + k)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return <>
    <form className="settings" onSubmit={save} noValidate>
      <nav className="settings__nav">{SECTIONS.map(([k, l, i]) => <a key={k} href={`#s-${k}`} className={sec === k ? 'active' : undefined} onClick={(e) => goSec(e, k)}><Icon n={i} /> {l}</a>)}</nav>
      <div className="settings__body">
        <section className="card" id="s-id"><h3><Icon n="edit" /> Identité & textes</h3><div className="aform__grid">
          {F('site_name', 'Nom de la structure', 'text', { req: 1 })}{F('tagline', 'Activité (sous le logo)')}
          {F('slogan', 'Slogan (écrit à la main)', 'text', { full: 1, help: 'Affiché en écriture manuscrite : accueil, pied de page, À propos.' })}
          {F('hero_title', 'Grand titre de l’accueil', 'text', { full: 1, help: 'Entourez un mot d’astérisques pour l’écrire en italique rose : Révélez votre *éclat* naturel' })}
          {F('hero_sub', 'Texte d’accueil', 'textarea', { full: 1, rows: 3 })}
          {F('about_story', 'Notre histoire (page À propos)', 'textarea', { full: 1, rows: 7, help: 'Laissez une ligne vide entre les paragraphes.' })}
          {F('hero_video', 'Vidéo d’ambiance de l’accueil (facultatif)', 'video', { help: 'MP4 horizontal, 10 à 30 secondes, idéalement moins de 10 Mo (50 Mo max). Sans vidéo, une vidéo d’ambiance par défaut est affichée.' })}
          {F('hero_image', 'Photo de l’accueil (facultatif)', 'image', { help: 'Affichée pendant le chargement de la vidéo, ou à sa place si aucune vidéo n’est envoyée.' })}
          {F('about_image', 'Photo de la page À propos', 'image', { help: 'Format portrait conseillé (ex. 900 × 1100 px).' })}
          {F('founder_name', 'Fondatrice : nom', 'text', { help: 'Laisser vide pour masquer le bloc « La fondatrice » de l’accueil.' })}{F('founder_role', 'Fondatrice : titre')}
          {F('founder_quote', 'Fondatrice : citation', 'textarea', { full: 1, rows: 2 })}
          {F('founder_image', 'Fondatrice : photo', 'image', { help: 'Portrait, idéalement carré ou vertical.' })}
        </div></section>
        <section className="card" id="s-ct"><h3><Icon n="phone" /> Contact & réseaux</h3>
          <div className="list-edit"><label className="fl">Numéros de téléphone (appel direct)</label>
            {phones.map((p, i) => <div className="le-row" key={i}><input className="inp" value={p} placeholder="01 00 00 00 00" onChange={(e) => upd(phones, setPhones, i, e.target.value)} /><button type="button" className="icon-btn sm danger" onClick={() => setPhones(phones.filter((_, j) => j !== i))}><Icon n="trash" /></button></div>)}
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPhones([...phones, ''])}><Icon n="plus" /> Ajouter un numéro</button></div>
          <div className="aform__grid mt">{F('whatsapp', 'Numéro WhatsApp')}{F('country_code', 'Indicatif pays', 'text', { help: 'Bénin : 229' })}{F('email', 'E-mail', 'email')}{F('city', 'Ville / pays')}
            {F('address', 'Adresse (quartier, repère)', 'text', { full: 1 })}
            {F('map_embed', 'Carte Google Maps', 'textarea', { full: 1, rows: 2, help: 'Google Maps › Partager › Intégrer une carte › copiez le code <iframe> ici.' })}
            {F('facebook', 'Lien Facebook', 'url')}{F('instagram', 'Lien Instagram', 'url')}{F('tiktok', 'Lien TikTok', 'url')}</div></section>
        <section className="card" id="s-hr"><h3><Icon n="clock" /> Horaires d’ouverture</h3><p className="muted small">Utilisés pour l’affichage « ouvert / fermé » et le calcul des créneaux de réservation.</p>
          <div className="hours-edit">{WEEK.map((d) => { const h = hours[d]; const setH = (v) => setHours({ ...hours, [d]: v }); return (
            <div className="he-row" key={d}><label className="switch"><input type="checkbox" checked={!!h} onChange={(e) => setH(e.target.checked ? ['09:00', '18:00'] : null)} /><span className="switch__ui" /><span>{DAYS[d]}</span></label>
              <input type="time" className="inp" value={h ? h[0] : '09:00'} disabled={!h} onChange={(e) => setH([e.target.value, h[1]])} /><span>à</span>
              <input type="time" className="inp" value={h ? h[1] : '18:00'} disabled={!h} onChange={(e) => setH([h[0], e.target.value])} /></div>); })}</div>
          <div className="aform__grid mt">{F('tz_offset', 'Fuseau horaire (décalage UTC)', 'number', { help: 'Bénin : 1' })}</div></section>
        <section className="card" id="s-bk"><h3><Icon n="calendar" /> Réservations en ligne</h3><div className="aform__grid">
          {F('capacity', 'Clientes en même temps', 'number', { help: 'Nombre de postes / esthéticiennes disponibles simultanément' })}
          {F('slot_interval', 'Intervalle des créneaux', 'select', { opts: [[15, '15 minutes'], [20, '20 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '1 heure']] })}
          {F('min_advance', 'Délai minimum avant un RDV (minutes)', 'number')}{F('max_days', 'Réservation possible jusqu’à (jours)', 'number')}</div>
          <div className="list-edit mt"><label className="fl">Jours de fermeture exceptionnelle (congés, jours fériés)</label>
            <div className="chips">{[...closed].sort().map((d) => <span className="chip" key={d}>{fshort(d)} <button type="button" aria-label="Retirer" onClick={() => setClosed(closed.filter((x) => x !== d))}><Icon n="x" /></button></span>)}</div>
            <div className="le-row"><input type="date" className="inp" ref={newDate} /><button type="button" className="btn btn-ghost btn-xs" onClick={() => { const v = newDate.current.value; if (v && !closed.includes(v)) setClosed([...closed, v]); }}><Icon n="plus" /> Ajouter</button></div></div></section>
        <section className="card" id="s-py"><h3><Icon n="wallet" /> Paiement & livraison</h3>
          <div className="list-edit"><label className="fl">Comptes Mobile Money (affichés pour les paiements)</label>
            {momo.map((m, i) => <div className="le-row le-row--3" key={i}>{[['network', 'Réseau (MTN MoMo…)'], ['number', 'Numéro'], ['name', 'Nom du titulaire']].map(([k, ph]) =>
              <input key={k} className="inp" placeholder={ph} value={m[k] || ''} onChange={(e) => upd(momo, setMomo, i, { ...m, [k]: e.target.value })} />)}
              <button type="button" className="icon-btn sm danger" onClick={() => setMomo(momo.filter((_, j) => j !== i))}><Icon n="trash" /></button></div>)}
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setMomo([...momo, {}])}><Icon n="plus" /> Ajouter un compte</button></div>
          <div className="aform__grid mt">{F('payment_note', 'Instructions de paiement', 'textarea', { full: 1, rows: 2 })}{F('delivery_fee', 'Frais de livraison (FCFA)', 'number')}{F('free_delivery_from', 'Livraison offerte dès (FCFA)', 'number', { help: '0 = jamais offerte' })}</div></section>
        <section className="card" id="s-st"><h3><Icon n="chart" /> Chiffres clés affichés sur le site</h3><div className="aform__grid">
          <Field f={{ k: 'st_years', l: 'Années d’expérience', t: 'number' }} v={s.stats?.years} />
          <Field f={{ k: 'st_clients', l: 'Clientes accompagnées', t: 'number' }} v={s.stats?.clients} />
          <Field f={{ k: 'st_rating', l: 'Note moyenne (sur 5)', t: 'number', step: 0.1 }} v={s.stats?.rating} /></div></section>
        <div className="settings__save"><Btn busy={busy} className="btn btn-primary btn-lg"><Icon n="check" /> Enregistrer les paramètres</Btn></div>
      </div>
    </form>
    <section className="card settings__sec" id="s-sec"><h3><Icon n="lock" /> Sécurité du compte</h3>
      <form className="aform" onSubmit={pw}><div className="aform__grid">
        <Input label="Mot de passe actuel" type="password" name="current" required autoComplete="current-password" />
        <Input label="Nouveau mot de passe (10 caractères min.)" type="password" name="next" required minLength={10} autoComplete="new-password" />
        <div className="full"><Input label="E-mail de connexion" type="email" name="email" defaultValue={user.email} /></div></div>
        <div className="row-end"><Btn busy={pwBusy}><Icon n="lock" /> Mettre à jour</Btn></div></form></section>
  </>;
}
