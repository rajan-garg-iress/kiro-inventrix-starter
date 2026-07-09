import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppConfig } from '../config.js';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export function createAuthMiddleware(config: AppConfig) {
  const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: number; email: string; role: string };
      req.user = decoded;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  const generateToken = (user: { id: number; email: string; role: string }): string => {
    const options: SignOptions = { expiresIn: config.jwtExpiresIn as unknown as SignOptions['expiresIn'] };
    return jwt.sign(user, config.jwtSecret, options);
  };

  return { authenticate, requireAdmin, generateToken };
}
