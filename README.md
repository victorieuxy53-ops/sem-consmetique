 # SEM Cosmétique — application web complète

Site vitrine + boutique + application de gestion pour **SEM Cosmétique** (fondatrice : Ella Sodonon) :
soins SEM (huile Oil Secret, lait Lucioles, crème Ciole, savon anti-transpiration, gel Belle V) et institut
(soins du visage et du corps, make-up, attache foulard, santé et dermo-conseils).

### Identité visuelle
- **Couleurs** : bleu nuit `#1b2a5c` (surfaces sombres, boutons) et rose framboise `#d6336f` (accents),
  définies en variables dans `styles/main.css` (`:root`). Sections de marque : `styles/sem.css`.
- **Polices** : Cormorant Garamond (titres), Jost (texte), Great Vibes (slogan et signature manuscrits),
  hébergées dans `styles/fonts/` (licence OFL) : le build ne dépend pas de Google Fonts.
- **Logo** : composant `LogoMark` dans `components/ui.jsx` (feuilles roses + profil féminin) et `public/assets/img/icon.svg`.
- **Photos** : `public/assets/img/sem/` (optimisées, ~800 Ko au total).
- **Catalogue SEM** : `server/catalogue-sem.js`. Sur une base existante : `npm run catalogue`
  (ajoute les produits SEM, masque les produits de démonstration, ne supprime rien).
- **Prix dégressif** : champs « Prix dégressif » d’un produit dans *Admin › Produits*
  (ex. savon : 2 000 FCFA, 1 800 FCFA l’unité dès 2). Appliqué au panier et recalculé côté serveur.

Construit avec **Next.js 16 (App Router) + React 19**. Seules dépendances : `next`, `react`, `react-dom`
(la base SQLite est intégrée à Node).

---

## 1. Démarrer en 30 secondes

