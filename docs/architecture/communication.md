# Service Communication

Source of truth: `docs/PROJECT-HANDOVER.md`

---

## 1. Communication Patterns

| Pattern | Use Case |
|---|---|
| REST | Synchronous request/response between services or from frontend via gateway |
| RabbitMQ | Asynchronous cross-service events and side effects |

**General flow (synchronous):**

```
Frontend
   ↓
API Gateway
   ↓
Service REST API
```

**General flow (asynchronous):**

```
Service (publisher)
   ↓
RabbitMQ
   ↓
Consumer Service
```

---

## 2. RabbitMQ

- Image: `rabbitmq:4-management`
- AMQP port: `5672`
- Management UI: `15672`

RabbitMQ is used for asynchronous cross-service communication only. It is not used for synchronous request/response.

---

## 3. Finalized Event Concepts

The following events are finalized in terms of ownership and purpose. Exact payload schemas are **not yet finalized** for every event — do not invent payload contracts before implementation reaches the messaging stage.

| Event | Publisher | Primary Consumer(s) |
|---|---|---|
| `BracketGenerated` | Competition Service | Notification Service |
| `MatchScheduled` | Competition Service | Tournament Service, Notification Service |
| `LineupSubmitted` | Competition Service | Notification Service |
| `MatchStarted` | Competition Service | Notification Service |
| `ResultSubmitted` | Competition Service | Notification Service |
| `ResultDisputed` | Competition Service | Notification Service |
| `ResultConfirmed` | Competition Service | Tournament Service, Notification Service |
| `MatchForfeited` | Competition Service | Notification Service |
| `TeamAdvanced` | Competition Service | Notification Service |
| `CompetitionCompleted` | Competition Service | Tournament Service, Notification Service |
| `TeamWithdrawn` | Tournament Service | Competition Service, Notification Service |
| `PlayerAllocated` | Auction Service | Tournament Service, Notification Service |

> **Not yet finalized:** Exact event payload schemas. These must be defined when RabbitMQ implementation begins.

---

## 4. Idempotency Requirement

Event consumers must be **idempotent**.

Duplicate events can occur in distributed systems (network retries, RabbitMQ redelivery). Consumers must handle receiving the same event more than once without creating duplicate state.

---

## 5. Transactional Outbox

The transactional outbox pattern was identified as the appropriate production approach for ensuring events are reliably published when a service commits a database transaction.

> **Not yet finalized:** The exact retry/dead-letter queue (DLQ) architecture. Do not invent a final retry/DLQ design without discussion.

---

## 6. Redis

Redis is **not currently included**.

It was deliberately deferred. Only introduce Redis when there is a concrete, finalized use case (e.g., rate limiting, caching, session storage). Do not add it for general microservices reasons.
