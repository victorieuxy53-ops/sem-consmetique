'use client';
/* Habillage du site : en-tête, menu mobile, tiroir panier, pied de page, barre mobile, effets globaux. */
import { useEffect, useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, cart, cx, hasBulk, lockScroll, money, openStatus, phones, setNavigator, telHref, ui, unitPrice, useCart, useStore, waMain, address } from '@/lib/core';
import { install, refresh } from '@/lib/fx';
import { Brand, Icon, OpenDot, ProductVisual, Split, Qty, useApp } from './ui';

const NAV = [['/', 'Accueil'], ['/a-propos', 'À propos'], ['/prestations', 'Prestations'], ['/boutique', 'Boutique'], ['/formations', 'Formations']];
const MORE = [
  ['/ateliers', 'Ateliers & places', 'ticket', 'Réservez votre place aux prochains ateliers'],
  ['/sur-mesure', 'Commande sur-mesure', 'gift', 'Coffrets, soins, foulards personnalisés'],
  ['/diagnostic', 'Diagnostic de peau', 'drop', 'Votre routine idéale en 1 minute'],
  ['/conseils', 'Conseils beauté', 'book', 'Les dermo-conseils de nos expertes'],
  ['/suivi', 'Suivre ma demande', 'truck', 'Commande, rendez-vous, sur-mesure'],
];
const close = () => ui.set({ cart: false, menu: false });

