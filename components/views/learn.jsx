'use client';
/* Formations vidéo payantes, lecteur, espace client. */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, cap, CUSTOM_TYPES, cx, discount, fdate, fdur, fshort, go, money, openModal, pct, settings, todayStr, toast, waMain, whatsappRelay } from '@/lib/core';

import { AuthForms, Btn, Cover, CourseCard, DarkHeader, DateBox, Empty, Icon, Input, MomoBlock, PageHero, Paras, Pill, SecHead, Select, Split, SuccessCheck, authModal, confirmBox, useApp, useSubmit } from '../ui';
import { Timeline } from './site';

const Perk = ({ ic, t, s }) => <div><Icon n={ic} /><strong>{t}</strong><span>{s}</span></div>;

/* =============================================================== CATALOGUE */
export function Courses({ list }) {
  return <>
    <PageHero video="hero" eyebrow="Académie en ligne" title="Formations vidéo *beauté*" sub="Les gestes et secrets de nos expertes, filmés en gros plan. Apprenez à votre rythme, depuis votre téléphone, avec un accès illimité." crumbs={[[null, 'Formations']]} />
    <section className="section section--tight"><div className="container">
      <div className="perks perks--top" data-stagger="90">
        <Perk ic="film" t="Vidéos HD" s="Filmées de près, pas à pas" /><Perk ic="infinity" t="Accès à vie" s="Revoyez autant que vous voulez" />
        <Perk ic="smartphone" t="Partout" s="Mobile, tablette, ordinateur" /><Perk ic="wallet" t="Mobile Money" s="MTN MoMo, Moov Money" />
      </div>
      <div className="cgrid" data-stagger="110">{list.map((c) => <CourseCard key={c.id} c={c} />)}</div>
      {!list.length && <Empty text="Les formations arrivent très bientôt." icon="film" />}
    </div></section>
    <section className="section section--sand"><div className="container">
      <SecHead eyebrow="Comment ça marche" title="Commencez en *4 étapes*" cls="center" />
      <Timeline stagger={140} steps={[
        ['Choisissez', 'Parcourez le programme et regardez la leçon d’introduction gratuite.'], ['Créez votre compte', 'En 20 secondes, avec votre e-mail et votre numéro.'],
        ['Payez par Mobile Money', 'Envoyez le montant et indiquez la référence de la transaction.'], ['Apprenez', 'Votre accès est activé dès vérification. Pour toujours.']]} />
    </div></section>
  </>;
}

/* ================================================================== LECTEUR */
function Player({ l }) {
  if (!l.src) return <div className="player__empty"><Icon n="film" /><strong>Vidéo bientôt disponible</strong><span>Notre équipe finalise le tournage de cette leçon.</span></div>;
  if (l.type === 'youtube' || l.type === 'vimeo') return <iframe src={l.src} title={l.title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />;
  return <video src={l.src} controls playsInline preload="metadata" controlsList="nodownload" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} onEnded={l.onEnded} />;
}

async function previewModal(id) {
  try {
    const l = await api(`/api/lessons/${id}`);
    openModal({ size: 'modal--lg modal--media', render: () => <><div className="player"><Player l={l} /></div><h3 className="h3 mt">{l.title}</h3>{l.description && <p className="muted">{l.description}</p>}</> });
  } catch (err) { toast(err.message, 'err'); }
}

