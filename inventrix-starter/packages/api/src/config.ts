export interface AppConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  authRateLimitMax: number;
  port: number;
  nodeEnv: string;
}

export function loadConfig(): AppConfig {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error(
      'JWT_SECRET environment variable is required but was not set. The API cannot start without a valid signing secret.'
    );
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

  const corsOriginsRaw = process.env.CORS_ORIGINS;
  let corsOrigins: string[];
  if (corsOriginsRaw) {
    corsOrigins = corsOriginsRaw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    if (corsOrigins.length === 0) {
      corsOrigins = ['http://localhost:5173'];
    }
  } else {
    corsOrigins = ['http://localhost:5173'];
  }

  const rateLimitWindowMsRaw = process.env.RATE_LIMIT_WINDOW_MS;
  const rateLimitWindowMs = rateLimitWindowMsRaw
    ? (Number.isNaN(parseInt(rateLimitWindowMsRaw, 10)) ? 900000 : parseInt(rateLimitWindowMsRaw, 10))
    : 900000;

  const rateLimitMaxRaw = process.env.RATE_LIMIT_MAX;
  const rateLimitMax = rateLimitMaxRaw
    ? (Number.isNaN(parseInt(rateLimitMaxRaw, 10)) ? 100 : parseInt(rateLimitMaxRaw, 10))
    : 100;

  const authRateLimitMaxRaw = process.env.AUTH_RATE_LIMIT_MAX;
  const authRateLimitMax = authRateLimitMaxRaw
    ? (Number.isNaN(parseInt(authRateLimitMaxRaw, 10)) ? 10 : parseInt(authRateLimitMaxRaw, 10))
    : 10;

  const portRaw = process.env.PORT;
  const port = portRaw
    ? (Number.isNaN(parseInt(portRaw, 10)) ? 3000 : parseInt(portRaw, 10))
    : 3000;

  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    jwtSecret,
    jwtExpiresIn,
    corsOrigins,
    rateLimitWindowMs,
    rateLimitMax,
    authRateLimitMax,
    port,
    nodeEnv,
  };
}
