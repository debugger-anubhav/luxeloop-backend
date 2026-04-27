const { z } = require('zod');

const variantSchema = z.object({
  size:               z.string().max(20).optional(),
  color:              z.string().max(50).optional(),
  color_hex:          z.string().length(7).optional(),
  sku:                z.string().max(100).optional(),
  rent_price_per_day: z.number().min(0).optional(),
  sale_price:         z.number().min(0).optional(),
  stock_qty:          z.number().int().min(0).default(0),
  weight_grams:       z.number().int().optional(),
});

const createProductSchema = z.object({
  category_id:       z.string().uuid(),
  name:              z.string().min(2).max(250),
  description:       z.string().optional(),
  listing_type:      z.enum(['rent','sale','both']).default('both'),
  deposit_amount:    z.number().min(0).default(0),
  brand:             z.string().max(100).optional(),
  fabric:            z.string().max(100).optional(),
  care_instructions: z.string().optional(),
  tags:              z.array(z.string()).default([]),
  variants:          z.array(variantSchema).min(1),
});

module.exports = { createProductSchema };
