'use client';
/* Boutique, fiche produit, commande, sur-mesure, suivi. */
import { useEffect, useRef, useState } from 'react';
import { api, cap, cart, CUSTOM_TYPES, cx, discount, fdate, fdatetime, hasBulk, imageToDataUrl, money, PCATS, saveContact, settings, STATUS, toast, unitPrice, useCart, waMain, whatsappRelay } from '@/lib/core';
import {
  addToCart, Area, Btn, Empty, Icon, Input, Md, MomoBlock, PageHero, Pill, ProductCard, ProductVisual, Qty, RadioCard, SecHead, Seg, Select, Split, SuccessCheck, pop, useContact, useSubmit,
} from '../ui';

/* ================================================================ BOUTIQUE */
export function Shop({ products, cat: cat0 }) {
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const [q, setQ] = useState(''), [cat, setCat] = useState(cats.includes(cat0) ? cat0 : ''), [sort, setSort] = useState('');
  const s = settings();
  let list = products.filter((p) => (!cat || p.category === cat) && (!q || `${p.name} ${p.short} ${p.brand} ${p.tags}`.toLowerCase().includes(q)));
  if (sort) list = [...list].sort({ asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, new: (a, b) => b.id - a.id }[sort]);
  const choose = (c) => { setCat(c); history.replaceState(null, '', c ? `/boutique?cat=${c}` : '/boutique'); };
  return <>
    <PageHero video="boutique" eyebrow={`La gamme ${s.site_name}`} title="La boutique *beauté*" sub="Huiles, laits, crèmes et savons formulés pour sublimer toutes les peaux. Livraison à domicile ou retrait gratuit sur place, paiement à la livraison ou par Mobile Money." crumbs={[[null, 'Boutique']]} />
    <section className="section section--tight"><div className="container">
      <div className="toolbar" data-reveal>
        <label className="search"><Icon n="search" /><input type="search" placeholder="Rechercher un produit…" aria-label="Rechercher" onChange={(e) => setQ(e.target.value.trim().toLowerCase())} /></label>
        <div className="chips">{['', ...cats].map((c) => <button key={c} className={cx('chip', c === cat && 'active')} onClick={() => choose(c)}>{c ? PCATS[c] || c : 'Tout'}</button>)}</div>
        <Select className="field field--select field--inline" aria-label="Trier" value={sort} onChange={(e) => setSort(e.target.value)} options={[['', 'Pertinence'], ['asc', 'Prix croissant'], ['desc', 'Prix décroissant'], ['new', 'Nouveautés']]} />
      </div>
      <div className="pgrid">{list.map((p, i) => <ProductCard key={`${cat}|${q}|${sort}|${p.id}`} p={p} style={pop(i, 45, 12)} />)}</div>
      {!list.length && <Empty text="Aucun produit ne correspond à votre recherche." icon="search" />}
      <div className="perks" data-stagger="100">
        <div><Icon n="truck" /><strong>Livraison rapide</strong><span>Offerte dès {money(s.free_delivery_from)}</span></div>
        <div><Icon n="wallet" /><strong>Paiement flexible</strong><span>À la livraison ou Mobile Money</span></div>
        <div><Icon n="leaf" /><strong>Formules SEM</strong><span>Pensées pour toutes les peaux</span></div>
        <div><Icon n="gift" /><strong>Coffrets sur-mesure</strong><span><a href="/sur-mesure">Composez le vôtre</a></span></div>
      </div>
    </div></section>
  </>;
}

