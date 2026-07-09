# API Conventions

## Error handling
- Use centralized Express error-handling middleware (registered last, `(err, req, res, next)`).
- Route handlers pass errors via `next(err)` (or a wrapped async handler); do not send ad-hoc 500 responses from each handler.
- Client responses use generic messages. Never leak stack traces, SQL, or internal details to clients.
- Use correct status codes: `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` missing, `409` conflict, `500` unexpected.

## Logging
- Use structured logging (JSON: level, message, context fields), not bare `console.log`.
- Log at meaningful points: request errors, auth failures, and key business events.
- **No PII or secrets in logs** — never log passwords, tokens, full request bodies, or email/name values. Reference records by `id`.

## Responses
- Return JSON consistently. Keep response shapes stable and documented in the route.
