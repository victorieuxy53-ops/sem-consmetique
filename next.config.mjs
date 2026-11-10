const dev = process.env.NODE_ENV !== 'production';

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://www.google.com https://maps.google.com',
  `connect-src 'self'${dev ? ' ws:' : ''}`,
  "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  // NB : les accès fichiers dynamiques du serveur (base, photos, vidéos) portent l'indication
  // /* turbopackIgnore: true */ : sans elle, tout le dossier du projet serait embarqué dans chaque fonction Vercel.
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: CSP },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
