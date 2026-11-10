/**
 * Données initiales : catalogue de démarrage entièrement modifiable depuis l'espace admin.
 */
import { randomBytes } from 'node:crypto';
import * as db from './db.js';
import { hashPassword } from './auth.js';
import { slugify } from './util.js';
import { SEM_GALLERY, SEM_PRODUCTS } from './catalogue-sem.js';

const SERVICES = [
  // [catégorie, nom, accroche, description, prix, durée, tags, vedette]
  ['visage', 'Soin éclat hydratant', 'Une peau repulpée, lumineuse et douce dès la première séance.', 'Démaquillage, gommage enzymatique doux, masque hydratant au karité et à l’aloe vera, massage du visage drainant. Idéal pour les peaux ternes ou déshydratées par la chaleur et la climatisation.', 15000, 60, 'seche,eclat,hydratation,normale,terne', 1],
  ['visage', 'Nettoyage de peau profond', 'Pores désincrustés, grain de peau affiné.', 'Vapeur ozonée, extraction des comédons, masque purifiant à l’argile, lotion astringente et soin matifiant. Recommandé pour peaux grasses, mixtes ou à tendance acnéique.', 20000, 75, 'grasse,acne,mixte', 1],
  ['visage', 'Soin anti-taches unifiant', 'Un teint plus homogène, sans agresser la peau.', 'Protocole progressif aux actifs unifiants (vitamine C, niacinamide, acide azélaïque) pour atténuer taches brunes et marques post-boutons, en respectant la mélanine des peaux noires et métissées.', 25000, 75, 'taches,eclat,terne', 0],
  ['visage', 'Soin anti-âge liftant', 'Fermeté, tonus et éclat retrouvés.', 'Massage liftant manuel, sérum peptidique, masque tenseur et soin du contour des yeux. Un vrai coup d’éclat avant un événement.', 30000, 90, 'rides,eclat', 0],
  ['corps', 'Gommage & enveloppement au karité', 'Peau satinée de la tête aux pieds.', 'Gommage au sucre et à l’huile de coco, enveloppement chaud au beurre de karité pur, modelage nourrissant. La peau est nourrie en profondeur pendant plusieurs jours.', 20000, 60, 'seche,hydratation,corps', 1],
  ['corps', 'Massage relaxant aux huiles chaudes', 'Une parenthèse de détente absolue.', 'Massage complet du corps aux huiles végétales chauffées, manœuvres enveloppantes pour dénouer les tensions et apaiser l’esprit.', 20000, 60, 'detente,corps', 0],
  ['corps', 'Soin minceur & drainage', 'Silhouette affinée, jambes légères.', 'Palper-rouler manuel, drainage lymphatique et enveloppement aux actifs drainants. Cure de 5 séances recommandée.', 25000, 75, 'corps,minceur', 0],
  ['corps', 'Gommage au savon noir', 'Le rituel purifiant traditionnel.', 'Application de savon noir, gommage au gant kessa et rinçage tiède, suivi d’une application de beurre de karité.', 12000, 45, 'corps,grasse', 0],
  ['makeup', 'Maquillage jour / naturel', 'Un teint frais et lumineux, tout en légèreté.', 'Préparation de la peau, teint unifié, regard souligné et lèvres naturelles. Parfait pour un rendez-vous, une photo ou le travail.', 10000, 45, 'makeup', 0],
  ['makeup', 'Maquillage soirée & glamour', 'Un regard intense et un teint sublimé qui tient toute la nuit.', 'Teint haute tenue adapté à votre carnation, contouring, smoky ou cut-crease, faux-cils inclus.', 20000, 60, 'makeup', 1],
  ['makeup', 'Maquillage mariée (essai inclus)', 'Le plus beau jour mérite la perfection.', 'Rendez-vous d’essai pour définir le look, maquillage le jour J, faux-cils, fixation longue tenue et kit de retouche. Déplacement possible sur devis.', 75000, 120, 'makeup,mariage', 1],
  ['makeup', 'Cours d’auto-maquillage', 'Apprenez à vous maquiller comme une pro.', 'Séance individuelle avec vos propres produits : choix du fond de teint, techniques du regard et des lèvres, routine adaptée à votre quotidien.', 25000, 90, 'makeup,formation', 0],
  ['foulard', 'Attache foulard simple', 'Un style élégant pour le quotidien.', 'Nouage de votre foulard ou pagne selon le style de votre choix, avec conseils pour le refaire vous-même.', 3000, 20, 'foulard', 0],
  ['foulard', 'Attache foulard cérémonie (gele)', 'Le gele majestueux des grands jours.', 'Gele structuré et volumineux en tissu rigide ou aso-oke, finitions et épingles décoratives. Idéal pour mariages, dots et baptêmes.', 7000, 30, 'foulard,ceremonie', 1],
  ['foulard', 'Forfait mariage : attache + accessoires', 'Mariée, demoiselles d’honneur, maman : toutes sublimes.', 'Attache foulard cérémonie pour la mariée et ses proches, accessoires assortis, déplacement à domicile possible (sur devis selon le nombre de personnes).', 20000, 60, 'foulard,mariage', 0],
  ['sante', 'Pédicure soin complet', 'Des pieds doux, sains et soignés.', 'Bain relaxant, soin des ongles et cuticules, élimination des callosités, gommage, massage et pose de vernis.', 10000, 60, 'sante,pieds', 0],
  ['sante', 'Manucure & pose vernis', 'Des mains impeccables.', 'Limage, soin des cuticules, massage des mains et pose de vernis classique ou semi-permanent.', 7000, 45, 'sante,mains', 0],
  ['sante', 'Réflexologie plantaire', 'Rééquilibrez votre énergie par les pieds.', 'Stimulation des zones réflexes pour favoriser la détente, le sommeil et la circulation. Ne remplace pas un avis médical.', 15000, 45, 'sante,detente', 0],
  ['dermo', 'Diagnostic de peau personnalisé', 'Comprendre votre peau pour mieux la soigner.', 'Analyse de votre type de peau, de vos préoccupations (taches, acné, sensibilité) et de votre routine actuelle. Vous repartez avec une routine personnalisée écrite.', 5000, 30, 'dermo,tous', 1],
  ['dermo', 'Consultation dermo-conseil & routine', 'Des conseils honnêtes, des produits adaptés.', 'Bilan approfondi, sélection des actifs adaptés, plan de soin sur 3 mois et suivi par WhatsApp. Nous vous orientons vers un dermatologue si nécessaire.', 10000, 45, 'dermo,taches,acne,sensible', 0],
  ['dermo', 'Suivi peau (3 séances)', 'Des résultats visibles, mesurés ensemble.', 'Trois rendez-vous espacés d’un mois : photos comparatives, ajustement de la routine et soin ciblé à chaque séance.', 25000, 45, 'dermo,taches,acne', 0],
];

