const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.success(user, 'Registration successful', 201);
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

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyEmail };
