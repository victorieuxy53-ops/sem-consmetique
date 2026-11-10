'use client';
/* Composants partagés : contexte, icônes, illustrations, titres animés, champs, cartes, modales, toasts. */
import { createContext, Fragment, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  api, cap, cart, cartStore, CATS, closeModal, copy, cx, discount, fdate, fdur, formData, fshort, hasBulk, initials, lockScroll, md, modals,
  money, openModal, PCATS, pct, savedContact, saveContact, setSettings, settings, STATUS, toast, toasts, useStore, waMain, whatsappRelay,
} from '@/lib/core';
import { flyToCart, reduce } from '@/lib/fx';

/* ================================================================ CONTEXTE */
const Ctx = createContext({ s: {}, user: null, setUser: () => {} });
export const useApp = () => useContext(Ctx);

export function App({ settings: s, user: u0, slides = [], children }) {
  setSettings(s);
  const [user, setUser] = useState(u0), [prev, setPrev] = useState(u0);
  if (u0 !== prev) { setPrev(u0); setUser(u0); } // nouvelle session côté serveur (connexion, router.refresh)
  useEffect(() => { cart.load(); cart.sync(); }, []);
  return <Ctx value={{ s, user, setUser, slides }}>{children}<Toasts /><ModalHost /></Ctx>;
}

/** Coordonnées connues (compte, sinon dernier formulaire envoyé). */
export function useContact() {
  const { user } = useApp();
  const [c, setC] = useState({});
  useEffect(() => { const sc = savedContact(); setC({ ...sc, ...(user ? { name: user.name, email: user.email, phone: user.phone || sc.phone } : {}) }); }, [user]);
  return c;
}

/** Soumission de formulaire : objet de données, état « occupé », erreurs en toast. */
export function useSubmit(fn) {
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = e.currentTarget;
    setBusy(true);
    try { await fn(formData(f), f); } catch (err) { toast(err.message, 'err'); } finally { setBusy(false); }
  };
  return [onSubmit, busy];
}
export const Btn = ({ busy, className = 'btn btn-primary', children, ...p }) => <button className={cx(className, busy && 'is-busy')} disabled={busy || p.disabled} {...p}>{children}</button>;

/* ================================================================ ICÔNES */
const P = {
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  whatsapp: 'M3 21l1.6-4.8A8.6 8.6 0 1 1 7.9 19.6zM9 8.6c.2 2.6 3.2 5.5 5.9 5.9l1.1-1.2-1.7-.9-.8.8c-1.1-.5-2.1-1.5-2.6-2.6l.8-.8-.9-1.7z',
  calendar: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18',
  bag: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  x: 'M18 6 6 18M6 6l12 12', menu: 'M3 12h18M3 6h18M3 18h18',
  arrow: 'M5 12h14M13 5l7 7-7 7', arrowL: 'M19 12H5M11 19l-7-7 7-7', arrowUR: 'M7 17 17 7M8 7h9v9', check: 'M20 6 9 17l-5-5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  lock: 'M5 11h14v11H5zM8 11V7a4 4 0 0 1 8 0v4',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  sparkle: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.2-6.1',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  face: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 14.5s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01',
  brush: 'M9.1 11.9l8-8a2.9 2.9 0 1 1 4 4l-8 8.1M7.1 14.9c-1.7 0-3 1.4-3 3 0 1.3-2.5 1.5-2 2 1.1 1.1 2.5 2 4 2 2.2 0 4-1.8 4-4a3 3 0 0 0-3-3z',
  wrap: 'M4.5 14C4.5 8.5 7.8 5 12 5s7.5 3.5 7.5 9M3.5 14.5c2.4-1.3 5.3-1.9 8.5-1.9s6.1.6 8.5 1.9M12 5c1-2.2 3.8-3 5.5-1.6M15.5 12.8c.8-2.6.1-5.4-1.6-7.3M8.5 18.5a3.5 3.5 0 0 0 7 0',
  drop: 'M12 2.7l5.7 5.6a8 8 0 1 1-11.3 0z', chevD: 'M6 9l6 6 6-6', chevR: 'M9 18l6-6-6-6', chevL: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM16 11.4A4 4 0 1 1 12.6 8a4 4 0 0 1 3.4 3.4zM17.5 6.5h.01',
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z', tiktok: 'M9 12a4 4 0 1 0 4 4V2c.5 2.5 2.5 4.5 5 5',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  store: 'M3 9l1.5-6h15L21 9M3 9v12h18V9M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M9 21v-6h6v6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  video: 'M23 7l-7 5 7 5zM1 5h15v14H1z', home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  ticket: 'M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2zM13 5v2M13 17v2M13 11v2',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  image: 'M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21', tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01', alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15', bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  copy: 'M9 9h13v13H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  award: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.2 13.9 7 23l5-3 5 3-1.2-9.1', wallet: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z',
  film: 'M2 2h20v20H2zM7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5', smartphone: 'M5 2h14v20H5zM12 18h.01',
  infinity: 'M12 12c-2-2.7-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.3 6-4zm0 0c2 2.7 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.3-6 4z',
  quote: 'M3 21c3 0 7-1 7-8V5H3v8h4c0 4-1 5-4 5zM14 21c3 0 7-1 7-8V5h-7v8h4c0 4-1 5-4 5z',
};
const FILLED = { star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z', play: 'M7 4.5v15l12.5-7.5z' };
export const Icon = ({ n, className }) => (
  <svg className={cx('i', FILLED[n] && 'i-fill', className)} viewBox="0 0 24 24" aria-hidden="true"><path d={FILLED[n] || P[n] || P.sparkle} /></svg>
);

/* =========================================================== ILLUSTRATIONS */
const safeColor = (c) => (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(c || '')) ? c : '#c49a5a');
export function shade(hex, amt) {
  let c = safeColor(hex).slice(1);
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const n = parseInt(c, 16), p = Math.abs(amt) / 100, t = amt < 0 ? 0 : 255, ch = (v) => Math.round((t - v) * p + v);
  return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
}
const useSvgId = () => 'u' + useId().replace(/[^\w-]/g, '');