const COURSES = [
  {
    title: 'L’art de l’attache foulard : 15 styles', subtitle: 'Du nœud du quotidien au gele de cérémonie, maîtrisez chaque style pas à pas.',
    level: 'Débutant', price: 15000, compare: 25000, color: '#b8432f', duration: '2 h 30', featured: 1,
    description: 'Une formation complète et filmée de près pour apprendre à nouer foulards, pagnes et geles avec assurance. Chaque style est décomposé en gestes simples, avec les astuces de pro pour une tenue parfaite toute la journée.',
    learn: 'Choisir le bon tissu selon le style\nMaîtriser les 3 nœuds de base\nRéaliser un gele de cérémonie volumineux\nCréer des styles modernes pour le quotidien\nFixer et accessoiriser comme une pro',
    lessons: [['Bienvenue & choix des tissus', 12, 1], ['Les 3 nœuds de base', 18, 0], ['Le style classique de cérémonie', 25, 0], ['Le gele volumineux', 30, 0], ['Styles modernes du quotidien', 35, 0], ['Fixer et sublimer : épingles & accessoires', 20, 0]],
  },
  {
    title: 'Make-up professionnel : du teint au regard', subtitle: 'Les techniques des maquilleuses professionnelles, adaptées aux peaux noires et métissées.',
    level: 'Intermédiaire', price: 35000, compare: 50000, color: '#7b2d42', duration: '5 h', featured: 1,
    description: 'Apprenez à créer un teint parfait qui ne grise pas, à sculpter le visage et à réaliser des regards intenses. Idéal pour vous perfectionner ou démarrer une activité de maquilleuse.',
    learn: 'Préparer la peau selon son type\nChoisir et matcher son fond de teint\nContouring et highlighting adaptés\nSmoky eyes, cut-crease et pose de faux-cils\nMaquillage mariée longue tenue',
    lessons: [['Introduction & le matériel indispensable', 15, 1], ['Préparer la peau', 25, 0], ['Le teint parfait sans effet gris', 40, 0], ['Sculpter : contouring & highlighting', 35, 0], ['Les sourcils', 25, 0], ['Le regard : smoky & cut-crease', 50, 0], ['La pose de faux-cils', 20, 0], ['Le maquillage de mariée', 45, 0]],
  },
  {
    title: 'Routine soin peau noire & métissée', subtitle: 'Comprendre votre peau, choisir les bons actifs, construire une routine efficace.',
    level: 'Tous niveaux', price: 10000, compare: null, color: '#c08a3e', duration: '1 h 45', featured: 1,
    description: 'Des conseils dermo-cosmétiques clairs et honnêtes pour prendre soin de votre peau au quotidien : taches, acné, hydratation, protection solaire. Sans produits agressifs ni promesses miracles.',
    learn: 'Identifier votre type de peau\nLes actifs qui marchent (et ceux à éviter)\nPrévenir et atténuer les taches\nGérer l’acné et les marques\nConstruire une routine matin & soir',
    lessons: [['Connaître sa peau', 15, 1], ['Nettoyer sans agresser', 18, 0], ['Les actifs anti-taches', 25, 0], ['Acné : les bons réflexes', 22, 0], ['Ma routine sur-mesure', 25, 0]],
  },
  {
    title: 'Démarrer comme esthéticienne à domicile', subtitle: 'Les bases pour lancer une activité rentable et professionnelle.',
    level: 'Avancé', price: 45000, compare: null, color: '#5a2d44', duration: '6 h', featured: 0,
    description: 'Hygiène, protocoles de soins, tarification, fidélisation et communication sur les réseaux : tout ce qu’il faut pour démarrer sereinement.',
    learn: 'Les règles d’hygiène et de sécurité\nProtocoles de soins visage et corps\nFixer ses prix et rentabiliser\nTrouver et fidéliser ses clientes\nCommuniquer sur WhatsApp et Instagram',
    lessons: [['Le métier et ses exigences', 20, 1], ['Hygiène & sécurité', 30, 0], ['Protocole soin visage', 50, 0], ['Protocole soin corps', 45, 0], ['Fixer ses tarifs', 30, 0], ['Trouver ses clientes', 35, 0], ['Fidéliser et se faire recommander', 30, 0]],
  },
];

