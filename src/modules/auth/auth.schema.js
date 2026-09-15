const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['customer', 'vendor', 'admin']).optional(),
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

const sendAuthOtpSchema = z.object({
  identifier: z.string().min(5).max(255),
  purpose: z.enum(['login', 'register']).default('login'),
});

const verifyAuthOtpSchema = z.object({
  identifier: z.string().min(5).max(255),
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['login', 'register']).default('login'),
  name: z.string().min(2).max(150).optional(),
});

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema, sendAuthOtpSchema, verifyAuthOtpSchema };
