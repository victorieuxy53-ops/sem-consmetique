/* Effets d'interface, dans l'esprit des sites des grandes marques :
   - apparitions au défilement : titres révélés mot à mot, photos dévoilées comme un rideau, images qui se posent en fondu ;
   - en-tête compact, défilement horizontal à la souris, parallaxe légère ;
   - sur ordinateur : halo lumineux qui suit la souris sur les cartes, cartes produits inclinées en 3D,
     boutons « magnétiques » attirés par le curseur ;
   - bandeau défilant qui accélère (et change de sens) avec le défilement, pastille qui vole jusqu'au panier.
   Aucune position de mise en page n'est modifiée (uniquement transformations, opacité et découpes).
   Tout est coupé si la visiteuse préfère réduire les animations ; les effets « souris » ne concernent que
   les écrans avec souris ou pavé tactile. */
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------ apparitions */
// Conteneurs de photos dévoilés comme un rideau (avec léger zoom arrière de la photo).
const CURTAIN = '.star__media, .pcard__media, .ccard__media, .bcard__media, .founder__frame, .mitem';

let io;
const observer = () => io || (io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    el.classList.add('in');
    io.unobserve(el);
    // Une fois apparu, plus aucun délai : survols et effets de souris répondent immédiatement.
    if (el.style.getPropertyValue('--d')) setTimeout(() => el.style.removeProperty('--d'), 1600);
  }
}, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }));

function reveal(root) {
  $$('[data-stagger]', root).forEach((p) => {
    const step = Math.min(+p.dataset.stagger || 80, 70);
    [...p.children].forEach((c, i) => {
      if (c.classList.contains('in')) return;
      if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', 'up');
      c.style.setProperty('--d', `${Math.min(i, 8) * step}ms`);
    });
  });
  $$('[data-delay]:not(.in)', root).forEach((el) => el.style.setProperty('--d', Math.min(+el.dataset.delay, 300) + 'ms'));
  $$(CURTAIN, root).forEach((el) => el.classList.add('ir'));
  const r = reduce();
  $$('[data-reveal]:not(.in), [data-split]:not(.in), .ir:not(.in)', root).forEach((el) => (r ? el.classList.add('in') : observer().observe(el)));
}

/** Images chargées à la demande : elles apparaissent en fondu au lieu de s'afficher par morceaux. */
function imageFade(root) {
  if (reduce()) return;
  $$('img[loading="lazy"]:not([data-if])', root).forEach((img) => {
    img.setAttribute('data-if', '');
    if (img.complete && img.naturalWidth) return;
    img.classList.add('iw');
    const done = () => { img.classList.remove('iw'); img.classList.add('iok'); };
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

/* ------------------------------------------------------- défilement horizontal */
function dragScroll(root) {
  $$('[data-hscroll]:not(.hs)', root).forEach((el) => {
    el.classList.add('hs');
    let down = false, sx = 0, sl = 0, moved = false;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; el.classList.add('dragging'); });
    addEventListener('pointerup', () => { down = false; el.classList.remove('dragging'); });
    el.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; el.scrollLeft = sl - dx; });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    const wrap = el.closest('[data-hs-wrap]'), step = () => Math.max(260, el.clientWidth * 0.8);
    wrap?.querySelector('[data-hs-prev]')?.addEventListener('click', () => el.scrollBy({ left: -step(), behavior: 'smooth' }));
    wrap?.querySelector('[data-hs-next]')?.addEventListener('click', () => el.scrollBy({ left: step(), behavior: 'smooth' }));
  });
}

/* -------------------------------------------- bandeau défilant (vitesse liée au défilement) */
const MQ = new Map();
let mqio, mqRaf = 0, vel = 0, dir = 1;
function marquee(root) {
  if (reduce()) return;
  mqio ||= new IntersectionObserver((es) => { for (const e of es) { const s = MQ.get(e.target); if (s) s.vis = e.isIntersecting; } kick(); });
  $$('.marquee__track:not(.mq)', root).forEach((t) => {
    t.classList.add('mq');
    const s = { x: 0, t: 0, vis: false, hold: false };
    MQ.set(t, s);
    const box = t.parentElement;
    box.addEventListener('mouseenter', () => { s.hold = true; });
    box.addEventListener('mouseleave', () => { s.hold = false; });
    mqio.observe(t);
  });
}
function kick() { if (!mqRaf && [...MQ.values()].some((s) => s.vis)) mqRaf = requestAnimationFrame(mqStep); }
function mqStep(now) {
  mqRaf = 0;
  let any = false;
  for (const [el, s] of MQ) {
    if (!el.isConnected) { MQ.delete(el); mqio.unobserve(el); continue; }
    if (!s.vis) { s.t = 0; continue; }
    any = true;
    const dt = s.t ? Math.min(50, now - s.t) : 16;
    s.t = now;
    if (s.hold) continue;
    const half = el.scrollWidth / 2 || 1;
    const speed = half / 45 + Math.min(1400, Math.abs(vel)) * 0.55; // 45 s par tour au repos, plus vite quand on défile
    s.x -= dir * speed * dt / 1000;
    if (s.x <= -half) s.x += half;
    if (s.x > 0) s.x -= half;
    el.style.transform = `translate3d(${s.x.toFixed(1)}px,0,0)`;
  }
  vel *= 0.93;
  if (any) mqRaf = requestAnimationFrame(mqStep);
}