const POSTS = [
  {
    title: '5 gestes pour une peau éclatante malgré la chaleur', category: 'Routine', color: '#e8a54b', read: 4,
    excerpt: 'Chaleur, humidité, pollution : notre climat met la peau à rude épreuve. Voici les gestes simples qui font vraiment la différence.',
    content: `La chaleur et l’humidité stimulent la production de sébum, tandis que la climatisation déshydrate. Résultat : une peau qui brille et tiraille en même temps. Bonne nouvelle, quelques gestes suffisent à rééquilibrer tout ça.

## 1. Nettoyer en douceur, matin et soir
Un nettoyant doux, sans savon agressif, suffit. Frotter fort ou utiliser des produits trop décapants pousse la peau à produire encore plus de sébum.

## 2. Hydrater, même une peau grasse
C’est l’erreur la plus fréquente. Une peau grasse peut être déshydratée. Choisissez une texture gel ou fluide, non comédogène.

## 3. La protection solaire, tous les jours
Le soleil est la **première cause des taches brunes** sur les peaux noires et métissées. Un SPF 50 sans trace blanche, chaque matin, change tout.

## 4. Exfolier, mais pas trop
Une à deux fois par semaine maximum. Au-delà, vous risquez irritations et taches.

## 5. Boire et bien dormir
L’éclat vient aussi de l’intérieur : eau, fruits, légumes et sommeil réparateur.

Besoin d’une routine adaptée ? Faites notre **diagnostic de peau en ligne** ou prenez rendez-vous pour une consultation dermo-conseil.`,
  },
  {
    title: 'Taches brunes : comprendre et agir sans abîmer sa peau', category: 'Dermo-conseil', color: '#b5838d', read: 6,
    excerpt: 'Hyperpigmentation, marques d’acné, masque de grossesse… Les taches ont plusieurs causes, et surtout des solutions sûres.',
    content: `Les peaux riches en mélanine réagissent fortement à la moindre agression : bouton, frottement, soleil, produit irritant. La peau se défend en produisant plus de pigment, ce qui laisse une tache.

## Ce qu’il faut éviter absolument
- Les produits « éclaircissants » non contrôlés, qui contiennent parfois des corticoïdes ou de l’hydroquinone à forte dose
- Le citron pur ou les mélanges maison sur le visage
- Les gommages agressifs

Ces pratiques peuvent provoquer des taches encore plus sombres, des vergetures ou une peau fragilisée.

## Ce qui fonctionne vraiment
- **La protection solaire** quotidienne : sans elle, aucun traitement ne tient
- **La vitamine C** le matin pour l’éclat
- **La niacinamide** et **l’acide azélaïque** pour unifier progressivement
- **La patience** : comptez 6 à 12 semaines pour des résultats visibles

## Quand consulter ?
Si une tache change de forme, de couleur, saigne ou grandit rapidement, consultez un dermatologue sans attendre. Chez SEM Cosmétique, nous vous orientons toujours vers un médecin quand c’est nécessaire.`,
  },
  {
    title: 'Bien choisir son fond de teint quand on a la peau foncée', category: 'Make-up', color: '#8d5a3b', read: 5,
    excerpt: 'Effet gris, teint orangé, démarcation au niveau du cou… Nos astuces de maquilleuse pour trouver LA bonne teinte.',
    content: `Un fond de teint mal choisi peut ternir le plus beau des maquillages. Voici comment éviter les pièges.

## Identifier son sous-ton
Regardez les veines de votre poignet : plutôt vertes, sous-ton chaud ; plutôt bleues, sous-ton froid ; difficile à dire, sous-ton neutre. Les peaux noires ont souvent un sous-ton chaud, rouge ou doré.

## Tester au bon endroit
Ne testez jamais sur la main. Appliquez trois teintes sur la mâchoire et observez à la lumière du jour : la bonne disparaît dans la peau.

## Le secret : deux teintes
Le centre du visage est souvent plus clair que le contour. Beaucoup de professionnelles mélangent deux teintes pour un résultat naturel.

## Fixer sans griser
Préférez une poudre translucide adaptée aux peaux foncées ou une poudre teintée : les poudres blanches laissent un voile grisâtre en photo.

Envie d’un conseil personnalisé ? Notre **formation make-up professionnelle** détaille chaque étape en vidéo.`,
  },
  {
    title: 'Attache foulard : 3 styles faciles pour débuter', category: 'Attache foulard', color: '#b8432f', read: 3,
    excerpt: 'Le foulard est l’accessoire élégance par excellence. Trois styles simples à maîtriser en quelques minutes.',
    content: `Pas besoin d’être experte pour porter le foulard avec style. Commencez par ces trois attaches.

## Le turban croisé
Placez le foulard sur la nuque, ramenez les pans sur le front, croisez-les puis nouez à l’arrière. Rentrez les pointes : c’est prêt.

## Le chignon enveloppé
Faites un chignon haut, enroulez le foulard autour en partant de la nuque et terminez par un nœud sur le côté.

## Le gele simplifié
Avec un tissu un peu rigide : pliez en triangle, placez la base sur le front, nouez à l’arrière puis remontez et sculptez les pans en éventail.

## L’astuce pro
Un bonnet en satin sous le foulard évite qu’il glisse et protège vos cheveux.

Pour aller plus loin, découvrez notre **formation vidéo complète en 15 styles**, ou venez chez SEM Cosmétique pour un gele de cérémonie.`,
  },
];

