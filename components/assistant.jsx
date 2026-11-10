'use client';
/* Assistante beauté : actions rapides, réponses automatiques, appel, WhatsApp, demande de rappel. */
import { useEffect, useRef, useState } from 'react';
import { api, CATS, cx, DAYS, WEEK, address, hoursLabel, money, openStatus, phones, sleep, telHref, waMain, whatsappRelay } from '@/lib/core';
import { Icon, LogoMark, OpenDot, useApp } from './ui';

const CHIPS = [
  ['rdv', 'calendar', 'Prendre rendez-vous'], ['call', 'phone', 'Nous appeler'], ['wa', 'whatsapp', 'WhatsApp'],
  ['prix', 'wallet', 'Tarifs'], ['shop', 'bag', 'Commander'], ['sm', 'gift', 'Sur-mesure'],
  ['for', 'film', 'Formations'], ['hours', 'clock', 'Horaires & adresse'], ['rappel', 'refresh', 'Être rappelée'], ['peau', 'drop', 'Diagnostic de peau'],
];
const INTENTS = [
  ['rappel', /rappel|rappeler|recontact/i],
  ['rdv', /rendez|rdv|r[ée]serv|cr[ée]neau|dispo|prendre (une )?place/i],
  ['call', /appel|t[ée]l[ée]phone|num[ée]ro|joindre|contacter/i],
  ['wa', /whats|\bwa\b/i],
  ['prix', /prix|tarif|combien|co[uû]t|cher/i],
  ['hours', /heure|horaire|ouvert|ferm|adresse|o[uù] (se trouve|êtes|etes)|situ[ée]|localis|venir/i],
  ['pay', /paie|payer|momo|mobile money|moov|mtn|esp[eè]ce/i],
  ['shop', /command|achet|produit|boutique|livr|panier|cr[eè]me|s[ée]rum|savon|karit/i],
  ['sm', /personnalis|sur[- ]?mesure|coffret|cadeau|\bbon\b|devis/i],
  ['for', /formation|cours|apprendre|vid[ée]o|acad[ée]mie/i],
  ['atl', /atelier|masterclass|place/i],
  ['foulard', /foulard|gele|attache|turban/i],
  ['makeup', /maquill|make|mari[ée]e|mariage|soir[ée]e/i],
  ['peau', /peau|tache|acn[ée]|bouton|s[eè]che|grasse|diagnostic|routine|ride|dermo/i],
  ['hello', /^(bonjour|bonsoir|salut|hello|coucou|hey)/i],
  ['thanks', /merci|super|top|g[ée]nial/i],
];
const TYPING = <span className="typing"><i /><i /><i /></span>;
let services = null, mid = 0;

