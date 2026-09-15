const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.success(result, 'Registration successful', 201);
});

const login = asyncHandler(async (req, res) => {
  const deviceInfo = req.headers['user-agent'];
  const result = await authService.login(req.body, deviceInfo);
  res.success(result, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(token);
  res.success(null, 'Logged out successfully');
});

const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refreshAccessToken(token);
  res.success(result, 'Token refreshed');
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  res.success(null, 'If the email exists, a reset OTP has been sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.success(null, 'Password reset successful');
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body);
  res.success(null, 'Email verified successfully');
});

const sendAuthOtp = asyncHandler(async (req, res) => {
  const result = await authService.sendAuthOtp(req.body);
  res.success(result, 'OTP sent successfully');
});

const verifyAuthOtp = asyncHandler(async (req, res) => {
  const { identifier, code, purpose, name } = req.body;
  const result = await authService.verifyAuthOtp({
    identifier,
    code,
    purpose,
    userData: { name },
  });
  res.success(result, result.isNewUser ? 'Registration successful' : 'Login successful');
});

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyEmail, sendAuthOtp, verifyAuthOtp };
