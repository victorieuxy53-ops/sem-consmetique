'use client';
/* Administration : définition des ressources gérées + vue liste générique (recherche, statuts, CRUD, export). */
import { useEffect, useRef, useState } from 'react';
import { api, cap, CATS, CUSTOM_TYPES, cx, debounce, fdate, fdatetime, fdur, first, fshort, hm, money, num, openModal, PCATS, pct, settings, STATUS, toast, useStore, waHref } from '@/lib/core';
import { confirmBox, Icon, ProductVisual, Stars } from '../ui';
import { A, adm, changed, Contact, formModal, VideoUpload } from './kit';

const opts = () => adm.get().opts;
const statusOpts = (k) => Object.entries(STATUS[k]).map(([v, [l]]) => [v, l]);
const StatusSel = ({ kind, r }) => (
  <select key={r.status} className={`st-sel st-${STATUS[kind][r.status]?.[1] || 'info'}`} data-status={r.id} defaultValue={r.status} aria-label="Statut">
    {Object.entries(STATUS[kind]).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
);
const Who = ({ r, n = 'name', p = 'phone', e = 'email' }) => <><strong>{r[n] || 'Sans nom'}</strong><small>{r[p]}{r[e] && <>{r[p] && ' · '}{r[e]}</>}</small></>;
const Yes = ({ v, on = 'Oui', off = 'Non' }) => <span className={cx('pill', v && 'pill--ok')}>{v ? on : off}</span>;
const Thumb = ({ src }) => (src ? <img className="thumb" src={src} alt="" loading="lazy" /> : <span className="thumb thumb--empty"><Icon n="image" /></span>);
const Ref = ({ r, at }) => <><code>{r.ref}</code>{at && <small>{fdatetime(r.created_at)}</small>}</>;
const Btn = ({ act, icon, children, primary }) => <button className={cx('btn btn-xs', primary ? 'btn-primary' : 'btn-ghost')} data-act={act}>{icon && <Icon n={icon} />} {children}</button>;
const Kv = ({ rows }) => <div className="kv">{rows.filter(Boolean).map(([k, v, full]) => <div key={k} className={full ? 'full' : undefined}><span>{k}</span><strong className={full ? 'pre' : undefined}>{v || 'Non renseigné'}</strong></div>)}</div>;

const SVC = () => opts().services.map((s) => [s.id, `${s.name} · ${fdur(s.duration)} · ${money(s.price)}`]);
const COURSES = () => opts().courses.map((c) => [c.id, c.title]);
const USERS = () => opts().users.map((u) => [u.id, `${u.name} (${u.email})`]);
const CAT_OPTS = Object.entries(CATS).map(([k, v]) => [k, v.label]);
const ART_OPTS = [['serum', 'Flacon sérum'], ['jar', 'Pot de crème'], ['tube', 'Tube'], ['pump', 'Flacon pompe'], ['bottle', 'Bouteille'], ['oil', 'Huile'], ['soap', 'Savon'], ['lipstick', 'Rouge à lèvres'], ['palette', 'Palette'], ['scarf', 'Foulard'], ['box', 'Coffret']];
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux'].map((l) => [l, l]);
const addr = (r) => [r.address, r.city].filter(Boolean).join(', ');

export const bookingMsg = (r) => `Bonjour ${first(r.name)}, nous vous confirmons votre rendez-vous « ${r.service_name || 'prestation'} » le ${fdate(r.date)} à ${hm(r.time)} chez ${settings().site_name}. À très bientôt ! (Réf. ${r.ref})`;
const quoteMsg = (r) => `Bonjour ${first(r.name)}, voici notre proposition pour votre demande ${r.ref} (${CUSTOM_TYPES[r.type]?.[0] || ''}) : ${r.quote ? money(r.quote) : '…'}.${r.admin_note ? ' ' + r.admin_note : ''} Souhaitez-vous la valider ?`;

/* =================================================================== RESSOURCES */
export const R = {
  bookings: {
    title: 'Rendez-vous', status: 'bookings', create: 'Nouveau rendez-vous', search: true,
    cols: [
      ['Réf.', (r) => <Ref r={r} />],
      ['Date', (r) => <><strong>{cap(fdate(r.date, { weekday: 'short', day: 'numeric', month: 'short' }))}</strong><small>{hm(r.time)} · {fdur(r.duration)}</small></>],
      ['Cliente', (r) => <><Who r={r} />{r.source === 'admin' && <small className="tag">saisi par l’équipe</small>}</>],
      ['Prestation', (r) => <>{r.service_name || ''}{r.notes && <small className="note-s" title={r.notes}><Icon n="chat" /> {r.notes.slice(0, 50)}</small>}</>],
      ['Montant', (r) => money(r.price)],
      ['Statut', (r) => <StatusSel kind="bookings" r={r} />],
    ],
    actions: (r) => <Contact phone={r.phone} msg={bookingMsg(r)} />,
    form: () => [
      { k: 'service_id', l: 'Prestation', t: 'select', opts: SVC(), req: 1, full: 1 },
      { k: 'date', l: 'Date', t: 'date', req: 1 }, { k: 'time', l: 'Heure', t: 'time', req: 1 },
      { k: 'name', l: 'Nom de la cliente', req: 1 }, { k: 'phone', l: 'Téléphone', t: 'tel', req: 1 },
      { k: 'email', l: 'E-mail', t: 'email' }, { k: 'status', l: 'Statut', t: 'select', opts: statusOpts('bookings'), def: 'confirmed' },
      { k: 'price', l: 'Montant (FCFA)', t: 'number', help: 'Vide = tarif de la prestation' }, { k: 'duration', l: 'Durée (minutes)', t: 'number', help: 'Vide = durée de la prestation' },
      { k: 'notes', l: 'Notes', t: 'textarea', rows: 2, full: 1 },
    ],
  },
  orders: {
    title: 'Commandes', status: 'orders', search: true, noCreate: true,
    cols: [
      ['Réf.', (r) => <Ref r={r} at />], ['Cliente', (r) => <Who r={r} />],
      ['Articles', (r) => (r.items || []).map((i) => <div key={i.id}>{i.qty} × {i.name}</div>)],
      ['Total', (r) => <><strong>{money(r.total)}</strong>{r.discount > 0 && <small>Remise {money(r.discount)} · {r.promo}</small>}{r.delivery_fee > 0 && <small>dont livraison {money(r.delivery_fee)}</small>}</>],
      ['Paiement', (r) => (r.payment === 'momo' ? <><span className="pill pill--info">Mobile Money</span><small>Réf. {r.payment_ref || ''}</small></> : <span className="pill">À la livraison</span>)],
      ['Livraison', (r) => (r.delivery === 'livraison' ? <><span className="ic-line"><Icon n="truck" /> Livraison</span><small>{addr(r)}</small></> : <span className="ic-line"><Icon n="store" /> Retrait</span>)],
      ['Statut', (r) => <StatusSel kind="orders" r={r} />],
    ],
    actions: (r) => <Contact phone={r.phone} msg={`Bonjour ${first(r.name)}, merci pour votre commande ${r.ref} (${money(r.total)}) chez ${settings().site_name} ! ${r.delivery === 'livraison' ? 'Quand pouvons-nous vous livrer ?' : 'Elle sera prête à être retirée très bientôt.'}`} />,
    form: () => [{ k: 'status', l: 'Statut', t: 'select', opts: statusOpts('orders') }, { k: 'payment_ref', l: 'Référence de paiement' }, { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }],
    detail: (r) => <>
      <Kv rows={[['Cliente', r.name], ['Téléphone', r.phone], r.email && ['E-mail', r.email], ['Livraison', r.delivery === 'livraison' ? addr(r) : 'Retrait sur place'],
        ['Paiement', r.payment === 'momo' ? `Mobile Money · réf. ${r.payment_ref || ''}` : 'À la livraison / au retrait'], r.notes && ['Notes', r.notes, true]]} />
      <table className="mini"><tbody>{(r.items || []).map((i) => <tr key={i.id}><td>{i.qty} ×</td><td>{i.name}</td><td>{money(i.price * i.qty)}</td></tr>)}
        <tr><td /><td>Sous-total</td><td>{money(r.subtotal)}</td></tr>{r.discount > 0 && <tr><td /><td>Remise ({r.promo})</td><td>− {money(r.discount)}</td></tr>}
        <tr><td /><td>Livraison</td><td>{money(r.delivery_fee)}</td></tr><tr className="tot"><td /><td>Total</td><td>{money(r.total)}</td></tr></tbody></table>
    </>,
  },
  custom_orders: {
    title: 'Demandes sur-mesure', status: 'custom_orders', search: true, noCreate: true,
    cols: [
      ['Réf.', (r) => <Ref r={r} at />],
      ['Demande', (r) => <><span className="ic-line"><Icon n={CUSTOM_TYPES[r.type]?.[1]} /> {CUSTOM_TYPES[r.type]?.[0] || r.type}</span>{r.image && <small>Photo jointe</small>}</>],
      ['Cliente', (r) => <Who r={r} />],
      ['Budget', (r) => <>{r.budget || ''}{r.wanted_date && <small>Pour le {fshort(r.wanted_date)}</small>}</>],
      ['Devis', (r) => (r.quote ? <strong>{money(r.quote)}</strong> : <span className="muted">En attente</span>)],
      ['Statut', (r) => <StatusSel kind="custom_orders" r={r} />],
    ],
    actions: (r) => <><Btn act="open" icon="eye">Ouvrir</Btn><Contact phone={r.phone} msg={`Bonjour ${first(r.name)}, merci pour votre demande sur-mesure (${r.ref}).`} /></>,
    form: () => [
      { k: 'status', l: 'Statut', t: 'select', opts: statusOpts('custom_orders') }, { k: 'quote', l: 'Montant du devis (FCFA)', t: 'number' },
      { k: 'admin_note', l: 'Message pour la cliente (visible dans son suivi)', t: 'textarea', full: 1, rows: 3 },
    ],
    detail: (r, close) => {
      let det = {};
      try { det = JSON.parse(r.details || '{}'); } catch { /* ignore */ }
      return <>
        <Kv rows={[...Object.entries(det).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v, String(v).length > 60]),
          ['Budget', r.budget], ['Date souhaitée', r.wanted_date && fdate(r.wanted_date)], ['Cliente', `${r.name} · ${r.phone}`], r.email && ['E-mail', r.email]]} />
        {r.image && <a href={r.image} target="_blank" rel="noopener" className="detail-img"><img src={r.image} alt="Photo d’inspiration" /></a>}
        <QuoteForm r={r} close={close} />
      </>;
    },
  },
  enrollments: {
    title: 'Paiements formations', status: 'enrollments', search: true, create: 'Donner un accès',
    cols: [
      ['Réf.', (r) => <Ref r={r} at />], ['Élève', (r) => <Who r={r} n="user_name" p="user_phone" e="user_email" />],
      ['Formation', (r) => r.course_title || ''], ['Montant', (r) => money(r.amount)],
      ['Paiement', (r) => <><span className="ic-line">{r.payment_method || ''}</span>{r.payment_ref && <small>Réf. <b>{r.payment_ref}</b></small>}{r.payer_phone && <small>Payé depuis {r.payer_phone}</small>}</>],
      ['Statut', (r) => <StatusSel kind="enrollments" r={r} />],
    ],
    actions: (r) => <>{r.status === 'pending' && <><Btn act="approve" icon="check" primary>Valider</Btn><Btn act="reject">Refuser</Btn></>}
      <Contact phone={r.payer_phone || r.user_phone} msg={`Bonjour ${first(r.user_name)}, votre accès à la formation « ${r.course_title} » est activé ! Connectez-vous sur notre site, rubrique Mon espace. Bonne formation`} /></>,
    form: () => [
      { k: 'user_id', l: 'Cliente', t: 'select', opts: USERS(), req: 1, full: 1, help: 'La cliente doit d’abord avoir créé son compte sur le site.' },
      { k: 'course_id', l: 'Formation', t: 'select', opts: COURSES(), req: 1, full: 1 },
      { k: 'amount', l: 'Montant payé (FCFA)', t: 'number' }, { k: 'payment_method', l: 'Mode de paiement', def: 'Espèces' },
      { k: 'payment_ref', l: 'Référence' }, { k: 'status', l: 'Statut', t: 'select', opts: statusOpts('enrollments'), def: 'active' },
    ],
  },
  registrations: {
    title: 'Inscriptions ateliers', status: 'registrations', search: true, noCreate: true,
    cols: [
      ['Réf.', (r) => <Ref r={r} at />], ['Atelier', (r) => <><strong>{r.event_title || ''}</strong><small>{r.event_date && fdate(r.event_date)}</small></>],
      ['Participante', (r) => <Who r={r} />], ['Places', (r) => num(r.seats)],
      ['Montant', (r) => <>{money((r.event_price || 0) * r.seats)}{r.payment_ref && <small>MoMo réf. {r.payment_ref}</small>}</>],
      ['Statut', (r) => <StatusSel kind="registrations" r={r} />],
    ],
    actions: (r) => <Contact phone={r.phone} msg={`Bonjour ${first(r.name)}, votre inscription à « ${r.event_title} » (${r.seats} place(s)) est confirmée. À très vite ! (Réf. ${r.ref})`} />,
    form: () => [{ k: 'status', l: 'Statut', t: 'select', opts: statusOpts('registrations') }, { k: 'seats', l: 'Places', t: 'number' }, { k: 'payment_ref', l: 'Référence de paiement' }],
  },
  services: {
    title: 'Prestations', create: 'Nouvelle prestation',
    cols: [
      ['', (r) => <span className="cat-dot" style={{ '--c': CATS[r.category]?.color || '#999' }}><Icon n={CATS[r.category]?.icon} /></span>],
      ['Prestation', (r) => <><strong>{r.name}</strong><small>{CATS[r.category]?.label || r.category}</small></>],
      ['Tarif', (r) => (r.price ? money(r.price) : 'Sur devis')], ['Durée', (r) => fdur(r.duration)],
      ['Mise en avant', (r) => <Yes v={r.featured} />], ['En ligne', (r) => <Yes v={r.active} on="Visible" off="Masquée" />],
    ],
    form: () => [
      { k: 'name', l: 'Nom de la prestation', req: 1, full: 1 }, { k: 'category', l: 'Univers', t: 'select', opts: CAT_OPTS, req: 1 },
      { k: 'price', l: 'Tarif (FCFA)', t: 'number', help: '0 = sur devis' }, { k: 'duration', l: 'Durée (minutes)', t: 'number', def: 60, help: 'Utilisée pour calculer les créneaux' },
      { k: 'sort', l: 'Ordre d’affichage', t: 'number', def: 0 },
      { k: 'short', l: 'Accroche courte', full: 1 }, { k: 'description', l: 'Description détaillée', t: 'textarea', full: 1 },
      { k: 'tags', l: 'Mots-clés diagnostic', full: 1, help: 'Ex. : seche, grasse, taches, acne, rides, eclat, sensible. Sert au diagnostic de peau' },
      { k: 'image', l: 'Photo (facultatif)', t: 'image' },
      { k: 'featured', l: 'Afficher dans les soins signature', t: 'checkbox' }, { k: 'active', l: 'Visible sur le site', t: 'checkbox', def: 1 },
    ],
  },
  products: {
    title: 'Produits boutique', create: 'Nouveau produit',
    cols: [
      ['', (r) => <ProductVisual p={r} className="thumb" />],
      ['Produit', (r) => <><strong>{r.name}</strong><small>{PCATS[r.category] || r.category}{r.brand && ` · ${r.brand}`}</small></>],
      ['Prix', (r) => <>{money(r.price)}{r.compare_price && <small><s>{money(r.compare_price)}</s></small>}{r.bulk_qty > 1 && r.bulk_price > 0 && <small>dès {r.bulk_qty} : {money(r.bulk_price)}/u</small>}</>],
      ['Stock', (r) => (r.stock === null ? <span className="pill">Illimité</span> : <span className={cx('pill', r.stock <= 0 ? 'pill--bad' : r.stock <= 5 ? 'pill--warn' : 'pill--ok')}>{r.stock <= 0 ? 'Épuisé' : r.stock}</span>)],
      ['Coup de cœur', (r) => <Yes v={r.featured} />], ['En ligne', (r) => <Yes v={r.active} on="Visible" off="Masqué" />],
    ],
    form: () => [
      { k: 'name', l: 'Nom du produit', req: 1, full: 1 }, { k: 'category', l: 'Catégorie', t: 'select', opts: Object.entries(PCATS), req: 1 }, { k: 'brand', l: 'Marque' },
      { k: 'price', l: 'Prix (FCFA)', t: 'number', req: 1 }, { k: 'compare_price', l: 'Prix barré (FCFA)', t: 'number', help: 'Facultatif, pour afficher une promotion' },
      { k: 'bulk_qty', l: 'Prix dégressif : à partir de (quantité)', t: 'number', help: 'Facultatif. Ex. 2 = le prix ci-contre s’applique dès 2 articles.' },
      { k: 'bulk_price', l: 'Prix dégressif : prix à l’unité (FCFA)', t: 'number', help: 'Ex. 1 800 au lieu de 2 000. Laisser vide si pas de remise.' },
      { k: 'stock', l: 'Stock', t: 'number', help: 'Vide = illimité. Décrémenté automatiquement à chaque commande.' },
      { k: 'short', l: 'Accroche courte', full: 1 }, { k: 'description', l: 'Description', t: 'textarea', full: 1 }, { k: 'usage', l: 'Conseils d’utilisation', t: 'textarea', rows: 3, full: 1 },
      { k: 'tags', l: 'Mots-clés diagnostic', full: 1, help: 'Ex. : seche, grasse, taches, acne, eclat, sensible, tous' },
      { k: 'image', l: 'Photo du produit', t: 'image', help: 'Sans photo, une illustration élégante est générée automatiquement.' },
      { k: 'art', l: 'Illustration (si pas de photo)', t: 'select', opts: ART_OPTS }, { k: 'color', l: 'Couleur dominante', t: 'color' },
      { k: 'featured', l: 'Coup de cœur (mis en avant)', t: 'checkbox' }, { k: 'active', l: 'Visible en boutique', t: 'checkbox', def: 1 },
    ],
  },
  courses: {
    title: 'Formations vidéo', create: 'Nouvelle formation',
    cols: [
      ['', (r) => <span className="cat-dot" style={{ '--c': r.color }}><Icon n="film" /></span>],
      ['Formation', (r) => <><strong>{r.title}</strong><small>{r.level} · {r.duration_label}</small></>],
      ['Prix', (r) => (r.price ? money(r.price) : 'Gratuit')], ['Leçons', (r) => num(r.lessons_count)], ['Élèves', (r) => <strong>{num(r.students)}</strong>],
      ['Publiée', (r) => <Yes v={r.published} />],
    ],
    actions: (r) => <><A className="btn btn-ghost btn-xs" href={`/r/lessons?course_id=${r.id}`}><Icon n="film" /> Leçons</A><a className="icon-btn sm" href={`/formations/${r.slug}`} target="_blank" title="Voir sur le site"><Icon n="eye" /></a></>,
    form: () => [
      { k: 'title', l: 'Titre', req: 1, full: 1 }, { k: 'subtitle', l: 'Sous-titre', full: 1 },
      { k: 'level', l: 'Niveau', t: 'select', opts: LEVELS }, { k: 'price', l: 'Prix (FCFA)', t: 'number', help: '0 = gratuit' }, { k: 'compare_price', l: 'Prix barré', t: 'number' },
      { k: 'duration_label', l: 'Durée affichée', help: 'Ex. : 2 h 30' }, { k: 'instructor', l: 'Formatrice' }, { k: 'color', l: 'Couleur', t: 'color' },
      { k: 'description', l: 'Description', t: 'textarea', full: 1 },
      { k: 'what_you_learn', l: 'Ce que l’élève va apprendre', t: 'textarea', full: 1, help: 'Un point par ligne' },
      { k: 'image', l: 'Image de couverture', t: 'image' },
      { k: 'published', l: 'Publiée sur le site', t: 'checkbox', def: 1 }, { k: 'featured', l: 'Mise en avant sur l’accueil', t: 'checkbox' },
    ],
  },
  lessons: {
    title: 'Leçons vidéo', create: 'Nouvelle leçon', extra: <VideoUpload />,
    cols: [
      ['N°', (r) => <span className="num">{num(r.sort)}</span>],
      ['Leçon', (r) => <><strong>{r.title}</strong><small>{r.course_title}</small></>],
      ['Vidéo', (r) => (r.video_type === 'none' || !r.video_src ? <span className="pill pill--warn">À ajouter</span> : <span className="pill pill--ok">{{ file: 'Fichier', youtube: 'YouTube', vimeo: 'Vimeo', url: 'Lien' }[r.video_type] || r.video_type}</span>)],
      ['Durée', (r) => (r.duration ? fdur(r.duration) : '')], ['Aperçu gratuit', (r) => <Yes v={r.is_preview} />],
    ],
    form: (q) => [
      { k: 'course_id', l: 'Formation', t: 'select', opts: COURSES(), req: 1, full: 1, def: q?.course_id },
      { k: 'title', l: 'Titre de la leçon', req: 1, full: 1 }, { k: 'description', l: 'Description', t: 'textarea', rows: 2, full: 1 },
      { k: 'video_type', l: 'Source de la vidéo', t: 'select', opts: [['none', 'Pas encore de vidéo'], ['file', 'Fichier envoyé (MP4)'], ['youtube', 'YouTube (non répertoriée)'], ['vimeo', 'Vimeo'], ['url', 'Lien direct https://…']], def: 'none' },
      { k: 'video_src', l: 'Lien ou fichier vidéo', help: 'Collez le lien YouTube/Vimeo, ou utilisez le bouton d’envoi ci-dessous.' },
      { k: 'duration', l: 'Durée (minutes)', t: 'number' }, { k: 'sort', l: 'Ordre', t: 'number', def: 0 },
      { k: 'is_preview', l: 'Aperçu gratuit (visible sans achat)', t: 'checkbox' },
    ],
  },
  events: {
    title: 'Ateliers', create: 'Nouvel atelier',
    cols: [
      ['Date', (r) => <><strong>{cap(fdate(r.date, { weekday: 'short', day: 'numeric', month: 'short' }))}</strong><small>{r.time}{r.end_time && ` à ${r.end_time}`}</small></>],
      ['Atelier', (r) => <><strong>{r.title}</strong><small>{r.location}</small></>],
      ['Tarif', (r) => (r.price ? money(r.price) : 'Gratuit')],
      ['Remplissage', (r) => <><div className="fill"><span style={{ width: pct(r.taken, r.seats) + '%' }} /></div><small>{r.taken} / {r.seats} places</small></>],
      ['Visible', (r) => <Yes v={r.active} />],
    ],
    actions: () => <A className="btn btn-ghost btn-xs" href="/r/registrations">Inscrites</A>,
    form: () => [
      { k: 'title', l: 'Titre', req: 1, full: 1 }, { k: 'date', l: 'Date', t: 'date', req: 1 }, { k: 'time', l: 'Début', t: 'time' }, { k: 'end_time', l: 'Fin', t: 'time' },
      { k: 'location', l: 'Lieu', def: 'Chez SEM Cosmétique' }, { k: 'price', l: 'Tarif par place (FCFA)', t: 'number', def: 0 }, { k: 'seats', l: 'Nombre de places', t: 'number', def: 10 },
      { k: 'description', l: 'Description', t: 'textarea', full: 1 }, { k: 'color', l: 'Couleur', t: 'color' }, { k: 'image', l: 'Image', t: 'image' },
      { k: 'active', l: 'Visible sur le site', t: 'checkbox', def: 1 },
    ],
  },
  posts: {
    title: 'Conseils beauté (blog)', create: 'Nouvel article',
    cols: [
      ['Article', (r) => <><strong>{r.title}</strong><small>{(r.excerpt || '').slice(0, 90)}…</small></>],
      ['Catégorie', (r) => r.category || ''], ['Publié', (r) => <Yes v={r.published} />], ['Date', (r) => fshort(r.created_at)],
    ],
    actions: (r) => <a className="icon-btn sm" href={`/conseils/${r.slug}`} target="_blank" title="Voir"><Icon n="eye" /></a>,
    form: () => [
      { k: 'title', l: 'Titre', req: 1, full: 1 }, { k: 'category', l: 'Catégorie', help: 'Ex. : Routine, Make-up, Dermo-conseil' }, { k: 'read_time', l: 'Temps de lecture (min)', t: 'number', def: 4 },
      { k: 'excerpt', l: 'Résumé', t: 'textarea', rows: 2, full: 1 },
      { k: 'content', l: 'Contenu', t: 'textarea', rows: 14, full: 1, help: 'Mise en forme : « ## Titre », « - élément de liste », « **gras** ». Laissez une ligne vide entre les paragraphes.' },
      { k: 'image', l: 'Image', t: 'image' }, { k: 'color', l: 'Couleur', t: 'color' }, { k: 'published', l: 'Publié', t: 'checkbox', def: 1 },
    ],
  },
  promos: {
    title: 'Codes promo', create: 'Nouveau code',
    cols: [
      ['Code', (r) => <code className="big">{r.code}</code>], ['Remise', (r) => (r.type === 'percent' ? `${r.value} %` : money(r.value))],
      ['Minimum d’achat', (r) => (r.min_amount ? money(r.min_amount) : 'Aucun')], ['Utilisations', (r) => `${num(r.uses)}${r.max_uses ? ' / ' + num(r.max_uses) : ''}`],
      ['Expire le', (r) => (r.expires ? fshort(r.expires) : 'Jamais')], ['Actif', (r) => <Yes v={r.active} />],
    ],
    form: () => [
      { k: 'code', l: 'Code', req: 1, help: 'Ex. : NOEL2026 (majuscules automatiques)' }, { k: 'type', l: 'Type', t: 'select', opts: [['percent', 'Pourcentage'], ['fixed', 'Montant fixe (FCFA)']] },
      { k: 'value', l: 'Valeur', t: 'number', req: 1 }, { k: 'min_amount', l: 'Minimum d’achat (FCFA)', t: 'number', def: 0 },
      { k: 'max_uses', l: 'Utilisations max', t: 'number', help: 'Vide = illimité' }, { k: 'expires', l: 'Date d’expiration', t: 'date' },
      { k: 'active', l: 'Actif', t: 'checkbox', def: 1 },
    ],
  },
  gallery: {
    title: 'Galerie réalisations', create: 'Ajouter une photo',
    cols: [
      ['Photo', (r) => <><Thumb src={r.image} />{r.after_image && <Thumb src={r.after_image} />}</>],
      ['Titre', (r) => <><strong>{r.title || ''}</strong><small>{r.after_image ? 'Avant / après' : 'Photo simple'}</small></>],
      ['Catégorie', (r) => r.category || ''], ['Ordre', (r) => num(r.sort)],
    ],
    form: () => [
      { k: 'title', l: 'Titre', full: 1 }, { k: 'category', l: 'Catégorie', help: 'Ex. : Make-up, Attache foulard' }, { k: 'sort', l: 'Ordre', t: 'number', def: 0 },
      { k: 'image', l: 'Photo (ou « avant »)', t: 'image', req: 1 }, { k: 'after_image', l: 'Photo « après » (facultatif)', t: 'image', help: 'Si renseignée, un comparateur avant/après est affiché.' },
    ],
  },
  reviews: {
    title: 'Avis clientes', create: 'Ajouter un avis',
    cols: [
      ['Cliente', (r) => <><strong>{r.name}</strong><small>{r.service}</small></>], ['Note', (r) => <Stars n={r.rating} />],
      ['Avis', (r) => <span className="clamp">{r.text}</span>], ['Date', (r) => fshort(r.created_at)], ['Publié', (r) => <Yes v={r.approved} on="Publié" off="En attente" />],
    ],
    actions: (r) => <Btn act="toggle-approve" icon={r.approved ? null : 'check'} primary={!r.approved}>{r.approved ? 'Masquer' : 'Publier'}</Btn>,
    form: () => [{ k: 'name', l: 'Nom', req: 1 }, { k: 'service', l: 'Soin / produit' }, { k: 'rating', l: 'Note (1 à 5)', t: 'number', def: 5, min: 1 }, { k: 'text', l: 'Avis', t: 'textarea', req: 1, full: 1 }, { k: 'approved', l: 'Publié', t: 'checkbox', def: 1 }],
  },
  messages: {
    title: 'Messages & rappels', search: true, noCreate: true,
    cols: [
      ['Reçu', (r) => <strong>{fdatetime(r.created_at)}</strong>],
      ['Type', (r) => (r.kind === 'rappel' ? <span className="pill pill--warn"><Icon n="phone" /> À rappeler</span> : <span className="pill pill--info"><Icon n="mail" /> Message</span>)],
      ['Contact', (r) => <Who r={r} />], ['Message', (r) => <><strong>{r.subject}</strong><span className="clamp">{r.message}</span></>],
      ['État', (r) => (r.is_read ? <span className="pill">Traité</span> : <span className="pill pill--bad">Nouveau</span>)],
    ],
    actions: (r) => <><Contact phone={r.phone} msg={`Bonjour ${first(r.name)}, ici ${settings().site_name}. Nous revenons vers vous suite à votre message.`} />
      {r.email && <a className="icon-btn sm" href={`mailto:${r.email}`} title="Répondre par e-mail"><Icon n="mail" /></a>}<Btn act="toggle-read" icon={r.is_read ? null : 'check'}>{r.is_read ? 'Marquer non lu' : 'Traité'}</Btn></>,
    detail: (r) => <Kv rows={[['Nom', r.name], ['Téléphone', r.phone], ['E-mail', r.email], ['Sujet', r.subject], ['Message', r.message, true]]} />,
  },
  users: {
    title: 'Clientes inscrites', search: true, noCreate: true,
    cols: [
      ['Nom', (r) => <><strong>{r.name}</strong><small>{r.email}</small></>], ['Téléphone', (r) => r.phone || ''],
      ['Rôle', (r) => (r.role === 'admin' ? <span className="pill pill--info">Administratrice</span> : <span className="pill">Cliente</span>)],
      ['RDV', (r) => num(r.bookings)], ['Commandes', (r) => num(r.orders)], ['Inscrite le', (r) => fshort(r.created_at)],
    ],
    actions: (r) => <Contact phone={r.phone} msg={`Bonjour ${first(r.name)}, ici ${settings().site_name}`} />,
    form: () => [{ k: 'name', l: 'Nom', req: 1 }, { k: 'phone', l: 'Téléphone' }, { k: 'role', l: 'Rôle', t: 'select', opts: [['client', 'Cliente'], ['admin', 'Administratrice (accès complet)']] }],
  },
  newsletter: {
    title: 'Newsletter', noCreate: true, pk: 'email',
    cols: [['E-mail', (r) => <strong>{r.email}</strong>], ['Inscription', (r) => fdatetime(r.created_at)]],
  },
};

