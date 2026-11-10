/* Boutique, fiche produit, commande, sur-mesure, suivi. */
import { $, $$, esc, api, state, icon, money, cap, fdate, fdatetime, PCATS, STATUS, CUSTOM_TYPES, statusPill, toast, formData, busy, cart, on, emit, waMain, telHref, phones, imageToDataUrl, debounce, go, md } from '../core.js';
import { productVisual } from '../art.js';
import { confetti, refresh } from '../anim.js';
import { pageHero, secHead, productCard, bindAdd, empty } from './ui.js';
import { successCheck, momoBlock } from './booking.js';

const savedContact = () => { try { return JSON.parse(localStorage.getItem('institut.contact')) || {}; } catch { return {}; } };
const me = () => ({ ...savedContact(), ...(state.user ? { name: state.user.name, email: state.user.email, phone: state.user.phone || savedContact().phone } : {}) });

/* ================================================================ BOUTIQUE */
export async function shop({ query }) {
  const products = await api('/api/products');
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const cat = cats.includes(query.cat) ? query.cat : '';
  return {
    title: 'Boutique',
    html: `${pageHero({ eyebrow: 'Cosmetics · Soins · Make-up · Foulards', title: 'La boutique <em>beauté</em>', sub: 'Des produits sélectionnés et testés par nos expertes. Livraison à domicile ou retrait gratuit à l’institut, paiement à la livraison ou par Mobile Money.', crumbs: [[null, 'Boutique']] })}
    <section class="section section--tight"><div class="container">
      <div class="toolbar" data-reveal>
        <label class="search">${icon('search')}<input type="search" placeholder="Rechercher un produit…" data-q aria-label="Rechercher"></label>
        <div class="chips" data-cats><button class="chip ${cat ? '' : 'active'}" data-c="">Tout</button>${cats.map((c) => `<button class="chip ${c === cat ? 'active' : ''}" data-c="${esc(c)}">${esc(PCATS[c] || c)}</button>`).join('')}</div>
        <label class="field field--select field--inline"><select data-sort aria-label="Trier"><option value="">Pertinence</option><option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option><option value="new">Nouveautés</option></select></label>
      </div>
      <div class="pgrid" data-grid></div>
      <div data-empty hidden>${empty('Aucun produit ne correspond à votre recherche.', 'search')}</div>
      <div class="perks" data-stagger="100">
        <div>${icon('truck')}<strong>Livraison rapide</strong><span>Offerte dès ${money(state.settings.free_delivery_from)}</span></div>
        <div>${icon('wallet')}<strong>Paiement flexible</strong><span>À la livraison ou Mobile Money</span></div>
        <div>${icon('shield')}<strong>Produits testés</strong><span>Sélectionnés par nos expertes</span></div>
        <div>${icon('gift')}<strong>Coffrets sur-mesure</strong><span><a href="/sur-mesure">Composez le vôtre</a></span></div>
      </div>
    </div></section>`,
    mount(root) {
      const S = { q: '', cat, sort: '' };
      const grid = $('[data-grid]', root);
      const render = () => {
        let list = products.filter((p) => (!S.cat || p.category === S.cat) && (!S.q || `${p.name} ${p.short} ${p.brand} ${p.tags}`.toLowerCase().includes(S.q)));
        if (S.sort === 'asc') list = [...list].sort((a, b) => a.price - b.price);
        if (S.sort === 'desc') list = [...list].sort((a, b) => b.price - a.price);
        if (S.sort === 'new') list = [...list].sort((a, b) => b.id - a.id);
        grid.innerHTML = list.map((p, i) => productCard(p).replace('<article class="pcard"', `<article class="pcard" style="animation:popIn .6s var(--ease) ${Math.min(i, 12) * 45}ms both"`)).join('');
        $('[data-empty]', root).hidden = !!list.length;
        refresh(grid);
      };
      $('[data-q]', root).addEventListener('input', debounce((e) => { S.q = e.target.value.trim().toLowerCase(); render(); }, 200));
      $('[data-sort]', root).addEventListener('change', (e) => { S.sort = e.target.value; render(); });
      $('[data-cats]', root).addEventListener('click', (e) => {
        const b = e.target.closest('[data-c]');
        if (!b) return;
        S.cat = b.dataset.c;
        $$('[data-cats] .chip', root).forEach((x) => x.classList.toggle('active', x === b));
        history.replaceState({}, '', S.cat ? `/boutique?cat=${S.cat}` : '/boutique');
        render();
      });
      bindAdd(root, products);
      render();
    },
  };
}

