'use client';
/* Boîte à outils de l'administration : état partagé, champs, formulaire en modale, envoi de fichiers, graphiques. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, cx, fdate, money, num, openModal, store, telHref, toast, waHref } from '@/lib/core';
import { Btn, Icon } from '../ui';

/* ------------------------------------------------------- état partagé */
export const adm = store({ counts: {}, opts: { services: [], courses: [], users: [], events: [] } });
export async function refreshCounts() {
  try { const counts = await api('/api/admin/counts'); adm.set((v) => ({ ...v, counts })); return counts; } catch { return null; }
}
export async function loadOpts() {
  try { const opts = await api('/api/admin/options'); adm.set((v) => ({ ...v, opts })); return opts; } catch { return null; /* listes vides */ }
}
export const changed = () => { refreshCounts(); loadOpts(); };

export const A = ({ href, ...p }) => <Link href={'/admin' + href} {...p} />;
export const Contact = ({ phone, msg }) => (phone ? <>
  <a className="icon-btn sm" href={telHref(phone)} title="Appeler"><Icon n="phone" /></a>
  <a className="icon-btn sm wa" target="_blank" rel="noopener" href={waHref(phone, msg)} title="Écrire sur WhatsApp"><Icon n="whatsapp" /></a></> : null);

/* ------------------------------------------------------ envoi de fichiers */
/** Photo prise au téléphone (souvent 4 à 12 Mo) : réduite à 2000 px de côté en JPEG de qualité avant l'envoi. */
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 900 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // fond blanc (PNG transparent)
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}
const safeName = (n) => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-60) || 'fichier';

/**
 * Envoie une photo ou une vidéo. En ligne avec Vercel Blob : envoi DIRECT du navigateur vers le stockage permanent
 * (pas de limite de taille des fonctions serveur). Sinon : envoi au serveur (dossier data/uploads).
 * Renvoie { url } (public) ou, pour une vidéo de leçon envoyée au serveur, { src } (fichier protégé).
 */
export async function upload(file, onProgress, pub = false) {
  file = await shrinkImage(file);
  const storage = adm.get().opts.storage || (await loadOpts())?.storage;
  if (storage?.blob) {
    const B = await import('@vercel/blob/client');
    const toBlob = storage.blob_mode === 'presigned' ? B.uploadPresigned : B.upload;
    const vid = file.type.startsWith('video/');
    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); // nom unique : jamais d'écrasement
    const b = await toBlob(`${vid ? (pub ? 'videos' : 'lecons') : 'photos'}/${uid}-${safeName(file.name)}`, file, {
      access: 'public', handleUploadUrl: '/api/admin/blob', multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress?.(percentage / 100),
    });
    return vid && !pub ? { src: b.url, url: b.url, remote: true, size: file.size } : { url: b.url, size: file.size };
  }
  return uploadToServer(file, onProgress, pub);
}

function uploadToServer(file, onProgress, pub) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload?name=' + encodeURIComponent(file.name) + (pub ? '&public=1' : ''));
    xhr.setRequestHeader('X-Requested-With', 'fetch');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let d = {};
      try { d = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status < 300) resolve(d); else reject(new Error(d.error || 'Échec de l’envoi'));
    };
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi'));
    xhr.send(file);
  });
}

