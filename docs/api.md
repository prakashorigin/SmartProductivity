# REST API

Base URL in local development: `http://localhost:6000/api`. The Vite frontend proxies `/api` to that URL. Send `Authorization: Bearer <token>` for protected routes. Request and response bodies use JSON except Stripe's raw signed webhook body.

## Authentication and accounts

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Validate and create account; returns a bearer token and attempts verification email |
| POST | `/auth/login` | Public | Authenticate email/password and return a bearer token |
| GET | `/auth/me` | User | Return the authenticated account's safe profile |
| POST | `/auth/logout` | User | Invalidate issued bearer tokens for the account |
| GET | `/auth/profile` | User | Read current profile |
| PUT | `/auth/profile` | User | Update name/email/password; changing email requests verification; changing password rotates token version |
| POST | `/auth/forgot-password` | Public | Always return a generic result to avoid email enumeration |
| POST | `/auth/reset-password/:token` | Public | Use one-time token within 15 minutes |
| POST | `/auth/verify-email/:token` | Public | Verify email using one-time token |
| POST | `/auth/verify-email` | User | Resend a verification link |
| DELETE | `/auth/account` | User | Confirm password, cancel known Stripe subscription, then remove account data |

Account entry and reset actions have a 15-request per 15-minute per-IP limiter in addition to the API-wide limiter.

## Productivity

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| GET/POST | `/tasks` | User | List/search/filter/sort/paginate tasks; create task |
| GET | `/tasks/analytics?days=7` | User | Task completion and priority summaries for the requested 1–3650 day window, clamped to the active plan |
| PUT/DELETE | `/tasks/:id` | Owner | Update/delete owned task |
| GET/POST | `/projects` | User | List/create owned project |
| PUT/DELETE | `/projects/:id` | Owner | Update/delete owned project |
| GET/POST | `/sessions` | User | Read history/create idempotent focus or break session |
| GET | `/sessions/analytics?days=7` | User | Study totals, daily data, and streak for the requested 1–3650 day window; accepts `all` for Premium and clamps by plan |
| GET | `/notifications` | User | Read notifications and unread count; refresh due reminders |
| PATCH | `/notifications/read-all` | User | Mark all notifications read |
| PATCH | `/notifications/:id/read` | Owner | Mark one notification as read |
| DELETE | `/notifications/:id` | Owner | Delete one notification |

Lists accept `page` and `limit`; paginated responses contain `{ items, pagination }`. Legacy task/session list calls without pagination continue to return arrays.

## Billing

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| GET | `/payments/plans` | Public | Current plan features and Stripe-configured prices |
| GET | `/payments/subscription` | User | Current plan and subscription record |
| POST | `/payments/create-checkout-session` | User | Create Stripe Checkout session for `pro` or `premium` |
| POST | `/payments/customer-portal` | User | Create Stripe billing portal session |
| POST | `/payments/webhook` | Stripe signature | Sync checkout, subscription, and failed-payment events |

Webhook requests are verified with `STRIPE_WEBHOOK_SECRET` using the raw request body. Set the Stripe endpoint to `/api/payments/webhook`.

## Administration

All `/admin/*` endpoints require an authenticated admin or superadmin. Users/tasks/subscriptions/analytics/settings are admin-readable. User role updates and audit log reads require `superadmin`. User role, suspension, deletion actions are recorded in `auditlogs`.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/admin/users` | Admin |
| PUT | `/admin/users/:id/role` | Superadmin |
| PATCH/DELETE | `/admin/users/:id/status`, `/admin/users/:id` | Admin |
| GET | `/admin/tasks`, `/admin/subscriptions` | Admin |
| GET | `/admin/analytics`, `/admin/settings` | Admin |
| GET | `/admin/audit-logs` | Superadmin |

## Health and error handling

`GET /health` and `GET /api/health` report database readiness. Errors use a JSON `{ success, code?, message }` response where available; clients should display `message` and should not infer successful mutations from an HTTP 200 alone. Never return stack traces or secrets to clients.