/** Illustration vectorielle de produit (le site reste beau avant l'ajout de vraies photos). */
export function ProductArt({ kind = 'jar', color = '#c49a5a' }) {
  const id = useSvgId();
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
  const html = `<defs>
    <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${D}"/><stop offset=".35" stop-color="${c}"/><stop offset=".58" stop-color="${L}"/><stop offset="1" stop-color="${D}"/></linearGradient>
    <linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#8a6a3a"/><stop offset=".42" stop-color="#e9cf98"/><stop offset=".6" stop-color="#f8e9c8"/><stop offset="1" stop-color="#9c7a45"/></linearGradient>
    <linearGradient id="${id}k" x1="0" x2="1"><stop offset="0" stop-color="#1c1116"/><stop offset=".5" stop-color="#4d3743"/><stop offset="1" stop-color="#1c1116"/></linearGradient>
    <linearGradient id="${id}s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs><ellipse cx="100" cy="222" rx="64" ry="9" fill="#000" opacity=".13"/>${shapes[kind] || shapes.jar}`;
  return <svg className="art" viewBox="0 0 200 240" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}

export const ProductVisual = ({ p, className }) => (
  <div className={cx('pv', className)} style={{ '--c': safeColor(p.color) }}>
    {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <ProductArt kind={p.art} color={p.color} />}
  </div>
);

/** Emblème SEM Cosmétique : feuilles roses + profil féminin, dans un cercle. */
export const LogoMark = ({ className }) => (
  <svg className={cx('logo-mark', className)} viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth="2" />
    <path className="lm-leaf2" d="M54 91C38 93 25 85 20 72c15-4 28 4 34 19z" />
    <path className="lm-leaf" d="M56 90C33 86 24 64 31 35c19 6 31 27 25 55z" />
    <path d="M55 86C50 69 42 53 32 39" stroke="#fff" strokeOpacity=".75" fill="none" strokeWidth="1.6" strokeLinecap="round" />
    <path fill="currentColor" d="M78 27C69 27 62.5 33.5 62 42.5c-.2 3 .4 5-1.6 8.4L57.6 57c-.7 1.3 0 2.3 1.6 2.5l2.3.3-.4 2.6c-.2 1.2.6 1.8 1.6 1.9-.9.9-.6 2.2.5 2.7-.5 1.4-.2 3 1.4 3.6 1.7.6 4.2.2 6.4-.4l.9 10.2c-1.8 4-5.2 6.4-9.4 7.6 10 4.6 24.6 3.4 32.6-4.6-3-4-3.4-8-2.4-14 2-12 1.4-24-2.6-31.5C86 31.5 82.4 27 78 27z" />
    <path className="lm-hair" d="M90 44c-2 10-1 22 1 30" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);

export function BrandName() {
  const w = String(settings().site_name || 'SEM Cosmétique').trim().split(/\s+/);
  return w.length > 1 ? <>{w.slice(0, -1).join(' ')} <em>{w.at(-1)}</em></> : <em>{w[0]}</em>;
}

export const Brand = ({ light }) => (
  <a href="/" className={cx('brand', light && 'brand--light')} aria-label={`${settings().site_name}, accueil`}>
    <LogoMark /><span className="brand__txt"><span className="brand__name"><BrandName /></span><small>{settings().tagline}</small></span>
  </a>
);

/** Couverture de formation / article / atelier (dégradé + motif). */
export const Cover = ({ item, label = '', icon = 'play', image = item.image }) => (
  <div className="cover" style={{ '--c': safeColor(item.color), '--c2': shade(item.color, -45) }}>
    {image ? <img src={image} alt="" loading="lazy" /> : label && <span className="cover__label">{label}</span>}
    <span className="cover__icon"><Icon n={icon} /></span>
  </div>
);

