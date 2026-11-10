/* Formations vidéo payantes, lecteur, espace client. */
import { $, $$, esc, api, state, emit, icon, money, fdur, fdate, fshort, fdatetime, cap, CATS, CUSTOM_TYPES, statusPill, paras, modal, toast, formData, busy, go, waMain, telHref, phones, localNow } from '../core.js';
import { cover } from '../art.js';
import { refresh, confetti } from '../anim.js';
import { pageHero, secHead, courseCard, authForms, bindAuth, authModal, empty } from './ui.js';
import { momoBlock, successCheck } from './booking.js';

/* =============================================================== CATALOGUE */
export async function courses() {
  const list = await api('/api/courses');
  return {
    title: 'Formations vidéo',
    html: `${pageHero({ eyebrow: 'Académie en ligne', title: 'Formations vidéo <em>beauté</em>', sub: 'Les gestes et secrets de nos expertes, filmés en gros plan. Apprenez à votre rythme, depuis votre téléphone, avec un accès illimité.', crumbs: [[null, 'Formations']] })}
    <section class="section section--tight"><div class="container">
      <div class="perks perks--top" data-stagger="90">
        <div>${icon('film')}<strong>Vidéos HD</strong><span>Filmées de près, pas à pas</span></div>
        <div>${icon('infinity')}<strong>Accès à vie</strong><span>Revoyez autant que vous voulez</span></div>
        <div>${icon('smartphone')}<strong>Partout</strong><span>Mobile, tablette, ordinateur</span></div>
        <div>${icon('wallet')}<strong>Mobile Money</strong><span>MTN MoMo, Moov Money</span></div>
      </div>
      <div class="cgrid" data-stagger="110">${list.map(courseCard).join('')}</div>
      ${list.length ? '' : empty('Les formations arrivent très bientôt.', 'film')}
    </div></section>
    <section class="section section--sand"><div class="container">
      ${secHead({ eyebrow: 'Comment ça marche', title: 'Commencez en <em>4 étapes</em>', cls: 'center' })}
      <ol class="timeline" data-stagger="140">
        <li><span class="timeline__n">1</span><h3>Choisissez</h3><p>Parcourez le programme et regardez la leçon d’introduction gratuite.</p></li>
        <li><span class="timeline__n">2</span><h3>Créez votre compte</h3><p>En 20 secondes, avec votre e-mail et votre numéro.</p></li>
        <li><span class="timeline__n">3</span><h3>Payez par Mobile Money</h3><p>Envoyez le montant et indiquez la référence de la transaction.</p></li>
        <li><span class="timeline__n">4</span><h3>Apprenez</h3><p>Votre accès est activé dès vérification. Pour toujours.</p></li>
      </ol>
    </div></section>`,
  };
}