function PayForm({ c, onDone }) {
  const { user } = useApp();
  const s = settings();
  const [r, setR] = useState(null);
  const [submit, busy] = useSubmit(async (d) => {
    const wa = whatsappRelay();
    let res;
    try { res = await api(`/api/courses/${c.id}/enroll`, { method: 'POST', body: d }); } catch (err) { wa.cancel(); throw err; }
    setR({ ...res, url: wa.send(`Bonjour, je viens de payer la formation « ${c.title} » (réf. ${res.ref}${d.payment_ref ? `, transaction ${d.payment_ref}` : ''}). Voici ma capture de paiement :`) });
    setTimeout(onDone, 400);
  });
  if (r) return (
    <div className="success"><SuccessCheck /><h3>Merci ! Paiement transmis</h3><p>Référence <strong className="ref">{r.ref}</strong></p>
      <p className="muted">Nous vérifions votre transaction et activons votre accès très rapidement. Vous pouvez accélérer en nous envoyant la capture de paiement.</p>
      <a className="btn btn-wa" target="_blank" rel="noopener" href={r.url}><Icon n="whatsapp" /> Envoyer ma capture sur WhatsApp</a></div>
  );
  return (
    <div className="pay">
      <div className="pay__head"><Cover item={c} label={c.level} /><div><strong>{c.title}</strong><span className="big-price">{money(c.price)}</span></div></div>
      <ol className="pay__steps">
        <li><span>1</span><div><strong>Envoyez {money(c.price)}</strong> sur l’un de ces numéros :<MomoBlock /></div></li>
        <li><span>2</span><div><strong>Indiquez les informations de votre paiement</strong>
          <form className="stack mt" onSubmit={submit}>
            <Select label="Réseau utilisé" name="method" options={[...(s.momo || []).map((x) => x.network), 'Autre']} />
            <Input label="Référence / ID de la transaction" name="payment_ref" required />
            <Input label="Numéro qui a payé" name="payer_phone" type="tel" required defaultValue={user?.phone || ''} />
            <Btn busy={busy} className="btn btn-primary btn-block btn-lg"><Icon n="check" /> J’ai payé, activer mon accès</Btn>
          </form></div></li>
      </ol>
      <p className="small muted"><Icon n="shield" /> Votre accès est activé dès vérification de la transaction (généralement en moins d’une heure aux heures d’ouverture).</p>
    </div>
  );
}

