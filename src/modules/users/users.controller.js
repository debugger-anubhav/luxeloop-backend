const asyncHandler = require('../../utils/asyncHandler');
const usersService = require('./users.service');

const getProfile = asyncHandler(async (req, res) => {
  const user = await usersService.getProfile(req.user.id);
  res.success(user, 'Profile fetched');
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  res.success(user, 'Profile updated');
});

const deactivateAccount = asyncHandler(async (req, res) => {
  await usersService.deactivateAccount(req.user.id);
  res.success(null, 'Account deactivated');
});

const updateAvatar = asyncHandler(async (req, res) => {
  const user = await usersService.updateAvatar(req.user.id, req.fileUrl);
  res.success(user, 'Avatar updated');
});

module.exports = { getProfile, updateProfile, deactivateAccount, updateAvatar };