/* ================================================================== FICHE */
export async function course({ params }) {
  const d = await api(`/api/courses/${encodeURIComponent(params.slug)}`);
  const c = d.course;
  const total = d.lessons.reduce((t, l) => t + (l.duration || 0), 0);
  const off = c.compare_price > c.price ? Math.round((1 - c.price / c.compare_price) * 100) : 0;
  const learnList = String(c.what_you_learn || '').split('\n').map((x) => x.trim()).filter(Boolean);

  const cta = () => {
    const e = d.enrollment;
    if (d.access) return `<a href="/apprendre/${esc(c.slug)}" class="btn btn-gold btn-lg btn-block">${icon('play')} ${d.done.length ? 'Continuer la formation' : 'Commencer la formation'}</a>`;
    if (e?.status === 'pending') return `<div class="pending">${icon('clock')}<div><strong>Paiement en cours de vérification</strong><small>Votre accès sera activé très vite. Réf. ${esc(e.ref)}</small></div></div>
      <a class="btn btn-ghost btn-block btn-sm" target="_blank" rel="noopener" href="${waMain(`Bonjour, j’ai payé la formation « ${c.title} » (réf. ${e.ref}). Voici ma preuve de paiement :`)}">${icon('whatsapp')} Envoyer ma preuve de paiement</a>
      <button class="link-btn" data-buy>Modifier la référence de paiement</button>`;
    return `${e?.status === 'rejected' ? `<p class="pill pill--bad">Paiement non validé — merci de réessayer</p>` : ''}<button class="btn btn-gold btn-lg btn-block" data-buy>${icon('wallet')} ${c.price ? 'Acheter la formation' : 'Accéder gratuitement'}</button>`;
  };

  return {
    title: c.title,
    dark: true,
    html: `<section class="course-hero" style="--c:${esc(c.color)}">
      <div class="course-hero__bg" aria-hidden="true"><span class="orb o1" data-parallax="0.15"></span><span class="orb o2" data-parallax="-0.1"></span></div>
      <div class="container course-hero__in">
        <nav class="crumbs crumbs--light" data-reveal><a href="/">Accueil</a><span>/</span><a href="/formations">Formations</a></nav>
        <span class="pill pill--light" data-reveal>${esc(c.level || '')}</span>
        <h1 class="h1 light" data-split>${esc(c.title)}</h1>
        <p class="lead light" data-reveal data-delay="250">${esc(c.subtitle || '')}</p>
        <div class="course-hero__meta" data-reveal data-delay="350"><span>${icon('film')} ${d.lessons.length} leçons</span><span>${icon('clock')} ${esc(c.duration_label || fdur(total))}</span><span>${icon('infinity')} Accès à vie</span><span>${icon('user')} ${esc(c.instructor || 'Nos expertes')}</span></div>
      </div>
    </section>
    <section class="section section--tight"><div class="container course">
      <div class="course__main">
        ${learnList.length ? `<div class="card" data-reveal><h2 class="h3">Ce que vous allez apprendre</h2><ul class="learn-list">${learnList.map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul></div>` : ''}
        <div data-reveal><h2 class="h3">À propos de cette formation</h2><div class="prose">${paras(c.description)}</div></div>
        <div data-reveal><h2 class="h3">Programme <small class="muted">· ${d.lessons.length} leçons · ${fdur(total)}</small></h2>
          <ol class="curriculum">${d.lessons.map((l, i) => {
            const can = d.access || (l.is_preview && l.has_video);
            return `<li class="${d.done.includes(l.id) ? 'done' : ''}"><span class="curriculum__n">${d.done.includes(l.id) ? icon('check') : String(i + 1).padStart(2, '0')}</span>
              <span class="curriculum__t"><strong>${esc(l.title)}</strong>${l.description ? `<small>${esc(l.description)}</small>` : ''}</span>
              <span class="curriculum__d">${l.duration ? fdur(l.duration) : ''}</span>
              ${d.access ? `<a href="/apprendre/${esc(c.slug)}?l=${l.id}" class="icon-btn" aria-label="Regarder">${icon('play')}</a>`
                : can ? `<button class="chip chip--sm" data-preview="${l.id}">${icon('play')} Aperçu gratuit</button>`
                : l.is_preview ? '<span class="chip chip--sm">Aperçu bientôt</span>' : `<span class="curriculum__lock">${icon('lock')}</span>`}</li>`;
          }).join('')}</ol></div>
      </div>
      <aside class="course__side"><div class="card buy" data-reveal="left">
        <div class="buy__cover">${cover(c, { label: c.level })}</div>
        <div class="buy__price"><strong>${c.price ? money(c.price) : 'Gratuit'}</strong>${off ? `<s>${money(c.compare_price)}</s><span class="badge badge--gold">-${off}%</span>` : ''}</div>
        <div data-cta>${cta()}</div>
        <ul class="buy__inc"><li>${icon('film')} ${d.lessons.length} vidéos à la demande</li><li>${icon('infinity')} Accès illimité à vie</li><li>${icon('smartphone')} Mobile, tablette et ordinateur</li><li>${icon('chat')} Questions par WhatsApp</li></ul>
        <p class="small muted center">Une question avant d’acheter ? <a href="${waMain(`Bonjour, j’ai une question sur la formation « ${c.title} ».`)}" target="_blank" rel="noopener">Écrivez-nous</a></p>
      </div></aside>
    </div></section>`,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const p = e.target.closest('[data-preview]');
        if (p) return previewModal(+p.dataset.preview);
        if (!e.target.closest('[data-buy]')) return;
        if (!state.user) {
          const u = await authModal('Connectez-vous pour acheter et suivre la formation.');
          if (!u) return;
          return go(location.pathname + '?buy=1', { replace: true });
        }
        buy();
      });
      async function buy() {
        if (!c.price) {
          try { await api(`/api/courses/${c.id}/enroll`, { method: 'POST', body: {} }); toast('Accès activé, bonne formation !'); go(`/apprendre/${c.slug}`); }
          catch (err) { toast(err.message, 'err'); }
          return;
        }
        payModal(c, () => go(location.pathname, { replace: true }));
      }
      if (new URLSearchParams(location.search).get('buy') && !d.access && state.user && d.enrollment?.status !== 'pending') setTimeout(buy, 600);
    },
  };
}

