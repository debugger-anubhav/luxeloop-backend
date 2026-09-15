const { Router } = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema, sendAuthOtpSchema, verifyAuthOtpSchema } = require('./auth.schema');

const router = Router();

router.post('/register',        authLimiter, validate(registerSchema),       controller.register);
router.post('/login',           authLimiter, validate(loginSchema),           controller.login);
router.post('/logout',          authenticate,                                 controller.logout);
router.post('/refresh-token',                                                 controller.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema),  controller.forgotPassword);
router.post('/reset-password',  authLimiter, validate(resetPasswordSchema),   controller.resetPassword);
router.post('/verify-email',                 validate(verifyEmailSchema),      controller.verifyEmail);

// OTP-based login / registration (primary auth flow)
router.post('/send-otp',    authLimiter, validate(sendAuthOtpSchema),   controller.sendAuthOtp);
router.post('/verify-otp',  authLimiter, validate(verifyAuthOtpSchema),  controller.verifyAuthOtp);

module.exports = router;
