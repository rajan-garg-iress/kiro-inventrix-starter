# Requirements Document

## Introduction

Harden the Inventrix Express API to production-ready security standards. This includes securing JWT authentication via configuration, adding input validation on all endpoints, centralising error handling, locking down CORS, adding rate limiting, replacing console.log with structured PII-free logging, and wrapping order creation in a database transaction to prevent overselling. The frontend and database schema remain unchanged; the API contract (response shapes) is preserved.

## Glossary

- **API_Server**: The Express-based HTTP server that exposes the Inventrix REST API
- **Auth_Middleware**: Middleware responsible for verifying JWT tokens and attaching user context to requests
- **Validation_Middleware**: Middleware responsible for validating and sanitising incoming request bodies and parameters
- **Error_Handler**: Centralised Express error-handling middleware that formats and returns structured error responses
- **Rate_Limiter**: Middleware that restricts the number of requests a client can make within a time window
- **Logger**: Structured logging module that outputs JSON log entries without personally identifiable information
- **Order_Service**: The logic responsible for creating orders, including stock verification and decrement within a single transaction
- **CORS_Policy**: The Cross-Origin Resource Sharing configuration that controls which origins may access the API
- **JWT_Token**: A JSON Web Token issued upon successful authentication, carrying user identity claims
- **Authenticated_Route**: Any API route that requires a valid JWT_Token to access
- **Public_Route**: Any API route accessible without authentication (GET /api/products, GET /api/products/:id, POST /api/auth/login, POST /api/auth/register)

## Requirements

### Requirement 1: JWT Secret Configuration

**User Story:** As a DevOps engineer, I want the JWT signing secret to come from an environment variable with no insecure fallback, so that tokens cannot be forged using a known default key.

#### Acceptance Criteria

1. THE API_Server SHALL read the JWT signing secret exclusively from the `JWT_SECRET` environment variable
2. WHEN the `JWT_SECRET` environment variable is not set, THE API_Server SHALL refuse to start and log an error message indicating the missing configuration
3. THE API_Server SHALL read the token expiry duration from the `JWT_EXPIRES_IN` environment variable, defaulting to `1h` when the variable is not set

### Requirement 2: Token Lifetime Reduction

**User Story:** As a security engineer, I want token lifetimes to default to 1 hour instead of 7 days, so that the window of exposure from a leaked token is minimised.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL issue JWT_Tokens with an expiry duration equal to the configured `JWT_EXPIRES_IN` value
2. WHEN a request contains an expired JWT_Token, THE Auth_Middleware SHALL return a 401 status with an error message indicating token expiry

### Requirement 3: Public and Authenticated Route Coverage

**User Story:** As a developer, I want a clear separation between public and authenticated routes, so that unauthenticated users can browse products and authenticate without being blocked, while all other operations require valid credentials.

#### Acceptance Criteria

1. THE API_Server SHALL allow unauthenticated access to GET /api/products, GET /api/products/:id, POST /api/auth/login, and POST /api/auth/register
2. THE API_Server SHALL require a valid JWT_Token for all routes not listed as Public_Routes
3. WHEN an unauthenticated request reaches an Authenticated_Route, THE Auth_Middleware SHALL return a 401 status with a structured error response

### Requirement 4: Input Validation

**User Story:** As a developer, I want all incoming request data validated before reaching business logic, so that malformed or malicious input is rejected early with clear error messages.

#### Acceptance Criteria

1. WHEN a POST /api/auth/register request is received, THE Validation_Middleware SHALL verify that `email` is a valid email format, `password` is at least 8 characters, and `name` is a non-empty string of at most 100 characters
2. WHEN a POST /api/auth/login request is received, THE Validation_Middleware SHALL verify that `email` is a valid email format and `password` is a non-empty string
3. WHEN a POST /api/products request is received, THE Validation_Middleware SHALL verify that `name` is a non-empty string of at most 200 characters, `price` is a positive number, `stock` is a non-negative integer, and `description` is a string of at most 1000 characters if provided
4. WHEN a PUT /api/products/:id request is received, THE Validation_Middleware SHALL apply the same validation rules as POST /api/products
5. WHEN a POST /api/orders request is received, THE Validation_Middleware SHALL verify that `items` is a non-empty array where each element has a `product_id` as a positive integer and `quantity` as a positive integer
6. WHEN a PATCH /api/orders/:id/status request is received, THE Validation_Middleware SHALL verify that `status` is one of the allowed values: pending, processing, shipped, delivered, cancelled
7. IF validation fails, THEN THE Validation_Middleware SHALL return a 400 status with a structured error response listing all failed fields and their violations

