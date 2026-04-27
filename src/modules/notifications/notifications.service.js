const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

async function createNotification(userId, { type, title, body, payload }) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, body, payload)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, type, title, body, payload ? JSON.stringify(payload) : null]
  );
  return rows[0];
}

async function getNotifications(userId, queryParams) {
  const { page, limit, offset } = parsePaginationParams(queryParams);

  const { rows: countRows } = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT * FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return { notifications: rows, pagination: buildPaginationMeta(total, page, limit) };
}

async function markRead(userId, notificationId) {
  const { rows } = await query(
    `UPDATE notifications SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING *`,
    [notificationId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Notification not found');
  return rows[0];
}

async function markAllRead(userId) {
  await query(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
}

async function deleteNotification(userId, notificationId) {
  const { rows } = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
    [notificationId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Notification not found');
}

module.exports = { createNotification, getNotifications, markRead, markAllRead, deleteNotification };
