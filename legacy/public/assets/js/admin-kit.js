/* Boîte à outils de l'administration : champs, formulaires, envoi de fichiers, graphiques. */
import { $, $$, esc, icon, modal, toast, busy, money, num, fdate } from './core.js';

/* ------------------------------------------------------ envoi de fichiers */
export function upload(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload?name=' + encodeURIComponent(file.name));
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

/* ---------------------------------------------------------------- champs */
export function fieldHtml(f, v) {
  const val = v ?? f.def ?? '';
  const req = f.req ? 'required' : '';
  const help = f.help ? `<small class="fhelp">${esc(f.help)}</small>` : '';
  const span = `<span>${esc(f.l)}${f.req ? ' *' : ''}</span>`;
  const cls = f.full ? 'full' : '';
  switch (f.t) {
    case 'textarea':
      return `<div class="${cls}"><label class="field"><textarea name="${f.k}" rows="${f.rows || 4}" placeholder=" " ${req}>${esc(val)}</textarea>${span}</label>${help}</div>`;
    case 'select':
      return `<div class="${cls}"><label class="field field--select"><select name="${f.k}" ${req}>${f.empty ? `<option value="">${esc(f.empty)}</option>` : ''}${(f.opts || []).map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>${span}</label>${help}</div>`;
    case 'checkbox':
      return `<div class="${cls}"><label class="switch"><input type="checkbox" name="${f.k}" ${val && val !== '0' ? 'checked' : ''}><span class="switch__ui"></span><span>${esc(f.l)}</span></label>${help}</div>`;
    case 'image':
      return `<div class="imgf full" data-imgf><input type="hidden" name="${f.k}" value="${esc(val)}">
        <div class="imgf__prev">${val ? `<img src="${esc(val)}" alt="">` : icon('image')}</div>
        <div class="imgf__body"><strong>${esc(f.l)}</strong><small>${esc(f.help || 'JPG, PNG ou WEBP — 12 Mo maximum')}</small>
          <div class="row-wrap"><label class="btn btn-ghost btn-sm">${icon('upload')} Choisir une image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
          <button type="button" class="btn btn-ghost btn-sm" data-clear>${icon('trash')} Retirer</button></div>
          <div class="prog" hidden><span></span></div></div></div>`;
    case 'color':
      return `<div class="${cls}"><label class="colorf"><input type="color" name="${f.k}" value="${esc(val || '#9b4d6e')}"><span>${esc(f.l)}</span></label>${help}</div>`;
    default:
      return `<div class="${cls}"><label class="field"><input type="${f.t || 'text'}" name="${f.k}" value="${esc(val)}" placeholder=" " ${req} ${f.t === 'number' ? 'step="1"' : ''} ${f.min != null ? `min="${f.min}"` : ''}>${span}</label>${help}</div>`;
  }
}

/** Branche les champs image (aperçu + envoi avec progression). */
export function bindImageFields(root) {
  $$('[data-imgf]', root).forEach((box) => {
    const hidden = $('input[type=hidden]', box), prev = $('.imgf__prev', box), prog = $('.prog', box);
    $('input[type=file]', box).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      prog.hidden = false;
      try {
        const r = await upload(file, (p) => { $('span', prog).style.width = Math.round(p * 100) + '%'; });
        hidden.value = r.url;
        prev.innerHTML = `<img src="${esc(r.url)}" alt="">`;
        toast('Image envoyée');
      } catch (err) { toast(err.message, 'err'); }
      prog.hidden = true;
      e.target.value = '';
    });
    $('[data-clear]', box).addEventListener('click', () => { hidden.value = ''; prev.innerHTML = icon('image'); });
  });
}

export function readFields(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.k];
    if (!el) continue;
    if (f.t === 'checkbox') out[f.k] = el.checked;
    else if (f.t === 'number') out[f.k] = el.value === '' ? null : Number(el.value);
    else out[f.k] = el.value;
  }
  return out;
}

/** Formulaire d'édition dans une modale. */
export function formModal({ title, fields, data = {}, submit = 'Enregistrer', onSubmit, extra = '', size = 'modal--lg', onMount }) {
  const m = modal({
    title, size,
    html: `<form class="aform" novalidate><div class="aform__grid">${fields.map((f) => fieldHtml(f, data[f.k])).join('')}</div>${extra}
      <div class="row-end"><button type="button" class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-primary">${icon('check')} ${esc(submit)}</button></div></form>`,
  });
  const form = $('form', m.body);
  bindImageFields(form);
  onMount?.(form, m);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const missing = fields.find((f) => f.req && f.t !== 'checkbox' && !String(form.elements[f.k]?.value || '').trim());
    if (missing) { toast(`Le champ « ${missing.l} » est requis.`, 'err'); form.elements[missing.k]?.focus(); return; }
    await busy(form.querySelector('.btn-primary'), async () => {
      try { await onSubmit(readFields(form, fields), form); m.close(); }
      catch (err) { toast(err.message, 'err'); }
    });
  });
  return m;
}

