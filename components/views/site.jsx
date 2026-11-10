'use client';
/* Pages vitrine : accueil, à propos, prestations, contact, conseils, diagnostic, 404. */
import { Fragment, useEffect, useRef, useState } from 'react';
import { api, address, cap, CATS, copy, cx, DAYS, fdate, fdur, fshort, hoursLabel, localNow, money, num, openModal, openStatus, PCATS, phones, telHref, todayStr, toast, waMain, WEEK, whatsappRelay } from '@/lib/core';
import {
  addToCart, Avatar, BgVideo, Btn, BulkNote, CallbackForm, DarkHeader, Count, Cover, CourseCard, Emph, Empty, EventCard, Icon, Input, LogoMark, Md, OpenDot, PageHero, Paras, PostCard,
  Price, ProductArt, ProductCard, SecHead, Seg, Select, ServiceCard, Slideshow, Split, Stars, pop, reviewModal, useApp, useSubmit, Area,
} from '../ui';

const AV = ['#d6336f', '#1b2a5c', '#3b56a6', '#a8235a', '#2d4387'];
const external = (u) => /^https?:\/\//.test(u || '');

/** Bandeau défilant sous le hero (le slogan en écriture manuscrite, puis les engagements). */
function Marquee({ slogan }) {
  const items = ['Soins naturels', 'Tous types de peau', 'Livraison à domicile', 'Paiement Mobile Money', 'Conseils personnalisés'];
  const run = <span className="marquee__run">{slogan && <><b className="script">{slogan}</b><i>✦</i></>}{items.map((t) => <Fragment key={t}><em>{t}</em><i>✦</i></Fragment>)}</span>;
  return <div className="marquee" aria-hidden="true"><div className="marquee__track">{run}{run}</div></div>;
}

/** Produit vedette : grande photo verticale (affiches et photos de la marque). */
const StarCard = ({ p }) => (
  <article className="star">
    <a href={`/boutique/${p.slug}`} className="star__media" aria-label={p.name}><img src={p.image} alt={p.name} loading="lazy" />{!!p.featured && <span className="badge star__badge">Coup de cœur</span>}</a>
    <div className="star__body">
      <span className="pcard__cat">{PCATS[p.category] || p.category}</span>
      <h3 className="star__name"><a href={`/boutique/${p.slug}`}>{p.name}</a></h3>
      <p className="star__short">{p.short}</p>
      <BulkNote p={p} />
      <div className="pcard__foot"><Price p={p} />
        <button className="add-btn" disabled={p.stock !== null && p.stock <= 0} aria-label={`Ajouter ${p.name} au panier`} onClick={(e) => addToCart(p, 1, e.currentTarget)}><Icon n="plus" /><span>Ajouter</span></button></div>
    </div>
  </article>
);

const Stats = ({ st, third = [0, ''] }) => (
  <section className="stats"><div className="container stats__grid" data-stagger="120">
    <div className="stat"><strong><Count to={+st.years || 0} /><sup>+</sup></strong><span>années d’expérience</span></div>
    <div className="stat"><strong><Count to={+st.clients || 0} /><sup>+</sup></strong><span>clientes accompagnées</span></div>
    <div className="stat"><strong><Count to={third[0]} /></strong><span>{third[1]}</span></div>
    <div className="stat"><strong><Count to={+st.rating || 5} /><sup>/5</sup></strong><span>{third[2] || 'note moyenne'}</span></div>
  </div></section>
);

const Universes = ({ sm }) => (
  <div className={cx('universes', sm && 'universes--sm')} data-stagger={sm ? 80 : 90}>
    {Object.entries(CATS).map(([k, c], i) => (
      <a key={k} href={`/prestations?cat=${k}`} className="uni" style={{ '--c': c.color }}>
        {!sm && <span className="uni__num">0{i + 1}</span>}
        <span className="uni__ic"><Icon n={c.icon} /></span><h3>{c.label}</h3><p>{c.desc}</p><span className="uni__go"><Icon n="arrowUR" /></span>
      </a>
    ))}
  </div>
);