/* =========================================================== FICHE PRODUIT */
export async function product({ params }) {
  const { product: p, related } = await api(`/api/products/${encodeURIComponent(params.slug)}`);
  const off = p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
  const out = p.stock !== null && p.stock <= 0;
  const stockTxt = p.stock === null ? 'En stock' : out ? 'Épuisé — disponible sur commande' : p.stock <= 5 ? `Plus que ${p.stock} en stock` : 'En stock';
  const s = state.settings;
  return {
    title: p.name,
    html: `<section class="product-page"><div class="container">
      <nav class="crumbs" data-reveal><a href="/">Accueil</a><span>/</span><a href="/boutique">Boutique</a><span>/</span><a href="/boutique?cat=${esc(p.category)}">${esc(PCATS[p.category] || p.category)}</a></nav>
      <div class="product" data-qty-scope>
        <div class="product__media" data-reveal="zoom"><div class="product__stage" data-tilt="6" style="--c:${esc(p.color)}">${productVisual(p, 'pv--xl')}<span class="product__halo"></span></div>
          ${off ? `<span class="badge badge--gold product__off">-${off}%</span>` : ''}</div>
        <div class="product__info">
          <span class="pcard__cat" data-reveal>${esc(PCATS[p.category] || '')}${p.brand ? ' · ' + esc(p.brand) : ''}</span>
          <h1 class="h1 h1--product" data-split>${esc(p.name)}</h1>
          <p class="lead" data-reveal data-delay="200">${esc(p.short || '')}</p>
          <div class="product__price" data-reveal data-delay="250"><strong>${money(p.price)}</strong>${off ? `<s>${money(p.compare_price)}</s>` : ''}</div>
          <p class="stock ${out ? 'stock--out' : p.stock !== null && p.stock <= 5 ? 'stock--low' : ''}" data-reveal data-delay="300"><span></span>${stockTxt}</p>
          <div class="product__buy" data-reveal data-delay="350">
            <div class="qty"><button type="button" data-qd="-1" aria-label="Moins">${icon('minus')}</button><span data-qty>1</span><button type="button" data-qd="1" aria-label="Plus">${icon('plus')}</button></div>
            <button class="btn btn-primary btn-lg" data-add="${p.id}" ${out ? 'disabled' : ''}>${icon('bag')} Ajouter au panier</button>
          </div>
          <a class="btn btn-ghost btn-block" data-reveal data-delay="400" target="_blank" rel="noopener" href="${waMain(`Bonjour, je souhaite commander « ${p.name} » (${money(p.price)}).`)}">${icon('whatsapp')} Commander directement sur WhatsApp</a>
          <div class="ptabs" data-reveal data-delay="450">
            <div class="seg seg--wide" data-ptabs><button class="active" data-t="desc">Description</button>${p.usage ? '<button data-t="usage">Utilisation</button>' : ''}<button data-t="ship">Livraison</button><span class="seg__ink"></span></div>
            <div class="ptab" data-p="desc"><div class="prose">${md(p.description || p.short || '')}</div></div>
            ${p.usage ? `<div class="ptab" data-p="usage" hidden><div class="prose">${md(p.usage)}</div></div>` : ''}
            <div class="ptab" data-p="ship" hidden><ul class="tips"><li>${icon('truck')}<span>Livraison à domicile : ${money(s.delivery_fee)}${s.free_delivery_from ? `, offerte dès ${money(s.free_delivery_from)}` : ''}.</span></li><li>${icon('store')}<span>Retrait gratuit à l’institut.</span></li><li>${icon('wallet')}<span>Paiement en espèces à la livraison ou par Mobile Money.</span></li></ul></div>
          </div>
        </div>
      </div>
    </div></section>
    ${related.length ? `<section class="section section--sand"><div class="container">${secHead({ eyebrow: 'Vous aimerez aussi', title: 'Dans la même <em>collection</em>' })}<div class="pgrid pgrid--4" data-stagger="80">${related.map(productCard).join('')}</div></div></section>` : ''}`,
    mount(root) {
      const q = $('[data-qty]', root);
      const max = p.stock === null ? 99 : Math.max(1, p.stock);
      $$('[data-qd]', root).forEach((b) => b.addEventListener('click', () => { q.textContent = Math.max(1, Math.min(max, +q.textContent + +b.dataset.qd)); }));
      bindAdd(root, [p, ...related]);
      const seg = $('[data-ptabs]', root);
      const ink = () => { const a = $('button.active', seg), i = $('.seg__ink', seg); i.style.width = a.offsetWidth + 'px'; i.style.transform = `translateX(${a.offsetLeft - 4}px)`; };
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('[data-t]');
        if (!b) return;
        $$('button', seg).forEach((x) => x.classList.toggle('active', x === b));
        $$('.ptab', root).forEach((t) => { t.hidden = t.dataset.p !== b.dataset.t; if (!t.hidden) t.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' }); });
        ink();
      });
      requestAnimationFrame(ink);
    },
  };
}

