import '@/styles/main.css';
import '@/styles/pages.css';
import '@/styles/sem.css';
import { fonts } from '@/lib/fonts';
import { boot } from '@/lib/server';
import { App } from '@/components/ui';
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

export default async function SiteLayout({ children }) {
  const { settings, user, slides } = await boot();
  return (
    <html lang="fr" className={fonts}>
      <body>
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