/* ================================================================== FICHE */
export function Course({ d, buyNow }) {
  const { user } = useApp();
  const router = useRouter();
  const c = d.course, e = d.enrollment;
  const total = d.lessons.reduce((t, l) => t + (l.duration || 0), 0), off = discount(c);
  const learnList = String(c.what_you_learn || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const path = `/formations/${c.slug}`;

  const buy = async () => {
    if (!c.price) {
      try { await api(`/api/courses/${c.id}/enroll`, { method: 'POST', body: {} }); toast('Accès activé, bonne formation !'); go(`/apprendre/${c.slug}`); }
      catch (err) { toast(err.message, 'err'); }
      return;
    }
    openModal({ title: 'Paiement par Mobile Money', size: 'modal--md', render: () => <PayForm c={c} onDone={() => router.refresh()} /> });
  };
  const onBuy = async () => {
    if (user) return buy();
    if (await authModal('Connectez-vous pour acheter et suivre la formation.')) go(path + '?buy=1', { replace: true });
  };
  useEffect(() => {
    if (!buyNow || d.access || !user || e?.status === 'pending') return;
    const t = setTimeout(buy, 600);
    history.replaceState(null, '', path);
    return () => clearTimeout(t);
  }, [buyNow]); // eslint-disable-line react-hooks/exhaustive-deps

  let cta;
  if (d.access) cta = <a href={`/apprendre/${c.slug}`} className="btn btn-gold btn-lg btn-block"><Icon n="play" /> {d.done.length ? 'Continuer la formation' : 'Commencer la formation'}</a>;
  else if (e?.status === 'pending') cta = <>
    <div className="pending"><Icon n="clock" /><div><strong>Paiement en cours de vérification</strong><small>Votre accès sera activé très vite. Réf. {e.ref}</small></div></div>
    <a className="btn btn-ghost btn-block btn-sm" target="_blank" rel="noopener" href={waMain(`Bonjour, j’ai payé la formation « ${c.title} » (réf. ${e.ref}). Voici ma preuve de paiement :`)}><Icon n="whatsapp" /> Envoyer ma preuve de paiement</a>
    <button className="link-btn" onClick={onBuy}>Modifier la référence de paiement</button></>;
  else cta = <>{e?.status === 'rejected' && <p className="pill pill--bad">Paiement non validé, merci de réessayer</p>}<button className="btn btn-gold btn-lg btn-block" onClick={onBuy}><Icon n="wallet" /> {c.price ? 'Acheter la formation' : 'Accéder gratuitement'}</button></>;

  return <>
    <DarkHeader />
    <section className="course-hero">
            <div className="container course-hero__in">
        <nav className="crumbs crumbs--light" data-reveal><a href="/">Accueil</a><span>/</span><a href="/formations">Formations</a></nav>
        <span className="pill pill--light" data-reveal>{c.level}</span>
        <Split as="h1" className="h1 light" text={c.title} />
        <p className="lead light" data-reveal data-delay="250">{c.subtitle}</p>
        <div className="course-hero__meta" data-reveal data-delay="350"><span><Icon n="film" /> {d.lessons.length} leçons</span><span><Icon n="clock" /> {c.duration_label || fdur(total)}</span><span><Icon n="infinity" /> Accès à vie</span><span><Icon n="user" /> {c.instructor || 'Nos expertes'}</span></div>
      </div>
    </section>
    <section className="section section--tight"><div className="container course">
      <div className="course__main">
        {learnList.length > 0 && <div className="card" data-reveal><h2 className="h3">Ce que vous allez apprendre</h2><ul className="learn-list">{learnList.map((x) => <li key={x}><Icon n="check" /><span>{x}</span></li>)}</ul></div>}
        <div data-reveal><h2 className="h3">À propos de cette formation</h2><div className="prose"><Paras text={c.description} /></div></div>
        <div data-reveal><h2 className="h3">Programme <small className="muted">· {d.lessons.length} leçons · {fdur(total)}</small></h2>
          <ol className="curriculum">{d.lessons.map((l, i) => {
            const isDone = d.done.includes(l.id);
            return <li key={l.id} className={isDone ? 'done' : undefined}><span className="curriculum__n">{isDone ? <Icon n="check" /> : String(i + 1).padStart(2, '0')}</span>
              <span className="curriculum__t"><strong>{l.title}</strong>{l.description && <small>{l.description}</small>}</span>
              <span className="curriculum__d">{l.duration ? fdur(l.duration) : ''}</span>
              {d.access ? <a href={`/apprendre/${c.slug}?l=${l.id}`} className="icon-btn" aria-label="Regarder"><Icon n="play" /></a>
                : l.is_preview && l.has_video ? <button className="chip chip--sm" onClick={() => previewModal(l.id)}><Icon n="play" /> Aperçu gratuit</button>
                  : l.is_preview ? <span className="chip chip--sm">Aperçu bientôt</span> : <span className="curriculum__lock"><Icon n="lock" /></span>}</li>;
          })}</ol></div>
      </div>
      <aside className="course__side"><div className="card buy" data-reveal="left">
        <div className="buy__cover"><Cover item={c} label={c.level} /></div>
        <div className="buy__price"><strong>{c.price ? money(c.price) : 'Gratuit'}</strong>{off > 0 && <><s>{money(c.compare_price)}</s><span className="badge badge--gold">-{off}%</span></>}</div>
        <div>{cta}</div>
        <ul className="buy__inc"><li><Icon n="film" /> {d.lessons.length} vidéos à la demande</li><li><Icon n="infinity" /> Accès illimité à vie</li><li><Icon n="smartphone" /> Mobile, tablette et ordinateur</li><li><Icon n="chat" /> Questions par WhatsApp</li></ul>
        <p className="small muted center">Une question avant d’acheter ? <a href={waMain(`Bonjour, j’ai une question sur la formation « ${c.title} ».`)} target="_blank" rel="noopener">Écrivez-nous</a></p>
      </div></aside>
    </div></section>
  </>;
}

/* ============================================================== APPRENDRE */
const Gate = ({ title, children }) => <section className="nf"><div className="container center narrow"><div className="nf__icon"><Icon n="lock" /></div><h1 className="h2">{title}</h1>{children}</div></section>;

export function Learn({ d, start }) {
  const { user } = useApp();
  const prog = useRef(null), player = useRef(null), celebrated = useRef(false);
  const lessons = d?.lessons || [];
  const [done, setDone] = useState(() => new Set(d?.done || [])), [cur, setCur] = useState(null), [lesson, setLesson] = useState(null), [loading, setLoading] = useState(false);
  const c = d?.course;

  const open = async (id) => {
    setCur(id); setLoading(true);
    try { setLesson(await api(`/api/lessons/${id}`)); } catch (err) { setLesson({ error: err.message }); }
    setLoading(false);
    history.replaceState(null, '', `/apprendre/${c.slug}?l=${id}`);
  };
  const toggle = async (id = cur, val = !done.has(id)) => {
    try {
      await api(`/api/lessons/${id}/done`, { method: 'POST', body: { done: val } });
      setDone((s) => { const n = new Set(s); val ? n.add(id) : n.delete(id); return n; });
    } catch (err) { toast(err.message, 'err'); }
  };
  useEffect(() => {
    if (!d?.access) return;
    celebrated.current = done.size === lessons.length;
    const id = +start || (lessons.find((l) => !done.has(l.id)) || lessons[0])?.id;
    if (id) open(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const p = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;
  useEffect(() => {
    if (p === 100 && !celebrated.current) { celebrated.current = true; toast('Félicitations, vous avez terminé la formation.'); }
  }, [p]);

  if (!user) return <Gate title="Connectez-vous pour accéder à votre formation"><button className="btn btn-primary" onClick={() => authModal()}>Me connecter</button></Gate>;
  if (!d.access) return <Gate title="Cette formation n’est pas encore active sur votre compte">
    <p className="lead">{d.enrollment?.status === 'pending' ? 'Votre paiement est en cours de vérification.' : 'Achetez-la pour accéder à toutes les leçons.'}</p><a href={`/formations/${c.slug}`} className="btn btn-primary">Voir la formation</a></Gate>;

  const i = lessons.findIndex((l) => l.id === cur), meta = lessons[i];
  return (
    <section className="learn" style={{ '--c': c.color }}><div className="container-wide learn__grid">
      <div className="learn__main">
        <a href={`/formations/${c.slug}`} className="link-arrow link-arrow--back"><Icon n="arrowL" /> {c.title}</a>
        <div className={cx('player', loading && 'loading')} ref={player}>
          {lesson?.error ? <div className="player__empty"><Icon n="alert" /><strong>{lesson.error}</strong></div>
            : lesson && <Player key={lesson.id} l={{ ...lesson, onEnded: () => !done.has(lesson.id) && toggle(lesson.id, true) }} />}
        </div>
        {meta && <div className="learn__meta">
          <div><small className="muted">Leçon {i + 1} sur {lessons.length}</small><h1 className="h3">{meta.title}</h1><p className="muted">{meta.description}</p></div>
          <div className="row-wrap">
            <button className={cx('btn btn-ghost btn-sm', done.has(cur) && 'is-done')} onClick={() => toggle()}><Icon n="check" /> {done.has(cur) ? 'Terminée' : 'Marquer comme terminée'}</button>
            {i < lessons.length - 1 && <button className="btn btn-primary btn-sm" onClick={() => { if (!done.has(cur)) toggle(cur, true); open(lessons[i + 1].id); }}>Leçon suivante <Icon n="arrow" /></button>}
          </div>
        </div>}
      </div>
      <aside className="learn__side card">
        <div className="learn__prog" ref={prog}><div className="row-between"><strong>Votre progression</strong><span>{p} %</span></div><div className="bar"><span style={{ width: p + '%' }} /></div></div>
        <ol className="lessons">{lessons.map((l, k) => (
          <li key={l.id}><button className={cx(done.has(l.id) && 'done', l.id === cur && 'cur')} onClick={() => { open(l.id); if (innerWidth < 900) player.current?.scrollIntoView({ behavior: 'smooth' }); }}>
            <span className="lessons__n">{String(k + 1).padStart(2, '0')}</span><span className="lessons__t">{l.title}<small>{l.duration ? fdur(l.duration) : ''}</small></span><span className="lessons__ck"><Icon n="check" /></span></button></li>))}</ol>
      </aside>
    </div></section>
  );
}

/* ============================================================ ESPACE CLIENT */
export function Account({ d, tab: t0 }) {
  const { user: u, setUser } = useApp();
  const router = useRouter();
  const [submit, busy] = useSubmit(async (v, f) => { const r = await api('/api/me/profile', { method: 'PUT', body: v }); setUser(r.user); toast('Profil mis à jour.'); f.elements.current_password.value = f.elements.new_password.value = ''; });
  const TABS = d ? [['rdv', 'Rendez-vous', 'calendar', d.bookings.length], ['cmd', 'Commandes', 'bag', d.orders.length], ['for', 'Formations', 'film', d.courses.length],
    ['sm', 'Sur-mesure', 'gift', d.custom.length], ['atl', 'Ateliers', 'ticket', d.events.length], ['pro', 'Profil', 'user', 0]] : [];
  const [tab, setTab] = useState(TABS.some((t) => t[0] === t0) ? t0 : 'rdv');

  if (!u || !d) return <>
    <PageHero eyebrow="Mon espace" title="Bienvenue *chez vous*" sub="Retrouvez vos rendez-vous, commandes, formations et demandes sur-mesure en un seul endroit." crumbs={[[null, 'Mon espace']]} cls="phero--sm" />
    <section className="section section--tight"><div className="container narrow-sm"><div className="card" data-reveal><AuthForms tab={t0 === 'register' ? 'register' : 'login'} /></div></div></section>
  </>;

  const today = todayStr();
  const choose = (k) => { setTab(k); history.replaceState(null, '', `/compte?tab=${k}`); };
  const cancel = async (id) => {
    if (!(await confirmBox('Annuler ce rendez-vous ?', { ok: 'Oui, annuler', danger: true }))) return;
    try { await api(`/api/me/bookings/${id}/cancel`, { method: 'POST', body: {} }); toast('Rendez-vous annulé.'); router.refresh(); }
    catch (err) { toast(err.message, 'err'); }
  };
  const logout = async () => { await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {}); setUser(null); toast('À bientôt !'); go('/'); };
  const empty = (text, icon, href, label) => <Empty text={text} icon={icon}><a href={href} className="btn btn-primary btn-sm">{label}</a></Empty>;
  const upcoming = (b) => b.date >= today && ['pending', 'confirmed'].includes(b.status);

  const panels = {
    rdv: d.bookings.length ? <div className="alist">{d.bookings.map((b) => (
      <div key={b.id} className={cx('aitem', !upcoming(b) && 'past')}><DateBox date={b.date} sm />
        <div className="aitem__body"><strong>{b.service_name || 'Prestation'}</strong><small>{b.time.replace(':', 'h')} · {fdur(b.duration)} · {money(b.price)} · Réf. {b.ref}</small></div>
        <Pill kind="bookings" s={b.status} />{upcoming(b) && <button className="btn btn-ghost btn-sm" onClick={() => cancel(b.id)}>Annuler</button>}</div>))}</div>
      : empty('Aucun rendez-vous pour le moment.', 'calendar', '/reservation', 'Prendre rendez-vous'),
    cmd: d.orders.length ? <div className="alist">{d.orders.map((o) => (
      <div key={o.id} className="aitem aitem--col"><div className="row-between"><div><strong>{o.ref}</strong><small className="muted"> · {fshort(o.created_at)}</small></div><Pill kind="orders" s={o.status} /></div>
        <div className="muted small">{o.items.map((i) => `${i.qty} × ${i.name}`).join(' · ')}</div><div className="row-between"><span className="small">{o.delivery === 'livraison' ? 'Livraison' : 'Retrait sur place'}</span><strong>{money(o.total)}</strong></div></div>))}</div>
      : empty('Aucune commande pour le moment.', 'bag', '/boutique', 'Découvrir la boutique'),
    for: d.courses.length ? <div className="cgrid cgrid--sm">{d.courses.map((c) => {
      const p = c.total ? pct(c.done, c.total) : 0;
      return <div key={c.id} className="mycourse card"><Cover item={c} /><div className="mycourse__body"><strong>{c.title}</strong>
        {c.status === 'active' ? <><div className="bar"><span style={{ width: p + '%' }} /></div><small className="muted">{p} % terminé · {c.done}/{c.total} leçons</small><a href={`/apprendre/${c.slug}`} className="btn btn-primary btn-sm"><Icon n="play" /> {p ? 'Continuer' : 'Commencer'}</a></>
          : <><Pill kind="enrollments" s={c.status} /><a href={`/formations/${c.slug}`} className="btn btn-ghost btn-sm">Voir</a></>}</div></div>;
    })}</div> : empty('Vous n’avez pas encore de formation.', 'film', '/formations', 'Voir les formations'),
    sm: d.custom.length ? <div className="alist">{d.custom.map((x) => (
      <div key={x.id} className="aitem aitem--col"><div className="row-between"><div><strong>{CUSTOM_TYPES[x.type]?.[0] || x.type}</strong><small className="muted"> · {x.ref} · {fshort(x.created_at)}</small></div><Pill kind="custom_orders" s={x.status} /></div>
        {x.quote && <div>Devis proposé : <strong>{money(x.quote)}</strong></div>}{x.admin_note && <div className="muted small"><Icon n="chat" /> {x.admin_note}</div>}</div>))}</div>
      : empty('Aucune demande sur-mesure.', 'gift', '/sur-mesure', 'Faire une demande'),
    atl: d.events.length ? <div className="alist">{d.events.map((x) => (
      <div key={x.ref} className="aitem"><div className="aitem__body"><strong>{x.title}</strong><small>{cap(fdate(x.date))} · {x.time} · {x.seats} place(s) · Réf. {x.ref}</small></div><Pill kind="registrations" s={x.status} /></div>))}</div>
      : empty('Aucune inscription à un atelier.', 'ticket', '/ateliers', 'Voir les ateliers'),
    pro: <form className="stack narrow-sm" onSubmit={submit}>
      <div className="grid-2"><Input label="Nom complet" name="name" required defaultValue={u.name} /><Input label="Téléphone" name="phone" type="tel" defaultValue={u.phone || ''} /></div>
      <Input label="E-mail" value={u.email} disabled readOnly />
      <details className="pw"><summary><Icon n="lock" /> Changer mon mot de passe</summary><div className="grid-2 mt">
        <Input label="Mot de passe actuel" name="current_password" type="password" autoComplete="current-password" />
        <Input label="Nouveau mot de passe" name="new_password" type="password" minLength={8} autoComplete="new-password" /></div></details>
      <div className="row-wrap"><Btn busy={busy}><Icon n="check" /> Enregistrer</Btn><button type="button" className="btn btn-ghost" onClick={logout}><Icon n="logout" /> Se déconnecter</button></div>
    </form>,
  };

  return <>
    <DarkHeader />
    <section className="dash-hero"><div className="container dash-hero__in">
      <div><p className="eyebrow light" data-reveal>Mon espace</p><Split as="h1" className="h1 light" text={`Bonjour, *${u.name.split(' ')[0]}*`} />
        <p className="light-muted" data-reveal data-delay="200">{u.email}</p></div>
      <div className="dash-hero__stats" data-stagger="90">
        <div><strong>{d.bookings.filter(upcoming).length}</strong><span>RDV à venir</span></div>
        <div><strong>{d.orders.length}</strong><span>Commandes</span></div>
        <div><strong>{d.courses.filter((c) => c.status === 'active').length}</strong><span>Formations</span></div>
      </div></div></section>
    <section className="section section--tight"><div className="container">
      {u.role === 'admin' && <a href="/admin" data-external className="note card admin-note" data-reveal><Icon n="sliders" /><div><strong>Espace administrateur</strong><p className="muted">Gérez rendez-vous, commandes, formations et paramètres du site.</p></div><Icon n="arrow" /></a>}
      <div className="dash">
        <nav className="dash__nav">{TABS.map(([k, l, i, n]) => <button key={k} className={k === tab ? 'active' : undefined} onClick={() => choose(k)}><Icon n={i} /><span>{l}</span>{n > 0 && <sup>{n}</sup>}</button>)}</nav>
        <div className="dash__panel card"><div key={tab} style={{ animation: 'slideIn .42s var(--ease) both' }}>{panels[tab]}</div></div>
      </div>
    </div></section>
  </>;
}