/* ============================================================ COMMANDE */
export async function checkout() {
  const s = state.settings, c = me();
  return {
    title: 'Ma commande',
    html: `${pageHero({ eyebrow: 'Finaliser ma commande', title: 'Votre <em>panier</em>', crumbs: [['/boutique', 'Boutique'], [null, 'Panier']], cls: 'phero--sm' })}
    <section class="section section--tight"><div class="container" data-checkout></div></section>`,
    mount(root) {
      const box = $('[data-checkout]', root);
      const S = { delivery: 'livraison', payment: 'cash', promo: null, discount: 0 };
      const totals = () => {
        const sub = cart.total(), after = Math.max(0, sub - S.discount);
        const fee = S.delivery === 'livraison' ? (s.free_delivery_from && after >= s.free_delivery_from ? 0 : +s.delivery_fee || 0) : 0;
        return { sub, fee, total: after + fee };
      };
      const renderSummary = () => {
        const t = totals();
        $('[data-sum-lines]', box).innerHTML = `<div class="row-between"><span>Sous-total</span><span>${money(t.sub)}</span></div>
          ${S.discount ? `<div class="row-between ok"><span>Code ${esc(S.promo)}</span><span>− ${money(S.discount)}</span></div>` : ''}
          <div class="row-between"><span>Livraison</span><span>${S.delivery === 'retrait' ? 'Retrait gratuit' : t.fee ? money(t.fee) : '<span class="ok">Offerte</span>'}</span></div>
          ${S.delivery === 'livraison' && t.fee && s.free_delivery_from ? `<div class="free-bar"><span style="width:${Math.min(100, (t.sub / s.free_delivery_from) * 100)}%"></span></div><p class="small muted">Plus que ${money(s.free_delivery_from - t.sub + S.discount)} pour la livraison offerte</p>` : ''}
          <div class="row-between total"><span>Total</span><strong>${money(t.total)}</strong></div>`;
        const m = $('[data-momo-amount]', box);
        if (m) m.textContent = money(t.total);
      };
      const render = () => {
        if (!cart.items.length) {
          box.innerHTML = empty('Votre panier est vide pour le moment.', 'bag', '<a href="/boutique" class="btn btn-primary">Découvrir la boutique</a>');
          return refresh(box);
        }
        box.innerHTML = `<form class="checkout" data-form novalidate>
          <div class="checkout__main">
            <div class="card"><h3 class="h3">${icon('bag')} Articles</h3>
              <div class="lines">${cart.items.map((i) => `<div class="line" data-id="${i.id}">${productVisual(i, 'line__v')}<div class="line__info"><a href="/boutique/${esc(i.slug)}">${esc(i.name)}</a><small>${money(i.price)}</small></div>
                <div class="qty qty--sm"><button type="button" data-dec aria-label="Moins">${icon('minus')}</button><span>${i.qty}</span><button type="button" data-inc aria-label="Plus">${icon('plus')}</button></div>
                <strong class="line__total">${money(i.price * i.qty)}</strong><button type="button" class="icon-btn" data-del aria-label="Retirer">${icon('trash')}</button></div>`).join('')}</div></div>
            <div class="card"><h3 class="h3">${icon('user')} Vos coordonnées</h3>
              <div class="grid-2"><label class="field"><input name="name" required placeholder=" " value="${esc(c.name || '')}" autocomplete="name"><span>Nom complet</span></label>
              <label class="field"><input name="phone" type="tel" required placeholder=" " value="${esc(c.phone || '')}" autocomplete="tel"><span>Téléphone (WhatsApp)</span></label></div>
              <label class="field"><input name="email" type="email" placeholder=" " value="${esc(c.email || '')}" autocomplete="email"><span>E-mail (facultatif)</span></label></div>
            <div class="card"><h3 class="h3">${icon('truck')} Livraison</h3>
              <div class="radio-cards">
                <label class="rc"><input type="radio" name="delivery" value="livraison" ${S.delivery === 'livraison' ? 'checked' : ''}><span>${icon('truck')}<strong>Livraison à domicile</strong><small>${money(s.delivery_fee)}${s.free_delivery_from ? ` · offerte dès ${money(s.free_delivery_from)}` : ''}</small></span></label>
                <label class="rc"><input type="radio" name="delivery" value="retrait" ${S.delivery === 'retrait' ? 'checked' : ''}><span>${icon('store')}<strong>Retrait à l’institut</strong><small>Gratuit · prêt sous 24 h</small></span></label>
              </div>
              <div data-addr ${S.delivery === 'livraison' ? '' : 'hidden'} class="grid-2 mt">
                <label class="field"><input name="address" placeholder=" " autocomplete="street-address"><span>Adresse / quartier / repère</span></label>
                <label class="field"><input name="city" placeholder=" " autocomplete="address-level2"><span>Ville</span></label></div></div>
            <div class="card"><h3 class="h3">${icon('wallet')} Paiement</h3>
              <div class="radio-cards">
                <label class="rc"><input type="radio" name="payment" value="cash" ${S.payment === 'cash' ? 'checked' : ''}><span>${icon('wallet')}<strong>À la livraison / au retrait</strong><small>Espèces ou Mobile Money</small></span></label>
                <label class="rc"><input type="radio" name="payment" value="momo" ${S.payment === 'momo' ? 'checked' : ''}><span>${icon('smartphone')}<strong>Mobile Money maintenant</strong><small>Traitement prioritaire</small></span></label>
              </div>
              <div data-momo ${S.payment === 'momo' ? '' : 'hidden'} class="mt">${momoBlock(0)}<p class="momo__amount">À envoyer : <strong data-momo-amount></strong></p>
                <label class="field"><input name="payment_ref" placeholder=" "><span>Référence (ID) de la transaction</span></label></div>
              <label class="field mt"><textarea name="notes" rows="2" placeholder=" "></textarea><span>Instructions (heure de livraison, message cadeau…)</span></label></div>
          </div>
          <aside class="checkout__side"><div class="card sum">
            <h3 class="h3">Récapitulatif</h3>
            <div class="promo"><input name="promo_input" placeholder="Code promo" aria-label="Code promo" value="${esc(S.promo || '')}"><button type="button" class="btn btn-ghost btn-sm" data-promo>Appliquer</button></div>
            <div data-sum-lines></div>
            <button class="btn btn-primary btn-lg btn-block">${icon('check')} Valider ma commande</button>
            <p class="small muted center">${icon('shield')} Aucun paiement en ligne de carte bancaire : vos données restent protégées.</p>
          </div></aside>
        </form>`;
        renderSummary();
        refresh(box);
      };
      box.addEventListener('click', async (e) => {
        const line = e.target.closest('.line');
        if (line) {
          const id = +line.dataset.id, it = cart.items.find((i) => i.id === id);
          if (e.target.closest('[data-inc]')) cart.set(id, it.qty + 1);
          if (e.target.closest('[data-dec]')) cart.set(id, it.qty - 1);
          if (e.target.closest('[data-del]')) cart.remove(id);
          return;
        }
        if (e.target.closest('[data-promo]')) {
          const code = $('[name=promo_input]', box).value.trim();
          if (!code) return;
          await busy(e.target.closest('button'), async () => {
            try { const r = await api('/api/promo', { method: 'POST', body: { code, subtotal: cart.total() } }); S.promo = r.code; S.discount = r.discount; toast(`Code ${r.code} appliqué : − ${money(r.discount)}`); renderSummary(); }
            catch (err) { S.promo = null; S.discount = 0; renderSummary(); toast(err.message, 'err'); }
          });
        }
      });
      box.addEventListener('change', (e) => {
        if (e.target.name === 'delivery') { S.delivery = e.target.value; $('[data-addr]', box).hidden = S.delivery !== 'livraison'; renderSummary(); }
        if (e.target.name === 'payment') { S.payment = e.target.value; $('[data-momo]', box).hidden = S.payment !== 'momo'; renderSummary(); }
      });
      box.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Numéro copié')); });
      box.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target, d = formData(f);
        if (!d.name || !d.phone) return toast('Indiquez votre nom et votre téléphone.', 'err');
        if (S.delivery === 'livraison' && !d.address) return toast('Indiquez votre adresse de livraison.', 'err');
        if (S.payment === 'momo' && !d.payment_ref) return toast('Indiquez la référence de votre transaction Mobile Money.', 'err');
        await busy(f.querySelector('.btn-primary.btn-lg'), async () => {
          try {
            if (S.promo) { const r = await api('/api/promo', { method: 'POST', body: { code: S.promo, subtotal: cart.total() } }).catch(() => null); if (!r) { S.promo = null; S.discount = 0; } }
            const items = cart.items.map((i) => ({ id: i.id, qty: i.qty }));
            const lines = cart.items.map((i) => `• ${i.qty} × ${i.name}`).join('\n');
            const r = await api('/api/orders', { method: 'POST', body: { items, name: d.name, phone: d.phone, email: d.email, delivery: S.delivery, address: d.address, city: d.city, payment: S.payment, payment_ref: d.payment_ref, notes: d.notes, promo: S.promo } });
            try { localStorage.setItem('institut.contact', JSON.stringify({ name: d.name, phone: d.phone, email: d.email })); } catch { /* ignore */ }
            cart.clear();
            box.innerHTML = `<div class="success card success--page">${successCheck()}<h2 class="h2">Merci ${esc(d.name.split(' ')[0])}, commande reçue !</h2>
              <p>Référence <strong class="ref">${esc(r.ref)}</strong> · Total <strong>${money(r.total)}</strong></p>
              <p class="muted">${S.delivery === 'livraison' ? 'Nous vous appelons pour convenir de la livraison.' : 'Nous vous prévenons dès que votre commande est prête à l’institut.'}</p>
              <div class="row-wrap center"><a class="btn btn-gold" target="_blank" rel="noopener" href="${waMain(`Bonjour, je viens de passer la commande ${r.ref} (${money(r.total)}) :\n${lines}\nMerci !`)}">${icon('whatsapp')} Envoyer sur WhatsApp</a>
              <a class="btn btn-ghost" href="/suivi?ref=${encodeURIComponent(r.ref)}">${icon('eye')} Suivre ma commande</a><a class="btn btn-ghost" href="/boutique">Continuer mes achats</a></div></div>`;
            confetti($('.success__check', box));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err) { toast(err.message, 'err'); }
        });
      });
      const off = on('cart', () => { if ($('[data-form]', box)) { const keep = formData($('[data-form]', box)); render(); const f = $('[data-form]', box); if (f) for (const [k, v] of Object.entries(keep)) if (f[k] && f[k].type !== 'radio' && typeof v === 'string') f[k].value = v; } });
      this.unmount = off;
      render();
    },
  };
}

