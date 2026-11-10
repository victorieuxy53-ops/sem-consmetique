/* Composants d'interface réutilisables. */
import { $, $$, esc, api, state, emit, icon, money, fdur, fshort, PCATS, CATS, modal, toast, formData, busy, cart } from '../core.js';
import { productVisual, cover, stars } from '../art.js';
import { flyToCart } from '../anim.js';

export function pageHero({ eyebrow = '', title, sub = '', crumbs = [], cls = '', extra = '' }) {
  return `<section class="phero ${cls}">
    <div class="phero__bg" aria-hidden="true"><span class="orb o1" data-parallax="0.18"></span><span class="orb o2" data-parallax="-0.1"></span><span class="phero__grain"></span></div>
    <div class="container phero__in">
      <nav class="crumbs" aria-label="Fil d’Ariane" data-reveal><a href="/">Accueil</a>${crumbs.map(([h, l]) => `<span>/</span>${h ? `<a href="${h}">${esc(l)}</a>` : `<span aria-current="page">${esc(l)}</span>`}`).join('')}</nav>
      ${eyebrow ? `<p class="eyebrow" data-reveal data-delay="80">${esc(eyebrow)}</p>` : ''}
      <h1 class="h1" data-split>${title}</h1>
      ${sub ? `<p class="lead" data-reveal data-delay="300">${sub}</p>` : ''}
      ${extra}
    </div>
  </section>`;
}

export const secHead = ({ eyebrow, title, sub = '', cls = '', side = '' }) => `<div class="sec-head ${cls}">
  <div>${eyebrow ? `<p class="eyebrow" data-reveal>${esc(eyebrow)}</p>` : ''}<h2 class="h2" data-split>${title}</h2>${sub ? `<p class="lead" data-reveal data-delay="200">${sub}</p>` : ''}</div>${side}</div>`;

export const empty = (text, iconName = 'sparkle', action = '') => `<div class="empty" data-reveal>${icon(iconName)}<p>${text}</p>${action}</div>`;

/* ---------------------------------------------------------------- cartes */
export function productCard(p) {
  const off = p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
  const out = p.stock !== null && p.stock <= 0;
  const low = !out && p.stock !== null && p.stock <= 5;
  return `<article class="pcard" data-pid="${p.id}">
    <a href="/boutique/${esc(p.slug)}" class="pcard__media" data-cursor="Voir" data-tilt="7">
      ${productVisual(p)}
      <div class="pcard__badges">${off ? `<span class="badge badge--gold">-${off}%</span>` : ''}${p.featured ? '<span class="badge">Coup de cœur</span>' : ''}${out ? '<span class="badge badge--dark">Épuisé</span>' : low ? `<span class="badge badge--warn">Plus que ${p.stock}</span>` : ''}</div>
    </a>
    <div class="pcard__body">
      <span class="pcard__cat">${esc(PCATS[p.category] || p.category || '')}</span>
      <h3 class="pcard__name"><a href="/boutique/${esc(p.slug)}">${esc(p.name)}</a></h3>
      <p class="pcard__short">${esc(p.short || '')}</p>
      <div class="pcard__foot"><span class="price">${money(p.price)}${off ? ` <s>${money(p.compare_price)}</s>` : ''}</span>
        <button class="add-btn" data-add="${p.id}" ${out ? 'disabled' : ''} aria-label="Ajouter ${esc(p.name)} au panier">${icon('plus')}<span>Ajouter</span></button></div>
    </div>
  </article>`;
}

/** Ajout au panier délégué (avec animation de vol). */
export function bindAdd(root, products) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    const p = products.find((x) => x.id === +b.dataset.add);
    if (!p) return;
    const qtyInput = b.closest('[data-qty-scope]')?.querySelector('[data-qty]');
    const qty = qtyInput ? Math.max(1, +qtyInput.textContent || 1) : 1;
    const inCart = cart.items.find((i) => i.id === p.id)?.qty || 0;
    if (p.stock !== null && inCart + qty > p.stock) return toast(`Stock limité : ${p.stock} disponible(s).`, 'info');
    cart.add(p, qty);
    flyToCart(b.closest('.pcard, .product')?.querySelector('.pv') || b);
    b.classList.add('added');
    setTimeout(() => b.classList.remove('added'), 1200);
    toast(`« ${p.name} » ajouté au panier`);
  });
}

