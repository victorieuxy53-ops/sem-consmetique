/**
 * Envoi direct des photos et vidéos depuis le navigateur vers Vercel Blob (stockage permanent en ligne).
 * Le fichier ne transite pas par le serveur : pas de limite de 4,5 Mo des fonctions Vercel, vidéos lourdes acceptées.
 * Ce point d'accès ne fait que délivrer une autorisation d'envoi, et seulement à l'administratrice connectée.
 * Deux modes selon la façon dont le stockage est relié au projet (voir BLOB_MODE dans server/db.js) :
 *  - « token » (BLOB_READ_WRITE_TOKEN) : jeton client classique (handleUpload) ;
 *  - « presigned » (BLOB_STORE_ID, stockages récents sans jeton) : adresse d'envoi pré-signée (handleUploadPresigned).
 */
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client';
import { issueSignedToken } from '@vercel/blob';
import { ready, BLOB, BLOB_MODE } from '@/server/db.js';
import { currentUser } from '@/server/auth.js';
import { parseCookies } from '@/server/http.js';

export const dynamic = 'force-dynamic';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX = 500 * 1024 * 1024;
const PATH = /^(photos|videos|lecons)\/[\w.-]{1,90}$/; // noms produits par components/admin/kit.jsx

async function requireAdmin(request) {
  await ready();
  const user = await currentUser({ cookies: parseCookies(request.headers.get('cookie')) });
  if (user?.role !== 'admin') throw new Error('Accès réservé à l’administration.');
}

export async function POST(request) {
  if (!BLOB) return Response.json({ error: 'Stockage Vercel Blob non configuré (ni BLOB_READ_WRITE_TOKEN ni BLOB_STORE_ID).' }, { status: 501 });
  try {
    const body = await request.json();
    if (BLOB_MODE === 'presigned') {
      return Response.json(await handleUploadPresigned({
        body,
        request,
        getSignedToken: async (pathname) => {
          await requireAdmin(request);
          if (!PATH.test(pathname)) throw new Error('Nom de fichier refusé.');
          const limits = { allowedContentTypes: TYPES, maximumSizeInBytes: MAX };
          return { token: await issueSignedToken({ pathname, operations: ['put'], ...limits }), urlOptions: limits };
        },
      }));
    }
    return Response.json(await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await requireAdmin(request);
        return { allowedContentTypes: TYPES, maximumSizeInBytes: MAX, addRandomSuffix: true };
      },
      onUploadCompleted: async () => { /* l'adresse est enregistrée par le formulaire de l'admin */ },
    }));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
