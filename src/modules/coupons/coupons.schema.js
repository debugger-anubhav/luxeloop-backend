const { z } = require('zod');

const createCouponSchema = z.object({
  code:             z.string().min(3).max(30).toUpperCase(),
  description:      z.string().optional(),
  discount_type:    z.enum(['flat','percent']),
  discount_value:   z.number().min(0),
  min_order_value:  z.number().min(0).default(0),
  max_discount_cap: z.number().min(0).optional(),
  usage_limit:      z.number().int().min(1).optional(),
  per_user_limit:   z.number().int().min(1).default(1),
  applies_to:       z.enum(['rent','sale','all']).default('all'),
  valid_from:       z.string().optional(),
  valid_until:      z.string().optional(),
});

module.exports = { createCouponSchema };
