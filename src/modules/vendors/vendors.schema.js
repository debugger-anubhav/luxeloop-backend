const { z } = require('zod');

const registerVendorSchema = z.object({
  shop_name:   z.string().min(2).max(150),
  description: z.string().optional(),
  gst_number:  z.string().max(20).optional(),
  pan_number:  z.string().max(12).optional(),
});

const bankAccountSchema = z.object({
  account_holder: z.string().min(2).max(150),
  bank_name:      z.string().min(2).max(100),
  account_number: z.string().min(6),
  ifsc_code:      z.string().min(11).max(15),
  is_primary:     z.boolean().default(false),
});

module.exports = { registerVendorSchema, bankAccountSchema };