/** Champ média (image, ou vidéo d'ambiance publique si f.t === 'video') : envoi avec progression et aperçu. */
function ImageField({ f, v }) {
  const vid = f.t === 'video';
  const [url, setUrl] = useState(v || ''), [prog, setProg] = useState(null);
  const pick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProg(0);
    try { setUrl((await upload(file, setProg, vid)).url); toast(vid ? 'Vidéo envoyée' : 'Image envoyée'); } catch (err) { toast(err.message, 'err'); }
    setProg(null);
    e.target.value = '';
  };
  return (
    <div className="imgf full"><input type="hidden" name={f.k} value={url} />
      <div className="imgf__prev">{url ? (vid ? <video src={url} muted loop autoPlay playsInline /> : <img src={url} alt="" />) : <Icon n={vid ? 'video' : 'image'} />}</div>
      <div className="imgf__body"><strong>{f.l}</strong><small>{f.help || 'Photo depuis le téléphone ou l’ordinateur (JPG, PNG, WEBP) : réduite automatiquement.'}</small>
        <div className="row-wrap"><label className="btn btn-ghost btn-sm"><Icon n="upload" /> {vid ? 'Choisir une vidéo' : 'Choisir une photo'}<input type="file" accept={vid ? 'video/mp4,video/webm,video/quicktime' : 'image/*'} hidden onChange={pick} /></label>
          {url && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUrl('')}><Icon n="trash" /> Retirer</button>}</div>
        {prog !== null && <><div className="prog"><span style={{ width: Math.round(prog * 100) + '%' }} /></div><small>Envoi… {Math.round(prog * 100)} %</small></>}</div>
    </div>
  );
}