export function serviceCard(s) {
  const c = CATS[s.category] || {};
  return `<article class="scard" style="--c:${c.color || '#9b4d6e'}" data-cat="${esc(s.category)}">
    ${s.image ? `<div class="scard__img"><img src="${esc(s.image)}" alt="" loading="lazy"></div>` : ''}
    <div class="scard__top"><span class="scard__ic">${icon(c.icon || 'sparkle')}</span><span class="scard__cat">${esc(c.label || '')}</span></div>
    <h3 class="scard__name">${esc(s.name)}</h3>
    <p class="scard__short">${esc(s.short || '')}</p>
    ${s.description ? `<details class="scard__more"><summary>Détails du soin ${icon('chevD')}</summary><p>${esc(s.description)}</p></details>` : ''}
    <div class="scard__meta"><span>${icon('clock')} ${fdur(s.duration)}</span><strong class="price">${s.price ? money(s.price) : 'Sur devis'}</strong></div>
    <a href="/reservation?service=${s.id}" class="btn btn-primary btn-block btn-sm">Réserver ce soin ${icon('arrow')}</a>
  </article>`;
}

export function courseCard(c) {
  const off = c.compare_price > c.price ? Math.round((1 - c.price / c.compare_price) * 100) : 0;
  return `<a href="/formations/${esc(c.slug)}" class="ccard" data-cursor="Découvrir">
    <div class="ccard__media" data-tilt="6">${cover(c, { label: c.title.split(/[:—]/)[0] })}${off ? `<span class="badge badge--gold ccard__off">-${off}%</span>` : ''}</div>
    <div class="ccard__body">
      <span class="ccard__level">${esc(c.level || '')}</span>
      <h3>${esc(c.title)}</h3><p>${esc(c.subtitle || '')}</p>
      <div class="ccard__meta"><span>${icon('film')} ${c.lessons_count || 0} leçons</span><span>${icon('clock')} ${esc(c.duration_label || fdur(c.total_minutes))}</span></div>
      <div class="ccard__foot"><span class="price">${c.price ? money(c.price) : 'Gratuit'}${off ? ` <s>${money(c.compare_price)}</s>` : ''}</span><span class="link-arrow">Voir ${icon('arrow')}</span></div>
    </div></a>`;
}

export function eventCard(e) {
  const left = Math.max(0, e.seats - e.taken);
  const pct = Math.min(100, Math.round((e.taken / Math.max(1, e.seats)) * 100));
  const d = new Date(e.date + 'T12:00:00');
  return `<article class="ecard" style="--c:${esc(e.color || '#9b4d6e')}">
    <div class="ecard__date"><small>${d.toLocaleDateString('fr-FR', { weekday: 'short' })}</small><strong>${d.getDate()}</strong><span>${d.toLocaleDateString('fr-FR', { month: 'short' })}</span></div>
    <div class="ecard__body"><h3>${esc(e.title)}</h3><p>${esc(e.description || '')}</p>
      <div class="ecard__meta"><span>${icon('clock')} ${esc(e.time || '')}${e.end_time ? ' – ' + esc(e.end_time) : ''}</span><span>${icon('pin')} ${esc(e.location || 'À l’institut')}</span><span>${icon('wallet')} ${e.price ? money(e.price) : 'Gratuit'}</span></div>
      <div class="seats"><div class="seats__bar"><span style="--w:${pct}%"></span></div><span class="seats__txt">${left ? `<strong>${left}</strong> place${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''} sur ${e.seats}` : '<strong>Complet</strong>'}</span></div>
    </div>
    <div class="ecard__cta"><button class="btn btn-primary" data-event="${e.id}" ${left ? '' : 'disabled'}>${left ? 'Réserver ma place' : 'Complet'}</button></div>
  </article>`;
}

export const postCard = (p) => `<a href="/conseils/${esc(p.slug)}" class="bcard" data-cursor="Lire">
  <div class="bcard__media" data-tilt="5">${cover(p, { label: p.category, iconName: 'book' })}</div>
  <div class="bcard__body"><span class="bcard__cat">${esc(p.category || 'Conseil')}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt || '')}</p>
  <span class="bcard__meta">${fshort(p.created_at)} · ${p.read_time || 4} min de lecture</span></div></a>`;

/* --------------------------------------------------------- authentification */
export function authForms(reason = '', tab = 'login') {
  return `<div class="auth" data-tab="${tab}">
    ${reason ? `<p class="auth__reason">${icon('lock')} ${esc(reason)}</p>` : ''}
    <div class="seg"><button type="button" data-t="login">Connexion</button><button type="button" data-t="register">Créer un compte</button><span class="seg__ink"></span></div>
    <form class="auth__form" data-form="login">
      <label class="field"><input name="email" type="email" required autocomplete="email" placeholder=" "><span>E-mail</span></label>
      <label class="field"><input name="password" type="password" required autocomplete="current-password" placeholder=" "><span>Mot de passe</span></label>
      <button class="btn btn-primary btn-block">Se connecter ${icon('arrow')}</button>
      <p class="muted small center">Mot de passe oublié ? Contactez l’institut, nous le réinitialisons pour vous.</p>
    </form>
    <form class="auth__form" data-form="register">
      <label class="field"><input name="name" required autocomplete="name" placeholder=" "><span>Nom complet</span></label>
      <label class="field"><input name="email" type="email" required autocomplete="email" placeholder=" "><span>E-mail</span></label>
      <label class="field"><input name="phone" type="tel" autocomplete="tel" placeholder=" "><span>Téléphone (WhatsApp)</span></label>
      <label class="field"><input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder=" "><span>Mot de passe (8 caractères min.)</span></label>
      <button class="btn btn-primary btn-block">Créer mon compte ${icon('sparkle')}</button>
    </form>
  </div>`;
}

