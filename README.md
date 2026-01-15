# 🎮 MaqzbenzWeb - Portfolio Personnel

![Version](https://img.shields.io/badge/version-1.0.0-purple)
![License](https://img.shields.io/badge/license-MIT-blue)
![Docker](https://img.shields.io/badge/docker-ready-green)

> Site personnel moderne avec thème gamer/sportif, carte interactive des souvenirs et viewer 360° pour parcours Insta360.

## ✨ Fonctionnalités

- 🏠 **Page d'accueil** - Bio personnelle avec présentation
- 💻 **Showcase matériel tech** - Setup gaming complet avec spécifications
- 🏃 **Galerie équipements sportifs** - Matériel vélo, running et caméra 360°
- 📸 **Galerie vacances** - Photos et vidéos de voyages avec filtres
- 🗺️ **Carte interactive** - Souvenirs géolocalisés style Snap Map avec clusters
- 🌐 **Viewer 360°** - Vidéos 360° synchronisées avec données GPX en temps réel
- 🔐 **Système d'authentification** - JWT sécurisé avec gestion des rôles
- 👨‍💼 **Dashboard Admin** - Interface CRUD pour gérer contenus et médias
- 📱 **Design responsive** - Mobile-first avec animations fluides

## 🚀 Installation

### Prérequis

- Docker & Docker Compose
- (Optionnel) Node.js 18+ pour développement local

### Déploiement avec Docker (Raspberry Pi compatible)

1. **Cloner le repository**
```bash
git clone https://github.com/MaqzBenz/MaqzbenzWeb.git
cd MaqzbenzWeb
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos paramètres
nano .env
```

Variables requises :
```env
# Database
DB_NAME=maqzbenz
DB_USER=maqzbenz_user
DB_PASSWORD=votre_mot_de_passe_securise

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=production
```

3. **Lancer les services**
```bash
docker-compose up -d
```

4. **Accéder au site**
- Frontend : http://localhost:8080
- API Backend : http://localhost:3000/api
- Database : localhost:5432

5. **Créer le premier utilisateur admin**
```bash
# Se connecter au container backend
docker exec -it maqzbenz-backend sh

# Lancer le script Node.js pour créer un admin
node -e "
const User = require('./src/models/User');
User.create('admin', 'admin@maqzbenz.com', 'VotreMotDePasse123!', 'admin')
  .then(() => console.log('Admin créé'))
  .catch(console.error);
"
```

### Développement local

1. **Backend**
```bash
cd backend
npm install
npm run dev
```

2. **Frontend**
```bash
# Servir avec un serveur web simple
cd frontend
npx serve .
# Ou utiliser nginx/apache configuré pour pointer vers ./frontend
```

## 🛠️ Stack Technique

### Frontend
- **HTML5/CSS3** - Structure et styles modernes
- **JavaScript (Vanilla)** - Pas de framework, performances optimales
- **Leaflet.js** - Cartes interactives
- **Pannellum.js** - Viewer 360° immersif
- **Font Awesome** - Icônes
- **Google Fonts (Inter)** - Typographie

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web minimaliste
- **PostgreSQL** - Base de données relationnelle
- **JWT** - Authentification sécurisée
- **bcrypt** - Hashage des mots de passe

### Infrastructure
- **Docker & Docker Compose** - Containerisation
- **Nginx** - Serveur web et reverse proxy
- **Raspberry Pi** - Déploiement optimisé ARM

## 📁 Structure du Projet

```
MaqzbenzWeb/
├── frontend/                  # Application frontend
│   ├── css/
│   │   ├── style.css         # Styles globaux
│   │   ├── map.css           # Styles carte Leaflet
│   │   └── viewer360.css     # Styles viewer 360°
│   ├── js/
│   │   ├── main.js           # Utilitaires globaux
│   │   ├── auth.js           # Gestion authentification
│   │   ├── map.js            # Carte interactive
│   │   ├── viewer360.js      # Viewer 360°
│   │   ├── gpxPlayer.js      # Parser GPX
│   │   └── admin.js          # Dashboard admin
│   ├── assets/
│   │   ├── images/           # Images et logos
│   │   ├── icons/            # Icônes personnalisées
│   │   └── videos/           # Vidéos (gitignored)
│   ├── index.html            # Page d'accueil
│   ├── tech.html             # Setup gaming
│   ├── sport.html            # Équipement sportif
│   ├── vacances.html         # Galerie vacances
│   ├── map.html              # Carte interactive
│   ├── viewer360.html        # Viewer 360°
│   ├── login.html            # Page connexion
│   └── admin.html            # Dashboard admin
├── backend/                   # API Node.js
│   ├── src/
│   │   ├── models/           # Modèles de données
│   │   ├── routes/           # Routes API
│   │   ├── middleware/       # Middlewares
│   │   ├── services/         # Services (GPX parser, etc.)
│   │   └── server.js         # Point d'entrée
│   ├── package.json
│   └── Dockerfile
├── database/
│   ├── init.sql              # Schéma initial
│   └── data/                 # Données (gitignored)
├── nginx/
│   ├── nginx.conf            # Config Nginx
│   └── conf.d/
│       └── default.conf      # Config site
├── media/                     # Médias uploadés (gitignored)
│   ├── photos/
│   ├── videos360/
│   ├── gpx/
│   └── thumbnails/
├── docker-compose.yml         # Orchestration Docker
├── .env.example              # Template variables d'env
├── .gitignore
└── README.md
```

## 🔧 Configuration

### Variables d'environnement (.env)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DB_NAME` | Nom de la base de données | `maqzbenz` |
| `DB_USER` | Utilisateur PostgreSQL | `maqzbenz_user` |
| `DB_PASSWORD` | Mot de passe base (requis) | - |
| `JWT_SECRET` | Secret pour JWT (requis) | - |
| `JWT_EXPIRES_IN` | Durée validité token | `7d` |
| `NODE_ENV` | Environnement | `production` |
| `CORS_ORIGIN` | Origine CORS autorisée | `*` |
| `RATE_LIMIT_MAX_REQUESTS` | Limite requêtes/15min | `100` |

### Nginx

Le serveur Nginx sert :
- Frontend statique sur le port 80
- Proxy vers API backend sur `/api/`
- Fichiers médias sur `/media/` avec cache

## 📖 API Documentation

### Authentification

**POST** `/api/auth/login`
```json
{
  "email": "admin@maqzbenz.com",
  "password": "password123"
}
```

**GET** `/api/auth/verify` (avec token)  
**GET** `/api/auth/me` (avec token)  
**POST** `/api/auth/change-password` (avec token)

### Souvenirs (Memories)

**GET** `/api/memories` - Liste tous les souvenirs (publics ou tous si admin)  
**GET** `/api/memories/:id` - Détails d'un souvenir  
**GET** `/api/memories/shared/:token` - Accès via token de partage  
**POST** `/api/memories` (admin) - Créer un souvenir  
**PUT** `/api/memories/:id` (admin) - Modifier  
**DELETE** `/api/memories/:id` (admin) - Supprimer  
**POST** `/api/memories/:id/media` (admin) - Ajouter média  

### Parcours 360° (Tours360)

**GET** `/api/tours360` - Liste tous les parcours  
**GET** `/api/tours360/:id` - Détails d'un parcours  
**GET** `/api/tours360/:id/gpx` - Données GPX avec stats  
**POST** `/api/tours360` (admin) - Créer un parcours  
**PUT** `/api/tours360/:id` (admin) - Modifier  
**DELETE** `/api/tours360/:id` (admin) - Supprimer  
**POST** `/api/tours360/:id/hotspots` (admin) - Ajouter hotspot

### Santé

**GET** `/api/health` - Status de l'API

## 🎨 Personnalisation

### Thème couleurs

Éditer `frontend/css/style.css` :

```css
:root {
    --bg-primary: #0a0a0f;        /* Fond principal */
    --accent-primary: #8b5cf6;    /* Violet principal */
    --accent-secondary: #a855f7;  /* Violet secondaire */
    --accent-pink: #ec4899;       /* Rose accent */
    --text-primary: #ffffff;      /* Texte principal */
}
```

### Logo et images

- Logo : `frontend/assets/images/logo.svg`
- Images équipement : `frontend/assets/images/`
- Icônes marqueurs : `frontend/assets/images/icons/`

### Ajout de contenu

1. **Via Dashboard Admin** (`/admin.html`) - Interface graphique
2. **Via API** - Scripts ou cURL
3. **Via Database** - Insertion SQL directe

## 📸 Captures d'écran

*À venir : Screenshots des différentes pages*

## 🗺️ Roadmap

- [x] Backend API complet
- [x] Frontend pages principales
- [x] Carte interactive Leaflet
- [x] Viewer 360° avec GPX
- [x] Dashboard admin basique
- [ ] Upload de fichiers drag & drop
- [ ] Éditeur WYSIWYG pour descriptions
- [ ] Mode sombre/clair toggle
- [ ] PWA (Progressive Web App)
- [ ] Notifications push
- [ ] Système de commentaires
- [ ] Partage social amélioré
- [ ] Export GPX/GeoJSON
- [ ] Charts pour statistiques
- [ ] Multi-langue (FR/EN)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👤 Auteur

**MaqzBenz**

- GitHub: [@MaqzBenz](https://github.com/MaqzBenz)

## 🙏 Remerciements

- [Leaflet](https://leafletjs.com/) - Bibliothèque de cartes
- [Pannellum](https://pannellum.org/) - Viewer 360°
- [Express](https://expressjs.com/) - Framework Node.js
- [PostgreSQL](https://www.postgresql.org/) - Base de données
- Communauté open source ❤️
