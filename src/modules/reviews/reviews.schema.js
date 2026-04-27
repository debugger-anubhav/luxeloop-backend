const { z } = require('zod');

const createReviewSchema = z.object({
  order_item_id: z.string().uuid(),
  rating:        z.number().int().min(1).max(5),
  title:         z.string().max(150).optional(),
  comment:       z.string().optional(),
  images:        z.array(z.string().url()).default([]),
});

module.exports = { createReviewSchema };