/* ================================================================ ACCUEIL */
export function Home({ d }) {
  const { s, slides } = useApp();
  const st = s.stats || {}, st0 = openStatus(), tel = phones()[0];
  const [slide, setSlide] = useState(0), [tick, setTick] = useState(0);
  const next = d.next ? `${d.next.date === todayStr() ? 'Aujourd’hui' : cap(fdate(d.next.date, { weekday: 'long', day: 'numeric', month: 'short' }))} à ${d.next.time.replace(':', 'h')}` : 'Sur rendez-vous';
  const stars = d.products.filter((p) => p.image).slice(0, 6), rest = d.products.filter((p) => !stars.includes(p));

  useEffect(() => {
    if (d.reviews.length < 2) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % d.reviews.length), 6000);
    return () => clearInterval(t);
  }, [tick, d.reviews.length]);

  return <>
    <section className="hero">
      <DarkHeader />
      <div className="hero__media" aria-hidden="true">
        {s.hero_video ? <BgVideo src={s.hero_video} poster={s.hero_image || ''} /> : s.hero_image ? <img src={s.hero_image} alt="" /> : <BgVideo name="hero" />}
      </div>
      <div className="container">
        {s.slogan ? <p className="hero__script script" data-reveal>{s.slogan}</p> : <p className="eyebrow" data-reveal>{s.tagline}{s.city && ` · ${s.city}`}</p>}
        <Split as="h1" className="hero__title" text={s.hero_title} />
        <p className="hero__sub" data-reveal data-delay="250">{s.hero_sub}</p>
        <div className="hero__cta" data-reveal data-delay="350">
          <a href="/reservation" className="btn btn-white btn-lg"><Icon n="calendar" /> Prendre rendez-vous</a>
          {tel && <a href={telHref(tel)} className="btn btn-outline-light btn-lg" data-external><Icon n="phone" /> Appeler</a>}
        </div>
        {slides?.length > 0 && <div className="hero__show" data-reveal="zoom" data-delay="300"><Slideshow slides={slides} label="Nos soins stars" /></div>}
        <div className="hero__facts" data-reveal data-delay="450">
          <a href="/reservation" className="hfact"><small>Prochain créneau libre</small><strong>{next}</strong></a>
          <div className="hfact"><small>Note moyenne</small><strong>{String(st.rating).replace('.', ',')}/5 · {num(st.clients)}+ clientes</strong></div>
          <div className="hfact"><small>Horaires</small><strong>{st0.label}</strong></div>
        </div>
      </div>
    </section>
    <Marquee slogan={s.slogan} />

    <section className="section" id="univers"><div className="container">
      <SecHead eyebrow="Nos univers" title="Six expertises, *une seule* exigence" cls="center" sub="Du soin du visage à l’attache foulard de cérémonie, chaque prestation est réalisée avec des protocoles adaptés aux peaux noires et métissées." />
      <Universes />
    </div></section>

    {stars.length > 0 && <section className="section section--sand stars-sec"><div className="container">
      <SecHead eyebrow={`La gamme ${s.site_name}`} title="Nos soins *stars*" cls="sec-head--split" sub="Huiles, laits, crèmes et savons formulés pour sublimer toutes les peaux."
        side={<a href="/boutique" className="link-arrow" data-reveal>Toute la boutique <Icon n="arrow" /></a>} />
      <div className="stars-grid" data-stagger="90">{stars.map((p) => <StarCard key={p.id} p={p} />)}</div>
    </div></section>}

    {s.founder_name && <section className="section founder"><div className="container founder__grid">
      <div className="founder__visual" data-reveal="zoom">
        <div className="founder__frame"><img src={s.founder_image || s.about_image} alt={`${s.founder_name}, ${s.founder_role}`} loading="lazy" /></div>
        <span className="founder__seal"><LogoMark /></span>
      </div>
      <div className="founder__txt">
        <p className="eyebrow" data-reveal>La fondatrice</p>
        <Split className="h2" text={`Rencontrez *${s.founder_name.split(' ')[0]}*`} />
        {s.founder_quote && <blockquote className="founder__quote" data-reveal data-delay="200"><Icon n="quote" /><p>{s.founder_quote}</p></blockquote>}
        <p className="founder__sign" data-reveal data-delay="300"><span className="script">{s.founder_name}</span><small>{s.founder_role}</small></p>
        <div className="row-wrap" data-reveal data-delay="350">
          <a href="/a-propos" className="btn btn-primary">Découvrir notre histoire <Icon n="arrow" /></a>
          {external(s.facebook) && <a href={s.facebook} target="_blank" rel="noopener" className="btn btn-ghost"><Icon n="facebook" /> Suivre sur Facebook</a>}
        </div>
      </div>
    </div></section>}

    <Stats st={st} third={[d.counts.services, 'prestations sur-mesure']} />

    {d.services.length > 0 && <section className="section">
      <div className="container">
        <SecHead eyebrow="Les incontournables" title="Nos soins *signature*" cls="sec-head--split" side={<a href="/prestations" className="link-arrow" data-reveal>Toutes les prestations <Icon n="arrow" /></a>} />
        <div className="srows" data-stagger="70">{d.services.map((sv, i) => (
          <a key={sv.id} href={`/reservation?service=${sv.id}`} className="srow" style={{ '--c': CATS[sv.category]?.color }}>
            <span className="srow__n">{String(i + 1).padStart(2, '0')}</span>
            <span className="srow__name">{sv.name}<small>{CATS[sv.category]?.label}</small></span>
            <span className="srow__dur"><Icon n="clock" /> {fdur(sv.duration)}</span>
            <span className="srow__price">{sv.price ? money(sv.price) : 'Sur devis'}</span>
            <span className="srow__go"><Icon n="arrowUR" /></span>
          </a>))}</div>
      </div>
    </section>}

    <section className="diag-cta"><div className="container diag-cta__in">
      <div className="diag-cta__txt">
        <p className="eyebrow light" data-reveal>Dermo-conseil en ligne · gratuit</p>
        <Split className="h2 light" text="Quelle routine pour *votre peau* ?" />
        <p data-reveal data-delay="200">Répondez à 6 questions et recevez instantanément votre profil de peau, nos conseils d’expertes et une sélection de soins et produits adaptés.</p>
        <a href="/diagnostic" className="btn btn-gold btn-lg" data-reveal data-delay="300">Faire mon diagnostic <Icon n="arrow" /></a>
      </div>
      <ol className="diag-steps" data-stagger="80">{[['6', 'questions sur votre peau'], ['1', 'profil de peau détaillé'], ['3', 'recommandations de soins et produits']].map(([n, t]) => <li key={t}><strong>{n}</strong><span>{t}</span></li>)}</ol>
    </div></section>

    {rest.length > 0 && <section className="section section--sky"><div className="container" data-hs-wrap>
      <SecHead eyebrow="La boutique" title="Les essentiels de *votre routine*" cls="sec-head--split"
        side={<div className="hs-nav" data-reveal><button className="icon-btn" data-hs-prev aria-label="Précédent"><Icon n="arrowL" /></button><button className="icon-btn" data-hs-next aria-label="Suivant"><Icon n="arrow" /></button></div>} />
      <div className="hscroll" data-hscroll data-stagger="70">{rest.map((p) => <div className="hscroll__item" key={p.id}><ProductCard p={p} /></div>)}</div>
      <div className="center mt"><a href="/boutique" className="btn btn-ghost">Voir toute la boutique <Icon n="arrow" /></a></div>
    </div></section>}

    {d.courses.length > 0 && <section className="section learn-band"><div className="container learn-band__grid">
      <div className="learn-band__txt">
        <p className="eyebrow" data-reveal>Académie en ligne</p>
        <Split className="h2" text="Apprenez avec nos expertes, *à votre rythme*" />
        <p className="lead" data-reveal data-delay="200">Attache foulard, maquillage professionnel, soin de la peau : nos formations vidéo vous transmettent les gestes et secrets de {s.site_name}.</p>
        <ul className="feats" data-stagger="90">
          <li><Icon n="film" /> Vidéos HD filmées en gros plan</li><li><Icon n="infinity" /> Accès illimité, à vie</li>
          <li><Icon n="smartphone" /> Sur téléphone, tablette ou ordinateur</li><li><Icon n="wallet" /> Paiement simple par Mobile Money</li>
        </ul>
        <a href="/formations" className="btn btn-primary" data-reveal><Icon n="play" /> Découvrir les formations</a>
      </div>
      <div className="learn-band__cards" data-stagger="130">{d.courses.map((c) => <CourseCard key={c.id} c={c} />)}</div>
    </div></section>}

    {d.events.length > 0 && <section className="section"><div className="container">
      <SecHead eyebrow="Ateliers & masterclass" title="Réservez *votre place*" cls="sec-head--split" side={<a href="/ateliers" className="link-arrow" data-reveal>Tous les ateliers <Icon n="arrow" /></a>} />
      <div className="ecards" data-stagger="120">{d.events.map((e) => <EventCard key={e.id} e={e} />)}</div>
    </div></section>}

    {d.reviews.length > 0 && <section className="section testi"><div className="container">
      <SecHead eyebrow="Elles nous font confiance" title="Leurs mots, *notre fierté*" cls="center" />
      <div className="testi__slider" data-reveal>
        <span className="testi__q"><Icon n="quote" /></span>
        <div className="testi__track">{d.reviews.map((r, i) => (
          <figure key={r.id} className={cx('testi__item', i === slide && 'active')}><blockquote>{r.text}</blockquote>
            <figcaption><Avatar name={r.name} color={AV[i % 5]} /><span><strong>{r.name}</strong><small>{r.service}</small></span><Stars n={r.rating} /></figcaption></figure>))}</div>
        <div className="testi__dots">{d.reviews.map((r, i) => <button key={r.id} className={i === slide ? 'active' : undefined} aria-label={`Avis ${i + 1}`} onClick={() => { setSlide(i); setTick((t) => t + 1); }} />)}</div>
      </div>
      <div className="center mt"><button className="btn btn-ghost" onClick={reviewModal}><Icon n="edit" /> Laisser un avis</button></div>
    </div></section>}

    {d.gallery.length > 0 && <section className="section section--sand"><div className="container">
      <SecHead eyebrow="Fait avec soin" title={d.gallery.every((g) => g.category === 'Coulisses') ? 'Dans les *coulisses*' : 'La galerie *beauté*'} cls="center" />
      <div className="masonry" data-stagger="60" style={d.gallery.length < 4 ? { columns: d.gallery.length, maxWidth: d.gallery.length * 340, marginInline: 'auto' } : undefined}>{d.gallery.map((g) => (
        <button key={g.id} className="mitem" onClick={() => lightbox(g)}><img src={g.image} alt={g.title || ''} loading="lazy" />{g.title && <span>{g.title}</span>}</button>))}</div>
    </div></section>}

    {d.posts.length > 0 && <section className="section"><div className="container">
      <SecHead eyebrow="Dermo-conseils" title="Le journal *beauté*" cls="sec-head--split" side={<a href="/conseils" className="link-arrow" data-reveal>Tous les conseils <Icon n="arrow" /></a>} />
      <div className="bcards" data-stagger="110">{d.posts.map((p) => <PostCard key={p.id} p={p} />)}</div>
    </div></section>}

    <section className="section call-band"><div className="container call-band__grid">
      <div>
        <p className="eyebrow light" data-reveal>Un conseil, une question ?</p>
        <Split className="h2 light" text="Une experte *vous répond*" />
        <p className="call-band__status" data-reveal><OpenDot on={st0.open} /> {st0.label}</p>
        <div className="call-band__phones" data-stagger="120">{phones().map((p) => <a key={p} href={telHref(p)} className="bigphone" data-external><Icon n="phone" /><span>{p}</span></a>)}</div>
        <a href={waMain('Bonjour, j’ai une question.')} target="_blank" rel="noopener" className="btn btn-gold" data-reveal><Icon n="whatsapp" /> Écrire sur WhatsApp</a>
      </div>
      <div data-reveal="left"><CallbackForm /></div>
    </div></section>
  </>;
}