/* ------------------------------------------------------------ graphiques */
const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
const short = (v) => (v >= 1e6 ? (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M' : v >= 1e3 ? Math.round(v / 1e3) + ' k' : String(v));

/** Histogramme mono-série du chiffre d'affaires (30 jours) avec info-bulle au survol. */
export function revenueChart(el, series) {
  const draw = () => {
    const W = Math.max(320, el.clientWidth), H = 260, P = { l: 52, r: 8, t: 14, b: 30 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const top = niceMax(Math.max(...series.map((d) => d.total), 0));
    const bw = iw / series.length, gap = 2, r = 4;
    const y = (v) => P.t + ih - (v / top) * ih;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * top);
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Chiffre d’affaires des 30 derniers jours">`;
    svg += ticks.map((t) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" class="ch-grid"/><text x="${P.l - 8}" y="${y(t) + 4}" class="ch-ax" text-anchor="end">${short(t)}</text>`).join('');
    series.forEach((d, i) => {
      const x = P.l + i * bw + gap / 2, w = Math.max(1, bw - gap), base = P.t + ih;
      if (d.total > 0) {
        const h = Math.max(2, (d.total / top) * ih), yy = base - h, rr = Math.min(r, w / 2, h);
        svg += `<path class="ch-bar" style="--i:${i}" d="M${x},${base} V${yy + rr} Q${x},${yy} ${x + rr},${yy} H${x + w - rr} Q${x + w},${yy} ${x + w},${yy + rr} V${base} Z"/>`;
      }
      if (i % 5 === 0 || i === series.length - 1) {
        const dt = new Date(d.date + 'T12:00:00');
        svg += `<text x="${x + w / 2}" y="${H - 8}" class="ch-ax" text-anchor="middle">${dt.getDate()} ${dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</text>`;
      }
      svg += `<rect class="ch-hit" data-i="${i}" x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${ih}"/>`;
    });
    svg += `<line x1="${P.l}" x2="${W - P.r}" y1="${P.t + ih}" y2="${P.t + ih}" class="ch-base"/></svg>`;
    el.innerHTML = `<div class="ch">${svg}<div class="ch-tip" hidden></div></div>`;
    const tip = $('.ch-tip', el);
    $$('.ch-hit', el).forEach((h) => {
      h.addEventListener('pointerenter', () => {
        const d = series[+h.dataset.i];
        h.classList.add('on');
        tip.innerHTML = `<strong>${fdate(d.date, { weekday: 'short', day: 'numeric', month: 'long' })}</strong><span class="ch-tip__v">${money(d.total)}</span>
          <ul><li><span>Boutique</span>${money(d.shop)}</li><li><span>Formations</span>${money(d.courses)}</li><li><span>Soins effectués</span>${money(d.care)}</li><li><span>Ateliers</span>${money(d.events)}</li><li><span>Rendez-vous</span>${num(d.bookings)}</li></ul>`;
        tip.hidden = false;
        const bx = +h.getAttribute('x') + bw / 2;
        tip.style.left = Math.min(Math.max(bx, 110), W - 110) + 'px';
      });
      h.addEventListener('pointerleave', () => { h.classList.remove('on'); tip.hidden = true; });
    });
  };
  draw();
  const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - (+el.dataset.w || 0)) > 20) { el.dataset.w = el.clientWidth; draw(); } });
  ro.observe(el);
  return () => ro.disconnect();
}

/** Barres horizontales avec libellés directs (classement). */
export function hbars(items, { label = (d) => d.name, value = (d) => d.n, fmt = num } = {}) {
  if (!items.length) return '<p class="muted small">Pas encore de données.</p>';
  const max = Math.max(...items.map(value), 1);
  return `<ul class="hbars">${items.map((d, i) => `<li style="--i:${i}"><span class="hbars__l">${esc(label(d))}</span><span class="hbars__track"><span class="hbars__bar" style="--w:${(value(d) / max) * 100}%"></span></span><strong>${fmt(value(d))}</strong></li>`).join('')}</ul>`;
}
