import db from '../db.js';
import { AppError } from '../middleware/errorHandler.js';

interface OrderItem {
  product_id: number;
  quantity: number;
}

interface OrderResult {
  id: number;
  subtotal: number;
  gst: number;
  total: number;
  status: string;
}

export function createOrder(userId: number, items: OrderItem[]): OrderResult {
  const executeOrder = db.transaction(() => {
    let subtotal = 0;
    const productUpdates: Array<{ id: number; quantity: number; price: number }> = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as any;
      if (!product) {
        throw new AppError(400, `Product not found: ${item.product_id}`);
      }
      if (product.stock < item.quantity) {
        throw new AppError(400, `Insufficient stock for product ${item.product_id}`);
      }
      subtotal += product.price * item.quantity;
      productUpdates.push({ id: item.product_id, quantity: item.quantity, price: product.price });
    }

    const gst = subtotal * 0.1;
    const total = subtotal + gst;

    const orderResult = db.prepare(
      'INSERT INTO orders (user_id, subtotal, gst, total, status) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, subtotal, gst, total, 'pending');

    const orderId = orderResult.lastInsertRowid as number;

    for (const update of productUpdates) {
      db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)').run(
        orderId, update.id, update.quantity, update.price
      );
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(update.quantity, update.id);
    }

    return { id: orderId, subtotal, gst, total, status: 'pending' };
  });

  return executeOrder();
}
