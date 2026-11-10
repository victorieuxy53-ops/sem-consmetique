'use strict';
/** Supprime la base de données (elle sera recréée avec les données initiales au prochain démarrage). */
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
let n = 0;
for (const f of ['institut.sqlite', 'institut.sqlite-wal', 'institut.sqlite-shm']) {
  try { fs.unlinkSync(path.join(dir, f)); n++; } catch { /* absent */ }
}
console.log(n ? '✦ Base supprimée. Relancez « npm start » pour la recréer.' : '✦ Aucune base à supprimer.');
console.log('  (Les fichiers envoyés dans data/uploads et data/videos sont conservés.)');
