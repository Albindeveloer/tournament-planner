# Common Project Foundation

## Tooling Prerequisites

Run these commands to verify your environment:

```bash
node -v
npm -v
git --version
docker --version
docker compose version
```

---

## M6.1.1 — Initialize Monorepo & Root Structure

### Goal

By the end of this step, you should have:

```text
tournament-planner/
├── apps/
├── packages/
├── infrastructure/
├── docs/
├── .github/
│   └── workflows/
├── package.json
├── tsconfig.base.json
├── .gitignore
├── .prettierrc
├── .env.example
└── README.md
```

No service implementation yet.

### Step 1 — Create the project folder

```bash
mkdir tournament-planner
cd tournament-planner
```

### Step 2 — Initialize Git

```bash
git init
```

### Step 3 — Initialize npm

```bash
npm init -y
```

This creates `package.json`.

### Step 4 — Configure root `package.json`

Replace contents with:

```json
{
  "name": "tournament-planner",
  "version": "1.0.0",
  "private": true,
  "description": "Tournament Planner application",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "prettier": "^3.6.2",
    "typescript": "^5.9.2"
  },
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=10.0.0"
  }
}
```

Why `private: true`?

- This is the root workspace, not a package to publish.
- Prevents accidental publishing.

Why npm workspaces?

- You have multiple apps under `apps/*`.
- Shared packages live under `packages/*`.

### Step 5 — Install root dependencies

```bash
npm install
```

Expected:

- `package.json`
- `package-lock.json`
- `node_modules/`

### Step 6 — Create root directories

PowerShell:

```powershell
New-Item -ItemType Directory -Force apps
New-Item -ItemType Directory -Force packages
New-Item -ItemType Directory -Force infrastructure
New-Item -ItemType Directory -Force docs
New-Item -ItemType Directory -Force .github\workflows
```

### Step 7 — Create application directories

Target:

```text
apps/
├── frontend/
├── api-gateway/
├── auth-service/
├── tournament-service/
├── auction-service/
├── competition-service/
└── notification-service/
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force `
  apps/frontend, `
  apps/api-gateway, `
  apps/auth-service, `
  apps/tournament-service, `
  apps/auction-service, `
  apps/competition-service, `
  apps/notification-service
```

### Step 8 — Create shared package directories

Target:

```text
packages/
├── config/
├── logger/
├── types/
└── validation/
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force `
  packages/config, `
  packages/logger, `
  packages/types, `
  packages/validation
```

### Step 9 — Create infrastructure directories

Target:

```text
infrastructure/
├── postgres/
│   └── init/
└── rabbitmq/
    └── definitions/
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force infrastructure/postgres/init
New-Item -ItemType Directory -Force infrastructure/rabbitmq/definitions
```

### Step 10 — Create remaining root files

Create empty files:

- `tsconfig.base.json`
- `.gitignore`
- `.prettierrc`
- `.env.example`
- `README.md`

### Step 11 — Add TypeScript base config

`tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### Step 12 — Add `.gitignore`

```gitignore
node_modules/
dist/
build/
coverage/

.env
.env.*
!.env.example

*.log
logs/

.DS_Store
Thumbs.db

.vscode/
.idea/

tmp/
temp/
```

### Step 13 — Add Prettier config

`.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all"
}
```

### Step 14 — Add root environment example

`.env.example`

```env
# Local infrastructure
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_dev_password

RABBITMQ_USER=rabbitmq_dev
RABBITMQ_PASSWORD=rabbitmq_dev_password
```

Later, each service can have its own `.env.example`, e.g.:

- `apps/auth-service/.env.example`
- `apps/tournament-service/.env.example`

---

## M6.1.3 — Local Docker Infrastructure

### Goal

Set up local infra for development:

- PostgreSQL
- 5 logical databases
- 5 database users
- RabbitMQ
- Persistent storage
- Health checks
- Local Docker networking

