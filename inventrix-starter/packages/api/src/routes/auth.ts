import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';

interface AuthMiddleware {
  authenticate: any;
  requireAdmin: any;
  generateToken: (user: { id: number; email: string; role: string }) => string;
}

export function createAuthRoutes(auth: AuthMiddleware) {
  const router = Router();

  router.post('/login', validate(loginSchema), (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = auth.generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  router.post('/register', validate(registerSchema), (req, res) => {
    const { email, password, name } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(email, hashedPassword, name, 'customer');
    const token = auth.generateToken({ id: result.lastInsertRowid as number, email, role: 'customer' });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, email, name, role: 'customer' } });
  });

  return router;
}
