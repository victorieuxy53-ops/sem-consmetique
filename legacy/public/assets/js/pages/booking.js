/* Réservation de rendez-vous (assistant en 4 étapes) & ateliers avec places limitées. */
import { $, $$, esc, api, state, icon, money, fdur, fdate, cap, CATS, modal, toast, formData, busy, telHref, waMain, phones, downloadIcs, localNow, openStatus } from '../core.js';
import { pageHero, eventCard, empty } from './ui.js';
import { confetti, reveal } from '../anim.js';

const CONTACT_KEY = 'institut.contact';
const savedContact = () => { try { return JSON.parse(localStorage.getItem(CONTACT_KEY)) || {}; } catch { return {}; } };
const saveContact = (c) => { try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: c.name, phone: c.phone, email: c.email })); } catch { /* ignore */ } };
const me = () => ({ ...savedContact(), ...(state.user ? { name: state.user.name, phone: state.user.phone || savedContact().phone, email: state.user.email } : {}) });

export const successCheck = () => `<div class="success__check"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg></div>`;

export const momoBlock = (amount) => {
  const s = state.settings;
  return `<div class="momo">
    <p class="small">${esc(s.payment_note)}</p>
    ${amount ? `<p class="momo__amount">Montant : <strong>${money(amount)}</strong></p>` : ''}
    <div class="momo__nums">${(s.momo || []).filter((m) => m.number).map((m) => `<div class="momo__num"><span class="momo__net">${esc(m.network)}</span><strong>${esc(m.number)}</strong>${m.name ? `<small>${esc(m.name)}</small>` : ''}<button type="button" class="icon-btn" data-copy="${esc(m.number)}" aria-label="Copier">${icon('copy')}</button></div>`).join('')}</div>
  </div>`;
};

