import rateLimit from 'express-rate-limit';
import { AppConfig } from '../config.js';

export function createGlobalLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', status: 429 },
  });
}

export function createAuthLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', status: 429 },
  });
}
