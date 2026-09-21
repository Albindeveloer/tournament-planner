# Notification API

Service: Notification Service
Base prefix: `/api/v1`

Source of truth: `docs/PROJECT-HANDOVER.md` §26

---

## Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/notifications` | List notifications for the authenticated user |
| GET | `/api/v1/notifications/:id` | Get a specific notification |
| PATCH | `/api/v1/notifications/:id/read` | Mark a notification as read |
| PATCH | `/api/v1/notifications/read-all` | Mark all notifications as read |
| DELETE | `/api/v1/notifications/:id` | Delete a notification |

---

## Notification Preferences

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/notification-preferences` | Get the user's notification preferences |
| PUT | `/api/v1/notification-preferences` | Update the user's notification preferences |

---

## Important Rules

- Notifications are generated from domain events consumed from RabbitMQ — not from arbitrary client POST requests.
- Users can only access their own notifications.
- Notification preferences control which events the user receives and through which channel.

---

## MVP Scope

- Primary delivery channel: `IN_APP`
- `EMAIL` and `PUSH` are supported structurally in the database but are outside the initial MVP delivery scope.