/* ================================================================ EN-TÊTE */
export function Header() {
  const { user } = useApp();
  const path = usePathname();
  const { menu } = useStore(ui);
  const n = cart.count(useCart());
  const tel = phones()[0];
  const active = (h) => ((h === '/' ? path === '/' : path.startsWith(h)) ? 'active' : undefined);
  useEffect(() => { document.body.classList.toggle('menu-open', menu); }, [menu]);
  const links = [...NAV, ...MORE, ['/contact', 'Contact'], ['/compte', 'Mon compte']];
  return (
    <header id="header">
      <div className="hdr">
        <Brand />
        <nav className="nav" aria-label="Navigation principale">
          {NAV.map(([h, l]) => <a key={h} href={h} className={active(h)}>{l}</a>)}
          <div className="nav__more">
            <button className="nav__more-btn" aria-haspopup="true">Découvrir <Icon n="chevD" /></button>
            <div className="nav__drop">{MORE.map(([h, l, i, d]) => <a key={h} href={h} className={active(h)}><span className="nav__drop-ic"><Icon n={i} /></span><span><strong>{l}</strong><small>{d}</small></span></a>)}</div>
          </div>
          <a href="/contact" className={active('/contact')}>Contact</a>
        </nav>
        <div className="hdr__actions">
          {tel && <a href={telHref(tel)} className="hdr__call" data-external aria-label={`Appeler le ${tel}`}><span className="hdr__call-ic"><Icon n="phone" /></span><span className="hdr__call-txt"><small>Appelez-nous</small>{tel}</span></a>}
          <a href="/compte" className={cx('icon-btn', user && 'logged')} aria-label="Mon compte" data-nav-account><Icon n="user" /></a>
          <button className="icon-btn cart-btn" aria-label="Ouvrir le panier" onClick={() => ui.set({ cart: true, menu: false })}><Icon n="bag" /><span className="cart-count" hidden={!n}>{n}</span></button>
          <a href="/reservation" className="btn btn-primary btn-sm hdr__book">Réserver</a>
          <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={() => ui.set((v) => ({ ...v, menu: !v.menu }))}><span /><span /><span /></button>
        </div>
      </div>
      <div className="mnav" aria-hidden={!menu}>
        <div className="mnav__bg" />
        <div className="mnav__inner">
          <nav className="mnav__links">{links.map(([h, l], i) => <a key={h} href={h} style={{ '--i': i }} className={active(h)}>{l}</a>)}</nav>
          <div className="mnav__foot">
            {phones().map((p) => <a key={p} href={telHref(p)} data-external className="btn btn-light btn-sm"><Icon n="phone" /> {p}</a>)}
            <a href={waMain('Bonjour, je souhaite un renseignement.')} target="_blank" rel="noopener" className="btn btn-gold btn-sm"><Icon n="whatsapp" /> WhatsApp</a>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ========================================================== TIROIR PANIER */
export function CartDrawer() {
  const items = useCart();
  const { cart: open } = useStore(ui);
  useEffect(() => lockScroll('cart', open), [open]);
  return (
    <aside id="cart-drawer" className={cx('drawer', open && 'open')} aria-label="Panier">
      <div className="drawer__backdrop" onClick={close} />
      <div className="drawer__panel">
        <div className="drawer__head"><h3>Votre panier <span className="muted">({cart.count(items)})</span></h3><button className="icon-btn" onClick={close} aria-label="Fermer"><Icon n="x" /></button></div>
        <div className="drawer__body">
          {items.length ? items.map((i) => (
            <div className="ci" key={i.id}>
              <ProductVisual p={i} className="ci__v" />
              <div className="ci__info"><a href={`/boutique/${i.slug}`}>{i.name}</a>
                <span className="ci__price">{unitPrice(i, i.qty) < i.price ? <><s>{money(i.price)}</s> <span className="ok">{money(unitPrice(i, i.qty))}</span></> : money(i.price)}{hasBulk(i) && i.qty < i.bulk_qty && <small className="bulk-hint"> · dès {i.bulk_qty} : {money(i.bulk_price)}/u</small>}</span>
                <Qty sm value={i.qty} set={(q) => cart.set(i.id, q)} /></div>
              <button className="icon-btn ci__del" onClick={() => cart.remove(i.id)} aria-label="Retirer"><Icon n="trash" /></button>
            </div>
          )) : <div className="empty"><Icon n="bag" /><p>Votre panier est vide.</p><a href="/boutique" className="btn btn-primary btn-sm">Découvrir la boutique</a></div>}
        </div>
        {items.length > 0 && (
          <div className="drawer__foot">
            <div className="row-between"><span>Sous-total</span><strong className="big-price">{money(cart.total(items))}</strong></div>
            <p className="muted small">Livraison et codes promo calculés à l’étape suivante.</p>
            <a href="/panier" className="btn btn-primary btn-block">Commander <Icon n="arrow" /></a>
            <a href={waMain('Bonjour, je souhaite commander : ' + items.map((i) => `${i.qty} × ${i.name}`).join(', '))} target="_blank" rel="noopener" className="btn btn-ghost btn-block"><Icon n="whatsapp" /> Commander via WhatsApp</a>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ========================================================= PIED DE PAGE */
export function Footer() {
  const { s } = useApp();
  const st = openStatus();
  const social = [['facebook', s.facebook], ['instagram', s.instagram], ['tiktok', s.tiktok]].filter(([, u]) => /^https?:\/\//.test(u || ''));
  return (
    <footer id="footer">
      <div className="ft">

        <div className="container">
          <div className="ft__cta" data-reveal>
            {s.slogan && <p className="ft__slogan script">{s.slogan}</p>}
            <Split className="h2 light" text="Prête à *vous sublimer* ?" />
            <div className="ft__cta-btns">
              <a href="/reservation" className="btn btn-gold btn-lg"><Icon n="calendar" /> Prendre rendez-vous</a>
              <a href={waMain('Bonjour, je souhaite prendre rendez-vous.')} target="_blank" rel="noopener" className="btn btn-outline-light btn-lg"><Icon n="whatsapp" /> WhatsApp</a>
            </div>
          </div>
          <div className="ft__grid">
            <div className="ft__brand">
              <Brand light />
              <p>Huiles, laits, crèmes et savons {s.site_name}, et des soins dédiés à votre beauté : visage & corps, make-up, attache foulard et dermo-conseils.</p>
              {social.length > 0 && <div className="ft__social">{social.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noopener" aria-label={n}><Icon n={n} /></a>)}</div>}
            </div>
            <div><h4>Explorer</h4><ul>{[...NAV.slice(1), ['/ateliers', 'Ateliers'], ['/conseils', 'Conseils beauté']].map(([h, l]) => <li key={h}><a href={h}>{l}</a></li>)}</ul></div>
            <div><h4>Services</h4><ul>
              {[['/reservation', 'Prendre rendez-vous'], ['/sur-mesure', 'Commande sur-mesure'], ['/diagnostic', 'Diagnostic de peau'], ['/suivi', 'Suivre ma demande'], ['/compte', 'Mon espace']].map(([h, l]) => <li key={h}><a href={h}>{l}</a></li>)}
            </ul></div>
            <div><h4>Contact</h4><ul className="ft__contact">
              {phones().map((p) => <li key={p}><a href={telHref(p)} data-external><Icon n="phone" /> {p}</a></li>)}
              <li><a href={waMain('Bonjour !')} target="_blank" rel="noopener"><Icon n="whatsapp" /> WhatsApp</a></li>
              {s.email && <li><a href={`mailto:${s.email}`} data-external><Icon n="mail" /> {s.email}</a></li>}
              {address() && <li><span><Icon n="pin" /> {address()}</span></li>}
              <li><OpenDot on={st.open} /> {st.label}</li>
            </ul></div>
            <div className="ft__news"><h4>Restez informée</h4><p>Nouveautés, ateliers et offres réservées, directement sur WhatsApp.</p>
              <a href={waMain(`Bonjour, je souhaite recevoir les nouveautés et les offres de ${s.site_name} sur WhatsApp.`)} target="_blank" rel="noopener" className="btn btn-wa btn-sm"><Icon n="whatsapp" /> Recevoir les nouveautés</a></div>
          </div>
          <div className="ft__bottom"><span>© {new Date().getFullYear()} {s.site_name}. Tous droits réservés.</span><span><a href="/admin" data-external>Espace pro</a></span></div>
        </div>

      </div>
    </footer>
  );
}

/* ================================================== BARRE D'ACTIONS MOBILE */
export function MobileBar() {
  const tel = phones()[0];
  return (
    <div className="mbar">
      {tel && <a href={telHref(tel)} data-external><Icon n="phone" /><span>Appeler</span></a>}
      <a href={waMain('Bonjour, je souhaite un renseignement.')} target="_blank" rel="noopener"><Icon n="whatsapp" /><span>WhatsApp</span></a>
      <a href="/reservation" className="mbar__main"><Icon n="calendar" /><span>Réserver</span></a>
      <a href="/boutique"><Icon n="bag" /><span>Boutique</span></a>
      <a href="/compte"><Icon n="user" /><span>Compte</span></a>
    </div>
  );
}

/* ====================================================== EFFETS GLOBAUX
   Navigation côté client (liens internes), préchargement au survol
   et (re)branchement automatique des apparitions au défilement sur le contenu. */
export function FX() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const navigating = useRef(false);

  useEffect(() => {
    install();
    const main = document.getElementById('app');
    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => refresh(document.body)); };
    const mo = new MutationObserver(schedule);
    for (const el of [main, document.getElementById('footer')]) el && mo.observe(el, { childList: true, subtree: true });
    schedule();

    const go = (href, { replace = false } = {}) => {
      close();
      navigating.current = true;
      start(() => (replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })));
    };
    setNavigator(go);
    const internal = (a) => {
      const href = a?.getAttribute('href');
      if (!href || a.target || a.hasAttribute('download') || a.hasAttribute('data-external')) return null;
      return href.startsWith('/') && !href.startsWith('//') && !/^\/(admin|api|uploads|media)(\/|$|\?)/.test(href) ? href : null;
    };
    const onClick = (e) => {
      const a = e.target.closest('a[href]'), href = internal(a);
      if (!href || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const url = new URL(href, location.origin);
      if (url.pathname === location.pathname && url.search === location.search) {
        close();
        return url.hash ? document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' }) : scrollTo({ top: 0, behavior: 'smooth' });
      }
      go(href);
    };
    const seen = new Set();
    const onHover = (e) => { const href = internal(e.target.closest?.('a[href]')); if (href && !seen.has(href)) { seen.add(href); router.prefetch(href); } };
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onHover, { passive: true });

    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => { mo.disconnect(); document.removeEventListener('click', onClick); document.removeEventListener('pointerover', onHover); };
  }, [router]);

  // Fin de navigation : retour en haut (ou sur l'ancre).
  useEffect(() => {
    if (pending || !navigating.current) return;
    navigating.current = false;
    const h = location.hash && document.querySelector(location.hash);
    h ? h.scrollIntoView() : scrollTo(0, 0);
    document.getElementById('app')?.focus({ preventScroll: true });
  }, [pending]);

  // Barre de chargement : montre que le clic est pris en compte pendant que la page suivante arrive.
  return <div className={cx('navprog', pending && 'on')} role="progressbar" aria-hidden={!pending} aria-label="Chargement de la page" />;
}

export { DarkHeader } from './ui';