Node.js services are not containerized in this step.

### 1) Create PostgreSQL init script

Create:

```text
infrastructure/
└── postgres/
    └── init/
        └── 01-init-databases.sql
```

`01-init-databases.sql`:

```sql
-- ============================================================
-- Tournament Planner - Local PostgreSQL Initialization
-- ============================================================

-- ============================================================
-- DATABASE USERS
-- ============================================================

CREATE USER auth_user WITH PASSWORD 'auth_dev_password';
CREATE USER tournament_user WITH PASSWORD 'tournament_dev_password';
CREATE USER auction_user WITH PASSWORD 'auction_dev_password';
CREATE USER competition_user WITH PASSWORD 'competition_dev_password';
CREATE USER notification_user WITH PASSWORD 'notification_dev_password';

-- ============================================================
-- DATABASES
-- ============================================================

CREATE DATABASE auth_db
    OWNER auth_user;

CREATE DATABASE tournament_db
    OWNER tournament_user;

CREATE DATABASE auction_db
    OWNER auction_user;

CREATE DATABASE competition_db
    OWNER competition_user;

CREATE DATABASE notification_db
    OWNER notification_user;
```

Why this approach?

- One local PostgreSQL container.
- Database-per-service boundary preserved:
  - Auth Service → `auth_db`
  - Tournament Service → `tournament_db`
  - Auction Service → `auction_db`
  - Competition Service → `competition_db`
  - Notification Service → `notification_db`

### 2) Create `docker-compose.yml`

Create at project root:

```text
tournament-planner/
└── docker-compose.yml
```

Use:

```yaml
services:
  postgres:
    image: postgres:17
    container_name: tournament-planner-postgres
    restart: unless-stopped

    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_dev_password
      POSTGRES_DB: postgres

    ports:
      - '5432:5432'

    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init:/docker-entrypoint-initdb.d:ro

    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 10

  rabbitmq:
    image: rabbitmq:4-management
    container_name: tournament-planner-rabbitmq
    restart: unless-stopped

    environment:
      RABBITMQ_DEFAULT_USER: rabbitmq_dev
      RABBITMQ_DEFAULT_PASS: rabbitmq_dev_password

    ports:
      - '5672:5672'
      - '15672:15672'

    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

    healthcheck:
      test: ['CMD', 'rabbitmq-diagnostics', '-q', 'ping']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
  rabbitmq_data:
```

### 3) Start infrastructure

From project root:

```bash
docker compose up -d
```

Then:

```bash
docker compose ps
```

Expected status:

- `tournament-planner-postgres` → `Up (healthy)`
- `tournament-planner-rabbitmq` → `Up (healthy)`

### 4) Verify PostgreSQL

```bash
docker exec -it tournament-planner-postgres psql -U postgres -c "\l"
```

Expected DBs:

- `auth_db`
- `tournament_db`
- `auction_db`
- `competition_db`
- `notification_db`
- `postgres`

### 5) Setup pgAdmin and view DBs

1. Open pgAdmin.
2. In Browser panel, right-click `Servers` → `Register` → `Server...`
3. In **General** tab:
   - Name: `tournament-planner-local`
4. In **Connection** tab:
   - Host name/address: `localhost`
   - Port: `5432`
   - Maintenance database: `postgres`
   - Username: `postgres`
   - Password: `postgres_dev_password`
   - Enable `Save password`
5. Click **Save**.
6. Expand:
   - `Servers → tournament-planner-local → Databases`
7. If needed, right-click `Databases` → `Refresh`.

You should see:

- `auth_db`
- `tournament_db`
- `auction_db`
- `competition_db`
- `notification_db`
- `postgres`

### 6) Verify RabbitMQ

RabbitMQ management UI:

- URL: http://localhost:15672
- Username: `rabbitmq_dev`
- Password: `rabbitmq_dev_password`

You should see the RabbitMQ management dashboard.
