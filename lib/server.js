/* Accès aux données depuis les Server Components : appel direct du routeur, avec les cookies de la requête. */
import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { call } from '@/server/index.js';

export async function load(path) {
  const jar = Object.fromEntries((await cookies()).getAll().map((c) => [c.name, c.value]));
  try { return await call(path, jar); }
  catch (e) { if (e.status === 404) notFound(); throw e; }
}

/** Paramètres du site + utilisatrice connectée (mutualisé sur la requête). */
export const boot = cache(() => load('/api/bootstrap'));
