/**
 * Envoi direct des photos et vidéos depuis le navigateur vers Vercel Blob (stockage permanent en ligne).
 * Le fichier ne transite pas par le serveur : pas de limite de 4,5 Mo des fonctions Vercel, vidéos lourdes acceptées.
 * Ce point d'accès ne fait que délivrer un jeton d'envoi, et seulement à l'administratrice connectée.
 */
import { handleUpload } from '@vercel/blob/client';
import { ready, BLOB } from '@/server/db.js';
import { currentUser } from '@/server/auth.js';
import { parseCookies } from '@/server/http.js';

export const dynamic = 'force-dynamic';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

export async function POST(request) {
  if (!BLOB) return Response.json({ error: 'Stockage Vercel Blob non configuré (BLOB_READ_WRITE_TOKEN absent).' }, { status: 501 });
  try {
    const body = await request.json();
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await ready();
        const user = await currentUser({ cookies: parseCookies(request.headers.get('cookie')) });
        if (user?.role !== 'admin') throw new Error('Accès réservé à l’administration.');
        return { allowedContentTypes: TYPES, maximumSizeInBytes: 500 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => { /* l'adresse est enregistrée par le formulaire de l'admin */ },
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