/* ======================================================== RÉSERVATION */
export async function booking({ query }) {
  const services = await api('/api/services');
  const pre = services.find((s) => String(s.id) === String(query.service) || s.slug === query.service);
  const c = me();
  const st = openStatus();

  const html = `
  ${pageHero({ eyebrow: 'Réservation en ligne 24 h/24', title: 'Votre moment <em>beauté</em>', sub: 'Choisissez votre soin et votre créneau : c’est réservé en moins d’une minute. Vous préférez parler à quelqu’un ? Appelez-nous, tout simplement.', crumbs: [[null, 'Réservation']], cls: 'phero--sm' })}
  <section class="section section--tight">
    <div class="container book" data-step="${pre ? 2 : 1}">
      <div class="book__main card" data-reveal>
        <ol class="steps" aria-label="Étapes">
          ${['Prestation', 'Date & heure', 'Coordonnées', 'Confirmation'].map((l, i) => `<li data-s="${i + 1}"><span>${i + 1}</span><em>${l}</em></li>`).join('')}
          <span class="steps__bar"><span></span></span>
        </ol>
        <div class="panes">
          <div class="pane" data-pane="1">
            <h3 class="pane__title">Quel soin vous ferait plaisir ?</h3>
            <div class="chips" data-filter><button class="chip active" data-c="all">Tout</button>${Object.entries(CATS).map(([k, v]) => `<button class="chip" data-c="${k}">${icon(v.icon)} ${v.label}</button>`).join('')}</div>
            <div class="opts">${services.map((s) => `<button type="button" class="opt" data-sid="${s.id}" data-cat="${esc(s.category)}" style="--c:${CATS[s.category]?.color || '#9b4d6e'}">
              <span class="opt__ic">${icon(CATS[s.category]?.icon || 'sparkle')}</span>
              <span class="opt__txt"><strong>${esc(s.name)}</strong><small>${fdur(s.duration)} · ${s.price ? money(s.price) : 'Sur devis'}</small></span>
              <span class="opt__check">${icon('check')}</span></button>`).join('')}</div>
          </div>
          <div class="pane" data-pane="2">
            <h3 class="pane__title">Quand souhaitez-vous venir ?</h3>
            <div class="book__when">
              <div class="cal">
                <div class="cal__head"><button type="button" class="icon-btn" data-m="-1" aria-label="Mois précédent">${icon('chevL')}</button><strong class="cal__title"></strong><button type="button" class="icon-btn" data-m="1" aria-label="Mois suivant">${icon('chevR')}</button></div>
                <div class="cal__dow">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span>${d}</span>`).join('')}</div>
                <div class="cal__grid"></div>
                <div class="cal__legend"><span class="lg lg--open">Disponible</span><span class="lg lg--full">Complet</span><span class="lg lg--closed">Fermé</span></div>
              </div>
              <div class="slots"><h4 class="slots__title">${icon('calendar')} Sélectionnez une date</h4><div class="slots__body"><p class="muted small">Les créneaux disponibles s’affichent ici en temps réel.</p></div></div>
            </div>
            <div class="pane__nav"><button type="button" class="btn btn-ghost" data-go="1">${icon('arrowL')} Changer de soin</button></div>
          </div>
          <div class="pane" data-pane="3">
            <h3 class="pane__title">Vos coordonnées</h3>
            <form class="stack" data-book-form>
              <div class="grid-2">
                <label class="field"><input name="name" required autocomplete="name" placeholder=" " value="${esc(c.name || '')}"><span>Nom complet</span></label>
                <label class="field"><input name="phone" type="tel" required autocomplete="tel" placeholder=" " value="${esc(c.phone || '')}"><span>Téléphone (WhatsApp)</span></label>
              </div>
              <label class="field"><input name="email" type="email" autocomplete="email" placeholder=" " value="${esc(c.email || '')}"><span>E-mail (facultatif)</span></label>
              <label class="field"><textarea name="notes" rows="3" placeholder=" "></textarea><span>Précisions : allergies, peau sensible, demande particulière…</span></label>
              <label class="check"><input type="checkbox" required><span>J’accepte d’être contactée par téléphone ou WhatsApp pour la confirmation de mon rendez-vous.</span></label>
              <div class="pane__nav"><button type="button" class="btn btn-ghost" data-go="2">${icon('arrowL')} Retour</button><button class="btn btn-primary btn-lg">Confirmer mon rendez-vous ${icon('check')}</button></div>
            </form>
          </div>
          <div class="pane" data-pane="4"><div class="success" data-success></div></div>
        </div>
      </div>
      <aside class="book__side">
        <div class="card sum" data-reveal data-delay="150">
          <h4>Récapitulatif</h4>
          <dl>
            <div><dt>${icon('sparkle')} Soin</dt><dd data-sum="service">—</dd></div>
            <div><dt>${icon('calendar')} Date</dt><dd data-sum="date">—</dd></div>
            <div><dt>${icon('clock')} Heure</dt><dd data-sum="time">—</dd></div>
            <div><dt>${icon('wallet')} Tarif</dt><dd data-sum="price">—</dd></div>
          </dl>
          <p class="small muted">Règlement sur place (espèces ou Mobile Money). Annulation gratuite jusqu’à 24 h avant.</p>
        </div>
        <div class="card help" data-reveal data-delay="250">
          <h4>Réserver par téléphone</h4>
          <p class="small"><span class="open-dot ${st.open ? 'on' : ''}"></span> ${esc(st.label)}</p>
          ${phones().map((p) => `<a href="${telHref(p)}" data-external class="btn btn-ghost btn-block btn-sm">${icon('phone')} ${esc(p)}</a>`).join('')}
          <a href="${waMain('Bonjour, je souhaite prendre rendez-vous.')}" target="_blank" rel="noopener" class="btn btn-gold btn-block btn-sm">${icon('whatsapp')} Réserver sur WhatsApp</a>
        </div>
      </aside>
    </div>
  </section>`;

  return {
    title: 'Prendre rendez-vous',
    html,
    mount(root) {
      const book = $('.book', root);
      const now = localNow();
      const minMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const maxDays = +state.settings.max_days || 60;
      const maxDate = new Date(now.getTime() + maxDays * 864e5);
      const maxMonth = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), 1));
      const S = { service: pre || null, date: null, time: null, month: new Date(minMonth) };

      const setStep = (n) => {
        book.dataset.step = n;
        $$('.steps li', book).forEach((li) => { li.classList.toggle('active', +li.dataset.s === n); li.classList.toggle('done', +li.dataset.s < n); });
        $('.steps__bar span', book).style.transform = `scaleX(${(n - 1) / 3})`;
        if (n > 1 && innerWidth < 900) $('.book__main', book).scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      const summary = () => {
        $('[data-sum="service"]', root).textContent = S.service ? S.service.name : '—';
        $('[data-sum="date"]', root).textContent = S.date ? cap(fdate(S.date)) : '—';
        $('[data-sum="time"]', root).textContent = S.time ? `${S.time.replace(':', 'h')} (${fdur(S.service.duration)})` : '—';
        $('[data-sum="price"]', root).textContent = S.service ? (S.service.price ? money(S.service.price) : 'Sur devis') : '—';
      };

      // Étape 1 : prestation
      $('[data-filter]', root).addEventListener('click', (e) => {
        const b = e.target.closest('[data-c]');
        if (!b) return;
        $$('[data-filter] .chip', root).forEach((x) => x.classList.toggle('active', x === b));
        $$('.opt', root).forEach((o, i) => {
          const show = b.dataset.c === 'all' || o.dataset.cat === b.dataset.c;
          o.hidden = !show;
          if (show) { o.style.animation = 'none'; void o.offsetWidth; o.style.animation = `popIn .5s var(--ease) ${Math.min(i, 10) * 30}ms both`; }
        });
      });
      $('.opts', root).addEventListener('click', (e) => {
        const o = e.target.closest('.opt');
        if (!o) return;
        S.service = services.find((s) => s.id === +o.dataset.sid);
        S.date = S.time = null;
        $$('.opt', root).forEach((x) => x.classList.toggle('selected', x === o));
        summary();
        setTimeout(() => { setStep(2); loadMonth(); }, 280);
      });
      if (S.service) $(`.opt[data-sid="${S.service.id}"]`, root)?.classList.add('selected');

      // Étape 2 : calendrier
      const grid = $('.cal__grid', root), title = $('.cal__title', root);
      async function loadMonth() {
        if (!S.service) return;
        const y = S.month.getUTCFullYear(), m = S.month.getUTCMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        title.textContent = cap(new Date(y, m, 15).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
        $('[data-m="-1"]', root).disabled = S.month <= minMonth;
        $('[data-m="1"]', root).disabled = S.month >= maxMonth;
        grid.classList.add('loading');
        let days = {};
        try { days = (await api(`/api/availability?service=${S.service.id}&month=${key}`)).days; } catch (e) { toast(e.message, 'err'); }
        const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
        const total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        let cells = '';
        for (let i = 0; i < first; i++) cells += '<span class="cal__d cal__d--empty"></span>';
        for (let d = 1; d <= total; d++) {
          const date = `${key}-${String(d).padStart(2, '0')}`;
          const stt = days[date] || 'closed';
          cells += `<button type="button" class="cal__d cal__d--${stt} ${date === S.date ? 'sel' : ''}" data-date="${date}" ${stt === 'open' ? '' : 'disabled'} style="--i:${d}" aria-label="${fdate(date)} ${stt === 'open' ? 'disponible' : 'indisponible'}">${d}</button>`;
        }
        grid.innerHTML = cells;
        grid.classList.remove('loading');
      }
      $$('[data-m]', root).forEach((b) => b.addEventListener('click', () => {
        S.month = new Date(Date.UTC(S.month.getUTCFullYear(), S.month.getUTCMonth() + +b.dataset.m, 1));
        loadMonth();
      }));
      grid.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-date]');
        if (!b || b.disabled) return;
        S.date = b.dataset.date; S.time = null;
        $$('.cal__d', grid).forEach((x) => x.classList.toggle('sel', x === b));
        summary();
        const box = $('.slots__body', root);
        $('.slots__title', root).innerHTML = `${icon('clock')} ${cap(fdate(S.date))}`;
        box.innerHTML = '<div class="skeleton-row"></div><div class="skeleton-row"></div>';
        try {
          const r = await api(`/api/availability?service=${S.service.id}&date=${S.date}`);
          const groups = [['Matin', (t) => t < '12:00'], ['Après-midi', (t) => t >= '12:00' && t < '17:00'], ['Soirée', (t) => t >= '17:00']];
          const html = groups.map(([label, f]) => {
            const list = r.slots.filter((x) => f(x.time));
            return list.length ? `<div class="slots__group"><span>${label}</span><div class="slots__grid">${list.map((x, i) => `<button type="button" class="slot" data-time="${x.time}" ${x.available ? '' : 'disabled'} style="--i:${i}">${x.time.replace(':', 'h')}</button>`).join('')}</div></div>` : '';
          }).join('');
          box.innerHTML = html || '<p class="muted">Plus aucun créneau ce jour-là. Essayez une autre date ou appelez-nous.</p>';
        } catch (err) { box.innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
      });
      $('.slots', root).addEventListener('click', (e) => {
        const b = e.target.closest('.slot');
        if (!b || b.disabled) return;
        S.time = b.dataset.time;
        $$('.slot', root).forEach((x) => x.classList.toggle('sel', x === b));
        summary();
        setTimeout(() => setStep(3), 250);
      });

      // Navigation
      root.addEventListener('click', (e) => {
        const g = e.target.closest('[data-go]');
        if (g) { setStep(+g.dataset.go); if (+g.dataset.go === 2) loadMonth(); }
      });

      // Étape 3 : envoi
      $('[data-book-form]', root).addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        if (!S.service || !S.date || !S.time) return setStep(S.service ? 2 : 1);
        const d = formData(f);
        await busy(f.querySelector('.btn-primary'), async () => {
          try {
            const r = await api('/api/bookings', { method: 'POST', body: { service_id: S.service.id, date: S.date, time: S.time, name: d.name, phone: d.phone, email: d.email, notes: d.notes } });
            saveContact(d);
            const s = state.settings;
            const msg = `Bonjour, je viens de réserver en ligne :\n• ${r.service}\n• ${cap(fdate(r.date))} à ${r.time.replace(':', 'h')}\n• Réf. ${r.ref}\nAu nom de ${d.name}. Merci de me confirmer !`;
            $('[data-success]', root).innerHTML = `${successCheck()}
              <h3>Votre demande est enregistrée !</h3>
              <p>Référence <strong class="ref">${esc(r.ref)}</strong></p>
              <div class="recap"><div>${icon('sparkle')} ${esc(r.service)}</div><div>${icon('calendar')} ${cap(fdate(r.date))}</div><div>${icon('clock')} ${r.time.replace(':', 'h')} · ${fdur(r.duration)}</div><div>${icon('wallet')} ${r.price ? money(r.price) : 'Sur devis'}</div></div>
              <p class="muted">Notre équipe vous confirme le rendez-vous très vite par téléphone ou WhatsApp. Gardez bien votre référence.</p>
              <div class="row-wrap center">
                <a class="btn btn-gold" href="${waMain(msg)}" target="_blank" rel="noopener">${icon('whatsapp')} Confirmer sur WhatsApp</a>
                <button type="button" class="btn btn-ghost" data-ics>${icon('calendar')} Ajouter à mon agenda</button>
                <a class="btn btn-ghost" href="/suivi?ref=${encodeURIComponent(r.ref)}">${icon('eye')} Suivre</a>
              </div>
              <button type="button" class="link-btn" data-again>Prendre un autre rendez-vous</button>`;
            $('[data-ics]', root).addEventListener('click', () => downloadIcs({ title: `${r.service} — ${s.site_name}`, date: r.date, time: r.time, duration: r.duration, location: [s.address, s.city].filter(Boolean).join(', '), description: `Réf. ${r.ref}` }));
            $('[data-again]', root).addEventListener('click', () => { S.service = S.date = S.time = null; summary(); $$('.opt', root).forEach((x) => x.classList.remove('selected')); setStep(1); });
            setStep(4);
            confetti($('.success__check', root));
          } catch (err) {
            toast(err.message, 'err');
            if (err.status === 409) { setStep(2); loadMonth(); }
          }
        });
      });

      summary();
      setStep(S.service ? 2 : 1);
      if (S.service) loadMonth();
    },
  };
}

/* ============================================================ ATELIERS */
export async function events() {
  const list = await api('/api/events');
  return {
    title: 'Ateliers & masterclass',
    html: `${pageHero({ eyebrow: 'Ateliers · Masterclass · Journées spéciales', title: 'Apprenez, partagez, <em>rayonnez</em>', sub: 'Des ateliers en petit groupe animés par nos expertes. Les places sont limitées : réservez la vôtre en ligne en quelques secondes.', crumbs: [[null, 'Ateliers']] })}
    <section class="section">
      <div class="container">
        <div class="ecards" data-stagger="120">${list.length ? list.map(eventCard).join('') : ''}</div>
        ${list.length ? '' : empty('Aucun atelier programmé pour le moment. Revenez bientôt ou contactez-nous pour un atelier privé.', 'ticket')}
        <div class="private card" data-reveal>
          <div><p class="eyebrow">Atelier privé</p><h3 class="h3">EVJF, anniversaire, comité d’entreprise…</h3><p class="muted">Nous organisons des ateliers beauté et attache foulard sur-mesure, à l’institut ou chez vous.</p></div>
          <div class="row-wrap"><a href="/sur-mesure?type=autre" class="btn btn-primary">${icon('gift')} Demander un devis</a><a href="${waMain('Bonjour, je souhaite organiser un atelier privé.')}" target="_blank" rel="noopener" class="btn btn-ghost">${icon('whatsapp')} En parler</a></div>
        </div>
      </div>
    </section>`,
    mount(root) { bindEvents(root, list); },
  };
}

export function bindEvents(root, list) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-event]');
    if (!b || b.disabled) return;
    const ev = list.find((x) => x.id === +b.dataset.event);
    if (ev) eventModal(ev);
  });
}

export function eventModal(e) {
  const left = Math.max(0, e.seats - e.taken), max = Math.min(10, left);
  const c = me();
  const m = modal({
    title: e.title, size: 'modal--md',
    html: `<p class="muted">${icon('calendar')} ${cap(fdate(e.date))} · ${esc(e.time || '')}${e.end_time ? ' – ' + esc(e.end_time) : ''} · ${esc(e.location || 'À l’institut')}</p>
    <form class="stack" data-ev-form>
      <div class="grid-2">
        <label class="field"><input name="name" required placeholder=" " value="${esc(c.name || '')}"><span>Nom complet</span></label>
        <label class="field"><input name="phone" type="tel" required placeholder=" " value="${esc(c.phone || '')}"><span>Téléphone</span></label>
      </div>
      <label class="field"><input name="email" type="email" placeholder=" " value="${esc(c.email || '')}"><span>E-mail (facultatif)</span></label>
      <div class="row-between"><span>Nombre de places <small class="muted">(${left} disponibles)</small></span>
        <div class="qty"><button type="button" data-d="-1" aria-label="Moins">${icon('minus')}</button><span data-seats>1</span><button type="button" data-d="1" aria-label="Plus">${icon('plus')}</button></div></div>
      ${e.price ? `<div class="total-line">Total : <strong data-total>${money(e.price)}</strong></div>
        <div class="radio-cards">
          <label class="rc"><input type="radio" name="pay" value="place" checked><span>${icon('store')}<strong>Payer sur place</strong><small>Le jour de l’atelier</small></span></label>
          <label class="rc"><input type="radio" name="pay" value="momo"><span>${icon('smartphone')}<strong>Mobile Money</strong><small>Place garantie</small></span></label>
        </div>
        <div data-momo hidden>${momoBlock(0)}<label class="field"><input name="payment_ref" placeholder=" "><span>Référence de la transaction</span></label></div>` : '<p class="pill pill--ok">Atelier gratuit — inscription conseillée</p>'}
      <button class="btn btn-primary btn-block btn-lg">Réserver ${icon('ticket')}</button>
    </form>`,
  });
  let seats = 1;
  const f = $('[data-ev-form]', m.body);
  $$('[data-d]', f).forEach((b) => b.addEventListener('click', () => {
    seats = Math.max(1, Math.min(max, seats + +b.dataset.d));
    $('[data-seats]', f).textContent = seats;
    const t = $('[data-total]', f);
    if (t) t.textContent = money(e.price * seats);
  }));
  $$('input[name=pay]', f).forEach((r) => r.addEventListener('change', () => { $('[data-momo]', f).hidden = r.value !== 'momo' || !r.checked; }));
  m.body.addEventListener('click', (ev) => { const b = ev.target.closest('[data-copy]'); if (b) navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Numéro copié')); });
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = formData(f);
    await busy(f.querySelector('.btn-primary'), async () => {
      try {
        const r = await api(`/api/events/${e.id}/register`, { method: 'POST', body: { name: d.name, phone: d.phone, email: d.email, seats, payment_ref: d.pay === 'momo' ? d.payment_ref : null } });
        saveContact(d);
        m.body.innerHTML = `<div class="success">${successCheck()}<h3>Place${seats > 1 ? 's' : ''} réservée${seats > 1 ? 's' : ''} !</h3>
          <p>Référence <strong class="ref">${esc(r.ref)}</strong></p>
          <p class="muted">${r.status === 'confirmed' ? 'Votre inscription est confirmée. À très vite !' : `Nous vous recontactons pour confirmer votre inscription${r.total ? ` (total ${money(r.total)})` : ''}.`}</p>
          <a class="btn btn-gold" target="_blank" rel="noopener" href="${waMain(`Bonjour, je viens de réserver ${seats} place(s) pour « ${e.title} » (réf. ${r.ref}).`)}">${icon('whatsapp')} Prévenir l’institut</a></div>`;
        confetti($('.success__check', m.body));
      } catch (err) { toast(err.message, 'err'); }
    });
  });
}

export { reveal };
