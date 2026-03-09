# 🏨 Habbo Mini-Site v2

## 🚀 Déploiement sur Railway (recommandé)

### Étape 1 — Prépare GitHub
1. Crée un compte sur https://github.com si tu n'en as pas
2. Crée un **nouveau dépôt** (bouton vert "New")
3. Nomme-le `habbo-site`, laisse tout par défaut, clique "Create repository"
4. Télécharge et installe **GitHub Desktop** : https://desktop.github.com
5. Clone ton dépôt, copie tous les fichiers de ce zip dedans, puis "Commit" et "Push"

### Étape 2 — Déploie sur Railway
1. Va sur https://railway.app et crée un compte (avec ton compte GitHub)
2. Clique **"New Project"** → **"Deploy from GitHub repo"**
3. Sélectionne ton dépôt `habbo-site`
4. Railway détecte automatiquement Node.js et lance le déploiement ✅

### Étape 3 — Ajoute la base de données PostgreSQL
1. Dans ton projet Railway, clique **"New"** → **"Database"** → **"PostgreSQL"**
2. Une fois créée, clique sur la base → onglet **"Variables"**
3. Copie la variable `DATABASE_URL`

### Étape 4 — Configure les variables d'environnement
1. Retourne sur ton service Node.js dans Railway
2. Onglet **"Variables"** → **"New Variable"**
3. Ajoute :
   - `DATABASE_URL` = (la valeur copiée depuis PostgreSQL)
   - `SESSION_SECRET` = (n'importe quelle chaîne secrète, ex: `monSecretHabbo2024`)
   - `NODE_ENV` = `production`

### Étape 5 — Récupère ton URL
1. Onglet **"Settings"** → **"Domains"** → **"Generate Domain"**
2. Tu obtiens une URL du type : `habbo-site-production.up.railway.app`
3. Partage cette URL à tes collègues ! 🎉

---

## 💻 Tester en local

### Prérequis
- Node.js installé
- Une base PostgreSQL locale OU utilise Railway même en dev

### Installation
```
npm install
```

### Variables d'environnement (créer un fichier `.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/habbo
SESSION_SECRET=monSecretLocal
```

### Lancer
```
npm start
```
Ouvre http://localhost:3000

---

## Structure
```
habbo-v2/
├── server.js          ← Serveur Express + API
├── package.json
└── public/
    ├── index.html     ← Page connexion / inscription
    └── dashboard.html ← Dashboard avec code ID
```
