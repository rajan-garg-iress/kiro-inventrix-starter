import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive().max(999999.99),
  stock: z.number().int().nonnegative().max(99999),
  description: z.string().max(1000).optional(),
  image_url: z.string().url().max(2048).optional(),
});

export const updateProductSchema = createProductSchema;