/* =========================================================== FICHE PRODUIT */
export function Product({ product: p, related }) {
  const s = settings();
  const off = discount(p), out = p.stock !== null && p.stock <= 0, max = p.stock === null ? 99 : Math.max(1, p.stock);
  const [qty, setQty] = useState(1), [tab, setTab] = useState('desc');
  const stockTxt = p.stock === null ? 'En stock' : out ? 'Épuisé, disponible sur commande' : p.stock <= 5 ? `Plus que ${p.stock} en stock` : 'En stock';
  const tabs = [['desc', 'Description'], p.usage && ['usage', 'Utilisation'], ['ship', 'Livraison']].filter(Boolean);
  return <>
    <section className="product-page"><div className="container">
      <nav className="crumbs" data-reveal><a href="/">Accueil</a><span>/</span><a href="/boutique">Boutique</a><span>/</span><a href={`/boutique?cat=${p.category}`}>{PCATS[p.category] || p.category}</a></nav>
      <div className="product">
        <div className="product__media" data-reveal="zoom"><div className="product__stage" style={{ '--c': p.color }}><ProductVisual p={p} className="pv--xl" /></div>
          {off > 0 && <span className="badge badge--gold product__off">-{off}%</span>}</div>
        <div className="product__info">
          <span className="pcard__cat" data-reveal>{PCATS[p.category]}{p.brand && ` · ${p.brand}`}</span>
          <Split as="h1" className="h1 h1--product" text={p.name} />
          <p className="lead" data-reveal data-delay="200">{p.short}</p>
          <div className="product__price" data-reveal data-delay="250"><strong>{money(p.price)}</strong>{off > 0 && <s>{money(p.compare_price)}</s>}</div>
          {hasBulk(p) && <p className={cx('bulk-offer', qty >= p.bulk_qty && 'on')} data-reveal data-delay="280">
            <Icon n="tag" /><span>À partir de {p.bulk_qty}, l’unité revient à <strong>{money(p.bulk_price)}</strong>
              {qty >= p.bulk_qty ? <> : vous économisez <strong>{money((p.price - p.bulk_price) * qty)}</strong> !</> : <> (soit {money(p.bulk_price * p.bulk_qty)} les {p.bulk_qty})</>}</span></p>}
          <p className={cx('stock', out ? 'stock--out' : p.stock !== null && p.stock <= 5 && 'stock--low')} data-reveal data-delay="300"><span />{stockTxt}</p>
          <div className="product__buy" data-reveal data-delay="350">
            <Qty value={qty} set={(n) => setQty(Math.max(1, Math.min(max, n)))} />
            <button className="btn btn-primary btn-lg" disabled={out} onClick={(e) => addToCart(p, qty, e.currentTarget)}><Icon n="bag" /> Ajouter au panier{qty > 1 && ` · ${money(unitPrice(p, qty) * qty)}`}</button>
          </div>
          <a className="btn btn-ghost btn-block" data-reveal data-delay="400" target="_blank" rel="noopener" href={waMain(`Bonjour, je souhaite commander ${qty} × « ${p.name} » (${money(unitPrice(p, qty) * qty)}).`)}><Icon n="whatsapp" /> Commander directement sur WhatsApp</a>
          <div className="ptabs" data-reveal data-delay="450">
            <Seg className="seg seg--wide" items={tabs} value={tab} onChange={setTab} />
            <div className="ptab" key={tab} style={{ animation: 'slideIn .45s var(--ease) both' }}>
              {tab === 'desc' && <Md src={p.description || p.short} />}
              {tab === 'usage' && <Md src={p.usage} />}
              {tab === 'ship' && <ul className="tips"><li><Icon n="truck" /><span>Livraison à domicile : {money(s.delivery_fee)}{s.free_delivery_from ? `, offerte dès ${money(s.free_delivery_from)}` : ''}.</span></li><li><Icon n="store" /><span>Retrait gratuit sur place.</span></li><li><Icon n="wallet" /><span>Paiement en espèces à la livraison ou par Mobile Money.</span></li></ul>}
            </div>
          </div>
        </div>
      </div>
    </div></section>
    {related.length > 0 && <section className="section section--sand"><div className="container"><SecHead eyebrow="Vous aimerez aussi" title="Dans la même *collection*" /><div className="pgrid pgrid--4" data-stagger="80">{related.map((x) => <ProductCard key={x.id} p={x} />)}</div></div></section>}
  </>;
}

