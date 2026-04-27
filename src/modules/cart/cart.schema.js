const { z } = require('zod');

const addItemSchema = z.object({
  variant_id:   z.string().uuid(),
  item_type:    z.enum(['rent','sale']),
  quantity:     z.number().int().min(1).default(1),
  rental_start: z.string().optional(),
  rental_end:   z.string().optional(),
}).refine((d) => {
  if (d.item_type === 'rent') return d.rental_start && d.rental_end;
  return true;
}, { message: 'rental_start and rental_end required for rent items' });

module.exports = { addItemSchema };
