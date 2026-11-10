/* Application publique : routeur SPA, mise en page, démarrage. */
import { $, $$, esc, api, state, on, emit, setNavigator, cart, money, telHref, waMain, phones, openStatus, DAYS, icon, toast, formData, busy, sleep } from './core.js';
import * as A from './anim.js';
import { logoMark, brandName, productVisual } from './art.js';
import * as Site from './pages/site.js';
import * as Shop from './pages/shop.js';
import * as Book from './pages/booking.js';
import * as Learn from './pages/learn.js';
import { mountAssistant } from './assistant.js';

const ROUTES = [
  ['/', Site.home], ['/a-propos', Site.about], ['/prestations', Site.services], ['/contact', Site.contact],
  ['/conseils', Site.blog], ['/conseils/:slug', Site.post], ['/diagnostic', Site.diagnostic],
  ['/reservation', Book.booking], ['/ateliers', Book.events],
  ['/boutique', Shop.shop], ['/boutique/:slug', Shop.product], ['/panier', Shop.checkout], ['/sur-mesure', Shop.custom], ['/suivi', Shop.track],
  ['/formations', Learn.courses], ['/formations/:slug', Learn.course], ['/apprendre/:slug', Learn.learn], ['/compte', Learn.account],
].map(([path, page]) => {
  const keys = [];
  const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  return { re, keys, page };
});

function match(pathname) {
  for (const r of ROUTES) {
    const m = r.re.exec(pathname);
    if (m) return { page: r.page, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return { page: Site.notFound, params: {} };
}

/* ---------------------------------------------------------------- routeur */
let current = null, token = 0;
async function render(url, { first = false } = {}) {
  const t = ++token;
  closeOverlays();
  const { page, params } = match(url.pathname);
  const cover = first ? null : A.curtainIn();
  let view;
  try { view = await page({ params, query: Object.fromEntries(url.searchParams), url }); }
  catch (e) { view = Site.errorView(e); }
  await cover;
  if (t !== token) return;
  try { current?.unmount?.(); } catch { /* ignore */ }
  const app = $('#app');
  app.innerHTML = view.html;
  document.title = (view.title ? view.title + ' — ' : '') + state.settings.site_name;
  document.body.classList.toggle('hdr-on-dark', !!view.dark);
  setActive(url.pathname);
  current = view;
  if (url.hash) setTimeout(() => $(url.hash)?.scrollIntoView({ behavior: 'smooth' }), 60);
  else window.scrollTo(0, 0);
  try { view.mount?.(app); } catch (e) { console.error(e); }
  A.refresh(app);
  if (!first) A.curtainOut();
  app.focus({ preventScroll: true });
}

function navigate(href, { replace = false } = {}) {
  const url = new URL(href, location.origin);
  if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
  return render(url);
}
setNavigator(navigate);

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target || a.hasAttribute('download') || a.hasAttribute('data-external')) return;
  const href = a.getAttribute('href');
  if (!href.startsWith('/') || href.startsWith('//') || /^\/(admin|api|uploads|media)(\/|$)/.test(href)) return;
  e.preventDefault();
  const url = new URL(href, location.origin);
  if (url.pathname === location.pathname && url.search === location.search) {
    closeOverlays();
    if (url.hash) $(url.hash)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  navigate(href);
});
addEventListener('popstate', () => render(new URL(location.href)));

function setActive(path) {
  $$('[data-nav]').forEach((a) => {
    const h = a.getAttribute('href');
    a.classList.toggle('active', h === '/' ? path === '/' : path.startsWith(h));
  });
}

function closeOverlays() {
  document.body.classList.remove('menu-open');
  $('#cart-drawer')?.classList.remove('open');
  if (!$$('.modal.open').length) document.body.classList.remove('no-scroll');
}