export const Avatar = ({ name, color }) => <span className="avatar" style={{ '--c': safeColor(color || '#8a6a50') }}>{initials(name)}</span>;
export const Stars = ({ n = 5 }) => <span className="stars" aria-label={`${n} sur 5`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= n ? 'on' : ''}><Icon n="star" /></span>)}</span>;


/* ====================================================== TEXTE & MISE EN PAGE */
/** Titre révélé mot à mot ; `*mot*` = italique rose. */
export function Split({ as: T = 'h2', text, className, ...rest }) {
  let i = 0;
  const words = (s) => s.split(/(\s+)/).filter(Boolean).map((w, k) => (/^\s+$/.test(w) ? ' ' : <span className="sw" key={k}><span className="sc" style={{ '--i': i++ }}>{w}</span></span>));
  return (
    <T className={cx(className, 'is-split')} data-split="" {...rest}>
      {String(text ?? '').split(/\*(.+?)\*/).map((p, k) => (k % 2 ? <em key={k}>{words(p)}</em> : <Fragment key={k}>{words(p)}</Fragment>))}
    </T>
  );
}
export const Emph = ({ text }) => String(text ?? '').split(/\*(.+?)\*/).map((p, k) => (k % 2 ? <em key={k}>{p}</em> : p));
export const Paras = ({ text }) => String(text || '').split(/\n\s*\n/).map((p, i) => <p key={i}>{p.trim().split('\n').map((l, j) => <Fragment key={j}>{j > 0 && <br />}{l}</Fragment>)}</p>);
export const Md = ({ src, className = 'prose' }) => <div className={className} dangerouslySetInnerHTML={{ __html: md(src || '') }} />;

/** Compteur animé à l'apparition. */
export function Count({ to }) {
  const ref = useRef(null);
  const end = parseFloat(to) || 0, dec = (String(to).split('.')[1] || '').length;
  const fmt = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  useEffect(() => {
    const el = ref.current;
    if (reduce()) { el.textContent = fmt(end); return; }
    const o = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now();
      const tick = (t) => { const p = Math.min(1, (t - t0) / 2000); el.textContent = fmt(end * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    o.observe(el);
    return () => o.disconnect();
  }, [end]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{fmt(0)}</span>;
}

/** En-tête clair tant que la page est sur un bandeau sombre (vidéo, formation, espace client). */
export function DarkHeader() {
  useEffect(() => { document.body.classList.add('hdr-on-dark'); return () => document.body.classList.remove('hdr-on-dark'); }, []);
  return null;
}

/** Vidéo d'ambiance : chargée seulement quand elle devient visible, mise en pause hors écran,
    version légère sur mobile, image seule si connexion lente, économie de données ou animations réduites.
    `name` = fichiers /videos/{name}.mp4, {name}-sm.mp4 et {name}.jpg ; `src` = vidéo envoyée depuis l'admin. */
export function BgVideo({ name, src, poster, small, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current, c = navigator.connection;
    if (!v || reduce() || c?.saveData || /2g/.test(c?.effectiveType || '')) return;
    const light = small || matchMedia('(max-width: 760px)').matches || c?.effectiveType === '3g';
    const url = src || `/videos/${name}${light ? '-sm' : ''}.mp4`;
    v.muted = true;
    // Version grand écran absente : on se rabat sur la version légère (sinon on garde l'image fixe).
    v.onerror = () => { if (!src && !v.src.endsWith('-sm.mp4')) { v.src = `/videos/${name}-sm.mp4`; v.play().catch(() => {}); } };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return v.pause();
      if (!v.src) v.src = url;
      v.play().catch(() => {});
    }, { rootMargin: '150px' });
    io.observe(v);
    return () => io.disconnect();
  }, [name, src, small]);
  return <video ref={ref} className={cx('bgv', className)} poster={poster ?? (name && `/videos/${name}.jpg`)} muted loop playsInline preload="none" aria-hidden="true"
    onPlaying={(e) => e.currentTarget.classList.add('on')} />;
}

