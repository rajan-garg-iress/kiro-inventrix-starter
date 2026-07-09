import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger.js';

export function createRequestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const responseTimeMs = Date.now() - start;
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTimeMs,
      });
    });

    next();
  };
}