/* ============================================================ SUR-MESURE */
const CUSTOM_FIELDS = {
  coffret: [
    ['Occasion', 'select', ['Anniversaire', 'Fête des mères', 'Mariage / dot', 'Saint-Valentin', 'Naissance', 'Remerciement', 'Autre']],
    ['Pour qui ?', 'text', 'Ex. ma mère, une amie, une collègue…'],
    ['Produits souhaités', 'multi', ['Sérum visage', 'Crème hydratante', 'Huile corps', 'Beurre de karité', 'Gommage', 'Rouge à lèvres', 'Palette maquillage', 'Foulard', 'Bon pour un soin']],
    ['Emballage', 'select', ['Classique élégant', 'Luxe (boîte rigide + ruban)', 'Éco-responsable']],
    ['Message sur la carte', 'textarea', 'Votre petit mot…'],
  ],
  soin: [
    ['Type de peau', 'select', ['Je ne sais pas', 'Grasse', 'Mixte', 'Sèche', 'Normale', 'Sensible']],
    ['Préoccupations', 'multi', ['Taches', 'Acné / boutons', 'Rides', 'Sécheresse', 'Manque d’éclat', 'Sensibilité', 'Vergetures']],
    ['Ce que vous souhaitez', 'select', ['Une routine complète', 'Un sérum', 'Une crème', 'Une huile', 'Un gommage', 'Un programme de soins en institut']],
    ['Allergies ou produits à éviter', 'text', 'Ex. parfum, huiles essentielles…'],
  ],
  foulard: [
    ['Événement', 'select', ['Mariage', 'Dot', 'Baptême', 'Anniversaire', 'Fête religieuse', 'Shooting photo', 'Autre']],
    ['Nombre de personnes', 'number', '1'],
    ['Tissus', 'select', ['J’ai déjà mes tissus', 'Je souhaite que vous les fournissiez']],
    ['Couleurs / tenue', 'text', 'Ex. or et bordeaux, wax bleu…'],
    ['Lieu', 'select', ['À l’institut', 'À domicile / sur le lieu de l’événement']],
  ],
  makeup: [
    ['Événement', 'select', ['Mariage', 'Dot', 'Soirée', 'Shooting photo', 'Anniversaire', 'Autre']],
    ['Nombre de personnes', 'number', '1'],
    ['Style souhaité', 'select', ['Naturel lumineux', 'Glamour', 'Mariée', 'Artistique / shooting']],
    ['Essai préalable', 'select', ['Oui, je souhaite un essai', 'Non merci']],
    ['Lieu et heure', 'text', 'Ex. Cotonou, samedi 8 h'],
  ],
  bon: [
    ['Montant du bon', 'select', ['10 000 FCFA', '20 000 FCFA', '30 000 FCFA', '50 000 FCFA', '75 000 FCFA', 'Autre montant']],
    ['Bénéficiaire', 'text', 'Prénom de la personne'],
    ['Prestation offerte (facultatif)', 'text', 'Ex. soin éclat + manucure'],
    ['Remise du bon', 'select', ['Envoi par WhatsApp', 'Retrait à l’institut', 'Livraison en coffret']],
    ['Message', 'textarea', 'Votre message pour le bénéficiaire'],
  ],
  autre: [['Décrivez votre projet', 'textarea', 'Atelier privé, événement, partenariat, demande spéciale…']],
};