/** Point de départ du carrousel propre à chaque page (déterministe : même rendu serveur et navigateur). */
const seedOf = (str, n) => (n ? [...String(str)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % n : 0);

/** Carrousel photo automatique (une nouvelle photo toutes les `interval` ms) : fondu enchaîné, zoom lent,
    points avec barre de progression, flèches, balayage au doigt, pause au survol et hors écran.
    Seules la photo affichée et ses deux voisines sont chargées. */
export function Slideshow({ slides = [], interval = 3000, start = 0, className, captions = true, label = 'Nos soins en images' }) {
  const n = slides.length;
  const [i, setI] = useState(n ? start % n : 0), [hold, setHold] = useState(false), [away, setAway] = useState(false);
  const seen = useRef(new Set()), root = useRef(null), touch = useRef(null);
  const go = (k) => setI(((k % n) + n) % n);
  useEffect(() => {
    if (n < 2 || hold || away) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), interval);
    return () => clearTimeout(t);
  }, [i, n, hold, away, interval]);
  useEffect(() => {
    const el = root.current;
    if (!el || n < 2) return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    const vis = () => setAway(document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, [n]);
  if (!n) return null;
  const near = (k) => k === i || k === (i + 1) % n || k === (i - 1 + n) % n;
  return (
    <div ref={root} className={cx('slides', (hold || away) && 'paused', className)} style={{ '--int': `${interval}ms` }} role="region" aria-roledescription="carrousel" aria-label={label}
      onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); touch.current = null; }}>
      {slides.map((sl, k) => {
        const show = near(k) || seen.current.has(k);
        if (show) seen.current.add(k);
        const cap = captions && sl.title && (
          <figcaption className="slide__cap"><strong>{sl.title}</strong>{sl.sub && <small>{sl.sub}</small>}
            {(sl.price || sl.href) && <span className="slide__go">{sl.price ? money(sl.price) : 'Découvrir'} <Icon n="arrow" /></span>}</figcaption>);
        const inner = <>{show && <img src={sl.image} alt={sl.title || ''} decoding="async" />}{cap}</>;
        return (
          <figure key={k} className={cx('slide', k === i && 'on')} aria-hidden={k !== i} aria-roledescription="diapositive" aria-label={`${k + 1} sur ${n}`}>
            {sl.href ? <a href={sl.href} tabIndex={k === i ? 0 : -1}>{inner}</a> : inner}
          </figure>
        );
      })}
      {n > 1 && <>
        <button type="button" className="slides__arrow slides__arrow--prev" onClick={() => go(i - 1)} aria-label="Photo précédente"><Icon n="chevL" /></button>
        <button type="button" className="slides__arrow slides__arrow--next" onClick={() => go(i + 1)} aria-label="Photo suivante"><Icon n="chevR" /></button>
        <div className="slides__dots">{slides.map((_, k) => <button type="button" key={k === i ? `on${i}` : k} className={k === i ? 'on' : undefined} onClick={() => go(k)} aria-label={`Voir la photo ${k + 1}`} aria-current={k === i} />)}</div>
      </>}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, crumbs = [], cls, video, children, slideshow = true }) {
  const { slides } = useApp();
  const show = slideshow && slides?.length > 0;
  return (
    <section className={cx('phero', video && 'phero--video', show && 'phero--show', cls)}>
      {video && <><DarkHeader /><div className="phero__media" aria-hidden="true"><BgVideo name={video} /></div></>}
      <div className="container phero__in">
        <div className="phero__txt">
          <nav className="crumbs" aria-label="Fil d’Ariane" data-reveal><a href="/">Accueil</a>
            {crumbs.map(([h, l]) => <Fragment key={l}><span>/</span>{h ? <a href={h}>{l}</a> : <span aria-current="page">{l}</span>}</Fragment>)}</nav>
          {eyebrow && <p className="eyebrow" data-reveal data-delay="80">{eyebrow}</p>}
          <Split as="h1" className="h1" text={title} />
          {sub && <p className="lead" data-reveal data-delay="300">{sub}</p>}
          {children}
        </div>
        {show && <div className="phero__show" data-reveal="zoom" data-delay="200"><Slideshow slides={slides} start={seedOf(title, slides.length)} /></div>}
      </div>
    </section>
  );
}

export const SecHead = ({ eyebrow, title, sub, cls, side }) => (
  <div className={cx('sec-head', cls)}>
    <div>{eyebrow && <p className="eyebrow" data-reveal>{eyebrow}</p>}<Split text={title} className="h2" />{sub && <p className="lead" data-reveal data-delay="200">{sub}</p>}</div>
    {side}
  </div>
);

export const Empty = ({ text, icon = 'info', children }) => <div className="empty" data-reveal><Icon n={icon} /><p>{text}</p>{children}</div>;
export const Pill = ({ kind, s }) => { const [l, c] = STATUS[kind]?.[s] || [s, 'info']; return <span className={`pill pill--${c}`}>{l}</span>; };
export const OpenDot = ({ on }) => <span className={cx('open-dot', on && 'on')} />;
export const SuccessCheck = () => <div className="success__check"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg></div>;
export const Price = ({ p }) => { const off = discount(p); return <span className="price">{money(p.price)}{off > 0 && <> <s>{money(p.compare_price)}</s></>}</span>; };
/** Mention du prix dégressif (ex. « Dès 2 : 1 800 FCFA l’unité »). */
export const BulkNote = ({ p, className = 'bulk' }) => (hasBulk(p) ? <span className={className}><Icon n="tag" /> Dès {p.bulk_qty} : <strong>{money(p.bulk_price)}</strong> l’unité</span> : null);

