const { Router } = require('express');
const controller = require('./users.controller');
const { authenticate } = require('../../middleware/auth');
const { uploadSingle } = require('../../middleware/upload');

const router = Router();

router.get('/me',          authenticate,                               controller.getProfile);
router.patch('/me',        authenticate,                               controller.updateProfile);
router.delete('/me',       authenticate,                               controller.deactivateAccount);
router.patch('/me/avatar', authenticate, ...uploadSingle('avatar'),    controller.updateAvatar);

module.exports = router;
