/**
 * Copie automatique de chaque demande (commande, rendez-vous, message…) sur le WhatsApp des DEUX fondatrices,
 * via le service gratuit CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
 * Activation, une seule fois par téléphone : enregistrer le numéro du robot CallMeBot dans ses contacts, lui envoyer
 * « I allow callmebot to send me messages », puis coller la clé reçue dans Admin › Paramètres › WhatsApp de l'équipe.
 * Envoi APRÈS la réponse à la cliente (after) : jamais de ralentissement, et une panne du service ne bloque rien.
 */
import { after } from 'next/server';
import * as db from './db.js';

const KEY = 'callmebot'; // réglage interne (jamais envoyé au navigateur) : { key1, key2 }

export async function getKeys() {
  try { return JSON.parse((await db.get('SELECT value FROM settings WHERE key = ?', KEY))?.value || '{}'); } catch { return {}; }
}
export async function saveKeys(keys) {
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', KEY, JSON.stringify(keys));
}

/** Mise en forme des messages. */
export const fcfa = (n) => `${Math.round(+n || 0).toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;
export const frDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Numéro international sans « + » (indicatif pays ajouté si absent), comme pour les liens WhatsApp. */
function intl(n) {
  const d = String(n || '').replace(/\D/g, ''), cc = String(db.settings().country_code || '229').replace(/\D/g, '');
  return !d ? '' : d.startsWith(cc) && d.length > 10 ? d : cc + d;
}

/** Destinataires configurés : [{ name, phone, key }]. */
export async function team() {
  const s = db.settings(), k = await getKeys();
  return [
    { name: s.whatsapp_name || 'Fondatrice', phone: s.whatsapp, key: k.key1 },
    { name: s.whatsapp2_name || 'Co-fondatrice', phone: s.whatsapp2, key: k.key2 },
  ].filter((m) => m.phone);
}

/** Envoie le message maintenant ; renvoie le détail par destinataire (utilisé par le bouton « Tester »). */
export async function sendNow(text) {
  const out = [];
  for (const m of await team()) {
    if (!m.key) { out.push({ name: m.name, ok: false, error: 'clé CallMeBot non renseignée' }); continue; }
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${intl(m.phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(m.key)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const body = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const ok = r.ok && !/error|invalid|not (?:been )?activated|apikey/i.test(body);
      out.push({ name: m.name, ok, error: ok ? null : body.slice(0, 160) || `HTTP ${r.status}` });
    } catch (e) { out.push({ name: m.name, ok: false, error: e.name === 'TimeoutError' ? 'délai dépassé' : e.message }); }
  }
  return out;
}

/** Copie d'une demande aux fondatrices, après la réponse (sans effet si aucune clé n'est configurée). */
export function notifyTeam(text) {
  const job = async () => {
    try {
      const res = await sendNow(`${text}\n\n— ${db.settings().site_name} (site web)`);
      for (const r of res) if (!r.ok && r.error !== 'clé CallMeBot non renseignée') console.warn('[notification WhatsApp]', r.name, ':', r.error);
    } catch (e) { console.warn('[notification WhatsApp]', e.message); }
  };
  try { after(job); } catch { job(); } // hors requête (scripts) : envoi direct
}
