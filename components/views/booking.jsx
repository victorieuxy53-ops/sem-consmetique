'use client';
/* Réservation de rendez-vous (assistant en 4 étapes) & ateliers avec places limitées. */
import { useEffect, useRef, useState } from 'react';
import { api, address, cap, CATS, cx, downloadIcs, fdate, fdur, hm, localNow, money, openStatus, phones, saveContact, settings, telHref, toast, waMain, whatsappRelay } from '@/lib/core';
import { Area, Btn, Empty, EventCard, Icon, Input, OpenDot, PageHero, SuccessCheck, pop, useContact, useSubmit } from '../ui';

const STEPS = ['Prestation', 'Date & heure', 'Coordonnées', 'Confirmation'];
const GROUPS = [['Matin', (t) => t < '12:00'], ['Après-midi', (t) => t >= '12:00' && t < '17:00'], ['Soirée', (t) => t >= '17:00']];
const monthOf = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);

export function Booking({ services, pre }) {
  const s = settings(), st = openStatus(), c = useContact();
  const svc0 = services.find((x) => String(x.id) === String(pre) || x.slug === pre) || null;
  const now = localNow(), minMonth = monthOf(now), maxMonth = monthOf(new Date(now.getTime() + (+s.max_days || 60) * 864e5));
  const [step, setStep] = useState(svc0 ? 2 : 1), [svc, setSvc] = useState(svc0), [date, setDate] = useState(null), [time, setTime] = useState(null);
  const [month, setMonth] = useState(minMonth), [days, setDays] = useState(null), [slots, setSlots] = useState(null), [filter, setFilter] = useState('all');
  const [reload, setReload] = useState(0), [done, setDone] = useState(null);
  const main = useRef(null);

  const go = (n) => { setStep(n); if (n > 1 && innerWidth < 900) main.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  useEffect(() => {
    if (step !== 2 || !svc) return;
    let live = true;
    const key = new Date(month).toISOString().slice(0, 7);
    setDays(null);
    api(`/api/availability?service=${svc.id}&month=${key}`).then((r) => live && setDays(r.days)).catch((e) => { toast(e.message, 'err'); live && setDays({}); });
    return () => { live = false; };
  }, [svc, month, step, reload]);

  const pickDate = async (d) => {
    setDate(d); setTime(null); setSlots('loading');
    try { setSlots({ list: (await api(`/api/availability?service=${svc.id}&date=${d}`)).slots }); }
    catch (err) { setSlots({ error: err.message }); }
  };
  const [submit, busy] = useSubmit(async (d) => {
    if (!svc || !date || !time) return go(svc ? 2 : 1);
    const wa = whatsappRelay();
    try {
      const r = await api('/api/bookings', { method: 'POST', body: { service_id: svc.id, date, time, name: d.name, phone: d.phone, notes: d.notes } });
      saveContact(d);
      setDone({ ...r, name: d.name });
      go(4);
      wa.send(`Bonjour, je viens de réserver en ligne :\n• ${r.service}\n• ${cap(fdate(r.date))} à ${hm(r.time)}\n• Réf. ${r.ref}\nAu nom de ${d.name} (${d.phone}).${d.notes ? `\nPrécisions : ${d.notes}` : ''}\nMerci de me confirmer !`);
    } catch (err) {
      wa.cancel();
      if (err.status === 409) { go(2); setReload((n) => n + 1); }
      throw err;
    }
  });
  const again = () => { setSvc(null); setDate(null); setTime(null); setDone(null); go(1); };

  const d0 = new Date(month), y = d0.getUTCFullYear(), m = d0.getUTCMonth(), key = d0.toISOString().slice(0, 7);
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const r = done, msg = r && `Bonjour, je viens de réserver en ligne :\n• ${r.service}\n• ${cap(fdate(r.date))} à ${hm(r.time)}\n• Réf. ${r.ref}\nAu nom de ${r.name}. Merci de me confirmer !`;

  return <>
    <PageHero eyebrow="Réservation en ligne 24 h/24" title="Votre moment *beauté*" sub="Choisissez votre soin et votre créneau : c’est réservé en moins d’une minute. Vous préférez parler à quelqu’un ? Appelez-nous, tout simplement." crumbs={[[null, 'Réservation']]} cls="phero--sm" />
    <section className="section section--tight"><div className="container book" data-step={step}>
      <div className="book__main card" data-reveal ref={main}>
        <ol className="steps" aria-label="Étapes">
          {STEPS.map((l, i) => <li key={l} className={cx(i + 1 === step && 'active', i + 1 < step && 'done')}><span>{i + 1}</span><em>{l}</em></li>)}
          <span className="steps__bar"><span style={{ transform: `scaleX(${(step - 1) / 3})` }} /></span>
        </ol>
        <div className="panes">
          <div className="pane" data-pane="1">
            <h3 className="pane__title">Quel soin vous ferait plaisir ?</h3>
            <div className="chips">{[['all', { label: 'Tout' }], ...Object.entries(CATS)].map(([k, v]) => <button key={k} className={cx('chip', filter === k && 'active')} onClick={() => setFilter(k)}>{v.icon && <Icon n={v.icon} />} {v.label}</button>)}</div>
            <div className="opts">{services.filter((x) => filter === 'all' || x.category === filter).map((x, i) => (
              <button type="button" key={filter + x.id} className={cx('opt', svc?.id === x.id && 'selected')} style={{ '--c': CATS[x.category]?.color || '#9b4d6e', ...(filter !== 'all' && pop(i, 30, 10)) }}
                onClick={() => { setSvc(x); setDate(null); setTime(null); setSlots(null); setTimeout(() => go(2), 280); }}>
                <span className="opt__ic"><Icon n={CATS[x.category]?.icon} /></span>
                <span className="opt__txt"><strong>{x.name}</strong><small>{fdur(x.duration)} · {x.price ? money(x.price) : 'Sur devis'}</small></span>
                <span className="opt__check"><Icon n="check" /></span></button>))}</div>
          </div>
          <div className="pane" data-pane="2">
            <h3 className="pane__title">Quand souhaitez-vous venir ?</h3>
            <div className="book__when">
              <div className="cal">
                <div className="cal__head">
                  <button type="button" className="icon-btn" disabled={month <= minMonth} onClick={() => setMonth(Date.UTC(y, m - 1, 1))} aria-label="Mois précédent"><Icon n="chevL" /></button>
                  <strong className="cal__title">{cap(d0.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }))}</strong>
                  <button type="button" className="icon-btn" disabled={month >= maxMonth} onClick={() => setMonth(Date.UTC(y, m + 1, 1))} aria-label="Mois suivant"><Icon n="chevR" /></button>
                </div>
                <div className="cal__dow">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, i) => <span key={i}>{x}</span>)}</div>
                <div className={cx('cal__grid', !days && 'loading')}>
                  {Array.from({ length: lead }, (_, i) => <span key={'e' + i} className="cal__d cal__d--empty" />)}
                  {Array.from({ length: total }, (_, i) => {
                    const dt = `${key}-${String(i + 1).padStart(2, '0')}`, stt = days?.[dt] || 'closed';
                    return <button type="button" key={dt} className={cx('cal__d', `cal__d--${stt}`, dt === date && 'sel')} disabled={stt !== 'open'} style={{ '--i': i + 1 }}
                      aria-label={`${fdate(dt)} ${stt === 'open' ? 'disponible' : 'indisponible'}`} onClick={() => pickDate(dt)}>{i + 1}</button>;
                  })}
                </div>
                <div className="cal__legend"><span className="lg lg--open">Disponible</span><span className="lg lg--full">Complet</span><span className="lg lg--closed">Fermé</span></div>
              </div>
              <div className="slots">
                <h4 className="slots__title"><Icon n={date ? 'clock' : 'calendar'} /> {date ? cap(fdate(date)) : 'Sélectionnez une date'}</h4>
                <div className="slots__body">
                  {!slots && <p className="muted small">Les créneaux disponibles s’affichent ici en temps réel.</p>}
                  {slots === 'loading' && <><div className="skeleton-row" /><div className="skeleton-row" /></>}
                  {slots?.error && <p className="muted">{slots.error}</p>}
                  {slots?.list && (slots.list.length ? GROUPS.map(([label, f]) => {
                    const list = slots.list.filter((x) => f(x.time));
                    return list.length > 0 && <div className="slots__group" key={label}><span>{label}</span><div className="slots__grid">{list.map((x, i) => (
                      <button type="button" key={x.time} className={cx('slot', x.time === time && 'sel')} disabled={!x.available} style={{ '--i': i }} onClick={() => { setTime(x.time); setTimeout(() => go(3), 250); }}>{hm(x.time)}</button>))}</div></div>;
                  }) : <p className="muted">Plus aucun créneau ce jour-là. Essayez une autre date ou appelez-nous.</p>)}
                </div>
              </div>
            </div>
            <div className="pane__nav"><button type="button" className="btn btn-ghost" onClick={() => go(1)}><Icon n="arrowL" /> Changer de soin</button></div>
          </div>
          <div className="pane" data-pane="3">
            <h3 className="pane__title">Vos coordonnées</h3>
            <form className="stack" onSubmit={submit} key={c.phone || 'x'}>
              <div className="grid-2">
                <Input label="Nom complet" name="name" required autoComplete="name" defaultValue={c.name} />
                <Input label="Téléphone (WhatsApp)" name="phone" type="tel" required autoComplete="tel" defaultValue={c.phone} />
              </div>
              <Area label="Précisions : allergies, peau sensible, demande particulière…" name="notes" rows={3} />
              <label className="check"><input type="checkbox" required /><span>J’accepte d’être contactée par téléphone ou WhatsApp pour la confirmation de mon rendez-vous.</span></label>
              <div className="pane__nav"><button type="button" className="btn btn-ghost" onClick={() => go(2)}><Icon n="arrowL" /> Retour</button><Btn busy={busy} className="btn btn-primary btn-lg">Réserver et envoyer sur WhatsApp <Icon n="whatsapp" /></Btn></div>
            </form>
          </div>
          <div className="pane" data-pane="4">{r && <div className="success">
            <SuccessCheck />
            <h3>Votre demande est enregistrée !</h3>
            <p className="wa-sent"><Icon n="whatsapp" /> WhatsApp s’est ouvert avec votre demande : appuyez sur <strong>Envoyer</strong> pour la transmettre.</p>
            <p>Référence <strong className="ref">{r.ref}</strong></p>
            <div className="recap"><div><Icon n="leaf" /> {r.service}</div><div><Icon n="calendar" /> {cap(fdate(r.date))}</div><div><Icon n="clock" /> {hm(r.time)} · {fdur(r.duration)}</div><div><Icon n="wallet" /> {r.price ? money(r.price) : 'Sur devis'}</div></div>
            <p className="muted">Notre équipe vous confirme le rendez-vous très vite par téléphone ou WhatsApp. Gardez bien votre référence.</p>
            <div className="row-wrap center">
              <a className="btn btn-gold" href={waMain(msg)} target="_blank" rel="noopener"><Icon n="whatsapp" /> Rouvrir WhatsApp</a>
              <button type="button" className="btn btn-ghost" onClick={() => downloadIcs({ title: `${r.service}, ${s.site_name}`, date: r.date, time: r.time, duration: r.duration, location: address(), description: `Réf. ${r.ref}` })}><Icon n="calendar" /> Ajouter à mon agenda</button>
              <a className="btn btn-ghost" href={`/suivi?ref=${encodeURIComponent(r.ref)}`}><Icon n="eye" /> Suivre</a>
            </div>
            <button type="button" className="link-btn" onClick={again}>Prendre un autre rendez-vous</button>
          </div>}</div>
        </div>
      </div>
      <aside className="book__side">
        <div className="card sum" data-reveal data-delay="150">
          <h4>Récapitulatif</h4>
          <dl>
            <div><dt><Icon n="leaf" /> Soin</dt><dd>{svc?.name || 'À choisir'}</dd></div>
            <div><dt><Icon n="calendar" /> Date</dt><dd>{date ? cap(fdate(date)) : 'À choisir'}</dd></div>
            <div><dt><Icon n="clock" /> Heure</dt><dd>{time ? `${hm(time)} (${fdur(svc.duration)})` : 'À choisir'}</dd></div>
            <div><dt><Icon n="wallet" /> Tarif</dt><dd>{svc ? (svc.price ? money(svc.price) : 'Sur devis') : 'À choisir'}</dd></div>
          </dl>
          <p className="small muted">Règlement sur place (espèces ou Mobile Money). Annulation gratuite jusqu’à 24 h avant.</p>
        </div>
        <div className="card help" data-reveal data-delay="250">
          <h4>Réserver par téléphone</h4>
          <p className="small"><OpenDot on={st.open} /> {st.label}</p>
          {phones().map((p) => <a key={p} href={telHref(p)} data-external className="btn btn-ghost btn-block btn-sm"><Icon n="phone" /> {p}</a>)}
          <a href={waMain('Bonjour, je souhaite prendre rendez-vous.')} target="_blank" rel="noopener" className="btn btn-gold btn-block btn-sm"><Icon n="whatsapp" /> Réserver sur WhatsApp</a>
        </div>
      </aside>
    </div></section>
  </>;
}