export function bindAuth(root, onSuccess) {
  const box = $('.auth', root);
  $$('.seg button', box).forEach((b) => b.addEventListener('click', () => { box.dataset.tab = b.dataset.t; $(`[data-form="${b.dataset.t}"] input`, box)?.focus(); }));
  $$('.auth__form', box).forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    await busy(f.querySelector('button'), async () => {
      try {
        const { user } = await api(`/api/auth/${f.dataset.form}`, { method: 'POST', body: formData(f) });
        state.user = user;
        emit('user', user);
        toast(f.dataset.form === 'login' ? `Ravie de vous revoir, ${user.name.split(' ')[0]} !` : 'Bienvenue ! Votre compte est créé.');
        onSuccess?.(user);
      } catch (err) { toast(err.message, 'err'); }
    });
  }));
}

export function authModal(reason = '') {
  return new Promise((resolve) => {
    let user = null;
    const m = modal({ size: 'modal--auth', html: `<h3 class="modal__title">Mon espace</h3>${authForms(reason)}`, onClose: () => resolve(user) });
    bindAuth(m.body, (u) => { user = u; m.close(); });
  });
}

/* --------------------------------------------------------- rappel gratuit */
export const callbackForm = (title = 'Être rappelée gratuitement') => `<form class="callback card" data-callback>
  <span class="callback__ic">${icon('phone')}</span>
  <h3>${title}</h3><p class="muted small">Laissez votre numéro : une conseillère vous rappelle rapidement.</p>
  <label class="field"><input name="name" required placeholder=" " autocomplete="name"><span>Votre prénom</span></label>
  <label class="field"><input name="phone" type="tel" required placeholder=" " autocomplete="tel"><span>Téléphone</span></label>
  <label class="field field--select"><select name="when"><option>Dès que possible</option><option>Ce matin</option><option>Cet après-midi</option><option>Ce soir</option><option>Demain</option></select><span>Quand ?</span></label>
  <button class="btn btn-primary btn-block">${icon('phone')} Me rappeler</button></form>`;

export function bindCallback(root) {
  $$('[data-callback]', root).forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(f);
    await busy(f.querySelector('button'), async () => {
      try {
        await api('/api/contact', { method: 'POST', body: { kind: 'rappel', name: d.name, phone: d.phone, subject: 'Demande de rappel', message: `Créneau souhaité : ${d.when}` } });
        f.innerHTML = `<div class="success-mini">${icon('check')}<h3>C’est noté !</h3><p class="muted">Nous vous rappelons ${esc(d.when.toLowerCase())} au ${esc(d.phone)}.</p></div>`;
      } catch (err) { toast(err.message, 'err'); }
    });
  }));
}

/* ------------------------------------------------------------- avis client */
export function reviewModal() {
  const m = modal({
    title: 'Votre avis compte',
    html: `<form class="stack" data-review-form>
      <div class="rate-input" role="radiogroup" aria-label="Note">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="r${n}" value="${n}" ${n === 5 ? 'checked' : ''}><label for="r${n}" aria-label="${n} étoiles">${icon('star')}</label>`).join('')}</div>
      <label class="field"><input name="name" required placeholder=" "><span>Votre prénom et initiale</span></label>
      <label class="field"><input name="service" placeholder=" "><span>Soin ou produit concerné</span></label>
      <label class="field"><textarea name="text" rows="4" required placeholder=" "></textarea><span>Votre expérience</span></label>
      <button class="btn btn-primary btn-block">Publier mon avis</button>
      <p class="muted small center">Votre avis sera visible après validation par l’équipe.</p></form>`,
  });
  $('[data-review-form]', m.body).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    await busy(f.querySelector('button'), async () => {
      try { await api('/api/reviews', { method: 'POST', body: formData(f) }); m.close(); toast('Merci pour votre avis ! Il sera publié après validation.'); }
      catch (err) { toast(err.message, 'err'); }
    });
  });
}

export { stars };
