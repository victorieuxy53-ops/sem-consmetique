/** API de l'institut : enregistre toutes les routes et expose le routeur. */
import './routes/public.js';
import './routes/account.js';
import './routes/admin.js';

export { handle, call } from './http.js';
