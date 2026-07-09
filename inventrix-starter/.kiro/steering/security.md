# Security Rules

These are non-negotiable for all API work.

## Authentication & authorization
- Every API route requires the `authenticate` middleware **except** explicitly public ones: `POST /api/auth/login`, `POST /api/auth/register`, and product reads (`GET /api/products`, `GET /api/products/:id`).
- Admin-only operations must additionally use `requireAdmin`.
- Never trust client-supplied identity or role fields in the request body; derive `req.user` from the verified JWT only.
- When adding a new route, default to authenticated. Only make it public with a clear reason.

## Secrets & config
- Read all secrets and environment-specific values (e.g. `JWT_SECRET`, AWS region/credentials, DB path) from environment/config at runtime.
- Never commit secrets or hardcode them in source. Do not add fallback secret literals — fail fast if a required secret is missing.

## Input validation
- Validate and normalize every external input (body, params, query) before use: presence, type, range, and format (e.g. email format, positive `price`/`stock`, allowed `status`/`role` enums).
- Reject invalid input with `400` and a generic message. Never persist unvalidated data.

## Database access
- Use parameterized prepared statements (`?` placeholders) for **all** queries. Never build SQL by string concatenation or interpolation.
- Multi-step writes (e.g. order creation with stock decrement) must run inside a transaction.

## CORS
- Lock CORS to an explicit allowlist of known frontend origins from config. Do not use bare `cors()` / wildcard `*` origins in any deployed environment.
