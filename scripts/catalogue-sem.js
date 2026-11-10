/**
 * Installe le catalogue SEM Cosmétique dans une base EXISTANTE (sans rien supprimer) :
 *  - ajoute ou met à jour les produits SEM (repérés par leur adresse / slug) ;
 *  - masque les 17 produits de démonstration de la première version (réactivables dans Admin › Produits) ;
 *  - ajoute les photos « coulisses » à la galerie si elles n'y sont pas déjà.
 * Les commandes passées ne sont pas touchées. Relançable sans risque : « npm run catalogue ».
 * (Une nouvelle installation reçoit déjà ce catalogue automatiquement.)
 */
import * as db from '../server/db.js';
import { seedIfEmpty } from '../server/seed.js';
import { slugify } from '../server/util.js';
import { DEMO_PRODUCT_SLUGS, SEM_GALLERY, SEM_PRODUCTS } from '../server/catalogue-sem.js';

await seedIfEmpty();
let added = 0, updated = 0, hidden = 0, photos = 0;

db.tx(() => {
  for (const p of SEM_PRODUCTS) {
    const slug = slugify(p.name);
    const row = db.get('SELECT id FROM products WHERE slug = ?', slug);
    const vals = [p.category, p.name, p.brand, p.short, p.description, p.usage, p.price, p.compare_price, p.bulk_qty, p.bulk_price, p.stock, p.image, p.art, p.color, p.tags, p.featured];
    if (row) {
      // Produit déjà présent : on ne remplace que les textes et photos (prix, stock et visibilité choisis dans l'admin sont conservés).
      db.run(`UPDATE products SET category = ?, name = ?, brand = ?, short = ?, description = ?, usage = ?, image = COALESCE(image, ?), art = ?, color = ?, tags = ?
              WHERE id = ?`, p.category, p.name, p.brand, p.short, p.description, p.usage, p.image, p.art, p.color, p.tags, row.id);
      updated++;
    } else {
      db.run(`INSERT INTO products (slug, category, name, brand, short, description, usage, price, compare_price, bulk_qty, bulk_price, stock, image, art, color, tags, featured)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, slug, ...vals);
      added++;
    }
  }
  for (const slug of DEMO_PRODUCT_SLUGS) hidden += Number(db.run('UPDATE products SET active = 0, featured = 0 WHERE slug = ? AND active = 1', slug).changes);
  for (const g of SEM_GALLERY) {
    if (db.get('SELECT 1 FROM gallery WHERE image = ?', g.image)) continue;
    db.run('INSERT INTO gallery (title, category, image, sort) VALUES (?,?,?,?)', g.title, g.category, g.image, g.sort);
    photos++;
  }
  // Nom de la structure dans les contenus de départ (formations, ateliers, articles).
  db.run("UPDATE courses SET instructor = 'L’équipe SEM Cosmétique' WHERE instructor = 'L’équipe de l’institut'");
  db.run("UPDATE events SET location = 'Chez SEM Cosmétique' WHERE location = 'À l’institut'");
  db.run("UPDATE posts SET content = REPLACE(REPLACE(content, 'En institut, nous vous orientons', 'Chez SEM Cosmétique, nous vous orientons'), 'ou venez en institut pour', 'ou venez chez SEM Cosmétique pour')");
});

console.log(`\n  Catalogue SEM Cosmétique : ${added} produit(s) ajouté(s), ${updated} mis à jour, ${hidden} produit(s) de démonstration masqué(s), ${photos} photo(s) ajoutée(s) à la galerie.`);
console.log('  Pensez à vérifier les prix provisoires dans Admin › Produits.\n');
