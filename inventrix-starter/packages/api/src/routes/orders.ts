import { Router } from 'express';
import db from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/orders.js';
import { createOrder } from '../services/orderService.js';

interface AuthMiddleware {
  authenticate: any;
  requireAdmin: any;
  generateToken: (user: { id: number; email: string; role: string }) => string;
}

export function createOrdersRoutes(auth: AuthMiddleware) {
  const router = Router();

  router.get('/', auth.authenticate, (req: AuthRequest, res) => {
    let orders;
    if (req.user?.role === 'admin') {
      orders = db.prepare(`
        SELECT o.*, u.name as user_name, u.email as user_email 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        ORDER BY o.created_at DESC
      `).all();
    } else {
      orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user?.id);
    }
    res.json(orders);
  });

  router.get('/:id', auth.authenticate, (req: AuthRequest, res) => {
    const order = db.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE o.id = ?
    `).get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (req.user?.role !== 'admin' && order.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const items = db.prepare(`
      SELECT oi.*, p.name as product_name 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `).all(req.params.id);
    res.json({ ...order, items });
  });

  router.post('/', auth.authenticate, validate(createOrderSchema), (req: AuthRequest, res, next) => {
    try {
      const result = createOrder(req.user!.id, req.body.items);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/status', auth.authenticate, auth.requireAdmin, validate(updateOrderStatusSchema), (req: AuthRequest, res) => {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ id: req.params.id, status });
  });

  return router;
}