function payModal(c, done) {
  const s = state.settings;
  const m = modal({
    title: 'Paiement par Mobile Money', size: 'modal--md',
    html: `<div class="pay">
      <div class="pay__head">${cover(c, { label: c.level })}<div><strong>${esc(c.title)}</strong><span class="big-price">${money(c.price)}</span></div></div>
      <ol class="pay__steps">
        <li><span>1</span><div><strong>Envoyez ${money(c.price)}</strong> sur l’un de ces numéros :${momoBlock(0)}</div></li>
        <li><span>2</span><div><strong>Indiquez les informations de votre paiement</strong>
          <form class="stack mt" data-pay>
            <label class="field field--select"><select name="method">${(s.momo || []).map((x) => `<option>${esc(x.network)}</option>`).join('')}<option>Autre</option></select><span>Réseau utilisé</span></label>
            <label class="field"><input name="payment_ref" required placeholder=" "><span>Référence / ID de la transaction</span></label>
            <label class="field"><input name="payer_phone" type="tel" required placeholder=" " value="${esc(state.user?.phone || '')}"><span>Numéro qui a payé</span></label>
            <button class="btn btn-primary btn-block btn-lg">${icon('check')} J’ai payé, activer mon accès</button>
          </form></div></li>
      </ol>
      <p class="small muted">${icon('shield')} Votre accès est activé dès vérification de la transaction (généralement en moins d’une heure aux heures d’ouverture).</p>
    </div>`,
  });
  m.body.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Numéro copié')); });
  $('[data-pay]', m.body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    await busy(f.querySelector('button'), async () => {
      try {
        const r = await api(`/api/courses/${c.id}/enroll`, { method: 'POST', body: formData(f) });
        m.body.innerHTML = `<div class="success">${successCheck()}<h3>Merci ! Paiement transmis</h3><p>Référence <strong class="ref">${esc(r.ref)}</strong></p>
          <p class="muted">Nous vérifions votre transaction et activons votre accès très rapidement. Vous pouvez accélérer en nous envoyant la capture de paiement.</p>
          <a class="btn btn-gold" target="_blank" rel="noopener" href="${waMain(`Bonjour, je viens de payer la formation « ${c.title} » (réf. ${r.ref}). Voici ma capture :`)}">${icon('whatsapp')} Envoyer ma capture</a></div>`;
        confetti($('.success__check', m.body));
        setTimeout(done, 400);
      } catch (err) { toast(err.message, 'err'); }
    });
  });
}

