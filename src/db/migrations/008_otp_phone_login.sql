-- Allow OTPs before a user account exists (phone/email login flow)
-- and relax password_hash to nullable for OTP-only users

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE otp_codes
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS identifier VARCHAR(255),  -- phone or email, used pre-registration
  ADD COLUMN IF NOT EXISTS attempts   SMALLINT NOT NULL DEFAULT 0;

-- Index for fast lookup by identifier + purpose
CREATE INDEX IF NOT EXISTS idx_otp_codes_identifier
  ON otp_codes (identifier, purpose)
  WHERE used = FALSE;