/* ============================================================ COMMANDE */
export function Checkout() {
  const s = settings(), c = useContact(), items = useCart();
  const [delivery, setDelivery] = useState('livraison'), [payment, setPayment] = useState('cash'), [promo, setPromo] = useState(null), [done, setDone] = useState(null);
  const code = useRef(null);
  const sub = cart.total(items), after = Math.max(0, sub - (promo?.discount || 0));
  const fee = delivery === 'livraison' ? (s.free_delivery_from && after >= s.free_delivery_from ? 0 : +s.delivery_fee || 0) : 0;
  const total = after + fee;

  const applyPromo = async () => {
    const v = code.current.value.trim();
    if (!v) return;
    try { const r = await api('/api/promo', { method: 'POST', body: { code: v, subtotal: sub } }); setPromo(r); toast(`Code ${r.code} appliqué : − ${money(r.discount)}`); }
    catch (err) { setPromo(null); toast(err.message, 'err'); }
  };
  const [submit, busy] = useSubmit(async (d) => {
    if (!d.name || !d.phone) return toast('Indiquez votre nom et votre téléphone.', 'err');
    if (delivery === 'livraison' && !d.address) return toast('Indiquez votre adresse de livraison.', 'err');
    if (payment === 'momo' && !d.payment_ref) return toast('Indiquez la référence de votre transaction Mobile Money.', 'err');
    const wa = whatsappRelay();
    let r;
    try { r = await api('/api/orders', { method: 'POST', body: { items: items.map((i) => ({ id: i.id, qty: i.qty })), name: d.name, phone: d.phone, delivery, address: d.address, city: d.city, payment, payment_ref: d.payment_ref, notes: d.notes, promo: promo?.code } }); }
    catch (err) { wa.cancel(); throw err; }
    saveContact(d);
    const lines = items.map((i) => `• ${i.qty} × ${i.name} : ${money(unitPrice(i, i.qty) * i.qty)}`).join('\n');
    const url = wa.send(`Bonjour, je viens de passer la commande ${r.ref} :\n${lines}\nTotal : ${money(r.total)}\n${delivery === 'livraison' ? `Livraison : ${d.address}${d.city ? ', ' + d.city : ''}` : 'Retrait sur place'}\nPaiement : ${payment === 'momo' ? `Mobile Money (réf. ${d.payment_ref})` : 'à la livraison / au retrait'}\nNom : ${d.name} · ${d.phone}${d.notes ? `\nInstructions : ${d.notes}` : ''}`);
    setDone({ ...r, name: d.name, url });
    cart.clear();
   
    scrollTo({ top: 0, behavior: 'smooth' });
  });

  let body;
  if (done) body = (
    <div className="success card success--page"><SuccessCheck /><Split className="h2" text={`Merci ${done.name.split(' ')[0]}, commande reçue !`} />
      <p>Référence <strong className="ref">{done.ref}</strong> · Total <strong>{money(done.total)}</strong></p>
      <p className="wa-sent"><Icon n="whatsapp" /> WhatsApp s’est ouvert avec le détail de votre commande : appuyez sur <strong>Envoyer</strong> pour nous la transmettre.</p>
      <p className="muted">{delivery === 'livraison' ? 'Nous vous recontactons sur WhatsApp pour convenir de la livraison.' : 'Nous vous prévenons sur WhatsApp dès que votre commande est prête à être retirée.'}</p>
      <div className="row-wrap center"><a className="btn btn-wa" target="_blank" rel="noopener" href={done.url}><Icon n="whatsapp" /> Rouvrir WhatsApp</a>
        <a className="btn btn-ghost" href={`/suivi?ref=${encodeURIComponent(done.ref)}`}><Icon n="eye" /> Suivre ma commande</a><a className="btn btn-ghost" href="/boutique">Continuer mes achats</a></div></div>
  );
  else if (!items.length) body = <Empty text="Votre panier est vide pour le moment." icon="bag"><a href="/boutique" className="btn btn-primary">Découvrir la boutique</a></Empty>;
  else body = (
    <form className="checkout" onSubmit={submit} noValidate key={c.phone || 'x'}>
      <div className="checkout__main">
        <div className="card"><h3 className="h3"><Icon n="bag" /> Articles</h3>
          <div className="lines">{items.map((i) => (
            <div className="line" key={i.id}><ProductVisual p={i} className="line__v" /><div className="line__info"><a href={`/boutique/${i.slug}`}>{i.name}</a>
              <small>{unitPrice(i, i.qty) < i.price ? <><s>{money(i.price)}</s> <span className="ok">{money(unitPrice(i, i.qty))} l’unité</span></> : money(i.price)}</small>
              {hasBulk(i) && i.qty < i.bulk_qty && <small className="bulk-hint">Dès {i.bulk_qty} : {money(i.bulk_price)} l’unité</small>}</div>
              <Qty sm value={i.qty} set={(q) => cart.set(i.id, q)} />
              <strong className="line__total">{money(unitPrice(i, i.qty) * i.qty)}</strong><button type="button" className="icon-btn" onClick={() => cart.remove(i.id)} aria-label="Retirer"><Icon n="trash" /></button></div>))}</div></div>
        <div className="card"><h3 className="h3"><Icon n="user" /> Vos coordonnées</h3>
          <div className="grid-2"><Input label="Nom complet" name="name" required defaultValue={c.name} autoComplete="name" /><Input label="Téléphone (WhatsApp)" name="phone" type="tel" required defaultValue={c.phone} autoComplete="tel" /></div>
</div>
        <div className="card"><h3 className="h3"><Icon n="truck" /> Livraison</h3>
          <div className="radio-cards">
            <RadioCard name="delivery" value="livraison" cur={delivery} set={setDelivery} icon="truck" title="Livraison à domicile" sub={`${money(s.delivery_fee)}${s.free_delivery_from ? ` · offerte dès ${money(s.free_delivery_from)}` : ''}`} />
            <RadioCard name="delivery" value="retrait" cur={delivery} set={setDelivery} icon="store" title="Retrait sur place" sub="Gratuit · prêt sous 24 h" />
          </div>
          {delivery === 'livraison' && <div className="grid-2 mt"><Input label="Adresse / quartier / repère" name="address" autoComplete="street-address" /><Input label="Ville" name="city" autoComplete="address-level2" /></div>}</div>
        <div className="card"><h3 className="h3"><Icon n="wallet" /> Paiement</h3>
          <div className="radio-cards">
            <RadioCard name="payment" value="cash" cur={payment} set={setPayment} icon="wallet" title="À la livraison / au retrait" sub="Espèces ou Mobile Money" />
            <RadioCard name="payment" value="momo" cur={payment} set={setPayment} icon="smartphone" title="Mobile Money maintenant" sub="Traitement prioritaire" />
          </div>
          {payment === 'momo' && <div className="mt"><MomoBlock /><p className="momo__amount">À envoyer : <strong>{money(total)}</strong></p><Input label="Référence (ID) de la transaction" name="payment_ref" /></div>}
          <div className="mt"><Area label="Instructions (heure de livraison, message cadeau…)" name="notes" rows={2} /></div></div>
      </div>
      <aside className="checkout__side"><div className="card sum">
        <h3 className="h3">Récapitulatif</h3>
        <div className="promo"><input ref={code} placeholder="Code promo" aria-label="Code promo" defaultValue={promo?.code || ''} /><button type="button" className="btn btn-ghost btn-sm" onClick={applyPromo}>Appliquer</button></div>
        <div className="row-between"><span>Sous-total</span><span>{money(sub)}</span></div>
        {promo && <div className="row-between ok"><span>Code {promo.code}</span><span>− {money(promo.discount)}</span></div>}
        <div className="row-between"><span>Livraison</span><span>{delivery === 'retrait' ? 'Retrait gratuit' : fee ? money(fee) : <span className="ok">Offerte</span>}</span></div>
        {delivery === 'livraison' && fee > 0 && s.free_delivery_from > 0 && <><div className="free-bar"><span style={{ width: Math.min(100, (sub / s.free_delivery_from) * 100) + '%' }} /></div><p className="small muted">Plus que {money(s.free_delivery_from - after)} pour la livraison offerte</p></>}
        <div className="row-between total"><span>Total</span><strong>{money(total)}</strong></div>
        <Btn busy={busy} className="btn btn-wa btn-lg btn-block"><Icon n="whatsapp" /> Commander et envoyer sur WhatsApp</Btn>
        <p className="small muted center"><Icon n="shield" /> Aucun paiement en ligne de carte bancaire : vos données restent protégées.</p>
      </div></aside>
    </form>
  );
  return <>
    <PageHero eyebrow="Finaliser ma commande" title="Votre *panier*" crumbs={[['/boutique', 'Boutique'], [null, 'Panier']]} cls="phero--sm" />
    <section className="section section--tight"><div className="container">{body}</div></section>
  </>;
}

