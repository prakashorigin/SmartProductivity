# Database model reference

All records are stored in MongoDB through Mongoose. User-owned data is filtered by `userId` at the API boundary. Object IDs are references; deleting a user removes their projects, tasks, focus sessions, notifications, and subscription records.

| Collection | Purpose | Key fields and indexes |
| --- | --- | --- |
| `users` | Account, access, email verification, plan and Stripe customer/subscription state | Unique lowercase `email`; indexed role, plan, account status, Stripe IDs; password and reset/verification hashes are never returned |
| `projects` | User-owned goal/work container | `userId`, name, color, archived state; unique user/name pair |
| `tasks` | User-owned work item, optionally linked to a project | `userId`, `projectId`, title, status, priority, due date, tags, estimates and completion time; compound user/status/due and user/project indexes |
| `sessions` | Focus, short break, long break, and historical study activity | `userId`, optional task/project, session type, planned/actual minutes, start/completion dates; unique `(userId, clientSessionId)` for retry safety |
| `notifications` | In-app task reminders, focus completion, and system messages | `userId`, type, title/message, `readAt`, `dueAt`, optional `dedupeKey`; user/date and deduplication indexes |
| `subscriptions` | Stripe-synced paid plan state | `userId`, plan/status, Stripe IDs, amount/currency/interval, period end; unique Stripe subscription ID |
| `auditlogs` | Administrative action trail | actor ID/role, action, target, metadata, IP, timestamp; no passwords or payment credentials |

## Account security fields

Passwords are bcrypt hashes. Password reset and email verification tokens are random 256-bit values; only SHA-256 token hashes and expiry dates are stored. `tokenVersion` is private and included in issued JWTs. Resetting/changing a password increments it, invalidating older tokens. Never add secret token fields to API projections.

## Free plan defaults

Limits are read from the backend process environment at runtime: `FREE_TASK_LIMIT` (50), `FREE_PROJECT_LIMIT` (3), `FREE_FOCUS_SESSIONS_PER_DAY` (5), and `FREE_ANALYTICS_DAYS` (7). Pro allows unlimited tasks/projects/focus sessions and 90 days of analytics. Premium currently allows unlimited history. These values are business rules in `backend/src/services/subscriptionService.js`.

## Development seed

`npm run seed` creates deterministic demo records only outside production. The seed is idempotent for existing records and does not reset existing account passwords. It prints default credentials only when it has created the corresponding demo account. Override them through the `DEMO_*` variables in `backend/.env`.