function BeforeAfter({ g }) {
  const [p, setP] = useState(50);
  return (
    <div className="ba" style={{ '--p': p + '%' }}><img src={g.after_image} alt="Après" /><div className="ba__before"><img src={g.image} alt="Avant" /></div>
      <span className="ba__tag l">Avant</span><span className="ba__tag r">Après</span>
      <input type="range" min="0" max="100" value={p} onChange={(e) => setP(e.target.value)} aria-label="Comparer avant / après" /><span className="ba__handle" /></div>
  );
}
const lightbox = (g) => openModal({
  size: 'modal--lg modal--media',
  render: () => <>{g.after_image ? <BeforeAfter g={g} /> : <img className="lb-img" src={g.image} alt={g.title || ''} />}{g.title && <p className="center mt">{g.title}</p>}</>,
});

/* ================================================================ À PROPOS */
const VALUES = [
  ['award', 'Expertise', 'Des esthéticiennes et maquilleuses formées en continu aux dernières techniques.'],
  ['heart', 'Bienveillance', 'Un accueil chaleureux, une écoute sincère, zéro jugement. Ici, vous êtes chez vous.'],
  ['shield', 'Hygiène irréprochable', 'Matériel stérilisé, linge à usage unique, protocoles stricts à chaque soin.'],
  ['leaf', 'Des formules SEM', 'Huiles, laits, crèmes et savons pensés pour les peaux noires et métissées, avec des actifs choisis avec exigence.'],
];
const STEPS = [
  ['Diagnostic', 'Nous prenons le temps de comprendre votre peau, vos envies et votre quotidien.'],
  ['Protocole sur-mesure', 'Nous construisons un soin adapté à votre type de peau et à vos objectifs.'],
  ['Le soin', 'Vous profitez d’un véritable moment de détente entre des mains expertes.'],
  ['Le suivi', 'Conseils de routine, suivi sur WhatsApp et ajustements au fil des séances.'],
];
export const Timeline = ({ steps, stagger = 150 }) => (
  <ol className="timeline" data-stagger={stagger}>{steps.map(([t, p], i) => <li key={t}><span className="timeline__n">{i + 1}</span><h3>{t}</h3><p>{p}</p></li>)}</ol>
);