/* Devis sur-mesure : montant, statut, message et envoi WhatsApp. */
function QuoteForm({ r, close }) {
  const [v, setV] = useState({ quote: r.quote ?? '', status: r.status, admin_note: r.admin_note || '' });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <form className="aform mt" onSubmit={async (e) => {
      e.preventDefault();
      try { await save('custom_orders', r.id, { quote: v.quote === '' ? null : +v.quote, status: v.status, admin_note: v.admin_note }); close(); }
      catch (err) { toast(err.message, 'err'); }
    }}>
      <div className="aform__grid">
        <label className="field"><input type="number" placeholder=" " value={v.quote} onChange={set('quote')} /><span>Montant du devis (FCFA)</span></label>
        <label className="field field--select"><select value={v.status} onChange={set('status')}>{statusOpts('custom_orders').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><span>Statut</span></label>
        <label className="field full"><textarea rows={2} placeholder=" " value={v.admin_note} onChange={set('admin_note')} /><span>Message pour la cliente</span></label>
      </div>
      <div className="row-end"><a className="btn btn-gold" target="_blank" rel="noopener" href={waHref(r.phone, quoteMsg({ ...r, quote: +v.quote || null, admin_note: v.admin_note }))}><Icon n="whatsapp" /> Envoyer le devis</a><button className="btn btn-primary"><Icon n="check" /> Enregistrer</button></div>
    </form>
  );
}

