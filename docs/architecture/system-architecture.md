# System Architecture

Source of truth: `docs/PROJECT-HANDOVER.md`

---

## 1. Architecture Overview

```
React Frontend
      ↓
API Gateway
      ↓
┌─────┼──────────────┬───────────────┐
↓     ↓              ↓               ↓
Auth  Tournament     Auction     Competition
Svc   Service        Service       Service
         │              │              │
         └──────────────┼──────────────┘
                        ↓
                    RabbitMQ
                        ↓
               Notification Service
```

- Frontend communicates exclusively through the API Gateway.
- Services communicate synchronously via REST.
- Services communicate asynchronously via RabbitMQ events.
- Each service owns its own database.

---

## 2. Services

| Service | Package Name | Port |
|---|---|---|
| API Gateway | — | 3000 |
| Auth Service | `@tournament-planner/auth-service` | 3001 |
| Tournament Service | — | 3002 |
| Auction Service | — | 3003 |
| Competition Service | — | 3004 |
| Notification Service | — | 3005 |

---

## 3. Infrastructure

| Component | Image | Ports |
|---|---|---|
| PostgreSQL | `postgres:17` | 5432 |
| RabbitMQ | `rabbitmq:4-management` | 5672 (AMQP), 15672 (Management UI) |

Local infrastructure uses Docker Compose.

Node.js services run directly on the host during development. Application containers can be added later.

Redis is **not currently included** — deferred until a concrete use case is finalized.

---

## 4. Repository Structure

```
tournament-planner/
├── apps/
│   ├── frontend/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── tournament-service/
│   ├── auction-service/
│   ├── competition-service/
│   └── notification-service/
│
├── packages/
│   ├── config/
│   ├── logger/
│   ├── types/
│   └── validation/
│
├── infrastructure/
├── docs/
├── .github/
│   └── workflows/
│
├── package.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
└── README.md
```

---

## 5. Monorepo

- Package manager: **npm**
- Workspace model: **npm workspaces** (`apps/*`, `packages/*`)
- Turborepo/Nx are not selected — keep the monorepo simple unless real complexity requires more tooling.

---

## 6. Shared Packages

| Package | Purpose |
|---|---|
| `@tournament-planner/config` | Generic environment/configuration utilities |
| `@tournament-planner/logger` | Shared structured logger |
| `@tournament-planner/types` | Shared generic types |
| `@tournament-planner/validation` | Shared generic validation helpers |

Shared packages must contain only **technical infrastructure**. Domain logic, business services, repositories, and service-specific types belong in the owning service.

---

## 7. Service Folder Structure

Each backend service follows this structure:

```
service/
├── src/
│   ├── modules/
│   ├── middleware/
│   ├── config/
│   ├── infrastructure/
│   ├── app.ts
│   └── server.ts
├── tests/
├── migrations/
├── package.json
└── tsconfig.json
```

Clean Architecture layers (`domain/`, `use-cases/`, `ports/`, `adapters/`) are not added by default. Only introduce them if a specific service becomes sufficiently complex to justify the overhead.

---

## 8. TypeScript Configuration

Root `tsconfig.base.json` enforces:

- `target: ES2022`
- `module: NodeNext`
- `moduleResolution: NodeNext`
- `strict: true`
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `forceConsistentCasingInFileNames: true`

Node.js types (`@types/node`) are added at the service level, not at root.

---

## 9. Environment Strategy

- Service-specific `.env` files per service (git-ignored).
- `.env.example` committed for each service.
- Production secrets come from cloud/secret management — never committed to source.
- Test databases use separate `.env.test` files.

---

## 10. Sprint Roadmap

| Sprint | Focus | Status |
|---|---|---|
| Sprint 0 | Foundation (monorepo, Docker) | ✅ Completed |
| Sprint 1 | Auth Service | 🔄 In Progress |
| Sprint 2 | API Gateway | ⏳ Pending |
| Sprint 3 | Tournament Service | ⏳ Pending |
| Sprint 4 | Auction Service | ⏳ Pending |
| Sprint 5 | Competition Service | ⏳ Pending |
| Sprint 6 | Notification Service | ⏳ Pending |
| Sprint 7 | Frontend | ⏳ Pending |
| Sprint 8 | Integration / E2E Testing | ⏳ Pending |
