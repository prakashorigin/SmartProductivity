# Deployment and operations

## Local setup

1. Install Node.js 20+ and npm 10+. Start MongoDB or use Docker Compose.
2. Copy `backend/.env.example` to `backend/.env`; set a private `JWT_SECRET` and `MONGO_URI`.
3. Run `npm run install:all`, then `npm run dev`. Frontend is `http://localhost:4000`; API is `http://localhost:6000`; health is `http://localhost:6000/health`.
4. For a containerized local stack run `docker compose up --build`. Compose uses a private Mongo container, API, and Nginx-served Vite build. The Mongo container publishes host port 27018.

Never copy a production secret into the frontend environment. Commit `.env.example`, never `.env`.

## MongoDB Atlas

Create a database user with only the required database permissions, add the deployed API's outbound IP/network access as narrowly as possible, enable TLS, and place the URI in the backend secret manager as `MONGO_URI`. Verify `/health` before directing traffic. Configure automated backups and test a restore process.

## Frontend: Vercel

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to the API prefix, for example `https://api.example.com/api`.
- Configure SPA rewrites to `index.html`, HTTPS, and the production backend's `FRONTEND_URL` CORS origin.

## Backend: Render or Railway

- Root directory: `backend`
- Build/install: `npm ci && npm run build`
- Start: `npm start`
- Health check: `/health`
- Set `NODE_ENV=production`, `PORT` (platform assigned), `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL` in the provider's secret manager.
- For email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional `SMTP_USER`/`SMTP_PASSWORD`, and `SMTP_FROM`.
- Restrict CORS to the exact frontend origin and enable TLS at the provider/proxy.

## Stripe setup

Create recurring Stripe Prices for Pro and Premium, configure `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`. Register `/api/payments/webhook` for checkout completion, subscription created/updated/deleted, and invoice payment failure events. Configure the Stripe Customer Portal. Test with Stripe test-mode keys before enabling live prices. Checkout remains unavailable until all keys and Price IDs are configured.

## Release checklist

- Confirm `/health` reports the expected database.
- Check the configured frontend origin, SMTP link origin, Stripe URLs, webhook delivery, and DNS/TLS.
- Keep secrets out of build logs and client bundles. Use database backups and monitor API errors, rate-limit events, and Stripe webhook retries.
- Deploy the backend before the frontend when a release adds an API route. Verify account creation, login, reset link, task/project writes, timer session persistence, billing test checkout, and admin access in a staging environment.
- Roll back using the provider's previous release and keep schema changes backward-compatible during the rollback window.

## Container storage

Compose persists MongoDB in the named `mongodb_data` volume. Back up that volume before deleting the stack or changing MongoDB versions. Production deployments should use a managed MongoDB service instead of this development volume.