const REVIEWS = [
  ['Aïcha D.', 5, 'Mon soin anti-taches a vraiment changé ma peau. Les conseils sont honnêtes, on ne me vend pas n’importe quoi. Je recommande les yeux fermés !', 'Soin anti-taches unifiant'],
  ['Fifamè K.', 5, 'Maquillage de mariée parfait, il a tenu de 8 h du matin jusqu’à la fin de la soirée. Toutes mes invitées m’ont demandé le contact.', 'Maquillage mariée'],
  ['Grâce A.', 5, 'Le gele de ma dot était magnifique ! Rapide, professionnel et tellement élégant. Merci à toute l’équipe.', 'Attache foulard cérémonie'],
  ['Mariam S.', 4, 'Accueil chaleureux, institut très propre. Le massage aux huiles chaudes est un vrai moment de détente.', 'Massage relaxant'],
  ['Nadège H.', 5, 'J’ai suivi la formation vidéo d’attache foulard : les explications sont claires et je réussis enfin mes geles toute seule.', 'Formation attache foulard'],
  ['Sènami T.', 5, 'Diagnostic de peau très complet, je suis repartie avec une routine écrite. Ma peau grasse est enfin équilibrée.', 'Diagnostic de peau'],
];

async function seedIfEmpty() {
  if (db.get('SELECT COUNT(*) n FROM users').n > 0) return false;
  const email = (process.env.ADMIN_EMAIL || 'admin@institut.local').toLowerCase();
  // Données éphémères (Vercel) : la base est recréée à chaque démarrage à froid. Sans ADMIN_PASSWORD, le mot de passe
  // par défaut (publié dans le README) rouvrirait l'admin à chaque fois : on le remplace par un mot de passe aléatoire.
  const locked = !process.env.ADMIN_PASSWORD && db.EPHEMERAL;
  const password = process.env.ADMIN_PASSWORD || (locked ? randomBytes(24).toString('base64url') : 'Admin@2026');
  const hash = await hashPassword(password);
  const t = db.today();

  db.tx(() => {
    db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')", 'Direction', email, hash);
    if (!process.env.ADMIN_PASSWORD && !locked) db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_default_pw', 'true')");

    SERVICES.forEach(([cat, name, short, desc, price, dur, tags, feat], i) =>
      db.run(`INSERT INTO services (slug, category, name, short, description, price, duration, tags, featured, sort) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        slugify(name), cat, name, short, desc, price, dur, tags, feat, i));

    for (const p of SEM_PRODUCTS)
      db.run(`INSERT INTO products (slug, category, name, brand, short, description, usage, price, compare_price, bulk_qty, bulk_price, stock, image, art, color, tags, featured)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, slugify(p.name), p.category, p.name, p.brand, p.short, p.description, p.usage, p.price, p.compare_price,
        p.bulk_qty, p.bulk_price, p.stock, p.image, p.art, p.color, p.tags, p.featured);
    for (const g of SEM_GALLERY) db.run('INSERT INTO gallery (title, category, image, sort) VALUES (?,?,?,?)', g.title, g.category, g.image, g.sort);

    for (const c of COURSES) {
      const r = db.run(`INSERT INTO courses (slug, title, subtitle, description, level, price, compare_price, color, instructor, duration_label, what_you_learn, featured)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, slugify(c.title), c.title, c.subtitle, c.description, c.level, c.price, c.compare, c.color, 'L’équipe SEM Cosmétique', c.duration, c.learn, c.featured);
      c.lessons.forEach(([title, dur, prev], i) =>
        db.run('INSERT INTO lessons (course_id, title, duration, is_preview, sort) VALUES (?,?,?,?,?)', r.lastInsertRowid, title, dur, prev, i));
    }

    const EVENTS = [
      ['Atelier attache foulard spécial fêtes', 'En petit groupe, apprenez 5 styles d’attache pour les cérémonies de fin d’année. Tissus fournis, collation offerte.', 6, '10:00', '12:30', 10000, 12, '#b8432f'],
      ['Masterclass maquillage de mariée', 'Une après-midi intensive pour maîtriser le maquillage longue tenue : préparation, teint, regard et fixation. Destinée aux passionnées et futures pros.', 13, '14:00', '18:00', 25000, 8, '#7b2d42'],
      ['Journée dermo-conseil offerte', 'Venez faire analyser votre peau gratuitement (15 min) et repartez avec des conseils personnalisés. Inscription conseillée.', 20, '09:00', '17:00', 0, 30, '#c08a3e'],
    ];
    for (const [title, desc, d, time, end, price, seats, color] of EVENTS)
      db.run('INSERT INTO events (slug, title, description, date, time, end_time, location, price, seats, color) VALUES (?,?,?,?,?,?,?,?,?,?)',
        slugify(title), title, desc, db.addDays(t, d), time, end, 'Chez SEM Cosmétique', price, seats, color);

    for (const p of POSTS)
      db.run('INSERT INTO posts (slug, title, excerpt, content, category, color, read_time) VALUES (?,?,?,?,?,?,?)', slugify(p.title), p.title, p.excerpt, p.content, p.category, p.color, p.read);

    for (const [name, rating, text, service] of REVIEWS)
      db.run('INSERT INTO reviews (name, rating, text, service, approved) VALUES (?,?,?,?,1)', name, rating, text, service);

    db.run("INSERT INTO promos (code, type, value, min_amount) VALUES ('BIENVENUE10', 'percent', 10, 0)");
    db.run("INSERT INTO promos (code, type, value, min_amount) VALUES ('FIDELE2000', 'fixed', 2000, 15000)");
  });

  console.log('\n  Base de données initialisée.');
  if (locked) console.warn('  Espace admin verrouillé : définissez ADMIN_EMAIL et ADMIN_PASSWORD dans les variables d’environnement de l’hébergeur.\n');
  else {
    console.log(`  Compte administrateur : ${email}  /  ${process.env.ADMIN_PASSWORD ? '(mot de passe défini par ADMIN_PASSWORD)' : password}`);
    console.log('  Pensez à changer ce mot de passe dans Admin › Paramètres.\n');
  }
  return true;
}

export { seedIfEmpty };
