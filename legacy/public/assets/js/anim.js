/* Moteur d'animation : révélations au scroll, texte découpé, compteurs,
   cartes 3D, boutons magnétiques, parallaxe, particules, curseur, rideau. */
import { $, $$, sleep } from './core.js';

export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = matchMedia('(pointer: fine)').matches;

/* ------------------------------------------------------------ reveal */
let io;
const observer = () => io || (io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 }));

export function reveal(root = document) {
  $$('[data-stagger]', root).forEach((p) => {
    const step = +p.dataset.stagger || 80;
    [...p.children].forEach((c, i) => {
      if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', p.dataset.type || 'up');
      c.style.setProperty('--d', `${Math.min(i, 12) * step}ms`);
    });
  });
  $$('[data-delay]', root).forEach((el) => el.style.setProperty('--d', el.dataset.delay + 'ms'));
  $$('[data-reveal]:not(.in), [data-split]:not(.in)', root).forEach((el) => (reduce ? el.classList.add('in') : observer().observe(el)));
}

/* ----------------------------------------------- titres mot par mot */
export function split(root = document) {
  $$('[data-split]:not(.is-split)', root).forEach((el) => {
    el.classList.add('is-split');
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'sw';
            const c = document.createElement('span'); c.className = 'sc'; c.textContent = part; c.style.setProperty('--i', i++);
            w.append(c); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  });
}

/* ---------------------------------------------------------- compteurs */
export function counters(root = document) {
  $$('[data-count]:not(.counted)', root).forEach((el) => {
    el.classList.add('counted');
    const end = parseFloat(el.dataset.count) || 0;
    const dec = (String(el.dataset.count).split('.')[1] || '').length;
    const fmt = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduce) { el.textContent = fmt(end); return; }
    el.textContent = fmt(0);
    const o = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now(), dur = 2000;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(end * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    o.observe(el);
  });
}

/* ---------------------------------------------------- cartes 3D (tilt) */
export function tilt(root = document) {
  if (!fine || reduce) return;
  $$('[data-tilt]:not(.tilted)', root).forEach((el) => {
    el.classList.add('tilted');
    const max = +el.dataset.tilt || 8;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * max * 1.2).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

/* ------------------------------------------------ boutons magnétiques */
export function magnetic(root = document) {
  if (!fine || reduce) return;
  $$('[data-magnetic]:not(.mag)', root).forEach((el) => {
    el.classList.add('mag');
    const s = +el.dataset.magnetic || 0.3;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * s}px, ${(e.clientY - r.top - r.height / 2) * s}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ----------------------------------------------------------- parallaxe */
let plx = [];
let depthEls = [];
export function parallax(root = document) {
  plx = $$('[data-parallax]', document).map((el) => ({ el, s: +el.dataset.parallax || 0.15 }));
  depthEls = $$('[data-depth]', root).map((el) => ({ el, d: +el.dataset.depth || 10 }));
  onScroll();
}
function updateParallax() {
  const vh = innerHeight;
  for (const { el, s } of plx) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) continue;
    el.style.setProperty('--py', `${((r.top + r.height / 2 - vh / 2) * -s).toFixed(1)}px`);
  }
}
if (fine && !reduce) {
  addEventListener('pointermove', (e) => {
    if (!depthEls.length) return;
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    for (const { el, d } of depthEls) el.style.transform = `translate3d(${(x * d).toFixed(1)}px, ${(y * d).toFixed(1)}px, 0)`;
  }, { passive: true });
}

/* --------------------------------------------------- scroll global */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    document.body.classList.toggle('scrolled', y > 30);
    const bar = $('#scroll-progress');
    if (bar) bar.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    if (!reduce) updateParallax();
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll, { passive: true });

/* --------------------------------------------------- défilement horizontal */
export function dragScroll(root = document) {
  $$('[data-hscroll]:not(.hs)', root).forEach((el) => {
    el.classList.add('hs');
    let down = false, sx = 0, sl = 0, moved = false;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; el.classList.add('dragging'); });
    addEventListener('pointerup', () => { down = false; el.classList.remove('dragging'); });
    el.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) moved = true; el.scrollLeft = sl - dx; });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    const wrap = el.closest('[data-hs-wrap]');
    if (wrap) {
      const step = () => Math.max(260, el.clientWidth * 0.8);
      wrap.querySelector('[data-hs-prev]')?.addEventListener('click', () => el.scrollBy({ left: -step(), behavior: 'smooth' }));
      wrap.querySelector('[data-hs-next]')?.addEventListener('click', () => el.scrollBy({ left: step(), behavior: 'smooth' }));
    }
  });
}

