import { Cormorant_Garamond, Great_Vibes, Jost } from 'next/font/google';

// Seules les graisses réellement utilisées sont chargées (moins de fichiers = affichage plus rapide).
const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-d', display: 'swap' });
const sans = Jost({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-b', display: 'swap' });
// Écriture manuscrite : slogan « Parce que votre peau mérite le meilleur », signature de la fondatrice.
const script = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-s', display: 'swap' });

export const fonts = `${serif.variable} ${sans.variable} ${script.variable}`;
