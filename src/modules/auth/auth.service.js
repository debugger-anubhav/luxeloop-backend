const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query, pool } = require('../../config/db');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyToken } = require('../../utils/tokenUtils');
const nodemailer = require('nodemailer');
const logger = require('../../config/logger');
const otpService = require('../otp/otp.service');

const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

async function sendMail(to, subject, text) {
  try {
    await mailer.sendMail({ from: env.SMTP_FROM, to, subject, text });
  } catch (err) {
    logger.error({ err }, 'Failed to send email');
  }
}

async function register({ name, email, phone, password }) {
  const existing = email
    ? await query('SELECT id FROM users WHERE email = $1', [email])
    : await query('SELECT id FROM users WHERE phone = $1', [phone]);

  if (existing.rows.length) {
    throw ApiError.conflict('User already exists with this email or phone');
  }

  const password_hash = password
    ? await bcrypt.hash(password, env.BCRYPT_ROUNDS)
    : null;

  const { rows } = await query(
    `INSERT INTO users (full_name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, phone, role, created_at`,
    [name, email || null, phone || null, password_hash]
  );

  const user = rows[0];

  if (email) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = crypto.createHash('sha256').update(otp).digest('hex');
    await query(
      `INSERT INTO otp_codes (user_id, purpose, code_hash, expires_at)
       VALUES ($1, 'email_verify', $2, NOW() + INTERVAL '15 minutes')`,
      [user.id, code_hash]
    );
    sendMail(email, 'Verify your LuxeLoop account', `Your OTP is: ${otp}`);
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  return { user, tokens: { accessToken, refreshToken } };
}

async function login({ email, phone, password }, deviceInfo) {
  const { rows } = email
    ? await query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email])
    : await query('SELECT * FROM users WHERE phone = $1 AND is_active = TRUE', [phone]);

  const user = rows[0];
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, tokenHash, deviceInfo ? JSON.stringify(deviceInfo) : null, expiresAt]
  );

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, tokens: { accessToken, refreshToken } };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [tokenHash]);
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

  let decoded;
  try {
    decoded = verifyToken(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const { rows } = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [tokenHash]
  );

  if (!rows[0]) throw ApiError.unauthorized('Refresh token revoked or expired');

  const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
  const accessToken = signAccessToken(payload);

  return { accessToken };
}

async function forgotPassword({ email }) {
  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (!rows[0]) return;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const code_hash = crypto.createHash('sha256').update(otp).digest('hex');

  await query(
    `INSERT INTO otp_codes (user_id, purpose, code_hash, expires_at)
     VALUES ($1, 'password_reset', $2, NOW() + INTERVAL '15 minutes')`,
    [rows[0].id, code_hash]
  );

  sendMail(email, 'Reset your Vastra password', `Your OTP is: ${otp}`);
}

async function resetPassword({ token, password }) {
  let decoded;
  try {
    decoded = verifyToken(token, env.JWT_SECRET);
  } catch {
    throw ApiError.badRequest('Invalid or expired token');
  }

  const otp = password;
  const code_hash = crypto.createHash('sha256').update(otp).digest('hex');
  const { rows } = await query(
    `SELECT * FROM otp_codes WHERE user_id = $1 AND purpose = 'password_reset'
     AND code_hash = $2 AND used = FALSE AND expires_at > NOW()`,
    [decoded.id, code_hash]
  );

  if (!rows[0]) throw ApiError.badRequest('Invalid or expired OTP');

  const password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, decoded.id]);
  await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [rows[0].id]);
}

async function verifyEmail({ token, code }) {
  let decoded;
  try {
    decoded = verifyToken(token, env.JWT_SECRET);
  } catch {
    throw ApiError.badRequest('Invalid or expired token');
  }

  const code_hash = crypto.createHash('sha256').update(code).digest('hex');
  const { rows } = await query(
    `SELECT * FROM otp_codes WHERE user_id = $1 AND purpose = 'email_verify'
     AND code_hash = $2 AND used = FALSE AND expires_at > NOW()`,
    [decoded.id, code_hash]
  );

  if (!rows[0]) throw ApiError.badRequest('Invalid or expired OTP');

  await query('UPDATE users SET is_email_verified = TRUE WHERE id = $1', [decoded.id]);
  await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [rows[0].id]);
}

// ── OTP auth flows ────────────────────────────────────────────────────────────

const issueTokensForUser = async (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  return { accessToken, refreshToken };
};

/**
 * Step 1 of OTP login/register: send OTP to identifier (phone or email).
 * Does NOT reveal whether the user exists.
 */
async function sendAuthOtp({ identifier, purpose }) {
  await otpService.sendOtp(identifier, purpose);
  return { sent: true };
}

/**
 * Step 2: verify OTP and either log the user in or create their account.
 *
 * For `login`:   user must already exist, otherwise 404.
 * For `register`: user must NOT exist, otherwise 409.
 *                 Additional fields (name) passed in `userData` are stored.
 */
async function verifyAuthOtp({ identifier, code, purpose, userData = {} }) {
  await otpService.verifyOtp(identifier, code, purpose);

  const isPhone = /^\+?[0-9]{7,15}$/.test(identifier.replace(/\s/g, ''));
  const field = isPhone ? 'phone' : 'email';

  const { rows } = await query(
    `SELECT * FROM users WHERE ${field} = $1 AND is_active = TRUE`,
    [identifier]
  );

  let user = rows[0];

  if (purpose === 'login') {
    if (!user) throw ApiError.notFound('No account found for this identifier. Please register first.');

    const { password_hash: _, ...safeUser } = user;
    const tokens = await issueTokensForUser(safeUser);
    return { user: safeUser, tokens, isNewUser: false };
  }

  if (purpose === 'register') {
    if (user) throw ApiError.conflict('An account already exists with this identifier. Please log in.');

    const { name } = userData;
    if (!name) throw ApiError.badRequest('Name is required for registration.');

    const { rows: inserted } = await query(
      `INSERT INTO users (full_name, ${field}, password_hash)
       VALUES ($1, $2, NULL)
       RETURNING id, full_name, email, phone, role, created_at`,
      [name, identifier]
    );

    user = inserted[0];
    const tokens = await issueTokensForUser(user);
    return { user, tokens, isNewUser: true };
  }

  throw ApiError.badRequest('Invalid purpose for OTP auth flow.');
}

module.exports = { register, login, logout, refreshAccessToken, forgotPassword, resetPassword, verifyEmail, sendAuthOtp, verifyAuthOtp };