/** Plusieurs photos (galerie d'un produit) : ajout multiple, ordre, retrait. Valeur = tableau JSON d'adresses. */
function ImagesField({ f, v }) {
  const parse = (x) => { try { const a = JSON.parse(x || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
  const [list, setList] = useState(() => parse(v)), [prog, setProg] = useState(null);
  const max = 30;
  const pick = async (e) => {
    const files = [...e.target.files].slice(0, max - list.length);
    e.target.value = '';
    for (const [i, file] of files.entries()) {
      setProg({ n: i + 1, of: files.length, p: 0 });
      try { const r = await upload(file, (p) => setProg({ n: i + 1, of: files.length, p })); setList((l) => [...l, r.url].slice(0, max)); }
      catch (err) { toast(`${file.name} : ${err.message}`, 'err'); }
    }
    setProg(null);
  };
  const move = (i, d) => setList((l) => { const a = [...l], j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  return (
    <div className="imgs full"><input type="hidden" name={f.k} value={JSON.stringify(list)} />
      <div className="imgs__head"><strong>{f.l}</strong>{f.help && <small>{f.help}</small>}</div>
      <div className="imgs__grid">
        {list.map((u, i) => (
          <figure key={u} className="imgs__item"><img src={u} alt="" />
            <div className="imgs__act">
              <button type="button" onClick={() => move(i, -1)} disabled={!i} aria-label="Avancer"><Icon n="chevL" /></button>
              <button type="button" onClick={() => setList((l) => l.filter((x) => x !== u))} aria-label="Retirer"><Icon n="trash" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Reculer"><Icon n="chevR" /></button>
            </div>
          </figure>))}
        {list.length < max && <label className="imgs__add"><Icon n="plus" /><span>Ajouter des photos</span><input type="file" accept="image/*" multiple hidden onChange={pick} disabled={!!prog} /></label>}
      </div>
      {prog && <><div className="prog"><span style={{ width: Math.round(prog.p * 100) + '%' }} /></div><small>Envoi de la photo {prog.n} sur {prog.of}… {Math.round(prog.p * 100)} %</small></>}
    </div>
  );
}

/* ---------------------------------------------------------------- champs
   f = { k: nom, l: libellé, t: type, req, full, help, opts, def, rows, min, empty } */
export function Field({ f, v }) {
  const val = v ?? f.def ?? '';
  const help = f.help && <small className="fhelp">{f.help}</small>;
  const span = <span>{f.l}{f.req ? ' *' : ''}</span>;
  if (f.t === 'image' || f.t === 'video') return <ImageField f={f} v={val} />;
  if (f.t === 'images') return <ImagesField f={f} v={val} />;
  let el;
  if (f.t === 'textarea') el = <label className="field"><textarea name={f.k} rows={f.rows || 4} placeholder=" " required={!!f.req} defaultValue={val} />{span}</label>;
  else if (f.t === 'select') el = <label className="field field--select"><select name={f.k} required={!!f.req} defaultValue={String(val)}>{f.empty && <option value="">{f.empty}</option>}{(f.opts || []).map(([ov, ol]) => <option key={ov} value={String(ov)}>{ol}</option>)}</select>{span}</label>;
  else if (f.t === 'checkbox') el = <label className="switch"><input type="checkbox" name={f.k} defaultChecked={!!val && val !== '0'} /><span className="switch__ui" /><span>{f.l}</span></label>;
  else if (f.t === 'color') el = <label className="colorf"><input type="color" name={f.k} defaultValue={val || '#9b4d6e'} /><span>{f.l}</span></label>;
  else el = <label className="field"><input type={f.t || 'text'} name={f.k} defaultValue={val} placeholder=" " required={!!f.req} step={f.t === 'number' ? (f.step || 1) : undefined} min={f.min} />{span}</label>;
  return <div className={f.full ? 'full' : undefined}>{el}{help}</div>;
}

export function readFields(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.k];
    if (!el) continue;
    out[f.k] = f.t === 'checkbox' ? el.checked : f.t === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value;
  }
  return out;
}

function AdminForm({ fields, data, submit, onSubmit, extra, close }) {
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const missing = fields.find((f) => f.req && f.t !== 'checkbox' && !String(form.elements[f.k]?.value || '').trim());
    if (missing) { toast(`Le champ « ${missing.l} » est requis.`, 'err'); return form.elements[missing.k]?.focus?.(); }
    setBusy(true);
    try { await onSubmit(readFields(form, fields), form); close(); } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  return (
    <form className="aform" noValidate onSubmit={send}>
      <div className="aform__grid">{fields.map((f) => <Field key={f.k} f={f} v={data[f.k]} />)}</div>{extra}
      <div className="row-end"><button type="button" className="btn btn-ghost" onClick={close}>Annuler</button><Btn busy={busy}><Icon n="check" /> {submit}</Btn></div>
    </form>
  );
}
/** Formulaire d'édition dans une modale. */
export const formModal = ({ title, fields, data = {}, submit = 'Enregistrer', onSubmit, extra, size = 'modal--lg' }) =>
  openModal({ title, size, render: (close) => <AdminForm {...{ fields, data, submit, onSubmit, extra, close }} /> });

/** Envoi d'une vidéo de leçon (remplit les champs du formulaire parent). */
export function VideoUpload() {
  const box = useRef(null);
  const [prog, setProg] = useState(null), [msg, setMsg] = useState('');
  const pick = async (e) => {
    const file = e.target.files[0], form = box.current.closest('form');
    if (!file) return;
    setProg(0);
    setMsg(`Envoi de ${file.name} (${(file.size / 1048576).toFixed(1)} Mo)… ne fermez pas cette fenêtre.`);
    try {
      const r = await upload(file, (p) => { setProg(p); setMsg(`Envoi… ${Math.round(p * 100)} %`); });
      form.elements.video_type.value = r.remote ? 'url' : 'file'; // en ligne (Vercel Blob) : lien direct https
      form.elements.video_src.value = r.src;
      setMsg('Vidéo envoyée. Pensez à enregistrer la leçon.');
      const v = Object.assign(document.createElement('video'), { preload: 'metadata', src: URL.createObjectURL(file) });
      v.onloadedmetadata = () => { if (!form.elements.duration.value && v.duration) form.elements.duration.value = Math.max(1, Math.round(v.duration / 60)); URL.revokeObjectURL(v.src); };
    } catch (err) { toast(err.message, 'err'); setMsg(''); }
    setProg(null);
  };
  return (
    <div className="vidup" ref={box}>
      <label className="upload__zone"><Icon n="video" /><span><strong>Envoyer un fichier vidéo</strong><small>MP4 recommandé (H.264), jusqu’à 4 Go. La vidéo reste protégée : seules les élèves inscrites peuvent la lire.</small></span><input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={pick} /></label>
      {prog !== null && <div className="prog"><span style={{ width: Math.round(prog * 100) + '%' }} /></div>}<small className="vidup__st">{msg}</small>
    </div>
  );
}

/* ------------------------------------------------------------ graphiques */
const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
const short = (v) => (v >= 1e6 ? (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M' : v >= 1e3 ? Math.round(v / 1e3) + ' k' : String(v));

/** Histogramme du chiffre d'affaires (30 jours) avec info-bulle au survol. */
export function RevenueChart({ series }) {
  const box = useRef(null);
  const [W, setW] = useState(720), [hover, setHover] = useState(null);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => { const w = Math.max(320, e.contentRect.width); setW((o) => (Math.abs(o - w) > 20 ? w : o)); });
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const H = 260, P = { l: 52, r: 8, t: 14, b: 30 }, iw = W - P.l - P.r, ih = H - P.t - P.b;
  const top = niceMax(Math.max(...series.map((d) => d.total), 0)), bw = iw / series.length, y = (v) => P.t + ih - (v / top) * ih, base = P.t + ih;
  const d = hover !== null && series[hover];
  return (
    <div className="chart-box" ref={box}><div className="ch">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Chiffre d’affaires des 30 derniers jours">
        {[0, 0.25, 0.5, 0.75, 1].map((k) => <g key={k}><line x1={P.l} x2={W - P.r} y1={y(k * top)} y2={y(k * top)} className="ch-grid" /><text x={P.l - 8} y={y(k * top) + 4} className="ch-ax" textAnchor="end">{short(k * top)}</text></g>)}
        {series.map((s, i) => {
          const x = P.l + i * bw + 1, w = Math.max(1, bw - 2), h = Math.max(2, (s.total / top) * ih), yy = base - h, rr = Math.min(4, w / 2, h);
          return <g key={s.date}>
            {s.total > 0 && <path className="ch-bar" style={{ '--i': i }} d={`M${x},${base} V${yy + rr} Q${x},${yy} ${x + rr},${yy} H${x + w - rr} Q${x + w},${yy} ${x + w},${yy + rr} V${base} Z`} />}
            {(i % 5 === 0 || i === series.length - 1) && <text x={x + w / 2} y={H - 8} className="ch-ax" textAnchor="middle">{+s.date.slice(8)} {fdate(s.date, { month: 'short' }).replace('.', '')}</text>}
            <rect className={cx('ch-hit', hover === i && 'on')} x={P.l + i * bw} y={P.t} width={bw} height={ih} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
          </g>;
        })}
        <line x1={P.l} x2={W - P.r} y1={base} y2={base} className="ch-base" />
      </svg>
      {d && <div className="ch-tip" style={{ left: Math.min(Math.max(P.l + hover * bw + bw / 2, 110), W - 110) }}>
        <strong>{fdate(d.date, { weekday: 'short', day: 'numeric', month: 'long' })}</strong><span className="ch-tip__v">{money(d.total)}</span>
        <ul><li><span>Boutique</span>{money(d.shop)}</li><li><span>Formations</span>{money(d.courses)}</li><li><span>Soins effectués</span>{money(d.care)}</li><li><span>Ateliers</span>{money(d.events)}</li><li><span>Rendez-vous</span>{num(d.bookings)}</li></ul>
      </div>}
    </div></div>
  );
}

/** Barres horizontales avec libellés directs (classement). */
export function HBars({ items }) {
  if (!items.length) return <p className="muted small">Pas encore de données.</p>;
  const max = Math.max(...items.map((d) => d.n), 1);
  return <ul className="hbars">{items.map((d, i) => <li key={d.name} style={{ '--i': i }}><span className="hbars__l">{d.name}</span><span className="hbars__track"><span className="hbars__bar" style={{ '--w': (d.n / max) * 100 + '%' }} /></span><strong>{num(d.n)}</strong></li>)}</ul>;
}
