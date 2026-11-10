import path from 'node:path';
import { UPLOAD_DIR } from '@/server/db.js';
import { streamFile } from '@/server/http.js';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };

/** Photos et vidéos d'ambiance envoyées depuis l'admin (dossier plat, noms aléatoires, lecture par plages). */
async function serve(req, { params }) {
  const name = path.basename((await params).path.join('/'));
  const res = streamFile(req, path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name), MIME[path.extname(name).toLowerCase()] || 'application/octet-stream');
  if (res.ok) res.headers.set('Cache-Control', 'public, max-age=2592000, immutable');
  return res;
}
export { serve as GET, serve as HEAD };
