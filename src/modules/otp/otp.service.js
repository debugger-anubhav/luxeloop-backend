const crypto = require('crypto');
const { query } = require('../../config/db');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

// ── SMS provider (Twilio) ─────────────────────────────────────────────────────

const getSmsClient = () => {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
  const twilio = require('twilio');
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
};

const sendSms = async (to, body) => {
  const client = getSmsClient();
  if (!client) {
    logger.warn({ to, body }, '[OTP] Twilio not configured — OTP logged for development');
    return;
  }
  try {
    await client.messages.create({ from: env.TWILIO_PHONE_NUMBER, to, body });
  } catch (err) {
    // Trial accounts can only SMS verified numbers — log and fall through so
    // the OTP is still stored in DB and visible in server logs for dev testing
    logger.warn({ to, code: err.code, msg: err.message }, '[OTP] Twilio send failed — OTP still valid in DB');
  }
};

// ── Core OTP logic ────────────────────────────────────────────────────────────

const generateCode = () => crypto.randomInt(100000, 999999).toString();

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

/**
 * Send an OTP to the given identifier (phone or email).
 * `purpose` is one of: 'login', 'register', 'email_verify', 'password_reset'
 * Invalidates any existing unused OTPs for the same identifier+purpose before inserting.
 */
const sendOtp = async (identifier, purpose = 'login') => {
  // Invalidate previous unused OTPs for this identifier+purpose
  await query(
    `UPDATE otp_codes SET used = TRUE
     WHERE identifier = $1 AND purpose = $2 AND used = FALSE`,
    [identifier, purpose]
  );

  const code = generateCode();
  const code_hash = hashCode(code);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await query(
    `INSERT INTO otp_codes (identifier, purpose, code_hash, expires_at, attempts)
     VALUES ($1, $2, $3, $4, 0)`,
    [identifier, purpose, code_hash, expiresAt]
  );

  const isPhone = /^\+?[0-9]{7,15}$/.test(identifier.replace(/\s/g, ''));

  if (isPhone) {
    await sendSms(identifier, `Your LuxeLoop verification code is ${code}. Valid for ${env.OTP_EXPIRY_MINUTES} minutes.`);
  } else {
    logger.info({ identifier, code }, '[OTP] Email OTP generated');
  }

  const devPayload = env.NODE_ENV !== 'production' ? { _dev_otp: code } : {};
  return { sent: true, ...devPayload };
};

/**
 * Verify an OTP.
 * Returns { valid: true } on success, throws ApiError on failure.
 * Marks the OTP as used and records the attempt.
 */
const verifyOtp = async (identifier, code, purpose = 'login') => {
  const { rows } = await query(
    `SELECT * FROM otp_codes
     WHERE identifier = $1
       AND purpose = $2
       AND used = FALSE
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifier, purpose]
  );

  const record = rows[0];

  if (!record) {
    throw ApiError.badRequest('OTP not found or expired. Please request a new one.');
  }

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [record.id]);
    throw ApiError.tooManyRequests('Too many incorrect attempts. Please request a new OTP.');
  }

  const inputHash = hashCode(code);

  if (inputHash !== record.code_hash) {
    await query(
      'UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1',
      [record.id]
    );
    const remaining = env.OTP_MAX_ATTEMPTS - (record.attempts + 1);
    throw ApiError.badRequest(`Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
  }

  await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [record.id]);

  return { valid: true };
};

module.exports = { sendOtp, verifyOtp };