/* ============================================================ SUR-MESURE */
const FIELDS = {
  coffret: [['Occasion', 'select', ['Anniversaire', 'Fête des mères', 'Mariage / dot', 'Saint-Valentin', 'Naissance', 'Remerciement', 'Autre']], ['Pour qui ?', 'text', 'Ex. ma mère, une amie, une collègue…'],
    ['Produits souhaités', 'multi', ['Huile Oil Secret', 'Lait corporel Lucioles', 'Crème correctrice Ciole', 'Savon anti-transpiration', 'Gel intime Belle V', 'Foulard', 'Bon pour un soin']],
    ['Emballage', 'select', ['Classique élégant', 'Luxe (boîte rigide + ruban)', 'Éco-responsable']], ['Message sur la carte', 'textarea', 'Votre petit mot…']],
  soin: [['Type de peau', 'select', ['Je ne sais pas', 'Grasse', 'Mixte', 'Sèche', 'Normale', 'Sensible']], ['Préoccupations', 'multi', ['Taches', 'Acné / boutons', 'Rides', 'Sécheresse', 'Manque d’éclat', 'Sensibilité', 'Vergetures']],
    ['Ce que vous souhaitez', 'select', ['Une routine complète', 'Un sérum', 'Une crème', 'Une huile', 'Un gommage', 'Un programme de soins sur place']], ['Allergies ou produits à éviter', 'text', 'Ex. parfum, huiles essentielles…']],
  foulard: [['Événement', 'select', ['Mariage', 'Dot', 'Baptême', 'Anniversaire', 'Fête religieuse', 'Shooting photo', 'Autre']], ['Nombre de personnes', 'number', '1'],
    ['Tissus', 'select', ['J’ai déjà mes tissus', 'Je souhaite que vous les fournissiez']], ['Couleurs / tenue', 'text', 'Ex. or et bordeaux, wax bleu…'], ['Lieu', 'select', ['Sur place, chez SEM Cosmétique', 'À domicile / sur le lieu de l’événement']]],
  makeup: [['Événement', 'select', ['Mariage', 'Dot', 'Soirée', 'Shooting photo', 'Anniversaire', 'Autre']], ['Nombre de personnes', 'number', '1'],
    ['Style souhaité', 'select', ['Naturel lumineux', 'Glamour', 'Mariée', 'Artistique / shooting']], ['Essai préalable', 'select', ['Oui, je souhaite un essai', 'Non merci']], ['Lieu et heure', 'text', 'Ex. Cotonou, samedi 8 h']],
  bon: [['Montant du bon', 'select', ['10 000 FCFA', '20 000 FCFA', '30 000 FCFA', '50 000 FCFA', '75 000 FCFA', 'Autre montant']], ['Bénéficiaire', 'text', 'Prénom de la personne'],
    ['Prestation offerte (facultatif)', 'text', 'Ex. soin éclat + manucure'], ['Remise du bon', 'select', ['Envoi par WhatsApp', 'Retrait sur place', 'Livraison en coffret']], ['Message', 'textarea', 'Votre message pour le bénéficiaire']],
  autre: [['Décrivez votre projet', 'textarea', 'Atelier privé, événement, partenariat, demande spéciale…']],
};

