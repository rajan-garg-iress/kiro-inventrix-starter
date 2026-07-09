import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../logger.js';

const logger = createLogger();

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  const message =
    isProduction && statusCode >= 500 ? 'Internal server error' : err instanceof AppError ? err.message : 'Internal server error';

  const response: Record<string, unknown> = {
    error: message,
    status: statusCode,
  };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