export function About() {
  const { s } = useApp();
  const st = s.stats || {};
  return <>
    <PageHero eyebrow="Notre histoire" title="Une passion, *une exigence*" sub={`${s.site_name} : des soins pensés pour la beauté authentique et le bien-être de chaque femme.`} crumbs={[[null, 'À propos']]}>
      {s.slogan && <p className="phero__slogan script" data-reveal data-delay="380">{s.slogan}</p>}
    </PageHero>
    <section className="section"><div className="container story">
      <figure className="story__fig" data-reveal="zoom">
        <div className="story__visual">
          {s.about_image ? <img src={s.about_image} alt={s.founder_name ? `${s.founder_name}, ${s.founder_role}` : s.site_name} /> : <div className="story__art"><ProductArt kind="oil" color="#d6336f" /></div>}
        </div>
        {s.founder_name && <figcaption><span className="script">{s.founder_name}</span><small>{s.founder_role}</small></figcaption>}
      </figure>
      <div className="story__txt">
        <p className="eyebrow" data-reveal>Qui sommes-nous</p>
        <Split className="h2" text="La beauté qui vous *ressemble*" />
        <div className="prose" data-reveal data-delay="200"><Paras text={s.about_story} /></div>
        <div className="row-wrap" data-reveal data-delay="300"><a href="/reservation" className="btn btn-primary">Prendre rendez-vous</a><a href="/contact" className="btn btn-ghost">Nous rendre visite</a></div>
      </div>
    </div></section>
    <section className="section section--sand"><div className="container">
      <SecHead eyebrow="Nos valeurs" title="Ce qui nous *anime*" cls="center" />
      <div className="values" data-stagger="100">{VALUES.map(([i, t, p]) => <div key={t} className="value"><span className="value__ic"><Icon n={i} /></span><h3>{t}</h3><p>{p}</p></div>)}</div>
    </div></section>
    <section className="section"><div className="container">
      <SecHead eyebrow="Votre parcours beauté" title="Quatre étapes, *un résultat*" cls="center" />
      <Timeline steps={STEPS} />
    </div></section>
    <Stats st={st} third={[6, 'univers d’expertise', 'satisfaction']} />
    <section className="section"><div className="container">
      <SecHead eyebrow="Nos expertises" title="Tout pour votre *beauté*" cls="center" />
      <Universes sm />
    </div></section>
  </>;
}

