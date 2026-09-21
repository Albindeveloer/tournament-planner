# Notification Database

Database: `notification_db`
Owner: Notification Service
User: `notification_user`

Source of truth: `docs/PROJECT-HANDOVER.md` §19

---

## Tables

- `notifications`
- `notification_deliveries`
- `notification_preferences`

---

## notifications

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Recipient; references Auth Service user by UUID (no FK) |
| type | VARCHAR + CHECK | Notification category (see below) |
| resource_id | UUID | ID of the related domain resource |
| resource_type | VARCHAR | Type of the related domain resource |
| timestamps | — | created_at, updated_at |

**Notification type categories:**
- Tournament invitation events
- Join events
- Captain events
- Auction events
- Team events
- Match events
- Result events
- Tournament lifecycle events
- `SYSTEM`

`resource_id` and `resource_type` support frontend navigation to the related resource.

---

## notification_deliveries

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| notification_id | UUID | References notifications.id |
| channel | VARCHAR + CHECK | `IN_APP`, `EMAIL`, `PUSH` |
| status | VARCHAR + CHECK | `PENDING`, `SENT`, `DELIVERED`, `FAILED` |
| retry metadata | — | Exists structurally for future retry support |
| timestamps | — | — |

**MVP delivery channel:** `IN_APP` only.

Database structure supports `EMAIL` and `PUSH` for future use.

---

## notification_preferences

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | References Auth Service user by UUID (no FK) |
| notification_type | VARCHAR | The notification category |
| channel | VARCHAR | The delivery channel |
| enabled | BOOLEAN | User preference |

**Unique constraint:** `(user_id, notification_type, channel)`

Allows users to control which notifications they receive and through which channel.

---

## Design Notes

- Notifications are generated from domain events (RabbitMQ consumers) — not from arbitrary client POST requests.
- All user references are UUID-only with no cross-service foreign keys.
- The Notification Service must not own or duplicate business state from other services.
