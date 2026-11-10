// Vidéos de formation protégées (/media/lesson/:id) : même routeur que l'API.
import { handle } from '@/server/index.js';

export const dynamic = 'force-dynamic';
export const GET = handle, HEAD = handle;
