# SmartProductivity
Live Demo Frontend : https://frontend-psi-lemon-16lztnesqe.vercel.app/
**Plan Better. Focus Deeper. Achieve More.**

SmartProductivity is a fully productivity workspace for organizing tasks and projects, tracking focus sessions, and reviewing progress. It includes account management, plan-aware features, billing hooks, and admin tools.

## Features

- Tasks, projects, search, calendar, and notifications
- Pomodoro focus timer, session history, and analytics
- Registration, login, password reset, email verification, and account controls
- Role-protected admin workspace
- Free, Pro, and Premium plan limits with optional Stripe checkout
- Responsive interface, theme preferences, and supplied SmartProductivity artwork

## Project structure

```text
backend/src/   Express API, MongoDB models, auth, validation, and services
backend/tests/ Unit and MongoDB integration tests
frontend/src/  React app, pages, components, state, and API client
docs/          Architecture, API, security, deployment, and design handoff
.github/       CI and dependency checks
```

The backend entry point and authentication foundation use TypeScript. Existing productivity controllers and most React page components remain JavaScript/JSX.

## Requirements

- Node.js 20 or newer and npm 10 or newer
- MongoDB running locally, in Docker, or on MongoDB Atlas

## Run locally

Install dependencies from the project root:

```bash
npm run install:all
```

If `backend/.env` does not already exist, copy `backend/.env.example` to that path. Set a private `MONGO_URI` and unique `JWT_SECRET`, then start the app:

```bash
npm run dev
```

The frontend is at `http://localhost:4000`; the API is at `http://localhost:6000`. The API waits for MongoDB before listening. Check `http://localhost:6000/health` for database status. Start only one side with `npm run frontend` or `npm run backend`.

Never commit `backend/.env` or put server secrets in frontend `VITE_*` variables. The root and backend ignore rules exclude environment files while allowing `.env.example`.

## Optional services

- **Email:** Set SMTP values in `backend/.env` to send verification and password-reset links.
- **Stripe:** Set the Stripe secret, webhook secret, and recurring Price IDs to enable paid checkout and billing management.
- **Seed data:** Set unique `DEMO_USER_PASSWORD` and `DEMO_ADMIN_PASSWORD` values (at least 12 characters) in `backend/.env`, then run `npm run seed`. Seeding is disabled in production and does not change existing passwords.

## Checks and builds

```bash
npm run test              # backend unit tests and frontend tests
npm run lint              # frontend ESLint
npm run typecheck         # backend and frontend TypeScript checks
npm run build             # backend and frontend production builds
npm run verify            # tests, lint, type checks, and builds
npm run test:integration  # compiled API against local smartproductivity_test MongoDB
```

The integration suite creates temporary accounts and removes them. It requires a local MongoDB server and uses the separate `smartproductivity_test` database.

To run the containerized app, configure `backend/.env` and use `docker compose up --build`.

## Project guides

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Database](docs/database.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [UI/UX tokens](docs/ui-ux.md)
- [Figma handoff](docs/figma-handoff.md) (design specification; no editable Figma file is included)