/* ------------------------------------------------ défilement : en-tête, accueil, parallaxe */
// [sélecteur, vitesse] : déplacement vertical léger, seulement sur grand écran.
const PARALLAX = [['.hero__show', 0.07], ['.phero__show', 0.06], ['.founder__seal', -0.12], ['.testi__q', 0.1], ['.diag-steps', -0.04]];
let ticking = false, lastY = 0, lastT = 0;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame((now) => {
    ticking = false;
    const y = scrollY;
    document.body.classList.toggle('scrolled', y > 30);
    if (reduce()) return;
    // vitesse et sens du défilement (bandeau défilant)
    const dt = Math.max(16, now - lastT || 16), dy = y - lastY;
    if (Math.abs(dy) > 1) { vel = (dy / dt) * 1000; dir = dy < 0 ? -1 : 1; kick(); }
    lastY = y; lastT = now;
    // accueil : la vidéo descend plus lentement que la page, le texte s'estompe doucement
    const hero = document.querySelector('.hero');
    if (hero) {
      const h = hero.offsetHeight;
      if (y < h * 1.2) {
        hero.style.setProperty('--hero-y', `${Math.round(Math.min(y, h) * 0.32)}px`);
        hero.style.setProperty('--hero-o', Math.max(0.12, 1 - y / (h * 0.9)).toFixed(3));
      }
    }
    parallax();
  });
};
function parallax() {
  const on = innerWidth >= 900 && !reduce(), vh = innerHeight;
  for (const [sel, k] of PARALLAX) for (const el of $$(sel)) {
    if (!on) { if (el.classList.contains('px-on')) { el.classList.remove('px-on'); el.style.removeProperty('--py'); } continue; }
    const r = el.getBoundingClientRect(), cur = parseFloat(el.style.getPropertyValue('--py')) || 0;
    const top = r.top - cur;
    if (top > vh + 200 || top + r.height < -200) continue;
    el.classList.add('px-on');
    el.style.setProperty('--py', `${((top + r.height / 2 - vh / 2) * -k).toFixed(1)}px`);
  }
}

/* --------------------------------------------------- effets « souris » (ordinateur) */
const SPOT = '.uni, .star, .pcard, .ccard, .ecard, .bcard, .hfact';
const BAND = '.stats, .diag-cta, .call-band, .ft';
const TILT = '.star, .pcard, .ccard';
const MAG = '.btn:not(.btn-block):not(.btn-sm)';
const cur = { spot: null, band: null, tilt: null, mag: null };
const swap = (k, el, off) => { if (cur[k] && cur[k] !== el) off(cur[k]); cur[k] = el; };
const spotOff = (el) => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); };
const tiltOff = (el) => { el.classList.remove('tilting'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); };
const magOff = (el) => { el.classList.remove('mag-on'); el.style.removeProperty('--tx'); el.style.removeProperty('--ty'); };
const setXY = (el, e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`); el.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`); return r; };

function onPointer(e) {
  if (e.pointerType !== 'mouse') return;
  const t = e.target instanceof Element ? e.target : null;
  const spot = t?.closest(SPOT) || null, band = t?.closest(BAND) || null, tilt = t?.closest(TILT) || null, mag = t?.closest(MAG) || null;
  swap('spot', spot, spotOff); swap('band', band, spotOff); swap('tilt', tilt, tiltOff); swap('mag', mag, magOff);
  if (spot) setXY(spot, e);
  if (band) setXY(band, e);
  if (tilt) {
    const r = tilt.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    tilt.classList.add('tilting');
    tilt.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
    tilt.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
  }
  if (mag) {
    const r = mag.getBoundingClientRect(), c = (v, m) => Math.max(-m, Math.min(m, v));
    mag.classList.add('mag-on');
    mag.style.setProperty('--tx', `${c((e.clientX - r.left - r.width / 2) * 0.22, 10).toFixed(1)}px`);
    mag.style.setProperty('--ty', `${c((e.clientY - r.top - r.height / 2) * 0.3, 8).toFixed(1)}px`);
  }
}
const pointerOut = (e) => { if (!e.relatedTarget) for (const [k, off] of [['spot', spotOff], ['band', spotOff], ['tilt', tiltOff], ['mag', magOff]]) swap(k, null, off); };

/* ------------------------------------------------------------------ entrée */
/** (Re)branche les effets sur les éléments présents dans `root` (idempotent). */
export function refresh(root = document.body) {
  reveal(root);
  imageFade(root);
  dragScroll(root);
  marquee(root);
  onScroll();
}
export const install = () => {
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  if (!reduce() && fine()) {
    document.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerout', pointerOut, { passive: true });
  }
};

/** Ajout au panier : une pastille rose vole du bouton jusqu'à l'icône du panier, qui rebondit. */
export function flyToCart(from) {
  const target = document.querySelector('.cart-btn');
  if (!target || reduce()) return;
  const bump = () => { target.classList.add('bump'); setTimeout(() => target.classList.remove('bump'), 600); };
  const a = from?.getBoundingClientRect?.(), b = target.getBoundingClientRect();
  if (!a || !b.width || !a.width) return bump();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const outer = document.createElement('span'), inner = document.createElement('i');
  outer.className = 'fly-dot';
  outer.style.left = `${a.left + a.width / 2 - 9}px`;
  outer.style.top = `${a.top + a.height / 2 - 9}px`;
  outer.appendChild(inner);
  document.body.appendChild(outer);
  const opts = { duration: 780, fill: 'forwards' };
  outer.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], { ...opts, easing: 'cubic-bezier(.45,.05,.55,.95)' });
  inner.animate([{ transform: 'translateY(0) scale(1)' }, { transform: `translateY(${dy}px) scale(.45)` }], { ...opts, easing: 'cubic-bezier(.55,-0.55,.75,.6)' })
    .finished.then(() => { outer.remove(); bump(); }, () => outer.remove());
}