export async function custom({ query }) {
  const c = me();
  const type = CUSTOM_TYPES[query.type] ? query.type : null;
  return {
    title: 'Commande sur-mesure',
    html: `${pageHero({ eyebrow: 'Commande personnalisée', title: 'Imaginez, <em>nous créons</em>', sub: 'Coffret cadeau, routine de soin, attache foulard ou maquillage pour un événement, bon cadeau : décrivez votre envie, nous vous envoyons un devis personnalisé.', crumbs: [[null, 'Sur-mesure']] })}
    <section class="section section--tight"><div class="container narrow">
      <div class="card custom" data-reveal>
        <h3 class="pane__title">1. Que souhaitez-vous ?</h3>
        <div class="types">${Object.entries(CUSTOM_TYPES).map(([k, [l, i]]) => `<button type="button" class="type ${k === type ? 'sel' : ''}" data-type="${k}"><span class="type__ic">${icon(i)}</span><span>${l}</span></button>`).join('')}</div>
        <form class="stack" data-custom ${type ? '' : 'hidden'}>
          <h3 class="pane__title">2. Les détails</h3>
          <div data-fields class="stack"></div>
          <div class="grid-2">
            <label class="field field--select"><select name="budget"><option>Moins de 15 000 FCFA</option><option>15 000 – 30 000 FCFA</option><option selected>30 000 – 60 000 FCFA</option><option>60 000 – 100 000 FCFA</option><option>Plus de 100 000 FCFA</option><option>À définir ensemble</option></select><span>Budget indicatif</span></label>
            <label class="field"><input type="date" name="wanted_date" placeholder=" "><span>Pour quand ?</span></label>
          </div>
          <div class="upload" data-upload><input type="file" accept="image/*" id="cu-img" hidden>
            <label for="cu-img" class="upload__zone">${icon('image')}<span><strong>Ajouter une photo d’inspiration</strong><small>Tenue, tissu, look souhaité… (facultatif)</small></span></label>
            <div class="upload__preview" hidden><img alt="Aperçu"><button type="button" class="icon-btn" data-rm aria-label="Retirer">${icon('x')}</button></div></div>
          <h3 class="pane__title">3. Vos coordonnées</h3>
          <div class="grid-2"><label class="field"><input name="name" required placeholder=" " value="${esc(c.name || '')}"><span>Nom complet</span></label>
          <label class="field"><input name="phone" type="tel" required placeholder=" " value="${esc(c.phone || '')}"><span>Téléphone (WhatsApp)</span></label></div>
          <label class="field"><input name="email" type="email" placeholder=" " value="${esc(c.email || '')}"><span>E-mail (facultatif)</span></label>
          <button class="btn btn-primary btn-lg btn-block">${icon('send')} Recevoir mon devis personnalisé</button>
          <p class="small muted center">Réponse sous 24 h ouvrées par téléphone ou WhatsApp. Sans engagement.</p>
        </form>
        <div data-done></div>
      </div>
    </div></section>`,
    mount(root) {
      let current = type, image = null;
      const form = $('[data-custom]', root);
      const renderFields = () => {
        $('[data-fields]', root).innerHTML = (CUSTOM_FIELDS[current] || []).map(([label, kind, opt], i) => {
          const name = `f${i}`;
          if (kind === 'select') return `<label class="field field--select"><select name="${name}" data-label="${esc(label)}">${opt.map((o) => `<option>${esc(o)}</option>`).join('')}</select><span>${esc(label)}</span></label>`;
          if (kind === 'multi') return `<fieldset class="multi" data-label="${esc(label)}"><legend>${esc(label)}</legend><div class="chips">${opt.map((o) => `<label class="chip chip--check"><input type="checkbox" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
          if (kind === 'textarea') return `<label class="field"><textarea name="${name}" rows="3" placeholder=" " data-label="${esc(label)}" ${current === 'autre' ? 'required' : ''}></textarea><span>${esc(label)} <small>${esc(opt)}</small></span></label>`;
          return `<label class="field"><input name="${name}" type="${kind === 'number' ? 'number' : 'text'}" ${kind === 'number' ? 'min="1" value="1"' : ''} placeholder=" " data-label="${esc(label)}"><span>${esc(label)}${kind === 'text' ? ` <small>${esc(opt)}</small>` : ''}</span></label>`;
        }).join('');
        $$('[data-fields] > *', root).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 450, delay: i * 60, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      };
      $('.types', root).addEventListener('click', (e) => {
        const b = e.target.closest('[data-type]');
        if (!b) return;
        current = b.dataset.type;
        $$('.type', root).forEach((x) => x.classList.toggle('sel', x === b));
        form.hidden = false;
        renderFields();
        history.replaceState({}, '', `/sur-mesure?type=${current}`);
      });
      if (current) renderFields();
      const file = $('#cu-img', root), pv = $('.upload__preview', root);
      file.addEventListener('change', async () => {
        const f = file.files[0];
        if (!f) return;
        try { image = await imageToDataUrl(f); $('img', pv).src = image; pv.hidden = false; $('.upload__zone', root).hidden = true; }
        catch (err) { toast(err.message, 'err'); }
      });
      $('[data-rm]', root).addEventListener('click', () => { image = null; file.value = ''; pv.hidden = true; $('.upload__zone', root).hidden = false; });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = formData(form);
        const details = {};
        $$('[data-fields] [data-label]', root).forEach((el) => {
          const label = el.dataset.label;
          if (el.tagName === 'FIELDSET') details[label] = $$('input:checked', el).map((x) => x.value);
          else details[label] = el.value;
        });
        await busy(form.querySelector('.btn-primary'), async () => {
          try {
            const r = await api('/api/custom-orders', { method: 'POST', body: { type: current, details, budget: d.budget, wanted_date: d.wanted_date, name: d.name, phone: d.phone, email: d.email, image } });
            try { localStorage.setItem('institut.contact', JSON.stringify({ name: d.name, phone: d.phone, email: d.email })); } catch { /* ignore */ }
            form.hidden = true;
            $('.types', root).hidden = true;
            $('.custom > .pane__title', root).hidden = true;
            $('[data-done]', root).innerHTML = `<div class="success">${successCheck()}<h3>Demande envoyée !</h3><p>Référence <strong class="ref">${esc(r.ref)}</strong></p>
              <p class="muted">Nous étudions votre projet et revenons vers vous avec un devis sous 24 h ouvrées.</p>
              <div class="row-wrap center"><a class="btn btn-gold" target="_blank" rel="noopener" href="${waMain(`Bonjour, je viens d’envoyer une demande sur-mesure (réf. ${r.ref}) : ${CUSTOM_TYPES[current][0]}.`)}">${icon('whatsapp')} Compléter sur WhatsApp</a><a href="/suivi?ref=${encodeURIComponent(r.ref)}" class="btn btn-ghost">Suivre ma demande</a></div></div>`;
            confetti($('.success__check', root));
          } catch (err) { toast(err.message, 'err'); }
        });
      });
    },
  };
}