/* ----------------------------------------------------------------- header */
const NAV = [['/', 'Accueil'], ['/a-propos', 'À propos'], ['/prestations', 'Prestations'], ['/boutique', 'Boutique'], ['/formations', 'Formations']];
const MORE = [
  ['/ateliers', 'Ateliers & places', 'ticket', 'Réservez votre place aux prochains ateliers'],
  ['/sur-mesure', 'Commande sur-mesure', 'gift', 'Coffrets, soins, foulards personnalisés'],
  ['/diagnostic', 'Diagnostic de peau', 'drop', 'Votre routine idéale en 1 minute'],
  ['/conseils', 'Conseils beauté', 'book', 'Les dermo-conseils de nos expertes'],
  ['/suivi', 'Suivre ma demande', 'truck', 'Commande, rendez-vous, sur-mesure'],
];

function header() {
  const s = state.settings, tel = phones()[0];
  $('#header').innerHTML = `
  <div class="hdr">
    <a href="/" class="brand" aria-label="${esc(s.site_name)} — accueil">${logoMark()}<span class="brand__txt"><span class="brand__name">${brandName()}</span><small>${esc(s.tagline)}</small></span></a>
    <nav class="nav" aria-label="Navigation principale">
      ${NAV.map(([h, l]) => `<a href="${h}" data-nav>${l}</a>`).join('')}
      <div class="nav__more">
        <button class="nav__more-btn" aria-haspopup="true">Découvrir ${icon('chevD')}</button>
        <div class="nav__drop">${MORE.map(([h, l, i, d]) => `<a href="${h}" data-nav><span class="nav__drop-ic">${icon(i)}</span><span><strong>${l}</strong><small>${d}</small></span></a>`).join('')}</div>
      </div>
      <a href="/contact" data-nav>Contact</a>
    </nav>
    <div class="hdr__actions">
      ${tel ? `<a href="${telHref(tel)}" class="hdr__call" data-external aria-label="Appeler le ${esc(tel)}"><span class="hdr__call-ic">${icon('phone')}</span><span class="hdr__call-txt"><small>Appelez-nous</small>${esc(tel)}</span></a>` : ''}
      <a href="/compte" class="icon-btn" aria-label="Mon compte" data-nav-account>${icon('user')}</a>
      <button class="icon-btn cart-btn" aria-label="Ouvrir le panier">${icon('bag')}<span class="cart-count" hidden>0</span></button>
      <a href="/reservation" class="btn btn-primary btn-sm hdr__book" data-magnetic>Réserver</a>
      <button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
  <div class="mnav" aria-hidden="true">
    <div class="mnav__bg"></div>
    <div class="mnav__inner">
      <nav class="mnav__links">${[...NAV, ...MORE.map(([h, l]) => [h, l]), ['/contact', 'Contact'], ['/compte', 'Mon compte']].map(([h, l], i) => `<a href="${h}" style="--i:${i}" data-nav>${l}</a>`).join('')}</nav>
      <div class="mnav__foot">
        ${phones().map((p) => `<a href="${telHref(p)}" data-external class="btn btn-light btn-sm">${icon('phone')} ${esc(p)}</a>`).join('')}
        <a href="${waMain('Bonjour, je souhaite un renseignement.')}" target="_blank" rel="noopener" class="btn btn-gold btn-sm">${icon('whatsapp')} WhatsApp</a>
      </div>
    </div>
  </div>`;
  $('.burger').addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    $('.burger').setAttribute('aria-expanded', open);
    $('.mnav').setAttribute('aria-hidden', !open);
  });
  $('.cart-btn').addEventListener('click', openCart);
  updateCartCount();
  updateAccount();
}

function updateCartCount() {
  const n = cart.count();
  $$('.cart-count').forEach((el) => { el.textContent = n; el.hidden = !n; });
}
function updateAccount() {
  const a = $('[data-nav-account]');
  if (a) a.classList.toggle('logged', !!state.user);
}

