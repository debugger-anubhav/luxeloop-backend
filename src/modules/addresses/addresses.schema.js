const { z } = require('zod');

const createAddressSchema = z.object({
  label:     z.string().max(30).default('Home'),
  full_name: z.string().min(2).max(150),
  phone:     z.string().min(10).max(15),
  line1:     z.string().min(5),
  line2:     z.string().optional(),
  landmark:  z.string().max(150).optional(),
  city:      z.string().min(2).max(100),
  state:     z.string().min(2).max(100),
  pincode:   z.string().min(4).max(10),
  country:   z.string().max(60).default('India'),
});

module.exports = { createAddressSchema };
