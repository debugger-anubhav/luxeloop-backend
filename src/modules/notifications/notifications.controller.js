const asyncHandler = require('../../utils/asyncHandler');
const service = require('./notifications.service');

const getNotifications   = asyncHandler(async (req, res) => { const { notifications, pagination } = await service.getNotifications(req.user.id, req.query); res.paginated(notifications, pagination, 'Notifications fetched'); });
const markRead           = asyncHandler(async (req, res) => { res.success(await service.markRead(req.user.id, req.params.notificationId), 'Marked as read'); });
const markAllRead        = asyncHandler(async (req, res) => { await service.markAllRead(req.user.id); res.success(null, 'All marked as read'); });
const deleteNotification = asyncHandler(async (req, res) => { await service.deleteNotification(req.user.id, req.params.notificationId); res.success(null, 'Notification deleted'); });

module.exports = { getNotifications, markRead, markAllRead, deleteNotification };
