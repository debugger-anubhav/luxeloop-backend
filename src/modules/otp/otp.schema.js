const { z } = require('zod');

const sendOtpSchema = z.object({
  identifier: z.string().min(5).max(255),
  purpose: z.enum(['login', 'register', 'email_verify', 'password_reset']).default('login'),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(5).max(255),
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['login', 'register', 'email_verify', 'password_reset']).default('login'),
});

module.exports = { sendOtpSchema, verifyOtpSchema };