/* ---------------------------------------------------------- tiroir panier */
function cartDrawer() {
  const d = document.createElement('aside');
  d.id = 'cart-drawer';
  d.className = 'drawer';
  d.setAttribute('aria-label', 'Panier');
  document.body.append(d);
  d.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return d.classList.remove('open'), document.body.classList.remove('no-scroll');
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const id = +row.dataset.id, it = cart.items.find((i) => i.id === id);
    if (e.target.closest('[data-inc]')) cart.set(id, it.qty + 1);
    if (e.target.closest('[data-dec]')) cart.set(id, it.qty - 1);
    if (e.target.closest('[data-del]')) cart.remove(id);
  });
  renderCart();
}
function renderCart() {
  const d = $('#cart-drawer');
  if (!d) return;
  const items = cart.items;
  d.innerHTML = `<div class="drawer__backdrop" data-close></div>
  <div class="drawer__panel">
    <div class="drawer__head"><h3>Votre panier <span class="muted">(${cart.count()})</span></h3><button class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button></div>
    <div class="drawer__body">
      ${items.length ? items.map((i) => `<div class="ci" data-id="${i.id}">
        ${productVisual(i, 'ci__v')}
        <div class="ci__info"><a href="/boutique/${esc(i.slug)}">${esc(i.name)}</a><span class="ci__price">${money(i.price)}</span>
          <div class="qty qty--sm"><button data-dec aria-label="Moins">${icon('minus')}</button><span>${i.qty}</span><button data-inc aria-label="Plus">${icon('plus')}</button></div></div>
        <button class="icon-btn ci__del" data-del aria-label="Retirer">${icon('trash')}</button></div>`).join('')
      : `<div class="empty">${icon('bag')}<p>Votre panier est vide.</p><a href="/boutique" class="btn btn-primary btn-sm">Découvrir la boutique</a></div>`}
    </div>
    ${items.length ? `<div class="drawer__foot">
      <div class="row-between"><span>Sous-total</span><strong class="big-price">${money(cart.total())}</strong></div>
      <p class="muted small">Livraison et codes promo calculés à l’étape suivante.</p>
      <a href="/panier" class="btn btn-primary btn-block">Commander ${icon('arrow')}</a>
      <a href="${waMain('Bonjour, je souhaite commander : ' + items.map((i) => `${i.qty} × ${i.name}`).join(', '))}" target="_blank" rel="noopener" class="btn btn-ghost btn-block">${icon('whatsapp')} Commander via WhatsApp</a>
    </div>` : ''}
  </div>`;
}
export function openCart() {
  renderCart();
  $('#cart-drawer').classList.add('open');
  document.body.classList.add('no-scroll');
}
on('cart', () => { updateCartCount(); renderCart(); });
on('open-cart', openCart);
on('user', () => updateAccount());

