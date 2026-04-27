const { z } = require('zod');

const registerSchema = z.object({
  full_name: z.string().min(2).max(150),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(8),
}).refine((d) => d.email || d.phone, {
  message: 'Either email or phone is required',
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(1),
}).refine((d) => d.email || d.phone, {
  message: 'Either email or phone is required',
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const verifyEmailSchema = z.object({
  token: z.string(),
  code: z.string().length(6),
});

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema };
