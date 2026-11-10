/**
 * Catalogue SEM Cosmétique : produits réels de la marque (textes repris des étiquettes et affiches).
 * Utilisé par seed.js (nouvelle installation) et scripts/catalogue-sem.js (mise à jour d'une base existante).
 *
 * ⚠ Prix marqués « à confirmer » : provisoires, à ajuster dans Admin › Produits.
 */
export const SEM_PRODUCTS = [
  // Ordre d'insertion = ordre inverse d'affichage (l'accueil trie par « coup de cœur » puis du plus récent au plus ancien).
  {
    name: 'Gel intime Belle V', category: 'bien-etre', short: 'Gel lubrifiant intime hydratant, à l’aloe vera et à la glycérine.',
    description: '**Belle V** est un gel lubrifiant intime hydratant à base d’**aloe vera et de glycérine**, pour plus de confort au quotidien.\n\n- Hydratation intense\n- Protège, adoucit et non collant\n- Sans parfum\n- pH physiologique',
    usage: 'Appliquer une petite quantité sur les zones concernées, autant que nécessaire. Usage externe uniquement.\n\nEn cas d’irritation, interrompre l’utilisation et demander l’avis d’un professionnel de santé.',
    price: 5000, // à confirmer
    art: 'bottle', color: '#9fc9b0', tags: 'intime', featured: 0, image: '/assets/img/sem/belle-v.jpg',
  },
  {
    name: 'Crème correctrice Ciole', category: 'soin-visage', short: 'Peau nette, teint uniforme, éclat naturel.',
    description: 'La crème correctrice **Ciole** aide à corriger les irrégularités du teint pour une **peau plus nette**, un **teint plus uniforme** et un **éclat naturel** retrouvé.\n\nAdaptée à tous types de peaux. Tube de 50 ml.',
    usage: 'Appliquer une noisette sur le visage propre, matin et/ou soir, en massant du centre vers l’extérieur.\n\nLe matin, terminer par une protection solaire : c’est le geste n°1 pour garder un teint uniforme.',
    price: 5000, // à confirmer
    art: 'tube', color: '#7fae9c', tags: 'taches,eclat,acne,tous', featured: 1, image: '/assets/img/sem/creme-correctrice-ciole.jpg',
  },
  {
    name: 'Savon anti-transpiration', category: 'soin-corps', short: 'Fraîcheur, confiance et bien-être au quotidien.',
    description: 'Votre allié pour une peau propre, fraîche et sans taches !\n\n- **Diminue la transpiration** : profitez de vos moments de fraîcheur, sans gêne\n- **Traite l’hyperpigmentation** : une peau plus uniforme et lumineuse\n- **Réduit fortement les mauvaises odeurs** : restez frais et confiant toute la journée\n- **Adapté à tous types de peau** : peaux sensibles, grasses, sèches ou mixtes\n\n100 % naturel, sûr et doux pour votre peau.',
    usage: 'Faire mousser sur peau humide (aisselles, pieds, corps), laisser agir 1 à 2 minutes puis rincer abondamment.\n\nMatin et soir : résultats visibles dès les premières utilisations.',
    price: 2000, bulk_qty: 2, bulk_price: 1800, // tarifs de l'affiche officielle
    art: 'soap', color: '#9bbf4a', tags: 'taches,grasse,corps,sensible,tous', featured: 1, image: '/assets/img/sem/savon-anti-transpiration.jpg',
  },
  {
    name: 'Oil Secret', category: 'soin-visage', short: 'Huile réparatrice & anti-imperfections.',
    description: '**Oil Secret** est l’huile signature de SEM Cosmétique. **Réparatrice et anti-imperfections**, elle aide à apaiser la peau et à lutter contre les imperfections, pour une peau douce, nourrie et lumineuse.\n\nSa texture fluide pénètre facilement et laisse un fini satiné.',
    usage: 'Appliquer 2 à 3 gouttes sur peau propre, le soir de préférence, en massant délicatement jusqu’à absorption. Peut s’utiliser localement sur les zones à imperfections.\n\nÉviter le contour des yeux. Faire un test au creux du coude 48 h avant la première utilisation.',
    price: 5000, // à confirmer
    art: 'oil', color: '#e0b04a', tags: 'acne,taches,eclat,grasse,mixte,tous', featured: 1, image: '/assets/img/sem/oil-secret.jpg',
  },
  {
    name: 'Lait corporel Lucioles', category: 'soin-corps', short: 'Hydratant, apaisant, correcteur et clarifiant.',
    description: 'Le lait corporel **Lucioles** révèle l’éclat naturel de votre peau. Enrichi en **céramides, niacinamide et alpha-arbutine**, il :\n\n- **Hydrate en profondeur**\n- **Unifie le teint et corrige les taches**\n- **Apaise et adoucit la peau**\n- **Protège et renforce la barrière cutanée**\n\nPour tous types de peau.',
    usage: 'Appliquer sur tout le corps après la douche, sur peau propre et légèrement humide, en massant jusqu’à pénétration. Matin et/ou soir.',
    price: 8000, // à confirmer
    art: 'pump', color: '#f2c230', tags: 'seche,hydratation,taches,eclat,corps,sensible,tous', featured: 1, image: '/assets/img/sem/lait-corporel-lucioles.jpg',
  },
].map((p) => ({ brand: 'SEM Cosmétique', bulk_qty: null, bulk_price: null, compare_price: null, stock: null, ...p }));

/** Photos « coulisses » pour la galerie de l'accueil. */
export const SEM_GALLERY = [
  { title: 'Le savon SEM, frappé de notre nom', category: 'Coulisses', image: '/assets/img/sem/savon-sem.jpg', sort: 1 },
  { title: 'Nos soins en préparation', category: 'Coulisses', image: '/assets/img/sem/coulisses-preparation.jpg', sort: 2 },
];

/** Produits de démonstration de la première version (remplacés par le catalogue SEM). */
export const DEMO_PRODUCT_SLUGS = [
  'serum-eclat-vitamine-c', 'creme-hydratante-au-karite', 'gel-nettoyant-purifiant', 'ecran-solaire-spf-50-teinte', 'serum-unifiant-anti-taches',
  'eau-micellaire-apaisante', 'beurre-de-karite-pur', 'savon-noir-traditionnel', 'huile-seche-corps-cheveux', 'gommage-corps-coco-sucre',
  'rouge-a-levres-velours-bordeaux', 'fond-de-teint-fluide-peaux-mates-a-foncees', 'palette-regard-terre-d-afrique', 'mascara-volume-intense',
  'foulard-wax-pret-a-nouer', 'gele-aso-oke-ceremonie', 'coffret-rituel-eclat',
];