function CustomField({ f: [label, kind, opt], name, required, i }) {
  const style = { animation: `slideIn .45s var(--ease) ${i * 60}ms both` };
  if (kind === 'select') return <div style={style}><Select label={label} name={name} options={opt} /></div>;
  if (kind === 'multi') return <fieldset className="multi" style={style}><legend>{label}</legend><div className="chips">{opt.map((o) => <label key={o} className="chip chip--check"><input type="checkbox" name={name} value={o} /><span>{o}</span></label>)}</div></fieldset>;
  if (kind === 'textarea') return <div style={style}><Area label={<>{label} <small>{opt}</small></>} name={name} rows={3} required={required} /></div>;
  return <div style={style}><Input label={<>{label}{kind === 'text' && <> <small>{opt}</small></>}</>} name={name} type={kind === 'number' ? 'number' : 'text'} {...(kind === 'number' && { min: 1, defaultValue: 1 })} /></div>;
}

export function Custom({ type: t0 }) {
  const c = useContact();
  const [type, setType] = useState(CUSTOM_TYPES[t0] ? t0 : null), [image, setImage] = useState(null), [done, setDone] = useState(null);
  const file = useRef(null);
  const choose = (k) => { setType(k); history.replaceState(null, '', `/sur-mesure?type=${k}`); };
  const [submit, busy] = useSubmit(async (d) => {
    const details = Object.fromEntries(FIELDS[type].map(([label, kind], i) => [label, d[`f${i}`] ?? (kind === 'multi' ? [] : '')]));
    const wa = whatsappRelay();
    let r;
    try { r = await api('/api/custom-orders', { method: 'POST', body: { type, details, budget: d.budget, wanted_date: d.wanted_date, name: d.name, phone: d.phone, image } }); }
    catch (err) { wa.cancel(); throw err; }
    saveContact(d);
    const lines = Object.entries(details).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]).filter(([, v]) => v).map(([k, v]) => `• ${k} : ${v}`).join('\n');
    setDone({ ...r, url: wa.send(`Bonjour, voici ma demande sur-mesure (réf. ${r.ref}) : ${CUSTOM_TYPES[type][0]}\n${lines}\n• Budget : ${d.budget}${d.wanted_date ? `\n• Pour le : ${fdate(d.wanted_date)}` : ''}${image ? '\n(J’ai ajouté une photo d’inspiration sur le site, je vous l’envoie ici aussi.)' : ''}\nNom : ${d.name} · ${d.phone}`) });
  });
  const pickImage = async () => {
    const f = file.current.files[0];
    if (!f) return;
    try { setImage(await imageToDataUrl(f)); } catch (err) { toast(err.message, 'err'); }
  };
  return <>
    <PageHero eyebrow="Commande personnalisée" title="Imaginez, *nous créons*" sub="Coffret cadeau, routine de soin, attache foulard ou maquillage pour un événement, bon cadeau : décrivez votre envie, nous vous envoyons un devis personnalisé." crumbs={[[null, 'Sur-mesure']]} />
    <section className="section section--tight"><div className="container narrow"><div className="card custom" data-reveal>
      {done ? <div className="success"><SuccessCheck /><h3>Demande envoyée !</h3><p>Référence <strong className="ref">{done.ref}</strong></p>
        <p className="wa-sent"><Icon n="whatsapp" /> WhatsApp s’est ouvert avec votre demande : appuyez sur <strong>Envoyer</strong> pour nous la transmettre.</p>
        <p className="muted">Nous étudions votre projet et revenons vers vous sur WhatsApp avec un devis sous 24 h ouvrées.</p>
        <div className="row-wrap center"><a className="btn btn-wa" target="_blank" rel="noopener" href={done.url}><Icon n="whatsapp" /> Rouvrir WhatsApp</a><a href={`/suivi?ref=${encodeURIComponent(done.ref)}`} className="btn btn-ghost">Suivre ma demande</a></div></div> : <>
        <h3 className="pane__title">1. Que souhaitez-vous ?</h3>
        <div className="types">{Object.entries(CUSTOM_TYPES).map(([k, [l, i]]) => <button type="button" key={k} className={cx('type', k === type && 'sel')} onClick={() => choose(k)}><span className="type__ic"><Icon n={i} /></span><span>{l}</span></button>)}</div>
        {type && <form className="stack" onSubmit={submit} key={type + (c.phone || '')}>
          <h3 className="pane__title">2. Les détails</h3>
          <div className="stack">{FIELDS[type].map((f, i) => <CustomField key={f[0]} f={f} i={i} name={`f${i}`} required={type === 'autre'} />)}</div>
          <div className="grid-2">
            <Select label="Budget indicatif" name="budget" defaultValue="30 000 à 60 000 FCFA" options={['Moins de 15 000 FCFA', '15 000 à 30 000 FCFA', '30 000 à 60 000 FCFA', '60 000 à 100 000 FCFA', 'Plus de 100 000 FCFA', 'À définir ensemble']} />
            <Input label="Pour quand ?" name="wanted_date" type="date" />
          </div>
          <div className="upload"><input type="file" accept="image/*" id="cu-img" hidden ref={file} onChange={pickImage} />
            {image ? <div className="upload__preview"><img src={image} alt="Aperçu" /><button type="button" className="icon-btn" aria-label="Retirer" onClick={() => { setImage(null); file.current.value = ''; }}><Icon n="x" /></button></div>
              : <label htmlFor="cu-img" className="upload__zone"><Icon n="image" /><span><strong>Ajouter une photo d’inspiration</strong><small>Tenue, tissu, look souhaité… (facultatif)</small></span></label>}</div>
          <h3 className="pane__title">3. Vos coordonnées</h3>
          <div className="grid-2"><Input label="Nom complet" name="name" required defaultValue={c.name} /><Input label="Téléphone (WhatsApp)" name="phone" type="tel" required defaultValue={c.phone} /></div>
          <Btn busy={busy} className="btn btn-wa btn-lg btn-block"><Icon n="whatsapp" /> Envoyer ma demande sur WhatsApp</Btn>
          <p className="small muted center">Réponse sous 24 h ouvrées par téléphone ou WhatsApp. Sans engagement.</p>
        </form>}
      </>}
    </div></div></section>
  </>;
}

