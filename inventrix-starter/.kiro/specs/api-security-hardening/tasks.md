# Implementation Plan: API Security Hardening

## Overview

Harden the Inventrix Express API with layered security middleware, input validation, structured logging, and transactional order creation. Implementation is sequential — each task builds on the previous, culminating in wiring everything together in `index.ts`.

## Tasks

- [x] 1. Add new dependencies
  - Run `npm install zod express-rate-limit` in `packages/api`
  - Run `npm install -D fast-check vitest @types/express-rate-limit` in `packages/api`
  - Add a `"test"` script to `packages/api/package.json`: `"vitest --run"`
  - _Requirements: 4.1-4.7 (zod), 7.1-7.4 (express-rate-limit)_

- [x] 2. Create configuration module
  - [x] 2.1 Create `packages/api/src/config.ts`
    - Export `loadConfig()` function that reads all env vars
    - Throw an error with descriptive message if `JWT_SECRET` is not set
    - Default `JWT_EXPIRES_IN` to `'1h'`, `CORS_ORIGINS` to `['http://localhost:5173']`, `RATE_LIMIT_WINDOW_MS` to `900000`, `RATE_LIMIT_MAX` to `100`, `AUTH_RATE_LIMIT_MAX` to `10`, `PORT` to `3000`, `NODE_ENV` to `'development'`
    - Parse `CORS_ORIGINS` by splitting on commas and trimming whitespace
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 7.2_

  - [ ]* 2.2 Write unit tests for config module
    - Test that missing `JWT_SECRET` throws
    - Test default values when env vars are unset
    - Test CORS_ORIGINS parsing with various formats
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Create logger module
  - [x] 3.1 Create `packages/api/src/logger.ts`
    - Implement `createLogger()` returning Logger with info/warn/error/debug methods
    - Each method writes a JSON string to `process.stdout.write` with `timestamp`, `level`, `message`, and optional `context`
    - Implement `redactPii(obj)` that recursively replaces values for keys matching `/email|password|token|authorization|secret/i` with `'[REDACTED]'`
    - Apply `redactPii` to `context` before serialisation
    - _Requirements: 8.1, 8.2_

  - [ ]* 3.2 Write property tests for logger
    - **Property 3: Logger output is always valid JSON with required fields**
    - **Validates: Requirements 8.1**
    - **Property 4: Logger never includes PII in output**
    - **Validates: Requirements 8.2**

- [ ] 4. Create validation schemas and middleware
  - [x] 4.1 Create `packages/api/src/schemas/auth.ts`
    - Define `registerSchema`: email (valid format), password (min 8 chars), name (non-empty, max 100)
    - Define `loginSchema`: email (valid format), password (non-empty)
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Create `packages/api/src/schemas/products.ts`
    - Define `createProductSchema`: name (non-empty, max 200), price (positive number), stock (non-negative integer), description (optional, max 1000)
    - Define `updateProductSchema`: same as create
    - _Requirements: 4.3, 4.4_

  - [x] 4.3 Create `packages/api/src/schemas/orders.ts`
    - Define `createOrderSchema`: items (non-empty array of { product_id: positive int, quantity: positive int })
    - Define `updateOrderStatusSchema`: status (enum: pending, processing, shipped, delivered, cancelled)
    - _Requirements: 4.5, 4.6_

  - [x] 4.4 Create `packages/api/src/middleware/validate.ts`
    - Export `validate(schema)` middleware factory
    - On success: replace `req.body` with parsed value, call `next()`
    - On failure: return 400 with `{ error: 'Validation failed', details: [{field, message}] }`
    - _Requirements: 4.7_

  - [ ]* 4.5 Write property tests for validation
    - **Property 1: Validation rejects invalid inputs with all violations reported**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

- [x] 5. Create error handling middleware
  - [x] 5.1 Create `packages/api/src/middleware/errorHandler.ts`
    - Export `AppError` class extending Error with `statusCode` and `isOperational` fields
    - Export `errorHandler` 4-param middleware
    - Log full error via Logger
    - In production: return `{ error, status }` only — no stack, no internal details
    - In non-production: include `stack` field
    - For `AppError` instances: use their statusCode and message
    - For unknown errors: use 500 and "Internal server error"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 5.2 Write property tests for error handler
    - **Property 6: Error handler produces consistent response shape without internal details in production**
    - **Validates: Requirements 5.2, 5.4**

