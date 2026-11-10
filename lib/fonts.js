import localFont from 'next/font/local';

// Polices hébergées dans le projet (styles/fonts, licence OFL) : le build ne dépend plus du réseau
// (un téléchargement Google Fonts raté faisait échouer `next build`, en local comme sur Vercel).
// Mêmes familles, graisses et sous-ensemble « latin » (accents français compris) qu'avec next/font/google.
const serif = localFont({
  src: [
    { path: '../styles/fonts/cormorant-garamond.woff2', weight: '500 600', style: 'normal' },
    { path: '../styles/fonts/cormorant-garamond-italic.woff2', weight: '500 600', style: 'italic' },
  ],
  variable: '--font-d', display: 'swap', adjustFontFallback: 'Times New Roman',
});
const sans = localFont({ src: '../styles/fonts/jost.woff2', weight: '400 600', variable: '--font-b', display: 'swap', adjustFontFallback: 'Arial' });
// Écriture manuscrite : slogan « Parce que votre peau mérite le meilleur », signature de la fondatrice.
const script = localFont({ src: '../styles/fonts/great-vibes.woff2', weight: '400', variable: '--font-s', display: 'swap', adjustFontFallback: false });

export const fonts = `${serif.variable} ${sans.variable} ${script.variable}`;
