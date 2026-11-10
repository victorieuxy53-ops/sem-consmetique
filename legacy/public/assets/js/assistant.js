/* Assistante beauté : bulle flottante avec actions rapides, réponses automatiques,
   appel direct, WhatsApp, demande de rappel et orientation vers les bonnes pages. */
import { $, $$, esc, api, state, icon, money, fdur, CATS, telHref, waMain, phones, openStatus, DAYS, go, sleep, toast } from './core.js';
import { logoMark } from './art.js';

let services = null;
const loadServices = async () => services || (services = await api('/api/services').catch(() => []));

const CHIPS = [
  ['rdv', 'calendar', 'Prendre rendez-vous'], ['call', 'phone', 'Appeler l’institut'], ['wa', 'whatsapp', 'WhatsApp'],
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

export function mountAssistant() {
  const root = $('#assistant');
  const s = state.settings;
  root.innerHTML = `
    <button class="as-fab" aria-label="Ouvrir l’assistante" aria-expanded="false">
      <span class="as-fab__pulse"></span><span class="as-fab__ic as-fab__ic--open">${icon('chat')}</span><span class="as-fab__ic as-fab__ic--close">${icon('x')}</span>
    </button>
    <div class="as-hint" hidden><button class="as-hint__x" aria-label="Fermer">${icon('x')}</button>Besoin d’un conseil ou d’un rendez-vous ? Je suis là ✨</div>
    <section class="as-panel" role="dialog" aria-label="Assistante beauté" aria-hidden="true">
      <header class="as-head">
        <span class="as-avatar">${logoMark()}<span class="as-online"></span></span>
        <div><strong>Assistante ${esc(s.site_name)}</strong><small data-as-status></small></div>
        <div class="as-head__act">${phones()[0] ? `<a href="${telHref(phones()[0])}" data-external class="icon-btn" aria-label="Appeler">${icon('phone')}</a>` : ''}
          <a href="${waMain('Bonjour !')}" target="_blank" rel="noopener" class="icon-btn" aria-label="WhatsApp">${icon('whatsapp')}</a></div>
      </header>
      <div class="as-body" aria-live="polite"></div>
      <div class="as-chips"></div>
      <form class="as-input"><input placeholder="Écrivez votre question…" aria-label="Votre message" maxlength="300"><button aria-label="Envoyer">${icon('send')}</button></form>
    </section>`;

  const fab = $('.as-fab', root), panel = $('.as-panel', root), body = $('.as-body', root), chips = $('.as-chips', root), hint = $('.as-hint', root);
  let started = false;
  const setOpen = (open) => {
    root.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', open);
    panel.setAttribute('aria-hidden', !open);
    hint.hidden = true;
    try { sessionStorage.setItem('as.seen', '1'); } catch { /* ignore */ }
    if (open) {
      const st = openStatus();
      $('[data-as-status]', root).innerHTML = `<span class="open-dot ${st.open ? 'on' : ''}"></span> ${esc(st.open ? 'En ligne · réponse immédiate' : st.label)}`;
      if (!started) { started = true; greet(); }
      setTimeout(() => $('.as-input input', root).focus({ preventScroll: true }), 350);
    }
  };
  fab.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  $('.as-hint__x', root).addEventListener('click', (e) => { e.stopPropagation(); hint.hidden = true; try { sessionStorage.setItem('as.seen', '1'); } catch { /* ignore */ } });
  hint.addEventListener('click', () => setOpen(true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) setOpen(false); });
  let seen = false;
  try { seen = sessionStorage.getItem('as.seen') === '1'; } catch { /* ignore */ }
  if (!seen) setTimeout(() => { if (!root.classList.contains('open')) hint.hidden = false; }, 7000);

  const scroll = () => body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  const bubble = (html, who = 'bot') => {
    const b = document.createElement('div');
    b.className = `as-msg as-msg--${who}`;
    b.innerHTML = html;
    body.append(b);
    scroll();
    return b;
  };
  const bot = async (html, delay = 650) => {
    const t = bubble('<span class="typing"><i></i><i></i><i></i></span>');
    await sleep(delay);
    t.innerHTML = html;
    scroll();
    return t;
  };
  const renderChips = (list = CHIPS) => {
    chips.innerHTML = list.map(([k, i, l]) => `<button type="button" data-k="${k}">${icon(i)} ${l}</button>`).join('');
  };
  const actions = (list) => `<div class="as-actions">${list.join('')}</div>`;
  const link = (href, label, ic, ext = false) => `<a href="${href}" ${ext ? 'target="_blank" rel="noopener"' : ''} class="as-act">${icon(ic)} ${label}</a>`;
  const callBtns = () => phones().map((p) => `<a href="${telHref(p)}" data-external class="as-act as-act--call">${icon('phone')} ${esc(p)}</a>`).join('');

  async function greet() {
    const h = new Date().getHours();
    const name = state.user ? ' ' + esc(state.user.name.split(' ')[0]) : '';
    await bot(`${h < 18 ? 'Bonjour' : 'Bonsoir'}${name} ! 👋 Je suis votre assistante beauté.`, 400);
    await bot('Je peux vous aider à <strong>réserver un soin</strong>, <strong>commander</strong>, <strong>vous mettre en relation avec une conseillère</strong> ou répondre à vos questions. Que puis-je faire pour vous ?', 700);
    renderChips();
  }

  async function handle(k, text = '') {
    const s = state.settings;
    const st = openStatus();
    switch (k) {
      case 'rdv':
        return bot(`Avec plaisir ! Réservez en ligne en moins d’une minute, ou appelez-nous directement.${actions([link('/reservation', 'Réserver en ligne', 'calendar'), callBtns(), link(waMain('Bonjour, je souhaite prendre rendez-vous.'), 'Via WhatsApp', 'whatsapp', true)])}`);
      case 'call':
        return bot(`${st.open ? 'Nous sommes ouvertes, une conseillère vous répond tout de suite :' : `${esc(st.label)}. Vous pouvez tout de même essayer, ou demander à être rappelée :`}${actions([callBtns(), `<button class="as-act" data-k="rappel">${icon('refresh')} Être rappelée</button>`])}`);
      case 'wa':
        return bot(`Écrivez-nous sur WhatsApp, nous répondons vite 💬${actions([link(waMain(text || 'Bonjour, je souhaite un renseignement.'), 'Ouvrir WhatsApp', 'whatsapp', true)])}`);
      case 'prix': {
        const list = await loadServices();
        const rows = Object.entries(CATS).map(([c, v]) => {
          const ps = list.filter((x) => x.category === c && x.price).map((x) => x.price);
          return ps.length ? `<li><span>${icon(v.icon)} ${v.label}</span><strong>dès ${money(Math.min(...ps))}</strong></li>` : '';
        }).join('');
        return bot(`Voici nos tarifs de départ :<ul class="as-list">${rows}</ul>${actions([link('/prestations', 'Toutes les prestations', 'list'), link('/reservation', 'Réserver', 'calendar')])}`, 800);
      }
      case 'hours': {
        const h = s.hours || {};
        const lines = [1, 2, 3, 4, 5, 6, 0].map((d) => `<li><span>${DAYS[d]}</span><strong>${h[d] ? `${h[d][0].replace(':', 'h')} – ${h[d][1].replace(':', 'h')}` : 'Fermé'}</strong></li>`).join('');
        return bot(`<span class="open-dot ${st.open ? 'on' : ''}"></span> <strong>${esc(st.label)}</strong><ul class="as-list">${lines}</ul>${s.address || s.city ? `${icon('pin')} ${esc([s.address, s.city].filter(Boolean).join(', '))}` : ''}${actions([link('/contact', 'Plan & contact', 'pin'), callBtns()])}`);
      }
      case 'pay':
        return bot(`Nous acceptons les <strong>espèces</strong> et le <strong>Mobile Money</strong> (${(s.momo || []).map((m) => esc(m.network)).join(', ')}). Pour la boutique, vous pouvez payer à la livraison.${actions([link('/boutique', 'Boutique', 'bag'), link('/formations', 'Formations', 'film')])}`);
      case 'shop':
        return bot(`Nos produits se commandent en ligne avec <strong>livraison à domicile</strong> ou <strong>retrait gratuit</strong>. Vous pouvez aussi commander directement par WhatsApp.${actions([link('/boutique', 'Voir la boutique', 'bag'), link(waMain('Bonjour, je souhaite commander des produits.'), 'Commander sur WhatsApp', 'whatsapp', true), link('/suivi', 'Suivre une commande', 'truck')])}`);
      case 'sm':
        return bot(`Coffret cadeau, routine sur-mesure, attache foulard pour un mariage, bon cadeau… Décrivez votre envie et recevez un <strong>devis personnalisé sous 24 h</strong> 🎁${actions([link('/sur-mesure', 'Faire ma demande', 'gift'), link(waMain('Bonjour, j’ai un projet sur-mesure.'), 'En parler sur WhatsApp', 'whatsapp', true)])}`);
      case 'for':
        return bot(`Nos <strong>formations vidéo</strong> (attache foulard, make-up pro, soin de la peau…) sont accessibles à vie, sur téléphone, avec paiement par Mobile Money.${actions([link('/formations', 'Voir les formations', 'film'), link('/ateliers', 'Ateliers en présentiel', 'ticket')])}`);
      case 'atl':
        return bot(`Nos ateliers se font en petit groupe, les places sont limitées : réservez la vôtre en ligne !${actions([link('/ateliers', 'Voir les ateliers', 'ticket')])}`);
      case 'foulard':
        return bot(`L’attache foulard est l’une de nos spécialités : du nœud du quotidien au <strong>gele de cérémonie</strong>, à l’institut ou à domicile pour vos événements.${actions([link('/prestations?cat=foulard', 'Prestations foulard', 'wrap'), link('/sur-mesure?type=foulard', 'Devis événement', 'gift'), link('/formations', 'Apprendre en vidéo', 'film')])}`);
      case 'makeup':
        return bot(`Maquillage jour, soirée ou <strong>mariée avec essai</strong> : nos maquilleuses subliment toutes les carnations, avec une tenue longue durée.${actions([link('/prestations?cat=makeup', 'Prestations make-up', 'brush'), link('/sur-mesure?type=makeup', 'Devis événement', 'gift')])}`);
      case 'peau':
        return bot(`Chaque peau est unique. Faites notre <strong>diagnostic gratuit en 1 minute</strong> pour une routine adaptée, ou réservez un dermo-conseil en institut.${actions([link('/diagnostic', 'Faire mon diagnostic', 'drop'), link('/prestations?cat=dermo', 'Consultation dermo-conseil', 'face')])}`);
      case 'rappel': {
        const m = await bot(`Laissez-moi votre prénom et votre numéro, une conseillère vous rappelle ${st.open ? 'dans les minutes qui suivent' : 'dès l’ouverture'} 📞
          <form class="as-form" data-cb><input name="name" placeholder="Prénom" required value="${esc(state.user?.name || '')}"><input name="phone" type="tel" placeholder="Téléphone" required value="${esc(state.user?.phone || '')}"><button>${icon('send')} Me rappeler</button></form>`);
        $('[data-cb]', m).addEventListener('submit', async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          f.querySelector('button').disabled = true;
          try {
            await api('/api/contact', { method: 'POST', body: { kind: 'rappel', name: f.name.value, phone: f.phone.value, subject: 'Demande de rappel (assistante)', message: text || 'Demande de rappel depuis l’assistante du site' } });
            f.outerHTML = `<p class="as-ok">${icon('check')} C’est noté, ${esc(f.name.value)} ! Nous vous rappelons au ${esc(f.phone.value)}.</p>`;
          } catch (err) { toast(err.message, 'err'); f.querySelector('button').disabled = false; }
        });
        return m;
      }
      case 'hello':
        return bot('Bonjour à vous ! 😊 Dites-moi ce dont vous avez besoin, ou choisissez une option ci-dessous.');
      case 'thanks':
        return bot('Avec grand plaisir ! Belle journée à vous ✨ N’hésitez pas si vous avez une autre question.');
      default:
        return bot(`Je transmets volontiers votre question à une conseillère, qui vous répondra personnellement :${actions([link(waMain(`Bonjour, j’ai une question : ${text}`), 'Envoyer sur WhatsApp', 'whatsapp', true), callBtns(), `<button class="as-act" data-k="rappel">${icon('refresh')} Être rappelée</button>`])}`);
    }
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) {
      const label = b.textContent.trim();
      bubble(esc(label), 'me');
      handle(b.dataset.k);
      return;
    }
    const a = e.target.closest('.as-act[href^="/"]');
    if (a && innerWidth < 700) setOpen(false);
  });
  $('.as-input', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input', e.currentTarget);
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    bubble(esc(text), 'me');
    const k = INTENTS.find(([, re]) => re.test(text))?.[0];
    handle(k || 'unknown', text);
  });
}
