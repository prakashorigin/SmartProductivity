# SmartProductivity architecture

## Runtime

The repository currently runs a React 19 + Vite client and a Node.js ESM + Express 5 API. Mongoose persists accounts, projects, tasks, focus sessions, notifications, subscriptions, and audit events in MongoDB. The frontend calls the REST API through a shared Axios client; Redux Toolkit owns the authentication state and task state, while feature pages own short-lived view state.

```text
Browser (React, Vite, Tailwind)
  ├── Redux Toolkit authentication/task state
  ├── Axios → /api (Vite proxy in development, nginx in Docker)
  └── React Router route guards
        ↓
Express API (Helmet, CORS, rate limit, JSON limit, error handler)
  ├── auth middleware → JWT → MongoDB user
  ├── role middleware → admin / superadmin operations
  ├── route → controller → Mongoose model
  ├── email service → optional SMTP
  └── Stripe service/webhook → subscription records and account plan
        ↓
MongoDB (local, Docker, or Atlas)
```

## API startup and health

`backend/src/server.ts` validates the required environment values, waits for MongoDB, and only then listens on `PORT`. `GET /health` and `GET /api/health` return HTTP 200 with `{ "status": "ok", "database": "connected" }` when MongoDB is connected and HTTP 503 otherwise. `backend/src/config/database.ts` reports connection state without printing a MongoDB URI or credentials. Shutdown closes the listener and Mongoose connection.

## Ownership and authorization

The `protect` middleware verifies bearer JWTs, reloads the current account, checks suspension, and validates the token version. User controllers scope reads and writes by authenticated `userId`. Admin routers require `admin` or `superadmin`; role changes and audit log reads require `superadmin`. UI guards are for navigation only; the API repeats authorization checks.

## Application structure

Backend runtime code lives in `backend/src` with config, controllers, middleware, models, routes, services, validators, types, and utilities grouped by role. The entry point, configuration, authentication boundary, validation, JWT/password utilities, and User model use TypeScript; productivity controllers and service modules remain JavaScript during the staged migration. The React entry lives in `frontend/src/app`, with lazy-loaded pages in `frontend/src/pages`, shared components in `frontend/src/components`, and data/state modules in `frontend/src/services` and `frontend/src/store`.

## External services

- MongoDB is required for the API to start.
- SMTP is optional; account emails are disabled until `SMTP_HOST` and `SMTP_FROM` are configured.
- Stripe keys and recurring Price IDs are required for paid checkout. Free use and local development do not require Stripe.
- No background queue is currently used. Due-task notifications are refreshed when a user loads notifications; focus completion creates an in-app notification.

## Local development

See [README.md](../README.md) for setup and [deployment.md](deployment.md) for Docker and hosted environments.
