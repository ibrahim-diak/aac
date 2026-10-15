# Plateforme Z — Divertissement, Jeux, Cinéma & Curiosités

Bienvenue sur le dépôt officiel de la **Plateforme Z**, une plateforme web native, moderne, sombre et colorée, conçue sans frameworks lourds pour être modifiable simplement dans **VS Code** ou tout éditeur de code.

---

## 1. Architecture du Projet

Le projet respecte scrupuleusement la séparation en technologies web natives (**HTML5**, **CSS3**, **JavaScript ES6**) :

```text
z-platform/
│
├── index.html           # Page Z : Flux vertical de vidéos courtes (style TikTok)
├── jeux.html            # Page Jeux : Mini-jeux jouables, défis quotidiens, badges
├── film.html            # Page Film : 100 fiches de films & séries, canaux Telegram
├── fun.html             # Page Fun : Découvertes scientifiques & questions fascinantes
│
├── css/
│   ├── z.css            # Styles indépendants de la page Z (+ media query 1024px)
│   ├── jeux.css         # Styles de la page Jeux (+ media query 1024px)
│   ├── film.css         # Styles de la page Film (+ media query 1024px)
│   └── fun.css          # Styles de la page Fun (+ media query 1024px)
│
├── js/
│   ├── firebase-config.js # Configuration Firebase (avec mode démo sans crash)
│   ├── auth.js          # Gestion de connexion / profil / XP / synchronisation
│   ├── logic-core.js    # Moteur de recommandation pur & calculs de niveaux
│   ├── z.js             # Logique du lecteur vidéo et chargement des lots
│   ├── jeux.js          # Moteurs des 5 mini-jeux interactifs
│   ├── film.js          # Moteur de recherche, filtres et sous-onglets cinéma
│   └── fun.js           # Lecteur interactif, filtres & synthèse vocale
│
├── data/
│   ├── videos/
│   │   ├── manifest.json   # Manifeste des 125 lots (prêt pour 10 000 vidéos)
│   │   ├── videos-001.json # Premier lot de 50 vidéos réelles vérifiées
│   │   └── videos-002 à 005.json # Lots de continuité progressifs
│   ├── films/
│   │   └── films.json      # 100 fiches complètes de films & chaînes Telegram
│   ├── fun/
│   │   ├── manifest.json   # Manifeste des contenus scientifiques
│   │   ├── fun-001.json    # Questions captivantes & explications complètes
│   │   └── fun-002.json    # Compléments thématiques
│   └── games/
│       └── games.json      # Catalogue, règles, défis et récompenses
│
├── firestore.rules      # Règles de sécurité strictes isolant les utilisateurs
├── firestore.indexes.json
├── firebase.json        # Configuration Firebase Hosting et Firestore
├── lancer-local.bat     # Script de lancement 1-clic pour Windows
└── README.md            # Ce guide complet
```

---

## 2. Lancement en Local sous VS Code

### Méthode 1 : Double-clic sur Windows
Double-cliquez simplement sur le fichier `lancer-local.bat`. Le script détecte automatiquement **Node.js** ou **Python** et ouvre le navigateur à l'adresse `http://localhost:3000`.

