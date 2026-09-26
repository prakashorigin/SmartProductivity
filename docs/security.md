# Security notes

## Implemented controls

- Passwords use bcryptjs with 12 rounds. Passwords must be at least 8 characters and no more than 72 UTF-8 bytes.
- JWT secrets are required at API startup. Tokens carry an account ID and private token version; suspended/deleted accounts and stale token versions are rejected.
- Authenticated operations reload the account from MongoDB. User task, project, session, and notification queries are scoped to the owner.
- Admin and superadmin roles are checked in backend middleware; role changes/audit access have a superadmin check.
- Helmet, origin-restricted CORS, API and auth-action rate limits, a 1 MB JSON body limit, ID/input validation, and a centralized error response are enabled.
- Reset/verification links are random, short-lived, one-time tokens. Their SHA-256 hashes are stored instead of plaintext tokens. Password reset responses do not reveal whether an email exists.
- Stripe webhooks use Stripe signature verification against the raw body. Only server-side Stripe credentials are used.
- Admin settings expose service readiness only; they never return credential values.

## Environment handling

Keep `backend/.env` private and ignored by Git. Do not put `MONGO_URI`, `JWT_SECRET`, SMTP credentials, or Stripe secret/webhook keys in a `VITE_*` variable. Rotate credentials if they are ever committed or pasted into a public issue. Production should use a managed secret store, TLS, a restrictive CORS origin, Atlas IP/network controls, backups, and monitored webhook delivery.

## Browser token storage limitation

The current frontend stores the bearer token in `localStorage`, which is vulnerable if script injection occurs. Keep dependencies updated, avoid rendering untrusted HTML, and consider a same-site secure HttpOnly refresh/session cookie plus short-lived access tokens before handling sensitive production data. There is not currently a refresh-token endpoint or device/session management UI.

## Operational limitations

SMTP delivery is optional and disabled without host/from configuration. Paid billing remains disabled until Stripe keys, recurring prices, webhook endpoint, and billing portal are configured. Use HTTPS and the production deployment guidance before inviting real users.
