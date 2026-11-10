/* Effets d'interface sobres : apparition discrète au défilement, en-tête compact, défilement horizontal,
   retour visuel du panier. Tout est désactivé si l'utilisatrice préfère réduire les animations. */
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let io;
const observer = () => io || (io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }));

function reveal(root) {
  $$('[data-stagger]', root).forEach((p) => {
    const step = Math.min(+p.dataset.stagger || 80, 70);
    [...p.children].forEach((c, i) => {
      if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', 'up');
      c.style.setProperty('--d', `${Math.min(i, 8) * step}ms`);
    });
  });
  $$('[data-delay]', root).forEach((el) => el.style.setProperty('--d', Math.min(+el.dataset.delay, 300) + 'ms'));
  const r = reduce();
  $$('[data-reveal]:not(.in), [data-split]:not(.in)', root).forEach((el) => (r ? el.classList.add('in') : observer().observe(el)));
}

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

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; document.body.classList.toggle('scrolled', scrollY > 30); });
};

/** (Re)branche les effets sur les éléments présents dans `root` (idempotent). */
export function refresh(root = document.body) {
  reveal(root);
  dragScroll(root);
  onScroll();
}
export const install = () => addEventListener('scroll', onScroll, { passive: true });

/** Retour visuel discret sur l'icône du panier. */
export function flyToCart() {
  const target = document.querySelector('.cart-btn');
  if (!target || reduce()) return;
  target.classList.add('bump');
  setTimeout(() => target.classList.remove('bump'), 600);
}
