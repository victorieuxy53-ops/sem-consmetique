/* Illustrations vectorielles générées (produits, logo, couvertures) :
   le site reste beau même avant l'ajout de vraies photos depuis l'admin. */
import { esc, initials, state } from './core.js';
import { icon } from './icons.js';

let uid = 0;
const safeColor = (c) => (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(c || '')) ? c : '#c49a5a');
export function shade(hex, amt) {
  let c = safeColor(hex).slice(1);
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const n = parseInt(c, 16), p = Math.abs(amt) / 100, t = amt < 0 ? 0 : 255;
  const ch = (v) => Math.round((t - v) * p + v);
  return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
}

export function productArt(kind = 'jar', color = '#c49a5a') {
  const id = 'pa' + ++uid;
  const c = safeColor(color), L = shade(c, 38), D = shade(c, -38), LL = shade(c, 72);
  const B = `url(#${id}b)`, G = `url(#${id}g)`, K = `url(#${id}k)`, S = `url(#${id}s)`;
  const label = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#fbf7f2" opacity=".93"/>
    <rect x="${x + 8}" y="${y + h * 0.3}" width="${w - 16}" height="2.2" fill="${D}" opacity=".75"/>
    <rect x="${x + 14}" y="${y + h * 0.52}" width="${w - 28}" height="1.4" fill="${D}" opacity=".45"/>
    <rect x="${x + 18}" y="${y + h * 0.68}" width="${w - 36}" height="1.4" fill="${D}" opacity=".3"/>`;
  const shapes = {
    serum: `<rect x="86" y="70" width="28" height="24" fill="${G}"/><path d="M88 72V42a12 12 0 0 1 24 0v30z" fill="${K}"/>
      <rect x="66" y="92" width="68" height="124" rx="16" fill="${B}"/><rect x="72" y="100" width="9" height="104" rx="4.5" fill="${S}"/>${label(76, 140, 48, 44)}`,
    jar: `<rect x="46" y="128" width="108" height="88" rx="18" fill="${B}"/><rect x="40" y="96" width="120" height="40" rx="10" fill="${G}"/>
      <rect x="44" y="132" width="112" height="5" fill="#000" opacity=".1"/><rect x="54" y="142" width="11" height="64" rx="5.5" fill="${S}"/>${label(72, 152, 56, 42)}`,
    tube: `<path d="M62 34h76l-8 146H70z" fill="${B}"/><rect x="58" y="24" width="84" height="14" rx="2" fill="${D}"/>
      <path d="M64 28h72M64 32h72" stroke="${LL}" stroke-opacity=".45"/><rect x="72" y="178" width="56" height="38" rx="6" fill="${K}"/>
      <rect x="70" y="44" width="9" height="118" rx="4.5" fill="${S}"/>${label(80, 84, 40, 56)}`,
    pump: `<rect x="62" y="102" width="76" height="114" rx="22" fill="${B}"/><rect x="84" y="84" width="32" height="22" rx="3" fill="${G}"/>
      <rect x="96" y="58" width="8" height="28" fill="${G}"/><path d="M78 44h42a6 6 0 0 1 6 6v10H78z" fill="${K}"/><path d="M126 48h24v7h-24z" fill="${K}"/>
      <rect x="70" y="114" width="9" height="88" rx="4.5" fill="${S}"/>${label(82, 140, 36, 46)}`,
    bottle: `<rect x="64" y="74" width="72" height="142" rx="12" fill="${B}"/><rect x="78" y="44" width="44" height="32" rx="6" fill="${G}"/>
      <rect x="71" y="84" width="9" height="122" rx="4.5" fill="${S}"/>${label(78, 118, 44, 62)}`,
    oil: `<path d="M84 64h32v18c22 8 30 22 30 40v80a14 14 0 0 1-14 14H68a14 14 0 0 1-14-14v-80c0-18 8-32 30-40z" fill="${B}"/>
      <rect x="84" y="34" width="32" height="32" rx="5" fill="${G}"/><path d="M66 124c0-14 6-24 18-30" stroke="#fff" stroke-opacity=".5" stroke-width="7" stroke-linecap="round" fill="none"/>${label(72, 140, 56, 48)}`,
    soap: `<path d="M34 150c0-14 10-22 26-22h80c16 0 26 8 26 22v28c0 14-10 22-26 22H60c-16 0-26-8-26-22z" fill="${B}"/>
      <ellipse cx="100" cy="146" rx="60" ry="14" fill="${L}" opacity=".45"/><ellipse cx="100" cy="174" rx="32" ry="10" fill="none" stroke="${LL}" stroke-opacity=".5" stroke-width="2.5"/>
      <path d="M100 168c6-6 14-7 18-6-3 6-10 10-18 6z" fill="${LL}" opacity=".6"/>`,
    lipstick: `<rect x="70" y="140" width="60" height="76" rx="6" fill="${G}"/><rect x="76" y="110" width="48" height="34" rx="3" fill="${G}"/>
      <path d="M82 112V62l36-22v72z" fill="${B}"/><rect x="70" y="150" width="60" height="4" fill="#000" opacity=".15"/><rect x="87" y="66" width="6" height="42" rx="3" fill="${S}"/>`,
    palette: `<rect x="26" y="80" width="148" height="116" rx="16" fill="${K}"/><rect x="34" y="88" width="132" height="100" rx="10" fill="#2e1f26"/>
      ${[[62, 118, L], [100, 118, c], [138, 118, D], [62, 160, LL], [100, 160, shade(c, 18)], [138, 160, shade(c, -58)]]
        .map(([x, y, f]) => `<circle cx="${x}" cy="${y}" r="15" fill="${f}"/><path d="M${x - 9} ${y - 5}a10 10 0 0 1 8-6" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" fill="none" stroke-linecap="round"/>`).join('')}`,
    scarf: `<defs><pattern id="${id}p" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="22" height="22" fill="${c}"/>
      <circle cx="11" cy="11" r="4.5" fill="${LL}" opacity=".75"/><rect width="22" height="3" fill="${D}" opacity=".55"/><circle cx="0" cy="0" r="2" fill="${D}"/></pattern></defs>
      <path d="M28 92c30-30 114-30 144 0l-12 112c-40 18-80 18-120 0z" fill="url(#${id}p)"/>
      <path d="M58 112c10 30 6 62-4 88M142 112c-10 30-6 62 4 88" stroke="#000" stroke-opacity=".14" stroke-width="7" fill="none"/>
      <path d="M28 92c30 22 114 22 144 0" stroke="${D}" stroke-width="3" fill="none" opacity=".6"/><ellipse cx="100" cy="86" rx="24" ry="14" fill="${D}"/><ellipse cx="94" cy="82" rx="8" ry="4" fill="#fff" opacity=".2"/>`,
    box: `<rect x="38" y="110" width="124" height="106" rx="6" fill="${B}"/><rect x="30" y="92" width="140" height="28" rx="5" fill="${shade(c, 12)}"/>
      <rect x="92" y="92" width="16" height="124" fill="${G}"/><path d="M100 92c-20-26-46-24-40-6 4 10 24 8 40 6zM100 92c20-26 46-24 40-6-4 10-24 8-40 6z" fill="${G}"/>
      <rect x="46" y="124" width="9" height="84" rx="4.5" fill="${S}"/>`,
  };
  return `<svg class="art" viewBox="0 0 200 240" aria-hidden="true"><defs>
    <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${D}"/><stop offset=".35" stop-color="${c}"/><stop offset=".58" stop-color="${L}"/><stop offset="1" stop-color="${D}"/></linearGradient>
    <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#8a6a3a"/><stop offset=".42" stop-color="#e9cf98"/><stop offset=".6" stop-color="#f8e9c8"/><stop offset="1" stop-color="#9c7a45"/></linearGradient>
    <linearGradient id="${id}k" x1="0" x2="1"><stop offset="0" stop-color="#1c1116"/><stop offset=".5" stop-color="#4d3743"/><stop offset="1" stop-color="#1c1116"/></linearGradient>
    <linearGradient id="${id}s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs><ellipse cx="100" cy="222" rx="64" ry="9" fill="#000" opacity=".13"/>${shapes[kind] || shapes.jar}</svg>`;
}