export function Assistant() {
  const { s, user } = useApp();
  const [open, setOpen] = useState(false), [hint, setHint] = useState(false), [chips, setChips] = useState(false), [msgs, setMsgs] = useState([]);
  const started = useRef(false), body = useRef(null), input = useRef(null);

  const push = (who, node) => { const id = ++mid; setMsgs((m) => [...m, { id, who, node }]); return id; };
  const bot = async (node, delay = 650) => { const id = push('bot', TYPING); await sleep(delay); setMsgs((m) => m.map((x) => (x.id === id ? { ...x, node } : x))); };
  const pick = (k, label, text) => { push('me', label); handle(k, text); };

  const Act = ({ href, ic, children, ext }) => <a href={href} className="as-act" {...(ext && { target: '_blank', rel: 'noopener' })}><Icon n={ic} /> {children}</a>;
  const Calls = () => phones().map((p) => <a key={p} href={telHref(p)} data-external className="as-act as-act--call"><Icon n="phone" /> {p}</a>);
  const Recall = () => <button className="as-act" onClick={() => pick('rappel', 'Être rappelée')}><Icon n="refresh" /> Être rappelée</button>;
  const Acts = ({ children }) => <div className="as-actions">{children}</div>;

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('as.seen') === '1'; } catch { /* ignore */ }
    const t = seen ? 0 : setTimeout(() => setHint(true), 7000);
    const k = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    return () => { clearTimeout(t); document.removeEventListener('keydown', k); };
  }, []);
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);
  useEffect(() => {
    if (!open) return;
    setHint(false);
    try { sessionStorage.setItem('as.seen', '1'); } catch { /* ignore */ }
    if (!started.current) {
      started.current = true;
      (async () => {
        const name = user ? ' ' + user.name.split(' ')[0] : '';
        await bot(`${new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'}${name}. Je suis l’assistante de ${s.site_name}.`, 400);
        await bot(<>Je peux vous aider à <strong>réserver un soin</strong>, <strong>commander</strong>, <strong>vous mettre en relation avec une conseillère</strong> ou répondre à vos questions. Que puis-je faire pour vous ?</>, 700);
        setChips(true);
      })();
    }
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handle(k, text = '') {
    const st = openStatus();
    switch (k) {
      case 'rdv': return bot(<>Avec plaisir ! Réservez en ligne en moins d’une minute, ou appelez-nous directement.<Acts><Act href="/reservation" ic="calendar">Réserver en ligne</Act><Calls /><Act ext href={waMain('Bonjour, je souhaite prendre rendez-vous.')} ic="whatsapp">Via WhatsApp</Act></Acts></>);
      case 'call': return bot(<>{st.open ? 'Nous sommes ouvertes, une conseillère vous répond tout de suite :' : `${st.label}. Vous pouvez tout de même essayer, ou demander à être rappelée :`}<Acts><Calls /><Recall /></Acts></>);
      case 'wa': return bot(<>Écrivez-nous sur WhatsApp, nous répondons rapidement.<Acts><Act ext href={waMain(text || 'Bonjour, je souhaite un renseignement.')} ic="whatsapp">Ouvrir WhatsApp</Act></Acts></>);
      case 'prix': {
        const list = await (services ||= api('/api/services').catch(() => []));
        return bot(<>Voici nos tarifs de départ :<ul className="as-list">{Object.entries(CATS).map(([c, v]) => {
          const ps = list.filter((x) => x.category === c && x.price).map((x) => x.price);
          return ps.length > 0 && <li key={c}><span><Icon n={v.icon} /> {v.label}</span><strong>dès {money(Math.min(...ps))}</strong></li>;
        })}</ul><Acts><Act href="/prestations" ic="list">Toutes les prestations</Act><Act href="/reservation" ic="calendar">Réserver</Act></Acts></>, 800);
      }
      case 'hours': return bot(<><OpenDot on={st.open} /> <strong>{st.label}</strong><ul className="as-list">{WEEK.map((d) => <li key={d}><span>{DAYS[d]}</span><strong>{hoursLabel(s.hours?.[d])}</strong></li>)}</ul>
        {address() && <><Icon n="pin" /> {address()}</>}<Acts><Act href="/contact" ic="pin">Plan & contact</Act><Calls /></Acts></>);
      case 'pay': return bot(<>Nous acceptons les <strong>espèces</strong> et le <strong>Mobile Money</strong> ({(s.momo || []).map((m) => m.network).join(', ')}). Pour la boutique, vous pouvez payer à la livraison.<Acts><Act href="/boutique" ic="bag">Boutique</Act><Act href="/formations" ic="film">Formations</Act></Acts></>);
      case 'shop': return bot(<>Nos produits se commandent en ligne avec <strong>livraison à domicile</strong> ou <strong>retrait gratuit</strong>. Vous pouvez aussi commander directement par WhatsApp.<Acts><Act href="/boutique" ic="bag">Voir la boutique</Act><Act ext href={waMain('Bonjour, je souhaite commander des produits.')} ic="whatsapp">Commander sur WhatsApp</Act><Act href="/suivi" ic="truck">Suivre une commande</Act></Acts></>);
      case 'sm': return bot(<>Coffret cadeau, routine sur-mesure, attache foulard pour un mariage, bon cadeau… Décrivez votre envie et recevez un <strong>devis personnalisé sous 24 h</strong>.<Acts><Act href="/sur-mesure" ic="gift">Faire ma demande</Act><Act ext href={waMain('Bonjour, j’ai un projet sur-mesure.')} ic="whatsapp">En parler sur WhatsApp</Act></Acts></>);
      case 'for': return bot(<>Nos <strong>formations vidéo</strong> (attache foulard, make-up pro, soin de la peau…) sont accessibles à vie, sur téléphone, avec paiement par Mobile Money.<Acts><Act href="/formations" ic="film">Voir les formations</Act><Act href="/ateliers" ic="ticket">Ateliers en présentiel</Act></Acts></>);
      case 'atl': return bot(<>Nos ateliers se font en petit groupe, les places sont limitées : réservez la vôtre en ligne !<Acts><Act href="/ateliers" ic="ticket">Voir les ateliers</Act></Acts></>);
      case 'foulard': return bot(<>L’attache foulard est l’une de nos spécialités : du nœud du quotidien au <strong>gele de cérémonie</strong>, sur place ou à domicile pour vos événements.<Acts><Act href="/prestations?cat=foulard" ic="wrap">Prestations foulard</Act><Act href="/sur-mesure?type=foulard" ic="gift">Devis événement</Act><Act href="/formations" ic="film">Apprendre en vidéo</Act></Acts></>);
      case 'makeup': return bot(<>Maquillage jour, soirée ou <strong>mariée avec essai</strong> : nos maquilleuses subliment toutes les carnations, avec une tenue longue durée.<Acts><Act href="/prestations?cat=makeup" ic="brush">Prestations make-up</Act><Act href="/sur-mesure?type=makeup" ic="gift">Devis événement</Act></Acts></>);
      case 'peau': return bot(<>Chaque peau est unique. Faites notre <strong>diagnostic gratuit en 1 minute</strong> pour une routine adaptée, ou réservez un dermo-conseil sur place.<Acts><Act href="/diagnostic" ic="drop">Faire mon diagnostic</Act><Act href="/prestations?cat=dermo" ic="face">Consultation dermo-conseil</Act></Acts></>);
      case 'rappel': return bot(<>Laissez-moi votre prénom et votre numéro, une conseillère vous rappelle {st.open ? 'dans les minutes qui suivent' : 'dès l’ouverture'}.<RecallForm text={text} user={user} /></>);
      case 'hello': return bot('Bonjour. Dites-moi ce dont vous avez besoin, ou choisissez une option ci-dessous.');
      case 'thanks': return bot('Avec plaisir. N’hésitez pas si vous avez une autre question.');
      default: return bot(<>Je transmets volontiers votre question à une conseillère, qui vous répondra personnellement :<Acts><Act ext href={waMain(`Bonjour, j’ai une question : ${text}`)} ic="whatsapp">Envoyer sur WhatsApp</Act><Calls /><Recall /></Acts></>);
    }
  }

  const st = openStatus();
  return (
    <div id="assistant" className={cx(open && 'open')} onClick={(e) => { if (e.target.closest('.as-act[href^="/"]') && innerWidth < 700) setOpen(false); }}>
      <button className="as-fab" aria-label="Ouvrir l’assistante" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="as-fab__pulse" /><span className="as-fab__ic as-fab__ic--open"><Icon n="chat" /></span><span className="as-fab__ic as-fab__ic--close"><Icon n="x" /></span>
      </button>
      <div className="as-hint" hidden={!hint} onClick={() => setOpen(true)}>
        <button className="as-hint__x" aria-label="Fermer" onClick={(e) => { e.stopPropagation(); setHint(false); try { sessionStorage.setItem('as.seen', '1'); } catch { /* ignore */ } }}><Icon n="x" /></button>
        Besoin d’un conseil ou d’un rendez-vous ? Nous vous répondons.
      </div>
      <section className="as-panel" role="dialog" aria-label="Assistante beauté" aria-hidden={!open}>
        <header className="as-head">
          <span className="as-avatar"><LogoMark /><span className="as-online" /></span>
          <div><strong>Assistante {s.site_name}</strong><small><OpenDot on={st.open} /> {st.open ? 'En ligne · réponse immédiate' : st.label}</small></div>
          <div className="as-head__act">{phones()[0] && <a href={telHref(phones()[0])} data-external className="icon-btn" aria-label="Appeler"><Icon n="phone" /></a>}
            <a href={waMain('Bonjour !')} target="_blank" rel="noopener" className="icon-btn" aria-label="WhatsApp"><Icon n="whatsapp" /></a></div>
        </header>
        <div className="as-body" aria-live="polite" ref={body}>{msgs.map((m) => <div key={m.id} className={`as-msg as-msg--${m.who}`}>{m.node}</div>)}</div>
        <div className="as-chips">{chips && CHIPS.map(([k, i, l]) => <button type="button" key={k} onClick={() => pick(k, l)}><Icon n={i} /> {l}</button>)}</div>
        <form className="as-input" onSubmit={(e) => {
          e.preventDefault();
          const text = input.current.value.trim();
          if (!text) return;
          input.current.value = '';
          pick(INTENTS.find(([, re]) => re.test(text))?.[0] || 'unknown', text, text);
        }}><input ref={input} placeholder="Écrivez votre question…" aria-label="Votre message" maxLength={300} /><button aria-label="Envoyer"><Icon n="send" /></button></form>
      </section>
    </div>
  );
}

function RecallForm({ text, user }) {
  const [done, setDone] = useState(null), [busy, setBusy] = useState(false);
  if (done) return <p className="as-ok"><Icon n="check" /> Merci {done.name} ! Envoyez le message ouvert dans WhatsApp : nous vous rappelons au {done.phone}.</p>;
  return (
    <form className="as-form" onSubmit={async (e) => {
      e.preventDefault();
      const f = e.currentTarget, d = { name: f.elements.name.value, phone: f.elements.phone.value };
      setBusy(true);
      const wa = whatsappRelay();
      await api('/api/contact', { method: 'POST', body: { kind: 'rappel', ...d, subject: 'Demande de rappel (assistante)', message: text || 'Demande de rappel depuis l’assistante du site' } }).catch(() => {});
      wa.send(`Bonjour, je suis ${d.name}. Pouvez-vous me rappeler au ${d.phone} ?${text ? `\nMa question : ${text}` : ''}`);
      setDone(d);
    }}>
      <input name="name" placeholder="Prénom" required defaultValue={user?.name || ''} />
      <input name="phone" type="tel" placeholder="Téléphone" required defaultValue={user?.phone || ''} />
      <button disabled={busy}><Icon n="whatsapp" /> Demander mon rappel</button>
    </form>
  );
}