Prérequis : **Node.js 22.13 ou plus récent** (https://nodejs.org).

```bash
npm install
npm run build   # compile le site (à refaire après chaque modification du code)
npm start
```

| Adresse | Rôle |
|---|---|
| http://localhost:3000 | Site public |
| http://localhost:3000/admin | Espace administrateur |

Au premier démarrage, la base est créée avec un catalogue de départ (prestations, produits,
formations, ateliers, articles) et un compte administrateur :

- E-mail : `admin@institut.local`
- Mot de passe : `Admin@2026`

> **À faire tout de suite** : *Admin › Paramètres › Sécurité* pour changer l'e-mail et le mot de passe.
> Un bandeau rouge le rappelle tant que ce n'est pas fait.

Autres commandes :

- `npm run dev` : mode développement (rechargement instantané à chaque modification du code).
- `npm run demo` : ajoute des rendez-vous et commandes **fictifs** pour voir le tableau de bord rempli
  (à n'utiliser qu'en test, jamais sur le site en ligne).
- `npm run reset` : efface la base (elle sera recréée au prochain démarrage).

---

## 2. Ce que fait le site

### Côté clientes
- **Accueil animé** : particules dorées, titres révélés mot à mot, cartes 3D, curseur personnalisé,
  défilement parallaxe, transitions entre les pages, compteurs animés, bandeau défilant.
- **Appel direct** : numéros cliquables partout (en-tête, barre mobile, contact, assistante).
- **Assistante virtuelle** (bulle en bas à droite) : répond aux questions fréquentes (tarifs, horaires,
  paiement…), propose d'appeler, d'écrire sur WhatsApp ou d'**être rappelée gratuitement**.
- **Réservation en ligne** en 4 étapes : choix du soin → calendrier avec disponibilités réelles →
  coordonnées → confirmation (référence, ajout à l'agenda du téléphone, confirmation WhatsApp).
  Les créneaux tiennent compte des horaires, de la durée des soins et du nombre de postes.
- **Boutique** : recherche, filtres, panier animé, code promo, livraison ou retrait,
  paiement à la livraison ou par Mobile Money, stock géré automatiquement.
- **Commande sur-mesure** : coffret cadeau, routine de soin, attache foulard ou make-up pour un événement,
  bon cadeau… avec photo d'inspiration et demande de devis.
- **Formations vidéo payantes** : catalogue, leçon d'aperçu gratuite, paiement Mobile Money,
  lecteur avec progression, vidéos protégées (lisibles uniquement par les élèves inscrites).
- **Ateliers** avec places limitées (barre de remplissage, « complet » automatique).
- **Diagnostic de peau** en 6 questions : profil, conseils et produits/soins recommandés.
- **Conseils beauté** (blog), **suivi** de commande / rendez-vous par référence, **espace client**.
- Application installable sur téléphone (PWA, en HTTPS).

### Côté patronne (`/admin`)
- **Tableau de bord** : chiffre d'affaires, rendez-vous du jour, tâches à traiter, graphique 30 jours,
  prestations les plus demandées, stock faible, remplissage des ateliers.
- **Notifications en direct** : son et pastille à chaque nouvelle réservation, commande, paiement ou message.
- **Agenda semaine** : clic sur un créneau vide = nouveau rendez-vous (pratique pour les réservations
  par téléphone) ; clic sur un rendez-vous = confirmer, appeler, envoyer la confirmation WhatsApp.
- Gestion complète : rendez-vous, commandes, sur-mesure (devis envoyé sur WhatsApp), paiements de
  formations (bouton **Valider** pour ouvrir l'accès), formations et leçons (envoi de vidéos),
  ateliers et inscriptions, prestations, produits, galerie avant/après, avis, messages et rappels,
  clientes, newsletter, codes promo, articles.
- **Export Excel (CSV)** de chaque liste.
- **Paramètres** : nom, textes, photos, téléphones, WhatsApp, adresse, carte Google Maps, réseaux,
  horaires, jours de fermeture, capacité, comptes Mobile Money, frais de livraison, chiffres clés.

---

## 3. Personnaliser (sans toucher au code)

Tout se fait dans **Admin › Paramètres** et dans les rubriques du menu :

1. **Identité** : nom, slogan, textes d’accueil et bloc « La fondatrice » (nom, titre, citation, photo).
2. **Adresse, ville, carte, e-mail, réseaux sociaux.**
3. **Photos** : accueil, à propos, produits, prestations, galerie. Sans photo, des illustrations
   élégantes sont générées automatiquement.
4. **Chiffres clés** (années d'expérience, nombre de clientes, note) : les valeurs de départ sont
   des exemples, indiquez les vrais chiffres.
5. **Avis clientes** : les 6 avis fournis sont des **exemples** à supprimer et remplacer par de vrais
   témoignages (les clientes peuvent aussi en déposer depuis l'accueil, à valider dans *Avis*).
6. **Comptes Mobile Money** : vérifiez les numéros et ajoutez le nom du titulaire.
7. **Tarifs, durées, stocks** : dans *Prestations* et *Produits*. Les prix d’Oil Secret, Lucioles, Ciole et
   Belle V sont **provisoires** (seul le savon a son prix officiel) : à confirmer avec la cliente.

---

## 4. Paiements

Le site fonctionne dès maintenant avec le **Mobile Money manuel**, le mode le plus courant au Bénin :

1. la cliente envoie le montant sur le numéro MTN MoMo / Moov Money affiché ;
2. elle saisit la référence de la transaction ;
3. la patronne vérifie sur son téléphone puis clique **Valider** dans *Paiements formations*
   (l'accès à la formation s'ouvre immédiatement) ou change le statut de la commande.

Évolution possible : brancher une passerelle de paiement automatique (FedaPay, KKiaPay…)
pour valider les paiements sans intervention. Il faudra un compte marchand et ses clés API.

---

## 5. Vidéos des formations

Pour chaque leçon (*Admin › Leçons vidéo*), deux possibilités :

- **Envoyer un fichier MP4** depuis le formulaire : la vidéo est stockée sur le serveur et protégée
  (lecture réservée aux élèves dont le paiement est validé, téléchargement direct impossible).
- **Coller un lien YouTube « non répertorié »** ou Vimeo : idéal si l'hébergement a peu d'espace disque.

Cochez « Aperçu gratuit » sur la première leçon pour donner envie d'acheter.

---

## 6. Mettre le site en ligne

Deux possibilités, selon le besoin :

| | Vercel | Serveur VPS (ou Railway / Render avec disque) |
|---|---|---|
| Site public, boutique, demandes → WhatsApp | ✅ | ✅ |
| Modifications faites dans `/admin` (prix, produits, photos, paramètres) | ⚠️ **perdues** au redémarrage | ✅ conservées |
| Commandes, rendez-vous, messages enregistrés dans l’admin | ⚠️ **perdus** au redémarrage | ✅ conservés |
| Coût / mise en route | gratuit, en 2 minutes | quelques €/mois, plus technique |

### 6.1 Vercel (vitrine + WhatsApp)

Sur Vercel, le dossier du projet est en **lecture seule** : la base SQLite est créée dans `/tmp`,
**recréée à chaque démarrage à froid** (catalogue SEM, textes et réglages par défaut du code).
Toutes les demandes des clientes arrivent sur WhatsApp, donc le site reste pleinement utilisable ;
en revanche, les changements de contenu se font **dans le code** (`server/catalogue-sem.js`,
`server/db.js` › `DEFAULT_SETTINGS`) puis par un nouveau déploiement. Un bandeau le rappelle dans l’admin.

1. Poussez le dépôt sur GitHub, puis *Vercel › Add New › Project* et importez-le
   (framework **Next.js** détecté, commandes par défaut : `npm install`, `next build`).
2. *Settings › Environment Variables* : `ADMIN_EMAIL` et `ADMIN_PASSWORD` (sans elles, `/admin` est
   verrouillé par un mot de passe aléatoire), et éventuellement `SITE_URL` (voir `.env.example`).
3. *Settings › General › Node.js Version* : **22.x** ou plus récent (module `node:sqlite` requis).
4. Déployez. `TRUST_PROXY` et `SECURE_COOKIES` sont activés automatiquement sur Vercel.

> Pour un back-office permanent sur Vercel, il faudrait remplacer SQLite par une base hébergée
> (Turso, Vercel Postgres…) et les envois de photos par Vercel Blob : c’est une évolution à part entière.

### 6.2 Serveur VPS (données permanentes)

Recommandé pour utiliser pleinement l’admin : un petit serveur VPS (Ubuntu) avec un nom de domaine.

```bash
# Sur le serveur
git clone <votre-dépôt> institut && cd institut
npm ci && npm run build
ADMIN_EMAIL=patronne@votredomaine.com ADMIN_PASSWORD='MotDePasseTrèsSolide!' \
TRUST_PROXY=1 SECURE_COOKIES=1 PORT=3000 npm start
```

Pour un fonctionnement permanent, utilisez un gestionnaire de processus (`pm2`, `systemd`) et placez
**Nginx** devant Node avec un certificat HTTPS gratuit (Let's Encrypt). Exemple Nginx :

```nginx
server {
  server_name votredomaine.com;
  client_max_body_size 4G;          # envoi des vidéos de formation
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_request_buffering off;
  }
}
```

Variables d'environnement :

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute (défaut 3000) |
| `DATA_DIR` | Dossier des données (défaut `./data` ; `/tmp` sur Vercel ; repli automatique sur le dossier temporaire s'il n'est pas accessible en écriture) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Compte admin créé au premier démarrage (indispensables en ligne) |
| `SITE_URL` | Adresse publique du site, pour les aperçus de partage (détectée seule sur Vercel) |
| `TRUST_PROXY=1` | À activer derrière Nginx (adresse IP réelle des visiteurs, utilisée par la limitation des tentatives). Automatique sur Vercel |
| `SECURE_COOKIES=1` | À activer en HTTPS. Automatique sur Vercel |

Modèle complet et commenté : **`.env.example`**.

### Sauvegardes
Toutes les données sont dans le dossier **`data/`** (base `institut.sqlite`, photos `uploads/`,
vidéos `videos/`). Copiez ce dossier régulièrement (idéalement chaque jour) vers un autre support.

---

## 7. Sécurité intégrée

Mots de passe chiffrés (scrypt), sessions en cookie HttpOnly, protection CSRF, limitation des
tentatives (connexion, formulaires), en-têtes de sécurité (CSP, nosniff, anti-iframe), contrôle des
fichiers envoyés, vidéos servies uniquement aux élèves autorisées, prix et stocks toujours recalculés
côté serveur.

---

## 8. Structure du projet

```
app/                    Routes Next.js (App Router)
  (site)/               Site public : une page = un dossier (rendu serveur, SEO, métadonnées)
  (admin)/admin/        Espace administrateur (tableau de bord, agenda, listes, paramètres)
  api/, media/          Route handlers → routeur métier de server/ (API JSON, vidéos protégées)
  uploads/              Photos envoyées (data/uploads)
components/
  ui.jsx                Composants partagés : icônes, illustrations, cartes, champs, modales, toasts
  chrome.jsx            En-tête, panier, pied de page, effets globaux (préchargeur, rideau, curseur)
  assistant.jsx         Assistante virtuelle
  views/                Pages : site, boutique, réservation, formations & espace client
  admin/                Administration : kit (champs, graphiques), ressources (listes), app
lib/
  core.js               Formatage, catalogue, appels API, stores (panier, toasts, modales)
  fx.js                 Moteur d'animation (révélations, 3D, parallaxe, particules, confettis)
  server.js             Accès aux données depuis les Server Components
server/                 Logique métier (inchangée) : SQLite, auth, validation, créneaux, routes API
styles/                 main.css (design system), pages.css, sem.css (sections de marque), admin.css
instrumentation.js      Crée la base et le catalogue au démarrage
scripts/                demo.js, reset.js, catalogue-sem.js
data/                   Créé automatiquement — À SAUVEGARDER (non versionné)
.env.example            Variables d'environnement documentées
.vercelignore           Fichiers exclus d'un déploiement « vercel » en ligne de commande
```
