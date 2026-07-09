import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { createGlobalLimiter, createAuthLimiter } from './middleware/rateLimit.js';
import { createRequestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initDb } from './db.js';
import { createAuthRoutes } from './routes/auth.js';
import { createProductsRoutes } from './routes/products.js';
import { createOrdersRoutes } from './routes/orders.js';
import { createAnalyticsRoutes } from './routes/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load and validate config (throws if invalid)
const config = loadConfig();
const logger = createLogger();
const auth = createAuthMiddleware(config);

const app = express();

// Middleware pipeline: rate limiter → CORS → JSON → request logger
app.use(createGlobalLimiter(config));
app.use(createCorsMiddleware(config));
app.use(express.json());
app.use(createRequestLogger(logger));

// Static files
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Initialize database
initDb();

// Apply stricter rate limit on auth routes
app.use('/api/auth', createAuthLimiter(config));

// Routes
app.use('/api/auth', createAuthRoutes(auth));
app.use('/api/products', createProductsRoutes(auth));
app.use('/api/orders', createOrdersRoutes(auth));
app.use('/api/analytics', createAnalyticsRoutes(auth));

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info('Server started', { port: config.port, nodeEnv: config.nodeEnv });
});