/* ----------------------------------------------------------------- footer */
function footer() {
  const s = state.settings, st = openStatus();
  const social = [['facebook', s.facebook], ['instagram', s.instagram], ['tiktok', s.tiktok]].filter(([, u]) => /^https?:\/\//.test(u || ''));
  $('#footer').innerHTML = `
  <div class="ft">
    <div class="ft__glow"></div>
    <div class="container">
      <div class="ft__cta" data-reveal>
        <h2 class="h2 light" data-split>Prête à <em>vous sublimer</em> ?</h2>
        <div class="ft__cta-btns">
          <a href="/reservation" class="btn btn-gold btn-lg" data-magnetic>${icon('calendar')} Prendre rendez-vous</a>
          <a href="${waMain('Bonjour, je souhaite prendre rendez-vous.')}" target="_blank" rel="noopener" class="btn btn-outline-light btn-lg">${icon('whatsapp')} WhatsApp</a>
        </div>
      </div>
      <div class="ft__grid">
        <div class="ft__brand">
          <a href="/" class="brand brand--light">${logoMark()}<span class="brand__txt"><span class="brand__name">${brandName()}</span><small>${esc(s.tagline)}</small></span></a>
          <p>Soins du visage & du corps, cosmetics, make-up, attache foulard, santé et dermo-conseils.</p>
          ${social.length ? `<div class="ft__social">${social.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${n}">${icon(n)}</a>`).join('')}</div>` : ''}
        </div>
        <div><h4>Explorer</h4><ul>${[...NAV.slice(1), ['/ateliers', 'Ateliers'], ['/conseils', 'Conseils beauté']].map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
        <div><h4>Services</h4><ul>
          <li><a href="/reservation">Prendre rendez-vous</a></li><li><a href="/sur-mesure">Commande sur-mesure</a></li>
          <li><a href="/diagnostic">Diagnostic de peau</a></li><li><a href="/suivi">Suivre ma demande</a></li><li><a href="/compte">Mon espace</a></li></ul></div>
        <div><h4>Contact</h4><ul class="ft__contact">
          ${phones().map((p) => `<li><a href="${telHref(p)}" data-external>${icon('phone')} ${esc(p)}</a></li>`).join('')}
          <li><a href="${waMain('Bonjour !')}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a></li>
          ${s.email ? `<li><a href="mailto:${esc(s.email)}" data-external>${icon('mail')} ${esc(s.email)}</a></li>` : ''}
          ${s.address || s.city ? `<li><span>${icon('pin')} ${esc([s.address, s.city].filter(Boolean).join(', '))}</span></li>` : ''}
          <li><span class="open-dot ${st.open ? 'on' : ''}"></span> ${esc(st.label)}</li>
        </ul></div>
        <div class="ft__news"><h4>Newsletter</h4><p>Nouveautés, ateliers et offres réservées, une fois par mois.</p>
          <form class="news-form"><input type="email" name="email" placeholder="Votre e-mail" required aria-label="E-mail"><button class="btn btn-gold btn-sm" aria-label="S'inscrire">${icon('send')}</button></form></div>
      </div>
      <div class="ft__bottom"><span>© ${new Date().getFullYear()} ${esc(s.site_name)} — Tous droits réservés.</span><span><a href="/admin" data-external>Espace pro</a></span></div>
    </div>
    <div class="ft__huge" aria-hidden="true">${esc(s.site_name)}</div>
  </div>`;
  $('.news-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    await busy(f.querySelector('button'), async () => {
      try { await api('/api/newsletter', { method: 'POST', body: formData(f) }); f.reset(); toast('Merci ! Vous êtes inscrite à la newsletter.'); }
      catch (err) { toast(err.message, 'err'); }
    });
  });
}

/* --------------------------------------------- barre d'actions mobile */
function mobileBar() {
  const bar = document.createElement('div');
  bar.className = 'mbar';
  const tel = phones()[0];
  bar.innerHTML = `${tel ? `<a href="${telHref(tel)}" data-external>${icon('phone')}<span>Appeler</span></a>` : ''}
    <a href="${waMain('Bonjour, je souhaite un renseignement.')}" target="_blank" rel="noopener">${icon('whatsapp')}<span>WhatsApp</span></a>
    <a href="/reservation" class="mbar__main">${icon('calendar')}<span>Réserver</span></a>
    <a href="/boutique">${icon('bag')}<span>Boutique</span></a>
    <a href="/compte">${icon('user')}<span>Compte</span></a>`;
  document.body.append(bar);
}

/* -------------------------------------------------------------- démarrage */
async function boot() {
  const t0 = performance.now();
  try {
    const b = await api('/api/bootstrap');
    state.settings = b.settings;
    state.user = b.user;
  } catch (e) {
    $('#app').innerHTML = `<div class="container section"><h1 class="h2">Connexion impossible</h1><p>${esc(e.message)}</p><p>Appelez-nous : <strong>01 63 40 35 39</strong> · <strong>01 97 04 52 83</strong></p></div>`;
    A.preloaderDone();
    return;
  }
  header();
  footer();
  cartDrawer();
  mobileBar();
  mountAssistant();
  A.cursor();
  A.ripples();
  await render(new URL(location.href), { first: true });
  A.refresh(document.getElementById('footer'));
  const wait = 1100 - (performance.now() - t0);
  if (wait > 0) await sleep(wait);
  A.preloaderDone();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
}

on('settings', () => { header(); footer(); });
export const refreshUser = (u) => { state.user = u; emit('user', u); };
boot();