- [x] 6. Refactor auth middleware
  - [x] 6.1 Refactor `packages/api/src/middleware/auth.ts`
    - Export `createAuthMiddleware(config)` factory instead of direct exports
    - Use `config.jwtSecret` for verification and signing
    - Use `config.jwtExpiresIn` for token generation
    - Differentiate expired token (`TokenExpiredError` → "Token expired") from invalid token ("Invalid token")
    - Remove the insecure fallback secret
    - _Requirements: 1.1, 2.1, 2.2_

  - [ ]* 6.2 Write unit tests for auth middleware
    - Test expired token returns 401 with "Token expired" message
    - Test invalid token returns 401 with "Invalid token" message
    - Test missing token returns 401 with "Authentication required"
    - Test valid token attaches user to request
    - _Requirements: 2.1, 2.2, 3.2, 3.3_

- [x] 7. Configure CORS with origin validation
  - [x] 7.1 Create `packages/api/src/middleware/cors.ts`
    - Export `createCorsMiddleware(config)` that returns configured cors middleware
    - Use custom origin function: accept if origin is in `config.corsOrigins`, reject otherwise
    - Set `credentials: true`
    - Restrict methods to `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`
    - Allow headers: `['Content-Type', 'Authorization']`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 7.2 Write property tests for CORS origin matching
    - **Property 2: CORS origin acceptance matches the parsed allow list**
    - **Validates: Requirements 6.1, 6.3**

- [x] 8. Add rate limiting middleware
  - [x] 8.1 Create `packages/api/src/middleware/rateLimit.ts`
    - Export `createGlobalLimiter(config)` using express-rate-limit with config values
    - Export `createAuthLimiter(config)` with stricter `config.authRateLimitMax`
    - On limit exceeded: return `{ error: 'Too many requests, please try again later', status: 429 }`
    - Set `standardHeaders: true`, `legacyHeaders: false`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 9. Implement transactional order creation
  - [x] 9.1 Create `packages/api/src/services/orderService.ts`
    - Export `createOrder(userId, items)` function
    - Use `db.transaction(...)` to wrap stock check, order insert, items insert, stock decrement
    - On insufficient stock: throw `AppError(400, 'Insufficient stock for product {id}')`
    - On success: return `{ id, subtotal, gst, total, status: 'pending' }`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.2 Update `packages/api/src/routes/orders.ts` POST handler
    - Replace inline logic with call to `createOrder(req.user.id, req.body.items)`
    - Let errors propagate to error handler
    - _Requirements: 9.1_

  - [ ]* 9.3 Write property tests for order service
    - **Property 7: Transactional order creation is atomic**
    - **Validates: Requirements 9.1, 9.3**
    - **Property 8: Insufficient stock aborts transaction with no partial state**
    - **Validates: Requirements 9.2**

- [x] 10. Create request logging middleware
  - [x] 10.1 Create `packages/api/src/middleware/requestLogger.ts`
    - Export `createRequestLogger(logger)` middleware
    - Record start time, hook `res.on('finish', ...)` to log after response
    - Log: method, path, statusCode, responseTimeMs
    - Do NOT log: request body, query params, authorization header
    - _Requirements: 8.3_

  - [ ]* 10.2 Write property tests for request logger
    - **Property 5: Request logs include only safe fields**
    - **Validates: Requirements 8.3**

- [ ] 11. Wire everything together in index.ts
  - [x] 11.1 Refactor `packages/api/src/index.ts`
    - Import and call `loadConfig()` at the top — server won't start if config is invalid
    - Set up middleware in order: rate limiter → CORS → express.json() → request logger → routes → error handler
    - Apply auth rate limiter to `/api/auth` routes
    - Apply global rate limiter to all routes
    - Apply validation middleware to each route that needs it (register, login, products CRUD, orders)
    - Register error handler as the last middleware
    - Remove all `console.log` calls, use Logger instead
    - _Requirements: 1.2, 3.1, 3.2, 7.4, 8.4, 10.1, 10.2, 10.3_

  - [x] 11.2 Update route files to use new auth middleware
    - Update `routes/products.ts`, `routes/orders.ts`, `routes/analytics.ts` to accept auth middleware from factory
    - Add validation middleware to each route handler that accepts input
    - _Requirements: 3.1, 3.2, 4.1-4.6_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Create .env.example file
  - Create `packages/api/.env.example` with all environment variables and their descriptions
  - Include: JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGINS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, AUTH_RATE_LIMIT_MAX, PORT, NODE_ENV
  - _Requirements: 1.1, 1.3, 6.1, 7.1, 7.2_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property/unit test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The existing API response contract is preserved (Requirement 10) — no response shapes change
- New dependencies: `zod`, `express-rate-limit`, `fast-check` (dev), `vitest` (dev)
- Property tests use `fast-check` with minimum 100 iterations per property
