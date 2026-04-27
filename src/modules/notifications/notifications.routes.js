const { Router } = require('express');
const controller = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/',                         authenticate, controller.getNotifications);
router.patch('/read-all',               authenticate, controller.markAllRead);
router.patch('/:notificationId/read',   authenticate, controller.markRead);
router.delete('/:notificationId',       authenticate, controller.deleteNotification);

module.exports = router;
