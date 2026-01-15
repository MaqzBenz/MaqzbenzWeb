# 🚀 Guide de Déploiement MaqzbenzWeb

## Prérequis

- Docker & Docker Compose installés
- Raspberry Pi ou serveur Linux
- Accès SSH au serveur
- Nom de domaine (optionnel)

## 1. Configuration Initiale

### Cloner le projet sur le serveur

```bash
cd /home/pi  # ou votre répertoire préféré
git clone https://github.com/MaqzBenz/MaqzbenzWeb.git
cd MaqzbenzWeb
```

### Créer le fichier .env

```bash
cp .env.example .env
nano .env
```

Configurer les variables:

```env
# Database
DB_NAME=maqzbenz
DB_USER=maqzbenz_user
DB_PASSWORD=VotreMotDePasseSecuriseIci123!

# JWT - Générer avec: openssl rand -base64 64
JWT_SECRET=VotreLongSecretJWTAleatoire123456789...
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=production
PORT=3000

# CORS - Ajuster selon votre domaine
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Créer les répertoires pour médias

```bash
mkdir -p media/{photos,videos360,gpx,thumbnails}
chmod 755 media
```

## 2. Lancement des Services

### Démarrer Docker Compose

```bash
docker-compose up -d
```

### Vérifier les services

```bash
docker-compose ps
docker-compose logs -f
```

Vous devriez voir:
- ✅ maqzbenz-db (PostgreSQL)
- ✅ maqzbenz-backend (Node.js API)
- ✅ maqzbenz-nginx (Frontend)

## 3. Créer le Premier Utilisateur Admin

```bash
# Se connecter au container backend
docker exec -it maqzbenz-backend sh

# Dans le container, créer l'admin
node << 'EOF'
const User = require('./src/models/User');
(async () => {
  try {
    const user = await User.create(
      'admin',
      'admin@maqzbenz.com',
      'MotDePasseAdmin123!',
      'admin'
    );
    console.log('✅ Utilisateur admin créé:', user);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
EOF

# Sortir du container
exit
```

## 4. Accéder au Site

- **Frontend**: http://votre-ip:8080
- **API**: http://votre-ip:3000/api
- **Login**: http://votre-ip:8080/login.html
- **Admin**: http://votre-ip:8080/admin.html

Utilisez les identifiants:
- Email: `admin@maqzbenz.com`
- Mot de passe: celui configuré ci-dessus

## 5. Configuration HTTPS (Optionnel)

### Avec Let's Encrypt et Certbot

```bash
# Installer certbot
sudo apt-get update
sudo apt-get install certbot

# Obtenir un certificat
sudo certbot certonly --standalone -d votre-domaine.com

# Modifier nginx/conf.d/default.conf pour ajouter SSL
# Puis redémarrer nginx
docker-compose restart nginx
```

## 6. Ajouter du Contenu

### Via l'interface Admin

1. Connectez-vous sur `/admin.html`
2. Utilisez l'interface pour ajouter:
   - Souvenirs (memories)
   - Parcours 360° (tours)

### Via l'API (exemple avec cURL)

```bash
# Se connecter et obtenir le token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maqzbenz.com","password":"VotreMotDePasse"}' \
  | jq -r '.token')

# Ajouter un souvenir
curl -X POST http://localhost:3000/api/memories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mon premier souvenir",
    "description": "Description du souvenir",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "date": "2024-01-14",
    "type": "vacation",
    "visibility": "public"
  }'
```

## 7. Maintenance

### Voir les logs

```bash
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f db
```

### Redémarrer les services

```bash
docker-compose restart
```

### Arrêter les services

```bash
docker-compose down
```

### Mise à jour du code

```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Backup de la base de données

```bash
docker exec maqzbenz-db pg_dump -U maqzbenz_user maqzbenz > backup_$(date +%Y%m%d).sql
```

### Restaurer un backup

```bash
cat backup_20240114.sql | docker exec -i maqzbenz-db psql -U maqzbenz_user -d maqzbenz
```

## 8. Monitoring

### Vérifier l'état de santé

```bash
# API health check
curl http://localhost:3000/api/health

# Nginx health check
curl http://localhost:8080/

# PostgreSQL
docker exec maqzbenz-db pg_isready -U maqzbenz_user
```

### Espace disque (important pour Raspberry Pi)

```bash
df -h
du -sh media/*
```

## 9. Optimisations Raspberry Pi

### Limiter l'utilisation mémoire

Éditer `docker-compose.yml`:

```yaml
services:
  backend:
    mem_limit: 512m
    
  db:
    mem_limit: 256m
```

### Activer swap si nécessaire

```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## 10. Troubleshooting

### Le frontend ne charge pas
- Vérifier: `docker-compose logs nginx`
- Vérifier que le port 8080 n'est pas déjà utilisé
- Vérifier les permissions: `ls -la frontend/`

### L'API ne répond pas
- Vérifier: `docker-compose logs backend`
- Vérifier la connexion DB: `docker-compose logs db`
- Vérifier le fichier .env

### Erreur "Cannot connect to database"
- Vérifier que PostgreSQL est démarré: `docker-compose ps db`
- Attendre le healthcheck: peut prendre 30-60 secondes au démarrage
- Vérifier les credentials dans .env

### Erreur "Invalid token" lors du login
- Régénérer JWT_SECRET dans .env
- Redémarrer: `docker-compose restart backend`

## 📞 Support

Pour toute question:
- Ouvrir une issue sur GitHub
- Consulter les logs: `docker-compose logs`
- Vérifier le README.md

## ✅ Checklist Post-Déploiement

- [ ] Services Docker démarrés
- [ ] Utilisateur admin créé
- [ ] Connexion au frontend réussie
- [ ] Login admin fonctionnel
- [ ] Dashboard admin accessible
- [ ] Au moins 1 souvenir de test ajouté
- [ ] Backup configuré
- [ ] Monitoring en place
- [ ] (Optionnel) HTTPS configuré
- [ ] (Optionnel) Nom de domaine configuré

Bon déploiement ! 🚀