/* ============================================================== PRESTATIONS */
export function Services({ list, cat: cat0 }) {
  const [cat, setCat] = useState(CATS[cat0] ? cat0 : 'all');
  const tabs = useRef(null);
  const [ink, setInk] = useState({});
  const count = (k) => list.filter((s) => s.category === k).length;
  useEffect(() => {
    const move = () => { const a = tabs.current?.querySelector('.tab.active'); if (a) setInk({ width: a.offsetWidth, transform: `translateX(${a.offsetLeft}px)` }); };
    move();
    addEventListener('resize', move);
    return () => removeEventListener('resize', move);
  }, [cat]);
  const choose = (k, e) => {
    setCat(k);
    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    history.replaceState(null, '', k === 'all' ? '/prestations' : `/prestations?cat=${k}`);
  };
  const shown = list.filter((s) => cat === 'all' || s.category === cat);
  return <>
    <PageHero video="soins" eyebrow="Prestations & tarifs" title="L’art du soin, *sur-mesure*" sub="Visage, corps, make-up, attache foulard, santé et dermo-conseils : découvrez nos prestations et réservez en ligne en quelques clics." crumbs={[[null, 'Prestations']]} />
    <section className="section section--tight"><div className="container">
      <div className="tabs-sticky"><div className="tabs" ref={tabs}>
        <button className={cx('tab', cat === 'all' && 'active')} onClick={(e) => choose('all', e)}>Tout <sup>{list.length}</sup></button>
        {Object.entries(CATS).filter(([k]) => count(k)).map(([k, c]) => <button key={k} className={cx('tab', cat === k && 'active')} onClick={(e) => choose(k, e)}><Icon n={c.icon} /> {c.label} <sup>{count(k)}</sup></button>)}
        <span className="tabs__ink" style={ink} />
      </div></div>
      <div className="scards" data-stagger="60">{shown.map((s, i) => <ServiceCard key={cat + s.id} s={s} style={pop(i)} />)}</div>
      <div className="note card" data-reveal><Icon n="info" /><div><strong>Un doute sur le soin le plus adapté ?</strong><p className="muted">Faites notre <a href="/diagnostic">diagnostic de peau en ligne</a> ou réservez une consultation dermo-conseil. Nous vous orientons toujours vers le soin dont vous avez réellement besoin.</p></div></div>
    </div></section>
  </>;
}

