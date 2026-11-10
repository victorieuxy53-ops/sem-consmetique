/* Administration : définition des ressources gérées + vue liste générique. */
import { $, $$, esc, api, state, icon, money, num, fdur, fdate, fshort, fdatetime, cap, CATS, PCATS, STATUS, CUSTOM_TYPES, statusPill, modal, toast, confirmBox, telHref, waHref, debounce } from './core.js';
import { productVisual, stars } from './art.js';
import { formModal } from './admin-kit.js';

export const A = { opts: { services: [], courses: [], users: [], events: [] }, onChange: () => {} };
const S = () => state.settings || {};
const first = (n) => String(n || '').split(' ')[0];
const statusOpts = (k) => Object.entries(STATUS[k]).map(([v, [l]]) => [v, l]);
const statusSelect = (kind, r) => `<select class="st-sel st-${STATUS[kind][r.status]?.[1] || 'info'}" data-status="${r.id}" aria-label="Statut">${Object.entries(STATUS[kind]).map(([k, [l]]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const who = (r, n = 'name', p = 'phone', e = 'email') => `<strong>${esc(r[n] || '—')}</strong><small>${esc(r[p] || '')}${r[e] ? (r[p] ? ' · ' : '') + esc(r[e]) : ''}</small>`;
export const contactBtns = (phone, msg) => (phone ? `<a class="icon-btn sm" href="${telHref(phone)}" title="Appeler">${icon('phone')}</a><a class="icon-btn sm wa" target="_blank" rel="noopener" href="${waHref(phone, msg)}" title="Écrire sur WhatsApp">${icon('whatsapp')}</a>` : '');
const yes = (v, on = 'Oui', off = 'Non') => (v ? `<span class="pill pill--ok">${on}</span>` : `<span class="pill">${off}</span>`);
const thumb = (src) => (src ? `<img class="thumb" src="${esc(src)}" alt="" loading="lazy">` : `<span class="thumb thumb--empty">${icon('image')}</span>`);
const code = (r) => `<code>${esc(r.ref)}</code>`;

const SVC = () => A.opts.services.map((s) => [s.id, `${s.name} · ${fdur(s.duration)} · ${money(s.price)}`]);
const COURSES = () => A.opts.courses.map((c) => [c.id, c.title]);
const USERS = () => A.opts.users.map((u) => [u.id, `${u.name} — ${u.email}`]);
const CAT_OPTS = Object.entries(CATS).map(([k, v]) => [k, v.label]);
const ART_OPTS = [['serum', 'Flacon sérum'], ['jar', 'Pot de crème'], ['tube', 'Tube'], ['pump', 'Flacon pompe'], ['bottle', 'Bouteille'], ['oil', 'Huile'], ['soap', 'Savon'], ['lipstick', 'Rouge à lèvres'], ['palette', 'Palette'], ['scarf', 'Foulard'], ['box', 'Coffret']];
const LEVELS = [['Débutant', 'Débutant'], ['Intermédiaire', 'Intermédiaire'], ['Avancé', 'Avancé'], ['Tous niveaux', 'Tous niveaux']];

export const bookingMsg = (r) => `Bonjour ${first(r.name)}, nous vous confirmons votre rendez-vous « ${r.service_name || 'prestation'} » le ${fdate(r.date)} à ${String(r.time).replace(':', 'h')} chez ${S().site_name}. À très bientôt ! (Réf. ${r.ref})`;

/* =================================================================== RESSOURCES */
export const R = {
  bookings: {
    title: 'Rendez-vous', status: 'bookings', create: 'Nouveau rendez-vous', search: true,
    cols: [
      ['Réf.', code],
      ['Date', (r) => `<strong>${cap(fdate(r.date, { weekday: 'short', day: 'numeric', month: 'short' }))}</strong><small>${String(r.time).replace(':', 'h')} · ${fdur(r.duration)}</small>`],
      ['Cliente', (r) => who(r) + (r.source === 'admin' ? '<small class="tag">saisi par l’équipe</small>' : '')],
      ['Prestation', (r) => `${esc(r.service_name || '—')}${r.notes ? `<small class="note-s" title="${esc(r.notes)}">${icon('chat')} ${esc(r.notes.slice(0, 50))}</small>` : ''}`],
      ['Montant', (r) => money(r.price)],
      ['Statut', (r) => statusSelect('bookings', r)],
    ],
    actions: (r) => contactBtns(r.phone, bookingMsg(r)),
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
      ['Réf.', (r) => `${code(r)}<small>${fdatetime(r.created_at)}</small>`],
      ['Cliente', who],
      ['Articles', (r) => (r.items || []).map((i) => `${i.qty} × ${esc(i.name)}`).join('<br>')],
      ['Total', (r) => `<strong>${money(r.total)}</strong>${r.discount ? `<small>Remise ${money(r.discount)} · ${esc(r.promo || '')}</small>` : ''}${r.delivery_fee ? `<small>dont livraison ${money(r.delivery_fee)}</small>` : ''}`],
      ['Paiement', (r) => (r.payment === 'momo' ? `<span class="pill pill--info">Mobile Money</span><small>Réf. ${esc(r.payment_ref || '—')}</small>` : '<span class="pill">À la livraison</span>')],
      ['Livraison', (r) => (r.delivery === 'livraison' ? `<span class="ic-line">${icon('truck')} Livraison</span><small>${esc([r.address, r.city].filter(Boolean).join(', '))}</small>` : `<span class="ic-line">${icon('store')} Retrait</span>`)],
      ['Statut', (r) => statusSelect('orders', r)],
    ],
    actions: (r) => contactBtns(r.phone, `Bonjour ${first(r.name)}, merci pour votre commande ${r.ref} (${money(r.total)}) chez ${S().site_name} ! ${r.delivery === 'livraison' ? 'Quand pouvons-nous vous livrer ?' : 'Elle sera prête à l’institut très bientôt.'}`),
    form: () => [{ k: 'status', l: 'Statut', t: 'select', opts: statusOpts('orders') }, { k: 'payment_ref', l: 'Référence de paiement' }, { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }],
    detail: (r) => `<div class="kv">
      <div><span>Cliente</span><strong>${esc(r.name)}</strong></div><div><span>Téléphone</span><strong>${esc(r.phone)}</strong></div>
      ${r.email ? `<div><span>E-mail</span><strong>${esc(r.email)}</strong></div>` : ''}
      <div><span>Livraison</span><strong>${r.delivery === 'livraison' ? esc([r.address, r.city].filter(Boolean).join(', ')) : 'Retrait à l’institut'}</strong></div>
      <div><span>Paiement</span><strong>${r.payment === 'momo' ? 'Mobile Money · réf. ' + esc(r.payment_ref || '—') : 'À la livraison / au retrait'}</strong></div>
      ${r.notes ? `<div class="full"><span>Notes</span><strong>${esc(r.notes)}</strong></div>` : ''}</div>
      <table class="mini"><tbody>${(r.items || []).map((i) => `<tr><td>${i.qty} ×</td><td>${esc(i.name)}</td><td>${money(i.price * i.qty)}</td></tr>`).join('')}
      <tr><td></td><td>Sous-total</td><td>${money(r.subtotal)}</td></tr>${r.discount ? `<tr><td></td><td>Remise (${esc(r.promo || '')})</td><td>− ${money(r.discount)}</td></tr>` : ''}
      <tr><td></td><td>Livraison</td><td>${money(r.delivery_fee)}</td></tr><tr class="tot"><td></td><td>Total</td><td>${money(r.total)}</td></tr></tbody></table>`,
  },
  custom_orders: {
    title: 'Demandes sur-mesure', status: 'custom_orders', search: true, noCreate: true,
    cols: [
      ['Réf.', (r) => `${code(r)}<small>${fdatetime(r.created_at)}</small>`],
      ['Demande', (r) => `<span class="ic-line">${icon(CUSTOM_TYPES[r.type]?.[1] || 'sparkle')} ${esc(CUSTOM_TYPES[r.type]?.[0] || r.type)}</span>${r.image ? '<small>📷 photo jointe</small>' : ''}`],
      ['Cliente', who],
      ['Budget', (r) => `${esc(r.budget || '—')}${r.wanted_date ? `<small>Pour le ${fshort(r.wanted_date)}</small>` : ''}`],
      ['Devis', (r) => (r.quote ? `<strong>${money(r.quote)}</strong>` : '<span class="muted">—</span>')],
      ['Statut', (r) => statusSelect('custom_orders', r)],
    ],
    actions: (r) => `<button class="btn btn-ghost btn-xs" data-act="open">${icon('eye')} Ouvrir</button>${contactBtns(r.phone, `Bonjour ${first(r.name)}, merci pour votre demande sur-mesure (${r.ref}).`)}`,
    form: () => [
      { k: 'status', l: 'Statut', t: 'select', opts: statusOpts('custom_orders') },
      { k: 'quote', l: 'Montant du devis (FCFA)', t: 'number' },
      { k: 'admin_note', l: 'Message pour la cliente (visible dans son suivi)', t: 'textarea', full: 1, rows: 3 },
    ],
    detail: (r) => {
      let det = {};
      try { det = JSON.parse(r.details || '{}'); } catch { /* ignore */ }
      return `<div class="kv">${Object.entries(det).map(([k, v]) => `<div class="${String(v).length > 60 ? 'full' : ''}"><span>${esc(k)}</span><strong>${esc(Array.isArray(v) ? v.join(', ') || '—' : v || '—')}</strong></div>`).join('')}
        <div><span>Budget</span><strong>${esc(r.budget || '—')}</strong></div><div><span>Date souhaitée</span><strong>${r.wanted_date ? fdate(r.wanted_date) : '—'}</strong></div>
        <div><span>Cliente</span><strong>${esc(r.name)} · ${esc(r.phone)}</strong></div>${r.email ? `<div><span>E-mail</span><strong>${esc(r.email)}</strong></div>` : ''}</div>
        ${r.image ? `<a href="${esc(r.image)}" target="_blank" rel="noopener" class="detail-img"><img src="${esc(r.image)}" alt="Photo d’inspiration"></a>` : ''}`;
    },
    quoteMsg: (r) => `Bonjour ${first(r.name)}, voici notre proposition pour votre demande ${r.ref} (${CUSTOM_TYPES[r.type]?.[0] || ''}) : ${r.quote ? money(r.quote) : '…'}.${r.admin_note ? ' ' + r.admin_note : ''} Souhaitez-vous la valider ?`,
  },
  enrollments: {
    title: 'Paiements formations', status: 'enrollments', search: true, create: 'Donner un accès',
    cols: [
      ['Réf.', (r) => `${code(r)}<small>${fdatetime(r.created_at)}</small>`],
      ['Élève', (r) => who(r, 'user_name', 'user_phone', 'user_email')],
      ['Formation', (r) => esc(r.course_title || '—')],
      ['Montant', (r) => money(r.amount)],
      ['Paiement', (r) => `<span class="ic-line">${esc(r.payment_method || '—')}</span>${r.payment_ref ? `<small>Réf. <b>${esc(r.payment_ref)}</b></small>` : ''}${r.payer_phone ? `<small>Payé depuis ${esc(r.payer_phone)}</small>` : ''}`],
      ['Statut', (r) => statusSelect('enrollments', r)],
    ],
    actions: (r) => `${r.status === 'pending' ? `<button class="btn btn-primary btn-xs" data-act="approve">${icon('check')} Valider</button><button class="btn btn-ghost btn-xs" data-act="reject">Refuser</button>` : ''}${contactBtns(r.payer_phone || r.user_phone, `Bonjour ${first(r.user_name)}, votre accès à la formation « ${r.course_title} » est activé ! Connectez-vous sur notre site, rubrique Mon espace. Bonne formation ✨`)}`,
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
      ['Réf.', (r) => `${code(r)}<small>${fdatetime(r.created_at)}</small>`],
      ['Atelier', (r) => `<strong>${esc(r.event_title || '—')}</strong><small>${r.event_date ? fdate(r.event_date) : ''}</small>`],
      ['Participante', who],
      ['Places', (r) => num(r.seats)],
      ['Montant', (r) => `${money((r.event_price || 0) * r.seats)}${r.payment_ref ? `<small>MoMo réf. ${esc(r.payment_ref)}</small>` : ''}`],
      ['Statut', (r) => statusSelect('registrations', r)],
    ],
    actions: (r) => contactBtns(r.phone, `Bonjour ${first(r.name)}, votre inscription à « ${r.event_title} » (${r.seats} place(s)) est confirmée. À très vite ! (Réf. ${r.ref})`),
    form: () => [{ k: 'status', l: 'Statut', t: 'select', opts: statusOpts('registrations') }, { k: 'seats', l: 'Places', t: 'number' }, { k: 'payment_ref', l: 'Référence de paiement' }],
  },
  services: {
    title: 'Prestations', create: 'Nouvelle prestation',
    cols: [
      ['', (r) => `<span class="cat-dot" style="--c:${CATS[r.category]?.color || '#999'}">${icon(CATS[r.category]?.icon || 'sparkle')}</span>`],
      ['Prestation', (r) => `<strong>${esc(r.name)}</strong><small>${esc(CATS[r.category]?.label || r.category || '')}</small>`],
      ['Tarif', (r) => (r.price ? money(r.price) : 'Sur devis')], ['Durée', (r) => fdur(r.duration)],
      ['Mise en avant', (r) => yes(r.featured)], ['En ligne', (r) => yes(r.active, 'Visible', 'Masquée')],
    ],
    form: () => [
      { k: 'name', l: 'Nom de la prestation', req: 1, full: 1 }, { k: 'category', l: 'Univers', t: 'select', opts: CAT_OPTS, req: 1 },
      { k: 'price', l: 'Tarif (FCFA)', t: 'number', help: '0 = sur devis' }, { k: 'duration', l: 'Durée (minutes)', t: 'number', def: 60, help: 'Utilisée pour calculer les créneaux' },
      { k: 'sort', l: 'Ordre d’affichage', t: 'number', def: 0 },
      { k: 'short', l: 'Accroche courte', full: 1 }, { k: 'description', l: 'Description détaillée', t: 'textarea', full: 1 },
      { k: 'tags', l: 'Mots-clés diagnostic', full: 1, help: 'Ex. : seche, grasse, taches, acne, rides, eclat, sensible — sert au diagnostic de peau' },
      { k: 'image', l: 'Photo (facultatif)', t: 'image' },
      { k: 'featured', l: 'Afficher dans les soins signature', t: 'checkbox' }, { k: 'active', l: 'Visible sur le site', t: 'checkbox', def: 1 },
    ],
  },
  products: {
    title: 'Produits boutique', create: 'Nouveau produit', search: false,
    cols: [
      ['', (r) => productVisual(r, 'thumb')],
      ['Produit', (r) => `<strong>${esc(r.name)}</strong><small>${esc(PCATS[r.category] || r.category || '')}${r.brand ? ' · ' + esc(r.brand) : ''}</small>`],
      ['Prix', (r) => `${money(r.price)}${r.compare_price ? `<small><s>${money(r.compare_price)}</s></small>` : ''}`],
      ['Stock', (r) => (r.stock === null ? '<span class="pill">Illimité</span>' : r.stock <= 0 ? '<span class="pill pill--bad">Épuisé</span>' : r.stock <= 5 ? `<span class="pill pill--warn">${r.stock}</span>` : `<span class="pill pill--ok">${r.stock}</span>`)],
      ['Coup de cœur', (r) => yes(r.featured)], ['En ligne', (r) => yes(r.active, 'Visible', 'Masqué')],
    ],
    form: () => [
      { k: 'name', l: 'Nom du produit', req: 1, full: 1 }, { k: 'category', l: 'Catégorie', t: 'select', opts: Object.entries(PCATS), req: 1 }, { k: 'brand', l: 'Marque' },
      { k: 'price', l: 'Prix (FCFA)', t: 'number', req: 1 }, { k: 'compare_price', l: 'Prix barré (FCFA)', t: 'number', help: 'Facultatif, pour afficher une promotion' },
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
      ['', (r) => `<span class="cat-dot" style="--c:${esc(r.color)}">${icon('film')}</span>`],
      ['Formation', (r) => `<strong>${esc(r.title)}</strong><small>${esc(r.level || '')} · ${esc(r.duration_label || '')}</small>`],
      ['Prix', (r) => (r.price ? money(r.price) : 'Gratuit')], ['Leçons', (r) => num(r.lessons_count)], ['Élèves', (r) => `<strong>${num(r.students)}</strong>`],
      ['Publiée', (r) => yes(r.published)],
    ],
    actions: (r) => `<a class="btn btn-ghost btn-xs" href="#/r/lessons?course_id=${r.id}">${icon('film')} Leçons</a><a class="icon-btn sm" href="/formations/${esc(r.slug)}" target="_blank" title="Voir sur le site">${icon('eye')}</a>`,
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
    title: 'Leçons vidéo', create: 'Nouvelle leçon',
    cols: [
      ['N°', (r) => `<span class="num">${num(r.sort)}</span>`],
      ['Leçon', (r) => `<strong>${esc(r.title)}</strong><small>${esc(r.course_title || '')}</small>`],
      ['Vidéo', (r) => (r.video_type === 'none' || !r.video_src ? '<span class="pill pill--warn">À ajouter</span>' : `<span class="pill pill--ok">${{ file: 'Fichier', youtube: 'YouTube', vimeo: 'Vimeo', url: 'Lien' }[r.video_type] || r.video_type}</span>`)],
      ['Durée', (r) => (r.duration ? fdur(r.duration) : '—')], ['Aperçu gratuit', (r) => yes(r.is_preview)],
    ],
    form: (q) => [
      { k: 'course_id', l: 'Formation', t: 'select', opts: COURSES(), req: 1, full: 1, def: q?.course_id },
      { k: 'title', l: 'Titre de la leçon', req: 1, full: 1 }, { k: 'description', l: 'Description', t: 'textarea', rows: 2, full: 1 },
      { k: 'video_type', l: 'Source de la vidéo', t: 'select', opts: [['none', 'Pas encore de vidéo'], ['file', 'Fichier envoyé (MP4)'], ['youtube', 'YouTube (non répertoriée)'], ['vimeo', 'Vimeo'], ['url', 'Lien direct https://…']], def: 'none' },
      { k: 'video_src', l: 'Lien ou fichier vidéo', help: 'Collez le lien YouTube/Vimeo, ou utilisez le bouton d’envoi ci-dessous.' },
      { k: 'duration', l: 'Durée (minutes)', t: 'number' }, { k: 'sort', l: 'Ordre', t: 'number', def: 0 },
      { k: 'is_preview', l: 'Aperçu gratuit (visible sans achat)', t: 'checkbox' },
    ],
    extra: `<div class="vidup"><label class="upload__zone">${icon('video')}<span><strong>Envoyer un fichier vidéo</strong><small>MP4 recommandé (H.264), jusqu’à 4 Go. La vidéo reste protégée : seules les élèves inscrites peuvent la lire.</small></span><input type="file" accept="video/mp4,video/webm,video/quicktime" hidden></label><div class="prog" hidden><span></span></div><small class="vidup__st"></small></div>`,
  },
  events: {
    title: 'Ateliers', create: 'Nouvel atelier',
    cols: [
      ['Date', (r) => `<strong>${cap(fdate(r.date, { weekday: 'short', day: 'numeric', month: 'short' }))}</strong><small>${esc(r.time || '')}${r.end_time ? ' – ' + esc(r.end_time) : ''}</small>`],
      ['Atelier', (r) => `<strong>${esc(r.title)}</strong><small>${esc(r.location || '')}</small>`],
      ['Tarif', (r) => (r.price ? money(r.price) : 'Gratuit')],
      ['Remplissage', (r) => `<div class="fill"><span style="width:${Math.min(100, (r.taken / Math.max(1, r.seats)) * 100)}%"></span></div><small>${r.taken} / ${r.seats} places</small>`],
      ['Visible', (r) => yes(r.active)],
    ],
    actions: () => '<a class="btn btn-ghost btn-xs" href="#/r/registrations">Inscrites</a>',
    form: () => [
      { k: 'title', l: 'Titre', req: 1, full: 1 }, { k: 'date', l: 'Date', t: 'date', req: 1 }, { k: 'time', l: 'Début', t: 'time' }, { k: 'end_time', l: 'Fin', t: 'time' },
      { k: 'location', l: 'Lieu', def: 'À l’institut' }, { k: 'price', l: 'Tarif par place (FCFA)', t: 'number', def: 0 }, { k: 'seats', l: 'Nombre de places', t: 'number', def: 10 },
      { k: 'description', l: 'Description', t: 'textarea', full: 1 }, { k: 'color', l: 'Couleur', t: 'color' }, { k: 'image', l: 'Image', t: 'image' },
      { k: 'active', l: 'Visible sur le site', t: 'checkbox', def: 1 },
    ],
  },
  posts: {
    title: 'Conseils beauté (blog)', create: 'Nouvel article',
    cols: [
      ['Article', (r) => `<strong>${esc(r.title)}</strong><small>${esc((r.excerpt || '').slice(0, 90))}…</small>`],
      ['Catégorie', (r) => esc(r.category || '—')], ['Publié', (r) => yes(r.published)], ['Date', (r) => fshort(r.created_at)],
    ],
    actions: (r) => `<a class="icon-btn sm" href="/conseils/${esc(r.slug)}" target="_blank" title="Voir">${icon('eye')}</a>`,
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
      ['Code', (r) => `<code class="big">${esc(r.code)}</code>`],
      ['Remise', (r) => (r.type === 'percent' ? `${r.value} %` : money(r.value))],
      ['Minimum d’achat', (r) => (r.min_amount ? money(r.min_amount) : '—')],
      ['Utilisations', (r) => `${num(r.uses)}${r.max_uses ? ' / ' + num(r.max_uses) : ''}`],
      ['Expire le', (r) => (r.expires ? fshort(r.expires) : 'Jamais')], ['Actif', (r) => yes(r.active)],
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
      ['Photo', (r) => `${thumb(r.image)}${r.after_image ? thumb(r.after_image) : ''}`],
      ['Titre', (r) => `<strong>${esc(r.title || '—')}</strong><small>${r.after_image ? 'Avant / après' : 'Photo simple'}</small>`],
      ['Catégorie', (r) => esc(r.category || '—')], ['Ordre', (r) => num(r.sort)],
    ],
    form: () => [
      { k: 'title', l: 'Titre', full: 1 }, { k: 'category', l: 'Catégorie', help: 'Ex. : Make-up, Attache foulard' }, { k: 'sort', l: 'Ordre', t: 'number', def: 0 },
      { k: 'image', l: 'Photo (ou « avant »)', t: 'image', req: 1 }, { k: 'after_image', l: 'Photo « après » (facultatif)', t: 'image', help: 'Si renseignée, un comparateur avant/après est affiché.' },
    ],
  },
  reviews: {
    title: 'Avis clientes', status: null,
    cols: [
      ['Cliente', (r) => `<strong>${esc(r.name)}</strong><small>${esc(r.service || '')}</small>`],
      ['Note', (r) => stars(r.rating)], ['Avis', (r) => `<span class="clamp">${esc(r.text)}</span>`], ['Date', (r) => fshort(r.created_at)],
      ['Publié', (r) => yes(r.approved, 'Publié', 'En attente')],
    ],
    actions: (r) => `<button class="btn ${r.approved ? 'btn-ghost' : 'btn-primary'} btn-xs" data-act="toggle-approve">${r.approved ? 'Masquer' : `${icon('check')} Publier`}</button>`,
    create: 'Ajouter un avis',
    form: () => [{ k: 'name', l: 'Nom', req: 1 }, { k: 'service', l: 'Soin / produit' }, { k: 'rating', l: 'Note (1 à 5)', t: 'number', def: 5, min: 1 }, { k: 'text', l: 'Avis', t: 'textarea', req: 1, full: 1 }, { k: 'approved', l: 'Publié', t: 'checkbox', def: 1 }],
  },
  messages: {
    title: 'Messages & rappels', search: true, noCreate: true,
    cols: [
      ['Reçu', (r) => `<strong>${fdatetime(r.created_at)}</strong>`],
      ['Type', (r) => (r.kind === 'rappel' ? `<span class="pill pill--warn">${icon('phone')} À rappeler</span>` : `<span class="pill pill--info">${icon('mail')} Message</span>`)],
      ['Contact', who],
      ['Message', (r) => `<strong>${esc(r.subject || '')}</strong><span class="clamp">${esc(r.message || '')}</span>`],
      ['État', (r) => (r.is_read ? '<span class="pill">Traité</span>' : '<span class="pill pill--bad">Nouveau</span>')],
    ],
    actions: (r) => `${contactBtns(r.phone, `Bonjour ${first(r.name)}, ici ${S().site_name}. Nous revenons vers vous suite à votre message.`)}${r.email ? `<a class="icon-btn sm" href="mailto:${esc(r.email)}" title="Répondre par e-mail">${icon('mail')}</a>` : ''}<button class="btn btn-ghost btn-xs" data-act="toggle-read">${r.is_read ? 'Marquer non lu' : `${icon('check')} Traité`}</button>`,
    detail: (r) => `<div class="kv"><div><span>Nom</span><strong>${esc(r.name)}</strong></div><div><span>Téléphone</span><strong>${esc(r.phone || '—')}</strong></div><div><span>E-mail</span><strong>${esc(r.email || '—')}</strong></div><div><span>Sujet</span><strong>${esc(r.subject || '—')}</strong></div><div class="full"><span>Message</span><strong class="pre">${esc(r.message || '')}</strong></div></div>`,
  },
  users: {
    title: 'Clientes inscrites', search: true, noCreate: true,
    cols: [
      ['Nom', (r) => `<strong>${esc(r.name)}</strong><small>${esc(r.email)}</small>`], ['Téléphone', (r) => esc(r.phone || '—')],
      ['Rôle', (r) => (r.role === 'admin' ? '<span class="pill pill--info">Administratrice</span>' : '<span class="pill">Cliente</span>')],
      ['RDV', (r) => num(r.bookings)], ['Commandes', (r) => num(r.orders)], ['Inscrite le', (r) => fshort(r.created_at)],
    ],
    actions: (r) => contactBtns(r.phone, `Bonjour ${first(r.name)}, ici ${S().site_name} ✨`),
    form: () => [{ k: 'name', l: 'Nom', req: 1 }, { k: 'phone', l: 'Téléphone' }, { k: 'role', l: 'Rôle', t: 'select', opts: [['client', 'Cliente'], ['admin', 'Administratrice (accès complet)']] }],
  },
  newsletter: {
    title: 'Newsletter', noCreate: true, pk: 'email',
    cols: [['E-mail', (r) => `<strong>${esc(r.email)}</strong>`], ['Inscription', (r) => fdatetime(r.created_at)]],
  },
};

/* ================================================================ VUE LISTE */
export async function listView(el, res, query = {}) {
  const cfg = R[res];
  if (!cfg) { el.innerHTML = '<p>Section inconnue.</p>'; return; }
  const st = { status: query.status || '', q: '', course_id: query.course_id || '' };
  const tabs = cfg.status ? [['', 'Tous'], ...Object.entries(STATUS[cfg.status]).map(([k, [l]]) => [k, l])] : null;
  el.innerHTML = `
    <div class="list-head">
      <div class="list-head__l">
        ${cfg.search ? `<label class="search search--sm">${icon('search')}<input type="search" placeholder="Rechercher…" data-q></label>` : ''}
        ${res === 'lessons' ? `<label class="field field--select field--inline"><select data-course><option value="">Toutes les formations</option>${A.opts.courses.map((c) => `<option value="${c.id}" ${String(c.id) === String(st.course_id) ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="list-head__r">
        <a class="btn btn-ghost btn-sm" href="/api/admin/export/${res}" download>${icon('download')} Export Excel (CSV)</a>
        ${cfg.form && !cfg.noCreate ? `<button class="btn btn-primary btn-sm" data-new>${icon('plus')} ${esc(cfg.create || 'Ajouter')}</button>` : ''}
      </div>
    </div>
    ${tabs ? `<div class="stabs" data-tabs>${tabs.map(([k, l]) => `<button class="${k === st.status ? 'active' : ''}" data-s="${k}">${esc(l)}<sup data-c="${k}"></sup></button>`).join('')}</div>` : ''}
    <div class="tbl-wrap card"><div data-table><div class="loading-row"></div><div class="loading-row"></div><div class="loading-row"></div></div></div>`;

  let rows = [];
  const load = async () => {
    const p = new URLSearchParams();
    if (st.q) p.set('q', st.q);
    if (st.course_id) p.set('course_id', st.course_id);
    try { rows = await api(`/api/admin/r/${res}?${p}`); } catch (e) { toast(e.message, 'err'); rows = []; }
    render();
  };
  const render = () => {
    if (tabs) $$('[data-c]', el).forEach((s) => { const n = s.dataset.c ? rows.filter((r) => r.status === s.dataset.c).length : rows.length; s.textContent = n || ''; });
    const list = st.status ? rows.filter((r) => r.status === st.status) : rows;
    const box = $('[data-table]', el);
    if (!list.length) { box.innerHTML = `<div class="empty">${icon('sparkle')}<p>Aucun élément${st.q ? ' pour cette recherche' : ''}.</p></div>`; return; }
    const hasActions = cfg.form || cfg.actions || !cfg.noDelete;
    box.innerHTML = `<table class="tbl"><thead><tr>${cfg.cols.map(([l]) => `<th>${esc(l)}</th>`).join('')}${hasActions ? '<th class="ta-r">Actions</th>' : ''}</tr></thead>
      <tbody>${list.map((r) => `<tr data-id="${esc(r[cfg.pk || 'id'])}" class="${cfg.detail ? 'clickable' : ''} ${r.is_read === 0 || r.status === 'pending' || r.status === 'new' ? 'is-new' : ''}">
        ${cfg.cols.map(([l, f]) => `<td data-label="${esc(l)}">${f(r)}</td>`).join('')}
        ${hasActions ? `<td class="ta-r"><div class="acts">${cfg.actions ? cfg.actions(r) : ''}${cfg.form ? `<button class="icon-btn sm" data-act="edit" title="Modifier">${icon('edit')}</button>` : ''}<button class="icon-btn sm danger" data-act="delete" title="Supprimer">${icon('trash')}</button></div></td>` : ''}
      </tr>`).join('')}</tbody></table>`;
  };

  const find = (id) => rows.find((r) => String(r[cfg.pk || 'id']) === String(id));
  const save = async (id, data, msg = 'Enregistré') => {
    await api(`/api/admin/r/${res}/${id}`, { method: 'PUT', body: data });
    toast(msg);
    A.onChange();
    await load();
  };
  const edit = (row) => {
    const fields = cfg.form(st);
    formModal({
      title: row ? `Modifier — ${row.name || row.title || row.ref || row.code || ''}` : cfg.create || 'Ajouter',
      fields, data: row || {}, size: 'modal--lg',
      extra: cfg.extra || '',
      onMount: res === 'lessons' ? bindVideoUpload : undefined,
      onSubmit: async (data) => {
        if (row) await save(row.id, data);
        else { await api(`/api/admin/r/${res}`, { method: 'POST', body: data }); toast('Créé avec succès'); A.onChange(); await load(); }
      },
    });
  };
  const openDetail = (row) => {
    const m = modal({
      title: row.ref ? `${cfg.title.replace(/s$/, '')} ${row.ref}` : cfg.title, size: 'modal--md',
      html: `${cfg.detail(row)}${res === 'custom_orders' ? `<form class="aform mt" data-quote><div class="aform__grid">
          <label class="field"><input type="number" name="quote" placeholder=" " value="${row.quote ?? ''}"><span>Montant du devis (FCFA)</span></label>
          <label class="field field--select"><select name="status">${statusOpts('custom_orders').map(([v, l]) => `<option value="${v}" ${v === row.status ? 'selected' : ''}>${l}</option>`).join('')}</select><span>Statut</span></label>
          <label class="field full"><textarea name="admin_note" rows="2" placeholder=" ">${esc(row.admin_note || '')}</textarea><span>Message pour la cliente</span></label></div>
          <div class="row-end"><a class="btn btn-gold" data-wa target="_blank" rel="noopener" href="#">${icon('whatsapp')} Envoyer le devis</a><button class="btn btn-primary">${icon('check')} Enregistrer</button></div></form>` : ''}
        <div class="row-wrap mt">${contactBtns(row.phone, '')}</div>`,
    });
    const qf = $('[data-quote]', m.body);
    if (qf) {
      const wa = $('[data-wa]', qf);
      const upd = () => { wa.href = waHref(row.phone, cfg.quoteMsg({ ...row, quote: +qf.quote.value || null, admin_note: qf.admin_note.value })); };
      qf.addEventListener('input', upd); upd();
      qf.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await save(row.id, { quote: qf.quote.value === '' ? null : +qf.quote.value, status: qf.status.value, admin_note: qf.admin_note.value }); m.close(); }
        catch (err) { toast(err.message, 'err'); }
      });
    }
    if (res === 'messages' && !row.is_read) save(row.id, { is_read: true }, 'Message marqué comme traité').catch(() => {});
  };

  el.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-status]');
    if (sel) {
      try { await save(sel.dataset.status, { status: sel.value }, `Statut mis à jour : ${STATUS[cfg.status][sel.value][0]}`); }
      catch (err) { toast(err.message, 'err'); load(); }
    }
    if (e.target.matches('[data-course]')) { st.course_id = e.target.value; location.hash = `#/r/lessons${st.course_id ? '?course_id=' + st.course_id : ''}`; }
  });
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-new]')) return edit(null);
    const tab = e.target.closest('[data-s]');
    if (tab) { st.status = tab.dataset.s; $$('[data-s]', el).forEach((b) => b.classList.toggle('active', b === tab)); return render(); }
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const row = find(tr.dataset.id);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) { if (cfg.detail && !e.target.closest('a, button, select, input')) openDetail(row); return; }
    try {
      if (act === 'edit') return edit(row);
      if (act === 'open') return openDetail(row);
      if (act === 'delete') {
        if (!(await confirmBox('Supprimer définitivement cet élément ? Cette action est irréversible.', { ok: 'Supprimer', danger: true }))) return;
        await api(`/api/admin/r/${res}/${encodeURIComponent(tr.dataset.id)}`, { method: 'DELETE' });
        toast('Supprimé'); A.onChange(); return load();
      }
      if (act === 'approve') return save(row.id, { status: 'active' }, 'Accès activé ✔ Pensez à prévenir l’élève sur WhatsApp');
      if (act === 'reject') return save(row.id, { status: 'rejected' }, 'Paiement refusé');
      if (act === 'toggle-approve') return save(row.id, { approved: !row.approved }, row.approved ? 'Avis masqué' : 'Avis publié');
      if (act === 'toggle-read') return save(row.id, { is_read: !row.is_read });
    } catch (err) { toast(err.message, 'err'); }
  });
  const q = $('[data-q]', el);
  q?.addEventListener('input', debounce(() => { st.q = q.value.trim(); load(); }, 300));
  await load();
  return { reload: load, edit, rows: () => rows };
}

function bindVideoUpload(form) {
  const box = $('.vidup', form);
  if (!box) return;
  const input = $('input[type=file]', box), prog = $('.prog', box), stt = $('.vidup__st', box);
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const { upload } = await import('./admin-kit.js');
    prog.hidden = false;
    stt.textContent = `Envoi de ${file.name} (${(file.size / 1048576).toFixed(1)} Mo)… ne fermez pas cette fenêtre.`;
    try {
      const r = await upload(file, (p) => { $('span', prog).style.width = Math.round(p * 100) + '%'; stt.textContent = `Envoi… ${Math.round(p * 100)} %`; });
      form.elements.video_type.value = 'file';
      form.elements.video_src.value = r.src;
      form.elements.video_src.dispatchEvent(new Event('input'));
      stt.textContent = '✔ Vidéo envoyée. Pensez à enregistrer la leçon.';
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.src = URL.createObjectURL(file);
      v.onloadedmetadata = () => { if (!form.elements.duration.value && v.duration) form.elements.duration.value = Math.max(1, Math.round(v.duration / 60)); URL.revokeObjectURL(v.src); };
    } catch (err) { toast(err.message, 'err'); stt.textContent = ''; }
    prog.hidden = true;
  });
}