/* ================================================================== CHAMPS */
export const Input = ({ label, className = 'field', ...p }) => <label className={className}><input placeholder=" " {...p} /><span>{label}</span></label>;
export const Area = ({ label, rows = 4, ...p }) => <label className="field"><textarea rows={rows} placeholder=" " {...p} /><span>{label}</span></label>;
export const Select = ({ label, options, className = 'field field--select', ...p }) => (
  <label className={className}><select {...p}>{options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select>{label && <span>{label}</span>}</label>
);
export const WHEN = ['Dès que possible', 'Ce matin', 'Cet après-midi', 'Ce soir', 'Demain'];

/** Sélecteur segmenté avec « encre » animée. */
export function Seg({ items, value, onChange, className = 'seg' }) {
  const ref = useRef(null);
  const [ink, setInk] = useState({});
  useLayoutEffect(() => {
    const a = ref.current?.querySelector('button.active');
    if (a) setInk({ width: a.offsetWidth, transform: `translateX(${a.offsetLeft - 4}px)` });
  }, [value]);
  return (
    <div className={className} ref={ref}>
      {items.map(([k, label]) => <button type="button" key={k} className={value === k ? 'active' : undefined} onClick={() => onChange(k)}>{label}</button>)}
      <span className="seg__ink" style={ink} />
    </div>
  );
}

/** Rejoue l'animation d'apparition quand une liste filtrée change. */
export const pop = (i, step = 50, max = 8) => ({ animation: `popIn .6s var(--ease) ${Math.min(i, max) * step}ms both` });

export function MomoBlock({ amount }) {
  const s = settings();
  return (
    <div className="momo">
      <p className="small">{s.payment_note}</p>
      {amount > 0 && <p className="momo__amount">Montant : <strong>{money(amount)}</strong></p>}
      <div className="momo__nums">{(s.momo || []).filter((m) => m.number).map((m) => (
        <div className="momo__num" key={m.number}><span className="momo__net">{m.network}</span><strong>{m.number}</strong>{m.name && <small>{m.name}</small>}
          <button type="button" className="icon-btn" onClick={() => copy(m.number)} aria-label="Copier"><Icon n="copy" /></button></div>
      ))}</div>
    </div>
  );
}

/* ================================================================== CARTES */
export function addToCart(p, qty, btn) {
  const inCart = cartStore.get().find((i) => i.id === p.id)?.qty || 0;
  if (p.stock !== null && inCart + qty > p.stock) return toast(`Stock limité : ${p.stock} disponible(s).`, 'info');
  cart.add(p, qty);
  flyToCart();
  btn.classList.add('added');
  setTimeout(() => btn.classList.remove('added'), 1200);
  toast(`« ${p.name} » ajouté au panier`);
}

export function ProductCard({ p, style }) {
  const off = discount(p), out = p.stock !== null && p.stock <= 0, low = !out && p.stock !== null && p.stock <= 5;
  return (
    <article className="pcard" style={style}>
      <a href={`/boutique/${p.slug}`} className="pcard__media">
        <ProductVisual p={p} />
        <div className="pcard__badges">{off > 0 && <span className="badge badge--gold">-{off}%</span>}{!!p.featured && <span className="badge">Coup de cœur</span>}
          {out ? <span className="badge badge--dark">Épuisé</span> : low && <span className="badge badge--warn">Plus que {p.stock}</span>}</div>
      </a>
      <div className="pcard__body">
        <span className="pcard__cat">{PCATS[p.category] || p.category}</span>
        <h3 className="pcard__name"><a href={`/boutique/${p.slug}`}>{p.name}</a></h3>
        <p className="pcard__short">{p.short}</p>
        <BulkNote p={p} />
        <div className="pcard__foot"><Price p={p} />
          <button className="add-btn" disabled={out} aria-label={`Ajouter ${p.name} au panier`} onClick={(e) => addToCart(p, 1, e.currentTarget)}><Icon n="plus" /><span>Ajouter</span></button></div>
      </div>
    </article>
  );
}

export function ServiceCard({ s, style, hidden }) {
  const c = CATS[s.category] || {};
  return (
    <article className="scard" style={{ '--c': c.color || '#9b4d6e', ...style }} hidden={hidden}>
      {s.image && <div className="scard__img"><img src={s.image} alt="" loading="lazy" /></div>}
      <div className="scard__top"><span className="scard__ic"><Icon n={c.icon} /></span><span className="scard__cat">{c.label}</span></div>
      <h3 className="scard__name">{s.name}</h3>
      <p className="scard__short">{s.short}</p>
      {s.description && <details className="scard__more"><summary>Détails du soin <Icon n="chevD" /></summary><p>{s.description}</p></details>}
      <div className="scard__meta"><span><Icon n="clock" /> {fdur(s.duration)}</span><strong className="price">{s.price ? money(s.price) : 'Sur devis'}</strong></div>
      <a href={`/reservation?service=${s.id}`} className="btn btn-primary btn-block btn-sm">Réserver ce soin <Icon n="arrow" /></a>
    </article>
  );
}

export function CourseCard({ c }) {
  const off = discount(c);
  return (
    <a href={`/formations/${c.slug}`} className="ccard">
      <div className="ccard__media"><Cover item={c} label={c.title.split(/[:—]/)[0]} />{off > 0 && <span className="badge badge--gold ccard__off">-{off}%</span>}</div>
      <div className="ccard__body">
        <span className="ccard__level">{c.level}</span>
        <h3>{c.title}</h3><p>{c.subtitle}</p>
        <div className="ccard__meta"><span><Icon n="film" /> {c.lessons_count || 0} leçons</span><span><Icon n="clock" /> {c.duration_label || fdur(c.total_minutes)}</span></div>
        <div className="ccard__foot"><span className="price">{c.price ? money(c.price) : 'Gratuit'}{off > 0 && <> <s>{money(c.compare_price)}</s></>}</span><span className="link-arrow">Voir <Icon n="arrow" /></span></div>
      </div>
    </a>
  );
}

export function EventCard({ e }) {
  const left = Math.max(0, e.seats - e.taken);
  return (
    <article className="ecard">
      <DateBox date={e.date} />
      <div className="ecard__body"><h3>{e.title}</h3><p>{e.description}</p>
        <div className="ecard__meta"><span><Icon n="clock" /> {e.time}{e.end_time && ` à ${e.end_time}`}</span><span><Icon n="pin" /> {e.location || `Chez ${settings().site_name}`}</span><span><Icon n="wallet" /> {e.price ? money(e.price) : 'Gratuit'}</span></div>
        <div className="seats"><div className="seats__bar"><span style={{ '--w': pct(e.taken, e.seats) + '%' }} /></div>
          <span className="seats__txt">{left ? <><strong>{left}</strong> place{left > 1 ? 's' : ''} restante{left > 1 ? 's' : ''} sur {e.seats}</> : <strong>Complet</strong>}</span></div>
      </div>
      <div className="ecard__cta"><button className="btn btn-primary" disabled={!left} onClick={() => eventModal(e)}>{left ? 'Réserver ma place' : 'Complet'}</button></div>
    </article>
  );
}

export const DateBox = ({ date, sm }) => (
  <div className={cx('ecard__date', sm && 'ecard__date--sm')}><small>{fdate(date, { weekday: 'short' })}</small><strong>{+date.slice(8)}</strong><span>{fdate(date, { month: 'short' })}</span></div>
);

export const PostCard = ({ p, hidden, style }) => (
  <a href={`/conseils/${p.slug}`} className="bcard" hidden={hidden} style={style}>
    <div className="bcard__media"><Cover item={p} label={p.category} icon="book" /></div>
    <div className="bcard__body"><span className="bcard__cat">{p.category || 'Conseil'}</span><h3>{p.title}</h3><p>{p.excerpt}</p>
      <span className="bcard__meta">{fshort(p.created_at)} · {p.read_time || 4} min de lecture</span></div>
  </a>
);

/* ============================================================ FORMULAIRES */
export function AuthForms({ reason, tab: t0 = 'login', onSuccess }) {
  const { setUser } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState(t0);
  const auth = (kind) => async (d) => {
    const { user } = await api(`/api/auth/${kind}`, { method: 'POST', body: d });
    setUser(user);
    toast(kind === 'login' ? `Ravie de vous revoir, ${user.name.split(' ')[0]} !` : 'Bienvenue ! Votre compte est créé.');
    router.refresh();
    onSuccess?.(user);
  };
  const [login, b1] = useSubmit(auth('login')), [register, b2] = useSubmit(auth('register'));
  return (
    <div className="auth" data-tab={tab}>
      {reason && <p className="auth__reason"><Icon n="lock" /> {reason}</p>}
      <div className="seg"><button type="button" data-t="login" onClick={() => setTab('login')}>Connexion</button><button type="button" data-t="register" onClick={() => setTab('register')}>Créer un compte</button><span className="seg__ink" /></div>
      <form className="auth__form" data-form="login" onSubmit={login}>
        <Input label="E-mail" name="email" type="email" required autoComplete="email" />
        <Input label="Mot de passe" name="password" type="password" required autoComplete="current-password" />
        <Btn busy={b1} className="btn btn-primary btn-block">Se connecter <Icon n="arrow" /></Btn>
        <p className="muted small center">Mot de passe oublié ? Contactez-nous, nous le réinitialisons pour vous.</p>
      </form>
      <form className="auth__form" data-form="register" onSubmit={register}>
        <Input label="Nom complet" name="name" required autoComplete="name" />
        <Input label="E-mail" name="email" type="email" required autoComplete="email" />
        <Input label="Téléphone (WhatsApp)" name="phone" type="tel" autoComplete="tel" />
        <Input label="Mot de passe (8 caractères min.)" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <Btn busy={b2} className="btn btn-primary btn-block">Créer mon compte <Icon n="arrow" /></Btn>
      </form>
    </div>
  );
}

/** Connexion dans une modale ; résout avec l'utilisatrice (ou null si fermée). */
export const authModal = (reason = '') => new Promise((resolve) => {
  let user = null;
  openModal({ size: 'modal--auth', onClose: () => resolve(user), render: (close) => <><h3 className="modal__title">Mon espace</h3><AuthForms reason={reason} onSuccess={(u) => { user = u; close(); }} /></> });
});

export const confirmBox = (text, { ok = 'Confirmer', danger = false } = {}) => new Promise((resolve) => {
  let yes = false;
  openModal({
    title: 'Confirmation', size: 'modal--sm', onClose: () => resolve(yes),
    render: (close) => <><p className="muted">{text}</p><div className="row-end"><button className="btn btn-ghost" onClick={close}>Annuler</button>
      <button className={cx('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={() => { yes = true; close(); }}>{ok}</button></div></>,
  });
});

export function CallbackForm({ title = 'Être rappelée gratuitement' }) {
  const [done, setDone] = useState(null);
  const [submit, busy] = useSubmit(async (d) => {
    const wa = whatsappRelay();
    await api('/api/contact', { method: 'POST', body: { kind: 'rappel', name: d.name, phone: d.phone, subject: 'Demande de rappel', message: `Créneau souhaité : ${d.when}` } }).catch(() => {});
    setDone({ ...d, url: wa.send(`Bonjour, je suis ${d.name}. Pouvez-vous me rappeler au ${d.phone} (${String(d.when).toLowerCase()}) ?`) });
  });
  return (
    <form className="callback card" onSubmit={submit}>
      {done ? <div className="success-mini"><Icon n="check" /><h3>Presque fini !</h3><p className="muted">Envoyez le message ouvert dans WhatsApp : nous vous rappelons {done.when.toLowerCase()} au {done.phone}.</p>
        <a href={done.url} target="_blank" rel="noopener" className="btn btn-wa btn-sm"><Icon n="whatsapp" /> Rouvrir WhatsApp</a></div> : <>
        <span className="callback__ic"><Icon n="phone" /></span>
        <h3>{title}</h3><p className="muted small">Laissez votre numéro : la demande part sur notre WhatsApp et une conseillère vous rappelle rapidement.</p>
        <Input label="Votre prénom" name="name" required autoComplete="name" />
        <Input label="Téléphone" name="phone" type="tel" required autoComplete="tel" />
        <Select label="Quand ?" name="when" options={WHEN} />
        <Btn busy={busy} className="btn btn-wa btn-block"><Icon n="whatsapp" /> Demander mon rappel</Btn>
      </>}
    </form>
  );
}

function ReviewForm({ close }) {
  const [submit, busy] = useSubmit(async (d) => {
    const wa = whatsappRelay();
    await api('/api/reviews', { method: 'POST', body: d }).catch(() => {}); // pour publication sur le site après validation
    wa.send(`Bonjour, voici mon avis sur ${settings().site_name} : ${'★'.repeat(+d.rating || 5)} (${d.rating || 5}/5)${d.service ? ` · ${d.service}` : ''}\n« ${d.text} »\n${d.name}`);
    close(); toast('Merci pour votre avis ! Envoyez-le dans WhatsApp pour nous le transmettre.');
  });
  return (
    <form className="stack" onSubmit={submit}>
      <div className="rate-input" role="radiogroup" aria-label="Note">{[5, 4, 3, 2, 1].map((n) => <Fragment key={n}><input type="radio" name="rating" id={`r${n}`} value={n} defaultChecked={n === 5} /><label htmlFor={`r${n}`} aria-label={`${n} étoiles`}><Icon n="star" /></label></Fragment>)}</div>
      <Input label="Votre prénom et initiale" name="name" required />
      <Input label="Soin ou produit concerné" name="service" />
      <Area label="Votre expérience" name="text" required />
      <Btn busy={busy} className="btn btn-wa btn-block"><Icon n="whatsapp" /> Envoyer mon avis sur WhatsApp</Btn>
      <p className="muted small center">Votre avis nous parvient sur WhatsApp et sera publié sur le site après validation.</p>
    </form>
  );
}
export const reviewModal = () => openModal({ title: 'Votre avis compte', render: (close) => <ReviewForm close={close} /> });

function EventForm({ e }) {
  const c = useContact();
  const left = Math.max(0, e.seats - e.taken), max = Math.min(10, left);
  const [seats, setSeats] = useState(1), [pay, setPay] = useState('place'), [done, setDone] = useState(null);
  const [submit, busy] = useSubmit(async (d) => {
    const wa = whatsappRelay();
    let r;
    try { r = await api(`/api/events/${e.id}/register`, { method: 'POST', body: { name: d.name, phone: d.phone, seats, payment_ref: pay === 'momo' ? d.payment_ref : null } }); }
    catch (err) { wa.cancel(); throw err; }
    saveContact(d);
    setDone({ ...r, url: wa.send(`Bonjour, je viens de réserver ${seats} place(s) pour « ${e.title} » (${cap(fdate(e.date))}, réf. ${r.ref}) au nom de ${d.name} (${d.phone}).${pay === 'momo' && d.payment_ref ? `\nPaiement Mobile Money, référence : ${d.payment_ref}` : ''}`) });
  });
  if (done) return (
    <div className="success"><SuccessCheck /><h3>Place{seats > 1 ? 's' : ''} réservée{seats > 1 ? 's' : ''} !</h3>
      <p>Référence <strong className="ref">{done.ref}</strong></p>
      <p className="muted">{done.status === 'confirmed' ? 'Votre inscription est confirmée. À très vite !' : `Nous vous recontactons pour confirmer votre inscription${done.total ? ` (total ${money(done.total)})` : ''}.`}</p>
      <p className="wa-sent"><Icon n="whatsapp" /> WhatsApp s’est ouvert : appuyez sur <strong>Envoyer</strong> pour nous transmettre votre réservation.</p>
      <a className="btn btn-wa" target="_blank" rel="noopener" href={done.url}><Icon n="whatsapp" /> Rouvrir WhatsApp</a></div>
  );
  return <>
    <p className="muted"><Icon n="calendar" /> {cap(fdate(e.date))} · {e.time}{e.end_time && ` à ${e.end_time}`} · {e.location || `Chez ${settings().site_name}`}</p>
    <form className="stack" onSubmit={submit} key={c.phone || 'x'}>
      <div className="grid-2"><Input label="Nom complet" name="name" required defaultValue={c.name} /><Input label="Téléphone" name="phone" type="tel" required defaultValue={c.phone} /></div>
      <div className="row-between"><span>Nombre de places <small className="muted">({left} disponibles)</small></span><Qty value={seats} set={(n) => setSeats(Math.max(1, Math.min(max, n)))} /></div>
      {e.price ? <>
        <div className="total-line">Total : <strong>{money(e.price * seats)}</strong></div>
        <div className="radio-cards">
          <RadioCard name="pay" value="place" cur={pay} set={setPay} icon="store" title="Payer sur place" sub="Le jour de l’atelier" />
          <RadioCard name="pay" value="momo" cur={pay} set={setPay} icon="smartphone" title="Mobile Money" sub="Place garantie" />
        </div>
        {pay === 'momo' && <div><MomoBlock /><Input label="Référence de la transaction" name="payment_ref" /></div>}
      </> : <p className="pill pill--ok">Atelier gratuit, inscription conseillée</p>}
      <Btn busy={busy} className="btn btn-wa btn-block btn-lg"><Icon n="whatsapp" /> Réserver et envoyer sur WhatsApp</Btn>
    </form>
  </>;
}
export const eventModal = (e) => openModal({ title: e.title, size: 'modal--md', render: () => <EventForm e={e} /> });

export const Qty = ({ value, set, sm }) => (
  <div className={cx('qty', sm && 'qty--sm')}><button type="button" onClick={() => set(value - 1)} aria-label="Moins"><Icon n="minus" /></button><span>{value}</span><button type="button" onClick={() => set(value + 1)} aria-label="Plus"><Icon n="plus" /></button></div>
);
export const RadioCard = ({ name, value, cur, set, icon, title, sub }) => (
  <label className="rc"><input type="radio" name={name} value={value} checked={cur === value} onChange={() => set(value)} /><span><Icon n={icon} /><strong>{title}</strong><small>{sub}</small></span></label>
);

/* ============================================================ MODALES */
function ModalHost() {
  const list = useStore(modals);
  useEffect(() => lockScroll('modal', list.length > 0), [list.length]);
  return list.map((m) => <ModalFrame key={m.id} m={m} />);
}

function ModalFrame({ m }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const close = () => closeModal(m.id);
  useEffect(() => {
    const prev = document.activeElement;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    const t = setTimeout(() => box.current?.querySelector('.modal__body input:not([type=hidden]), .modal__body select, .modal__body textarea')?.focus(), 380);
    const k = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', k);
    return () => { cancelAnimationFrame(r); clearTimeout(t); document.removeEventListener('keydown', k); prev?.focus?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!m.closing) return;
    setOpen(false);
    const t = setTimeout(() => { modals.set((l) => l.filter((x) => x.id !== m.id)); m.onClose?.(); }, 450);
    return () => clearTimeout(t);
  }, [m.closing]); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className={cx('modal', m.size, open && 'open')}>
      <div className="modal__backdrop" onClick={close} />
      <div className="modal__box" role="dialog" aria-modal="true" aria-label={m.title || 'Fenêtre'} ref={box}>
        <button className="modal__x" onClick={close} aria-label="Fermer"><Icon n="x" /></button>
        {m.title && <h3 className="modal__title">{m.title}</h3>}
        <div className="modal__body">{m.render(close)}</div>
      </div>
    </div>, document.body);
}

/* ============================================================== TOASTS */
function Toasts() {
  const list = useStore(toasts);
  return <div id="toasts" aria-live="polite">{list.map((t) => <ToastItem key={t.id} t={t} />)}</div>;
}
function ToastItem({ t }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
    const a = setTimeout(() => setShow(false), t.ms);
    const b = setTimeout(() => toasts.set((l) => l.filter((x) => x.id !== t.id)), t.ms + 500);
    return () => { cancelAnimationFrame(r); clearTimeout(a); clearTimeout(b); };
  }, [t]);
  return <div className={cx('toast', `toast--${t.type}`, show && 'show')}><Icon n={t.type === 'err' ? 'alert' : t.type === 'info' ? 'info' : 'check'} /><span>{t.msg}</span></div>;
}