### Méthode 2 : Terminal VS Code (Node.js / Vite)
```bash
npm run dev
```
Accédez ensuite à [http://localhost:3000](http://localhost:3000).

### Méthode 3 : Extension "Live Server" de VS Code
Installez l'extension **Live Server** de Ritwick Dey, faites un clic droit sur `index.html` et choisissez **Open with Live Server**.

---

## 3. Configuration de Firebase (Forfait Gratuit Spark)

Le projet fonctionne par défaut en **Mode Autonome / Démo** : toutes les actions (favoris, XP, séries quotidiennes, scores) sont sauvegardées instantanément dans le `localStorage` du navigateur.

Pour activer la synchronisation Cloud multi-appareils avec votre projet Firebase existant :

1. Ouvrez `js/firebase-config.js` dans VS Code.
2. Remplacez l'objet `FIREBASE_CONFIG` par les identifiants de votre console Firebase :
```javascript
export const FIREBASE_CONFIG = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```
3. Dans la console Firebase, activez **Authentication** (Fournisseur *E-mail / Mot de passe*) et **Cloud Firestore** en mode gratuit Spark.
4. Déployez les règles avec la CLI Firebase :
```bash
firebase deploy --only firestore:rules
```

**Préservation des quotas Spark :**
- Aucune écriture n'est effectuée pendant le défilement des vidéos.
- Les historiques temporaires restent en local.
- Seuls les favoris explicites et le profil sont synchronisés.

---

## 4. Comment Ajouter des Contenus

### A. Ajouter des Vidéos (`data/videos/`)
1. Ouvrez `data/videos/videos-001.json` (ou créez le lot suivant `videos-002.json`).
2. Ajoutez un objet vidéo au format suivant :
```json
{
  "id": "vid-051",
  "title": "Titre captivant de la vidéo",
  "embedUrl": "https://www.youtube-nocookie.com/embed/CODE_YOUTUBE?enablejsapi=1&autoplay=1&mute=1&playsinline=1",
  "youtubeId": "CODE_YOUTUBE",
  "sourceUrl": "https://www.youtube.com/watch?v=CODE_YOUTUBE",
  "creator": "Nom de l'artiste",
  "channel": "@chaine",
  "category": "Comédie & Sketchs",
  "duration": 45,
  "thumbnail": "https://img.youtube.com/vi/CODE_YOUTUBE/hqdefault.jpg",
  "keywords": ["humour", "talent", "sketch"],
  "license": "Intégration officielle autorisée",
  "verified": true,
  "likes": 320,
  "commentsCount": 18,
  "shares": 9,
  "description": "Description du sketch..."
}
```
3. Mettez à jour `data/videos/manifest.json` pour ajuster le statut et le compteur de vidéos. Vous pouvez aussi utiliser le bouton **Importer** directement dans l'interface de la page Z !

### B. Ajouter des Films et Séries (`data/films/films.json`)
Ajoutez une fiche dans la liste `"films"` :
```json
{
  "id": "film-101",
  "title": "Nom du film",
  "year": 2024,
  "genre": "Science-Fiction",
  "rating": 8.4,
  "duration": "2h 10min",
  "director": "Nom du réalisateur",
  "synopsis": "Résumé court...",
  "poster": "URL_IMAGE_AFFICHE",
  "legitLink": "https://www.allocine.fr"
}
```

Pour les canaux Telegram cinéma, ajoutez une entrée dans `"telegramCommunities"` avec `name`, `handle`, `url`, `category`, `description` et `members`.

### C. Ajouter des Découvertes Fun (`data/fun/`)
Inspirez-vous de l'esprit pédagogique de *C'est pas sorcier* :
```json
{
  "id": "fun-011",
  "category": "Science du quotidien",
  "question": "Pourquoi la pâte à pain gonfle-t-elle à la cuisson ?",
  "teaser": "De la farine, de l'eau et un grain de magie vivante...",
  "explanation": "Explication pas à pas avec des mots simples et concrets...",
  "complementaryFacts": [
    "Fait complémentaire 1",
    "Fait complémentaire 2"
  ],
  "source": "INRAE / Cité des Sciences",
  "series": "Les phénomènes que tu observes sans les comprendre",
  "readingTime": "2 min",
  "likes": 850
}
```

---

## 5. Tests Unitaires du Cœur Logique
Le moteur de recommandation, le système d'XP et les calculs de séries quotidiennes sont testés sans dépendances externes avec le test runner natif de Node.js :
```bash
node --test test/logic-core.test.js
```
Tous les tests sont validés et garantissent la fiabilité du tri et des calculs mathématiques.