/* ================================================================== SUIVI */
const FLOWS = {
  bookings: ['pending', 'confirmed', 'done'],
  orders: ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'],
  custom_orders: ['new', 'quoted', 'accepted', 'in_progress', 'done'],
  registrations: ['pending', 'confirmed', 'attended'],
};
const KIND_LABEL = { bookings: 'Rendez-vous', orders: 'Commande boutique', custom_orders: 'Demande sur-mesure', registrations: 'Inscription atelier' };

export async function track({ query }) {
  const c = me();
  return {
    title: 'Suivre ma demande',
    html: `${pageHero({ eyebrow: 'Suivi en temps réel', title: 'Où en est <em>ma demande</em> ?', sub: 'Rendez-vous, commande, sur-mesure ou atelier : saisissez votre référence et votre numéro de téléphone.', crumbs: [[null, 'Suivi']], cls: 'phero--sm' })}
    <section class="section section--tight"><div class="container narrow">
      <form class="card track" data-track data-reveal>
        <div class="grid-2"><label class="field"><input name="ref" required placeholder=" " value="${esc(query.ref || '')}" style="text-transform:uppercase"><span>Référence (ex. CMD-AB12CD)</span></label>
        <label class="field"><input name="phone" type="tel" required placeholder=" " value="${esc(c.phone || '')}"><span>Téléphone utilisé</span></label></div>
        <button class="btn btn-primary btn-block">${icon('search')} Rechercher</button>
      </form>
      <div data-result></div>
    </div></section>`,
    mount(root) {
      const f = $('[data-track]', root);
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = formData(f);
        await busy(f.querySelector('button'), async () => {
          try {
            const r = await api(`/api/track?ref=${encodeURIComponent(d.ref)}&phone=${encodeURIComponent(d.phone)}`);
            const flow = FLOWS[r.kind];
            const cancelled = ['cancelled', 'rejected', 'noshow'].includes(r.status);
            const idx = flow.indexOf(r.status);
            $('[data-result]', root).innerHTML = `<div class="card track-res">
              <div class="row-between"><div><small class="muted">${KIND_LABEL[r.kind]}</small><h3 class="h3">${esc(r.ref)}</h3></div>${statusPill(r.kind, r.status)}</div>
              ${cancelled ? '<p class="muted">Cette demande a été annulée. Contactez-nous pour toute question.</p>' : `<ol class="progress">${flow.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'cur' : ''}" style="--i:${i}"><span>${i <= idx ? icon('check') : i + 1}</span><em>${STATUS[r.kind][s][0]}</em></li>`).join('')}</ol>`}
              <div class="recap">
                ${r.service ? `<div>${icon('sparkle')} ${esc(r.service)}</div>` : ''}${r.event ? `<div>${icon('ticket')} ${esc(r.event)} · ${r.seats} place(s)</div>` : ''}
                ${r.date ? `<div>${icon('calendar')} ${cap(fdate(r.date))}${r.time ? ' à ' + r.time.replace(':', 'h') : ''}</div>` : ''}
                ${r.items ? r.items.map((i) => `<div>${icon('bag')} ${i.qty} × ${esc(i.name)}</div>`).join('') : ''}
                ${r.total != null ? `<div>${icon('wallet')} Total ${money(r.total)}</div>` : ''}
                ${r.quote ? `<div>${icon('wallet')} Devis : <strong>${money(r.quote)}</strong></div>` : ''}
                ${r.admin_note ? `<div>${icon('chat')} ${esc(r.admin_note)}</div>` : ''}
                <div>${icon('clock')} Demande du ${fdatetime(r.created_at)}</div>
              </div>
              <a class="btn btn-gold" target="_blank" rel="noopener" href="${waMain(`Bonjour, je souhaite des nouvelles de ma demande ${r.ref}.`)}">${icon('whatsapp')} Une question sur cette demande ?</a></div>`;
            refresh($('[data-result]', root));
          } catch (err) { $('[data-result]', root).innerHTML = `<div class="card track-res center"><p>${icon('info')} ${esc(err.message)}</p></div>`; }
        });
      });
      if (query.ref && c.phone) f.requestSubmit();
    },
  };
}