/* ================================================================ VUE LISTE */
const reloaders = new Set();
async function save(res, id, data, msg = 'Enregistré') {
  await api(`/api/admin/r/${res}/${id}`, { method: 'PUT', body: data });
  toast(msg);
  changed();
  reloaders.forEach((f) => f());
}

export function ListView({ res, query }) {
  const cfg = R[res];
  useStore(adm);
  const [rows, setRows] = useState(null), [status, setStatus] = useState(query.status || ''), [q, setQ] = useState(''), [course, setCourse] = useState(query.course_id || '');
  const load = useRef(null);
  load.current = async () => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (course) p.set('course_id', course);
    try { setRows(await api(`/api/admin/r/${res}?${p}`)); } catch (e) { toast(e.message, 'err'); setRows([]); }
  };
  useEffect(() => { load.current(); }, [res, q, course]);
  useEffect(() => { const f = () => load.current(); reloaders.add(f); return () => reloaders.delete(f); }, []);
  const search = useRef(debounce((v) => setQ(v), 300)).current;
  if (!cfg) return <p>Section inconnue.</p>;

  const pk = cfg.pk || 'id';
  const list = rows && (status ? rows.filter((r) => r.status === status) : rows);
  const tabs = cfg.status && [['', 'Tous'], ...statusOpts(cfg.status)];
  const find = (id) => rows.find((r) => String(r[pk]) === String(id));
  const after = async () => { changed(); await load.current(); };

  const edit = (row) => formModal({
    title: row ? `Modifier : ${row.name || row.title || row.ref || row.code || ''}` : cfg.create || 'Ajouter',
    fields: cfg.form({ course_id: course }), data: row || {}, extra: cfg.extra,
    onSubmit: async (data) => {
      if (row) return save(res, row.id, data);
      await api(`/api/admin/r/${res}`, { method: 'POST', body: data });
      toast('Créé avec succès');
      await after();
    },
  });
  const openDetail = (row) => {
    openModal({ title: row.ref ? `${cfg.title.replace(/s$/, '')} ${row.ref}` : cfg.title, size: 'modal--md', render: (close) => <>{cfg.detail(row, close)}<div className="row-wrap mt"><Contact phone={row.phone} msg="" /></div></> });
    if (res === 'messages' && !row.is_read) save(res, row.id, { is_read: true }, 'Message marqué comme traité').catch(() => {});
  };
  const onClick = async (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const row = find(tr.dataset.id), act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return cfg.detail && !e.target.closest('a, button, select, input') && openDetail(row);
    try {
      if (act === 'edit') return edit(row);
      if (act === 'open') return openDetail(row);
      if (act === 'delete') {
        if (!(await confirmBox('Supprimer définitivement cet élément ? Cette action est irréversible.', { ok: 'Supprimer', danger: true }))) return;
        await api(`/api/admin/r/${res}/${encodeURIComponent(tr.dataset.id)}`, { method: 'DELETE' });
        toast('Supprimé');
        return after();
      }
      if (act === 'approve') return save(res, row.id, { status: 'active' }, 'Accès activé. Pensez à prévenir l’élève sur WhatsApp');
      if (act === 'reject') return save(res, row.id, { status: 'rejected' }, 'Paiement refusé');
      if (act === 'toggle-approve') return save(res, row.id, { approved: !row.approved }, row.approved ? 'Avis masqué' : 'Avis publié');
      if (act === 'toggle-read') return save(res, row.id, { is_read: !row.is_read });
    } catch (err) { toast(err.message, 'err'); }
  };
  const onChange = async (e) => {
    const sel = e.target.closest('[data-status]');
    if (!sel) return;
    try { await save(res, sel.dataset.status, { status: sel.value }, `Statut mis à jour : ${STATUS[cfg.status][sel.value][0]}`); }
    catch (err) { toast(err.message, 'err'); load.current(); }
  };

  return <>
    <div className="list-head">
      <div className="list-head__l">
        {cfg.search && <label className="search search--sm"><Icon n="search" /><input type="search" placeholder="Rechercher…" onChange={(e) => search(e.target.value.trim())} /></label>}
        {res === 'lessons' && <label className="field field--select field--inline"><select value={course} onChange={(e) => { setCourse(e.target.value); history.replaceState(null, '', `/admin/r/lessons${e.target.value ? '?course_id=' + e.target.value : ''}`); }}>
          <option value="">Toutes les formations</option>{opts().courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
      </div>
      <div className="list-head__r">
        <a className="btn btn-ghost btn-sm" href={`/api/admin/export/${res}`} download><Icon n="download" /> Export Excel (CSV)</a>
        {cfg.form && !cfg.noCreate && <button className="btn btn-primary btn-sm" onClick={() => edit(null)}><Icon n="plus" /> {cfg.create || 'Ajouter'}</button>}
      </div>
    </div>
    {tabs && <div className="stabs">{tabs.map(([k, l]) => { const n = rows ? (k ? rows.filter((r) => r.status === k).length : rows.length) : 0; return <button key={k} className={k === status ? 'active' : undefined} onClick={() => setStatus(k)}>{l}<sup>{n || ''}</sup></button>; })}</div>}
    <div className="tbl-wrap card"><div onClick={onClick} onChange={onChange}>
      {!list ? <><div className="loading-row" /><div className="loading-row" /><div className="loading-row" /></>
        : !list.length ? <div className="empty"><Icon n="search" /><p>Aucun élément{q ? ' pour cette recherche' : ''}.</p></div>
          : <table className="tbl"><thead><tr>{cfg.cols.map(([l], i) => <th key={i}>{l}</th>)}<th className="ta-r">Actions</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r[pk]} data-id={r[pk]} className={cx(cfg.detail && 'clickable', (r.is_read === 0 || r.status === 'pending' || r.status === 'new') && 'is-new')}>
                {cfg.cols.map(([l, f], i) => <td key={i} data-label={l}>{f(r)}</td>)}
                <td className="ta-r"><div className="acts">{cfg.actions?.(r)}{cfg.form && <button className="icon-btn sm" data-act="edit" title="Modifier"><Icon n="edit" /></button>}<button className="icon-btn sm danger" data-act="delete" title="Supprimer"><Icon n="trash" /></button></div></td>
              </tr>))}</tbody></table>}
    </div></div>
  </>;
}