/* ---------------------------------------------------------- particules */
export function particles(canvas) {
  if (!canvas || reduce) return () => {};
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  let w = 0, h = 0, raf = 0, visible = true, parts = [];
  const spawn = (init) => ({
    x: Math.random() * w, y: init ? Math.random() * h : h + 10, r: Math.random() * 2.2 + 0.4,
    s: Math.random() * 0.35 + 0.08, a: Math.random() * 6.28, tw: Math.random() * 0.025 + 0.008, o: Math.random() * 0.55 + 0.2,
  });
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(80, (w * h) / 15000));
    parts = Array.from({ length: n }, () => spawn(true));
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y -= p.s; p.a += p.tw; p.x += Math.sin(p.a) * 0.25;
      if (p.y < -10) Object.assign(p, spawn(false));
      const o = p.o * (0.55 + 0.45 * Math.sin(p.a * 2));
      ctx.fillStyle = `rgba(232,200,140,${o.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      if (p.r > 2) {
        ctx.strokeStyle = `rgba(255,235,200,${(o * 0.6).toFixed(3)})`; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(p.x - p.r * 3, p.y); ctx.lineTo(p.x + p.r * 3, p.y); ctx.moveTo(p.x, p.y - p.r * 3); ctx.lineTo(p.x, p.y + p.r * 3); ctx.stroke();
      }
    }
    raf = visible ? requestAnimationFrame(draw) : 0;
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const vo = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); });
  vo.observe(canvas);
  raf = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); vo.disconnect(); visible = false; };
}

/* -------------------------------------------------------------- curseur */
export function cursor() {
  if (!fine || reduce) return;
  const dot = $('.cursor-dot'), ring = $('.cursor-ring');
  if (!dot || !ring) return;
  const label = ring.querySelector('span');
  document.body.classList.add('has-cursor');
  let x = -100, y = -100, rx = -100, ry = -100;
  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    document.body.classList.remove('cursor-hidden');
  }, { passive: true });
  document.addEventListener('pointerleave', () => document.body.classList.add('cursor-hidden'));
  const loop = () => {
    rx += (x - rx) * 0.17; ry += (y - ry) * 0.17;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('a, button, [data-cursor], label, select, summary, [role=button]');
    const lbl = e.target.closest?.('[data-cursor]')?.dataset.cursor || '';
    ring.classList.toggle('is-hover', !!t);
    ring.classList.toggle('has-label', !!lbl);
    label.textContent = lbl;
  });
  addEventListener('pointerdown', () => ring.classList.add('is-down'));
  addEventListener('pointerup', () => ring.classList.remove('is-down'));
}

/* ------------------------------------------------ ondulation des boutons */
export function ripples() {
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn');
    if (!b || reduce) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    const size = Math.max(r.width, r.height) * 2;
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.append(s);
    setTimeout(() => s.remove(), 700);
  });
}

/* ------------------------------------------------- rideau entre pages */
export async function curtainIn() {
  if (reduce) return;
  const c = $('#curtain');
  c.className = '';
  void c.offsetWidth;
  c.className = 'in';
  await sleep(520);
}
export function curtainOut() {
  if (reduce) return;
  const c = $('#curtain');
  c.className = 'in out';
  setTimeout(() => { if (c.className === 'in out') c.className = ''; }, 800);
}

export function preloaderDone() {
  const p = $('#preloader');
  if (!p) return;
  p.classList.add('done');
  document.body.classList.remove('is-loading');
  setTimeout(() => p.remove(), 1400);
}

/* --------------------------------------------- produit qui vole au panier */
export function flyToCart(fromEl) {
  const target = $('.cart-btn');
  if (!fromEl || !target || reduce) { target?.classList.add('bump'); setTimeout(() => target?.classList.remove('bump'), 600); return; }
  const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
  const clone = fromEl.cloneNode(true);
  clone.classList.add('flying');
  clone.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;z-index:9500;pointer-events:none;margin:0`;
  document.body.append(clone);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  clone.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy - 120}px) scale(.55) rotate(-8deg)`, opacity: 0.95, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(12deg)`, opacity: 0.2 },
  ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => {
    clone.remove();
    target.classList.add('bump');
    setTimeout(() => target.classList.remove('bump'), 600);
  };
}

/* -------------------------------------------------------------- confettis */
export function confetti(origin) {
  if (reduce || !origin) return;
  const r = origin.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const colors = ['#c49a5a', '#e2c28b', '#e7b7bd', '#9b4d6e', '#f6e3e1', '#7b2d42'];
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    const size = 6 + Math.random() * 7;
    s.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;background:${colors[i % colors.length]};border-radius:${Math.random() > 0.6 ? '50%' : '2px'}`;
    document.body.append(s);
    const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 170;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 60;
    s.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy + 220}px)) rotate(${Math.random() * 900}deg)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
  }
}

/* ------------------------------------------------------------ tout-en-un */
export function refresh(root = document) {
  split(root);
  reveal(root);
  counters(root);
  tilt(root);
  magnetic(root);
  dragScroll(root);
  parallax(root);
}
