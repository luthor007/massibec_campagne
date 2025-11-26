# Configuration Firecrawl Self-Hosted

Ce guide explique comment installer et configurer Firecrawl en version open source pour éviter les limites de tokens.

## Prérequis

1. **Node.js** - [Instructions d'installation](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs)
2. **pnpm** - [Instructions d'installation](https://pnpm.io/installation) (version 9+)
3. **Redis** - [Instructions d'installation](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/)
4. **PostgreSQL** - Ou utiliser Docker pour PostgreSQL
5. **Docker** (optionnel) - Pour PostgreSQL

## Installation

### Option 1 : Installation manuelle

1. **Cloner le repository Firecrawl** :
   ```bash
   git clone https://github.com/mendableai/firecrawl
   cd firecrawl
   ```

2. **Configurer PostgreSQL** :

   **Option A : Avec Docker (si vous avez assez d'espace)** :
   ```bash
   cd apps/nuq-postgres
   docker build -t nuq-postgres .
   docker run --name nuqdb \
     -e POSTGRES_PASSWORD=postgres \
     -p 5433:5432 \
     -v nuq-data:/var/lib/postgresql/data \
     -d nuq-postgres
   ```

   **Option B : PostgreSQL local (si Docker manque d'espace)** :
   - Installer PostgreSQL localement (via Homebrew sur Mac : `brew install postgresql@17`)
   - Démarrer PostgreSQL : `brew services start postgresql@17`
   - Créer une base de données : `createdb postgres`
   - Utiliser le port par défaut 5432 au lieu de 5433
   - Mettre à jour `NUQ_DATABASE_URL` dans `.env` : `postgres://postgres:postgres@localhost:5432/postgres`

   **Option C : PostgreSQL Docker simple (sans pg_cron)** :
   Si le build échoue à cause de pg_cron, utilisez une image PostgreSQL standard :
   ```bash
   docker run --name nuqdb \
     -e POSTGRES_PASSWORD=postgres \
     -p 5433:5432 \
     -v nuq-data:/var/lib/postgresql/data \
     -d postgres:17
   ```
   Note : Cette option ne nécessite pas de build personnalisé et devrait fonctionner même avec peu d'espace.

3. **Configurer les variables d'environnement** :
   ```bash
   cd apps/api
   cp .env.example .env
   ```

   Éditer `.env` avec ces valeurs minimales :
   ```env
   # ===== Required ENVS ======
   NUM_WORKERS_PER_QUEUE=8
   PORT=3002
   HOST=0.0.0.0
   REDIS_URL=redis://localhost:6379
   REDIS_RATE_LIMIT_URL=redis://localhost:6379
   USE_DB_AUTHENTICATION=false
   # Si Docker : postgres://postgres:postgres@localhost:5433/postgres
   # Si PostgreSQL local : postgres://postgres:postgres@localhost:5432/postgres
   NUQ_DATABASE_URL=postgres://postgres:postgres@localhost:5433/postgres

   # ===== Optional ENVS ======
   OPENAI_API_KEY=  # Optionnel, pour les fonctionnalités LLM
   ```

   **Note** : Si vous avez une erreur d'espace disque Docker, nettoyez d'abord :
   ```bash
   docker system prune -a --volumes
   ```
   Ou utilisez PostgreSQL installé localement au lieu de Docker.

4. **Installer les dépendances** :
   ```bash
   cd apps/api
   pnpm install
   ```

5. **Démarrer les services** :

   **Terminal 1 - Redis** :
   ```bash
   redis-server
   ```

   **Terminal 2 - Firecrawl API** :
   ```bash
   cd apps/api
   pnpm start
   ```

6. **Tester l'installation** :
   ```bash
   curl -X GET http://localhost:3002/test
   ```
   Devrait retourner : `Hello, world!`

### Option 2 : Docker Compose (Recommandé)

1. **Cloner le repository Firecrawl** :
   ```bash
   git clone https://github.com/mendableai/firecrawl
   cd firecrawl
   ```

2. **Configurer l'environnement** :
   ```bash
   cd apps/api
   cp .env.example .env
   # Éditer .env avec les valeurs minimales ci-dessus
   ```

3. **Démarrer avec Docker Compose** :
   ```bash
   # Depuis la racine du projet firecrawl
   docker compose up
   ```

## Configuration dans Jappuie

Une fois Firecrawl installé et démarré, configurez les variables d'environnement dans `.env.local` :

```env
# Firecrawl Self-Hosted
FIRECRAWL_API_URL=http://localhost:3002
FIRECRAWL_API_KEY=dummy-key  # Clé factice, non utilisée en self-hosted
```

## Vérification

Pour tester que tout fonctionne :

```bash
curl -X POST http://localhost:3002/v1/crawl \
    -H 'Content-Type: application/json' \
    -d '{
      "url": "https://mendable.ai"
    }'
```

## Notes importantes

- Le port par défaut de Firecrawl est **3002**
- Assurez-vous que Redis est démarré avant de lancer l'API
- Pour les fonctionnalités LLM (extraction avec prompts), vous pouvez ajouter `OPENAI_API_KEY` dans le `.env` de Firecrawl
- Une fois configuré, vous pouvez réactiver le wildcard `/*` dans `src/lib/services/supplierScraper.js` pour explorer tout le domaine