/* ================================================================== SUIVI */
const FLOWS = {
  bookings: ['pending', 'confirmed', 'done'], orders: ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'],
  custom_orders: ['new', 'quoted', 'accepted', 'in_progress', 'done'], registrations: ['pending', 'confirmed', 'attended'],
};
const KIND = { bookings: 'Rendez-vous', orders: 'Commande boutique', custom_orders: 'Demande sur-mesure', registrations: 'Inscription atelier' };

export function Track({ ref0 }) {
  const c = useContact();
  const form = useRef(null), auto = useRef(false);
  const [r, setR] = useState(null);
  const [submit, busy] = useSubmit(async (d) => {
    try { setR(await api(`/api/track?ref=${encodeURIComponent(d.ref)}&phone=${encodeURIComponent(d.phone)}`)); }
    catch (err) { setR({ error: err.message }); }
  });
  useEffect(() => { if (ref0 && c.phone && !auto.current) { auto.current = true; setTimeout(() => form.current?.requestSubmit(), 0); } }, [ref0, c.phone]);
  const flow = r?.kind && FLOWS[r.kind], idx = flow ? flow.indexOf(r.status) : -1;
  return <>
    <PageHero eyebrow="Suivi en temps réel" title="Où en est *ma demande* ?" sub="Rendez-vous, commande, sur-mesure ou atelier : saisissez votre référence et votre numéro de téléphone." crumbs={[[null, 'Suivi']]} cls="phero--sm" />
    <section className="section section--tight"><div className="container narrow">
      <form className="card track" data-reveal onSubmit={submit} ref={form} key={c.phone || 'x'}>
        <div className="grid-2"><Input label="Référence (ex. CMD-AB12CD)" name="ref" required defaultValue={ref0} style={{ textTransform: 'uppercase' }} /><Input label="Téléphone utilisé" name="phone" type="tel" required defaultValue={c.phone} /></div>
        <Btn busy={busy} className="btn btn-primary btn-block"><Icon n="search" /> Rechercher</Btn>
      </form>
      {r?.error && <div className="card track-res center"><p><Icon n="info" /> {r.error}</p></div>}
      {r?.ref && <div className="card track-res" style={{ animation: 'slideIn .6s var(--ease) both' }}>
        <div className="row-between"><div><small className="muted">{KIND[r.kind]}</small><h3 className="h3">{r.ref}</h3></div><Pill kind={r.kind} s={r.status} /></div>
        {['cancelled', 'rejected', 'noshow'].includes(r.status) ? <p className="muted">Cette demande a été annulée. Contactez-nous pour toute question.</p>
          : <ol className="progress">{flow.map((st, i) => <li key={st} className={i < idx ? 'done' : i === idx ? 'cur' : undefined} style={{ '--i': i }}><span>{i <= idx ? <Icon n="check" /> : i + 1}</span><em>{STATUS[r.kind][st][0]}</em></li>)}</ol>}
        <div className="recap">
          {r.service && <div><Icon n="leaf" /> {r.service}</div>}{r.event && <div><Icon n="ticket" /> {r.event} · {r.seats} place(s)</div>}
          {r.date && <div><Icon n="calendar" /> {cap(fdate(r.date))}{r.time && ` à ${r.time.replace(':', 'h')}`}</div>}
          {r.items?.map((i) => <div key={i.name}><Icon n="bag" /> {i.qty} × {i.name}</div>)}
          {r.total != null && <div><Icon n="wallet" /> Total {money(r.total)}</div>}
          {r.quote && <div><Icon n="wallet" /> Devis : <strong>{money(r.quote)}</strong></div>}
          {r.admin_note && <div><Icon n="chat" /> {r.admin_note}</div>}
          <div><Icon n="clock" /> Demande du {fdatetime(r.created_at)}</div>
        </div>
        <a className="btn btn-gold" target="_blank" rel="noopener" href={waMain(`Bonjour, je souhaite des nouvelles de ma demande ${r.ref}.`)}><Icon n="whatsapp" /> Une question sur cette demande ?</a>
      </div>}
    </div></section>
  </>;
}
