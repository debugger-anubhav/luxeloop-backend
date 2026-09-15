const { query, pool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

async function getMyAddresses(userId) {
  const { rows } = await query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC',
    [userId]
  );
  return rows;
}

async function createAddress(userId, data) {
  const { label, full_name, phone, line1, line2, landmark, city, state, pincode, country, address_type, lat, lng, full_address } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM addresses WHERE user_id = $1', [userId]);
    const isDefault = existing.rows.length === 0;

    const { rows } = await client.query(
      `INSERT INTO addresses (user_id, label, full_name, phone, line1, line2, landmark, city, state, pincode, country, address_type, lat, lng, full_address, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [userId, label, full_name, phone, line1, line2 || null, landmark || null, city, state, pincode, country, address_type || 'home', lat || null, lng || null, full_address || null, isDefault]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateAddress(userId, addressId, data) {
  const { rows: exists } = await query(
    'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
    [addressId, userId]
  );
  if (!exists[0]) throw ApiError.notFound('Address not found');

  const allowed = ['label','full_name','phone','line1','line2','landmark','city','state','pincode','country','address_type','lat','lng','full_address'];
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (!fields.length) throw ApiError.badRequest('No fields to update');
  values.push(addressId);

  const { rows } = await query(
    `UPDATE addresses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

async function deleteAddress(userId, addressId) {
  const { rows } = await query(
    'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
    [addressId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Address not found');
}

async function setDefaultAddress(userId, addressId) {
  const { rows: exists } = await query(
    'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
    [addressId, userId]
  );
  if (!exists[0]) throw ApiError.notFound('Address not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    const { rows } = await client.query(
      'UPDATE addresses SET is_default = TRUE WHERE id = $1 RETURNING *',
      [addressId]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getMyAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