/* ============================================================ ATELIERS */
export function Events({ list }) {
  return <>
    <PageHero eyebrow="Ateliers · Masterclass · Journées spéciales" title="Apprenez, partagez, *rayonnez*" sub="Des ateliers en petit groupe animés par nos expertes. Les places sont limitées : réservez la vôtre en ligne en quelques secondes." crumbs={[[null, 'Ateliers']]} />
    <section className="section"><div className="container">
      <div className="ecards" data-stagger="120">{list.map((e) => <EventCard key={e.id} e={e} />)}</div>
      {!list.length && <Empty text="Aucun atelier programmé pour le moment. Revenez bientôt ou contactez-nous pour un atelier privé." icon="ticket" />}
      <div className="private card" data-reveal>
        <div><p className="eyebrow">Atelier privé</p><h3 className="h3">EVJF, anniversaire, comité d’entreprise…</h3><p className="muted">Nous organisons des ateliers beauté et attache foulard sur-mesure, sur place ou chez vous.</p></div>
        <div className="row-wrap"><a href="/sur-mesure?type=autre" className="btn btn-primary"><Icon n="gift" /> Demander un devis</a><a href={waMain('Bonjour, je souhaite organiser un atelier privé.')} target="_blank" rel="noopener" className="btn btn-ghost"><Icon n="whatsapp" /> En parler</a></div>
      </div>
    </div></section>
  </>;
}