/* ================================================================== CONTACT */
function Faq({ q, a }) {
  const ref = useRef(null);
  const toggle = (e) => {
    e.preventDefault();
    const d = ref.current, el = d.querySelector('.faq__a');
    if (d.open) el.animate([{ height: el.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'ease' }).onfinish = () => { d.open = false; };
    else { d.open = true; el.animate([{ height: '0px', opacity: 0 }, { height: el.scrollHeight + 'px', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }); }
  };
  return <details className="faq__item" ref={ref}><summary onClick={toggle}>{q}<span><Icon n="plus" /></span></summary><div className="faq__a"><p>{a}</p></div></details>;
}

export function Contact() {
  const { s } = useApp();
  const st = openStatus(), wd = localNow().getUTCDay();
  const [kind, setKind] = useState('contact');
  const [submit, busy] = useSubmit(async (d, f) => {
    const wa = whatsappRelay();
    const body = kind === 'rappel' ? { kind, name: d.name, phone: d.phone, subject: 'Demande de rappel', message: `Créneau : ${d.when}${d.message ? '. ' + d.message : ''}` } : { kind, ...d };
    await api('/api/contact', { method: 'POST', body }).catch(() => {}); // copie dans Admin › Messages ; WhatsApp reste le canal principal
    wa.send(kind === 'rappel'
      ? `Bonjour, je suis ${d.name}. Pouvez-vous me rappeler au ${d.phone} (${String(d.when).toLowerCase()}) ?${d.message ? `\n${d.message}` : ''}`
      : `Bonjour, je suis ${d.name}${d.phone ? ` (${d.phone})` : ''}.\nSujet : ${d.subject}\n\n${d.message}`);
    f.reset();
    toast('WhatsApp s’ouvre avec votre message : appuyez sur Envoyer pour nous le transmettre.');
  });
  const faq = [
    ['Comment prendre rendez-vous ?', 'En ligne 24 h/24 depuis la page Réservation, par téléphone ou sur WhatsApp. Vous recevez une référence et nous vous confirmons rapidement.'],
    ['Puis-je annuler ou déplacer mon rendez-vous ?', 'Oui, depuis votre espace client ou en nous appelant, idéalement au moins 24 h à l’avance.'],
    ['Quels moyens de paiement acceptez-vous ?', `Espèces et Mobile Money (${(s.momo || []).map((m) => m.network).join(', ') || 'MTN MoMo, Moov Money'}).`],
    ['Livrez-vous les produits ?', `Oui : livraison à domicile (${money(s.delivery_fee)}${s.free_delivery_from ? `, offerte dès ${money(s.free_delivery_from)} d’achat` : ''}) ou retrait gratuit sur place.`],
    ['Comment accéder aux formations vidéo ?', 'Créez votre compte, réglez par Mobile Money puis indiquez la référence de la transaction : votre accès est activé dès vérification, pour toujours.'],
    ['Vos soins conviennent-ils aux peaux sensibles ?', 'Chaque soin commence par un diagnostic. Nous adaptons les produits et, si besoin, nous vous orientons vers un dermatologue.'],
  ];
  const Info = ({ href, ic, wa, label, value, ext }) => {
    const inner = <><span className={cx('ccard-info__ic', wa && 'ic--wa')}><Icon n={ic} /></span><span><small>{label}</small><strong>{value}</strong></span>{href && <Icon n="arrowUR" />}</>;
    return href ? <a href={href} className="ccard-info" {...(ext ? { target: '_blank', rel: 'noopener' } : { 'data-external': true })}>{inner}</a> : <div className="ccard-info">{inner}</div>;
  };
  return <>
    <PageHero eyebrow="Contact" title="Parlons de *vous*" sub="Une question, un conseil, un devis ? Appelez-nous, écrivez-nous ou passez nous voir : nous serons ravies de vous répondre." crumbs={[[null, 'Contact']]} />
    <section className="section section--tight">
      <div className="container contact">
        <div className="contact__info" data-stagger="90">
          {phones().map((p, i) => <Info key={p} href={telHref(p)} ic="phone" label={`Téléphone ${phones().length > 1 ? i + 1 : ''}`} value={p} />)}
          <Info ext href={waMain('Bonjour !')} ic="whatsapp" wa label="WhatsApp" value="Réponse rapide" />
          {s.email && <Info href={`mailto:${s.email}`} ic="mail" label="E-mail" value={s.email} />}
          {address() && <Info ic="pin" label="Adresse" value={address()} />}
          <div className="hours card">
            <h3><Icon n="clock" /> Horaires <span className={cx('pill', st.open ? 'pill--ok' : 'pill--bad')}><OpenDot on={st.open} />{st.label}</span></h3>
            <ul>{WEEK.map((d) => <li key={d} className={d === wd ? 'today' : undefined}><span>{DAYS[d]}</span><span>{hoursLabel(s.hours?.[d])}</span></li>)}</ul>
          </div>
        </div>
        <div className="contact__form card" data-reveal="left">
          <Seg className="seg seg--wide" value={kind} onChange={setKind} items={[['contact', <><Icon n="mail" /> Écrire un message</>], ['rappel', <><Icon n="phone" /> Être rappelée</>]]} />
          <form className="stack" onSubmit={submit}>
            <div className="grid-2"><Input label="Nom complet" name="name" required autoComplete="name" /><Input label="Téléphone (WhatsApp)" name="phone" type="tel" required autoComplete="tel" /></div>
            {kind === 'contact' ? <>
              <Select label="Sujet" name="subject" options={['Renseignement', 'Prise de rendez-vous', 'Devis mariage / événement', 'Commande / livraison', 'Formations', 'Partenariat', 'Autre']} />
            </> : <Select label="Quand souhaitez-vous être rappelée ?" name="when" options={['Dès que possible', 'Ce matin', 'Cet après-midi', 'Ce soir', 'Demain']} />}
            <Area label="Votre message" name="message" rows={5} required={kind === 'contact'} />
            <Btn busy={busy} className="btn btn-wa btn-lg btn-block"><Icon n="whatsapp" /> Envoyer sur WhatsApp</Btn>
            <p className="small muted center">Votre message s’ouvre dans WhatsApp, prêt à être envoyé à {s.site_name}.</p>
          </form>
        </div>
      </div>
      {s.map_embed && <div className="container"><div className="map" data-reveal><iframe src={s.map_embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Plan d’accès" /></div></div>}
    </section>
    <section className="section section--sand"><div className="container narrow">
      <SecHead eyebrow="Questions fréquentes" title="Vous vous *demandez*…" cls="center" />
      <div className="faq" data-stagger="70">{faq.map(([q, a]) => <Faq key={q} q={q} a={a} />)}</div>
    </div></section>
  </>;
}

/* ================================================================ CONSEILS */
export function Blog({ posts }) {
  const cats = [...new Set(posts.map((p) => p.category).filter(Boolean))];
  const [cat, setCat] = useState('');
  return <>
    <PageHero eyebrow="Le journal beauté" title="Dermo-conseils & *secrets d’expertes*" sub="Routines, actifs, make-up, attache foulard : nos conseils honnêtes pour prendre soin de vous au quotidien." crumbs={[[null, 'Conseils']]} />
    <section className="section section--tight"><div className="container">
      {cats.length > 1 && <div className="chips center">{['', ...cats].map((c) => <button key={c} className={cx('chip', c === cat && 'active')} onClick={() => setCat(c)}>{c || 'Tous'}</button>)}</div>}
      <div className="bcards" data-stagger="90">{posts.filter((p) => !cat || p.category === cat).map((p, i) => <PostCard key={cat + p.id} p={p} style={cat ? pop(i, 60, 12) : undefined} />)}</div>
      {!posts.length && <Empty text="Les premiers articles arrivent bientôt." icon="book" />}
    </div></section>
  </>;
}

export function Post({ post: p, more }) {
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(location.href), []);
  return <>
    <article className="article">
      <header className="article__head">
        <div className="container narrow">
          <nav className="crumbs" data-reveal><a href="/">Accueil</a><span>/</span><a href="/conseils">Conseils</a></nav>
          <span className="bcard__cat" data-reveal>{p.category || 'Conseil'}</span>
          <Split as="h1" className="h1" text={p.title} />
          <p className="muted" data-reveal data-delay="300">{fshort(p.created_at)} · {p.read_time || 4} min de lecture</p>
        </div>
      </header>
      <div className="container narrow">
        <div className="article__cover" data-reveal="zoom"><Cover item={p} label={p.category} icon="book" /></div>
        <p className="article__lead" data-reveal>{p.excerpt}</p>
        <div data-reveal><Md src={p.content} /></div>
        <div className="share" data-reveal><span>Partager :</span>
          <a href={`https://wa.me/?text=${encodeURIComponent(p.title + ' ' + url)}`} target="_blank" rel="noopener" className="icon-btn" aria-label="WhatsApp"><Icon n="whatsapp" /></a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener" className="icon-btn" aria-label="Facebook"><Icon n="facebook" /></a>
          <button className="icon-btn" onClick={() => copy(location.href)} aria-label="Copier le lien"><Icon n="copy" /></button></div>
        <div className="article__cta card" data-reveal><div><h3>Besoin d’un avis personnalisé ?</h3><p className="muted">Nos expertes analysent votre peau et vous proposent une routine adaptée.</p></div>
          <div className="row-wrap"><a href="/reservation" className="btn btn-primary">Réserver une consultation</a><a href="/diagnostic" className="btn btn-ghost">Diagnostic en ligne</a></div></div>
      </div>
    </article>
    {more.length > 0 && <section className="section"><div className="container"><SecHead eyebrow="À lire aussi" title="D’autres *conseils*" /><div className="bcards" data-stagger="90">{more.map((x) => <PostCard key={x.id} p={x} />)}</div></div></section>}
  </>;
}

/* =============================================================== DIAGNOSTIC */
const QUIZ = [
  { k: 'type', q: 'En fin de journée, votre peau est plutôt…', o: [['grasse', 'Brillante sur tout le visage', 'drop'], ['mixte', 'Brillante sur la zone T seulement', 'face'], ['seche', 'Tiraillée, rugueuse ou terne', 'leaf'], ['normale', 'Confortable, sans excès', 'sparkle']] },
  { k: 'sens', q: 'Votre peau réagit-elle facilement (rougeurs, picotements, irritations) ?', o: [['oui', 'Oui, souvent', 'alert'], ['parfois', 'Parfois, avec certains produits', 'info'], ['non', 'Rarement ou jamais', 'shield']] },
  { k: 'concerns', multi: true, q: 'Quelles sont vos préoccupations principales ?', sub: 'Plusieurs choix possibles', o: [['taches', 'Taches & teint irrégulier', 'sparkle'], ['acne', 'Boutons & points noirs', 'drop'], ['rides', 'Rides & perte de fermeté', 'clock'], ['eclat', 'Manque d’éclat', 'face'], ['hydratation', 'Déshydratation', 'leaf']] },
  { k: 'sun', q: 'Combien de temps passez-vous au soleil chaque jour ?', o: [['peu', 'Moins d’une heure', 'home'], ['moyen', 'Entre 1 et 3 heures', 'clock'], ['beaucoup', 'Plus de 3 heures', 'sparkle']] },
  { k: 'routine', q: 'Votre routine actuelle ressemble à…', o: [['aucune', 'Pas vraiment de routine', 'x'], ['basique', 'Nettoyant + crème', 'check'], ['complete', 'Routine complète (sérum, SPF…)', 'award']] },
  { k: 'age', q: 'Votre tranche d’âge', o: [['jeune', 'Moins de 25 ans', 'sparkle'], ['adulte', '25 à 40 ans', 'face'], ['mature', 'Plus de 40 ans', 'heart']] },
];
const TYPES = {
  grasse: ['Peau grasse', 'Votre peau produit beaucoup de sébum : elle brille vite et peut présenter des imperfections. Elle vieillit en revanche plus lentement !'],
  mixte: ['Peau mixte', 'Zone T (front, nez, menton) plutôt grasse, joues normales à sèches : votre peau demande un équilibre subtil.'],
  seche: ['Peau sèche', 'Votre peau manque de lipides : elle tiraille, peut paraître terne et a besoin d’être nourrie en profondeur.'],
  normale: ['Peau normale', 'Votre peau est bien équilibrée : l’objectif est de préserver son confort et son éclat sur la durée.'],
};

export function Diagnostic({ products, services }) {
  const [A, setA] = useState({}), [idx, setIdx] = useState(0), [dir, setDir] = useState(1), [done, setDone] = useState(false);
  const quiz = useRef(null), res = useRef(null);
  const q = QUIZ[idx], sel = A[q.k] || (q.multi ? [] : null);
  const show = (n, d = 1) => { setIdx(n); setDir(d); };
  const next = () => (idx < QUIZ.length - 1 ? show(idx + 1) : (setDone(true), setTimeout(() => res.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)));
  const choose = (v) => {
    if (q.multi) return setA({ ...A, [q.k]: sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v] });
    setA({ ...A, [q.k]: v });
    setTimeout(next, 320);
  };
  const restart = () => { setA({}); setDone(false); show(0); quiz.current?.scrollIntoView({ behavior: 'smooth' }); };

  let result = null;
  if (done) {
    const tags = new Set([A.type, ...(A.concerns || [])]);
    if (A.sens === 'oui') tags.add('sensible');
    if (A.sun !== 'peu') tags.add('taches');
    const score = (t) => String(t || '').split(',').reduce((n, x) => n + (tags.has(x.trim()) ? 2 : x.trim() === 'tous' ? 1 : 0), 0);
    const prods = products.map((p) => [p, score(p.tags)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p);
    const servs = services.map((sv) => [sv, score(sv.tags) + (sv.category === 'dermo' ? 1 : 0)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sv]) => sv);
    const [tName, tDesc] = TYPES[A.type] || TYPES.normale;
    const c = A.concerns || [];
    const tips = [
      A.type === 'grasse' || A.type === 'mixte' ? 'Nettoyez matin et soir avec un gel doux, sans savon décapant : décaper relance la production de sébum.' : 'Privilégiez un nettoyant crème ou une eau micellaire, puis une crème riche au karité.',
      'Appliquez un écran solaire SPF 50 chaque matin : c’est le geste n°1 contre les taches sur peau noire et métissée.',
      c.includes('taches') && 'Contre les taches : vitamine C le matin, niacinamide ou acide azélaïque le soir. Évitez absolument les produits « éclaircissants » non contrôlés.',
      c.includes('acne') && 'Ne percez pas vos boutons : cela laisse des marques. L’acide salicylique doux aide à désincruster les pores.',
      c.includes('rides') && 'Misez sur les peptides et un massage liftant régulier pour stimuler la fermeté.',
      A.sens === 'oui' && 'Peau réactive : introduisez un seul nouveau produit à la fois et faites un test au creux du coude 48 h avant.',
      A.routine === 'aucune' && 'Commencez simple : nettoyant + crème hydratante + SPF. La régularité compte plus que le nombre de produits.',
      'Buvez au moins 1,5 L d’eau par jour et dormez suffisamment : l’éclat vient aussi de l’intérieur.',
    ].filter(Boolean);
    const summary = `Bonjour ! Voici mon diagnostic en ligne : ${tName}${A.sens === 'oui' ? ', sensible' : ''}. Préoccupations : ${c.join(', ') || 'aucune'}. J’aimerais un conseil personnalisé.`;
    result = (
      <div className="result card">
        <div className="result__head"><span className="result__badge"><Icon n="face" /></span><div><p className="eyebrow">Votre profil</p><h2 className="h2">{tName}{A.sens === 'oui' && <> <em>& sensible</em></>}</h2></div></div>
        <p className="lead">{tDesc}</p>
        <h3 className="h3">Nos conseils d’expertes</h3>
        <ul className="tips" data-stagger="80">{tips.map((t) => <li key={t}><Icon n="check" /><span>{t}</span></li>)}</ul>
        {prods.length > 0 && <><h3 className="h3">Les produits adaptés à votre peau</h3><div className="pgrid pgrid--4" data-stagger="80">{prods.map((p) => <ProductCard key={p.id} p={p} />)}</div></>}
        {servs.length > 0 && <><h3 className="h3">Les soins recommandés</h3><div className="mini-services" data-stagger="80">{servs.map((sv) => (
          <a key={sv.id} href={`/reservation?service=${sv.id}`} className="mini-svc" style={{ '--c': CATS[sv.category]?.color }}><span className="opt__ic"><Icon n={CATS[sv.category]?.icon} /></span><span><strong>{sv.name}</strong><small>{fdur(sv.duration)} · {money(sv.price)}</small></span><Icon n="arrow" /></a>))}</div></>}
        <div className="result__cta"><a className="btn btn-gold" target="_blank" rel="noopener" href={waMain(summary)}><Icon n="whatsapp" /> Recevoir ma routine sur WhatsApp</a>
          <a href="/reservation" className="btn btn-primary"><Icon n="calendar" /> Diagnostic approfondi sur place</a>
          <button className="btn btn-ghost" onClick={restart}><Icon n="refresh" /> Recommencer</button></div>
        <p className="muted small">Ce diagnostic en ligne est indicatif et ne remplace pas l’avis d’un dermatologue.</p>
      </div>
    );
  }

  return <>
    <PageHero eyebrow="Diagnostic de peau gratuit" title="Votre peau, *enfin comprise*" sub="6 questions, 1 minute : recevez votre profil de peau, des conseils d’expertes et une sélection sur-mesure." crumbs={[[null, 'Diagnostic']]} cls="phero--sm" />
    <section className="section section--tight"><div className="container narrow">
      <div className={cx('quiz card', done && 'done')} data-reveal ref={quiz}>
        <div className="quiz__top"><span className="quiz__count"><strong>{idx + 1}</strong> / {QUIZ.length}</span><div className="quiz__bar"><span style={{ transform: `scaleX(${done ? 1 : idx / QUIZ.length})` }} /></div></div>
        <div className="quiz__stage">
          <div className="quiz__q" style={{ '--dir': dir }} key={idx}>
            <h3>{q.q}</h3>{q.sub && <p className="muted small">{q.sub}</p>}
            <div className="quiz__opts">{q.o.map(([v, l, i], k) => (
              <button type="button" key={v} className={cx('qopt', (q.multi ? sel.includes(v) : sel === v) && 'sel')} style={{ '--i': k }} onClick={() => choose(v)}>
                <span className="qopt__ic"><Icon n={i} /></span><span>{l}</span><span className="qopt__ck"><Icon n="check" /></span></button>))}</div>
            <div className="quiz__nav">{idx ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => show(idx - 1, -1)}><Icon n="arrowL" /> Précédent</button> : <span />}
              {q.multi && <button type="button" className="btn btn-primary btn-sm" disabled={!sel.length} onClick={next}>Continuer <Icon n="arrow" /></button>}</div>
          </div>
        </div>
      </div>
      <div className="quiz__result" ref={res}>{result}</div>
    </div></section>
  </>;
}

/* ================================================================ 404 */
export const NotFound = () => (
  <section className="nf"><div className="container center">
    <div className="nf__num" data-reveal="zoom">404</div>
    <Split as="h1" className="h2" text="Cette page s’est *évaporée*" />
    <p className="lead" data-reveal>Elle n’existe pas ou a été déplacée. Laissez-nous vous guider.</p>
    <div className="row-wrap center" data-reveal><a href="/" className="btn btn-primary"><Icon n="home" /> Accueil</a><a href="/reservation" className="btn btn-ghost">Prendre rendez-vous</a></div>
  </div></section>
);