### Requirement 5: Centralised Error Handling

**User Story:** As a developer, I want all unhandled errors funnelled through a single error-handling middleware, so that error responses are consistent and internal details are never leaked to clients.

#### Acceptance Criteria

1. THE Error_Handler SHALL catch all unhandled errors thrown by route handlers and middleware
2. THE Error_Handler SHALL return a JSON response with fields `error` (a human-readable message) and `status` (the HTTP status code)
3. WHILE the application is running in a non-production environment, THE Error_Handler SHALL include a `stack` field in the error response
4. THE Error_Handler SHALL never expose internal error messages, stack traces, or database details in production responses
5. THE Error_Handler SHALL log the full error details using the Logger before sending the response

### Requirement 6: CORS Lockdown

**User Story:** As a security engineer, I want CORS restricted to explicitly allowed origins, so that only trusted frontends can make cross-origin requests to the API.

#### Acceptance Criteria

1. THE CORS_Policy SHALL read allowed origins from the `CORS_ORIGINS` environment variable as a comma-separated list
2. WHEN `CORS_ORIGINS` is not set, THE CORS_Policy SHALL default to `http://localhost:5173` for local development
3. WHEN a request's Origin header does not match any allowed origin, THE API_Server SHALL reject the preflight or actual request with an appropriate CORS error
4. THE CORS_Policy SHALL allow credentials, and restrict methods to GET, POST, PUT, PATCH, DELETE, and OPTIONS

### Requirement 7: Rate Limiting

**User Story:** As an operations engineer, I want rate limiting applied to the API, so that abusive or runaway clients cannot overwhelm the server.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL limit each client IP to a configurable number of requests per time window, reading `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` from environment variables
2. WHEN environment variables are not set, THE Rate_Limiter SHALL default to 100 requests per 15-minute window
3. WHEN a client exceeds the rate limit, THE Rate_Limiter SHALL return a 429 status with a structured error response indicating rate limit exceeded
4. THE Rate_Limiter SHALL apply a stricter limit to authentication endpoints (POST /api/auth/login, POST /api/auth/register), defaulting to 10 requests per 15-minute window per IP

### Requirement 8: Structured Logging

**User Story:** As an operations engineer, I want structured JSON logs without PII, so that log aggregation tools can parse entries and no user personal data is accidentally stored in logs.

#### Acceptance Criteria

1. THE Logger SHALL output log entries in JSON format with fields: `timestamp`, `level`, `message`, and optional `context`
2. THE Logger SHALL never include email addresses, passwords, full names, or JWT tokens in log output
3. WHEN logging request information, THE Logger SHALL include method, path, status code, and response time but exclude request bodies and authorization headers
4. THE API_Server SHALL use the Logger for all operational log output, replacing all existing console.log calls

### Requirement 9: Transactional Order Creation

**User Story:** As a product owner, I want order creation to be atomic, so that stock cannot be oversold due to concurrent requests.

#### Acceptance Criteria

1. WHEN a POST /api/orders request is received, THE Order_Service SHALL execute stock verification, order insertion, order-item insertion, and stock decrement within a single database transaction
2. IF any product's available stock is less than the requested quantity during the transaction, THEN THE Order_Service SHALL abort the transaction and return a 400 status indicating insufficient stock
3. WHEN the transaction completes successfully, THE Order_Service SHALL commit all changes atomically so that no partial order or inconsistent stock state is persisted
4. IF an unexpected error occurs during the transaction, THEN THE Order_Service SHALL roll back all changes and return a 500 status with a structured error response

### Requirement 10: Backward Compatibility

**User Story:** As a frontend developer, I want the API contract to remain identical, so that the existing frontend continues to work without changes.

#### Acceptance Criteria

1. THE API_Server SHALL preserve the existing response shape for all successful responses on all endpoints
2. THE API_Server SHALL preserve the existing HTTP status codes for successful operations
3. THE API_Server SHALL serve static images from /images at the same paths as before
