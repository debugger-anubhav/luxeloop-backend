const { z } = require('zod');

const checkoutSchema = z.object({
  address_id: z.string().uuid(),
  coupon_id:  z.string().uuid().optional(),
  notes:      z.string().optional(),
});

module.exports = { checkoutSchema };
