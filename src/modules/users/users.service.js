const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

async function getProfile(userId) {
  const { rows } = await query(
    `SELECT id, full_name, email, phone, avatar_url, role,
            is_active, is_email_verified, is_phone_verified, last_login_at, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  return rows[0];
}

async function updateProfile(userId, { full_name, phone }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(full_name); }
  if (phone !== undefined)     { fields.push(`phone = $${idx++}`);     values.push(phone); }

  if (!fields.length) throw ApiError.badRequest('No fields to update');
  values.push(userId);

  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, phone, avatar_url, role`,
    values
  );
  return rows[0];
}

async function deactivateAccount(userId) {
  await query('UPDATE users SET is_active = FALSE WHERE id = $1', [userId]);
}

async function updateAvatar(userId, avatarUrl) {
  const { rows } = await query(
    'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, avatar_url',
    [avatarUrl, userId]
  );
  return rows[0];
}

module.exports = { getProfile, updateProfile, deactivateAccount, updateAvatar };
