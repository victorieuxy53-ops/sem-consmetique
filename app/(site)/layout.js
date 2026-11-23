import '@/styles/main.css';
import '@/styles/pages.css';
import '@/styles/sem.css';
import '@/styles/motion.css';
import { fonts } from '@/lib/fonts';
import { boot } from '@/lib/server';
import { App, LogoMark } from '@/components/ui';
import { CartDrawer, Footer, FX, Header, MobileBar } from '@/components/chrome';
import { Assistant } from '@/components/assistant';

export const viewport = { themeColor: '#1b2a5c', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

/** Adresse publique du site (aperçus de partage WhatsApp / Facebook) : SITE_URL, sinon le domaine fourni par Vercel. */
const SITE_URL = process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  || `http://localhost:${process.env.PORT || 3000}`;

export async function generateMetadata() {
  const { settings: s, slides = [] } = await boot();
  const title = `${s.site_name} | ${s.tagline}`;
  const image = slides[0]?.image;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${s.site_name}` },
    description: s.hero_sub,
    manifest: '/manifest.webmanifest',
    icons: { icon: '/assets/img/icon.svg', apple: '/assets/img/icon.svg' },
    openGraph: { title, description: s.hero_sub, type: 'website', locale: 'fr_FR', siteName: s.site_name, ...(image && { images: [image] }) },
  };
}

/** Intro de marque : seulement à la première arrivée sur l'accueil pendant une visite (et jamais si la visiteuse
    préfère réduire les animations). Ce script s'exécute avant le premier affichage : aucun clignotement. */
const INTRO = `try{var d=document.documentElement;if(location.pathname==='/'&&!sessionStorage.getItem('sem-intro')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('has-intro');sessionStorage.setItem('sem-intro','1');setTimeout(function(){d.classList.remove('has-intro')},3200)}}catch(e){}`;

export default async function SiteLayout({ children }) {
  const { settings, user, slides } = await boot();
  const words = String(settings.site_name || 'SEM Cosmétique').trim().split(/\s+/);
  return (
    <html lang="fr" className={fonts} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: INTRO }} />
        <div className="intro" aria-hidden="true">
          <LogoMark />
          <p className="intro__name">{words.length > 1 ? <>{words.slice(0, -1).join(' ')} <em>{words.at(-1)}</em></> : <em>{words[0]}</em>}</p>
          {settings.tagline && <p className="intro__tag">{settings.tagline}</p>}
          <span className="intro__line" />
        </div>
        <App settings={settings} user={user} slides={slides}>
          <FX />
          <a className="skip" href="#app">Aller au contenu</a>
          <Header />
          <main id="app" tabIndex={-1}>{children}</main>
          <Footer />
          <CartDrawer />
          <MobileBar />
          <Assistant />
        </App>
      </body>
    </html>
  );
}
