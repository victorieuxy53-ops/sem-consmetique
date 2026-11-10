# Institut de beauté — application web complète

Site vitrine animé + application de gestion pour un institut de beauté :
soins du visage et du corps, cosmetics, make-up, attache foulard, santé et dermo-conseils.

**Aucune dépendance à installer** : Node.js suffit (base de données SQLite intégrée à Node).

---

## 1. Démarrer en 30 secondes

Prérequis : **Node.js 22.13 ou plus récent** (https://nodejs.org).

```bash
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

- `npm run dev` : redémarre automatiquement à chaque modification du code.
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

1. **Nom de l'institut** : le nom « Maison Éclat » est provisoire, remplacez-le par le vrai nom.
2. **Adresse, ville, carte, e-mail, réseaux sociaux.**
3. **Photos** : accueil, à propos, produits, prestations, galerie. Sans photo, des illustrations
   élégantes sont générées automatiquement.
4. **Chiffres clés** (années d'expérience, nombre de clientes, note) : les valeurs de départ sont
   des exemples, indiquez les vrais chiffres.
5. **Avis clientes** : les 6 avis fournis sont des **exemples** à supprimer et remplacer par de vrais
   témoignages (les clientes peuvent aussi en déposer depuis l'accueil, à valider dans *Avis*).
6. **Comptes Mobile Money** : vérifiez les numéros et ajoutez le nom du titulaire.
7. **Tarifs, durées, stocks** : dans *Prestations* et *Produits*.

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

Recommandé : un petit serveur VPS (Ubuntu) avec un nom de domaine.

```bash
# Sur le serveur
git clone <votre-dépôt> institut && cd institut
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
| `DATA_DIR` | Dossier des données (défaut `./data`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Compte admin créé au premier démarrage |
| `TRUST_PROXY=1` | À activer derrière Nginx (adresse IP réelle des visiteurs) |
| `SECURE_COOKIES=1` | À activer en HTTPS |

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
server.js               Serveur HTTP (fichiers, API, compression, sécurité)
server/
  db.js                 Base SQLite, schéma, paramètres par défaut
  http.js               Routeur, cookies, limitation de débit, streaming vidéo
  auth.js               Comptes, mots de passe, sessions
  util.js               Validation, créneaux de réservation, codes promo, images
  seed.js               Catalogue de départ
  routes/public.js      API publique (réservation, boutique, formations, ateliers…)
  routes/account.js     Inscription, connexion, espace client
  routes/admin.js       API d'administration (CRUD, stats, upload, export)
public/
  index.html, admin.html
  assets/css/           main.css (design system), pages.css, admin.css
  assets/js/            app.js (routeur), anim.js (animations), assistant.js, art.js (illustrations),
                        pages/ (site, boutique, réservation, formations), admin*.js
scripts/                demo.js, reset.js
data/                   Créé automatiquement — À SAUVEGARDER
```