function playerHtml(l) {
  if (!l.src) return `<div class="player__empty">${icon('film')}<strong>Vidéo bientôt disponible</strong><span>Notre équipe finalise le tournage de cette leçon.</span></div>`;
  if (l.type === 'youtube' || l.type === 'vimeo') return `<iframe src="${esc(l.src)}" title="${esc(l.title)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
  return `<video src="${esc(l.src)}" controls playsinline preload="metadata" controlsList="nodownload" disablepictureinpicture></video>`;
}

async function previewModal(id) {
  try {
    const l = await api(`/api/lessons/${id}`);
    const m = modal({ size: 'modal--lg modal--media', html: `<div class="player">${playerHtml(l)}</div><h3 class="h3 mt">${esc(l.title)}</h3>${l.description ? `<p class="muted">${esc(l.description)}</p>` : ''}` });
    $('video', m.body)?.addEventListener('contextmenu', (e) => e.preventDefault());
  } catch (err) { toast(err.message, 'err'); }
}

/* ================================================================ LECTEUR */
export async function learn({ params, query }) {
  const gate = (msg, btn) => ({ title: 'Formation', html: `<section class="nf"><div class="container center narrow"><div class="nf__icon">${icon('lock')}</div><h1 class="h2">${msg}</h1>${btn}</div></section>` });
  if (!state.user) {
    const v = gate('Connectez-vous pour accéder à votre formation', '<button class="btn btn-primary" data-login>Me connecter</button>');
    v.mount = (root) => $('[data-login]', root).addEventListener('click', async () => { if (await authModal()) go(location.pathname + location.search, { replace: true }); });
    return v;
  }
  const d = await api(`/api/courses/${encodeURIComponent(params.slug)}`);
  if (!d.access) return gate('Cette formation n’est pas encore active sur votre compte', `<p class="lead">${d.enrollment?.status === 'pending' ? 'Votre paiement est en cours de vérification.' : 'Achetez-la pour accéder à toutes les leçons.'}</p><a href="/formations/${esc(d.course.slug)}" class="btn btn-primary">Voir la formation</a>`);
  const c = d.course, done = new Set(d.done);
  const startId = +query.l || (d.lessons.find((l) => !done.has(l.id)) || d.lessons[0])?.id;

  return {
    title: c.title,
    html: `<section class="learn" style="--c:${esc(c.color)}"><div class="container-wide learn__grid">
      <div class="learn__main">
        <a href="/formations/${esc(c.slug)}" class="link-arrow link-arrow--back">${icon('arrowL')} ${esc(c.title)}</a>
        <div class="player" data-player></div>
        <div class="learn__meta">
          <div><small class="muted" data-lnum></small><h1 class="h3" data-ltitle></h1><p class="muted" data-ldesc></p></div>
          <div class="row-wrap"><button class="btn btn-ghost btn-sm" data-done>${icon('check')} Marquer comme terminée</button><button class="btn btn-primary btn-sm" data-next>Leçon suivante ${icon('arrow')}</button></div>
        </div>
      </div>
      <aside class="learn__side card">
        <div class="learn__prog"><div class="row-between"><strong>Votre progression</strong><span data-pct></span></div><div class="bar"><span data-bar></span></div></div>
        <ol class="lessons">${d.lessons.map((l, i) => `<li><button data-l="${l.id}"><span class="lessons__n">${String(i + 1).padStart(2, '0')}</span><span class="lessons__t">${esc(l.title)}<small>${l.duration ? fdur(l.duration) : ''}</small></span><span class="lessons__ck">${icon('check')}</span></button></li>`).join('')}</ol>
      </aside>
    </div></section>`,
    mount(root) {
      let cur = null;
      const prog = () => {
        const pct = d.lessons.length ? Math.round((done.size / d.lessons.length) * 100) : 0;
        $('[data-pct]', root).textContent = pct + ' %';
        $('[data-bar]', root).style.width = pct + '%';
        $$('[data-l]', root).forEach((b) => { b.classList.toggle('done', done.has(+b.dataset.l)); b.classList.toggle('cur', +b.dataset.l === cur); });
        const btn = $('[data-done]', root);
        btn.innerHTML = done.has(cur) ? `${icon('check')} Terminée` : `${icon('check')} Marquer comme terminée`;
        btn.classList.toggle('is-done', done.has(cur));
        const i = d.lessons.findIndex((l) => l.id === cur);
        $('[data-next]', root).hidden = i >= d.lessons.length - 1;
        if (pct === 100 && !prog.celebrated) { prog.celebrated = true; toast('Bravo, vous avez terminé la formation ! 🎉'); confetti($('.learn__prog', root)); }
      };
      prog.celebrated = done.size === d.lessons.length;
      const open = async (id) => {
        cur = id;
        const i = d.lessons.findIndex((l) => l.id === id);
        const meta = d.lessons[i];
        $('[data-lnum]', root).textContent = `Leçon ${i + 1} sur ${d.lessons.length}`;
        $('[data-ltitle]', root).textContent = meta.title;
        $('[data-ldesc]', root).textContent = meta.description || '';
        const pl = $('[data-player]', root);
        pl.classList.add('loading');
        try {
          const l = await api(`/api/lessons/${id}`);
          pl.innerHTML = playerHtml(l);
          const v = $('video', pl);
          if (v) {
            v.addEventListener('contextmenu', (e) => e.preventDefault());
            v.addEventListener('ended', () => { if (!done.has(id)) toggleDone(true); });
          }
        } catch (err) { pl.innerHTML = `<div class="player__empty">${icon('alert')}<strong>${esc(err.message)}</strong></div>`; }
        pl.classList.remove('loading');
        history.replaceState({}, '', `/apprendre/${c.slug}?l=${id}`);
        prog();
      };
      const toggleDone = async (val = !done.has(cur)) => {
        try {
          await api(`/api/lessons/${cur}/done`, { method: 'POST', body: { done: val } });
          if (val) done.add(cur); else done.delete(cur);
          prog();
        } catch (err) { toast(err.message, 'err'); }
      };
      $('.lessons', root).addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (b) { open(+b.dataset.l); if (innerWidth < 900) $('[data-player]', root).scrollIntoView({ behavior: 'smooth' }); } });
      $('[data-done]', root).addEventListener('click', () => toggleDone());
      $('[data-next]', root).addEventListener('click', () => { const i = d.lessons.findIndex((l) => l.id === cur); if (d.lessons[i + 1]) { if (!done.has(cur)) toggleDone(true); open(d.lessons[i + 1].id); } });
      if (startId) open(startId);
    },
  };
}

/* ============================================================ ESPACE CLIENT */
export async function account({ query }) {
  if (!state.user) {
    return {
      title: 'Mon espace',
      html: `${pageHero({ eyebrow: 'Mon espace', title: 'Bienvenue <em>chez vous</em>', sub: 'Retrouvez vos rendez-vous, commandes, formations et demandes sur-mesure en un seul endroit.', crumbs: [[null, 'Mon espace']], cls: 'phero--sm' })}
      <section class="section section--tight"><div class="container narrow-sm"><div class="card" data-reveal>${authForms('', query.tab === 'register' ? 'register' : 'login')}</div></div></section>`,
      mount(root) { bindAuth(root, () => go('/compte', { replace: true })); },
    };
  }
  const d = await api('/api/me/dashboard');
  const u = state.user;
  const today = localNow().toISOString().slice(0, 10);
  const TABS = [
    ['rdv', 'Rendez-vous', 'calendar', d.bookings.length], ['cmd', 'Commandes', 'bag', d.orders.length], ['for', 'Formations', 'film', d.courses.length],
    ['sm', 'Sur-mesure', 'gift', d.custom.length], ['atl', 'Ateliers', 'ticket', d.events.length], ['pro', 'Profil', 'user', 0],
  ];
  const tab = TABS.some((t) => t[0] === query.tab) ? query.tab : 'rdv';
  const panels = {
    rdv: d.bookings.length ? `<div class="alist">${d.bookings.map((b) => {
      const dt = new Date(b.date + 'T12:00:00'), future = b.date >= today && ['pending', 'confirmed'].includes(b.status);
      return `<div class="aitem ${future ? '' : 'past'}"><div class="ecard__date ecard__date--sm"><small>${dt.toLocaleDateString('fr-FR', { weekday: 'short' })}</small><strong>${dt.getDate()}</strong><span>${dt.toLocaleDateString('fr-FR', { month: 'short' })}</span></div>
        <div class="aitem__body"><strong>${esc(b.service_name || 'Prestation')}</strong><small>${b.time.replace(':', 'h')} · ${fdur(b.duration)} · ${money(b.price)} · Réf. ${esc(b.ref)}</small></div>
        ${statusPill('bookings', b.status)}${future ? `<button class="btn btn-ghost btn-sm" data-cancel="${b.id}">Annuler</button>` : ''}</div>`;
    }).join('')}</div>` : empty('Aucun rendez-vous pour le moment.', 'calendar', '<a href="/reservation" class="btn btn-primary btn-sm">Prendre rendez-vous</a>'),
    cmd: d.orders.length ? `<div class="alist">${d.orders.map((o) => `<div class="aitem aitem--col"><div class="row-between"><div><strong>${esc(o.ref)}</strong><small class="muted"> · ${fshort(o.created_at)}</small></div>${statusPill('orders', o.status)}</div>
        <div class="muted small">${o.items.map((i) => `${i.qty} × ${esc(i.name)}`).join(' · ')}</div><div class="row-between"><span class="small">${o.delivery === 'livraison' ? 'Livraison' : 'Retrait à l’institut'}</span><strong>${money(o.total)}</strong></div></div>`).join('')}</div>`
      : empty('Aucune commande pour le moment.', 'bag', '<a href="/boutique" class="btn btn-primary btn-sm">Découvrir la boutique</a>'),
    for: d.courses.length ? `<div class="cgrid cgrid--sm">${d.courses.map((c) => { const pct = c.total ? Math.round((c.done / c.total) * 100) : 0; return `<div class="mycourse card">${cover(c, { label: '' })}<div class="mycourse__body"><strong>${esc(c.title)}</strong>
        ${c.status === 'active' ? `<div class="bar"><span style="width:${pct}%"></span></div><small class="muted">${pct} % terminé · ${c.done}/${c.total} leçons</small><a href="/apprendre/${esc(c.slug)}" class="btn btn-primary btn-sm">${icon('play')} ${pct ? 'Continuer' : 'Commencer'}</a>` : statusPill('enrollments', c.status) + `<a href="/formations/${esc(c.slug)}" class="btn btn-ghost btn-sm">Voir</a>`}</div></div>`; }).join('')}</div>`
      : empty('Vous n’avez pas encore de formation.', 'film', '<a href="/formations" class="btn btn-primary btn-sm">Voir les formations</a>'),
    sm: d.custom.length ? `<div class="alist">${d.custom.map((x) => `<div class="aitem aitem--col"><div class="row-between"><div><strong>${esc(CUSTOM_TYPES[x.type]?.[0] || x.type)}</strong><small class="muted"> · ${esc(x.ref)} · ${fshort(x.created_at)}</small></div>${statusPill('custom_orders', x.status)}</div>
        ${x.quote ? `<div>Devis proposé : <strong>${money(x.quote)}</strong></div>` : ''}${x.admin_note ? `<div class="muted small">${icon('chat')} ${esc(x.admin_note)}</div>` : ''}</div>`).join('')}</div>`
      : empty('Aucune demande sur-mesure.', 'gift', '<a href="/sur-mesure" class="btn btn-primary btn-sm">Faire une demande</a>'),
    atl: d.events.length ? `<div class="alist">${d.events.map((x) => `<div class="aitem"><div class="aitem__body"><strong>${esc(x.title)}</strong><small>${cap(fdate(x.date))} · ${esc(x.time || '')} · ${x.seats} place(s) · Réf. ${esc(x.ref)}</small></div>${statusPill('registrations', x.status)}</div>`).join('')}</div>`
      : empty('Aucune inscription à un atelier.', 'ticket', '<a href="/ateliers" class="btn btn-primary btn-sm">Voir les ateliers</a>'),
    pro: `<form class="stack narrow-sm" data-profile>
        <div class="grid-2"><label class="field"><input name="name" required placeholder=" " value="${esc(u.name)}"><span>Nom complet</span></label>
        <label class="field"><input name="phone" type="tel" placeholder=" " value="${esc(u.phone || '')}"><span>Téléphone</span></label></div>
        <label class="field"><input value="${esc(u.email)}" disabled placeholder=" "><span>E-mail</span></label>
        <details class="pw"><summary>${icon('lock')} Changer mon mot de passe</summary><div class="grid-2 mt">
          <label class="field"><input name="current_password" type="password" placeholder=" " autocomplete="current-password"><span>Mot de passe actuel</span></label>
          <label class="field"><input name="new_password" type="password" minlength="8" placeholder=" " autocomplete="new-password"><span>Nouveau mot de passe</span></label></div></details>
        <div class="row-wrap"><button class="btn btn-primary">${icon('check')} Enregistrer</button><button type="button" class="btn btn-ghost" data-logout>${icon('logout')} Se déconnecter</button></div></form>`,
  };

  return {
    title: 'Mon espace',
    dark: true,
    html: `<section class="dash-hero"><div class="container dash-hero__in">
      <div><p class="eyebrow light" data-reveal>Mon espace</p><h1 class="h1 light" data-split>Bonjour, <em>${esc(u.name.split(' ')[0])}</em></h1>
      <p class="light-muted" data-reveal data-delay="200">${esc(u.email)}</p></div>
      <div class="dash-hero__stats" data-stagger="90">
        <div><strong>${d.bookings.filter((b) => b.date >= today && ['pending', 'confirmed'].includes(b.status)).length}</strong><span>RDV à venir</span></div>
        <div><strong>${d.orders.length}</strong><span>Commandes</span></div>
        <div><strong>${d.courses.filter((c) => c.status === 'active').length}</strong><span>Formations</span></div>
      </div></div></section>
    <section class="section section--tight"><div class="container">
      ${u.role === 'admin' ? `<a href="/admin" data-external class="note card admin-note" data-reveal>${icon('sliders')}<div><strong>Espace administrateur</strong><p class="muted">Gérez rendez-vous, commandes, formations et paramètres du site.</p></div>${icon('arrow')}</a>` : ''}
      <div class="dash">
        <nav class="dash__nav" data-dtabs>${TABS.map(([k, l, i, n]) => `<button class="${k === tab ? 'active' : ''}" data-t="${k}">${icon(i)}<span>${l}</span>${n ? `<sup>${n}</sup>` : ''}</button>`).join('')}</nav>
        <div class="dash__panel card">${TABS.map(([k]) => `<div data-panel="${k}" ${k === tab ? '' : 'hidden'}>${panels[k]}</div>`).join('')}</div>
      </div>
    </div></section>`,
    mount(root) {
      $('[data-dtabs]', root).addEventListener('click', (e) => {
        const b = e.target.closest('[data-t]');
        if (!b) return;
        $$('[data-dtabs] button', root).forEach((x) => x.classList.toggle('active', x === b));
        $$('[data-panel]', root).forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.t; if (!p.hidden) p.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }); });
        history.replaceState({}, '', `/compte?tab=${b.dataset.t}`);
      });
      root.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-cancel]');
        if (c) {
          const { confirmBox } = await import('../core.js');
          if (!(await confirmBox('Annuler ce rendez-vous ?', { ok: 'Oui, annuler', danger: true }))) return;
          try { await api(`/api/me/bookings/${c.dataset.cancel}/cancel`, { method: 'POST', body: {} }); toast('Rendez-vous annulé.'); go('/compte?tab=rdv', { replace: true }); }
          catch (err) { toast(err.message, 'err'); }
        }
        if (e.target.closest('[data-logout]')) {
          await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => {});
          state.user = null; emit('user', null);
          toast('À bientôt !');
          go('/');
        }
      });
      $('[data-profile]', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        await busy(f.querySelector('.btn-primary'), async () => {
          try { const r = await api('/api/me/profile', { method: 'PUT', body: formData(f) }); state.user = r.user; emit('user', r.user); toast('Profil mis à jour.'); f.current_password.value = f.new_password.value = ''; }
          catch (err) { toast(err.message, 'err'); }
        });
      });
    },
  };
}