/** Visuel d'un produit : photo envoyée par l'admin, sinon illustration. */
export function productVisual(p, cls = '') {
  return `<div class="pv ${cls}" style="--c:${safeColor(p.color)}">${p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
    : productArt(p.art, p.color)}</div>`;
}

export function logoMark(cls = '') {
  const g = 'lm' + ++uid;
  return `<svg class="logo-mark ${cls}" viewBox="0 0 120 120" aria-hidden="true">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dcae"/><stop offset=".5" stop-color="#c49a5a"/><stop offset="1" stop-color="#8f6a35"/></linearGradient></defs>
    <circle cx="60" cy="60" r="55" fill="none" stroke="url(#${g})" stroke-width="3"/>
    <circle cx="60" cy="60" r="47" fill="none" stroke="url(#${g})" stroke-width="1" opacity=".6"/>
    <path d="M60 24c11 17 23 27 23 43a23 23 0 0 1-46 0c0-16 12-26 23-43z" fill="url(#${g})"/>
    <path d="M52 66a9 9 0 0 0 8 9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/></svg>`;
}

export function brandName() {
  const name = state.settings?.site_name || 'Institut';
  const w = name.trim().split(/\s+/);
  return w.length > 1 ? `${esc(w.slice(0, -1).join(' '))} <em>${esc(w.at(-1))}</em>` : `<em>${esc(name)}</em>`;
}

/** Couverture de formation / article / atelier (dégradé + motif). */
export function cover(item, { label = '', iconName = 'play', image = item.image } = {}) {
  return `<div class="cover" style="--c:${safeColor(item.color)};--c2:${shade(item.color, -45)}">
    ${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : `<span class="cover__orb"></span><span class="cover__orb o2"></span>
    <span class="cover__ring"></span>${label ? `<span class="cover__label">${esc(label)}</span>` : ''}`}
    <span class="cover__icon">${icon(iconName)}</span></div>`;
}

export function avatar(name, color) {
  return `<span class="avatar" style="--c:${safeColor(color || '#9b4d6e')}">${esc(initials(name))}</span>`;
}

export function stars(n = 5) {
  return `<span class="stars" aria-label="${n} sur 5">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= n ? 'on' : ''}">${icon('star')}</span>`).join('')}</span>`;
}

/** Badge circulaire au texte tournant. */
export function spinBadge(text, center = 'sparkle') {
  const id = 'sb' + ++uid;
  return `<div class="spin-badge"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><path id="${id}" d="M100 100m-76 0a76 76 0 1 1 152 0a76 76 0 1 1-152 0"/></defs>
    <text><textPath href="#${id}" startOffset="0" textLength="468" lengthAdjust="spacing">${esc(text)}</textPath></text></svg><span>${icon(center)}</span></div>`;
}
