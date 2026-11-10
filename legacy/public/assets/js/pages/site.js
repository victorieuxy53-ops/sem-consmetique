/* Pages vitrine : accueil, à propos, prestations, contact, conseils, diagnostic. */
import { $, $$, esc, api, state, icon, money, num, fdur, fdate, fshort, cap, CATS, md, paras, modal, toast, formData, busy, telHref, waMain, phones, openStatus, DAYS, localNow, go } from '../core.js';
import { productArt, productVisual, spinBadge, stars, avatar, cover, logoMark } from '../art.js';
import { particles, reveal, refresh } from '../anim.js';
import { pageHero, secHead, productCard, bindAdd, serviceCard, courseCard, eventCard, postCard, callbackForm, bindCallback, reviewModal, empty } from './ui.js';
import { bindEvents } from './booking.js';

const emph = (s) => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');
const todayStr = () => localNow().toISOString().slice(0, 10);

/* ================================================================ ACCUEIL */
export async function home() {
  const d = await api('/api/home');
  const s = state.settings, st = s.stats || {}, st0 = openStatus();
  const tel = phones()[0];
  const next = d.next ? `${d.next.date === todayStr() ? 'Aujourd’hui' : cap(fdate(d.next.date, { weekday: 'long', day: 'numeric', month: 'short' }))} à ${d.next.time.replace(':', 'h')}` : 'Sur rendez-vous';
  const heroColors = d.products.filter((p) => !p.image && ['serum', 'jar', 'pump', 'oil', 'bottle'].includes(p.art)).slice(0, 2);
  const marquee = ['Soins du visage', 'Soins du corps', 'Cosmetics', 'Make-up', 'Attache foulard', 'Santé & bien-être', 'Dermo-conseils', 'Formations vidéo'];
  let stopParticles = () => {}, timer = 0;

  const html = `
  <section class="hero">
    <canvas class="hero__particles" aria-hidden="true"></canvas>
    <div class="hero__blobs" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span></div>
    <div class="container hero__grid">
      <div class="hero__text">
        <p class="eyebrow" data-reveal>${icon('sparkle')} ${esc(s.tagline)}${s.city ? ' · ' + esc(s.city) : ''}</p>
        <h1 class="hero__title" data-split>${emph(s.hero_title)}</h1>
        <p class="hero__sub" data-reveal data-delay="450">${esc(s.hero_sub)}</p>
        <div class="hero__cta" data-reveal data-delay="600">
          <a href="/reservation" class="btn btn-primary btn-lg" data-magnetic>${icon('calendar')} Prendre rendez-vous</a>
          ${tel ? `<a href="${telHref(tel)}" class="btn btn-ghost btn-lg" data-external data-magnetic>${icon('phone')} Appeler</a>` : ''}
        </div>
        <div class="hero__trust" data-reveal data-delay="750">
          <div class="avatars">${['Aïcha', 'Fifamè', 'Grâce', 'Sènami'].map((n, i) => avatar(n, ['#c49a5a', '#9b4d6e', '#b8432f', '#5f9e8f'][i])).join('')}</div>
          <div><strong>${icon('star')} ${String(st.rating).replace('.', ',')}/5</strong><span>Plus de ${num(st.clients)} clientes nous font confiance</span></div>
        </div>
      </div>
      <div class="hero__visual" data-reveal="zoom" data-delay="200">
        <div class="arch">
          <div class="arch__in">
            ${s.hero_image ? `<img class="arch__img" src="${esc(s.hero_image)}" alt="">` : `
            <span class="arch__sun"></span><span class="arch__ring r1"></span><span class="arch__ring r2"></span>
            <div class="hv hv1" data-depth="-22"><div class="floaty">${productArt(heroColors[0]?.art || 'serum', heroColors[0]?.color || '#e8a54b')}</div></div>
            <div class="hv hv2" data-depth="14"><div class="floaty f2">${productArt(heroColors[1]?.art || 'jar', heroColors[1]?.color || '#d9b38c')}</div></div>
            <div class="hv hv3" data-depth="-10"><div class="floaty f3">${productArt('lipstick', '#7b2d42')}</div></div>
            <svg class="arch__leaf" viewBox="0 0 100 100" aria-hidden="true"><path d="M10 90C20 40 50 15 92 8 86 52 60 82 10 90z"/><path d="M10 90 70 30" /></svg>`}
          </div>
        </div>
        ${spinBadge('INSTITUT DE BEAUTÉ ✦ SOINS ✦ MAKE-UP ✦ ')}
        <a href="/reservation" class="hcard hcard--slot" data-depth="26"><span class="hcard__ic">${icon('calendar')}</span><span><small>Prochain créneau libre</small><strong>${esc(next)}</strong></span></a>
        <div class="hcard hcard--rate" data-depth="-16">${stars(5)}<span><strong>${num(st.clients)}+ clientes</strong><small>${esc(st0.label)}</small></span></div>
      </div>
    </div>
    <a href="#univers" class="scroll-hint" aria-label="Défiler"><span></span></a>
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee__track">${[0, 1].map(() => marquee.map((m) => `<span>${m}</span><i>✦</i>`).join('')).join('')}</div></div>

  <section class="section" id="univers">
    <div class="container">
      ${secHead({ eyebrow: 'Nos univers', title: 'Six expertises, <em>une seule</em> exigence', sub: 'Du soin du visage à l’attache foulard de cérémonie, chaque prestation est réalisée avec des protocoles adaptés aux peaux noires et métissées.', cls: 'center' })}
      <div class="universes" data-stagger="90">
        ${Object.entries(CATS).map(([k, c], i) => `<a href="/prestations?cat=${k}" class="uni" style="--c:${c.color}" data-tilt="10" data-cursor="Explorer">
          <span class="uni__glow"></span><span class="uni__num">0${i + 1}</span>
          <span class="uni__ic">${icon(c.icon)}</span><h3>${c.label}</h3><p>${c.desc}</p><span class="uni__go">${icon('arrowUR')}</span></a>`).join('')}
      </div>
    </div>
  </section>

  <section class="stats">
    <div class="container stats__grid" data-stagger="120">
      <div class="stat"><strong><span data-count="${+st.years || 0}">0</span><sup>+</sup></strong><span>années d’expérience</span></div>
      <div class="stat"><strong><span data-count="${+st.clients || 0}">0</span><sup>+</sup></strong><span>clientes accompagnées</span></div>
      <div class="stat"><strong><span data-count="${d.counts.services}">0</span></strong><span>prestations sur-mesure</span></div>
      <div class="stat"><strong><span data-count="${+st.rating || 5}">0</span><sup>/5</sup></strong><span>note moyenne</span></div>
    </div>
  </section>

  ${d.services.length ? `<section class="section">
    <div class="container">
      ${secHead({ eyebrow: 'Les incontournables', title: 'Nos soins <em>signature</em>', cls: 'sec-head--split', side: `<a href="/prestations" class="link-arrow" data-reveal>Toutes les prestations ${icon('arrow')}</a>` })}
      <div class="srows" data-stagger="70">
        ${d.services.map((sv, i) => `<a href="/reservation?service=${sv.id}" class="srow" data-cat="${esc(sv.category)}" data-cursor="Réserver" style="--c:${CATS[sv.category]?.color}">
          <span class="srow__n">${String(i + 1).padStart(2, '0')}</span>
          <span class="srow__name">${esc(sv.name)}<small>${esc(CATS[sv.category]?.label || '')}</small></span>
          <span class="srow__dur">${icon('clock')} ${fdur(sv.duration)}</span>
          <span class="srow__price">${sv.price ? money(sv.price) : 'Sur devis'}</span>
          <span class="srow__go">${icon('arrowUR')}</span></a>`).join('')}
      </div>
    </div>
    <div class="srow-preview" aria-hidden="true"></div>
  </section>` : ''}

  <section class="diag-cta">
    <div class="container diag-cta__in">
      <div class="orbit" aria-hidden="true" data-reveal="zoom">
        <span class="orbit__ring"></span><span class="orbit__ring r2"></span>
        <span class="orbit__arm"><span class="orbit__dot">${icon('drop')}</span></span>
        <span class="orbit__arm a2"><span class="orbit__dot">${icon('sparkle')}</span></span>
        <span class="orbit__arm a3"><span class="orbit__dot">${icon('leaf')}</span></span>
        <span class="orbit__core">${icon('face')}</span>
      </div>
      <div class="diag-cta__txt">
        <p class="eyebrow light" data-reveal>Dermo-conseil en ligne · gratuit</p>
        <h2 class="h2 light" data-split>Quelle routine pour <em>votre peau</em> ?</h2>
        <p data-reveal data-delay="200">Répondez à 6 questions et recevez instantanément votre profil de peau, nos conseils d’expertes et une sélection de soins et produits adaptés.</p>
        <a href="/diagnostic" class="btn btn-gold btn-lg" data-magnetic data-reveal data-delay="300">${icon('sparkle')} Faire mon diagnostic (1 min)</a>
      </div>
    </div>
  </section>

  ${d.products.length ? `<section class="section section--sand">
    <div class="container" data-hs-wrap>
      ${secHead({ eyebrow: 'La boutique', title: 'Les essentiels de <em>votre routine</em>', cls: 'sec-head--split', side: `<div class="hs-nav" data-reveal><button class="icon-btn" data-hs-prev aria-label="Précédent">${icon('arrowL')}</button><button class="icon-btn" data-hs-next aria-label="Suivant">${icon('arrow')}</button></div>` })}
      <div class="hscroll" data-hscroll data-stagger="70">${d.products.map((p) => `<div class="hscroll__item">${productCard(p)}</div>`).join('')}</div>
      <div class="center mt"><a href="/boutique" class="btn btn-ghost">Voir toute la boutique ${icon('arrow')}</a></div>
    </div>
  </section>` : ''}

  ${d.courses.length ? `<section class="section learn-band">
    <div class="container learn-band__grid">
      <div class="learn-band__txt">
        <p class="eyebrow" data-reveal>Académie en ligne</p>
        <h2 class="h2" data-split>Apprenez avec nos expertes, <em>à votre rythme</em></h2>
        <p class="lead" data-reveal data-delay="200">Attache foulard, maquillage professionnel, soin de la peau : nos formations vidéo vous transmettent les gestes et secrets de l’institut.</p>
        <ul class="feats" data-stagger="90">
          <li>${icon('film')} Vidéos HD filmées en gros plan</li><li>${icon('infinity')} Accès illimité, à vie</li>
          <li>${icon('smartphone')} Sur téléphone, tablette ou ordinateur</li><li>${icon('wallet')} Paiement simple par Mobile Money</li>
        </ul>
        <a href="/formations" class="btn btn-primary" data-magnetic data-reveal>${icon('play')} Découvrir les formations</a>
      </div>
      <div class="learn-band__cards" data-stagger="130">${d.courses.map(courseCard).join('')}</div>
    </div>
  </section>` : ''}

  ${d.events.length ? `<section class="section">
    <div class="container">
      ${secHead({ eyebrow: 'Ateliers & masterclass', title: 'Réservez <em>votre place</em>', cls: 'sec-head--split', side: `<a href="/ateliers" class="link-arrow" data-reveal>Tous les ateliers ${icon('arrow')}</a>` })}
      <div class="ecards" data-stagger="120">${d.events.map(eventCard).join('')}</div>
    </div>
  </section>` : ''}

  ${d.reviews.length ? `<section class="section testi">
    <div class="container">
      ${secHead({ eyebrow: 'Elles nous font confiance', title: 'Leurs mots, <em>notre fierté</em>', cls: 'center' })}
      <div class="testi__slider" data-reveal>
        <span class="testi__q">${icon('quote')}</span>
        <div class="testi__track">${d.reviews.map((r, i) => `<figure class="testi__item ${i ? '' : 'active'}"><blockquote>${esc(r.text)}</blockquote>
          <figcaption>${avatar(r.name, ['#c49a5a', '#9b4d6e', '#b8432f', '#5f9e8f', '#7b2d42'][i % 5])}<span><strong>${esc(r.name)}</strong><small>${esc(r.service || '')}</small></span>${stars(r.rating)}</figcaption></figure>`).join('')}</div>
        <div class="testi__dots">${d.reviews.map((_, i) => `<button class="${i ? '' : 'active'}" data-i="${i}" aria-label="Avis ${i + 1}"></button>`).join('')}</div>
      </div>
      <div class="center mt"><button class="btn btn-ghost" data-review>${icon('edit')} Laisser un avis</button></div>
    </div>
  </section>` : ''}

  ${d.gallery.length ? `<section class="section section--sand">
    <div class="container">
      ${secHead({ eyebrow: 'Nos réalisations', title: 'La galerie <em>beauté</em>', cls: 'center' })}
      <div class="masonry" data-stagger="60">${d.gallery.map((g, i) => `<button class="mitem" data-g="${i}" data-cursor="${g.after_image ? 'Avant/Après' : 'Voir'}"><img src="${esc(g.image)}" alt="${esc(g.title || '')}" loading="lazy">${g.title ? `<span>${esc(g.title)}</span>` : ''}</button>`).join('')}</div>
    </div>
  </section>` : ''}

  ${d.posts.length ? `<section class="section">
    <div class="container">
      ${secHead({ eyebrow: 'Dermo-conseils', title: 'Le journal <em>beauté</em>', cls: 'sec-head--split', side: `<a href="/conseils" class="link-arrow" data-reveal>Tous les conseils ${icon('arrow')}</a>` })}
      <div class="bcards" data-stagger="110">${d.posts.map(postCard).join('')}</div>
    </div>
  </section>` : ''}

  <section class="section call-band">
    <div class="container call-band__grid">
      <div>
        <p class="eyebrow light" data-reveal>Un conseil, une question ?</p>
        <h2 class="h2 light" data-split>Une experte <em>vous répond</em></h2>
        <p class="call-band__status" data-reveal><span class="open-dot ${st0.open ? 'on' : ''}"></span> ${esc(st0.label)}</p>
        <div class="call-band__phones" data-stagger="120">${phones().map((p) => `<a href="${telHref(p)}" class="bigphone" data-external>${icon('phone')}<span>${esc(p)}</span></a>`).join('')}</div>
        <a href="${waMain('Bonjour, j’ai une question.')}" target="_blank" rel="noopener" class="btn btn-gold" data-reveal>${icon('whatsapp')} Écrire sur WhatsApp</a>
      </div>
      <div data-reveal="left">${callbackForm()}</div>
    </div>
  </section>`;

  return {
    html,
    mount(root) {
      stopParticles = particles($('.hero__particles', root));
      bindAdd(root, d.products);
      bindEvents(root, d.events);
      bindCallback(root);
      $('[data-review]', root)?.addEventListener('click', reviewModal);

      // Carrousel d'avis
      const items = $$('.testi__item', root), dots = $$('.testi__dots button', root);
      let i = 0;
      const show = (n) => { i = (n + items.length) % items.length; items.forEach((x, k) => x.classList.toggle('active', k === i)); dots.forEach((x, k) => x.classList.toggle('active', k === i)); };
      if (items.length > 1) {
        timer = setInterval(() => show(i + 1), 6000);
        dots.forEach((b) => b.addEventListener('click', () => { clearInterval(timer); show(+b.dataset.i); timer = setInterval(() => show(i + 1), 6000); }));
      }

      // Aperçu flottant des soins signature
      const pv = $('.srow-preview', root);
      if (pv && matchMedia('(pointer: fine)').matches) {
        $$('.srow', root).forEach((row) => {
          row.addEventListener('pointerenter', () => {
            const c = CATS[row.dataset.cat] || {};
            pv.style.setProperty('--c', c.color);
            pv.innerHTML = `<span class="srow-preview__ic">${icon(c.icon || 'sparkle')}</span><span>${esc(c.label || '')}</span>`;
            pv.classList.add('show');
          });
          row.addEventListener('pointerleave', () => pv.classList.remove('show'));
          row.addEventListener('pointermove', (e) => { pv.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 80}px)`; });
        });
      }

      // Galerie
      $$('.mitem', root).forEach((b) => b.addEventListener('click', () => lightbox(d.gallery[+b.dataset.g])));
    },
    unmount() { stopParticles(); clearInterval(timer); },
  };
}

function lightbox(g) {
  const m = modal({
    size: 'modal--lg modal--media',
    html: g.after_image
      ? `<div class="ba" style="--p:50%"><img src="${esc(g.after_image)}" alt="Après"><div class="ba__before"><img src="${esc(g.image)}" alt="Avant"></div>
         <span class="ba__tag l">Avant</span><span class="ba__tag r">Après</span><input type="range" min="0" max="100" value="50" aria-label="Comparer avant / après"><span class="ba__handle"></span></div>${g.title ? `<p class="center mt">${esc(g.title)}</p>` : ''}`
      : `<img class="lb-img" src="${esc(g.image)}" alt="${esc(g.title || '')}">${g.title ? `<p class="center mt">${esc(g.title)}</p>` : ''}`,
  });
  const r = $('.ba input', m.body);
  r?.addEventListener('input', () => $('.ba', m.body).style.setProperty('--p', r.value + '%'));
}

/* ================================================================ À PROPOS */
export async function about() {
  const s = state.settings, st = s.stats || {};
  const values = [
    ['award', 'Expertise', 'Des esthéticiennes et maquilleuses formées en continu aux dernières techniques.'],
    ['heart', 'Bienveillance', 'Un accueil chaleureux, une écoute sincère, zéro jugement. Ici, vous êtes chez vous.'],
    ['shield', 'Hygiène irréprochable', 'Matériel stérilisé, linge à usage unique, protocoles stricts à chaque soin.'],
    ['leaf', 'Produits choisis', 'Des formules testées, respectueuses de la peau, et des produits locaux de qualité.'],
  ];
  const steps = [
    ['Diagnostic', 'Nous prenons le temps de comprendre votre peau, vos envies et votre quotidien.'],
    ['Protocole sur-mesure', 'Nous construisons un soin adapté à votre type de peau et à vos objectifs.'],
    ['Le soin', 'Vous profitez d’un véritable moment de détente entre des mains expertes.'],
    ['Le suivi', 'Conseils de routine, suivi sur WhatsApp et ajustements au fil des séances.'],
  ];
  return {
    title: 'À propos',
    html: `${pageHero({ eyebrow: 'Notre histoire', title: 'Une passion, <em>une exigence</em>', sub: `${esc(s.site_name)} — ${esc(s.tagline)} dédié à la beauté authentique et au bien-être de chaque femme.`, crumbs: [[null, 'À propos']] })}
    <section class="section">
      <div class="container story">
        <div class="story__visual" data-reveal="zoom">
          ${s.about_image ? `<img src="${esc(s.about_image)}" alt="L’institut" data-parallax="0.06">` : `<div class="story__art">${logoMark('story__mark')}<span class="story__orb"></span>${productArt('oil', '#d4a373')}</div>`}
          <div class="story__badge">${spinBadge('DEPUIS ' + (new Date().getFullYear() - (+st.years || 0)) + ' ✦ AVEC PASSION ✦ ', 'heart')}</div>
        </div>
        <div class="story__txt">
          <p class="eyebrow" data-reveal>Qui sommes-nous</p>
          <h2 class="h2" data-split>La beauté qui vous <em>ressemble</em></h2>
          <div class="prose" data-reveal data-delay="200">${paras(s.about_story)}</div>
          <div class="row-wrap" data-reveal data-delay="300"><a href="/reservation" class="btn btn-primary" data-magnetic>Prendre rendez-vous</a><a href="/contact" class="btn btn-ghost">Nous rendre visite</a></div>
        </div>
      </div>
    </section>
    <section class="section section--sand">
      <div class="container">
        ${secHead({ eyebrow: 'Nos valeurs', title: 'Ce qui nous <em>anime</em>', cls: 'center' })}
        <div class="values" data-stagger="100">${values.map(([i, t, p]) => `<div class="value" data-tilt="8"><span class="value__ic">${icon(i)}</span><h3>${t}</h3><p>${p}</p></div>`).join('')}</div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        ${secHead({ eyebrow: 'Votre parcours beauté', title: 'Quatre étapes, <em>un résultat</em>', cls: 'center' })}
        <ol class="timeline" data-stagger="150">${steps.map(([t, p], i) => `<li><span class="timeline__n">${i + 1}</span><h3>${t}</h3><p>${p}</p></li>`).join('')}</ol>
      </div>
    </section>
    <section class="stats">
      <div class="container stats__grid" data-stagger="120">
        <div class="stat"><strong><span data-count="${+st.years || 0}">0</span><sup>+</sup></strong><span>années d’expérience</span></div>
        <div class="stat"><strong><span data-count="${+st.clients || 0}">0</span><sup>+</sup></strong><span>clientes accompagnées</span></div>
        <div class="stat"><strong><span data-count="6">0</span></strong><span>univers d’expertise</span></div>
        <div class="stat"><strong><span data-count="${+st.rating || 5}">0</span><sup>/5</sup></strong><span>satisfaction</span></div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        ${secHead({ eyebrow: 'Nos expertises', title: 'Tout pour votre <em>beauté</em>', cls: 'center' })}
        <div class="universes universes--sm" data-stagger="80">${Object.entries(CATS).map(([k, c]) => `<a href="/prestations?cat=${k}" class="uni" style="--c:${c.color}" data-tilt="8"><span class="uni__glow"></span><span class="uni__ic">${icon(c.icon)}</span><h3>${c.label}</h3><p>${c.desc}</p><span class="uni__go">${icon('arrowUR')}</span></a>`).join('')}</div>
      </div>
    </section>`,
  };
}

/* ============================================================== PRESTATIONS */
export async function services({ query }) {
  const list = await api('/api/services');
  const cat = CATS[query.cat] ? query.cat : 'all';
  const count = (k) => list.filter((s) => s.category === k).length;
  return {
    title: 'Prestations & tarifs',
    html: `${pageHero({ eyebrow: 'Prestations & tarifs', title: 'L’art du soin, <em>sur-mesure</em>', sub: 'Visage, corps, make-up, attache foulard, santé et dermo-conseils : découvrez nos prestations et réservez en ligne en quelques clics.', crumbs: [[null, 'Prestations']] })}
    <section class="section section--tight">
      <div class="container">
        <div class="tabs-sticky"><div class="tabs" data-tabs>
          <button class="tab ${cat === 'all' ? 'active' : ''}" data-c="all">Tout <sup>${list.length}</sup></button>
          ${Object.entries(CATS).filter(([k]) => count(k)).map(([k, c]) => `<button class="tab ${cat === k ? 'active' : ''}" data-c="${k}">${icon(c.icon)} ${c.label} <sup>${count(k)}</sup></button>`).join('')}
          <span class="tabs__ink"></span></div></div>
        <div class="scards" data-stagger="60">${list.map(serviceCard).join('')}</div>
        <div class="note card" data-reveal>${icon('info')}<div><strong>Un doute sur le soin le plus adapté ?</strong><p class="muted">Faites notre <a href="/diagnostic">diagnostic de peau en ligne</a> ou réservez une consultation dermo-conseil. Nous vous orientons toujours vers le soin dont vous avez réellement besoin.</p></div></div>
      </div>
    </section>`,
    mount(root) {
      const tabs = $('[data-tabs]', root), ink = $('.tabs__ink', root);
      const moveInk = () => { const a = $('.tab.active', tabs); if (a) { ink.style.width = a.offsetWidth + 'px'; ink.style.transform = `translateX(${a.offsetLeft}px)`; } };
      const apply = (c, animate) => {
        $$('.scard', root).forEach((el, i) => {
          const show = c === 'all' || el.dataset.cat === c;
          el.hidden = !show;
          if (show && animate) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = `popIn .6s var(--ease) ${Math.min(i, 8) * 50}ms both`; }
        });
      };
      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-c]');
        if (!b) return;
        $$('.tab', tabs).forEach((t) => t.classList.toggle('active', t === b));
        moveInk();
        apply(b.dataset.c, true);
        b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        history.replaceState({}, '', b.dataset.c === 'all' ? '/prestations' : `/prestations?cat=${b.dataset.c}`);
      });
      apply(cat, false);
      requestAnimationFrame(moveInk);
      addEventListener('resize', moveInk);
      this.unmount = () => removeEventListener('resize', moveInk);
    },
  };
}

/* ================================================================== CONTACT */
const FAQ = () => {
  const s = state.settings;
  return [
    ['Comment prendre rendez-vous ?', 'En ligne 24 h/24 depuis la page Réservation, par téléphone ou sur WhatsApp. Vous recevez une référence et nous vous confirmons rapidement.'],
    ['Puis-je annuler ou déplacer mon rendez-vous ?', 'Oui, depuis votre espace client ou en nous appelant, idéalement au moins 24 h à l’avance.'],
    ['Quels moyens de paiement acceptez-vous ?', `Espèces et Mobile Money (${(s.momo || []).map((m) => m.network).join(', ') || 'MTN MoMo, Moov Money'}).`],
    ['Livrez-vous les produits ?', `Oui : livraison à domicile (${money(s.delivery_fee)}${s.free_delivery_from ? `, offerte dès ${money(s.free_delivery_from)} d’achat` : ''}) ou retrait gratuit à l’institut.`],
    ['Comment accéder aux formations vidéo ?', 'Créez votre compte, réglez par Mobile Money puis indiquez la référence de la transaction : votre accès est activé dès vérification, pour toujours.'],
    ['Vos soins conviennent-ils aux peaux sensibles ?', 'Chaque soin commence par un diagnostic. Nous adaptons les produits et, si besoin, nous vous orientons vers un dermatologue.'],
  ];
};

export async function contact() {
  const s = state.settings, st = openStatus();
  const wd = localNow().getUTCDay();
  return {
    title: 'Contact',
    html: `${pageHero({ eyebrow: 'Contact', title: 'Parlons de <em>vous</em>', sub: 'Une question, un conseil, un devis ? Appelez-nous, écrivez-nous ou passez nous voir : nous serons ravies de vous répondre.', crumbs: [[null, 'Contact']] })}
    <section class="section section--tight">
      <div class="container contact">
        <div class="contact__info" data-stagger="90">
          ${phones().map((p, i) => `<a href="${telHref(p)}" class="ccard-info" data-external><span class="ccard-info__ic">${icon('phone')}</span><span><small>Téléphone ${phones().length > 1 ? i + 1 : ''}</small><strong>${esc(p)}</strong></span>${icon('arrowUR')}</a>`).join('')}
          <a href="${waMain('Bonjour !')}" target="_blank" rel="noopener" class="ccard-info"><span class="ccard-info__ic ic--wa">${icon('whatsapp')}</span><span><small>WhatsApp</small><strong>Réponse rapide</strong></span>${icon('arrowUR')}</a>
          ${s.email ? `<a href="mailto:${esc(s.email)}" class="ccard-info" data-external><span class="ccard-info__ic">${icon('mail')}</span><span><small>E-mail</small><strong>${esc(s.email)}</strong></span>${icon('arrowUR')}</a>` : ''}
          ${s.address || s.city ? `<div class="ccard-info"><span class="ccard-info__ic">${icon('pin')}</span><span><small>Adresse</small><strong>${esc([s.address, s.city].filter(Boolean).join(', '))}</strong></span></div>` : ''}
          <div class="hours card">
            <h3>${icon('clock')} Horaires <span class="pill ${st.open ? 'pill--ok' : 'pill--bad'}"><span class="open-dot ${st.open ? 'on' : ''}"></span>${esc(st.label)}</span></h3>
            <ul>${[1, 2, 3, 4, 5, 6, 0].map((d) => { const h = s.hours?.[d]; return `<li class="${d === wd ? 'today' : ''}"><span>${DAYS[d]}</span><span>${h ? `${h[0].replace(':', 'h')} – ${h[1].replace(':', 'h')}` : 'Fermé'}</span></li>`; }).join('')}</ul>
          </div>
        </div>
        <div class="contact__form card" data-reveal="left">
          <div class="seg seg--wide" data-seg><button type="button" class="active" data-k="contact">${icon('mail')} Écrire un message</button><button type="button" data-k="rappel">${icon('phone')} Être rappelée</button><span class="seg__ink"></span></div>
          <form class="stack" data-contact data-kind="contact">
            <div class="grid-2"><label class="field"><input name="name" required placeholder=" " autocomplete="name"><span>Nom complet</span></label>
            <label class="field"><input name="phone" type="tel" placeholder=" " autocomplete="tel"><span>Téléphone</span></label></div>
            <label class="field" data-only="contact"><input name="email" type="email" placeholder=" " autocomplete="email"><span>E-mail</span></label>
            <label class="field field--select" data-only="contact"><select name="subject"><option>Renseignement</option><option>Prise de rendez-vous</option><option>Devis mariage / événement</option><option>Commande / livraison</option><option>Formations</option><option>Partenariat</option><option>Autre</option></select><span>Sujet</span></label>
            <label class="field field--select" data-only="rappel" hidden><select name="when"><option>Dès que possible</option><option>Ce matin</option><option>Cet après-midi</option><option>Ce soir</option><option>Demain</option></select><span>Quand souhaitez-vous être rappelée ?</span></label>
            <label class="field"><textarea name="message" rows="5" placeholder=" "></textarea><span>Votre message</span></label>
            <button class="btn btn-primary btn-lg btn-block">${icon('send')} Envoyer</button>
          </form>
        </div>
      </div>
      ${s.map_embed ? `<div class="container"><div class="map" data-reveal><iframe src="${esc(s.map_embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Plan d’accès"></iframe></div></div>` : ''}
    </section>
    <section class="section section--sand">
      <div class="container narrow">
        ${secHead({ eyebrow: 'Questions fréquentes', title: 'Vous vous <em>demandez</em>…', cls: 'center' })}
        <div class="faq" data-stagger="70">${FAQ().map(([q, a]) => `<details class="faq__item"><summary>${esc(q)}<span>${icon('plus')}</span></summary><div class="faq__a"><p>${esc(a)}</p></div></details>`).join('')}</div>
      </div>
    </section>`,
    mount(root) {
      const form = $('[data-contact]', root), seg = $('[data-seg]', root);
      const ink = () => { const a = $('button.active', seg); const i = $('.seg__ink', seg); i.style.width = a.offsetWidth + 'px'; i.style.transform = `translateX(${a.offsetLeft - 4}px)`; };
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('[data-k]');
        if (!b) return;
        $$('button', seg).forEach((x) => x.classList.toggle('active', x === b));
        form.dataset.kind = b.dataset.k;
        $$('[data-only]', form).forEach((el) => { el.hidden = el.dataset.only !== b.dataset.k; });
        form.phone.required = b.dataset.k === 'rappel';
        form.message.required = b.dataset.k === 'contact';
        ink();
      });
      requestAnimationFrame(ink);
      form.message.required = true;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = formData(form), kind = form.dataset.kind;
        await busy(form.querySelector('button'), async () => {
          try {
            await api('/api/contact', { method: 'POST', body: kind === 'rappel' ? { kind, name: d.name, phone: d.phone, subject: 'Demande de rappel', message: `Créneau : ${d.when}${d.message ? ' — ' + d.message : ''}` } : { kind, ...d } });
            form.reset();
            toast(kind === 'rappel' ? 'C’est noté, nous vous rappelons très vite !' : 'Message envoyé ! Nous vous répondons rapidement.');
          } catch (err) { toast(err.message, 'err'); }
        });
      });
      // Accordéon animé
      $$('.faq__item', root).forEach((d) => d.querySelector('summary').addEventListener('click', (e) => {
        e.preventDefault();
        const a = d.querySelector('.faq__a');
        if (d.open) {
          a.animate([{ height: a.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'ease' }).onfinish = () => { d.open = false; };
        } else {
          d.open = true;
          a.animate([{ height: '0px', opacity: 0 }, { height: a.scrollHeight + 'px', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
        }
      }));
    },
  };
}

/* ================================================================ CONSEILS */
export async function blog() {
  const posts = await api('/api/posts');
  const cats = [...new Set(posts.map((p) => p.category).filter(Boolean))];
  return {
    title: 'Conseils beauté',
    html: `${pageHero({ eyebrow: 'Le journal beauté', title: 'Dermo-conseils & <em>secrets d’expertes</em>', sub: 'Routines, actifs, make-up, attache foulard : nos conseils honnêtes pour prendre soin de vous au quotidien.', crumbs: [[null, 'Conseils']] })}
    <section class="section section--tight"><div class="container">
      ${cats.length > 1 ? `<div class="chips center" data-chips><button class="chip active" data-c="">Tous</button>${cats.map((c) => `<button class="chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      <div class="bcards" data-stagger="90">${posts.map((p) => postCard(p).replace('class="bcard"', `class="bcard" data-cat="${esc(p.category || '')}"`)).join('')}</div>
      ${posts.length ? '' : empty('Les premiers articles arrivent bientôt.', 'book')}
    </div></section>`,
    mount(root) {
      $('[data-chips]', root)?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-c]');
        if (!b) return;
        $$('[data-chips] .chip', root).forEach((x) => x.classList.toggle('active', x === b));
        $$('.bcard', root).forEach((c, i) => { const show = !b.dataset.c || c.dataset.cat === b.dataset.c; c.hidden = !show; if (show) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = `popIn .6s var(--ease) ${i * 60}ms both`; } });
      });
    },
  };
}

export async function post({ params }) {
  const { post: p, more } = await api(`/api/posts/${encodeURIComponent(params.slug)}`);
  const url = location.origin + '/conseils/' + p.slug;
  return {
    title: p.title,
    html: `<article class="article">
      <header class="article__head">
        <div class="phero__bg" aria-hidden="true"><span class="orb o1" data-parallax="0.15"></span><span class="orb o2"></span></div>
        <div class="container narrow">
          <nav class="crumbs" data-reveal><a href="/">Accueil</a><span>/</span><a href="/conseils">Conseils</a></nav>
          <span class="bcard__cat" data-reveal>${esc(p.category || 'Conseil')}</span>
          <h1 class="h1" data-split>${esc(p.title)}</h1>
          <p class="muted" data-reveal data-delay="300">${fshort(p.created_at)} · ${p.read_time || 4} min de lecture</p>
        </div>
      </header>
      <div class="container narrow">
        <div class="article__cover" data-reveal="zoom">${cover(p, { label: p.category, iconName: 'book' })}</div>
        <p class="article__lead" data-reveal>${esc(p.excerpt || '')}</p>
        <div class="prose" data-reveal>${md(p.content)}</div>
        <div class="share" data-reveal><span>Partager :</span>
          <a href="https://wa.me/?text=${encodeURIComponent(p.title + ' ' + url)}" target="_blank" rel="noopener" class="icon-btn" aria-label="WhatsApp">${icon('whatsapp')}</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener" class="icon-btn" aria-label="Facebook">${icon('facebook')}</a>
          <button class="icon-btn" data-copy-link aria-label="Copier le lien">${icon('copy')}</button></div>
        <div class="article__cta card" data-reveal><div><h3>Besoin d’un avis personnalisé ?</h3><p class="muted">Nos expertes analysent votre peau et vous proposent une routine adaptée.</p></div>
          <div class="row-wrap"><a href="/reservation" class="btn btn-primary">Réserver une consultation</a><a href="/diagnostic" class="btn btn-ghost">Diagnostic en ligne</a></div></div>
      </div>
    </article>
    ${more.length ? `<section class="section"><div class="container">${secHead({ eyebrow: 'À lire aussi', title: 'D’autres <em>conseils</em>' })}<div class="bcards" data-stagger="90">${more.map(postCard).join('')}</div></div></section>` : ''}`,
    mount(root) { $('[data-copy-link]', root).addEventListener('click', () => navigator.clipboard?.writeText(url).then(() => toast('Lien copié'))); },
  };
}

/* =============================================================== DIAGNOSTIC */
const QUIZ = [
  { k: 'type', q: 'En fin de journée, votre peau est plutôt…', o: [['grasse', 'Brillante sur tout le visage', 'drop'], ['mixte', 'Brillante sur la zone T seulement', 'face'], ['seche', 'Tiraillée, rugueuse ou terne', 'leaf'], ['normale', 'Confortable, sans excès', 'sparkle']] },
  { k: 'sens', q: 'Votre peau réagit-elle facilement (rougeurs, picotements, irritations) ?', o: [['oui', 'Oui, souvent', 'alert'], ['parfois', 'Parfois, avec certains produits', 'info'], ['non', 'Rarement ou jamais', 'shield']] },
  { k: 'concerns', multi: true, q: 'Quelles sont vos préoccupations principales ?', sub: 'Plusieurs choix possibles', o: [['taches', 'Taches & teint irrégulier', 'sparkle'], ['acne', 'Boutons & points noirs', 'drop'], ['rides', 'Rides & perte de fermeté', 'clock'], ['eclat', 'Manque d’éclat', 'face'], ['hydratation', 'Déshydratation', 'leaf']] },
  { k: 'sun', q: 'Combien de temps passez-vous au soleil chaque jour ?', o: [['peu', 'Moins d’une heure', 'home'], ['moyen', 'Entre 1 et 3 heures', 'clock'], ['beaucoup', 'Plus de 3 heures', 'sparkle']] },
  { k: 'routine', q: 'Votre routine actuelle ressemble à…', o: [['aucune', 'Pas vraiment de routine', 'x'], ['basique', 'Nettoyant + crème', 'check'], ['complete', 'Routine complète (sérum, SPF…)', 'award']] },
  { k: 'age', q: 'Votre tranche d’âge', o: [['jeune', 'Moins de 25 ans', 'sparkle'], ['adulte', '25 – 40 ans', 'face'], ['mature', 'Plus de 40 ans', 'heart']] },
];
const TYPES = {
  grasse: ['Peau grasse', 'Votre peau produit beaucoup de sébum : elle brille vite et peut présenter des imperfections. Elle vieillit en revanche plus lentement !'],
  mixte: ['Peau mixte', 'Zone T (front, nez, menton) plutôt grasse, joues normales à sèches : votre peau demande un équilibre subtil.'],
  seche: ['Peau sèche', 'Votre peau manque de lipides : elle tiraille, peut paraître terne et a besoin d’être nourrie en profondeur.'],
  normale: ['Peau normale', 'Votre peau est bien équilibrée : l’objectif est de préserver son confort et son éclat sur la durée.'],
};

export async function diagnostic() {
  const [products, services] = await Promise.all([api('/api/products'), api('/api/services')]);
  const html = `${pageHero({ eyebrow: 'Diagnostic de peau gratuit', title: 'Votre peau, <em>enfin comprise</em>', sub: '6 questions, 1 minute : recevez votre profil de peau, des conseils d’expertes et une sélection sur-mesure.', crumbs: [[null, 'Diagnostic']], cls: 'phero--sm' })}
  <section class="section section--tight"><div class="container narrow">
    <div class="quiz card" data-reveal>
      <div class="quiz__top"><span class="quiz__count"><strong data-qn>1</strong> / ${QUIZ.length}</span><div class="quiz__bar"><span></span></div></div>
      <div class="quiz__stage"></div>
    </div>
    <div class="quiz__result"></div>
  </div></section>`;

  return {
    title: 'Diagnostic de peau',
    html,
    mount(root) {
      const A = {};
      let idx = 0;
      const stage = $('.quiz__stage', root);
      const show = (n, dir = 1) => {
        idx = n;
        const q = QUIZ[n];
        $('[data-qn]', root).textContent = n + 1;
        $('.quiz__bar span', root).style.transform = `scaleX(${n / QUIZ.length})`;
        const sel = A[q.k] || (q.multi ? [] : null);
        stage.innerHTML = `<div class="quiz__q" style="--dir:${dir}">
          <h3>${esc(q.q)}</h3>${q.sub ? `<p class="muted small">${esc(q.sub)}</p>` : ''}
          <div class="quiz__opts">${q.o.map(([v, l, i], k) => `<button type="button" class="qopt ${q.multi ? (sel.includes(v) ? 'sel' : '') : sel === v ? 'sel' : ''}" data-v="${v}" style="--i:${k}"><span class="qopt__ic">${icon(i)}</span><span>${esc(l)}</span><span class="qopt__ck">${icon('check')}</span></button>`).join('')}</div>
          <div class="quiz__nav">${n ? `<button type="button" class="btn btn-ghost btn-sm" data-prev>${icon('arrowL')} Précédent</button>` : '<span></span>'}
          ${q.multi ? `<button type="button" class="btn btn-primary btn-sm" data-next ${sel.length ? '' : 'disabled'}>Continuer ${icon('arrow')}</button>` : ''}</div></div>`;
      };
      stage.addEventListener('click', (e) => {
        const q = QUIZ[idx];
        if (e.target.closest('[data-prev]')) return show(idx - 1, -1);
        if (e.target.closest('[data-next]')) return next();
        const b = e.target.closest('.qopt');
        if (!b) return;
        if (q.multi) {
          const arr = (A[q.k] ||= []);
          const i = arr.indexOf(b.dataset.v);
          if (i >= 0) arr.splice(i, 1); else arr.push(b.dataset.v);
          b.classList.toggle('sel');
          $('[data-next]', stage).disabled = !arr.length;
        } else {
          A[q.k] = b.dataset.v;
          $$('.qopt', stage).forEach((x) => x.classList.toggle('sel', x === b));
          setTimeout(next, 320);
        }
      });
      const next = () => (idx < QUIZ.length - 1 ? show(idx + 1, 1) : result());
      show(0);

      function result() {
        $('.quiz__bar span', root).style.transform = 'scaleX(1)';
        const tags = new Set([A.type, ...(A.concerns || [])]);
        if (A.sens === 'oui') tags.add('sensible');
        if (A.sun !== 'peu') tags.add('taches');
        const score = (t) => String(t || '').split(',').reduce((n, x) => n + (tags.has(x.trim()) ? 2 : x.trim() === 'tous' ? 1 : 0), 0);
        const prods = products.map((p) => [p, score(p.tags)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p);
        const servs = services.map((sv) => [sv, score(sv.tags) + (sv.category === 'dermo' ? 1 : 0)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sv]) => sv);
        const [tName, tDesc] = TYPES[A.type] || TYPES.normale;
        const tips = [
          A.type === 'grasse' || A.type === 'mixte' ? 'Nettoyez matin et soir avec un gel doux, sans savon décapant : décaper relance la production de sébum.' : 'Privilégiez un nettoyant crème ou une eau micellaire, puis une crème riche au karité.',
          'Appliquez un écran solaire SPF 50 chaque matin : c’est le geste n°1 contre les taches sur peau noire et métissée.',
          (A.concerns || []).includes('taches') ? 'Contre les taches : vitamine C le matin, niacinamide ou acide azélaïque le soir. Évitez absolument les produits « éclaircissants » non contrôlés.' : null,
          (A.concerns || []).includes('acne') ? 'Ne percez pas vos boutons : cela laisse des marques. L’acide salicylique doux aide à désincruster les pores.' : null,
          (A.concerns || []).includes('rides') ? 'Misez sur les peptides et un massage liftant régulier pour stimuler la fermeté.' : null,
          A.sens === 'oui' ? 'Peau réactive : introduisez un seul nouveau produit à la fois et faites un test au creux du coude 48 h avant.' : null,
          A.routine === 'aucune' ? 'Commencez simple : nettoyant + crème hydratante + SPF. La régularité compte plus que le nombre de produits.' : null,
          'Buvez au moins 1,5 L d’eau par jour et dormez suffisamment : l’éclat vient aussi de l’intérieur.',
        ].filter(Boolean);
        const summary = `Bonjour ! Voici mon diagnostic en ligne : ${tName}${A.sens === 'oui' ? ', sensible' : ''}. Préoccupations : ${(A.concerns || []).join(', ') || '—'}. J’aimerais un conseil personnalisé.`;
        $('.quiz', root).classList.add('done');
        const res = $('.quiz__result', root);
        res.innerHTML = `<div class="result card">
          <div class="result__head"><span class="result__badge">${icon('face')}</span><div><p class="eyebrow">Votre profil</p><h2 class="h2">${tName}${A.sens === 'oui' ? ' <em>& sensible</em>' : ''}</h2></div></div>
          <p class="lead">${esc(tDesc)}</p>
          <h3 class="h3">Nos conseils d’expertes</h3>
          <ul class="tips" data-stagger="80">${tips.map((t) => `<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
          ${prods.length ? `<h3 class="h3">Les produits adaptés à votre peau</h3><div class="pgrid pgrid--4" data-stagger="80">${prods.map(productCard).join('')}</div>` : ''}
          ${servs.length ? `<h3 class="h3">Les soins recommandés</h3><div class="mini-services" data-stagger="80">${servs.map((sv) => `<a href="/reservation?service=${sv.id}" class="mini-svc" style="--c:${CATS[sv.category]?.color}"><span class="opt__ic">${icon(CATS[sv.category]?.icon || 'sparkle')}</span><span><strong>${esc(sv.name)}</strong><small>${fdur(sv.duration)} · ${money(sv.price)}</small></span>${icon('arrow')}</a>`).join('')}</div>` : ''}
          <div class="result__cta"><a class="btn btn-gold" target="_blank" rel="noopener" href="${waMain(summary)}">${icon('whatsapp')} Recevoir ma routine sur WhatsApp</a>
            <a href="/reservation" class="btn btn-primary">${icon('calendar')} Diagnostic approfondi en institut</a>
            <button class="btn btn-ghost" data-restart>${icon('refresh')} Recommencer</button></div>
          <p class="muted small">Ce diagnostic en ligne est indicatif et ne remplace pas l’avis d’un dermatologue.</p>
        </div>`;
        refresh(res);
        bindAdd(res, products);
        res.scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('[data-restart]', res).addEventListener('click', () => { for (const k in A) delete A[k]; res.innerHTML = ''; $('.quiz', root).classList.remove('done'); show(0); $('.quiz', root).scrollIntoView({ behavior: 'smooth' }); });
      }
    },
  };
}

/* ================================================================ ERREURS */
export async function notFound() {
  return {
    title: 'Page introuvable',
    html: `<section class="nf"><div class="container center">
      <div class="nf__num" data-reveal="zoom"><span>4</span><span class="nf__drop">${icon('drop')}</span><span>4</span></div>
      <h1 class="h2" data-split>Cette page s’est <em>évaporée</em></h1>
      <p class="lead" data-reveal>Elle n’existe pas ou a été déplacée. Laissez-nous vous guider.</p>
      <div class="row-wrap center" data-reveal><a href="/" class="btn btn-primary">${icon('home')} Accueil</a><a href="/reservation" class="btn btn-ghost">Prendre rendez-vous</a></div>
    </div></section>`,
  };
}

export function errorView(e) {
  if (e?.status === 404) return { title: 'Introuvable', html: `<section class="nf"><div class="container center"><h1 class="h2">Contenu introuvable</h1><p class="lead">${esc(e.message)}</p><a href="/" class="btn btn-primary">Retour à l’accueil</a></div></section>` };
  return { title: 'Erreur', html: `<section class="nf"><div class="container center"><h1 class="h2">Oups…</h1><p class="lead">${esc(e?.message || 'Une erreur est survenue.')}</p><div class="row-wrap center"><a class="btn btn-primary" href="${esc(location.pathname + location.search)}" data-external>Réessayer</a><a href="/" class="btn btn-ghost">Accueil</a></div></div></section>` };
}
