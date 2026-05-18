/* eslint-disable camelcase */

// F-16: email verification.
//
// Backward compatibility: existing rows are flagged verified by setting the
// DEFAULT to FALSE and then immediately backfilling pre-existing accounts to
// TRUE. This avoids locking out every existing user the instant the migration
// applies. New accounts created after this migration get the default FALSE
// and must verify before they can log in.
//
// EmailVerificationTokens mirrors PasswordResetTokens: we only persist the
// SHA-256 hex digest of the raw token, never the raw token itself. A DB leak
// cannot then be used to verify anyone else's email.

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE Users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE NULL;

    -- Backfill: any account that already existed before this migration is
    -- treated as verified so we don't break sessions for legacy users.
    UPDATE Users SET email_verified = TRUE WHERE email_verified = FALSE AND email_verified_at IS NULL;

    CREATE TABLE IF NOT EXISTS EmailVerificationTokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_verification_token_hash
      ON EmailVerificationTokens (token_hash);

    CREATE INDEX IF NOT EXISTS idx_email_verification_user_id
      ON EmailVerificationTokens (user_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_email_verification_user_id;
    DROP INDEX IF EXISTS idx_email_verification_token_hash;
    DROP TABLE IF EXISTS EmailVerificationTokens;
    ALTER TABLE Users
      DROP COLUMN IF EXISTS email_verified_at,
      DROP COLUMN IF EXISTS email_verified;
  `);
};
